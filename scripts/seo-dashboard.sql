-- Weekly SEO dashboard — the product half (founder's SEO plan P4.22–P4.23,
-- 2026-09-13). The search half (indexed pages, impressions, clicks, average
-- position, non-branded clicks) is read from Google Search Console and Bing
-- Webmaster Tools by the `weekly-seo-dashboard` scheduled task and joined to
-- this on the landing page.
--
-- People, not events: identity is the `aid` inside metadata (born
-- 2026-07-28). Metadata is double-encoded. Internal browsers are excluded by
-- aid: any aid that ever wrote a row under an internal username.
--
-- Funnel per landing page family and per page, for people whose FIRST
-- landing_view in the window was on that page:
--   landed → opened the app ≤ 7d → solved a challenge ≤ 7d → signed up ≤ 14d
--   → came back on a later day (a second session: app_opened on a later
--     calendar day than the first) ≤ 14d.
--
-- Parameters: replace :since / :until with timestamps, e.g.
--   '2026-09-07 00:00:00+00' and '2026-09-14 00:00:00+00'.
-- The 14-day steps are only complete for landings ≥ 14 days before :until;
-- the dashboard reads the latest full week for the 7-day steps and the week
-- before it for the 14-day steps, and says which.

WITH internal AS (
  SELECT DISTINCT ((metadata #>> '{}')::jsonb)->>'aid' AS aid
  FROM pro_events
  WHERE NOT (
        username !~* '^(test|demo|admin|qa)[0-9]*$'
    AND username <> 'sqlquest'
    AND username NOT ILIKE '%fabletest%'
    AND username NOT ILIKE 'linktest%'
    AND username NOT ILIKE 'internalroutine%'
    AND username <> 'elena')
    AND ((metadata #>> '{}')::jsonb)->>'aid' IS NOT NULL
),
landed AS (   -- one row per person: their first landing in the window
  SELECT DISTINCT ON (aid) aid, page, utm, at
  FROM (
    SELECT ((metadata #>> '{}')::jsonb)->>'aid'  AS aid,
           ((metadata #>> '{}')::jsonb)->>'page' AS page,
           ((metadata #>> '{}')::jsonb)->>'utm'  AS utm,
           created_at AS at
    FROM pro_events
    WHERE event = 'landing_view' AND reason = 'landing'
      AND created_at >= :since AND created_at < :until
  ) x
  WHERE aid IS NOT NULL AND aid NOT IN (SELECT aid FROM internal)
  ORDER BY aid, at
),
app AS (
  SELECT ((metadata #>> '{}')::jsonb)->>'aid' AS aid, event, created_at AS at
  FROM pro_events
  WHERE event IN ('app_opened', 'challenge_solved', 'signup_completed')
    AND created_at >= :since AND created_at < (:until)::timestamptz + interval '14 days'
),
per_person AS (
  SELECT l.aid, l.page, l.at,
    CASE
      WHEN l.page = 'home' THEN 'home'
      WHEN l.page LIKE 'questions%' THEN 'question pages'
      WHEN l.page LIKE 'challenges%' THEN 'topic pages'
      WHEN l.page LIKE '%-sql-interview' THEN 'company pages'
      WHEN l.page LIKE 'blog%' THEN 'blog'
      WHEN l.page IN ('sql-tools', 'sql-query-checker', 'sql-query-explainer', 'sql-query-optimizer', 'sql-quiz', 'sql-interview-readiness-test') THEN 'tools & tests'
      WHEN l.page LIKE 'vs-%' OR l.page LIKE '%-alternatives' OR l.page IN ('best-sql-practice-sites', 'sql-practice-comparison') THEN 'comparisons'
      WHEN l.page IN ('sql-exercises', 'sql-interview-prep', 'learn-sql', 'sql-tutorial', 'sql-cheat-sheet') THEN 'hubs'
      ELSE 'other'
    END AS family,
    bool_or(a.event = 'app_opened'       AND a.at <  l.at + interval '7 days')  AS opened_7d,
    bool_or(a.event = 'challenge_solved' AND a.at <  l.at + interval '7 days')  AS solved_7d,
    bool_or(a.event = 'signup_completed' AND a.at <  l.at + interval '14 days') AS signup_14d,
    count(DISTINCT a.at::date) FILTER (WHERE a.event = 'app_opened' AND a.at < l.at + interval '14 days') AS app_days_14d
  FROM landed l
  LEFT JOIN app a ON a.aid = l.aid AND a.at >= l.at
  GROUP BY l.aid, l.page, l.at
)
-- 1. By page family
SELECT 'family' AS grain, family AS key,
       count(*)                                                        AS landed,
       round(100.0 * count(*) FILTER (WHERE opened_7d) / count(*), 1)  AS to_app_pct,
       round(100.0 * count(*) FILTER (WHERE solved_7d) / count(*), 1)  AS solved_pct,
       round(100.0 * count(*) FILTER (WHERE signup_14d) / count(*), 1) AS signup_pct,
       round(100.0 * count(*) FILTER (WHERE solved_7d AND signup_14d) / NULLIF(count(*) FILTER (WHERE solved_7d), 0), 1) AS solve_to_signup_pct,
       round(100.0 * count(*) FILTER (WHERE app_days_14d >= 2) / NULLIF(count(*) FILTER (WHERE opened_7d), 0), 1) AS second_session_pct
FROM per_person GROUP BY family
UNION ALL
-- 2. Top 25 landing pages
SELECT * FROM (
  SELECT 'page', page,
         count(*),
         round(100.0 * count(*) FILTER (WHERE opened_7d) / count(*), 1),
         round(100.0 * count(*) FILTER (WHERE solved_7d) / count(*), 1),
         round(100.0 * count(*) FILTER (WHERE signup_14d) / count(*), 1),
         round(100.0 * count(*) FILTER (WHERE solved_7d AND signup_14d) / NULLIF(count(*) FILTER (WHERE solved_7d), 0), 1),
         round(100.0 * count(*) FILTER (WHERE app_days_14d >= 2) / NULLIF(count(*) FILTER (WHERE opened_7d), 0), 1)
  FROM per_person GROUP BY page ORDER BY count(*) DESC LIMIT 25
) top
ORDER BY 1, 3 DESC;
