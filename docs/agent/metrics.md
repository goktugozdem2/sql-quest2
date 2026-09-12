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

- **`users.created_at` is the last save, not the signup.** 317 of 338
  accounts carry a `created_at` equal to their `lastActive` (weekly read
  2026-09-07): the client upserts the whole row on every save. Count signups
  from `signup_completed` by aid, or from a username's first `pro_events`
  row — never from `users.created_at`. Since 2026-09-12 the client no longer
  sends `created_at`, so rows created after that date carry a real insert
  time; rows from before keep their last-save value.
- **No registered-user write landed between 2026-09-08 08:53Z and the fix**
  (ledger: "users writes restored"). In that window `signup_completed` is
  people who finished the form, not accounts; `users.updated_at` is frozen
  at 09-08 for everyone; anything cohorted on "has a users row" undercounts
  those days. Check `postgres_logs` severity ERROR before trusting a quiet
  week — 1,103 errors on 09-08 sat there unread for four days.
- **The 2026-08-26/27 burst is not people.** 165 browsers in ~36 hours, all
  `desktop:1919x992`, five US timezones, arriving through blog / SEO CTAs and
  `(none)`, 0 solves, 0 signups. Exclude that viewport on those two days when
  reading arrivals; the week-over-week "drop" that follows is the burst
  leaving, not demand falling (weekly read 2026-09-07).

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

## `reach_6_rate`

Of the people who solve at least one challenge in the window, the share who
reach **six distinct** solves. Six is not arbitrary: it is the rung the
milestone modal fires on (`src/app.jsx`, tier ladder 6/10/25/50, the 6 added
2026-07-23 in `66942c5`), and that modal is the only paywall surface that has
produced a sale since. So this is the activation number closest to revenue.

**Count people, not events, and count DISTINCT challenge ids** — a re-solve is
not depth, and `challenge_solved` fires per submission.

```sql
WITH base AS (
  SELECT coalesce(((metadata #>> '{}')::jsonb)->>'aid', username) AS pid,
         event, ((metadata #>> '{}')::jsonb)->>'challengeId' AS cid
  FROM pro_events
  WHERE created_at >= :since AND <shared filters>
), per AS (
  SELECT pid, count(DISTINCT cid) FILTER (
           WHERE event = 'challenge_solved' AND cid IS NOT NULL) AS solves
  FROM base GROUP BY pid
)
SELECT count(*) FILTER (WHERE solves >= 1) AS solved_1,
       count(*) FILTER (WHERE solves >= 6) AS solved_6,
       round(100.0*count(*) FILTER (WHERE solves >= 6)
             / nullif(count(*) FILTER (WHERE solves >= 1), 0), 1) AS reach_6_pct
FROM per;
```

Measured 2026-09-09, 30 days: **314 solved one, 149 reached six, 47.4%.**

The full funnel it sits in, same window and definition: 1,148 entered the app,
663 opened a challenge, 314 solved one, 149 reached six. Two halvings, and the
sharper one is 663→314. After the first solve the funnel holds — 1→2 is 82%,
2→3 is 89% — so everything hard happens before the first correct query.

## `share_of_solves_on_the_38`

What fraction of all solves land on the 38 challenge ids the recommended path
hand-listed before roadmap v2. A **mechanism** check, not an outcome: if a
change is supposed to widen what people can find and this does not fall, the
change never reached the surface and any outcome number is measuring traffic
mix instead. Same role `first_contact_share(99)` plays for the 105 claim.

The 38 ids are the `challengeIds` arrays of the eight pre-2026-09-09 stages in
`SQL_ROADMAP_STAGES`. Read them from source rather than pasting a copy here —
`tests/roadmap.test.js` parses them the same way, and a fixture would drift.

Measured 2026-09-09 across 299 engaged users (5+ solves): **66.1%**, with the
average engaged user having solved 17.1 of 213 free challenges.

**Beware the double-count trap when you compute the denominator.**
`src/data/sector-challenges.js` APPENDS itself to `window.challengesData`, so
concatenating it with `src/data/challenges.js` counts every sector challenge
twice. That has produced two wrong measurements already. Load `public/data.js`,
or import both modules and read `window.challengesData` once.

## `signup_growth`

Signups per ISO week, by person. The number O1's traffic half is judged on:
its day-30 checkpoint is 340 signups in 30 days and its 12-08 target is 1,000.

**Never count from `users.created_at`** (see the shared-filters trap above) and
**never count `signup_completed` by username alone** — that undercounts by half.
See the `guest` trap below, which is the reason this metric needs its own
identity resolution rather than the usual `coalesce(aid, username)`.

```sql
WITH resolve AS (          -- the real username each browser eventually carried
  SELECT DISTINCT ON (((metadata #>> '{}')::jsonb)->>'aid')
         ((metadata #>> '{}')::jsonb)->>'aid' AS aid, username AS uname
  FROM pro_events
  WHERE username NOT LIKE 'guest%' AND username <> 'guest'
    AND ((metadata #>> '{}')::jsonb)->>'aid' IS NOT NULL
  ORDER BY 1, created_at
), sign AS (
  SELECT p.created_at,
         COALESCE(r.uname,
                  NULLIF(CASE WHEN p.username = 'guest' THEN NULL ELSE p.username END, ''),
                  ((p.metadata #>> '{}')::jsonb)->>'aid') AS person
  FROM pro_events p
  LEFT JOIN resolve r ON r.aid = ((p.metadata #>> '{}')::jsonb)->>'aid'
  WHERE p.event = 'signup_completed' AND <shared filters>
)
SELECT date_trunc('week', created_at)::date AS week, count(DISTINCT person) AS signups
FROM sign GROUP BY 1 ORDER BY 1;
```

### Measured 2026-09-11

| week | signups | change |
|---|---|---|
| 2026-08-03 | 18 | |
| 2026-08-10 | 24 | +33% |
| 2026-08-17 | 38 | +58% |
| 2026-08-24 | 39 | +3% |
| 2026-08-31 | **49** | +26% |
| 2026-09-07 | 27 | **partial, 4 days** (~47 at run rate) |

Monthly: July 36 (from the 11th only), August 129, September 69 through the 10th.

**Five weeks of ~22% compounding.** If it holds, the 5× needed to reach O1's
1,000/month arrives around mid-November, before 12-08. Five weeks is a thin
base for a trend and the payer column has not followed it (2, 1, 1, 0 by month),
so this says the traffic half may land, not that O1 will.

### `signup_completed` does not exist before 2026-07-11

There is no May or June signup data, and none can be reconstructed —
`users.created_at` is a last-save timestamp. Any request for "signups since
May" is unanswerable; say so rather than substituting the users table.

### The `guest` trap — half of all signups arrive nameless

`signup_completed` fires with `username = 'guest'` when the account name is not
yet attached to the payload. Counted naively this looks like **one user with 168
signup events across 130 browsers**; every other username fired exactly once.

They are real signups. Of the 129 browsers that fired a `guest`-named signup,
**115 (89.1%) later carried a real username**. So:

- by username alone: 75 in the last 30 days — **undercounts, misses the guests**
- by `aid`: 172 — over-counts slightly (one person, two browsers)
- resolved (the query above): matches `aid` within ~5%

**O1's baseline of 169 used the `aid` method and is therefore correct.** That
was checked on 2026-09-11 after the discrepancy was raised as a possible
baseline error; it is not one.

### Where the growth is, and why that is only half-answerable

By arrival door, signups per week. **Attribution before the week of 2026-07-27
does not exist** — `aid` stamping began that day, so every earlier week reads
`(none)`.

| door | 2026-08-03 | 2026-08-31 |
|---|---|---|
| `home` | 6 | **26** |
| `sql-exercises` | 3 | 10 |
| comparison pages | 2 | 7 |
| company pages | 4 | **3** |

The growth is `home`, `/sql-exercises/` and the comparison pages. **Company
pages are flat** — the door that converts best to a first solve is contributing
nothing to signup growth.

`home` is the ambiguous bucket: it holds direct traffic, brand search and the
GenAI recommendation channel, which arrives with no referrer. `landingSrc`
would split it, but it shipped 2026-09-06 and is stamped on only **30 of 194**
signups since 08-03 — of those, `search:google` 15, `search:bing` 7,
`ai:perplexity` 1. **Too sparse to explain a 4× rise in `home`.**

So: where the growth lands is measured, what causes it is not — **from
`landingSrc`.** It was answered the next day from two fields nobody had read,
`page` and `ref` on the 3,716 `reason='landing'` rows, which have 100% and 57%
coverage against `landingSrc`'s 15%. Answer: traffic ×1.4 (all of it
`/sql-exercises/` doubling) times cold-user activation ×1.3, the second half
caused by two first-run commits and confirmed against a warm control arm. Full
working and the referrer census in
`docs/reads/signup-growth-cause-2026-09-11.md`; the activation instrument is
`cold_first_solve_rate` below.

**Do not read a weekly landing series that includes `home`,
`after-the-sql-course`, `after-bootcamp` or `sql-for-the-ai-era`** across
2026-08-05..09-05. Those four lost their tag in that window (CLAUDE.md), so the
09-06 repair reads as a traffic jump. Every trend here excludes them.

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

