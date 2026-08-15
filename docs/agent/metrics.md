# Metric registry

The verifier can only check a metric that is defined here. A PR that names a
metric missing from this file is reported as `UNDEFINED` in the ledger rather
than guessed at — a number the agent invented on the spot is worse than no
number, because it reads exactly like a measured one.

Adding a metric means adding its SQL. If you cannot write the SQL, you cannot
claim the change moved it.

---

## Shared filters

Every query below excludes internal and non-arm's-length accounts:

```sql
username !~* '^(test|demo|admin|qa)[0-9]*$'
AND username <> 'sqlquest'
AND username NOT ILIKE '%fabletest%'
AND username NOT ILIKE 'linktest%'
AND username NOT ILIKE 'internalroutine%'
AND username <> 'elena'          -- personal contact of the founder's
```

And two standing traps:

- `pro_events.metadata` is double-encoded. Read it as
  `((metadata #>> '{}')::jsonb)->>'key'`.
- **Check when an event was born before comparing windows.**
  `SELECT event, min(created_at) FROM pro_events GROUP BY 1`. A metric that
  jumped because the event shipped mid-window is not a result.

---

## `challenge_solve_through`

Of the people who opened a challenge, how many solved it. The content-quality
metric. Parameterised by challenge id.

Both events must share a window: `challenge_solved` starts 2026-06-30 but
`challenge_opened` only 2026-07-17, so an all-time ratio credits 17 days of
solves against zero opens and can exceed 100%.

```sql
WITH ev AS (
  SELECT username, event, ((metadata #>> '{}')::jsonb)->>'challengeId' AS cid
  FROM pro_events
  WHERE created_at >= :since            -- never earlier than 2026-07-18
    AND event IN ('challenge_opened','challenge_solved')
    AND <shared filters>
),
opened AS (SELECT DISTINCT username, cid FROM ev WHERE event='challenge_opened'),
solved AS (SELECT DISTINCT username, cid FROM ev WHERE event='challenge_solved')
SELECT o.cid,
       count(*)                                              AS openers,
       count(s.username)                                     AS solvers,
       round(100.0*count(s.username)/count(*), 0)            AS solve_through_pct
FROM opened o LEFT JOIN solved s USING (username, cid)
WHERE o.cid = :challenge_id
GROUP BY 1;
```

**Read within a difficulty band.** An Easy at 43% is a worse result than a Hard
at 90%.

## `first_contact_share`

Of everyone whose first-ever challenge was X, what share of all first-contacts
did X take. Answers "is this challenge still the front door?" — which is
readable even when solve-through is confounded by a simultaneous copy change.

```sql
SELECT ((metadata #>> '{}')::jsonb)->>'challengeId' AS cid,
       count(*) AS first_contacts,
       round(100.0*count(*)/sum(count(*)) OVER (), 1) AS share_pct
FROM pro_events
WHERE event = 'first_challenge_started' AND created_at >= :since
  AND <shared filters>
GROUP BY 1 ORDER BY first_contacts DESC;
```

## `weekly_engaged`

The north star. Distinct users with 5+ lifetime solves who were active in the
window.

```sql
WITH real_users AS (
  SELECT username,
         COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(data->'solvedChallenges')='array'
           THEN data->'solvedChallenges' ELSE '[]'::jsonb END),0) AS solves
  FROM users WHERE <shared filters>
)
SELECT count(DISTINCT e.username) AS weekly_engaged
FROM pro_events e JOIN real_users r ON r.username = e.username
WHERE r.solves >= 5 AND e.created_at >= now() - interval '7 days';
```

## `engaged_never_asked`

Engaged users who have never seen the Pro offer. The stated constraint since
July; lower is better.

```sql
WITH real_users AS ( ... solves >= 5 ... ),
asked AS (SELECT DISTINCT username FROM pro_events WHERE event='pro_modal_shown')
SELECT count(*) AS engaged_never_asked
FROM real_users r LEFT JOIN asked a USING (username)
WHERE a.username IS NULL;
```

## `first_run_start_writing_rate`

Of first-run users who saw the challenge card, how many pressed
**Start writing →**. Measures the 2026-08-07 layout fix directly.

```sql
WITH shown AS (
  SELECT DISTINCT username FROM pro_events
  WHERE event='first_challenge_started' AND created_at >= :since AND <shared filters>
),
pressed AS (
  SELECT DISTINCT username FROM pro_events
  WHERE event='first_run_start_writing' AND created_at >= :since
)
SELECT count(*) AS shown,
       count(p.username) AS pressed,
       round(100.0*count(p.username)/nullif(count(*),0),0) AS press_pct
FROM shown s LEFT JOIN pressed p USING (username);
```

Event born **2026-08-07**. Any window starting before that reads as zero for
structural reasons, not behavioural ones.

## `mobile_give_up_rate`

Share of `challenge_opened` events on mobile that produced no further event from
that user. The question that was unanswerable before `viewport` was stamped.

```sql
-- viewport is stamped as '<band>:<w>x<h>', band in (mobile|tablet|desktop)
SELECT split_part(((metadata #>> '{}')::jsonb)->>'viewport', ':', 1) AS band,
       count(*) AS opens,
       count(*) FILTER (WHERE NOT EXISTS (
         SELECT 1 FROM pro_events n
          WHERE n.username = pro_events.username AND n.created_at > pro_events.created_at
       )) AS dead_ends
FROM pro_events
WHERE event='challenge_opened' AND created_at >= :since AND <shared filters>
GROUP BY 1;
```

Event stamp born **2026-08-07**. Rows before that carry no viewport and must be
excluded, not counted as unknown.

## `offer_dwell_seconds`

How long the Pro modal stays open before it is dismissed. The question "is the
price wrong?" cannot be asked until this is long enough to have read the price.

Pair each show with the NEXT dismiss by the same user, bounded. An unbounded
`min(dismissed_at) >= shown_at` picks up a dismiss from a later, unrelated modal
and reported a 1184-second average where the real median was 4 (2026-08-14).

```sql
WITH shows AS (
  SELECT username, created_at AS shown_at,
         ((metadata #>> '{}')::jsonb)->>'reason' AS reason
  FROM pro_events WHERE event='pro_modal_shown' AND created_at >= :since AND <shared filters>
), paired AS (
  SELECT s.*, (SELECT min(d.created_at) FROM pro_events d
                WHERE d.username = s.username AND d.event='modal_dismissed'
                  AND d.created_at >= s.shown_at
                  AND d.created_at <= s.shown_at + interval '30 minutes') AS dismissed_at
  FROM shows s
)
SELECT reason, count(*) AS shows,
       round(percentile_cont(0.5) WITHIN GROUP (
         ORDER BY EXTRACT(epoch FROM (dismissed_at - shown_at))))::int AS median_dwell_secs
FROM paired GROUP BY 1;
```

## `plan_click_rate`

Of people shown the offer, how many pressed a plan button.

Use `pro_plan_clicked` (born **2026-08-14**), not `pro_checkout_clicked`. The
latter fires inside `launchCheckout`, which is only reached when an email is
already on file — so it misses every guest who clicks a plan and meets the
email form instead. Before 2026-08-14 that population is simply invisible; do
not read its absence as absence of clicks.

```sql
SELECT count(DISTINCT username) FILTER (WHERE event='pro_modal_shown')   AS shown,
       count(DISTINCT username) FILTER (WHERE event='pro_plan_clicked')  AS clicked
FROM pro_events WHERE created_at >= :since AND <shared filters>;
```
