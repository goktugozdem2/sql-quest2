-- The leaderboard read (2026-09-22).
--
-- Supabase warned on 2026-09-21 that the project was running out of its Disk IO
-- budget. pg_stat_statements named the load: the leaderboard query,
--   users_public?select=username,data&order=data->>xp.desc&limit=50
-- 110,652 calls since 2026-09-13 at 1,266 ms mean — about 39 hours of database
-- time in nine days. Every open session fired it every 30 seconds, and each
-- call was a full pass over users: users_public builds a new JSON for every
-- row (data minus six private keys) and the sort key sat on top of that
-- rebuilt value, so LIMIT 50 still paid for all ~7,250 rows. EXPLAIN ANALYZE:
-- Seq Scan on users, 7,250 rows, 1,456 ms.
--
-- This view carries only what the board shows, and orders through an index:
--   leaderboard_public?select=username,xp,solved&order=xp.desc.nullslast&limit=50
-- reads 50 index entries instead of rebuilding every account.
--
-- It exposes less than users_public already does (no data blob at all), and
-- runs with the same owner rights (security_invoker = false), so the RLS on
-- users behaves exactly as it does for users_public.
--
-- `data -> 'xp'` (jsonb), not `->>` (text): the old sort was textual, so
-- "999" outranked "26257". The view column and the index use the SAME
-- expression, which is what lets the planner use the index for ORDER BY.
--
-- Apply:    supabase db query --linked -f supabase/migrations/20260922100000_leaderboard_public.sql
-- Rollback: supabase/manual/20260922_leaderboard_public_rollback.sql
-- The client falls back to the old read on 404, so either order is safe.

create index if not exists users_xp_desc_idx
  on public.users ((data -> 'xp') desc nulls last);

create or replace view public.leaderboard_public
  with (security_invoker = false) as
select u.username,
       u.data -> 'xp' as xp,
       case when jsonb_typeof(u.data -> 'solvedChallenges') = 'array'
            then jsonb_array_length(u.data -> 'solvedChallenges')
            else 0 end as solved
  from public.users u;

revoke all on public.leaderboard_public from public;
grant select on public.leaderboard_public to anon, authenticated;

notify pgrst, 'reload schema';
