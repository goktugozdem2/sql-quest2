# Amazon — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, batch 3). **Refresh by:** 2027-01-21.
**Page:** `/amazon-sql-interview/` (sourced; `SOURCED_FORMATS.amazon` in
`src/data/company-interviews.js`, role "Business Intelligence Engineer / data
analytics roles"; sources: Blind 2025-09-14, Exponent read 2026-09-14, and the
BIE round reported to us by email 2026-10-21 —
`docs/reads/amazon-bie-candidate-report-2026-10-21.md`).
**Why it matters:** Amazon is the one company set that produced a payer
(CLAUDE.md, free-tier boundary), and the page carries 123 impressions in 28
days (INDEX).

## Demand (gsc_daily, read 2026-11-22)

Query slice, 90 days: "amazon interview questions on sql" 82 impressions /
0 clicks / position 36.1; "amazon sql interview questions" 29 / 0 / 37.3;
"amazon sql interview" 5 / 0 / 46.4; "amazon sql assessment" 3 / 0 / 50.8;
"amazon business analyst sql interview questions" 2 / 0 / 33.5; "amazon bie
sql interview questions" 1 / 0 / 49.0. Real demand, page 4–5 of results: the
page has impressions but no position.

## Sources

Read 2026-11-22 with WebFetch unless marked.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| A1 | Amazon: Business Intelligence Engineer interview prep | https://atoz.amazon/en-us/jobs/hiring-process/interview-prep/business-intelligence-engineer (301 from amazon.jobs/content/en/how-we-hire/bie-interview-prep) | none shown | **first-party** | 200 |
| A2 | Amazon: university hiring, data roles (BIE and data engineer) | https://atoz.amazon/en-us/jobs/hiring-process/interview-prep/university/data (301 from amazon.jobs) | none shown | **first-party** | 200 |
| A3 | aced.io (ex-Exponent): Amazon BIE interview guide | https://www.aced.io/guides/amazon-business-intelligence-engineer-interview (301 from tryexponent.com) | "Updated 3 days ago by Amazon candidates" on 2026-11-22 | prep guide | 200 |
| A4 | PracHub: Amazon BIE, "SQL Interrupted and a Shortened Phone Screen" | https://prachub.com/interview-experiences/amazon-business-intelligence-engineer-interview-experience-sql-interrupted-and-a-shortened-phone-screen | interview Sep 2026; published 2026-09-28 | candidate report (edited by PracHub) | 200 |
| A5 | PracHub: Amazon Business Analyst interview with SQL and business case | https://prachub.com/interview-experiences/amazon-business-analyst-interview-with-sql-and-business-case-88452e0571 | interview Jul 2026; published 2026-09-05 | candidate report | 200 |

Carried, not re-read today: Blind BIE L5 2025 thread (2025-09-14, replies to
2025-10-15; Blind now answers 402), and **R0**: the BIE round reported to
us by email on 2026-10-21 (`docs/reads/amazon-bie-candidate-report-2026-10-21.md`;
name withheld; cited on the page as "reported to us").

Refused today: Medium BIE experience post — 403; igotanoffer BIE guide — 403;
LeetCode Discuss — 403 (site-wide this run). Interview Query not attempted
(429 on every other company this run). Glassdoor not attempted.

## Format

