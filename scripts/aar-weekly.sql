-- Acquisition · Activation · Retention — last 7 days vs the 7 before.
--
--   psql "$METRICS_DATABASE_URL" -f scripts/aar-weekly.sql              -- up to today (UTC)
--   psql "$METRICS_DATABASE_URL" -v to=2026-10-11 -f scripts/aar-weekly.sql
--
-- Written 2026-10-11 for the founder's "acquisition, activation, retention,
-- last 7 vs the 7 before". Read-only; runs as metrics_reader (unqualified
-- names resolve through `metrics, public`) or as postgres.
--
-- Windows: W1 = [to-7d, to), W0 = [to-14d, to-7d), both UTC.
-- People by coalesce(metadata.aid, username). Out: internal accounts
-- (the leagues.js pattern), stamped bots (metadata.bot, from 2026-10-07),
-- and the known crawler shapes on the first app_opened (metrics.md,
-- first_solve_10m trap): empty landingSrc + LA/1920x1080, UTC/1280x720,
-- desktop:1919x992 (unstamped before 2026-10-07) or LA/tablet:800x600
-- (unstamped before its fingerprint shipped, 2026-10-21; 308 guests since
-- 2026-08-12, none ever ran a query).
--
-- Definitions are the registered ones (docs/agent/metrics.md):
--   activation  = first_solve_10m (and its secondaries)
--   retention   = second_session_7d, which needs 7 days of runway, so it is
--                 read on the cohorts one week EARLIER: [to-14d, to-7d) vs
--                 [to-21d, to-14d). Returning people is read on W1 vs W0.
--   money       = pro_purchase_completed with reason='stripe_webhook', by username.
-- Small n: every rate prints its denominator. Below ~30 people a week, read
-- the counts, not the percentages.

\if :{?to}
\else
  \set to ''
\endif

