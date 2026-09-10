# Why signups grew — measured 2026-09-11

Weekly signups went **18 → 24 → 38 → 39 → 49** across the five weeks from
2026-08-03, roughly 22% compounding. `docs/agent/metrics.md` (`signup_growth`)
records the series. This file answers the founder's question: *what caused it.*

The first attempt failed. `landingSrc` is stamped on 30 of 194 signups, so
first-touch attribution cannot carry the read. The answer came instead from
two fields nobody had used: `page` and `ref` on the 3,716 `reason='landing'`
rows written since 2026-07-28.

---

## The answer in one line

**Traffic ×1.4 and cold-user activation ×1.3, multiplied.** Neither half is a
marketing win. The traffic came almost entirely from one page, and the
activation came from two first-run fixes — one of which this ledger recorded
as a MISS.

---

## Method: the tracking hole forces a page split

Four pages — `home`, `after-the-sql-course`, `after-bootcamp`,
`sql-for-the-ai-era` — lost their `track.js` tag from 2026-08-05 to 2026-09-05
(CLAUDE.md, landing analytics). Any weekly series that includes them reads the
2026-09-06 repair as growth. Every table below therefore uses only the pages
with **continuous** tracking across the whole window, and counts each browser
once, at its first landing.

That split is what makes the read possible; it is not a detail.

## Half one — traffic, and it is one page

First-time browsers landing on continuously-tracked pages:

| Week | Landings | of which `/sql-exercises/` |
|---|---|---|
| 2026-08-03 | 303 | 51 |
| 2026-08-10 | 336 | 81 |
| 2026-08-17 | 343 | 75 |
| 2026-08-24 | 303 | 75 |
| 2026-08-31 | 432 | 102 |

Total +43%. `/sql-exercises/` doubled and supplies +51 of the +129. Nothing
else moved outside noise: `best-sql-practice-sites` 31→42,
`sql-practice-comparison` 31→27, the company pages flat.

**No new channel opened.** Referrer mix over the same weeks: Google 68→90,
Bing 51→71, no-referrer 137→218. Every source grew at roughly the site's own
rate, so this is one page ranking better, not a discovery.

**Bing is not a rounding error.** Across the whole window Bing sent 351
first-time browsers against Google's 520 — 40% of identified search traffic
to a channel no one has been managing. DuckDuckGo (65) and Yahoo (76) add
more. Assistants are small and visible: Copilot 33, Gemini 20, Claude 13,
ChatGPT 11.

**Half of all arrivals carry no referrer at all**, and that share is flat
(45-50% every week), so it grew with everything else. It is not "direct
traffic": `/blog/sql-group-by-tutorial` is 92.5% referrer-less and
`/vs-leetcode-sql` 84.1%, and nobody types those URLs. Treat the no-referrer
bucket as *stripped* referrers, not typed visits.

## Half two — cold users started solving

Landing-cohort funnel, same continuously-tracked pages, by landing week:

| Week | Landed | → opened a challenge | opened → solved | solved → signed up |
|---|---|---|---|---|
| 2026-08-03 | 303 | 19.8% | 48.3% | 41.4% |
| 2026-08-10 | 336 | 20.2% | 42.6% | 62.1% |
| 2026-08-17 | 343 | 23.3% | 50.0% | 45.0% |
| 2026-08-24 | 303 | 22.8% | 56.5% | 74.4% |
| 2026-08-31 | 432 | 21.3% | 63.0% | 44.8% |

Landing→open is flat. Solve→signup is noisy with no trend. **The whole
conversion gain sits in open→solve**, and it is not a page-mix artifact: it
rose inside the biggest door on its own (`/sql-exercises/` 43.1% → 58.1%
across the 08-21 boundary, n=102 vs 136).

### The control group settles it

Every `challenge_opened` in the window, split by whether that browser had ever
solved anything before, and whether a solve followed within 24 hours. Cold
users saw the first-run shell; warm users always had the schema sidebar, so
they are an untreated control that rides out any change in traffic quality,
challenge mix, or grading.

| Period | Cold (treated) | Warm (control) |
|---|---|---|
| 07-20 → 08-21 12:09Z | **39.7%** (269/678) | 86.8% (2260/2603) |
| 08-21 → 09-02 09:24Z | **46.0%** (184/400) | 85.4% (1819/2130) |
| 09-02 → 09-10 | **51.7%** (138/267) | 87.6% (1603/1830) |

Cold rises 12 points; the control never moves. Pooling the two post periods
against the pre period gives z = 3.9 on the cold arm and +0.4pp on the
control.

The two steps land on two commits, both on the first-run path and nowhere
else:

- **2026-08-21 12:09Z, `066eee2`** — the "Tables used" card lists each table's
  columns. The first-run shell had hidden the schema from exactly the users
  who had never solved anything. +6.3pp (z = 2.0).
- **2026-09-02 09:24Z, `359b355`** — challenge 105 "Your First JOIN" opens
  every `working` track; 99 drops to step 2. +5.7pp (z = 1.4, not significant
  on its own).

### What it was not

- **Not the grader.** Two grader fixes landed in the window (`20a5779`
  08-28, `adcd56f` 09-06). Event-level solves-per-open is flat across all of
  it — 0.53, 0.58, 0.53, 0.49, 0.56, 0.57, 0.55 by week — and a grader change
  would have moved the warm control. It didn't.
- **Not cohort maturity.** Later cohorts have had *less* time to solve, which
  biases against the observed direction.

---

## Correction to the ledger

The 2026-08-30 entry closed the schema-columns claim **MISS** on
`challenge_solve_through(99)`: 43.8% against a 46% baseline.

That verdict was right about its own instrument and wrong about the change.
The fix removed the schema from *first-run users on any challenge*; the claim
measured *one challenge, all users*. Challenge 99's openers are mostly warm,
and the warm arm was never treated — the metric could not have moved even if
the fix worked perfectly.

**The correct instrument is `cold_first_solve_rate` with the warm control**,
now registered in `docs/agent/metrics.md`. Under it the fix reads +6.3pp.

The lesson generalises past this one entry: *a claim on a per-challenge metric
cannot test a change that is scoped to a user state.* Match the instrument's
population to the change's population before writing the target down. Nothing
about the MISS process failed — the falsification was stated in advance and
honoured. The instrument was chosen badly, ten days earlier.

## What this changes

1. **Activation work is the growth engine, and it is measurable.** Two small
   first-run fixes produced ~half of a 2.7× signup move. O1's denominator is
   people reaching six solves; this is the cheapest lever we have found.
2. **`/sql-exercises/` is the franchise.** One page supplies 40% of tracked
   arrivals and all of the traffic growth. It deserves more than the rest of
   the page estate combined.
3. **Bing has never been worked.** 40% of identified search traffic, zero
   attention. Bing Webmaster Tools is already set up with a 100 URL/day quota
   against Google's ~10.
4. **Retire per-challenge instruments for user-state changes.** See the
   correction above.
