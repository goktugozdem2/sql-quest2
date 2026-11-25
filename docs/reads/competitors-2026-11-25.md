# Competitor and market watch — 2026-11-25 (B6, run 4)

Agent B6, cloud session. Coverage count across runs 1–3, before choosing:

| Competitor | Run 1 | Run 2 | Run 3 | Reads |
|---|---|---|---|---|
| Interview Query | table | deep (CapOne) | re-check | 3 |
| DataLemur | table | — | deep | 2 |
| HackerRank | table (partial) | — | read | 2 |
| Dataford, PracHub | table | SERP | SERP | 1 + SERP |
| **StrataScratch** | table row | not re-read | not re-read | **1** |
| **Aced (Exponent)** | table row | SERP only | SERP only | **1** |
| **LeetCode** | partial (price unreadable) | — | timeout | **1, partial** |
| letsdatascience | table row | — | — | 1 |
| Prepfully, BTI, LearnSQL | — | read | — | 1 |
| DataDriven | named | — | read | 1 |
| SQLZoo, Mode, SQLBolt, W3Schools | — | — | — | 0 |

Run 4 rotates to **StrataScratch (deep dive)**, **Aced** and **LeetCode**,
plus a search for new AI SQL-interview entrants. SQLZoo and Mode stay unread:
they are learning sites, not interview competitors, and no money query
surfaced them (§4). It re-checks DataLemur and IQ's Capital One guide, records
SERP notes on the Debug and DDL/DML queries and the Monzo, Wise and Chime
data-analyst queries, and checks progress on runs 1–3.

Docs only. No page changes here.

## How this was read

- Pages fetched through the Apify web-fetch connector on **2026-11-25,
  06:51–06:53 UTC**, public pages only, no login.
- **No 403 or 429.** One fetch returned **502 Bad Gateway at the connector**
  (StrataScratch fintech loop); it was retried once and returned 200.
  Trustpilot's StrataScratch page returned **404** (no listing, or a bot
  page; not retried). LeetCode `/subscribe/`, a timeout in run 3, rendered
  this time without `wait`.
- SERP notes: the session's WebSearch tool (US engine, not Google). Order is
  indicative, never a Google rank.
- Sentiment: search titles and summaries only. No usernames, no quotes.
  Glassdoor, Blind, 1point3acres appear only as SERP shape, never as a page
  fact.
- No per-page business numbers from our side are in this file.

---

## 1. StrataScratch (deep dive)

