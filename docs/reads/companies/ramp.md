# Ramp — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, second batch). **Refresh by:** 2027-01-21.
**Page:** `/ramp-sql-interview/` — a general page ("we have no dated public
source"). **Verdict of this run: still general, but close.** Two dated
candidate sources from two publishers put a live SQL round in Ramp's analyst
and analytics-engineering loops. That is medium confidence. One more
independent source would make the page sourceable.

## Demand (read 2026-11-22)

- gsc_daily page slice, 28 days to 2026-11-21: 31 impressions / 3 clicks
  (INDEX).
- Query slice, 90 days: no query naming Ramp with interview intent. The only
  hit is "ramp quest" (2 impressions).
- bing_stats, 90 days: none.

## Sources

Read 2026-11-22. "Fetched" means the page was opened that day. Every fetch
used WebFetch, except R1 and R7: WebFetch got HTTP 429 there, so they came
through the Apify fetcher. That fallback was later refused by the session's
permission classifier, so no further Interview Query page was read (see
INDEX, run notes).

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| R1 | Interview Query: "Ramp Data Analyst Interview Guide" (2 candidate reports: Data Analyst, interviewed Q4 2025, offer; Data Analyst, interviewed Q1 2026, rejected) | https://www.interviewquery.com/interview-guides/ramp-data-analyst | "Updated 10 days ago" on 2026-11-22; the reports carry interview quarters | candidate reports, synthesised and AI-anonymised by the publisher | Apify 200 |
| R2 | DataDriven discussion: "Upcoming analytics engineer interview at Ramp" | https://datadriven.io/discuss/upcoming-analytics-engineer-interview-at-ramp-c906c067 | thread started 2026-08-27; newest activity 2026-10-07 | candidate thread. The same title exists as a Blind post (teamblind.com/post/upcoming-analytics-engineer-interview-at-ramp-samr6jis), which answers 402 and was not opened. The page credits no source, so its dates may be repost dates. | 200 |
| R3 | Interview Query: "Ramp Data Scientist Interview Questions + Guide" | https://www.interviewquery.com/interview-guides/ramp-data-scientist | published 2026-03-27 | prep guide (boilerplate, no candidate trail) | Apify 200 |
| R4 | PracHub: "Ramp Data Scientist interview questions guide 2026" | https://prachub.com/interview-guide/ramp-data-scientist-interview-questions-guide-2026 | updated 2026-09-24 | prep guide. It says the stages are "not a published process"; the five-round outline is the same template as PracHub's Plaid page. | 200 |
| R5 | Ramp careers page | https://ramp.com/careers | none (© 2026) | first-party | 200 |
| R6 | Ramp job postings (Ashby public board API): Data Scientist (published 2026-06-03), Data Scientist, Finance (2026-08-11), Senior Analyst, Economic Research and Special Projects (2026-08-31) | https://jobs.ashbyhq.com/ramp/e577622f-6657-4e53-8941-b3a774b04448 · …/aa5512b1-d973-4d74-9d10-d56446ecf803 · …/7c027757-24d8-49f4-90c1-ca3696d244a5 | publish dates as listed | first-party (job text, not the interview) | 200 (api.ashbyhq.com) |
| R7 | Interview Query: "Ramp Product Analyst Interview Guide" (7 reports across Product Analyst, Product Designer, Product Ops, TAM; Q4 2023 to Q1 2026) | https://www.interviewquery.com/guides/ramp-product-analyst | "Updated 6 months ago" | candidate reports, mixed roles | Apify 200 |

**Not usable:**
- Glassdoor refuses automated reads. Its snippets ("SQL technical was harder
  than expected … date wrangling"; a 2022 analytics-engineering manager who
  did "a sql exercise online" before applying) are not sources. The first
  matches R1's offer report.
- Blind answers 402.
- 1point3acres thread 1007632 ("Ramp Engineering Tech Phone Screen: File
  Parsing and SQL Questions", an engineering role) answered 403 and was not
  retried.
- Dataford's Ramp data-analyst guide answered 429. Its snippet names a
  rolling 7-day active-users question; snippet only.

## Format

| fact | sources | confidence |
|---|---|---|
| **A live SQL technical round is part of the analyst / analytics-engineering loop.** DA: an SQL component with "tricky date wrangling", edge cases and query optimisation (offer report, Q4 2025). AE: a live session on CodeSignal, 8 SQL questions plus 3 follow-ups, described as fairly standard (thread of Aug 2026). | R1, R2 | **medium** (2 publishers, 2 roles; R2 may be a repost of a Blind thread) |
| The loop opens with a recruiter screen and a hiring-manager conversation. | R1 (both reports), R2, R7; R4 template | medium (candidate reports; no first-party page) |
| DA (offer, Q4 2025): a **take-home case study with sample data**, presented to a panel of about four cross-functional people, then the SQL round and a leadership conversation. | R1 | low (one report) |
| DA (rejected, Q1 2026): an **AI interview and a one-hour assessment** came first, then recruiter, HM, a cross-team interview, leadership and operations; one "ICA-style" problem with an optimisation follow-up. | R1 | low (one report) |
| The SQL test platform is **CodeSignal**, live (not a take-home). | R2 | low (one thread, AE role) |
| The application itself can carry a technical challenge (string decoding or parsing). | R3 | low (prep guide; Glassdoor snippet only) |
| Product / ops tracks are case-first: a recorded video screen, a business case, a role play with slides. No SQL named. | R7 | medium for "case-first", but the reports are mostly non-data roles |
| Ramp publishes no interview process. Its careers page states one hiring bar ("If this person started a company would we join them?"). | R5 | first-party |
| **Dialect:** no source names the test's dialect. The data-science postings ask for "strong knowledge of SQL (preferably Redshift, Snowflake, BigQuery)" and efficient queries; the stack named is Fivetran / Snowflake / dbt / Looker / Hightouch. That describes the job, not the test. | R6 | first-party, job text |

## Topics reported

M = 4 sources with topic content: R1 and R2 (candidate reports), R3 and R4
(prep guides).

- Window functions (incl. moving averages, ranking, running totals): 3 of 4 (R2, R3, R4)
- Date / time logic (date wrangling, trailing windows): 2 of 4 (R1, R4)
- Query optimisation / performance: 2 of 4 (R1, R3)
- Cohort retention: 2 of 4 (R3, R4; both prep)
- Joins, GROUP BY, HAVING: 1 of 4 (R2)
- Mean and median: 1 of 4 (R2)
- Deduplication / top-N per key, period-over-period, missing values: 1 of 4 (R4)

## Question shapes (paraphrased)

- **DA (candidate, R1):** a date-heavy SQL task with edge cases, then
  questions on making it faster. No item detail survives.
- **AE (candidate, R2):** eight standard SQL questions in a live CodeSignal
  session, then three follow-ups. The poster prepared window functions, mean
  and median per group, joins, GROUP BY and HAVING.
- **Prep shapes (R4, not candidate-reported):**
  - a ratio metric built from filtered counts and sums, grouped by a
    dimension, over a trailing window;
  - period-over-period change of a metric;
  - cohort retention over time;
  - keep one row per key, or top N per user;
  - transaction history with missing values.

## Role variants

- **Data analyst:** recruiter → HM → take-home case + panel presentation
  *or* a single assessment problem → SQL round (date logic) → leadership.
  Stage counts differ between the two reports (R1).
- **Analytics engineer:** HM + a live CodeSignal SQL screen (R2).
- **Data scientist:** no candidate report opened. R3 and R4 are boilerplate.
  The job posting names SQL on Redshift/Snowflake/BigQuery plus a BI tool (R6).
- **Product analyst / ops:** case and role play; SQL not reported (R7).

## What changed

There was no earlier Ramp read; this is the first. The page says "we have no
dated public source". That is still true for a published format, but two
dated candidate sources now exist (R1, R2). See the BACKLOG line for C1.
