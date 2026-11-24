# The SEO loop: measure → decide → act → verify → learn (2026-11-22)

The founder asked for an autonomous SEO setup ("seo için nasıl bir otonom
ajan kurgusu yapalım" — "evet kur"). Seven agents already touch search, and
until now each ran alone. This file ties them into one closed loop, so a
change is always measured and a drop is caught in days, not months. **Why:**
Bing's index grew from 163 to 830 URLs against a 422-URL sitemap, and Bing
clicks fell from 280 a week to 25. No one compared the index to the sitemap,
and B1's funnel read found the drop two months later.

## The loop

| Stage | Agent | Does | Cadence | Runtime |
|---|---|---|---|---|
| 1. Sense | **S1 SEO sentinel** (new) + C8 traffic | Health and trend checks; raises an alert on an anomaly | daily | laptop |
| 2. Find demand | C7 questions + R1 company research | What people ask; companies and topics with demand and no answer | daily | cloud / laptop |
| 3. Decide | **C1 search (the captain)** | One ranked work list for the week, scored by expected clicks × ease. Each item gets a ledger claim | Monday | laptop (reads) |
| 4. Act | C2 page content, B3 question bank, C1 technical | Strengthen existing pages first; a new page is the exception | Tue–Fri | cloud |
| 5. Be found off-site | C3 backlinks + G1 GEO | Earn mentions on the pages assistants cite; the GEO panel | daily / Wednesday | laptop |
| 6. Verify | A1/A0 at merge; S1 after deploy | Live, 200, indexable, in the sitemap; read on day 14 and day 28 | per change | both |
| 7. Learn | B2 measurement + D2 retro | Verdicts on the claims; lessons go into `docs/playbook/builder-playbook.md`; reverts | Fri / Mon | laptop / cloud |

## Rules of the loop

1. **Health before growth.** S1 raises a **red** state when any one of these
   holds:
   - indexed URLs above 1.3 × the sitemap on either engine;
   - weekly clicks on one engine down more than 30% week on week, with at
     least 50 clicks in the earlier week;
   - crawl errors or non-200 pages among the top 20 pages;
   - a robots or canonical change that blocks or forks a content page.

   While the state is red, no new page ships. C1's list for that week is the
   root cause and its fix.
2. **A new page is the last resort.** First strengthen what exists: the
   title and description, an answer-first summary, internal links, depth. A
   new page needs a query with ≥ 150 impressions in 28 days landing on an
   unrelated page of ours (the rollup case). Bing's 2026 guidelines target
   content produced at scale without editorial oversight.
3. **Every page is measured and can leave.** A new or rewritten page carries
   a 28-day claim. A page that misses its claim twice is merged into a
   stronger page or noindexed through `src/data/seo-prune.json`. Thin pages
   are not left standing.
4. **One change per page per two weeks.** If two changes land on the same
   page in the same window, neither can be read.
5. **Dated sources only.** The CLAUDE.md rules stand: no frequency claims, no
   company facts without a dated source, no snippet-only facts.
6. **The founder's part is one list a week.** On Mondays C1 hands him the
   URLs to request indexing for in GSC and Bing, in order, at most 10. No
   agent touches the consoles.
   **Amended 2026-11-23 (founder):** the list now comes from
   `scripts/index-queue.mjs` (rules: `docs/plans/indexing-queue-2026-11-23.md`),
   and S1's daily indexing step may press "Request indexing" for that list
   through Claude in Chrome. No other console action by an agent.

## Judged by

- **Weekly organic clicks**: Google + Bing + `ai:*` landings, trailing 4
  weeks. Owner: C1, for the whole loop.
- Health: indexed URLs per sitemap URL on each engine, kept between 0.9 and
  1.3. Owner: S1.
- Share of voice on the GEO panel. Owner: G1.
