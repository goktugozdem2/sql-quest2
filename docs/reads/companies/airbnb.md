# Airbnb — SQL interview dossier

**Dossier date:** 2026-11-25 (R1, batch 6). **Refresh by:** 2027-01-24.
**Page:** `/airbnb-sql-interview/` — a general page ("no round length, no
tool and no process"). **Verdict of this run: stays general, one fact is
close.** Two 2026 candidate reports, for two different roles (data
scientist, data engineer), both put a live SQL round inside the technical
stage. That is medium for "there is a SQL round"; everything about the round
itself rests on one report.
**Demand:** 25 impressions / 0 clicks in 28 days to 2026-11-21 (INDEX).

## Sources

Read with WebFetch on 2026-11-25; the Greenhouse job-board API with a plain
curl GET. No other fetcher, no cache, no archive.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| A1 | PracHub: Airbnb Senior+ DS, "Analytics Lead Role, Rejected After the Tech Screen" | https://prachub.com/interview-experiences/airbnb-senior-data-scientist-interview-experience-analytics-lead-role-rejected-after-the-tech-screen | interview Aug 2026; published 2026-11-12 | candidate report (full body; candidate signed an NDA and kept specifics out) | 200 |
| A2 | PracHub: Airbnb DS, "HM Screen Where the Role Didn't Match the JD" | https://prachub.com/interview-experiences/airbnb-data-scientist-interview-experience-hm-screen-where-the-role-didnt-match-the-jd | interview Aug 2026; published 2026-08-25 | candidate report (full body) | 200 |
| A3 | PracHub: Airbnb DE, "Four-Round Onsite, Then a Recruiter Who Ghosted Me" | https://prachub.com/interview-experiences/airbnb-data-engineer-interview-experience-four-round-onsite-then-a-recruiter-who-ghosted-me | interview Sep 2026; published 2026-09-19 | candidate report (full body) | 200 |
| A4 | aced.io: Airbnb Business Analyst, L4, US remote | https://www.aced.io/experiences/airbnb-business-analyst-interview-4a0cac | interview Apr 2026 (per the list) | candidate report | 200 |
| A5 | PracHub: Airbnb DS, "Five Onsite Rounds That Felt Like a PhD Defense" | https://prachub.com/interview-experiences/airbnb-data-scientist-interview-experience-five-onsite-rounds-that-felt-like-a-phd-defense | interview Oct 2025 | **body locked** (XP unlock); title only, not counted | 200 |
| A6 | PracHub lists, Airbnb, all roles and `role=Data Scientist`; PracHub company page | https://prachub.com/interview-experiences?company=Airbnb ; https://prachub.com/companies/airbnb | — | lists | 200 — 20 of 36 shown: 16 SWE, 2 DS, 1 DE, 1 MLE (+ A5 in the DS filter) |
| A7 | Airbnb job postings (Greenhouse board `airbnb`), e.g. Senior Analyst, Advanced Analytics (8225785); Lead Advanced Analytics, Community Support (8023118); Senior Data Scientist, Guest & Host (7662244); Staff, Advanced Analytics (8331899) | https://boards-api.greenhouse.io/v1/boards/airbnb/jobs ; https://careers.airbnb.com/positions/8225785 | updated 2026-11-10 → 2026-11-25 | first-party postings (no interview process described) | 200 |
| A8 | Codemia: Airbnb data scientist guide | https://codemia.io/guides/airbnb-data-scientist | "Updated Feb 2026" | prep guide; no claim cites a report or an Airbnb page | 200 |

Refused or not usable (each final for this run):
- **Interview Query** — not attempted for Airbnb after the Netflix guide
  answered 429 this run.
- **Glassdoor**, **Blind** — not attempted (403 / 402 in earlier runs).
- aced.io `role=data-scientist` and `role=data-engineer` filters — no exact
  match (only "similar" non-Airbnb-data rows).
- **Snippet-only, not sources:** a "30-minute HackerRank-style SQL
  assessment" for data analysts (Interview Query), "four or five SQL
  questions plus one Python" and "five questions in an hour" (Glassdoor).
  None was opened; none is used.

## Format

| fact | sources | confidence |
|---|---|---|
| **A live SQL round sits in the technical stage** of the data-scientist and the data-engineer loops (2026). | A1 (DS tech screen: case round + case-oriented SQL round), A3 (DE: OA with SQL, then a SQL interview in a four-round onsite) | **medium** (two reports, two roles) |
| Senior DS (Aug 2026): recruiter → hiring manager → **technical screen = a case round + a case-oriented SQL round** (background context and several datasets given). The recruiter said a pass leads to a **presentation round and two core-values rounds**. | A1 | low |
| DE (Sep 2026): **OA** with an easy SQL part and a Python task → onsite of **four** interviews: SQL, coding, behavioural (an end-to-end project), **data modelling**. | A3 | low |
| Business analyst L4 (Apr 2026): recruiter + phone interview; **no SQL to write**, one conceptual question about connecting SQL databases. | A4 | low |
| DS hiring-manager screen (Aug 2026): conversation only, no SQL; the team was keen on experimentation. | A2 | low |
| Platform, round length, dialect, take-home | — | **none** (A8 says 45 minutes with one SQL problem, unsourced) |
| The warehouse the analytics teams work on: postings name Presto, Hive, Teradata, Spark, Tableau / Superset; every analytics and DS posting asks for SQL with Python or R. This is the job's stack, **not** the interview's dialect. | A7 | first-party (postings) |

## Topics reported

M = 2 readable candidate reports with SQL detail (A1, A3).
- Metric definition from a vague request (retention), then the query — 1 of 2 (A1)
- Top-N with ties (ask the interviewer how to break them) — 1 of 2 (A3)
- Time between consecutive events with LEAD — 1 of 2 (A3)
- Consecutive-day activity (N days in a row) — 1 of 2 (A3)
- Data modelling: cumulative booking facts with first / last booking (SCD) — 1 of 2 (A3; a modelling round, not SQL)

## Question shapes (paraphrased)

Candidate-reported:
- **Retention, ask first (A1, Sr DS, Aug 2026):** a stakeholder asks "how
  is retention doing" at a home-sharing marketplace; pin down which
  retention they mean, define it, explain the calculation, then write it
  against a few given tables (users / stays or bookings implied). Tests
  metric definition before SQL. *Bank: cohort retention exists (88, 303);
  no item makes the solver choose the retention definition first. Joins
  the "define the metric first" B3 line (Meta, Revolut).*
- **Page dwell time (A3, DE, Sep 2026):** from a page-view event log, time
  on each page = next event's timestamp minus this one (LEAD), per user
  session. *Bank: no dwell-time item; challenge 47 is the only LEAD use, on
  salaries. Candidate B3.*
- **Super users, seven days in a row (A3):** users with an impression on
  seven consecutive days. *Covered: 318, 319 (streaks).*
- **Top-N with ties (A3):** rank and keep the top N; the tie rule is the
  question. *Covered: DENSE_RANK items (20, 23, 28 …).*
- **Super-host rule (A3, coding round, Python):** hosts with at least K
  listings, average rating above a bar and enough recent reviews. Python in
  the report; it is also a clean HAVING exercise.

## Role variants

- **Data scientist:** a case + SQL technical screen (A1); HM screens lean on
  experimentation (A2). A5 (Oct 2025, five onsite rounds) is locked.
- **Data engineer:** OA (SQL + Python), then SQL, coding, behavioural and
  data-modelling interviews (A3).
- **Business analyst:** a light phone screen without written SQL (A4).
- **Data analyst:** nothing readable (only Interview Query snippets).

## What changed

No earlier Airbnb read existed; this is the first.

## Recommendations for the page (for C1; nothing here edits a page)

- **Keep the page general for now.** One more readable report that agrees
  on the SQL round (any data role) would make "a live SQL round in the
  technical stage, often around a business case" sourceable at medium, with
  A1 + A3 cited. Do not state a length, a platform or a question count.
- The description "Airbnb data analyst and data scientist interviews" —
  the readable reports are data scientist and data engineer; no data
  analyst. Suggest "data science and data engineering".
- FAQ "Does this page know…" carries the stale "such as the Capital One
  page" sentence (INDEX run notes, batch 5).
- B3: page dwell time with LEAD (A3) — the bank's only LEAD item is on
  salaries.
