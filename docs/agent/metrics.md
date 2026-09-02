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
- **Local traffic before 2026-09-03 is in the data.** Until the localhost
  guard shipped (`ANALYTICS_MUTED` in app.jsx, the same test in track.js),
  smoke runs and browser QA against localhost wrote real rows with a fresh
  `aid` per run — tz `Europe/Istanbul`, `arrivalSrc` null, odd viewports
  (400x400, 756x469). Order of magnitude ~5 people/week, all inside the
  `(none)` door; the ledger's static contaminated-aid list cannot cover it.
  From 09-03 on, localhost sends nothing.
- **`landing_view` for the homepage is born 2026-09-03.** The static-page
  injector skipped any page whose HTML contained the string "/track.js" —
  and `src/index.html`, `after-the-sql-course`, `after-bootcamp` and
  `sql-for-the-ai-era` all mention it in a comment. So the four main landing
  pages never wrote a `landing_view` or a `[data-track]` click; every
  landing number before 09-03 is hub/company/blog pages only. Any
  "landing traffic jumped" read across that date is the fix, not growth.
  Split by `page` (`home`, `after-the-sql-course`, …) to compare like with
  like.

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

## `first_contact_activation`

Of everyone whose first-ever challenge was X, what share went on to a first
solve (any challenge). People, not events; each person counted once at their
earliest `first_challenge_started`. Read it per first-contact challenge —
the overall rate is a traffic-mix average and moves when the mix does.

```sql
WITH f AS (
  SELECT event, created_at,
         ((metadata #>> '{}')::jsonb)->>'challengeId' AS cid,
         COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username) AS pid
  FROM pro_events
  WHERE event IN ('first_challenge_started','first_challenge_solved')
    AND created_at >= :since AND <shared filters>
),
starts AS (SELECT DISTINCT ON (pid) pid, cid FROM f
           WHERE event='first_challenge_started' ORDER BY pid, created_at),
solved AS (SELECT DISTINCT pid FROM f WHERE event='first_challenge_solved')
SELECT s.cid AS first_contact, count(*) AS first_contacts,
       round(100.0*count(*)/sum(count(*)) OVER (),1)    AS share_pct,
       round(100.0*count(v.pid)/count(*),1)            AS activation_pct
FROM starts s LEFT JOIN solved v USING (pid)
GROUP BY 1 ORDER BY 2 DESC;
```

**The seat trap, measured 2026-09-02.** The same challenge reads very
differently as the front door and as step 2: 99 was 85% solve-through as a
later step (08-06) and 47% as the 'working' opener (28-day read, n=221);
100 was 27% as the opener and 77% once demoted. Comparing a challenge's
solve-through in one seat to another challenge's in a different seat is not
a comparison. Compare openers to openers.

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

## `lock_reach_rate`

How many people collide with a paid wall, by surface. Event
`content_lock_reached`, born **2026-08-15** — before that date the surfaces
were entirely dark and their absence means nothing.

```sql
SELECT ((metadata #>> '{}')::jsonb)->>'surface'      AS surface,
       ((metadata #>> '{}')::jsonb)->>'wall'         AS wall,
       count(*)                                      AS hits,
       count(DISTINCT username)                      AS people,
       count(*) FILTER (WHERE ((metadata #>> '{}')::jsonb)->>'companyFilter' IS NOT NULL) AS in_company_context
FROM pro_events
WHERE event = 'content_lock_reached' AND created_at >= :since AND <shared filters>
GROUP BY 1, 2 ORDER BY hits DESC;
```

## `targeted_lock_share`

The one that decides the packaging question. Of the people who hit a wall, what
share hit it **on the skill their own radar says is weakest**, or inside a
company context — i.e. at a moment of specific want rather than while wandering.

A high share says the wall is landing where intent is, and the axis is worth
selling. A low share says people are bumping into walls at random, and moving
the wall will not help until something leads them to it.

```sql
SELECT count(*)                                                                    AS hits,
       count(*) FILTER (WHERE ((metadata #>> '{}')::jsonb)->>'companyFilter' IS NOT NULL) AS company_context,
       count(*) FILTER (WHERE ((metadata #>> '{}')::jsonb)->>'category'
                          =   ((metadata #>> '{}')::jsonb)->>'weakestSkill')       AS on_weakest_skill
FROM pro_events
WHERE event = 'content_lock_reached' AND created_at >= :since AND <shared filters>;
```

`category` is the challenge's own tag and `weakestSkill` is a canonical radar
name, so exact equality under-counts — resolve through `SKILL_TO_RADAR` before
trusting the number, or read it as a floor.

## `manage_subscription_clicked`

Pro users who looked for the door. Event born **2026-09-03** — before that
the "Auto-Renew" toggle flipped a localStorage flag, never reached Stripe,
and recorded nothing, so there is no baseline; payer #2 emailed instead.
`intent` is `cancel` / `reactivate` / `manage`; `portal` says whether the
click went to Stripe's Customer Portal (true) or the support mailbox
(false — the fallback until `STRIPE_CUSTOMER_PORTAL_URL` is set).

```sql
SELECT ((metadata #>> '{}')::jsonb)->>'intent' AS intent,
       ((metadata #>> '{}')::jsonb)->>'portal' AS via_portal,
       count(DISTINCT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username)) AS people
FROM pro_events
WHERE event='manage_subscription_clicked' AND created_at >= :since AND <shared filters>
GROUP BY 1, 2;
```

Read next to `purchases` and the Stripe dashboard's cancellations: a cancel
click with no matching Stripe cancellation is a support email waiting to be
actioned (or a portal link that didn't work).

## `outreach_replies`

Replies received to hand-written founder check-ins. The channel is the
founder's inbox, so the verifier cannot compute this from SQL alone — the
founder reports the count and the verifier records it with that provenance
stated. What SQL can verify: who was written to and when, from the send log
below, and whether the recipient's app activity changed after the reply.

Send log lives in `docs/agent/ledger.md` under the outreach claim — one line
per send: date, username, feedback id or trigger. Baseline **0** (no
hand-written check-in had ever been sent before 2026-08-21).

```sql
-- Behavioural echo of a reply: did the recipient return after the send date?
select username, max(created_at) as last_seen
from pro_events
where username = any(:recipients) and created_at >= :send_date
group by 1;
```

## `purchases`

Verified payments. The ONLY money truth is the row the stripe-webhook edge
function writes: `event='pro_purchase_completed'` with `reason='stripe_webhook'`
— it carries `amount_cents` and a `cs_live_` session id.

Two traps, both hit on 2026-08-24:

- There is **no** `event='stripe_webhook'`. Querying that name returns zero
  forever and reads as "webhook dead" while money flows. The webhook writes
  `pro_purchase_completed` / `pro_renewal_completed` / `pro_payment_failed`
  with `reason='stripe_webhook'`.
- Every purchase ALSO produces a client-side duplicate ~4s later
  (`reason='activation_funnel'`, username `'guest'`, empty metadata) from the
  success page firing before identity restore. Count without the reason
  filter and revenue doubles.

```sql
select count(*)                                   as purchases,
       sum((((metadata #>> '{}')::jsonb)->>'amount_cents')::int) / 100.0 as usd
from pro_events
where event = 'pro_purchase_completed'
  and reason = 'stripe_webhook'
  and created_at >= :since;
```

Renewals: same query with `event='pro_renewal_completed'`.
