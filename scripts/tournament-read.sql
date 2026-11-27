-- scripts/tournament-read.sql — the first-session tournament's weekly read
-- (2026-11-26, PR 1 of 4; shipped before any arm changes behaviour, fleet
-- README rule 6b).
--
-- Plan: docs/plans/first-session-tournament-2026-11-26.md §5. Metric:
-- `first_session_tournament` (docs/agent/metrics.md). Registry:
-- src/data/tournament-arms.js (the `registry` VALUES below mirror it;
-- tests/tournament-read.test.js fails when they drift: one row per arm ×
-- armVersion that has ever had a startDate, retired ones kept with
-- is_active = false so their final numbers stay readable). Read every Friday by
-- B2; the posteriors come from the companion script:
--   node scripts/tournament-posteriors.mjs '<query 1 rows as JSON>'
--
-- Each query runs as-is in the Supabase MCP `execute_sql` (read-only) or in
-- psql: no parameters, no temp tables, no writes. Aggregates only: no aid,
-- username or email leaves the database. If a query is slow on production,
-- run `SET enable_nestloop = off;` in the same session first (the person
-- filter joins every row a cohort member ever wrote).
--
-- ── Who counts ──────────────────────────────────────────────────────────────
-- Person = COALESCE(metadata.aid, username), metadata read as
-- (metadata #>> '{}')::jsonb. Humans only: the exclusion block of
-- scripts/scorecard-weekly.sql, copied byte for byte between the
-- `humans:begin/end` markers (the test compares them), every rule applied
-- to the person's rows at any time.
-- Population: the person's FIRST `tournament_assigned` row (it fires once
-- per browser), by `arm` AND `armVersion` — never pooled across versions.
-- t0 = that row's created_at. A person counts from the later of the arm's
-- registry startDate and `params.since`. When the number of ACTIVE arms
-- changes (a 4th slot opens), move `since` to that day in every query:
-- the per-arm share moves from 1/3 to 1/4 and arms are never pooled across
-- it.
-- Eligible (7 d) = t0 + 7 days ≤ the read time; eligible (30 d) likewise.
--
-- ── What is read (written before the data) ─────────────────────────────────
-- decision   six_7d: ≥ 6 distinct challengeIds on challenge_solved rows in
--            [t0, t0 + 7 d]. Mock answers never count. Baseline 11.8%.
-- secondary  quota_wall_7d: content_lock_reached wall=free_quota or
--              pro_modal_shown reason=free_quota in 7 d, over people whose
--              fqArm is not 'holdout' (the holdout arm has no wall).
--              Baseline 5.2%.
--            plan_click_7d: pro_plan_clicked or pro_checkout_clicked in 7 d.
--              Baseline 1.5%.
--            trials_30d / paid_30d: reason = 'stripe_webhook' rows
--              pro_trial_started / pro_purchase_completed in 30 d, bridged
--              through the usernames the person's rows carry; each webhook
--              username is credited to ONE person (the earliest t0), as in
--              docs/reads/funnel-by-segment-2026-11-26.md. Separate columns,
--              never summed. The literal username 'guest' (shared by every
--              guest's anonymous rows) never bridges; a `guest_<ts>` name
--              is one browser's and does.
-- guardrails solve_10m: a challenge_solved in [t0, t0 + 10 min]. 23.3%.
--            second_7d: any non-landing row on a later UTC day than t0,
--              within 7 days. 16.0%.
-- splits     segment (interview-target or other: the stratum's first half,
--              see below), device band (the assignment row's viewport
--              prefix), fqArm (the freeQuota holdout: quota | holdout | none
--              — the 2×2), stratum.
-- strata     (founder, 2026-11-26: profile first, then the group.) Every
--              assignment row logs the `stratum` its profile put the person
--              in — IT/NI (interview-target: company page, `?company=`, the
--              readiness test or its stored result, the Capital One blog)
--              × D/M (desktop, or an unreadable device / phone or tablet) —
--              and the arm was drawn at random INSIDE it. A row written
--              before the profile existed is placed by its arrival door and
--              viewport (the cohort block). Query 4 is the decision table
--              per stratum.
--
-- ── The posteriors (the companion script; the formula, for a hand check) ───
-- Per arm: Beta(alpha, beta) with alpha = 1 + six_7d, beta = 1 +
-- eligible_7d − six_7d (uniform prior). 20,000 Monte-Carlo draws, one per
-- arm per draw:
--   P(better than control) = share of draws where the arm's draw > A's.
--   P(worst among challengers) = share of draws where the arm's draw is the
--   lowest of the challengers' (control excluded).
-- Rules (plan §5.5 + orchestrator 2026-11-26): nothing is decided until
-- every challenger has ≥ 150 eligible; eliminate at P(worst) ≥ 0.80 (or the
-- lowest posterior mean 6 weeks after a challenger's start); promote at
-- P(better than control) ≥ 0.95 on TWO consecutive Friday reads; harm stop
-- when solve_10m trails control by ≥ 10 points at ≥ 100 eligible per arm;
-- control is never eliminated. Report n per arm, always.
-- Elimination and promotion stay POOLED (query 1): at ~23 people a day no
-- stratum alone reaches 150 per arm in time. While every stratum draws with
-- equal weights the plain pool is fair; once any stratum is ROUTED, the
-- pool's arm mix differs by stratum and the companion script's
-- post-stratified pool (`--strata`, query 4's rows) replaces query 1's.
-- Routing (written before the data): a stratum is routed to an arm only
-- when P(best in that stratum) ≥ 0.95 on TWO consecutive Friday reads with
-- ≥ 100 eligible per arm in that stratum, by an orchestrator decision row
-- that adds the stratum to TOURNAMENT_STRATUM_WEIGHTS with the winner at
-- ≤ 80% (every other active arm keeps a share: ≥ 20% explores). A weights
-- change restarts that stratum's per-arm counts (query 4 reads the current
-- `weightsVersion` only).

-- ===== Query 1: the decision table =======================================
-- One row per arm × armVersion. alpha / beta feed the companion script.
WITH params AS (
  SELECT now() AS t, timestamptz '2026-12-12 00:00+00' AS since
),
registry (arm, arm_v, start_date, is_control, is_active) AS (VALUES
  -- tournament-registry:begin (mirrors src/data/tournament-arms.js; test-bound)
  ('A_control', 1, timestamptz '2026-12-12 00:00+00', true, true),
  ('B_single_path', 1, timestamptz '2026-12-12 00:00+00', false, true),
  ('D_interview_sprint', 1, timestamptz '2026-12-12 00:00+00', false, true)
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
arm_rows AS (
  SELECT arm, arm_v, bool_or(is_control) AS is_control,
    count(*)                                                                   AS assigned,
    count(*) FILTER (WHERE elig7)                                              AS eligible_7d,
    count(*) FILTER (WHERE elig7 AND solves_7d >= 6)                           AS six_7d,
    count(*) FILTER (WHERE elig7 AND solve_10m)                                AS solve_10m,
    count(*) FILTER (WHERE elig7 AND second_7d)                                AS second_7d,
    count(*) FILTER (WHERE elig7 AND fq_arm <> 'holdout')                      AS quota_eligible_7d,
    count(*) FILTER (WHERE elig7 AND fq_arm <> 'holdout' AND quota_wall_7d)    AS quota_wall_7d,
    count(*) FILTER (WHERE elig7 AND plan_click_7d)                            AS plan_click_7d,
    count(*) FILTER (WHERE elig30)                                             AS eligible_30d,
    count(*) FILTER (WHERE elig30 AND trial_30d)                               AS trials_30d,
    count(*) FILTER (WHERE elig30 AND paid_30d)                                AS paid_30d
  FROM per GROUP BY arm, arm_v
)
SELECT r.arm, r.arm_v, r.is_control,
  COALESCE(a.assigned, 0)       AS assigned,
  COALESCE(a.eligible_7d, 0)    AS eligible_7d,
  COALESCE(a.six_7d, 0)         AS six_7d,
  round(100.0 * a.six_7d / NULLIF(a.eligible_7d, 0), 1)             AS six_7d_pct,
  1 + COALESCE(a.six_7d, 0)                                         AS alpha,
  1 + COALESCE(a.eligible_7d, 0) - COALESCE(a.six_7d, 0)            AS beta,
  round((1 + COALESCE(a.six_7d, 0))::numeric / (2 + COALESCE(a.eligible_7d, 0)), 4) AS post_mean,
  round(100.0 * a.solve_10m / NULLIF(a.eligible_7d, 0), 1)          AS solve_10m_pct,
  round(100.0 * a.second_7d / NULLIF(a.eligible_7d, 0), 1)         AS second_7d_pct,
  COALESCE(a.quota_eligible_7d, 0)                                  AS quota_eligible_7d,
  round(100.0 * a.quota_wall_7d / NULLIF(a.quota_eligible_7d, 0), 1) AS quota_wall_7d_pct,
  round(100.0 * a.plan_click_7d / NULLIF(a.eligible_7d, 0), 1)     AS plan_click_7d_pct,
  COALESCE(a.eligible_30d, 0)   AS eligible_30d,
  COALESCE(a.trials_30d, 0)     AS trials_30d,
  COALESCE(a.paid_30d, 0)       AS paid_30d
FROM registry r LEFT JOIN arm_rows a ON a.arm = r.arm AND a.arm_v = r.arm_v
ORDER BY r.is_control DESC, r.arm, r.arm_v;

-- ===== Query 2: the splits (segment, device band, fqArm 2×2, stratum) =====
-- Reported beside the pooled decision, never deciding on their own. The
-- escalation rule (plan §5.4): an arm that wins the pool but trails control
-- by ≥ 10 points inside interview_target at ≥ 60 per arm waits for the
-- founder.
WITH params AS (
  SELECT now() AS t, timestamptz '2026-12-12 00:00+00' AS since
),
registry (arm, arm_v, start_date, is_control, is_active) AS (VALUES
  -- tournament-registry:begin (mirrors src/data/tournament-arms.js; test-bound)
  ('A_control', 1, timestamptz '2026-12-12 00:00+00', true, true),
  ('B_single_path', 1, timestamptz '2026-12-12 00:00+00', false, true),
  ('D_interview_sprint', 1, timestamptz '2026-12-12 00:00+00', false, true)
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
split_rows AS (
  SELECT 'segment' AS split, segment AS value, arm, arm_v, elig7, elig30, solves_7d, solve_10m, plan_click_7d, trial_30d, paid_30d FROM per
  UNION ALL
  SELECT 'device', device, arm, arm_v, elig7, elig30, solves_7d, solve_10m, plan_click_7d, trial_30d, paid_30d FROM per
  UNION ALL
  SELECT 'fq_arm', fq_arm, arm, arm_v, elig7, elig30, solves_7d, solve_10m, plan_click_7d, trial_30d, paid_30d FROM per
  UNION ALL
  SELECT 'stratum', stratum, arm, arm_v, elig7, elig30, solves_7d, solve_10m, plan_click_7d, trial_30d, paid_30d FROM per
)
SELECT split, value, arm, arm_v,
  count(*) FILTER (WHERE elig7)                                    AS eligible_7d,
  count(*) FILTER (WHERE elig7 AND solves_7d >= 6)                 AS six_7d,
  round(100.0 * count(*) FILTER (WHERE elig7 AND solves_7d >= 6)
        / NULLIF(count(*) FILTER (WHERE elig7), 0), 1)             AS six_7d_pct,
  round(100.0 * count(*) FILTER (WHERE elig7 AND solve_10m)
        / NULLIF(count(*) FILTER (WHERE elig7), 0), 1)             AS solve_10m_pct,
  count(*) FILTER (WHERE elig7 AND plan_click_7d)                  AS plan_click_7d,
  count(*) FILTER (WHERE elig30)                                   AS eligible_30d,
  count(*) FILTER (WHERE elig30 AND trial_30d)                     AS trials_30d,
  count(*) FILTER (WHERE elig30 AND paid_30d)                      AS paid_30d
FROM split_rows
GROUP BY split, value, arm, arm_v
ORDER BY split, value, arm, arm_v;

-- ===== Query 3: assignment health =========================================
-- Is the split working? Per arm since `since`: everyone assigned (raw) and
-- the humans, the humans' share against 1 / active arms (plan §2.4: within
-- ± 5 points on day 2), people with more than one tournament_assigned row
-- (should be 0 — the event fires once per browser), people whose later rows
-- stamp a different tArm than their assignment (an account adopted on a
-- second device; cross-check only), and rows naming an arm or version the
-- registry does not know (should be 0).
WITH params AS (
  SELECT now() AS t, timestamptz '2026-12-12 00:00+00' AS since
),
registry (arm, arm_v, start_date, is_control, is_active) AS (VALUES
  -- tournament-registry:begin (mirrors src/data/tournament-arms.js; test-bound)
  ('A_control', 1, timestamptz '2026-12-12 00:00+00', true, true),
  ('B_single_path', 1, timestamptz '2026-12-12 00:00+00', false, true),
  ('D_interview_sprint', 1, timestamptz '2026-12-12 00:00+00', false, true)
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
a_rows AS (   -- every tournament_assigned row since `since`, raw
  SELECT e.pid, e.created_at, e.m->>'arm' AS arm,
         CASE WHEN e.m->>'armVersion' ~ '^[0-9]+$' THEN (e.m->>'armVersion')::int END AS arm_v,
         p.excl IS NULL AS human
  FROM evp e JOIN person p ON p.pid = e.pid
  WHERE e.event = 'tournament_assigned' AND e.created_at >= (SELECT since FROM params)
),
first_a AS (
  SELECT DISTINCT ON (pid) pid, created_at AS t0, arm, arm_v, human FROM a_rows ORDER BY pid, created_at
),
dups AS (SELECT pid FROM a_rows GROUP BY pid HAVING count(*) > 1),
mismatch AS (  -- a later row stamped with a different tArm than the assignment
  SELECT DISTINCT f.pid FROM first_a f
  JOIN evp e ON e.pid = f.pid AND e.created_at >= f.t0
  WHERE e.m->>'tArm' IS NOT NULL AND e.m->>'tArm' <> f.arm
),
n_active AS (SELECT count(*) AS n FROM registry WHERE is_active)
SELECT COALESCE(r.arm, f.arm || ' (unregistered)') AS arm, f.arm_v,
  count(*)                                                       AS assigned_raw,
  count(*) FILTER (WHERE f.human)                                AS assigned_human,
  round(100.0 * count(*) FILTER (WHERE f.human)
        / NULLIF(sum(count(*) FILTER (WHERE f.human)) OVER (), 0), 1) AS human_share_pct,
  round(100.0 / (SELECT n FROM n_active), 1)                     AS expected_share_pct,
  count(*) FILTER (WHERE f.pid IN (SELECT pid FROM dups))        AS people_with_dup_rows,
  count(*) FILTER (WHERE f.pid IN (SELECT pid FROM mismatch))    AS people_tarm_mismatch
FROM first_a f
LEFT JOIN registry r ON r.arm = f.arm AND r.arm_v = f.arm_v
GROUP BY COALESCE(r.arm, f.arm || ' (unregistered)'), f.arm_v
ORDER BY 1, 2;

-- ===== Query 4: the decision table per stratum ===========================
-- One row per stratum × active arm (and its version), at the stratum's
-- CURRENT weights version (a routing change restarts the counts). alpha /
-- beta feed `node scripts/tournament-posteriors.mjs --strata '<rows>'`,
-- which prints P(best in stratum), the routing verdict and the
-- post-stratified pool. `expected_share_pct` is the mean weight the
-- stratum's assignment rows logged for the arm; `share_pct` what it got.
WITH params AS (
  SELECT now() AS t, timestamptz '2026-12-12 00:00+00' AS since
),
registry (arm, arm_v, start_date, is_control, is_active) AS (VALUES
  -- tournament-registry:begin (mirrors src/data/tournament-arms.js; test-bound)
  ('A_control', 1, timestamptz '2026-12-12 00:00+00', true, true),
  ('B_single_path', 1, timestamptz '2026-12-12 00:00+00', false, true),
  ('D_interview_sprint', 1, timestamptz '2026-12-12 00:00+00', false, true)
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
strata (stratum) AS (VALUES
  -- tournament-strata:begin (mirrors TOURNAMENT_STRATA; test-bound)
  ('IT-D'), ('IT-M'), ('NI-D'), ('NI-M')
  -- tournament-strata:end
),
cur AS (      -- each stratum's current weights version
  SELECT stratum, max(weights_v) AS weights_v FROM per GROUP BY stratum
),
grid AS (
  SELECT s.stratum, COALESCE(c.weights_v, 0) AS weights_v, r.arm, r.arm_v, r.is_control
  FROM strata s CROSS JOIN registry r LEFT JOIN cur c ON c.stratum = s.stratum
  WHERE r.is_active
),
cell AS (
  SELECT p.stratum, p.weights_v, p.arm, p.arm_v,
    count(*)                                                    AS assigned,
    avg(CASE WHEN p.weights->>p.arm ~ '^[0-9.]+$' THEN (p.weights->>p.arm)::numeric END) AS expected_share,
    count(*) FILTER (WHERE elig7)                               AS eligible_7d,
    count(*) FILTER (WHERE elig7 AND solves_7d >= 6)            AS six_7d,
    count(*) FILTER (WHERE elig7 AND solve_10m)                 AS solve_10m,
    count(*) FILTER (WHERE elig7 AND plan_click_7d)             AS plan_click_7d,
    count(*) FILTER (WHERE elig30)                              AS eligible_30d,
    count(*) FILTER (WHERE elig30 AND trial_30d)                AS trials_30d,
    count(*) FILTER (WHERE elig30 AND paid_30d)                 AS paid_30d
  FROM per p GROUP BY p.stratum, p.weights_v, p.arm, p.arm_v
)
SELECT g.stratum, g.weights_v, g.arm, g.arm_v, g.is_control,
  COALESCE(c.assigned, 0)                                           AS assigned,
  round(100.0 * COALESCE(c.assigned, 0)
        / NULLIF(sum(COALESCE(c.assigned, 0)) OVER (PARTITION BY g.stratum), 0), 1) AS share_pct,
  round(100 * c.expected_share, 1)                                  AS expected_share_pct,
  COALESCE(c.eligible_7d, 0)                                        AS eligible_7d,
  COALESCE(c.six_7d, 0)                                             AS six_7d,
  round(100.0 * c.six_7d / NULLIF(c.eligible_7d, 0), 1)             AS six_7d_pct,
  1 + COALESCE(c.six_7d, 0)                                         AS alpha,
  1 + COALESCE(c.eligible_7d, 0) - COALESCE(c.six_7d, 0)            AS beta,
  round(100.0 * c.solve_10m / NULLIF(c.eligible_7d, 0), 1)          AS solve_10m_pct,
  COALESCE(c.plan_click_7d, 0)                                      AS plan_click_7d,
  COALESCE(c.eligible_30d, 0)                                       AS eligible_30d,
  COALESCE(c.trials_30d, 0)                                         AS trials_30d,
  COALESCE(c.paid_30d, 0)                                           AS paid_30d
FROM grid g
LEFT JOIN cell c ON c.stratum = g.stratum AND c.weights_v = g.weights_v AND c.arm = g.arm AND c.arm_v = g.arm_v
ORDER BY g.stratum, g.is_control DESC, g.arm, g.arm_v;
