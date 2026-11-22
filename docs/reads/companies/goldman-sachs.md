# Goldman Sachs — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, batch 3). **Refresh by:** 2027-01-21.
**Page:** `/goldman-sachs-sql-interview/` (generated from
`src/data/company-interviews.js` `'goldman-sachs'`, sourced; sources there are
the 2026-09-13 read: Exponent 2024, LinkJob 24 Sep 2025, GfG 2024, DataLemur
14 Mar 2025).

## Demand (gsc_daily, read 2026-11-22)

28 days to 2026-11-21, page slice: 5 impressions / 0 clicks (INDEX). Query
slice, 90 days: **no query containing "goldman"** reached the table. The page
is a finance-family completeness page, not a demand page.

## Sources

Read 2026-11-22 with WebFetch unless marked.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| GS1 | GeeksforGeeks: Goldman Sachs Analyst (full time, experienced) interview experience, 2024 | https://www.geeksforgeeks.org/interview-experiences/goldman-sachs-interview-experience-analyst-full-time-experienced-2024/ | interview 2024 (title); last updated 2025-07-23 | candidate report | 200 (re-read; the page already cites it) |
| GS2 | GeeksforGeeks: Goldman Sachs interview experience for Analyst (campus) | https://www.geeksforgeeks.org/?p=934052 | last updated 2023-01-02; no interview date | candidate report | 200 |
| GS3 | GeeksforGeeks: Goldman Sachs interview experience for Data Engineering Senior Analyst | https://www.geeksforgeeks.org/?p=728071 | last updated 2025-07-23; no interview date | candidate report | 200 |
| GS4 | lets-code.co.in: Goldman Sachs Summer Analyst (Bangalore) | https://lets-code.co.in/interview-experience/goldman-sachs-summer-analyst/688a40169e039c26f03bf326 | interviews 2025-07-16; published 2025-07-30 | candidate report | 200 |
| GS5 | PracHub: Goldman Sachs Data Scientist interview questions guide 2026 | https://prachub.com/interview-guide/goldman-sachs-data-scientist-interview-questions-guide-2026 | published 2026-09-22, updated 2026-09-24 | prep guide (question bank) | 200 |

Carried from the 2026-09-13 read (not re-read today): Exponent's Goldman
process blog (HackerRank → HireVue → CoderPad → Superday; HireVue ~15 min,
5 behavioural questions; "published 2024"), LinkJob (OA = 2 DSA + MCQ,
90–120 min, no SQL; 2025-09-24), DataLemur's Goldman SQL post (2025-03-14,
practice shapes only).

Refused or unreadable today (no retry through another tool, brief rule):
goldmansachs.com/careers/blog/guide-to-hackerrank — **403** (second run in a
row); LeetCode Discuss 7289995 (Analyst, Bangalore) — 403; naukri.com Code360
(Mar 2025 report) — 403; AmbitionBox data-analyst reviews — 403; Interview
Query DA guide — 429; Dataford DA guide — 429; datainterview.com DA guide —
429; Taro DE report (June 2025) — 429. Glassdoor not attempted (refuses
automated reads, INDEX run notes).

## Format

**Read this first:** at Goldman, "Analyst" is a corporate title (the entry
rank across divisions), not "data analyst". GS1, GS2 and GS4 are engineering-
division Analysts; GS3 is a data engineer. **No data-analyst-role report could
be read today** — those sit on Interview Query, Glassdoor and Dataford, all
refused.

