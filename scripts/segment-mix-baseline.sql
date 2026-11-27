-- scripts/segment-mix-baseline.sql — `segment_mix`'s baseline (2026-11-27):
-- the canonical segment (src/utils/segment.js) RE-DERIVED from events that
-- existed before the `seg` stamp, for the humans with an app_opened in the
-- 30 days 2026-10-28 → 11-27. Approximate by construction: the first-open
-- profile is read from arrivalSrc, the Coach goal from users.data and
-- goal_selected, and the stated intent from the latest `intent` on a row or
-- users.data.intent. From 2026-11-27 read the stamp instead
-- (scripts/scorecard-weekly.sql Query 5, seg_kind = 'latest').
-- Read-only; aggregates only. Run with SET enable_nestloop = off first.
-- Human filter: scripts/scorecard-weekly.sql's exclusion block (the
-- landing-only rules cannot match an app opener and are left out).

WITH params AS (SELECT timestamptz '2026-11-27 00:00+00' AS t, timestamptz '2026-10-28 00:00+00' AS t0),
opened AS MATERIALIZED (
  SELECT DISTINCT COALESCE(((e.metadata #>> '{}')::jsonb)->>'aid', e.username) AS pid
  FROM public.pro_events e
  WHERE e.event = 'app_opened' AND e.created_at >= (SELECT t0 FROM params) AND e.created_at < (SELECT t FROM params)
),
evp AS MATERIALIZED (
  SELECT e.event, e.reason, e.username, e.created_at, x.m, COALESCE(x.m->>'aid', e.username) AS pid
  FROM public.pro_events e
  CROSS JOIN LATERAL (SELECT (e.metadata #>> '{}')::jsonb AS m) x
  WHERE e.created_at < (SELECT t FROM params)
    AND COALESCE(x.m->>'aid', e.username) IN (SELECT pid FROM opened)
),
facts AS (
  SELECT pid,
    bool_or(COALESCE(username, '') ~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)') AS f_internal,
    bool_or(m->>'aid' IN ('363dfb2bc1314757acc88c8438c4d2ea') OR m->>'aid' LIKE 'e5fcbad1a022%' OR m->>'aid' LIKE 'a2a2%'
            OR m->>'aid' = 'd9fe96e2bdf44aefa9195673a6496888'
            OR (event = 'pro_modal_shown' AND m->>'reason' = 'email_link' AND created_at >= '2026-11-20' AND created_at < '2026-11-21'
                AND username ILIKE 'guest%' AND COALESCE(m->>'solvedCount', '0') = '0')
            OR (m->>'tz' = 'Europe/Istanbul' AND m->>'viewport' = 'mobile:375x812'
                AND created_at >= '2026-11-24 11:00+00' AND created_at < '2026-11-24 11:08+00')) AS f_founder,
    bool_or(COALESCE(m->>'bot', '') NOT IN ('', 'false') OR m->>'wd' = 'true' OR m->>'uaBot' = 'true') AS f_stamp,
    bool_or(m->>'viewport' IN ('tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992', 'desktop:1024x1024')) AS f_viewport,
    bool_or(COALESCE(m->>'landingSrc', '') ~* '^ref:(.+\.)?aocr\.org$' OR COALESCE(m->>'arrivalSrc', '') ~* 'aocr\.org' OR m->>'arrivalSrc' = 'verify-test') AS f_ref,
    bool_or(event = 'landing_view') AS any_landing,
    bool_or(event = 'app_opened' AND m->>'langs' = '2' AND COALESCE(m->>'landingSrc', '') = '') AS langs2_open,
    (array_agg(m ORDER BY created_at) FILTER (WHERE event = 'app_opened'))[1] AS fo
  FROM evp GROUP BY pid
),
human AS MATERIALIZED (
  SELECT pid FROM facts WHERE NOT (f_internal OR f_founder OR f_stamp OR f_viewport OR f_ref
    OR (COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1' AND NOT any_landing)
    OR (COALESCE(fo->>'landingSrc', '') = '' AND fo->>'langs' = '1' AND fo->>'arrivalSrc' LIKE 'challenges-%')
    OR (COALESCE(fo->>'landingSrc', '') = '' AND fo->>'tz' = 'America/Los_Angeles' AND fo->>'viewport' = 'desktop:1920x1080')
    OR (fo->>'tz' = 'UTC' AND fo->>'viewport' = 'desktop:1280x720' AND NOT any_landing)
    OR (COALESCE(fo->>'landingSrc', '') = '' AND NOT any_landing AND fo->>'tz' IN ('Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Singapore'))
    OR (langs2_open AND NOT any_landing))
),
clean AS MATERIALIZED (SELECT e.* FROM evp e JOIN human h USING (pid)),
unames AS (SELECT DISTINCT pid, username FROM clean WHERE username IS NOT NULL AND username <> 'guest'),
ud AS (   -- users.data through every username the person's rows carried (the #409 bridge)
  SELECT u.pid,
    bool_or(COALESCE(us.data->'prepTarget'->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' AND (us.data->'prepTarget'->>'date')::date >= date '2026-11-27') AS dated,
    bool_or(COALESCE(us.data->'prepTarget'->>'company', '') <> '') AS pt_company,
    max(COALESCE(us.data->'intent'->>'goal', CASE WHEN jsonb_typeof(us.data->'intent') = 'string' THEN us.data->>'intent' END)) AS u_intent,
    bool_or(us.data->'coachState'->>'goalId' = 'interview-prep') AS g_interview,
    bool_or(us.data->'coachState'->>'goalId' = 'analyst-day-one') AS g_dayone,
    bool_or(us.data->'coachState'->>'goalId' = 'fundamentals') AS g_fund
  FROM unames u JOIN public.users us ON us.username = u.username GROUP BY u.pid
),
li AS (   -- the latest stated intent on the person's rows
  SELECT DISTINCT ON (pid) pid, m->>'intent' AS intent
  FROM clean WHERE m->>'intent' IN ('interview', 'job_ready', 'learning', 'exploring', 'hired', 'at_work')
  ORDER BY pid, created_at DESC
),
sg AS (   -- the doors (the profile's interview-target signals) and the goal picks
  SELECT pid,
    bool_or(m->>'arrivalSrc' ~ '-sql-interview$' OR m->>'arrivalSrc' ~ '^company:' OR m->>'arrivalSrc' = 'blog-capital-one'
         OR (event = 'intent_captured' AND COALESCE(m->>'company', '') <> '') OR event = 'company_direct_assigned'
         OR (event = 'interview_started' AND COALESCE(m->>'company', 'General') NOT IN ('General', ''))) AS co,
    bool_or(m->>'arrivalSrc' = 'readiness' OR event IN ('readiness_arrived', 'readiness_completed')) AS rd,
    bool_or(event = 'goal_selected' AND m->>'goalId' = 'interview-prep') AS e_ginterview,
    bool_or(event = 'goal_selected' AND m->>'goalId' = 'analyst-day-one') AS e_gdayone,
    bool_or(event = 'goal_selected' AND m->>'goalId' = 'fundamentals') AS e_gfund
  FROM clean GROUP BY pid
),
seg AS (   -- segmentOf's rules, in its order
  SELECT h.pid,
    CASE
      WHEN COALESCE(li.intent, ud.u_intent) = 'hired' THEN 'at_work'
      WHEN ud.dated THEN 'interview_dated'
      WHEN ud.pt_company OR sg.co THEN 'interview_company'
      WHEN COALESCE(li.intent, ud.u_intent) = 'interview' OR ud.g_interview OR sg.e_ginterview OR sg.rd THEN 'interview_general'
      WHEN COALESCE(li.intent, ud.u_intent) = 'at_work' THEN 'at_work'
      WHEN COALESCE(li.intent, ud.u_intent) = 'job_ready' THEN 'job_ready'
      WHEN COALESCE(li.intent, ud.u_intent) = 'learning' THEN 'learner'
      WHEN ud.g_dayone OR sg.e_gdayone THEN 'job_ready'
      WHEN ud.g_fund OR sg.e_gfund THEN 'learner'
      ELSE 'unknown' END AS seg
  FROM human h LEFT JOIN ud USING (pid) LEFT JOIN li USING (pid) LEFT JOIN sg USING (pid)
)
SELECT seg, count(*) AS people, round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM seg GROUP BY seg ORDER BY people DESC;
