# CLAUDE.md history — sections moved out on 2026-11-22

Moved verbatim from `CLAUDE.md` (BACKLOG item 24): shipped fixes, a feature
switched off the night it shipped, deploy notes and an April changelog.
They were loaded into every session and no longer describe what an agent
needs to act on. `CLAUDE.md` keeps a one-line pointer to each.

---

### Recent skill-calc fixes (all shipped)
1. **Provenance policy** — require attempt corroboration for credit when user has ANY attempt history. Legacy pre-tracking users (zero attempts) still get full credit. Fixes "user has N solves in the Set but never really attempted them."
2. **Canonical dedupe** — pre-scan (SOURCE 1 totals) and solve-credit loop both dedupe canonical keys. Fixes double-counting when a challenge has ["SELECT", "DISTINCT"] both mapping to SELECT Basics.
3. **Foundational floor** — after all skills compute, SELECT Basics floors at MAX of advanced skills, Filter & Sort at 85% of that. Fixes "I can do Windows at 70 but the radar says my SELECT is 40."
4. **Attempts buffer** bumped 100 → 500 in auto-save.
5. **Elena's case** was a double bug: stale solvedChallenges without attempts + dedupe bug. Final Windows score: 78 → 27.

---

### Public Profile (USER MUST DEPLOY for cross-device reads)
Phase 4b + 4c shipped client-side; Supabase needs migration + deploy.

Schema migration (paste into Supabase SQL editor):
```sql
create table if not exists public.public_profiles (
  handle           text primary key,
  display_name     text,
  skills           jsonb not null default '{}'::jsonb,
  total_solves     int    not null default 0,
  streak           int    not null default 0,
  xp               int    not null default 0,
  archetype_name   text,
  archetype_emoji  text,
  ownership_hash   text not null,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index if not exists public_profiles_updated_at_idx
  on public.public_profiles (updated_at desc);
alter table public.public_profiles enable row level security;
create policy "Public read of profiles"
  on public.public_profiles for select
  to anon using (true);
```

Deploy the functions:
```
supabase functions deploy publish-profile og-profile
```

After deploy, the /u/:handle URL works cross-device (reads via Supabase
REST anon). /functions/v1/og-profile?handle=foo returns a 1200×630 SVG
card suitable for og:image. Client auto-publishes 15s after any skill
change (debounced). Handle ownership is bound to a password-hash-derived
fingerprint; squatters can't overwrite a claimed handle.

Known limitation: Twitter/LinkedIn/etc scrape server-rendered HTML, so
the client-side og meta injection won't unfurl in tweets. Full OG support
needs a Vercel Edge Function rewriting /u/:handle HTML with proper meta
tags — deferred to Phase 4d if/when viral loop warrants it.

---

### The goal gate — nobody uses the app without a goal (2026-09-25) — OFF

**Off the same night (founder): the ask moved after the first solve, inline
and skippable — `intakeAfterFirstSolve`. `goalGate: false`; the component is
kept for the one required screen, after payment. What follows describes it
as built.**

- Founder's directive: every person, guest or registered, states **goal,
  deadline, target level, industry** (company optional for an interview).
  Required — no close, no skip, no Escape; shown at every session start and
  re-checked every ten minutes until complete; asked again, prefilled, when
  the deadline passes; never over a running timed mock. Flag `goalGate`.
  Pure half `src/utils/goal-gate.js`, guards `tests/goal-gate.test.js`
  (incl. "no close button" source guards and both languages' labels).
- Answers go through `completeIntake(…, goalSource 'gate')` (intent, Coach
  goal only when none is active, `prepTarget`, intake record) plus
  `userGoals.targetLevel/industry/sector` and `userData.goalProfile` (rides
  the autosave; the newer of account and browser wins on sign-in). Events
  `goal_gate_shown` / `goal_gate_completed` (daysOut, never the date);
  metric `goal_gate_funnel`; ledger "every person states a goal…". "Edit
  goal" on the Coach reopens it (`data-testid="coach-edit-goal"`).
- z-order: the gate is 10000 (above the first-run tour's 9999); the feedback
  box is 10001 so a person can still write to us from behind it.
- It supersedes the intake card and the returning ask for goal capture;
  those stay dark. Its cost is read on `first_solve_10m` (baseline 12.4%).

---

### Notifications
Major overhaul this session: persist `dismissedNotifs`, `_subtabEnabled()` gates routes by feature flag, threshold-aligned with Quick Drill (<65), dedup by `target` string, clock-tick recompute, NOTIF_PRI constants (streak=0). Reviews Due block commented-out until Coach surfaces retrieval checks outside goals.

---

### Outstanding inline mirrors (Phase 2.2 pending)
- **Weekly Report** (~190 lines, around line 6710 in app.jsx) — not yet imported from src/utils/weekly-report.js
- **Skill-drill helpers** (~50 lines, around line 1498) — top-level scope, easy swap
- **Canonical skill mapper** (line ~7216) — regex-based; intentionally different from SKILL_TO_RADAR, leave as-is
