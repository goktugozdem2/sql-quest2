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

-- ═══════════════════════════════════════════════════════════════════
-- 14. STANDING HYPOTHESES — registry, verdicts, and the rate table
-- ═══════════════════════════════════════════════════════════════════
-- Each entry: claim → metric → decision rule. n is tiny; these are
-- DECISION RULES, not significance tests. Falsifying evidence beats
-- confirming evidence — most are written so one row can kill them.
--
-- ── VERDICTS, read 2026-07-28 ─────────────────────────────────────
-- Nine of eleven could not be read at all. Both that could, failed.
-- That ratio is the finding: the registry was written against traffic
-- we do not have, and against surfaces that produce almost no events.
--
--   CF-1  FALSE.  134 first_run coach views → 33 reached the picker =
--         24.6%, against a ≥60% bar, at 4x the n the rule asked for.
--         Early signal was 5/6. ACTION per its own rule: sequencing
--         fix — offer the goal inside the foundations flow.
--
--   CF-2  NOT CONFIRMED, and the failure is informative. Predicted
--         guests <40% AND registered ≥70%. Guests came in at 2.0%
--         (1/51); registered at 16.7% (2/12). The first half held, the
--         second did not — so the leak is NOT identity loss. The
--         picker converts nobody. Prompting signup at goal-select, the
--         fix this hypothesis was built to justify, would not have
--         moved it.
--
--   CF-3  UNREADABLE. 3 goal_selected events in the product's history.
--   CO-1  UNREADABLE. Zero REAL rows. The only 2 pro_checkout_returned
--         rows are 29 seconds apart, Europe/Istanbul, solvedCount 0 —
--         founder tests. Compounded by both being username='guest'
--         (see §14d; fixed forward by the aid join, 2026-07-28).
--   CO-2  PARKED. 1 row, Istanbul.
--   TG-1  UNREADABLE — and its rule was unreachable by construction.
--         "≥1 click per 25 guest shows by 07-30" needs 50 guest shows
--         to falsify; guest shows run 1.4/day, so the bar was 36 days
--         out on a 7-day deadline. Actual: 28 shows, 0 clicks, 5 days.
--   TG-2  UNREADABLE. tier6=12, tier10+=10 shows against a 30 bar.
--   CP-1  UNREADABLE, structurally. The coach_path modal is gated
--         behind holding an active goal and clearing half its path.
--         Three people have ever selected a goal. This was never a
--         measurement question; it is downstream of CF-1/CF-2.
--   ON-1  TRUE but vacuous, and the root cause is now known. 6 opens
--         of challenges 168-179 in six days, all from ONE person. The
--         on-ramps appear in NO roadmap stage, and the Challenges tab
--         defaults to challengePathFilter='recommended', which narrows
--         the list to the active stage. Only 44 of 185 challenge IDs
--         sit in any stage — the default view hides 76% of the
--         product. Not "new content goes undiscovered": unreachable.
--   WB-1  NOT STARTED. lapsed-pro has never sent; cron deliberately
--         unset. Sending is still a decision.
--   MD-1  HELD until the Aug 3 reads land (touches login behaviour).
--
-- ── WHY MOST OF THESE WERE UNREADABLE ─────────────────────────────
-- Measured event rates, 14 days to 2026-07-28, per day:
--
--     challenge_solved                43.4     n=30 in <1 day
--     coach_tab_viewed (first_run)     9.6     n=30 in  3 days
--     goal_picker_shown                5.1     n=30 in  6 days
--     pro_modal_shown (all)            4.3     n=30 in  7 days
--     pro_modal_shown (guest)          1.4     n=30 in 21 days
--     goal_selected                    0.2     n=30 in 150 days
--     pro_checkout_returned            0.1     n=30 in 300 days
--
-- THE RULE THIS BUYS US, and it is the point of this rewrite:
--
--   1. Write kill criteria in TIME, not in COUNT. A count-based rule
--      on a 1.4/day event silently never fires, and a rule that cannot
--      fire is worse than no rule — it keeps the feature by default
--      while looking like rigour.
--   2. Anchor to the WIDEST event that still answers the question.
--      goal_selected is 0.2/day; goal_picker_shown is 5.1/day and
--      answers "does this screen persuade?" 25x faster.
--   3. Below ~1 event/day, stop pretending. That is a conversation,
--      not an experiment. One support email from Serge on 2026-07-26
--      produced two confirmed bugs; 28 paywall impressions over the
--      same window produced zero bits.
--
-- ── ACTIVE HYPOTHESES (rewritten 2026-07-28) ──────────────────────
--
-- TG-1r (guest paywall earns its keep). REPLACES the unreachable
--   count rule. Metric: days since 2026-07-23 with ≥1 guest
--   pro_modal_shown and zero plan clicks, consecutive. Rule: 14 such
--   days → revert the 6-solve guest tier. Query 14b.
--   STATUS 2026-08-04: 3 consecutive, NOT firing — and the "5 as of
--   07-28, resolves ~08-06" note above it was an artefact of query 14b
--   summing dry days instead of counting a consecutive run. The run has
--   broken twice since: a GUEST clicked the monthly plan on 07-28 and a
--   registered user on 07-29. That is the hypothesis' own success
--   condition landing, so the paywall stays. Query fixed; re-read from
--   the corrected counter, not from this comment.
--
-- CF-1r (the picker screen persuades). Anchored one step wider than
--   CF-2 was. Metric: of users who reach goal_picker_shown, the share
--   producing ANY subsequent coach event the same session. Rule: read
--   at 14 days (n≈70 at 5.1/day); <25% → the picker is the problem,
--   not its placement, and it gets rewritten rather than resequenced.
--
-- ON-1r (reachability, not discovery). ON-1 is closed; this replaces
--   it. Claim: the default path filter, not content quality, governs
--   what gets opened. Metric: OPENS PER CHALLENGE inside the default
--   view vs outside it — a ratio, so it does not drift with traffic.
--   Rule: ratio >3x → the default filter is the binding constraint and
--   a fix ships ahead of any new content.
--   FIRED 2026-08-03: 9.0x (1,478 opens; 24.77 per in-view challenge vs
--   2.75 outside). A signed-out user opening Challenges saw "showing 2
--   of 257". Fix shipped the same day: search now escapes the path
--   filter entirely, and the default 'recommended' state announces
--   itself with a one-click "Show all 257". Re-read at 14 days — the
--   ratio should fall toward parity; if it does not, the constraint was
--   never the filter.
--   Baseline 2026-07-28, 14 days: 822 opens across the 44 in-view
--   challenges (18.7 each) vs 189 across the other 141 (1.34 each) —
--   14.0x. Note the share reading is misleading and was nearly the
--   rule: 18.7% of opens land outside, which sounds survivable until
--   you divide by the 141 challenges sharing it. Query 14c.
--
-- ER-1 (we are teaching the wrong dialect). NEW, enabled by the
--   challenge_errored event shipped 2026-07-28. Claim: dialect
--   mismatches are a material share of failed runs. Metric: errorClass
--   distribution. Rule: dialect_mismatch ≥10% of errors over 14 days →
--   put the engine on the challenge card. ≥25% → it is a content bug
--   worth a pass over every challenge that names a vendor. Query 14d.
--   READ 2026-08-03 (early, 6 of the 14 days): dialect_mismatch = 0.0%.
--   Not "below threshold" — ZERO, across 98 errors and 22 browsers. The
--   real distribution is syntax 54% / no_such_column 26% /
--   no_such_table 10%, and the messages are beginner typos ('rom',
--   'COUT', 'plcass', a missing comma), not other people's dialects.
--   NOTE FOR HONESTY: the "Graded on SQLite" chip shipped 2026-08-02,
--   i.e. the action this rule guards was taken WITHOUT the rule firing.
--   It was justified by Serge's support email, not by ER-1 — which is
--   the registry's own stated policy below 1 event/day, but it means
--   ER-1 never got to decide anything and should not be cited as if it
--   had. Full read still due 08-11.
--   Separate content bug surfaced by the same query: 'no such table:
--   filmler' × 8 — the Turkish dataset's table naming does not match
--   what its own prompts lead people to type.
--
-- AR-1 (the arrival denominator, finally). NEW, enabled by the aid
--   join shipped 2026-07-28. app_opened is the declared funnel
--   denominator and wrote username='guest' on 617 of 617 rows, so
--   "how many arrivals do nothing?" has never been answerable. Metric:
--   share of aids whose only event is app_opened. No rule yet — this
--   reads for two weeks to establish a baseline BEFORE anyone writes a
--   threshold against it. Query 14e.

