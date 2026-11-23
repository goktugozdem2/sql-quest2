# Content QA — 2026-11-22 (Q1, run 1, cloud session)

Brief: `docs/agent/fleet/Q1-content-qa.md` (checks 1–14). Founder's order,
2026-11-22: "Kalite kontrol ve test için ayrı bir adım da ekle."

## How it was checked

- **Engine.** sql.js 1.8.0, the version `src/app.html` loads from the CDN, with
  the app's own `loadDataset` rule (a column's type comes from the first row's
  value) and `challengeTablePlan`. Data came from every file in
  `scripts/data-files.js`, the bundle the app ships, so sector and company tags
  are included.
- **Grading.** Every alternative and wrong answer went through
  `resultsMatch` (`src/utils/grade.js`), the comparator the challenge page,
  the speed run, interview mode and the daily all call. Expected rows and
  columns come from the reference solution, as in the app.
- **Blind solves.** Each solve was written from the description and tables
  before reading `solution`.
- **Layout.** A4's harness (`scripts/smoke/uiux-audit.mjs`, U1–U12) ran at
  phone-s 375 and laptop 1366, dark and light. Merged pages were checked on a
  local `npm run build`, and open PRs on their own committed `public/`.
  Majors were compared against main on the same pages.
- **Not reachable from the cloud session.** prachub.com, interviewquery.com,
  dev.mysql.com, www.sqlite.org and docs.snowflake.com all fail DNS, so the
  check-9 re-fetch goes to the laptop. sqlquest.app and production data were
  out of reach too, so check 14 is listed under FOUNDER/laptop.
- **Build.** `npm run build` on main left the tree clean (deterministic).

## Part 1 — open content PRs

| PR | lane | verdict | note |
|---|---|---|---|
| #161 Revolut guide (blog) | C5 | **QA PASS** | All 3 traps' numbers match on sql.js; "question 1" = #275 = the app's first Revolut card |
| #160 `/sql-exercises/` copy | C1 | **QA PASS** | 312 = 99/129/84, core 203 = 60/84/59, sector 109; all recomputed |
| #162 claim guards + copy | C1 | **QA PASS** | Edits only remove unsourced "X asks/tests" claims |
| #163 related links + orphan guard | C1 | **QA PASS** | 16 targets all exist; majors 273 → 272 |
| #164 JSON-LD gate | C1 | not content | test-only, no page change; A1's lane |
| #147, #145, #149, #150, #153 | A4 | not content | layout; A4/A1 |
| #155, #156, #157 | E2/B5/E1 | not content | app flags and mail |

Each QA comment lists checks 8–13 with evidence. There were no challenge PRs,
so checks 1–7 were n/a.

## Part 2 — merged today without QA

### #132 — challenges 320–324: PASS, with one defect fixed and one policy conflict

Blind solve, 2 alternatives and 3–4 wrong answers per card, all through
`resultsMatch`:

| id | blind | alternatives (graded correct) | wrong answers (graded wrong) |
|---|---|---|---|
| 320 | ✓ window MAX | ✓ join to grouped subquery · ✓ correlated subquery | ✓ company max · ✓ grouped (5 rows) · ✓ gap sign · ✓ salary asc |
| 321 | ✓ ROW_NUMBER | ✓ correlated COUNT · ✓ RANK in a CTE | ✓ global numbering · ✓ DESC · ✓ COUNT per customer |
| 322 | ✓ strftime | ✓ substr · ✓ subquery | ✓ GROUP BY date (48) · ✓ year as INTEGER · ✓ %m · ✓ DESC |
| 323 | ✓ `%w IN ('0','6')` | ✓ CAST + date bounds · ✓ OR form | ✓ 5,6 · ✓ 6,7 · ✓ int vs text (0 rows) · ✓ Saturday only |
| 324 | ✓ COUNT(*)/COUNT(age) | ✓ CASE sums · ✓ boolean sums | ✓ COUNT(age) as total · ✓ `= NULL` · ✓ WHERE age NOT NULL |

