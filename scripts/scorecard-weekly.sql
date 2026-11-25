-- scripts/scorecard-weekly.sql — the investor plan's A01 (2026-11-25):
-- ONE weekly scorecard on bot-filtered PEOPLE.
--
-- Plan: docs/plans/investor-90-day-2026-11-25.md (A01). Filled every Friday
-- by B2 (docs/agent/fleet/B2-measurement.md) into docs/agent/scorecard.md.
-- Metrics: `human_visitors`, `scorecard_weekly` (docs/agent/metrics.md).
--
-- Each query runs as-is in the Supabase MCP `execute_sql` (read-only) or in
-- psql as metrics_reader: no parameters, no temp tables, no writes.
-- Aggregates only: no aid, username or email leaves the database.
--
-- Weeks: the 8 complete ISO weeks (Monday 00:00 UTC → next Monday) before the
-- current one. To re-read an earlier Friday, replace now() in `params` (every
-- query has its own copy) with that day's timestamp.
--
-- People: COALESCE(aid, username), metadata read as (metadata #>> '{}')::jsonb.
-- A person is HUMAN when no row of theirs, at any time, matches an
-- exclusion (one row marks the whole browser; fleet README rule 2):
--   internal       usernames ^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)
--   founder        the excluded walk aids (363dfb2b…, e5fcbad1a022…), the
--                  2026-11-20 checkout tests (guest, pro_modal_shown reason
--                  email_link, 0 solves) and the 2026-11-24 walk guests
--                  (Europe/Istanbul, mobile:375x812, 11:00–11:08 UTC)
--   bot_stamp      metadata.bot, wd or uaBot
--   viewport       tablet:800x600, desktop:1280x1200, desktop:1919x992,
--                  desktop:1024x1024
--   ref_spam       ref:aocr.org (landingSrc or arrivalSrc), verify-test
--   app1lang       first app_opened with no landingSrc, langs = 1 and no
--                  landing_view ever (widens topic1lang, C8 2026-11-24)
--   topic1lang     first app_opened with no landingSrc, arrivalSrc
--                  challenges-*, langs = 1
--   prestamp_fp    first app_opened with no landingSrc,
--                  America/Los_Angeles + desktop:1920x1080 (aar-weekly.sql)
--   utc1280        first app_opened in UTC + desktop:1280x720, never a
--                  landing_view, WHATEVER its landingSrc (new in A01: 1,347
--                  "people" in the week of 2026-09-28 carried a spoofed
--                  search:google; of 1,356 ever, 0 ran a query)
--   cn_app         first app_opened with no landingSrc in Asia/Shanghai,
--                  Asia/Hong_Kong or Asia/Singapore, never a landing_view
--                  (new in A01: 1,629 people 2026-08-23 → 11-25, 0 ran a
--                  query, 1 solve; before 2026-10-08 it carries no `langs`,
--                  so app1lang / langs2 cannot see it)
--   utc_landing    a landing_view in tz UTC from 2026-11-22, never an app_opened
--   cn_reader      landing rows in Asia/Shanghai, never an app_opened
--   langs2         an app_opened with langs = 2 and no landingSrc, no landing_view ever
-- RAW counts the same people with no exclusion at all.
--
-- Money is reason = 'stripe_webhook' only, by username (internal usernames
-- out): trials (pro_trial_started) and payments (pro_purchase_completed) are
-- separate columns and never added; renewals, refunds and failed charges are
-- their own columns. A trial is not a payment.

