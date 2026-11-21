-- Probe for 20261122100000_search_weekly_view.sql. Run as postgres AFTER the
-- migration (supabase db query --linked -f <this file>); one transaction,
-- rolled back. Each check raises if a role can do more, or less, than it should.
begin;

do $$
declare n bigint; g bigint; b bigint;
begin
  -- Both engines are there, on Fridays only.
  select count(*) filter (where engine = 'google'), count(*) filter (where engine = 'bing')
    into g, b from public.search_weekly where week_end >= current_date - 28;
  raise notice 'last 28 days: google rows %, bing rows %', g, b;
  if g = 0 or b = 0 then raise exception 'search_weekly is missing an engine'; end if;
  select count(*) into n from public.search_weekly where extract(dow from week_end) <> 5;
  if n > 0 then raise exception '% rows whose week_end is not a Friday', n; end if;

  -- The Google week sums its days exactly (one slice, one week).
  select abs(
    (select sum(clicks) from public.search_weekly where engine = 'google' and slice = 'page'
       and week_end = (select max(week_end) - 7 from public.search_weekly where engine = 'google'))
  - (select sum(clicks) from public.gsc_daily where query is null and page is not null
       and date between (select max(week_end) - 13 from public.search_weekly where engine = 'google')
                    and (select max(week_end) - 7 from public.search_weekly where engine = 'google'))
  ) into n;
  if n <> 0 then raise exception 'google page-slice week does not equal its days (off by %)', n; end if;
end $$;

-- metrics_reader reads it; anon does not.
set local role metrics_reader;
do $$ declare n bigint; begin
  select count(*) into n from public.search_weekly;
  if n = 0 then raise exception 'metrics_reader sees no rows through the view'; end if;
  raise notice 'metrics_reader: % rows (good)', n;
end $$;
reset role;

set local role anon;
do $$ begin
  perform 1 from public.search_weekly limit 1;
  raise exception 'anon can read search_weekly';
exception when insufficient_privilege then raise notice 'anon: denied (good)';
end $$;
reset role;

rollback;
