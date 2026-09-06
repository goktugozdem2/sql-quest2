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
- **Check when an event was born before comparing windows** — and define
  birth as the first day with 5+ rows, never as `min(created_at)`:

  ```sql
  SELECT event, min(d) AS born
  FROM (SELECT event, created_at::date AS d, count(*) AS n FROM pro_events GROUP BY 1, 2) x
  WHERE n >= 5
  GROUP BY 1 ORDER BY 2;
  ```

  `created_at` is client-supplied — `new Date().toISOString()` in `track.js`
  and on the app's own events — so a browser with a wrong clock writes a row
  dated anywhere. `app_opened` has exactly one row at 2026-03-11 04:17Z; it
  carries an `aid`, so it was written after 07-28, while the event's real
  birth is 2026-07-11 (40 rows that week). `min(created_at)` reads 03-11 and
  would pass a window reaching back to April as clean; the first-appearance
  of `aid` reads 03-11 the same way, and so would a door's. Key the same
  query by `aid` presence or by door when that is what you are dating. A
  metric that jumped because the event shipped mid-window is not a result.
- **Local traffic before 2026-09-03 is in the data.** Until the localhost
  guard shipped (`ANALYTICS_MUTED` in app.jsx, the same test in track.js),
  smoke runs and browser QA against localhost wrote real rows with a fresh
  `aid` per run — tz `Europe/Istanbul`, `arrivalSrc` null, odd viewports
  (400x400, 756x469). Order of magnitude ~5 people/week, all inside the
  `(none)` door; the ledger's static contaminated-aid list cannot cover it.
  From 09-03 on, localhost sends nothing.
- **`landing_view` on the four main pages has a hole in it.** `home`,
  `after-the-sql-course`, `after-bootcamp` and `sql-for-the-ai-era` were
  tracked 2026-07-28..08-04 — 82 `home` rows from 61 aids, production
  traffic plus the 08-03 GSC crawler burst — then untracked 08-05..09-05,
  because the static-page injector skipped any page whose HTML contained
  the string "/track.js", and a comment saying exactly that landed on all
  four around 08-04. Live again from 2026-09-06 (first row 13:58Z). Read
  those four pages from 2026-09-06 only: a `min(created_at)` of 07-28 on
  `home` is the pre-gap build, not a baseline, and a window reaching back
  before 09-06 mixes five tracked days, a 29-day hole and the crawler. Any
  "landing traffic jumped" read across 09-06 is the fix, not growth. The
  hub, company and blog pages were tracked throughout. Split by `page`
  (`home`, `after-the-sql-course`, …) to compare like with like.

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

**Discontinuity 2026-09-06** (paywall-surfaces T3, from the deploy of that
date). Two things change on the same day, so never compare raw rows across it:

- **`wall='soft_toast'` is replaced by `wall='preview_dialog'`** on the
  non-company branch. The soft toast is dead UI — the collision catcher
  (plan D-2) renders at the same gate, and the old label would describe
  something nobody sees. It is one series with two labels: read
  `soft_toast` before 09-06 and `preview_dialog` after as the same wall.
  `wall='company_modal'` is unchanged; that branch was deliberately untouched.
- **The multi-fire is fixed the same day.** The 08-21 read found 47 raw rows
  for 16 people — ~3 events per click, 192ms apart. From 09-06 the event
  fires at most once per 2s per user+challenge (`src/utils/lock-events.js`,
  `shouldEmitLockEvent`), so `hits` drops by roughly two-thirds while
  `people` does not move. **Count people, never hits, across that date** —
  a `hits` series that falls on 09-06 is the fix, not a result. The scope is
  per challenge: a click on a *different* locked challenge inside the window
  still writes a row, so per-challenge people counts are also intact.

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

Same 2026-09-06 discontinuity as `lock_reach_rate`: the `count(*)` columns
above are hit counts, and hits drop ~3x on that date when the multi-fire
dedupe lands. Across 09-06 compute the share on people —
`count(DISTINCT username)` per bucket — not on rows. The 08-21 baseline
(4/16 company context, 2/16 on weakest skill) was already a people count and
stays comparable.

## `preview_open_to_solve`

The direct funnel behind the paywall surfaces
(`docs/plans/paywall-surfaces-plan.md` §Measurement): of the people a new
surface led to a free Hard preview, how many then solved it. No new event —
`challenge_opened` gains an `openedFrom` metadata field, born **2026-09-06**
(the deploy of that date), stamped ONLY when a preview is opened from one of
the three surfaces:

| `openedFrom` | surface |
|---|---|
| `preview_list` | a tagged preview card in the challenge list (the Hard list pins them first) |
| `preview_dialog` | the collision catcher that replaced the soft toast on a locked-Hard click |
| `preview_coach` | the Coach's once-per-session "You're ready for a hard one" step |

