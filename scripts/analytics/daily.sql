-- scripts/analytics/daily.sql — the analytics lane (AN), 2026-11-23.
--
-- Brief: docs/agent/fleet/AN-analytics.md. Report: docs/reads/analytics-YYYY-MM.md.
-- Each query runs as-is in Supabase MCP `execute_sql` (read-only): no
-- parameters, no temp tables, no writes. Aggregates only: no aid, username or
-- email leaves the database in any column.
--
-- Metrics served (docs/agent/metrics.md):
--   Query 1 -> `segment_funnel` (AN's own read: country / device / landing
--              page -> the funnel, with the brief's flags). Its landing step is
--              the `landing_people` rule and its page key is `content_funnel`'s
--              first-touch page; it adds app-only arrivals as the page
--              '(app only)', cohorts people by entry date (7 = entered in the
--              last 7 days), and adds country and device.
--   Query 2 -> the exclusion audit: how many people each README rule 2
--              filter removed, so a day whose crawler share jumps is visible.
--
-- Funnel steps, each in people (COALESCE(aid, username)), each at or after
-- the person's entry: landed -> opened (app_opened) -> first_run
-- (challenge_first_run) -> first_solve (challenge_solved) -> signup
-- (signup_completed) -> pro_modal (pro_modal_shown) -> checkout_click
-- (pro_plan_clicked | pro_checkout_clicked) -> paid (pro_trial_started |
-- pro_purchase_completed with reason 'stripe_webhook', joined by username:
-- the only money truth).
--
-- Country: `country` on the landing rows once it exists (PR
-- measure/landing-country), else an IANA zone -> country PROXY (tz_country).
-- A zone is not a country: VPNs, travellers and crawlers break it. Drop the
-- proxy for windows that start after `country` is born (metrics.md shared
-- traps, "country").
-- Device: the first `viewport` band (mobile < 768 <= tablet < 1024 <= desktop);
-- landing rows carry a viewport only from 2026-11-22, so before that the
-- landing `ua` decides (iPad/tablet -> tablet, Mobi/iPhone/Android -> mobile).
--
-- Exclusions (fleet README rule 2), by person — one row marks the browser:
-- internal usernames, any `bot` stamp, the crawler viewports, ref:aocr.org,
-- verify-test, the founder's 2026-11-20 checkout tests, and by hand until
-- they are stamped: topic1lang (#246), the UTC landing crawler, the langs=2
-- no-landing group (mobile plan §1a) and, from AN's first read, the
-- Asia/Shanghai scroll reader (landing rows in Asia/Shanghai, never an
-- app_opened: 1,369 single-view "readers" that fire landing_engaged by
-- scrolling, 2026-10-26 -> 11-23).

-- ===== Query 1: segment_funnel ==========================================
-- Flags (the brief's rules, written before the data):
--   n<30      reported, never acted on
--   CONVERTS  page, 28 days, landed -> first_solve >= 1.5 x the median page
--             rate (pages with n >= 30, '(app only)' excluded)
--   DEAD      page, 28 days, >= 100 landed and 0 opened
--   MOVED     country or device, 7-day rate vs its 28-day rate, |z| > 2
--             (z = (p7 - p28) / sqrt(p28 (1 - p28) / n7))

WITH params AS (
  SELECT now() - interval '28 days' AS since28,
         now() - interval '7 days'  AS since7
),
-- IANA zone -> ISO country. A PROXY (VPN, travellers, UTC). Drop it for
-- windows that start after `country` is born on the landing rows (PR
-- measure/landing-country; metrics.md shared traps, "country").
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
ev AS (
  SELECT e.event, e.reason, e.username, e.created_at, (e.metadata #>> '{}')::jsonb AS m
  FROM public.pro_events e, params p
  WHERE e.created_at >= p.since28 AND e.created_at <= now()
),
evp AS (SELECT ev.*, COALESCE(m->>'aid', username) AS pid FROM ev),
-- README rule 2, by person: one row marks the whole browser.
excluded AS (
  SELECT DISTINCT pid FROM evp
  WHERE pid IS NOT NULL AND (
        username ~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
     OR username ~* '^(demo|admin|qa)[0-9]*$'
     OR username ILIKE '%fabletest%'
     OR COALESCE(m->>'bot', '') NOT IN ('', 'false')
     OR m->>'viewport' IN ('tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992')
     OR m->>'landingSrc' = 'ref:aocr.org'
     OR m->>'arrivalSrc' IN ('ref:aocr.org', 'verify-test')
     OR (event = 'pro_modal_shown' AND m->>'reason' = 'email_link'
         AND created_at >= '2026-11-20' AND created_at < '2026-11-21'
         AND username ILIKE 'guest%' AND COALESCE(m->>'solvedCount', '0') = '0'))
),
per AS (   -- per-person facts the hand rules need
  SELECT pid,
         bool_or(event = 'app_opened')                                         AS any_open,
         bool_or(event = 'landing_view')                                       AS any_landing,
         bool_or(event = 'landing_view' AND m->>'tz' = 'UTC')                  AS utc_landing,
         bool_or(reason = 'landing' AND m->>'tz' = 'Asia/Shanghai')            AS cn_landing,
         bool_or(event = 'app_opened' AND m->>'langs' = '2'
                 AND COALESCE(m->>'landingSrc', '') = '')                      AS langs2_open,
         (array_agg(m ORDER BY created_at) FILTER (WHERE event = 'app_opened'))[1] AS first_open_m
  FROM evp WHERE pid IS NOT NULL GROUP BY pid
),
hand_rules AS (   -- crawlers excluded by hand until B2 stamps them
  SELECT pid,
    CASE
      WHEN COALESCE(first_open_m->>'landingSrc', '') = ''
       AND first_open_m->>'arrivalSrc' LIKE 'challenges-%'
       AND first_open_m->>'langs' = '1'                       THEN 'topic1lang'
      WHEN utc_landing AND NOT any_open                       THEN 'utc_landing'
      WHEN cn_landing AND NOT any_open                        THEN 'cn_scroll_reader'
      WHEN langs2_open AND NOT any_landing                    THEN 'langs2_no_landing'
    END AS rule
  FROM per
),
clean AS (
  SELECT e.* FROM evp e
  WHERE e.pid IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM excluded x WHERE x.pid = e.pid)
    AND NOT EXISTS (SELECT 1 FROM hand_rules h WHERE h.pid = e.pid AND h.rule IS NOT NULL)
),
engaged AS (   -- the landing_people rule
  SELECT DISTINCT pid FROM clean
  WHERE event = 'landing_engaged' OR reason IS DISTINCT FROM 'landing'
),
first_landing AS (
  SELECT DISTINCT ON (pid) pid, m->>'page' AS page, created_at AS at
  FROM clean
  WHERE reason = 'landing' AND event IN ('landing_view', 'landing_engaged')
    AND COALESCE(m->>'page', '') <> ''
    AND pid IN (SELECT pid FROM engaged)
  ORDER BY pid, created_at
),
first_open AS (
  SELECT DISTINCT ON (pid) pid, created_at AS at FROM clean
  WHERE event = 'app_opened' ORDER BY pid, created_at
),
entrants AS (   -- landed on a page (landing_people), or opened the app with no landing
  SELECT COALESCE(l.pid, o.pid) AS pid,
         COALESCE(l.page, '(app only)') AS page,
         LEAST(l.at, o.at) AS at
  FROM first_landing l FULL JOIN first_open o ON o.pid = l.pid
),
attrs AS (
  SELECT c.pid,
    (array_agg(c.m->>'tz' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'tz','') <> ''))[1] AS tz,
    (array_agg(c.m->>'country' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'country','') <> ''))[1] AS country,
    (array_agg(c.m->>'viewport' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'viewport','') <> ''))[1] AS viewport,
    (array_agg(c.m->>'ua' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'ua','') <> ''))[1] AS ua
  FROM clean c GROUP BY c.pid
),
identities AS (
  SELECT DISTINCT m->>'aid' AS aid, username FROM clean
  WHERE m->>'aid' IS NOT NULL AND username IS NOT NULL AND username <> 'guest'
),
money AS (   -- stripe_webhook is the only money truth; joined by username
  SELECT i.aid AS pid, min(e.created_at) AS at
  FROM identities i
  JOIN evp e ON e.username = i.username AND e.reason = 'stripe_webhook'
            AND e.event IN ('pro_trial_started', 'pro_purchase_completed')
  GROUP BY i.aid
),
person AS (
  SELECT n.pid, n.page, n.at,
    (n.at >= (SELECT since7 FROM params))                                     AS in7,
    COALESCE(a.country, tc.country, CASE WHEN a.tz = 'UTC' THEN '(UTC)' WHEN a.tz IS NULL THEN '(unknown)' ELSE '(other)' END) AS country,
    CASE
      WHEN a.viewport LIKE 'mobile:%'  THEN 'mobile'
      WHEN a.viewport LIKE 'tablet:%'  THEN 'tablet'
      WHEN a.viewport LIKE 'desktop:%' THEN 'desktop'
      WHEN a.ua ~* 'ipad|tablet'       THEN 'tablet'
      WHEN a.ua ~* 'mobi|iphone|android' THEN 'mobile'
      WHEN a.ua IS NOT NULL            THEN 'desktop'
      ELSE '(unknown)'
    END AS device,
    COALESCE(bool_or(c.event = 'app_opened'), false)                          AS opened,
    COALESCE(bool_or(c.event = 'challenge_first_run'), false)                 AS ran,
    COALESCE(bool_or(c.event = 'challenge_solved'), false)                    AS solved,
    COALESCE(bool_or(c.event = 'signup_completed'), false)                    AS signup,
    COALESCE(bool_or(c.event = 'pro_modal_shown'), false)                     AS modal,
    COALESCE(bool_or(c.event IN ('pro_plan_clicked','pro_checkout_clicked')), false) AS checkout,
    COALESCE(bool_or(mo.at >= n.at), false)                                   AS paid
  FROM entrants n
  LEFT JOIN attrs a ON a.pid = n.pid
  LEFT JOIN tz_country tc ON tc.tz = a.tz
  LEFT JOIN clean c ON c.pid = n.pid AND c.created_at >= n.at
  LEFT JOIN money mo ON mo.pid = n.pid
  GROUP BY n.pid, n.page, n.at, a.country, tc.country, a.tz, a.viewport, a.ua
)
,
win AS (SELECT 28 AS w UNION ALL SELECT 7),
seg AS (
  SELECT w AS win, dim, segment AS seg,
         count(*)                         AS landed,
         count(*) FILTER (WHERE opened)   AS opened,
         count(*) FILTER (WHERE ran)      AS first_run,
         count(*) FILTER (WHERE solved)   AS first_solve,
         count(*) FILTER (WHERE signup)   AS signup,
         count(*) FILTER (WHERE modal)    AS pro_modal,
         count(*) FILTER (WHERE checkout) AS checkout_click,
         count(*) FILTER (WHERE paid)     AS paid
  FROM win
  JOIN person p ON (win.w = 28 OR p.in7)
  CROSS JOIN LATERAL (VALUES ('all', 'all'), ('country', p.country), ('device', p.device), ('page', p.page)) AS d(dim, segment)
  GROUP BY 1, 2, 3
),
med AS (   -- "site median": median landed->first-solve rate over pages with n >= 30, 28 days
  SELECT (percentile_cont(0.5) WITHIN GROUP (ORDER BY first_solve::numeric / landed))::numeric AS m
  FROM seg WHERE win = 28 AND dim = 'page' AND seg <> '(app only)' AND landed >= 30
)
SELECT s.*,
       round(100.0 * s.first_solve / s.landed, 1)                           AS solve_pct,
       round(100.0 * (SELECT m FROM med), 1)                                AS page_median_pct,
       round((s.first_solve::numeric / s.landed - s28.first_solve::numeric / s28.landed)
             / NULLIF(sqrt((s28.first_solve::numeric / s28.landed)
                           * (1 - s28.first_solve::numeric / s28.landed) / s.landed), 0), 2) AS z_7v28,
       CASE
         WHEN s.dim = 'page' AND s.win = 28 AND s.seg <> '(app only)'
              AND s.landed >= 100 AND s.opened = 0                          THEN 'DEAD'
         WHEN s.landed < 30                                                 THEN 'n<30'
         WHEN s.dim = 'page' AND s.win = 28 AND s.seg <> '(app only)'
              AND s.first_solve::numeric / s.landed >= 1.5 * (SELECT m FROM med) THEN 'CONVERTS'
         WHEN s.win = 7 AND s.dim IN ('country', 'device')
              AND abs((s.first_solve::numeric / s.landed - s28.first_solve::numeric / s28.landed)
                      / NULLIF(sqrt((s28.first_solve::numeric / s28.landed)
                                    * (1 - s28.first_solve::numeric / s28.landed) / s.landed), 0)) > 2
                                                                            THEN 'MOVED'
       END AS flag
