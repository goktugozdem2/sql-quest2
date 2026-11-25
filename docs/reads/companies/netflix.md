# Netflix — SQL interview dossier

**Dossier date:** 2026-11-25 (R1, batch 6). **Refresh by:** 2027-01-24.
**Page:** `/netflix-sql-interview/` — a general page ("we have no dated,
citable source … no round length, no tool and no process"). **Verdict of
this run: stays general.** One readable data-scientist loop mentions live
SQL; every other readable data-role report is either an OA with no SQL or
locked.
**Demand:** 29 impressions / 1 click in 28 days to 2026-11-21 (INDEX).

## Sources

Read with WebFetch on 2026-11-25. No other fetcher, no cache, no archive.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| N1 | PracHub: Netflix DS, "Eleven Rounds, Two and a Half Months, and a Hiring Manager Swap" | https://prachub.com/interview-experiences/netflix-data-scientist-interview-experience-eleven-rounds-two-and-a-half-months-and-a-hiring-manager-swap | interview Oct 2025; published 2026-08-25 | candidate report (full body) | 200 |
| N2 | PracHub: Netflix DS intern, "A 75-Minute Causal Inference OA That Left Me Guessing" | https://prachub.com/interview-experiences/netflix-intern-data-scientist-interview-experience-a-75-minute-causal-inference-oa-that-left-me-guessing | interview Mar 2026; published 2026-08-24 | candidate report (full body) | 200 |
| N3 | PracHub: Netflix Senior+ DS, "Technical Screen, Not Sure Where I Went Wrong" | https://prachub.com/interview-experiences/netflix-senior-data-scientist-interview-experience-technical-screen-not-sure-where-i-went-wrong | interview Jun 2026; published 2026-08-25 | candidate report — **body locked** (premium); title only, not counted | 200 |
| N4 | PracHub list, Netflix, all roles and `role=Data Scientist` | https://prachub.com/interview-experiences?company=Netflix | reports to Jun 2026 | list | 200 — 20 of 25 shown: 13 SWE, 4 MLE, 3 DS; no DA/DE/AE. The DS filter adds a second copy of N1 under another title (count once) and a Jan 2026 intern "causal inference OA" report whose body is locked. |
| N5 | PracHub resource: "Netflix Analytics Engineer Interview: SQL, Content Metrics, and Data Modeling" | https://prachub.com/resources/netflix-analytics-engineer-interview-sql-content-metrics-and-data-modeling | 2026-09-08 | prep article that cites **one** candidate post (dated 2026-03-10, San Francisco) it does not link; it says itself that it could not verify a standard AE loop | 200 |
| N6 | PracHub interview guide: Netflix data scientist | https://prachub.com/interview-guide/netflix-data-scientist-interview-guide | published 2026-03-21, updated 2026-11-03 | prep guide; no claim tied to a dated report | 200 |
| N7 | aced.io (ex-Exponent): Netflix analytics engineer guide; Netflix DS guide | https://www.aced.io/guides/netflix-analytics-engineer-interview ; https://www.aced.io/guides/netflix-data-scientist-interview | "updated 11 hours ago", © 2026, no calendar date | prep guides; no claim cites a dated report or a Netflix page | 200 |
| N8 | aced.io experience lists, Netflix × data-scientist / data-engineer; Netflix DE guide experiences tab | https://www.aced.io/experiences?company=netflix&role=data-scientist (and `role=data-engineer`); https://www.aced.io/guides/netflix-data-engineer-interview/experiences | — | lists | 200 — **no exact match** for any data role |

Refused or not usable (each final for this run):
- **Interview Query** (Netflix DA guide) — 429 (third run in a row).
- **Dataford** (Netflix AE experiences) — 429 (second run in a row).
- **explore.jobs.netflix.net** job API — 429. No first-party Netflix page
  about the interview was read this run.
- **Glassdoor**, **Blind** — not attempted (403 / 402 in earlier runs).
- **1point3acres** thread 1107374 ("Netflix SQL interview questions for
  analytics / data science roles") — not attempted (site-wide 403 in batch
  4). FOUNDER hand read.
- **Snippet-only, not sources:** search summaries quote Glassdoor DS reports
  (Jan and Jul 2026) of a SQL question about the titles that drove sign-ups
  among first-time viewers, and an older one counting new members in the
  last 7 days; and a 30-minute / HackerRank / PostgreSQL mix for DE. None of
  it was opened, so none of it is used below.

## Format

| fact | sources | confidence |
|---|---|---|
| Data scientist loop (Oct 2025): referral → HR screen (culture, background) → **technical round 1: a live SQL exercise where the query had to be run** → technical round 2: **SQL plus a case study** → hiring-manager conversations with two teams → onsite of six sessions, two of them technical (with a data scientist and an analytics engineer), both on ad frequency caps. About 2.5 months; about 10 people. | N1 | low |
| Data scientist **intern** OA (Mar 2026): one **CodeSignal** assessment, about **75 minutes**, open for a week. Two Python-or-R tasks that load a data file (estimate a treatment effect on minutes streamed; ITT vs treatment-on-the-treated, then an IV/LATE multiple-select), plus a statistics multiple-choice part. **No SQL.** | N2 (+ N4: a second intern report titled "causal inference OA", body locked, not counted) | low |
| Analytics engineer: "four SQL questions and two Python questions in 50 minutes on HackerRank" — one March 2026 candidate post, as **retold** by N5. R1 did not open the post. | N5 (secondhand) | low; never to a page |
| Platform of the DS SQL rounds, their length, dialect, take-home | — | **none** |

## Topics reported

M = 1 readable candidate report with SQL in it (N1), and N1 names no SQL
topic. **No topic count is possible.** N5's retold AE post names CTEs and
window functions (LAG); that is one secondhand report.

N6's own question bank (not reports): consecutive-day order streaks, a
7-day daily-active + first-purchase-conversion report in one query, the
longest run of days with rising watch time.

## Question shapes (paraphrased)

Candidate-reported, SQL: none described in a readable report.
Candidate-reported, adjacent:
- **Ad frequency caps (N1, onsite technical rounds):** how to set and test
  a cap on how often one viewer sees an ad. Experiment design more than SQL.
- **Treatment effect on streaming minutes (N2, intern OA, Python/R):** a
  causal-inference task on a file. Not a SQL shape.

## Role variants

- **Data scientist:** SQL appears early and live (N1), then mixes with a
  case; the onsite leans to experimentation. Intern DS OA is causal
  inference in Python/R, not SQL (N2).
- **Analytics engineer:** only N5's retelling (low).
- **Data engineer / data analyst / BI:** nothing readable.

## What changed

No earlier Netflix read existed; this is the first.

## Recommendations for the page (for C1; nothing here edits a page)

- **Keep the page general.** Nothing clears "medium".
- The page's description ("SQL practice for Netflix data analyst and data
  engineer interviews") names the two roles **no** readable report covers;
  the readable ones are data scientist (N1, N2). Suggest "Netflix data
  science and analytics interviews" or no role at all.
- FAQ "Does this page know…" carries the stale "such as the Capital One
  page" sentence (see INDEX run notes, batch 5: 21 pages).
- B3: nothing new — N1 gives no SQL detail, and streaks (318, 319) and
  cohort retention (88) already cover N6's bank shapes.
