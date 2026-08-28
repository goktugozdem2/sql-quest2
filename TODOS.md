# SQL Quest — Deferred Work

Items deferred from the CEO plan review (2026-04-12). Revisit after 2-week conversion measurement.

## Immediate Repo Health

These are not product expansion bets. They are maintenance items that reduce release risk for the current React/Vite app.

- [x] **Install-and-test baseline**
  - Add a short "Local verification" section to `README.md` with supported Node.js/npm versions and the canonical commands: `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build`, `npm run build:validate`.
  - Confirm a clean checkout can run those commands with no globally installed project tools.
  - Acceptance: README commands match `package.json`, and a new contributor can verify the repo from scratch.

- [x] **Simplify the build script**
  - Move the long chained `cp`/`mkdir` sequence from `package.json` into a Node script, for example `scripts/build-static-pages.js`.
  - Store static page mappings in one array/object inside that script, including root files and directory `index.html` copies.
  - Update `npm run build` to call the new script after CSS, Vite, and data bundling.
  - Acceptance: `npm run build` still produces the same public page URLs, and adding a page requires editing one data structure instead of the package script.

- [x] **Keep Vite dev/build data lists in sync**
  - Extract the shared data-file order from `vite.config.js` and `scripts/bundle-data.js` into one module, for example `scripts/data-files.js`.
  - Use that shared list for Vite dev `/data.js` generation and production `public/data.js` bundling.
  - Include `challenge-companies.js` and `finans-fraud-data.js` consistently in both paths.
  - Acceptance: dev mode and production build expose the same `window.*` data globals.

- [x] **Add build output validation to CI**
  - Add a GitHub Actions workflow that runs `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build`, and `npm run build:validate`.
  - Add a size/sanity check for generated `public/app.js`, `public/data.js`, `public/styles.css`, and the key app/landing pages.
  - Acceptance: pushes and PRs fail when tests, lint, build, or required public artifacts break.

- [ ] **Reduce `src/app.jsx` blast radius**
  - Extract AI tutor request/state handling into a small utility or hook with unit tests.
  - Extract auth/pro-status helpers next, keeping storage keys and Supabase behavior unchanged.
  - Extract challenge execution/formatting only after the first two extractions are covered by tests.
  - Acceptance: each extraction reduces `src/app.jsx` size, preserves UI behavior, and adds focused tests under `tests/`.

- [x] **Harden AI tutor proxy usage**
  - Choose one supported production path: Supabase Edge Function (`ai-tutor.ts`) or Vercel API route (`api/chat.js`).
  - Update docs so setup, environment variables, rate limits, and frontend calls describe only the chosen path.
  - Remove or clearly mark the unused proxy as legacy/deprecated.
  - Acceptance: there is one documented AI tutor deployment flow and one source of truth for daily usage limits.

- [x] **Audit generated/public artifacts**
  - Decide whether `public/app.js`, `public/data.js`, `public/styles.css`, and `dist/` are committed release artifacts or local build outputs.
  - Update `.gitignore` and README to match that decision.
  - If artifacts stay committed, document when to rebuild and commit them.
  - Acceptance: builds do not create unexplained git churn, and deploys use a documented artifact policy.

- [ ] **Expand tests around monetization and account state**
  - Add tests for Pro activation refresh, pending subscription claiming, referral attribution persistence, and AI usage-limit display.
  - Mock Supabase/network boundaries; do not require live Supabase or Stripe for unit tests.
  - Add one smoke test that verifies logged-out, free, and Pro user states render the expected gating copy.
  - Acceptance: monetization/account regressions are caught by `npm test -- --run` without external services.

## Gate: Conversion Data Required

These items were accepted during scope review but deferred by outside voice challenge. Ship them only after the $19/mo payment link has been live for 2 weeks and conversion data exists.

- [ ] **Struggle map visualization** — per-user mastery vs. weakness view by SQL concept, powered by tutor instrumentation data
- [ ] **Weekly progress emails** — via Resend: challenge count, speed improvement, weakest concept
- [ ] **Shareable completion certificates** — HTML-to-image or canvas-based, shareable on LinkedIn
- [ ] **Aggregate struggle analytics** — admin dashboard: which SQL concepts cause the most tutor interventions
- [ ] **Social proof counter** — live counter on landing page ("12,847 queries solved today")

## Competitive Analysis Candidates (2026-07-17, DataCamp study)

Ideas extracted from the DataCamp retention + AI teardown. Not urgent; pick up
in the next retention/monetization tour. Context: streak P0-P3 shipped
2026-07-16/17, tutor usage correlates with checkout (2/2 named clickers were
tutor users), AI tutor free cap is 10/day and rarely visible to users.

