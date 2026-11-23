# Apple — SQL interview dossier

**Dossier date:** 2026-11-23 (R1, batch 5). **Refresh by:** 2027-01-22.
**Page:** `/apple-sql-interview/` — a general page ("we have no dated
public source for how Apple runs its SQL round … no duration, no platform,
no stage list"). **Verdict of this run: one row could become sourced**
(medium): two 2026 data-scientist reports put SQL and Python in the same
technical screen. Not enough for a full format section.
**Demand:** 46 impressions / 5 clicks in 28 days to 2026-11-21 (INDEX).

## Sources

Read with WebFetch on 2026-11-23. No other fetcher, no cache, no archive.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| A1 | PracHub: Apple DS, "exploring employee and audit tables with the hiring manager" | https://prachub.com/interview-experiences/apple-data-scientist-interview-experience-exploring-employee-and-audit-tables-with-the-hiring-manager | interview Sep 2026; published 2026-09-28 | candidate report | 200 |
| A2 | PracHub: Apple DS, "telemetry design, a presentation, and an onsite that never happened" | https://prachub.com/interview-experiences/apple-data-scientist-interview-experience-telemetry-design-a-presentation-and-an-onsite-that-never-happened | interview May 2026; published 2026-11-12 | candidate report | 200 |
| A3 | PracHub: Apple DS, "a quick HR call just to schedule the minicase" | https://prachub.com/interview-experiences/apple-data-scientist-interview-experience-a-quick-hr-call-just-to-schedule-the-minicase | interview Oct 2025; published 2026-08-25 | candidate report | 200 |
| A4 | aced.io: Apple DS experiences (2 listed: Senior/L5 and L4, US) | https://www.aced.io/guides/apple-data-scientist-interview/experiences | interviews Mar 2026 (submitted 2026-06-14) and Sep 2025 (submitted 2026-04-03) | candidate reports (summaries; bodies members-only, not opened) | 200 |
| A5 | aced.io (ex-Exponent): Apple Data Analyst interview guide | https://www.aced.io/guides/apple-data-analyst-interview-guide | "Updated 4 days ago" on 2026-11-23 | prep guide; says it reflects one team's structure | 200 |
| A6 | jobs.apple.com search | https://jobs.apple.com/en-us/search?search=data%20analyst%20sql | live 2026-11-23 | first-party | 200, but no data-role posting surfaced in the visible results; nothing usable |

Also opened: the PracHub Apple list (51 stories; DS filter: 4 — A1, A2,
A3 and an Aug 2025 "four onsite rounds, no offer" whose body is locked,
title only, not counted) and the aced.io Apple × DS / DA / DE filters (no
exact matches).

Refused or not usable (final for this run): Glassdoor (403 on the run's
first Glassdoor fetch; not retried — the search results for Apple DS are
mostly Glassdoor), Interview Query (429; not retried), 1point3acres thread
920907 ("Apple Data Science … SQL and Product Sense"; not attempted,
site-wide 403 in batch 4).

## Format

| fact | sources | confidence |
|---|---|---|
| **The data-scientist technical screen includes SQL, next to a Python task.** A1: SQL then Python; A2: one SQL question and one basic Python task. | A1 (Sep 2026), A2 (May 2026) | **medium** (2 reports) |
| A1's screen was **live on CoderPad with the hiring manager**, thinking aloud; looking things up with AI was allowed. | A1 | low |
| A1's screen had **about three SQL tasks**, starting with exploring the data (duplicates, NULLs, timestamp range) before any metric. A2's had **one**. | A1, A2 | conflicting count — state none |
| DS loop after the screen (A2): a **one-hour presentation** (15–20 minutes of talk on one project, the rest Q&A), then several **30–45-minute virtual rounds** (telemetry design, user research, reading a rollout report, management). | A2 | low |
| **Hiring-manager rounds can be product and metrics with no SQL** (A/B testing and channel attribution; churn, profit and lifetime value). | A4 ×2 (Mar 2026, Sep 2025) | **medium** |
| The process **varies by team**: a recruiter said the DS roles share one job family and the specific team is assigned after the interviews (A3); the DA guide says it reflects one team (A5). A3's next step was a "minicase", not described. | A3, A5 | medium |
| Data analyst (guide only): technical screen of 1–2 live-coding sessions of about 60 minutes on SQL and a visualisation tool (Python for senior roles), a business-stakeholder round, a team panel of 3–6 people over 1–2 hours, then HM and skip-level; 4–12 weeks. | A5 | low |
| Platform for analysts, dialect, take-home | — | **none** |

## Topics reported

M = 2 candidate reports with SQL detail (A1, A2).
- Join of two tables — 2 of 2
- GROUP BY with an aggregate — 2 of 2
- A rate or share per group or period — 2 of 2 (A1 month-by-month rate; A2 share of users with a setting on, by language)
- HAVING on a count threshold — 1 of 2 (A1)
- Data-quality checks before analysis (duplicates, NULLs, ranges) — 1 of 2 (A1)
- Session duration from event timestamps — 1 of 2 (A1)

The DA guide (A5) adds, undated: CTEs, window functions, filtering logic,
top-N limits, time-window constraints.

## Question shapes (paraphrased)

Candidate-reported:
- **Explore before you answer (A1, DS Sep 2026):** an employee table (org,
  country) and a session audit log (session, user, timestamp, session
  name). First profile the data: duplicates, NULLs, the timestamp range,
  which orgs and countries exist. *Bank: **none** — no challenge asks for
  data profiling as the deliverable.*
- **Session length by org (A1):** average session duration per
  organisation, keeping only orgs with at least 400 sessions. Skills: join,
  duration from timestamps, GROUP BY, HAVING. *Bank: GROUP BY + HAVING
  items exist; none derives a session duration from an audit log.*
- **A monthly rate (A1):** a rate per month (definition not reported).
- **Feature adoption by language (A2, DS May 2026):** for one day, the
  share of users with autocorrect enabled, by keyboard language, from a
  usage table and a settings table. Skills: join, filter to a day,
  conditional share by group. *Bank: conditional-share items exist (e.g.
  "Revenue Share by Category"); no settings/usage pair.*

## Role variants

- **Data scientist:** SQL + Python technical screen (A1, A2); product /
  metrics HM rounds (A4); a presentation round (A2).
- **Data analyst:** one guide (A5); no candidate report readable.
- **BI / analytics engineer / data engineer:** nothing readable.

## What changed

No earlier Apple read existed; this is the first.

## Recommendations for the page (for C2 / C1; nothing here edits a page)

- **One sourced row is possible (medium):** "Two 2026 candidate reports for
  data-scientist roles describe a technical screen that pairs SQL with a
  short Python task; in one it ran live with the hiring manager." Cite A1
  and A2. Do not state a platform, a count, a length, or anything for
  analysts.
- **Unsourced claims on the existing page** (`src/apple-sql-interview.html`):
  1. JSON-LD `Course.description`: "14 hands-on SQL challenges covering
     **every pattern asked in Apple data analyst, BI, and analytics engineer
     interviews**" — the strongest unsourced claim found this batch; no
     source covers any of those three roles' questions. Remove.
  2. Hero: "**Master the SQL patterns Apple asks across Data Analyst, BI,
     and Analytics Engineer roles.**" — unsourced, and the disclaimer under
     it says the page knows no Apple question.
  3. `<meta name="description">`, `og:` and `twitter:description`: "Practice
     the SQL patterns **Apple tests** in data analyst and business
     intelligence interviews. App Store, Services revenue, product
     launches…" — unsourced.
  4. JSON-LD `teaches`: "App Store analytics", "Services growth SQL", "Apple
     SQL interview patterns"; `keywords` "apple bi sql" — imply Apple
     content the set does not have (its 14 challenges are orders, customers,
     movies and hiring data).
  5. "Six SQL Quest challenges matched to **Apple's patterns**" and the stat
     "Apple patterns" — wording; "matched to product-analytics SQL" is
     accurate.
  6. FAQ: "The one page on this site that does carry dated public sources
     for a company's screen is the Capital One page" — **stale** (same
     sentence as the Tesla page).
- B3: a **data-profiling** item (find duplicates, NULLs, ranges in an event
  log before the metric) — A1; it pairs naturally with the read-and-debug
  shape from Shopify and TikTok.
