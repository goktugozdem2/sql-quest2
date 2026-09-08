-- Peer-to-peer referrals: the two database objects the feature was shipped
-- against and that were never created.
--
-- ── What was broken ─────────────────────────────────────────────────────────
-- Measured 2026-09-08. `public.referrals` holds 103 rows across 37 ref codes
-- going back to 2026-04-29 — and every one of them is a MARKETING campaign
-- code (lp_fraud, blog_groupby, weekly_2026-w18, …). Personal codes, the
-- 8-character ones `generatePersonalRefCode` mints from a username:
--
--     select count(*) from referrals where ref_code ~ '^[A-Z0-9]{8}$';  -- 0
--
-- Zero, ever. The campaign half works because it needs no lookup. The peer
-- half needs two things that do not exist:
--
--   1. `public.users.personal_ref_code` — queried by `track-referral`
--      (`.or('personal_ref_code.eq.…')`, the branch that decides a click is a
--      peer referral rather than an affiliate one) and by `my-referral-stats`
--      (`.select('username, personal_ref_code, data')`).
--      public.users is (username, password_hash, salt, data, created_at,
--      updated_at, email). The column was never added.
--
--   2. `public.get_my_referral_stats(p_username)` — called by
--      `my-referral-stats` and by `claim-referral-reward`. Only
--      `get_referral_stats` (the campaign/partner rollup) exists.
--
-- Both callers swallow the error: the client's fetch is wrapped in
-- `catch (_) { /* silent — keep prior values */ }`, so the Invite modal has
-- always rendered zeros and nobody ever saw a failure. That is why this cost
-- four months without anyone noticing.
--
-- ── Note on what this does NOT fix ──────────────────────────────────────────
-- Applying this makes the peer loop *capable* of recording. It does not by
-- itself produce referrals: the only entry point in the whole app is a small
-- 🎁 button in the Leaderboard tab header, and the Leaderboard has no
-- `*_tab_viewed` event, so we still cannot say how many people have ever been
-- in a position to press it. Instrumentation and placement are separate work.

-- ── 1. The column ───────────────────────────────────────────────────────────
alter table public.users add column if not exists personal_ref_code text;

-- Codes are derived from the username, so they are already unique — but a
-- duplicate would silently mis-attribute someone else's referrals, which is
-- the one failure mode worth a hard constraint.
create unique index if not exists users_personal_ref_code_key
  on public.users (personal_ref_code)
  where personal_ref_code is not null;

-- Backfill from what the client has been stamping into userData since the
-- feature shipped (`userData.personalRefCode`, app.jsx). Skips guests, whose
-- generator returns null, and skips anything that is not the 8-char shape so
-- a malformed legacy value cannot claim the unique index.
update public.users u
   set personal_ref_code = u.data->>'personalRefCode'
 where u.personal_ref_code is null
   and u.data->>'personalRefCode' ~ '^[A-Z0-9]{8}$'
   and u.username not like 'guest%'
   and not exists (
     select 1 from public.users x
      where x.personal_ref_code = u.data->>'personalRefCode'
   );

-- ── 2. The rollup ───────────────────────────────────────────────────────────
-- Contract fixed by supabase/functions/my-referral-stats/index.ts and
-- claim-referral-reward/index.ts. The reward formula is enforced in THREE
-- places — here, `calculateProDaysEarned` in src/utils/referrals.js, and the
-- edge function's own next-milestone maths. tests/referrals.test.js asserts
-- the JS side; change all three together or they drift.
--
--   1 signup  → +3  days      (tiers are the highest reached, NOT cumulative)
--   3 signups → +7  days
--   5 signups → +14 days
--   each pro_conversion → +30 days (stacks on top of the tier)
--
-- SECURITY DEFINER for the same reason as get_referral_stats: `referrals`
-- carries ip_hash and user_agent, and anon must never select it directly.
-- Scoped to one username's own code, so it cannot enumerate anyone else.
create or replace function public.get_my_referral_stats(p_username text)
returns table (
  clicks           bigint,
  signups          bigint,
  conversions      bigint,
  pro_days_earned  integer,
  last_event_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select personal_ref_code as code
      from public.users
     where username = p_username
       and personal_ref_code is not null
     limit 1
  ),
  agg as (
    select
      count(*) filter (where r.event_type = 'click')          as clicks,
      count(*) filter (where r.event_type = 'signup')         as signups,
      count(*) filter (where r.event_type = 'pro_conversion') as conversions,
      max(r.created_at)                                       as last_event_at
    from public.referrals r
    join me on r.ref_code = me.code
  )
  select
    coalesce(a.clicks, 0),
    coalesce(a.signups, 0),
    coalesce(a.conversions, 0),
    (
      -- highest signup tier reached, not the sum of tiers
      case
        when coalesce(a.signups, 0) >= 5 then 14
        when coalesce(a.signups, 0) >= 3 then 7
        when coalesce(a.signups, 0) >= 1 then 3
        else 0
      end
      + coalesce(a.conversions, 0)::int * 30
    )::int,
    a.last_event_at
  from agg a;
$$;

revoke all on function public.get_my_referral_stats(text) from public, anon;
grant execute on function public.get_my_referral_stats(text) to service_role;
