# TikTok — SQL interview dossier

**Dossier date:** 2026-11-23 (R1, batch 5). **Refresh by:** 2027-01-22.
**Page:** `/tiktok-sql-interview/` — sourced (`company-interviews.js`
`tiktok`; four sources accessed 2026-09-13: Exponent DS guide, DataLemur
blog, a DataLemur question page, a Blind DA report of 2022-02-06;
`docs/reads/company-research-2026-09-13.md`). This dossier replaces that
read for TikTok.
**Demand:** 51 impressions / 0 clicks in 28 days to 2026-11-21 (INDEX).

## Sources

Read with WebFetch on 2026-11-23. No other fetcher, no cache, no archive.

| id | source | URL | date shown | type | fetched |
|---|---|---|---|---|---|
| K1 | PracHub: TikTok DS, "medium SQL and background follow-ups" (US) | https://prachub.com/interview-experiences/tiktok-data-scientist-interview-experience-medium-sql-and-background-follow-ups-a9c0708de6 | reported Jun 2026; published 2026-09-05 | candidate report | 200 |
| K2 | PracHub: TikTok New Grad DS, "a month of rescheduling and a prickly SQL screen" | https://prachub.com/interview-experiences/tiktok-new-grad-data-scientist-interview-experience-a-month-of-rescheduling-and-a-prickly-sql-screen | Nov 2025; published 2026-08-25 | candidate report — **title and tags only; the body is locked (not unlocked)** | 200 |
| K3 | PracHub: TikTok DS, "a hiring manager round built around one experimentation case" | https://prachub.com/interview-experiences/tiktok-data-scientist-interview-experience-a-hiring-manager-round-built-around-one-experimentation-case | Jul 2025; published 2026-08-25 | candidate report | 200 |
| K4 | PracHub: TikTok DE (USDS), "a final round that ended before I wrote any SQL" + its near-identical twin "a skipped OA and a data modeling round with no code" | https://prachub.com/interview-experiences/tiktok-data-engineer-interview-experience-recruiter-chaos-and-a-final-round-that-ended-before-i-wrote-any-sql ; https://prachub.com/interview-experiences/tiktok-data-engineer-interview-experience-recruiter-chaos-a-skipped-oa-and-a-data-modeling-round-with-no-code | Sep 2025; both published 2026-08-25 | candidate report — **the two posts describe the same interview; counted once** | 200 |
| K5 | PracHub: TikTok SWE (Singapore), "troubleshooting, SQL and ticket prioritization" | https://prachub.com/interview-experiences/tiktok-software-engineer-interview-troubleshooting-sql-and-ticket-prioritization-b123627268 | reported Jul 2026; published 2026-09-04 | candidate report (support-style SWE; marginal) | 200 |
| K6 | aced.io (ex-Exponent): TikTok Data Scientist interview guide | https://www.aced.io/guides/tiktok-data-scientist-interview | "Updated 4 days ago" on 2026-11-23 | prep guide; says it draws on a senior TikTok DS and candidate reports | 200 |
| K7 | aced.io: TikTok DS experiences (1 listed: Singapore, L4) | https://www.aced.io/guides/tiktok-data-scientist-interview/experiences | interview Jun 2024; submitted 2026-06-13 | candidate report; no SQL visible | 200 |
| K8 | DataLemur: TikTok Data Scientist interview guide | https://datalemur.com/blog/tiktok-data-scientist-interview-guide | updated 2025-01-05 | prep guide | 200 |
| K9 | DataLemur: TikTok SQL interview questions | https://datalemur.com/blog/tiktok-sql-interview-questions | updated 2025-01-05 | practice guide | 200 |
| K10 | Prepfully: TikTok Data Scientist interview process | https://prepfully.com/interview-guides/tiktok-data-scientist-interview-process | none shown (footer © 2026) | prep guide; cites no sources | 200 |
| K11 | PracHub: TikTok DS question list | https://prachub.com/companies/tiktok/positions/data-scientist | questions dated 2025-07-12 → 2026-02-17 | question bank (paid); titles only | 200 |

