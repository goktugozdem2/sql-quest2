---
id: B5
name: "Onboarding (arrival → first run → first solve → day 2)"
owner: orchestrator
runtime: laptop
status: active
cadence: "weekly (Thu), one experiment at a time"
metric: [open_to_first_run, first_solve_10m, second_session_7d]
writes_code: true
version: 1.0.0
last_changed: 2026-11-26
---
# B5 — Onboarding (arrival → first run → first solve → day 2)

**Lane:** a new person's first session and their return the next day: the first
screen, the first challenge, the first run, the first solve, the 3-solve
point, the account ask, and the day-2 return. B1 owns the funnel from the
quota wall to paid, and A4 owns layout. B5 owns *what a new person is asked to do
and in what order*.
**Cadence:** weekly (Thursday), one experiment at a time.
**Judged by:**
- `open_to_first_run` (11-08 → 11-21: 44% of openers ran a query)
- `first_solve_10m`
- day-2 return (`second_session_7d`)

Founder's order, 2026-11-22: "Müşteri onboardingi geliştirmek için de bir ajan lazım."

## What is already known (don't re-learn it)

- **The first-run leak (activation read, BACKLOG 11-22).** 394 openers → 271 opened a challenge → 119 ran a query (44%) → 98 solved (82% of runners). The leak is the first run, not the solve. Three causes are already fixed (#99, #100, #101); they read on 12-20.
- **Returns fell.** The 11-02 cohort came back on a later day at 4–7%, against 23% for the 09-21 cohort (funnel-2026-11-22.md §1).
- **Activation flag queue rows 3, 6 and 7 are paused** until 12-20 (BACKLOG decision 11-22). Don't flip them.
- **What failed before** (ledger):
  - the placement quiz as the first screen;
  - a required goal gate (off the same night);
  - asking more questions before the first solve.

## The run

1. **Read.** The weekly onboarding table, by arrival door (company page, `/sql-exercises/`, home, blog, ai:*), with bots and founder tests out:
   - arrival → challenge opened → first run → first solve → 3 solves → account → day-2 return;
   - median time to first run and to first solve.

   Write it to `docs/reads/onboarding-<date>.md`, with the same columns every week.
2. **Pick the step** that loses the most people at one door. Read the ledger first and never repeat a falsified idea.
3. **Watch it.**
   - Walk that door's first session in headless Chromium at 375 and 1366 (A4's harness helpers).
   - Write down every moment a new person must read, decide or wait before the first run.
   - Use `stuck` feedback (E2) as a source.
4. **One experiment.**
   - A hypothesis.
   - An A/B by aid with a murmur-finalised hash (`companyAskArm`).
   - A metric from metrics.md, a minimum n and a stop rule written before the data.
   - Built behind a flag, with a test proven by a deliberate break. The PR goes to A1, then A0.
   - At most one onboarding experiment live at a time.
   - Never two experiments that touch the first screen at once (B1's arms included).
5. **Verdict** at the stop rule: ship the winner, remove the loser, record it in the ledger.

## Never

- Add a question before the first run.
- Gate the first challenge.
- Change the free quota, a price or the paywall. Those belong to B1/B4 and the founder.
- Read the `home` door as brand alone (CLAUDE.md: AI assistants land there).

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
