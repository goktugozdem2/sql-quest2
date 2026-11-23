# Revolut — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, first run). **Refresh by:** 2027-01-21.
**Page:** `/revolut-sql-interview/` (sourced; signed interview-prep archetype
`neobank-analyst`; mock `revolut-analytics-screen`; set 300–311 Revolut-only).
Its format section today rests on **one** source: an Interview Query guide read
September 2026 ("27 candidate reports stamped Q3 2026").

## Demand (gsc_daily, read 2026-11-22)

28 days to 2026-11-21: page 205 impressions / 36 clicks / position 4.5. Query
slice, 90 days: "revolut sql interview questions" 66 · 27 · 1.5; "revolut data
analyst interview" 3 · 0 · 20.3; "revolut hackerrank test" 2 · 0 · 21;
"revolut data scientist interview questions" 2 · 0 · 22; "revolut hackerrank",
"revolut pandas interview", "revolut analytical test questions" 1 each.

## Sources

Read 2026-11-22 (research helper, spot-checked by R1: R3 re-opened and
confirmed). Fetched with WebFetch unless marked Apify.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| R1 | Revolut Careers — Data team | https://www.revolut.com/careers/team/data/ | none | first-party | Apify 200 (WebFetch 403) |
| R3 | PracHub — "Revolut Data Analyst … a brutal four-question SQL round" | https://prachub.com/interview-experiences/revolut-data-analyst-interview-experience-a-brutal-four-question-sql-round | interview Feb 2026; published 2026-08-25 | candidate report (edited by PracHub) | 200 |
| R4 | PracHub question page built from R3 | https://prachub.com/coding-questions/find-high-value-crypto-users-and-top-ctr | last updated 2026-05-07 | Q&A, **not independent of R3** | 200 |
| R5 | Interview Query — Revolut Data Analyst guide | https://www.interviewquery.com/interview-guides/revolut-data-analyst | "Updated 3 days ago" on 2026-11-22; says 30 reports, "synthesized from 45" | prep guide (aggregates reports) | Apify 200 (WebFetch 429) |
| R5a | the one candidate report shown in full on R5 (Data Analyst, "Interviewed Q4 2026", AI-anonymised by the site) | same URL | Q4 2026 | candidate report on a prep site | Apify 200 |
| R6 | Interview Query — Revolut Data Scientist guide | https://www.interviewquery.com/interview-guides/revolut-data-scientist | "Updated 1 day ago" on 2026-11-22; 28 reports | prep guide | Apify 200 |
| R7 | The Loop (Interview Query) — "Revolut's live SQL round gives you three tables, four questions, and 45 minutes…" | https://theloop.interviewquery.com/r/revoluts-live-sql-round-gives-you-three-tables-four-questions | 2026-04-07 | candidate story, same publisher as R5; only the opening is public (rest behind a submit-to-unlock wall, not passed) | Apify 200 |
| R8 | PracHub — Revolut Data Scientist guide | https://prachub.com/interview-guide/revolut-data-scientist-interview-questions-guide-2026 | updated 2026-09-24 | prep guide; cites only PracHub pages | 200 |
| R9 | Dataford — Revolut Data Analyst guide | https://dataford.io/interview-guides/revolut/data-analyst | updated 2026-09-15 | prep guide, cites nothing | Apify 200 |

Source families (for independence): **Revolut** (R1) · **PracHub** (R3, R4,
R8) · **Interview Query** (R5, R5a, R6, R7) · **Dataford** (R9, probably
derived from IQ). Not usable: Glassdoor (not attempted — refuses automated
reads), Blind (402), three expired Revolut Data Analyst job posts (404), a
LinkedIn job post (404) whose snippet listed HackerRank → recruiter → 45-min
live coding → 45-min analysis → 45-min bar raiser → 30-min team (snippet only).

## Format

