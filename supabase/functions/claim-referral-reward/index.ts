// Supabase Edge Function: claim-referral-reward
// Deploy: supabase functions deploy claim-referral-reward
//
// Idempotent grant of Pro days earned via peer-to-peer referrals.
// Computes the user's currently-earned Pro days (using the same RPC
// the my-referral-stats endpoint uses), subtracts what they've already
// claimed (stored in userData.referralProDaysClaimed), and extends
// userData.proExpiry by the delta.
//
//   Body: { username: string }
//   Returns: {
//     ok: true,
//     username: string,
//     pro_days_earned: number,
//     pro_days_already_claimed: number,
//     pro_days_granted_this_call: number,    // = earned - already_claimed
//     new_pro_expiry: ISO string | null,     // null if pro was lifetime
//   }
//
// Idempotency contract:
//   - Calling with no new earnings is a no-op (granted = 0).
//   - Calling twice in succession grants the second time only if new
//     signups/conversions happened between calls.
//   - The state is stored in userData jsonb (referralProDaysClaimed)
//     and reflects the cumulative grant total. Never decreases.
//
// Pro expiry math:
//   - If user is currently NOT Pro and claims 3 days → set proStatus
//     true, proType "trial", proExpiry = now + 3 days, proAutoRenew false.
//   - If user is Pro with future expiry → extend by delta days.
//   - If user is Pro lifetime → no-op on expiry, but still track claimed
//     count so the modal shows "all rewards already applied to lifetime."
//
// Auth: this is a public endpoint (anyone can ask for any user). Granting
// Pro days is not security-sensitive because the days come from
// verifiable referral records — even if an attacker triggers it for
// another user, they can only grant what that user has actually earned.
// We DO NOT trust client-supplied days_earned values (we recompute via
// the SQL RPC every call).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const USERNAME_RE = /^[a-zA-Z0-9_-]{2,60}$/

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

  const rawUsername = String(body?.username || '').trim()
  if (!USERNAME_RE.test(rawUsername)) {
    return json({ ok: false, error: 'invalid_username' }, 400)
  }
  const username = rawUsername.toLowerCase()

  // --- Service-role client ---
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: 'server_misconfigured' }, 500)
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // --- Look up the user (need their data jsonb to compute delta + extend) ---
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('username, data')
    .or(`username.eq.${username},username.eq.${rawUsername}`)
    .limit(1)
    .maybeSingle()

  if (userErr || !userRow) {
    return json({ ok: false, error: 'user_not_found' }, 404)
  }

  const userData = (userRow.data && typeof userRow.data === 'object') ? userRow.data : {}

  // --- Compute currently-earned Pro days from the canonical RPC ---
  // Same source of truth my-referral-stats uses; if we change the formula
  // there, this stays in sync automatically.
  const { data: statsRows, error: statsErr } = await supabase
    .rpc('get_my_referral_stats', { p_username: userRow.username })

  if (statsErr) {
    console.error('[claim-referral-reward] rpc error:', statsErr.message)
    return json({ ok: false, error: 'stats_query_failed' }, 500)
  }

  const stats = Array.isArray(statsRows) && statsRows[0]
    ? statsRows[0]
    : { clicks: 0, signups: 0, conversions: 0, pro_days_earned: 0, last_event_at: null }

  const earned  = Math.max(0, Number(stats.pro_days_earned) || 0)
  const claimed = Math.max(0, Number(userData.referralProDaysClaimed) || 0)
  const delta   = Math.max(0, earned - claimed)

  // --- Compute new Pro expiry (or report no-op for lifetime / nothing-to-claim) ---
  let newProExpiryIso: string | null = userData.proExpiry || null

  if (delta > 0) {
    // Lifetime users get the claimed count bumped but no expiry change —
    // makes the modal display "all rewards applied" without losing track
    // of how many they've earned for analytics.
    const isLifetime = userData.proType === 'lifetime' || userData.proStatus === 'lifetime'

    if (!isLifetime) {
      const now = Date.now()
      const currentExpiryMs = userData.proExpiry ? Date.parse(userData.proExpiry) : 0
      // If they're currently Pro with future expiry, extend from there.
      // If their Pro expired or they're not Pro, extend from now.
      const baseMs = (Number.isFinite(currentExpiryMs) && currentExpiryMs > now) ? currentExpiryMs : now
      const newExpiryMs = baseMs + delta * 24 * 60 * 60 * 1000
      newProExpiryIso = new Date(newExpiryMs).toISOString()

      userData.proStatus    = true
      userData.proType      = userData.proType && userData.proType !== 'expired' ? userData.proType : 'referral_trial'
      userData.proExpiry    = newProExpiryIso
      userData.proAutoRenew = userData.proType === 'monthly' || userData.proType === 'annual'
    }

    userData.referralProDaysClaimed = earned
    userData.referralLastClaimAt    = new Date().toISOString()

    // Persist
    const { error: updErr } = await supabase
      .from('users')
      .update({ data: userData, updated_at: new Date().toISOString() })
      .eq('username', userRow.username)

    if (updErr) {
      console.error('[claim-referral-reward] update error:', updErr.message)
      return json({ ok: false, error: 'update_failed' }, 500)
    }

    // Best-effort audit trail in pro_events table (if exists). Non-fatal.
    try {
      await supabase.from('pro_events').insert({
        username:    userRow.username,
        event_type:  'referral_claim',
        plan_type:   userData.proType,
        amount_cents: 0,
        metadata: {
          earned, claimed_before: claimed, granted: delta,
          new_pro_expiry: newProExpiryIso,
          stats: {
            signups:     Number(stats.signups) || 0,
            conversions: Number(stats.conversions) || 0,
          },
        },
      })
    } catch (_) { /* ignore — audit logging is best-effort */ }
  }

  return json({
    ok: true,
    username: userRow.username,
    pro_days_earned: earned,
    pro_days_already_claimed: claimed,
    pro_days_granted_this_call: delta,
    new_pro_expiry: newProExpiryIso,
    pro_status: userData.proStatus || false,
    pro_type: userData.proType || null,
  })
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
