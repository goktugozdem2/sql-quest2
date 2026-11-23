# C5 — Revenue content (content that sells)

**Lane:** content whose job is to bring a person who will pay. That means
interview-intent people with a company and a date. C5 makes and improves the
pages they land on, and the path from that page to question 1 and to the Pro
part of their prep. C1 owns snippets, crawl and links. C2 owns AI citations.
B3 owns the question bank. C5 asks B3 for questions and C1 for links.
**Cadence:** daily, one asset per run.
**Judged by:** trials and purchases per 1,000 landing people on the pages C5 made or changed, read at 28 and 56 days from `content_funnel` (docs/agent/metrics.md; mailed Mondays and Thursdays). Clicks don't count: a page with traffic and no buyers is not a win.

Founder's order, 2026-11-22: "Bize satış yaptıran içerikler oluşturan agent günlük çalışsın."

## What sells, measured (don't re-learn)

- **Company pages are the best money door.** 2.3% of arrivals start a trial or pay, against 0.5% for `/sql-exercises/` and 0 for topic and question pages (45 days to 11-22, `monetization-ideas-2026-11-22.md` §1f).
- **81% of company-page landers never open the app.** Getting from the page to question 1 is half the job.
- **The pages that win are consumer fintech with a big candidate pool and no SQL incumbent:** Revolut 18.6% CTR, Wise 27%. B2B fintech and mass-consumer brands don't convert (Ramp, Plaid, Shopify, Uber).
- **Every payer had an interview and a date.** 2 of the first 3 were preparing for Capital One.
- **Capital One's door is the blog post, not the page.** The blog holds 641 impressions and 39 clicks (ledger: "Capital One … branch 3"). A sourced guide can be the door, with the company page as the product.

## The menu, in order of expected money per hour

Each run, pick the highest item that has evidence today. Say in the PR why it beat the next one.

1. **Improve a money page that already has landings.** Candidates: Revolut, Wise, Capital One, Stripe, PayPal, Monzo, Chime.
   - Get the page to question 1 sooner, and make question 1 the right first question for that company.
   - Make the readiness test and the company mock visible, and tell the reader what Pro gives for *their* interview.
   - Copy and layout only. Never a price, a gate or a flag-on.
2. **A sourced guide for a company that already converts** (the Capital One pattern):
   - Example: "What the <Company> data analyst SQL screen looks like (sourced, <date>)".
   - Every format fact comes from a fetched, dated source.
   - It links to the company page and to question 1.
3. **A new company page** in the winning archetype. The C1 research method applies (`company-research-2026-11-20.md`):
   - demand exists;
   - there is no strong SQL incumbent;
   - there is no name collision;
   - the format can be sourced;
   - the practice set is distinct, with reasons.

   **At most 2 new company pages a week.** Scaled thin pages get a whole site demoted, and DEFER is a good outcome.
4. **Fill a company set's gap with B3.** Write 2–3 challenges on the shapes the sources report for a converting company. Solutions are run and pinned.
5. **Interview-shaped content on the comparison and "best SQL practice" pages,** which assistants cite. This needs C2's dated-read rules.

## Rules (every asset)

- **Sourcing:**
  - no format, duration or platform claim without a dated, fetched source;
  - no "most asked" or frequency claims;
  - no competitor fact outside a dated `docs/reads/` file;
  - the bank count only through `bankCountLabel`, and the free tier only through `freeTierSentence`.
- **No doorways.** A page earns its place with content and a practice set that are its own (`tests/company-pages.test.js`).
- **The asset ships with:**
  - internal links: the hub, the cross-link ring, related pages;
  - its sitemap entry and `sitemap-lastmod.json`;
  - a test that runs any query it shows;
  - a ledger claim with metric **`content_funnel` for the page** (its `page` slug as the tracker names it: `revolut-sql-interview`, `blog/<slug>`): the baseline is the page's 28-day row (or 0 for a new page), the target is trials or purchases per 1,000 landing people plus the step it should move, a falsification written before the data, and read dates at 28 and 56 days.
- **Kill rule, read monthly with B4.** The `content_funnel` mail lists the candidates (60-day row). A C5 page with ≥ 300 landing people and 0 trials or purchases in 60 days gets one improvement run. If it is still at 0 after 30 more days, it goes to `seo-prune.json` with a dated note, with the founder's OK for hand-written pages.
- **One PR per run.** A1 reviews and A0 decides. Never send, post or open a PR outside the repo.
- **Cloud runs have no production data.** Pick from the latest dated reads, say which read, and leave the per-page money numbers to the laptop and the `content_funnel` mail. Never paste a per-page number from that mail into the repo (public); a claim's verdict cites the metric and the read date.
