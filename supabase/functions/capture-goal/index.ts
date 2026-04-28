// Supabase Edge Function: capture-goal
// Deploy: supabase functions deploy capture-goal
//
// Logs a Goals Mentor extraction into public.user_goals. Fired client-side
// on "Onaylıyorum" (sector MVP onboarding).
//
// Schema is in user-goals-setup.sql. RLS is on, no public policies — this
// function runs with the service role key, so it bypasses RLS by design.
// We re-validate every input here (sector enum, length caps, language enum)
// and never trust client-supplied IP / user_agent (we read those server-side
// from request headers).
//
// Public endpoint — no auth required. Anyone can POST a goal extraction.
// Spam mitigation: per-device rate limit (max 5 inserts/device/day) +
// length caps. We accept low-grade noise as the price of frictionless
// telemetry — tighten if it ever gets abused.
//
// Background: docs/sector-mvp-plan.md

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Canonical sector values. Mirror src/data/sectors.js — keep these in sync.
// "generic" is the explicit-skip sentinel; anything else null-coerces.
const VALID_SECTORS = new Set(['finans', 'e-ticaret', 'gayrimenkul', 'generic'])

// Whitelisted motivation enum. Mirror src/app.jsx extractGoalsFromText.
const VALID_MOTIVATIONS = new Set(['interview', 'current_job', 'career_change', 'curiosity'])
const VALID_EXPERIENCE = new Set(['beginner', 'intermediate', 'advanced'])
const VALID_LANGUAGES = new Set(['tr', 'en'])

// Per-device daily insert cap. 5 is generous — most users complete the
// mentor once. Anyone doing 5+ in a day is either testing or abusing.
const PER_DEVICE_DAILY_CAP = 5

// Field length caps. Conservative; raw_text is the biggest legitimate
// field and 4KB is plenty for three short answers.
const MAX_RAW_TEXT_LEN = 4096
const MAX_FREE_TEXT_LEN = 200

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  // --- Validate device_id (required) ---
  // Client mints this once and persists in localStorage. Format is loose
  // (any printable string up to 80 chars) — we use it for rate limiting
  // and dedupe, not auth.
  const deviceId = truncate(String(body?.device_id || '').trim(), 80)
  if (!deviceId || deviceId.length < 4) {
    return json({ ok: false, error: 'invalid_device_id' }, 400)
  }

  // --- Validate raw_text (required) ---
  // The user's verbatim answers. We always require something — even an
  // empty mentor session shouldn't be confirmed.
  const rawText = String(body?.raw_text || '').trim()
  if (!rawText || rawText.length < 1) {
    return json({ ok: false, error: 'raw_text_required' }, 400)
  }
  const truncatedRaw = rawText.length > MAX_RAW_TEXT_LEN
    ? rawText.slice(0, MAX_RAW_TEXT_LEN)
    : rawText

  // --- Validate enum fields (all optional, but must be valid if present) ---
  const sector = normalizeEnum(body?.sector, VALID_SECTORS)
  const motivation = normalizeEnum(body?.motivation, VALID_MOTIVATIONS)
  const experience = normalizeEnum(body?.experience, VALID_EXPERIENCE)
  const language = normalizeEnum(body?.language, VALID_LANGUAGES)

  // --- Free-form fields (with length caps) ---
  const role = truncate(String(body?.role || '').trim(), MAX_FREE_TEXT_LEN) || null
  const target = truncate(String(body?.target || '').trim(), MAX_FREE_TEXT_LEN) || null
  const userHandle = truncate(String(body?.user_handle || '').trim(), 60) || null
  const appVersion = truncate(String(body?.app_version || '').trim(), 30) || null

  // --- Confidence + confirmation ---
  let aiConfidence: number | null = null
  if (typeof body?.ai_confidence === 'number'
      && body.ai_confidence >= 0
      && body.ai_confidence <= 1
      && Number.isFinite(body.ai_confidence)) {
    aiConfidence = body.ai_confidence
  }
  const userConfirmed = body?.user_confirmed === true

  // --- Server-side request fingerprint (never trust client) ---
  const userAgent = truncate(req.headers.get('user-agent') || '', 512)
  const ipHash = hashIp(req.headers.get('x-forwarded-for') || '')

  // --- Service-role client (bypasses RLS) ---
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: 'server_misconfigured' }, 500)
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // --- Per-device rate limit ---
  // Cheap query — indexed on (device_id, inferred_at desc). If we hit
  // the cap, drop silently with a 429 so the client can downgrade
  // gracefully (the badge already saved locally — telemetry loss is
  // acceptable; user-facing breakage is not).
  const dayAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: recentCount, error: countErr } = await supabase
    .from('user_goals')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', deviceId)
    .gte('inferred_at', dayAgoIso)

  if (countErr) {
    console.warn('[capture-goal] rate-limit query failed:', countErr.message)
    // Don't fail the request — proceed and let the insert succeed or fail
    // on its own. We'd rather over-log than refuse a legitimate user.
  } else if ((recentCount || 0) >= PER_DEVICE_DAILY_CAP) {
    return json({ ok: false, error: 'rate_limited', retry_after_hours: 24 }, 429)
  }

  // --- Insert ---
  const { error } = await supabase.from('user_goals').insert({
    user_handle: userHandle,
    device_id: deviceId,
    sector,
    role,
    motivation,
    experience,
    target,
    raw_text: truncatedRaw,
    ai_confidence: aiConfidence,
    user_confirmed: userConfirmed,
    app_version: appVersion,
    language,
    user_agent: userAgent,
    ip_hash: ipHash,
  })

  if (error) {
    console.error('[capture-goal] insert error:', error.message)
    return json({ ok: false, error: 'insert_failed' }, 500)
  }

  return json({ ok: true })
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function truncate(s: string, n: number) {
  if (!s) return s
  return s.length > n ? s.slice(0, n) : s
}

// Strict enum check. Accepts only exact-match string values; everything
// else (numbers, undefined, unrecognized strings, mixed case) becomes null.
function normalizeEnum(v: unknown, valid: Set<string>): string | null {
  if (typeof v !== 'string') return null
  const lower = v.trim().toLowerCase()
  return valid.has(lower) ? lower : null
}

// Same FNV-1a hash as track-referral / capture-email — keeps us from
// storing raw IPs while still enabling rough repeat-source detection.
function hashIp(ip: string): string {
  if (!ip) return ''
  const primary = ip.split(',')[0].trim()
  let h = 2166136261
  for (let i = 0; i < primary.length; i++) {
    h ^= primary.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}