**Discontinuity 2026-09-08** (cold start). `wall` gains a fourth value,
**`cold_start`**, and it is not a new surface — it is a slice taken OUT of the
other three. Anyone with **zero solves** who meets any paid gate now gets a
routing dialog instead of a price, so from this date:

- `preview_dialog`, `company_modal` and the `interview` / `thirty_day` /
  `daily_difficulty` gates all **stop containing zero-solve people**. In the
  34h before the change, 2 of 8 wall-hitters were zero-solve (25%), so expect
  those series to fall by roughly that share on 09-08 for a reason that is
  not behavioural.
- **The rows do not disappear.** A diverted collision still writes
  `content_lock_reached`, with `wall='cold_start'`. `people` across ALL wall
  values is therefore continuous; only the split moves. Read the total when
  you want "how many met a wall", and the split when you want "how many were
  asked to pay".
- The three non-challenge gates (`interview`, `thirty_day`,
  `daily_difficulty`) carry a `wall` field for the first time from this date.
  Before 09-08 they wrote `wall: null`; a null on a row after it is a stale
  cached bundle, not a fourth branch.
- The cold-start dialog's own CTA opens a challenge with **no `openedFrom`
  stamp**, on purpose. It is not one of the three preview surfaces, and
  stamping it would forge rows into `preview_open_to_solve` — the metric the
  2026-09-20 read is pre-registered on (`tests/paid-wall.test.js` guards it).

Threshold: `COLD_START_SOLVE_THRESHOLD` in `src/utils/paid-wall.js`, currently
1 solve. "Satisfy first, then ask" arguably means the engaged bar (5+); moving
it is a one-line change and should be its own measured claim, not a silent
edit.
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

### `cold_start_first_solve`

**People** who meet any paid gate with **zero solves** — `content_lock_reached`
with `wall='cold_start'` (before 2026-09-08: any wall value with
`solvedCount='0'`) — who then produce at least one `challenge_solved`, ever.
Identity is `aid`; the denominator is people, never rows.

Measured 2026-09-07 over the prior 45 days, before the fix: **38 people met a
paid wall having solved nothing, and 3 of them ever solved anything — 7.9%.**
37 of the 38 had an `app_opened` row, so these are people, not crawlers. For
22 of them the lock event is the **last thing they ever did on the site**.

Read it as a cohort, not a rate over a window: the question is what happened
to the people, and most of them have no second session for a window to catch.

Confound to carry into any read: 17 of the 38 arrive in one cluster on
2026-08-26 16:00-01:00Z. Excluding that cluster the baseline is **3 of 21 =
14.3%**. Quote both; the cluster looks like real traffic (they opened the app)
but its shape is unusual enough that a read resting on it is not safe.

`wall` values on `content_lock_reached`:

| `wall` | meaning |
|---|---|
| `soft_toast` | the pre-09-06 label for the locked-Hard gate; same series as `preview_dialog` |
| `preview_dialog` | the collision catcher on a locked-Hard click |
| `company_modal` | the buyable Pro modal a company-page arrival gets |
| `cold_start` | from 2026-09-08: the person has solved nothing and was routed, not sold to |

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

## `blog_practice_exit`

Of the people who read a blog post, how many took the post's practice exit —
and how many of them went on to solve. The rung between `landing_view` on a
`blog/*` page and `challenge_solved`, and the only one that says whether a
reader who understood one idea was handed something to do with it.

**Read the exit against `app_opened`, not against `challenge_solved`.** Measured
2026-09-08 over 30 days, per landing page, people not events: the share of app
openers who go on to solve barely moves across the site — 28% to 58%, with the
comparison pages and the blog posts sitting inside that band, not below it. What
collapses is the step before. Of the people who land, the share that opens the
app at all runs from 74-76% on `/sql-exercises/` and `/learn-sql/` down to 8-12%
on `/vs-datalemur/`, `/vs-stratascratch/`, `/sql-practice-comparison/` and the
posts, and 3% on `/vs-leetcode-sql/`.

| page | landed | opened app | opened % | solved, of openers |
|---|---|---|---|---|
| sql-exercises | 360 | 267 | 74% | 35% |
| learn-sql | 42 | 32 | 76% | 28% |
| snowflake-sql-interview | 42 | 26 | 62% | 58% |
| sql-interview-prep | 56 | 34 | 61% | 41% |
| best-sql-practice-sites | 188 | 58 | 31% | 34% |
| blog/faang-sql-interview-guide | 48 | 10 | 21% | 40% |
| sql-practice-comparison | 123 | 12 | 10% | 42% |
| vs-datalemur | 44 | 4 | 9% | 50% |
| blog/sql-cte-tutorial | 53 | 4 | 8% | 50% |
| vs-leetcode-sql | 39 | 1 | 3% | 100% |

So the earlier reading — that these pages attract the wrong reader — is wrong,
or at least unproven: the readers they do send in convert like everyone else,
and `/vs-datalemur/`'s openers convert *better* than `/sql-exercises/`'s. The
page simply never invites them. That is what makes the exit a real hypothesis
rather than a hopeful one, and it is why the primary rung of the claim is the
click and the app open, with solves as the secondary. It also says the same
change is owed to the four comparison pages, which today send 247 readers and
open the app for 22 of them.

### Two cohorts, read separately — never pooled

The same exit shipped to the comparison pages on 2026-09-08, so this metric now
covers **two cohorts**, and a pooled number is meaningless: a tutorial reader
arrived to understand one idea, a comparison reader arrived to decide between
products. They are two different questions being asked of the same button, and
they will not move together.

- **Cohort A — the blog**, 21 posts under `src/blog/`. Baseline and rungs in the
  ledger's `blog_practice_exit` claim, unchanged. Its `page` is `blog/%`.
- **Cohort B — the comparison pages**, the four named below. Its `page` is one
  of the four slugs; it is **never** `blog/%`.

Every read of cohort A must keep the `page LIKE 'blog/%'` filter the query below
carries. Every read of cohort B swaps that line for
`page IN ('vs-datalemur','vs-stratascratch','vs-leetcode-sql','sql-practice-comparison')`.
A `cta_practice_*` count taken without a page filter is now a mix of both and
is not a reading of either — in particular, cohort A's rung 1 ("≥ 40 clicks
across all 21 posts") is a **blog-only** count and was written before cohort B's
events existed.

**Cohort B baseline — measured 2026-09-08, the same 30-day window and the same
people-not-events identity as the table above, before any exit existed:**

| page | landed | opened app | opened % | solved, of openers |
|---|---|---|---|---|
| `sql-practice-comparison` | 123 | 12 | 10% | 42% |
| `vs-datalemur` | 44 | 4 | 9% | 50% |
| `vs-stratascratch` | 41 | 5 | 12% | — (n=5) |
| `vs-leetcode-sql` | 39 | 1 | 3% | 100% (n=1) |
| **the four together** | **247** | **22** | **8.9%** | — |

`vs-stratascratch`'s row is **derived, not printed**: it fell below the cut of
the table above, and its 41/5 is what remains when the other three are taken out
of the 247/22 total. It is consistent with that table's prose ("8-12% on
`/vs-datalemur/`, `/vs-stratascratch/`, `/sql-practice-comparison/`"), but treat
it as reconstructed and re-measure it directly on the read date rather than
quoting it.

Two sibling pages got the same treatment and are **outside** the cohort
denominator, reported beside it:

- **`vs-hackerrank-sql`** has no row in the 2026-09-08 read at all — it was
  below the cut, so it has **no pre-period**. Its post-change numbers can be
  reported but not compared; the verdict on that page alone is `UNDEFINED`, not
  `FLAT`.
- **`best-sql-practice-sites`** already opens the app for **58 of 188** readers
  (31%), the best of the whole family, and it is the page that shows why: it is
  the only one of the six whose app links are not all chrome. Four of the
  others' links sit in the nav, the hero, the closing card and the footer;
  this one puts SQL Quest's name as a link in the at-a-glance table near the
  top and gives the `#1` review card its own in-body `rev-link` CTA — an exit
  at the point its argument for us resolves, which is exactly the shape being
  added elsewhere. Folding its 31% into a cohort baseline of 8.9% would flatter
  the change with a page that was already working, so it is kept out.

Two exits per post, both shipped 2026-09-08: one mid-post at the end of the
section that explains the post's core idea, one in the closing card. Each is a
deep link to a **named** challenge (`/app/?challenge=<id>&src=blog-<token>`) and
each carries its own `data-track`, so the click is a `pro_events` row with
`reason='landing'` written by `src/track.js`:

| event family | what it is |
|---|---|
| `cta_practice_<token>_mid` | the mid-post exit on that post |
| `cta_practice_<token>_end` | the closing card's challenge CTA on that post |
| `cta_topic_<token>_end` | the closing card's secondary — a topic page, hub or track, **not** the app |
| `cta_blog` | the nav "Practice Free" button. **Pre-existing, untouched, and not an exit.** |

`<token>` is the post's own `blog-<token>` door slug (`cte`, `tr_cte`,
`whatiscte`, `joins`, `leftvsinner`, `antijoin`, `windows`, `ranking`,
`runningtotal`, `timeseries`, `case`, `groupby`, `wherehaving`, `isnull`,
`null`, `recursive`, `faang`, `ai`, `fraud`, `capital_one`, `tr_join`), so the
event name alone identifies the post and the placement. All 63 are globally
unique; a duplicate would mean two posts were given the same exit and is a bug,
not a mix.

