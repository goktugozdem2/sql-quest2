# SQL Quest — Deferred Work

Items deferred from the CEO plan review (2026-04-12). Revisit after 2-week conversion measurement.

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
