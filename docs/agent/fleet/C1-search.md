# C1 — Search (SEO)

**Lane:** pages for organic search (Google + Bing).
**Cadence:** weekly (Monday, after `weekly-seo-dashboard`).
**Judged by:** organic clicks per week (GSC + Bing), trailing 4 weeks.

1. From `gsc_daily` (never sum across slices) and `bing_stats`, last 28 days, find:
   - pages ranked 3–15 with ≥ 150 impressions and CTR below the site's median at that position → rewrite the title/description, within the snippet tests;
   - queries with ≥ 150 impressions where the page shown doesn't answer the query → a new page, only when the demand is in the data;
   - orphan or thinly linked pages → internal links;
   - pages crawled but not indexed (`gsc_index_status`) → links, or a merge.
2. Rules:
   - no frequency or company claims without a dated source;
   - frozen pages and `src/data/seo-prune.json` rules apply;
   - every new page ships with internal links in the same commit;
   - every new page's queries are run and pinned in tests.
3. One PR per change type, for A1. Add a ledger claim with the GSC metric.
4. Under FOUNDER, list the URLs to request indexing for (GSC needs his Chrome).
