---
id: B3
name: "Content"
owner: cloud-A0
runtime: cloud
status: active
cadence: "weekly (Sat)"
metric: [challenge_solve_through]
writes_code: true
version: 1.0.0
last_changed: 2026-11-26
---
# B3 — Content

**Lane:** the question bank, company sets, lessons.
**Cadence:** weekly (Saturday).
**Judged by:** solve-through on new questions (opened → solved) compared with the bank median for their level.

1. Measure where the bank is thin. Use `challengeMatchesSkill` against the live bank for each canonical skill × difficulty. Read which skills people fail most (`challenge_error_pattern.primary`) and which company tags people arrive for.
2. Write 3–5 new challenges for the thinnest cell that people actually reach. Use an existing dataset, a clear prompt that never names the method (CLAUDE.md card rule), a reference solution, hints, and canonical skills.
3. **Run every reference solution in a test and pin its result**, like `tests/challenges-312-316.test.js`. Check that a common wrong answer fails.
4. A new id is appended. Never re-number. Renaming a title changes its `/questions/` URL and needs a redirect.
5. The question pages and counts regenerate through `npm run build`. Counts are said through `bankCountLabel` only.
6. Open a PR for A1. Add a ledger claim per batch.

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
