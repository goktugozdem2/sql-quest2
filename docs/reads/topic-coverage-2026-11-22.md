# Topic coverage and the ranked backlog (C6, 2026-11-22)

C6's first read. What the bank covers per SQL topic, measured from reference
solutions, and the topic backlog re-ranked on fetched evidence. Cloud session:
no production data, so the GSC demand read is left to the laptop.

## How it was measured

`node scripts/topic-coverage.mjs` (this PR). It parses every reference
solution the app bundles and counts **statements and clauses, never words**:
comments and string literals are stripped, solutions are split on top-level
semicolons, and each statement is classified by its leading keyword (a `WITH`
prefix is looked through). A literal `'DELETE'` or a column named `updated_at`
counts for nothing. `tests/topic-coverage.test.js` pins the parser and runs
the CLI.

**The bank is 312 challenges, not 421.** The brief's 421 added
`challenges.js` and `sector-challenges.js` together. The app and every page
generator use their union by id (`loadQuestionBank`), which is 312 on main
today. Mocks, daily cores and 30-day questions are counted as side columns.

## Coverage on main, 2026-11-22

Bank: 312 challenges. Also scanned: 47 mock questions, 30 daily cores, 150
30-day questions.

| Topic | Bank | Mocks | Daily | 30-day | Bank ids |
|---|---:|---:|---:|---:|---|
| CREATE TABLE, constraints | **0** | 0 | 0 | 0 | none |
| CREATE INDEX, query plans | **0** | 0 | 0 | 0 | none |
| Views | **0** | 0 | 0 | 0 | none |
| UPSERT (ON CONFLICT / REPLACE / MERGE) | **0** | 0 | 0 | 0 | none |
| Transactions (BEGIN / COMMIT / ROLLBACK) | **0** | 0 | 0 | 0 | none |
| INSERT … VALUES | 1 | 0 | 0 | 0 | 180 |
| INSERT … SELECT | **0** | 0 | 0 | 0 | none |
| UPDATE | 3 | 0 | 0 | 0 | 181, 184, 185 |
| DELETE | 2 | 0 | 0 | 0 | 182, 183 |
| EXCEPT | **0** | 0 | 0 | 0 | none |
| INTERSECT | 1 | 0 | 0 | 0 | 49 |
| JSON functions | **0** | 0 | 0 | 0 | none |
| UNION / UNION ALL | 7 | 0 | 1 | 6 | 27, 44, 81, 219, 239, 259, 274 |
| Recursive CTEs | 3 | 0 | 0 | 0 | 44, 81, 274 |
| Pivot (CASE inside an aggregate) | 22 | 4 | 1 | 3 | 7, 8, 14, 15, 25, 37, 39, 51, 63, 68, 82, 113, … |

Zero in the bank: CREATE TABLE and constraints; CREATE INDEX and query plans;
views; UPSERT; transactions; INSERT … SELECT; EXCEPT; JSON functions.

The brief's grep table differed in four rows, all explained by counting
statements: INSERT … SELECT was 1 (it is challenge 180, an `INSERT … VALUES`),
UNION 11 → 7, recursive CTEs 4 → 3, pivot 28 → 22.

### A finding about the six DML challenges that do exist (180-185)

They carry `mutates: true`. The app reloads the dataset into the **shared**
`db` before each side and grades the **trailing SELECT's output**, not the
table. Two consequences:

- Any query that prints the expected rows passes, with no DML at all (182
  "Delete the Empty Accounts" is passed by a `SELECT` of the right count).
- Nothing stops `DROP TABLE` or any other statement on the shared database.
  The reload on the next run repairs it, but the speed-run mode offers these
  challenges too and runs their solutions on the shared `db`.

The state-graded type in the companion PR (`feat/state-graded-dml`) closes
both for new challenges. **Next step after it merges: move 180-185 onto
`grade: 'state'`** (their trailing SELECT becomes the `check`), and drop the
`mutates` path.

## The backlog, re-ranked

Ranked on four things from the brief: interview relevance (fetched sources
below), search interest, our gap (the table), and distance to the money door.

