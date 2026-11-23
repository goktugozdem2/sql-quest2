# Plaid — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, second batch). **Refresh by:** 2027-01-21.
**Page:** `/plaid-sql-interview/` — a general page ("we have no dated public
source"). **Verdict of this run: keep it that way.** No candidate report for
a Plaid data role could be opened. Everything with a format in it is a prep
template or a search snippet.

## Demand (read 2026-11-22)

- gsc_daily page slice, 28 days to 2026-11-21: 14 impressions / 1 click
  (INDEX).
- Query slice, 90 days: no query naming Plaid.
- bing_stats, 90 days: none.
- The 2026-09-10 SERP test (`docs/reads/company-page-serp-test-2026-09-10.md`)
  had already measured B2B fintech pages at about one click a month.

## Sources

Read 2026-11-22. WebFetch unless marked otherwise.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| P1 | PracHub: "Plaid data scientist interview questions guide 2026" | https://prachub.com/interview-guide/plaid-data-scientist-interview-questions-guide-2026 | updated 2026-09-24 (its sources accessed 2026-09-22) | prep guide. It calls its stages "what candidates describe, not a published process" and links no report. The five-round outline is the same template as PracHub's Ramp page. | 200 |
| P2 | Plaid job postings (Ashby public board API): Senior Analytics Engineer (published 2026-10-16), Senior Data Engineer (2026-09-03), Senior Data Scientist – Embedded Insights (2026-09-10), Staff Data Scientist – Fraud (2026-11-17), Data Scientist – Credit (Retros) (2026-11-02), Fraud Intelligence Analyst (2026-11-19) | https://jobs.ashbyhq.com/plaid/98c030bd-a72d-4045-87aa-b8ff7d0d43fb · …/eeb094c3-da73-411e-8dda-b3f4ee397f97 · …/c85370cf-7391-4307-9757-42f2ee25b98a · …/361c4725-ab72-4895-a3aa-9b642f4927a9 · …/9d8a139c-8f99-4049-b7bd-8de693820d7b · …/2602117d-bfcc-407a-ae28-ea3a7c7aa216 | publish dates as listed | first-party (job text, not the interview) | 200 (api.ashbyhq.com) |
| P3 | Plaid careers page | https://plaid.com/careers/ | none (© 2026) | first-party | 200 |
| P4 | techinterview.org: "Plaid Interview Guide 2026" | https://www.techinterview.org/companies/plaid/?format=md | updated 2026-07-11 | prep guide, software engineering only, no sources | 200 |
| P5 | Prepfully: Plaid Data Scientist question list | https://prepfully.com/interview-questions/plaid/data-scientist | none | question bank that says its items are submitted by candidates (253). No item rendered in the fetch. | 200, empty |

**Not usable:**
- Interview Query's Plaid data-scientist and data-analyst guides answered
  429. The Apify fallback was refused by the session's permission classifier.
- 1point3acres thread 1117603 ("Plaid Fulltime Tech Phone Screen Interview
  Review"; its snippet names SQL, case study and experimentation rounds)
  answered 403.
- Taro's Plaid Senior Data Engineer report (interview Feb 2024) answered 429.
- Glassdoor refuses automated reads; Blind answers 402.
- aie-blog.pages.dev ("plaid-ds-ds-sql-coding-2026") timed out.
- Search snippets from these pages, such as "a split session of live SQL and
  a product case" and "4–5 rounds", are **not sources**.

## Format

| fact | sources | confidence |
|---|---|---|
| Plaid publishes no interview process. The careers page has none; the only process link is the intern program's RippleMatch page. | P3 | first-party |
| SQL is a listed requirement in every data posting: advanced SQL + dbt for analytics engineering; SQL + Python for data science (fraud, credit, embedded insights); SQL + Python with DBT, Airflow and Redshift for data engineering. | P2 | first-party, job text, not the interview |
| A timed SQL-or-Python technical assessment, then a schema-reading technical screen where a business question must be pinned to exact definitions before querying. | P1 | **low** (prep template; no candidate trail) |
| A live SQL + product-case session; SQL, case and experimentation rounds. | search snippets only (Interview Query, 1point3acres) | **not a source**; do not use |

**Dialect:** none stated. The data-engineering posting names Redshift; the
analytics-engineering one names Databricks/Snowflake-class warehouses. That
describes the job, not the test.

## Topics reported

M = 2 sources with topic content, both prep (P1, P4). The counts are thin and
P4 is a software-engineering guide.

- Window functions (rolling rate, ranking for dedupe, LAG, running totals): 1 of 2 (P1)
- Retention / cohort tables: 1 of 2 (P1)
- Reconciliation across currencies: 1 of 2 (P1)
- Deduplicating transaction records: 2 of 2 (P1 in SQL; P4 in code)

## Question shapes (paraphrased; none candidate-reported)

- **Month-over-month retention of active API users** from transaction
  events, with late or missing updates. Skills: an anti-join with a NULL
  check, and summing numerators and denominators before dividing. (P1)
- **Trailing 7-day success rate of API calls per institution.** Skills: a
  window partitioned by institution and ordered by time. (P1)
- **Daily settlement reconciliation:** captured authorisations against
  settled totals by date and currency, without summing across currencies.
  Skills: multi-key grouping, FX conversion. (P1)
- *Software engineering, not SQL (P4):* deduplicating a transaction stream
  and choosing the duplicate key; fuzzy-matching account records across
  institutions.

## Role variants

No opened source separates them for Plaid. The postings (P2) show where SQL
matters: analytics engineering (dbt, modelling), data science in fraud,
credit and embedded insights, data engineering, and fraud intelligence
analysis (SQL "preferred").

## What changed

There was no earlier Plaid read. Nothing reaches the page. Next step: open
one candidate report by a route that does not need a sign-in (Interview
Query when it stops answering 429; Taro). Until one is opened, the page
stays general.
