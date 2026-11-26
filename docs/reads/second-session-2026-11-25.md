# `second_session_7d` — a broken event or a real drop? (read 2026-11-25)

Backlog B1 (scorecard 2026-11-22 row): `second_session_7d` read 6.9–7.9%
against a 16.2% baseline, and `app_opened` rows per first-open person halved
(2.13 → 1.13). Hypothesis on the table: `app_opened` stopped firing on a
return visit, and #49 (2026-10-08, bot stamping) is the one commit since
September that touches the event.

**Verdict: real drop. `app_opened` is not broken.** Returns fell, and they
fell for people who solved on day 0, through the same doors, from the first
opens of 2026-09-25/26 on — two weeks before #49. Read-only queries on
`pro_events` / `email_events`; people by `aid`; internal usernames, the known
internal aid, `metadata.bot` and the three crawler viewports
(`tablet:800x600`, `desktop:1280x1200`, `desktop:1919x992`) excluded — a
person with any such row is dropped whole.

## 1. The event fires on return days, before and after #49

Code (origin/main, `src/app.jsx` ~8052): one `app_opened` per browser per
UTC day (`sqlquest_app_opened_day` in localStorage), fired once
`isSessionLoading` settles. #49 only adds a `bot` stamp and three coarse
fields to the payload and a hard drop for `navigator.webdriver` / bot UAs in
`writeProEvent`; nothing in it gates on a return. `git log -S app_opened` on
`src/app.jsx` shows no other change since 09-03 (the later #85 adds boot
timing to the payload only).

Data: of the days on which a person who already had a first open did
anything in the app (any non-landing event), the share that carry an
`app_opened`:

