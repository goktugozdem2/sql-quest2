# AI Tutor → Coach: Goal-Driven Learning Spine

**Status:** Design revised after spec review (rev 2), pending author approval then implementation plan
**Author:** Design brainstorm 2026-04-16
**Target:** Turn the feature-flagged-off AI Tutor into the app's learning spine, driven by a curated goal the user picks.

**Rev 2 changes (post-review):**
- Fixed schema mismatches: `lessonId` as string, `interview` step as interview-level (not per-question), `mastery_check` session-scoped via `masteryCheckSessions`
- Added `src/utils/coach-validate.js` for goal registry load-time validation, plus contract tests
- Exit criteria scoped post-goal-start (not cumulative lifetime)
- Stale state handling for deprecated goals, removed step ids, broken references
- New-user baseline: optional 3-minute placement check
- Babel script-mode compatibility via inline mirror + build-time sync check
- AI cost bounded by 8-call-per-day per-user hard cap
- Measurement rewritten around Coach vs. control cohort comparison (no unmeasurable delta targets)
- Rewind made idempotent via `rewoundSteps: { stepId: count }`
- Dogfood gate redefined in measurable terms (complete-or-file-issue, not "friction ≥ 3")

---

## Problem

The AI Tutor today is feature-flagged off (`tabs.guide: false` in `src/data/feature-flags.js`). When enabled, it offers a 10-lesson Socratic chat flow (hook → probe → attempt → discover → reveal → practice → mastery). Commit history shows multiple rebuilds (tone, pacing, cost, Socratic flow).

The pedagogy gap that matters most right now: **one-size-fits-all**. Every user gets the same 10-lesson track in the same order regardless of what they already know, what they're struggling with, or what they're actually trying to learn.

The radar skill calc was just unified (commit `89c7b31` + `4d3c61b`). We now have a trusted 0–100 score per skill per user. We have challenge attempt history, interview history, and lesson completion history. We have enough signal to stop teaching everyone the same path.

## Goal

Make the Tutor **goal-driven**: user picks a curated destination, the Tutor becomes the coach that tells them what to do next — a lesson, a challenge, a drill, or an interview question — and routes them to the right part of the app. Lessons, challenges, drills, interview questions all become steps under one goal.

Outcome we're optimizing for: **learning transfer**. Not "completed the lesson" but "radar score moved, they can solve the next challenge cold."

## Non-goals (explicitly out of MVP)

- Custom / open-ended goals ("I want to get good at…")
- Multiple concurrent goals per user
- Time estimates or deadlines that create pressure
- Social / team / leaderboard integration for goals
- Goal sharing
- AI-generated curricula (curricula are hand-authored in `goals.js`)
- AI-chosen next step (the deterministic engine picks; AI only teaches inside lessons, intros, and summarizes)
- Open-ended Coach chat

## Approach: Hybrid Coach

Deterministic curriculum + adaptive branches + AI at three known points.

**Why hybrid over pure-AI orchestration:**
- Outcomes come from curriculum quality, not AI cleverness. Keeping curriculum as human-editable data makes iteration cheap.
- The radar data we just unified is already a strong adaptivity signal — use it.
- Testable, inspectable, auditable. AI orchestration is a prompt we can't unit-test.
- We can upgrade *to* AI orchestration later by layering it on top of the template. We can't cleanly downgrade.

---

## MVP Scope

Ship **three curated goals**:

### 1. SQL Fundamentals Mastery
- **Target learner:** beginner who just landed on SQL Quest
- **Exit criteria:** all 10 radar skills ≥ 50; 5 Easy + 3 Medium challenges solved
- **Estimated hours:** 15

### 2. Analyst Day-One Ready
- **Target learner:** someone prepping for a working analyst role (not interview-specific)
- **Exit criteria:** JOINs, GROUP BY, Window Functions, CASE Statements all ≥ 75; 15 Medium + 3 Hard challenges solved
- **Estimated hours:** ~30

