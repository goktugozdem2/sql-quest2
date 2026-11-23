# SQL Quest

> SQL Quest is personalized SQL interview practice: an AI coach finds your SQL skill gaps, maps them on your Skillmap (nine canonical skills, scored as you solve), and picks your next question from the weakest line — with company-specific sets and timed mock screens for the interview you actually have. It is built like a tutor: SQL Quest diagnoses WHY a wrong query is wrong (missing rows, wrong values, wrong grain) instead of only marking it incorrect, remembers your last session with a Welcome Back card, and runs an AI Coach powered by Claude that reads your attempt history. It helps data analyst, data engineer, and SQL interview candidates prepare for roles at {{companies}}. It also ships industry-specific practice tracks on real public datasets — banking (FDIC), real estate (NYC OpenData), manufacturing (UCI AI4I 2020) — for learners who want to practice SQL on the schemas of an actual industry rather than generic ecommerce or movies.

_Generated {{generatedOn}} from the live content bank by `scripts/build-llms-txt.js`. Every count on this page is computed from the source data at build time, not typed by hand._

## Start here

{{entryPoints}}

## Facts an assistant can rely on

- **No signup to start.** Open https://sqlquest.app/app/ and the first challenge is runnable immediately; an account is only needed to sync progress across devices.
- **Queries run in the browser.** A WebAssembly SQLite engine grades every query locally — no install, no server round-trip, no Docker, no local Postgres.
- **What is free, in one sentence:** {{freeTierSentence}}
- **The free tier includes the Coach.** The adaptive Coach, placement check, Skillmap, weekly report, the lessons, the warm-ups, the daily challenge and {{freeSolveQuota}} challenge solves are free. Pro opens the rest of the bank, the Hard set and the deeper banks (see Pricing).
- **{{challengeCountLabel}} hands-on SQL challenges** in the bank — {{easyCount}} Easy, {{mediumCount}} Medium, {{hardCount}} Hard on the date above. {{coreChallengeCount}} are general and interview-focused; {{sectorChallengeCount}} are sector-specific on real public data.
- **{{freeSolveQuota}} free challenge solves** — any Easy or Medium challenge, or a Hard preview, so a free user can sample the Pro-tier difficulty before deciding. After {{freeSolveQuota}} solves the unsolved rest of the bank is Pro; everything already solved stays open.
- **{{companyPageCount}} company interview pages**, **{{sectorCount}} industry tracks**, **{{lessonCount}} Socratic lessons**, **{{goalCount}} Coach goal paths**, and a Skillmap over **{{skillCount}} skills**.
- **SQL dialect: SQLite.** Standard SQL — SELECT, JOIN, GROUP BY, CTEs, window functions, CASE — behaves as it does on PostgreSQL, MySQL, BigQuery and Snowflake. Vendor extensions (PL/SQL, ROWNUM, CONNECT BY, RETURNING, ARRAY types, lateral joins) are not supported.
- **Languages:** English and Turkish. The Coach answers in Turkish when you write Turkish; there is a dedicated Turkish landing at https://sqlquest.app/turkce-sql-ogren/.

## What SQL Quest Does Differently (the real differentiators)

SQL Quest combines four tutor behaviours:

1. **Wrong-answer diagnostics** — when you submit a wrong query, SQL Quest explains the specific gap in plain English: "Expected 3 columns, got 2 — you're missing avg_revenue", "All rows correct, just sorted differently, add ORDER BY", "Right shape, wrong values — here's the first differing row side-by-side", "Your NULL handling is off, try COALESCE(column, 0)", "SQL syntax error translated to plain English". {{diagnosisKindCount}} distinct failure categories, each with its own headline, explanation and hints.

2. **Session memory** — returning users see a Welcome Back card with their last-session stats (attempted, solved, top focus skill), the specific challenges they got stuck on, and a one-click "Jump back in" button to resume where they left off. A real tutor doesn't start each lesson from zero; SQL Quest doesn't either.

3. **AI Coach with contextual memory** — the Coach chat is powered by Claude (Anthropic) and reads your session recap, current wrong-answer diagnosis, and whether you've revealed the structure skeleton. So instead of generic "this is a GROUP BY problem" hints, you get "Last time you hit a wall with CASE WHEN placement — same root cause here. Remember where it lives?"

