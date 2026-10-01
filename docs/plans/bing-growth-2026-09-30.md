# Bing — where it stands and how to grow it (2026-09-30)

Founder: "bingi nasıl geliştiririz analiz et". Sources: Bing Webmaster Tools
read 2026-09-30 (Search Performance 3 months, Site Explorer 6 months,
Recommendations, Backlinks, AI Performance) and `pro_events` (new people by
first `app_opened.landingSrc`, 28 days, crawler excluded).

## What Bing is for us

| First touch, 28 d | New people | Solve in 10 min | Ever solved | Signed up | Saw price | Went to Stripe | Paid |
|---|---|---|---|---|---|---|---|
| Bing | 342 | **28.4%** | 44.2% | 15.8% | 82 | 3 | 0 |
| Google | 343 | 20.7% | 38.5% | 19.2% | 69 | 5 | 0 |
| No referrer | 402 | 12.4% | 25.1% | 10.7% | 52 | 5 | 0 |

Bing sends as many people as Google and they activate best. Two facts shape
everything else:

- **One page carries it.** `/sql-exercises/` is 771 of ~1,200 Bing clicks in
  six months (64%) and 16.0K of 28.5K impressions; 268 of the 342 Bing
  arrivals (78%) came through it. The homepage is second (185 clicks), then
  best-sql-practice-sites (40) and Snowflake (34). The 30 company pages, the
  12 topic pages and the 305 question pages together are a rounding error on
  Bing.
- **It is mostly India.** 166 of those 268 (62%) have an Indian time zone —
  the audience the $9 / $39 price (live 09-26) and the USD checkout (live
  09-30) were built for. Bing × India is the segment to read first.

## What Bing itself says

- **Keywords (3 months):** "sql practice" 2.1K impressions, position 7.7,
  CTR 1.55% (32 clicks) · "sql practice questions" 1.7K, 6.5, 4.2% (70) ·
  "sql practice exercises" 911, 5.2, 8.5% (77) · "sql exercises" 588, 3.7,
  9.2% (54) · "sql exercises for practice" 97, 4.1, 17.5%. The biggest
  query is the one we rank worst for.
- **Index:** 443 URLs known, 269 indexed (211 on 09-23), 176 warning, 30
  excluded. 116 sitemap URLs still unsubmitted after the 09-29 batch.
- **Recommendations:** "Title too long" — High, 21 pages flagged; measured
  on our side: **321 of 412 sitemap pages have a title over 70 characters**
  (237 of 305 question pages, 27 of 30 company pages, `/sql-exercises/` at
  86). "Limited crawl capacity" — High. "Lacks inbound links from
  high-quality domains" — Moderate.
- **Backlinks:** 2 referring domains (dbsilk.com, x.com).
- **Copilot citations (AI Performance):** 24K in three months and rising —
  ~200 a day in August, 1.2K–1.8K a day in the last week. Top grounding
  queries: "sql practice exercises" 1.3K (21% citation share), "cte sql"
  1.2K, "sql exercises" 957, "sql interview preparation" 446 (30% share).
  A citation is not a click; these arrive, when they do, with no referrer.

## The levers, in order

1. **Win "sql practice".** 2.1K impressions at position 7.7. At the CTR the
   page already earns at position 5 (8.5%) that one query is ~180 clicks a
   quarter instead of 32. The page: `/sql-exercises/` — title to ≤ 65
   characters leading with the phrase, the "with solutions" section and the
   per-topic lines from docs/plans/seo-october-2026-09-29.md §1.
2. **Titles under 70 characters.** One template change covers the 237
   question pages (`build-question-pages.mjs`), one the company pages; the
   hand-written top pages individually. Conflicts with "no change to
   `/questions/` before the 10-27 read" — founder's call (below).
3. **Get the rest indexed and keep it fresh.** Finish URL Submission (116
   left: 86 non-question pages first), and run IndexNow automatically after
   every deploy instead of by hand.
