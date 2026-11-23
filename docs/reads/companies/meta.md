# Meta — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, batch 4; the run crossed midnight UTC, so
a few reads are stamped 2026-11-23). **Refresh by:** 2027-01-21.
**Page:** `/meta-sql-interview/` — sourced for **Data Engineer only**
(`SOURCED_FORMATS.meta` in `src/data/company-interviews.js`; two Blind
reports of 2025-03-17 and 2025-04-05, read 2026-09-14,
`docs/reads/company-research-2026-09-14.md`).
**Why it matters:** 90 impressions / 7 clicks in 28 days to 2026-11-21
(INDEX), the most of the four companies in this batch.

## Sources

Read with WebFetch on 2026-11-22/23. No other fetcher was used.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| M1 | PracHub: Meta Senior DS, "45-minute SQL and A/B test screen", L5 Product Analytics | https://prachub.com/interview-experiences/meta-senior-data-scientist-interview-experience-45-minute-sql-and-a-b-test-screen-for-l5-product-analytics | interview Aug 2025; published 2026-08-25 | candidate report (edited by PracHub) | 200 |
| M2 | PracHub: Meta Senior DS, "notification product sense plus two SQL questions, rejected" | https://prachub.com/interview-experiences/meta-senior-data-scientist-interview-experience-notification-product-sense-plus-two-sql-questions-rejected | interview Sep 2026; published 2026-11-12 | candidate report | 200 |
| M3 | PracHub: Meta DS, "timed SQL cases and A/B experiment design" (San Francisco) | https://prachub.com/interview-experiences/meta-data-scientist-interview-timed-sql-cases-and-a-b-experiment-design-c96ea68fd2 | reported Jul 2026; published 2026-09-04 | candidate report | 200 |
| M4 | PracHub: Meta Senior+ DE, "leadership and fullstack phone screen" | https://prachub.com/interview-experiences/meta-seniorplus-data-engineer-interview-experience-leadership-and-fullstack-phone-screen-rejected-over-not-enough-impact | interview Sep 2026; published 2026-09-19 | candidate report | 200 |
| M5 | PracHub: Meta DE, "TaskManager sorting problem" technical screen | https://prachub.com/interview-experiences/meta-data-engineer-interview-experience-taskmanager-sorting-problem-extended-to-multi-level-parent-child-tasks | interview Nov 2026; published 2026-11-11 | candidate report | 200 |
| M6 | aced.io (ex-Exponent): Meta Data Engineer interview guide | https://www.aced.io/guides/meta-data-engineer-interview (301 from tryexponent.com) | "Updated 3 days ago" on 2026-11-22 | prep guide; quotes some candidate variants | 200 |
| M7 | aced.io: Meta Data Scientist interview guide | https://www.aced.io/guides/meta-data-scientist-interview | "Updated 3 days ago" on 2026-11-22 | prep guide | 200 |
| M8 | aced.io: Meta DS interview experiences (5 listed; 4 are DS) | https://www.aced.io/guides/meta-data-scientist-interview/experiences | #1 submitted 2026-08-09 (interview May 2026); #2 submitted 2026-07-06 (interview Jun 2025); #3 and #4 undated | candidate reports | 200 |
| M9 | Meta: "Preparing for your Full Loop Interview at Meta" | https://www.metacareers.com/swe-prep-onsite/ | none | first-party, engineering only; no data-role content | 200 |
| M10 | PracHub: Meta DS question list (titles and dates only) | https://prachub.com/companies/meta/positions/data-scientist | questions dated 2026-03-04 to 2026-11-01 | question bank (paid); used for titles only | 200 |

Carried, not re-read: the two Blind DE reports behind the page (2025-03-17,
2025-04-05). Blind answered 402 in batch 3, so they were not retried.

