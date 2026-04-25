// Supabase Edge Function: referrals-summary
// Deploy: supabase functions deploy referrals-summary
//
// Admin-gated read endpoint for the affiliate dashboard. Returns per-partner
// rollups (clicks, signups, conversions, MRR attributed, last activity)
// joined with the manually-maintained referral_partners directory.
//
// Auth: a single shared secret in the REFERRALS_ADMIN_PASSWORD env var.
// This intentionally uses a separate password from the in-app
// `'adminadmin'` constant — that one has no rate-limiting and is too
// easy to leak. The referrals dashboard exposes signup/conversion data
// for every partner in aggregate, so it deserves its own gate.
//
//   supabase secrets set REFERRALS_ADMIN_PASSWORD=<long-random-string>
//
// Body: { admin_password: string, since_days?: number (1..365, default 90) }
// Returns: { ok: true, totals: {...}, rows: [{ref_code,...}] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  // --- Auth gate ---
  const ADMIN_PASSWORD = Deno.env.get('REFERRALS_ADMIN_PASSWORD')
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    // Defensive: refuse to serve if the secret isn't configured. Silently
    // returning data with a missing/short password would be a footgun.
    return json({ ok: false, error: 'server_misconfigured' }, 500)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  const submitted = String(body?.admin_password || '')
  if (!constantTimeEq(submitted, ADMIN_PASSWORD)) {
    // Generic message — don't help an attacker distinguish "no password"
    // from "wrong password" from "wrong format".
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  // --- Window (default last 90 days, capped at 365) ---
  let sinceDays = Number(body?.since_days)
  if (!Number.isFinite(sinceDays) || sinceDays < 1) sinceDays = 90
  if (sinceDays > 365) sinceDays = 365
  const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

  // --- Service-role client (bypasses RLS) ---
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: 'server_misconfigured' }, 500)
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data, error } = await supabase
    .rpc('get_referral_stats', { p_since: sinceIso })

  if (error) {
    console.error('[referrals-summary] rpc error:', error.message)
    return json({ ok: false, error: 'query_failed' }, 500)
  }

  const rows = Array.isArray(data) ? data : []

  // Roll the totals up here so the dashboard doesn't have to. Keeps the
  // header-strip query out of the React component.
  const totals = rows.reduce(
    (acc, r: any) => {
      acc.clicks      += Number(r.clicks)      || 0
      acc.signups     += Number(r.signups)     || 0
      acc.conversions += Number(r.conversions) || 0
      acc.mrr_cents   += Number(r.mrr_cents)   || 0
      return acc
    },
    { clicks: 0, signups: 0, conversions: 0, mrr_cents: 0 }
  )

  return json({
    ok: true,
    since: sinceIso,
    since_days: sinceDays,
    totals,
    rows,
  })
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Constant-time string compare so we don't leak the admin password length
// via response timing. Pads to the longer of the two so unequal-length
// inputs still take the same number of XOR steps.
function constantTimeEq(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const len = Math.max(a.length, b.length)
  let mismatch = a.length === b.length ? 0 : 1
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0
    const cb = i < b.length ? b.charCodeAt(i) : 0
    mismatch |= ca ^ cb
  }
  return mismatch === 0
}