FROM seg s
LEFT JOIN seg s28 ON s.win = 7 AND s28.win = 28 AND s28.dim = s.dim AND s28.seg = s.seg
WHERE s.dim IN ('all', 'device') OR s.landed >= 8
ORDER BY s.win DESC, s.dim, s.landed DESC;


-- ===== Query 2: exclusion audit ========================================
-- People (28 days) per filter. A hand rule's count rising means a crawler is
-- growing; a new bucket of 0-solve people belongs in README rule 2 (C8's PR).
WITH params AS (
  SELECT now() - interval '28 days' AS since28,
         now() - interval '7 days'  AS since7
),
-- IANA zone -> ISO country. A PROXY (VPN, travellers, UTC). Drop it for
-- windows that start after `country` is born on the landing rows (PR
-- measure/landing-country; metrics.md shared traps, "country").
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
ev AS (
  SELECT e.event, e.reason, e.username, e.created_at, (e.metadata #>> '{}')::jsonb AS m
  FROM public.pro_events e, params p
  WHERE e.created_at >= p.since28 AND e.created_at <= now()
),
evp AS (SELECT ev.*, COALESCE(m->>'aid', username) AS pid FROM ev),
-- README rule 2, by person: one row marks the whole browser.
excluded AS (
  SELECT DISTINCT pid FROM evp
  WHERE pid IS NOT NULL AND (
        username ~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
     OR username ~* '^(demo|admin|qa)[0-9]*$'
     OR username ILIKE '%fabletest%'
     OR COALESCE(m->>'bot', '') NOT IN ('', 'false')
     OR m->>'viewport' IN ('tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992')
     OR m->>'landingSrc' = 'ref:aocr.org'
     OR m->>'arrivalSrc' IN ('ref:aocr.org', 'verify-test')
     OR (event = 'pro_modal_shown' AND m->>'reason' = 'email_link'
         AND created_at >= '2026-11-20' AND created_at < '2026-11-21'
         AND username ILIKE 'guest%' AND COALESCE(m->>'solvedCount', '0') = '0'))
),
per AS (   -- per-person facts the hand rules need
  SELECT pid,
         bool_or(event = 'app_opened')                                         AS any_open,
         bool_or(event = 'landing_view')                                       AS any_landing,
         bool_or(event = 'landing_view' AND m->>'tz' = 'UTC')                  AS utc_landing,
         bool_or(reason = 'landing' AND m->>'tz' = 'Asia/Shanghai')            AS cn_landing,
         bool_or(event = 'app_opened' AND m->>'langs' = '2'
                 AND COALESCE(m->>'landingSrc', '') = '')                      AS langs2_open,
         (array_agg(m ORDER BY created_at) FILTER (WHERE event = 'app_opened'))[1] AS first_open_m
  FROM evp WHERE pid IS NOT NULL GROUP BY pid
),
hand_rules AS (   -- crawlers excluded by hand until B2 stamps them
  SELECT pid,
    CASE
      WHEN COALESCE(first_open_m->>'landingSrc', '') = ''
       AND first_open_m->>'arrivalSrc' LIKE 'challenges-%'
       AND first_open_m->>'langs' = '1'                       THEN 'topic1lang'
      WHEN utc_landing AND NOT any_open                       THEN 'utc_landing'
      WHEN cn_landing AND NOT any_open                        THEN 'cn_scroll_reader'
      WHEN langs2_open AND NOT any_landing                    THEN 'langs2_no_landing'
    END AS rule
  FROM per
),
clean AS (
  SELECT e.* FROM evp e
  WHERE e.pid IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM excluded x WHERE x.pid = e.pid)
    AND NOT EXISTS (SELECT 1 FROM hand_rules h WHERE h.pid = e.pid AND h.rule IS NOT NULL)
),
engaged AS (   -- the landing_people rule
  SELECT DISTINCT pid FROM clean
  WHERE event = 'landing_engaged' OR reason IS DISTINCT FROM 'landing'
),
first_landing AS (
  SELECT DISTINCT ON (pid) pid, m->>'page' AS page, created_at AS at
  FROM clean
  WHERE reason = 'landing' AND event IN ('landing_view', 'landing_engaged')
    AND COALESCE(m->>'page', '') <> ''
    AND pid IN (SELECT pid FROM engaged)
  ORDER BY pid, created_at
),
first_open AS (
  SELECT DISTINCT ON (pid) pid, created_at AS at FROM clean
  WHERE event = 'app_opened' ORDER BY pid, created_at
),
entrants AS (   -- landed on a page (landing_people), or opened the app with no landing
  SELECT COALESCE(l.pid, o.pid) AS pid,
         COALESCE(l.page, '(app only)') AS page,
         LEAST(l.at, o.at) AS at
  FROM first_landing l FULL JOIN first_open o ON o.pid = l.pid
),
attrs AS (
  SELECT c.pid,
    (array_agg(c.m->>'tz' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'tz','') <> ''))[1] AS tz,
    (array_agg(c.m->>'country' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'country','') <> ''))[1] AS country,
    (array_agg(c.m->>'viewport' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'viewport','') <> ''))[1] AS viewport,
    (array_agg(c.m->>'ua' ORDER BY c.created_at) FILTER (WHERE COALESCE(c.m->>'ua','') <> ''))[1] AS ua
  FROM clean c GROUP BY c.pid
),
identities AS (
  SELECT DISTINCT m->>'aid' AS aid, username FROM clean
  WHERE m->>'aid' IS NOT NULL AND username IS NOT NULL AND username <> 'guest'
),
money AS (   -- stripe_webhook is the only money truth; joined by username
  SELECT i.aid AS pid, min(e.created_at) AS at
  FROM identities i
  JOIN evp e ON e.username = i.username AND e.reason = 'stripe_webhook'
            AND e.event IN ('pro_trial_started', 'pro_purchase_completed')
  GROUP BY i.aid
),
person AS (
  SELECT n.pid, n.page, n.at,
    (n.at >= (SELECT since7 FROM params))                                     AS in7,
    COALESCE(a.country, tc.country, CASE WHEN a.tz = 'UTC' THEN '(UTC)' WHEN a.tz IS NULL THEN '(unknown)' ELSE '(other)' END) AS country,
    CASE
      WHEN a.viewport LIKE 'mobile:%'  THEN 'mobile'
      WHEN a.viewport LIKE 'tablet:%'  THEN 'tablet'
      WHEN a.viewport LIKE 'desktop:%' THEN 'desktop'
      WHEN a.ua ~* 'ipad|tablet'       THEN 'tablet'
      WHEN a.ua ~* 'mobi|iphone|android' THEN 'mobile'
      WHEN a.ua IS NOT NULL            THEN 'desktop'
      ELSE '(unknown)'
    END AS device,
    COALESCE(bool_or(c.event = 'app_opened'), false)                          AS opened,
    COALESCE(bool_or(c.event = 'challenge_first_run'), false)                 AS ran,
    COALESCE(bool_or(c.event = 'challenge_solved'), false)                    AS solved,
    COALESCE(bool_or(c.event = 'signup_completed'), false)                    AS signup,
    COALESCE(bool_or(c.event = 'pro_modal_shown'), false)                     AS modal,
    COALESCE(bool_or(c.event IN ('pro_plan_clicked','pro_checkout_clicked')), false) AS checkout,
    COALESCE(bool_or(mo.at >= n.at), false)                                   AS paid
  FROM entrants n
  LEFT JOIN attrs a ON a.pid = n.pid
  LEFT JOIN tz_country tc ON tc.tz = a.tz
  LEFT JOIN clean c ON c.pid = n.pid AND c.created_at >= n.at
  LEFT JOIN money mo ON mo.pid = n.pid
  GROUP BY n.pid, n.page, n.at, a.country, tc.country, a.tz, a.viewport, a.ua
)

SELECT COALESCE(h.rule, CASE WHEN x.pid IS NOT NULL THEN 'rule2_stamp_or_internal' END, 'kept') AS bucket,
       count(*) AS people
FROM per p
LEFT JOIN hand_rules h USING (pid)
LEFT JOIN excluded x USING (pid)
GROUP BY 1
ORDER BY 2 DESC;