| Rank | Topic | Gap | Why here |
|---|---|---|---|
| 1 | **DML**: INSERT … SELECT, UPDATE from a subquery, delete duplicates keeping one, UPSERT | INSERT … SELECT 0, UPSERT 0; UPDATE/DELETE exist but are not state-graded | Data-engineer lists test it by name; the "delete duplicates" and "update from another table" questions are among the most-viewed SQL questions on Stack Overflow (lifetime views below). Engine ships in the companion PR. |
| 2 | **DDL and constraints**: CREATE TABLE, PK / FK / UNIQUE / CHECK / NOT NULL, ALTER TABLE, schema design | 0 | Schema-design question lists name all five constraints. Same engine, graded on rejected rows. |
| 3 | **Set operations**: EXCEPT / INTERSECT / UNION vs UNION ALL | EXCEPT 0, INTERSECT 1 | Cheapest to ship: SELECT-graded, no engine work. Analyst-shaped, unlike 4 and 5. |
| 4 | **Indexes and query plans**: CREATE INDEX, `EXPLAIN QUERY PLAN` | 0 | Interview-relevant and searched, but hard to grade honestly in a 40-row dataset (a plan is graded, not speed). Needs a grading design first. Links to `/sql-query-optimizer/`. |
| 5 | **Transactions and ACID** | 0 | Mostly concept. The gate refuses BEGIN/COMMIT today; a challenge would allow them and grade the state after a ROLLBACK. Data-engineer-shaped. |
| 6 | Views | 0 | Small topic; folds into DDL. |
| 7 | Gaps and islands, sessionization | not measured by the script (no keyword marks it) | High interview value; needs a semantic tag, not a parser. |
| 8 | SCD type 2, soft deletes, snapshot tables | 0 | Data-engineer-shaped; builds on 1 and 2. |
| 9 | JSON in SQL | 0 | SQLite `json_extract` works in sql.js; dialect notes matter more than usual. |
| 10 | Normalization 1NF-3NF | n/a | Concept; pairs with 2. |
| 11 | Percentiles and median, date spines, sampling, data-quality checks | not measured | Several exist under other tags; measure with tags before writing. |

Moved since the seed: set operations from 6 to 3 (zero EXCEPT, and the only
topic in the top five that needs no new engine), views from 5 to 6 (folds
into DDL).

## Evidence for the top five

All pages below were fetched and read on 2026-11-22. No frequency claims:
where a page claims "most asked" or names companies, it is quoted as what the
page says, never as our fact. Stack Overflow figures come from the official
Stack Exchange API and are **lifetime** view counts; almost all of these
questions were asked 2008-2013, so they show durable interest, not a recent
trend.

How it was fetched: the session's own web fetch could not reach the sites
(DNS failures), so the pages were read through the founder's Apify web-fetch
connector (about 15 calls, billed to that account). Dataquest, DataCamp,
Interview Query and Indeed pages did not load and are not used.

### 1. DML

- A data-engineer guide on dev.to covers INSERT INTO … SELECT, UPDATE … FROM
  JOIN, DELETE vs TRUNCATE vs DROP, UPSERT / MERGE / ON CONFLICT and
  transactions as interview material. Page undated in the fetched text.
  <https://dev.to/gowthampotureddi/insert-update-delete-in-sql-safe-crud-patterns-for-data-engineers-41h8>
- Exponent's data-engineering list, republished by WashU (2024-11-19): Q22
  asks to "update the payment status … using data from the daily_pay table";
  Q6 finds duplicate postings with GROUP BY … HAVING COUNT(*) > 1.
  <https://mckelveyconnect.washu.edu/blog/2024/11/19/top-25-sql-data-engineering-interview-questions/>
- Stack Overflow (lifetime views, asked date):
  "SQL Update from One Table to Another Based on a ID Match" 2,780,446
  (2008-10-22, q 224732); "Delete duplicate rows keeping the first row"
  1,557,820 (2013-08-22, q 18390574); "Insert, on duplicate update in
  PostgreSQL?" 774,058 (2009-07-10, q 1109061); "Delete all Duplicate Rows
  except for One in MySQL?" 554,767 (2011-01-13, q 4685173); "How to UPSERT
  … in PostgreSQL?" 432,722 (2013-06-24, q 17267417).
- Who ranks: tryexponent, dataquest, datacamp, interviewquery, databasestar,
  simplilearn, dev.to.