4. **Spread the load off one page.** Topic pages (`/challenges/*`) rank on
   Google and barely appear on Bing; they answer the same "sql … practice"
   family per topic. Same title discipline + links from `/sql-exercises/`
   `#by-topic` (already there) — read after indexing.
5. **Authority.** Two referring domains. The prepared open dataset (GitHub +
   Kaggle notebook), the bootcamp/university outreach (each partner page is
   a link), and one honest listing on each SQL-resources list. Founder-side.
6. **Make citations pay.** The cited pages must put a runnable question and
   a Start button above the fold; measure no-referrer arrivals on those
   pages against citation volume (memory: genai-recommendation-channel).

## The API pipeline (built 2026-10-01, waits on the key)

Until now every Bing number was read by hand in the dashboard and every URL
batch was pasted into a dialog. `scripts/bing/` is the same shape as the
Search Console pipeline, on the Bing Webmaster API (one API key per Microsoft
account, JSON over HTTPS), run by `.github/workflows/bing.yml`:

| Script | When | Writes | Replaces |
|---|---|---|---|
| `fetch.mjs` | daily 06:30 UTC | `bing_site_daily`, `bing_stats` (query / page / query×page for the 30 most-seen pages), `bing_crawl_daily` | the Search Performance screen, read by hand |
| `inspect.mjs` | Mondays 05:30 | `bing_url_status` — every sitemap URL: last crawl, HTTP status, discovery | the 12-URL URL-Inspection sample |
| `submit.mjs` | Mondays, after inspect | `bing_submissions`; sends never-crawled and crawled-before-the-change URLs, ≤ 100, inside the API's quota, never twice in 14 days | the pasted batches of 09-23 → 10-01 |
| `report.mjs` | Mondays 07:15 | the weekly Bing mail | the hand-written Bing half of the weekly SEO read |

What each lever above reads from it:

- **Lever 1 ("sql practice")** — the report's "door" section: `/sql-exercises/`'s
  own queries with impressions, clicks and position, week over week. The
  title and the solutions section shipped 09-30; this is where their effect
  shows, query by query, instead of one page-level CTR.
- **Lever 2 (titles)** — "in the top 10, no clicks": pages Bing already ranks
  that nobody clicks. That list, not the 321-titles-over-70 count, says
  which titles to rewrite first.
- **Lever 3 (indexing)** — `bing_crawl_daily.in_index` is Bing's own count,
  daily; `bing_url_status` names the URLs behind the gap. The submitter acts
  on it without anyone opening a browser.
- **Lever 4 (spread)** — the door's share of page clicks, in every report
  (64% → under 50% by 11-15).
- **Levers 5–6** are not in the API: backlinks are read with
  `GetLinkCounts` only on demand, and Copilot citations (AI Performance)
  have no API at all — that panel stays a hand read.

Three things the first live run must settle (the API reference is from 2019
and silent on them); `scripts/bing/verify.mjs` prints what is needed:

1. the scale of `AvgImpressionPosition` — compare one query with the dashboard;
2. whether query/page rows are daily or weekly buckets (the reference says
   only "updated every week") — the report reads 28 days either way;
3. whether `GetUrlInfo` wants its `url` parameter plain or JSON-quoted
   (`QUOTE_STRING_PARAMS` in `scripts/bing/api.mjs`).

Founder's three steps, once: generate the key (Webmaster Tools → Settings →
API access), `gh secret set BING_WMT_KEY`, and apply
`supabase/migrations/20261001100000_bing_tables.sql`.

## Reads

- Weekly: Bing clicks/impressions (hand), `/sql-exercises/` share of Bing
  clicks (64% now — target under 50% by 11-15), position of "sql practice"
  (7.7 → ≤ 5), indexed count (269 → 380).
- Money: Bing × India — modal → Stripe → paid, from 09-30 (`via='session'`).
