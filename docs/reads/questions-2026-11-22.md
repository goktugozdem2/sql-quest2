# Question mining, run 1 — 2026-11-22 (C7)

What people ask about SQL, clustered into question shapes, mapped to what
the site already says. Links are evidence only. No usernames and no quotes,
and nothing here goes on a page.

## Read this first: what the sources allowed

The brief asks for the last 30 days of Reddit and Stack Overflow. From a
cloud session, neither can be read:

| Source | Route tried | Result |
|---|---|---|
| Reddit (all nine subs) | `site:reddit.com/r/…` search | the search tool returns no reddit.com results; restricting it to reddit.com is refused ("not accessible to our user agent") |
| Reddit | `reddit.com/r/…/top.json` via fetch and via the sandbox | refused by both the fetch tool and the sandbox proxy |
| Stack Overflow | `site:stackoverflow.com` search | restricting to stackoverflow.com is refused, same message |
| Stack Exchange API | `api.stackexchange.com/2.3/questions?tagged=…` | refused by both the fetch tool and the sandbox proxy |
| HN Algolia API | `hn.algolia.com/api/v1/search…` | DNS does not resolve in this environment |
| HN, Quora, sqlite.org forum | search restricted to those domains | **works**, but results are mostly older threads (2016–2024), undated in the snippet |

Reddit and Stack Overflow block Anthropic's agents at their end. Cloud runs
do not work around that. So **this read has no 30-day counts.** The number
next to a cluster is the count of distinct threads found in this run's
reachable sources. It shows the question exists and recurs, not how often it
was asked last month. The laptop-side sources (GSC question queries,
`tutor_events`, `feedback`) are where recent counts will come from; the
amended brief says so.

## Clusters

Status values: **covered-well** (nothing to do), **answered** (was
covered-not-answered, answered in this PR), **missing topic** (→ C6),
**practice gap** (→ B3/C6), **company** (→ C5).

