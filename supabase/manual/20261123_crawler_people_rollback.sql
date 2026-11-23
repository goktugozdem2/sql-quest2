-- Rollback for supabase/migrations/20261123180000_crawler_people_view.sql.
-- Nothing reads the view yet but the hand-run reads; dropping it loses no data.
begin;
drop view if exists public.crawler_people;
commit;
