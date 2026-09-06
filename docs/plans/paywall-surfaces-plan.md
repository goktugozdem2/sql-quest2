# Plan: Paywall surfaces — lead people to the wall before moving it

Status: REVIEWED (design 8/10 · eng CLEAN) 2026-08-28 · origin: lock-read decision, docs/agent/ledger.md
Approved mockups: `~/.gstack/projects/goktugozdem2-sql-quest2/designs/hard-preview-collision-20260826/`
Implementation gate: does NOT start before the 2026-08-29 schema-fix read closes.
Shipped 2026-09-06 (T1-T8, one commit) after that read closed MISS; ledger entry "paywall surfaces: lead people to the free Hard previews".

## Why now

The 2026-08-21 lock read (HIT): 16 people hit a paid wall in 6 days, **15 of 16
with all 6 free Hard previews untouched**. Targeted share LOW → moving the wall
changes nothing until something leads people to it. Payer #2 (sab3r) bought at
the `milestone_solves` modal and wrote that he bought **to unlock the harder
questions**, with an interview deadline.

Build order (ledger-confirmed): (1) surface the previews, (2) radar indicator —
**separate PR, phase 2**, (3) only then revisit wall placement.

**Live-bank facts (verified 2026-08-28, outside-voice audit):** 185 challenges,
**54 Hard**, previews = ids 11, 23, 24, 30, 50, 86 — all Window/CTE cluster.
**Never hard-code counts in copy** — the earlier "32"/"26" numbers came from a
stale table and were wrong. All counts compute from the bank at render.

## Design decisions (design review 2026-08-26 + eng review 2026-08-28)

