# Data-Driven Product Development — SQL Quest

Written 2026-07-23. Owner: Göktuğ. Operating scale at time of writing:
~72 engaged users (5+ solves), 2 real purchases ($118), 1 recurring
subscriber. Every rule below exists because of something that actually
happened in this codebase — the incident is cited next to the rule.

This is the system, not a wishlist. Most of it is already running; the
gaps are listed as measurement debt with owners.

---

## 1. Principles

**P1 — Decide the rule before the data arrives.** Every hypothesis gets a
metric, a read date, and a kill criterion written in advance
(`scripts/funnel-report.sql` §14). Post-hoc thresholds always confirm
whatever we shipped. Incident: TG-1 has an explicit revert criterion for
the guest paywall written the same day the change shipped.

**P2 — Count people, not events.** Event-based rates flattered a broken
checkout: one frustrated user cycling three plans in 37 seconds read as
three conversions. The purchase funnel (`src/utils/purchase-funnel.js`)
counts distinct users per rung and each rung is unioned with the rungs
below it so the funnel can only narrow.

**P3 — Client state is not evidence of a transaction.** `proStatus`,
`proType`, `proExpiry` are all client-written. 53 rows carried
`proStatus=true` on expired trials; 4 users carried `proType='monthly'`
with no Stripe record — one nearly received a "your subscription lapsed"
email having never paid. Money truth lives ONLY in `pro_events` with
`reason='stripe_webhook'`. Pro-ness in SQL goes through `is_pro_live()`
(mirrors the app's `_proLive`), never through the raw flag.

**P4 — No models below n≈100 purchases.** At n=2 a propensity model
encodes one person's habits behind a confident number. Until then:
ordinal ladders where every rung is a *stated intention* (clicked
checkout > clicked a plan > saw the offer > never asked), read by name.

**P5 — Falsify first.** Hypotheses are written so a single row can kill
them (CO-1: one `never_navigated` row = live bug, not a pricing signal).
Verify numeric claims against raw data before publishing them — the
first draft of challenge #170's example was invented and wrong; the
check caught it.

**P6 — Measure before you modify.** When a funnel stage is dark,
instrument it and wait; don't redesign blind. The coach-funnel events
went in a full read-cycle before any sequencing change. Measurement-only
changes are always safe to ship mid-experiment; behavioral ones are not.

**P7 — Respect the confound calendar.** One experiment surface, one
change at a time. Streak/warm-up/N1 read ~Aug 3; nothing touching
retention or activation surfaces ships before its reads land. New
triggers are placed to avoid measured thresholds (the 6-solve tier sits
deliberately ABOVE the 5-solve activation mark).

**P8 — Vanity numbers get unmasked in the report itself.**
`users_total: 2356` is 2203 empty guest rows. Every aggregate that could
flatter carries its denominator honestly (real base: 72 engaged) or gets
a filter (internal accounts: `test2` with 84 solves passes every audience
filter; only `lapsed-pro` filters it today — debt item D4).

**P9 — Small n cuts both ways: read individuals.** At this scale the
most valuable reads are named users, not rates — Serge's 9 failed
attempts on #34 shaped the JOIN on-ramp; hrishi998's 37-second
plan-cycling exposed the checkout bug; sai's double modal caught the
dedupe bug within 10 hours of shipping. Qualitative email to a specific
user (the Serge/hrishi playbook) is a first-class research method here,
not a fallback.

**P10 — Every feature ships with its read.** A feature without an event
is invisible; an event without a §-section in the funnel report is
unread. The definition of done includes both.

---

## 2. Metric tree

North star (this quarter): **weekly engaged users** — distinct users
reaching 5+ lifetime solves who were active that week — and
**engaged→paid conversion** over it. Everything else is a driver.

```
Revenue ($118 to date — count it in transactions, not MRR, until n>10)
└─ engaged → paid            (purchase funnel: 54 → 20 shown → 3 clicked → 3 checkout → 1 paid)
   ├─ ask rate               34 engaged never shown the offer; avg 1.6 asks/user  ← current constraint
   ├─ checkout integrity     pro_checkout_returned outcomes (defect vs decline)
   └─ offer quality          coach_path (sell the destination) vs milestone (feature list) — CP-1
└─ engaged users
   ├─ activation             first-week 5+ solves (warm-up experiment, reads Aug 3)
   ├─ retention              W1 return (streak experiments, reads Aug 3); email returned_48h
   └─ acquisition            signups by door (SEO pages); ~90% guest rows — report registered separately
└─ learning outcome (the product's actual job)
   ├─ ramp health            attempts-to-solve on on-ramp vs wall challenges (ON-2)
   └─ goal completion        coach funnel: viewed → picker → selected → steps → graduated
```

Canonical definitions (use these words, these thresholds):
- **engaged** = 5+ lifetime solves. **activated** = 5+ solves within 7
  days of first_seen. **paid** = stripe_webhook purchase event. **lapsed
  Pro** = `proStatus=true` AND expiry past (the stale flag IS the
  segment). **returned_48h** = any event within 48h of an email send —
  the email metric that matters; opens are vanity (and currently blind —
  D1).
- Known horizon: engagement from `challenge_solved` events starts
  2026-06-30. Pre-July users (elena: 134 solves, reads as 0) are
  understated — fix is D3.

---

## 3. Instrumentation standards

- **Write path:** `trackActivationEvent(name, metadata)` →
  `pro_events` with `reason='activation_funnel'`. Auto-stamped on every
  event: `intent`, `tz`, `solvedCount`, `attemptCount`, `isGuest`,
  `arrivalSrc`. New features add their own keys, never remove these.
- **Read path:** `metadata` is double-encoded jsonb. SQL:
  `((metadata #>> '{}')::jsonb)->>'key'`. JS: `parseEventMetadata()`
  from `src/utils/purchase-funnel.js`. Never raw-parse.
- **Dedupe:** client-side, localStorage, explicit scope. Per-user-day
  for views (`coach_tab_viewed`), per-user-ever for one-shot asks, and
  **browser-scoped for guests** — guest identity is a fresh
  `guest_<ts>` every load, so user-scoped keys never dedupe (incident:
  sai asked twice in 2 minutes across the guest→signup boundary; both
  keys are now written and checked).
- **Naming:** `snake_case`, `<surface>_<what_happened>`
  (`goal_picker_shown`, `pro_checkout_returned`). Outcomes as a
  `metadata.outcome` enum, not separate event names.
- **Record, don't infer.** If a fact can be stamped at the moment it's
  true (pagehide → `left: true`), stamp it; timing heuristics come
  second (`secondsAway` classifies only within a recorded `left`).
- **Purity rule:** metric logic that matters lives in `src/utils/` with
  vitest coverage (`purchase-funnel.test.js`: 13 tests incl.
  monotonicity and both metadata encodings). A metric nobody can assert
  on drifts — the registry/radar taxonomy drift silently killed 46
  references and both Coach goals' graduation; `tests/goals-registry.test.js`
  now pins registry↔radar and was mutation-tested.

---

## 4. Cadence

| Ritual | When | Tool | Output |
|---|---|---|---|
| Pulse | daily, ad hoc ("bugünkü metricler") | quick SQL vs yesterday/last week | anomalies only |
| Deep read | weekly | `funnel-report.sql` §1-13 + `npm run metrics:report` | 3 numbers that moved + why |
| Hypothesis reads | pre-registered dates only | §14 + scheduled task | verdict per kill criterion: SUPPORTED / FALSIFIED / INSUFFICIENT |
| Experiment reads | Jul 26 (CF/TG early) · Jul 30 (TG-1 final) · ~Aug 3 (streak/warm-up/N1) | §7/§10/§11/§14 | keep / revert / iterate — revert is a normal outcome |
| Registry retro | monthly | §14 history | kill stale hypotheses; save learnings to CLAUDE.md |
| Content lint | every content ship | `node scripts/lint-content.mjs` | 0 NEW vs baseline, ratcheted |

Reads are cheap to automate: scheduled tasks with self-contained prompts
and pre-registered rules (see `hypothesis-read-jul26`), so the verdict
can't drift toward whatever we hoped.

---

## 5. How an idea becomes a shipped feature

```
idea
 → hypothesis: one sentence + metric + read date + kill criterion  (funnel-report §14)
 → instrument first if the surface is dark                          (P6)
 → confound check: does it touch a surface mid-experiment?          (P7)
 → ship the smallest version, with its event + its § read           (P10)
 → verify: unit tests + smoke 20/20 + built-bundle grep; state
   plainly what was NOT verified (e.g. seeded-session visual gaps)
 → read on the date, apply the pre-written rule
 → keep / revert / iterate — log the learning in CLAUDE.md
```

Evidence tiers, in order of trust: Stripe webhook > recorded client fact
(pagehide) > client event > client state > survey/declared intent. A
decision should cite the highest tier available, and the tier it used.

What we deliberately do NOT do at this scale: A/B tests (weeks to
significance at ~30-80 actives/day — use before/after cohorts with
explicit confound notes instead), propensity scores (P4), third-party
analytics (Supabase + SQL covers current needs; revisit at ~1k WAU),
dashboards for their own sake (the funnel report is the dashboard).

---

## 6. Measurement debt (prioritized)

| # | Debt | Why it matters | Effort · owner |
|---|---|---|---|
| D1 | Resend webhook not connected | email opens/clicks/bounces blind; campaigns judged on returned_48h alone | 10 min · **user** (dashboard + `RESEND_WEBHOOK_SECRET`) |
| D2 | `invoice.payment_failed` unhandled in stripe-webhook | ✅ shipped + deployed 2026-07-23: every attempt logged (`pro_payment_failed`), one founder dunning email per invoice, Pro untouched during Stripe's retry window. **Remaining user step:** confirm the Stripe dashboard webhook endpoint is subscribed to `invoice.payment_failed` — if the endpoint uses "selected events" and it's not ticked, Stripe never delivers it | done · verify subscription: **user** |
| D3 | Engagement horizon (events start Jun 30) | pre-July users read as unengaged; elena 134→0 | read `users.data->solvedChallenges` in funnel base · Claude |
| D4 | Internal-account filter only in lapsed-pro | test2/sqlquest/test109 inflate every campaign's sends & return rates | lift `isInternalAccount` into shared email block · Claude |
| D5 | Guest→user identity merge | guest history orphaned at signup; CF-2 will quantify the cost | design first; ship after CF-2 read |
| D6 | Service key not available locally | `npm run metrics:report` never actually run end-to-end; numbers come from parallel SQL | 5 min · **user** (`SQ_SUPABASE_SERVICE_ROLE_KEY` in env) |
| D7 | Stripe-arrival event | `pro_checkout_returned` infers arrival; a first-party ping from the success page would close the loop | after CO-1 read |

---

## 7. Standing calendar (as of 2026-07-23)

- **Jul 26** — scheduled task `hypothesis-read-jul26`: CF-1/2/3, TG-1/2
  early, CO-1, ON-1 verdicts.
- **Jul 30** — TG-1 final: guest paywall keeps or reverts by its
  pre-written criterion (≥1 click / 25 shows; 0 at 50+ → revert floor to 10).
- **~Aug 3** — streak (§7), N1 email (§10), warm-up activation (§11)
  cohort reads. Until then: no changes to streak, warm-up, first-session,
  or email-cadence surfaces.
- **Aug 9** — first real subscription renewal (guest monthly). D2 must
  land before it.
- **Whenever ≥10 `coach_path` shows accumulate** — CP-1: does selling
  the destination beat the feature list ≥2×?
- **When the user triggers lapsed-pro** — WB-1: ≥2/8 returned_48h →
  schedule the cron; else rewrite before draining the rest.

---

## 8. Anti-patterns (all observed here, all banned)

1. Reading `proStatus`/`proType` as payment truth (P3 incident).
2. Event counts as conversion rates (P2 incident).
3. Hardcoded expectations in tests — smoke asserted "239 of 239" and
   broke on content growth; assert invariants (`shown == total`).
4. Docs as memory: CLAUDE.md's content table went stale twice in one
   day; tables carry a measured-on date and a re-measure warning.
5. A validator that accepts two vocabularies "for migration" — it can't
   detect drift between them, which is the one job it had (taxonomy
   incident, 46 dead references).
6. Shipping the trigger change and the copy change together — you'll
   never know which one moved the number.
7. Trusting a fixture test to certify live data wiring — the registry
   was green in fixtures while every skipIf was dead in production;
   integrity tests must load the LIVE registry against the LIVE radar.
