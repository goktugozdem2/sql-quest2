-- Rollback for supabase/migrations/20261122160000_content_funnel_view.sql.
-- Drops the view only; pro_events is untouched.
begin;
drop view if exists public.content_funnel;
commit;
