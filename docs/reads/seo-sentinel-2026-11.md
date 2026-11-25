# SEO sentinel — November 2026 (S1)

One file a month. Brief: `docs/agent/fleet/S1-seo-sentinel.md`; loop and
red rules: `docs/agent/fleet/SEO-loop.md`. One line a day under **Days**;
a section under **Findings** for anything amber or red. The method below is
fixed so the days compare. If it changes, the change gets its own dated
note here, and lines before and after it are not read as one series.

## Method (fixed 2026-11-22, the first run)

Data: read-only Supabase MCP. Live site: plain `curl` GETs against
`https://sqlquest.app`. Every window ends on **the table's own latest date**,
because GSC and Bing land on different days. One slice per engine, never
summed across slices (CLAUDE.md, GSC pipeline).

**Check 1: clicks and impressions, 7 days vs the 7 before.** Red when the
earlier week had ≥ 50 clicks and the drop is > 30%.

```sql
with g as (select max(date) d from gsc_daily where query is null and page is not null),
gw as (
  select case when date > g.d - 7 then 'cur' else 'prev' end w, sum(clicks) clicks, sum(impressions) impr, min(date) f, max(date) t
  from gsc_daily, g where query is null and page is not null and date > g.d - 14 group by 1),
b as (select max(date) d from bing_site_daily),
bw as (
  select case when date > b.d - 7 then 'cur' else 'prev' end w, sum(clicks) clicks, sum(impressions) impr, min(date) f, max(date) t, count(*) n
  from bing_site_daily, b where date > b.d - 14 group by 1)
select 'google_page_slice' eng, w, clicks, impr, f, t, null::bigint n from gw
union all select 'bing_site_daily', w, clicks, impr, f, t, n from bw order by 1,2;
```

**Check 2: index vs sitemap.** The sitemap count is the number of `<loc>`
entries in the live `https://sqlquest.app/sitemap.xml`.

- **Bing:** `in_index / sitemap`, from the latest `bing_crawl_daily` row. Red
  above 1.3. Any day-on-day rise in `blocked_by_robots` is flagged.
- **Google:** the API gives no total index count. The ratio is
  `gsc_index_status` rows with `coverage_state = 'Submitted and indexed'`
  over the sitemap. It covers sitemap URLs only, and the table is refreshed
  on Mondays.

```sql
-- 2a
select date, in_index, blocked_by_robots, code_2xx, crawl_errors, code_4xx, code_5xx, all_other_codes, crawled_pages, fetched_at::date
from bing_crawl_daily order by date desc limit 8;
-- 2b
select coverage_state, verdict, count(*) n, min(checked_at)::date oldest_check, max(checked_at)::date newest_check
from gsc_index_status group by 1,2 order by n desc;
-- 2c: both URL tables by section, compared with the sitemap's own split
select 'gsc_index_status' t, count(*) filter (where url like '%/questions/%' and url <> 'https://sqlquest.app/questions/') q,
 count(*) filter (where not (url like '%/questions/%' and url <> 'https://sqlquest.app/questions/')) other, count(*) n,
 count(*) filter (where coverage_state ilike 'Submitted and indexed') indexed from gsc_index_status
union all
select 'bing_url_status', count(*) filter (where url like '%/questions/%' and url <> 'https://sqlquest.app/questions/'),
 count(*) filter (where not (url like '%/questions/%' and url <> 'https://sqlquest.app/questions/')), count(*),
 count(*) filter (where last_crawled is not null) from bing_url_status;
```

**Check 3: crawl health.** Crawl errors, 4xx and 5xx come from `bing_crawl_daily` (2a). The top 20 pages by clicks over 28
days are summed across engines from each engine's **page** slice: Google
daily rows, and Bing weekly buckets whose end date falls inside the 28 days.

