# Shopify — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, batch 4; the run crossed midnight UTC).
**Refresh by:** 2027-01-21.
**Page:** `/shopify-sql-interview/` — a general page ("we have no dated
public source for how Shopify runs its SQL round … no duration, no
platform, no stage list"). **Verdict of this run: sourceable.** Shopify's
own data-science posting names the stages and says the craft interviews can
include exploring a dataset with SQL, and three 2026 candidate reports put a
live SQL screen in the data-scientist loop.
**Demand:** 75 impressions / 7 clicks in 28 days to 2026-11-21 (INDEX) —
the joint-best click count of this batch.

## Sources

Read with WebFetch on 2026-11-22/23.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| S1 | Shopify careers: "Staff Product Data Scientists" posting | https://www.shopify.com/careers/staff-product-data-scientists-multiple-roles_362ecbdc-924e-4b3b-92b1-d57c8eed4263 | none (live on 2026-11-22) | **first-party** | 200 |
| S2 | Shopify careers: "Software Engineers" posting (same process text) | https://www.shopify.com/careers/software-engineers_ea5811c0-0353-4468-a1a5-0ef776748b31 | none (live on 2026-11-22) | **first-party** | 200 |
| S3 | Shopify Engineering: "Shopify's technical interview process: what to expect and how to prepare" | https://shopify.engineering/nail-your-technical-shopify-interview | 2022-07-07 | **first-party** (engineering blog), old | 200 |
| S4 | PracHub: Shopify DS, "SQL-only screen, five tables, and a passive interviewer" | https://prachub.com/interview-experiences/shopify-data-scientist-interview-experience-sql-only-screen-five-tables-and-a-passive-interviewer | interview Jan 2026; published 2026-08-25 | candidate report | 200 |
| S5 | PracHub: Shopify DS, "guided SQL and Python screening" (New York) | https://prachub.com/interview-experiences/shopify-data-scientist-interview-guided-sql-and-python-screening-fad4d661fa | reported Jul 2026; published 2026-09-04 | candidate report | 200 |
| S6 | PracHub: Shopify Senior DS, "online assessment, then a chart-reading phone screen" | https://prachub.com/interview-experiences/shopify-senior-data-scientist-interview-experience-online-assessment-then-a-chart-reading-phone-screen | interview Oct 2026; published 2026-11-12 | candidate report | 200 |
| S7 | PracHub: Shopify DS onsite, "data viz case, App Store marketplace case, and life story" | https://prachub.com/interview-experiences/shopify-data-scientist-interview-experience-data-viz-case-app-store-marketplace-case-and-life-story | interview Apr 2026; published 2026-08-25 | candidate report | 200 |
| S8 | aced.io (ex-Exponent): Shopify Senior DS (L5) experience | https://www.aced.io/experiences/shopify-senior-data-scientist-interview-82404e (301 from tryexponent.com) | interview ~Apr 2026 ("8 months ago"; the filtered list says Apr 2026) | candidate report | 200 |
| S9 | Prepfully: Shopify Data Scientist interview guide | https://prepfully.com/interview-guides/shopify-data-scientist | updated Aug 2026 | prep guide; says it draws on 3 senior DSs and 34 transcripts, no per-question dates | 200 |
| S10 | PracHub: "Shopify Data Engineer SQL pair programming" article | https://prachub.com/resources/shopify-data-engineer-sql-pair-programming-practice-questions-and-preparation | 2026-09-09 | prep article; relays one Jul 2026 DE report via a repost it calls unauthenticated | 200 |
| S11 | PracHub: Shopify company page (question list) | https://prachub.com/companies/shopify | questions dated 2026-05-05 and 2026-10-29 | question bank (paid); titles only | 200 |

Refused or not usable:
- 1point3acres threads 1161331 (DS SQL pair programming), 1059600 and
  1058101 (DS phone screens) — **403**, final for this run. They are the
  richest-looking DS sources; FOUNDER hand read if wanted.
- A Senior Data Scientists posting
  (`senior-data-scientists-multiple-roles_76d093b7…`) — **410 Gone**.
- Interview Query Shopify DS/DE guides — not attempted (429 in batches 2–3).
- Glassdoor — not attempted.
- The internships FAQ ("assessments of about an hour") was seen only in a
  search snippet — **not a source**.

## Format

| fact | sources | confidence |
|---|---|---|
| **Stages, as Shopify states them for data science:** Life Story → an online assessment followed by a craft assessment → craft interviews. Craft interviews, depending on the role, may include deep dives on past projects, a design critique, **exploring a dataset using SQL**, or solving a problem with the interviewer as co-pilot. The posting asks for "strong mastery of SQL". | S1 (S2 carries the same text for engineers) | **first-party** |
| Shopify aims to complete the loop **within 30 days** of applying (engineering posting). | S2 | first-party (engineering; not stated on S1) |
| **A live SQL technical screen is part of the DS loop.** | S4 (Jan 2026), S5 (Jul 2026), S8 (~Apr 2026) | **high** (3 reports, 2026) |
| The screen is announced as **SQL and Python**; it ran as both in S5 and S8, and as **SQL only** in S4 although the candidate had been told to expect both. | S4, S5, S8 | high for "SQL and Python are both announced"; the split varies |
| The SQL screen lasts **about an hour**. | S5 | low |
| **Explaining results is part of the screen or the next round:** presenting the SQL results to a PM in the last minutes (S4); reading charts, a confusion matrix, an A/B result and a retention table aloud (S6); interpreting a spiking time series and segmenting it in a spreadsheet (S7). | S4, S6, S7 | **high** |
| The **online assessment can include SQL** — read a merchant-order report query, predict its output and find its one error — next to behavioural and IQ-style items. | S6 (S11 lists a matching question dated 2026-10-29) | low (one report; S1 confirms an OA exists but not its content) |
| Shopify sends a **PDF guide before each round** describing what the interviewers assess. | S5 | low |
| Coding exercise (engineering): **40 minutes on CoderPad**, paired with a Shopify developer **or data scientist**, run your code as you go; pair-programming round 75–90 minutes, candidate drives. | S3 (2022); S9 repeats the 40-minute CoderPad exercise for DS | **medium**, but the first-party source is from 2022 |
| SQL pair programming on a Shopify-style dataset, **about five questions of rising difficulty**. | S9 | low (guide) |
| **Dialect:** no source names one. S10's examples use SQLite by the author's choice. | — | none |

## Topics reported

M = 4 candidate reports with SQL detail: S4, S6, S8, and the Jul 2026 DE
report relayed by S10. S5 names no SQL topic.

- Multi-table / "advanced" joins — 2 of 4 (S4 five tables, S8)
- Running totals with a window SUM — 1 of 4 (S4)
- Date ranges with an open (NULL) end date expanded over a calendar table — 1 of 4 (S4)
- Conditional aggregation, distinct counts by month, a percentage — 1 of 4 (S4)
- Reading a query: predict the output, find the bug — 1 of 4 (S6)
- Date-based aggregation — 1 of 4 (S10's relayed DE report)
- Clarifying requirements before writing — 2 of 4 (S4 learned "over time" meant a running total only late; S8's main tip)

The guide (S9) adds, as reported by its candidates without dates: RANK,
rolling averages, multi-table joins, CTEs, NULL handling, merchant/orders
schemas.

## Question shapes (paraphrased)

Candidate-reported:
- **Is pirated-theme use growing? (S4, DS Jan 2026):** the monthly share of
  shops running a pirated theme, after first defining "usage". Tables:
  pirated installs and all installs, keyed by shop. Skills: joins, COUNT
  DISTINCT by month, conditional aggregation, a percentage. *Bank: 61 and
  11 are near; no install/theme dataset.*
- **Revenue lost to pirated installs, as a running total (S4):** each
  install has a start date and a possibly-NULL end date; report the
  cumulative loss through each month. Skills: COALESCE for the open end,
  expanding ranges over a calendar table, a window SUM. *Bank: 24 is a
  running total, but **no challenge expands date ranges over a calendar** —
  the Google Engineering Analyst report has the same gap (`google.md`).*
- **Find the bug in a report (S6, Senior DS Oct 2026, online assessment):**
  given a merchant-order report query, predict what it returns and name its
  one error. Skills: reading SQL, not writing it. *Bank: **none** — no
  read-and-debug item.*
- **Explain a spike (S7, onsite Apr 2026):** weekly sessions over three
  years with one spike; add conversion; segment by shop type and session
  length to locate it. Done in a spreadsheet, not SQL.
- **App Store success (S7):** name the datasets, keys and joins needed to
  measure a three-sided marketplace. Data modelling, no query.

Guide-reported (S9, low): rank merchants by GMV inside a date range; for each
product variant's price update, the change from the previous price. *Bank:
172 (previous order's total, LAG) is the nearest to the second.*

## Role variants

- **Data scientist:** recruiter (~30 min) → SQL (+ Python) screen of about
  an hour → onsite of a data-interpretation round, a marketplace case and
  the Life Story (S4, S5, S7, S8). Senior DS: an online assessment with a SQL
  read-the-query item, then a chart-reading phone screen (S6).
- **Data engineer:** a SQL pair-programming round with runnable SQL is
  reported once, through a repost (S10). Low.
- **Data analyst / BI:** no report found; Shopify's analytics roles are
  titled Data Scientist.

## What changed

No earlier Shopify read existed; this is the first. The page's "no
duration, no platform, no stage list" can now give way to a sourced section.

## Recommendations for the page (for C2 / C1; nothing here edits a page)

- **Make the page sourced.** Rows that clear the bar:
  - Stages, first-party (S1): Life Story → online assessment and craft
    assessment → craft interviews that can include exploring a dataset
    with SQL.
  - Candidate-reported, high (S4, S5, S8): a live SQL screen, announced as
    SQL and Python. One 2026 report ran it as SQL only.
  - Candidate-reported, high (S4, S6, S7): you explain results to a
    non-technical audience — a PM, or charts read aloud.
- Do not state the screen's length, a dialect, a platform for the SQL, or
  "five questions" yet.
- B3, two shapes the bank lacks and that two companies share:
  1. date ranges with an open end expanded over a calendar, with a running
     total (Shopify S4; Google's zero-fill report);
  2. a "find the bug in this report query" item (S6).
- FOUNDER: the three 1point3acres Shopify DS threads (403) are worth a hand
  read; they may give the SQL round's length and platform.
