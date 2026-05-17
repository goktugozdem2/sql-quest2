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
