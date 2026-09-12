-- Weekly signup → activation → payment cohorts (founder's plan, item 11, 2026-09-12).
-- Registered accounts only (guests have no signup), internal accounts excluded.
--
-- TRAP: users.created_at is NOT the signup time for rows saved before
-- 2026-09-12 — the client sent created_at on every upsert until that day, so
-- the column holds the last save. users.data.createdAt (epoch ms, set once
-- at signup) is the real date; created_at is only the fallback when it is
-- missing. Reading created_at put both monthly payers in the week of
-- 2026-09-07, which is the outage week and is false.
--
-- Activation = six distinct solves ever (pro_events, by username).
-- Payment = pro_purchase_completed with reason='stripe_webhook', ever.
-- Both are "ever", so recent cohorts are still maturing: read a week only
-- after it has had 14 days.
with reg as (
  select username,
    coalesce(
      case when (data->>'createdAt') ~ '^[0-9]+$' then to_timestamp((data->>'createdAt')::bigint / 1000.0)
           when (data->>'createdAt') is not null then (data->>'createdAt')::timestamptz end,
      created_at) as signed_up
  from users
  where username not like 'guest_%'
    and username !~* '^(test2|sqlquest|elena|fabletest|linktest|internalroutine)'
), solves as (
  select username, count(distinct ((metadata #>> '{}')::jsonb)->>'challengeId') as n
  from pro_events where event='challenge_solved' group by username
), paid as (
  select username, min(created_at) as paid_at from pro_events
  where event='pro_purchase_completed' and reason='stripe_webhook' group by username
)
select date_trunc('week', r.signed_up)::date as signup_week,
  count(*) as signups,
  count(*) filter (where s.n >= 1) as solved_one,
  count(*) filter (where s.n >= 6) as reached_six,
  count(*) filter (where p.username is not null) as paid,
  round(100.0 * count(*) filter (where s.n >= 1) / nullif(count(*),0), 1) as pct_one,
  round(100.0 * count(*) filter (where s.n >= 6) / nullif(count(*),0), 1) as pct_six,
  round(100.0 * count(*) filter (where p.username is not null) / nullif(count(*),0), 1) as pct_paid
from reg r left join solves s on s.username = r.username left join paid p on p.username = r.username
where r.signed_up >= '2026-06-29'
group by 1 order by 1;
