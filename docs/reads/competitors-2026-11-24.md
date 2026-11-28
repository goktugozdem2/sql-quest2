# Competitor and market watch — 2026-11-24 (B6, run 3)

Agent B6, cloud session. Runs 1 and 2 (`competitors-2026-11-22.md`,
`competitors-2026-11-23.md`) never read **DataLemur** beyond its question
list, never got **HackerRank**'s candidate side past the cookie wall, and only
named the new AI entrants. Run 3 rotates to those three: **DataLemur** (deep
dive), **DataDriven** (the new entrant now on our "sql mock interview" SERP)
and **HackerRank**. It re-checks Interview Query's Capital One guide (moved on
11-16) and records SERP notes on the six fintech money queries plus the two
pages we shipped on 11-23 (`/sql-mock-interview/`, `/sql-interview-prep-plan/`).

Docs only. No page changes here.

## How this was read

- Pages fetched through the Apify web-fetch connector on **2026-11-24,
  06:52–06:54 UTC**, public pages only, no login.
- **No 403 or 429.** Three fetches **timed out** at the connector (60 s):
  LeetCode `/subscribe/` and HackerRank `/domains/sql`, both with a rendered
  `wait`. Timeouts were not retried through another tool; both stay "not
  read" (§7).
- SERP notes: the session's WebSearch tool (US engine, not Google). Order is
  indicative, never a Google rank.
- Sentiment: search titles and summaries only. No usernames, no quotes.
  Glassdoor, Blind, 1point3acres appear only as SERP shape, never as a page
  fact.
- No per-page business numbers from our side are in this file.

---

## 1. DataLemur (deep dive)

