-- content_funnel: per landing page, what the people who landed there did next
-- (2026-11-22, B2; metric `content_funnel` in docs/agent/metrics.md).
--
-- One row per (window_days, page). Windows: 7 and 28 days (the reads), and
-- 60 (C5's kill rule: ≥ 300 landing people and 0 trials in 60 days).
--
-- Who counts:
--   - a person is COALESCE(aid, username), never username alone;
--   - a landing person is one with a landing row (`landing_view` /
--     `landing_engaged`, reason 'landing') on the page AND, in the window,
--     a `landing_engaged` or any non-landing event — the `landing_people`
--     rule, so a renderer that only executes the script does not count;
--   - each person is credited to the FIRST page they landed on inside the
--     window (first touch in the window), so pages sum to the total;
--   - every later step counts that person once, at or after the landing.
--
-- Who is out (by browser: one internal or bot row marks the whole person):
--   internal usernames (shared filters in metrics.md + fleet README), bot
--   stamps (`metadata.bot`), the known crawler viewports, `ref:aocr.org`,
--   `verify-test`, and the founder's 2026-11-20 checkout tests (guest,
--   modal reason `email_link`, 0 solves).
--
-- Money: `pro_trial_started` / `pro_purchase_completed` with reason
-- 'stripe_webhook' only. Those rows carry a username and no aid, so they are
-- joined to the landing person through any row where that username and an
-- aid appear together. A pending webhook row (no username) cannot be joined.
--
-- Output is aggregates only: no aid, username, email or referrer leaves this
-- query (tests/content-funnel.test.js parses the final SELECT and fails on
-- one). The view public.content_funnel is this exact body
-- (supabase/migrations/20261122160000_content_funnel_view.sql, pinned by the
-- same test); scripts/content-funnel-report.mjs reads the view.
--
-- Run by hand (laptop, read-only): supabase db query --linked -f scripts/content-funnel.sql
-- content_funnel:begin
WITH win AS (
  SELECT w AS window_days, now() - make_interval(days => w) AS since
  FROM unnest(ARRAY[7, 28, 60]) AS w
),
ev AS (
  SELECT event, reason, username, created_at,
         (metadata #>> '{}')::jsonb AS m
  FROM public.pro_events
  WHERE created_at >= now() - interval '60 days'
    AND created_at <= now()
),
evp AS (
  SELECT ev.*, COALESCE(m->>'aid', username) AS pid
  FROM ev
),
excluded AS (
  SELECT DISTINCT pid
  FROM evp
  WHERE pid IS NOT NULL
    AND (   username ~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
         OR username ~* '^(demo|admin|qa)[0-9]*$'
         OR username ILIKE '%fabletest%'
         OR COALESCE(m->>'bot', '') NOT IN ('', 'false')
         OR m->>'viewport' IN ('tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992')
         OR m->>'landingSrc' = 'ref:aocr.org'
         OR m->>'arrivalSrc' IN ('ref:aocr.org', 'verify-test')
         OR (    event = 'pro_modal_shown'
             AND m->>'reason' = 'email_link'
             AND created_at >= '2026-11-20' AND created_at < '2026-11-21'
             AND username ILIKE 'guest%'
             AND COALESCE(m->>'solvedCount', '0') = '0'))
),
identities AS (
  SELECT DISTINCT m->>'aid' AS aid, username
  FROM evp
  WHERE m->>'aid' IS NOT NULL
    AND username IS NOT NULL
    AND username <> 'guest'
),
engaged AS (
  SELECT DISTINCT w.window_days, e.pid
  FROM evp e
  JOIN win w ON e.created_at >= w.since
  WHERE e.event = 'landing_engaged'
     OR e.reason IS DISTINCT FROM 'landing'
),
first_landing AS (
  SELECT DISTINCT ON (w.window_days, e.pid)
         w.window_days, e.pid, e.m->>'page' AS page, e.created_at AS landed_at
  FROM evp e
  JOIN win w ON e.created_at >= w.since
  JOIN engaged g ON g.window_days = w.window_days AND g.pid = e.pid
  WHERE e.reason = 'landing'
    AND e.event IN ('landing_view', 'landing_engaged')
    AND e.m->>'aid' IS NOT NULL
    AND COALESCE(e.m->>'page', '') <> ''
    AND NOT EXISTS (SELECT 1 FROM excluded x WHERE x.pid = e.pid)
  ORDER BY w.window_days, e.pid, e.created_at
),
steps AS (
  SELECT f.window_days, f.page, f.pid,
         COALESCE(bool_or(e.event = 'app_opened'), false)                            AS opened,
         COALESCE(bool_or(e.event = 'challenge_first_run'), false)                   AS ran,
         count(DISTINCT e.m->>'challengeId') FILTER (WHERE e.event = 'challenge_solved') AS solves,
         COALESCE(bool_or(e.event = 'signup_completed'), false)                      AS signed_up,
         COALESCE(bool_or(e.event = 'pro_modal_shown'), false)                       AS saw_modal,
         COALESCE(bool_or(e.event IN ('pro_plan_clicked', 'pro_checkout_clicked')), false) AS clicked_plan
  FROM first_landing f
  LEFT JOIN evp e ON e.pid = f.pid AND e.created_at >= f.landed_at
  GROUP BY f.window_days, f.page, f.pid
),
paid AS (
  SELECT f.window_days, f.pid,
         bool_or(e.event = 'pro_trial_started')      AS trial,
         bool_or(e.event = 'pro_purchase_completed') AS purchase
  FROM first_landing f
  JOIN identities i ON i.aid = f.pid
  JOIN evp e ON e.username = i.username
            AND e.reason = 'stripe_webhook'
            AND e.event IN ('pro_trial_started', 'pro_purchase_completed')
            AND e.created_at >= f.landed_at
  GROUP BY f.window_days, f.pid
)
SELECT s.window_days,
       s.page,
       count(*)                                                AS landing_people,
       count(*) FILTER (WHERE s.opened)                        AS app_opened,
       count(*) FILTER (WHERE s.ran)                           AS first_run,
       count(*) FILTER (WHERE s.solves >= 1)                   AS first_solve,
       count(*) FILTER (WHERE s.solves >= 3)                   AS solves_3,
       count(*) FILTER (WHERE s.signed_up)                     AS signup,
       count(*) FILTER (WHERE s.saw_modal)                     AS modal_shown,
       count(*) FILTER (WHERE s.clicked_plan)                  AS plan_click,
       count(*) FILTER (WHERE p.trial)                         AS trials,
       count(*) FILTER (WHERE p.purchase)                      AS purchases,
       count(*) FILTER (WHERE p.trial OR p.purchase)           AS trial_or_purchase
FROM steps s
LEFT JOIN paid p ON p.window_days = s.window_days AND p.pid = s.pid
GROUP BY s.window_days, s.page
-- content_funnel:end
;
