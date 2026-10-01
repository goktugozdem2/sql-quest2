-- Rollback for supabase/migrations/20261001100000_bing_tables.sql.
-- Drops the five Bing pipeline tables and everything in them; the data can
-- be fetched again (the API holds about six months) except bing_submissions.
begin;
drop table if exists public.bing_submissions;
drop table if exists public.bing_url_status;
drop table if exists public.bing_crawl_daily;
drop table if exists public.bing_stats;
drop table if exists public.bing_site_daily;
commit;