| Week (return day) | App days | With `app_opened` | % |
|---|---|---|---|
| 08-10 | 72 | 63 | 87.5 |
| 08-17 | 144 | 120 | 83.3 |
| 08-24 | 146 | 111 | 76.0 |
| 08-31 | 200 | 173 | 86.5 |
| 09-07 | 252 | 207 | 82.1 |
| 09-14 | 267 | 222 | 83.1 |
| 09-21 | 346 | 298 | 86.1 |
| 09-28 | 234 | 203 | 86.8 |
| 10-05 (#49 on 10-08) | 174 | 155 | 89.1 |
| 10-12 | 172 | 140 | 81.4 |
| 10-19 | 131 | 108 | 82.4 |
| 10-26 | 130 | 111 | 85.4 |
| 11-02 | 109 | 94 | 86.2 |
| 11-09 | 109 | 95 | 87.2 |
| 11-16 | 121 | 104 | 86.0 |

Flat at 82–89% throughout; no step at 10-08. The ~14% without one are tabs
left open across midnight UTC, most likely (the de-dupe runs once per page load, so a tab opened yesterday logs today's events with no `app_opened`) —
the same share in every week. `app_opened` rows per (aid, day) are 1.00 in
every week, so the de-dupe has not changed either.

What halved is the number of **return days**, not the share of them that
log the event: app days by already-seen people went from 250–350 a week in
September to ~110 in November.

## 2. Returns fell, by every definition

Scorecard windows, today's crawler filter:

| First opens | n | As defined (`app_opened` > 1 h, ≤ 7 d) | Any app event on a later UTC day | Any app event after a ≥ 30-min gap |
|---|---|---|---|---|
| 08-17 → 09-16 | 1,067 | **18.7%** | 21.6% | 28.0% |
| 10-18 → 10-31 | 559 | **7.9%** | 8.9% | 12.3% |
| 11-01 → 11-14 | 389 | **6.9%** | 8.7% | 15.2% |

The 10-18 and 11-01 rows reproduce the scorecard exactly (7.9%, n 559;
6.9%, n ≈ 390). The baseline reads **18.7%, not 16.2%**, under today's
filter: the 11-20 viewport fingerprints (#58) remove 110 crawler "people"
from the 08-17 → 09-16 cohort that the 09-23 read counted. Every definition
that does not depend on `app_opened` falls by half or more too.

## 3. The drop is among real people, and starts 09-25/26

Return within 7 days (any app event on a later UTC day) among people who
**solved a challenge on day 0** — no crawler solves:

| First opens (4-day buckets) | Day-0 solvers | Returned |
|---|---|---|
| 09-05 | 60 | 51.7% |
| 09-09 | 51 | 37.3% |
| 09-13 | 57 | 49.1% |
| 09-17 | 56 | 57.1% |
| 09-21 | 103 | 49.5% |
| **09-25** | 64 | **20.3%** |
| 09-29 | 62 | 29.0% |
| 10-03 | 44 | 25.0% |
| 10-07 | 51 | 37.3% |
| 10-11 | 56 | 30.4% |
| 10-15 | 29 | 27.6% |
| 10-19 | 36 | 19.4% |

Weekly, solver return: 40–53% for every week 08-10 → 09-21; 18–33% for
every week 09-28 → 11-16. The step is between first opens of 09-21..24 and
09-25..28, two weeks before #49.

Within the same doors (first `app_opened`'s `arrivalSrc`), A = 08-17 →
09-25, B = 09-26 → 11-14:

| Door | n A → B | Solved day 0 | Returned (all) | Returned (solvers) |
|---|---|---|---|---|
| `sql-exercises` | 531 → 522 | 39.0% → 40.8% | 23.9% → 16.1% | 46.4% → 24.4% |
| `home` | 381 → 97 | 33.6% → 33.0% | 26.2% → 10.3% | 50.0% → 15.6% |
| `best-sql-practice-sites` | 85 → 49 | 38.8% → 32.7% | 30.6% → 14.3% | 51.5% → 25.0% |
| `learn-sql` | 35 → 37 | 34.3% → 37.8% | 25.7% → 16.2% | 58.3% → 21.4% |

The Bing door holds its volume and its day-0 solve rate exactly, and its
solvers' return halves. That rules out "the crawler mix explains it" as the
main cause.

Guests and registered people both fell (day-0 solvers, A → B): guests
36.8% → 21.2% (n 304 → 377), registered 59.3% → 39.3% (n 214 → 112). The
registered share of day-0 solvers fell from 41% to 23%, and day-0 solves per
solver from 5.3 to 3.5 (guests) and 9.4 to 6.2 (registered).

## 4. Traffic mix — real, but the smaller part

Low-intent doors grew: first opens arriving from `challenges` (the topic
pages' `/app/?challenge=` links) 171 → 1,217, `question` 107 → 417, `blog`
20 → 127, plus 58 `google` first opens with no solve at all. These return at
0.7–2.6% and pull the denominator down; some are crawlers the fingerprints
do not catch yet (the 09-28 week has 1,732 first opens at a 2.3% return).
But removing them would not restore the baseline: the high-intent doors
fell by half on their own (section 3).

## 5. Most likely cause: the 09-26 flag batch (confounded)

On 2026-09-26 (`781ce126`) six flags flipped together: `freeQuota` (10
free solves), `companySetGate`, `deadlineOffer`, `goalWallEarly`,
`mockDoor`, `firstScreenChallenge`. The goal gate was also live for some
hours on 09-25 before it was switched off the same night. The break lands on
those dates. The batch cannot be separated in this data: six changes on one
day, and the return drop shows up in solvers who never reached a content
lock within 7 days too, so it is not the quota wall alone.

Ruled out:
- **A broken `app_opened`** — section 1.
- **#49** — the step is two weeks earlier; return-day coverage is flat
  across 10-08.
- **Email senders stopping** — `skill_decay_lesson`, `welcome_back` and
  `capture_drip_*` keep sending through October and November;
  `streak_save` falls (100 → ~20 a week) as a consequence of fewer streaks,
  not as a cause.
- **An `aid` reset** — `src/utils/anon-id.js` has not changed since 07-28.

## 6. What this means for the metric

- The scorecard's 6.9–7.9% stands as a real number. Re-state the baseline
  as **18.7%** under today's crawler filter so the two sides use one filter.
- `app_opened` is once per UTC day by design, so the metric never counts a
  same-day return and slightly undercounts a tab left open across midnight.
  That bias is the same before and after (section 1), so the series is
  comparable. A cross-check on any app event is added to `metrics.md`; it
  is not a replacement.
- The next step is a product question, not a measurement one: which of the
  09-26 changes cost the return. Splitting by arm is possible for the
  first-screen test (`first_screen_*` events assign by `aid`); the rest
  flipped for everyone and can only be read by turning one back.