Also opened: PracHub TikTok lists (34 stories, all-role; role filters: DS 5,
DE 2, **DA 0**), the aced.io TikTok × DS filter (no exact match), two more
PracHub DS reports (Oct 2025 Ads DS "downgraded to a DA offer"; Oct 2025
Senior DS "rejected after the HM round") — **bodies locked, titles only,
not counted**.

Carried, not re-read: the Blind DA report of 2022-02-06 the page cites
(Blind answered 402 to a TikTok DS post this run; the page has no URL for
it).

Refused or not usable (final for this run): Blind (402), Glassdoor (403 on
the run's first Glassdoor fetch; not retried), Interview Query (429 on the
run's first IQ fetch; not retried), 1point3acres threads 1087310 and 1151536
(not attempted; site-wide 403 in batch 4).

## Format

| fact | sources | confidence |
|---|---|---|
| **SQL is part of the data-scientist technical process.** | K1 (Jun 2026), K2 title (Nov 2025, "SQL screen"); guides K6, K8, K10 | **high** (2 candidate reports, 3 guides) |
| A DS SQL question can be **reading an existing query and reasoning about what it returns**, at medium difficulty (K1). A DE hiring-manager round asked to **debug a pre-written Hive query**, not to write one (K4). | K1, K4 | **medium** (2 reports, two roles) |
| Not every DS round has SQL: a ~50-minute hiring-manager round was a resume deep dive plus an experimentation case, with no coding. | K3 | low |
| DS stages: recruiter screen → hiring-manager screen → a loop of **3–4 rounds of about 45 minutes** (product sense, A/B testing, SQL, ML) plus behavioural → final HM conversation; all virtual; 3 weeks to 2 months. | K6; K8 and K10 describe recruiter → technical screen(s) → onsite | **medium** (guides agree; one candidate, K3, matches the first two steps) |
| **Platform: conflicting.** HackerRank for a live DS technical screen of 45–60 minutes (K8, 2025 guide); a HackerRank link in a 2025 DE data-modelling round (K4); SQL "typically in SQLPad" (K10, undated guide). K6 names none. | K8, K4, K10 | conflicting — **low** for "the SQL screen is on HackerRank" |
| A short **product-analytics take-home** can come up (metrics for a feature, a rollout plan; K10 says under 150 words). | K6, K10 | medium (guides only) |
| DE (USDS, Sep 2025): an online assessment was announced and then waived; three Zoom rounds (HM with behavioural + Hive debugging; behavioural; data modelling from a set of metrics, no SQL written); then a conversation with the wider team's head. | K4 | low |
| Dialect: the only one named is **Hive** (K4, DE). | K4 | low |

## Topics reported

M = 3 candidate reports with SQL detail: K1, K4, K5 (K2's body is locked).
- Reading or debugging an existing query — 2 of 3 (K1, K4)
- Aggregating operational records to find recurring patterns — 1 of 3 (K5, support tickets)

Guides and question banks (not reports; no dates per question):
- K9 (DataLemur's own 10 questions): a rate from two linked tables
  (activation); joins + count + threshold; day-2-but-not-day-1 confirmation;
  top-N users by likes; per-user per-day top video with a tie rule
  (ROW_NUMBER); averages and conditional counts.
- K10: at least one window function expected; year/month extraction;
  per-category minimum with ties; revenue share within a category; monthly
  average per unique customer; same-day duplicate orders.
- K11 titles: a shopping funnel with joins and windows; top-paid employee
  per department; the gap between a user's last and previous ad impression;
  a 7-day geo revenue dashboard; ranking bad advertisers; TikTok Live
  creator metrics; and, linked from the K2/K3 pages, a 7-day rolling
  complaint-to-order ratio and a CTR drop with exclusions.

## Question shapes (paraphrased)

Candidate-reported:
- **Read the query (K1, DS Jun 2026):** given a query, explain what it does
  and what it returns; not a trick. *Bank: **none** — no read-and-explain
  item.*
- **Fix the DAU query (K4, DE Sep 2025):** a pre-written Hive query meant to
  compute daily active users has a bug; find and fix it. *Bank: **none**.
  This is the same gap as Shopify's online-assessment item (`shopify.md`
  S6): a read-and-debug shape now reported at **two companies, three
  reports**.*
- **Tables from metrics (K4):** given a scenario and the metrics it needs,
  say which tables and columns you would design. Data modelling, no query.
- **Ticket patterns (K5, SWE Singapore Jul 2026):** use SQL to find
  recurring issues in support tickets, then prioritise. No schema given.

## Role variants

- **Data scientist:** SQL in the technical process (K1, K2); product /
  experimentation cases in HM rounds (K3); loop shape from guides (K6).
- **Data engineer (USDS):** K4 — Hive debugging + data modelling, little
  SQL writing; an OA announced then waived.
- **Data analyst:** **no readable report this run** (PracHub DA filter: 0;
  aced: none). The page's DA row rests on the 2022 Blind report alone.
- **BI:** nothing found.

## What changed since the 2026-09-13 read

- New: two dated candidate reports (Jun 2026 DS, Sep 2025 DE) agree that
  TikTok asks you to **read or debug** a query, not only write one.
- The DataLemur DS guide (K8) still says HackerRank, 45–60 minutes; a
  Prepfully guide (K10) says SQLPad. The platform is now **conflicting**.
- DataLemur's SQL blog (K9) names Data Science and Data Engineering as the
  roles it covers — **not Data Analyst**, which the page attributes to it.
- The old read's "difficulty medium-to-hard" and several topics came from
  Interview Query snippets that were never opened; they are not sources.

## Recommendations for the page (for C2 / C1; nothing here edits a page)

- **Add a sourced row (medium):** "Two candidate reports (Jun 2026 data
  scientist, Sep 2025 data engineer) describe being asked to read or debug
  an existing query rather than write one from scratch." Cite K1 and K4.
- **Keep** the DS stage row (K6 re-read: still says so), now with K8/K10 as
  corroboration.
- **Unsourced or weakly sourced claims on the existing page**
  (`src/tiktok-sql-interview.html`, data in `src/data/company-interviews.js`):
  1. Row "Roles — Data Scientist, Data Analyst and Data Engineer [2]": the
     cited DataLemur blog names DS and DE only. Drop "Data Analyst" or cite
     a source that names it.
  2. Row "Technical screen — A 45–60 minute screen on HackerRank … [2]": one
     guide (2025); another guide says SQLPad. Single-source = low. Either
     mark it "one guide reports" or remove the platform.
  3. Row "Data analyst screen" (Blind, 2022): one report, no URL on the
     page, unreadable now (402). Low; four years old by the next refresh.
  4. Hero: "Two sources three years apart agree on a live SQL screen on
     HackerRank" — rests on the two items above (a 2025 guide and the 2022
     Blind report); with K10 disagreeing, "agree" overstates.
  5. "**Reported most often, in order**" over the seven-topic list: no
     counts behind the order (the 09-13 read ranked it from snippets).
     CLAUDE.md bars frequency claims; replace with "N of M reports" counts
     from this dossier, or drop the ordering.
  6. "Difficulty: Reported as medium, with some reports of medium-to-hard":
     came from Interview Query snippets, never opened. Unsourced. K1 says
     "medium" once (low).
  7. "The data is videos (uploads, likes, dates), user interactions, sign-up
     and confirmation events, and creator cohorts" — these are DataLemur's
     practice tables (K9), not reported interview data; "creator cohorts"
     came from an IQ snippet.
  8. `<meta name="description">`: "the data science and analyst screens as
     candidates report them (live, on HackerRank)" — the analyst half rests
     on the 2022 Blind report; the platform is conflicting.
- B3: **a "read this query / fix this query" item** — Shopify S6 + TikTok
  K1, K4. The bank has none; it is the strongest cross-company gap found in
  batches 4–5.
