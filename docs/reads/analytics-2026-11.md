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

---

## 2026-11-24 — second read

Windows end 2026-11-24 ~17:25 UTC. **28 days** = people who entered from
2026-10-27; **7 days** = people who entered from 2026-11-17. Same query as
11-23 (`scripts/analytics/daily.sql`, Query 1 and 2) plus three hand rules
from C8's 11-24 read (README rule 2, `docs/agent/metrics.md` shared traps),
added to the query's `per` / `hand_rules` for this run only — `daily.sql`
itself is not changed in this docs PR (rule 6b; open thread below):

```sql
-- per:
bool_or(m->>'viewport' = 'desktop:1024x1024') AS vp1024,
bool_or(m->>'tz' = 'Europe/Istanbul' AND m->>'viewport' = 'mobile:375x812'
        AND created_at >= '2026-11-24 11:00+00' AND created_at < '2026-11-24 11:08+00') AS walk,
-- hand_rules, after the four existing WHENs:
WHEN walk   THEN 'walk_1124'
WHEN vp1024 THEN 'vp1024'
WHEN first_open_m IS NOT NULL AND COALESCE(first_open_m->>'landingSrc','') = ''
     AND first_open_m->>'langs' = '1' AND NOT any_landing THEN 'app1lang'
```

### Site funnel

| Window | Landed | Opened app | First run | First solve | Signup | Pro modal | Checkout click | Paid (webhook) |
|---|---|---|---|---|---|---|---|---|
| 28 d | 1,286 | 657 (51.1%) | 277 (21.5%) | 226 (17.6%) | 67 | 112 | 14 | 5 |
| 7 d | 332 | 167 (50.3%) | 85 (25.6%) | 61 (18.4%) | 17 | 22 | 2 | 0 |

Against 11-23 (1,323 → 226, 17.1%): the solvers are the same 226; the
landers fell by 37, 24 of them `(app only)` arrivals that the new
`app1lang` rule removes (94 → 70); the rest is the window moving a day. The
28-day paid count is 5 (6 yesterday); not traced per person here (money
stays off the repo), most likely an entry leaving the window.
7-day landed → first solve 18.4% (z +0.38 against the 28 days): flat.

### Countries (proxy: IANA `tz` → country; PR #277 not merged, `country` not yet on the rows)

| Country | 28 d landed | Opened | First solve | Rate | 7 d landed | 7 d solve | 7 d rate | z | Flag |
|---|---|---|---|---|---|---|---|---|---|
| IN | 341 | 196 | 71 | 20.8% | 89 | 21 | 23.6% | +0.64 | |
| US | 283 | 111 | 35 | 12.4% | 76 | 7 | 9.2% | −0.84 | |
| GB | 85 | 52 | 18 | 21.2% | 25 | 8 | 32.0% | +1.32 | n<30 (7 d) |
| (other zones) | 60 | 33 | 8 | 13.3% | | | | | |
| TR | 39 | 25 | 10 | 25.6% | | | | | |
| DE | 29 | 17 | 9 | 31.0% | | | | | n<30 |
| PL | 28 | 18 | 7 | 25.0% | | | | | n<30 |
| SG | 28 | 10 | 3 | 10.7% | | | | | n<30 |
| CA | 28 | 14 | 2 | 7.1% | | | | | n<30 |
| FR | 20 | 11 | 7 | 35.0% | | | | | n<30 |