```sql
with gm as (select max(date) d from gsc_daily where query is null and page is not null),
bm as (select max(date) d from bing_stats where query is null and page is not null),
g as (select page, sum(clicks) c from gsc_daily, gm where query is null and page is not null and date > gm.d - 28 group by 1),
b as (select page, sum(clicks) c from bing_stats, bm where query is null and page is not null and date > bm.d - 28 group by 1),
u as (select coalesce(g.page,b.page) page, coalesce(g.c,0) gc, coalesce(b.c,0) bc, coalesce(g.c,0)+coalesce(b.c,0) tc from g full join b on g.page=b.page)
select page, gc, bc, tc from u order by tc desc, page limit 20;
```

Each of the 20 gets two GETs, paced 0.5 s apart and stopped on a 403 or 429. The first request does not follow redirects and records the
first status. The second follows them and records the hop count, the final
status, `<meta name="robots">`, `<meta name="bingbot">`, `X-Robots-Tag` and
`<link rel="canonical">`. The page is flagged if:

- a status is not 200;
- any robots signal carries `noindex`;
- the canonical differs from the final URL;
- it takes more than one hop.

The single 308 hop from `https://www.sqlquest.app/` to the bare host is
expected (see the standing notes). The script is kept in the session
scratchpad as `s1-bin/crawl-check.sh` and its results as
`s1-snapshots/<date>/top20-check.tsv`. It sends a plain GET with the user
agent `Mozilla/5.0 (compatible; SQLQuest-S1-sentinel)`.

**Check 4: robots.txt and the sitemap.** Each day the live files are saved
to the scratchpad as `s1-snapshots/<date>/robots.txt`, `sitemap.xml` and
`sitemap-urls.txt`, and diffed against the previous day's copies.

- On any change, check that no content path is disallowed and that no URL
  has left the sitemap.
- Also compare the live files with `origin/main:public/…`, which shows when
  the deploy lags.
- If yesterday's snapshot is gone (the scratchpad does not survive a
  reboot), diff against `public/robots.txt` / `public/sitemap.xml` at the
  commit currently in production. That commit is the latest `Production`
  deployment from `gh api repos/<repo>/deployments`.

**Check 5: position moves.** Take the top 50 queries by impressions over 28
days, from each engine's **query** slice. Compute the impression-weighted
mean position for the latest week and the one before:

- Google: daily rows.
- Bing: the latest weekly bucket against the bucket before it, using
  `avg_impression_position`.

Flag a move of more than 3 places. A query is compared only when **both**
weeks have ≥ 10 impressions. That floor is this run's choice, to keep
single-impression noise out.

```sql
-- Google
with m as (select max(date) d from gsc_daily where query is not null and page is null),
top as (select query from gsc_daily, m where query is not null and page is null and date > m.d - 28 group by 1 order by sum(impressions) desc, query limit 50),
w as (select g.query,
  sum(impressions) filter (where date > m.d - 7) ic, sum(position*impressions) filter (where date > m.d - 7) / nullif(sum(impressions) filter (where date > m.d - 7),0) pc,
  sum(impressions) filter (where date <= m.d - 7 and date > m.d - 14) ip, sum(position*impressions) filter (where date <= m.d - 7 and date > m.d - 14) / nullif(sum(impressions) filter (where date <= m.d - 7 and date > m.d - 14),0) pp
  from gsc_daily g, m where g.query in (select query from top) and g.page is null and g.date > m.d - 14 group by 1)
select count(*) filter (where ic>=10 and ip>=10) comparable, count(*) filter (where ic>=10 and ip>=10 and abs(pc-pp)>3) flagged,
 string_agg(case when ic>=10 and ip>=10 and abs(pc-pp)>3 then query||' '||round(pp,1)||'→'||round(pc,1)||' ('||ip||'/'||ic||' impr)' end, '; ') detail from w;
-- Bing: same shape on bing_stats (query not null, page null), with date = m.d vs date = m.d - 7 and avg_impression_position
```

**Check 6: exclusions.** GSC and Bing tables are aggregates from the
engines, so there are no bot fingerprints or people to exclude. S1 reads no
`pro_events` or `users` rows. If a later check needs `pro_events`, it uses
the README rule-2 exclusions.

