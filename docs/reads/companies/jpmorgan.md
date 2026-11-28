# JPMorgan Chase — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, first run). **Refresh by:** 2027-01-21.
**Page:** `/jpmorgan-sql-interview/` — a general page ("no dated public
source"). **Verdict of this run: keep it that way.** No opened candidate
source confirms an SQL online assessment for a data role.

## Demand (gsc_daily, read 2026-11-22)

28 days to 2026-11-20: page 56 impressions / 3 clicks / position 6.0. Query
slice, 90 days: "jp morgan sql interview questions" 11 · 0 · 7.0; "jpmorgan
chase sql interview recursive queries window functions 2025" 8 · 0 · 6.4.

## Sources

Read 2026-11-22 (research helper). WebFetch unless marked Apify.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| J1 | JPMorganChase — How we hire: FAQs | https://www.jpmorganchase.com/careers/how-we-hire/faqs | none | first-party | 200 |
| J2 | JPMorganChase — How we hire | https://www.jpmorganchase.com/careers/how-we-hire | none | first-party | 200 |
| J3 | JPMorganChase — Data & Analytics program | https://www.jpmorganchase.com/careers/explore-opportunities/programs/data-analytics-opportunities | none | first-party | 200 |
| J4 | JPMorganChase — Data & AI program | https://www.jpmorganchase.com/careers/explore-opportunities/programs/data-ai-opportunities | none | first-party | 200 |
| J5 | Interview Query — JPMC Data Analyst guide (21 reports) + one report ("Analyst · Interviewed Q2 2025") | https://www.interviewquery.com/guides/jp-morgan-chase-data-analyst | "Updated 2 days ago" on 2026-11-22 | prep guide + candidate report | Apify 200 |
| J6 | Interview Query — JPMC Data Scientist guide + report ("DS · Interviewed Q3 2026") | https://www.interviewquery.com/guides/jp-morgan-chase-data-scientist | "Updated 27 days ago" on 2026-11-22 | prep guide + candidate report | Apify 200 |
| J7 | aced.io — JPMorganChase interview process | https://www.aced.io/blog/jp-morgan-chase-interview-process | "Last updated 9 days ago" on 2026-11-22 | prep guide | 200 |
| J9 | GeeksforGeeks — JPMC interview experience 2018 (Data Science, India campus) | https://www.geeksforgeeks.org/?p=253451 | interview 2018; page updated 2025-07-11 | candidate report, too old | 200 |
| J10 | DataLemur — JPMorgan Chase SQL interview questions | https://datalemur.com/blog/jpmorgan-chase-sql-interview-questions | updated 2025-03-28 | prep guide; shapes only, no candidate trail | 200 |
| J11 | Dataford — J.P. Morgan Data Analyst guide | https://dataford.io/interview-guides/jp-morgan/data-analyst | updated 2026-08-01 | prep guide | Apify 200 |

**Best open lead, not read:** JPMorganChase's own PDF
`https://www.jpmorganchase.com/content/dam/jpmorganchase/documents/careers/jpmc-ec-application-reflection.pdf`
— too large for the fetcher (> 10 MB). Its search snippet says applicants may
take "a HireVue … and/or a HackerRank". Snippet only — needs a hand read in a
browser. Also gone: the old careers.jpmorgan.com interview-tips pages (301 to
the careers home); their snippets named HireVue and CodeVue.

## Format

| fact | sources | confidence |
|---|---|---|
| Technical assessments can be online tests or live with an interviewer; many cannot be retaken for a set period; on-demand recorded video interviews are among the methods. No vendor and no SQL named. | J1 | first-party, one page |
| The hiring page is four generic steps (explore, apply, interview, decide). | J2 | first-party |
| SQL (and Tableau for data roles) is a listed skill for the Data & Analytics and Data & AI programs; neither page describes selection. | J3, J4 | first-party |
| Data analyst route: CV → personality test or online assessment → one-way HireVue → a superday of three 30-minute back-to-back sessions. | J5 report (Q2 2025) | low |
| A superday exists for analyst routes. | J5, J7, J11 | medium (two are prep) |
| HackerRank online assessment with SQL for data roles. | J11 only ("often via platforms like HackerRank") | **low, unconfirmed** |
| Data scientist (experienced): recruiter → HM project deep-dive → panel; ML and optimisation; no SQL, no take-home in one report. | J6 | low |
| How much SQL: one analyst said SQL, Excel and Python came up only briefly; another got Python, Excel formulas and reconciliation. "SQL is always tested" appears only in prep guides. | J5 vs J7, J10, J11 | conflicting — do not state |

Note (re-read 2026-11-24, Q1 on #266): the reconciliation line is in J5's editorial summary of its 21 reports ("another candidate, who accepted an offer…"), not in the expanded "Analyst · Interviewed Q2 2025" report, which covers only the route above. The one accepted-offer card in J5's list is stamped **Interviewed Q1 2025**. Cite reconciliation to the guide's summary, never under the Q2 2025 stamp. The guide read "Updated Nov 20, 2026" on 2026-11-24.

## Topics reported

M = 11 sources read.

- SQL named as tested — 4 of 11 (J5 synthesis; J7, J10, J11 prep)
- Joins — 2 of 11 (J10, J11)
- Data cleaning (missing values, outliers) — 2 of 11 (J5, J11)
- Window functions / query optimisation — 1 of 11 (J11)
- Reconciling figures across reports — 1 of 11 (J5)
- Duplicate or anomalous transactions — 1 of 11 (J7)

## Question shapes (paraphrased; none candidate-reported unless marked)

- Per card product, the gap between its best and worst month of issuance,
  ranked. GROUP BY with MIN/MAX. (J10)
- Each card's amount issued in its launch month. Earliest row per group. (J10)
- Accounts very active in a recent window or dormant over a longer one.
  Date windows. (J10)
- Duplicate transactions; anomalies in transaction data. (J7)
- Top customers by volume last quarter, joining tables whose keys are
  formatted differently. (J11)
- *Candidate-reported, not SQL-specific (J5):* clean a large dataset with
  missing values and outliers; reconcile numbers across reports and tools.

## Role variants

- **Data analyst:** HireVue or HR screen → resume-heavy technical talk
  (Python, Excel, reconciliation, a little SQL) → HM / panel, sometimes a
  superday with a group exercise (J5).
- **Data scientist:** project deep-dives, ML/optimisation theory; no SQL
  reported (J6).
- **Programs:** both data programs list SQL; selection steps not described
  (J3, J4). No source separates Chase consumer from CIB.

## What changed since the existing reads

There was no JPMorgan read. Nothing reaches the page: the only first-party
facts are generic (J1–J4), and the SQL assessment claims are prep-guide or
snippet only. Next step is the PDF above, read by hand.
