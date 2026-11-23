# Bloomberg — SQL interview dossier

**Dossier date:** 2026-11-23 (R1, batch 5). **Refresh by:** 2027-01-22.
**Page:** `/bloomberg-sql-interview/` — sourced, and says the data-role
format is thinly reported (`company-interviews.js` `bloomberg`; three
sources accessed 2026-09-13: an OphyAI guide, the DataLemur blog, a
DataLemur question page; `docs/reads/company-research-2026-09-13.md`). This
dossier replaces that read for Bloomberg.
**Demand:** 1 impression / 0 clicks in 28 days to 2026-11-21 (INDEX) — the
lowest of the four; it is in this batch because its read was stale.

## Sources

Read with WebFetch on 2026-11-23. No other fetcher, no cache, no archive.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| B1 | PracHub: Bloomberg Senior SWE – Data Engineering, "recruiter promised easy-medium, got string-heavy SQL and rushed OOD coding" | https://prachub.com/interview-experiences/bloomberg-senior-software-engineer-data-engineering-interview-experience-recruiter-promised-easy-medium-got-string-heavy-sql-and-rushed-ood-coding | interview Jul 2025; published 2026-08-25 | candidate report | 200 |
| B2 | PracHub: Bloomberg Senior DE, "SQL string ops and a 20-minute OOD screen" | https://prachub.com/interview-experiences/bloomberg-senior-data-engineer-interview-experience-sql-string-ops-and-a-20-minute-ood-screen | interview Sep 2025; published 2026-08-25 | candidate report — **reads as the same candidate and the same screen as B1** (same background, same two questions, same outcome); counted once | 200 |
| B3 | OphyAI: Bloomberg interview guide | https://ophyai.com/blog/company-guides/bloomberg-interview-guide | published 2026-05-15; updated 2026-11-06 | prep guide; **names no sources** | 200 |
| B4 | DataLemur: Bloomberg SQL interview questions | https://datalemur.com/blog/bloomberg-sql-interview-questions | updated 2025-04-17 | practice guide; its questions are DataLemur's own | 200 |
| B5 | PracHub: Bloomberg experiences + company page | https://prachub.com/interview-experiences?company=Bloomberg ; https://prachub.com/companies/bloomberg | reports Jul 2025 – Nov 2026 | lists | 200 — 21 stories: B1/B2 are the only data-engineering ones, the rest software engineering; **DS filter: 0**; no DA/DS position page |

Refused or not usable (final for this run):
- **bloomberg.com** — the Finance, Data & Support application-process page
  and the engineering experienced-hire page both 403. (A search summary
  quoted them; a snippet is not a source.)
- **Glassdoor** (where the Bloomberg data-analyst and Global Data reviews
  are) — 403 on the run's first Glassdoor fetch; not retried.
- **Dataford** (Bloomberg Industry Group DA guide) — 429.
- **Interview Query** — 429 on the run's first IQ fetch; not retried.
- DataLemur's stock min/max question page (cited on our page) — not
  re-read; the blog (B4) was.
- Search summaries mention an assessment-centre day with an SQL/Python/stats
  multiple-choice test and an Excel test for analyst roles. **Snippet-only;
  not a source.**

## Format

| fact | sources | confidence |
|---|---|---|
| Data-engineering technical screen: **40 minutes, two questions — one SQL, one Python object-oriented task** (extend a ~200-line class hierarchy in under 20 minutes). | B1 (= B2) | low (one candidate) |
| That SQL ran in **PostgreSQL**; searching was not allowed; the interviewer gave hints. | B1, B2 | low |
| Data analyst (guide only): application → online assessment (logic, English, Excel) → recruiter call → a final round of 3–4 interviews that includes a **30–60-minute exercise on a messy dataset** (often financial filings or corporate data): find the errors, propose data-quality checks and tooling. SQL appears only as "basic SQL and Excel" among the skills looked for. | B3 | **low** (one guide, no sources named) |
| A platform for data-role SQL | — | **none** (our page already says so) |
| Data scientist / BI | — | **none** readable |

## Topics reported