**Absence is organic, by design.** A direct open, a post-solve
recommendation, a curriculum step — none of them carry the key, and a
`challenge_opened` row without `openedFrom` is not a preview-surface open
even when the challenge is a preview. Baseline is therefore **0** for every
surface: the field did not exist before the deploy. Pro users never see a
surface and never stamp.

People, not events, identified as `COALESCE(aid, username)` the way
`first_contact_activation` does (a guest can be led to a preview before they
have a username). A person counts once per surface, and once in the total
even if two surfaces reached them. "Solved" means a `challenge_solved` on
the SAME `challengeId` at or after that person's first stamped open of it —
a preview solved organically before the surface existed is not a conversion.

```sql
WITH ev AS (
  SELECT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username) AS pid,
         event, created_at,
         ((metadata #>> '{}')::jsonb)->>'challengeId'                 AS cid,
         ((metadata #>> '{}')::jsonb)->>'openedFrom'                  AS opened_from
  FROM pro_events
  WHERE event IN ('challenge_opened','challenge_solved')
    AND created_at >= :since            -- never earlier than 2026-09-06
    AND <shared filters>
),
opened AS (  -- first stamped open per person+challenge, and the surface that did it
  SELECT DISTINCT ON (pid, cid) pid, cid, opened_from, created_at AS opened_at
  FROM ev WHERE event = 'challenge_opened' AND opened_from IS NOT NULL
  ORDER BY pid, cid, created_at
),
solved AS (SELECT pid, cid, created_at AS solved_at FROM ev WHERE event = 'challenge_solved')
SELECT COALESCE(o.opened_from, 'ALL SURFACES')                                   AS surface,
       count(DISTINCT o.pid)                                                     AS people_opened,
       count(DISTINCT o.pid) FILTER (WHERE s.solved_at >= o.opened_at)           AS people_solved,
       round(100.0 * count(DISTINCT o.pid) FILTER (WHERE s.solved_at >= o.opened_at)
                   / NULLIF(count(DISTINCT o.pid), 0), 0)                        AS solve_pct
FROM opened o LEFT JOIN solved s USING (pid, cid)
GROUP BY ROLLUP (o.opened_from) ORDER BY 1;
```

The `ALL SURFACES` row is the claim's "≥ 15 people": one person, one count,
however many surfaces reached them. The per-surface rows are the attribution
the plan declared in advance (three surfaces in one PR) — they say which door
worked, not whether the change did.

**Secondary — lock-time preview state (declared confounded).** Of the people
who hit a paid wall, what share had touched a preview first.
`content_lock_reached` carries `freeHardPreviewsUnsolved`, the number of free
Hard previews the person had NOT solved **at the moment of the collision**.
Baseline (the 08-21 read) **1/16 (6%)**.

Two rules, stated before the read:

- **Person rule: the LAST lock event per person in the window.** Someone who
  collides, goes and solves a preview, and collides again reads by their
  second row.
- **Lock-time stamping means a first-time hitter always reads the full
  count** (6 today) — they hit the wall before any surface could have led
  them anywhere. The metric moves only on repeat collisions, so it reads the
  combined effect of all three surfaces on people who came back, and cannot
  move at all for people who bought or left after one collision. That is a
  property of the stamp, not a finding.

```sql
WITH locks AS (
  SELECT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username)            AS pid,
         (((metadata #>> '{}')::jsonb)->>'freeHardPreviewsUnsolved')::int   AS previews_unsolved,
         created_at
  FROM pro_events
  WHERE event = 'content_lock_reached' AND created_at >= :since AND <shared filters>
),
last_lock AS (
  SELECT DISTINCT ON (pid) pid, previews_unsolved FROM locks ORDER BY pid, created_at DESC
)
SELECT count(*)                                                       AS people,
       count(*) FILTER (WHERE previews_unsolved < :preview_total)     AS touched_a_preview,
       round(100.0 * count(*) FILTER (WHERE previews_unsolved < :preview_total)
                   / NULLIF(count(*), 0), 0)                          AS pct
FROM last_lock;
```

`:preview_total` is the number of free Hard previews in the live bank at the
read — **6** as of 2026-09-06 (ids 11, 23, 24, 30, 50, 86) — and the count to
re-derive from `src/data/challenges.js` if the previews are ever re-curated,
not a constant to carry forward. A `NULL` `previews_unsolved` is a row from
before the stamp existed (2026-08-15) and is out of any window `:since` allows.

**Guardrail: `purchases`, directional only.** Read the `purchases` query over
the same window next to the funnel, as a direction and not a gate:
`plan_click_rate` on milestone shows is single-digit-n in any two-week window
and cannot carry a guardrail, and purchases are rarer still. A purchase count
that falls is a reason to look, not a verdict.

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