| # | Question shape | Threads found | Where we cover it | Status |
|---|---|---|---|---|
| 1 | Nth-highest salary, and what ties do to it | 9 | ranking blog named DENSE_RANK in one bullet, no worked query | **answered**: `/blog/row-number-vs-rank-vs-dense-rank/#nth` + FAQ |
| 2 | Latest / most recent row per group | 5 | window tutorial covered top-N by value only; challenge 162 exists | **answered**: `/blog/window-functions-tutorial/#latest-per-group` + FAQ |
| 3 | Consecutive days / streaks (gaps and islands) | 4 | window tutorial named the idea in one line; challenge 68 exists | **answered**: `#streaks` + FAQ |
| 4 | Compare a row with the previous one / month-over-month change | 3 | window tutorial had a day-over-day sketch on an invented table | **answered**: `#month-over-month` + FAQ |
| 5 | Delete duplicates but keep one, incl. tables with no unique key | 10 | `/sql-find-duplicates/` answers the id-based case | covered-well; **answered** the no-id case (FAQ, rowid) |
| 6 | UPDATE using values from another table (UPDATE with JOIN) | 7 | challenges 180–185 practise DML; no page explains it | **missing topic** → C6 (DML, C6 backlog #1) |
| 7 | Running total that resets per group | 5 | `/blog/sql-running-total/` (PARTITION BY section + reset-each-month FAQ) | covered-well |
| 8 | LEFT JOIN turns into an INNER JOIN after a WHERE filter | 3 | `/sql-left-join-where-filter/`, `/blog/left-join-vs-inner-join/` | covered-well |
| 9 | WHERE vs HAVING | 3 | `/blog/where-vs-having/` | covered-well |
| 10 | Customers with zero orders (anti-join) | 2 | `/blog/sql-anti-join/` | covered-well |
| 11 | "What SQL questions get asked for a data analyst role" lists | 7 | `/sql-interview-questions-data-analyst/`, `/sql-interview-prep/` | covered-well |
| 12 | Which practice site / resource | 3 | `/best-sql-practice-sites/`, comparison pages | covered-well (evidence for C2) |
| 13 | Company-specific SQL interview questions | 0 in reachable sources | — | nothing for C5 this run |

## Evidence (links only)

1. Nth-highest with ties:
   https://www.quora.com/What-is-the-query-to-show-the-third-highest-salary-in-a-specific-department-say-HR-by-SQL ·
   https://sqltipsandtricks.quora.com/How-to-get-Nth-maximum-salary-in-SQL ·
   https://www.quora.com/How-do-I-find-the-third-maximum-salary-from-a-salary-table-in-MySQL ·
   https://www.quora.com/How-should-I-find-the-2nd-or-nth-highest-salary-using-cursor-in-PL-SQL-block ·
   https://www.quora.com/Can-you-help-me-write-a-query-to-fetch-5th-highest-salary-of-an-employee-without-using-with-clause ·
   https://www.quora.com/How-do-I-find-department-wise-the-highest-salary-and-its-details-in-a-SQL-query ·
   https://www.quora.com/How-can-I-write-SQL-query-to-get-the-second-highest-salary-among-all-Employees ·
   https://www.quora.com/What-is-a-query-for-getting-a-max-salary-from-all-department-wise-in-SQL ·
   https://www.quora.com/What-are-some-examples-of-hard-tricky-SQL-interview-questions
2. Latest row per group:
   https://sqlite.org/forum/info/7d7b5e84c1bcd91f ·
   https://sqlite.org/forum/info/97a0abac992a28279c05865e4e708e707fe5308bd87ff15387312e13970aac25 ·
   https://www.quora.com/How-can-I-give-priority-when-using-group-by-in-SQLite ·
   https://www.quora.com/How-do-you-select-the-most-recent-date-on-a-joined-table-SQL-server-TSQL-window-functions-and-development ·
   https://www.quora.com/How-do-you-return-the-most-recent-record-in-SQL
3. Consecutive days:
   https://www.quora.com/How-do-you-find-consecutive-days-for-login-MySQL-SQL-date-subquery-MySQL-5-7-development ·
   https://venomtechsspace.quora.com/Hi-Folks-Below-are-the-SQL-query-interview-questions-1-Consider-a-table-named-Orders-with-the-following-columns ·
   https://sqlite.org/forum/forumpost/f54891ee82 ·
   https://www.quora.com/What-are-some-SQL-interview-questions-for-a-business-analyst
4. Previous row / month-over-month:
   https://www.quora.com/How-do-you-compare-two-consecutive-rows-values-in-SQL-SQL-server-development ·
   https://www.quora.com/What-are-some-SQL-interview-questions-for-a-business-analyst ·
   https://news.ycombinator.com/item?id=16333838
5. Delete duplicates, keep one:
   https://www.quora.com/What-is-the-best-way-to-delete-duplicate-rows-in-MySql-except-one ·
   https://www.quora.com/How-we-can-delete-duplicate-rows-in-a-table-with-no-unique-key-in-SQL-server ·
   https://www.quora.com/How-can-I-delete-duplicate-rows-in-MySQL ·
   https://www.quora.com/How-do-I-delete-duplicate-rows-using-ROWID-in-SQL ·
   https://www.quora.com/How-can-I-delete-duplicate-records-in-MySQL ·
   https://www.quora.com/How-do-I-remove-duplicates-in-a-PL-SQL-query ·
   https://techspacecraft.quora.com/How-to-delete-duplicate-records-from-a-table-using-SQL ·
   https://www.quora.com/How-do-I-delete-all-rows-having-one-duplicate-item-in-MySQL-using-PHP ·
   https://www.quora.com/What-is-Query-to-delete-duplicate-data-in-a-table ·
   https://sqlite.org/forum/info/dd0fa74feb1decbc931646e8bb6009a31691a07a64fe7d63e7bbf3e8dc5f3d58
6. UPDATE with JOIN:
   https://www.quora.com/Learning-programming-How-can-I-do-an-UPDATE-statement-with-JOIN-in-SQL ·
   https://sqlite.org/forum/forumpost/fbad1e84e1 ·
   https://www.quora.com/How-do-you-update-a-table-using-JOIN-in-SQL-Server ·
   https://sqlite.org/forum/forumpost/3b54ae09d3 ·
   https://www.quora.com/Can-we-update-two-tables-in-a-single-query-in-SQL ·
   https://sqlite.org/forum/info/05ac55f65a2e88e1 ·
   https://sqlite.org/forum/forumpost/04f6b63a9e
7. Running total per group:
   https://news.ycombinator.com/item?id=16333838 ·
   https://sqlite.org/forum/forumpost/bce5fce391 ·
   https://sqlite.org/forum/forumpost/74f22b6905b908e2 ·
   https://www.quora.com/How-do-you-do-a-cumulative-sum-in-SQL ·
   https://www.quora.com/How-do-I-use-the-SQL-partition-by-clause-to-change-how-the-window-function-calculates-the-result
8. LEFT JOIN + WHERE:
   https://sqlite.org/forum/forumpost/c6e7c72cf8 ·
   https://sqlite.org/forum/forumpost/10e275dcb3 ·
   https://communities.sas.com/t5/SAS-Programming/Left-Join-not-Correct-When-using-Where-Clause/m-p/596978
9. WHERE vs HAVING:
   https://news.ycombinator.com/item?id=21621531 ·
   https://www.quora.com/What-are-some-good-fair-SQL-technical-interview-questions ·
   https://www.quora.com/What-are-the-top-5-common-questions-for-an-SQL-interview
10. Zero orders:
   https://www.quora.com/What-are-some-SQL-interview-questions-for-a-business-analyst ·
   https://news.ycombinator.com/item?id=5779406
11. Analyst question lists:
   https://www.quora.com/What-are-some-SQL-questions-topics-asked-in-interviews ·
   https://www.quora.com/What-basic-SQL-interview-questions-should-I-focus-on-I-have-a-technical-interview-in-Hyderabad-coming-up ·
   https://www.quora.com/What-is-your-favorite-SQL-interview-question ·
   https://www.quora.com/How-should-I-prep-for-my-data-analyst-coding-interview ·
   https://news.ycombinator.com/item?id=23053981 ·
   https://news.ycombinator.com/item?id=22332067 ·
   https://www.quora.com/Can-someone-share-the-SQL-interview-questions-for-SQL-development-role
12. Practice sites:
   https://news.ycombinator.com/item?id=23054158 ·
   https://news.ycombinator.com/item?id=23966752 ·
   https://news.ycombinator.com/item?id=19149792

## What this PR answered (all on existing pages, every query run in a test)

- `/blog/row-number-vs-rank-vs-dense-rank/`: new section "Nth-highest
  salary when salaries tie" (ROW_NUMBER = 6 returns a second 98,000;
  DENSE_RANK = 6 returns the 95,000 pair; the scalar-subquery OFFSET form
  returns NULL past the end) and its FAQ entry.
- `/blog/window-functions-tutorial/`: new section "Three questions, worked
  on real data" (latest order per customer, with the SQLite bare-column
  dialect note; month-over-month change; login streaks, with the
  DISTINCT and month-boundary traps), three FAQ entries, and a visible FAQ
  that now equals the JSON-LD.
- `/sql-find-duplicates/`: FAQ "What if the table has no id column to
  keep?" (rowid in SQLite, ctid in PostgreSQL, ROW_NUMBER in SQL Server).

## Routed

- **C6:** UPDATE with JOIN (cluster 6) → a BACKLOG line; it is C6's DML
  item #1, and challenges 180–185 already practise it, so the gap is the
  guide.
- **B3/C6 practice gap:** a consecutive-calendar-day streak on `logins`.
  Challenge 68 is a ≤7-day-gap streak on orders, a different shape.
  → a BACKLOG line.
- **C5:** no company questions surfaced in reachable sources.
- **C2:** cluster 12 is evidence for the comparison pages, which already
  exist.