| fact | sources | confidence |
|---|---|---|
| **BIE stages, as Amazon states them:** application → **online assessment** → one or two technical phone screens (some candidates go straight to the loop) → the interview loop. | A1 | **first-party** |
| **The BIE online assessment has three parts — a SQL challenge, a "Working with SQL" part and a Work Styles survey — and is open for seven days.** | A1 | **first-party**; **not on our page today** |
| **Phone screen: 60 minutes with a senior leader**, covering SQL, technical and Leadership Principles questions. Candidate reports describe being told 75 minutes (Blind 2025; A4, where it ended after about an hour). | A1; Blind (Sept), A4 | first-party for 60; the 75 is medium (2 reports) |
| **Loop: five 55-minute interviews** with members of the BI community; each interviewer typically asks two or three behavioural questions. | A1 | first-party; the page's "about five rounds" + "45 min to an hour" can tighten |
| BIE technical competencies Amazon names: SQL and basic scripting; analytical problem solving; visualisation, metrics and reporting; business acumen and requirements gathering. No visualisation tool named. | A1 | first-party |
| University (intern / new-grad) data roles: full-time = one 45–60 min interview, then three to four more of 45–60 min; technical interviews mix verbal and coding exercises. | A2 | first-party |
| **Three SQL problems in a ~60-minute round, each with follow-ups**: BIE, reported to us (Oct 2026); Business Analyst screen with three SQL questions, a behavioural deep-dive and a business case (A5, Jul 2026). | R0, A5 | **medium** (2 reports, two roles) |
| The editor: a shared editor where queries often cannot be run (Blind 2025); an Amazon-branded web editor (R0). Whether code runs is not stated by Amazon. | Blind, R0 | medium for "do not count on running it" |
| A **dashboard design task** can sit in the technical screen: one page of metrics and charts for an operations process. | A4; A1 names visualisation as a competency | medium (first-party competency + 1 report) |
| Technical screen: "at least five questions" across SQL, Python, visualisation and business analytics; onsite five to six rounds of 45–60 min with a bar raiser. | A3 | prep guide, low on its own; agrees with A1 on the loop |

**Dialect:** not stated by any source.

## Topics reported

M = 4 candidate reports with SQL content (Blind 2025, R0 Oct 2026, A4 Sep
2026, A5 Jul 2026 — A5 names no topics, so topic counts use M = 3).

- Joins, incl. self-joins and join semantics — 3 of 3 (Blind, R0, A4)
- Window functions / ranking (ROW_NUMBER vs RANK vs DENSE_RANK) — 2 of 3 (Blind, R0)
- Grouped aggregates compared against a group or company average — 2 of 3 (R0, A4)
- Conditional aggregation for a share threshold — 1 of 3 (A4)
- Year-over-year comparison — 1 of 3 (A4)
- Consecutive-day streaks / rolling windows — 1 of 3 (R0)
- Edge cases and duplicates as follow-ups — 2 of 3 (R0, A4)

## Question shapes (paraphrased)

- **Above the group average (R0):** employees paid more than their
  department's average. *Bank: 131, 171.*
- **Rated twice, higher second time (R0).** *Bank: 317.*
- **Three consecutive login days, then any three in a rolling seven (R0).**
  *Bank: 318, 319.*
- **Teams that beat targets but lag on growth (A4):** departments where more
  than half of employees beat their quarterly target, but the department's
  sales growth is below the company-wide average, year over year. Tables:
  employees, departments, sales, targets. Skills: a share computed with
  conditional aggregation, a company-level benchmark in a CTE or subquery, a
  YoY comparison, two conditions in HAVING. Follow-up: an employee who
  belongs to two departments (a bridge table and the fan-out it causes).
  *Bank: **no targets/quota table and no employee–department bridge**; the
  parts exist separately (30 YoY, 108 above average) but not together.*
- **Operations dashboard (A4):** define the metrics and charts for one page
  on warehouse inbound performance. Not SQL; it says the BIE screen also
  tests metric definition.

## Role variants

- **BIE:** OA with SQL (first-party) → 60-min phone screen → five 55-min
  interviews; SQL, visualisation, metrics, LPs throughout.
- **Business analyst:** OA, then a screen with three SQL questions and a
  business case (A5, one report). Low-medium.
- **Data engineer:** SQL plus ETL and data modelling (A2, first-party role
  description). No readable candidate report today.
- **Intern / new grad (BIE, DE):** two-stage, 45–60 min interviews (A2).

## What changed since the 2026-09-14 read and the 2026-10-21 report

1. **First-party BIE page found (A1).** It names the online assessment (three
   parts, two of them SQL, seven days), the 60-minute phone screen, and five
   55-minute loop interviews. Our page has no OA row and cites only a
   candidate and a prep guide for the stages.
2. A second readable BIE report (A4, Sep 2026) with a new shape: a share
   threshold against a company benchmark, year over year, with a
   many-to-many follow-up.
3. A Business Analyst report (A5) that also has three SQL questions in one
   screen, so "three SQL problems in an hour" now has two reports.
4. Exponent's guide moved to aced.io; same content as September, newer
   "updated" stamp.