M = 1 candidate report with SQL detail (B1; B2 is the same screen).
- String functions (extracting a file extension) — 1 of 1
- Date filtering to one month + weekday bucketing — 1 of 1
- Pivoting rows into Monday–Sunday columns (conditional aggregation) — 1 of 1
- Ties returned as an alphabetical comma list (string aggregation) — 1 of 1
- NULL for an empty cell — 1 of 1

DataLemur (B4, its own practice set, not reports): users with more than
1,000 terminal sessions in a year (HAVING); second-highest salary; monthly
average rating per product; US customers with an exchange-data subscription
started in the last 30 days; average daily volume per symbol; plus
conceptual items (foreign keys, self-joins, RANK vs DENSE_RANK).

## Question shapes (paraphrased)

Candidate-reported:
- **Service access log by weekday (B1, data engineering Jul 2025):** from a
  service access log (the input columns were not reported), report for one month
  the most common file extension per request method for each day of the
  week, one column per weekday; NULL where a method had no requests that
  day; on a tie, every tied extension in alphabetical order, comma-separated.
  Skills: string extraction, date filter, weekday pivot, top-1 per group
  with ties, string aggregation. *Bank: 14 is a pivot and 146 extracts with
  SUBSTR + INSTR, and the Bloomberg set has "Spend by Day of Week"; **no
  challenge combines a pivot, ties-as-a-list and string extraction**.*

## Role variants

- **Data engineer / SWE–data engineering:** B1 (above).
- **Data analyst (incl. Global Data):** guide only (B3); the candidate
  reviews are on Glassdoor, unreadable.
- **Data scientist / BI:** nothing readable.

## What changed since the 2026-09-13 read

- New: one dated data-engineering screen (B1): 40 minutes, SQL (Postgres)
  + Python OOD.
- OphyAI (B3) now shows published 2026-05-15, updated 2026-11-06; the page
  cites "updated 3 Jun 2026". Its content on the DA process is unchanged.
- The 09-13 read's "Joins, INNER vs LEFT", "NULL handling", "difficulty
  easy-to-medium" and the DE stage list came from Interview Query and
  Glassdoor **snippets that were never opened**; they are not sources.

## Recommendations for the page (for C2 / C1; nothing here edits a page)

- **Do not add the DE screen yet** (low). If a second report appears: "One
  data-engineering candidate (Jul 2025) describes a 40-minute screen with
  one SQL question (PostgreSQL) and one Python question."
- **Unsourced or weakly sourced claims on the existing page**
  (`src/bloomberg-sql-interview.html`, data in `src/data/company-interviews.js`):
  1. Row "Data analyst stages" [1] and row "What the analyst round weighs"
     [1]: both rest on one guide (B3) that names no sources. By the R1 rule
     a single source is low and does not reach a page. At minimum say "one
     prep guide reports"; better, drop until a candidate report confirms.
  2. Hero: "What is reported: a final round with a data exercise on a messy
     financial dataset, **and SQL shaped around prices, trades and sessions
     by time period**" — the second half is DataLemur's practice set (B4),
     not a report of Bloomberg's questions.
  3. "**Reported most often, in order**" over the six topics: no counts
     behind the order; items 2 ("Joins, INNER vs LEFT") and 5 ("NULL
     handling") came from Interview Query snippets never opened. Replace
     with counts from this dossier or drop the ordering and those two items.
  4. "Difficulty: Easy-to-medium" — from snippets and DataLemur's own
     rating. Unsourced.
  5. "The data is daily prices, trades and volume, terminal sessions,
     exchange data subscriptions, and financial filings" — DataLemur's
     practice tables plus the guide's filings; present it as such.
  6. Sources line: "OphyAI — … (updated 3 Jun 2026)" is stale; the page now
     shows updated 2026-11-06.
  7. Meta description: "what candidates report about the data analyst
     process (including a data exercise on a messy dataset)" — the DA
     process comes from one guide, not from candidates.
- B3: the **weekday pivot with ties-as-a-list** shape (B1) is a good Hard
  for the Bloomberg set; one report only, so it is a practice idea, not a
  claim.
- Priority note for the queue: Bloomberg has 1 impression in 28 days;
  further Bloomberg research is low value until demand appears.
