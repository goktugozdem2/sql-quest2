-- Rollback for 20260922100000_leaderboard_public.sql. The client falls back to
-- users_public on 404, so dropping the view is safe at any time.
drop view if exists public.leaderboard_public;
drop index if exists public.users_xp_desc_idx;
notify pgrst, 'reload schema';
