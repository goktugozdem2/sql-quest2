-- Sector MVP — user goal capture
-- =================================================================
-- Run this in the Supabase SQL editor once. After it lands, deploy
-- the two edge functions:
--
--   supabase functions deploy capture-goal
--   supabase functions deploy goals-summary
--
-- The goals-summary endpoint is admin-gated. It REUSES the existing
-- REFERRALS_ADMIN_PASSWORD secret — no new credential is needed.
-- (Both endpoints expose aggregate user data, so the same gate applies.)
--
-- Background: docs/sector-mvp-plan.md
--
-- One table:
--   public.user_goals — append-only log of structured goal extractions
--                       from the Goals Mentor onboarding flow
--
-- Each row is one user-confirmed mentor session. We append rather than
-- update so we keep the audit trail (people change careers, refine
-- their goals, retake the mentor — every snapshot tells us what was
-- true at that moment, which feeds the roadmap-from-data flywheel).

-- --- Goal log ---------------------------------------------------

create table if not exists public.user_goals (
  id              bigint generated always as identity primary key,

  -- Identity. user_handle is null for guests; device_id is the
  -- localStorage-persisted UUID we mint per browser. Together they
  -- give us the "this device, this account" axis for dedupe + analytics.
  user_handle     text,
  device_id       text not null,

  -- Canonical extracted fields. All nullable — partial extraction
  -- ("user told us their sector but not their target") is still
  -- useful signal. Don't add CHECK constraints on these strings —
  -- the canonical sector list lives in src/data/sectors.js and
  -- evolves; we don't want a schema migration every time we add
  -- a sector.
  sector          text,                              -- 'finans' | 'e-ticaret' | 'gayrimenkul' | 'generic' | null
  role            text,                              -- 'data_analyst' | 'product_manager' | etc
  motivation      text,                              -- 'interview' | 'current_job' | 'career_change' | 'curiosity'
  experience      text,                              -- 'beginner' | 'intermediate' | 'advanced'
  target          text,                              -- 'FAANG' | 'international' | 'promotion' | free-form

  -- Verbatim user answers, concatenated across the 3 mentor questions.
  -- This is the most valuable column — it's what feeds future tag-rule
  -- improvements + roadmap insights. Cap is enforced in the edge function
  -- (we truncate to 4KB before insert).
  raw_text        text not null,

  -- Confidence + provenance.
  ai_confidence   real,                              -- 0..1; LLM self-reported
  user_confirmed  boolean not null default false,    -- did the user click "Onaylıyorum"?
  inferred_at     timestamptz not null default now(),

  -- Operational metadata so we can slice analytics by client behavior.
  app_version     text,
  language        text,                              -- 'tr' | 'en'

  -- Server-side fingerprinting (matches track-referral pattern).
  user_agent      text,
  ip_hash         text,                              -- FNV-1a, never raw

  created_at      timestamptz not null default now()
);

-- Sector breakdown query is the most-run analytic ("how many users
-- said finans this week?"). Index supports `WHERE sector = ? ORDER BY ...`.
create index if not exists user_goals_sector_idx
  on public.user_goals (sector, inferred_at desc);

-- "All goals for this user" — drives the user-side timeline view if we
-- ever expose one. Also used by capture-goal to dedupe a user spamming
-- the mentor.
create index if not exists user_goals_handle_idx
  on public.user_goals (user_handle, inferred_at desc)
  where user_handle is not null;

-- Most-recent-per-device query for the goals-summary digest.
create index if not exists user_goals_device_idx
  on public.user_goals (device_id, inferred_at desc);

-- Time-window scans (weekly digest).
create index if not exists user_goals_inferred_at_idx
  on public.user_goals (inferred_at desc);

-- --- RLS ---------------------------------------------------------
-- No public read. Only service-role inserts via the capture-goal
-- edge function. Reads happen via goals-summary, which uses the
-- service role key + admin password gate.

alter table public.user_goals enable row level security;

-- Drop any existing policies (idempotent setup) before recreating.
drop policy if exists "user_goals_no_anon_read" on public.user_goals;
drop policy if exists "user_goals_no_anon_write" on public.user_goals;

-- Explicit deny for anon. Service role bypasses RLS entirely so the
-- edge functions still work. We're being explicit (rather than just
-- "no policies = no access") so future maintainers see the intent.
create policy "user_goals_no_anon_read"
  on public.user_goals for select
  to anon using (false);

create policy "user_goals_no_anon_write"
  on public.user_goals for insert
  to anon with check (false);

-- --- Aggregation function (used by goals-summary) ----------------
-- Returns sector breakdown + top motivations/roles/targets for a date
-- window. The edge function calls this RPC instead of writing complex
-- SQL inline so the contract stays in one place.

create or replace function public.get_goals_summary(p_since timestamptz)
returns table (
  sector            text,
  language          text,
  total_count       bigint,
  confirmed_count   bigint,
  top_role          text,
  top_motivation    text,
  top_target        text,
  most_recent       timestamptz
)
language sql
stable
as $$
  with windowed as (
    select * from public.user_goals
    where inferred_at >= p_since
  ),
  sector_lang_buckets as (
    select
      coalesce(w.sector, 'unknown') as sector,
      coalesce(w.language, 'unknown') as language,
      count(*)::bigint as total_count,
      sum(case when w.user_confirmed then 1 else 0 end)::bigint as confirmed_count,
      max(w.inferred_at) as most_recent
    from windowed w
    group by 1, 2
  ),
  -- Mode aggregations: top role/motivation/target per (sector, language).
  -- We compute these via correlated subqueries so the function stays
  -- a single SQL statement (faster + cacheable).
  top_per_bucket as (
    select
      slb.sector,
      slb.language,
      slb.total_count,
      slb.confirmed_count,
      slb.most_recent,
      (
        select w.role from windowed w
        where coalesce(w.sector, 'unknown') = slb.sector
          and coalesce(w.language, 'unknown') = slb.language
          and w.role is not null
        group by w.role
        order by count(*) desc, max(w.inferred_at) desc
        limit 1
      ) as top_role,
      (
        select w.motivation from windowed w
        where coalesce(w.sector, 'unknown') = slb.sector
          and coalesce(w.language, 'unknown') = slb.language
          and w.motivation is not null
        group by w.motivation
        order by count(*) desc, max(w.inferred_at) desc
        limit 1
      ) as top_motivation,
      (
        select w.target from windowed w
        where coalesce(w.sector, 'unknown') = slb.sector
          and coalesce(w.language, 'unknown') = slb.language
          and w.target is not null
        group by w.target
        order by count(*) desc, max(w.inferred_at) desc
        limit 1
      ) as top_target
    from sector_lang_buckets slb
  )
  select
    sector,
    language,
    total_count,
    confirmed_count,
    top_role,
    top_motivation,
    top_target,
    most_recent
  from top_per_bucket
  order by total_count desc, sector asc;
$$;

comment on function public.get_goals_summary is
  'Sector + language rollup of user_goals over a time window. Used by goals-summary edge function for the admin weekly digest.';
