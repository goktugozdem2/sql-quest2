-- Affiliate / referral tracking
-- =================================================================
-- Run this in the Supabase SQL editor once. After it lands, deploy
-- the two edge functions:
--
--   supabase functions deploy track-referral
--   supabase functions deploy referrals-summary
--
-- And set REFERRALS_ADMIN_PASSWORD as a Supabase function secret
-- (NOT the same as the in-app admin password — pick something strong;
-- it gates read access to aggregated affiliate stats):
--
--   supabase secrets set REFERRALS_ADMIN_PASSWORD=<long-random-string>
--
-- Two tables:
--   public.referrals          — append-only event log (click/signup/conversion)
--   public.referral_partners  — manually maintained partner directory
--
-- The event log is the source of truth. Partner directory is a thin
-- wrapper to give nice display names + commission rates in the
-- dashboard. We never join referrals.ref_code → referral_partners.ref_code
-- with a foreign key — we want to record clicks for unknown partner
-- codes too (typo, retired partner, brand-confusion test) so we can
-- catch attribution leaks.

-- --- Event log ---------------------------------------------------

create table if not exists public.referrals (
  id              bigint generated always as identity primary key,
  ref_code        text not null,                    -- normalized: lowercase, [a-z0-9_-]{2,60}
  event_type      text not null check (event_type in ('click', 'signup', 'pro_conversion')),
  username        text,                             -- present for signup + conversion
  email           text,                             -- present at conversion
  plan_type       text,                             -- 'monthly' | 'annual' | 'lifetime'
  amount_cents    int,                              -- Stripe amount_total at conversion (USD cents)
  user_agent      text,
  referrer_url    text,                             -- HTTP Referer header at click time
  ip_hash         text,                             -- FNV-1a hash of IPv4/v6, never raw
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- Funnel queries are always (ref_code, event_type) — partition that.
create index if not exists referrals_ref_event_idx
  on public.referrals (ref_code, event_type);

-- Time-series rollups for the dashboard.
create index if not exists referrals_created_at_idx
  on public.referrals (created_at desc);

-- Conversion-only fast path (small subset of total rows).
create index if not exists referrals_conversion_idx
  on public.referrals (created_at desc)
  where event_type = 'pro_conversion';

-- --- Partner directory ------------------------------------------

create table if not exists public.referral_partners (
  ref_code         text primary key,
  display_name     text not null,
  audience_size    int,                              -- approximate, manual entry
  channel          text,                             -- 'youtube' | 'twitter' | 'newsletter' | 'bootcamp' | 'other'
  commission_pct   int default 30 check (commission_pct between 0 and 100),
  notes            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- --- Row-level security ------------------------------------------
-- Both tables: NO public access. Only service role (used by edge
-- functions) and authenticated postgres roles can read/write. The
-- track-referral edge function inserts; referrals-summary aggregates
-- and gates on REFERRALS_ADMIN_PASSWORD before returning data.

alter table public.referrals          enable row level security;
alter table public.referral_partners  enable row level security;

-- No policies = no access from anon role. Service role bypasses RLS
-- by design, so edge functions Just Work. Don't add an anon policy.

-- --- Aggregation function ----------------------------------------
-- The dashboard needs per-partner rollups. Doing the GROUP BY in SQL is
-- cheaper than pulling 50k events and aggregating in TS. Returns one row
-- per ref_code seen in the time window, joined with the partner directory
-- so display names + commission rates ride along.
--
-- Service-role-only by default (no GRANT to anon). The referrals-summary
-- edge function calls this via RPC after gating on admin password.

create or replace function public.get_referral_stats(p_since timestamptz default now() - interval '90 days')
returns table (
  ref_code         text,
  display_name     text,
  channel          text,
  commission_pct   int,
  active           boolean,
  clicks           bigint,
  signups          bigint,
  conversions      bigint,
  mrr_cents        bigint,
  last_event_at    timestamptz
)
language sql
security definer
stable
as $$
  with agg as (
    select
      r.ref_code,
      count(*) filter (where r.event_type = 'click')           as clicks,
      count(*) filter (where r.event_type = 'signup')          as signups,
      count(*) filter (where r.event_type = 'pro_conversion')  as conversions,
      coalesce(sum(r.amount_cents) filter (where r.event_type = 'pro_conversion'), 0) as mrr_cents,
      max(r.created_at) as last_event_at
    from public.referrals r
    where r.created_at >= p_since
    group by r.ref_code
  )
  select
    a.ref_code,
    p.display_name,
    p.channel,
    coalesce(p.commission_pct, 30) as commission_pct,
    coalesce(p.active, true)        as active,
    a.clicks,
    a.signups,
    a.conversions,
    a.mrr_cents,
    a.last_event_at
  from agg a
  left join public.referral_partners p on p.ref_code = a.ref_code
  order by a.mrr_cents desc, a.conversions desc, a.signups desc, a.clicks desc;
$$;

-- Lock down the function — service role only. We grant explicitly to the
-- service_role to make the intent obvious; revoke from public to be sure.
revoke all on function public.get_referral_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.get_referral_stats(timestamptz) to service_role;

-- --- Initial partner seed (optional, edit as you go) -------------
-- Uncomment + customize as you sign partners. ON CONFLICT lets you
-- re-run this block safely:
--
-- insert into public.referral_partners (ref_code, display_name, channel, commission_pct, notes)
-- values
--   ('tinahuang',  'Tina Huang',           'youtube',    30, 'FAANG data scientist, 700k+'),
--   ('alex',       'Alex The Analyst',     'youtube',    30, 'Analytics audience, 600k+'),
--   ('luke',       'Luke Barousse',        'youtube',    30, 'Data career, 500k+')
-- on conflict (ref_code) do nothing;