- **4. Determinism ✓.**
  - Each solution orders at the top level.
  - 320 has an HR tie at 58,000, settled by `name`.
  - 321 has no same-day orders for any customer.
  - No float traps.
- **Data that cannot tell right from wrong** (not grading defects; the answer
  is truly the same on this data):
  - 321 numbered by `order_id`: order ids run in date order.
  - 324 `age > 0`: no age is 0.
- **5. Difficulty ✗ (policy conflict, not a content bug).**
  - 320 and 321 are labelled Easy, and both need a window function, or a
    correlated subquery or a join to a grouped subquery, which is no easier.
  - The brief's check 5 calls that a FAIL. B3 wrote them on purpose as the
    Easy on-ramp for the 3-Easy Window cell.
  - Decided 2026-11-23 (#222): both stay Easy. Check 5 now allows one Easy shape, a single window function over one table.
- **6. Prompt rules ✓.**
  - No method is named in either language; `tests/challenges-320-324.test.js`
    checks this.
  - Hints describe the method without writing the query.
  - EN and TR match.
- **Examples.** Every stated number re-run: 320 (115000 / 80000),
  321 (6 / 3), 322 (2016·1, 2020·12), 324 (216 / 174 / 42).
- **Defect D1: 323's example was false.**
  - It read "37 logins between 2024-03-01 and 2024-03-31", in EN and TR.
  - The table ends 2024-04-01 21:37. The answer is unaffected, because
    1 April 2024 was a Monday.
  - **Fixed in #167**, with a test proven by a break.

### #134 — `/chime-sql-interview/` and its 16-card set: PASS, with pre-existing defects in the cards

- Spot-checked 6 of 16, mixing levels: **289, 275, 174** (Easy), **291, 172**
  (Medium) and **50** (Hard). Each had a blind solve, 2 alternatives and 3
  wrong answers through `resultsMatch`: 6/6 blind ✓, 12/12 alternatives ✓,
  16/18 wrong answers refused.
- The two that passed are data coincidences, not loose grading:
  - 275 with `status='completed'`: all 2,165 transactions are completed.
  - 291 INNER JOIN to disputes: the top 20 by disputes all have one, and the
    prompt asks for the LEFT JOIN in words.
- **Check 6 ✗, pre-existing (D3).** These are 2026-07/09 on-ramp and
  card-analytics cards; #134 only tagged them:
  - The hints of 174, 172, 289 and 291 contain the query, or most of it.
  - The prompts of 172 (LAG), 275 (strftime), 289 (half-open window) and 291
    (CTE, LEFT JOIN, COALESCE) name the method.
  - This is the bank's on-ramp style. It conflicts with the brief's rule and
    with the card rule on company pages. BACKLOG line below.
- **8 ✓.** The page shows no query.
- **9 ✓ (re-fetch blocked).**
  - Every format row cites a dated PracHub report.
  - `accessed: '22 Nov 2026'`.
  - Research is in `docs/reads/company-research-2026-11-22.md`.
  - No frequency claim, and "What is not settled" is stated.
  - The re-fetch of two sources failed DNS, so it moves to the laptop.
- **10 ✓.** The page count of 34 is bound by site-counts.
- **11 ✓.** Question 1 is #174 ("JOIN with a Filter", Easy), the first card in
  the app's `companySetOrder`. The page CTA `?company=Chime` opens it, and it
  is solvable from the page.
- **12 ✓.** 0 critical. Majors are the shared footer and card type, owned by
  #145 and #147.
- **13 ✓.** Linked from 6 built pages (hub, fintech ring); the CTA goes to
  question 1.

### #127 — `/sql-rollup-interview-questions/`: PASS, with one sourcing gap

- **8 ✓.** `tests/sql-rollup.test.js` runs every SQLite form and pins its
  rows.
- **9 ✗, minor (D4).**
  - The engine-support table names engines and syntax: PostgreSQL, SQL
    Server, Oracle, Snowflake (ROLLUP/CUBE/GROUPING SETS); MySQL WITH ROLLUP;
    SQLite none.
  - It has no dated read in `docs/reads/`. The commit says PostgreSQL 18 was
    checked by hand, and the other four engines have no source.
  - Vendor docs are unreachable from the cloud, so this goes to the laptop.
  - No frequency or company claims.
- **10 ✓.** No bank count, and no free-tier wording.
- **11 ✓.**
  - Question 1 is #169, share of payroll.
  - The page never shows `OVER ()`, but its own idea (a total from a separate
    aggregate) solves it: `salary*100.0/(SELECT SUM(salary) FROM employees)`
    is graded correct.
  - The integer-division variant is refused, as the card intends.
- **12 ✓.** 0 critical.
- **13 ✓.**
  - Out: the CTA to 169.
  - In: `/sql-exercises/`, `/challenges/aggregation/`, `/challenges/cte/` and
    five question pages.

### #142 — answer-first summaries and comparison facts: PASS

- **9 ✓.** StrataScratch is $24 / $139 / $289 on all five pages, matching
  `docs/reads/monetization-competitors-2026-11-22.md`.
  - "SQL Quest $40 cheaper annually, StrataScratch $5 cheaper monthly" is
    right: $99 vs $139, and $29 vs $24.
  - The $19 / $97.30 / $202.30 left on `/sql-practice-comparison/` and
    `/best-sql-practice-sites/` sit only inside HTML source comments, so a
    visitor never sees them.
  - Neither "verified" nor "unlimited" appears.
  - Open (D5, pre-existing, stated in #142's own audit): the LeetCode,
    HackerRank, SQLZoo and Interview Query facts rest on the 2026-09-13 read,
    70 days old. The re-fetch is blocked from the cloud, so it goes to the
    laptop.
- **10 ✓.** The free tier is in `freeTierSentence`'s words on every page.
- **12 ✓.** 0 critical on all six pages. The majors are the shared footer and
  `#compare` cells, A4's.
- **13 ✓.** Summaries carry a tracked practise link (test-bound).

## Defects in merged content

| id | where | defect | action |
|---|---|---|---|
| D1 | #132, challenge 323 | example states 2024-03-01..03-31; data ends 2024-04-01 | **fixed, #167** |
| D2 | #132, challenges 320, 321 | Easy needs a window function (check 5) vs B3's on-ramp intent | decided 2026-11-23 (#222): both stay Easy; check 5 allows a single-window on-ramp |
| D3 | #134 set (pre-existing cards) | hints hold the query; prompts name the method (172, 174, 275, 289, 291, 50) | BACKLOG: B3 lane |
| D4 | #127 | engine-support facts without a dated read | BACKLOG + laptop fetch |
| D5 | #142 (pre-existing) | LeetCode/HackerRank/SQLZoo/IQ facts on a 70-day read | laptop fetch (already in #142's audit) |

No wrong answer was graded right, and no right answer graded wrong, in any
merged card that was checked.

## FOUNDER / laptop

1. **Check 14 for every page above** (#127, #134, #142, #161 after merge):
   - the live page returns 200 and its canonical is right;
   - the question-1 link opens the right challenge (Chime → 174, Revolut →
     275, rollup → 169);
   - `uiux-daily` is clean.
2. **Re-fetch the Chime sources** (the three PracHub reports) and the
   interviewquery Revolut guide. Confirm the quoted lines still stand.
3. **Fetch the vendor docs** for the rollup engine table (MySQL group-by
   modifiers, SQLite SELECT grammar, Snowflake, SQL Server, Oracle). Write
   `docs/reads/rollup-engines-<date>.md` (D4).
4. **Re-read LeetCode, HackerRank, SQLZoo and Interview Query** (D5).
