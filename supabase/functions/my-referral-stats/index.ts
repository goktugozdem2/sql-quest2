// Supabase Edge Function: my-referral-stats
// Deploy: supabase functions deploy my-referral-stats
//
// Returns ONE user's peer-to-peer referral rollup. Powers the in-app
// "Invite Friends" modal that shows the user's personal stats.
//
//   Body: { username: string }
//   Returns: {
//     ok: true,
//     username: string,
//     personal_ref_code: string | null,
//     stats: {
//       clicks:          number,
//       signups:         number,
//       conversions:     number,
//       pro_days_earned: number,    // tiered milestone + per-conversion bonus
//       last_event_at:   ISO string | null,
//     },
//     next_milestone: {
//       at:       number,           // signups required for next tier
//       reward:   string,           // human label, e.g. "+14 days Pro"
//       remaining: number,          // signups still needed
//     } | null,
//   }
//
// Reward formula (kept in sync with get_my_referral_stats SQL):
//   1 signup  → +3  days
//   3 signups → +7  days
//   5 signups → +14 days
//   each pro_conversion → +30 days (stacks)
//
// Auth model: this is a public endpoint — anyone can ask for any user's
// stats. We DO NOT consider this PII (it's only counts + days earned;
// no email, no IP, no friend list). Rate limiting is at the
// platform level (Supabase function quota); we don't add per-IP throttle
// here because the cost per call is one indexed query + one RPC.
//
// If the username doesn't exist or has no activity, returns zeros — the
// modal renders fine with empty state.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mirror src/utils/referrals.js — username shape is similar to ref code,
// but we keep the bound looser (60 chars) since usernames pre-date the
// referral system and may have legacy formats.
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

  // --- Service role client ---
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: 'server_misconfigured' }, 500)
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // --- Look up the user's personal_ref_code + already-claimed count ---
  // Case-insensitive on username because the auth flow accepts mixed case
  // but stores lowercased. The DB column is itself case-sensitive — we
  // search both forms to be safe across legacy data. We also pull `data`
  // jsonb so we can surface referralProDaysClaimed (used by the claim
  // button to compute the unclaimed delta).
  const { data: userRow } = await supabase
    .from('users')
    .select('username, personal_ref_code, data')
    .or(`username.eq.${username},username.eq.${rawUsername}`)
    .limit(1)
    .maybeSingle()

  if (!userRow) {
    // User doesn't exist (or has not synced to cloud yet). Return zeros
    // gracefully so the modal doesn't error — caller can detect the
    // null personal_ref_code and prompt account creation.
    return json({
      ok: true,
      username: rawUsername,
      personal_ref_code: null,
      stats: {
        clicks: 0,
        signups: 0,
        conversions: 0,
        pro_days_earned: 0,
        pro_days_claimed: 0,
        pro_days_unclaimed: 0,
        last_event_at: null,
      },
      next_milestone: { at: 1, reward: '+3 days Pro', remaining: 1 },
    })
  }

  // --- Pull rollup from RPC ---
  const { data: statsRows, error } = await supabase
    .rpc('get_my_referral_stats', { p_username: userRow.username })

  if (error) {
    console.error('[my-referral-stats] rpc error:', error.message)
    return json({ ok: false, error: 'query_failed' }, 500)
  }

  const stats = Array.isArray(statsRows) && statsRows[0]
    ? statsRows[0]
    : { clicks: 0, signups: 0, conversions: 0, pro_days_earned: 0, last_event_at: null }

  // --- Compute next milestone (matches the SQL formula) ---
  // Tiers: 1 → 3 → 5 signups, then conversions are bonus-only (no further
  // signup tier). Once at 5+, the next milestone is the next conversion.
  const signups = Number(stats.signups) || 0
  let nextMilestone: { at: number; reward: string; remaining: number } | null
  if (signups < 1) {
    nextMilestone = { at: 1, reward: '+3 days Pro', remaining: 1 - signups }
  } else if (signups < 3) {
    nextMilestone = { at: 3, reward: '+7 days Pro', remaining: 3 - signups }
  } else if (signups < 5) {
    nextMilestone = { at: 5, reward: '+14 days Pro', remaining: 5 - signups }
  } else {
    // All signup tiers hit; next reward only comes from a friend going Pro.
    nextMilestone = { at: 0, reward: '+30 days when a friend upgrades to Pro', remaining: 0 }
  }

  // Already-claimed count lives in userData jsonb (set by claim-referral-
  // reward). null/missing means no claims yet.
  const userData = (userRow.data && typeof userRow.data === 'object') ? userRow.data : {}
  const claimed = Math.max(0, Number(userData.referralProDaysClaimed) || 0)
  const earned  = Number(stats.pro_days_earned) || 0
  const unclaimed = Math.max(0, earned - claimed)

  return json({
    ok: true,
    username: userRow.username,
    personal_ref_code: userRow.personal_ref_code || null,
    stats: {
      clicks:             Number(stats.clicks) || 0,
      signups,
      conversions:        Number(stats.conversions) || 0,
      pro_days_earned:    earned,
      pro_days_claimed:   claimed,
      pro_days_unclaimed: unclaimed,
      last_event_at:      stats.last_event_at || null,
    },
    next_milestone: nextMilestone,
  })
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