| Fact | Source, read 2026-11-24 |
|---|---|
| Positioning unchanged: "Ace the SQL & Data Science Interview", founder-led (ex-Facebook author of *Ace the Data Science Interview*); homepage table of 14 company-tagged questions (LinkedIn, Facebook, Tesla, NYT, Robinhood, Snapchat, Twitter, Google, Walmart, Amazon, Wayfair, Stripe) | [datalemur.com](https://datalemur.com/), 200 |
| **Prices: Monthly $15; Yearly $60 (struck $180, "$5 per month", "BEST VALUE!"); Lifetime $300** = 1:1 coaching call + signed book + lifetime access. Same as the 11-22 monetization read: **no change** | [datalemur.com/pricing](https://datalemur.com/pricing), 200 |
| **Bank count contradicts itself on one page:** meta "200+ SQL Interview Questions"; lifetime card "250+ interview questions"; yearly and monthly cards "100+ SQL Interview questions" + "70+ Data Science interview questions" | same page |
| Paid tiers add "multiple hints and full solutions"; yearly and lifetime add a $25 video course on the job hunt | same page |
| **No AI tutor, no AI interviewer, no timed mock, no company mock** on the homepage, pricing page or Capital One post. The only "mock" is a human one inside the $300 lifetime call | the three pages above |
| **Capital One post: title "9 Capital One SQL Interview Questions (Updated 2025)", "Updated on February 15, 2025".** Nine generic questions (top-10 spenders, top-3 salaries per department, BETWEEN vs IN, monthly average by card type, UNION vs UNION ALL, CTR, constraints, city filter, compound interest). **No word on the CodeSignal assessment, CSV/Excel files, the 70-minute format or Power Day.** Says Capital One "almost always asks SQL questions … for Data Science and Data Engineering positions" | [datalemur.com/blog/capital-one-sql-interview-questions](https://datalemur.com/blog/capital-one-sql-interview-questions), 200 |
| That post is still in today's top 10 for "capital one data analyst sql interview", the only practice platform in a list of 12 Glassdoor URLs, IQ and 1point3acres | WebSearch 2026-11-24 (§3) |
| Stripe post ranks for "stripe data analyst sql interview" (#3 today) | WebSearch 2026-11-24 |
| Reviews: no independent 2026 review surfaced. The r/SQL "which paid site is worth it" thread (seen in run 1) shows the founder answering "$15 a month" himself | WebSearch 2026-11-24, titles and summaries |

**Read.** DataLemur is static: same price, same bank, no AI layer, and its
Capital One post is 21 months old and silent on the assessment that 2 of our
first 3 payers sat. It still ranks because it is old and linked, not because
it answers the query. That is the softest incumbent on our best payer query.
It also has the market's cheapest annual ($60) and no lifetime under $300.

## 2. New entrant — DataDriven (datadriven.io)

| Fact | Source, read 2026-11-24 |
|---|---|
| "The data engineering interview community", founded **2025-08** (JSON-LD `foundingDate`) | [datadriven.io](https://datadriven.io/), 200 |
| Homepage: "1,569 real questions", "281 companies", "2,817 interview reports"; JSON-LD: SQL 928 questions, Python 415 | same |
| **Interview mode, four phases: Think (vague prompt, ask clarifying questions) → Code (real execution) → Discuss (AI interviewer asks up to 8 follow-ups one at a time, edge cases, optimisation, "curveball requirements") → Verdict (hire/no-hire with feedback)** | same, "About DataDriven" |
| Adaptive difficulty, spaced repetition, per-topic **readiness score**, company filter (Google, Amazon, Meta, Stripe, Databricks) | same |
| **Ranks for "sql mock interview"** with `/mock-interview/sql` (title "SQL Mock Interview for Data Engineers", `dateModified` 2026-07-27). Claims 8–15 edge cases tested per question and a percentage topic split "based on analysis of interviews at 281 companies" | [datadriven.io/mock-interview/sql](https://datadriven.io/mock-interview/sql), 200 |
| Price: **not established.** The homepage says "Every feature is open to every member of the community"; the same page marks some problems "pro"; `/pricing` returned a 308 with an empty body. A search summary calls it "100% free" (not fetched, not usable) | homepage; [datadriven.io/pricing](https://datadriven.io/pricing), 308 |
| No analyst framing: its own FAQ says analyst SQL interviews "focus more on aggregation and basic joins". No fintech companies in its company list | mock page FAQ; homepage footer |
| No independent reviews found; only its own dev.to posts | WebSearch 2026-11-24 |

**Read.** DataDriven has shipped the exact feature run 1 routed to the
backlog (item 10: a follow-up after a correct mock answer) and more: up to 8
follow-ups, curveballs, a verdict. It is data-engineering-only and does not
compete for the analyst at Capital One, Revolut or Wise. It does compete for
the generic "sql mock interview" query, where our new page has to stand.

## 3. HackerRank (candidate side)

| Fact | Source, read 2026-11-24 |
|---|---|
| The Interview Preparation Kit is **algorithms-only** (Arrays, Hashmaps, Sorting, Strings, Greedy, Search, DP, Stacks, Graphs, Trees, Linked Lists, Recursion, Misc). **No SQL section** | [hackerrank.com/interview/interview-preparation-kit](https://www.hackerrank.com/interview/interview-preparation-kit), 200 |
| SQL domain page timed out (rendered fetch); run 1's partial read (six subdomains) stands | [hackerrank.com/domains/sql](https://www.hackerrank.com/domains/sql), timeout |
| Candidate reports name HackerRank as the **test platform** for Revolut (a HackerRank assessment before a 45-minute live SQL round), Wise (a HackerRank SQL test, then HR) and a Stripe 45-minute HackerRank round with ~4 SQL and metrics questions in ~25 minutes | WebSearch 2026-11-24, Glassdoor / IQ summaries, not fetched |

**Read.** HackerRank is not a prep competitor for our buyer; it is the
**exam room** for three of our fintech companies. Nobody's page tells a Wise
or Revolut candidate what the HackerRank SQL screen feels like (editor,
dialect choice, time per question). That is a gap a company page can fill in
our own words, sourced to candidate reports.

---

## 4. What changed since run 2 on competitors already read

| Competitor | Change since 2026-11-23 | Source |
|---|---|---|
| **Interview Query** — Capital One DA guide | Header still "30 candidate reports · 29 practice questions · Updated 7 days ago (Nov 16, 2026)", but the synthesis now reads "**Synthesized from 39 candidate reports**" (self-contradicting). New detail in the synthesis: one 70-minute version had **four CSV datasets to join** and a SQL question that was a **seat-reservation problem "processing requests in order with sequential updates"**; a separate SQL round asked for **at-risk customers with CTEs, a LEFT JOIN and NULL filtering**, with optimisation follow-ups; Power Day cases change an input mid-problem ("doubling the loss rate"). AI mock button unchanged | [interviewquery.com/guides/capital-one-data-analyst](https://www.interviewquery.com/guides/capital-one-data-analyst), 200 |
| Interview Query — URL shape | The new `/guides/<company>-data-analyst` shape now ranks for Stripe DA too (alongside the old `/interview-guides/` URL); Revolut keeps 3 paginated `/guides/` URLs | WebSearch 2026-11-24 |
| **Dataford** | Its `/interview-guides/wise/data-analyst` now ranks for "wise data analyst sql interview" (run 2: no Wise-specific practice page ranked). Stripe and Chime DA guides rank too | WebSearch 2026-11-24 (not fetched today) |
| **PracHub** | Two Chime DS reports rank for "chime data analyst sql interview" (SQL + business case in one screen; a schema-less SQL retention question in the HM screen) | WebSearch 2026-11-24 |
| DataLemur | Price and bank unchanged vs 11-22 (§1) | §1 |
| StrataScratch, LeetCode, Aced, letsdatascience, Prepfully, BTI, LearnSQL | Not re-read. LeetCode's price stays unreadable (timeout) | — |

---

## 5. SERP notes (WebSearch, US, 2026-11-24)

`sqlquest.app` appeared in **none** of the eight lists. **`sql-quest2.vercel.app/vs-datalemur/` appeared** in a review search with the title fragment "Honest comparison · Updated May 2026" (run-1 item 3, still open).

| Query | Leaders today | Note |
|---|---|---|
| capital one data analyst sql interview | Glassdoor ×15, **DataLemur blog (Updated 2025)**, IQ `/interview-guides/Capital-One-Data-Analyst`, 1point3acres | One practice platform, and its page is 21 months old |
| revolut data analyst sql interview | Glassdoor ×14, **IQ ×4** (`/interview-guides/` + `/guides/` ×3 paginated) | No practice platform. Reported: HackerRank + 45-min live SQL; transaction data, window functions, CTEs |
| wise data analyst sql interview | Glassdoor ×14, IQ "Wise Skulls" (name collision), **Dataford `/interview-guides/wise/data-analyst`** | Reported: HackerRank SQL test; four SQL questions in a Google Doc; "given a query, say what is wrong with it" |
| monzo data analyst sql interview | **Greenhouse job posts ×7, Monzo blog ×2**, Glassdoor ×4, job boards | No prep site at all for the DA phrasing (Prepfully held the "sql interview questions" phrasing in run 2). Reported: BigQuery take-home judged on readable SQL; "sql live debugging" |
| chime data analyst sql interview | Glassdoor ×4, 1point3acres ×4, Aced experience, dev.to, **IQ ×4**, **PracHub ×2**, **Dataford DA + BI** | Crowded with guides; window functions reported as the hardest part |
| stripe data analyst sql interview | **IQ ×4** (DA `/guides/` + `/interview-guides/`, BI, BA, PA), **DataLemur blog**, Blind ×3, Glassdoor ×6, **Dataford DA** | Reported: 45-min HackerRank, ~4 SQL + metrics questions in ~25 min; CoderPad first round |
| **sql mock interview** | Scribd, a journal PDF, **igotanoffer (human coaches)**, Indeed HK, codingshuttle, InterviewBit, dataengineeracademy, **DataDriven `/mock-interview/sql`**, onjob.io (AI mock), **Dataford mock previews ×2**, coddykit, Educative, Coursera, roadmap.sh, CodeSignal blog | **Weakly held.** One runnable SQL mock page (DataDriven, DE-framed), two Dataford previews, the rest are lists and PDFs. No analyst-framed, company-shaped mock ranks |
| **sql interview prep plan** | HackerNoon, **Aced/Exponent "prep sql interview fast" ×4 (one per track)**, Coursera ×4, Codecademy blog, **Educative ×3**, CodeSignal, **LearnSQL blog ×2**, Towards Data Science study plan, a Substack | Editorial. Course sellers hold it. No page offers a plan sized to the reader's date |

**Pattern.** On our two new queries, nobody holds a strong page.
"sql mock interview" has one runnable DE mock and the rest is editorial;
"sql interview prep plan" is course marketing. Our pages are 1 day old; their
index status is C1's laptop read, not this file's.

---

## 6. What users say (search titles and summaries only)

- **DataLemur**: no independent 2026 review. Praise pattern from run 1 holds
  (cheap, focused, hints and solutions). The price question in r/SQL is
  answered by the founder himself.
- **DataDriven**: no independent review; all signal is its own blog and
  dev.to. Treated as unproven.
- **Capital One candidates (IQ synthesis, 11-16)**, adding to run 2: the
  assessment "leaned on spreadsheets as much as code"; Excel pivots across
  tables were hard under time; the take-home ran in a compressed Google
  Sheets interface; the prep material the recruiter sent "gave a false sense
  of security". Pattern unchanged and sharper: **the test is data handling
  under a clock, then case math.**
- **Wise candidates** (snippets): debugging a given query; interviewers who
  could not answer clarifying questions. **Monzo**: readable, maintainable
  SQL in BigQuery; live debugging. Pattern across both: **reading and fixing
  SQL counts as much as writing it.**
- Repeated from runs 1–2: paywalled solutions are the top complaint.

---

## 7. Progress on run 1's and run 2's routed items (checked on `main`, 2026-11-24)

| Item | Lane | State |
|---|---|---|
| R1-1 / N1 / N8 — Capital One guide first screen names the format, the other test and the mock by its numbers | C5 | **Shipped, #220** (11-23). The blog guide now carries "70 minutes", the CSV files and the separate coding test |
| R1-2 — Wise sourced format section + 4-question set | C5 (+B3) | **Open.** `src/wise-sql-interview.html` has no "How the interview runs" section. Dataford's Wise DA guide now ranks on the query it was empty on |
| R1-3 — 301 `sql-quest2.vercel.app` → `sqlquest.app` | C1 | **Open.** `vercel.json` has no host rule; `src/data/config.js` still names the vercel.app host for Auth. **Its `/vs-datalemur/` page now shows in a DataLemur review search** with "Updated May 2026" |
| R1-4 / N3 — drop "only platform" AI-coach claims | C2 | **Shipped, #215** (11-23). No "only platform" or "no other platform" left in `best-sql-practice-sites` or `sql-practice-comparison` |
| R1-5 — Revolut: cite the PracHub reports, mock above the fold | C5 | **Open.** The page has a sourced section but 0 PracHub citations |
| R1-6 — Monzo: question 1 + readiness above the fold | C5 / C1 | Open |
| R1-7 / N4 — price inputs for B4 | B4 | Added to again (§8, P1) |
| R1-8 — what a free account gets after a wrong answer | C2 / C5 | Open |
| R1-9 — cohort-retention + funnel topic funnel | C6 | **Partly covered.** Retention is mentioned on several company pages (Chime, Revolut, Ramp, Plaid …) but there is no retention topic page or guide |
| R1-10 — mock follow-up question | backlog | Open. **DataDriven ships it** (§2): up to 8 follow-ups and a verdict |
| N2 — Capital One mock has a multi-table rate question | C5 / B3 | Open. New input in §4: the reported SQL item was a **sequential-update** (seat-reservation) problem |
| N5 — Monzo "debug this query" item | C5 (+B3) | **Unblocked.** The Debug question type (331–342) and the `/sql-debugging-practice/` hub went live on 11-24 (#249, #289). The Monzo page does not link them yet |
| N6 — Revolut/Monzo index status | C1 (laptop) | Not visible from the cloud |
| N7 — `/sql-exercises/` vs "sql practice questions" | C6 | Open |
| DDL/DML set (#172, 11-23) | — | **Shipped** (325–329). Relevant to §4: Capital One's reported sequential-update question is a DML shape |

---

## 8. Routing table — new items only, ranked by expected money per hour

Ranking logic as in runs 1–2: fintech company doors convert best, copy beats
builds, a wrong fact seen at purchase time ranks high.

| # | Finding | Change that could bring a customer | Lane | Why this rank |
|---|---|---|---|---|
| P1 | DataLemur's Capital One post (Updated 2025-02-15) is the only practice platform on "capital one data analyst sql interview" and says nothing about the CodeSignal assessment, CSV files or 70 minutes. Our blog guide says all three since #220 | Make `/capital-one-sql-interview/` compete on **this exact phrasing**: its title is "Capital One SQL Interview (2026): 25 Questions + Mock" with no "Data Analyst" (the blog guide's title has it). Add "Data Analyst" to the company page's title/H1 and a visible updated date (DataLemur shows 2025, IQ 2026-11-16). The page is unfrozen since 10-12. No mention of DataLemur on our page | **C5** | Best payer query, softest incumbent, copy only |
| P2 | IQ's Capital One synthesis now names a **sequential-update (seat-reservation) SQL question** and an "at-risk customers" CTE + LEFT JOIN + NULL round. We just shipped state-graded DML challenges (325–329) | B3 writes one state-graded challenge on our own card/transaction data in that shape (process requests in order, update state); C5 names "one question may ask you to update rows in order, not only select" on the Capital One guide, sourced to IQ 11-16. Never copy IQ's question text | **B3** → C5 | Aligns the mock and the guide to what payers report; the engine already exists |
| P3 | Monzo and Wise candidates report **debugging a given query**; the Debug set (331–342) and `/sql-debugging-practice/` went live 11-24 | Link the Debug hub from `/monzo-sql-interview/` and `/wise-sql-interview/` with one sourced line each (Monzo: the blog post already cited; Wise: a fetched, dated report, C5 fetches it). Closes N5 | **C5** | Ships today's feature onto two fintech doors; minutes of work |
| P4 | `sql-quest2.vercel.app/vs-datalemur/` shows in a DataLemur review search with "Updated May 2026" | Raise R1-3 to the top of C1's queue: host redirect, after checking the Supabase Auth Site URL and redirect list | **C1** | Stale page on a comparison query; 15-minute fix, already scoped |
| P5 | "sql mock interview" is weakly held: one DE mock (DataDriven), Dataford previews, the rest editorial. No analyst-framed company mock ranks | C2 checks `/sql-mock-interview/` against the query: an H2 naming the analyst framing, the two company mocks by their numbers (minutes, questions), and one line on what happens after a wrong answer. C1 requests indexing (laptop) | **C2** / C1 | New page, open SERP; copy and a laptop request |
| P6 | "sql interview prep plan" is course marketing (Aced ×4, Coursera ×4, Educative ×3, LearnSQL). Nobody sizes a plan to the reader's interview date | C2 makes sure `/sql-interview-prep-plan/` leads with the date-sized plan the app builds (days to the interview → challenges a day), linked to the app's `?goal=` door | **C2** | Our differentiator matches the query's gap exactly |
| P7 | HackerRank is the reported **test platform** for Revolut, Wise and Stripe screens; no page explains that screen to an analyst | C5 adds one sourced line per page ("candidates report a HackerRank SQL test") and C7 answers "what is the HackerRank SQL test like" in our own words on an existing post. Sources: fetched, dated reports only | **C5** / C7 | Three fintech doors, one shared fact; needs C5's fetch first |
| P8 | DataDriven: AI interviewer with up to 8 follow-ups, curveballs and a hire/no-hire verdict, plus readiness score and spaced repetition. Supersedes run-1 item 10's evidence | Orchestrator re-reads R1-10 with this evidence. Our honest edge stays the analyst framing and the company-shaped fintech mocks; do not claim follow-ups we lack | **backlog** (orchestrator) / C2 | A build; lowest money per hour |
| P9 | DataLemur prices unchanged: $15/mo, **$60/yr**, $300 lifetime (coaching + book). Its own page states its bank three ways (100+ / 200+ / 250+) | Dated input for B4. **No agent changes a price.** C2 must not quote a DataLemur bank count from this page (self-contradicting) | **B4** / C2 | Context for a founder-held decision |

Also noted, not routed:
- Dataford's Wise DA guide now ranks where nothing did on 11-22. That raises
  the cost of R1-2 waiting; it is not a new item.
- DataDriven's "percent of interviews" topic split is the kind of claim our
  own rule forbids without a dated source (`tests/seo-consistency.test.js`).
  Recorded so nobody copies the framing.

## 9. Not read, and why

- **LeetCode `/subscribe/`** and **HackerRank `/domains/sql`**: rendered fetch
  timed out at the connector (60 s). Not retried through another tool.
- **DataDriven price**: `/pricing` returned a 308 with an empty body; the
  homepage contradicts itself ("every feature is open" vs "pro" labels).
- Dataford's Wise guide and PracHub's Chime reports were seen in the SERP
  only, not fetched today.
- StrataScratch, Aced, letsdatascience, Prepfully, BTI, LearnSQL: not re-read;
  runs 1–2 stand.
- Glassdoor, Blind, 1point3acres: search summaries only, never fetched,
  never a page fact.