-- 14a. CF-1/CF-1r: shell flip AND the wider picker-persuasion read.
WITH fr AS (
  SELECT DISTINCT username, (created_at AT TIME ZONE 'UTC')::date AS d FROM pro_events
  WHERE event='coach_tab_viewed'
    AND ((metadata #>> '{}')::jsonb)->>'shell'='first_run'
), pk AS (
  SELECT DISTINCT username, (created_at AT TIME ZONE 'UTC')::date AS d FROM pro_events
  WHERE event='goal_picker_shown'
), sel AS (
  SELECT DISTINCT username FROM pro_events WHERE event='goal_selected'
)
SELECT
  count(*) AS first_run_viewers,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM pk WHERE pk.username=fr.username AND pk.d=fr.d)) AS reached_picker_same_day,
  round(100.0*count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM pk WHERE pk.username=fr.username AND pk.d=fr.d))/nullif(count(*),0),1) AS pct_reached,
  (SELECT count(*) FROM pk) AS picker_shown_total,
  (SELECT count(*) FROM pk WHERE EXISTS (SELECT 1 FROM sel WHERE sel.username=pk.username)) AS picked_a_goal,
  round(100.0*(SELECT count(*) FROM pk WHERE EXISTS (SELECT 1 FROM sel WHERE sel.username=pk.username))
        /nullif((SELECT count(*) FROM pk),0),1) AS pct_picked
