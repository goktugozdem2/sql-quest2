-- Google and Bing in one read, at the grain both can honour (2026-11-22,
-- BACKLOG item 9 / PLAN item 6).
--
-- PLAN item 6 asked for Bing rows inside gsc_daily with an `engine` column.
-- That would mix grains: gsc_daily is daily, Bing's query and page rows are
-- weekly buckets (a bing_stats date is the seven days ENDING on it,
-- Saturday → Friday). A view at the week instead: Google's days are summed
-- into the same Saturday → Friday weeks, keyed by the Friday.
--
--   engine        'google' | 'bing'
--   week_end      the Friday that closes the week
--   slice         'query' | 'page' | 'query_page' — which dimension is set.
--                 Never sum across slices (the tables' own rule).
--   days          days of data in the bucket: Google's last week is partial
--                 until the data catches up (2–3 days' lag); Bing is 7.
--   position      impression-weighted (Google `position`, Bing
--                 `avg_impression_position`).
--
-- security_invoker: the reader's own rights apply, so the RLS and the
-- revokes on gsc_daily / bing_stats (service role only) hold through the
-- view. Granted to metrics_reader, the read-only login the reports use.
-- Rollback: supabase/manual/20261122_search_weekly_view_rollback.sql
begin;

create or replace view public.search_weekly with (security_invoker = true) as
select 'google'::text as engine,
       (date + ((5 - extract(dow from date)::int + 7) % 7))::date as week_end,
       case when query is null then 'page' when page is null then 'query' else 'query_page' end as slice,
       query,
       page,
       count(distinct date)::int as days,
       sum(clicks)::int as clicks,
       sum(impressions)::int as impressions,
       round(sum(position * impressions) / nullif(sum(impressions), 0), 1) as position
from public.gsc_daily
group by 1, 2, 3, 4, 5
union all
select 'bing'::text,
       date,
       case when query is null then 'page' when page is null then 'query' else 'query_page' end,
       query,
       page,
       7,
       sum(clicks)::int,
       sum(impressions)::int,
       round(sum(avg_impression_position * impressions) / nullif(sum(impressions), 0), 1)
from public.bing_stats
group by 1, 2, 3, 4, 5;

revoke all on public.search_weekly from anon, authenticated;
grant select on public.search_weekly to metrics_reader;

comment on view public.search_weekly is
  'Google + Bing by Saturday→Friday week (week_end = Friday). Filter one slice; never sum across slices. days < 7 = a partial Google week.';

commit;
