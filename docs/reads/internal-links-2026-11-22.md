# Internal links read, 2026-11-22: who links to what, before and after

**Source:** the built site (`public/`) at `origin/main` 644e900, counted by
`scripts/seo/inbound-links.mjs`.

**Method.** For each of the 429 sitemap URLs, the count is the number of
distinct sitemap pages that link to it in their own content:
- `<nav>`, `<footer>` and the footer link strips (`.flk`) are removed first.
  They repeat on every page.
- `/app/` links are ignored, because `/app/` is noindex.
- Query strings and hashes are dropped.

**No production data was read.** This is the link graph only. Crawl and
impression baselines are left for the laptop (see the ledger claim
"related links for thinly linked pages").

## What the count found

- **Questions pages are fine.** All 313 `/questions/` pages are linked from 7
  or more pages; the minimum is 7.
- **Two true orphans:**
  - `/weekly/`: 0 content links. Only the homepage footer links it.
  - `/datalemur-karsilastirma/`: 0 links of any kind.
- **Thin:**
  - `/stratascratch-alternatives/` had 2 linking pages.
  - Six more had at most 2 linking pages once `/questions/` back-links are
    set aside: `/learn-sql-for-beginners/` (1), `/after-bootcamp/`,
    `/after-the-sql-course/`, `/sql-for-the-ai-era/`,
    `/blog/validate-ai-generated-sql/` and `/challenges/string-functions/`
    (2 each).
- **Linked mostly from each other:**
  - The four newer fintech company pages (PayPal, Coinbase, Chime from #134,
    Monzo): 21 linking pages each, but only 5 outside `/questions/`, and
    those 5 are each other plus Bloomberg and the hub.
  - `/sql-rollup-interview-questions/` (#127): 3 linking pages outside
    `/questions/`.
- **Trap pages are not thin.** The five SQL trap pages had 6–8 linking pages
  outside `/questions/` and were left alone.
- **Legal pages are footer-only by design.** `/privacy/`, `/terms/` and
  `/refund/` are linked from every footer and from no content. The new test
  exempts them and pins them to the homepage footer instead.

## What changed

`scripts/build-related-links.mjs` (in `npm run build`, before
`build-static-pages.js`) writes one short "related" line before the footer of
16 source pages. Each line carries contextual links in the page's own
language. Its registry is the one place to edit.

| source page | gains links to |
|---|---|
| `/challenges/` | `/weekly/`, `/learn-sql-for-beginners/`, `/sql-rollup-interview-questions/` |
| `/sql-quiz/` | `/weekly/`, `/learn-sql-for-beginners/` |
| `/blog/` | `/weekly/`, `/sql-for-the-ai-era/`, `/blog/validate-ai-generated-sql/` |
| `/blog/sql-for-ai-company-interviews/` | `/blog/validate-ai-generated-sql/`, `/sql-for-the-ai-era/` |
| `/sql-tutorial/` | `/learn-sql-for-beginners/`, `/challenges/string-functions/`, `/after-the-sql-course/` |
| `/learn-sql-for-beginners/` | `/after-the-sql-course/`, `/after-bootcamp/` |
| `/best-sql-practice-sites/` | `/datalemur-alternatives/`, `/stratascratch-alternatives/`, `/after-the-sql-course/`, `/after-bootcamp/` |
| `/vs-stratascratch/` | `/stratascratch-alternatives/` |
| `/vs-datalemur/` | `/datalemur-alternatives/`, `/datalemur-karsilastirma/` |
| `/sql-cheat-sheet/` | `/challenges/string-functions/`, `/sql-rollup-interview-questions/` |
| `/blog/sql-group-by-tutorial/` | `/sql-rollup-interview-questions/` |
| `/fraud-analytics-sql/` | PayPal, Coinbase, Chime, Monzo company pages |
| `/blog/sql-for-fraud-analytics/` | `/fraud-analytics-sql/` + the same four company pages |
| `/turkce-sql-ogren/`, `/blog/sql-join-nedir/`, `/blog/sql-cte-nedir/` | `/datalemur-karsilastirma/` |

## Before → after

"all" counts every distinct linking page; "non-q" leaves out `/questions/`
pages. The table covers every page that had fewer than 3 non-q links, every
page that changed, and the pages the brief named.

| page | before (all) | before (non-q) | after (all) | after (non-q) |
|---|---|---|---|---|
| `/datalemur-karsilastirma/` | 0 | 0 | 4 | 4 |
| `/privacy/` | 0 | 0 | 0 | 0 |
| `/refund/` | 0 | 0 | 0 | 0 |
| `/terms/` | 0 | 0 | 0 | 0 |
| `/weekly/` | 0 | 0 | 3 | 3 |
| `/learn-sql-for-beginners/` | 13 | 1 | 16 | 4 |
| `/after-bootcamp/` | 3 | 2 | 5 | 4 |
| `/after-the-sql-course/` | 3 | 2 | 6 | 5 |
| `/blog/validate-ai-generated-sql/` | 3 | 2 | 4 | 3 |
| `/challenges/string-functions/` | 19 | 2 | 21 | 4 |
| `/sql-for-the-ai-era/` | 3 | 2 | 5 | 4 |
| `/stratascratch-alternatives/` | 2 | 2 | 4 | 4 |
| `/datalemur-alternatives/` | 3 | 3 | 5 | 5 |
| `/sql-rollup-interview-questions/` | 8 | 3 | 11 | 6 |
| `/chime-sql-interview/` | 21 | 5 | 23 | 7 |
| `/coinbase-sql-interview/` | 21 | 5 | 23 | 7 |
| `/monzo-sql-interview/` | 21 | 5 | 23 | 7 |
| `/paypal-sql-interview/` | 21 | 5 | 23 | 7 |
| `/sql-between-timestamp/` | 10 | 6 | 10 | 6 |
| `/sql-average-of-averages/` | 11 | 7 | 11 | 7 |
| `/sql-left-join-where-filter/` | 11 | 7 | 11 | 7 |
| `/sql-not-in-null/` | 11 | 7 | 11 | 7 |
| `/sql-join-fan-out/` | 12 | 8 | 12 | 8 |

**After the change, no page outside `/questions/` has fewer than 3 distinct
linking pages**, except the three legal pages, which are linked from the
footer only.

## Guard

`tests/internal-links.test.js` fails when a sitemap page outside
`/questions/` (legal pages excepted) has fewer than 2 distinct linking pages.
It also checks two things about the related-links registry:
- every target is a sitemap page;
- every source page carries exactly the block the registry renders.

Breaks it caught:
- **Orphan check:** dropping the four `/datalemur-karsilastirma/` links from
  the registry and rebuilding fails with "/datalemur-karsilastirma/ — 0
  linking pages".
- **Drift check:** hand-editing the `/sql-quiz/` block fails "every source
  page carries exactly the block the registry renders".

## Not concluded

- **Nothing about crawling or ranking.** The links exist; whether Bing and
  Google act on them is the 2026-12-20 read.
- **No anchor-text effect.** None is measurable at this size.
