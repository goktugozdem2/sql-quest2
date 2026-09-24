# SEO weekly — 2026-09-21 (run by hand on 2026-09-24)

**Week W = Monday 2026-09-14 → Sunday 2026-09-20 (UTC); W-1 = 2026-09-07 → 09-13.**
This is the read the scheduled task `weekly-seo-dashboard` should have written
on Monday 09-21; both scheduled runs stalled on a permission prompt, so the
founder asked for it by hand on 09-24. **It is the first weekly SEO read** —
there is no earlier `seo-weekly-*.md` to compare against, so every "vs" below
is W against W-1 read today from the consoles, not against a previous file.

Read on 09-24, so the console numbers are later and more complete than a
Monday read would have seen (GSC lags ~2 days). The product windows are not
all closed: the 7-day steps of W landers from 09-18 on, and the 14-day signup
step of W-1 landers from 09-11 on, run past today. Treat both as floors.

**What predates what.** Every number for W predates the Bing changes of
2026-09-23 (robots.txt `/app/?` disallow, Crawl Control to a custom faster
rate, the related-questions ring and tool/guide links, IndexNow + URL
Submission batches on 09-23 and 09-24 — `docs/plans/internal-links-bing-2026-09-23.md`).
None of them can be in W. The only post-09-23 number here is the Bing Site
Explorer count, marked as such.

Not a four-week read (the first is the first Monday on or after 2026-10-12):
sections 3 and 4 of `docs/plans/seo-measurement-2026-09-13.md` (grow / prune)
are not applied. Nothing was requested, submitted or changed in either console.

## The number

**Google, non-branded listed clicks: 17 (W-1 13) on 1,131 impressions (1,202).**
It is a small number because Google hides most queries: the query table lists
67 of the week's 181 clicks. The steadier proxy, clicks to every page except
the homepage (which is 80% brand), is **121 vs 94 (+29%)**.

**Bing, the channel that produces solvers, grew faster: 214 clicks vs 136
(+57%), 4,848 impressions vs 2,920 (+66%)**, almost all of it `/sql-exercises/`
(170 clicks vs 95). This was before any of the 09-23 changes — the 10-07
`bing_indexed` read inherits a baseline that was already rising.

## A. Search

| | W (09-14 → 09-20) | W-1 (09-07 → 09-13) | Source |
|---|---|---|---|
| Indexed pages (Google) | **397** (data date 2026-09-21) | not read — GSC shows only the current count; the chart's per-date values are not in the page text. Nearest earlier figure: 334 on 09-18 (`internal-links-bing-2026-09-23.md`) | Indexing → Pages, all known pages |
| Not indexed, by reason | 66: 404 **7** (validation Failed) · noindex **38** · page with redirect **12** · crawled-not-indexed **2** · discovered-not-indexed **6** (validation Passed) · redirect error **1** (validation Started) · alternate canonical 0 | not read (same reason) | same |
| Impressions / clicks / CTR / avg position | **8.51K · 181 · 2.1% · 11.3** | 6.82K · 154 · 2.3% · 11.4 | Performance, custom dates |
| Non-branded clicks / impressions (listed queries) | **17 · 1,131** | 13 · 1,202 | query table, all rows (336 / 444), minus `sql quest`/`sqlquest` and the four competitor-brand queries |
| — clicks to pages other than `/` (proxy, includes hidden queries) | 121 | 94 | Pages table |
| Bing impressions / clicks / CTR | **4,848 · 214 · 4.41%** | 2,920 · 136 · 4.66% | Search Performance, Custom 14–20 Sep and 7–13 Sep (per-day table summed; matches the header) |
| Bing position | 6.70 | 6.14 | **not a Bing figure**: impression-weighted over the listed keywords (100 rows W, 118 rows W-1); Bing gives no site-level position |
| Bing indexed (Site Explorer) | 219 indexed · 155 warning · 33 excluded · 0 error, 407 known — **read 2026-09-24, after the 09-23 changes** | baseline 09-23: 211 · 93 · 38 · 0, 342 known | `bing_indexed` |

