-- The leaderboard is removed from the app (2026-09-22; see
-- tests/leaderboard-load.test.js), so its read path goes too: the view
-- exposed the top 50 usernames and XP to the anon key for a board nobody can
-- open, and the index added write cost to every account save.
-- Supersedes the leaderboard parts of 20260922100000 and 20260922120000.
drop view if exists public.leaderboard_public;
drop index if exists public.users_xp_desc_idx;
notify pgrst, 'reload schema';