## `door_solve_rate`

Per arrival door: of the people who opened the app, how many solved at least
once, and how many reached 5 solves — the engaged mark — inside the window.
The traffic-quality metric, and the one that ranks pages for `seo-page`: a
door earns another page like it when its people solve, not when it brings
people.

The door is `arrivalSrc`, stamped first-touch into localStorage by `app.html`
from `?src=<slug>` (every static page's CTA carries its own slug — `home`,
`sql-exercises`, `analyst-interview`, `vs-datalemur`, …), else
`company:<x>` / `sector:<x>` from a deep link, else `ref:<referrer host>`,
else nothing — read as `(none)`. First touch wins, so a returning visitor
keeps the door that acquired them.

Baseline, measured 2026-09-06 over 28 days (`app_opened` people, internal
accounts out): **1047 arrivals**, of which SEO pages brought 609 (58%).
Per door, with the share who went on to solve at least once in parentheses:
hub/landing pages 370 (32%); company pages 158 (23%); comparison pages 26
(23%); sector pages 18 (11%); blog 37 (**5%** — blog traffic does not
convert to practice). `home` 268 (34%). Direct/unstamped 160 (13%). One
page, `sql-exercises`, brought 252 — 41% of all SEO arrivals.

```sql
WITH ev AS (
  SELECT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username)         AS pid,
         username, event, created_at,
         ((metadata #>> '{}')::jsonb)->>'arrivalSrc'                       AS door,
         ((metadata #>> '{}')::jsonb)->>'challengeId'                      AS cid,
         (((metadata #>> '{}')::jsonb)->>'returning')::boolean             AS returning
  FROM pro_events
  WHERE event IN ('app_opened', 'challenge_solved')
    AND created_at >= :since            -- never earlier than 2026-07-28 (aid birth)
    AND created_at <  :until
),
internal AS (   -- a browser that ever wrote a row under an internal username, on any event
  SELECT DISTINCT ((metadata #>> '{}')::jsonb)->>'aid' AS pid
  FROM pro_events
  WHERE NOT (<shared filters>)
    AND ((metadata #>> '{}')::jsonb)->>'aid' IS NOT NULL
),
arrived AS (    -- one row per person: the door on their first app_opened in the window
  SELECT DISTINCT ON (pid) pid, COALESCE(door, '(none)') AS door, returning
  FROM ev
  WHERE event = 'app_opened'
    AND pid NOT IN (SELECT pid FROM internal)
    AND pid <> ALL (:contaminated_aids)   -- the list in docs/agent/ledger.md
  ORDER BY pid, created_at
),
solves AS (
  SELECT pid, count(DISTINCT cid) AS n FROM ev WHERE event = 'challenge_solved' GROUP BY 1
)
SELECT a.door,
       count(*)                                                        AS people,
       count(*) FILTER (WHERE s.n >= 1)                                AS solved_once,
       count(*) FILTER (WHERE s.n >= 5)                                AS reached_5,
       round(100.0 * count(*) FILTER (WHERE s.n >= 1) / count(*), 0)  AS solve_pct,
       round(100.0 * count(*) FILTER (WHERE s.n >= 5) / count(*), 0)  AS engaged_pct
FROM arrived a LEFT JOIN solves s USING (pid)
WHERE a.door <> 'verify-test'           -- instrumentation tests, not a door
GROUP BY 1 ORDER BY people DESC;
```

- **Identity is `COALESCE(aid, username)`, never username.** `app_opened`
  writes username `guest` on essentially every row (617 of 617 in the 07-28
  read), so a username count reads "1 person" per door. `aid` is born
  2026-07-28; `:since` never earlier.
- **Internal accounts hide behind `guest` on the arrival row.** The shared
  filters run on username and cannot see them there. Exclude by browser
  instead — any aid that ever wrote a row under an internal username is
  internal on every row (the `internal` CTE) — and add the ledger's
  contaminated aids.
- **A door is born when its page ships** and tags its CTA, the way an event
  is born when its code ships. A door that reads 0 → 40 across the birth of
  its page is a launch, not growth; date the door with the shared-traps
  birth query keyed by door (first day with 5+ rows) before comparing
  windows, exactly as you check event births — `min(created_at)` on a door
  is fooled by the same client clocks.
- **Solves are in-window and per person, not lifetime.** A returning engaged
  user who arrived before `:since` counts at their first `app_opened` in the
  window and at whatever they solved inside it. Add `returning` (stamped on
  `app_opened`) to the `GROUP BY` to read new arrivals alone.