Traps met on this read, for the next one:
- GSC hides queries: listed rows carry 67 of 181 clicks (W) and 68 of 154 (W-1).
  Non-branded "clicks" from the query table are therefore a floor; do not add
  the anonymised remainder to either class.
- Summing the Pages table gives 9,530 impressions for W against the header's
  8,510 (page-grouped vs property-grouped counting). Clicks agree (181).
- The competitor-brand exclusion list has aged: `stratascratch` is **6
  impressions at 12.8** in W (30 at 10.5 in W-1; 8,467 over the 3 months to
  09-08). The competitor mass is now DataLemur (`datalemur sql` 420 i ·
  `data lemur sql` 177 · `datalemur` 175, all ~7, all to `/vs-datalemur/`).
  Two of the plan's four excluded queries barely exist any more; the variants
  that carry the volume (`data lemur sql`, `datalemur sql practice`) are not
  on the list. The intent split below removes every competitor-brand variant.

### Intent split (W vs W-1)

Classes per the task's FRAME, precedence brand → competitor-brand → interview
→ tool → practice → learn → other. Competitor brands (`stratascratch`,
`datalemur`, `data lemur`) are their own line so they cannot inflate
"interview" through `… interview …` variants. Clicks · impressions, listed
query rows only.

| Class | Google W | Google W-1 | Bing W | Bing W-1 |
|---|---|---|---|---|
| brand | 49 · 176 | 54 · 144 | 23 · 163 | 26 · 137 |
| **interview** | **7 · 96** | **8 · 131** | **1 · 3** | **0 · 9** |
| practice | 7 · 114 | 2 · 80 | 63 · 1,315 | 35 · 511 |
| learn | 0 · 16 | 0 · 20 | 0 · 2 | 0 · 4 |
| tool | 0 · 1 | 0 · 0 | 0 · 0 | 0 · 0 |
| other | 3 · 500 | 3 · 641 | 3 · 231 | 3 · 108 |
| competitor-brand | 1 · 991 | 1 · 1,042 | 0 · 3 | 0 · 7 |
| **interview share of non-brand, non-competitor** | **13.2% of impressions · 41% of clicks** | 15.0% · 62% | 0.2% · 1.5% | 1.4% · 0% |

Baseline from `seo-interview-longtail-2026-09-17.md` (Google 28 d): 14.1% of
impressions, 54.8% of clicks. W sits inside that range on impressions; the
click share fell because practice clicks rose (2 → 7), not because interview
clicks fell (8 → 7). n is single digits — no drift to call.

One hand correction: the rule's company match on `wise` caught Bing W-1's
`sql topic wise practice questions` (2 i); it is counted as practice above.
The Google W-1 interview rows were checked by eye for the top 22 only.
Bing's listed keywords carry 1,717 of 4,848 impressions (W) and 776 of 2,920
(W-1); Bing reports only its top keywords.

**Bing is still not an interview channel**: 3 interview impressions in a week
against 1,315 practice. The frame's interview queue has no Bing lever, as the
09-17 read said.

**The week's score (plan §5):** non-brand interview-class clicks Google 7
(W-1 8), Bing 1 (0). Landers × interview yield (the 09-17 per-page yields, applied to
the crawler-filtered landers of section C, question/topic/tool pages at 0):
**62.0 vs 56.1**, the rise coming almost entirely from `/sql-exercises/`
(174 landers vs 117).

## B. Per cluster

