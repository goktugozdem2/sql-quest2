# SEO weekly read — 2026-09-28 (Google, from gsc_daily to 09-27)

Pipeline: GitHub Actions (`gsc-fetch.yml` daily 06:00 UTC, `gsc-weekly.yml`
Mondays), not the VPS. Data current to 2026-09-27; 415 URLs inspected 09-28.
The Bing side (the larger channel) is not in this pipeline; read it in
Webmaster Tools. The `weekly-seo-dashboard` task did not write a 09-28 file.

## Site, page slice

| Week | Impressions | Clicks | CTR | Position |
|---|---|---|---|---|
| 09-14 → 09-20 | 9,530 | 181 | 1.90% | 12.8 |
| 09-21 → 09-27 | 6,611 | 209 | 3.16% | 7.9 |

Query mix, 28 days (query×page slice): own brand 2,074 imp / 205 clicks
(9.9%); competitor brands 4,769 / 11 (0.23%); generic 3,689 / 55 (1.49%).
The impression fall is competitor-brand navigational traffic on
/vs-datalemur/ (3,372 → 2,456); generic clicks are what moved.

## Groups, 09-14 → 09-27

| Group | Pages | Imp | Clicks | Pos |
|---|---|---|---|---|
| company | 30 | 1,255 | 87 | 10.5 |
| home | 1 | 478 | 126 | 2.9 |
| comparison | 8 | 4,366 | 60 | 6.4 |
| questions | 249 with impressions (305 indexed) | 2,305 | 26 | 15.4 |
| topic | 11 | 1,723 | 27 | 13.6 |
| blog | 36 | 3,959 | 26 | 13.2 |
| trap pages (09-25) | 5 | 19 | 0 | 5.5 |

Index: 409 of 415 "Submitted and indexed". Not: /datalemur-alternatives/,
/stratascratch-alternatives/, /sql-query-explainer/, /vs-sqlbolt/
(discovered, not crawled — all have 11+ internal links), /challenges/advanced/
(unknown to Google, 88 internal links, in the sitemap),
/questions/inactive-customers-by-tier/ (crawled, not indexed).
/shopify-sql-interview/ last crawled 09-04 — the 09-25 title is not yet seen.

## Zero-click pages in reach (28 d)

/practice-sql-no-setup/ 174 imp, 0 clicks, pos 3.9 · /blog/recursive-cte-explained/
180 / 0 / 5.0 · /shopify-sql-interview/ 293 / 0 / 6.7 · /blog/window-functions-tutorial/
360 / 0 / 11.7 · /challenges/aggregation/ 1,197 / 0 / 15.7 · /blog/sql-running-total/
258 / 0 / 11.0. Head terms ("cte sql", "sql joins", "sql group by") sit at
position 40–70 — impressions, not reach.

## Bing (Webmaster Tools, read 2026-09-29 by hand)

| Week | Impressions | Clicks | CTR |
|---|---|---|---|
| 09-14 → 09-20 | 4,848 | 214 | 4.4% |
| 09-21 → 09-27 | 5,569 | 292 | 5.2% |

Bing sends more clicks than Google (292 vs 209 last week); 3 months: 34.9K
impressions, 1.3K clicks, 3.86%. Bing's top queries are the generic practice
head: "sql practice" 2.1K imp / 32 clicks (pos 7.7), "sql practice questions"
1.7K / 70 (6.5), "sql practice exercises" 911 / 77 (5.2), "sql exercises"
588 / 54 (3.7), "sql practice problems" 44 / 12 (27% CTR). That is the
/sql-exercises/ family — the page Google still ranks at 15.

## Done 2026-09-29

Request indexing (7/7 queued, no refusal): the four discovered-not-crawled
pages, /challenges/advanced/, /questions/inactive-customers-by-tier/ (already
"on Google" by then), and /shopify-sql-interview/ for the 09-25 title. Snippet
rewrites for the five zero-click pages: separate commit. The
`weekly-seo-dashboard` run of 09-28 hung at 07:12 UTC and is still marked running (the founder stops it); watch
the 10-05 run. Plan: docs/plans/seo-october-2026-09-29.md.