Cohort B's exits are the same three shapes in the same order — one at the point
the argument resolves (the diagnostic demo, the "5 things" grid, the decision
tree, the final verdict), one in the closing card — and its `<token>` is the
page's own `?src` door with the dashes turned into underscores, so the event
name still names the door exactly:

| page (`?src` door) | token | challenge behind both exits |
|---|---|---|
| `vs-datalemur` | `vs_datalemur` | 106 · LEFT JOIN: Keep Everyone |
| `vs-stratascratch` | `vs_stratascratch` | 51 · Department Performance Rate |
| `vs-leetcode-sql` | `vs_leetcode_sql` | 161 · Top 3 Salary Tiers (DENSE_RANK) |
| `sql-practice-comparison` | `sql_practice_comparison` | 144 · Average Salary by Department |
| `vs-hackerrank-sql` | `vs_hackerrank_sql` | 113 · Conditional Counting with CASE |
| `best-sql-practice-sites` | `best_sql_practice_sites` | 157 · Active Spender Cohort (HAVING) |

All six challenges are free, all six are distinct, and none of them is the
target of a cohort-A exit — deliberately, so that "did anyone solve the
challenge this page pointed at" stays attributable to one cohort. (The topic
pages under `/challenges/` link them too, as they link every challenge they
list; `161` and `113` are also linked from `google-sql-interview` and
`amazon-sql-interview`, which are separate doors and separate `page` values.)
`cta_blog` has no counterpart here: cohort B's control is the **four
pre-existing, still-untracked** `/app/?src=<door>` links on each page — nav,
hero, closing button, footer. They were not touched, which is what makes them a
control, and it also means a rise in a page's app opens with **zero**
`cta_practice_*` clicks is a real outcome, not instrumentation failure.

```sql
WITH internal AS (   -- internal by browser, the same CTE as door_solve_rate
  SELECT DISTINCT ((metadata #>> '{}')::jsonb)->>'aid' AS pid
  FROM pro_events
  WHERE NOT (<shared filters>)
    AND ((metadata #>> '{}')::jsonb)->>'aid' IS NOT NULL
),
ev AS (
  SELECT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username) AS pid,
         event, created_at,
         ((metadata #>> '{}')::jsonb)->>'page'        AS page,
         ((metadata #>> '{}')::jsonb)->>'challengeId' AS cid
  FROM pro_events
  WHERE created_at >= :since            -- never earlier than 2026-09-08
    AND created_at <  :until            -- :until at least 7 days ago
    AND (event = 'landing_view'
         OR event LIKE 'cta_practice\_%'
         OR event = 'challenge_solved')
),
clean AS (
  SELECT * FROM ev
  WHERE pid IS NOT NULL
    AND pid NOT IN (SELECT pid FROM internal)
    AND pid <> ALL (:contaminated_aids)   -- the list in docs/agent/ledger.md
),
views AS (      -- browsers, not pageviews: first view per browser per post
  SELECT DISTINCT ON (pid, page) pid, page, created_at AS viewed_at
  FROM clean WHERE event = 'landing_view' AND page LIKE 'blog/%'
  ORDER BY pid, page, created_at
),
clicks AS (     -- a browser that took either exit on that post
  SELECT DISTINCT pid, page, event, created_at AS clicked_at
  FROM clean WHERE event LIKE 'cta_practice\_%'   -- `page` is stamped by track.js
),
solved AS (
  SELECT pid, created_at AS solved_at FROM clean WHERE event = 'challenge_solved'
)
SELECT v.page,
       count(DISTINCT v.pid)                                        AS readers,
       count(DISTINCT c.pid)                                        AS took_an_exit,
       count(DISTINCT s.pid)                                        AS solved_within_7d,
       round(100.0 * count(DISTINCT c.pid) / count(DISTINCT v.pid), 1) AS exit_click_pct,
       round(100.0 * count(DISTINCT s.pid) / count(DISTINCT v.pid), 1) AS view_to_solve_pct
FROM views v
LEFT JOIN clicks c ON c.pid = v.pid AND c.page = v.page
                  AND c.clicked_at >= v.viewed_at
LEFT JOIN solved s ON s.pid = v.pid
                  AND s.solved_at >= v.viewed_at
                  AND s.solved_at <  v.viewed_at + interval '7 days'
GROUP BY 1 ORDER BY readers DESC;
```

People, not events (P2) — identity is **`COALESCE(aid, username)`**, never
username: `track.js` writes `username='guest'` on every landing row, so a
username count reads one person per post.

**Baseline — the pre-change numbers, measured 2026-09-08 over the previous 30
days.** These are what the exits are supposed to move, and they were measured
*before* any exit existed, so nothing in them is contaminated by the change:

| page | visitors | solved | rate |
|---|---|---|---|
| `blog/faang-sql-interview-guide` | 48 | 4 | 8.3% |
| `blog/sql-for-fraud-analytics` | 40 | 2 | 5.0% |
| `blog/sql-cte-tutorial` | 53 | 2 | 3.8% |
| `blog/null-handling-mistakes` | 30 | 0 | 0.0% |
| **the four together** | **171** | **8** | **4.7%** |

Measured beside them on the same query, as the ceiling this is reaching for —
practice pages, which have always had somewhere to go: `sql-exercises` 360/94
(26.1%), `sql-interview-prep` 56/14 (25.0%), `learn-sql` 42/9 (21.4%).
`door_solve_rate`'s independent 2026-09-06 read agrees: blog brought 37
arrivals at **5%**.

Traps, stated before the first read:

- **`took_an_exit` is structurally 0 before 2026-09-08.** The events did not
  exist. Date the birth by the deploy recorded in the ledger, not by
  `min(created_at)` — a window that starts earlier is measuring a page that
  had no exit, and the shared-traps birth query (first day with 5+ rows) is
  the check.
- **The 29-day `landing_view` hole does NOT apply here.** It hit `home`,
  `after-the-sql-course`, `after-bootcamp` and `sql-for-the-ai-era` only; the
  blog posts were tracked throughout, which is why a 30-day baseline for them
  is readable at all and a 30-day baseline for `home` is not. Do not "correct"
  a blog window for a gap it never had.
- **Read per `page`, never a blog-wide average.** Blog traffic is
  search-driven and seasonal: interview posts rise with hiring season, the
  tutorial posts move with whatever ranked that month. A blog-wide rate moves
  when the *mix* of posts moves, with no exit having done anything. The four
  baseline posts are the comparison; the other seventeen have no pre-change
  rate and can only be reported, not compared.
- **n is small and a single solver is 2-3 points.** 30 readers on
  `null-handling-mistakes` means one solve reads as 3.3%. Never rank posts by
  rate under ~30 readers, and read the four baseline posts as one number as
  well as separately. Under that, the verdict is `UNREADABLE`, not `FLAT`.
- **A click is not a solve, and `cta_topic_*` is not even a click into the
  app.** The secondary link on each closing card goes to a topic page, the
  `/challenges/` hub, the Capital One page or the finans track — useful, and
  outside this funnel. Only `cta_practice_*` enters it.
- **`cta_blog` is the nav button and is not an exit.** It was on these pages
  before this change and is deliberately unchanged, which makes it the control:
  if practice-exit clicks are near zero *and* `cta_blog` is too, blog readers
  are not clicking anything and the finding is about the audience, not the
  placement. Folding it into `took_an_exit` would destroy the one comparison
  that distinguishes those two answers.
- **One exit is deliberately Pro.** `cta_practice_recursive_end` points at
  challenge 81 (Hard, Pro) because no free challenge in the bank is a recursive
  CTE, and the card says so in as many words. Read that one against
  `content_lock_reached` on the `blog-recursive` door, never against solves.
  Its mid-post sibling points at 179, which is free.
- **The exits will move `first_contact_share`.** A cold reader who takes an
  exit lands *inside* a named challenge, so their `first_challenge_started` is
  the post's challenge and not #91. That is intended, and it means a shift in
  the first-contact distribution after 2026-09-08 is this change, not a routing
  regression — check `src=blog-*` before reading it as one.
- **Two posts' exits point at sector content** (`blog-fraud` → 273,
  `blog-capital-one` → 276, both on the `finans_fraud` card ledger). Those two
  are also the posts whose closing-card secondary is a sector track rather than
  a topic page. If only those two move, the read is confounded with whatever
  else is happening to the finans track — say so rather than crediting the exit.

Three more traps that belong to cohort B only:

- **On these pages the click IS the app open.** The exit href is `/app/?...`,
  so a `cta_practice_*` click and the `app_opened` it causes are the same act
  by the same browser. "Opened app % rose" is therefore *implied* by "clicks
  happened" and is not independent evidence — 15 clicking browsers on 247
  readers is +6 points on its own. The rung that is not mechanical is the
  **solve rate of the openers**: it sits at 42-50% today on a handful of
  people, and if volume doubles while that collapses, the exit manufactured
  clicks rather than practice. Read the two together or neither.