Google (Pages table, all rows: 273 pages in W, 113 in W-1; position is
impression-weighted over the cluster's pages):

| Cluster | Pages ≥ 1 impr W · W-1 | Impressions W · W-1 | Clicks W · W-1 | Avg position W · W-1 |
|---|---|---|---|---|
| question pages | **165** · 18 | **1,512** · 18 | 9 · 0 | 20.0 · 7.2 |
| topic pages | 11 · 10 | **1,359** · 491 | 11 · 7 | 15.0 · 13.7 |
| company pages | 29 · 23 | 746 · 691 | **44** · 33 | 12.8 · 7.7 |
| tools & tests | 3 · 1 | 68 · 11 | 0 · 0 | 13.0 · 20.5 |
| comparisons | 6 · 6 | 2,510 · 2,798 | 28 · 35 | 6.6 · 6.5 |
| blog | 35 · 34 | 2,357 · 2,589 | 12 · 14 | 14.7 · 17.5 |
| hubs | 5 · 5 | 449 · 250 | 16 · 5 | 10.2 · 11.7 |
| (home `/`) | 1 · 1 | 244 · 246 | 60 · 60 | 3.2 · 3.8 |
| (other) | 18 · 15 | 285 · 222 | 1 · 1 | 14.1 · 10.3 |

Bing (Pages list: 21 pages in W, 22 in W-1 — Bing lists only pages with web
traffic):

| Cluster | Pages W · W-1 | Impressions W · W-1 | Clicks W · W-1 | Avg position W · W-1 |
|---|---|---|---|---|
| question pages | **0 · 0** | 0 · 0 | 0 · 0 | — |
| topic pages | 2 · 4 | 131 · 105 | 5 · 4 | 5.4 · 5.4 |
| company pages | 4 · 4 | 32 · 33 | 3 · 2 | 3.5 · 4.6 |
| tools & tests | 1 · 1 (`/sql-tools/` only) | 241 · 62 | 0 · 0 | 7.8 · 7.5 |
| comparisons | 2 · 2 | 217 · 166 | 4 · 4 | 5.4 · 5.7 |
| blog | 8 · 7 | 493 · 372 | 2 · 3 | 6.1 · 6.4 |
| hubs | 2 · 2 | **3,002 · 1,504** | **171 · 95** | 5.9 · 6.1 |
| (home `/`) | 1 · 1 | 97 · 129 | 19 · 21 | 3.9 · 4.5 |
| (other: `/sql-find-duplicates/`) | 1 · 1 | 144 · 109 | 0 · 0 | 7.5 · 7.8 |

What B says:
- **Google has picked up the 09-13 batch; Bing has not.** 165 of 299 question
  pages had a Google impression in W (18 in W-1), at position 20. Bing shows
  none, the same "discovered but not crawled" gap the 09-23 plan measured.
- The topic pages nearly tripled on Google (491 → 1,359 impressions).
- Company pages gained clicks (33 → 44; Wise 11, Revolut 10) while their
  average position slid 7.7 → 12.8 — six more pages ranking, mostly at page
  two (the seven template pages entered the table).
- Bing's `/sql-exercises/` doubled: 1.5K → 3.0K impressions, 95 → 170 clicks,
  position 6.1 → 5.9. That single page is 80% of Bing's clicks.

## C. Product funnel (`scripts/seo-dashboard.sql`)

Run twice through the Supabase MCP (read-only), `:since`/`:until` replaced,
with one addition: the rendering-crawler filter from `first_solve_10m` in
`docs/agent/metrics.md` (first `app_opened` with empty `landingSrc` and
LA/1920×1080 or UTC/1280×720) removes those aids from `landed`. **It removes
almost nothing here (home 141 → 140)**, because the crawler that visits the
static pages never opens the app. See the crawler note under the tables.

**W (landers 09-14 → 09-20): the 7-day steps.**

| Family | Landed | To app ≤ 7d | Solved one ≤ 7d |
|---|---|---|---|
| question pages | 286 | 1.4% | 0.7% |
| hubs | 195 | 73.3% | **27.2%** |
| home | 140 | 52.9% | 25.7% |
| comparisons | 128 | 22.7% | 8.6% |
| blog | 107 | 6.5% | 1.9% |
| company pages | 98 | 35.7% | 10.2% |
| topic pages | 29 | 27.6% | 6.9% |
| tools & tests | 26 | 0.0% | 0.0% |
| other | 25 | 16.0% | 8.0% |

| Page (top 25 by landed) | Landed | To app | Solved one |
|---|---|---|---|
| sql-exercises | 174 | 78.2% | 29.3% |
| home | 140 | 52.9% | 25.7% |
| best-sql-practice-sites | 55 | 45.5% | 18.2% |
| vs-stratascratch | 26 | 0.0% | 0.0% |
| sql-interview-readiness-test | 19 | 0.0% | 0.0% |
| blog/faang-sql-interview-guide | 16 | 12.5% | 6.3% |
| revolut-sql-interview | 15 | 40.0% | 13.3% |
| sql-practice-comparison | 15 | 13.3% | 6.7% |
| sql-interview-prep | 14 | 35.7% | 14.3% |
| wise-sql-interview | 13 | 53.8% | 7.7% |
| blog/sql-cte-tutorial | 11 | 18.2% | 9.1% |
| blog/sql-case-when-tutorial | 10 | 0.0% | 0.0% |
| blog/null-handling-mistakes | 9 | 0.0% | 0.0% |
| datalemur-alternatives | 8 | 0.0% | 0.0% |
| blog/sql-group-by-tutorial | 8 | 0.0% | 0.0% |
| challenges/window-functions | 8 | 50.0% | 12.5% |
| stratascratch-alternatives | 7 | 0.0% | 0.0% |
| blog/left-join-vs-inner-join | 7 | 0.0% | 0.0% |
| snowflake-sql-interview | 6 | 66.7% | 16.7% |
| sql-find-duplicates | 6 | 0.0% | 0.0% |
| vs-sqlbolt | 5 | 0.0% | 0.0% |
| after-the-sql-course | 5 | 40.0% | 40.0% |
| blog/sql-for-fraud-analytics | 5 | 20.0% | 0.0% |
| stripe-sql-interview | 5 | 40.0% | 20.0% |
| blog/sql-anti-join | 5 | 0.0% | 0.0% |

(Six more pages tie at 5; the cut at 25 is arbitrary among them.)

**W-1 (landers 09-07 → 09-13): the 14-day steps.**

| Family | Landed | Signed up ≤ 14d | Solve → signup | Second session |
|---|---|---|---|---|
| question pages | 315 | 0.0% | — | — |
| home | 184 | **14.1%** (26) | 46.3% | 33.0% |
| hubs | 140 | 10.7% (15) | 36.1% | 31.8% |
| company pages | 102 | 4.9% (5) | 23.1% | 20.0% |
| comparisons | 98 | 3.1% (3) | 25.0% | 16.7% |
| blog | 82 | 0.0% | 0.0% | 0.0% |
| topic pages | 36 | 0.0% | 0.0% | 33.3% |
| other | 28 | 0.0% | 0.0% | 50.0% |
| tools & tests | 13 | 0.0% | — | — |

| Page (top 25 by landed) | Landed | Signed up | Solve → signup | Second session |
|---|---|---|---|---|
| home | 184 | 14.1% | 46.3% | 33.0% |
| sql-exercises | 117 | 12.0% | 35.3% | 31.0% |
| best-sql-practice-sites | 57 | 5.3% | 28.6% | 10.5% |
| sql-practice-comparison | 22 | 0.0% | — | 33.3% |
| revolut-sql-interview | 19 | 5.3% | 20.0% | 22.2% |
| snowflake-sql-interview | 16 | 12.5% | 25.0% | 27.3% |
| blog/null-handling-mistakes | 12 | 0.0% | — | — |
| blog/capital-one-codesignal-data-analyst-assessment | 11 | 0.0% | 0.0% | 0.0% |
| challenges/window-functions | 10 | 0.0% | 0.0% | 33.3% |
| blog/window-functions-tutorial | 9 | 0.0% | 0.0% | 0.0% |
| blog/sql-for-fraud-analytics | 9 | 0.0% | — | 0.0% |
| after-the-sql-course | 9 | 0.0% | 0.0% | 100% |
| learn-sql | 9 | 0.0% | 0.0% | 50.0% |
| blog/faang-sql-interview-guide | 9 | 0.0% | — | 0.0% |
| sql-interview-prep | 8 | 12.5% | 100% | 50.0% |
| stripe-sql-interview | 8 | 0.0% | 0.0% | 50.0% |
| sql-interview-readiness-test | 8 | 0.0% | — | — |
| sql-interview-questions-data-analyst | 7 | 0.0% | — | — |
| vs-datalemur | 7 | 0.0% | — | — |
| challenges/case-when | 7 | 0.0% | — | 0.0% |
| wise-sql-interview | 7 | 14.3% | 50.0% | 0.0% |
| blog/is-null-vs-equals-null | 5 | 0.0% | — | — |
| blog/sql-joins-explained | 5 | 0.0% | — | — |
| capital-one-sql-interview | 5 | 0.0% | — | — |
| sql-cheat-sheet | 5 | 0.0% | — | — |

**The static-page crawler (new finding — read before trusting any "landed" count).**
Split by referrer, the W landers look like this: 1,035 people landed; 196
came from Google, 192 from Bing/Yahoo/DDG, 29 from elsewhere, 87 with no
referrer in other timezones — and **529 with no referrer in
`America/Los_Angeles` or `Asia/Shanghai`**, a desktop Chrome UA, one page each.
That shape is **276 of the 286 question-page landers** (W-1: 315 of 315),
**all 26 tools & tests landers** (W-1: 13 of 13) — which includes all 19
`/sql-interview-readiness-test/` landers — 72 of 107 blog landers and 61 of
128 comparison landers. The `first_solve_10m` filter cannot see it because it
never opens the app. It is consistent with a crawler, not proven. Two
consequences:
- The question pages have **~10 human landers a week, not 286** (6 with a
  Google referrer). `question_page_door` rates read on raw `landed` are
  meaningless until this is filtered.
- The 09-17 long-tail plan's item 10 ("readiness test: 27 landers, 0 app
  opens — funnel hole or attribution hole?") has a third answer that fits the
  data better: in W none of its landers had a referrer and all had the
  crawler shape. Read it with a referrer filter before building anything.

A candidate filter for the dashboard SQL (not applied above, so the tables
stay comparable with the script): drop landers whose first `landing_view` has
`ref IS NULL` and tz in (`America/Los_Angeles`, `Asia/Shanghai`). It would
also drop some real direct-traffic Californians (home: 17 people in each
week), so it needs a look at the UA/viewport before it goes into the script.

## D. Keyword → landing → signup, top 15 pages by Google clicks in W

Landed people and solved-one % are the W run (all sources, crawler-filtered);
signups are the W-1 run. Google clicks ÷ landed is far from 1 on the Bing
pages (`/sql-exercises/` 11 Google clicks, 174 landers — 149 of them
Bing-family). That is engine mix, not tracking loss.

| Page | Top query (GSC, W) | Intent | GSC clicks | Landed (W) | Solved one | Signups (W-1 run) |
|---|---|---|---|---|---|---|
| `/` | sql quest (26 c · 69 i · 1.8) | brand | 60 | 140 | 25.7% | 26 of 184 |
| `/best-sql-practice-sites/` | best sql practice platform (1 · 4 · 1.5) | practice | 24 | 55 | 18.2% | 3 of 57 |
| `/sql-exercises/` | sql practice exercises with solutions (2 · 6 · 10.3) | practice | 11 | 174 | 29.3% | 14 of 117 |
| `/wise-sql-interview/` | where did you get these questions (1 · 1 · 5.0) | practice | 11 | 13 | 7.7% | 1 of 7 |
| `/revolut-sql-interview/` | revolut sql interview questions (3 · 8 · 1.4) | interview | 10 | 15 | 13.3% | 1 of 19 |
| `/snowflake-sql-interview/` | snowflake sql practice (1 · 2 · 1.0) | interview | 4 | 6 | 16.7% | 2 of 16 |
| `/blog/sql-for-fraud-analytics/` | "yes" / "sql fraud" / "please do" (0 c, 1 i each) | other | 3 | 5 | 0.0% | 0 of 9 |
| `/challenges/cte/` | site:sqlquest.app (0 · 12 · 3.2); sql cte practice (0 · 3 · 8.7) | brand / practice | 3 | 2 | 0.0% | 0 of 3 |
| `/blog/sql-join-nedir/` | left join nedir (0 · 6 · 8.5) | other | 3 | 3 | 0.0% | 0 (no W-1 landers) |
| `/blog/faang-sql-interview-guide/` | faang sql interview questions (0 · 2 · 5.5) | interview | 3 | 16 | 6.3% | 0 of 9 |
| `/sql-interview-prep/` | site:sqlquest.app (0 · 6 · 21.0); sql interview preparation course (0 · 3 · 29.0) | brand / interview | 3 | 14 | 14.3% | 1 of 8 |
| `/jpmorgan-sql-interview/` | jpmorgan chase sql interview recursive queries window functions 2025 (0 · 2 · 9.0) | interview | 3 | 4 | 25.0% | 0 of 1 |
| `/questions/order-funnel-conversion/` | decision-stage queries conversion drivers (0 · 2 · 74.5) | other | 3 | 4 | 25.0% | 0 of 2 |
| `/vs-datalemur/` | datalemur sql (1 · 420 · 6.5) | competitor | 2 | 4 | 0.0% | 0 of 7 |
| `/challenges/window-functions/` | sql window function questions (0 · 2 · 41.0) | practice | 2 | 8 | 12.5% | 0 of 10 |

The top query often carries fewer clicks than the page: most of a page's
clicks sit in Google's hidden queries. `/blog/sql-for-fraud-analytics/`'s
visible queries ("yes", "please do") read like assistant-grounding fetches,
not searches (memory: genai-recommendation-channel).

**No query is "converting" by the plan's definition** (page ≥ 20 landed and
solved-one ≥ 25%): only `/sql-exercises/` (174 · 29.3%) and `/` (140 · 25.7%)
pass, and their qualifying traffic is Bing and brand respectively, not a
Google query. No new-page signal.

