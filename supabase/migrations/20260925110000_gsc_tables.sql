-- Google Search Console pipeline (2026-09-25): daily search analytics and
-- URL-inspection results, written by scripts/gsc/fetch.mjs and
-- scripts/gsc/inspect.mjs from GitHub Actions with the service role.
-- Rollback: supabase/manual/20260925_gsc_tables_rollback.sql
begin;

-- One row per day per slice. Three slices share the table and are told
-- apart by which dimension is NULL:
--   [query]        page IS NULL
--   [page]         query IS NULL
--   [query, page]  both set
-- A primary key cannot hold NULL, so the key is a UNIQUE NULLS NOT DISTINCT
-- constraint on (date, query, page): the same guarantee, and the upsert's
-- conflict target. Never sum clicks across slices — each slice is the whole.
create table if not exists public.gsc_daily (
  date         date    not null,
  query        text,
  page         text,
  clicks       integer not null default 0,
  impressions  integer not null default 0,
  ctr          numeric,
  position     numeric,
  fetched_at   timestamptz not null default now(),
  constraint gsc_daily_key unique nulls not distinct (date, query, page),
  constraint gsc_daily_has_dimension check (query is not null or page is not null)
);
create index if not exists gsc_daily_date_idx on public.gsc_daily (date);
create index if not exists gsc_daily_page_idx on public.gsc_daily (page);

create table if not exists public.gsc_index_status (
  url             text primary key,
  last_crawled    timestamptz,
  coverage_state  text,
  indexing_state  text,
  verdict         text,
  checked_at      timestamptz not null default now()
);

-- No anon or authenticated access at all: RLS on, no policies, grants
-- revoked. The service role bypasses RLS and is the only reader and writer.
alter table public.gsc_daily enable row level security;
alter table public.gsc_index_status enable row level security;
revoke all on public.gsc_daily from anon, authenticated;
revoke all on public.gsc_index_status from anon, authenticated;

commit;