No country moved by the rule. Watch: the US opens the app less and less —
landed → opened 32% in the 7 days (24 of 76) against 39% over 28 and 61%
for India; the real `country` (#277) decides whether that is US people or
crawler residue in US zones. HK still 19 landed, 0 opened (n<30,
crawler-shaped).

### Devices

| Device | Window | Landed | Opened | First run | First solve | Signup | Pro modal | Rate | z (7 vs 28) |
|---|---|---|---|---|---|---|---|---|---|
| desktop | 28 d | 1,082 | 593 (55%) | 267 | 218 | 64 | 107 | 20.1% | |
| mobile | 28 d | 186 | 53 (28%) | 8 | 6 | 3 | 4 | 3.2% | |
| tablet | 28 d | 11 | 10 | 2 | 2 | 0 | 1 | n<30 | |
| desktop | 7 d | 277 | 158 (57%) | 81 | 58 | 17 | 22 | 20.9% | +0.33 |
| mobile | 7 d | 52 | 8 (15%) | 3 | 2 | 0 | 0 | 3.8% | +0.25 |

The device gap holds at 6.3× (20.1% vs 3.2%). Mobile landed → opened is 15%
in the 7 days against 28% over 28 (10% in yesterday's 7 days); the
first-solve rule cannot fire on two solvers. Re-read 11-30 as planned.

### Landing pages (28 days, top 20 by people; 7-day column where n ≥ 10)

Site median (8 pages with n ≥ 30, `(app only)` out): **19.8%**; CONVERTS
needs ≥ 29.7%. DEAD needs ≥ 100 landers and 0 opens.

| # | Page | Landed | Opened | First run | First solve | Signup | Pro modal | Rate | 7 d (landed → solve) | Flag |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | /sql-exercises/ | 194 | 120 | 55 | 47 | 10 | 17 | 24.2% | 31 → 9 | |
| 2 | / (home) | 178 | 96 | 49 | 36 | 12 | 25 | 20.2% | 48 → 12 | |
| 3 | /blog/capital-one-codesignal-data-analyst-assessment/ | 73 | 10 | 3 | 3 | 0 | 2 | 4.1% | 22 → 0 (1 opened) | |
| 4 | /best-sql-practice-sites/ | 66 | 18 | 9 | 7 | 2 | 4 | 10.6% | 11 → 2 | |
| 5 | /wise-sql-interview/ | 59 | 37 | 15 | 13 | 8 | 10 | 22.0% | 20 → 5 | |
| 6 | /challenges/window-functions/ | 36 | 25 | 15 | 14 | 4 | 4 | **38.9%** | 11 → 4 | **CONVERTS** |
| 7 | /revolut-sql-interview/ | 36 | 22 | 8 | 6 | 1 | 2 | 16.7% | | |
| 8 | /challenges/cte/ | 31 | 26 | 8 | 6 | 2 | 3 | 19.4% | 12 → 2 | |
| 9 | /snowflake-sql-interview/ | 29 | 21 | 9 | 7 | 2 | 4 | 24.1% | | n<30 |
| 10 | /challenges/aggregation/ | 24 | 21 | 9 | 5 | 1 | 0 | 20.8% | | n<30 |
| 11 | /vs-sqlbolt/ | 21 | 4 | 1 | 1 | 0 | 0 | 4.8% | | n<30 |
| 12 | /challenges/subqueries/ | 20 | 17 | 6 | 3 | 2 | 2 | 15.0% | | n<30 |
| 13 | /turkce-sql-ogren/ | 18 | 12 | 7 | 6 | 1 | 1 | 33.3% | | n<30 |
| 14 | /blog/sql-for-fraud-analytics/ | 16 | 2 | 0 | 0 | 0 | 0 | 0% | | n<30 |
| 15 | /sql-cheat-sheet/ | 15 | 5 | 3 | 3 | 1 | 3 | 20.0% | | n<30 |
| 16 | /sql-practice-comparison/ | 14 | 4 | 2 | 1 | 0 | 0 | 7.1% | | n<30 |
| 17 | /challenges/ | 13 | 10 | 8 | 8 | 1 | 1 | 61.5% | | n<30 |
| 18 | /meta-sql-interview/ | 13 | 6 | 2 | 2 | 1 | 2 | 15.4% | | n<30 |
| 19 | /blog/faang-sql-interview-guide/ | 12 | 4 | 3 | 3 | 0 | 0 | 25.0% | | n<30 |
| 20 | /capital-one-sql-interview/ | 12 | 5 | 1 | 1 | 0 | 2 | 8.3% | | n<30 |
| — | (app only) | 70 | 70 | 10 | 10 | 4 | 12 | 14.3% | 14 → 3 | |

- **Best:** `/challenges/window-functions/` still CONVERTS (38.9%, n = 36;
  the 11-23 row in `signals.md` stands, no new row).
- **Worst with n ≥ 30:** the Capital One CodeSignal blog guide, 4.1%; in
  the last 7 days 22 landed and 1 opened the app (0 yesterday). Watch line,
  no rule covers it; the action sits with C5 (`content_funnel`).
- No DEAD page, no MOVED segment.

### Signals raised

None new. The only rule hit is the CONVERTS row of 11-23, which holds.

### Exclusion audit (Query 2 with the three new rules, browsers with any event, 28 days)

| Bucket | Browsers | First seen in the 7 days | Ran a query | Solved |
|---|---|---|---|---|
| kept | 2,521 | 653 | 280 | 229 |
| Asia/Shanghai scroll reader | 1,704 | 191 | 0 | 0 |
| rule 2 stamps and internal accounts | 453 | 31 | 0 | 0 |
| `topic1lang` | 353 | 288 | 0 | 0 |
| `langs = 2` no-landing group | 350 | 38 | 2 | 2 |
| `app1lang` (new, C8 11-24) | 333 | 95 | 3 | 2 |
| UTC landing crawler | 192 | 138 | 0 | 0 |
| `desktop:1024x1024` crawler (new, C8 11-24) | 20 | 20 | 0 | 0 |
| founder's walk guests, 11-24 11:00–11:08 UTC | 2 | 2 | 2 | 2 |

- `topic1lang` jumped 277 → 353 (288 first seen in the last 7 days) and
  `app1lang` takes another 333, 95 of them new this week: the topic-page
  crawler is still growing, now through other doors (C8's N-row). Together
  ~690 browsers in 28 days with 3 runs.
- The UTC landing crawler 181 → 192.
- Rule 2 stamps fell 697 → 453 as older stamped traffic left the window.
- The `app1lang` rule costs 3 runs / 2 solves in 28 days — the price of a
  hand rule that has no fingerprint beyond "one language, no landing".

### Vercel hand-read

Not due (Mondays; first one 2026-11-30).
