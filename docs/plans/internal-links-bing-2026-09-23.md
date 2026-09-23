# Internal links for Bing's crawl — plan and first pass (2026-09-23)

## What was measured

Bing Webmaster Tools, 2026-09-23: the sitemap (405 URLs) was read on 09-21,
but Bing knows 342 URLs and has indexed **211** (93 with warnings, 38
excluded). URL Inspection on a sample: the 2026-09-13 batch is mostly
"Discovered but not crawled" — the Goldman Sachs, LinkedIn and Microsoft
company pages, `sql-query-checker` / `-optimizer`, the topic pages under
`/challenges/`, the `/questions/` hub, and 5 of 6 sampled question pages (one
not known to Bing at all). Blog posts and older company pages are indexed.
Google, same sample: all 12 indexed; site-wide 334 indexed (GSC data 09-18).

Bing is the channel that produces solvers (memory: bing-is-the-real-channel),
so Bing's gap is the one that costs.

## What the link graph actually showed

Measured from the built `public/` (every sitemap page, inbound internal links
from other sitemap pages):

| Group | n | min | median | before → after this pass |
|---|---|---|---|---|
| question pages | 299 | 1 → **7** | 6 → **10** | |
| topic pages `/challenges/*` | 12 | 15 | 78 | unchanged — already strong |
| `/questions/` hub | 1 | 310 | | unchanged — already strong |
| blog | 23 | 2 → 3 | 7 → **22** | |
| SQL tool pages (checker, explainer, optimizer) | 3 | 3–4 → **~300** | | |

So the first recommendation ("more internal links") was only half right. The
hubs Bing is not crawling (`/questions/`, `/challenges/*`) are already linked
from hundreds of pages, including `sql-exercises`, the page Bing crawls most.
But Bing last crawled `sql-exercises` on **2026-09-12** — the day before those
links existed. It has not re-read the hub that points at the new pages. The
two real problems:

1. **Bing has not re-crawled the pages that carry the new links.** A link
   Bing has not seen does not exist for Bing.
2. **The link graph under the hubs was lopsided.** "Related questions" picked
   the six same-skill questions nearest in difficulty, so a few low-id
   questions were related to everything and many to nothing; the tools and
   guides were linked from almost nowhere.

## Actions

| # | Action | State |
|---|---|---|
| 1 | Related questions as a ring: each question links the 3 before and 3 after it in its skill group (difficulty, id order), so every question gets six sibling links | **done** 09-23 |
| 2 | Breadcrumb links the topic page; every question links one topic guide (rotated across the skill's guides) and the three SQL tools in its footer; Capital One-tagged questions link the CodeSignal guide; the hub links the seven weakest guides | **done** 09-23 |
| 3 | `tests/link-graph.test.js`: no sitemap page under 2 inbound links, no question under 6, tools ≥ 50, every guide target live | **done** 09-23 |
| 4 | Recrawl signal: IndexNow for every changed page (no quota), and Bing URL Submission for the hubs Bing crawls (`/`, `sql-exercises`, `best-sql-practice-sites`, `/questions/`) so it re-reads the pages that carry the links | IndexNow on deploy; the four hubs on 09-24 (today's 100 went to the uncrawled pages) |
| 5 | Bing URL Submission for the remaining question pages, 100 a day — log in `docs/reads/bing-url-submissions.txt`; the next batch is every sitemap question URL not in that file | 99 sent 09-23; 224 left, 09-24 → 09-26 |
| 6 | Check crawl settings: Bing "Crawl Control" and whether IndexNow has been accepted for this host (the IndexNow panel) | 09-24 |
| 7 | Read on **2026-10-07**: `bing_indexed` (below) | scheduled |

Not doing: more pages. A new page on a domain Bing is already slow to crawl
is one more "discovered but not crawled". Not doing: noindexing question
pages — Google indexes them, and the pruning rule (docs/plans/seo-measurement)
forbids it before 2026-11-09.

## Read

Metric `bing_indexed` (docs/agent/metrics.md). Baseline 2026-09-23: 211
indexed of 342 known (405 in the sitemap). Target by 2026-10-07: **≥ 300
indexed**, and the sampled 09-13 pages ("Discovered but not crawled" today)
at least half indexed. If indexed is under 250 on 10-07, links and
submissions are not the constraint for Bing — the next question is page
quality as Bing sees it (the "SEO/GEO issues" warnings on 93 URLs), read
before building anything else.
