-- scripts/usage-line.sql — the homepage usage line (src/index.html,
-- data-testid="usage-line"): "N accepted solutions · N people last 30 days".
--
-- Run it every Friday (B2, docs/agent/fleet/B2-measurement.md) in the Supabase
-- MCP `execute_sql` (read-only), write the two numbers to
-- docs/reads/usage-line-<YYYY-MM-DD>.md, and put them and the date into the
-- line. tests/usage-line.test.js fails a line whose date is more than 21 days
-- older than the newest such read, or whose numbers are not that read's.
--
-- Definitions (the Friday task's, 2026-09-12 → 10-02; this file 2026-11-28):
--   accepted_solutions  every challenge_solved row ever (re-solves count, as
--                       they did on 09-12 and 10-02), people = the HUMAN
--                       filter below. The 10-02 number excluded internal
--                       accounts only; solutions_internal_out keeps that
--                       series comparable.
--   people_30d          distinct people (COALESCE(aid, username)) with any
--                       row whose reason is not 'landing' in the 30 days
--                       before now(), HUMAN filter. The 10-02 number dropped
--                       the crawlers known then (the first_solve_10m filter:
--                       prestamp_fp + utc1280); the scorecard's exclusion
--                       block is that filter's successor, so it is used
--                       verbatim. people_30d_internal_out is the task's
--                       wording alone (internal accounts out, nothing else) —
--                       never the number on the page.
--
-- The base block is copied byte for byte from scripts/scorecard-weekly.sql
-- (tests/usage-line.test.js pins that). Aggregates only: no identifier leaves
-- the database.

WITH params AS (
  SELECT now() AS t,
         date_trunc('week', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS anchor
),
-- base:begin  (identical in every query; tests/scorecard-weekly.test.js pins it)
weeks AS (
  SELECT p.anchor - make_interval(weeks => g)     AS ws,
         p.anchor - make_interval(weeks => g - 1) AS we
  FROM params p, generate_series(1, 8) AS g
),
evp AS (
  SELECT e.event, e.reason, e.username, e.created_at, x.m,
         COALESCE(x.m->>'aid', e.username) AS pid
  FROM public.pro_events e
  CROSS JOIN LATERAL (SELECT (e.metadata #>> '{}')::jsonb AS m) x
  WHERE e.created_at <= (SELECT t FROM params)
),
facts AS (   -- one pass over every row a person ever wrote
  SELECT pid,
    bool_or(COALESCE(username, '') ~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)') AS f_internal,
    bool_or(m->>'aid' IN ('363dfb2bc1314757acc88c8438c4d2ea')
            OR m->>'aid' LIKE 'e5fcbad1a022%'
            OR m->>'aid' LIKE 'a2a2%'   -- A2's live-QA walk aids, 2026-11-26 on (prefix rule)
            OR m->>'aid' = 'd9fe96e2bdf44aefa9195673a6496888'   -- A2's 11-26 walk, one random aid
            OR (event = 'pro_modal_shown' AND m->>'reason' = 'email_link'
                AND created_at >= '2026-11-20' AND created_at < '2026-11-21'
                AND username ILIKE 'guest%' AND COALESCE(m->>'solvedCount', '0') = '0')
            OR (m->>'tz' = 'Europe/Istanbul' AND m->>'viewport' = 'mobile:375x812'
                AND created_at >= '2026-11-24 11:00+00' AND created_at < '2026-11-24 11:08+00')) AS f_founder,
    bool_or(COALESCE(m->>'bot', '') NOT IN ('', 'false')
            OR m->>'wd' = 'true' OR m->>'uaBot' = 'true')                    AS f_stamp,
    bool_or(m->>'viewport' IN ('tablet:800x600', 'desktop:1280x1200',
                               'desktop:1919x992', 'desktop:1024x1024'))      AS f_viewport,
    bool_or(COALESCE(m->>'landingSrc', '') ~* '^ref:(.+\.)?aocr\.org$'
            OR COALESCE(m->>'arrivalSrc', '') ~* 'aocr\.org'
            OR m->>'arrivalSrc' = 'verify-test')                              AS f_ref,
    bool_or(event = 'app_opened')                                             AS any_open,
    bool_or(event = 'landing_view')                                           AS any_landing,
    bool_or(event = 'landing_view' AND m->>'tz' = 'UTC'
            AND created_at >= '2026-11-22')                                   AS utc_landing,
    bool_or(reason = 'landing' AND m->>'tz' = 'Asia/Shanghai')                AS cn_landing,
    bool_or(event = 'app_opened' AND m->>'langs' = '2'
            AND COALESCE(m->>'landingSrc', '') = '')                          AS langs2_open,
    bool_or(event = 'landing_view' AND m->>'ua' ~ '(GoogleOther|Google-NotebookLM)') AS google_ua,
    bool_or(event = 'landing_view' AND m->>'ua' ~ 'Google-NotebookLM')        AS notebooklm,
    (array_agg(m ORDER BY created_at) FILTER (WHERE event = 'app_opened'))[1] AS fo
  FROM evp WHERE pid IS NOT NULL GROUP BY pid
),
person AS (   -- excl IS NULL = human
  SELECT pid, CASE
    WHEN f_internal   THEN 'internal'
    WHEN f_founder    THEN 'founder'
    WHEN f_stamp      THEN 'bot_stamp'
    WHEN f_viewport   THEN 'viewport'
    WHEN f_ref        THEN 'ref_spam'
    WHEN COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1'
         AND NOT any_landing                                   THEN 'app1lang'
    WHEN COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1'
         AND fo->>'arrivalSrc' LIKE 'challenges-%'             THEN 'topic1lang'
    WHEN COALESCE(fo->>'landingSrc', '') = '' AND fo->>'tz' = 'America/Los_Angeles'
         AND fo->>'viewport' = 'desktop:1920x1080'             THEN 'prestamp_fp'
    WHEN fo->>'tz' = 'UTC' AND fo->>'viewport' = 'desktop:1280x720'
         AND NOT any_landing                                   THEN 'utc1280'
    WHEN COALESCE(fo->>'landingSrc', '') = '' AND NOT any_landing
         AND fo->>'tz' IN ('Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore') THEN 'cn_app'
    WHEN utc_landing AND NOT any_open                          THEN 'utc_landing'
    WHEN cn_landing AND NOT any_open                           THEN 'cn_reader'
    WHEN google_ua AND NOT any_open AND notebooklm             THEN 'google_ua:notebooklm'
    WHEN google_ua AND NOT any_open                            THEN 'google_ua'
    WHEN langs2_open AND NOT any_landing                       THEN 'langs2'
  END AS excl
  FROM facts
),
clean AS (
  SELECT e.* FROM evp e JOIN person p ON p.pid = e.pid WHERE p.excl IS NULL
),
visits AS (   -- (week, person) for every entry row, raw
  SELECT DISTINCT w.ws, e.pid, p.excl
  FROM evp e
  JOIN person p ON p.pid = e.pid
  JOIN weeks w ON e.created_at >= w.ws AND e.created_at < w.we
  WHERE e.event IN ('landing_view', 'landing_engaged', 'app_opened')
),
-- base:end
tally AS (
  SELECT
    count(*) FILTER (WHERE e.event = 'challenge_solved' AND p.excl IS NULL)        AS accepted_solutions,
    count(*) FILTER (WHERE e.event = 'challenge_solved'
                     AND COALESCE(p.excl, '') <> 'internal')                       AS solutions_internal_out,
    count(DISTINCT e.pid) FILTER (WHERE p.excl IS NULL
                     AND COALESCE(e.reason, '') <> 'landing'
                     AND e.created_at > (SELECT t FROM params) - interval '30 days') AS people_30d,
    count(DISTINCT e.pid) FILTER (WHERE COALESCE(p.excl, '') <> 'internal'
                     AND COALESCE(e.reason, '') <> 'landing'
                     AND e.created_at > (SELECT t FROM params) - interval '30 days') AS people_30d_internal_out
  FROM evp e
  JOIN person p ON p.pid = e.pid
)
SELECT accepted_solutions, solutions_internal_out, people_30d, people_30d_internal_out,
       (SELECT t FROM params)::date AS measured_on
FROM tally;