**State.**
- **Red:** any SEO-loop rule-1 trigger.
- **Amber:** one soft signal, such as a position move or a deploy lag.
- **Green:** neither.

## Days

`date | state | clicks G / B (7 d, prev) | index:sitemap G / B | crawl | robots + sitemap | positions`

- 2026-11-22 | **RED** (Bing index; known, see F1) | G 171 (11-15→21; prev 163) / B 32 (11-14→20; prev 37) | G 416/429 = 0.97 (sitemap URLs inspected 11-16) / B 833/429 = **1.94** | Bing errors 0, 4xx 0, 5xx 0; top 20 all 200, `index, follow`, self-canonical, ≤ 1 hop | first snapshot, no yesterday to diff; robots = main (bingbot group live), sitemap 429 URLs = main's URL set, lastmods behind main (F2) | G 8 of 20 comparable queries moved > 3, 2 of them down (F3); B 0 of 5
- 2026-11-23 | **RED** (Bing index, F1; Google GREEN) | G 172 (11-16→22; prev 174) / B 38 (11-15→21; prev 35) | G 421/431 = 0.98 (all 431 sitemap URLs inspected 11-23: 421 indexed, 10 unknown to Google) / B 838/431 = **1.94** | Bing errors 0, 4xx 0, 5xx 0 (11-22); top 20 all 200, `index, follow`, self-canonical, ≤ 1 hop (www → bare, the standing 308) | robots unchanged from 11-22 and = main; sitemap 431 URLs (+2: `/for-teams/`, `/blog/revolut-data-analyst-sql-screen/`; none dropped), byte-equal to main (F2 cleared) | G 5 of 21 comparable moved > 3, all **up** (CTE/GROUP BY tail, `sqlbolt` 11.3 → 7.7); weighted mean 9.2 → 8.3; B 0 of 5 (bucket 11-20)
- 2026-11-24 | **RED** (Bing index, F1, no new Bing data; Google GREEN) + **AMBER** (F5) | G 181 (11-17→23; prev 178) / B 38 (11-15→21; prev 35; no Bing fetch since 11-23 18:40 UTC, so the same rows as yesterday) | G 421/440 = 0.96 (`gsc_index_status` unchanged since the 11-23 inspection; the 9 URLs added since have no row yet) / B 838/440 = **1.90** (the 11-22 row; same count over a larger sitemap, not a fall) | Bing errors 0, 4xx 0, 5xx 0 (11-22); top 20 all 200, `index, follow`, self-canonical, ≤ 1 hop (www → bare, the standing 308) | robots unchanged from 11-23 and = main; sitemap 440 URLs (+9: `/sql-debugging-practice/`, `/sql-interview-prep-plan/`, `/sql-mock-interview/` and six `/questions/` pages; none dropped), byte-equal to main | G 7 of 22 comparable moved > 3, all **up** (`rollup interview questions` 9.2 → 3.4, `sqlbolt` 10.7 → 7.3, the CTE/JOIN/GROUP BY tail); weighted mean 9.5 → 7.5; B 0 of 5 (bucket 11-20)

## Findings

### F1 — RED: Bing index at 1.94 × the sitemap (the starting condition)

This was already known when S1 started. C1 diagnosed it in
`docs/reads/bing-drop-2026-11-22.md`. S1's first run records it as the
baseline the fix is read against.

| `bing_crawl_daily` | 11-14 | 11-17 | 11-20 | **11-21** |
|---|---|---|---|---|
| `in_index` | 798 | 817 | 830 | **833** |
| `blocked_by_robots` | 781 | 800 | 819 | **828** |
| `code_2xx` | 414 | 420 | 416 | 413 |
| `all_other_codes` | 884 | 895 | 913 | 922 |
| crawl errors / 4xx / 5xx | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |

- **Sitemap:** 429 URLs live, 312 question pages plus 117 others.
  `bing_url_status` covers all 429, and 379 of them have been crawled at
  least once.
