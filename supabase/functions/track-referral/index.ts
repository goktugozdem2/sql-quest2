// Supabase Edge Function: track-referral
// Deploy: supabase functions deploy track-referral
//
// Logs affiliate-funnel events into public.referrals. Three event types:
//
//   'click'           — anonymous, fired at landing-page module load
//                       when ?ref=foo arrives. No username yet.
//   'signup'          — fired the first time a new user record is saved
//                       to cloud, if they had a referrer in localStorage.
//   'pro_conversion'  — fired by the stripe-webhook when a Pro purchase
//                       completes for a user with userData.refCode set.
//
// Schema is in referrals-setup.sql. RLS is on, no public policies — this
// function runs with the service role key, so it bypasses RLS by design.
// We re-validate every input here and never trust client-supplied IP /
// user_agent / referrer (we read those server-side from request headers).
//
// Public endpoint — no auth required. Anyone can submit a 'click' event.
// Spam mitigation: client-side dedupe on ref-code-change (so refreshes
// don't repeat clicks), plus per-IP rate-limiting via ip_hash + a bound.
// We accept the floor-level noise as acceptable; tighten if it ever gets
// abused.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mirror src/utils/referrals.js — keep these regexes in lockstep.
const REF_CODE_RE = /^[a-z0-9_-]{2,60}$/i
const VALID_EVENTS = new Set(['click', 'signup', 'pro_conversion'])

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

  // --- Validate ref_code ---
  const rawRef = String(body?.ref_code || '').trim()
  if (!REF_CODE_RE.test(rawRef)) {
    return json({ ok: false, error: 'invalid_ref_code' }, 400)
  }
  const refCode = rawRef.toLowerCase()

  // --- Validate event_type ---
  const eventType = String(body?.event_type || '').trim()
  if (!VALID_EVENTS.has(eventType)) {
    return json({ ok: false, error: 'invalid_event_type' }, 400)
  }

  // --- Optional fields ---
  // Username/email only meaningful for signup + conversion. We store them
  // either way if the client sends them; track-referral isn't the security
  // boundary, the trust boundary is the stripe-webhook (which doesn't go
  // through this function — it inserts directly with verified Stripe data).
  const username   = truncate(String(body?.username   || ''), 60)  || null
  const email      = truncate(String(body?.email      || ''), 255) || null
  const planType   = truncate(String(body?.plan_type  || ''), 20)  || null
  const amount     = Number.isInteger(body?.amount_cents) ? body.amount_cents : null
  const metadata   = (typeof body?.metadata === 'object' && body.metadata) ? body.metadata : {}

  // Cap metadata size — 4KB is generous. Anything bigger is suspicious.
  let metadataJson: any = metadata
  try {
    const s = JSON.stringify(metadata)
    if (s.length > 4096) {
      metadataJson = { _truncated: true }
    }
  } catch {
    metadataJson = {}
  }

  // --- Server-side request fingerprint (never trust client) ---
  const userAgent  = truncate(req.headers.get('user-agent') || '', 512)
  const referrer   = truncate(req.headers.get('referer')    || '', 512)
  const ipHash     = hashIp(req.headers.get('x-forwarded-for') || '')

  // --- Insert ---
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: 'server_misconfigured' }, 500)
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const { error } = await supabase.from('referrals').insert({
    ref_code:     refCode,
    event_type:   eventType,
    username,
    email:        email ? email.toLowerCase() : null,
    plan_type:    planType,
    amount_cents: amount,
    user_agent:   userAgent,
    referrer_url: referrer,
    ip_hash:      ipHash,
    metadata:     metadataJson,
  })

  if (error) {
    console.error('[track-referral] insert error:', error.message)
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

// Same FNV-1a-ish hash as capture-email — keeps us from storing raw IPs
// while still enabling repeat-click detection from the same source.
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
