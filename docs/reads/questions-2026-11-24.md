# Question mining, run 3 — 2026-11-24 (C7)

What people ask about SQL, clustered into question shapes and mapped to what
the site already says. Links are evidence only. No usernames, no quotes, and
nothing here goes on a page. Earlier runs: `docs/reads/questions-2026-11-22.md`
(#178) and `docs/reads/questions-2026-11-23.md` (#219); their clusters are
not re-counted here.

## Sources, as tried this run

| Source | Route | Result |
|---|---|---|
| Reddit, Stack Overflow | search restricted to them | not tried again: refused on runs 1 and 2, and the orchestrator decision says a refusal is final |
| Stack Exchange API | `api.stackexchange.com/2.3/questions?tagged=sql&site=stackoverflow&sort=creation` | refused by the egress proxy (HTTP 403). Final for the run. |
| HN Algolia API | `hn.algolia.com/api/v1/search_by_date?query=sql` | refused by the egress proxy (HTTP 403). Final for the run. |
| Quora, HN, sqlite.org forum | search restricted to those three domains, 10 queries | **works**; mostly undated or older threads (one sqlite.org thread is dated 2025-12) |
| GSC queries, `tutor_events`, `feedback` | laptop only | not read; this is a cloud run |

So, as in runs 1 and 2: **no 7-day counts.** A cluster's number is the
distinct threads found in this run's reachable sources. It shows the shape
exists and recurs, not how often it was asked this week. Recent counts come
only from the laptop's GSC and `tutor_events` reads.

## Clusters

Status: **covered-well** (nothing to do), **answered** (was covered but not
answered, answered in this PR), **missing topic** (→ C6), **practice gap**
(→ B3/C6), **company** (→ C5).

| # | Question shape | Threads | Where we cover it | Status |
|---|---|---|---|---|
| 1 | "Column must appear in the GROUP BY clause": a GROUP BY that runs in SQLite and fails in PostgreSQL | 9 | one quiz explanation on `/blog/sql-group-by-tutorial/` (open PR #278 touches that page) and one FAQ sentence on the window tutorial; Debug challenges 332 and 339 train the bug | **answered**: `/sql-debugging-practice/#group-by-sqlite-postgresql` + FAQ |
| 2 | SUM doubled / duplicate rows after a JOIN, and "can't I just add DISTINCT?" | 7 | `/sql-join-fan-out/` explains the fan-out and two fixes, but not why DISTINCT fails | **answered**: a fourth "Why" line on `/sql-join-fan-out/`, with checked numbers |
| 3 | How do I check SQL an AI assistant wrote? | 6 | `/blog/validate-ai-generated-sql/` (seven checks) and the `/sql-debugging-practice/` hub, which it links | covered-well |
| 4 | Days between two dates (`julianday`) | 5 | `/sql-cheat-sheet/` date section; the window tutorial's streak section | covered-well |
| 5 | First / earliest row per group (other columns of the MIN row) | 5 | `/blog/window-functions-tutorial/#latest-per-group` (run 1; the same query with ASC) | covered-well |
| 6 | UPSERT: insert, or update if the row exists (`ON CONFLICT`, `INSERT OR REPLACE`, `MERGE`) | 6 | no page; 0 challenges (`docs/reads/topic-coverage-2026-11-22.md`) | **missing topic** → C6 |
| 7 | Median and percentiles (`percentile_cont`, SQLite's `median()` behind a compile flag) | 5 | `percentile_cont` named on `/sql-interview-questions-data-analyst/`; no worked page | **missing topic** → C6 |
| 8 | Monthly retention cohort query | 2 | named on company pages; no worked page | below the bar of 3; watch next run |
| 9 | Company-specific SQL questions | 0 in reachable sources | — | nothing for C5 |
| 10 | Which practice site | 0 this run | — | nothing for C2 |

## Evidence (links only)

1. GROUP BY, SQLite vs PostgreSQL:
   https://sqlite.org/forum/forumpost/e627915758 ·
   https://sqlite.org/forum/forumpost/4c8a673560d7999a ·
   https://www.sqlite.org/forum/info/fd4c43acc96142f1 ·
   https://sqlite.org/forum/info/67687658225ac5ec9f28f25a63ed783f7001feb338def95e8071443fa7c2ebd1 ·
   https://sqlite.org/forum/info/36fc25b567f64d403b26422f519c3b08d0a771d4f181119aea2b38249783437c ·
   https://sqlite.org/forum/info/6774859468d21ec2a80eb11526113dfab6db72e8185c03f209488d400e287b8d ·
   https://sqlite.org/forum/info/ce633ca554836aceb4eabacebf8e7e3f9e52e603a90ffe851fd88260792c26a5 ·
   https://news.ycombinator.com/item?id=35566540 ·
   https://www.quora.com/How-do-you-handle-aggregation-without-using-subqueries-SQL-PostgreSQL-development
2. SUM inflated after a JOIN / DISTINCT as the fix:
   https://www.quora.com/Having-applied-SUM-and-JOIN-2-columns-with-different-tables-why-does-it-duplicate-results-SQL-server-join-query-SUM-DBA ·
   https://news.ycombinator.com/item?id=37962370 ·
   https://www.quora.com/Why-am-I-getting-multiple-results-in-an-SQL-database-when-I-execute-my-command ·
   https://www.quora.com/How-do-you-join-3-tables-in-SQL-with-no-duplicates ·
   https://www.quora.com/How-do-you-get-duplicate-values-when-joining-the-same-table-twice-in-T-SQL ·
   https://www.quora.com/Is-there-a-way-I-can-calculate-the-sum-of-duplicated-rows-in-SQL ·
   https://news.ycombinator.com/item?id=39065320
3. Checking AI-written SQL:
   https://news.ycombinator.com/item?id=44009848 ·
   https://news.ycombinator.com/item?id=36697160 ·
   https://news.ycombinator.com/item?id=34521149 ·
   https://news.ycombinator.com/item?id=40627558 ·
   https://news.ycombinator.com/item?id=40302698 ·
   https://news.ycombinator.com/item?id=48875342
4. Days between dates:
   https://sqlite.org/forum/info/35ebfdd53eeb35c1 ·
   https://sqlite.org/forum/info/42c0821c7a7850ff ·
   https://sqlite.org/forum/info/d0bd1261788ff3e45409b0b866045154a082a088d7a71a5161b556f25221145f ·
   https://sqlite.org/forum/info/95b67d0511030f64 ·
   https://sqlite.org/forum/info/986c46aefcb0c331ff5a0596d495afb38134fad112b6dc0b26f0200acf26ab19
5. First row per group:
   https://www.quora.com/How-do-you-grab-the-value-of-another-column-after-getting-the-minimum-number-in-a-different-column-in-SQL ·
   https://sqlite.org/forum/info/4c11f0e8d5b49eb602e67096627bd05303b63022db092922f72c8374978c3c9f ·
   https://sqlite.org/forum/forumpost/d11ad15a07 ·
   https://sqlite.org/forum/forumpost/306b220e75f091a8 ·
   https://news.ycombinator.com/item?id=42873733
6. UPSERT:
   https://news.ycombinator.com/item?id=37641628 ·
   https://news.ycombinator.com/item?id=24377458 ·
   https://sqlite.org/forum/info/b9ac2692cb5f6799373836015144a83f4e2fd31817b14c8f11ae3879059b83dd ·
   https://sqlite.org/forum/info/98d4fb9ced866287 ·
   https://sqlite.org/forum/forumpost/3c0634eb13 ·
   https://www3.sqlite.org/cgi/forum/info/9c88abe93ab8c05d26b247960618a94a3d6ac18c018f61e013ef52f99bd3774e
7. Median and percentiles:
   https://sqlite.org/forum/info/5ea8049d5c23405261d9ead3d8009dc5f087a63459c3a31b4f4472b00b8d3992 ·
   https://sqlite.org/forum/forumpost/463890920c ·
   https://sqlite.org/forum/forumpost/74f22b6905b908e2 ·
   https://sqlite.org/forum/info/9ec3fe43c18e5525 ·
   https://www.quora.com/Is-there-a-standard-formula-for-calculating-the-median-of-a-large-data-set
8. Retention cohorts:
   https://news.ycombinator.com/item?id=5245571 ·
   https://www.quora.com/What-is-the-best-method-for-calculating-30-day-retention-for-mobile-apps

## What this PR answered (existing pages, every query run in a test)

- `/sql-debugging-practice/#group-by-sqlite-postgresql` (through
  `scripts/build-debug-pages.mjs`): revenue per category with a bare
  `product` column on the ecommerce `orders` table. SQLite returns two rows,
  the whole category's revenue (4,984.68 for Electronics, 23 products) next
  to one product name; PostgreSQL refuses it. Fix 1 groups by the product
  (top 3: Laptop Pro 1,299.99, Standing Desk 599.99, Graphics Card 549.99);
  fix 2 aggregates it (`COUNT(DISTINCT product)`). FAQ entry, in the schema.
  The example is on its own data, not a Debug item's, so the hub still shows
  no item's broken query. The PostgreSQL error was not run here (no
  PostgreSQL in the cloud session); the sentence states what the rule is.
- `/sql-join-fan-out/` (through `src/data/sql-patterns.js`): why DISTINCT
  does not repair a fan-out. `COUNT(DISTINCT chargeback_id)` gives the right
  10, `SUM(DISTINCT amount)` gives 78,600.19 against the true 78,986.43,
  because 262 high-risk transactions carry only 259 distinct amounts. Three
  facts, run by `tests/sql-patterns.test.js`.

Pinned in `tests/question-answers-2026-11-24.test.js`. Deliberate breaks:
78,600.19 → 78,600.20 on the page failed "state every checked fact" in
`sql-patterns.test.js` and the DISTINCT test by name; fix 1's
`GROUP BY category, product … DESC` → `GROUP BY product … ASC` failed "every
fix returns the table printed under it".

## Routed

- **C6:** UPSERT (cluster 6) and median/percentiles (cluster 7). BACKLOG
  section "Routed by C7 — 2026-11-24".
- **Watch:** retention cohorts (2 threads); route it if run 4 finds a third.
- **C5, C2:** nothing this run.
- **Laptop:** the GSC question-query and `tutor_events` read for these
  shapes, and the `content_funnel` 28-day baseline for both pages.