| Fact | Source, read 2026-11-25 |
|---|---|
| Repositioned: title "Data Science & AI Interview Prep"; H1 "Land Your Dream Data or AI Role"; "750,000+ members"; target roles Data Scientist, ML Engineer, **AI Engineer** | [stratascratch.com](https://www.stratascratch.com/), 200 |
| **Prices: Monthly $24; Yearly $139 ("$11.58/mo", "Save 52%"); Lifetime $289 one-time.** Same three numbers as run 1. JSON-LD Product offers carry the same | [platform.stratascratch.com/pricing](https://platform.stratascratch.com/pricing), 200 |
| **New since run 1: AI is credit-metered.** Free 50 credits/mo; Monthly and Yearly 1,000/mo; Lifetime 25,000 one time, "never expire". Top-up **$5 per 1,000 credits**, expires after a year. Their FAQ sizes 1,000 credits as ~400 chat turns or ~5 mock interviews | same page, FAQ |
| **Black Friday: "40% off Yearly & Lifetime", code BLACKFRIDAY2026** (no end date shown) | same page, banner |
| Free tier: **75+ coding questions** with solutions; "Debug-AI-Code Questions: Limited"; learning paths free. Premium: 1000+ coding questions (SQL, Python, R), 500+ ML/stats/system design, "60+ interview loops", AI mock interviews, notebooks | same page, comparison table |
| "Personalized Dashboard & Roadmap" and "Defense Rehearsal" marked **Coming soon** | same page |
| 5-day money-back guarantee; student and educator discount "up to 20% off" | same page |
| **Interview Loops** are now the homepage's second section: round-by-round structure per company and role, with questions per round. Anyone sees the structure; Premium unlocks every question plus AI mocks for the coding rounds | homepage; pricing FAQ |
| Loop index by company: Meta, Google, Amazon, Apple, DoorDash, Microsoft, Netflix, Uber, Lyft, Deloitte, Anthropic, OpenAI, Waymo, Anduril. By industry: Big Tech, Marketplaces, **Fintech & payments**, Social/media, E-commerce, Frontier AI, AV/robotics | [platform.stratascratch.com/interview-loops](https://platform.stratascratch.com/interview-loops), 200 |
| **Fintech & payments Data Analyst loop: "31 questions · 4 rounds · Updated November 2026"**, built on **Stripe, PayPal and Block** only. It says fintech companies "don't share a structure" and to "prepare for the domain". Round 1 is eight generic Easy SQL items (string trimming, lowest salaries); round 2 has loan and transaction questions; round 3 is fraud/risk cases and data projects; round 4 stats. **No Capital One, Revolut, Wise, Monzo or Chime loop** | […/interview-loops/fintech-and-payments/data-analyst](https://platform.stratascratch.com/interview-loops/fintech-and-payments/data-analyst), 200 (after one 502) |
| **StrataAI tutor (blog 2026-10-27):** in each coding question; reads the question, the user's code and every table schema; three modes (Explain the problem, Give me a hint, Help debug my code); "won't hand you the answer"; runs or checks the code only when asked; answers in the user's language. The post itself shows it **missing a JOIN bug when the code had not been run** | [stratascratch.com/blog/meet-strataai](https://www.stratascratch.com/blog/meet-strataai), 200 |
| Recent blog: AI-era posts (11-04, 11-13), "How AI Changed the Data Science Interview" (10-01). No SQL-interview post in the last 60 days on the homepage strip | homepage |
| A third-party listing names an **"InstantSQL"** product under StrataScratch, dated 2026-04-14. Not on any StrataScratch page read today. **Not usable** | WebSearch 2026-11-25, summary only |

**Read.** StrataScratch is moving up-market to ML and AI-engineer prep and
has adopted the same shape we sell: interview structure by company and role,
then the questions for each round, then an AI mock. Its fintech loop is three
US payments companies pooled into one generic loop whose first round is
string trimming. Nobody there serves the analyst at Capital One, Revolut,
Wise, Monzo or Chime. Its AI is now metered by credits with a paid top-up,
the first competitor to price AI use separately. Its tutor design (no full
answer, reads the editor, debug mode) is the same rule as our
`socraticLadder`; that is now table stakes, not a differentiator.

## 2. Aced (formerly Exponent)

| Fact | Source, read 2026-11-25 |
|---|---|
| Prices unchanged vs run 1: Basic $0; **Pro $12/mo (struck $79), "Save 70%"**; **Expert AI $20/mo (struck $99)**. Monthly/Annually toggle present; the static render does not say which period the shown price bills. 5-day refund | [aced.io/upgrade](https://www.aced.io/upgrade), 200 |
| New finance track link ("Looking for investment banking?") | same |
| **SQL peer mock interviews are "(Beta)"**, two sessions a day (8 AM and 6 PM PT), PostgreSQL and SQLite editor. Today's next SQL session showed **4 joined**, against 90 for product management | [aced.io/practice/sql-mock-interviews](https://www.aced.io/practice/sql-mock-interviews) (from tryexponent.com), 200 |
| "Or practice with AI immediately": a carousel of single questions with AI feedback, SQL items among PM and system design. AI feedback on peer mocks is members only, "early access" | same |
| Pramp is now Aced | same, FAQ |
| No independent review of the SQL course surfaced; only its own pages | WebSearch 2026-11-25 |

**Read.** Aced is a PM and engineering prep brand; SQL is a beta side room
with thin peer supply. Not a threat on fintech analyst queries. Its blog post
"common SQL mistakes" does rank for the debugging intent (§4).

## 3. LeetCode (Database)

| Fact | Source, read 2026-11-25 |
|---|---|
| **Premium price now readable: "$39 billed monthly", "$299 billed annually"**; the per-month figure still renders as "-/mo" | [leetcode.com/subscribe](https://leetcode.com/subscribe/), 200 |
| Black Friday: "$30 off on Annual Subscription with code THANKS2026" (title and meta) | same |
| Premium lists Ask Leet (500 extra monthly credits, up to 30 solution analyses a day), company-specific questions, **Interview Simulations** (company, timed question), debugger | same |
| SQL 50 study plan unchanged: "Crack SQL Interview in 50 Qs", basic to intermediate, "Best for 1 month of prep time" | [leetcode.com/studyplan/top-sql-50](https://leetcode.com/studyplan/top-sql-50/), 200 |

**Read.** LeetCode's billed prices are now usable as dated facts ($39 / $299).
Its SQL offer is unchanged and basic; credits-metered AI here too.

## 4. What changed since run 3 on competitors already read

| Competitor | Change since 2026-11-24 | Source |
|---|---|---|
| DataLemur | **No change**: $15 / $60 (struck $180) / $300; same three bank counts (100+ / 200+ / 250+) on one page | [datalemur.com/pricing](https://datalemur.com/pricing), 200 |
| Interview Query — Capital One DA guide | **No change**: "Updated 8 days ago (Nov 16, 2026)", 30 reports vs "Synthesized from 39" still both shown. New detail visible today in a report summary: the major challenge "was not really writing sql query but fast comprehension" | [interviewquery.com/guides/capital-one-data-analyst](https://www.interviewquery.com/guides/capital-one-data-analyst), 200 |
| Dataford | Runs a **debugging question page** `/questions/debugging` ("Query Failed Executions and Validation Checks", Medium, PostgreSQL, with an "Interviewer" chat tab; sign-up to run). A second, `/questions/sql-debugging-and-queries`, ranks. A pricing cookie names `plan_price_india: discount` (as in run 1) | [dataford.io/questions/debugging](https://dataford.io/questions/debugging), 200 |
| PracHub | Ranks for "fix the sql query interview" with a **"Debug a Hive Query"** (TikTok-tagged) page and a Shopify-tagged **"predict a query's output and find its one error"** page | WebSearch 2026-11-25 |
| letsdatascience, Prepfully, BTI, LearnSQL, DataDriven | Not re-read | — |

---

## 5. SERP notes (WebSearch, US, 2026-11-25)

`sqlquest.app` appeared in **none** of the six lists.

| Query | Leaders today | Note |
|---|---|---|
| **sql debugging practice** | Aalto University databases course chapter, MariaDB docs ×2, **Metabase "Debugging SQL query logic" ×2**, Sentry SQL answers hub, a CHI paper, DATAVERSITY, Wise Owl, SQLServerCentral, Medium, arXiv (SQL repair benchmark), DataCamp lesson, **LearnSQL blog ×2**, CodeSignal Learn, Scribd handbook, Data School "0 rows returned" | **No interview practice platform at all.** Docs, a university course and blogs. Our `/sql-debugging-practice/` (live 11-24) faces vendor docs, not competitors |
| **fix the sql query interview** | freeCodeCamp forum, **PracHub ×3** (Hive debug, Shopify output-prediction), **Dataford "correcting a sql script"**, GitHub gists ×2, a Hugging Face dataset, techTFQ, SlideShare, LearnSQL, 1point3acres (IBM OA), InterviewBit, **IQ tips ×2**, DataCamp, Scribd | Interview-framed, but held by single question pages. No hub of debug items ranks |
| debug sql query interview practice data analyst | Gist, Coursera ×3, **Aced "common SQL mistakes" ×2**, golinuxcloud, WashU, KDnuggets ×2, Aced blog ×2, **DataLemur guide**, dev.to (DataDriven), **Dataford ×2**, **IQ** | Coursera names debugging as a standard interview category; Dataford has two runnable pages |
| **ddl dml practice exercises** | **Scribd ×5**, Kudrant PDFs ×2, **w3resource DDL exercises**, Educative lesson, UCT notes, Gyansetu gitbook, Studocu, university lab pages, SlideShare | **PDFs and course notes.** No runnable, graded practice set ranks. Our DML challenges (325–329) have question pages but no hub |
| monzo data analyst sql interview | **Greenhouse job posts ×7**, **Monzo blog ×2** (analytics engineering, data science), Glassdoor ×6, job boards ×3 | Same as run 3: no prep site. Reported: BigQuery take-home on readable SQL, live SQL debugging (AE roles), Looker for the WFM analyst posting |
| wise data analyst sql interview | Glassdoor ×15, IQ "Wise Skulls" (collision), **Dataford `/interview-guides/wise/data-analyst`** | Dataford holds it alone among prep sites. Reported: "finish all three in 20 minutes", "four sql questions on a Google Doc", dbt/Airflow questions |
| chime data analyst sql interview | Glassdoor ×3, 1point3acres ×4, Aced experience, dev.to, **IQ ×4**, **PracHub ×3** (incl. a new "Chime DS interview questions guide 2026"), **Dataford DA + BI** | Crowded with guides. Window functions reported hardest; date math and aggregation |

**Pattern.** The two queries we shipped for this week are weakly held:
debugging practice is docs and blogs, DDL/DML practice is PDFs. Both are
cheap wins for a runnable, graded page. Fintech DA queries are unchanged:
Monzo has no prep site, Wise has one (Dataford, paywalled), Chime is crowded.

---

## 6. What users say (public pages and search summaries only)

- **StrataScratch**: no independent review surfaced (Trustpilot 404;
  the review search returned unrelated "scratch" brands). Praise on its own
  pages: realistic questions, SQL + Python. Run 1's complaint pattern stands
  ("aggressive paywall"). New, from its own blog: the tutor misses bugs it
  cannot see run, which is a weakness of reading-only tutors.
- **Aced**: no independent SQL review; SQL peer supply is visibly thin.
- **Candidates (Capital One, IQ synthesis)**: the bottleneck is fast
  comprehension of data, not writing SQL; prep material under-shoots the
  test. Unchanged from run 3.
- **Candidates (Wise, Monzo, Chime)**: short timed sets (three in 20
  minutes), queries written in a Google Doc without a runner, live
  debugging, readable SQL. Pattern: **speed without an editor, and reading
  someone else's SQL.**
- Repeated: paywalled solutions remain the top complaint across platforms.

---

## 7. Progress on runs 1–3 routed items (checked on `main`, 2026-11-25)

| Item | Lane | State |
|---|---|---|
| R1-2 — Wise sourced format section | C5 | **Open.** `src/wise-sql-interview.html` still has no "How the interview runs" section; Dataford is the only prep site on the query |
| R1-3 / P4 — 301 `sql-quest2.vercel.app` | C1 | **Open.** `vercel.json` redirects only `www.sqlquest.app` |
| R1-5 — Revolut cites PracHub reports | C5 | **Open.** 0 PracHub citations on the page |
| R1-6 — Monzo | C5 | **Partly.** The page now has a "How the interview runs" section |
| R1-10 / P8 — mock follow-up | backlog | Open |
| N5 / P3 — Debug hub linked from Monzo and Wise | C5 | **Open.** Neither page links `/sql-debugging-practice/` |
| P1 — Capital One page title targets "Data Analyst" | C5 | **Open.** Title still "Capital One SQL Interview (2026): 25 Questions + Mock" |
| P2 — sequential-update DML challenge | B3 | Open (no seat or reservation item in `src/data/challenges.js`) |
| P5 / P6 — `/sql-mock-interview/`, `/sql-interview-prep-plan/` | C2 | Pages live; copy changes not checked from here |
| P7 — HackerRank test-room line | C5 / C7 | Open |
| P9 — DataLemur prices | B4 | Unchanged today (§4) |

Nothing from runs 1–3 shipped since run 3, apart from the Monzo section.
The two cheapest open items (P3 links, P1 title) are each under an hour.

---

## 8. Routing table — new items only, ranked by expected money per hour

| # | Finding | Change that could bring a customer | Lane | Why this rank |
|---|---|---|---|---|
| Q1 | "fix the sql query interview" and "sql debugging practice" are held by docs, blogs and single question pages (PracHub, Dataford). No hub of runnable debug items ranks | C6 checks `/sql-debugging-practice/` for the interview framing in title or H2 ("fix the SQL query" interview questions, find the bug, graded in the browser) and links it from the Monzo and Wise pages, where candidates report debugging or reading a given query (closes P3). C1 requests indexing (laptop) | **C6** / C5 / C1 | Live feature, empty SERP, copy and links only |
| Q2 | "ddl dml practice exercises" is PDFs and Scribd. Our DML challenges (325–329) have question pages but no hub | C6 builds one generated hub (`/sql-dml-practice/` or similar) listing the state-graded INSERT/UPDATE/DELETE items, the way the Debug hub lists 331–342, with sitemap and internal links in the same commit | **C6** | Weak SERP, content already built; a generator run |
| Q3 | StrataScratch's fintech DA loop pools Stripe, PayPal and Block, opens with generic Easy items, and has no Capital One, Revolut, Wise, Monzo or Chime loop. It is the biggest incumbent now selling "your exact interview loop" | C5 makes the round-by-round shape visible above the fold on our five consumer-fintech pages ("Round 1: … what it tests · practice"), sourced as today. C2 adds one dated line to comparison pages: StrataScratch offers interview loops by company and role, including a pooled fintech DA loop (Stripe, PayPal, Block), read 2026-11-25. No disparagement | **C5** / C2 | Our fintech depth is the one edge an up-market incumbent left open |
| Q4 | Black Friday is live: StrataScratch **40% off Yearly & Lifetime** (BLACKFRIDAY2026, $139 / $289 list), LeetCode **$30 off annual** (THANKS2026, $299 list) | Dated input for B4. Whether we run a seasonal offer is a founder-held money decision; **no agent changes a price or creates a code** | **B4** | Context for a held decision, time-boxed to this week |
| Q5 | StrataScratch meters AI by credits (1,000/mo, ~5 mock interviews; top-up $5 per 1,000). LeetCode meters Ask Leet by credits too | B4 notes it beside our own Pro tutor caps (50/75/100 calls a day). C2: our pages already never say "unlimited"; keep it that way and do not claim "no credits" unless the copy is checked against the backend | **B4** / C2 | Context; prevents a false claim |
| Q6 | Wise candidates report short timed sets in a Google Doc with no runner; Capital One's bottleneck is fast comprehension | C7 adds one paragraph in our own words to the Wise or interview-prep guide: practise writing a query without running it, then check it. Sourced to Glassdoor summaries only after C5 fetches a dated report | **C7** (after C5 fetch) | Cheap copy, but needs a fetched source first |
| Q7 | Aced's SQL peer mocks are Beta with thin supply; StrataScratch and LeetCode now ship timed company simulations | No action. Recorded so C2 does not state "no competitor offers timed company mocks" (StrataScratch AI mocks per loop, LeetCode Interview Simulations, IQ AI mock) | **C2** (guard) | Prevents a false claim |

Also noted, not routed:
- "InstantSQL" (StrataScratch, per a third-party listing) is unverified; next
  run checks the vendor page.
- PrepSQL and QueryPro remain Product Hunt listings only; QueryPro's launch
  page dates it 2025-01-09, so it is not new.

## 9. Not read, and why

- **Trustpilot StrataScratch**: 404. No other review page found.
- **InstantSQL, PrepSQL, QueryPro**: search summaries only.
- **SQLZoo, Mode SQL tutorial**: not read; no money query surfaced them.
  Next run if a learning-intent query is added.
- Dataford's Wise guide and PracHub's Chime and debug pages: SERP only.
- Glassdoor, Blind, 1point3acres: search summaries only, never fetched,
  never a page fact.
