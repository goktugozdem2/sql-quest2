# Google — SQL interview dossier

**Dossier date:** 2026-11-22 (R1, batch 4; the run crossed midnight UTC).
**Refresh by:** 2027-01-21.
**Page:** `/google-sql-interview/` — a general page ("we have no dated
public source for how Google runs its SQL round"). Its meta description
still says it covers "the exact SQL patterns Google asks in L3-L6 data
analyst and data engineer interviews" and names "BigQuery-style" queries;
neither has a source (see the last section).
**Demand:** 75 impressions / 2 clicks in 28 days to 2026-11-21 (INDEX).

## Sources

Read with WebFetch on 2026-11-22/23.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| G1 | PracHub: Google Engineering Analyst, "four team matches and a verbal offer" | https://prachub.com/interview-experiences/google-engineering-analyst-interview-experience-four-team-matches-and-a-verbal-offer-after-a-long-loop | timeline Oct 2025 → 2026-09-22; published 2026-09-28 | candidate report | 200 |
| G2 | PracHub: Google Business Intelligence Engineer, "HR call, rapid-fire SQL and Python" | https://prachub.com/interview-experiences/google-business-intelligence-engineer-interview-experience-hr-call-rapid-fire-sql-and-python-then-ghosted-after-h-1b-transfer | interview Nov 2026; published 2026-11-12 | candidate report | 200 |
| G3 | aced.io (ex-Exponent): Google Data Scientist interview guide | https://www.aced.io/guides/google-data-scientist-interview | "Updated 3 days ago" on 2026-11-22 | prep guide; some sample questions labelled candidate-reported | 200 |
| G4 | aced.io: Google DS experiences (3 listed) | https://www.aced.io/guides/google-data-scientist-interview/experiences | #1 Product DS L5, interview Dec 2025, submitted 2026-04-13; #2 DS L4 Poland, interview Feb 2026, submitted 2026-04-09; #3 undated | candidate reports | 200 |
| G5 | aced.io: Google data-analyst experiences (2 listed) | https://www.aced.io/experiences?company=google&role=data-analyst | #1 Data Analyst L3, interview Jan 2026; #2 BI Analyst L4, interview May 2024 | candidate reports | 200 |
| G6 | PracHub: Google DS, "an unexpected forecasting question and a fast offer" | https://prachub.com/interview-experiences/google-data-scientist-interview-experience-an-unexpected-forecasting-question-and-a-fast-offer-timeline | interview Jul–Aug 2026, offer Sep 2026; published 2026-09-28 | candidate report | 200 |
| G7 | PracHub: Google DS, "rejected after the role-related knowledge round" | https://prachub.com/interview-experiences/google-data-scientist-interview-experience-rejected-after-the-role-related-knowledge-round-on-experimental-design | interview Sep 2026; published 2026-11-12 | candidate report | 200 |
| G8 | PracHub: Google DS, "technical screen round one on experimentation design" | https://prachub.com/interview-experiences/google-data-scientist-interview-experience-technical-screen-round-one-on-experimentation-design | interview Aug 2026; published 2026-11-12 | candidate report | 200 |
| G9 | Google Careers: "Our hiring process" and "Interviewing at Google" | https://www.google.com/about/careers/applications/how-we-hire/ · …/interview-tips/ | none | first-party | 200, but the fetched text is navigation only (the content renders client-side) — **nothing usable** |

Refused or not usable:
- datainterview.com Google data-analyst guide — **429** (final for this run;
  it also answered 429 in batch 3).
- Glassdoor — not attempted.
- Reddit — not reachable by this agent's fetcher.
- GeeksforGeeks has no Google data-role SQL report (its Google posts are
  SWE / DSA).
- dataford, skillsetmaster, revarta and the datadriven.io Google DE pages
  were seen only as search results. Their "BigQuery-flavoured SQL"
  and "45-minute screen" lines are **snippets, not sources**.

## Format

| fact | sources | confidence |
|---|---|---|
| **SQL sits in the first technical round of analyst-type and product-DS loops.** Engineering Analyst: a case then SQL (G1); Product DS L5: the technical screen had SQL and schema design (G4 #1); BI Analyst L4: the first technical round was SQL (G5 #2, 2024). | G1, G4 #1, G5 #2 | **high** for "SQL comes early", across three different titles; no one length |
| **The SQL is written in a shared Google Doc.** | G1 (candidate); G3 (guide: the DS technical screen is in a shared Google Doc) | **medium** |
| Whether the query is run: **no source says**. G3 advises practising without autocomplete or execution but does not say the interview works that way. | — | none |
| **Engineering Analyst: five SQL questions per round, rising in difficulty** — about 25 minutes after a ~15-minute case (Apr 2026), and a second SQL round of five in ~40 minutes (Jul 2026). | G1 | low (one report) |
| **Several 2026 Google DS loops carried no SQL.** Three DS reports describe statistics, experimentation, forecasting and role-related-knowledge cases with no SQL question (G6, G7, G8); G4 #2 (DS L4) describes case studies and statistics with "very light" coding. | G6, G7, G8, G4 #2 | **high** for "a Google DS loop can run without a SQL question" |
| A BI Engineer recruiter call can include **conceptual SQL questions** (what GROUP BY and HAVING do, the join types) and a self-rating of SQL and Python, with no query written. | G2 | low |
| After the loop: hiring committee and team matching; one analyst went through four team matches over months. | G1, G6, G3 | high (not SQL-relevant) |
| DS loops: about four interviews (stats/modelling, experimentation/applied analysis, a SQL and ML round "at some teams", Googleyness). No AI tools in DS interviews. | G3 | low (guide only) |
| **Dialect:** no opened source names one. "BigQuery" appears only in search snippets. | — | **none** |

## Topics reported

M = 2 candidate reports with SQL topics (G1, G2). G4 #1 and G5 #2 say SQL
was asked but name no topic.

- Joins — 2 of 2 (G1; G2 as a conceptual question)
- Aggregation / GROUP BY / HAVING — 2 of 2 (G1; G2 conceptual)
- Filters — 1 of 2 (G1)
- Metric definition (numerator and denominator) — 1 of 2 (G1)
- A daily date series with zero-value days — 1 of 2 (G1)
- Rule-based detection logic from supplied tables — 1 of 2 (G1)

The guide (G3) adds, as its own claim: joins and aggregations in the screen,
subqueries / window functions / multi-table joins in the onsite SQL round.

## Question shapes (paraphrased)

Candidate-reported:
- **A metric across several tables (G1):** compute a product metric whose
  definition must be pinned down first (which fields, what counts in the
  denominator). Skills: joins, filters, aggregation, saying the definition
  aloud. *Bank: 157, 60 are near; none starts from an ambiguous definition.*
- **A daily report with no missing days (G1):** build a per-day report and
  decide whether every calendar date and the zero rows must appear. Skills:
  a date spine (a calendar CTE or table) and a LEFT JOIN with COALESCE.
  *Bank: **none** — no challenge fills absent days. Shopify's reports have
  the same need (see `shopify.md`).*
- **Spam rules from supplied tables (G1):** write detection logic, choosing
  between two suggested approaches. Skills: conditional logic, thresholds,
  joins. *Bank: none.*
- **Seasonality in a quarterly dataset (G3, labelled candidate-reported):**
  find and explain a seasonal pattern. *Bank: 84 (month-over-month) is
  near.*
- **Schema design for a video app (G3 and G4 #1):** design tables after
  asking clarifying questions. Not a query; it says the DS screen can test
  modelling.

## Role variants

- **Engineering Analyst** (the cases in G1 were about spam and malicious
  pages): recruiter → team
  interview (case) → case + SQL (five questions) → onsite (Googleyness,
  problem solving with the HM) → an extra SQL round of five → team matching
  (G1).
- **Product data scientist:** technical screen with SQL and schema design
  (G4 #1, L5) → three-round onsite.
- **Data scientist (business / generalist):** often stats-, experiment- and
  case-led; three 2026 reports had no SQL (G6, G7, G8).
- **Data analyst / BI analyst:** SQL in the first technical round (G5 #2,
  2024); the 2026 DA L3 report gives no detail (G5 #1).
- **BI engineer:** a recruiter call with conceptual SQL questions (G2).
- **Data engineer:** no candidate report opened.

## What changed

No earlier Google read existed; this is the first. The page states no
format, which is still right for a dialect or a stage list. Two facts are
now page-ready: SQL comes early in analyst-type loops, and a 2026 DS loop
can have no SQL at all.

## Recommendations for the page (for C2 / C1; nothing here edits a page)

- **Rewrite the meta description and intro.** "The exact SQL patterns Google
  asks" is a claim no source supports, and "BigQuery-style" has no opened
  source. Say "practice for the SQL in Google analyst and data-science
  loops" instead.
- A sourced row is possible at medium/high: "Analyst-type loops (Engineering
  Analyst, product DS, BI analyst) put SQL in the first technical round; one
  2026 report describes it in a shared Google Doc" (G1, G4 #1, G5 #2).
  Do not state five questions, round lengths or a dialect yet.
- A DS-specific line is honest and useful: "Several 2026 data-scientist
  loops were statistics and experimentation with no SQL question" (G6, G7,
  G8). It tells a DS candidate where to spend time.
- B3: a date-spine daily report (fill missing days with zero). The same
  need appears in Shopify's cumulative-revenue question.
- Re-try for the next run: the datainterview Google DA guide (429 twice).
