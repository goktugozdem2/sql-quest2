-- Bing Webmaster Tools pipeline (2026-10-01): search and crawl statistics,
-- per-URL crawl status and the log of submitted URLs, written by
-- scripts/bing/{fetch,inspect,submit}.mjs from GitHub Actions with the
-- service role. Rollback: supabase/manual/20261001_bing_tables_rollback.sql
begin;

-- Site totals, one row a day (GetRankAndTrafficStats; refreshed daily).
create table if not exists public.bing_site_daily (
  date         date primary key,
  clicks       integer not null default 0,
  impressions  integer not null default 0,
  fetched_at   timestamptz not null default now()
);

-- Query and page statistics. Three slices share the table, told apart by
-- which dimension is NULL, exactly as in gsc_daily:
--   [query]        page IS NULL    (GetQueryStats)
--   [page]         query IS NULL   (GetPageStats)
--   [query, page]  both set        (GetPageQueryStats, top pages only)
-- Never sum across slices. `date` is the bucket the API reports (Bing
-- refreshes these weekly); positions are stored as the API sends them.
create table if not exists public.bing_stats (
  date                     date    not null,
  query                    text,
  page                     text,
  clicks                   integer not null default 0,
  impressions              integer not null default 0,
  avg_click_position       numeric,
  avg_impression_position  numeric,
  fetched_at               timestamptz not null default now(),
  constraint bing_stats_key unique nulls not distinct (date, query, page),
  constraint bing_stats_has_dimension check (query is not null or page is not null)
);
create index if not exists bing_stats_date_idx on public.bing_stats (date);
create index if not exists bing_stats_page_idx on public.bing_stats (page);

-- Crawl statistics, one row a day (GetCrawlStats). in_index is Bing's own
-- count of indexed pages — the number read by hand from Site Explorer until now.
create table if not exists public.bing_crawl_daily (
  date               date primary key,
  crawled_pages      integer,
  crawl_errors       integer,
  in_index           integer,
  in_links           integer,
  code_2xx           integer,
  code_301           integer,
  code_302           integer,
  code_4xx           integer,
  code_5xx           integer,
  blocked_by_robots  integer,
  contains_malware   integer,
  all_other_codes    integer,
  fetched_at         timestamptz not null default now()
);

-- What Bing knows about each sitemap URL (GetUrlInfo).
create table if not exists public.bing_url_status (
  url            text primary key,
  http_status    integer,
  last_crawled   timestamptz,
  discovered     timestamptz,
  document_size  integer,
  anchor_count   integer,
  is_page        boolean,
  checked_at     timestamptz not null default now()
);

-- Every URL handed to SubmitUrlBatch, so nothing is re-sent inside the cooldown.
create table if not exists public.bing_submissions (
  url           text        not null,
  submitted_at  timestamptz not null default now(),
  reason        text,
  primary key (url, submitted_at)
);

-- Service role only: RLS on, no policies, grants revoked.
alter table public.bing_site_daily  enable row level security;
alter table public.bing_stats       enable row level security;
alter table public.bing_crawl_daily enable row level security;
alter table public.bing_url_status  enable row level security;
alter table public.bing_submissions enable row level security;
revoke all on public.bing_site_daily  from anon, authenticated;
revoke all on public.bing_stats       from anon, authenticated;
revoke all on public.bing_crawl_daily from anon, authenticated;
revoke all on public.bing_url_status  from anon, authenticated;
revoke all on public.bing_submissions from anon, authenticated;

commit;