- **n is tiny and one page is most of it.** `sql-practice-comparison` is 123 of
  the 247 readers; `vs-leetcode-sql`'s entire pre-period is **one** app opener,
  so its "3% → x%" cannot be read on its own at any outcome — one extra person
  is +2.6 points. Under ~40 readers a page is `UNREADABLE` alone and exists only
  inside the four-page total, exactly as the blog posts do.
- **These four pages rank for competitor queries.** Traffic moves when a
  competitor changes its pricing page or an assistant changes what it
  recommends, neither of which is this change. If `landing_view` on the four
  moves materially against the 247 baseline, check the query mix before
  crediting anything — `UNREADABLE`, same rule as the blog's seasonality.

## `ai_mention_share`

Of the prompts in the panel, what share of an answer engine's answers name
SQL Quest. Per lane (Gemini, OpenAI, Anthropic, Perplexity), read weekly by
the `ai-visibility` task from the output of
`scripts/agent/ai-visibility-probe.mjs`. Not a SQL metric: the source is the
probe's JSON, and the verifier reads it from
`docs/reads/ai-visibility-YYYY-MM-DD.summary.json` —
`summary.perLane.<lane>.mentionShare` — never from the prose of the report.

Why it exists: the AI-assistant recommendation channel is the only channel
that has produced a paying user (payer #2, 2026-08-28, by Gemini for
"analytics prep"), and it is invisible in `pro_events` — zero arrivals
stamped from chatgpt / perplexity / gemini / copilot / claude in 60 days to
2026-09-06, because AI apps strip referrers and `?src=home` overwrote the
utm. `landing_src_split` below reads the traffic side once `landingSrc`
ships; this reads what the engines say, which a traffic stamp can never show
— a recommendation nobody clicks leaves no row.

- **A "mention"** is the probe's `mentioned`: `SQL Quest` / `sqlquest.app`
  in the answer text (patterns in the panel's `ours` block), OR our host
  among the answer's **citations** — Gemini grounding chunks, OpenAI /
  Anthropic `url_citation`s, Perplexity `citations`. A search result the
  model fetched but did not cite (`via: search_result`) is seen, not
  recommended, and does not count. The report shows the text-vs-cited-only
  split beside the share.
- **The denominator is the prompt panel**,
  `scripts/agent/prompts/ai-visibility.json` — 25 prompts as of
  2026-09-06, EN and TR, in three families (`practice_where`,
  `alternatives`, `ai_tutor`). Per lane, share = mentioned / **answered**:
  a prompt that errored (rotted model id, 429, timeout) is reported in
  `couldNotRead`, not counted as a miss. A lane with no key in the fleet's
  environment is skipped and has **no** share — an empty cell, never 0%.
- **Rank** is SQL Quest's position among the sites named in the answer, by
  first appearance, against the panel's `sites` list (DataLemur,
  StrataScratch, LeetCode, HackerRank, …). Read the distribution, not a
  mean; "cited only" is a mention with no rank.
- **Baseline = the first run**, per lane. There is no pre-period: nobody
  asked the engines anything before the probe existed, and payer #2's
  Gemini answer was never captured.
- **The panel is versioned by its sha256**, stamped in every output. A
  changed prompt is a changed metric: compare only across runs with the
  same `panel.sha256`, and treat a panel edit as a new baseline, stated in
  the read.

```bash
# The verifier's read: the per-lane share from the sidecar, no SQL.
node -e "const s=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
  for (const [l,v] of Object.entries(s.summary.perLane)) console.log(l, v.status, v.answered, v.mentioned, v.mentionShare)" \
  docs/reads/ai-visibility-YYYY-MM-DD.summary.json
```

Two traps, stated before the first read:

- **Temperature 0 is not determinism.** Search grounding changes what the
  model is handed from day to day, so the same prompt cites a different
  page next week for no reason of ours. On a 25-prompt panel, one answer is
  4 points; a week-over-week move under two prompts per lane is noise, and
  the readable signal is four weeks in one direction. `UNREADABLE` is the
  honest verdict on a single-week delta.
