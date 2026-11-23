# Capital One — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, first run). **Refresh by:** 2027-01-21.
**Page:** `/capital-one-sql-interview/` (sourced; hand-written; format section
dated "September 2026") and the blog post
`/blog/capital-one-codesignal-data-analyst-assessment/`.
**Why first:** 2 of the first 3 payers prepared for this screen (CLAUDE.md).

## Demand (gsc_daily, read 2026-11-22)

28 days to 2026-11-21, page slice: blog 658 impressions / 39 clicks /
position 7.3; company page 106 / 9 / 6.3. Query slice, 90 days: "capital one
data analyst assessment" 21 · 0 · 8.0; "capital one code signal assessment"
16 · 0 · 25.4; "capital one codesignal" 11 · 1 · 8.7; "capital one data
analytics assessment" 10 · 0 · 6.8; "capital one data science assessment"
8 · 0 · 9.6; "capital one business analyst codesignal" 5 · 0 · 22.2. Bing
(bing_stats, 90 days): "does capital one codesignal allow sql?" 4 impressions.
That Bing query is answered by source V1 below.

## Sources

Read 2026-11-22 unless marked. "Fetched" = opened that day; WebFetch unless
it says Apify (the session's fallback fetcher, used where WebFetch got 403/429).

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| V1 | CodeSignal Help Center: "What should I expect when I take the Data Analytics Assessment (DAA), and how is it structured?" | https://support.codesignal.com/hc/en-us/articles/4407377178647 | none shown | assessment vendor (first-party for the test) | Apify 200 (WebFetch 403) |
| V2 | CodeSignal Help Center: "What are the rules for the Data Analytics Assessment (DAA) and how can I interpret my assessment score?" | https://support.codesignal.com/hc/en-us/articles/4407377197847 | rules screenshots dated 2022-12-02 | assessment vendor | Apify 200 |
| V3 | CodeSignal Help Center: converting historical scores to Assessment Score (DAA table: data 2021-12-01 to 2023-05-18) | https://support.codesignal.com/hc/en-us/articles/13260678794775 | none shown | assessment vendor | Apify 200 |
| C1 | Capital One Careers: "What to expect during your Capital One interview" (Students 101) | https://www.capitalonecareers.com/what-to-expect-during-your-capital-one-interview-students-101 | none (footer © 2026) | first-party | 200 |
| C2 | Capital One Careers: "Cracking the business analyst interview" (Students 101) | https://www.capitalonecareers.com/cracking-the-business-analyst-interview-students-101-cdev | none (footer © 2026) | first-party | 200 |
| P1 | PracHub: Capital One Data Scientist, "Four CodeSignal tasks and no reply…" | https://prachub.com/interview-experiences/capital-one-data-scientist-interview-experience-four-codesignal-tasks-and-no-reply-after-nearly-two-weeks | interview Aug 2026; published 2026-08-30 | candidate report (edited by PracHub) | 200 |
| P2 | aced.io (ex-Exponent): Capital One Data Science Manager experience | https://www.aced.io/experiences/capital-one-data-scientist-interview-0056f8 | relative only: "submitted about 3 months ago", interview "about 7 months ago" (read 2026-11-22) | candidate report | 200 (tryexponent.com 301 → aced.io) |
| G1 | thita.ai: "Capital One CodeSignal Assessment 2026: SWE, Business Analyst and Data Analyst" | https://thita.ai/blog/interview/codesignal-capital-one | published 2026-10-21 | prep guide; attributes its DA format to one Glassdoor review without a link | 200 |
| G2 | Interview Copilot: "Capital One CodeSignal Assessment: Format, Scoring, Practice" | https://theinterviewcopilot.com/blog/capital-one-codesignal-assessment | published 2026-10-26, modified 2026-11-12 | prep guide (sells an interview-assist tool); cites V2-family CodeSignal articles, Capital One careers pages, 2021 Blind threads | 200 (WebFetch + Apify links) |

Carried from the September read (not re-read today; Blind now answers HTTP
402, a paywall, so it cannot be re-fetched): the seven sources in the blog
post's table — Blind threads of Dec 2021, Feb 2022, Nov 2022 (+ a Jan 2023
reply), Jun 2025; linkjob guide Aug 2025; extrabrain guide Feb 2026;
finalroundai analyst-track guide. Their dates and quotes are in
`src/blog/capital-one-codesignal-data-analyst-assessment.html` §Sources.