### D-1 · Hard list: in-list preview tags, pinned first
- **Previews sort FIRST in the Hard list** (eng #7): one comparator rule —
  `freePreview` before locked, curriculum order preserved within each group.
  The strongest findability move; ~1 line via `makeChallengeComparator`.
- Preview rows: full brightness, 1px `--info` (#7CC4FF) border, outlined pill
  "Free preview" (Geist 11px 500). Locked rows: opacity .5, red chip, lock glyph.
- Orientation banner above the list: 1px full `--info` border (NOT a colored
  left-border — slop blacklist #8), `--surface` fill, radius 6. Copy computes
  counts: "{n} of these are free previews — the unlocked rows on top. Solve
  them before deciding on Pro." Counter right: "{x} of {n} solved" (`--muted`,
  not yellow). `role="status"`.
- **isPro: banner, tags, and dimming all hidden** — Pro users see the plain
  list, everything unlocked.

### D-2 · Collision catcher: replaces the SOFT TOAST only
- **Scope guard (outside-voice P1):** `openChallenge` has TWO wall branches.
  The `companyFilter` branch (Pro modal, reason `company_hard` — the
  highest-intent purchase moment, 4 of the read's 16 collisions) is
  **untouched**. The catcher replaces only the soft-toast branch.
- Content: Fraunces italic "That one's Pro." · one line: "But you haven't
  touched your free ones yet — {n} Hard previews, full problem, no card." ·
  up to 3 previews via `pickTopNWith` (curriculum order — "nearest" MEANS
  curriculum-next; learning `next-challenge-uses-raw-array`) · footer: muted
  "or unlock all {lockedHardCount} with Pro" + yellow CTA "Try this one free".
- Presentation: ≥768px centered dialog reusing Pro-modal scaffolding (focus
  trap, `aria-modal`, Escape, backdrop); <768px **static bottom sheet with a
  close button — no drag gesture** (no touch-gesture infra exists; cut).
- **Single-dialog invariant (eng #1):** at most one dialog open, ever. The
  Pro-CTA handler closes the catcher state FIRST, then `setShowProModal(true)`.
  Asserted by smoke test.
- **isPro:** the catcher never renders for Pro users (locks don't exist for them).
- `content_lock_reached` keeps firing at the same gate; **`wall` value becomes
  `'preview_dialog'`** for this branch — `'soft_toast'` would describe dead UI.
  Discontinuity note ships in metrics.md the same commit. Multi-fire dedupe
  ships in T3.

### D-3 · Coach: conditional step, no permanent card
- **Condition (rewritten — outside-voice P1 ×2):** the foundational floor pins
  "strongest skill" to Querying Basics for everyone (skill-calc floors it at
  MAX of advanced skills), and all 6 previews are one skill cluster — so
  skill-matching is dropped. New rule: **any ADVANCED canonical skill ≥ 65
  (Querying Basics and Filter & Sort excluded) AND an unsolved preview
  exists** → next step MAY be the first unsolved preview in curriculum order.
  Copy: "You're ready for a hard one — this one's free."
- Never displaces a due retrieval_check or placement_check.
- **Once per session via `options.sessionPreviewOffered`** (eng #2): app.jsx
  owns the session flag and passes it in; `computeNextStep` stays pure and the
  skip-rule is unit-testable.
- **isPro:** rule skipped (previews are meaningless when everything is open).

### D-4 · Win state after solving a preview
- One line in the existing solve celebration: "Hard preview {x}/{n} solved —
  {n-x} more are free." Count in `--accent` yellow (score display); sentence
  `--text`. No modal. `milestone_solves` hierarchy untouched. Hidden for Pro.

### D-5 · The 6/6 completed state
- Banner flips to win language: "All {n} free Hard previews: beaten. The other
  {lockedHardCount} are Pro." + yellow CTA "Unlock Hard" → opens Pro modal,
  reason `hard_challenge`. Catcher shows the same single line + CTA. No
  auto-opening modal anywhere. Hidden for Pro.

## Interaction states

| surface | loading | empty/complete | error | success | partial | isPro |
|---|---|---|---|---|---|---|
| Preview rows | n/a (static bank) | 6/6 → banner flips (D-5) | n/a | solved: blue border + `--success` check | pinned block shrinks as solved | no tags, no dimming |
| Banner | n/a | D-5 win state | n/a | counter ticks (`role=status`) | "{x} of {n} solved" | hidden |
| Catcher dialog | instant, no spinner | all solved → single line + CTA | preview list empty → 2 curriculum-next previews | — | up to 3 cards | never renders |
| Coach step | inherits Coach | condition unmet → rule skipped silently | — | preview solved → normal flow | — | rule skipped |

## User journey (emotional arc)

| step | user does | feels | plan specifies |
|---|---|---|---|
| 1 | opens Hard list | curiosity + intimidation | pinned bright previews say "you may enter" (D-1) |
| 2 | clicks a locked row | blocked | catcher converts block into invitation (D-2) |
| 3 | solves a preview | pride — a HARD, free | win-state line marks it (D-4) |
| 4 | hits {n}/{n} | mastery, appetite | banner flips + bridge to Pro (D-5) |
| 5 | milestone modal fires on its own schedule | decision | untouched — proven converter |

## Responsive & accessibility

- 384px: preview rows drop table-name meta, keep tag; banner wraps; catcher =
  full-width static sheet, close button, safe-area padding.
- Targets ≥ 44px. Catcher inherits Pro-modal focus trap, `aria-modal`,
  Escape, focus-on-open; focus returns to the clicked row on close.
- Banner `role="status"`. Contrast: #7CC4FF on #16181F = 7.4:1 ✓; `--muted`
  4.6:1 ✓. No hover-dependent affordances (<768px has no hover).

## Measurement (P10 — redesigned per outside-voice P1 #5)

- **No new event.** `challenge_opened` (live since 07-17) gains an
  `openedFrom: 'preview_list' | 'preview_dialog' | 'preview_coach'` metadata
  field, stamped only when a preview is opened from one of the three surfaces.
  A separate `hard_preview_opened` would duplicate it.
- **Primary metric — the direct funnel:** people with `openedFrom` stamped →
  `challenge_solved` on that id. Baseline **0** (field born at ship). Target:
  **≥15 people open a preview via a new surface in 2 weeks, ≥40% solve one**.
- Secondary (declared confounded): share of `content_lock_reached` people with
  `freeHardPreviewsUnsolved < 6`. Baseline 1/16 (6%). **Person rule: LAST lock
  event per person in the window.** Lock-time stamping means first-time
  hitters always read 6 — this metric moves only on repeat collisions; that
  is stated in the claim, not discovered at the read.
- **Confound, declared in advance (eng decision #6):** three entry surfaces
  ship in one PR. Surface attribution lives in `openedFrom`; the lock-time
  secondary reads the combined effect only.
- Guardrail: `purchases` (reason='stripe_webhook'), **directional only** —
  `plan_click_rate` on milestone shows is single-digit-n in any 2-week window
  and cannot carry a guardrail.
- `wall='preview_dialog'` discontinuity note + `openedFrom` land in
  docs/agent/metrics.md in the same commit. Ledger claim at merge.

## What already exists (reuse, don't reinvent)

- `freePreview` flag + `isContentLocked` exemption (app.jsx ~19301).
- Pro modal scaffolding: Fraunces header, focus trap, aria-modal, reason routing.
- `makeChallengeComparator` / `pickNextChallengeWith` + mutation-verified tests.
- `trackLockReached` with `freeHardPreviewsUnsolved` stamp (~19280).
- coach.js `options.allChallenges` + `options.skillLevels` — data flow already plumbed.
- smoke-test.js 8-step headless-Chrome e2e harness.

## NOT in scope (deferred, with reasons)

- Moving/removing the Hard wall — gated on the post-ship read, per ledger.
- Radar "remaining X are Hard" — phase 2, separate PR.
- Re-curating WHICH 6 are previews — TODO'd; T4's condition no longer depends
  on it (skill-match dropped), so it is genuinely deferrable now.
- Light-mode pass — TODO'd.
- Drag-to-dismiss sheet gesture — cut (new gesture infra for zero user value).
- The `companyFilter` wall branch — deliberately untouched (highest-intent
  moment stays a Pro modal); segmented separately in the read.
- Pricing, milestone-modal copy, email — untouched.

## Failure modes

| new codepath | realistic failure | test? | handled? | user sees |
|---|---|---|---|---|
| catcher open on lock click | double-dialog stack | smoke (T8) | single-dialog invariant | clean transition |
| pickTopNWith | empty pool (all solved) | unit (T7) | single-line fallback (D-5) | win banner |
| dedupe window | rapid re-click drops real 2nd intent | unit (T3) | 2s scope per challenge only | correct counts |
| Coach rule | floor pins strongest skill | unit (T4, floor case pinned) | advanced-only condition | step fires correctly |
| computed counts | bank changes size | unit (T7 counts from bank) | no literals in copy | always-true numbers |
| openedFrom stamp | lost on direct URL open | — | absence = organic, by design | n/a |

Critical gaps (no test AND no handling AND silent): **0**.

## Worktree parallelization

| Step | Modules | Depends on |
|---|---|---|
| T7 helpers | src/utils/, tests/ | — |
| T1 list | src/app.jsx | T7 |
| T2 catcher | src/app.jsx | T7, T1 |
| T3 dedupe+wall | src/app.jsx, docs/agent/ | — |
| T4 coach | src/utils/coach.js, tests/ | T7 |
| T5 win/banner states | src/app.jsx | T1 |
| T6 measurement | src/app.jsx, docs/agent/ | T2 |
| T8 smoke | scripts/ | T1-T5 |

Lane A: T7 → T1 → T2 → T5 → T3 → T6 (sequential, shared app.jsx). Lane B: T4
(independent, coach.js). Launch A+B in parallel worktrees; merge; then T8.
Conflict flag: none — B never touches app.jsx.

## Implementation Tasks
Synthesized from both reviews. Checkbox as you ship.

- [x] **T7 (P1, human: ~1h / CC: ~10min)** — challenge-order — `unsolvedFreePreviews(challenges, solvedSet)` + `pickTopNWith(order, pool, pred, n)` + counts-from-bank helpers, unit tests incl. empty-pool and bank-size cases
  - Surfaced by: Code Quality #3 (4 call sites) + outside-voice #12 (API mismatch) + #3 (hard-coded counts)
- [x] **T1 (P1, human: ~3h / CC: ~25min)** — Hard list — pin previews first (comparator rule), tags, dimmed locked rows, computed-count banner, isPro gate
  - Surfaced by: design D-1 + eng #7 (pinning) + outside-voice #7 (isPro)
- [x] **T2 (P1, human: ~4h / CC: ~35min)** — catcher dialog — replaces soft toast ONLY (companyFilter branch untouched), modal≥768/static sheet<768, single-dialog invariant, pickTopNWith, isPro gate
  - Surfaced by: design D-2 + eng #1 + outside-voice #4, #14
- [x] **T3 (P1, human: ~1h / CC: ~10min)** — pure `shouldEmitLockEvent` dedupe (2s per user+challenge) + `wall='preview_dialog'` + metrics.md discontinuity note
  - Surfaced by: ledger carry-over + outside-voice #6
- [x] **T4 (P2, human: ~2h / CC: ~20min)** — coach — advanced-skill≥65 condition (floored pair excluded), curriculum-order pick, `options.sessionPreviewOffered`, tests pin the floor case + displacement + session skip
  - Surfaced by: design D-3 + eng #2 + outside-voice #1, #2
- [x] **T5 (P2, human: ~1h / CC: ~10min)** — win-state line + {n}/{n} banner flip, computed counts, isPro-gated
  - Surfaced by: design D-4/D-5 + outside-voice #3, #7
- [x] **T6 (P1, human: ~1h / CC: ~10min)** — `openedFrom` on challenge_opened + metrics.md (funnel metric, person rule, guardrail change) + ledger claim with declared confound
  - Surfaced by: Measurement redesign — outside-voice #5, #8, #9, #13
- [x] **T8 (P1, human: ~1h / CC: ~10min)** — smoke-test.js +3 steps: locked-click regression (dialog appears, exactly 1 lock event), try-free opens editor, Pro-CTA closes catcher then opens Pro modal
  - Surfaced by: Test review (IRON RULE regression) + eng #4

## Approved Mockups

| Screen/Section | Mockup Path | Direction | Notes |
|----------------|-------------|-----------|-------|
| Hard list + previews | ~/.gstack/.../hard-preview-collision-20260826/variant-B.png | In-list blue tags, dimmed locked | + previews pinned first; banner border full 1px --info; counts computed |
| Collision catcher | ~/.gstack/.../hard-preview-collision-20260826/variant-C.png | Sheet content model | Centered modal ≥768px, static sheet below; no drag handle; single-dialog invariant |
| (rejected) | .../variant-A.png | Sampler strip | Rejected: splits hierarchy; pinning (eng #7) recovers its visibility benefit inside variant B |

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 18 issues (4 own + 14 outside voice), 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR (FULL) | score: 3/10 → 8/10, 6 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **CROSS-MODEL:** outside voice (Claude subagent, fresh context) audited against the live bank and caught 5 P1s the in-context reviews missed — broken Coach condition (foundational floor), single-cluster previews, stale copy math (54 Hard, not 32), unaddressed company-modal branch, lock-time metric blindness. 11 of 14 findings absorbed; 3 resolved by founder decision (skill-match dropped, single PR with declared confound, previews pinned first).
- **VERDICT:** DESIGN + ENG CLEARED — ready to implement after the 2026-08-29 read closes.

NO UNRESOLVED DECISIONS
