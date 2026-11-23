# Tesla — SQL interview dossier

**Dossier date:** 2026-11-23 (R1, batch 5). **Refresh by:** 2027-01-22.
**Page:** `/tesla-sql-interview/` — a general page ("we have no dated public
source for how Tesla runs its SQL round … no duration, no platform, no stage
list"). **Verdict of this run: stays general.** One readable candidate report
for a data role was found; every richer source refused the read.
**Demand:** 74 impressions / 3 clicks in 28 days to 2026-11-21 (INDEX).

## Sources

Read with WebFetch on 2026-11-23. No other fetcher, no cache, no archive.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| T1 | aced.io (ex-Exponent): Tesla Data Analyst interview, Entry / L3, United States | https://www.aced.io/experiences/tesla-data-analyst-interview-1aa171 | interview Oct 2025 (per the filtered list); added "5–6 months ago" on 2026-11-23 | candidate report | 200 |
| T2 | aced.io filtered list, Tesla × data analyst / data scientist | https://www.aced.io/experiences?company=tesla&role=data-analyst (and `role=data-scientist`) | — | list | 200 (DA: 1 exact match, T1; DS: none) |
| T3 | DataLemur: Tesla SQL interview questions | https://datalemur.com/blog/tesla-sql-interview-questions | updated 2025-04-05 | practice guide; its questions are DataLemur's own | 200 |
| T4 | Prepfully: Tesla Data Scientist interview guide | https://prepfully.com/interview-guides/tesla-data-scientist | "Updated: 2023" | prep guide; says it read 60+ Tesla DS postings | 200 |
| T5 | datadriven.io: Tesla data engineer interview guide | https://datadriven.io/companies/tesla/interview | last updated 2026-09-23 | prep guide; practice problems only, no loop facts | 200 |
| T6 | PracHub: Tesla interview experiences + company page | https://prachub.com/interview-experiences?company=Tesla ; https://prachub.com/companies/tesla | reports Jul 2025 – Sep 2026 | list | 200 — 16 reports, **all software / ML engineering, none for a data role**; one DE SQL question title dated 2026-05-04 |

Refused or not usable (each final for this run):
- **tesla.com/careers** — 403.
- **Glassdoor** (Tesla review pages; the search results are almost all
  Glassdoor) — 403 on the first fetch; not retried for any company.
- **Interview Query** Tesla DA guide — 429.
- **1point3acres** thread 1182004 ("Tesla Senior Data Analyst interview
  experience") — not attempted (site-wide 403 in batch 4). FOUNDER hand read.
- aced.io Tesla DS experiences page — 404.
- Search-result summaries mention CoderPad, a take-home SQL test and a
  charging-station case for Tesla data roles. **All of it came from Glassdoor
  and Interview Query snippets, so none of it is a source here.**

## Format

| fact | sources | confidence |
|---|---|---|
| Data analyst (L3, US, Oct 2025): recruiter screen → a technical interview with **one SQL question** → a phone interview (Tesla Energy, how you would use AI in the role) → an **onsite panel that opens with a 10-minute presentation** of a problem you solved. About 4 weeks. | T1 | low |
| The SQL question in that technical interview was **generating the Fibonacci sequence in SQL** (a recursive CTE). | T1 | low |
| Data scientist: a ~30-minute recruiter screen, then a 40–45-minute hiring-manager round that may include a case or data problem, then an onsite. | T4 (2023 guide) | low, and old |
| Platform, SQL round length, dialect, take-home | — | **none** (snippet-only claims are not sources) |

## Topics reported

M = 1 candidate report with SQL detail (T1).
- Recursive CTE / generating a sequence — 1 of 1

DataLemur (T3) lists its own Tesla-themed practice items, which are not
reports: previous-day comparison with LAG over charging sessions; parts that
started assembly but have no finish (NULL filter); ad-click → add-to-cart
conversion by campaign (CTE + join + rate); referral page pairs (self-join);
average price per model per year; a battery index with ABS/SQRT/ROUND;
fleet distance and power by model and year. datadriven (T5) adds
consecutive-day streaks (gaps-and-islands) for its DE practice set.

## Question shapes (paraphrased)

Candidate-reported:
- **Fibonacci in SQL (T1, DA Oct 2025):** produce the first N Fibonacci
  numbers with a query alone. No business table; tests recursion in SQL.
  *Bank: 44 and 81 are recursive CTEs over an org chart; no
  sequence-generation item. Low priority: one report.*

## Role variants

- **Data analyst:** T1 only (above). The candidate's tip was that coding
  accuracy outweighed the behavioural rounds.
- **Data scientist:** no candidate report readable; T4 is a 2023 guide.
- **Data engineer:** no candidate report readable; PracHub lists one DE SQL
  question title ("data transformation queries", 2026-05-04).
- **BI / analytics engineer:** nothing found.

## What changed

No earlier Tesla read existed; this is the first.

## Recommendations for the page (for C2 / C1; nothing here edits a page)

- **Keep the page general.** Nothing here clears "medium". Do not add the
  Fibonacci question, the presentation, or a platform.
- **Unsourced claims on the existing page** (`src/tesla-sql-interview.html`):
  1. `<meta name="description">`, `og:description` and `twitter:description`:
     "Practice the SQL patterns **Tesla screens for** in data and
     manufacturing analytics interviews: sensor rollups, defect rates by
     line, moving averages over production runs" — no source says what Tesla
     screens for. Suggest "Practice SQL on manufacturing and telemetry
     data: …".
  2. JSON-LD `Course.description`: "matching the patterns **Tesla screens
     for** in data analyst, data scientist, and analytics engineer
     interviews" — same problem, and names three roles no source covers.
  3. Hero: "**Tesla's data roles sit on factory floors and vehicle
     telemetry**: sensor rollups, defect rates by line, moving averages over
     production runs" — a claim about Tesla's data roles with no source.
     The disclaimer box right under it says the opposite ("no dated public
     source").
  4. "Six SQL Quest challenges matched to **Tesla's patterns**", "Tesla-pattern
     set", "Tesla-pattern SQL" — implies known patterns; "matched to
     manufacturing and telemetry SQL" is accurate.
  5. FAQ "Does this page know…": "The one page on this site that does carry
     dated public sources for a company's screen is the Capital One page" —
     **stale**: TikTok, Bloomberg, Revolut, Wise and other pages now carry
     sourced sections. The same sentence is in 21 company pages (grep, 2026-11-23), Apple's among them.
  6. The cross-link blurb "Tesla — Defect rates, sensor rollups, moving
     averages" (registry in `scripts/build-company-crosslinks.mjs`, shown on
     other pages) is fine as a practice-set description but reads as a
     Tesla fact; consider "Manufacturing and telemetry practice".
- FOUNDER: the 1point3acres Tesla Senior DA thread (1182004) and one
  Glassdoor Tesla data-analyst review are the only places the format seems
  to be written down.