The two Blind threads whose links were swapped on the blog post until
2026-11-23 (Q1 caught it on #220; pairing below is Q1's re-read of that day):

| id | source | URL | dated | kind | fetch |
|---|---|---|---|---|---|
| B2 | Blind: "Capital One CodeSignal for Data Analysts" | https://www.teamblind.com/post/capital-one-codesignal-for-data-analysts-07h0ouhn | Feb 2022 ("14 questions instead of just 4"; "one question is a database question you have to use SQL for") | candidate report | Q1, 2026-11-23 |
| B4 | Blind: "Captial one Code signal for Data Analysis" | https://www.teamblind.com/post/captial-one-code-signal-for-data-analysis-c318r0cw | Jun 2025 ("around 14–15 questions in 70 minutes"; Capital One account's reply: "Format has changed in last 4 years") | candidate report | Q1, 2026-11-23 |

Not usable: Glassdoor (WebFetch 403 on a review page; not retried — the site
refuses automated reads); Blind (402); Interview Query guide (429; not
retried); 1point3acres BA thread 1090999 (login wall, not opened).

## Format

| fact | sources | confidence |
|---|---|---|
| **CodeSignal's standard Data Analytics Assessment is 70 minutes: 1 coding question + 14 quiz questions**, all open from the start, in any order. | V1 | vendor, first-party for the test; **does not name Capital One** |
| The DAA makes you **download CSV data and work it in any tool** (Excel, Google Sheets, R, Python named); the coding question is solved inside the assessment, outside IDEs not allowed. The vendor page names no language for the coding question. | V1 | vendor |
| **Capital One's data-analyst screen has the DAA's shape**: ~70 minutes, ~14 multiple-choice items on provided CSV/Excel data, plus written SQL. | V1 + Blind Dec 2021 / Feb 2022 / Nov 2022 / Jun 2025 (Sept read) + G1 | **high** that the shape is this; the identity "it is the certified DAA" is an inference (medium) |
| Score scale: the DAA now scores **200–600** (it was 600–850); "higher scores indicate … more questions" completed. Capital One's cut-off is not published. | V2, V3 | vendor |
| **The DAA can be retaken twice within 180 days**, then a cooldown. | V2 | vendor |
| The written SQL count: candidate reports say one database question (Feb 2022) or "few sql questions" (Nov 2022); the vendor says exactly 1 coding question. | V1 + Sept read | medium: plan for **one** coding question that carries extra weight |
| **Data scientist screen differs: CodeSignal, 4 tasks, 90 minutes, in Python (pandas)** — merge CSVs, reproduce joins/aggregations, feature engineering, a model. Hidden tests grade it. | P1 (Aug 2026), P2 (relative date; 90 min, four notebook tasks) | medium (2 reports, one with relative dates) |
| **Business analyst: Capital One describes a mini case, then a virtual Power Day of 2–3 case interviews and a product-strategy conversation**; no SQL test named. | C2 (first-party) | first-party, one page; G2 agrees |
| Some positions take a **one-hour virtual exam on the role's subject matter**; some candidates take an automated (behavioural-skills) assessment after applying; a 30-minute hiring-manager phone pre-screen; data-science roles get a **take-home Data Science Challenge** before Power Day; Power Day = job-fit + behavioural + case interviews; mini-cases ~30 minutes. | C1 (first-party, generic, undated) | first-party, one page |
| Prep guides of Oct–Nov 2026 repeat "14 MCQ + 1 coding" and warn that some data-analyst interns got no CodeSignal link at all. | G1, G2 | low (prep, derivative) |

**Dialect:** not stated by any opened source. G2 claims CodeSignal's DAA
support article lists MySQL, PostgreSQL and Microsoft SQL; V1/V2 as read today
do not say it — **unverified**, do not use.

## Topics reported

M = 4 sources with topic lists, **all prep guides** (linkjob Aug 2025,
extrabrain Feb 2026, finalroundai analyst track — Sept read; G1 today). They
repeat each other, so these counts are not independent confirmation.

- Joins (INNER/LEFT) — 4 of 4
- GROUP BY with COUNT/SUM/AVG/MIN/MAX — 4 of 4
- Window functions (ROW_NUMBER, RANK, LAG/LEAD, SUM OVER) — 4 of 4
- CTEs and subqueries — 2 of 4 (linkjob, extrabrain)
- CASE WHEN for conditional metrics and buckets — 1 of 4 (extrabrain)
- Date filtering (day/week/month/quarter/rolling) — 1 of 4 (extrabrain)
- Ratios / percentages, reading charts, spreadsheet work — 1 of 4 (G1)

Candidate reports (Blind, Sept read) name the **form**, not topics: answers are
numbers read off CSV data under time pressure; time is the constraint every
report mentions.

## Question shapes (paraphrased)

- **DA (dataset MCQ):** from provided account/transaction-style CSVs, compute
  one number — a total, average or rate per category — and pick the matching
  option. Tables: customers/accounts, transactions, products or campaigns
  (extrabrain's description). Skill: aggregation at the right grain, no
  fan-out. *Prep-guide shape, no candidate-reported item.*
- **DA (written):** summarise a table with SQL — grouping and aggregates
  (Blind Feb 2022 / Nov 2022, Sept read). Low detail.
- **DS (P1):** merge four ride-event CSV files and compute three metrics,
  casting types correctly; then re-create a multi-join, multi-aggregate table
  in pandas whose output has many columns. Skill: joins and grouped
  aggregates, in Python, against hidden tests.

## Role variants

- **Data analyst:** CodeSignal, 70 min, 14 MCQ on CSV + 1 coding (SQL by
  candidate reports); later a Power Day. (high for the screen; Power Day
  composition for DA: no first-party page names it.)
- **Data scientist:** CodeSignal, 90 min, 4 Python tasks (medium); take-home
  Data Science Challenge before Power Day (C1, first-party).
- **Business analyst:** case-first; Capital One names no SQL test (C2).
- **Software engineer:** the General Coding Assessment (70 min, 4 algorithm
  questions) — not ours; G2 and the Final Round "top 10" page conflate it with
  the analyst screen.

## What changed since the existing reads (2026-09 blog/page, capital-one-serp-2026-09-25)

1. **New first-party source for the screen's shape:** CodeSignal's own help
   page describes the DAA as exactly what candidates report — 70 minutes,
   1 coding + 14 quiz, CSV in any tool. Our page and blog cite only candidate
   reports and prep guides; they can now cite the vendor (with the caveat
   that the vendor does not name Capital One).
2. **The page's "one or a few written SQL questions" can tighten to "one coding
   question"** (vendor + the Feb 2022 report); "around 14 to 15 questions"
   becomes "15 items: 14 multiple choice + 1 coding".
3. **Scale and retake facts** (200–600, twice in 180 days) are new and answer
   the "capital one codesignal score" searches; no cut-off is published.
4. **Role split is now sourced:** DS gets a different, Python-only CodeSignal
   (P1, Aug 2026); BA gets cases, not CodeSignal (C2, first-party). Our page
   speaks only to the DA screen — correct, and it can say so.
5. **Our mock is 12 MCQ + 2 written SQL (14 items)**; the vendor's structure is
   14 + 1 (15 items). The 12 + 2 split was a founder QA decision (2026-09-19,
   `src/data/mock-interviews.js`), so a change is the founder's call.
6. Unchanged: no source gives a SQL dialect; no candidate-sourced question
   wording exists for the DA written question.
