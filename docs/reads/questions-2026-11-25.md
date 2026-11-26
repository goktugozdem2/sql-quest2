# Question mining, run 4 — 2026-11-25 (C7)

Orchestrator decision for today: no content PR (open-PR queue ~30 deep). This
run mines and routes only. Clusters go to `BACKLOG.md`; nothing on the site
changes. Window asked for: last 7 days.

## Sources, as tried this run

| Source | Route | Result |
|---|---|---|
| Reddit | WebSearch, domain filter `reddit.com` | refused by the search tool (HTTP 400, "not accessible to our user agent"). Final for the run. |
| Stack Overflow | WebSearch, domain filter `stackoverflow.com` | refused the same way (HTTP 400). Final. |
| Stack Exchange API | `api.stackexchange.com/2.3/questions?tagged=sql&site=stackoverflow&sort=creation` | no connection through the egress proxy (curl code 000). Final. |
| HN Algolia API | `hn.algolia.com/api/v1/search_by_date?query=sql&tags=story` | no connection (curl code 000). Final. |
| Quora, HN, sqlite.org forum | WebSearch restricted to those domains, 8 queries | answers, but **no thread found is from the last 7 days**. Results are undated or years old. |
| GSC queries, `tutor_events`, `feedback` | laptop only | not read; cloud run. |

**So there is no 7-day count.** Every number below is threads found in this
run's reachable sources, any date. They show a question shape exists and
recurs, not how often it was asked this week.

## Clusters

| # | Question shape | Threads | Where we cover it | Status |
|---|---|---|---|---|
| 1 | Rolling 7-day sum when some days have no rows: `ROWS BETWEEN 6 PRECEDING` counts rows, not days | 4 | `/blog/window-functions-tutorial/` FAQ and callout say "ROWS … gives you exactly 7 rows" and "use ROWS unless…". True for a gap-free daily series, wrong as a 7-*day* window on gappy data. No worked RANGE-over-`julianday` or date-spine answer on the page. | **covered but not answered (and the FAQ misleads)** → C7's next content run |
| 2 | Pivot rows to columns without PIVOT (aggregate around CASE; crosstab) | 6 | `/blog/sql-case-when-tutorial/` pivot patterns | covered-well |
| 3 | Delete duplicate rows, keep one | 9 | `/sql-find-duplicates/` (find, inspect, delete) | covered-well |
| 4 | Integer division returns 0 in a percentage; casting the result afterwards does not help | 7 | `/blog/sql-group-by-tutorial/` FAQ ("write 100.0, not 100"); `/blog/time-series-sql-hardware-interviews/` | covered-well. The "CAST after the division is too late" nuance is missing; the owning page is in open PR #278, so not routed now |
| 5 | Month-over-month % change with LAG (and months with zero rows) | 4 | `/blog/window-functions-tutorial/` FAQ | covered-well for LAG. The zero-month case is the date-spine item already in BACKLOG (C7 2026-11-23, B3 calendar spine) |
| 6 | Interview basics: WHERE vs HAVING; self-join "employee earns more than manager" | 4 | `/blog/sql-group-by-tutorial/`; self-join on 5 company pages | covered-well |
| 7 | Single vs double quotes (string literal vs identifier) | 1 | no page | below the bar of 3; watch |
| 8 | Company-specific questions | 0 | — | nothing for C5 |
| 9 | Which practice site | 0 | — | nothing for C2 |

Missing topics carried from run 3 (UPSERT, median/percentiles) are routed in
open PR #294 and are not repeated here.

## Evidence (links only)

1. Rolling window, gappy dates: https://news.ycombinator.com/item?id=23055157 · https://news.ycombinator.com/item?id=13211186 · https://sqlite.org/forum/info/e887f5998f4e12bf426f93496c1e78a31fd198355f40bf7495da7f499b63a0b5 · https://sqlite.org/forum/forumpost/d4c5405c84ad0c82
2. Pivot: https://news.ycombinator.com/item?id=16310117 · https://news.ycombinator.com/item?id=18354934 · https://sqlite.org/forum/info/64a3c03589b650a6405947c262733aea6dc96d1fb0f93fea8d66982cae031987 · https://sqlite.org/forum/forumpost/c4cc400db8736c1b · https://sqlite.org/forum/forumpost/96701f9f63ea1a35 · https://www.quora.com/Can-you-pivot-data-in-SQL-Server
3. Delete duplicates: https://www.quora.com/How-we-can-delete-duplicate-rows-in-a-table-with-no-unique-key-in-SQL-server · https://www.quora.com/What-is-the-best-way-to-delete-duplicate-rows-in-MySql-except-one · https://www.quora.com/How-do-I-delete-duplicate-rows-using-ROWID-in-SQL · https://www.quora.com/How-do-I-delete-duplicate-rows-in-MySQL-without-using-adding-new-column · https://www.quora.com/What-is-the-process-for-removing-duplicate-values-from-a-SQL-table-using-MySQL · https://www.quora.com/What-is-Query-to-delete-duplicate-data-in-a-table · https://www.quora.com/How-do-I-remove-duplicates-in-a-PL-SQL-query · https://techspacecraft.quora.com/How-to-delete-duplicate-records-from-a-table-using-SQL · https://sqlite.org/forum/info/dd0fa74feb1decbc931646e8bb6009a31691a07a64fe7d63e7bbf3e8dc5f3d58
4. Integer division: https://sqlite.org/forum/info/445e5ef53fd56c03de325df7877c5fe5e42c8b96eae382d96502289756d0fb05 · https://sqlite.org/forum/info/da322a2b651074a716b073f57917d58bdbca5ff6a3f89bb97b0db9756f4b7c7f · https://sqlite.org/forum/info/fbd5761a48c80f65 · https://sqlite.org/forum/forumpost/376345599895acbb · https://sqlite.org/forum/forumpost/6885cf9e21 · https://sqlite.org/forum/info/da49bb8c63bc83a7 · https://sqlite.org/forum/info/649eebd76e9e14bb57fc33165be00bfa7fda3812c7b37a4fa3881c664c282527
5. MoM with LAG: https://www.quora.com/How-do-I-calculate-the-month-on-month-MoM-increase-percentage · https://www.quora.com/How-do-you-compare-two-consecutive-rows-values-in-SQL-SQL-server-development · https://www.quora.com/How-do-I-compute-return-using-lag-function-in-SQL · https://sqlite.org/forum/info/5fe2dd6e33516efb2cbb52d877c6fbe5d92c2e988ce72662e34c21bc41e92a14
6. Interview basics: https://news.ycombinator.com/item?id=21621531 · https://news.ycombinator.com/item?id=5779406 · https://news.ycombinator.com/item?id=23053981 · https://www.quora.com/What-is-the-difference-between-where-and-having-in-an-SQL-query-Why-would-you-use-where-instead-of-having
7. Quotes: https://www.quora.com/What-is-the-difference-between-single-quote-and-double-quote-while-writing-a-SQL-query
