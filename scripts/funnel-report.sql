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

-- ── 3. Purchase funnel, last 14 days ─────────────────────────────────
SELECT
  count(*) FILTER (WHERE event = 'pro_modal_shown')                     AS modal_shown,
  count(*) FILTER (WHERE event = 'pro_checkout_clicked')                AS checkout_clicked,
  count(*) FILTER (WHERE event = 'pro_purchase_completed'
               AND reason = 'stripe_webhook')                           AS paid
FROM pro_events
WHERE created_at >= now() - interval '14 days';
