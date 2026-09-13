# SEO measurement, growth and pruning — the P4 operating rules (2026-09-13)

Founder's SEO plan, P4 items 22–25. P0–P3 shipped roughly 330 new URLs in one
day (299 question pages, 2 topic pages, 7 company pages, 5 tool pages, 2
alternatives pages, the readiness test). A programmatic batch that size is
only an asset if it is read weekly and cut where it does not earn. These
rules are written **before** the first read, so the first read cannot bend
them.

## 1. The weekly dashboard (P4.22)

Scheduled task `weekly-seo-dashboard`, every Monday 10:00 Istanbul. Output:
`docs/reads/seo-weekly-<date>.md`, committed. One fixed table per section,
always the same columns, last full week against the week before.

**A. Search (hand read in the consoles; Chrome MCP, the recipe in memory)**

| Column | Source |
|---|---|
| Indexed pages | GSC → Indexing → Pages: "Indexed" count and its date |
| Not indexed, by reason | same page: crawled-not-indexed, discovered-not-indexed, noindex, redirect, 404 |
| Impressions, clicks, CTR, average position | GSC → Performance, last 7 days vs previous 7 |
| Non-branded clicks and impressions | same, with query filter "doesn't contain" `sql quest` / `sqlquest`, **and** the four competitor-brand queries excluded (`stratascratch`, `datalemur`, `datalemur sql`, `stratascratch sql` — see `gsc_position` in metrics.md) |
| Bing impressions, clicks, position | Bing Webmaster Tools → Search Performance, same weeks |

**B. Per cluster (GSC Performance → Pages, filtered by URL prefix)**

| Cluster | URL filter |
|---|---|
| question pages | `/questions/` |
| topic pages | `/challenges/` |
| company pages | `-sql-interview/` |
| tools & tests | `/sql-tools/`, `/sql-query-`, `/sql-quiz/`, `/sql-interview-readiness-test/` |
| comparisons | `/vs-`, `-alternatives/`, `/best-sql-practice-sites/`, `/sql-practice-comparison/` |
| blog | `/blog/` |
| hubs | `/sql-exercises/`, `/sql-interview-prep/`, `/learn-sql/`, `/sql-tutorial/`, `/sql-cheat-sheet/` |

Columns: pages with ≥ 1 impression, impressions, clicks, average position.

**C. Product funnel (`scripts/seo-dashboard.sql`, Supabase MCP read-only)**

Per cluster and top 25 landing pages: landed people → opened app ≤ 7d →
solved one ≤ 7d → signed up ≤ 14d, solve→signup %, second session (app on a
second calendar day ≤ 14d). The 7-day steps use the last full week; the
14-day steps use the week before it. Say which.

## 2. Keyword → landing → signup (P4.23)

There is no join key between a Google query and a person — Google does not
pass the query. The join is the **landing page**:

1. GSC Performance → Pages → click a page → Queries: the page's top 5 queries
   by clicks and its clicks for the week.
2. `scripts/seo-dashboard.sql` gives the same page's landed people, solved-one
   and signups.
3. The dashboard's section D lists the 15 pages with the most GSC clicks:
   page | top query | GSC clicks | landed people | solved-one % | signups.
   `clicks ÷ landed` far from 1 means tracking loss (ad blockers, bots) —
   report it, do not correct for it.

A query is "converting" when its page has ≥ 20 landed people in the week and
solved-one ≥ 25%. Only then is the query worth a new page of its own.

## 3. Grow the winning clusters (P4.24)

Read every fourth Monday (the 4-week read), never weekly — a week of search
data on a new page is noise.

A cluster **wins** when, over the last 4 weeks against the 4 before:

- impressions grew ≥ 30%, **and**
- its landed people solved one at ≥ 25% (n ≥ 40), **and**
- at least a third of its pages have ≥ 1 impression.

A winning cluster gets the next batch of work, in this order, and the read
says which one it is doing:

| Cluster | What "grow" means |
|---|---|
| question pages | A written explanation of the approach (not the solution) on the 30 question pages with the most impressions; then new challenges in the bank on the topics of the top queries |
| company pages | The next companies from the research candidates (docs/reads/company-research-2026-09-13.md), sourced, through the template |
| topic pages | A new topic page for the highest-impression query family that has no page (e.g. self-join, gaps and islands, pivot) |
| tools | A new rule in the checker/optimizer for the most common mistake the tool's `tool_used.kinds` does not already catch |
| comparisons | Another neutral alternatives page for the competitor whose brand query we already rank for |

A cluster that does not win gets nothing new that month. It is not pruned for
that alone — pruning is page-level (below).

## 4. Prune low-performing programmatic pages (P4.25)

Page-level, read at the same 4-week read, on pages **at least 8 weeks
indexed** (GSC URL Inspection "indexed" date, or first impression date).

| Signal over the last 28 days | Action |
|---|---|
| ≥ 10 impressions, 0 clicks, position ≤ 20 | **Improve**: rewrite title and description for the query it shows for |
| < 10 impressions and 0 landed people, cluster winning | **Improve**: add substance (an explanation, more related links), re-request indexing once |
| < 10 impressions and 0 landed people, cluster not winning | **Noindex** (question pages, generated topic pages) — add to `src/data/seo-prune.json` with the dated read in `notes` |
| Two pages ranking for the same top query, the weaker < ⅓ of the stronger's clicks | **Merge**: 308 the weaker to the stronger in `vercel.json`, drop it from the sitemap, move any unique content |
| A company page crawled-not-indexed for 8+ weeks | **Improve** once (sources, more specific shapes); if still not indexed 8 weeks later, noindex |

**First in line**, stated when they shipped: `/microsoft-sql-interview/`
(SQL Server intent collision) and `/bloomberg-sql-interview/` (format thinly
reported) — both research-flagged in docs/reads/company-research-2026-09-13.md.

Mechanism: `src/data/seo-prune.json` → `scripts/apply-seo-prune.mjs` (last
step of `npm run build`) sets `noindex, follow` on the built page and removes
it from the sitemap. `tests/seo-prune.test.js` fails on a pruned path without
a dated note. **Never delete a page that has earned a click**; noindex keeps
the URL working for anyone who has it.

Hard limits on pruning: no more than 50 question pages in one read (Google
reads a mass noindex as a site change), never a hand-written page without
the founder in the loop, and never before 2026-11-09 (8 weeks after the
2026-09-13 launch).

## 5. What would make these rules wrong

- If GSC shows fewer than 100 of the 299 question pages indexed at the
  2026-10-27 read (the ledger claim), Google is treating the batch as thin as
  a whole — the page-level prune rule is then the wrong tool, and the move is
  the claim's own falsification branch: explanations on the top 30, noindex
  the rest in one reviewed change.
- If the product funnel's landed people fall with impressions rising, the
  loss is between SERP and page (titles/snippets), not on the page.
