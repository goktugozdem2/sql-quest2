-- SQL Quest — weekly activation funnel report
--
-- Run in the Supabase SQL editor (or via MCP) every Wednesday.
-- Source table: pro_events, reason = 'activation_funnel'.
-- metadata is double-encoded JSON: unwrap with ((metadata #>> '{}')::jsonb).
--
-- Goals (set 2026-07-11, review weekly):
--   1. Activation: 50% of app openers start a challenge; 45% of starters solve.
--   2. Retention:  D1 return 15% -> 25%.
--   3. Revenue:    >= 1 real purchase/week.
--
-- Known noise: arrivalSrc = 'verify-test' rows are instrumentation tests.
--
-- Regime changes (compare weeks across these lines carefully):
--   2026-07-11: arrivalSrc tagging + app_opened + signup_completed ship;
--               company-aware Hard wall ships (reason='company_hard');
--               7-day auto-trial REMOVED — new signups start Free, so
--               pro_modal_shown volume jumps by design from this date.

-- ── 1. Weekly funnel, last 8 weeks ──────────────────────────────────
-- app_opened ships 2026-07-11; earlier weeks show 0 opened (expected).
SELECT
  date_trunc('week', created_at)::date                                  AS week,
  count(*) FILTER (WHERE event = 'app_opened')                          AS opened,
  count(*) FILTER (WHERE event = 'first_challenge_started')             AS first_starts,
  count(*) FILTER (WHERE event = 'first_challenge_solved')              AS first_solves,
  round(100.0 * count(*) FILTER (WHERE event = 'first_challenge_solved')
      / nullif(count(*) FILTER (WHERE event = 'first_challenge_started'), 0), 1)
                                                                        AS solve_rate_pct,
  count(*) FILTER (WHERE event = 'returned_next_day')                   AS d1_returns,
  count(*) FILTER (WHERE event = 'lesson1_completed')                   AS lesson1_done,
  count(*) FILTER (WHERE event = 'signup_completed')                    AS signups,
  count(*) FILTER (WHERE event = 'pro_modal_shown')                     AS pro_modals,
  count(*) FILTER (WHERE event = 'pro_purchase_completed')              AS purchases
FROM pro_events
WHERE reason = 'activation_funnel'
  AND created_at >= now() - interval '8 weeks'
  AND coalesce(((metadata #>> '{}')::jsonb)->>'arrivalSrc', '') <> 'verify-test'
GROUP BY 1
ORDER BY 1;

-- ── 2. Which landing page produces users, not just visitors ─────────
-- (last 14 days, by first-touch arrival source; null = pre-tagging or direct)
SELECT
  coalesce(((metadata #>> '{}')::jsonb)->>'arrivalSrc', '(untagged)')   AS door,
  count(*) FILTER (WHERE event = 'app_opened')                          AS opened,
  count(*) FILTER (WHERE event = 'first_challenge_started')             AS first_starts,
  count(*) FILTER (WHERE event = 'first_challenge_solved')              AS first_solves,
  count(*) FILTER (WHERE event = 'signup_completed')                    AS signups,
  count(*) FILTER (WHERE event = 'pro_purchase_completed')              AS purchases
FROM pro_events
WHERE reason = 'activation_funnel'
  AND created_at >= now() - interval '14 days'
  AND coalesce(((metadata #>> '{}')::jsonb)->>'arrivalSrc', '') <> 'verify-test'
GROUP BY 1
ORDER BY first_starts DESC, opened DESC;

-- ── 3. Satisfaction by door, last 14 days ────────────────────────────
-- The principle: satisfy first, then ask. satisfied = solved >=1;
-- fully_satisfied = beat the whole free company set (the completion ask,
-- reason='company_set_complete', fires at exactly that moment).
SELECT
  coalesce(((metadata #>> '{}')::jsonb)->>'arrivalSrc', '(untagged)')   AS door,
  count(*) FILTER (WHERE event = 'app_opened')                          AS opened,
  count(*) FILTER (WHERE event = 'first_challenge_solved')              AS satisfied,
  count(*) FILTER (WHERE event = 'pro_modal_shown'
               AND ((metadata #>> '{}')::jsonb)->>'reason' = 'company_set_complete')
                                                                        AS fully_satisfied,
  count(*) FILTER (WHERE event = 'pro_modal_shown'
               AND ((metadata #>> '{}')::jsonb)->>'reason' = 'company_hard')
                                                                        AS wall_shown,
  count(*) FILTER (WHERE event = 'pro_checkout_clicked')                AS checkout_clicks,
  count(*) FILTER (WHERE event = 'pro_purchase_completed')              AS purchases
FROM pro_events
WHERE reason = 'activation_funnel'
  AND created_at >= now() - interval '14 days'
  AND coalesce(((metadata #>> '{}')::jsonb)->>'arrivalSrc', '') <> 'verify-test'
GROUP BY 1
ORDER BY opened DESC, satisfied DESC;

-- ── 4. Purchase funnel, last 14 days ─────────────────────────────────
SELECT
  count(*) FILTER (WHERE event = 'pro_modal_shown')                     AS modal_shown,
  count(*) FILTER (WHERE event = 'pro_checkout_clicked')                AS checkout_clicked,
  count(*) FILTER (WHERE event = 'pro_purchase_completed'
               AND reason = 'stripe_webhook')                           AS paid
FROM pro_events
WHERE created_at >= now() - interval '14 days';

-- ── 5. Email lifecycle effectiveness, last 14 days ───────────────────
-- Per template: send → delivered/opened/clicked (Resend webhook rows,
-- joined by resend_id) → returned (any activation event within 48h of the
-- send) → checkout. "Returned" is the metric that matters — open rate is
-- vanity; a user back in the app is real.
-- Regime note (2026-07-16): email_events created; streak-reminder /
-- skill-decay crons repaired (scheme-less URLs had failed daily since
-- creation); weekly-digest + checkout-abandon first scheduled.
WITH sends AS (
  SELECT username, template, created_at, resend_id
  FROM email_events
  WHERE event = 'sent' AND created_at >= now() - interval '14 days'
),
webhook AS (
  SELECT resend_id, event FROM email_events
  WHERE event IN ('delivered','opened','clicked')
    AND created_at >= now() - interval '14 days'
),
returns AS (
  SELECT DISTINCT s.username, s.template
  FROM sends s
  JOIN pro_events p
    ON p.username = s.username
   AND p.reason = 'activation_funnel'
   AND p.created_at BETWEEN s.created_at AND s.created_at + interval '48 hours'
),
checkouts AS (
  SELECT DISTINCT s.username, s.template
  FROM sends s
  JOIN pro_events p
    ON p.username = s.username
   AND p.event = 'pro_checkout_clicked'
   AND p.created_at BETWEEN s.created_at AND s.created_at + interval '48 hours'
)
SELECT
  s.template,
  count(*)                                                        AS sent,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM webhook w WHERE w.resend_id = s.resend_id AND w.event = 'delivered')) AS delivered,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM webhook w WHERE w.resend_id = s.resend_id AND w.event = 'opened'))    AS opened,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM webhook w WHERE w.resend_id = s.resend_id AND w.event = 'clicked'))   AS clicked,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM returns r WHERE r.username = s.username AND r.template = s.template)) AS returned_48h,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM checkouts c WHERE c.username = s.username AND c.template = s.template)) AS checkout_48h
FROM sends s
GROUP BY 1
ORDER BY sent DESC;

-- ── 6. Email health: bounces/complaints + opt-outs (watch deliverability) ──
SELECT
  count(*) FILTER (WHERE event = 'bounced')    AS bounced_14d,
  count(*) FILTER (WHERE event = 'complained') AS complained_14d,
  (SELECT count(*) FROM users WHERE (data->>'emailOptOut') = 'true') AS opted_out_total
FROM email_events
WHERE created_at >= now() - interval '14 days';

-- ── 7. Active users + cohort retention ───────────────────────────────
-- CAUTION: users.created_at is NOT signup date — it gets bumped on save/
-- upsert (a 6000-XP user active since Jul 2 showed "created" Jul 16).
-- Cohorts here are FIRST-SEEN in pro_events, which is tamper-proof.
-- Tracking began 2026-06-30; MAU is meaningful from ~mid-August.
-- Baseline (read 2026-07-16, pre-email-machine): Jun30 cohort W1 = 58%,
-- D1 return 14d avg = 43%. The lifecycle emails (streak_save, welcome_back,
-- weekly_digest) target the W1→W2 drop — compare cohorts born after
-- 2026-07-16 against this baseline.

-- 7a. DAU, last 14 days: named users vs guest browsers (guests rotate
-- usernames per pageload — they are sessions, not people).
WITH ev AS (
  SELECT username, created_at::date AS d
  FROM pro_events
  WHERE reason = 'activation_funnel'
    AND username IS NOT NULL
    AND username NOT ILIKE 'fabletest%'
    AND username NOT IN ('test2','test3','test11','test12','sqlquest')
    AND created_at > now() - interval '14 days'
)
SELECT d,
  count(DISTINCT username) FILTER (WHERE username NOT LIKE 'guest%') AS named_dau,
  count(DISTINCT username) FILTER (WHERE username LIKE 'guest%')     AS guest_browsers
FROM ev GROUP BY d ORDER BY d;

-- 7b. WAU trend (named only).
WITH ev AS (
  SELECT DISTINCT username, date_trunc('week', created_at)::date AS wk
  FROM pro_events
  WHERE reason = 'activation_funnel'
    AND username IS NOT NULL AND username NOT LIKE 'guest%'
    AND username NOT ILIKE 'fabletest%'
    AND username NOT IN ('test2','test3','test11','test12','sqlquest')
)
SELECT wk, count(DISTINCT username) AS named_wau FROM ev GROUP BY wk ORDER BY wk;

-- 7c. Cohort retention matrix: first-seen week × weeks-since-first-seen.
-- Current week's cells are PARTIAL — annotate when reading.
WITH first_seen AS (
  SELECT username, date_trunc('week', min(created_at))::date AS cohort_wk
  FROM pro_events
  WHERE reason = 'activation_funnel'
    AND username IS NOT NULL AND username NOT LIKE 'guest%'
    AND username NOT ILIKE 'fabletest%'
    AND username NOT IN ('test2','test3','test11','test12','sqlquest')
  GROUP BY username
),
activity AS (
  SELECT DISTINCT username, date_trunc('week', created_at)::date AS act_wk
  FROM pro_events
  WHERE reason = 'activation_funnel' AND username IS NOT NULL
),
joined AS (
  SELECT f.cohort_wk, f.username, ((a.act_wk - f.cohort_wk) / 7)::int AS week_n
  FROM first_seen f
  JOIN activity a ON a.username = f.username
)
SELECT cohort_wk,
  count(DISTINCT username)                          AS cohort_size,
  count(DISTINCT username) FILTER (WHERE week_n = 1) AS w1,
  count(DISTINCT username) FILTER (WHERE week_n = 2) AS w2,
  count(DISTINCT username) FILTER (WHERE week_n = 3) AS w3,
  count(DISTINCT username) FILTER (WHERE week_n = 4) AS w4
FROM joined
GROUP BY cohort_wk ORDER BY cohort_wk;

-- 7d. D1 return by first-seen day, last 14 days (today's row is unknowable).
WITH first_seen AS (
  SELECT username, min(created_at) AS first_at
  FROM pro_events
  WHERE reason = 'activation_funnel'
    AND username IS NOT NULL AND username NOT LIKE 'guest%'
    AND username NOT ILIKE 'fabletest%'
    AND username NOT IN ('test2','test3','test11','test12','sqlquest')
  GROUP BY username
)
SELECT f.first_at::date AS day,
  count(*) AS new_users,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM pro_events p
    WHERE p.username = f.username
      AND p.created_at::date = f.first_at::date + 1)) AS returned_next_day
FROM first_seen f
WHERE f.first_at > now() - interval '14 days'
GROUP BY 1 ORDER BY 1;

-- ── 8. Intent segmentation (post-first-solve ask, live 2026-07-16) ───
-- Every activation event since 2026-07-16 carries the declared intent
-- (interview / job_ready / learning / exploring; null = asked before the
-- feature or never answered). The Pro modal shows interview-forward copy
-- to interview/null intent and growth-forward copy to learning/job_ready —
-- same price, same features, only relevance changes. This section answers:
-- (a) what do people SAY they came for, (b) does either copy variant
-- actually move checkout.

-- 8a. Declared intent distribution.
SELECT
  ((metadata #>> '{}')::jsonb)->>'intent' AS intent,
  count(DISTINCT username)                AS users
FROM pro_events
WHERE event = 'intent_captured'
GROUP BY 1 ORDER BY 2 DESC;

-- 8b. Funnel by declared intent (events since the feature shipped).
-- checkout_users / modal_users is the number to watch per segment.
SELECT
  coalesce(((metadata #>> '{}')::jsonb)->>'intent', '(none/pre-feature)') AS intent,
  count(DISTINCT username)                                               AS active_users,
  count(DISTINCT username) FILTER (WHERE event = 'challenge_solved')     AS solvers,
  count(DISTINCT username) FILTER (WHERE event = 'pro_modal_shown')      AS modal_users,
  count(DISTINCT username) FILTER (WHERE event = 'pro_checkout_clicked') AS checkout_users,
  count(DISTINCT username) FILTER (WHERE event = 'pro_purchase_completed') AS purchasers
FROM pro_events
WHERE reason = 'activation_funnel'
  AND created_at >= '2026-07-16'
  AND username NOT ILIKE 'fabletest%'
GROUP BY 1 ORDER BY active_users DESC;

-- ── 9. Content quality — worst challenges of the week ─────────────────
-- The Wednesday content read. Three signals per challenge: attempt-success
-- (from users.data.challengeAttempts — the honest per-attempt log), tutor
-- demand, and open→solve abandonment (challenge_opened shipped 2026-07-17).
-- Calibration bands: Easy 75-85% attempt-success · Medium 50-65% · Hard
-- 35-50%. An Easy below 40% is a correctness/spec bug until proven
-- otherwise (Jul-2026 audit: #209 sat at 4% — the spec described a data
-- placeholder that no longer existed; #221's solution used a tiebreak the
-- description never mentioned). Mechanical gate: scripts/lint-content.mjs
-- (ratchet baseline; new nondeterministic ORDER BYs fail the lint).

-- 9a. Worst 10 by attempt-success (min 8 attempts), with tutor demand.
WITH att AS (
  SELECT (a->>'challengeId')::int AS cid,
    max(a->>'difficulty')          AS difficulty,
    count(*)                       AS attempts,
    count(DISTINCT u.username)     AS users,
    count(*) FILTER (WHERE (a->>'success')::boolean) AS successes,
    count(*) FILTER (WHERE coalesce((a->>'hintsUsed')::int,0) > 0) AS hinted
  FROM users u, jsonb_array_elements(coalesce(u.data->'challengeAttempts','[]'::jsonb)) a
  WHERE u.username NOT ILIKE 'fabletest%'
  GROUP BY 1
),
tut AS (
  SELECT challenge_id::int AS cid, count(*) AS help_requests
  FROM tutor_events WHERE challenge_id ~ '^[0-9]+$'
  GROUP BY 1
)
SELECT a.cid, a.difficulty, a.attempts, a.users,
  round(100.0 * a.successes / a.attempts, 0) AS success_pct,
  round(100.0 * a.hinted / a.attempts, 0)    AS hint_pct,
  coalesce(t.help_requests, 0)               AS tutor_asks
FROM att a LEFT JOIN tut t USING (cid)
WHERE a.attempts >= 8
ORDER BY (100.0 * a.successes / a.attempts) ASC, tutor_asks DESC
LIMIT 10;

-- 9b. Difficulty calibration (are the labels honest?).
WITH att AS (
  SELECT (a->>'difficulty') AS difficulty,
    (a->>'success')::boolean AS success
  FROM users u, jsonb_array_elements(coalesce(u.data->'challengeAttempts','[]'::jsonb)) a
  WHERE u.username NOT ILIKE 'fabletest%'
)
SELECT difficulty, count(*) AS attempts,
  round(100.0 * count(*) FILTER (WHERE success) / count(*), 0) AS attempt_success_pct
FROM att WHERE difficulty IN ('Easy','Medium','Hard')
GROUP BY 1 ORDER BY 1;

-- 9c. Open → solve abandonment per challenge (needs challenge_opened,
-- live since 2026-07-17; read after ~2 weeks of accumulation).
WITH opens AS (
  SELECT ((metadata #>> '{}')::jsonb->>'challengeId')::int AS cid,
    count(DISTINCT username) AS openers
  FROM pro_events WHERE event = 'challenge_opened'
  GROUP BY 1
),
solves AS (
  SELECT ((metadata #>> '{}')::jsonb->>'challengeId')::int AS cid,
    count(DISTINCT username) AS solvers
  FROM pro_events WHERE event = 'challenge_solved'
    AND created_at >= '2026-07-17'
  GROUP BY 1
)
SELECT o.cid, o.openers, coalesce(s.solvers, 0) AS solvers,
  round(100.0 * coalesce(s.solvers, 0) / o.openers, 0) AS solve_rate_pct
FROM opens o LEFT JOIN solves s USING (cid)
WHERE o.openers >= 5
ORDER BY solve_rate_pct ASC
LIMIT 10;

-- ── 10. N1 experiment: teaching emails vs nudge emails ───────────────
-- Hypothesis: a weak-skill email that TEACHES (micro-lesson + tap-to-
-- answer quiz) out-returns the bare "your skill is rusty" nudge.
-- Control cohort: template='skill_decay' (70 sends, 1 returned_48h =
-- 1.4% baseline, recorded pre-2026-07-20). Experiment cohort:
-- template='skill_decay_lesson'. Quiz answer taps deep-link into the
-- app (?quiz=<slug>&pick=X) and fire quiz_answered — click measurement
-- that needs no Resend webhook.

-- 10a. Sends + 48h return, control vs experiment.
WITH sends AS (
  SELECT username, template, created_at AS sent_at
  FROM email_events
  WHERE event = 'sent' AND template IN ('skill_decay', 'skill_decay_lesson')
)
SELECT template, count(*) AS sends,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM pro_events p
    WHERE p.username = sends.username
      AND p.created_at > sends.sent_at
      AND p.created_at < sends.sent_at + interval '48 hours')) AS returned_48h
FROM sends GROUP BY 1;

-- 10b. Quiz engagement: taps, correctness, and did the tap turn into
-- practice within 24h (the anti-cannibalization check — teaching in the
-- inbox must CREATE app practice, not replace it).
WITH taps AS (
  SELECT username, created_at,
    ((metadata #>> '{}')::jsonb)->>'skill'   AS skill,
    (((metadata #>> '{}')::jsonb)->>'correct')::boolean AS correct
  FROM pro_events WHERE event = 'quiz_answered'
)
SELECT skill, count(*) AS taps,
  count(*) FILTER (WHERE correct) AS correct_taps,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM pro_events p
    WHERE p.username = taps.username AND p.event = 'challenge_solved'
      AND p.created_at > taps.created_at
      AND p.created_at < taps.created_at + interval '24 hours')) AS practiced_24h
FROM taps GROUP BY 1 ORDER BY taps DESC;

-- ── 11. Activation arm: first-session warm-up (shipped 2026-07-20) ────
-- H10 established first-session 3+ solves as the buyer signal; cohort
-- 5+-solve activation had fallen 58%→44% as door traffic diluted. The
-- warm-up card makes the 3-solve threshold a visible, celebrated goal.
-- Read: does cohort activation lift for cohorts born AFTER 2026-07-20?
-- Baseline to beat — 13 Jul cohort: 44% reached 5+ solves.

-- 11a. Cohort 5+-solve activation rate over time (the metric the warm-up
-- targets). Compare post-2026-07-20 cohorts against the pre-ship trend.
WITH fs AS (
  SELECT username, date_trunc('week', min(created_at))::date AS cohort_wk
  FROM pro_events WHERE reason='activation_funnel' AND username IS NOT NULL
    AND username NOT LIKE 'guest%' AND username NOT ILIKE 'fabletest%'
    AND username NOT IN ('test2','test3','test11','test12','sqlquest')
  GROUP BY username
),
depth AS (
  SELECT username, count(*) FILTER (WHERE event='challenge_solved') AS solves
  FROM pro_events WHERE reason='activation_funnel' AND username IS NOT NULL GROUP BY username
)
SELECT f.cohort_wk, count(*) AS size,
  round(avg(d.solves),1) AS avg_solves,
  round(100.0*count(*) FILTER (WHERE d.solves>=3)/count(*),0) AS pct_3plus,
  round(100.0*count(*) FILTER (WHERE d.solves>=5)/count(*),0) AS pct_5plus
FROM fs f LEFT JOIN depth d USING (username)
GROUP BY 1 ORDER BY 1;

-- 11b. Warm-up completion rate among first-seen users per week (did they
-- hit the 3-solve session goal at all). session_warmup_complete fires
-- once per session on the 3rd distinct solve.
WITH fs AS (
  SELECT username, min(created_at)::date AS first_day
  FROM pro_events WHERE reason='activation_funnel' AND username IS NOT NULL
    AND username NOT LIKE 'guest%' AND username NOT ILIKE 'fabletest%'
  GROUP BY username
),
warm AS (
  SELECT DISTINCT username FROM pro_events WHERE event='session_warmup_complete'
)
SELECT date_trunc('week', first_day)::date AS cohort_wk,
  count(*) AS new_users,
  count(*) FILTER (WHERE username IN (SELECT username FROM warm)) AS hit_warmup,
  round(100.0*count(*) FILTER (WHERE username IN (SELECT username FROM warm))/count(*),0) AS pct_warmup
FROM fs GROUP BY 1 ORDER BY 1;


-- ═══════════════════════════════════════════════════════════════════
-- 12. PURCHASE PROXIMITY — who is actually close to buying
-- ═══════════════════════════════════════════════════════════════════
-- Written 2026-07-23 answering "how do we spot customers close to a sale".
--
-- Do NOT try to fit a propensity model on this. There have been two
-- purchases. n=2 supports no coefficients, and pretending otherwise
-- produces a confident-looking score built on one person's habits.
--
-- What the data does support is an ORDINAL ladder — each rung is a
-- stated intention, not an inference — and the top rungs are small
-- enough to read by name:
--
--   1  clicked checkout, no purchase   <- they tried to pay
--   2  clicked a plan, never reached checkout
--   3  saw the modal, never clicked
--   4  never shown the offer at all
--
-- Read 2026-07-23 (5+ solves, excluding anyone already on Pro):
--   tier 1:  2 users  avg 1455 XP / 19 solves   1 active this week
--   tier 2:  3 users  avg 4999 XP / 58 solves   0 active  <- most engaged, all cold
--   tier 3: 19 users  avg 1459 XP / 22 solves  11 active  <- the live pool
--   tier 4: 16 users  avg  966 XP / 13 solves   8 active
--
-- Exclude proStatus='true' or tier 4 fills with people who don't see the
-- modal because they already have Pro. That mistake made this read look
-- like a paywall bug on first pass; it isn't one.
--
-- The finding is the shape. The two hottest rungs hold five people, and
-- tier 3 — asked once, didn't click, still showing up — holds eleven live
-- ones. The constraint is not ranking. It is asking more than once, and
-- not breaking when they say yes.

-- Pro-ness must be evaluated the way the APP evaluates it. `proStatus` alone
-- is stale: 53 rows still carry proStatus=true on trials that expired as far
-- back as 2026-05-04, because expiry is enforced client-side on load and the
-- row is never rewritten. Filtering on the flag alone silently drops 23
-- engaged FREE users out of the funnel — 4 of them active this fortnight —
-- which is the opposite of what these queries are for.
-- Mirrors _proLive in app.jsx: flag AND (lifetime OR expiry in the future).
CREATE OR REPLACE FUNCTION is_pro_live(d jsonb) RETURNS boolean AS $$
  SELECT coalesce(d->>'proStatus','false') = 'true'
     AND (d->>'proType' = 'lifetime'
          OR ((d->>'proExpiry') IS NOT NULL
              AND (d->>'proExpiry')::timestamptz > now()));
$$ LANGUAGE sql IMMUTABLE;

-- 12a. The ladder, with names. This is the call list.
WITH ev AS (
  SELECT username,
    max(CASE WHEN event='pro_checkout_clicked' THEN 1 ELSE 0 END) AS hit_checkout,
    max(CASE WHEN event LIKE 'click_%'         THEN 1 ELSE 0 END) AS clicked_plan,
    max(CASE WHEN event='pro_modal_shown'      THEN 1 ELSE 0 END) AS saw_modal,
    max(CASE WHEN event='pro_purchase_completed' THEN 1 ELSE 0 END) AS bought,
    count(*) FILTER (WHERE event='pro_checkout_clicked') AS checkout_clicks,
    count(*) FILTER (WHERE event='pro_modal_shown')      AS times_asked,
    max(CASE WHEN event='intent_captured'
             THEN ((metadata #>> '{}')::jsonb)->>'intent' END)     AS intent
  FROM pro_events GROUP BY 1
)
SELECT
  CASE WHEN ev.hit_checkout=1 THEN 1 WHEN ev.clicked_plan=1 THEN 2
       WHEN ev.saw_modal=1    THEN 3 ELSE 4 END AS tier,
  ev.username,
  (u.data->>'xp')::int AS xp,
  jsonb_array_length(coalesce(u.data->'solvedChallenges','[]'::jsonb)) AS solves,
  coalesce(u.data->>'streak','0') AS streak,
  ev.times_asked,
  ev.checkout_clicks,
  ev.intent,
  (coalesce(u.data->>'email', u.email) IS NOT NULL) AS reachable,
  (current_date - u.updated_at::date) AS days_idle
FROM ev JOIN users u ON u.username = ev.username
WHERE coalesce(ev.bought,0)=0
  AND NOT is_pro_live(u.data)
  AND jsonb_array_length(coalesce(u.data->'solvedChallenges','[]'::jsonb)) >= 10
ORDER BY tier, solves DESC;

-- 12b. Checkout-click bursts — the bug signature, not a price objection.
-- Serge clicked ONE plan and paid 3 minutes later. hrishi998 clicked three
-- plans in 37 seconds and vanished; yisus clicked three in 33 seconds and
-- dismissed the modal. Rapid plan-cycling is what someone does when the
-- button appears not to work. Watch this stay empty after the H11 checkout
-- rework (2026-07-17) — if a row appears, the flow is broken again.
SELECT username,
       count(*) AS clicks,
       count(DISTINCT ((metadata #>> '{}')::jsonb)->>'plan') AS distinct_plans,
       round(extract(epoch FROM max(created_at)-min(created_at)))::int AS span_seconds,
       min(created_at) AS first_click
FROM pro_events
WHERE event='pro_checkout_clicked'
GROUP BY 1
HAVING count(*) > 1
   AND extract(epoch FROM max(created_at)-min(created_at)) < 300
ORDER BY first_click DESC;

-- 12c. Engaged and never asked. The biggest pool, and the cheapest fix.
-- A user with 30+ solves who has never seen the offer is not a hard sell;
-- they are an unasked one.
WITH asked AS (
  SELECT DISTINCT username FROM pro_events WHERE event='pro_modal_shown'
)
SELECT u.username,
       (u.data->>'xp')::int AS xp,
       jsonb_array_length(coalesce(u.data->'solvedChallenges','[]'::jsonb)) AS solves,
       coalesce(u.data->>'streak','0') AS streak,
       (current_date - u.updated_at::date) AS days_idle
FROM users u
WHERE u.username NOT IN (SELECT username FROM asked)
  AND NOT is_pro_live(u.data)
  AND jsonb_array_length(coalesce(u.data->'solvedChallenges','[]'::jsonb)) >= 15
ORDER BY solves DESC
LIMIT 30;

-- 12d. Why checkout clicks don't become purchases (needs pro_checkout_returned,
-- shipped 2026-07-23). This is the query 12b was a proxy for. Before this
-- event existed the funnel went dark between the click and the Stripe
-- webhook, so a broken redirect and a considered "no" produced identical
-- data — which is how two of our most engaged users were filed as
-- price-sensitive when they were probably staring at a dead button.
--
--   never_navigated  the browser never left the page — the redirect failed
--   instant_bounce   left and came back in under 5s — Stripe didn't load
--   left_checkout    saw the checkout page and chose not to pay
--
-- Only left_checkout is a pricing signal. Treat the other two as defects.
SELECT
  ((metadata #>> '{}')::jsonb)->>'outcome' AS outcome,
  ((metadata #>> '{}')::jsonb)->>'plan'    AS plan,
  count(*) AS n,
  count(DISTINCT username) AS users,
  round(avg((((metadata #>> '{}')::jsonb)->>'secondsAway')::numeric)) AS avg_seconds_away
FROM pro_events
WHERE event = 'pro_checkout_returned'
  AND created_at > '2026-07-23'          -- excludes the two verification rows
GROUP BY 1,2
ORDER BY n DESC;

-- ═══════════════════════════════════════════════════════════════════
-- 13. COACH GOAL FUNNEL (events shipped 2026-07-23, day 2 of data ~07-24)
-- ═══════════════════════════════════════════════════════════════════
-- Why: 69% of users with saved coach state had goalId null, and the state
-- alone couldn't say why — the picker converts 77% of those who see it
-- (47 of 61 coachState objects carry a goalId), so the leak is upstream:
-- either the tab is unreached, or it's reached inside the first-run /
-- foundations shells, which never render the picker. These three events
-- (coach_tab_viewed with shell, goal_picker_shown, goal_selected) make the
-- three rungs readable. Each is deduped client-side to once per user-day.

-- 13a. The funnel, in people.
SELECT
  count(DISTINCT username) FILTER (WHERE event='coach_tab_viewed')  AS tab_viewed,
  count(DISTINCT username) FILTER (WHERE event='coach_tab_viewed'
    AND ((metadata #>> '{}')::jsonb)->>'shell' = 'full')            AS saw_full_shell,
  count(DISTINCT username) FILTER (WHERE event='goal_picker_shown') AS picker_shown,
  count(DISTINCT username) FILTER (WHERE event='goal_selected')     AS selected
FROM pro_events
WHERE event IN ('coach_tab_viewed','goal_picker_shown','goal_selected');

-- 13b. Which shell swallows the visitors. If first_run + foundations
-- dominate, the goal picker is structurally unreachable for most users and
-- the fix is sequencing (offer the goal after lesson 1), not picker UX.
SELECT ((metadata #>> '{}')::jsonb)->>'shell' AS shell,
       count(*) AS views,
       count(DISTINCT username) AS users
FROM pro_events WHERE event='coach_tab_viewed'
GROUP BY 1 ORDER BY views DESC;

-- 13c. Which goals get picked once the picker is seen.
SELECT ((metadata #>> '{}')::jsonb)->>'goalId' AS goal,
       count(*) AS n
FROM pro_events WHERE event='goal_selected'
GROUP BY 1 ORDER BY n DESC;
