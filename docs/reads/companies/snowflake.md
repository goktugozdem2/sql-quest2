# Snowflake — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, batch 3; first read of any kind).
**Refresh by:** 2027-01-21.
**Page:** `/snowflake-sql-interview/` (hand-written `src/snowflake-sql-interview.html`;
title "Snowflake SQL Interview Questions & Practice — 95 Runnable
Challenges"; states no interview format).

## Demand (gsc_daily, read 2026-11-22) — mostly dialect intent

28 days, page slice: 132 impressions / 10 clicks (INDEX). Query slice,
90 days: **"snowflake sql practice" 34 / 11 clicks / position 2.0**;
"snowflake sql interview questions" 14 / 0 / 8.7; "\"snowflake questions\""
12 / 0 / 14.9; "snowflake practice" 9 / 0 / 8.4; "snowflake cte example",
"snowflake rank vs dense_rank", "least ignore nulls snowflake", "snowflake
syntax practice" 1–3 each. Every click came from a query about **Snowflake's
SQL dialect**, not about interviewing at Snowflake the company. That shapes
what the page should do with this dossier (see the end).

## Sources

Read 2026-11-22 with WebFetch.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| S1 | Snowflake Careers: "Get hired" (hiring process) | https://careers.snowflake.com/us/en/gethired | "© 2025"; no update date | **first-party** (engineering roles) | 200 |
| S2 | interviewing.io: Snowflake's interview process & questions | https://interviewing.io/snowflake-interview-questions | title "in 2024"; edit note Dec 2025 | prep guide (SWE; from interviewers in its community) | 200 |
| S3 | DataDriven: Snowflake data engineer interview guide | https://datadriven.io/companies/snowflake/interview | last updated 2026-09-23 | prep guide; cites 3 candidate reports (Mar 2026 intern, Jul 2025 mid-level, Sep 2022 intern) | 200 |
| S4 | GeeksforGeeks: Snowflake campus interview (titled Data Science internship; body says Data Engineer) | https://www.geeksforgeeks.org/?p=1054489 | last updated 2023-08-31 | candidate report | 200 |
| S5 | Exponent's "Get a job at Snowflake", republished by the University of Miami career center | https://customcareer.miami.edu/blog/2026/05/14/get-a-job-at-snowflake-interview-process-and-top-questions/ | 2026-05-14 (URL path) | prep guide (republished) | 200 |
| S6 | Snowflake job posting: Analytics Engineer – Finance (Pune), via Wing VC's job board | https://careers.wing.vc/companies/snowflake/jobs/88673160-analytics-engineer-finance | posted 2026-08-04 (closed) | first-party text, third-party host | 200 |

Refused today: Blind "are interviews at Snowflake really hard" — **402**
(paywall); datainterview.com Snowflake DA guide — 429. Interview Query's
Snowflake DA/DE guides not attempted (429 on Goldman this run). Glassdoor not
attempted. **The analyst and analytics-engineer reports seen in search
results (five SQL questions in a first round; an ambiguous SQL case in round
two; an org-hierarchy question) are all on Glassdoor, Blind or Interview
Query — search snippets only, not sources.**

## Format

| fact | sources | confidence |
|---|---|---|
| **Engineering hiring, as Snowflake states it: four stages over two to four weeks** — a ~30-min recruiter/hiring-manager screen; technical interviews of ~60 min (live coding and/or system design); a panel of three to five 60-min sessions (technical, expertise, design, behavioural), sometimes with a 30-min tech talk; then a decision. | S1 | **first-party**; **SQL is not mentioned** |
| Technical screen runs on CoderPad (+ Zoom) or HackerRank. | S2, S5 | medium (2 guides) |
| Data engineer loop includes a SQL deep-dive alongside system design, coding and behavioural. | S3 | low (aggregator) |
| A campus data-engineering round (45 min) had SQL theory (database vs warehouse, keys, constraints, join types) and three written queries. | S4 | low (one report, 2023) |
| Analytics roles require "Advanced SQL skills"; the work names SQL, Python, Snowflake, dbt and Airflow. | S6 | first-party posting; says nothing about the interview |
| **Data analyst / analytics engineer SQL round:** no readable source. | — | **none** |

**Dialect:** S3 says Snowflake SQL itself is central for data engineers
(QUALIFY, FLATTEN over VARIANT, MATCH_RECOGNIZE, recursive CTEs). Prep-guide
claim, low.

## Topics reported

M = 2 sources with candidate-attributed SQL (S3's three cited reports
counted as one aggregator, S4).

- Ranking: nth / third-highest value — 2 of 2 (S3, S4)
- Self-join on a manager id (earns more than manager) — 1 of 2 (S3)
- Consecutive-day activity (gaps and islands) — 1 of 2 (S3)
- Group and count, then the top group — 1 of 2 (S4)
- Join across employee, department and a many-to-many project assignment — 1 of 2 (S4)
- Modelling a cumulative historical table — 1 of 2 (S3)
- SQL and warehouse theory (keys, constraints, join outputs) — 1 of 2 (S4)

## Question shapes (paraphrased)

- **Third-highest salary (S4, S3).** *Bank: 29, 89.*
- **Earns more than the manager (S3).** *Bank: 17, 149, 315.*
- **Three or more consecutive active days (S3).** *Bank: 318.*
- **Department with the most active projects; employees on at least one
  project (S4):** employees, departments and a project-assignment table.
  Skill: a bridge-table join, EXISTS vs JOIN (no duplicate employees), group
  + top. *Bank: **no project or assignment table**.*
- **Keep a cumulative sales history table (S3):** a modelling question
  (append vs rebuild, snapshot grain). Not a query shape for the bank.

## Role variants

- **Software / data engineer:** first-party process (S1), CoderPad or
  HackerRank (S2, S5); SQL deep-dive for DE (S3, low).
- **Data analyst / analytics engineer:** SQL is the core skill by the
  postings (S6), but no interview report could be read. Low.

## What this means for the page

The page ranks for **dialect** queries ("snowflake sql practice", position 2,
all 11 clicks). Nothing found today is good enough for a "How the interview
runs (sourced)" section about Snowflake-the-employer: the only first-party
process is for engineering and does not mention SQL, and the analyst reports
are unreadable. Recommendation: keep the page dialect-first, state no format,
and revisit when an analyst or analytics-engineer report can be read.
