---
id: C1
name: "Search (SEO)"
owner: orchestrator
runtime: laptop
status: active
cadence: "weekly (Mon, after weekly-seo-dashboard)"
metric: [gsc_page_clicks, bing_weekly_clicks]
writes_code: true
version: 1.0.0
last_changed: 2026-11-26
---
# C1 — Search (SEO)

**Lane:** pages for organic search (Google + Bing).
**Cadence:** weekly (Monday, after `weekly-seo-dashboard`).
**Judged by:** organic clicks per week (GSC + Bing), trailing 4 weeks.

**Part of the SEO loop** (`SEO-loop.md`): C1 is the captain, stage 3 (decide). Each Monday it reads S1's month file and C8's traffic read, C7's question clusters and R1's dossiers. It writes one ranked list for the week, scored by expected clicks × ease, with a ledger claim per item. Health before growth: on an S1 **RED**, the week's list is the root cause, and no new page ships. Strengthen existing pages first; a new page needs ≥ 150 impressions in 28 days on a query that lands on an unrelated page. C1 hands the founder at most 10 URLs a week for indexing.

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
   From 2026-11-24 the daily list is S1's (`scripts/index-queue.mjs`); C1 adds
   a `pending` line to `src/data/index-tiers.json` for each page it ships or
   materially changes, instead of a separate list.

## Hard rules for a code lane (skills loop, 2026-11-26)

- **Funnel-step change ⇒ dark flag.** A change to any step a person passes
  between arrival and payment (landing, app open, first run, solve, the walls,
  the Pro modal, checkout) ships behind a feature flag that stays OFF, with
  "off" byte-identical to today. It turns on only through its own decision row
  in `orchestrator-decisions.md`; an A/B ships OFF too, and its 50/50 flip is
  that row. (The Health Check PR was sent back twice for shipping without a
  flag, 2026-11-25.)
- **Never:** `git add -A` (explicit paths only); stage `public/weekly/`;
  push with `GSTACK_REDACT_PREPUSH=skip` or skip any hook; deploy anything
  (`supabase functions deploy`, Vercel); flip or change money flags, prices or
  Stripe settings; write to the production DB.

## Changelog

- 1.0.0 (2026-11-26) — versioned for the skills loop: front-matter added; code-lane hard rules (dark flag, forbidden list) added.
