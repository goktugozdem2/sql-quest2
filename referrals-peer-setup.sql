-- ============================================================
-- Referrals Peer-to-Peer Extension
-- ============================================================
-- Run this in the Supabase SQL editor AFTER referrals-setup.sql.
--
-- This extends the existing affiliate/partner system with peer-to-peer
-- user referrals: every user can share their personal link, friends sign
-- up, both get Pro days as a reward.
--
-- After running this migration:
--   1. Deploy the updated track-referral function:
--        supabase functions deploy track-referral
--   2. Deploy the new my-referral-stats function:
--        supabase functions deploy my-referral-stats
--
-- Schema additions:
--   public.users.personal_ref_code  — each user's unique invite code
--   public.referrals.referrer_username — peer-to-peer attribution
--
-- The existing affiliate columns (ref_code, etc.) are unchanged. Both
-- systems coexist:
--   - Partner codes (e.g. "tinahuang") — manual entries in referral_partners
--   - User codes (e.g. "GOKTUG12") — auto-generated, mirror in users
--
-- When a click comes in:
--   1. ref_code is looked up in users.personal_ref_code first
--   2. If found → referrer_username is populated, peer reward kicks in
--   3. If not found → treated as legacy partner code (affiliate flow)
-- ============================================================

-- --- Add personal_ref_code to users ------------------------------

alter table public.users
  add column if not exists personal_ref_code text;

-- Unique constraint, partial so existing NULLs don't conflict
create unique index if not exists users_personal_ref_code_idx
  on public.users (personal_ref_code)
  where personal_ref_code is not null;

-- --- Add referrer_username to referrals --------------------------

alter table public.referrals
  add column if not exists referrer_username text;

-- Index for "who referred me" / "how many friends did I refer" queries
create index if not exists referrals_referrer_username_idx
  on public.referrals (referrer_username, event_type)
  where referrer_username is not null;

-- --- Backfill personal_ref_code for existing users ---------------
-- Mirrors the client-side btoa(username) format used in src/app.jsx:
--   btoa(username).replace(/[=+/]/g, '').substring(0, 8).toUpperCase()
--
-- Postgres equivalent: encode(convert_to(username, 'UTF8'), 'base64'),
-- strip padding/+/, take first 8, upper. The substring positions match
-- so existing localStorage codes line up with DB lookups on first save.

update public.users
set personal_ref_code = upper(
  substring(
    regexp_replace(
      encode(convert_to(username, 'UTF8'), 'base64'),
      '[+/=]', '', 'g'
    ),
    1, 8
  )
)
where personal_ref_code is null
  and username is not null
  and username !~ '^guest_';

-- --- Per-user stats RPC ------------------------------------------
-- Returns rollups for ONE user's referral activity. Used by the
-- my-referral-stats Edge Function.
--
-- Two queries combined:
--   1. Count clicks/signups/conversions where referrer_username = me
--   2. Sum amount_cents on conversions for the friend-Pro reward
--
-- Returns 0s if the user has no activity yet.

create or replace function public.get_my_referral_stats(p_username text)
returns table (
  clicks         bigint,
  signups        bigint,
  conversions    bigint,
  pro_days_earned int,
  last_event_at  timestamptz
)
language sql
security definer
stable
as $$
  with agg as (
    select
      count(*) filter (where event_type = 'click')          as clicks,
      count(*) filter (where event_type = 'signup')         as signups,
      count(*) filter (where event_type = 'pro_conversion') as conversions,
      max(created_at) as last_event_at
    from public.referrals
    where referrer_username = lower(p_username)
  )
  select
    coalesce(a.clicks, 0)      as clicks,
    coalesce(a.signups, 0)     as signups,
    coalesce(a.conversions, 0) as conversions,
    -- Reward formula:
    --   1 signup  → +3  days
    --   3 signups → +7  days  (replaces 3, total 7)
    --   5 signups → +14 days  (replaces 7, total 14)
    --   each conversion → +30 days
    -- Tiered milestone (highest tier hit) + per-conversion bonus.
    (case
       when coalesce(a.signups, 0) >= 5 then 14
       when coalesce(a.signups, 0) >= 3 then 7
       when coalesce(a.signups, 0) >= 1 then 3
       else 0
     end + coalesce(a.conversions, 0) * 30)::int as pro_days_earned,
    a.last_event_at
  from agg a;
$$;

-- Service role only (Edge Function calls via RPC)
revoke all on function public.get_my_referral_stats(text) from public, anon, authenticated;
grant execute on function public.get_my_referral_stats(text) to service_role;

-- ============================================================
-- Verification queries (run these to sanity-check after migration)
-- ============================================================
--
-- 1. How many users got backfilled codes?
--    select count(*) from public.users where personal_ref_code is not null;
--
-- 2. Spot-check the format:
--    select username, personal_ref_code from public.users
--      where personal_ref_code is not null
--      order by created_at desc limit 10;
--
-- 3. Test the stats RPC for a real user:
--    select * from public.get_my_referral_stats('your_username_here');
--
-- 4. Confirm RLS is unchanged on referrals:
--    select schemaname, tablename, rowsecurity
--      from pg_tables
--      where schemaname = 'public' and tablename = 'referrals';