- **Ratio:** 833 / 429 = 1.94, against a red line of 1.3. The 0.9–1.3 band
  is the loop's health target.
- **Still growing:** `blocked_by_robots` is up 9 on the last day (819 →
  828). `in_index` minus `blocked_by_robots` is 5. `code_2xx` holds at about
  415, the size of the sitemap.
- **Clicks:** Bing ran 32 a week (11-14 → 11-20) against 37 the week before
  and a peak of 280 (week from 09-19).
  - The rule-1 clicks trigger (> 30% with ≥ 50 in the earlier week) **cannot
    fire on Bing at this volume**, because the base is below 50.
  - The index ratio is the rule that sees this drop now. C1 should know that
    the clicks rule is blind until Bing is back above 50 a week.
- **Most likely cause, from the repo's history:**
  - **8a284341 (09-23)** added `Disallow: /app/?`, `/app?` for every agent.
    `blocked_by_robots` started rising the next day (0 on 09-24).
  - `vercel.json` changed once in the window, with #125 (the ignored-build
    step), which does not touch routing.
  - `src/data/seo-prune.json` did not change in the window.
  - C1's read covers the rest: host, canonical, crawl status and the page's
    own edits are ruled out.
- **The fix is live.** #138 (9422053b, 11-22) adds a `User-agent: bingbot`
  group without the `/app/?` rules.
  - The live `robots.txt` is byte-equal to `origin/main:public/robots.txt`.
  - It has been served since the production deploy of 2026-11-22 12:15 UTC
    (35afda6d).
  - An app URL (`/app/?challenge=91&src=sql-exercises`) answers 200 with
    `<meta name="robots" content="noindex, follow">`, so a bingbot that may
    fetch it can now read the noindex.
  - The Bing data so far ends on 11-21, so none of it reflects the fix yet.
- **What S1 reads next, daily:**
  1. Within ~3 days of 11-22, `blocked_by_robots` should **stop rising**.
     If it is still rising on **11-26**, that goes to C1 as a finding:
     Bing has not re-read robots.txt, or the group does not match.
  2. Then it should **fall**, and `in_index` with it, toward ~430.
  3. S1 reports the date the ratio first drops below 1.3. That date ends
     the red state.
  4. #72's verdict must not use `in_index`; C1's read says why.

### F2 — AMBER: the live site trails main by two page PRs, and nothing will deploy them

