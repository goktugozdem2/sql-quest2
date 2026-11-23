# Question mining, run 2 — 2026-11-23 (C7)

What people ask about SQL, clustered into question shapes and mapped to what
the site already says. Links are evidence only. No usernames, no quotes, and
nothing here goes on a page. Run 1: `docs/reads/questions-2026-11-22.md`
(merged in #178); its clusters are not re-counted here.

## Sources, as tried this run

| Source | Route | Result |
|---|---|---|
| Reddit | search with `site:reddit.com/r/SQL` | no reddit.com results; the operator is ignored and general pages come back. Final for the run. |
| Stack Exchange API | `api.stackexchange.com/2.3/questions?tagged=sql…` from the sandbox | connection refused (curl `000`). Final for the run. |
| HN Algolia API | `hn.algolia.com/api/v1/search_by_date?query=sql` | connection refused (curl `000`). Final for the run. |
| Quora, HN, sqlite.org forum | search restricted to those three domains | **works**; mostly undated or older threads |
| GSC queries, `tutor_events`, `feedback` | laptop only | not read; this is a cloud run |

So, as in run 1: **no 7-day counts.** A cluster's number is the distinct
threads found in this run's reachable sources. It shows the shape exists and
recurs, not how often it was asked this week. Recent counts come only from
the laptop's GSC and `tutor_events` reads.

## Clusters

Status: **covered-well** (nothing to do), **answered** (was covered but
not answered, answered in this PR), **missing topic** (→ C6), **practice
gap** (→ B3/C6), **company** (→ C5).

| # | Question shape | Threads | Where we cover it | Status |
|---|---|---|---|---|
| 1 | Percentage of the total per group (and why it comes out 0 or truncated) | 4 | group-by tutorial had conditional aggregation, no share-of-total; challenges 169 (Easy), 61, 13 practise it | **answered**: `/blog/sql-group-by-tutorial/#percent-of-total` + FAQ |
| 2 | Show days with zero rows / fill missing dates in a report | 6 | recursive-CTE post named it in one sentence, no query | **answered**: `/blog/recursive-cte-explained/#missing-days` + FAQ; **practice gap** → B3/C6 |
| 3 | SQLite vs PostgreSQL date functions (`date_trunc`, `strftime`, month arithmetic) | 4 | one sentence on `/sql-cheat-sheet/`; the app's dialect table | **missing topic** → C6 |
| 4 | `COUNT(*)` vs `COUNT(column)` | 6 | `/blog/null-handling-mistakes/` Mistake 3; group-by tutorial's aggregates table | covered-well |
| 5 | `AVG` skips NULLs; how to count them as zero | 4 | `/blog/null-handling-mistakes/` (AVG bullets + checklist: `AVG(COALESCE(col, 0))`) | covered-well |
| 6 | Pivot rows into columns (`SUM(CASE WHEN …)`) | 5 | `/blog/sql-case-when-tutorial/` "Pivoting rows into columns" | covered-well |
| 7 | `NOT IN` returns nothing when the list holds a NULL | 4 | `/sql-not-in-null/`, null-handling Mistake 2 | covered-well |
| 8 | `BETWEEN` on timestamps loses the last day | 4 | `/sql-between-timestamp/` | covered-well |
| 9 | Self join: employee and manager name, keeping the top boss | 4 | `/blog/sql-joins-explained/#self` | covered-well |
| 10 | Company-specific SQL questions | 0 in reachable sources | — | nothing for C5 |
| 11 | Which practice site | 0 this run | — | nothing for C2 |

## Evidence (links only)

1. Percentage of total:
   https://sqlite.org/forum/info/fbd5761a48c80f65 ·
   https://sqlite.org/forum/forumpost/2c9c9544c7 ·
   https://sqlite.org/forum/info/1b9a26381312feeae95d53f83556715d5850d096dba0c219e5a1e8b7d11cf046 ·
   https://www.quora.com/With-SQL-how-do-you-calculate-what-percentage-of-rows-have-a-certain-value-SQL-MySQL-development
2. Days with zero rows / date spine:
   https://news.ycombinator.com/item?id=17124888 ·
   https://sqlite.org/forum/info/5a1f13cfba245cc0dd263eeaea4ee2c6bf55b0300daed290fce10303381e46c3 ·
   https://sqlite.org/forum/info/c925c2793f15acb6 ·
   https://sqlite.org/forum/info/06f5e9b85a7cf6068b1d6f9d9174f73d46e474a16a527c0fd6eeb14b60f65ae0 ·
   https://sqlite.org/forum/forumpost/90cfb4a1ec ·
   https://www3.sqlite.org/cgi/forum/info/e710904ede0e8381e16eb48b47e684cc5a134204143dde63eed4ea78e98102d6
3. SQLite vs PostgreSQL dates:
   https://sqlite.org/forum/forumpost/232d1abb5d ·
   https://news.ycombinator.com/item?id=6012556 ·
   https://news.ycombinator.com/item?id=14517777 ·
   https://sqlite.org/forum/info/986c46aefcb0c331ff5a0596d495afb38134fad112b6dc0b26f0200acf26ab19
4. COUNT(*) vs COUNT(col):
   https://www.quora.com/How-do-you-count-null-values-in-COUNT-function ·
   https://www.quora.com/What-is-the-difference-between-count-and-count-column_name ·
   https://www.quora.com/Can-you-explain-the-difference-between-count-and-count-1-in-MySQL ·
   https://www.quora.com/What-does-count-*-in-SQL-counts-number-of-rows-or-columns ·
   https://www.quora.com/What-is-the-difference-between-count-0-count-1-and-count-in-MySQL-SQL ·
   https://news.ycombinator.com/item?id=26141003
5. AVG and NULL:
   https://news.ycombinator.com/item?id=22494217 ·
   https://news.ycombinator.com/item?id=42645110 ·
   https://news.ycombinator.com/item?id=29551464 ·
   https://sqlite.org/forum/forumpost/7a66fb47f7
6. Pivot:
   https://www.quora.com/How-do-I-separate-a-GROUP-BY-result-based-on-another-column-in-SQL ·
   https://news.ycombinator.com/item?id=16310117 ·
   https://news.ycombinator.com/item?id=39353502 ·
   https://sqlite.org/forum/info/64a3c03589b650a6405947c262733aea6dc96d1fb0f93fea8d66982cae031987 ·
   https://sqlite.org/forum/forumpost/96701f9f63ea1a35
7. NOT IN with NULL:
   https://sqlite.org/forum/forumpost/445e365bfb ·
   https://news.ycombinator.com/item?id=32578725 ·
   https://news.ycombinator.com/item?id=22223909 ·
   https://sqlite.org/forum/forumpost/6a3ec138e9
8. BETWEEN on timestamps:
   https://news.ycombinator.com/item?id=20872114 ·
   https://sqlite.org/forum/info/a186e2b5e7102527 ·
   https://sqlite.org/forum/info/6f8e6dbc94d0aded ·
   https://sqlite.org/forum/info/72261467a85d2417a387f7a2372ef8712046bb7f0d5c3910bb8afa3fb9853bc9
9. Self join:
   https://www.quora.com/How-do-I-display-the-manager-and-employee-name-including-king-who-has-no-manager-from-employee-table-in-SQL-Developer ·
   https://www.quora.com/There-is-another-join-type-in-which-a-table-is-joined-with-itself-especially-when-the-table-has-a-foreign-key-which-references-its-own-primary-key-Is-it-true ·
   https://news.ycombinator.com/item?id=29687134 ·
   https://www.quora.com/What-are-all-types-of-join-in-PL-SQL-with-examples

## What this PR answered (existing pages, every query run in a test)

- `/blog/sql-group-by-tutorial/#percent-of-total`: share of orders by
  status with `100.0 * COUNT(*) / SUM(COUNT(*)) OVER ()` (92.5 / 5.0 / 2.5);
  the integer-division trap shown on the same data (92, 5, 2, which add up
  to 99; and 0 on every row without the 100); the revenue and
  `PARTITION BY` variants; the scalar-subquery form and when it diverges.
  FAQ entry, visible as the section heading. Practice link: challenge 169.
- `/blog/recursive-cte-explained/#missing-days`: logins per day for March
  5–14 with a recursive date list on the left of a LEFT JOIN (March 8 and 9
  return 0); the `COUNT(*)` trap (it reports 1 on an empty day); the
  PostgreSQL `generate_series` spelling. FAQ entry, visible as the heading.

Both are pinned in `tests/question-answers-2026-11-23.test.js`. Deliberate
breaks: `COUNT(l.login_id)` → `COUNT(*)` on the page failed the date-spine
table test and the COUNT-trap test by name; `100.0` → `100` on the page failed
the percent-of-total table test.

## Routed

- **C6:** SQLite vs PostgreSQL dates (cluster 3). BACKLOG section
  "Routed by C7 — 2026-11-23" and the top of
  `docs/reads/topic-coverage-2026-11-22.md`.
- **B3/C6 practice gap:** a date-spine challenge (cluster 2). No challenge
  asks for zero days; the bank's recursive challenges walk hierarchies only.
- **C5, C2:** nothing this run.
- **Laptop:** the GSC question-query and `tutor_events` read for these
  shapes, and the ledger baseline for both pages.