FROM fr;

-- 14b. TG-1r: consecutive days of guest paywall shows with zero clicks.
-- Fires on TIME, so it resolves at our real traffic instead of waiting
-- for a 50-show bar that is 36 days away.
-- 2026-08-03: this query did NOT implement the rule it is named after.
-- The old version took a running sum that never reset, so a day WITH clicks
-- left the counter untouched instead of breaking the run. Read literally it
-- said "5 of 14 dry days, reverts ~Aug 6"; the actual consecutive run was 2,
-- because a guest really did click the monthly plan on 07-28 and a registered
-- user on 07-29. Acting on the old output would have pulled the guest paywall
-- on the strength of a streak that had already been broken twice.
--
-- Days with zero guest shows are neither dry nor wet: nothing was asked of
-- anyone, so they carry no evidence and must not break the run either.
WITH days AS (
  SELECT (created_at AT TIME ZONE 'UTC')::date AS d,
         count(*) FILTER (WHERE event='pro_modal_shown'
           AND ((metadata #>> '{}')::jsonb)->>'isGuest'='true') AS guest_shows,
         count(*) FILTER (WHERE event LIKE 'click_%') AS clicks
  FROM pro_events
  WHERE created_at >= '2026-07-23'
  GROUP BY 1
), evidence AS (
  -- Only days that actually showed a guest the paywall carry a verdict.
  SELECT d, guest_shows, clicks, (clicks = 0) AS dry
  FROM days WHERE guest_shows > 0
), runs AS (
  -- Group consecutive same-verdict days; the counter restarts on every wet day.
  SELECT d, guest_shows, clicks, dry,
         row_number() OVER (ORDER BY d)
           - row_number() OVER (PARTITION BY dry ORDER BY d) AS grp
  FROM evidence
)
SELECT d, guest_shows, clicks,
       CASE WHEN dry THEN row_number() OVER (PARTITION BY dry, grp ORDER BY d) ELSE 0 END
         AS consecutive_dry_days   -- 14 → revert the 6-solve guest tier
FROM runs ORDER BY d;

-- 14c. ON-1r: are opens governed by the default path filter?
-- ROADMAP_STAGE_IDS is the 44 ids reachable from challengePathFilter=
-- 'recommended'. Keep in sync with SQL_ROADMAP_STAGES in src/app.jsx.
WITH roadmap(id) AS (
  -- Extracted from SQL_ROADMAP_STAGES on 2026-07-28; 44 ids of 185 challenges.
  SELECT unnest(ARRAY[1,6,7,8,10,19,23,24,31,33,34,35,37,43,44,47,50,57,67,73,79,
                      91,92,93,94,95,96,97,98,99,100,102,103,104,105,106,107,108,
                      109,110,111,112,113,115])
), opens AS (
  SELECT (((metadata #>> '{}')::jsonb)->>'challengeId')::int AS cid
  FROM pro_events
  WHERE event='challenge_opened'
    AND created_at >= now() - interval '14 days'
    AND (((metadata #>> '{}')::jsonb)->>'challengeId') ~ '^[0-9]+$'
)
SELECT count(*) AS opens_14d,
       count(*) FILTER (WHERE cid IN (SELECT id FROM roadmap)) AS in_view_opens,
       count(*) FILTER (WHERE cid NOT IN (SELECT id FROM roadmap)) AS outside_opens,
       round(count(*) FILTER (WHERE cid IN (SELECT id FROM roadmap))::numeric
             / (SELECT count(*) FROM roadmap), 2) AS opens_per_in_view_challenge,
       round(count(*) FILTER (WHERE cid NOT IN (SELECT id FROM roadmap))::numeric
             / 141, 2) AS opens_per_outside_challenge,
       -- The decision number. >3x → default filter is the constraint.
       round((count(*) FILTER (WHERE cid IN (SELECT id FROM roadmap))::numeric
              / (SELECT count(*) FROM roadmap))
             / nullif(count(*) FILTER (WHERE cid NOT IN (SELECT id FROM roadmap))::numeric / 141, 0), 1)
         AS concentration_ratio
FROM opens;

-- 14d. ER-1: what actually breaks when a query fails to run.
-- dialect_mismatch is the bucket that indicts our content rather than
-- the user — see src/utils/query-error.js.
SELECT ((metadata #>> '{}')::jsonb)->>'errorClass' AS error_class,
       count(*) AS n,
       count(DISTINCT ((metadata #>> '{}')::jsonb)->>'aid') AS browsers,
       round(100.0*count(*)/nullif(sum(count(*)) OVER (),0),1) AS pct,
       mode() WITHIN GROUP (ORDER BY ((metadata #>> '{}')::jsonb)->>'challengeId') AS worst_challenge
FROM pro_events
WHERE event='challenge_errored' AND created_at >= now() - interval '14 days'
GROUP BY 1 ORDER BY n DESC;

-- 14e. AR-1: the arrival denominator, joinable for the first time.
-- Baseline only — do NOT write a threshold against this until two
-- weeks of data exist (first aid rows: 2026-07-28).
WITH ev AS (
  SELECT ((metadata #>> '{}')::jsonb)->>'aid' AS aid, event
  FROM pro_events
  WHERE created_at >= '2026-07-28'
    AND ((metadata #>> '{}')::jsonb)->>'aid' IS NOT NULL
)
SELECT count(DISTINCT aid) AS browsers,
       count(DISTINCT aid) FILTER (WHERE aid IN (
         SELECT aid FROM ev GROUP BY aid HAVING bool_and(event='app_opened'))) AS opened_and_did_nothing,
       count(DISTINCT aid) FILTER (WHERE aid IN (
         SELECT aid FROM ev WHERE event='challenge_opened')) AS opened_a_challenge,
       count(DISTINCT aid) FILTER (WHERE aid IN (
         SELECT aid FROM ev WHERE event='challenge_solved')) AS solved_something
FROM ev;

-- ═══════════════════════════════════════════════════════════════════
-- 15. MODAL BEHAVIOR — what people DO when the offer appears
-- ═══════════════════════════════════════════════════════════════════
-- Added 2026-07-23 answering "what do paywall viewers actually do".
-- Everything here is derived from timestamps we already had and had
-- never read. Two findings on first read, n small but consistent:
--
--   1. MEDIAN DWELL IS 2-6 SECONDS across every trigger. Nobody reads
--      the modal. The purchase decision is made BEFORE it opens; the
--      modal is a door, not a pitch. (Serge: 21s from shown to annual
--      click — arrived already convinced by the product + email.)
--   2. Session survival differs 4x by trigger. milestone_solves (fires
--      after a win): 53% continue, 38% solve again within 30 min.
--      trial_ended (ambushes the returning user at login): 81% of
--      sessions DIE at the modal. hard_challenge (blocked a click,
--      retired Apr): 0 post-modal solves, ever.
--
-- Implication recorded as hypothesis MD-1 (read after Aug 3 cohort
-- reads land; changing login-time behavior touches retention surface):
-- replacing the trial_ended login-ambush with a non-blocking banner +
-- an after-first-solve ask should lift its 19% session survival toward
-- milestone's 53% without losing its (already tiny: 2/26) click rate.

-- 15a. Per-trigger: shows, dwell, click-through, session survival.
WITH shows AS (
  SELECT username, reason, created_at FROM pro_events WHERE event='modal_shown'
)
SELECT s.reason,
  count(*) AS shows,
  count(DISTINCT s.username) AS users,
  count(DISTINCT c.username) AS clickers,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY d.dwell)::numeric, 1) AS median_dwell_s,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM pro_events e
    WHERE e.username=s.username
      AND e.created_at BETWEEN s.created_at + interval '5 seconds' AND s.created_at + interval '30 minutes'
      AND e.event NOT IN ('modal_shown','modal_dismissed','pro_modal_shown')
  )) AS sessions_survived,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM pro_events e
    WHERE e.username=s.username AND e.event='challenge_solved'
      AND e.created_at BETWEEN s.created_at AND s.created_at + interval '30 minutes'
  )) AS solved_after
FROM shows s
LEFT JOIN LATERAL (
  SELECT extract(epoch FROM min(dm.created_at) - s.created_at) AS dwell
  FROM pro_events dm
  WHERE dm.event='modal_dismissed' AND dm.username=s.username AND dm.reason=s.reason
    AND dm.created_at BETWEEN s.created_at AND s.created_at + interval '10 minutes'
) d ON true
LEFT JOIN (SELECT DISTINCT username, reason FROM pro_events WHERE event LIKE 'click_%') c
  ON c.username=s.username AND c.reason=s.reason
GROUP BY 1 ORDER BY shows DESC;

-- ═══════════════════════════════════════════════════════════════════
-- 16. WHAT USERS ACTUALLY TOLD US
-- ═══════════════════════════════════════════════════════════════════
-- Added 2026-07-25, the day the app got an inbound channel for the first
-- time. Until then there was none: all 8 mailto links pointed at
-- support@sqlquest.app on a domain with no MX record, so everything anyone
-- wrote us was dropped by DNS. Every "why didn't they convert" question in
-- this file has been answered from behaviour alone because nobody could tell
-- us. This section is the qualitative half.
--
-- READ IT WEEKLY. A channel nobody reads is the same failure as the referral
-- functions: deployed, working, and silent for months. n will be small — read
-- the verbatims, don't aggregate them away.

-- 16a. Everything, newest first. Just read them.
SELECT created_at, username, screen, contact,
       context->>'isGuest'     AS guest,
       context->>'isPro'       AS pro,
       context->>'solvedCount' AS solves,
       context->>'intent'      AS intent,
       context->>'arrivalSrc'  AS arrived_from,
       context->>'tz'          AS tz,
       message
FROM feedback
WHERE message NOT LIKE '[TEST]%'
ORDER BY created_at DESC
LIMIT 50;

-- 16b. Who is writing — the segment tells you how to weight it.
-- A paying user's complaint and a 0-solve guest's are not the same signal.
SELECT
  count(*)                                                    AS total,
  count(*) FILTER (WHERE context->>'isPro' = 'true')          AS from_pro,
  count(*) FILTER (WHERE context->>'isGuest' = 'true')        AS from_guest,
  count(*) FILTER (WHERE contact IS NOT NULL)                 AS left_an_email,
  count(*) FILTER (WHERE (context->>'solvedCount')::int >= 5) AS from_engaged,
  round(avg((context->>'solvedCount')::int), 1)               AS avg_solves
FROM feedback WHERE message NOT LIKE '[TEST]%';

-- 16c. Where they were standing when they gave up enough to write.
-- A screen that generates disproportionate feedback is a screen with a
-- problem — this is the cheapest usability signal we have.
SELECT screen, count(*) AS notes, round(avg((context->>'solvedCount')::int), 1) AS avg_solves
FROM feedback WHERE message NOT LIKE '[TEST]%'
GROUP BY 1 ORDER BY notes DESC;

-- 16d. Submit failures. Should be zero. Anything here means someone tried to
-- reach us and couldn't — the exact thing this whole channel exists to end.
SELECT created_at, username, ((metadata #>> '{}')::jsonb)->>'reason' AS reason
FROM pro_events WHERE event='feedback_failed'
ORDER BY created_at DESC LIMIT 20;

-- 16e. Open rate of the channel itself: opened vs actually sent.
-- A big gap means the box is inviting but the ask feels too heavy.
SELECT
  count(*) FILTER (WHERE event='feedback_opened')    AS opened,
  count(*) FILTER (WHERE event='feedback_submitted') AS submitted,
  count(*) FILTER (WHERE event='feedback_failed')    AS failed
FROM pro_events WHERE event LIKE 'feedback_%';

-- ═══════════════════════════════════════════════════════════════════
-- 17. COHORTS + WEEKLY RETENTION
-- ═══════════════════════════════════════════════════════════════════
-- Added 2026-07-25.
--
-- ⚠️  READ THIS BEFORE COHORTING ANYTHING. `users.created_at` IS NOT A
--     SIGNUP DATE. It is when the cloud row was written. Measured on the
--     152 email users:
--       - 139/152 have created_at within 5 seconds of updated_at
--       - 93.3% of users with events were ALREADY ACTIVE before their
--         created_at, by an average of 4.7 days
--       - sergelafarge's "signup" is 6 seconds after his last event
--     People play as a guest first and the row appears when they claim an
--     account. So a "cohort" built on created_at selects for people who were
--     active that week — which makes recent cohorts look dramatically better
--     for free. Cohorting the last 3 weeks that way produced a median-solves
--     trend of 0 → 3.5 → 8 and a doubled activation rate. All of it was
--     selection bias. Do not repeat it.
--
--     Use loginCalendar (data->'loginCalendar', a {date: true} object). It is
--     client-written, so it shares the guest-progress-loss caveat, but it
--     records the user's ACTUAL first day and every day since.

-- 17a. Weekly retention triangle. Cohort = week of first login.
-- w1..w4 are the counts still active 1-4 weeks later.
-- A week is only readable once it has fully elapsed — the newest cohort's w1
-- is always 0 by construction, and the current week is partial. Don't read
-- the bottom-right corner.
WITH logins AS (
  SELECT u.username, d.key::date AS gun
  FROM users u, jsonb_each(u.data->'loginCalendar') d
  WHERE u.username NOT LIKE 'guest\_%' AND u.email IS NOT NULL AND u.email <> ''
    AND jsonb_typeof(u.data->'loginCalendar') = 'object'
    AND d.key ~ '^\d{4}-\d{2}-\d{2}$'
), firsts AS (
  SELECT username, min(gun) AS ilk_gun, date_trunc('week', min(gun))::date AS kohort
  FROM logins GROUP BY username
), act AS (
  SELECT f.kohort, f.username, (date_trunc('week', l.gun)::date - f.kohort)/7 AS hafta
  FROM firsts f JOIN logins l USING (username)
)
SELECT to_char(kohort,'IYYY-"W"IW') AS kohort, kohort AS baslangic,
  count(DISTINCT username) AS n,
  count(DISTINCT username) FILTER (WHERE hafta=1) AS w1,
  round(100.0*count(DISTINCT username) FILTER (WHERE hafta=1)/count(DISTINCT username),0) AS w1_pct,
  count(DISTINCT username) FILTER (WHERE hafta=2) AS w2,
  count(DISTINCT username) FILTER (WHERE hafta=3) AS w3,
  count(DISTINCT username) FILTER (WHERE hafta=4) AS w4
FROM act
WHERE kohort >= (current_date - interval '12 weeks')
GROUP BY 1,2 ORDER BY 2;

-- 17b. Activation by cohort. Activation = 5+ solves in the first 7 days,
-- the definition in docs/data-driven-product.md. Solves come from
-- solvedChallenges in the blob, NOT from pro_events, because event history
-- under a claimed username starts at the claim and misses the guest period.
WITH logins AS (
  SELECT u.username, d.key::date AS gun
  FROM users u, jsonb_each(u.data->'loginCalendar') d
  WHERE u.username NOT LIKE 'guest\_%' AND u.email IS NOT NULL
    AND jsonb_typeof(u.data->'loginCalendar')='object' AND d.key ~ '^\d{4}-\d{2}-\d{2}$'
), firsts AS (
  SELECT username, min(gun) AS ilk_gun, date_trunc('week', min(gun))::date AS kohort
  FROM logins GROUP BY username
), solved AS (
  SELECT u.username,
         CASE WHEN jsonb_typeof(u.data->'solvedChallenges')='array'
              THEN jsonb_array_length(u.data->'solvedChallenges') ELSE 0 END AS toplam_cozum,
         (SELECT count(DISTINCT gun) FROM logins l WHERE l.username=u.username) AS aktif_gun
  FROM users u
)
SELECT to_char(f.kohort,'IYYY-"W"IW') AS kohort,
  count(*) AS n,
  count(*) FILTER (WHERE s.toplam_cozum = 0)  AS hic_cozmedi,
  count(*) FILTER (WHERE s.toplam_cozum >= 5) AS engaged_5plus,
  round(100.0*count(*) FILTER (WHERE s.toplam_cozum >= 5)/count(*),0) AS engaged_pct,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY s.toplam_cozum)::numeric,1) AS medyan_cozum,
  round(avg(s.aktif_gun),1) AS ort_aktif_gun
FROM firsts f JOIN solved s USING (username)
WHERE f.kohort >= (current_date - interval '12 weeks')
GROUP BY 1, f.kohort ORDER BY f.kohort;

-- 17c. Guard. Run this before trusting ANY cohort number. If
-- pct_active_before_signup stays high, created_at is still not a signup date
-- and 17a/17b's loginCalendar basis is still the right one. If it ever drops
-- near zero, someone fixed the signup flow and this section can be simplified.
SELECT count(*) AS with_events,
  count(*) FILTER (WHERE first_ev < created_at) AS active_before_signup,
  round(100.0*count(*) FILTER (WHERE first_ev < created_at)/nullif(count(*),0),1) AS pct_active_before_signup,
  round(avg(extract(epoch FROM (created_at - first_ev))/86400)::numeric,1) AS avg_days_early
FROM (
  SELECT u.created_at,
         (SELECT min(e.created_at) FROM pro_events e WHERE e.username=u.username) AS first_ev
  FROM users u WHERE u.username NOT LIKE 'guest\_%' AND u.email IS NOT NULL
) t WHERE first_ev IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 18. SATISFACTION, MEASURED AS BEHAVIOUR
-- ═══════════════════════════════════════════════════════════════════
--
-- Why this section exists. On 2026-08-04 the question was "how do we
-- measure customer satisfaction, including free users". At this size a
-- score cannot answer it: 164 named users, and a survey with a typical
-- 12% response rate yields ~20 answers with a ±22pp confidence interval.
-- That is the same trap that made all three frozen experiments
-- unreadable on 08-03. So satisfaction is read as behaviour and as
-- verbatims, never as a rating.
--
-- Do NOT add an NPS/CSAT widget on the strength of this section. A
-- number nobody can act on displaces the listening that actually works:
-- ONE email from Serge on 07-26 produced two confirmed bugs, while 28
-- paywall impressions the same week produced zero bits.

-- 18a. THE HEADLINE. Share of engaged users (5+ solves) who came back in
-- the last 14 days WITHOUT an email in the preceding 48h.
--
-- Unprompted is the whole point. A return that follows a reminder
-- measures the reminder; a return with no prompt is the closest
-- behavioural proxy we have for "this was worth coming back to". It also
-- cannot be inflated by sending more mail, which a raw return-rate can.
--
-- Baseline 2026-08-04: 86 engaged, 33 returned, 30 of them unprompted
-- (35%), and only 3 returned solely after an email. That last number is
-- the honest verdict on the email machine's contribution to retention,
-- and it agrees with the 08-03 cohort read (W1 50% pre-email vs 47%
-- post-email).
WITH engaged AS (
  SELECT username
  FROM users
  WHERE COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(data->'solvedChallenges')='array'
        THEN data->'solvedChallenges' ELSE '[]'::jsonb END),0) >= 5
    AND username !~* '^(test|demo|admin|qa)[0-9]*$' AND username <> 'sqlquest'
    AND username NOT ILIKE '%fabletest%' AND username NOT ILIKE 'linktest%'
    AND username NOT ILIKE 'internalroutine%' AND username NOT LIKE 'guest%'
    AND COALESCE(email,'') NOT ILIKE '%@datrick.com' AND COALESCE(email,'') NOT ILIKE '%@example.com'
), visits AS (
  SELECT e.username,
         EXISTS (SELECT 1 FROM email_events m
                 WHERE m.username = e.username AND m.event = 'sent'
                   AND m.created_at BETWEEN e.created_at - interval '48 hours' AND e.created_at) AS mailed_first
  FROM pro_events e JOIN engaged g ON g.username = e.username
  WHERE e.created_at >= now() - interval '14 days'
)
SELECT count(*) AS engaged_total,
       count(*) FILTER (WHERE u.username IN (SELECT username FROM visits)) AS returned_any,
       count(*) FILTER (WHERE u.username IN (SELECT username FROM visits WHERE NOT mailed_first)) AS returned_unprompted,
       count(*) FILTER (WHERE u.username IN (SELECT username FROM visits WHERE mailed_first)
                        AND u.username NOT IN (SELECT username FROM visits WHERE NOT mailed_first)) AS returned_only_after_email,
       round(100.0 * count(*) FILTER (WHERE u.username IN (SELECT username FROM visits WHERE NOT mailed_first))
             / nullif(count(*),0), 0) AS pct_unprompted   -- ← the number on the wall
FROM engaged u;

-- 18b. WHERE PEOPLE GIVE UP, BY CHALLENGE. The struggle signal: a
-- challenge that people hit repeatedly and abandon. Ranked by distinct
-- browsers, so one frustrated person cannot manufacture a hotspot.
SELECT ((metadata #>> '{}')::jsonb)->>'challengeId' AS challenge_id,
       ((metadata #>> '{}')::jsonb)->>'category' AS category,
       ((metadata #>> '{}')::jsonb)->>'errorClass' AS error_class,
       count(*) AS errors,
       count(DISTINCT ((metadata #>> '{}')::jsonb)->>'aid') AS browsers
FROM pro_events
WHERE event='challenge_errored' AND created_at >= now() - interval '14 days'
GROUP BY 1,2,3
HAVING count(DISTINCT ((metadata #>> '{}')::jsonb)->>'aid') >= 2
ORDER BY browsers DESC, errors DESC LIMIT 20;

-- 18c. UNCLEAR vs JUST HARD. The one question no behavioural signal can
-- answer: solve rates look identical for a badly-written challenge and an
-- honestly hard one. Asked in-app on the 3rd WRONG answer (syntax errors
-- excluded by construction — the 'error' status never increments
-- wrongAttemptCount). Shipped 2026-08-04; expect zeros until traffic
-- accumulates.
--
-- Read it as a RATIO per challenge, not a count. A challenge where
-- 'unclear' beats 'hard' is a content bug and goes to the top of the
-- rewrite list; 'broken' at all is a bug report.
SELECT ((metadata #>> '{}')::jsonb)->>'challengeId' AS challenge_id,
       ((metadata #>> '{}')::jsonb)->>'difficulty' AS difficulty,
       count(*) FILTER (WHERE ((metadata #>> '{}')::jsonb)->>'verdict'='unclear') AS unclear,
       count(*) FILTER (WHERE ((metadata #>> '{}')::jsonb)->>'verdict'='hard')    AS just_hard,
       count(*) FILTER (WHERE ((metadata #>> '{}')::jsonb)->>'verdict'='broken')  AS looks_broken,
       count(DISTINCT ((metadata #>> '{}')::jsonb)->>'aid') AS browsers
FROM pro_events
WHERE event='challenge_stuck_verdict'
GROUP BY 1,2 ORDER BY unclear DESC, browsers DESC;

-- 18d. WHO TO TALK TO. Not a metric — a call sheet. At n=164 the highest
-- information-per-effort channel is a personal email, and both segments
-- below are small enough to write by hand.
--   'deep_active'  — know the product best; tell you what is missing.
--   'stuck_loyal'  — keep coming back and have STILL never solved
--                    anything. The purest dissatisfaction in the data,
--                    and they never complain, so nothing else surfaces
--                    them.
SELECT CASE WHEN solves >= 20 THEN 'deep_active' ELSE 'stuck_loyal' END AS segment,
       username, email, solves, last_active,
       (SELECT ((e.metadata #>> '{}')::jsonb)->>'challengeId'
          FROM pro_events e
         WHERE e.username = t.username AND e.event = 'challenge_opened'
         ORDER BY e.created_at DESC LIMIT 1) AS last_challenge_opened
FROM (
  SELECT username, email,
         COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(data->'solvedChallenges')='array'
           THEN data->'solvedChallenges' ELSE '[]'::jsonb END),0) AS solves,
         CASE WHEN (data->>'lastActive') ~ '^[0-9]+$'
              THEN to_timestamp((data->>'lastActive')::bigint/1000)
              WHEN (data->>'lastActive') ~ '^[0-9]{4}-' THEN (data->>'lastActive')::timestamptz END AS last_active
  FROM users
  WHERE username !~* '^(test|demo|admin|qa)[0-9]*$' AND username <> 'sqlquest'
    AND username NOT ILIKE '%fabletest%' AND username NOT ILIKE 'linktest%'
    AND username NOT ILIKE 'internalroutine%' AND username NOT LIKE 'guest%'
    AND COALESCE(email,'') NOT ILIKE '%@datrick.com' AND COALESCE(email,'') NOT ILIKE '%@example.com'
    AND COALESCE((data->>'emailOptOut')::boolean,false) = false
    AND email IS NOT NULL
) t
WHERE last_active >= now() - interval '30 days'
  AND (solves >= 20 OR solves = 0)
ORDER BY segment, solves DESC, last_active DESC;
