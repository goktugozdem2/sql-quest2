-- scripts/experiments-live.sql — the live experiments, one query per test
-- (B2, 2026-11-28). The founder asked to SEE the running tests ("ben de
-- testi görebileyim"); this is the data behind that page.
--
-- Each query runs as-is in the Supabase MCP `execute_sql` (read-only) or in
-- psql as metrics_reader: no parameters, no temp tables, no writes.
-- Aggregates only: no aid, username or email leaves the database. If a
-- query is slow, run `SET enable_nestloop = off;` first in the same session.
--
-- People and the human filter: the `base` block of
-- scripts/scorecard-weekly.sql, copied byte for byte (internal usernames,
-- founder and A2 walk aids incl. every `a2a2%` aid, bot stamps, crawler
-- window sizes, referrer spam and the fingerprint rules). One matching row
-- drops the whole person. tests/experiments-live.test.js fails when the copy
-- here drifts from scorecard-weekly.sql's.
--   person = COALESCE(aid, username), metadata read as (metadata #>> '{}')::jsonb.
--
-- Every query returns one row per arm (arms come from a VALUES list, so an
-- arm with nobody in it still shows 0):
--   arm, is_control
--   assigned      human people with the test's assignment row, all time
--   assigned_7d   of them, assigned in the last 7 days
--   metric_n      assigned people whose metric window has closed
--   metric_k      of metric_n, people who did the thing
--   rate          metric_k / metric_n, percent
--   ci_low/high   Wilson 95% interval on rate, percent
--   diff_pts      rate minus the control arm's rate, points (null on control)
--   p_two_sided   two-proportion z-test against the control arm, pooled,
--                 two-sided, normal approximation (Abramowitz–Stegun 26.2.17
--                 for the normal tail). At the small n of these tests it is
--                 direction only; each test's decision rule is in its header.
-- One arm per person: the person's FIRST assignment row.
-- Tournament overlap (ledger, the first-session tournament): from its
-- launch, runnableStarter, mobileRunBar and companyDirectOpen keep only
-- people whose assignment row carries no `tArm` or arm A (`A_control`).

-- ===== Query 1: freeQuotaHoldout =========================================
-- Flag `freeQuotaHoldout`; metric `free_quota_holdout` (docs/agent/metrics.md).
-- Assignment `free_quota_arm_assigned {arm}`, arms `quota` (control) /
-- `holdout`, at a browser's first app open, enrolment 2026-11-28 → 12-25.
-- Metric: 7-day return of day-0 solvers. t0 = the assignment row; day-0
-- solver = a `challenge_solved` on t0's UTC day; returned = any row with
-- reason not `landing` on a later UTC day, within 7 days of t0. metric_n
-- counts only day-0 solvers 7 full days past t0.
-- Extra column balance_p: two-sided binomial test (normal approximation) of
-- the all-time assigned split against 50/50 — the 2026-12-04 arm-balance
-- check (needs ≥ 200 assigned; PASS at p ≥ 0.01).
-- Reads: balance 2026-12-04, money (halfway) 2026-12-12, final 2027-01-02.
-- Rule: at ≥ 85 day-0 solvers per arm, holdout − quota ≥ 12 points
-- (p < 0.05) → the quota cost the returns; ≤ 5 → it did not; between →
-- extend enrolment 4 weeks once.

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
arms(arm, ctl) AS (VALUES ('quota', true), ('holdout', false)),
asg AS (
  SELECT DISTINCT ON (pid) pid, created_at AS t0, m->>'arm' AS arm
  FROM clean WHERE event = 'free_quota_arm_assigned'
  ORDER BY pid, created_at
),
pp AS (
  SELECT a.pid, a.arm, a.t0,
    a.t0 >= (SELECT t FROM params) - interval '7 days' AS recent,
    a.t0 <= (SELECT t FROM params) - interval '7 days' AS matured,
    EXISTS (SELECT 1 FROM clean c WHERE c.pid = a.pid AND c.event = 'challenge_solved'
            AND (c.created_at AT TIME ZONE 'UTC')::date = (a.t0 AT TIME ZONE 'UTC')::date) AS day0,
    EXISTS (SELECT 1 FROM clean c WHERE c.pid = a.pid AND c.reason IS DISTINCT FROM 'landing'
            AND (c.created_at AT TIME ZONE 'UTC')::date > (a.t0 AT TIME ZONE 'UTC')::date
            AND c.created_at <= a.t0 + interval '7 days') AS hit
  FROM asg a
),
res AS (
  SELECT arm, count(*) AS assigned, count(*) FILTER (WHERE recent) AS assigned7d,
         count(*) FILTER (WHERE matured AND day0) AS n,
         count(*) FILTER (WHERE matured AND day0 AND hit) AS k
  FROM pp GROUP BY arm
),
stat AS (
  SELECT a.arm, a.ctl, COALESCE(r.assigned, 0) AS assigned, COALESCE(r.assigned7d, 0) AS assigned7d,
         COALESCE(r.n, 0) AS n, COALESCE(r.k, 0) AS k
  FROM arms a LEFT JOIN res r ON r.arm = a.arm
)
SELECT s.arm, s.ctl AS is_control, s.assigned, s.assigned7d AS assigned_7d,
  s.n AS metric_n, s.k AS metric_k,
  round(CAST(100 * w.p AS numeric), 1)         AS rate,
  round(CAST(100 * (w.c - w.h) AS numeric), 1) AS ci_low,
  round(CAST(100 * (w.c + w.h) AS numeric), 1) AS ci_high,
  CASE WHEN NOT s.ctl THEN round(CAST(100 * (w.p - wc.p) AS numeric), 1) END AS diff_pts,
  CASE WHEN NOT s.ctl THEN round(CAST(2 * ph.tail AS numeric), 4) END     AS p_two_sided,
  round(CAST(2 * bt.tail AS numeric), 4) AS balance_p
FROM stat s
CROSS JOIN (SELECT n, k FROM stat WHERE ctl) c
CROSS JOIN LATERAL (SELECT s.k::float8 / NULLIF(s.n, 0) AS p, NULLIF(s.n, 0)::float8 AS nn) x
CROSS JOIN LATERAL (SELECT x.p, (x.p + 1.9208 / x.nn) / (1 + 3.8416 / x.nn) AS c,       -- Wilson, z = 1.96
                    1.96 * sqrt(x.p * (1 - x.p) / x.nn + 0.9604 / (x.nn * x.nn)) / (1 + 3.8416 / x.nn) AS h) w
CROSS JOIN LATERAL (SELECT c.k::float8 / NULLIF(c.n, 0) AS p) wc
CROSS JOIN LATERAL (SELECT (s.k + c.k)::float8 / NULLIF(s.n + c.n, 0) AS pp) q
CROSS JOIN LATERAL (SELECT abs(w.p - wc.p)
                    / NULLIF(sqrt(q.pp * (1 - q.pp) * (1.0 / x.nn + 1.0 / NULLIF(c.n, 0))), 0) AS z) z
CROSS JOIN LATERAL (SELECT 1 / (1 + 0.2316419 * z.z) AS t) tt
CROSS JOIN LATERAL (SELECT exp(-z.z * z.z / 2) / sqrt(2 * pi()) * tt.t * (0.319381530 + tt.t * (-0.356563782
                    + tt.t * (1.781477937 + tt.t * (-1.821255978 + tt.t * 1.330274429)))) AS tail) ph
CROSS JOIN LATERAL (SELECT sum(assigned)::float8 AS nn, (sum(assigned) FILTER (WHERE ctl))::float8 AS kc FROM stat) bn
CROSS JOIN LATERAL (SELECT abs(bn.kc - bn.nn / 2.0) / NULLIF(sqrt(bn.nn / 4.0), 0) AS z) bz
CROSS JOIN LATERAL (SELECT 1 / (1 + 0.2316419 * bz.z) AS t) btt
CROSS JOIN LATERAL (SELECT exp(-bz.z * bz.z / 2) / sqrt(2 * pi()) * btt.t * (0.319381530 + btt.t * (-0.356563782
                    + btt.t * (1.781477937 + btt.t * (-1.821255978 + btt.t * 1.330274429)))) AS tail) bt
ORDER BY s.ctl DESC, s.arm;

-- ===== Query 2: runnableStarter ==========================================
-- Flag `runnableStarter`; metric `runnable_starter_split`. Assignment
-- `runnable_starter_assigned {arm, challengeId, viewport}`, arms `control` /
-- `starter`, at the first empty-editor challenge open on a desktop screen
-- (rows whose viewport is not `desktop:` are left out). ON 2026-11-26.
-- Metric (primary, "ran"): a `challenge_first_run` for the assigned
-- challengeId at or after t0, any `via`. metric_n = people assigned at
-- least 1 hour ago.
-- Reads: interim 2026-12-17 (harm only), final 2027-01-07.
-- Rule: final — starter ran-rate not ≥ control + 5 points, or its first
-- solve in the session below control's → flag off; interim — starter ≥ 10
-- points below control on first solve in the session → off the same day.

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
arms(arm, ctl) AS (VALUES ('control', true), ('starter', false)),
asg AS (
  SELECT DISTINCT ON (pid) pid, created_at AS t0, m->>'arm' AS arm, m->>'challengeId' AS cid
  FROM clean WHERE event = 'runnable_starter_assigned'
    AND m->>'viewport' LIKE 'desktop:%'
    AND (m->>'tArm' IS NULL OR m->>'tArm' = 'A_control')
  ORDER BY pid, created_at
),
pp AS (
  SELECT a.pid, a.arm,
    a.t0 >= (SELECT t FROM params) - interval '7 days' AS recent,
    a.t0 <= (SELECT t FROM params) - interval '1 hour' AS matured,
    EXISTS (SELECT 1 FROM clean c WHERE c.pid = a.pid AND c.event = 'challenge_first_run'
            AND c.m->>'challengeId' = a.cid AND c.created_at >= a.t0) AS hit
  FROM asg a
),
res AS (
  SELECT arm, count(*) AS assigned, count(*) FILTER (WHERE recent) AS assigned7d,
         count(*) FILTER (WHERE matured) AS n,
         count(*) FILTER (WHERE matured AND hit) AS k
  FROM pp GROUP BY arm
),
stat AS (
  SELECT a.arm, a.ctl, COALESCE(r.assigned, 0) AS assigned, COALESCE(r.assigned7d, 0) AS assigned7d,
         COALESCE(r.n, 0) AS n, COALESCE(r.k, 0) AS k
  FROM arms a LEFT JOIN res r ON r.arm = a.arm
)
SELECT s.arm, s.ctl AS is_control, s.assigned, s.assigned7d AS assigned_7d,
  s.n AS metric_n, s.k AS metric_k,
  round(CAST(100 * w.p AS numeric), 1)         AS rate,
  round(CAST(100 * (w.c - w.h) AS numeric), 1) AS ci_low,
  round(CAST(100 * (w.c + w.h) AS numeric), 1) AS ci_high,
  CASE WHEN NOT s.ctl THEN round(CAST(100 * (w.p - wc.p) AS numeric), 1) END AS diff_pts,
  CASE WHEN NOT s.ctl THEN round(CAST(2 * ph.tail AS numeric), 4) END     AS p_two_sided
FROM stat s
CROSS JOIN (SELECT n, k FROM stat WHERE ctl) c
CROSS JOIN LATERAL (SELECT s.k::float8 / NULLIF(s.n, 0) AS p, NULLIF(s.n, 0)::float8 AS nn) x
CROSS JOIN LATERAL (SELECT x.p, (x.p + 1.9208 / x.nn) / (1 + 3.8416 / x.nn) AS c,       -- Wilson, z = 1.96
                    1.96 * sqrt(x.p * (1 - x.p) / x.nn + 0.9604 / (x.nn * x.nn)) / (1 + 3.8416 / x.nn) AS h) w
CROSS JOIN LATERAL (SELECT c.k::float8 / NULLIF(c.n, 0) AS p) wc
CROSS JOIN LATERAL (SELECT (s.k + c.k)::float8 / NULLIF(s.n + c.n, 0) AS pp) q
CROSS JOIN LATERAL (SELECT abs(w.p - wc.p)
                    / NULLIF(sqrt(q.pp * (1 - q.pp) * (1.0 / x.nn + 1.0 / NULLIF(c.n, 0))), 0) AS z) z
CROSS JOIN LATERAL (SELECT 1 / (1 + 0.2316419 * z.z) AS t) tt
CROSS JOIN LATERAL (SELECT exp(-z.z * z.z / 2) / sqrt(2 * pi()) * tt.t * (0.319381530 + tt.t * (-0.356563782
                    + tt.t * (1.781477937 + tt.t * (-1.821255978 + tt.t * 1.330274429)))) AS tail) ph
ORDER BY s.ctl DESC, s.arm;

-- ===== Query 3: mobileRunBar =============================================
-- Flag `mobileRunBar`; metric `open_to_first_run`, mobile band, by arm.
-- Assignment `mobile_run_bar_assigned {arm, challengeId}`, arms `control` /
-- `bar`, at the first challenge open on a narrow touch screen; only rows
-- whose viewport is `mobile:`. ON 2026-11-25; the walk guests of
-- 2026-11-25 10:24–10:33 UTC are left out (ledger).
-- Metric: a `challenge_first_run` for the assigned challengeId at or after
-- t0. metric_n = people assigned at least 1 hour ago.
-- Read: 2026-12-23.
-- Rule: bar below 35%, or under 15 points above control → falsified (an
-- effect-size rule, not a p-value); either arm < 15 people at the read →
-- extend 28 days once, then call it.

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
arms(arm, ctl) AS (VALUES ('control', true), ('bar', false)),
asg AS (
  SELECT DISTINCT ON (pid) pid, created_at AS t0, m->>'arm' AS arm, m->>'challengeId' AS cid
  FROM clean WHERE event = 'mobile_run_bar_assigned'
    AND m->>'viewport' LIKE 'mobile:%'
    AND (m->>'tArm' IS NULL OR m->>'tArm' = 'A_control')
  ORDER BY pid, created_at
),
pp AS (
  SELECT a.pid, a.arm,
    a.t0 >= (SELECT t FROM params) - interval '7 days' AS recent,
    a.t0 <= (SELECT t FROM params) - interval '1 hour' AS matured,
    EXISTS (SELECT 1 FROM clean c WHERE c.pid = a.pid AND c.event = 'challenge_first_run'
            AND c.m->>'challengeId' = a.cid AND c.created_at >= a.t0) AS hit
  FROM asg a
  WHERE NOT (a.t0 >= '2026-11-25 10:24+00' AND a.t0 < '2026-11-25 10:34+00')   -- the 11-25 walk guests
),
res AS (
  SELECT arm, count(*) AS assigned, count(*) FILTER (WHERE recent) AS assigned7d,
         count(*) FILTER (WHERE matured) AS n,
         count(*) FILTER (WHERE matured AND hit) AS k
  FROM pp GROUP BY arm
),
stat AS (
  SELECT a.arm, a.ctl, COALESCE(r.assigned, 0) AS assigned, COALESCE(r.assigned7d, 0) AS assigned7d,
         COALESCE(r.n, 0) AS n, COALESCE(r.k, 0) AS k
  FROM arms a LEFT JOIN res r ON r.arm = a.arm
)
SELECT s.arm, s.ctl AS is_control, s.assigned, s.assigned7d AS assigned_7d,
  s.n AS metric_n, s.k AS metric_k,
  round(CAST(100 * w.p AS numeric), 1)         AS rate,
  round(CAST(100 * (w.c - w.h) AS numeric), 1) AS ci_low,
  round(CAST(100 * (w.c + w.h) AS numeric), 1) AS ci_high,
  CASE WHEN NOT s.ctl THEN round(CAST(100 * (w.p - wc.p) AS numeric), 1) END AS diff_pts,
  CASE WHEN NOT s.ctl THEN round(CAST(2 * ph.tail AS numeric), 4) END     AS p_two_sided
FROM stat s
CROSS JOIN (SELECT n, k FROM stat WHERE ctl) c
CROSS JOIN LATERAL (SELECT s.k::float8 / NULLIF(s.n, 0) AS p, NULLIF(s.n, 0)::float8 AS nn) x
CROSS JOIN LATERAL (SELECT x.p, (x.p + 1.9208 / x.nn) / (1 + 3.8416 / x.nn) AS c,       -- Wilson, z = 1.96
                    1.96 * sqrt(x.p * (1 - x.p) / x.nn + 0.9604 / (x.nn * x.nn)) / (1 + 3.8416 / x.nn) AS h) w
CROSS JOIN LATERAL (SELECT c.k::float8 / NULLIF(c.n, 0) AS p) wc
CROSS JOIN LATERAL (SELECT (s.k + c.k)::float8 / NULLIF(s.n + c.n, 0) AS pp) q
CROSS JOIN LATERAL (SELECT abs(w.p - wc.p)
                    / NULLIF(sqrt(q.pp * (1 - q.pp) * (1.0 / x.nn + 1.0 / NULLIF(c.n, 0))), 0) AS z) z
CROSS JOIN LATERAL (SELECT 1 / (1 + 0.2316419 * z.z) AS t) tt
CROSS JOIN LATERAL (SELECT exp(-z.z * z.z / 2) / sqrt(2 * pi()) * tt.t * (0.319381530 + tt.t * (-0.356563782
                    + tt.t * (1.781477937 + tt.t * (-1.821255978 + tt.t * 1.330274429)))) AS tail) ph
ORDER BY s.ctl DESC, s.arm;

-- ===== Query 4: companyDirectOpen ========================================
-- Flag `companyDirectOpen`; metric `company_direct_split`. Assignment
-- `company_direct_assigned {arm, company, nextId}`, arms `list` (control) /
-- `direct`, at a zero-solve `/app/?company=X` arrival. ON 2026-11-23.
-- Metric (primary): first_solve_10m from assignment — a `challenge_solved`
-- within 10 minutes of t0. metric_n = people assigned at least 10 minutes
-- ago.
-- Reads: early harm check at 60 per arm; verdict at 120 per arm (~2027-01-08
-- at today's volume); hard stop 2027-02-27.
-- Rule: at 60 per arm, direct ≥ 10 points below list → off (MISS); at 120
-- per arm, direct ≥ list + 8 → HIT, within ± 8 → FLAT (off), < list − 3 →
-- MISS; < 120 per arm by 02-27 → UNREADABLE, off.

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
arms(arm, ctl) AS (VALUES ('list', true), ('direct', false)),
asg AS (
  SELECT DISTINCT ON (pid) pid, created_at AS t0, m->>'arm' AS arm
  FROM clean WHERE event = 'company_direct_assigned'
    AND (m->>'tArm' IS NULL OR m->>'tArm' = 'A_control')
  ORDER BY pid, created_at
),
pp AS (
  SELECT a.pid, a.arm,
    a.t0 >= (SELECT t FROM params) - interval '7 days' AS recent,
    a.t0 <= (SELECT t FROM params) - interval '10 minutes' AS matured,
    EXISTS (SELECT 1 FROM clean c WHERE c.pid = a.pid AND c.event = 'challenge_solved'
            AND c.created_at >= a.t0 AND c.created_at <= a.t0 + interval '10 minutes') AS hit
  FROM asg a
),
res AS (
  SELECT arm, count(*) AS assigned, count(*) FILTER (WHERE recent) AS assigned7d,
         count(*) FILTER (WHERE matured) AS n,
         count(*) FILTER (WHERE matured AND hit) AS k
  FROM pp GROUP BY arm
),
stat AS (
  SELECT a.arm, a.ctl, COALESCE(r.assigned, 0) AS assigned, COALESCE(r.assigned7d, 0) AS assigned7d,
         COALESCE(r.n, 0) AS n, COALESCE(r.k, 0) AS k
  FROM arms a LEFT JOIN res r ON r.arm = a.arm
)
SELECT s.arm, s.ctl AS is_control, s.assigned, s.assigned7d AS assigned_7d,
  s.n AS metric_n, s.k AS metric_k,
  round(CAST(100 * w.p AS numeric), 1)         AS rate,
  round(CAST(100 * (w.c - w.h) AS numeric), 1) AS ci_low,
  round(CAST(100 * (w.c + w.h) AS numeric), 1) AS ci_high,
  CASE WHEN NOT s.ctl THEN round(CAST(100 * (w.p - wc.p) AS numeric), 1) END AS diff_pts,
  CASE WHEN NOT s.ctl THEN round(CAST(2 * ph.tail AS numeric), 4) END     AS p_two_sided
FROM stat s
CROSS JOIN (SELECT n, k FROM stat WHERE ctl) c
CROSS JOIN LATERAL (SELECT s.k::float8 / NULLIF(s.n, 0) AS p, NULLIF(s.n, 0)::float8 AS nn) x
CROSS JOIN LATERAL (SELECT x.p, (x.p + 1.9208 / x.nn) / (1 + 3.8416 / x.nn) AS c,       -- Wilson, z = 1.96
                    1.96 * sqrt(x.p * (1 - x.p) / x.nn + 0.9604 / (x.nn * x.nn)) / (1 + 3.8416 / x.nn) AS h) w
CROSS JOIN LATERAL (SELECT c.k::float8 / NULLIF(c.n, 0) AS p) wc
CROSS JOIN LATERAL (SELECT (s.k + c.k)::float8 / NULLIF(s.n + c.n, 0) AS pp) q
CROSS JOIN LATERAL (SELECT abs(w.p - wc.p)
                    / NULLIF(sqrt(q.pp * (1 - q.pp) * (1.0 / x.nn + 1.0 / NULLIF(c.n, 0))), 0) AS z) z
CROSS JOIN LATERAL (SELECT 1 / (1 + 0.2316419 * z.z) AS t) tt
CROSS JOIN LATERAL (SELECT exp(-z.z * z.z / 2) / sqrt(2 * pi()) * tt.t * (0.319381530 + tt.t * (-0.356563782
                    + tt.t * (1.781477937 + tt.t * (-1.821255978 + tt.t * 1.330274429)))) AS tail) ph
ORDER BY s.ctl DESC, s.arm;

-- ===== Query 5: firstSessionTournament ===================================
-- Flag `firstSessionTournament` — DARK until the launch, no earlier than
-- 2026-12-12; until then every arm reads 0. Metric
-- `first_session_tournament`: 6+ distinct challenges solved within 7 days of
-- the assignment (the first app open). Assignment `tournament_assigned
-- {arm}`, arms `A_control` (control, permanent) / `B_single_path` /
-- `D_interview_sprint`. metric_n = people assigned 7+ days ago. The
-- p-value here is each challenger against A_control; the tournament itself
-- decides on Beta posteriors (scripts/tournament-read.sql +
-- scripts/tournament-posteriors.mjs), not on this column.
-- First read: the Friday every challenger has ≥ 150 eligible (~2027-01-08,
-- latest 2027-01-22).
-- Rule: a challenger with P(worst among challengers) ≥ 0.80 at ≥ 150 per
-- arm is eliminated; one trailing control by ≥ 10 points on
-- first_solve_10m at ≥ 100 per arm is stopped the same day.

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
arms(arm, ctl) AS (VALUES ('A_control', true), ('B_single_path', false), ('D_interview_sprint', false)),
asg AS (
  SELECT DISTINCT ON (pid) pid, created_at AS t0, m->>'arm' AS arm
  FROM clean WHERE event = 'tournament_assigned'
  ORDER BY pid, created_at
),
pp AS (
  SELECT a.pid, a.arm,
    a.t0 >= (SELECT t FROM params) - interval '7 days' AS recent,
    a.t0 <= (SELECT t FROM params) - interval '7 days' AS matured,
    (SELECT count(DISTINCT c.m->>'challengeId') FROM clean c
      WHERE c.pid = a.pid AND c.event = 'challenge_solved'
        AND c.created_at >= a.t0 AND c.created_at <= a.t0 + interval '7 days') >= 6 AS hit
  FROM asg a
),
res AS (
  SELECT arm, count(*) AS assigned, count(*) FILTER (WHERE recent) AS assigned7d,
         count(*) FILTER (WHERE matured) AS n,
         count(*) FILTER (WHERE matured AND hit) AS k
  FROM pp GROUP BY arm
),
stat AS (
  SELECT a.arm, a.ctl, COALESCE(r.assigned, 0) AS assigned, COALESCE(r.assigned7d, 0) AS assigned7d,
         COALESCE(r.n, 0) AS n, COALESCE(r.k, 0) AS k
  FROM arms a LEFT JOIN res r ON r.arm = a.arm
)
SELECT s.arm, s.ctl AS is_control, s.assigned, s.assigned7d AS assigned_7d,
  s.n AS metric_n, s.k AS metric_k,
  round(CAST(100 * w.p AS numeric), 1)         AS rate,
  round(CAST(100 * (w.c - w.h) AS numeric), 1) AS ci_low,
  round(CAST(100 * (w.c + w.h) AS numeric), 1) AS ci_high,
  CASE WHEN NOT s.ctl THEN round(CAST(100 * (w.p - wc.p) AS numeric), 1) END AS diff_pts,
  CASE WHEN NOT s.ctl THEN round(CAST(2 * ph.tail AS numeric), 4) END     AS p_two_sided
FROM stat s
CROSS JOIN (SELECT n, k FROM stat WHERE ctl) c
CROSS JOIN LATERAL (SELECT s.k::float8 / NULLIF(s.n, 0) AS p, NULLIF(s.n, 0)::float8 AS nn) x
CROSS JOIN LATERAL (SELECT x.p, (x.p + 1.9208 / x.nn) / (1 + 3.8416 / x.nn) AS c,       -- Wilson, z = 1.96
                    1.96 * sqrt(x.p * (1 - x.p) / x.nn + 0.9604 / (x.nn * x.nn)) / (1 + 3.8416 / x.nn) AS h) w
CROSS JOIN LATERAL (SELECT c.k::float8 / NULLIF(c.n, 0) AS p) wc
CROSS JOIN LATERAL (SELECT (s.k + c.k)::float8 / NULLIF(s.n + c.n, 0) AS pp) q
CROSS JOIN LATERAL (SELECT abs(w.p - wc.p)
                    / NULLIF(sqrt(q.pp * (1 - q.pp) * (1.0 / x.nn + 1.0 / NULLIF(c.n, 0))), 0) AS z) z
CROSS JOIN LATERAL (SELECT 1 / (1 + 0.2316419 * z.z) AS t) tt
CROSS JOIN LATERAL (SELECT exp(-z.z * z.z / 2) / sqrt(2 * pi()) * tt.t * (0.319381530 + tt.t * (-0.356563782
                    + tt.t * (1.781477937 + tt.t * (-1.821255978 + tt.t * 1.330274429)))) AS tail) ph
ORDER BY s.ctl DESC, s.arm;