### 3. Meta SQL Interview Ready
- **Target learner:** interview prep for Meta specifically (one goal, not three — Google and Amazon are trivial clones after MVP proves the model)
- **Exit criteria:** Subqueries, Window Functions, GROUP BY ≥ 80; **3 Meta-tagged mock interviews passed** (`interviewHistory.filter(r => r.tag === 'meta' && r.passed).length >= 3`)
- **Estimated hours:** ~25
- **Schema dependency:** adds a `tag` field to interview records in `public/data.js` (static, author-authored — not computed). Mock interviews in `interviewHistory` already track `interviewId`, `passed`, `scorePercent` at interview level. Per-question identity is not stable and is not used by this goal.

---

## Data Model

### Goal registry — `src/data/goals.js`

```js
{
  id: 'fundamentals',
  name: 'SQL Fundamentals Mastery',
  tagline: 'Rock-solid foundation across all 10 core SQL skills',
  estimatedHours: 15,
  curriculum: [ /* ordered steps */ ],
  exitCriteria: {
    skillThresholds: { 'SELECT Basics': 50, 'Filter & Sort': 50, /* ... all 10 */ },
    challengesSolved: { Easy: 5, Medium: 3 }
  }
}
```

### Step types (the 5 primitives)

| Type | Semantics | Example |
|---|---|---|
| `lesson` | Launch a Socratic lesson | `{ id: 'f-1', type: 'lesson', lessonId: 'select-basics' }` |
| `challenge` | Queue a specific challenge | `{ id: 'f-7', type: 'challenge', challengeId: 42 }` |
| `drill` | 5-challenge focused skill practice (already built) | `{ id: 'f-4', type: 'drill', skill: 'GROUP BY' }` |
| `interview` | Queue a full mock interview | `{ id: 'm-12', type: 'interview', interviewId: 'meta-001', tag: 'meta' }` |
| `mastery_check` | Do N challenges cold (no hints) inside a sealed session | `{ id: 'f-8', type: 'mastery_check', skill: 'JOIN Tables', count: 3, difficulty: 'Medium' }` |

**Schema notes — these are load-bearing, not incidental:**

- `lessonId` is a **string** matching `window.aiLessonsData[i].id` (e.g., `'select-basics'`, `'where-filter'`). `completedAiLessons` is a `Set<string>` in existing code.
- `challengeId` is the numeric id from `public/data.js` `challenges` array.
- `interviewId` references full mock interviews (interview-level records), not individual questions. Per-question identity is unstable.
- `tag` on `interview` steps is required for goals that filter by company/vertical (e.g., `'meta'`, `'google'`, `'amazon'`). Tags live on both the goal step AND the interview record in `public/data.js` (author-authored).
- `skill` for `drill` and `mastery_check` must be a canonical radar skill name imported from `CANONICAL_SKILLS` in `src/utils/skill-calc.js` (shared constant — no string duplication in `goals.js`).
- `mastery_check` is **session-scoped**: entering one starts a new `userData.masteryCheckSessions` record (see completion detection below). Incidental Practice attempts outside the session do **not** count.

### Conditional skipping (the adaptive bit)

Any step may include `skipIf: { skill: 'SELECT Basics', gte: 70 }`. When the engine walks the template, it evaluates `skipIf` against the current radar and skips the step silently.

### User progress state

Lives on `userData.coachState`:

```js
{
  goalId: 'fundamentals',
  startedAt: '2026-04-16T10:00:00Z',
  stepsCompleted: ['f-1', 'f-2', 'f-4'],   // 'f-3' got skipIf-skipped
  currentStepId: 'f-5',
  graduatedAt: null,
  rewoundSteps: {},                         // { stepId: rewindCount } — idempotent, keyed by original step
  masteryCheckSessions: {                   // keyed by step id
    'f-8': {
      startedAt: '2026-04-16T11:00:00Z',
      attemptedChallengeIds: [42, 58, 77],
      results: [{ challengeId: 42, success: true, hintsUsed: 0 }, ...],
      status: 'in_progress'                 // | 'passed' | 'failed'
    }
  }
}
```

