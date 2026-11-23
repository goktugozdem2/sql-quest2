-- Probe for public.content_funnel, rolled back (2026-11-22). Run after the
-- migration, by the founder: supabase db query --linked -f <this file>
-- Proves: the view answers, carries only aggregate columns, and is closed to
-- anon (the browser key). Nothing persists.
begin;

-- 1. It answers, and the columns are the aggregate ones.
select window_days, count(*) as pages, sum(landing_people) as landing_people
from public.content_funnel group by 1 order by 1;

select string_agg(column_name, ',' order by ordinal_position) as columns
from information_schema.columns
where table_schema = 'public' and table_name = 'content_funnel';

-- 2. anon cannot read it.
set local role anon;
do $$
begin
  perform 1 from public.content_funnel limit 1;
  raise exception 'PROBE FAILED: anon can read content_funnel';
exception when insufficient_privilege then
  raise notice 'ok: anon is refused';
end $$;
reset role;

rollback;
