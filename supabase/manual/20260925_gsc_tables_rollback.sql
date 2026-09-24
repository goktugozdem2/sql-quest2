-- Rollback for supabase/migrations/20260925110000_gsc_tables.sql.
-- Drops the two GSC tables and everything in them; the data can be
-- re-fetched (scripts/gsc/fetch.mjs --backfill covers 16 months).
begin;
drop table if exists public.gsc_daily;
drop table if exists public.gsc_index_status;
commit;
