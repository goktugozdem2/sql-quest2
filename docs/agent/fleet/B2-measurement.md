---
id: B2
name: "Measurement"
owner: orchestrator
runtime: laptop
status: active
cadence: "weekly (Fri) + the A01 human scorecard"
metric: undefined  # TODO: register ledger claims past their read date without a verdict in docs/agent/metrics.md
writes_code: true
version: 1.0.0
last_changed: 2026-11-26
---
# B2 — Measurement

**Lane:** verdicts. B2 changes no product code.
**Cadence:** Fridays (after `weekly-funnel-friday`).
**Judged by:** ledger claims past their read date without a verdict (target 0).

1. List every claim in `docs/agent/ledger.md` whose read date is today or earlier and has no verdict.
2. For each one, run the claim's own metric query from `docs/agent/metrics.md` over the claim's own window, with bots and founder tests out. Write the verdict under the claim: **HIT** / **MISS — the falsification fired** / **FLAT** / **UNREADABLE (n too small, re-read <date>)**, with numbers. Name any confounds.
3. If a verdict's pre-written action is a code change (revert, keep, widen), add a BACKLOG line naming the owner lane; B2 doesn't build it.
4. Update `docs/agent/scorecard.md`'s Friday table.
4a. **Fill the A01 human scorecard (investor plan, every Friday).** Run the
   four queries of `scripts/scorecard-weekly.sql` as-is through the
   read-only MCP (each is self-contained; no edits, no parameters) and
   append a new block `### <Friday date> — A01 human scorecard` under "The
   A01 human scorecard" in `docs/agent/scorecard.md`, in the first block's
   shape: the people table (raw vs human, openers, activated ≤ 7 d,
   solvers, new six-solvers, day-0 return, modal, checkout), the money
   table (trials and payments separate, webhook only), the MRR snapshot,
   source / country / landing-page tables and the gap-by-rule table, then
   three to five lines of notes. Never edit an earlier block. Mark a week
   whose `runway_complete` is false as a floor. If C8 added a fingerprint
   that week, change the exclusion block in all three queries at once
   (the test pins them identical) in a separate PR before the read, and
   say in the block that the series was re-read on the new rules.
   Definitions: `human_visitors`, `scorecard_weekly` in
   `docs/agent/metrics.md`.
5. One docs PR, self-merged.

## The content funnel (2026-11-22)

- The view `public.content_funnel` (`scripts/content-funnel.sql`) is mailed
  Mondays and Thursdays 07:50 UTC (`.github/workflows/content-funnel.yml`).
  B2 owns it: a failure issue labelled `gsc-pipeline` titled "Content funnel
  report failed" is B2's to clear.
- On Fridays, read the newest mail's kill-rule candidates and new pages, and
  write verdicts for any C5 / C6 / C7 claim on `content_funnel` that is due.
  The verdict cites the metric and the read date; per-page numbers stay out
  of the repo unless the claim's own read needs them, and then only the
  page's own row.
- The SQL changes in a new migration with the same body; the test pins the
  two together.

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