### Fifth row set — top 10 interview-class queries at position 8–30 (Google, W)

Ranked by impressions; ties broken by position. Landing page from the query
filter → Pages.

| # | Query | Impr · clicks · pos (W) | W-1 | Lands on |
|---|---|---|---|---|
| 1 | meta sql interview questions | 8 · 0 · 15.1 | 6 · 0 · 12.7 | `/meta-sql-interview/` |
| 2 | tiktok sql interview questions | 6 · 0 · 11.7 | — | `/tiktok-sql-interview/` (template page, 09-13) |
| 3 | google sql interview questions | 6 · 0 · 20.5 | 3 · 0 · 22.3 | `/google-sql-interview/` |
| 4 | amazon sql interview questions | 4 · 0 · 27.8 | ≤ 2 or absent | `/amazon-sql-interview/` |
| 5 | sql interview preparation course | 3 · 0 · 29.0 | 9 · 0 · 28.9 | `/sql-interview-prep/` |
| 6 | doordash sql interview questions | 2 · **1** · 10.0 | — | `/doordash-sql-interview/` (template page, 09-13 — its first click) |
| 7 | hackerrank sql track | 2 · 0 · 8.0 | 2 · 0 · 6.0 | `/vs-hackerrank-sql/` |
| 8 | "snowflake questions" | 2 · 0 · 9.0 | 4 · 0 · 16.5 | `/snowflake-sql-interview/` |
| 9 | jpmorgan chase sql interview recursive queries window functions 2025 | 2 · 0 · 9.0 | 2 · 0 · 5.0 | `/jpmorgan-sql-interview/` |
| 10 | snowflake sql interview questions | 2 · 0 · 10.0 | 1 · 0 · 10.0 | `/snowflake-sql-interview/` |

