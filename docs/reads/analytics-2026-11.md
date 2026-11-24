# Analytics — November 2026 (AN, daily)

One file a month; each run appends a dated section, newest last. Lane brief:
`docs/agent/fleet/AN-analytics.md`. Queries: `scripts/analytics/daily.sql`
(Query 1 `segment_funnel`, Query 2 the exclusion audit), read-only Supabase.
Aggregate counts only. Per-segment money (checkout clicks, trials,
purchases) stays off this public repo; money appears as site totals.

---

## 2026-11-23 — first read

Windows end 2026-11-23 ~21:30 UTC. **28 days** = people who entered from
2026-10-26; **7 days** = people who entered from 2026-11-16. People by
`COALESCE(aid, username)`, README rule 2 exclusions applied (audit below).
"Landed" = the `landing_people` rule on the first page in the window, or an
app open with no landing row (`(app only)`).

### Site funnel

| Window | Landed | Opened app | First run | First solve | Signup | Pro modal | Checkout click | Paid (webhook) |
|---|---|---|---|---|---|---|---|---|
| 28 d | 1,323 | 683 (51.6%) | 280 (21.2%) | 226 (17.1%) | 60 | 108 | 14 | 6 |
| 7 d | 340 | 172 (50.6%) | 79 (23.2%) | 58 (17.1%) | 13 | 21 | 2 | 0 |

Paid = a person with a `stripe_webhook` trial or purchase at or after entry.
The 7-day cohort has had at most 7 days; read money at 28.

### Countries (proxy: IANA `tz` → country; `country` is not yet on the rows)

28 days, top 10 by people. Rate = landed → first solve.

| Country | Landed | Opened | First run | First solve | Signup | Pro modal | Rate | Flag |
|---|---|---|---|---|---|---|---|---|
| IN | 348 | 203 | 93 | 68 | 15 | 27 | 19.5% | |
| US | 288 | 111 | 42 | 36 | 10 | 28 | 12.5% | |
| GB | 88 | 53 | 21 | 18 | 6 | 8 | 20.5% | |
| (other zones) | 61 | 35 | 12 | 8 | 3 | 4 | 13.1% | |
| TR | 40 | 25 | 14 | 10 | 1 | 2 | 25.0% | |
| SG | 31 | 11 | 4 | 3 | 1 | 1 | 9.7% | |
| PL | 31 | 21 | 7 | 7 | 3 | 3 | 22.6% | |
| CA | 29 | 13 | 2 | 2 | 1 | 3 | 6.9% | n<30 |
| DE | 28 | 18 | 10 | 9 | 1 | 4 | 32.1% | n<30 |
| FR | 22 | 12 | 8 | 7 | 1 | 1 | 31.8% | n<30 |

7 days: IN 91 → 16 solved (17.6%, z −0.47 against its 28 d), US 76 → 8
(10.5%, z −0.52), GB 23 → 8 (n<30), TR 11, DE 10, PL 9. No country moved
by the rule.

