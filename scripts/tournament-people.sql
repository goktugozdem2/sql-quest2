-- scripts/tournament-people.sql — the first-session tournament, one row per
-- person (2026-11-26; founder, chat: "her bir grubu tek tek test et. ben de
-- testi görebileyim. o kişiye o gruba niye atadın o kişinin profilini de
-- çıkar.").
--
-- Every human assigned since `since`: who they were when they arrived (the
-- profile the app read at their first open), the stratum it put them in,
-- the arm they were drawn into and the sentence saying why, then what they
-- did. It feeds a founder-visible page later; today it is read by hand.
--
-- Identity: `person` is the first 8 hex characters of sha256(aid) — enough
-- to follow one row from week to week, never the aid, a username or an
-- email. The profile carries no PII by construction (src/utils/tournament.js,
-- buildVisitorProfile): door, company, device, country (when /api/geo/ had
-- answered), price region, language, a timezone bucket, whether a landing
-- page came first, the readiness band.
--
-- Who counts: scripts/scorecard-weekly.sql's human filter (the `humans`
-- block, byte for byte) and the read's cohort block (the `tournament` block,
-- byte for byte with scripts/tournament-read.sql; tests/tournament-read.test.js
-- pins both). Same `since` and registry as the read.
--
-- Progress, each inside its window from the assignment (t0):
--   first_run        challenge_first_run or challenge_solved in 7 d
--   first_solve_min  minutes from t0 to the first challenge_solved (7 d)
--   solves_7d        distinct challenges solved in 7 d (the decision metric
--                    counts ≥ 6; `eligible_7d` says whether 7 d have passed)
--   quota_wall_7d    met the 10-solve wall in 7 d
--   plan_click_7d    pro_plan_clicked / pro_checkout_clicked in 7 d
--   trial_30d, paid_30d   stripe_webhook rows, bridged through the person's
--                    usernames (#409's bridge, the read's money block)
--
-- Runs as-is in the read-only Supabase MCP `execute_sql` or psql.

WITH params AS (
  SELECT now() AS t, timestamptz '2026-12-10 00:00+00' AS since
),
registry (arm, arm_v, start_date, is_control, is_active) AS (VALUES
  -- tournament-registry:begin (mirrors src/data/tournament-arms.js; test-bound)
  ('A_control', 1, timestamptz '2026-12-10 00:00+00', true, true),
  ('B_single_path', 1, timestamptz '2026-12-10 00:00+00', false, true),
  ('D_interview_sprint', 1, timestamptz '2026-12-10 00:00+00', false, true)
  -- tournament-registry:end
),
-- humans:begin  (scripts/scorecard-weekly.sql's block; tests/tournament-read.test.js pins it)
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
-- humans:end
-- tournament:begin  (identical in queries 1 and 2; the test pins it)
asg AS (   -- each human person's FIRST tournament_assigned row
  SELECT DISTINCT ON (e.pid) e.pid, e.created_at AS t0,
         e.m->>'arm' AS arm,
         CASE WHEN e.m->>'armVersion' ~ '^[0-9]+$' THEN (e.m->>'armVersion')::int END AS arm_v,
         COALESCE(NULLIF(e.m->>'fqArm', ''), 'none') AS fq_arm,
         COALESCE(NULLIF(split_part(COALESCE(e.m->>'viewport', ''), ':', 1), ''), 'unknown') AS device,
         e.m->>'arrivalSrc' AS asg_arrival,
         CASE WHEN e.m->>'stratum' IN ('IT-D', 'IT-M', 'NI-D', 'NI-M') THEN e.m->>'stratum' END AS stratum_logged,
         CASE WHEN e.m->>'weightsVersion' ~ '^[0-9]+$' THEN (e.m->>'weightsVersion')::int ELSE 0 END AS weights_v,
         e.m->'weights' AS weights
  FROM evp e JOIN person p ON p.pid = e.pid AND p.excl IS NULL
  WHERE e.event = 'tournament_assigned'
  ORDER BY e.pid, e.created_at
),
cohort AS (   -- stratum = the one the assignment row logged (the draw's salt); a row
             -- without one (written before 2026-11-26's profile) is placed by the
             -- arrival door and the viewport band, the same definition
  SELECT a.pid, a.t0, a.arm, a.arm_v, a.fq_arm, a.device, r.is_control, a.weights_v, a.weights,
    CASE WHEN a.stratum_logged LIKE 'IT-%' THEN 'interview_target'
         WHEN a.stratum_logged LIKE 'NI-%' THEN 'other'
         ELSE d.seg_door END AS segment,
    COALESCE(a.stratum_logged,
             CASE WHEN d.seg_door = 'interview_target' THEN 'IT' ELSE 'NI' END
             || CASE WHEN a.device IN ('mobile', 'tablet') THEN '-M' ELSE '-D' END) AS stratum,
    a.t0 + interval '7 days'  <= (SELECT t FROM params) AS elig7,
    a.t0 + interval '30 days' <= (SELECT t FROM params) AS elig30
  FROM asg a
  JOIN registry r ON r.arm = a.arm AND r.arm_v = a.arm_v
  JOIN facts f ON f.pid = a.pid
  CROSS JOIN LATERAL (SELECT CASE
      WHEN COALESCE(f.fo->>'arrivalSrc', a.asg_arrival) ~ '-sql-interview$'
        OR COALESCE(f.fo->>'arrivalSrc', a.asg_arrival) ~ '^company:'
        OR COALESCE(f.fo->>'arrivalSrc', a.asg_arrival) IN ('blog-capital-one', 'readiness')
      THEN 'interview_target' ELSE 'other' END AS seg_door) d
  WHERE a.t0 >= r.start_date AND a.t0 >= (SELECT since FROM params)
),
c_rows AS (   -- the cohort's own rows, t0 → t0 + 30 days
  SELECT c.pid, e.event, e.reason, e.created_at, e.m
  FROM cohort c
  JOIN evp e ON e.pid = c.pid AND e.created_at >= c.t0 AND e.created_at <= c.t0 + interval '30 days'
),
outc AS (
  SELECT c.pid,
    count(DISTINCT r.m->>'challengeId') FILTER (
      WHERE r.event = 'challenge_solved' AND r.created_at <= c.t0 + interval '7 days') AS solves_7d,
    COALESCE(bool_or(r.event = 'challenge_solved' AND r.created_at <= c.t0 + interval '10 minutes'), false) AS solve_10m,
    COALESCE(bool_or(r.reason IS DISTINCT FROM 'landing'
             AND (r.created_at AT TIME ZONE 'UTC')::date > (c.t0 AT TIME ZONE 'UTC')::date
             AND r.created_at <= c.t0 + interval '7 days'), false) AS second_7d,
    COALESCE(bool_or(((r.event = 'content_lock_reached' AND r.m->>'wall' = 'free_quota')
                   OR (r.event = 'pro_modal_shown' AND r.m->>'reason' = 'free_quota'))
             AND r.created_at <= c.t0 + interval '7 days'), false) AS quota_wall_7d,
    COALESCE(bool_or(r.event IN ('pro_plan_clicked', 'pro_checkout_clicked')
             AND r.created_at <= c.t0 + interval '7 days'), false) AS plan_click_7d
  FROM cohort c LEFT JOIN c_rows r ON r.pid = c.pid
  GROUP BY c.pid
),
unames AS (   -- the bridge: every username the person's rows carried (never the shared 'guest')
  SELECT DISTINCT c.pid, c.t0, e.username
  FROM cohort c JOIN evp e ON e.pid = c.pid
  WHERE e.username IS NOT NULL AND e.username <> 'guest'
),
money_u AS (  -- each webhook username credited to ONE person: the earliest t0
  SELECT u.pid, u.username, u.t0,
         row_number() OVER (PARTITION BY u.username ORDER BY u.t0, u.pid) AS rn
  FROM unames u
  WHERE u.username IN (SELECT username FROM evp WHERE reason = 'stripe_webhook')
),
money AS (    -- stripe_webhook is the only money truth
  SELECT mu.pid,
    bool_or(w.event = 'pro_trial_started')      AS trial_30d,
    bool_or(w.event = 'pro_purchase_completed') AS paid_30d
  FROM money_u mu
  JOIN evp w ON w.username = mu.username AND w.reason = 'stripe_webhook'
            AND w.created_at >= mu.t0 AND w.created_at <= mu.t0 + interval '30 days'
  WHERE mu.rn = 1
  GROUP BY mu.pid
),
per AS (
  SELECT c.*, o.solves_7d, o.solve_10m, o.second_7d, o.quota_wall_7d, o.plan_click_7d,
         COALESCE(m.trial_30d, false) AS trial_30d, COALESCE(m.paid_30d, false) AS paid_30d
  FROM cohort c JOIN outc o USING (pid) LEFT JOIN money m USING (pid)
),
-- tournament:end
first_row AS (   -- the assignment row itself: the profile and the reason
  SELECT DISTINCT ON (e.pid) e.pid, e.m
  FROM evp e JOIN cohort c ON c.pid = e.pid
  WHERE e.event = 'tournament_assigned'
  ORDER BY e.pid, e.created_at
),
runs AS (
  SELECT c.pid,
    COALESCE(bool_or(r.event IN ('challenge_first_run', 'challenge_solved')
             AND r.created_at <= c.t0 + interval '7 days'), false) AS first_run,
    min(r.created_at) FILTER (WHERE r.event = 'challenge_solved'
             AND r.created_at <= c.t0 + interval '7 days') AS first_solve_at
  FROM cohort c LEFT JOIN c_rows r ON r.pid = c.pid
  GROUP BY c.pid
)
SELECT
  left(encode(sha256(convert_to(p.pid, 'UTF8')), 'hex'), 8)        AS person,
  (p.t0 AT TIME ZONE 'UTC')::date                                   AS assigned_on,
  p.stratum,
  p.arm,
  p.arm_v,
  p.weights_v,
  f.m->'profile'->>'door'                                           AS door,
  f.m->'profile'->>'doorSrc'                                        AS door_src,
  f.m->'profile'->>'company'                                        AS company,
  (f.m->'profile'->>'interviewTarget')::boolean                     AS interview_target,
  f.m->'profile'->>'itSignal'                                       AS it_signal,
  f.m->'profile'->>'device'                                         AS device,
  f.m->'profile'->>'country'                                        AS country,
  f.m->'profile'->>'priceRegion'                                    AS price_region,
  f.m->'profile'->>'language'                                       AS language,
  f.m->'profile'->>'tzBucket'                                       AS tz_bucket,
  (f.m->'profile'->>'landingBefore')::boolean                       AS landing_before,
  f.m->'profile'->>'readinessBand'                                  AS readiness_band,
  f.m->>'reason'                                                    AS reason,
  p.fq_arm,
  p.elig7                                                           AS eligible_7d,
  r.first_run,
  round(extract(epoch FROM (r.first_solve_at - p.t0)) / 60.0, 1)   AS first_solve_min,
  p.solves_7d,
  p.quota_wall_7d,
  p.plan_click_7d,
  p.trial_30d,
  p.paid_30d
FROM per p
JOIN first_row f ON f.pid = p.pid
JOIN runs r ON r.pid = p.pid
ORDER BY p.t0 DESC, person;
