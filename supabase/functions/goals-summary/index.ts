// Supabase Edge Function: goals-summary
// Deploy: supabase functions deploy goals-summary
//
// Admin-gated read endpoint for the sector MVP weekly digest. Returns
// per-sector rollups (count, confirmed-count, top role/motivation/target,
// most-recent timestamp) over a configurable date window.
//
// Auth: REUSES the REFERRALS_ADMIN_PASSWORD secret. Both endpoints expose
// aggregate user behavior data; using one password keeps the surface
// area small and avoids "which password again?" friction. If you ever
// want to split the gate, set GOALS_ADMIN_PASSWORD and update the env
// read below.
//
// Body: { admin_password: string, since_days?: number (1..365, default 30) }
// Returns: { ok: true, since: ISO, since_days: number, rows: [{...}] }
//
// Background: docs/sector-mvp-plan.md

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

  // --- Auth gate (reuses referrals admin password by design) ---
  const ADMIN_PASSWORD = Deno.env.get('GOALS_ADMIN_PASSWORD')
    || Deno.env.get('REFERRALS_ADMIN_PASSWORD')
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    // Defensive: refuse to serve if neither secret is configured.
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
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  // --- Window (default 30 days, capped at 365) ---
  // Sector demand changes slowly. 30 days is the default sweet spot —
  // enough volume to be statistically meaningful, fresh enough to
  // catch a hot trend.
  let sinceDays = Number(body?.since_days)
  if (!Number.isFinite(sinceDays) || sinceDays < 1) sinceDays = 30
  if (sinceDays > 365) sinceDays = 365
  const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString()

  // --- Service-role client (bypasses RLS) ---
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: 'server_misconfigured' }, 500)
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const { data, error } = await supabase
    .rpc('get_goals_summary', { p_since: sinceIso })

  if (error) {
    console.error('[goals-summary] rpc error:', error.message)
    return json({ ok: false, error: 'query_failed' }, 500)
  }

  const rows = Array.isArray(data) ? data : []

  // Header rollup. The dashboard shows totals at the top; computing them
  // here keeps the React component free of secondary aggregation queries.
  const totals = rows.reduce(
    (acc, r: any) => {
      acc.total      += Number(r.total_count)     || 0
      acc.confirmed  += Number(r.confirmed_count) || 0
      return acc
    },
    { total: 0, confirmed: 0 }
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
// via response timing. Matches the implementation in referrals-summary.
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