with bounds as (
  select coalesce(nullif(:'to', '')::date, current_date)::timestamptz as t
),
w as (
  select 'W1 last 7d' as win, t - interval '7 days' as a, t as b from bounds
  union all
  select 'W0 prior 7d', t - interval '14 days', t - interval '7 days' from bounds
),
ev as (
  select coalesce(m->>'aid', username) as pid, username, event, reason, created_at, m
  from (
    select username, event, reason, created_at,
           case when jsonb_typeof(metadata::jsonb) = 'string' then (metadata #>> '{}')::jsonb
                else metadata::jsonb end as m
    from pro_events
    where created_at >= (select t - interval '28 days' from bounds)
      and created_at <  (select t from bounds)
  ) x
  where coalesce(username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$)'
    and m->>'bot' is null
),
-- First app_opened per person, over all time (not just the 28 days), so a
-- returning person is never counted as new.
first_open as (
  select distinct on (pid) pid, created_at as t0, m
  from (
    select coalesce(m->>'aid', username) as pid, created_at, m
    from (
      select username, created_at,
             case when jsonb_typeof(metadata::jsonb) = 'string' then (metadata #>> '{}')::jsonb
                  else metadata::jsonb end as m
      from pro_events
      where event = 'app_opened' and created_at < (select t from bounds)
    ) y
    where coalesce(username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$)'
      and m->>'bot' is null
  ) z
  order by pid, created_at
),
humans as (
  select * from first_open
  where not (coalesce(m->>'landingSrc', '') = ''
             and ((m->>'tz' = 'America/Los_Angeles' and m->>'viewport' = 'desktop:1920x1080')
               or (m->>'tz' = 'UTC' and m->>'viewport' = 'desktop:1280x720')
               or m->>'viewport' = 'desktop:1919x992'
               or (m->>'tz' = 'America/Los_Angeles' and m->>'viewport' = 'tablet:800x600')))
),

-- ── Acquisition ─────────────────────────────────────────────────────────
acq as (
  select w.win,
    (select count(distinct pid) from ev where event = 'landing_view' and created_at >= w.a and created_at < w.b) as landing_people,
    (select count(*) from humans h where h.t0 >= w.a and h.t0 < w.b) as new_app_people,
    (select count(distinct pid) from ev where event = 'signup_completed' and created_at >= w.a and created_at < w.b) as signups
  from w
),
acq_src as (
  select w.win,
    coalesce(nullif(split_part(h.m->>'landingSrc', ':', 1), ''), 'none') || ':' ||
      coalesce(nullif(split_part(h.m->>'arrivalSrc', ':', 1), ''), 'none') as source,
    count(*) as new_people
  from w join humans h on h.t0 >= w.a and h.t0 < w.b
  group by 1, 2
),

-- ── Activation (first_solve_10m on each window's new people) ────────────
act as (
  select w.win, count(*) as people,
    count(*) filter (where p.first_ch    <= p.t0 + interval '10 minutes') as opened_ch_10m,
    count(*) filter (where p.first_solve <= p.t0 + interval '10 minutes') as solved_10m,
    count(*) filter (where p.first_solve is not null)                     as solved_by_window_end
  from w
  join lateral (
    select h.pid, h.t0,
      (select min(e.created_at) from ev e where e.pid = h.pid and e.event = 'challenge_opened' and e.created_at >= h.t0) as first_ch,
      (select min(e.created_at) from ev e where e.pid = h.pid and e.event = 'challenge_solved' and e.created_at >= h.t0 and e.created_at < w.b) as first_solve
    from humans h where h.t0 >= w.a and h.t0 < w.b
  ) p on true
  group by w.win
),

-- ── Retention ───────────────────────────────────────────────────────────
-- second_session_7d on the cohorts a week earlier (each has had 7 days).
ret_cohorts as (
  select 'W1 cohort (first open 14→7d ago)' as cohort, t - interval '14 days' as a, t - interval '7 days' as b from bounds
  union all
  select 'W0 cohort (first open 21→14d ago)', t - interval '21 days', t - interval '14 days' from bounds
),
ret as (
  select c.cohort, count(*) as people,
    count(*) filter (where exists (
      select 1 from ev e where e.pid = h.pid and e.event = 'app_opened'
        and e.created_at >  h.t0 + interval '1 hour'
        and e.created_at <= h.t0 + interval '7 days')) as second_session_7d
  from ret_cohorts c join humans h on h.t0 >= c.a and h.t0 < c.b
  group by c.cohort
),
-- Returning people: opened the app in the window, first open before it.
returners as (
  select w.win,
    (select count(distinct e.pid) from ev e join humans h on h.pid = e.pid and h.t0 < w.a
      where e.event = 'app_opened' and e.created_at >= w.a and e.created_at < w.b) as returning_people,
    (select count(distinct e.pid) from ev e join humans h on h.pid = e.pid and h.t0 < w.a
      where e.event = 'app_opened' and e.created_at >= w.a and e.created_at < w.b
        and exists (select 1 from ev s where s.pid = e.pid and s.event = 'challenge_solved'
                      and s.created_at >= w.a and s.created_at < w.b)) as returning_solvers
  from w
),

-- ── Money ───────────────────────────────────────────────────────────────
paid as (
  select w.win, count(distinct e.username) as payers
  from w left join ev e on e.event = 'pro_purchase_completed' and e.reason = 'stripe_webhook'
    and e.created_at >= w.a and e.created_at < w.b
  group by w.win
)

select 'acquisition' as stage, win as window, metric, value, null::text as rate
from acq cross join lateral (values
  ('landing people', landing_people), ('new app people', new_app_people), ('signups', signups)) v(metric, value)
union all
select 'acquisition', win, 'new people from ' || source, new_people, null
from acq_src where new_people >= 3
union all
select 'activation', win, metric, value,
       case when people > 0 then round(100.0 * value / people, 1) || '% of ' || people end
from act cross join lateral (values
  ('opened a challenge in 10 min', opened_ch_10m),
  ('solved in 10 min (first_solve_10m)', solved_10m),
  ('solved by window end', solved_by_window_end)) v(metric, value)
union all
select 'retention', cohort, 'second_session_7d', second_session_7d,
       case when people > 0 then round(100.0 * second_session_7d / people, 1) || '% of ' || people end
from ret
union all
select 'retention', win, metric, value, null
from returners cross join lateral (values
  ('returning people', returning_people), ('returning people who solved', returning_solvers)) v(metric, value)
union all
select 'money', win, 'payers (stripe_webhook)', payers, null from paid
order by 1, 3, 2 desc;
