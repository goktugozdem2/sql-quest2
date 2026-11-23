# C1 — the search week, 2026-11-23 (Monday)

Brief: `docs/agent/fleet/C1-search.md`. Loop: `SEO-loop.md`.

**Inputs:**
- S1: `seo-sentinel-2026-11.md`, F1 and F4.
- C8: `traffic-2026-11-23.md`.
- Data: `gsc_daily` (page slice, query slice and query+page slice, never summed across), `bing_site_daily`, `bing_stats`, and `gsc_index_status`.
- Window: 28 days to 11-22 for Google and to 11-20 for Bing's weekly buckets.

**State: RED (Bing index 1.94 × sitemap).**
- Under rule 1 no new page ships this week, and the week's first item is the root cause.
- Google is GREEN.

## The number C1 is judged by: organic clicks per week

| Week from | Google | Bing | `ai:*` people (C8) |
|---|---|---|---|
| 10-26 | 156 | 76 | 21 |
| 11-02 | 125 | 55 | 32 |
| 11-09 | 174 | 35 | 27 |
| 11-16 | 172 | 36 (6 days; 11-22 not in yet) | 20 |

- **Trailing 4 weeks: 627 Google + 202 Bing + 100 AI = 929.**
- Google is flat-to-up and impressions are rising: 7,177 → 8,896.
- Bing has stopped falling at about 35 a week, but it is not recovering.

## The ranked list for the week (expected clicks × ease)

1. **Root cause first: let the two Bing fixes act. Ship nothing on the Bing side.**
   - #138 (live 11-22) is read on `blocked_by_robots`. #72 (live 11-20) is read on `in_index − blocked_by_robots` and `code_2xx`. S1 F4 explains how the two are told apart.
   - Gate: on **11-26**, if `blocked_by_robots` is still rising, the bingbot group is re-checked (FOUNDER: Bing's robots.txt tester).
   - Only 8 of 312 question pages have been re-crawled since #72, so #72's fall in `in_index` is not expected this week.
   - Claim: no new one. The existing ledger claims for #138 and #72 are the reads.
2. **Get the 10 "unknown to Google" sitemap URLs found** (`gsc_index_status`, 11-23).
   - These include the two pages whose demand is already proven: `/sql-rollup-interview-questions/` and `/paypal-sql-interview/`.
     - "rollup interview questions" has 736 impressions in 28 days at position 8.8 with **0 clicks**. It lands on `/questions/recursive-team-size-rollup/`, which already links to the rollup page (twice).
     - The rollup page has a ledger claim (#127) that waits on this request.
   - This is the founder's list below. If #262 merges first, its queue decides the order.
3. **`/vs-datalemur/`: the largest CTR gap on the site.**
   - "datalemur" + "datalemur sql": 4,778 impressions, 3 clicks, position 6.7. That is a 0.06% CTR against a 0.58% median at that position.
   - The page changed on 11-22 (#142, answer-first summary), so rule 4 holds it until **12-06**.
   - Queued for the first slot after that: a title and description that answer the navigational query ("DataLemur vs SQL Quest") without implying we are DataLemur. Facts only from a dated `docs/reads/` file.
   - Expected value if it reaches the median: about +25 clicks in 28 days.
4. **`/blog/validate-ai-generated-sql/` and `/vs-sqlbolt/`: read #68 on 12-04, no change before.**
   - At position 3.6 on 470 impressions, the AI-SQL post has a 0.85% CTR against a 13.6% median (n = 5 pages, a thin median). That is the largest relative gap.
   - #68 rewrote both snippets on 11-20. `sqlbolt` already moved 11.3 → 7.7 this week (S1).
5. **`/sql-left-join-where-filter/`: a snippet check, low value.**
   - 228 impressions, position 5.5, 0.44% CTR against a 1.54% median. Unchanged since 09-25, so it is eligible.
   - No query reaches 8 impressions, so there is no single query to write the title for.
   - Do it only if 1–4 leave room; about +2 clicks in 28 days.

**Ruled out this week:**
- `/learn-sql/` and `/practice-sql-no-setup/` look like CTR gaps, but their impressions are brand sitelinks ("sqlquest", "sql quest", position ~1). A snippet change will not move them.
- `/blog/sql-join-nedir/` and `/blog/null-handling-mistakes/` changed on 11-23 (#163) and 11-21 (#74).
- **No new-page case.** Every ≥ 150-impression query lands on a page that answers it, or on the rollup query whose page exists and is waiting on indexing.

## FOUNDER: URLs to request indexing for (≤ 10, in order)

Google, all "URL is unknown to Google" on 11-23:

1. `https://sqlquest.app/sql-rollup-interview-questions/`
2. `https://sqlquest.app/paypal-sql-interview/`
3. `https://sqlquest.app/blog/revolut-data-analyst-sql-screen/`
4. `https://sqlquest.app/for-teams/`

- The six unknown `/questions/` pages are T5 in #262's plan. Leave them to the sitemap.
- If #262 merges before you do this, follow its day-1 list instead. It holds 1 and 2, plus the T1 pages.
- Bing: nothing by hand while the index is RED. Once #262 merges, the API submitter skips `/questions/` too.