-- ===== Query 1: the weekly table ========================================
-- One row per ISO week. Columns:
--   raw_visitors / human_visitors  people with a landing_view, landing_engaged
--                                  or app_opened in the week; gap_pct = the
--                                  share of raw that is not human
--   app_openers        human people with an app_opened in the week
--   new_openers        human people whose FIRST app_opened ever is in the week
--   activated_7d       of new_openers, solved >= 1 challenge within 7 days of
--                      that first open (activation = >= 1 solve)
--   solvers            human people with >= 1 challenge_solved in the week
--   new_six_solvers    human people whose 6th DISTINCT solved challenge
--                      (lifetime) was solved in the week
--   day0_solvers       new_openers who solved on the UTC day of their first open
--   returned_7d        of day0_solvers, any non-landing event on a later UTC
--                      day within 7 days of the first open (the
--                      second-session read's definition, 2026-11-25)
--   runway_complete    false while the week's cohort has < 7 days of follow-up;
--                      activated_7d and returned_7d are then floors
--   modal_people       human people shown pro_modal_shown in the week
--   checkout_people    human people with pro_checkout_clicked in the week
--   trials, payments, renewals, refunds   distinct usernames, webhook rows
--   failed_charges     distinct invoices with pro_payment_failed (webhook)
--   paid_usd           sum of amount_cents on the week's pro_purchase_completed

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
first_open AS (
  SELECT pid, min(created_at) AS fo FROM clean WHERE event = 'app_opened' GROUP BY pid
),
solves AS (   -- first solve of each distinct challenge
  SELECT pid, m->>'challengeId' AS cid, min(created_at) AS at
  FROM clean WHERE event = 'challenge_solved' AND m->>'challengeId' IS NOT NULL
  GROUP BY 1, 2
),
nth AS (
  SELECT pid, at, row_number() OVER (PARTITION BY pid ORDER BY at) AS n FROM solves
),
first_solve AS (
  SELECT pid, at FROM nth WHERE n = 1
),
cohort AS (   -- new openers of each week, with day 0 and the 7 days after it
  SELECT o.pid, w.ws,
    bool_or(f.at <= o.fo + interval '7 days')                                 AS activated,
    bool_or(c.event = 'challenge_solved'
            AND (c.created_at AT TIME ZONE 'UTC')::date = (o.fo AT TIME ZONE 'UTC')::date) AS day0,
    bool_or(c.reason IS DISTINCT FROM 'landing'
            AND (c.created_at AT TIME ZONE 'UTC')::date > (o.fo AT TIME ZONE 'UTC')::date) AS returned
  FROM first_open o
  JOIN weeks w ON o.fo >= w.ws AND o.fo < w.we
  LEFT JOIN first_solve f ON f.pid = o.pid
  LEFT JOIN clean c ON c.pid = o.pid
                   AND c.created_at >= o.fo - interval '1 day'
                   AND c.created_at <= o.fo + interval '7 days'
  GROUP BY o.pid, w.ws
),
wk_events AS (
  SELECT w.ws,
    count(DISTINCT c.pid) FILTER (WHERE c.event = 'app_opened')           AS app_openers,
    count(DISTINCT c.pid) FILTER (WHERE c.event = 'challenge_solved')     AS solvers,
    count(DISTINCT c.pid) FILTER (WHERE c.event = 'pro_modal_shown')      AS modal_people,
    count(DISTINCT c.pid) FILTER (WHERE c.event = 'pro_checkout_clicked') AS checkout_people
  FROM weeks w LEFT JOIN clean c ON c.created_at >= w.ws AND c.created_at < w.we
  GROUP BY w.ws
),
money AS (   -- stripe_webhook is the only money truth
  SELECT w.ws,
    count(DISTINCT e.username) FILTER (WHERE e.event = 'pro_trial_started')      AS trials,
    count(DISTINCT e.username) FILTER (WHERE e.event = 'pro_purchase_completed') AS payments,
    count(DISTINCT e.username) FILTER (WHERE e.event = 'pro_renewal_completed')  AS renewals,
    count(DISTINCT e.username) FILTER (WHERE e.event = 'pro_refunded')           AS refunds,
    count(DISTINCT COALESCE(e.m->>'invoice_id', e.created_at::text))
          FILTER (WHERE e.event = 'pro_payment_failed')                          AS failed_charges,
    round(COALESCE(sum((e.m->>'amount_cents')::numeric)
          FILTER (WHERE e.event = 'pro_purchase_completed'), 0) / 100, 2)       AS paid_usd
  FROM weeks w
  LEFT JOIN evp e ON e.created_at >= w.ws AND e.created_at < w.we
   AND e.reason = 'stripe_webhook'
   AND COALESCE(e.username, '') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
  GROUP BY w.ws
),
vis AS (
  SELECT ws, count(DISTINCT pid) AS raw_visitors,
         count(DISTINCT pid) FILTER (WHERE excl IS NULL) AS human_visitors
  FROM visits GROUP BY ws
),
coh AS (
  SELECT ws, count(*) AS new_openers,
         count(*) FILTER (WHERE activated)           AS activated_7d,
         count(*) FILTER (WHERE day0)                AS day0_solvers,
         count(*) FILTER (WHERE day0 AND returned)   AS returned_7d
  FROM cohort GROUP BY ws
),
six AS (
  SELECT w.ws, count(s.pid) AS new_six_solvers
  FROM weeks w LEFT JOIN nth s ON s.n = 6 AND s.at >= w.ws AND s.at < w.we
  GROUP BY w.ws
)
SELECT to_char(w.ws AT TIME ZONE 'UTC', 'IYYY-"W"IW') AS iso_week,
       (w.ws AT TIME ZONE 'UTC')::date                AS week_start,
       COALESCE(v.raw_visitors, 0)                    AS raw_visitors,
       COALESCE(v.human_visitors, 0)                  AS human_visitors,
       round(100.0 * (1 - v.human_visitors::numeric / NULLIF(v.raw_visitors, 0)), 1) AS gap_pct,
       ev.app_openers,
       COALESCE(c.new_openers, 0)  AS new_openers,
       COALESCE(c.activated_7d, 0) AS activated_7d,
       ev.solvers,
       sx.new_six_solvers,
       COALESCE(c.day0_solvers, 0) AS day0_solvers,
       COALESCE(c.returned_7d, 0)  AS returned_7d,
       (w.we + interval '7 days' <= (SELECT t FROM params)) AS runway_complete,
       ev.modal_people, ev.checkout_people,
       mo.trials, mo.payments, mo.renewals, mo.refunds, mo.failed_charges, mo.paid_usd
FROM weeks w
JOIN wk_events ev ON ev.ws = w.ws
JOIN money mo     ON mo.ws = w.ws
JOIN six sx       ON sx.ws = w.ws
LEFT JOIN vis v   ON v.ws = w.ws
LEFT JOIN coh c   ON c.ws = w.ws
ORDER BY w.ws;


-- ===== Query 2: human visitors by source, country and landing page =======
-- Long format: one row per (week, dimension, segment); people = human
-- visitors, with how many of them opened the app and solved in the week.
--   source   the person's first non-empty landingSrc on an entry row in the
--            week: search:google, search:bing, ai (ai:* and ref:*meta.ai),
--            direct/home (no source: typed, bookmarked, an assistant that
--            strips the referrer, or a page-to-app hop), other
--   country  `country` on the row if present, else the IANA zone → country
--            PROXY (scripts/analytics/daily.sql's map); top 5 over the 8
--            weeks, the rest 'other'. A zone is not a country (VPN, UTC).
--   page     the first landing page in the week, grouped: company
--            (*-sql-interview), sql-exercises, topic/question (challenges*,
--            questions*), blog, home, other, (app only) = no landing row.

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
tz_country(tz, country) AS (VALUES
  ('Asia/Calcutta','IN'),('Asia/Kolkata','IN'),
  ('America/New_York','US'),('America/Chicago','US'),('America/Denver','US'),
  ('America/Los_Angeles','US'),('America/Phoenix','US'),('America/Anchorage','US'),
  ('America/Detroit','US'),('America/Indianapolis','US'),('America/Indiana/Indianapolis','US'),
  ('America/Boise','US'),('America/Kentucky/Louisville','US'),('Pacific/Honolulu','US'),
  ('Europe/Istanbul','TR'),('Asia/Istanbul','TR'),
  ('Europe/London','GB'),('Europe/Dublin','IE'),('Europe/Berlin','DE'),('Europe/Paris','FR'),
  ('Europe/Amsterdam','NL'),('Europe/Brussels','BE'),('Europe/Madrid','ES'),('Europe/Lisbon','PT'),
  ('Europe/Rome','IT'),('Europe/Warsaw','PL'),('Europe/Prague','CZ'),('Europe/Budapest','HU'),
  ('Europe/Bucharest','RO'),('Europe/Athens','GR'),('Europe/Vienna','AT'),('Europe/Zurich','CH'),
  ('Europe/Stockholm','SE'),('Europe/Oslo','NO'),('Europe/Copenhagen','DK'),('Europe/Helsinki','FI'),
  ('Europe/Kiev','UA'),('Europe/Kyiv','UA'),('Europe/Moscow','RU'),
  ('America/Toronto','CA'),('America/Vancouver','CA'),('America/Edmonton','CA'),('America/Halifax','CA'),
  ('America/Sao_Paulo','BR'),('America/Mexico_City','MX'),('America/Bogota','CO'),('America/Lima','PE'),
  ('America/Buenos_Aires','AR'),('America/Argentina/Buenos_Aires','AR'),('America/Santiago','CL'),
  ('Asia/Shanghai','CN'),('Asia/Hong_Kong','HK'),('Asia/Singapore','SG'),('Asia/Tokyo','JP'),
  ('Asia/Seoul','KR'),('Asia/Manila','PH'),('Asia/Jakarta','ID'),('Asia/Saigon','VN'),
  ('Asia/Ho_Chi_Minh','VN'),('Asia/Bangkok','TH'),('Asia/Kuala_Lumpur','MY'),('Asia/Taipei','TW'),
  ('Asia/Rangoon','MM'),('Asia/Karachi','PK'),('Asia/Dhaka','BD'),('Asia/Colombo','LK'),
  ('Asia/Kathmandu','NP'),('Asia/Katmandu','NP'),('Asia/Dubai','AE'),('Asia/Riyadh','SA'),
  ('Asia/Qatar','QA'),('Asia/Jerusalem','IL'),('Asia/Tehran','IR'),('Asia/Baku','AZ'),
  ('Africa/Cairo','EG'),('Africa/Lagos','NG'),('Africa/Nairobi','KE'),('Africa/Johannesburg','ZA'),
  ('Africa/Casablanca','MA'),('Africa/Luanda','AO'),
  ('Australia/Sydney','AU'),('Australia/Melbourne','AU'),('Australia/Brisbane','AU'),
  ('Australia/Perth','AU'),('Australia/Adelaide','AU'),('Pacific/Auckland','NZ')
),
wk_person AS (
  SELECT w.ws, c.pid,
    (array_agg(c.m->>'landingSrc' ORDER BY c.created_at) FILTER (
       WHERE c.event IN ('landing_view', 'landing_engaged', 'app_opened')
         AND COALESCE(c.m->>'landingSrc', '') <> ''))[1]                         AS src,
    (array_agg(c.m->>'country' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'country', '') <> ''))[1] AS country,
    (array_agg(c.m->>'tz' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'tz', '') <> ''))[1]           AS tz,
    (array_agg(c.m->>'page' ORDER BY c.created_at) FILTER (
       WHERE c.event IN ('landing_view', 'landing_engaged') AND COALESCE(c.m->>'page', '') <> ''))[1] AS page,
    bool_or(c.event = 'app_opened')       AS opened,
    bool_or(c.event = 'challenge_solved') AS solved
  FROM weeks w JOIN clean c ON c.created_at >= w.ws AND c.created_at < w.we
  GROUP BY w.ws, c.pid
  HAVING bool_or(c.event IN ('landing_view', 'landing_engaged', 'app_opened'))
),
labelled AS (
  SELECT p.ws, p.opened, p.solved,
    CASE
      WHEN p.src = 'search:google'                       THEN 'search:google'
      WHEN p.src = 'search:bing'                         THEN 'search:bing'
      WHEN p.src LIKE 'ai:%' OR p.src ~* '^ref:(.+\.)?meta\.ai$' THEN 'ai'
      WHEN p.src IS NULL                                 THEN 'direct/home'
      ELSE 'other'
    END AS source,
    COALESCE(p.country, tc.country,
             CASE WHEN p.tz = 'UTC' THEN '(UTC)' WHEN p.tz IS NULL THEN '(unknown)' ELSE '(other zone)' END) AS country,
    CASE
      WHEN p.page IS NULL                                THEN '(app only)'
      WHEN p.page ~ '^[a-z0-9-]+-sql-interview$'         THEN 'company'
      WHEN p.page = 'sql-exercises'                      THEN 'sql-exercises'
      WHEN p.page ~ '^(challenges|questions)(/|$)'       THEN 'topic/question'
      WHEN p.page ~ '^blog(/|$)'                         THEN 'blog'
      WHEN p.page = 'home'                               THEN 'home'
      ELSE 'other'
    END AS page_group
  FROM wk_person p LEFT JOIN tz_country tc ON tc.tz = p.tz
),
top_country AS (
  SELECT country FROM labelled GROUP BY country ORDER BY count(*) DESC, country LIMIT 5
)
SELECT to_char(l.ws AT TIME ZONE 'UTC', 'IYYY-"W"IW') AS iso_week, d.dim, d.seg,
       count(*)                             AS people,
       count(*) FILTER (WHERE l.opened)     AS app_openers,
       count(*) FILTER (WHERE l.solved)     AS solvers