### 2. DDL and constraints

- Redgate, "Top 23 Database Schema Design Interview Questions" (2023-01-10):
  Q8, how to make sure only valid data is inserted; its answer names "NOT
  NULL, UNIQUE, PRIMARY KEY/FOREIGN KEY, and CHECK constraints".
  <https://www.red-gate.com/blog/database-schema-design-interview-questions/>
- The Exponent list (2024-11-19) tells senior data engineers to brush up on
  "normalization, indexing, and schema design principles". URL above.
- Stack Overflow: "How can I temporarily disable a foreign key constraint in
  MySQL?" 1,037,463 (2013-03-19, q 15501673); "Can a foreign key be NULL
  and/or duplicate?" 688,628 (2011-09-27, q 7573590); "ALTER TABLE to add a
  composite primary key" 426,014 (2012-01-14, q 8859353).
- Who ranks: Indeed, tryexponent, educative, adaface, toptal, interviewquery,
  red-gate, datacamp.

### 3. Set operations

- PracHub, "UNION vs UNION ALL" (2026-08-12): the page says its traps are
  "drawn from real interview questions" and names companies, including an
  EXCEPT / NOT IN example it attributes to Gemini. That is PracHub's claim,
  not ours; no company is named on any SQL Quest page from it.
  <https://prachub.com/resources/union-vs-union-all>
- The Exponent list (2024-11-19) lists "Combining results from multiple
  queries using UNION, INTERSECT, and EXCEPT" among intermediate topics.
- Stack Overflow: "What is the difference between UNION and UNION ALL?"
  1,633,512 (2008-09-08, q 49925); "How to order by with union in SQL?"
  636,811 (2011-01-17, q 4715820).
- Who ranks: dev.to, prachub, datadriven.io, datacamp, sqlbolt, Udemy blog,
  tutorialspoint.

### 4. Indexes and query plans

- PracHub, "SQL Query Optimization Interview Questions" (2026-08-22) opens
  on a slow query "in front of you during an interview" and covers EXPLAIN /
  EXPLAIN ANALYZE and when a sequential scan beats an index.
  <https://prachub.com/resources/sql-query-optimization-interview-questions-explain-plans-joins-and-indexes>
- The Exponent list (2024-11-19): Q26 a partial index with CREATE INDEX, Q27
  "analyze the query execution" with EXPLAIN ANALYZE, Q28 a rewrite that adds
  indexes.
- Stack Overflow: "What is an index in SQL?" 817,336 (2010-06-02, q 2955459);
  "What columns generally make good indexes?" 135,325 (2008-09-20, q 107132).
- Who ranks: dbvis, prachub, techinterview.org, designgurus, adaface, toptal,
  codesignal.

### 5. Transactions and ACID

- PracHub, transactions and isolation guide (2026-08-22): "Interviewers
  rarely care whether you can recite four isolation levels in order"; it
  asks to trace two concurrent transactions instead.
  <https://prachub.com/resources/database-transactions-and-isolation-levels-interview-questions-with-real-anomalies>
- The Exponent list (2024-11-19) names "using transactions, including COMMIT,
  ROLLBACK, and SAVEPOINT" for senior roles.
- Stack Overflow: "How to find current transaction level?" 187,319
  (2009-06-24, q 1038113).
- Who ranks: adaface, simplilearn, hackr.io, prachub, interviewkickstart.

### Limits of this evidence

- Only the Exponent list is aimed at data engineers by name; none of the
  fetched sources confirms DDL, indexes or transactions for **analyst**
  screens. Topics 2, 4 and 5 serve the data-engineer buyer; our payers so far
  are analyst-shaped (CLAUDE.md, Capital One). That is why set operations
  outrank indexes and transactions here.
- No search-volume number. The laptop's GSC read (queries containing
  insert / update / delete / upsert / constraint / except / index) is the
  demand check this read could not do.

## What C6 does next

1. Companion PR `feat/state-graded-dml`: the engine plus 325-329.
2. After it merges: move 180-185 onto `grade: 'state'`.
3. Next topic run: the DML research read
   (`docs/reads/topic-dml-<date>.md`) with its doors and question set, so
   `topic_funnel` can be read for it.