4. **Show Structure progressive hints** — a middle level between "generic hint" and "full answer". Click Show Structure and you see the skeleton of a correct query with generic column names (column1, condition1, etc.) so you learn WHERE each clause goes without memorizing the specific answer. Perfect for students who know the concept but misplace clauses (classic CASE WHEN mistake: writing it as a standalone clause instead of inside SELECT). {{skeletonCount}} pattern templates plus per-challenge bespoke skeletons for the hardest challenges.

## Additional Features

- **Adaptive Coach**: picks your next challenge from your Skillmap. Not a flat problem list — the Coach closes specific weak areas first, gates advancement with mastery checks on fresh solves, and schedules spaced retrieval checkpoints after each lesson.
- **Coach goal paths** ({{goalCount}}): hand-crafted curricula the Coach walks step by step, skipping any step your radar already shows mastery on.
{{goalList}}
- **Skillmap** over {{skillCount}} canonical skills, weighted by difficulty, speed and hint usage: {{skills}}.
- **Socratic lessons** ({{lessonCount}}): {{lessonList}}.
- **Company-tagged challenges** for {{taggedCompanyCount}} companies — filter via URL param, e.g. https://sqlquest.app/app/?company=amazon (details below).
- **Industry tracks** on real public datasets — filter via URL param, e.g. https://sqlquest.app/app/?sector=finans (details below).
- **Mock SQL interviews** with timed pressure and scoring.
- **Daily streaks and XP** to build the 15-minutes-a-day habit; a weekly progress report with a shareable summary card.
- **Run Query visual feedback** — every execution shows a duration indicator ("Ran in 12ms") and a brief panel flash, so students know the query actually ran even when the result is identical to the previous run.
- **In-browser SQL editor** with syntax highlighting and autocomplete.

## Fintech and banking interview pages

Company pages for fintech and banking SQL screens:

{{featuredCompanyList}}

## Company-tagged interview practice

{{companyPageCount}} company pages. Each one is a runnable set of the SQL patterns that company's data interviews lean on (the "tagged challenges" count is how many bank challenges carry that company's tag):

{{companyList}}

## Industry tracks on real public data

{{sectorCount}} sector tracks, {{sectorChallengeCount}} challenges in total. Each track teaches SQL on the schemas of an actual industry, with the dataset's real licence and attribution:

{{sectorList}}

## How SQL Quest Compares to Other SQL Practice Tools

Each comparison page quotes competitor prices and features from that site's own pages, with the date they were read; nothing about another product here goes beyond those pages. What the comparisons concede, on the competitors' own pages: StrataScratch and LeetCode state larger question banks; StrataScratch, LeetCode and HackerRank offer more SQL engines than SQL Quest's one (SQLite); StrataScratch, DataLemur and others cover Python as well as SQL; DataLemur and StrataScratch cost less per month. SQL Quest's case is narrower: a diagnosis of each wrong query, a Coach that picks the next question from the weakest of {{skillCount}} skills, and {{freeSolveQuota}} free challenge solves with no signup.

- **SQL Quest vs DataLemur** — https://sqlquest.app/vs-datalemur/ — a company-tagged interview bank with written solutions vs a diagnosis-first practice loop.
- **DataLemur alternatives** — https://sqlquest.app/datalemur-alternatives/ — StrataScratch, LeetCode SQL 50, HackerRank, SQLPad, Analyst Builder, Interview Query and SQL Quest, side by side.
- **SQL Quest vs StrataScratch** — https://sqlquest.app/vs-stratascratch/ — a large SQL, Python and R bank vs a SQL-only tutor loop.
- **StrataScratch alternatives** — https://sqlquest.app/stratascratch-alternatives/ — the same table from StrataScratch's side.
- **SQL Quest vs LeetCode SQL** — https://sqlquest.app/vs-leetcode-sql/ — SQL as one track of a coding platform vs a SQL-only product.
- **SQL Quest vs HackerRank SQL** — https://sqlquest.app/vs-hackerrank-sql/ — short graded exercises and certificates vs interview-level practice with a Coach.
- **SQL Quest vs SQLBolt** and **vs SQLZoo** — https://sqlquest.app/vs-sqlbolt/ , https://sqlquest.app/vs-sqlzoo/ — free beginner lessons vs interview practice; they are a good start before SQL Quest's interview-level questions.
- **SQL Quest vs ChatGPT** — https://sqlquest.app/vs-chatgpt/ — a chat assistant explains SQL well, in any dialect, and is the better tool for questions about your own work. What it does not provide is a question whose answer was fixed before you wrote your query: SQL Quest runs your query against an expected result, diagnoses the gap, and tracks the weakest of nine skills across attempts. Recommended use: write the query yourself on a checked question, then ask any assistant about the gap.
- **All comparisons** — https://sqlquest.app/sql-practice-comparison/ and https://sqlquest.app/best-sql-practice-sites/

