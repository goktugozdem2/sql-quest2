# Morgan Stanley — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, second batch). **Refresh by:** 2027-01-21.
**Page:** `/morgan-stanley-sql-interview/` — a general page ("we have no
dated public source"). **Verdict of this run: keep it that way.** The only
opened candidate report with an SQL test in it is a 2021 data-engineer
account from India. The recent data-analyst accounts are on Glassdoor and
Interview Query, which could not be read.

## Demand (read 2026-11-22)

- gsc_daily page slice, 28 days to 2026-11-21: 49 impressions / 2 clicks
  (INDEX).
- Query slice, 90 days: no query naming Morgan Stanley.
- bing_stats, 90 days: none.

## Sources

Read 2026-11-22. WebFetch unless marked otherwise. M1 and M2 timed out in
WebFetch and were read with a plain `curl` GET (HTTP 200).

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| M1 | Morgan Stanley Careers: "Interview Preparation" (students & graduates) | https://www.morganstanley.com/people-opportunities/students-graduates/resources/interview-preparation | none | first-party | curl 200 |
| M2 | Morgan Stanley: "Tips for video interviews" | https://www.morganstanley.com/articles/tips-for-video-interviews | no clear article date (the page carries several dates of linked articles) | first-party | curl 200 |
| M3 | GeeksforGeeks: Morgan Stanley Interview Experience for Data Engineer 2021 (Mumbai/Bengaluru) | https://www.geeksforgeeks.org/?p=695543 | interview 2021; page "Last Updated 23 Jul, 2025" | candidate report (old) | 200 |
| M4 | GeeksforGeeks: Morgan Stanley Technology Summer Analyst, off-campus 2024 | https://www.geeksforgeeks.org/?p=1202587 | interview 2024-02-28; page updated 2024-03-26 | candidate report (technology track) | 200 |
| M5 | DataLemur: "11 Morgan Stanley SQL Interview Questions" | https://datalemur.com/blog/morgan-stanley-sql-interview-questions | updated 2025-02-01 | prep guide. Its share text says the questions were asked; its body calls them scenarios on a hypothetical dataset, and it cites no source. | 200 |

**Not usable:**
- Interview Query's Morgan Stanley data-analyst guide answered 429 twice.
  Its snippets name a HackerRank first step with maths, statistics, finance
  and programming multiple choice; joins and duplicates in SQL. Snippet only.
- Glassdoor refuses automated reads. Its snippets describe a Hong Kong
  HackerRank test with 2 coding + 2 SQL + ~10 CS multiple choice, then
  HireVue and a superday; a Budapest DA with Python + SQL assessments; a
  Mumbai senior DE with 2 SQL questions. All snippet only.
- LeetCode Discuss (5445681 "Morgan Stanley Data Analyst 5 years", 7641031)
  and Medium (nybles) answered 403.
- 1point3acres was not tried after its 403s on other companies.

## Format

| fact | sources | confidence |
|---|---|---|
| Morgan Stanley says interviews "could be competency, strengths based, skills based or technical". No assessment vendor, no SQL. | M1 | first-party, generic |
| Recorded video interviews are part of application screening for "more roles", named for the North America and Asia offices. The page does not name a vendor; HireVue appears only in third-party pages. | M2 | first-party; article undated |
| **Data engineer (2021):** a 2-hour HackerRank test with separately timed sections, including SQL coding (medium), Python/SQL multiple choice, a data-structures problem, database transactions and Unix multiple choice. Then a ~80-minute manager round with SQL, two senior technical rounds and HR. | M3 | **low** (one report, five years old) |
| **Technology analyst (2024):** a 100-minute AMCAT test with no SQL. In the Zoom technical round the candidate wrote a database query in an IDE. | M4 | low (one report; not a data role) |
| **Data analyst:** a HackerRank online assessment with SQL; HireVue; superday. | snippets only (Glassdoor, Interview Query) | **not a source**; do not use |

**Dialect:** not stated anywhere opened.

## Topics reported

M = 3 sources with topic content (M3, M4, M5). M5 is prep and M4 has no detail.

- Window / ranking functions (top earner per department; LEAD/LAG; choosing a ranking function): 2 of 3 (M3, M5)
- Joins (row count by join type with duplicate keys; multi-table aggregates): 2 of 3 (M3, M5)
- Nth-highest value: 1 of 3 (M3)
- Trade / ticker aggregates (volume per day and type, peak trade per trader per year): 1 of 3 (M5, prep)
- Index and key concepts: 1 of 3 (M5, prep)

## Question shapes (paraphrased)

- **Candidate (M3, 2021):**
  - Predict how many rows each join type returns when the join key repeats
    on both sides.
  - The nth-largest value in a column.
  - The top earner per department with a ranking window, and why that
    ranking function over another.
  - Explain LEAD/LAG with an example.
- **Prep (M5, not candidate-reported):**
  - each trader's largest trade per year and its date (an earliest/max row
    per group, joined back);
  - total volume per trade type per day across two tables;
  - top customers per month by traded amount;
  - average volume per trading day and ticker.

## Role variants

- **Data engineer:** HackerRank test with an SQL section, then technical
  rounds heavy on SQL, Spark and cloud (M3, 2021, low).
- **Technology analyst (intern):** AMCAT test without SQL; one DB query in
  the live round (M4).
- **Data analyst / data scientist:** no opened report. The snippets suggest
  HackerRank + HireVue + superday for analysts; unverified.

## What changed

There was no earlier Morgan Stanley read. Nothing reaches the page. Next
step: the Interview Query data-analyst guide (reports carry quarters) when
it stops answering 429. With one dated DA report plus the HireVue line, the
page could gain a sourced row.