FROM labelled l
CROSS JOIN LATERAL (VALUES
  ('source', l.source),
  ('country', CASE WHEN l.country IN (SELECT country FROM top_country) THEN l.country ELSE 'other' END),
  ('page', l.page_group)) AS d(dim, seg)
GROUP BY l.ws, d.dim, d.seg
ORDER BY d.dim, d.seg, l.ws;


-- ===== Query 3: MRR snapshot (now) ======================================
-- users.data holds the live plan (server-owned fields: stripe-webhook writes
-- them). Paying = a monthly or annual plan with a Stripe customer, proExpiry
-- in the future, auto-renew on, not inside a free trial. The amount is the
-- person's last webhook pro_purchase_completed amount_cents (the price they
-- actually pay: regional or older prices), else the list price ($29 / $99).
-- MRR = monthly amounts + annual amounts / 12, in USD. A snapshot, not a
-- series: users.data keeps no history, so each Friday's row is that Friday's.

WITH live AS (
  SELECT u.username,
         u.data->>'proType' AS plan,
         COALESCE(u.data->>'proAutoRenew' = 'true', false) AS renews,
         COALESCE(u.data->>'proTrial' = 'true', false)     AS in_trial,
         u.data ? 'stripeCustomerId'      AS stripe,
         CASE WHEN u.data->>'proExpiry' ~ '^[0-9]+$'
              THEN to_timestamp((u.data->>'proExpiry')::bigint / 1000.0)
              ELSE (u.data->>'proExpiry')::timestamptz END AS expiry
  FROM public.users u
  WHERE u.data->>'proStatus' = 'true'
    AND u.username !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
),
priced AS (
  SELECT l.*,
    COALESCE((SELECT ((e.metadata #>> '{}')::jsonb->>'amount_cents')::numeric
              FROM public.pro_events e
              WHERE e.username = l.username AND e.reason = 'stripe_webhook'
                AND e.event = 'pro_purchase_completed'
              ORDER BY e.created_at DESC LIMIT 1),
             CASE l.plan WHEN 'monthly' THEN 2900 WHEN 'annual' THEN 9900 END) / 100 AS amount_usd
  FROM live l WHERE l.expiry > now()
)
SELECT
  count(*) FILTER (WHERE plan IN ('monthly', 'annual') AND stripe AND renews AND NOT in_trial)                     AS paying_subscribers,
  count(*) FILTER (WHERE plan = 'monthly' AND stripe AND renews AND NOT in_trial)                                  AS monthly,
  count(*) FILTER (WHERE plan = 'annual'  AND stripe AND renews AND NOT in_trial)                                  AS annual,
  round(COALESCE(sum(CASE WHEN plan = 'monthly' THEN amount_usd WHEN plan = 'annual' THEN amount_usd / 12 END)
        FILTER (WHERE plan IN ('monthly', 'annual') AND stripe AND renews AND NOT in_trial), 0), 2)                AS mrr_usd,
  count(*) FILTER (WHERE in_trial)                                                                                 AS in_trial,
  count(*) FILTER (WHERE plan IN ('monthly', 'annual') AND stripe AND NOT renews AND NOT in_trial)                 AS paid_not_renewing,
  count(*) FILTER (WHERE NOT (plan IN ('monthly', 'annual') AND stripe))                                           AS other_live_pro
FROM priced;


-- ===== Query 4: the raw-vs-human gap, by rule ===========================
-- Raw visitors per week split by the FIRST exclusion that removes them
-- (person.excl; NULL = human). The rules are checked in the order listed in
-- the header, so a stamped bot that also has a crawler viewport counts once,
-- as bot_stamp. A rule whose count jumps is a new crawler wave or a broken
-- stamp; one at zero for weeks may be retired.

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
gap AS (
  SELECT v.ws, COALESCE(v.excl, '(human)') AS bucket, count(DISTINCT v.pid) AS people
  FROM visits v GROUP BY 1, 2
)
SELECT to_char(g.ws AT TIME ZONE 'UTC', 'IYYY-"W"IW') AS iso_week, g.bucket, g.people
FROM gap g
ORDER BY g.ws, g.people DESC;
