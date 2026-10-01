# Bing through the API — first read (2026-10-01)

The first numbers from `bing_stats` / `bing_crawl_daily`, fetched 06:14 UTC.
Query and page rows are weekly buckets (seven days ending on the date); this
read is the four buckets 09-04 → 09-25, i.e. 08-29 → 09-25. Not a verdict on
any claim; it replaces the hand-read baseline in
docs/plans/bing-growth-2026-09-30.md where the two differ.

## What differs from the hand read

- **`/sql-exercises/` is 80% of page clicks, not 64%**: 534 of 671 in the four
  weeks (9,096 impressions, position 6). The 64% was read off the dashboard's
  top-pages table for a different window. The "under 50% by 11-15" target is
  further away than it looked.
- **Indexed count: two different numbers.** `GetCrawlStats.InIndex` says 160
  (09-18) → 173 (09-25) → 213 (09-29) → **319 (09-30)**. Site Explorer's bar
  said 211 on 09-23 and 269 on 09-29. They are not the same count; from here
  the series is the API's, and the hand reads stay as they were written.
  The jump of 106 in one day follows the two 100-URL submissions of 09-29
  and 09-30 (149 pages crawled on 09-30 against ~45 a day before).

## The door's queries (page = /sql-exercises/, four weeks)

| Query | Impressions | Clicks | CTR | Position |
|---|---|---|---|---|
| sql practice | 1,426 | 19 | 1.3% | 8.0 |
| sql practice questions | 603 | 26 | 4.3% | 5.9 |
| sql practice exercises | 276 | 37 | 13.4% | 2.8 |
| sql exercises | 207 | 23 | 11.1% | 3.0 |
| sql query practice | 137 | 2 | 1.5% | 7.9 |
| sql quest | 119 | 6 | 5.0% | 3.4 |

The same page earns 11–13% at position 3 and 1.3% at position 8. "sql
practice" alone is 1,426 impressions at 8.0: at the page's own position-3
rate that query is ~170 clicks in four weeks instead of 19. That is lever 1
of the growth plan, now with its own row to watch. The title that leads with
the phrase shipped 09-30; the first full bucket after it ends 10-09.

## Ranked in the top 10, never clicked (four weeks)

| Page | Impressions | Position | What the data says |
|---|---|---|---|
| /sql-find-duplicates/ | 473 | 7.7 | no single query ≥ 15 impressions — long tail |
| /sql-tools/ | 303 | 8.0 | 164 of them are the query "test query" — not our reader |
| /sql-practice-comparison/ | 182 | 7.2 | comparison page — left alone by the founder's rule |
| /blog/row-number-vs-rank-vs-dense-rank/ | 162 | 7.5 | |
| /blog/window-functions-tutorial/ | 156 | 6.0 | snippet rewritten 09-29, read 10-27 |
| /blog/sql-case-when-tutorial/ | 108 | 6.6 | |

And two that are clicked almost never: /blog/sql-cte-tutorial/ (744
impressions, 3 clicks, position 6.5), /blog/sql-joins-explained/ (381, 5,
6.6). Every title on this list is 76–88 characters and every description
185–212, so Bing truncates all of them — but **no title is changed on this
read**: for most of these pages the queries behind the impressions are not
known yet (the per-page query slice shows nothing above 15 impressions), and
a rewrite aimed at an unknown query is a guess. The weekly report now lists
this table every Monday; a page that stays on it for three reports with a
nameable query gets its snippet rewritten, with a claim, in one batch.

## Not a problem

- `https://www.sqlquest.app/…` rows (79 clicks on the www homepage): the www
  host answers 308 to the apex and every page's canonical is the apex. These
  are index entries Bing has not consolidated; the clicks arrive.
- `blocked_by_robots` 0 → 69 since 09-25 is the `/app/?` rule of 09-23 doing
  what it was written for. `crawl_errors` 0.

## Limits met on the first day

`GetUrlInfo` allows about ten calls a minute and refuses with a 400
"ThrottleHost"; the sitemap inspection is paced at one call every 6.5 s
(~45 minutes). Copilot citations are not in the API.
