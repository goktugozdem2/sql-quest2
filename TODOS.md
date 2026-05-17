# SQL Quest — Deferred Work

Items deferred from the CEO plan review (2026-04-12). Revisit after 2-week conversion measurement.

## Immediate Repo Health

These are not product expansion bets. They are maintenance items that reduce release risk for the current React/Vite app.

- [ ] **Install-and-test baseline** — document the exact supported Node.js/npm versions, then verify `npm ci`, `npm run lint`, `npm test -- --run`, and `npm run build` from a clean checkout.
- [ ] **Simplify the build script** — move the long chained `cp`/`mkdir` command in `package.json` into a Node script so page additions are data-driven and easier to review.
- [ ] **Keep Vite dev/build data lists in sync** — `vite.config.js` and `scripts/bundle-data.js` each maintain a data-file list; consolidate this into one shared source so dev mode and production build load identical data.
- [ ] **Add build output validation to CI** — run `scripts/validate-build.js`, smoke tests, and size checks after build so broken generated files are caught before deploy.
- [ ] **Reduce `src/app.jsx` blast radius** — extract one high-change area at a time from the 27k-line app into tested components/hooks, starting with AI tutor state, auth/pro status, and challenge execution.
- [ ] **Harden AI tutor proxy usage** — reconcile the Vercel `api/chat.js` proxy with the Supabase Edge Function docs so there is one supported AI path, one rate-limit model, and one documented deployment path.
- [ ] **Audit generated/public artifacts** — decide which files in `public/` and `dist/` are source-controlled release artifacts versus build outputs, then document the rule and ignore unnecessary churn.
- [ ] **Expand tests around monetization and account state** — cover Pro activation refresh, pending subscription claiming, referral attribution, and AI usage limits with unit tests or integration smoke tests.

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