- **The panel is ours, and it is a sample.** A prompt that names our own
  selling point ("a site with an AI tutor that explains why my query is
  wrong") will score higher than "where do I practice SQL", by
  construction. Read the families apart; a headline share is the panel's
  mix, and a claim built on it must say which family it expects to move.

## `landing_src_split`

Of the people who arrived through the `home` door, what share came from an
AI assistant, a search engine, a social site, some other referrer, or
nothing — by the **`landingSrc`** family stamped alongside `arrivalSrc`.
The traffic-side companion of `ai_mention_share`, and the first read that
can put a number under "`home` is a mix".

`arrivalSrc` keeps its meaning: first-touch door, `home` for the homepage
CTA. **Do not read `landingSrc` as a replacement for it** — open ledger
claims read the `arrivalSrc` series and it is not being redefined.
`landingSrc` is a NEW metadata field, persisted first-touch on the landing
page by `src/track.js` (from `utm_source` and `document.referrer`) and
carried by the app onto `app_opened`, so the `?src=home` on the CTA no
longer erases what the landing page knew. Values are `<family>:<source>`:
`ai:chatgpt`, `ai:perplexity`, `ai:gemini`, `ai:copilot`, `ai:claude`,
`search:google`, `search:bing`, `social:linkedin`, `ref:<host>` for
anything else with a referrer, and null when the browser arrived with no
signal at all. Family is the part before the colon.

**Field born 2026-09-06 — deploy of `c3cb10b` served from 20:11Z (verified: live `track.js` carries `sqlquest_landing_src`, `app.js?v=e147f6c3` carries `landingSrc`).** Before it,
every `app_opened` row reads as null for structural reasons, not because
the traffic was direct; a window that starts before the birth reports a
null share that means nothing. Date it with the shared-traps birth query
keyed by field presence, never with `min(created_at)`:

```sql
SELECT min(d) AS landing_src_born
FROM (SELECT created_at::date AS d, count(*) AS n
      FROM pro_events
      WHERE event = 'app_opened'
        AND ((metadata #>> '{}')::jsonb)->>'landingSrc' IS NOT NULL
      GROUP BY 1) x
WHERE n >= 5;
```

People, not events, identified as `COALESCE(aid, username)` the way
`door_solve_rate` does; one row per person at their first `app_opened` in
the window; internal browsers out by the same `internal` CTE and the
ledger's contaminated aids.

```sql
WITH ev AS (
  SELECT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username)  AS pid,
         created_at,
         COALESCE(((metadata #>> '{}')::jsonb)->>'arrivalSrc', '(none)') AS door,
         ((metadata #>> '{}')::jsonb)->>'landingSrc'                AS landing
  FROM pro_events
  WHERE event = 'app_opened'
    AND created_at >= :since            -- never earlier than the landingSrc birth above
    AND created_at <  :until
),
internal AS (   -- same rule as door_solve_rate: internal by browser, not by row
  SELECT DISTINCT ((metadata #>> '{}')::jsonb)->>'aid' AS pid
  FROM pro_events
  WHERE NOT (<shared filters>)
    AND ((metadata #>> '{}')::jsonb)->>'aid' IS NOT NULL
),
arrived AS (    -- one row per person: the door and landing source on their first app_opened
  SELECT DISTINCT ON (pid) pid, door, landing
  FROM ev
  WHERE pid NOT IN (SELECT pid FROM internal)
    AND pid <> ALL (:contaminated_aids)   -- the list in docs/agent/ledger.md
  ORDER BY pid, created_at
)
SELECT CASE WHEN landing IS NULL THEN '(null)' ELSE split_part(landing, ':', 1) END AS family,
       count(*)                                                    AS people,
       round(100.0 * count(*) / sum(count(*)) OVER (), 0)          AS share_pct
FROM arrived
WHERE door = 'home'                     -- the door the AI channel lands on; drop to read every door
GROUP BY 1 ORDER BY people DESC;
```

Add `landing` to the `SELECT` and `GROUP BY` for the per-source split
(`ai:chatgpt` vs `ai:perplexity`); keep the family roll-up as the headline,
because most sources will be single digits for months.

- **Null is still a mix.** Gemini sends neither a utm nor a referrer, so
  the one assistant known to have sent a payer stays inside `(null)` with
  true direct traffic. A falling `ai:*` share with a rising null is not the
  channel shrinking. The panel side (`ai_mention_share`, Gemini lane) is the
  only read Gemini has.
- **The `ai:*` families are floors.** ChatGPT's `utm_source=chatgpt.com` and
  Perplexity's referrer are the two signals that exist today; an assistant
  that stops sending one turns its traffic to null overnight. A step down
  in `ai:*` on one day is a vendor change until proven otherwise — check
  `min(created_at)` per source after the step before reading behaviour.
- **First touch wins, like `arrivalSrc`.** A returning visitor keeps the
  landing source that acquired them, so `people` counts acquisition. Add
  `returning` (stamped on `app_opened`) to read new arrivals alone.
- **Small families read as noise.** The `home` door brought 268 people in
  the 28 days to 2026-09-06; an `ai:*` family under ~12 people gets a count,
  not a percentage.
- **Baseline = the first 28 days after birth**, and there is no pre-period
  by construction. A claim that "AI traffic grew" cannot be made against
  anything before the field existed; the first read establishes how much of
  `home` is attributable at all.

## `review_ask_funnel`

Of the people the product asked to say something in public, how many took a
door. Four events, one funnel, all born **2026-09-07**:

| event | when it fires |
|---|---|
| `review_ask_shown` | the card mounted in the post-solve success panel — once per browser, ever |
| `review_ask_clicked` | the public-review CTA was clicked; `platform` says where (`trustpilot` today) |
| `review_ask_dismissed` | the ✕ was pressed; permanent, that browser is never asked again |
| `review_private_note` | "send me a private note instead" opened the feedback widget with `topic='review'` |

All four carry `surface` (`post_solve`) and `solves`; `review_ask_shown` also
carries `reason` (always `eligible` — the other `REVIEW_ASK_REASONS` values
never reach an event, they are why nothing was shown) and `activeDays`.

**Baseline is 0 for all four, structurally**, and the reason is not "nobody
clicked": the feature ships behind `FEATURE_FLAGS.features.reviewAsk = false`,
so `review_ask_shown` cannot fire at all until the flag flips after the
paywall-surfaces read on 2026-09-20. **A window that starts before the flag
flip is measuring a disabled feature.** Date the birth by the flag flip
recorded in the ledger, not by `min(created_at)` — and cross-check with the
shared-traps birth query (first day with 5+ rows), which on a population this
small may never trigger.

```sql
WITH ev AS (
  SELECT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username) AS pid,
         event, created_at,
         ((metadata #>> '{}')::jsonb)->>'platform' AS platform
  FROM pro_events
  WHERE created_at >= :since               -- never earlier than the flag flip
    AND event IN ('review_ask_shown','review_ask_clicked',
                  'review_ask_dismissed','review_private_note')
    AND <shared filters>
)
SELECT count(DISTINCT pid) FILTER (WHERE event='review_ask_shown')      AS shown,
       count(DISTINCT pid) FILTER (WHERE event='review_ask_clicked')    AS clicked_public,
       count(DISTINCT pid) FILTER (WHERE event='review_private_note')   AS chose_private,
       count(DISTINCT pid) FILTER (WHERE event='review_ask_dismissed')  AS dismissed
FROM ev;
```

People, not events (P2) — though here the two nearly agree by construction,
because `review_ask_shown` is capped at one per browser for life.

Traps, stated before the first read:

- **`review_ask_clicked` is an intent, not a review.** It records that the
  Trustpilot tab was opened. Trustpilot gives us no callback and no
  per-reviewer identity, and we deliberately do not want one — the card tells
  the user in as many words that we cannot see who wrote what. So the click is
  the last thing this funnel can see, and the number of reviews that actually
  exist is read by **looking at the public Trustpilot page**, by hand, and
  writing the count into the ledger with that provenance stated. Never report
  clicks as reviews.
- **The denominator is tiny and it is a ceiling, not a rate.** Eligibility is
  15+ lifetime solves AND 2+ distinct active days (`src/utils/review-ask.js`,
  justified there against the bank). Measured 2026-09-07 on
  `challenge_solved` with the shared filters, people by aid: **75 people have
  ever qualified, 57 were active in the previous 31 days, 38 in the previous
  14.** Once-ever means the pool drains as it is asked; a falling weekly
  `shown` count after the first fortnight is the pool emptying, not the
  surface breaking.
- **Nobody is asked twice, and a dismissal is forever**, so there is no
  re-ask arm to compare against and there never will be. If the ask
  underperforms, the next move is placement or copy for people who have *not*
  yet been asked — the already-asked cohort is spent.
- **Never read this next to an incentive.** There is none, by law and by
  platform terms, and a source guard in `tests/review-ask.test.js` fails the
  build if one appears near the copy. If `clicked/shown` looks low against
  some industry benchmark, that benchmark is measuring incentivised asks.
- **Zero `review_ask_shown` with a live flag is a real finding**, and it means
  the eligibility gate, not the card: check the reason distribution by
  instrumenting it, or check whether wall-hitters are eating the population
  (the same session that fires `content_lock_reached` can never fire this).

## `paywall_ask_efficiency`

**Clicks per person shown** — `pro_checkout_clicked` people divided by
`pro_modal_shown` people, both by `COALESCE(aid, username)`, over a stated
window. The one number the signup→subscriber plan
(`docs/plans/signup-to-subscriber-2026-09-08.md`) is aimed at.

Measured 2026-09-08 over 60 days: **282 people shown, 12 clicked = 4.3%**, and
**4 of those 12 paid (33%)**. The two ends of the funnel are healthy — signups
+94% with the engaged share up to 64.5%, and a third of clickers buy. Only
shown→click is broken.

**Read clicks, never shows.** The intervention this metric exists to judge
*deliberately reduces* the number of people shown, so a falling `shown` is the
mechanism working. A falling absolute `clicked` is the failure.

Companion splits, both measured 2026-09-08 and both worth carrying:

- **By intent, 60 days:** `interview` 41 shown → 4 clicked; `job_ready` 48 → 2;
  `learning` 41 → **0**; no intent captured 52 → **0**. 93 people shown, zero
  clicks, no exception.
- **By Coach goal, engaged users, 90 days:** with a goal 52 shown → 3 clicked
  → **3 paid**; without one 78 shown → 6 clicked → **0 paid**. A goal does not
  predict clicking (5.8% vs 7.7%) — it predicts *finishing*. **n = 3; Fisher
  exact p ≈ 0.08.** A direction, not a result.

**The trap this metric must not be used to justify.** Making goal-setting a
step toward checkout would convert the goal from "I chose this deliberately"
into "I clicked past a gate", and the 3/3 correlation would not survive it.
The goal is most plausibly a marker of a real deadline, not a cause of
payment. Never gate the offer on having set one.

## `referral_funnel`

**People**, by `COALESCE(aid, username)`, through the peer-to-peer invite
path. Born 2026-09-08; **baseline 0 on every step, structurally** — none of
these events existed before, so absence prior to that date is the
instrumentation, not behaviour.

| event | question it answers |
|---|---|
| `leaderboard_tab_viewed` | how many people are ever on the only screen the invite button lives on (one per user per day, same shape as `coach_tab_viewed`) |
| `referral_modal_opened` | of those, how many press 🎁 — carries `hasCode`, `isGuest` |
| `referral_link_copied` | how many take the link away |
| `share_clicked` | which platform, and whether it came from the invite modal (`fromReferralModal`) or the general share button — carries `platform`, `shareKind`, `hasCode` |
| `referrals.event_type='click'` on an 8-char code | someone on the other end actually arrived |

**Why it exists.** `referrals` has held 103 rows since 2026-04-29 and every
one is a marketing campaign code; the personal half has produced **zero rows
in the product's history**. Until this metric, that zero could not be read: it
was equally consistent with "nobody wants to invite anyone" and with "nobody
has ever been on the Leaderboard tab". Three separate faults were found behind
it (a missing column, a missing RPC, and a code scheme that collided on 13 of
348 accounts) — but even with all three fixed, the funnel above is what says
whether the surface is reachable at all.

**Read the steps as a ladder, not a rate.** If `leaderboard_tab_viewed` is
itself small, nothing below it is interpretable and the answer is placement —
the invite button is in the wrong place — not copy and not incentives.

**Do not add an incentive to this funnel before it has been read once.** The
2026-09-08 discussion of "do 3 tasks, get a month of Pro" depends on the
referral task being both verifiable and reachable; this metric is what
establishes the second.

## `quotable_testimonials`

Feedback submitters who explicitly consented to be quoted. Lives in
`public.feedback`, not `pro_events` — the consent and the words are on the
table anon cannot read back out; only the boolean echoes into
`feedback_submitted.quoteConsent`.

Born with `supabase/migrations/20260907_feedback_quote_consent.sql`, **applied
— verified 2026-09-08: `feedback` carries `quote_consent`, `quote_name` and
`quote_consent_at`.** Before it was applied the client sent the three keys and
PostgREST dropped them, so the message landed and the consent did not: a NULL
`quote_consent` on any row written before that date means "the column did not
exist", which is indistinguishable from "never asked". Date the birth by the migration.

```sql
select created_at, quote_consent_at, quote_name, message,
       context->>'solvedCount' as solves, context->>'topic' as topic
from feedback
where quote_consent is true
order by created_at desc;
```

- **NULL is not false.** The five pre-existing rows were never asked. Reading
  NULL as consent — or as refusal — are both wrong; only `is true` is a
  consent, and only that row may be quoted.
- **Read the verbatims, never a rate.** n will be single digits for months
  (P9). "3 of 4 consented" from n=4 is not a consent rate.
- **The name is the one the person typed**, capped at 80 chars. It is not
  their username and must not be swapped for one when the quote is published.

## `interview_prep_funnel`

Of the people who reach the countdown card **on the Coach tab**, how many name
a company and a date and then actually open something from the plan. Five
events, one funnel, all born **2026-09-08**:

| event | when it fires |
|---|---|
| `prep_readiness_shown` | the countdown card mounted — once per mount of the **Coach** tab; carries `company` (null before a target is picked), `bucket`, `mockTaken` |
| `prep_target_set` | the company select or the date input changed; carries `company` and `daysOut` |
| `prep_plan_viewed` | fired alongside `prep_readiness_shown` when a date resolves to a plan; carries `status`, `daysOut`, `todayItems`, `targetRemaining` |
| `prep_plan_item_opened` | a row in today's list was clicked, **or the Coach's rehearsal step was started**; carries `kind` (`target`/`drill`/`mock`), `challengeId`, `interviewId`, `skill` |
| `coach_step_mock_offered` | the Coach's next-step card painted the timed-rehearsal offer; carries `company` and `daysOut` (integer, null when no date is set) |

**The card moved on 2026-09-08, the day after it was written.** It shipped at
the top of the Interview Prep tab and now renders on the Coach, below the
next-step card. Nothing about the four original events changed except the
surface they fire on — which is the whole point, and it means the denominator
in the trap list below is now the Coach, not a tab with no navigation entry.
Both surfaces are pre-flip, so no window is split across the move.

**Baseline is 0 for all five, structurally.** The feature ships behind
`FEATURE_FLAGS.features.interviewCountdown = false` and the flag does not flip
until after the paywall-surfaces read on 2026-09-20. Date the birth by the flag
flip recorded in the ledger, never by `min(created_at)` — a window that starts
before the flip is measuring a disabled feature.

```sql
WITH ev AS (
  SELECT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username) AS pid,
         event, created_at,
         ((metadata #>> '{}')::jsonb)->>'company'  AS company,
         ((metadata #>> '{}')::jsonb)->>'bucket'   AS bucket,
         ((metadata #>> '{}')::jsonb)->>'status'   AS status,
         ((metadata #>> '{}')::jsonb)->>'kind'     AS kind,
         (((metadata #>> '{}')::jsonb)->>'daysOut')::int AS days_out
  FROM pro_events
  WHERE created_at >= :since               -- never earlier than the flag flip
    AND event IN ('prep_readiness_shown','prep_target_set',
                  'prep_plan_viewed','prep_plan_item_opened',
                  'coach_step_mock_offered')
    AND <shared filters>
)
SELECT count(DISTINCT pid) FILTER (WHERE event='prep_readiness_shown')  AS reached_card,
       count(DISTINCT pid) FILTER (WHERE event='prep_target_set')       AS set_a_target,
       count(DISTINCT pid) FILTER (WHERE event='prep_plan_viewed')      AS saw_a_plan,
       count(DISTINCT pid) FILTER (WHERE event='prep_plan_item_opened') AS opened_an_item,
       count(DISTINCT pid) FILTER (WHERE event='prep_plan_item_opened'
                                     AND kind='mock')                   AS opened_the_mock,
       count(DISTINCT pid) FILTER (WHERE event='coach_step_mock_offered') AS offered_a_mock
FROM ev;
```

People, not events (P2). `prep_readiness_shown` fires once per MOUNT, not once
per person — a user who leaves the tab and returns writes a second row, so the
event count is a visit count and only `count(DISTINCT pid)` is a person count.

Traps, stated before the first read:

- **The denominator is the Coach tab, since 2026-09-08.** It was the Interview
  Prep tab for one day. That tab has no navigation entry — `showLegacyPrimaryNav`
  is hard-coded `false` in `src/app.jsx`, so the shipped primary nav is two tabs
  (Learning Path, Challenges) and `activeTab === 'trials'` is reachable only
  through the `?interview=<id>` deep link on the company pages and the
  onboarding branch for `goal === 'interview'`. Measured 2026-09-08 against
  production with the shared filters: **22 accounts in the entire history of the
  product carry any `interviewHistory` row**, against **1,179 people who have
  viewed the Coach**. The move is why `reached_card` has a real ceiling at all.
  **The nav entry was NOT restored** and is not coming back — that was a
  deliberate onboarding decision, so a low `reached_card` can no longer be
  explained by the door.
- **`reached_card` is now an impression on a tab people land on by default, not
  an intent signal.** On the trials tab, arriving was itself evidence of
  interview intent. On the Coach it is not: the card renders for every Coach
  visitor who is past the first-run shell, whatever they came for. So
  `reached_card` inflates by construction relative to the old surface, and the
  ratio that carries information is `set_a_target / reached_card`, not
  `reached_card` itself. Do not compare that ratio to anything measured before
  the move — there is nothing measured before the move.
- **`nav_interview` is not this tab.** It has 5 rows from 5 people
  (2026-08-01..09-07) and it is the `data-track` on the marketing nav
  **dropdown toggle** in `src/index.html`. Joining it to anything in-app is a
  category error.
- **`bucket`, never the score.** `prep_readiness_shown` carries a coarse band
  (`none` / `0-24` / `25-49` / `50-74` / `75-100`) on purpose. The score is a
  measure of progress through our own material and nothing else; a per-person
  number in the funnel invites a "how ready are our users" reading the feature
  explicitly refuses to support, and `bucket='none'` means the person is under
  the 5-solve evidence bar, not that they scored zero.
- **The date never reaches the funnel.** `prep_target_set` carries `daysOut`,
  an integer, and no event carries the calendar date the user typed. A guard in
  `tests/interview-prep.test.js` fails the build if one is added.
- **`company` is always the same string today.** Exactly one company clears the
  eligibility bar in `src/utils/interview-prep.js`: Capital One, on
  `finans_fraud`, with 10 tagged challenges and the `capital-one-codesignal`
  mock. **The bar changed on 2026-09-08** and the old description of it — "≥
  0.9 of that dataset's company tags", a computed exclusivity share — is gone,
  so do not read a historical note that mentions it as current. The third
  conjunct is now membership of an **archetype**, the written editorial claim
  in `src/data/interview-archetypes.js` that a dataset is shaped like a kind of
  company's screen. A tag cannot grant it; a person writes it down and signs
  it. A second value appearing in this column therefore means **somebody added
  a member** — go and read that diff before reading the funnel. (The old bar
  had the property that co-tagging the target set for a second issuer removed
  the *first* company too, which would have shown up here as the column going
  empty rather than gaining a value. That failure mode no longer exists.)
- **Zero solves exist on the target set.** Ids 275-284 shipped 2026-09-07;
  measured 2026-09-08, **0 people have solved any of them** and 1 person has
  solved anything in `finans_fraud` at all. So `coverage` starts at 0 for
  everybody and the first fortnight of `bucket` is measuring the radar part
  alone. Do not compare bucket distributions across the first solve wave.
- **The population that would want this.** In the 31 days to 2026-09-07
  (shared filters, people by aid): **155 people declared `intent` of
  `interview` or `job_ready`**, 144 of them solved at least one challenge, and
  **83 reached 5+ solves** — the evidence bar the readiness number needs. On
  the Coach, `reached_card` is no longer capped by that 83; it is capped by
  Coach traffic (965 people in those 31 days). The 83 is now the ceiling on
  `set_a_target`, which is the number worth predicting.
- **`coach_step_mock_offered` is a much smaller funnel and a different one.**
  Five conditions must hold at once (`src/utils/coach.js`,
  `pickMockInterviewStep`): the flag, **Pro**, a named target that clears the
  eligibility bar, the `interview-prep` exit criteria met at 80% of each
  threshold, and no sitting of that mock in 14 days. Three people have ever
  paid. Expect a single-digit or zero count, and read it as a check that the
  gate is not stuck rather than as a conversion rate. Fires **once per page
  load** while the offer stands (`coachMockOfferRef.tracked`), so its event
  count is a load count, not a person count — `count(DISTINCT pid)`, as
  everywhere else here.
- **Starting the rehearsal from the Coach writes `prep_plan_item_opened` with
  `kind='mock'`, the same row a plan click writes**, deliberately: the mock has
  one door (`openPrepItem` → `startInterview`) and one lock event. The two
  origins are separable by looking for a `coach_step_mock_offered` from the
  same `pid` shortly before. If you need them separated cleanly, that is a
  payload field to add before the flip, not after.

## `cold_first_solve_rate`

Of the challenges opened by a browser that has **never solved anything**, what
share produced a solve within 24 hours — read against the **warm control**, the
same rate for browsers that had already solved at least once.

This is the activation instrument. It exists because the 2026-08-21
schema-columns claim was closed MISS on `challenge_solve_through(99)`, an
instrument whose population (all openers of one challenge, mostly warm) did
not overlap the change's population (cold users on any challenge). Under this
metric the same change reads +6.3pp. See
`docs/reads/signup-growth-cause-2026-09-11.md`.

**Always report both arms.** The cold number alone cannot separate a product
fix from a change in traffic quality, challenge mix, or grading — all of which
move the warm arm too. The control is the metric; the cold rate is half of it.

```sql
WITH ev AS (
  SELECT ((metadata #>> '{}')::jsonb)->>'aid' AS aid, event, created_at
  FROM pro_events
  WHERE ((metadata #>> '{}')::jsonb)->>'aid' IS NOT NULL
    AND event IN ('challenge_opened','challenge_solved')
    AND <shared internal-account filters>
),
opens AS (
  SELECT o.created_at AS t,
    EXISTS (SELECT 1 FROM ev s WHERE s.aid = o.aid
              AND s.event='challenge_solved' AND s.created_at < o.created_at) AS warm,
    EXISTS (SELECT 1 FROM ev s WHERE s.aid = o.aid
              AND s.event='challenge_solved'
              AND s.created_at > o.created_at
              AND s.created_at < o.created_at + interval '24 hours') AS solved24
  FROM ev o
  WHERE o.event='challenge_opened' AND o.created_at >= :since AND o.created_at < :until
)
SELECT CASE WHEN warm THEN 'warm_control' ELSE 'cold_treated' END AS arm,
       CASE WHEN t < :deploy_ts THEN 'pre' ELSE 'post' END        AS window,
       count(*)                                                    AS opens,
       count(*) FILTER (WHERE solved24)                            AS solved,
       round(100.0*count(*) FILTER (WHERE solved24)/count(*), 1)   AS pct
FROM opens GROUP BY 1,2 ORDER BY 1,2;
```

Measured baselines, 2026-09-11:

| Period | Cold | Warm control |
|---|---|---|
| 2026-07-20 → 08-21 12:09Z | 39.7% (n=678) | 86.8% (n=2603) |
| 08-21 → 09-02 09:24Z | 46.0% (n=400) | 85.4% (n=2130) |
| 09-02 → 09-10 | 51.7% (n=267) | 87.6% (n=1830) |

Traps:

- **`aid`, never `username`.** A cold user is usually a guest, and guests get a
  fresh username per page load. Grouping by username shatters the cold arm and
  inflates it, because a browser that solved on its second identity looks like
  two browsers that each opened once.
- **`aid` is only stamped from 2026-07-27.** `:since` earlier than that reads a
  shrinking denominator as a rising rate.
- **The 24-hour window right-censors the last day.** Do not include opens whose
  window has not closed; `:until` must be at least 24h before now.
- **Warm is defined per open, not per browser.** The same browser is cold for
  its first open and warm afterwards, which is the point — the arms are states,
  not cohorts, so nobody is double-counted inside one arm.
- **A change that touches both arms cannot be read here.** If the control moves,
  the metric has told you the cause is not scoped to first-run; that is a valid
  read, not a failure.

## `bing_page_ctr` / `bing_citations`

Bing's own numbers for a page: impressions, clicks, CTR and average position;
and, in a **separate panel**, how often Microsoft Copilot cites it.

Registered 2026-09-11, the first day anyone opened Bing Webmaster Tools for
this site. It matters more than its late arrival suggests: Bing sent 356
first-time browsers against Google's 528 in the same six weeks and produced
**more solvers** (99 vs 73) and a better signup rate (11.0% vs 8.7%). See
`docs/reads/signup-growth-cause-2026-09-11.md` and
`docs/plans/bing-channel-2026-09-11.md`.

There is no API in use, so this is a hand read.

**Recipe**

1. `https://www.bing.com/webmasters/searchperf?siteUrl=https://sqlquest.app`
2. **Check the site picker first.** It also holds `claudequest.app` and
   `datrick.com`; the panel renders identically for all three.
3. Pick the window (7D / 30D / 3M / 6M), then `List By` → **Pages** or
   **Keywords**. `Download all` exports the full table.
4. Copilot: left nav → **AI Performance** → `List By` → Grounding Queries or
   Pages.

**Baselines, 3 months to 2026-09-08**

| | |
|---|---|
| Clicks / impressions / CTR | 809 · 23.7K · 3.42% |
| Pages with ≥1 impression | **41 of 85 built** |
| `/sql-exercises/` | 11.4K impr · 489 clicks · **4.28%** · position 6.36 |
| Copilot citations | **12,600**, avg 12 cited pages/day |

Traps, all found on the first read:

- **`searchperformance` (the long spelling) renders "No pages found".** The
  working path is `searchperf`, which is what the left-nav link uses. An empty
  panel here is a URL bug, not a site with no data.
- **Keywords and Pages cover WEB traffic only.** The panel says so in a line
  that is easy to scroll past: Chat and other verticals are excluded. So the
  809 clicks and the 12.6K citations are disjoint populations — never add them,
  and never read a flat click series as "the AI channel is not working".
- **AI Performance is explicitly a sample** ("Results may be refined as
  additional data is processed"). Read its *shares* and its *shape*, not its
  absolute counts.
- **Position is an average over impressions**, so a page that ranks 3rd for its
  best query and 15th for a long tail reports something in between. A CTR that
  looks weak for the reported position is usually a mix, not a bad snippet.
- **Zero clicks at a good position is not always a defect.** The clearest case
  here: `cte acronym meanings education sql`, 795 impressions, position 5.94,
  **0 clicks**. Bing answers definitional queries inline. The page earning
  those impressions is simultaneously Copilot's third-most-cited source.
  Before "fixing" a zero-CTR page, look at which query it ranks for.
- **Bing's index is Yahoo's and largely DuckDuckGo's.** When sizing the
  channel from our own `ref` field, count all three or you undercount by ~40%.

**The three Top Recommendations on the Home panel, read 2026-09-11.** Two of
the three are not defects, and it is worth writing down which, because they
will be there again next time:

- *"Some URLs are not getting indexed due to robots NOINDEX meta tags"*
  (Moderate, 7 pages) — **working as intended.** All seven are `/app/` and its
  query-string variants. `/app/` carries `noindex, follow` plus a canonical to
  itself, is deliberately absent from the sitemap, and is the product rather
  than a page we want ranked. No action.
- *"Your site has limited crawl capacity"* (**High**, 1 site-level error) —
  its recommended action is to exclude junk URLs in robots.txt and to raise the
  crawl quota in Crawl Control. **Neither is the fix**, and raising the slider
  would be theatre: it is a *ceiling*, not a throttle we are hitting. Crawl
  Control sits on Default and the rate bars are well below the cap all 24
  hours, so Bing is not being held back by us. Crawl capacity on a domain this
  size is a function of authority, which is the third recommendation —
  *"not enough inbound links from high quality domains"* — wearing a different
  hat. Treat #1 and #3 as one problem with one lever, and that lever is links.
- Do **not** add `Disallow: /app/` to robots.txt to silence the noindex
  warning. The most-shared URLs on the site are `/app/?challenge=N&src=…` deep
  links from the blog and comparison pages; disallowing them removes the
  unfurl card from every share to buy back seven crawls.

**URL Submission** (left nav) is separate from IndexNow and worth using on top
of it: 100 URLs/day against Google's ~10. Same URL trap as Search Performance —
`/webmasters/url-submission` renders "No pages found"; the working path is
`/webmasters/submiturl`, which is where the left-nav link goes. Open it, click
**Submit URLs**, one URL per line, Submit.

Two corrections to what this repo used to say about it, both observed
2026-09-11 while submitting `/vs-sqlbolt/` and `/vs-sqlzoo/`:

- **The Submitted Urls list does NOT lag.** Both URLs appeared at the top of
  the table with a "Today at 02:03" timestamp immediately after the success
  toast. CLAUDE.md's older note ("the submission lands via the quota counter,
  not the URL Submission table, which lags") was written from a different
  observation and no longer holds.
- **The quota counter is still the better proof**, because it is a number
  rather than a row: it read 100 before and **98** after, which confirms both
  URLs consumed quota rather than merely being listed. Reopen the dialog to
  read it; that costs nothing.


## `gsc_position` / `external_links`

Google's side of the same question `bing_page_ctr` answers, plus the backlink
profile Bing's third recommendation is about. Both are hand reads of Search
Console on the domain property `sc-domain:sqlquest.app`.

Registered 2026-09-11 alongside the first side-by-side read of both consoles.

**Baselines, 3 months to 2026-09-08**

| | Google | Bing |
|---|---|---|
| Impressions | **73.6K** | 23.7K |
| Clicks | 982 | 809 |
| CTR | 1.3% | 3.42% |
| Average position | **15.7** | ~6 |
| Indexing | 76 indexed, 54 not | 41 pages with impressions |

**The sentence those two columns make:** Google shows us to three times as many
people and sends 21% more clicks, because 15.7 is the middle of page two. Bing
ranks us around 6 and its arrivals are also worth more — 58.6% reach a first
solve against Google's 49.0%, and 11.0% sign up against 8.7%. So on Google the
constraint is **ranking, not indexing**: "Discovered – currently not indexed" is
zero, which means Google has crawled us, kept us, and placed us.

**External links, 2026-09-11: 57 total, and 44 of them from `saasmarket.site`.**
Strip that one directory-shaped domain and the profile is roughly a dozen links
from four domains — dev.to, linkedin.com, microsoft.com and `sql-quest.app`, a
hyphenated variant of our own domain that we do not own and should look into.
Plan: `docs/plans/backlinks-2026-09-11.md`.

**Exclusion list — apply it to every position and CTR read.** Four
competitor-brand queries carry 23% of our Google impressions and produce 21
clicks: `stratascratch` (8,467 impressions, 0.0% CTR, position 7.6),
`datalemur` (6,388, 0.1%, 7.1), `datalemur sql` (1,798, 0.4%, 7.0) and
`stratascratch sql` (376, 0.3%, 8.8). A brand searcher does not click result
seven, so there is no lever on them, and including them makes the site-wide
average move when Google changes its mind about our competitors. **The site-wide
15.7 is an artifact; read position per page instead**, against the same page's
Bing position. Working: `docs/reads/google-position-2026-09-11.md`.

**The per-page gap is the number worth watching.** Same page, two engines,
2026-09-11:

| Page | Bing position | Google position |
|---|---|---|
| `/sql-exercises/` | **6.36** (11.4K impressions) | **24.5** (1,250) |
| `/best-sql-practice-sites/` | 5.44 | 9.7 |
| `/snowflake-sql-interview/` | 3.49 | 13.2 |
| `/blog/sql-cte-tutorial/` | 6.07 | ~25-31 (via its queries) |

Traps:

- **Read the two consoles together or you will draw the wrong conclusion.**
  Bing's numbers alone say we rank well; Google's alone say we have an indexing
  problem. Neither is true. Indexed-but-page-two and ranked-but-lower-volume are
  different problems with different levers.
- **The sitemap panels are not self-refreshing.** Both consoles last read our
  sitemap on 2026-09-09 and had 87 (Google) and 86 (Bing) against a live 89.
  Resubmit after any deploy that adds a page, with the FULL URL
  `https://sqlquest.app/sitemap.xml` — the bare `sitemap.xml` is rejected on a
  domain property. **Google re-reads instantly** (Sep 11, 89 discovered, within
  seconds of the toast); Bing goes to "Processing" and takes longer.
- **The 404 count is not necessarily our defect.** Google lists 8 "Not found",
  validation Failed. A crawl of every internal link in `public/` on 2026-09-11
  found **zero** links pointing at a page we do not build, so those 404s were
  discovered from outside — old URLs or someone else's typo. Check the internal
  crawl before writing code to chase them.
- **"Excluded by noindex" (32) and "Page with redirect" (11) are intended.**
  The 32 are the 30 weekly archive permalinks plus the app shell; the 11 are
  the `.html` → directory redirects. Neither is a defect and both will be there
  at every read.

## `interview_reach`

Of the people who solve at least one challenge in the window, how many reach
the Interview Prep tab, and what they do there. Three events, born at the
`intentRouting` flip — date the birth by the flip time recorded in the ledger
claim "intent routing: a handle on the interview door", never by
`min(created_at)`:

| event | when it fires |
|---|---|
| `interview_tab_viewed` | once per user per day on the first mount of the Interview tab; carries `entry` (`nav` / `deeplink` / `onboarding` / `guest_shell` / `unknown`), `reason` (`history` / `intent` / `goal` / `company` / null — why the nav entry was showing), `intent`, `solvedCount`, `hasHistory`, and the target pin: `targetCompany` (resolved from countdown target → company filter → arrival), `targetMockId` (non-null only when that company is a registry member with a sittable mock — today only `capital-one-codesignal`), `targetTaggedCount` |
| `interview_started` | a mock starts or resumes, AFTER the Pro check; carries `interviewId`, `company`, `difficulty`, `isFree`, `resumed` |
| `interview_completed` | the last question is answered; carries `interviewId`, `company`, `passed`, `percentage`, `questions`, `retry` |

The locked-mock collision is not one of these: it is `content_lock_reached`
with `surface='interview'`, and it carried `interviewId` before 2026-09-12.

```sql
WITH ev AS (
  SELECT COALESCE(((metadata #>> '{}')::jsonb)->>'aid', username) AS pid, event,
         ((metadata #>> '{}')::jsonb)->>'entry'       AS entry,
         ((metadata #>> '{}')::jsonb)->>'reason'      AS reason,
         ((metadata #>> '{}')::jsonb)->>'intent'      AS intent,
         ((metadata #>> '{}')::jsonb)->>'interviewId' AS interview_id
  FROM pro_events
  WHERE created_at >= :flip_time            -- never earlier than the flip
    AND event IN ('interview_tab_viewed','interview_started','interview_completed')
    AND <shared filters>
)
SELECT count(DISTINCT pid) FILTER (WHERE event='interview_tab_viewed')                   AS reached_tab,
       count(DISTINCT pid) FILTER (WHERE event='interview_tab_viewed' AND entry='nav')   AS reached_via_nav,
       count(DISTINCT pid) FILTER (WHERE event='interview_started')                      AS started_a_mock,
       count(DISTINCT pid) FILTER (WHERE event='interview_completed')                    AS finished_a_mock
FROM ev;
```

Denominator for a rate: people with `intent_captured` in `interview` /
`job_ready` in the same window (the routed arm). `learning` is the control and
should read near zero here, because the tab is not shown to them.

Traps, stated before the first read:

- **`entry='unknown'` is a real bucket**, not a bug. Any `setActiveTab('trials')`
  the four tagged sites do not cover (a last-activity resume, for one) lands
  there. If it dominates, find the site before reading `nav`.
- **The tab needs one solve.** A zero-solve person cannot see it by design, so
  `reached_tab` is a post-first-solve number and must not be divided by
  arrivals or by signups.
- **Seven of the eight mocks are Pro-locked.** `interview_started` fires after
  the Pro check, so a locked click is a `content_lock_reached`
  (`surface='interview'`), not a start. Read both, and expect the lock count
  to rise when the tab appears — that is the surface being reached, not a
  paywall change. The cold-start denominator is untouched: the tab does not
  exist at zero solves.
- **Lifetime before the flip: 22 accounts with any interview history**
  (measured 2026-09-11 from `users.data.interviewHistory`). That is the only
  pre-flip number, and it is a stock, not a 30-day flow.

## `guest_continuity`

Does anonymous work survive, and does it follow the person into an account?
Three signals, all born 2026-09-12 (the deploy is the birth; never
`min(created_at)`):

| event | when it fires |
|---|---|
| `guest_resumed` | a browser that already held a `guest_*` identity with progress came back and the app resumed it instead of minting a new one; carries `solvedCount` |
| `guest_progress_merged` | a login folded this browser's guest blob into the account; carries `newSolves`, `newAttempts`, `xpAdded`, `guestSolves`, `account` |
| `signup_completed` with `carriedSolves` | the auth-modal register path now carries the guest blob; `carriedSolves` is how many solves came along (the post-solve prompt path, `source='guest_conversion'`, always carried them) |

```sql
SELECT count(DISTINCT ((metadata #>> '{}')::jsonb)->>'aid') FILTER (WHERE event='guest_resumed')          AS resumed_people,
       count(*)                                                 FILTER (WHERE event='guest_progress_merged')  AS merges,
       count(*)                                                 FILTER (WHERE event='guest_progress_merged'
                                                                          AND (((metadata #>> '{}')::jsonb)->>'newSolves')::int > 0) AS merges_with_solves,
       count(*)                                                 FILTER (WHERE event='signup_completed'
                                                                          AND (((metadata #>> '{}')::jsonb)->>'carriedSolves')::int > 0) AS signups_carrying_solves
FROM pro_events
WHERE created_at >= :deploy AND <shared filters>;
```

Traps, stated before the first read:

- **`users` guest rows are per browser from 2026-09-12, per page load before.**
  The 4,989-row figure in objectives.md was a page-load count; a fall in new
  `guest_*` rows after the deploy is the fix, not a fall in visitors. Count
  people by `aid`, as always.
- **A resumed guest is not a first contact.** `first_contact_activation` reads
  each aid's first `challenge_opened`; a returning browser that keeps its
  solves no longer re-runs the opener, but its first contact already
  happened. The 105 read (09-13) is unaffected by construction.
- **The register path writes the same single row it always did**, only with a
  fuller blob. The 09-19 "users writes restored" read counts rows, not
  fields, and is unaffected.
- **A merge with `newSolves = 0` is still a merge**: the guest solved things
  the account already had. Read `merges_with_solves`, not `merges`, for the
  value delivered.

## `coach_page_take_rate`

Of the people who saw the full Coach with a goal on a day, how many took the
card's step that day. Born 2026-09-12 with `coach_step_started`, fired at the
top of `handleCoachStepStart` for every step type; carries `type`,
`challengeId`, `lessonId`, `skill`, `preview` (true for the hard-preview
offer, which the 09-20 claim reads separately through `openedFrom`).

```sql
WITH v AS (
  SELECT ((metadata #>> '{}')::jsonb)->>'aid' AS aid, created_at::date AS day
  FROM pro_events
  WHERE event = 'coach_tab_viewed' AND created_at >= :since
    AND ((metadata #>> '{}')::jsonb)->>'shell' = 'full'
    AND ((metadata #>> '{}')::jsonb)->>'hasGoal' = 'true'
    AND <shared filters>
), s AS (
  SELECT DISTINCT ((metadata #>> '{}')::jsonb)->>'aid' AS aid, created_at::date AS day
  FROM pro_events WHERE event = 'coach_step_started' AND created_at >= :since
)
SELECT count(DISTINCT v.aid) AS viewers,
       count(DISTINCT v.aid) FILTER (WHERE EXISTS (SELECT 1 FROM s WHERE s.aid = v.aid AND s.day = v.day)) AS takers
FROM v;
```

Before the event existed the only proxy was "opened any challenge or lesson
the same day": **16 of 25 people (64%) over the 14 days to 2026-09-12**, 68
viewer-days. That proxy counts opens from anywhere, so the first real read
will come in below it even if nothing changed; compare the event to itself
from then on.

Traps, stated before the first read:

- **Most Coach viewers are not in this denominator.** `coach_tab_viewed`
  carries `shell`; the majority sit in `first_run` (the placement quiz) and
  never see the goal card. This metric is the full shell only, by design.
- **n is small.** 25 people in 14 days; below 20 viewers a rate is
  UNREADABLE, extend.
- **The placement check is a step too.** A cold user's first "take" is
  `type='placement_check'`; split by `type` before reading it as a challenge
  take.