Also new on `userData` top-level:

```js
{
  completedDrills: [                        // written by the existing drill modal on complete
    { skill: 'GROUP BY', completedAt: '2026-04-16T...', hintsUsed: 0, streak: 5 }
  ]
}
```

Syncs to Supabase through the existing user-data path. No new backend tables for MVP.

---

## Progress Engine — `src/utils/coach.js`

### Signature

```js
function computeNextStep(goal, userData) → {
  step,           // the curriculum step to surface, or null
  reason,         // human-readable string for the Coach UI
  progressPct,    // 0-100
  graduated,      // bool
  rewind          // optional: if engine inserted a remedial step
}
```

### Algorithm

1. **Check graduation first.** If `exitCriteria.skillThresholds` all met AND `challengesSolved` counts met → return `{ graduated: true }`.
2. **Walk `curriculum` in order.** For each step:
   - If id is in `stepsCompleted` → skip.
   - If `skipIf` evaluates true against current radar → mark completed silently, continue.
   - Otherwise → this is the next step. Compute `reason`, return.
3. **If we exhaust the template** but exit criteria aren't met → synthesize a remedial step by picking the lowest radar skill below threshold and emitting a `drill` step.

### Step completion detection (how the engine knows what's done)

- `lesson` → `completedAiLessons.has(lessonId)` (both strings)
- `challenge` → `challengeAttempts.some(a => a.challengeId === step.challengeId && a.success)`, **with the attempt timestamp > `coachState.startedAt`** (post-goal-start; see [Exit criteria scoping](#exit-criteria-scoping))
- `drill` → `userData.completedDrills.some(d => d.skill === step.skill && d.completedAt > coachState.startedAt)`
- `interview` → `interviewHistory.some(r => r.interviewId === step.interviewId && r.passed && r.date > coachState.startedAt)`
- `mastery_check` → `coachState.masteryCheckSessions[step.id]?.status === 'passed'`. A session is `'passed'` when it has `count` results, all `success: true`, all `hintsUsed === 0`. A session is `'failed'` when any result is `!success` or `hintsUsed > 0`. The session is created when the user clicks "Start mastery check" in the Coach UI; Practice attempts outside this sealed session do not count.

### Exit criteria scoping

All exit criteria are evaluated **against events that happened after `coachState.startedAt`** — not cumulative lifetime. This eliminates the "user already solved 15 Medium challenges last year" edge case. Radar thresholds are evaluated against current radar (which already reflects lifetime learning with decay).

### Rewind branch

If `coachState.masteryCheckSessions[stepId].status === 'failed'`, engine inserts one remedial `drill` of that skill immediately before the `mastery_check`. Rewind is **idempotent per step**: `rewoundSteps[stepId]` tracks the count; each failed session increments it; the drill is inserted at most once per `rewoundSteps[stepId]` value (so re-entering the Coach view doesn't re-insert a new drill). After `rewoundSteps[stepId] >= 2`, engine surfaces a "stuck on this skill" state for human review instead of more rewinds.

### Reason field

The `reason` string is the Coach UI's voice. Examples:

- *"Learn WHERE. Your radar shows 0 on filtering. This unlocks Challenge #3 next."*
- *"Level up GROUP BY — your radar is 62, Analyst Day-One needs 75+. Drill next."*
- *"You failed the JOIN mastery check twice. Rewinding to a JOIN refresher drill before we retry."*

### Testability

Pure function. Takes plain objects. Returns plain objects. Target: **30+ unit tests** in `tests/coach.test.js` covering graduation, skipIf, rewind, each step type, each exit criteria shape, empty history, stale history, edge cases.

---

## Goal registry validation

`src/data/goals.js` is checked at module load by a validator in `src/utils/coach-validate.js`. The validator runs every step in every goal through these checks:

- `lessonId` resolves against `window.aiLessonsData.map(l => l.id)`
- `challengeId` resolves against `window.challenges.map(c => c.id)` (from `public/data.js`)
- `interviewId` resolves against `window.mockInterviews.map(i => i.id)`
- `skill` is in `CANONICAL_SKILLS` (shared constant in `skill-calc.js`)
- `tag` (when present on interview steps) appears on at least one interview record
- Exit criteria are reachable: for every `skillThresholds[skill]`, at least one step in the curriculum targets that skill (drill, mastery_check, or lesson)
- `skipIf.skill` is canonical; `skipIf.gte` is 0–100

**In dev builds**, validation failures throw. **In production**, they log a warning and the offending step is marked `broken: true` and skipped by the engine (the user sees a generic "next step unavailable" card, not a crash). Contract tests in `tests/goals-contract.test.js` assert the whole registry is valid against a snapshot of the current data files.

## Stale state handling

Three flavors of stale state, each handled:

1. **Deprecated goal.** `coachState.goalId` no longer exists in `goals.js` → engine returns `{ deprecated: true }`, Coach UI shows "Your goal has been updated. Pick a new one to continue." (soft reset — does not touch radar or `completedAiLessons`).
2. **Removed/renamed step id.** `stepsCompleted` contains ids that no longer exist in the current goal → engine treats them as no-ops (walk ignores unknown ids). For most step types (`lesson`, `challenge`, `drill`, `interview`), re-completion is cheap because the underlying work (challenge solved, lesson finished) is recorded in separate state (`completedAiLessons`, `challengeAttempts`, etc.) and the new step's completion detector will auto-skip. **Exception: `mastery_check` sessions are keyed by step id** (in `masteryCheckSessions`), so renaming a `mastery_check` step id forces a retake. Curriculum authors should avoid renaming mastery_check step ids in place — add a new id and retire the old one instead.
3. **Deleted challenge/interview/lesson reference.** Validation catches this at load (see above). At runtime, a step marked `broken` is skipped.

## New-user baseline

A new user has no challenge attempts → `calculateSkillLevels` returns 0 for every skill → every `skipIf` evaluates false → the engine walks the full curriculum from step 1. That's the correct default for a true beginner.

For the "I already know some SQL" case, the Goal Picker offers a one-screen **placement check** (5 questions, 3 minutes, deterministic — no AI). The answers seed `challengeAttempts` with a few synthetic entries tagged `source: 'placement'`, each with `difficulty: 'Easy'`, `hintsUsed: 0`, and `timestamp: now`. The radar calc in `skill-calc.js` treats these identically to real attempts (same weight, same decay). **Not modifying the calc — the synthetic entries are just pre-seeded attempts.** Users who later solve real challenges will see their radar update normally; placement entries decay over time like anything else. Placement is optional and skippable.

## Babel script-mode compatibility

`src/app.jsx` runs through Babel with `--source-type script`, ruling out runtime ES imports. The pattern from `skill-calc.js` applies: `src/utils/coach.js` is the source of truth and test target; `src/app.jsx` carries an inline mirror of `computeNextStep` that is kept in sync. A build-time check (new `scripts/check-coach-sync.js` invoked from `npm run build:jsx`) diffs the exported function body between the two locations and fails the build if they drift.

---

## UX: The Coach View

### Tab rename and re-enable

- **Tab label rename** ships with the code (`🤖 AI Tutor` → `🎯 Coach`). This is just a string, safe with the flag off.
- **`tabs.guide` flag stays false** through Phase 1 dev + internal QA. It flips true in the soft-launch stage (see Rollout).

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Analyst Day-One Ready        Progress: ██████░░░ 6/14   │
│    6 of 14 steps complete                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CURRENT STEP                                               │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Level up GROUP BY                                     │ │
│  │ Your radar shows 62. Analyst needs 75+.               │ │
│  │ → 5-challenge drill on GROUP BY                       │ │
│  │                                      [ Start drill ]  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  NEXT UP                                                    │
│  ○ JOIN × GROUP BY (Lesson #9)                             │
│  ○ Mastery check: 3 Medium JOINs cold                      │
│  ○ Window functions intro (Lesson #10)                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Your SQL Skills — the fixed star panel]                    │
└─────────────────────────────────────────────────────────────┘
```

### First-time experience — Goal Picker

Three cards (Fundamentals / Analyst / Meta). Each shows: icon, name, tagline, estimated hours, 3–4 skills it builds, and a "Start this path" CTA. One click writes `coachState` and drops the user into the Coach view.

### Step routing

| Step type | Opens | Return flow |
|---|---|---|
| `lesson` | Inside Coach tab (Socratic flow inline) | Auto-return on lesson complete |
| `challenge` | Deep-link → Practice tab, pre-selected challenge | Breadcrumb "← Back to Coach" |
| `drill` | Existing drill modal (already built) | Auto-return on drill complete |
| `interview` | Deep-link → Interview tab, question queued | Breadcrumb "← Back to Coach" |
| `mastery_check` | Modal: "No hints. Solve these N cold." → Practice | Auto-return on all N pass/fail |

Deep-link mechanic: set `coachReturnStepId` in sessionStorage when Coach hands off. Practice/Interview tabs check this on mount and render the breadcrumb.

### Completion detection is passive

The Coach never watches step progress in real-time. The engine re-runs on every Coach tab visit, reads existing `challengeAttempts` / `completedAiLessons` / etc., and shows fresh state. No new event plumbing.

### Change goal

Footer link → modal *"Your radar stays (it measures real skill). This goal's step progress resets. Continue?"* → yes resets `coachState`, no keeps.

---

## AI Integration

Three integration points. Two are new. AI is decoration, never structure — Coach works if every AI call fails.

### 1. Inside lessons — UNCHANGED

Existing `callAI` + `aiLessonPhase` + all Socratic states stay exactly as-is. Coach routes into it.

### 2. Daily intro (new)

When user opens Coach for the first time in a day, generate a 1–2 sentence motivational intro tied to current step + recent performance.

- **Prompt:** ~300 tokens in, ~60 out
- **Model:** cheapest tier
- **Cache key:** `(userId, date, goalId, currentStepId)` — refreshing same day costs nothing
- **Example output:** *"Welcome back. Yesterday you crushed Filter & Sort. Today we're attacking GROUP BY — your radar sits at 62, we need 75. Two drills, then a cold mastery check. Let's go."*
- **Fallback:** deterministic string keyed off step type

### 3. Step completion summary (new)

On step completion, 1-sentence recap.

- **Input:** step type + skill + outcome + radar delta
- **Cache key:** `(userId, stepId, outcome)` — idempotent
- **Example:** *"Clean GROUP BY drill — all 5 solved, no hints. Radar +8 to 70. One more drill and you're at Analyst threshold."*
- **Fallback:** skip silently

### Cost envelope + rate cap

- **Daily intro:** 1 call per user per day, cache-keyed by `(userId, date, goalId, currentStepId)`
- **Step completion summary:** 1 call per step transition, cache-keyed by `(userId, stepId, outcome)`
- **Hard rate cap per user per day: 8 Coach-originated AI calls**, tracked in a **dedicated `coachAiUsage` bucket separate from `aiDailyUsage`**. Lesson-internal `callAI` (the Socratic flow) continues to charge `aiDailyUsage` unchanged. A user who burns 8 Coach calls still has their full lesson-internal quota. Past 8 Coach calls, intros and summaries fall back to deterministic strings for the rest of the day.
- **Budget target:** median user <$0.01/day; 95th percentile <$0.05/day.

### Prompt caching

Use Anthropic's prompt cache for the shared system prompt. User-specific context (goal, step, radar) is a short suffix. Cache misses on step transitions are accepted (they're rare per user), but the rate cap bounds total cost.

---

## Rollout

### Phase 1 — ship tasks

| Task | Location |
|---|---|
| Goal registry (3 goals, hand-crafted curricula) | `src/data/goals.js` |
| Progress engine (pure function) + inline mirror in app.jsx | `src/utils/coach.js` + mirror |
| Build-time sync check for source / mirror | `scripts/check-coach-sync.js`, wired into `npm run build:jsx` |
| Goal registry validator | `src/utils/coach-validate.js` |
| Engine unit tests (30+) | `tests/coach.test.js` |
| Goal registry contract tests | `tests/goals-contract.test.js` |
| Mastery check session state machine (write path on Practice attempts + read path for engine) | `src/app.jsx` |
| Drill completion write path (on existing drill modal finish) | `src/app.jsx` |
| Interview `tag` field authoring | `public/data.js` |
| Coach view component + goal picker + optional placement check | `src/app.jsx` (under `activeTab === 'guide'`) |
| Deep-link routing via sessionStorage `coachReturnStepId` | Practice + Interview tabs |
| AI intro + summary helpers with cache + 8-call daily rate cap + deterministic fallbacks | `src/utils/coach-ai.js` |
| Tab label rename (string only; flag stays off) | `src/app.jsx` line ~19191 |
| Cohort telemetry tag (coach / control) | Existing telemetry hook |

### Rollout stages

1. **Dev + QA.** `tabs.guide` stays `false`. QA via existing URL override `?ff_tabs_guide=true` on test2/elena. Exit criteria: 30+ engine tests green, contract tests green, fresh-profile walkthroughs complete all 3 goals.
2. **Dogfood.** Author uses it for 1 week on their own account. Exit criteria: author completes at least one goal end-to-end (graduated) **or** files a blocking issue. (Replaces the earlier ill-defined "friction ≥ 3" gate.)
3. **Soft launch.** Flip `tabs.guide: true` for new signups only via `userData.enrolledInCoach: true` written at signup (one-line addition to the existing signup handler). Existing users unchanged.
4. **Full launch.** Once soft-launch cohort shows a positive outcome-proxy signal (see Measurement), expose to existing users globally.

---

## Measurement

All measurement requires A/B-style grouping. We **log** whether a user has started a goal (Coach cohort) or hasn't (control). The existing telemetry path carries `userData.coachState`, so cohort membership is already on hand.

- **Adoption:** % of active users who start a goal (baseline: 0%; target after launch week: ≥ 20% of weekly actives).
- **Step progression:** median steps completed in first 7 days post-start (internal health metric, not a goal — just signals whether users are getting stuck).
- **Graduation rate:** % of goal-starters who hit exit criteria within 60 days of start (no time-tracking needed; 60 days is a wall-clock window).
- **Outcome proxy (the measurable one):** for each targeted skill in a goal, compare **skill score at goal-start** vs. **skill score at graduation or day 60**, split by cohort:
  - Coach cohort (completed the goal): measure mean delta across targeted skills.
  - Control cohort (never started a goal, matched on start-week radar): same measurement over the same 60-day window.
  - **Ship criterion:** Coach cohort mean delta is statistically higher than control (one-sided t-test, p < 0.05) with N ≥ 30 graduated users per goal. We do not commit to a specific delta number up-front — the comparison is the signal.
- **Qualitative:** one-line survey on goal-complete — *"How confident are you in [goal]?"* 1–5 scale.

Removed from this section in revision: "friction ≥ 3" (ill-defined), "2× estimated hours" (no time tracking), fixed-delta target (unmeasurable without control).

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Curriculum quality drift — Fundamentals doesn't lift radar | Data-not-code: `goals.js` edits are cheap. The engine abstraction means curriculum mistakes don't require architecture changes. |
| Deep-link return plumbing is messy | One-line `coachReturnStepId` in sessionStorage. Both receiving tabs check on mount and render the breadcrumb. |
| AI cost creep if users open Coach many times | Cache keys cover refreshes within same day/same step. Monitor daily AI call volume. Fallbacks are free. |
| Mastery check is too strict and everyone rewinds forever | Rewind threshold (2× failure) is tunable. After 2 rewinds on same skill, consider flagging for human-in-the-loop curriculum review. |
| Tab rename confuses existing users | Soft launch (new signups only) avoids this entirely. Existing users see no change until they opt in. |

---

## Explicit next step

Invoke `writing-plans` skill to produce the implementation plan against this spec.
