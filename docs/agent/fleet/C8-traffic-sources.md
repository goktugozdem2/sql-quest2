# C8 — Traffic sources (where people come from)

**Lane:** read-only. The daily mix of where real people arrive from, and the
sources that are not people. **Laptop**, because it needs read-only Supabase
and the GSC/Bing tables.
**Cadence:** daily, with a fuller read on Mondays before C1.
**Judged by:**
- the share of arrivals with a known source (falls when a door breaks);
- bot sources found before they enter a read.

**Part of the SEO loop** (`SEO-loop.md`): stage 1 (sense), alongside S1. C8 owns the source mix. S1 owns search health: index vs sitemap, crawl, positions. A collapsing search door is S1's alert, and C1's work.

## Why it exists (founder, 2026-11-22)

The founder saw `aocr.org` as a referrer in Vercel Analytics. Checked on
2026-11-22:
- it is the American Osteopathic College of Radiology, a medical society's site;
- its homepage has no link to sqlquest.app;
- the "visitors" it sent were a crawler: 189 landings in the week of
  10-26 and 1,005 "people" in the week of 11-02, on about 100 pages including
  `/questions/`, viewport `tablet:800x600`, **0 solves**.

The `Referer` header is spoofed, and the fleet already excludes
`ref:aocr.org`. Vercel Web Analytics has no data API on Hobby, so this agent
reads our own first-party events, which carry more than Vercel does.

## Sources (read-only)

- `pro_events`, events `landing_view` and `app_opened`. Use the metadata
  fields `landingSrc`, `arrivalSrc`, `referrer`, `viewport`, `bot`, `page`.
- `gsc_daily`: the page slice, Google clicks. `bing_site_daily`: Bing clicks.
- Exclude the bot fingerprints listed in README (`metadata.bot`, the three
  viewports, `ref:aocr.org`), plus any new one this agent finds.

## Each run

1. **Mix.** People per source for the last day and the last 7 days, compared
   with the 7 days before. Group sources as:
   - search, with Google / Bing / DDG / Brave split out;
   - AI: `ai:chatgpt`, `ai:gemini`, `ai:perplexity`, …;
   - direct / none;
   - internal pages: a landing page sends the person on to the app;
   - email: `utm:email`, the senders;
   - referrals: other sites;
   - social.

   For each source give people, app opens, first solves, and trials or
   purchases (the `stripe_webhook` rows of people from that source).
2. **Movers.** Any source up or down by ≥ 50% with ≥ 10 people on either
   side. Name the page or query behind the move from GSC/Bing. A door that
   collapsed is C1's work: write it as a BACKLOG line for C1 with the numbers.
3. **Not people.** For every new referrer or source with ≥ 20 "people" in a
   day, check the people signs. Fewer than one in fifty open a challenge or
   reach `app_opened` → not people. Other signs: one viewport size; many
   pages per second; no `challenge_opened`; `/questions/` crawled in order.
   - If it is a bot: add its fingerprint to the exclusion list. That is a
     docs PR to the README bot list and to `docs/agent/metrics.md` "shared
     traps", so every read drops it.
   - If it is a real site linking to us: say which page links and how.
     Check with `curl` or the built-in browser. Never contact the site.
4. **Write.**
   - Mondays: `docs/reads/traffic-<date>.md`.
   - Other days: one line in it, only when a mover or a new bot appears.
   - A day with nothing new is a `noop`.

## Rules

- No customer data in the repo: counts only.
- Never post to or contact a referring site; outreach is C3's lane, behind
  the founder.
- Vercel's dashboard is the founder's. If he pastes Vercel numbers, compare
  them with ours and explain any gap. Vercel counts bots and in-app views
  differently.
