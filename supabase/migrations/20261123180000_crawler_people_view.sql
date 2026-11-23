-- public.crawler_people: every browser id (aid) a known crawler rule takes,
-- stamped at the source or matched by hand, so a read excludes crawlers with
-- one anti-join instead of a list of predicates (2026-11-23, B2).
--
--   ... AND NOT EXISTS (SELECT 1 FROM public.crawler_people c
--                       WHERE c.aid = (metadata #>> '{}')::jsonb->>'aid')
--
-- Rules and their reads: docs/agent/metrics.md, "Trap: three crawlers
-- stamped at the source". The stamps (src/utils/bot-signals.js,
-- src/track.js) cover rows written after the deploy; the hand rules here
-- cover the rows before it, and two behavioural rules (a no-source
-- Asia/Shanghai lander, and a UTC lander from 2026-11-22, who never opens
-- the app) that no client can decide at landing time.
--
-- Keyed on aid only, never COALESCE(aid, username): an aid-less row is the
-- literal 'guest' or a real username, and one crawler row would take them.
-- Columns: aid, first_seen, rules. No username, email or page.
--
-- Measured 2026-11-23 over all of pro_events: 7,142 aids, 0 of whom ran a
-- query, solved, signed up or clicked checkout. 24 saw the Pro modal; every
-- one of them opened it by arriving on a mock link (reason pattern_mock), or
-- is a window-size fingerprint the app already stamps.
--
-- security_invoker: the reader's own rights on pro_events. Not for anon or
-- authenticated (the key in every browser); service role and metrics_reader.
--
-- The founder applies it: supabase db query --linked -f <this file>
-- Rollback: supabase/manual/20261123_crawler_people_rollback.sql
begin;

create or replace view public.crawler_people with (security_invoker = true) as
-- crawler_people:begin
WITH evp AS (
  SELECT event, reason, created_at,
         (metadata #>> '{}')::jsonb AS m,
         (metadata #>> '{}')::jsonb->>'aid' AS pid
  FROM public.pro_events
),
app_openers AS (
  SELECT DISTINCT pid FROM evp WHERE event = 'app_opened' AND pid IS NOT NULL
),
landers AS (
  SELECT DISTINCT pid FROM evp WHERE reason = 'landing' AND pid IS NOT NULL
),
first_open AS (
  SELECT DISTINCT ON (pid) pid, created_at, m
  FROM evp
  WHERE event = 'app_opened' AND pid IS NOT NULL
  ORDER BY pid, created_at
),
hits AS (
  -- 1. Stamped at the source (app from 2026-10-07, landing from 2026-11-22).
  SELECT pid, created_at, 'stamp:' || (m->>'bot') AS rule
  FROM evp WHERE COALESCE(m->>'bot', '') NOT IN ('', 'false')
  UNION ALL
  -- 2. Window sizes no person has ever used, before their stamps deployed.
  SELECT pid, created_at, 'viewport:' || (m->>'viewport')
  FROM evp WHERE m->>'viewport' IN ('tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992', 'desktop:1600x1200')
  UNION ALL
  -- 3. Referrer spam (refspam).
  SELECT pid, created_at, 'refspam'
  FROM evp WHERE COALESCE(m->>'landingSrc', '') ~* '^ref:(.+\.)?aocr\.org$'
  UNION ALL
  -- 4. staleua on landing rows (`ua` from 2026-09-15): Chrome < 126,
  --    Firefox < 110, iOS < 13, Android < 7.
  SELECT pid, created_at, 'staleua'
  FROM evp
  WHERE reason = 'landing'
    AND (   COALESCE(substring(m->>'ua' from 'Chrome/(\d+)')::int, 999) < 126
         OR COALESCE(substring(m->>'ua' from 'Firefox/(\d+)')::int, 999) < 110
         OR COALESCE(substring(m->>'ua' from 'iPhone OS (\d+)_')::int, 999) < 13
         OR COALESCE(substring(m->>'ua' from 'Android (\d+)')::int, 999) < 7)
  UNION ALL
  -- 5. uamismatch on landing rows: a phone's agent in a desktop window.
  SELECT pid, created_at, 'uamismatch'
  FROM evp
  WHERE reason = 'landing'
    AND m->>'viewport' LIKE 'desktop:%'
    AND COALESCE(m->>'ua', '') !~ 'iPad'
    AND (m->>'ua' ~ 'iPhone|iPod' OR (m->>'ua' ~ 'Android' AND m->>'ua' ~ 'Mobile'))
  UNION ALL
  -- 6. topic1lang (#246), on the first app_opened.
  SELECT pid, created_at, 'topic1lang'
  FROM first_open
  WHERE COALESCE(m->>'arrivalSrc', '') LIKE 'challenges-%'
    AND COALESCE(m->>'landingSrc', '') = ''
    AND m->>'langs' = '1'
  UNION ALL
  -- 7. langs2nolv, on the first app_opened: no landing row ever stands in
  --    for "no aid before the app loaded".
  SELECT f.pid, f.created_at, 'langs2nolv'
  FROM first_open f
  WHERE f.m->>'langs' = '2'
    AND COALESCE(f.m->>'landingSrc', '') = ''
    AND COALESCE(f.m->>'arrivalSrc', '') NOT IN ('', 'home')
    AND f.m->>'tz' IN ('Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Singapore', 'America/Los_Angeles', 'America/Mexico_City', 'Etc/Unknown')
    AND NOT EXISTS (SELECT 1 FROM landers l WHERE l.pid = f.pid)
  UNION ALL
  -- 8. The Asia/Shanghai lander with no source who never opens the app
  --    (2026-10-26 on). Behavioural on purpose: at landing time it cannot
  --    be told from a reader in that zone, so a person who opened the app is
  --    kept whatever the zone.
  SELECT e.pid, e.created_at, 'cn_nosrc_lander'
  FROM evp e
  WHERE e.reason = 'landing'
    AND e.m->>'tz' = 'Asia/Shanghai'
    AND COALESCE(e.m->>'landingSrc', '') = ''
    AND NOT EXISTS (SELECT 1 FROM app_openers o WHERE o.pid = e.pid)
  UNION ALL
  -- 9. The UTC landing wave (from 2026-11-22): a UTC lander who never opens
  --    the app. The stamps (vp1600x1200, staleua, uamismatch) take most of it
  --    at the source; this takes the rest and the rows before the deploy.
  SELECT e.pid, e.created_at, 'utc_lander'
  FROM evp e
  WHERE e.reason = 'landing'
    AND e.m->>'tz' = 'UTC'
    AND e.created_at >= '2026-11-22'
    AND NOT EXISTS (SELECT 1 FROM app_openers o WHERE o.pid = e.pid)
)
SELECT pid AS aid,
       min(created_at) AS first_seen,
       array_agg(DISTINCT rule ORDER BY rule) AS rules
FROM hits
WHERE pid IS NOT NULL
GROUP BY pid
-- crawler_people:end
;

revoke all on public.crawler_people from public, anon, authenticated;
grant select on public.crawler_people to service_role;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'metrics_reader') then
    grant select on public.crawler_people to metrics_reader;
  end if;
end $$;

comment on view public.crawler_people is
  'Browser ids (aid) a known crawler rule takes: stamped metadata.bot, the never-human window sizes, refspam, staleua, uamismatch, topic1lang, langs2nolv, and the no-source Asia/Shanghai and UTC (from 2026-11-22) landers who never open the app. Exclude with NOT EXISTS on aid. docs/agent/metrics.md.';

commit;
