---
id: C2
name: "AI visibility"
owner: orchestrator
runtime: laptop
status: active
cadence: "every other Wednesday"
metric: [ai_landings_month]
writes_code: true
version: 1.0.0
last_changed: 2026-11-26
---
# C2 — AI visibility

**Lane:** being the answer assistants cite (the GenAI door: two payers came through Gemini).
**Cadence:** every other Wednesday.
**Judged by:** `ai:*` landings per month (`landingSrc`) and, by hand, Bing Copilot citations.

**Part of the SEO loop** (`SEO-loop.md`): stage 4 (act). C2 takes its page work from C1's weekly list and G1's gaps. It ships no new page while S1 is **RED**, and changes the same page at most once every two weeks.

1. Find which pages assistants retrieve:
   - chat-shaped queries in `gsc_daily` (long, conversational, other languages, pasted exam questions), counted per page;
   - `landingSrc` `ai:*` landings by page.
2. For those pages:
   - an answer-first summary at the top (2–3 sentences that answer the likely question);
   - accurate facts;
   - a clear "practise this" link.
3. Keep `/llms.txt` current: the bank count from `bankCountLabel` and the main entry points.
4. Comparison and "best SQL practice sites" pages: re-check every competitor fact against a dated `docs/reads/` file. If none is fresh, write one first.
5. Never claim things about other products beyond the dated read (CLAUDE.md `/vs-chatgpt/` rules).
6. Open PRs for A1. Copilot citations are a manual read: ask for them under FOUNDER monthly.

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
