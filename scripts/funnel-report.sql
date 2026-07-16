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