- **US converts at 12.5% against India's 19.5%** (about 2.4 standard errors
  apart), and opens the app less (39% vs 58%). Part of the US row may be
  crawler residue in `America/Los_Angeles` (that zone had 1,016 browsers
  and 5 solvers before exclusions). Watch line; the real `country` field
  (PR #277) will settle it.
- HK: 19 landed, 0 opened — crawler-shaped, n<30.

### Devices

Device = the first `viewport` band; before 2026-11-22 landing rows had no
viewport, so the landing `ua` decides for people who never opened the app.

| Device | Window | Landed | Opened | First run | First solve | Signup | Pro modal | Rate | z (7 vs 28) |
|---|---|---|---|---|---|---|---|---|---|
| desktop | 28 d | 1,109 | 611 (55%) | 271 | 219 | 57 | 101 | 19.7% | |
| mobile | 28 d | 196 | 60 (31%) | 7 | 5 | 3 | 6 | 2.6% | |
| tablet | 28 d | 11 | 11 | 2 | 2 | 0 | 1 | n<30 | |
| desktop | 7 d | 286 | 166 (58%) | 76 | 56 | 13 | 21 | 19.6% | −0.07 |
| mobile | 7 d | 52 | 5 (10%) | 2 | 1 | 0 | 0 | 1.9% | −0.29 |

- **The device gap is the largest in the funnel:** a mobile lander solves at
  2.6% against 19.7% on desktop (7.6×). It splits into two leaks: fewer
  mobile landers open the app (31% vs 55%), and of those who open, 12% run
  a query against 44% on desktop. The second leak is the existing signal
  (`mobileRunBar`); the first is new.
- Watch: mobile landed → opened fell to 10% (5 of 52) in the last 7 days
  from 31% over 28 days. The first-solve rule did not fire (n of solvers
  too small), and the landing viewport was born on 11-22, which changes how
  mobile landers are classified inside this window. Re-read on 11-30.

### Landing pages (28 days, top 20 by people)

Site median (pages with n ≥ 30, `(app only)` out): **20.0%** landed → first
solve; CONVERTS needs ≥ 30.0%. DEAD needs ≥ 100 landers and 0 opens.

| # | Page | Landed | Opened | First run | First solve | Signup | Pro modal | Rate | Flag |
|---|---|---|---|---|---|---|---|---|---|
| 1 | /sql-exercises/ | 201 | 126 | 57 | 48 | 10 | 17 | 23.9% | |
| 2 | / (home) | 174 | 93 | 47 | 36 | 11 | 23 | 20.7% | |
| 3 | /blog/capital-one-codesignal-data-analyst-assessment/ | 72 | 9 | 3 | 3 | 0 | 2 | 4.2% | |
| 4 | /best-sql-practice-sites/ | 68 | 18 | 9 | 7 | 2 | 4 | 10.3% | |
| 5 | /wise-sql-interview/ | 59 | 35 | 15 | 13 | 8 | 10 | 22.0% | |
| 6 | /revolut-sql-interview/ | 42 | 26 | 9 | 7 | 1 | 2 | 16.7% | |
| 7 | /challenges/window-functions/ | 37 | 26 | 16 | 15 | 4 | 4 | **40.5%** | **CONVERTS** |
| 8 | /challenges/cte/ | 31 | 26 | 9 | 6 | 2 | 3 | 19.4% | |
| 9 | /snowflake-sql-interview/ | 28 | 20 | 8 | 7 | 2 | 4 | 25.0% | n<30 |
| 10 | /challenges/aggregation/ | 24 | 21 | 9 | 4 | 0 | 0 | 16.7% | n<30 |
| 11 | /vs-sqlbolt/ | 20 | 4 | 1 | 1 | 0 | 0 | 5.0% | n<30 |
| 12 | /challenges/subqueries/ | 19 | 16 | 6 | 3 | 2 | 2 | 15.8% | n<30 |
| 13 | /blog/sql-for-fraud-analytics/ | 18 | 2 | 0 | 0 | 0 | 0 | 0% | n<30 |
| 14 | /turkce-sql-ogren/ | 17 | 11 | 7 | 6 | 1 | 1 | 35.3% | n<30 |
| 15 | /sql-cheat-sheet/ | 15 | 4 | 2 | 2 | 0 | 2 | 13.3% | n<30 |
| 16 | /capital-one-sql-interview/ | 14 | 7 | 3 | 3 | 0 | 3 | 21.4% | n<30 |
| 17 | /learn-sql/ | 13 | 7 | 4 | 4 | 1 | 2 | 30.8% | n<30 |
| 18 | /blog/faang-sql-interview-guide/ | 13 | 4 | 3 | 3 | 0 | 0 | 23.1% | n<30 |
| 19 | /meta-sql-interview/ | 13 | 6 | 2 | 2 | 1 | 2 | 15.4% | n<30 |
| 20 | /sql-practice-comparison/ | 13 | 1 | 1 | 0 | 0 | 0 | 0% | n<30 |
| — | (app only) | 94 | 94 | 13 | 12 | 3 | 13 | 12.8% | |

- **Best:** `/challenges/window-functions/` — 15 of 37 landers solved
  (40.5%, 2× the median). The topic hubs as a family read well
  (`/challenges/`: 8 of 12, n<30).
- **Worst with n ≥ 30:** the Capital One CodeSignal blog guide — 72 landers,
  9 opened the app, 3 solved (4.2%); in the last 7 days 23 landed and **0**
  opened. Capital One is the sharpest buyer signal (CLAUDE.md), so this is
  the page whose readers we most want in the app. No rule covers
  "under-converts"; it is a watch line, and C5's `content_funnel` /
  `landing_to_trial` read is the place to act on it.
  `/best-sql-practice-sites/` is next (10.3%, 18 of 68 opened).
- No DEAD page: no page had ≥ 100 landers and 0 opens.
- Content readers rarely take a practice exit (blog posts 0–4 opens each),
  which matches the existing verdict "blog posts get a real exit" (MISS).

### Signals raised (rows added to `docs/agent/signals.md`)

1. CONVERTS: `/challenges/window-functions/` at 40.5% vs the 20.0% median
   (n = 37).
2. New crawler, excluded by hand from today: the **Asia/Shanghai scroll
   reader** (below). It is not in README rule 2 and `content_funnel` does
   not exclude it, so the mailed per-page funnel is inflated on blog and
   comparison pages.

No country or device segment moved by the rule; no DEAD page.

### Exclusion audit (Query 2, browsers with any event, 28 days)

| Bucket | Browsers |
|---|---|
| kept | 2,568 |
| Asia/Shanghai scroll reader (new, by hand) | 1,730 |
| rule 2 stamps and internal accounts | 697 |
| `langs = 2` no-landing group | 376 |
| `topic1lang` | 277 |
| UTC landing crawler | 181 |

**The Asia/Shanghai scroll reader.** Landing rows in `Asia/Shanghai` from
browsers that never open the app: 1,369 of them fire `landing_engaged` via
`scroll` on a single view (2026-10-26 → 11-23, Windows Chrome UA), so they
pass the `landing_people` rule; 806 also carry a referrer and a
`landingSrc`. Only 10 Shanghai-zone people entered and opened the app in 28
days. Dropping the reader removed 585 "landers": `/best-sql-practice-sites/`
92 → 68, `/sql-practice-comparison/` 32 → 13, and most blog tutorials fell
below 8. `landing_to_trial` already drops `Asia/Shanghai`; `content_funnel`
and this lane did not until today.

### Vercel hand-read

Not done this run (no browser connected). First due Monday 2026-11-30; the
checklist is in the brief.
