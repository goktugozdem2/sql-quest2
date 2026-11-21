-- Rollback for supabase/migrations/20261122100000_search_weekly_view.sql.
-- The view holds no data; dropping it loses nothing.
drop view if exists public.search_weekly;
