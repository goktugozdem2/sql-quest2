-- Rollback for supabase/migrations/20260929120000_ops_query_stats_daily.sql.
-- Drops the RPC door, the capture function, the snapshot table and the
-- schema. Snapshots are lost; pg_stat_statements itself is untouched (the
-- bot never resets it), so the next capture simply starts a new series.
--
-- Probe to run BEFORE the rollback (proves the gate, rolled back itself):
--   begin; set local role anon;
--   select * from public.ops_capture_query_stats();   -- expect 42501 permission denied
--   rollback;
begin;
drop function if exists public.ops_capture_query_stats(double precision, bigint, integer);
drop function if exists ops.capture_query_stats(double precision, bigint, integer);
drop table if exists ops.query_stats_daily;
drop schema if exists ops;
commit;