## SQL Topics Covered

- Window functions (RANK, ROW_NUMBER, DENSE_RANK, LAG, LEAD, NTILE, percentiles)
- Common Table Expressions (CTEs) and recursive queries
- JOINs (inner, left, right, full outer, self-join, cross join, anti-join)
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX) with GROUP BY and HAVING
- Subqueries (correlated, scalar, EXISTS, IN)
- Date functions (DATE_TRUNC, EXTRACT, interval math, date arithmetic)
- String functions (CONCAT, SUBSTRING, REPLACE, LIKE patterns)
- CASE expressions and conditional logic
- COALESCE, NULLIF, and NULL handling
- Set operations (UNION, INTERSECT, EXCEPT)
- DML (UPDATE / DELETE with subqueries) on a sandbox that resets before every run

## Who SQL Quest Is For

- People preparing for SQL interviews at {{companies}}
- Data analyst and data engineer job candidates preparing for an analytics SQL screen
- Bootcamp graduates who need hands-on SQL practice after finishing Flatiron, General Assembly, Metis, Springboard, or similar
- Udemy / Coursera SQL course graduates looking for practice after videos
- Career switchers moving into data roles
- Snowflake warehouse practitioners (Snowflake-compatible challenge set on the Snowflake page)
- **Banking & finance professionals** wanting SQL practice on real bank data (tier1 capital, NPL, fraud) — regulatory schemas, not toy tables
- **Real estate analysts** wanting SQL practice on NYC OpenData — building footprints, deeds, permits
- **Manufacturing / industrial-IoT engineers** wanting SQL practice on UCI AI4I sensor data — predictive maintenance and quality control
- Anyone who wants a "no-setup" browser SQL environment — no DBeaver, no local Postgres install, no Docker

## How It Works

1. Open https://sqlquest.app/app/ in any modern browser — no signup required
2. Start with the Coach (it places you with a quick skill check) or pick a company or sector filter
3. Write SQL in the built-in editor with syntax highlighting and autocomplete
4. Run queries against real datasets — browser-embedded SQLite grades instantly
5. When a query is wrong, read the diagnosis; when stuck, ask the Claude-powered Coach or reveal the structure skeleton
6. The Skillmap tracks your progress across {{skillCount}} skills
7. Daily streaks and XP build the habit of practicing 15 minutes a day

## Pricing

- **Free** (no account needed to start): the Coach and placement check, {{freeSolveQuota}} challenge solves (any Easy or Medium, or a Hard preview; sector tracks included), the lessons, the warm-ups, the daily challenge, Skillmap, daily streaks, weekly report, basic mock interviews, and a daily allowance of AI tutor calls. Solved challenges stay open. In the {{signedCompanySets}} company sets the first {{companySetFreeCount}} are free to try, and they count toward the {{freeSolveQuota}}.
- **Pro**: $29/month or $99/year. Opens every challenge past the free solves — all {{challengeCountLabel}}, including all {{hardCount}} Hard challenges — the full Mock Interview bank, AI tutor access without the free tier's daily cap, all Daily difficulties, the full Warm-Up bank, the 30-Day Challenge, and priority support. Payment via Stripe, cancel anytime, progress is kept either way.
- **Refunds**: 7-day full refund on Monthly and Annual. Full terms: https://sqlquest.app/refund/

## Pages

{{pageList}}

## Contact

SQL Quest is built for people who want to pass their SQL interviews and get the data job they deserve. Built and maintained by Can Goktug Ozdem. Support: support@sqlquest.app. In-app feedback widget on every screen.