| fact | sources | confidence |
|---|---|---|
| Stages for the data team: intro call → coding challenges → technical rounds → culture fit → team fit (no durations, no platform). | R1 (first-party); R3, R5, R5a, R7 describe the same order | **high** |
| A **timed online test** comes before the live rounds. | R5, R5a ("timed SQL and analytical assessment"), R7 ("automated assessment"), R1 ("coding challenges") | high that it exists |
| The online test is on **HackerRank**. | R5 (R9 likely copies it) | low |
| Online test length/content: ~60–75 min; SQL plus multiple-choice stats/probability/A-B, sometimes Python (one report: six SQL+Python tasks in 75 min; another: 60 min, two SQL + MCQ stats). | R5 | low (the guide's own earlier editions said 30, then 60 min) |
| A **four-question SQL round** after the HR screen, on users / transactions / activity-event tables. | R3 (Feb 2026), R5, R7 | **medium** (2 independent families) |
| That round's length: **45 min** (R7) vs **60 min** (R5) — same publisher disagrees with itself. | R5, R7 | low — do not state a length |
| A case / product interview follows the SQL round. | R3 (invited to a case right after), R5, R5a, R9 | medium |
| A bar-raiser round. | R5a, R6, R8, R9 | medium (IQ + PracHub) |
| Data Scientist: live pandas round (~1 h) is the main technical step; SQL only in some accounts; sometimes an optional take-home. | R6, R8 | medium |
| Data Analyst take-home: none reported. | — | — |
| Dialect: not stated. R7 describes a Looker/BigQuery/Trino/dbt stack; R1 lists SQL, Python, Looker, GCP. | R1, R7 | not a format fact |

## Topics reported

M = 6 sources with SQL topic content (R3, R5, R5a, R6, R8, R9) from three
families — not all independent.

- Joins — 6 of 6
- Window functions — 5 of 6
- Date windows / period-over-period (7-day window, MoM, LAG, rolling) — 5 of 6
- Top-N / ranking (ROW_NUMBER vs RANK) — 4 of 6
- Cohort, retention or funnel — 3 of 6
- CTEs — 2 of 6
- Conditional aggregation — 2 of 6
- Users with no transactions (anti-join, NULL) — 2 of 6
- **Define a metric, then write the SQL** — 2 of 6 (R3, R5; two families)
- Fraud / suspicious-activity rules — 2 of 6 (R3; R9 unsourced)
- Deduplication — 2 of 6
- Status filter (completed vs declined/attempted) — 1 of 6 (R3)

## Question shapes (paraphrased)

From R3 (the only first-person, dated SQL round):
1. Users whose **completed crypto** spend within the **first 7 days after
   account opening** passes a threshold. Tables: users (sign-up date),
   transactions (type, status, amount, time). Skill: date window anchored on
   each user's own sign-up, status filter, HAVING.
2. **Click-through rate per product**, return the best one. Table: an activity
   log of views and clicks. Skill: conditional counts, a ratio guarded against
   zero views, top-1.
3. **Define success for a new premium subscription tier's launch**, then
   compute it from the existing tables. Skill: metric definition, then
   grouped aggregation (the candidate split by country).
4. **Write rule-based flags for suspicious transactions** (e.g. login country
   different from registration country, amount or burst thresholds), then the
   SQL. Tables: transactions, users, activity. Skill: multi-table joins,
   threshold logic, combining rules.

From R5/R6 (prep, aggregated): month-over-month spend growth including users
with no prior month; 7-day rolling average; top-N per group; latest record per
user (ROW_NUMBER); judging a newly released plan with no defined metric.

From R5a (Q4 2026): a technical deep-dive on why cross-border debit
authorisation rate dropped, and the trade-offs of a fix — a metrics
discussion, not written SQL.

## Role variants

- **Data Analyst** (incl. Product / Financial Data Analyst, R1): online test →
  four-question SQL round → case/product → bar raiser (R3, R5, R5a, R7).
- **Data Scientist:** pandas-first; ML foundations; a specialisation deep-dive;
  some take-homes (R6, R8).
- **Analytics Engineer:** sits inside Data Analytics (R1); R7's candidate was
  an analytics engineer on a Data Analyst loop who ran out of time on Q4.

## What changed since the existing read (Interview Query, September 2026)

1. **Independent confirmation:** the four-question SQL round on
   users/transactions/events is now backed by a PracHub candidate report
   (Feb 2026) as well as Interview Query — medium, up from one source.
2. **The status-filter trap is confirmed** by R3's first question (completed
   transactions only).
3. **Not confirmed outside Interview Query:** the "top 10% of users by
   volume" and "monthly active users with completed transactions" questions,
   and the WHERE/HAVING and COALESCE mistakes. Our page states them as the
   reports' — still true of that one source, but they stay single-family.
4. **New shapes:** CTR from an event log; a metric to define for a
   subscription launch; written fraud rules. Two of the four R3 items are
   open-ended (define, then query).
5. **Revolut's own careers page names the stage order** (R1) — a first-party
   line our page does not cite.
6. **Interview Query's guide now counts 30 reports ("synthesized from 45")**,
   not 27, and gives the online test as ~60–75 min; the live round's length
   disagrees inside that publisher (45 vs 60 min).
