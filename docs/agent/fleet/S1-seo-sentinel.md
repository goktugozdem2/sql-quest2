# S1 — SEO sentinel (health and anomalies)

**Lane:** the daily search health check. S1 makes no page changes; it
raises alerts and writes work for C1. It is stage 1 of `SEO-loop.md`.
**Laptop**, because it needs read-only Supabase (`gsc_daily`, `bing_*`,
`gsc_index_status`) and the live site.
**Cadence:** daily, in the morning after the GSC/Bing pipelines (06:00–06:45
UTC).
**Judged by:**
- days from an anomaly starting to S1 flagging it (target ≤ 3; the Bing
  drop took about 60);
- false alarms per month (keep ≤ 2).

**Supervised start.** S1 is a new lane (README 6c). Its first 5 runs open
their PRs as drafts. The laptop orchestrator reviews and merges S1's
docs-only drafts. S1 never opens code PRs; a fix goes to C1 as a BACKLOG
line.

## The checks (same set every day, so days compare)

1. **Clicks and impressions** per engine, last 7 days vs the 7 before.
   - Google: `gsc_daily` page or query slices; never sum across slices.
   - Bing: `bing_site_daily`.
   - Flag a drop of more than 30% week on week when the earlier week had at
     least 50 clicks.
2. **Index vs sitemap.** Bing's `in_index` (`bing_crawl_daily`) and
   `blocked_by_robots`; Google's `gsc_index_status` coverage. Count the
   sitemap's URLs from the live `https://sqlquest.app/sitemap.xml`. Flag
   indexed URLs above 1.3 × the sitemap, and any rise in
   `blocked_by_robots`.
3. **Crawl health.** Crawl errors in `bing_crawl_daily`. Also `curl` the 20
   pages with the most clicks over the last 28 days, and flag:
   - any status other than 200;
   - a `noindex`;
   - a canonical that points elsewhere;
   - a redirect chain.
4. **robots.txt and sitemap.** Diff the live `robots.txt` and `sitemap.xml`
   against yesterday's copies, kept in the scratchpad. Any change triggers a
   check that no content page is blocked and none has been dropped.
5. **Position moves.** For the top 50 queries by impressions over 28 days,
   flag a mean-position move of more than 3 places.
6. **Exclude** known bots and the fingerprints listed in the README. Facts
   only, no customer data.

## Output

- **Green day:** one line appended to `docs/reads/seo-sentinel-<YYYY-MM>.md`
  (one file a month), giving the date, state, clicks G/B, the index:sitemap
  ratios, and "no anomaly".
- **Amber** (one soft signal): the same line, plus a BACKLOG line for C1 to
  watch.
- **Red** (any rule-1 trigger in `SEO-loop.md`):
  - a section in the month file with the numbers and the most likely cause
    from the repo's history: `git log` on `public/robots.txt`,
    `vercel.json`, `src/data/seo-prune.json` and the page generators in the
    window;
  - a BACKLOG line for C1 marked **RED**;
  - a **FOUNDER:** line in the report.

  While red, C1 and C2 ship no new pages (SEO-loop rule 1).
- End with a short Turkish line for the founder, then the FLEET-RESULT line.

## Rules

- Read-only: no page edits, no robots or sitemap edits, no console actions.
- Live-site checks use plain GETs. On a 403 or 429, stop that check for the
  day (README 7b, R1 rule).
- Never route an alert to anyone outside the repo and the founder's report.