- [ ] **Measurement-as-event** — the skill radar updates passively; DataCamp makes
  re-assessment a scheduled ritual ("retake, see your improvement", 2x/week cap).
  Surface Coach mastery/retrieval checks as invited events: "Re-measure your
  Window Functions — 3 weeks since last check." Optional percentile vs other
  users for the identity layer. Infra exists (mastery_check/retrieval_check
  step types in coach.js).
- [ ] **Visible goal progress %** — Coach goals show steps, not percent.
  "63% of Fundamentals done" makes sunk cost visible (DataCamp track bars).
  Data already in coachState.stepsCompleted / goals.js step counts.
- [ ] **One-click "why is this wrong?"** — failed submit already produces a
  structured diagnosis (diagnose.js); a single button that feeds it + the user
  query to the AI tutor removes the typing barrier at the exact stuck moment.
  Tutor entry is a purchase precursor — friction here is revenue friction.
- [ ] **Visible AI quota** — "7/10 tutor calls left today" in the tutor UI.
  Free generosity is currently invisible; showing the meter makes the value
  felt AND warms near-limit users toward the unlimited-Pro pitch. (Contrast:
  DataCamp's DataLab free tier is 15 requests LIFETIME.)
- [ ] **Streak dose lever (watch, don't build)** — our streak bar is 1 solve/day
  (right for reviving a dead counter); DataCamp requires 250 XP (~4 exercises).
  If §7 cohort data shows streaks getting cheap (everyone saving the day with
  one trivial Easy), raise the bar to a dosed threshold.

## Gate: Phase 1 Complete

These are Phase 2 items that unlock after conversion validates.

- [ ] **Full Stripe subscription system** — webhooks, customer portal, plan switching, cancellation UI
- [ ] **Full tutor instrumentation schema** — intervention_type, trigger, failed_attempts, time_on_problem_ms, session_id, ai_model_version, resulted_in_correct_answer (requires stateful event correlation: log on challenge completion, check if AI was consulted)
- [ ] **Tutor analytics dashboard** — which interventions correlate with return visits
- [ ] **Auto-trigger tutor on struggle** — offer AI help after 2 failed queries (TUTOR_FAIL_THRESHOLD) or 90s idle (TUTOR_TIME_THRESHOLD_MS). Currently tutor is 100% user-initiated. Auto-trigger is the "struggle detection" that makes the tutor contextual. Depends on tutor instrumentation being in place. Design doc has the trigger spec.

## Infrastructure (from original plan.md)

Deferred per revised premise #1. Not blocking revenue.

- [ ] Full ESLint across monolith (new code only is Phase 1)
- [ ] Build pipeline improvements (source maps, watch mode, concurrent builds)
- [ ] Full code splitting of app.jsx
- [ ] Build validation (size checks, smoke tests)

## Out of Scope

- Mobile app
- Enterprise/team licenses
- Streak/guilt-based retention mechanics

## Design review 2026-08-26 — paywall surfaces

- [ ] **Curate the 6 free Hard previews.** Current set (ids 11, 50, 86, 23, 24,
  30) is 3 CTE + 3 Window — zero Joins, chosen before any data existed. Re-pick
  by live solve-through + skill diversity (at least 1 Joins). The shop window
  is a sales tool; its contents should be chosen, not incidental. Good size for
  the content-fix agent. Depends on: pro_events solve data (exists).
- [ ] **Light-mode pass for preview surfaces.** Preview blue, banner, and
  dialog need explicit light-token equivalents (start from --sql-keyword
  #0B5FB8), each verified ≥ 4.5:1. Until then these surfaces are dark-first by
  design, not by neglect. Depends on: paywall-surfaces PR landing.

- [ ] **Order-insensitive grading when no ORDER BY is required.** Payer #2's
  only product complaint (2026-08-28, in writing): "The grader is too strict
  sometimes on ordering. Some questions prompts don't specify the correct
  order." Confirmed in code: every grader compares `JSON.stringify(values)`
  strictly — main challenge (`src/app.jsx` ~20128-20134), speed run (~7687-90),
  interview (~8862-65), daily (~19233-36), foundation compare — so row order
  always matters even when neither prompt nor solution has an ORDER BY. Fix
  direction: if the challenge's solution SQL contains no top-level ORDER BY,
  sort both row sets canonically before comparing (one shared helper, used by
  all grading sites — don't fix one site and let the others grow back, that's
  the challenge-order lesson). Watch: `challenge_errored` / give-up rows may
  partly be this. A correct-but-rejected answer is the worst possible grading
  bug for trust.

- [ ] **Self-serve subscription cancellation.** Payer #2 had to email to
  cancel (2026-08-27, screenshot in thread) — there is no cancel path in the
  app. Cheapest fix: enable Stripe's no-code Customer Portal and link
  "Manage subscription" from the Pro/account area. US customers make this a
  click-to-cancel (FTC) concern, not just UX. Money-path adjacent: touches
  the account surface only, NOT the webhook. Depends on: Stripe dashboard
  portal config (founder) + one link in app.jsx.