Just outside: apple sql interview questions 2 · 0 · 14.5; uber sql interview
questions 2 · 0 · 15.0; capital one data analyst assessment 2 · 0 · 17.5.
Bing has no interview query in range worth listing (3 interview impressions
all week).

### The 09-17 long-tail queue — what moved

Rule (plan §5): **moved** = position better by ≥ 2, or a first click. Every
row is 1–8 impressions a week; a move is a mark, not a result. The decision
read is 10-12.

| Row | W (i · c · pos) | W-1 | Mark |
|---|---|---|---|
| Q1 meta sql interview questions | 8 · 0 · 15.1 | 6 · 0 · 12.7 | worse (−2.4) |
| Q2 snowflake sql practice | 2 · **1** · 1.0 | 4 · 0 · 2.5 | moved (already marked; a click this week) |
| Q3 uber sql interview questions | 2 · 0 · 15.0 | 4 · 0 · 25.8 | **moved** (+10.8) — no action shipped on it; 2 impressions |
| Q4 snowflake sql interview questions | 2 · 0 · 10.0 | 1 · 0 · 10.0 | flat (retitled 09-17) |
| Q5 apple sql interview questions | 2 · 0 · 14.5 | 5 · 1 · 6.8 | worse (−7.7, lost its click) |
| W1 "snowflake questions" | 2 · 0 · 9.0 | 4 · 0 · 16.5 | **moved** (+7.5) |
| W2 jp morgan sql interview questions | absent | 5 · 0 · 7.4 | no impressions in W |
| W3 google data analyst interview sql window functions | absent | absent | — |
| B1 sql interview questions for data analyst | 2 · 0 · 51.0 | 7 · 0 · 49.9 | flat, out of range |
| D1 hackerrank sql track | 2 · 0 · 8.0 | 2 · 0 · 6.0 | worse (−2.0) |
| D1 is hackerrank sql certification worth it | 3 · 0 · 6.7 | 2 · 0 · 8.5 | +1.8, not moved |
| D1 hackerrank sql / … practice official | 1 · 0 · 3.0 / 1 · 0 · 7.0 | 1 · 0 · 4.0 / 1 · 0 · 6.0 | flat |
| D2 capital one data analyst assessment | 2 · 0 · 17.5 | 12 · 0 · 7.5 | **worse (−10)** |
| D2 capital one data analyst codesignal assessment | 1 · 0 · 6.0 | 4 · 0 · 4.5 | worse (−1.5) |
| Out of range: amazon interview questions on sql | 7 · 0 · 30.7 | 7 · 0 · 31.3 | flat |
| Out of range: google sql interview questions | 6 · 0 · 20.5 | 3 · 0 · 22.3 | +1.8 |
| Out of range: sql interview preparation course | 3 · 0 · 29.0 | 9 · 0 · 28.9 | flat |
| Out of range: facebook sql interview questions | 1 · 0 · 43.0 | absent | — |

