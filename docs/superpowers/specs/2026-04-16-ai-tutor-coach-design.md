# AI Tutor → Coach: Goal-Driven Learning Spine

**Status:** Design approved, pending implementation plan
**Author:** Design brainstorm 2026-04-16
**Target:** Turn the feature-flagged-off AI Tutor into the app's learning spine, driven by a curated goal the user picks.

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
- AI-generated curricula
- AI picking next step (the engine picks; AI teaches, intros, and summarizes)
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
- **Exit criteria:** Subqueries, Window Functions, GROUP BY ≥ 80; 10 Meta-tagged interview questions solved with ≥ 70% success rate
- **Estimated hours:** ~25

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
| `lesson` | Launch a Socratic lesson | `{ id: 'f-1', type: 'lesson', lessonId: 2 }` |
| `challenge` | Queue a specific challenge | `{ id: 'f-7', type: 'challenge', challengeId: 42 }` |
| `drill` | 5-challenge focused skill practice (already built) | `{ id: 'f-4', type: 'drill', skill: 'GROUP BY' }` |
| `interview` | Queue an interview question | `{ id: 'm-12', type: 'interview', questionId: 'meta-003' }` |
| `mastery_check` | Do N challenges cold (no hints) | `{ id: 'f-8', type: 'mastery_check', skill: 'JOIN Tables', count: 3, difficulty: 'Medium' }` |

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
  rewoundSteps: []                          // transient: steps inserted by rewind branch
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

- `lesson` → `completedAiLessons.has(lessonId)`
- `challenge` → `challengeAttempts.some(a => a.challengeId === id && a.success)`
- `drill` → `userData.completedDrills` array with `{ skill, completedAt }` (new)
- `interview` → `interviewHistory.some(r => r.questionId === id && r.success)`
- `mastery_check` → last `count` attempts in skill × difficulty are all successes AND `hintsUsed === 0`

### Rewind branch

If the same `mastery_check` fails 2× in a row, engine inserts a remedial `drill` of that skill **ahead of** the `mastery_check` (tracked in `rewoundSteps` for audit). This catches "user got lucky in the lesson but can't do it cold."

### Reason field

The `reason` string is the Coach UI's voice. Examples:

- *"Learn WHERE. Your radar shows 0 on filtering. This unlocks Challenge #3 next."*
- *"Level up GROUP BY — your radar is 62, Analyst Day-One needs 75+. Drill next."*
- *"You failed the JOIN mastery check twice. Rewinding to a JOIN refresher drill before we retry."*

### Testability

Pure function. Takes plain objects. Returns plain objects. Target: **30+ unit tests** in `tests/coach.test.js` covering graduation, skipIf, rewind, each step type, each exit criteria shape, empty history, stale history, edge cases.

---

## UX: The Coach View

### Tab rename and re-enable

- `🤖 AI Tutor` → `🎯 Coach`
- `tabs.guide: false` → `true` (staged, not MVP-day-one)

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Analyst Day-One Ready        Progress: ████░░░░░ 43%    │
│    ~9 of 15 hours in                                        │
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

### Cost envelope

- ~3 AI calls per active user per day (intro + up to 2 step summaries)
- ~200 tokens total
- <$0.01/user/day on cheap model
- Falls inside existing `aiDailyUsage` quota system

### Prompt caching

Use Anthropic's prompt cache for the shared system prompt. User-specific context (goal, step, radar) is a short suffix.

---

## Rollout

### Phase 1 — ship tasks

| Task | Location |
|---|---|
| Goal registry (3 goals) | `src/data/goals.js` |
| Progress engine (pure function) | `src/utils/coach.js` |
| Engine unit tests (30+) | `tests/coach.test.js` |
| Goal registry validation tests | `tests/goals.test.js` |
| Coach view component + goal picker | `src/app.jsx` (under `activeTab === 'guide'`) |
| Deep-link routing (sessionStorage `coachReturnStepId`) | Practice + Interview tabs |
| AI intro + summary helpers with cache + fallback | `src/utils/coach-ai.js` |
| Tab rename, flag stays off during dev | `src/data/feature-flags.js` |

### Rollout stages

1. **Dev + QA.** Flag stays off. QA via existing URL override `?ff_tabs_guide=true` on test2/elena accounts.
2. **Dogfood.** Author uses it for a week. Friction ≥ 3 → iterate curriculum.
3. **Soft launch.** Flip `tabs.guide: true` for *new signups only* — tag in `userData.enrolledInCoach: true` at signup. Existing users unchanged until they opt in.
4. **Full launch.** Flip flag globally.

---

## Measurement

- **Adoption:** % of active users who start a goal
- **Progression:** median steps completed in first 7 days post-start
- **Graduation:** % who hit exit criteria within 2× estimated hours
- **Outcome proxy (the one that matters):** radar delta from goal-start to goal-complete. Target average: **+15–20** across targeted skills.
- **Qualitative:** one-line survey on goal-complete — *"How confident are you in [goal]?"* 1–5 scale.

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