- **Small doors read as noise.** 18 people at 11% is two solvers. Group the
  long tail by page family before quoting a rate, and never rank a door under
  ~12 people.
- **`home` is a mix**, not a page: true direct traffic plus AI-assistant
  referrals, because AI apps strip referrers (payer #2 was sent by Gemini and
  reads as `home`). Do not attribute its movement to the homepage alone.

## `landing_click_through`

Of the browsers that saw a static page, how many opened the app within 7
days. The top of the marketing funnel — the denominator the product side
never had until `src/track.js` (2026-07-28) started writing `landing_view`
into `pro_events` with the same `aid` the app stamps, so a pageview and a
later `app_opened` are joinable as one browser.

`page` on `landing_view` is the slug the tracker derives from the path
(`/` → `home`, `/x/` → `x`), built to equal the `arrivalSrc` that page's own
CTA stamps — so `landing_click_through` for page X and `door_solve_rate` for
door X are two rungs of one ladder: saw it → opened the app → solved.

```sql
WITH internal AS (   -- same rule as door_solve_rate: internal by browser, not by row
  SELECT DISTINCT ((metadata #>> '{}')::jsonb)->>'aid' AS aid
  FROM pro_events
  WHERE NOT (<shared filters>)
    AND ((metadata #>> '{}')::jsonb)->>'aid' IS NOT NULL
),
views AS (   -- first view per browser+page in the window: browsers, not pageviews
  SELECT DISTINCT ON (aid, page) aid, page, returning, created_at AS viewed_at
  FROM (
    SELECT ((metadata #>> '{}')::jsonb)->>'aid'                  AS aid,
           ((metadata #>> '{}')::jsonb)->>'page'                 AS page,
           (((metadata #>> '{}')::jsonb)->>'returning')::boolean AS returning,
           created_at
    FROM pro_events
    WHERE event = 'landing_view' AND reason = 'landing'
      AND created_at >= :since AND created_at < :until   -- :until at least 7 days ago
  ) v
  WHERE aid IS NOT NULL
    AND aid NOT IN (SELECT aid FROM internal)
    AND aid <> ALL (:contaminated_aids)
  ORDER BY aid, page, created_at
),
opens AS (
  SELECT ((metadata #>> '{}')::jsonb)->>'aid' AS aid, created_at AS opened_at
  FROM pro_events
  WHERE event = 'app_opened'
    AND created_at >= :since AND created_at < :until + interval '7 days'
),
through AS (   -- the same browser opened the app inside 7 days of the view
  SELECT DISTINCT v.aid, v.page
  FROM views v JOIN opens o ON o.aid = v.aid
   AND o.opened_at >= v.viewed_at
   AND o.opened_at <  v.viewed_at + interval '7 days'
)
SELECT v.page,
       count(*)                                    AS browsers,
       count(t.aid)                                AS clicked_through,
       round(100.0 * count(t.aid) / count(*), 0)   AS click_through_pct
FROM views v LEFT JOIN through t USING (aid, page)
-- WHERE NOT v.returning                           -- new visitors only; see below
GROUP BY 1 ORDER BY browsers DESC;
```

- **`home` and the three variant pages have a tracking hole** (the injector
  bug in the shared traps above): tracked 2026-07-28..08-04, including the
  GSC crawler burst; untracked 08-05..09-05; live again from 2026-09-06.
  Read those four from 2026-09-06 only. `min(created_at)` on `page='home'`
  returns 07-28 — that is the pre-gap build, not a baseline. The first
  clean 7-day read for `home` is 2026-09-13 (09-06 plus the 7-day window
  the `:until` rule requires), and there is no baseline before it — a
  landing count that jumps across 09-06 is the fix, not growth. Split by
  `page` to compare like with like.
- **The denominator is "browsers that ran JS".** The bot filter is
  client-side UA matching in `track.js`; the GSC inspection fetcher carried
  no `bot` substring and landed 47 one-view aids in the 2026-08-03 read,
  28% of every landing number, before its pattern was added. Do not read a
  landing count from before that fix against one after it.
- **`app_opened` fires once per browser per day.** A browser that already
  opened the app today and then reads a landing page yields no
  click-through, so the all-in number under-counts returners by design.
  Uncomment `WHERE NOT v.returning` for the clean new-visitor read; that is
  the number to compare across pages.
- **Identity is `aid`.** `landing_view` writes username `guest`, or whatever
  `sqlquest_user` held; a username count is meaningless here. Internal
  exclusion is by browser, the same CTE as `door_solve_rate`.
- **Local traffic before 2026-09-03 is in this data** (shared filters). The
  three `reason='landing'` rows of 2026-07-28 on aid `e5fcbad1a022…` are
  localhost verification; exclude that aid from any read that reaches back.