| fact | sources | confidence |
|---|---|---|
| **The online assessment has no SQL** in the reports that describe it: GS1 two medium coding questions in 120 min; GS2 a proctored 135-min HackerRank test of coding, aptitude, CS multiple choice and two descriptive answers. | GS1, GS2, LinkJob (Sept) | **high** (3 sources, engineering Analyst track) |
| **SQL arrives inside live, mixed technical rounds**, next to DSA problems — never a SQL-only round in any report. GS1: two ~1 h technical rounds each with a SQL part; GS2: a 70-min live pair-coding round with one SQL query, one hard DSA problem and an external-sort question; GS4: a problem first solved with DSA, then asked again in MySQL. | GS1, GS2, GS4 | **high** (3 candidate reports agree) |
| Live coding platform: CoderPad named (GS1 round 2, GS3 round 1); GS2 names HackerRank's pair-coding tool. | GS1, GS2, GS3 | medium |
| Data engineer track: SQL comes as **discussion** inside a data-modelling round (normal forms, keys, ER diagrams) rather than as a written query; the other rounds are DSA, Spark/HDFS fundamentals, system design. | GS3 | low (one report) |
| Database theory questions appear: ACID, transaction isolation, concurrency control, scaling, normal forms, key types. | GS2, GS3 | medium (2 reports) |
| Data scientist: PracHub's Goldman DS bank (7 items) has **no SQL-tagged question**; 6 of 7 are statistics/maths. No round sequence confirmed. | GS5 | low (prep bank, no dated reports) |
| Overall pipeline (OA → recorded video → live coding → Superday). | Exponent (Sept read) | carried, low-medium (one guide, 2024) |

**Dialect:** GS4 names MySQL for the one re-solve; nothing else names a dialect.

## Topics reported

M = 4 candidate reports with SQL content (GS1, GS2, GS3, GS4).

- Removing duplicate rows / keeping one copy — 1 of 4 (GS1)
- Joins across three tables with a current-record filter (effective-dated salary) — 1 of 4 (GS1)
- Grouped average then top-N groups — 1 of 4 (GS1)
- Set operations: UNION of two tables with a source-tag column — 1 of 4 (GS2)
- Database theory (ACID, isolation, normal forms, keys) — 2 of 4 (GS2, GS3)
- Translating a procedural solution into SQL — 1 of 4 (GS4)

Prep guides (DataLemur, Sept read; GS5) add running totals, client/trade
aggregates by segment and month, and finance data-quality topics; those are
not candidate-reported.

## Question shapes (paraphrased)

- **Accidental duplicates (GS1):** a patient-style table where one record was
  entered twice by mistake; delete the extra copy and keep one. Skill:
  dedupe with ROW_NUMBER or rowid/min-id. *Bank: 183, 73.*
- **Current salary, then top departments (GS1):** employees, a salary history
  with start and end dates, and departments; list each active employee's
  current salary and department, then the three departments with the highest
  average salary. Skill: an effective-dated join (pick the row whose date
  range is current), then grouped average + top-N. *Bank: **no
  effective-dated salary table exists** (the `employees` dataset is one
  table).*
- **Union with a source tag (GS2):** two tables with the same columns; return
  the distinct rows of both, plus a column saying which table each came from.
  Skill: UNION vs UNION ALL — and the trap that a tag added before the UNION
  makes cross-table duplicates distinct. *Bank: 27 uses UNION ALL with a
  source column; the distinct-plus-tag trap is not covered.*
- **Re-solve in SQL (GS4):** a problem first solved with a data-structure
  approach, then asked as a MySQL query. Low detail.

## Role variants

- **Engineering Analyst / Associate (the reports above):** DSA-heavy OA, then
  live rounds where SQL is one part. High.
- **Data engineer:** SQL as modelling/theory discussion, plus Spark and
  design. Low (one report).
- **Data analyst / BI:** no readable report. The September read's snippets
  (live SQL on joins, filters, aggregation; data-cleaning scenarios) came from
  Interview Query search results, which are not a source.
- **Data scientist:** statistics-led per PracHub's bank; SQL not evidenced.

## What changed since the 2026-09-13 read

1. Two more candidate reports with SQL inside a live round (GS2, GS4), so the
   page's "Where SQL appears" row, today cited to GS1 alone, can cite three.
2. A second source that the OA has no SQL (GS2, in addition to LinkJob).
3. New and important for the page's framing: the reports are engineering
   **Analysts** (the corporate title). The page's description says "the
   analyst process", which a data-analyst searcher will read as their role.
4. Unchanged: no readable data-analyst report; goldmansachs.com still answers
   403, so the HackerRank guide is still unverified.