Not usable this run: Glassdoor (not attempted; refuses automated reads),
Interview Query (429 in batches 2–3, not attempted), Prepfully DE guides
(search snippets only — the "standard SQL, not Presto" line is a snippet and
is **not** a source), Medium (403 in batch 3), Reddit (not reachable by this
agent's fetcher). The aced DS experiences #3 and #4 carry no date, so they
count as reports but cannot carry a dated page row on their own.

## Format

| fact | sources | confidence |
|---|---|---|
| **Data scientist (product analytics) technical screen = SQL and a product/analytics case in one session.** | M1 (Aug 2025), M2 (Sep 2026), M8 #2 (Jun 2025); guide M7 | **high** (3 candidate reports) |
| The DS screen has **one or two SQL questions** (M1: one question in two parts; M2: two; M8 #2: two in a 30-minute call, then a product case on the same tables). M7 says "1–2". | M1, M2, M8 #2, M7 | **high** |
| The DS screen is **45 minutes** in total. | M1, M2 | **medium** (2 reports; M8 #2 describes a 30-minute SQL call) |
| DS questions ask you to **define the metric before writing the query** (a performance metric; event-level vs user-level denominators; "define metrics first, then code them"). | M1, M2, M8 #3 | **high** |
| The DS screen is **timed tightly**: "fairly simple" SQL still took about 20 minutes (M1); both SQL questions not finished (M2); time pressure was the main difficulty (M3). | M1, M2, M3 | **high** |
| The DS full loop includes a separate SQL interview (M7: 2 cases, 1 SQL, 1 behavioural; M8 #2: SQL, behavioural, stats + product case, product case; M8 #3: SQL, product sense, probability/stats). | M7, M8 #2, M8 #3 | **medium** (one dated report + one undated + a guide) |
| **Data engineer technical screen mixes SQL and Python.** | Blind ×2 (2025), M6, M4 (Sep 2026, 1 SQL + 1 Python in a 1-hour "fullstack" round) | **high** |
| The DE screen's **question count is disputed**: 3 SQL + 2 Python (both 2025 Blind reports); 5 + 5 in 60 minutes on CoderPad, three of each needed to pass (M6, guide); 3 + 3 (a candidate variant M6 cites); one SQL + one Python (M4, Senior+). | Blind ×2, M6, M4 | conflicting — **state no count** |
| Whether DE code runs is **disputed**: not runnable in the screen or the onsite (Blind, Apr 2025) vs solved "against a full suite of test cases" (M6). | Blind, M6 | conflicting — state neither |
| The DE screen can be **Python-only**: one Nov 2026 report describes a single two-part coding problem and no SQL. | M5 | low |
| DE onsite: four ~1-hour technical rounds blending product sense, data modelling, SQL and Python, plus a ~30-minute behavioural ("Ownership") round. | M6 | low (guide only; Blind Apr 2025 gives no lengths) |
| **Dialect:** M6 says PostgreSQL for the DE screen. No candidate report names a dialect. | M6 | low |
| Meta's own prep page found is for engineering full loops and has no data-role content. | M9 | first-party, not applicable |

## Topics reported

M = 6 candidate reports with SQL content: Blind Mar 2025, M1, M2, M3, M8 #3,
M8 #4 (M8 #2 and M4 name no topics).

- Joins (multi-table, joining two aggregates) — 4 of 6 (M1, M2, M8 #3, M8 #4)
- Date logic (a trailing date window, cohort by registration date, casting a text date before a join, date/time) — 4 of 6 (Blind Mar 2025, M1, M2, M8 #4)
- Conditional aggregation / CASE / ratios and shares — 3 of 6 (M1, M2, M3)
- Window functions — 3 of 6 (Blind Mar 2025, M3, M8 #3)
- Defining the metric first — 3 of 6 (M1, M2, M8 #3)
- CTEs / subqueries — 2 of 6 (Blind Mar 2025, M2)
- Distinct counts and the event-vs-user denominator — 1 of 6 (M2)

Note: the DS guide M7 says window functions are **not** in the DS screen; M3
(a DS candidate, Jul 2026) names them. Do not repeat M7's exclusion.

## Question shapes (paraphrased)

Candidate-reported:
- **Where ad-driven spend lands (M1, DS L5):** over the last 30 days, the
  share of spend after an ad view that goes to an in-platform shop versus an
  external site. Tables: spend by channel and user/advertiser. Skills: date
  window, grouping, a ratio. *Bank: 61 (share of total) is the nearest; no
  ad/attribution dataset.*
- **Is the attribution model working (M1):** compare a revenue source with a
  conversions source and say which metric shows performance. Skills: joining
  two aggregated tables, metric choice. *Bank: none.*
- **Survey response rate two ways (M2, DS Sep 2026):** responses over
  impressions, then over unique users who saw the survey. One event table
  (user, date, event type, rating). Skills: conditional counts, DISTINCT, the
  denominator's grain. *Bank: **none** — no survey/impression event table.*
- **New vs tenured ratings (M2):** average survey rating for users who
  registered in the last 30 days against everyone else. Tables: the survey
  events plus users (registration date, country). Skills: a cohort flag in a
  CTE, a join, conditional averages. *Bank: none on this shape.*
- **A join that needs a cast (M8 #4, undated):** a recommendation feature
  ("restaurants you may like") where a date stored as text had to be cast
  before joining; join plus aggregation. *Bank: none with a text-typed date
  key.*

Guide-reported for the DE screen (M6 — the guide does not attribute these to
individual candidates; low): overdue, unreturned library loans; borrowers by
category and age band; users who called three or more distinct people in the
past week. M6 labels these as candidate-reported for the DE onsite: ride
requests counted in 15-minute tumbling windows; the share of recently active
Messenger users who made a video call.

Bank titles (M10, PracHub's paid bank; titles only, never the question text):
survey response rate per impression and per user (2026-09-14), new vs
tenured ratings (2026-09-14), view-weighted spam prevalence for posts with
10+ views (2026-11-01), high-call usage rates (2026-03-04). The first two
match M2's report, which is consistent with PracHub filing that candidate's
questions.

## Role variants

- **Data scientist, product analytics:** recruiter → 45-minute technical
  screen (1–2 SQL questions + a product/experiment case) → full loop with a
  SQL interview, product cases, stats and behavioural (M1, M2, M7, M8).
- **Data engineer:** recruiter → SQL + Python screen (count disputed) →
  onsite blending modelling, SQL, Python, product sense (Blind ×2, M6). A
  Senior+ variant opens with a 30-minute leadership round and a 1-hour
  "fullstack" round: one Python, one easy SQL, then metrics and architecture
  (M4).
- **Product analyst / data analyst:** PracHub lists 16 product-analyst
  questions but no experience post; **no report was read**. Nothing to say.
- **BI engineer:** no report found.

## What changed since the 2026-09-14 read

1. **First dated DS sources.** Three candidate reports (Jun 2025, Aug 2025,
   Sep 2026) put SQL and a product case in one DS screen of about 45 minutes
   with one or two SQL questions. The page today is DE-only.
2. **The DE row's "five problems: three SQL and two Python" is now
   contested.** The 2026 aced guide says 5 + 5 with a pass bar of 3 + 3, and
   a Senior+ report had 1 + 1. The two Blind reports still agree with each
   other, but the row should say sources disagree.
3. **"Not runnable" is contested** by the aced guide (test cases).
4. New shapes the bank lacks: survey response rate by impression vs user,
   and a new-vs-tenured cohort comparison.

## Recommendations for the page (for C2 / C1; nothing here edits a page)

- Add a **Data Scientist row** to `SOURCED_FORMATS.meta`: "SQL and a product
  case in one technical screen of about 45 minutes, with one or two SQL
  questions; define the metric before the query" — cite M1, M2, M8 #2
  (high). Change `role` from "Data Engineer" to name both tracks.
- Soften the DE "five problems" row to "candidate reports and a 2026 guide
  disagree on the count (3 + 2, 3 + 3, 5 + 5)", and drop or qualify "not
  expected to be runnable" (Blind vs M6).
- Do not state a dialect, onsite round lengths, or that window functions are
  excluded.
- The page's analyst section says questions "keep returning to six shapes".
  That reads as a frequency claim without a count; C1/Q1 should check it
  against the SEO rule.
- B3: a survey-impression event table with a response-rate-two-ways
  challenge, and a new-vs-tenured cohort comparison.
