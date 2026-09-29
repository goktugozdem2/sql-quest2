# SEO, October 2026 — deepen the practice door and the company pages

Founder's decisions, 2026-09-29 (chat): **(6)** the comparison pages stay as
they are — 8 pages, 4,366 impressions / 60 clicks in two weeks, almost all
people searching for the competitor by name; no work goes there. **(7)** no
blog posts at head terms ("cte sql", "sql joins", "sql group by" sit at
position 40–70 on Google); the month goes to `/sql-exercises/` and the company
pages, which already rank and already sell (docs/reads/seo-weekly-2026-09-28.md).

The reason in one line: last week Bing sent 292 clicks and Google 209, and
Bing's top five queries are all "sql practice / exercises / questions" — the
door is `/sql-exercises/`, which Google ranks at 15 and Bing at 4–8. The
pages that sell are the company pages (87 clicks / two weeks, the only group
whose visitors have bought).

## 1. `/sql-exercises/` — the practice door (week of 10-01)

- **"With solutions" section.** "sql practice exercises with solutions"
  converts at 20% CTR from position 18 (Google) and "sql practice problems"
  at 27% (Bing). Add a section of five worked exercises on the page itself —
  free-tier challenges only, the free-tier solution shown in full, never a
  Pro challenge, never a hint text (the question-pages rule in CLAUDE.md
  applies: `tests/question-pages.test.js` pins it for `/questions/`; add the
  same guard for this section). Each links to its `/questions/` page and the
  app.
- **Per-topic intro lines** under `#by-topic`, one sentence each naming the
  trap the topic's exercises teach, with a link to the matching trap page
  where one exists (five of nine).
- Title/meta: the copy agent's "(10 Free Solves)" title stays until the
  snippet read; the description gains "with solutions".
- Read 10-27 with the question pages: `/sql-exercises/` clicks and position
  on Google for the "exercises / practice" family (28 d: 389 imp, 18 clicks,
  pos 15.4) and Bing's five queries. Target: Google position ≤ 10 for "sql
  exercises", clicks ≥ 40 / 28 d.

## 2. Company pages — the pages that sell

- **10-12, first job: Capital One** (docs/plans/capital-one-2026-10-12.md).
  Nothing on that page before.
- **10-23: the Shopify title read** decides the shape for all 30. If the
  "(2026): N Practice Problems" title lifts CTR (293 imp / 0 clicks / pos 6.7
  in the 28 d before; Google recrawl requested 09-29), roll the same shape
  through `build-company-pages.mjs` for the seven generated pages and the
  top-traffic hand-written ones (Revolut, Wise, Snowflake, JPMorgan, Meta,
  Amazon) in one commit, guarded by site-counts. If it does not, the title
  stays and the lever is the practice-set block, not the snippet.
- **Every company page gets a "practise it" line above the fold** linking to
  its tagged set in the app (the company-set gate is live: the first three
  free) — after the 10-12 Capital One branch is chosen, so the read there is
  not confounded.
- Read: `company` group in gsc_daily (two weeks to 09-27: 1,255 imp / 87
  clicks / pos 10.5) on 11-02 — target 120 clicks / two weeks — and, on the
  money side, `pattern_to_checkout` + `interview_locked` asks with a company
  topic.

## 3. Question pages and trap pages — read before touching

- **10-23:** trap pages (5, indexed 09-25; 19 imp / 0 clicks in two days).
  Pass = ≥ 2 in the top 20 and ≥ 500 impressions → the next five patterns.
- **10-27:** question pages (305 indexed, 204 in the top 10, 26 clicks / two
  weeks). If CTR stays under 1.5% at position ≤ 10, the lever is the
  generator's title/description template — one change for 300 pages, made
  after the read, never before.

## 4. Snippets — done 09-29, read 10-27

Five zero-click pages rewritten (title + description only):
/practice-sql-no-setup/ (pos 3.9, 0 clicks), /blog/recursive-cte-explained/,
/blog/window-functions-tutorial/, /blog/sql-running-total/,
/challenges/aggregation/. Read on the same 10-27 date: clicks > 0 and CTR ≥ 1%
at unchanged position. A page still at zero clicks at position ≤ 5 after the
rewrite is a content mismatch, not a snippet problem.

## 5. Plumbing

- The five rewritten snippets need a recrawl to show: request indexing for
  them on **10-01** (≥ 24 h after the 09-29 batch — the quota is a rolling
  window, memory `gsc-request-indexing-recipe`), never in the same batch.
- Google indexing requests 09-29: 7/7 queued. Check `gsc_index_status` after
  the 10-05 inspect run; anything still "discovered, not indexed" gets a
  second request 10-06 (24 h after the last request, never sooner).
- `weekly-seo-dashboard` (Mondays 10:00) hung on 09-28 and wrote nothing;
  the 09-28 read was written by hand. If the 10-05 run hangs again, the task
  is rewritten to read Google from `gsc_daily` (no browser) and Bing by hand.
- Bing: Webmaster Tools `read-bing-indexed-1007` stands (10-07).

## Not doing in October

Comparison pages; head-term blog posts; a new company page; any change to
`/questions/` before 10-27; any change to Capital One before 10-12.
