# The 10-07 reads: the P1 guardrail, Bing's index, and a crawler wave

## 1. A crawler wave from 2026-10-04 — read this before any activation number

Two waves through the topic pages' `/app/?challenge=…&src=challenges-*`
links (disallowed in robots.txt since 09-23; these ignore it):

- **10-04 → 10-05:** 186 first opens arriving from `challenges-*` with ~4
  events each, 0–1% solving, viewports and timezones varied (no single
  fingerprint). On normal days that door carries 2–7 people, 100% of whom
  open the challenge and 25–50% solve.
- **10-06 → 10-07:** viewport exactly `desktop:1919x992`, no `landingSrc`,
  five rotating US timezones, ~3 events, 0 solves — **184 of 228 first opens
  on 10-06 and 360 of 406 on 10-07 (by 14:00 UTC).**

`app.jsx`'s event writer has no bot filter (the landing tracker's `isBot()`
never covered the app), so every one is a "new person" in `first_solve_10m`,
the quota and every funnel denominator. Exclusion for reads:
`viewport = 'desktop:1919x992' and landingSrc = ''`; the 10-04/05 wave has no
fingerprint — read those two days on the randomised first-screen arms only,
or leave them out. Fix: a separate PR (bot signals on the app's events).

## 2. The P1 guardrail (flag-queue log, rows 1/4/5 flipped 09-30)

`first_solve_10m` on the first-screen arms (randomised, the cleanest
population), people assigned within 2 minutes of their first open, internal
and the three known bot fingerprints out:

| window | challenge arm | quiz arm | both |
|---|---|---|---|
| 09-23 → 09-29 (before) | 35/64 = 54.7% | 18/73 = 24.7% | 53/137 = **38.7%** |
| 09-30 → 10-03 | 24/48 = 50.0% | 9/54 = 16.7% | 33/102 = 32.4% |
| 10-04 → 10-06 | 13/38 = 34.2% | 12/49 = 24.5% | 25/87 = 28.7% |
| 09-30 → 10-06 (after) | | | 58/189 = **30.7%** |

**The rule's number is tripped: −8.0 points against a 3-point limit.** Rule 3
says the queue stops and nothing is reverted by the agent; the numbers go to
the founder. What the read can and cannot say:

- n is small (137 vs 189; a 95% interval on the difference is about ±10
  points), the after-window holds a weekend, and the quiz arm in 10-04 → 10-06
  carries 10 thin sessions (≤ 4 events) of the crawler kind. Dropping thin
  sessions from both windows: 39.6% → 33.9% (−5.7).
- **The mechanism check does not implicate the flags.** The flag most able to
  slow a first solve is `socraticLadder` (the tutor no longer hands over the
  query on the first ask). Among inline-help opens, the share solved within
  30 minutes went **64.1% → 68.7%** (357 opens before, 83 after), and the 41
  `tutor_bypass_clicked` after 09-30 show the ask-for-the-answer path works.
- The challenge arm's fall sits in 10-04 → 10-06, three days after the flags,
  on the days the crawler arrived — not on 09-30 → 10-03 (50.0% vs 54.7%,
  inside noise).

**Recommendation: keep the three flags on; re-read 2026-10-14 on clean data**
(the bot filter live, a full week). Revert `socraticLadder` alone if the arms'
combined `first_solve_10m` is still more than 3 points under 38.7% with the
help-to-solve rate flat. `hint_to_solve` stays the claim's metric, read 10-21.

## 3. Bing's index

- `bing_crawl_daily.in_index` (Bing's indexed count): 163 on 09-22 → 173
  (09-25) → 213 (09-29) → 319 (09-30) → **328 on 10-01**, the last day Bing's
  crawl API returns — it lags ~6 days (the 10-07 fetch wrote 156 days ending
  10-01; the pipeline is healthy, every run since 10-05 succeeded).
- `bing_url_status`: 416 sitemap URLs, **119 never crawled, all `/questions/`**
  (135 on 10-01), 43 crawled in the last 7 days.
- Doubled in nine days, after the 09-23 internal-link work, the robots
  change and the hand submissions — not separable. The 119 are the
  submitter's first job on Monday 10-12 (14-day cooldown ends).