**Capital One (rule of 09-19):** no GSC query containing both `capital one`
and `sql` appeared in either week's listed rows; the family shows up only
without "sql" (`capital one data analyst assessment`, `… codesignal
assessment`). The company page's own page-level row was not read this week.
The 10-12 rule ("< 20 impressions → demand or crawl, not copy") is on course
to fire on the "< 20" branch.

## What is alarming, what is not

- **Not alarming, but the frame should see it:** interview intent is flat
  and tiny on Google (96 impressions, 7 clicks) and absent on Bing. All the
  week's growth is practice intent on `/sql-exercises/` (Bing) and the new
  question and topic pages (Google impressions at position 15–20; 9 + 11 clicks).
- **Watch:** `capital one data analyst assessment` fell from 7.5 to 17.5 in
  the week after the 09-17 H1 change on the company page and the blog link;
  the blog post's 5 W-1 Google clicks fell to at most 1 in W (it is not among
  the 22 pages with 2 or more clicks). Two weeks of
  single-digit impressions — mark, do not act before 10-12.
- **Measurement debt found:** the static-page crawler (section C) — ~51% of
  "landed" people in both weeks have the no-referrer LA/Shanghai shape.
  Every landing-based family rate for question pages, tools and the
  readiness test is currently a crawler rate.
- **Stale rule:** the four-query competitor exclusion no longer matches where
  the competitor impressions are (DataLemur variants, not StrataScratch).

## Not read, and why

- GSC indexed / not-indexed for W-1: the report shows only the latest count
  (data date 09-21); per-date values live in the chart, not the page text.
- Google per-page top queries are the first rows of the page-filtered query
  table; ties at 0 clicks are ordered by Google, not by us.
- Bing site-level average position: Bing does not report one (weighted
  keyword average given instead, labelled).
- Bing Keywords beyond its cap: Bing lists 100 keyword rows for W and 118
  for W-1; the rest of its impressions are unlisted.
- The `/capital-one-sql-interview/` page row (see above).