- **What is live:** the live `sitemap.xml` is byte-equal to `public/sitemap.xml`
  at **35afda6d** (#143), the last production deploy (12:15 UTC). It has the
  same 429 URLs as `origin/main`, but 330 `<lastmod>` lines still read 11-21
  where main reads 11-22.
- **What is missing:** the two later commits that touch `public/`, #144
  (23ead8e8) and #146 (9a6037dc), both carry the Vercel status **"Deployment
  rate limited — retry in 24 hours."**
- **Why it stays missing:** every merge since has been docs-only.
  `scripts/vercel-ignore.sh` decides on `git diff HEAD^ HEAD` alone, so a
  docs-only merge skips the build even when the commit before it was never
  deployed. #144 and #146 stay off the site until the next merge that
  touches the served tree.
- **Search effect today: small.** The URL set is identical, and the
  IndexNow job reported success for both commits although they are not
  served.
- **Why it is still a finding:** it is a stranding path. Any page fix that
  lands just before a run of docs merges is invisible on the site. Not red:
  no page is blocked, missing or forked.

### F3 — AMBER (soft): two Google position drops on the `/sql-exercises/` queries

Google query slice, 11-08 → 11-14 vs 11-15 → 11-21. 20 of the top 50
queries had ≥ 10 impressions in both weeks, and 8 of those moved more than
3 places.

- **Down, the flag:**
  - `sql practice exercises with solutions`: 4.2 → 7.9 (12 / 27 impressions)
  - `sql exercises`: 18.1 → 23.5 (21 / 13)
- **Up:** `sqlbolt` 12.7 → 7.7 (111 / 258), `sql bolt` 11.8 → 4.2, and four
  CTE / GROUP BY queries that moved from deep positions (29–87) to less deep
  ones.
- **Overall:** the impression-weighted mean over the comparable queries went
  10.6 → 9.8, slightly better.
- **Bing:** 5 comparable queries in the top 50, none moved more than 3 (6.4
  → 6.7).
- **Why only a watch:** both drops are on the `/sql-exercises/` door, whose
  title changed on 11-20 (#65), inside the current week. Under SEO-loop
  rule 4 that page takes no other change before #65's own read on
  **12-12**. The samples are 12–27 impressions. S1 keeps reading daily and
  escalates only if `sql practice exercises with solutions` stays below
  position 7 for two more weeks.

### F4 — 2026-11-23: Bing's ratio has not moved since #72, and should not have yet

The question for this run: did the index-to-sitemap ratio on Bing move
after #72 (merged 2026-11-20 18:51 +03, `bingbot` `noindex, follow` on the
question pages)?

| `bing_crawl_daily` | 11-19 | 11-20 | 11-21 | **11-22** |
|---|---|---|---|---|
| `in_index` | 825 | 830 | 833 | **838** |
| `blocked_by_robots` | 807 | 819 | 828 | **833** |
| sitemap URLs (live) | 429 | 429 | 429 | **431** |
| ratio | 1.92 | 1.93 | 1.94 | **1.94** |

- **No move.** The ratio is flat at 1.94 and both counts still rise
  (+5 / +5 on 11-22). The 11-22 row is the first that could reflect #138
  (live 11-22 12:15 UTC), so it says nothing yet; the 11-26 check in F1
  stands.
- **Why #72 cannot show yet.** A `noindex` only acts once Bing re-crawls the
  page. `bing_url_status` (checked 11-22): **8 of 312** question pages were
  crawled on or after 11-20; 267 have been crawled at some point. The live
  page carries `<meta name="bingbot" content="noindex, follow">` (checked
  today), so the signal is there to be read.
- **What #72 would look like when it acts:** `in_index` falls by up to
  ~300 toward the non-question set, and `code_2xx` falls with it. It
  does not touch `blocked_by_robots`, which is #138's number. So the two
  fixes can be read apart: `blocked_by_robots` falling = #138,
  `in_index − blocked_by_robots` and `code_2xx` falling = #72.
- **The status line for the indexing queue (#262, open, not run):**
  `Google GREEN · Bing RED`. Bing stays RED until the ratio is below 1.3.

### F3 update — 2026-11-23: the two `/sql-exercises/` drops are no longer flagged

This week (11-16 → 11-22 vs 11-09 → 11-15) neither query moved more than 3
places. The five that did were all up. F3 stays a watch until #65's read
on 12-12; no escalation.

### F2 update — 2026-11-23: cleared

The live `sitemap.xml` is byte-equal to `origin/main:public/sitemap.xml`
(427 lastmods 11-23), so the stranded #144 / #146 are now served.

### F5 — AMBER, 2026-11-24: the deployed site drops the Debug-hub link on 4 of its 11 target pages

`scripts/build-debug-pages.mjs` (#256) injects a link to
`/sql-debugging-practice/` into 11 built pages while `debugQuestions` is on
(on since 11-23 ~22:30 UTC, #289). Main's committed `public/` carries all 11.
The live site carries 7 (plain GETs, 2026-11-24 ~16:55 UTC):

| Page | main `public/` | live |
|---|---|---|
| `/`, `/blog/validate-ai-generated-sql/`, the five trap pages | link | link |
| `/sql-exercises/` | link | **none** |
| `/sql-for-the-ai-era/` | link | **none** |
| `/tiktok-sql-interview/` | link | **none** |
| `/shopify-sql-interview/` | link | **none** |

- The live `/sql-exercises/` is main's page minus exactly the
  `debug-hub-link` paragraph (diffed; nothing else differs), so this is not
  a deploy lag: the sitemap and robots are byte-equal to main.
- Since #276 the production deploy builds from source (`vercel build`,
  `buildCommand: npm run build`) instead of serving the committed
  `public/`. The likeliest cause is an order or anchor difference in that
  build for these four pages (their anchors are `topic-traps:end`,
  `debug-discovery:end`, `company-topics:end`). Not traced further: S1 is
  read-only.
- **Why it matters for search:** `/sql-exercises/` is the site's top click
  page on both engines and the hub's main internal link. The hub was
  requested in GSC on 11-23 with fewer links than the request assumed.
  The indexing queue reads the gate correctly (it holds `/sql-exercises/`
  because the marker is not live).
- **Not RED:** no page is blocked, dropped or noindexed. It is one link on
  four pages.
- **To C1 / the deploy owner** (BACKLOG): find why the deploy's build
  differs from the committed `public/` on these four pages, and add a check
  that the served copy of every `linkTargets()` page carries the marker.
  Re-check here on 11-25.

### Indexing step, 2026-11-24 (the first daily run)

- The seven GSC requests the orchestrator made by hand on 11-23 are now rows
  in `docs/agent/index-requests.json`, from the laptop fleet state: six at
  19:05–19:15 UTC (rollup, PayPal, `/for-teams/`, the Revolut blog post,
  `/sql-mock-interview/`, `/sql-interview-prep-plan/`) and the Debug hub at
  22:00–22:45 UTC. Each row carries the end of its run, the conservative
  reading. Three earlier by-hand requests (Chime, `/challenges/window-functions/`,
  `/challenges/cte/`) are marked done in that state with no date. They are
  noted under `unrecorded` and are not rows.
- **The rolling window moves to 22:45 UTC, not 19:15.** The hub's request
  was the last one, so `index-queue.mjs` holds today's batch until
  **2026-11-24 22:45 UTC**. Run at 16:55 UTC, it says "0 of cap 0". The
  list below is the same run with `--now 2026-11-24T22:46Z`.
- **Day-1 GSC list (8, binding from 22:45 UTC):**
  1. `/revolut-sql-interview/` (T1, changed 11-24)
  2. `/monzo-sql-interview/` (pending, #76)
  3. `/blog/validate-ai-generated-sql/` (#256 links the hub from here, marker live)
  4. `/airbnb-sql-interview/`
  5. `/amazon-sql-interview/`
  6. `/anthropic-sql-interview/`
  7. `/apple-sql-interview/`
  8. `/bloomberg-sql-interview/`

  Items 4–8 are T4: indexed pages whose lastmod moved on 11-24 (21 company
  pages, #237 and its regeneration). The six unknown `/questions/` pages
  follow on 11-26/27.
- **Bing by hand: 1.** `/revolut-sql-interview/` (T1, changed today). Bing is
  RED, which pauses T3/T4 only.
- **A first sign the rollup request worked.** `/sql-rollup-interview-questions/`
  shows in `gsc_daily` on 11-23 (279 impressions at mean position 1.1,
  0 clicks). It was "unknown to Google" at the 11-23 15:45 inspection. Its
  ledger claim's 28-day window starts at the 11-23 19:15 request.
- **A gap in the queue, not urgent:** a URL with no `gsc_index_status` row on
  a site-wide lastmod day is held as "only a site-wide change". The six
  new `/questions/` pages are held that way until Monday's inspection gives
  them a row. They are T5, so nothing is lost.

### Standing notes (not findings)

- Bing reports the homepage as `https://www.sqlquest.app/` (26 Bing clicks
  in 28 days, against 0 under the bare host). The live `www` URL answers one
  308 to the bare host, which then serves 200 with a self-canonical.
  - This has been so since May.
  - It is Bing's choice of host, and the fix is in Bing's UI: item 3 of the
    FOUNDER list in `bing-drop-2026-11-22.md`.
- `gsc_index_status` holds 416 of the 429 sitemap URLs: 304 question pages
  and 112 others, all "Submitted and indexed", checked 11-16. The 13 newer
  URLs get their first inspection on Monday 11-23.
