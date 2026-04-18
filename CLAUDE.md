# SQL Quest — Claude Instructions

## Design System
Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, border-radius, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

Enforcement:
- Never introduce a new color outside the `DESIGN.md` palette.
- Never use Inter, Roboto, Poppins, Montserrat, or any blacklisted font.
- The accent color (`#FFE34D`) appears ONLY on primary CTAs, score/XP values, leaderboard medal ranks, streak indicators, and win-state flashes. Never on borders, backgrounds, icons, or decoration.
- The SQL syntax palette (blue keyword / green string / orange number) is brand, not a generic IDE theme.
- In QA or review mode, flag any code that doesn't match `DESIGN.md`.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review

---

## Current state of play (April 2026)

### Build system
- **Vite** (NOT Babel CLI). `npm run build` → `vite build` → `public/app.js` (IIFE, React external, window.SQLQuest set at bottom of src/app.jsx).
- `npm run dev:vite` → HMR at :5173. `npm run dev` still runs `npx serve public/` for the preview MCP on :4321.
- Babel fallback kept as `build:jsx:babel` for one release.
- `ws` dev-dep installed for scripts/smoke-test.js (headless Chrome e2e).

### Coach engine (source of truth: src/utils/coach.js)
- Pure function `computeNextStep` imported into app.jsx (Coach inline mirror deleted).
- **Step types**: lesson, challenge, drill, mastery_check, retrieval_check, placement_check.
- **Goals** in src/data/goals.js: Fundamentals (27 steps), Analyst Day-One (25 steps). FAANG Interview Prep in copy only, not yet a real goal.
- Coach tab is live for all users (`tabs.guide: true` in feature-flags.js). Skill Forge retired — folded into the Coach's Quick Drill card.
- Placement check auto-injects for cold users (< 150 summed skill points).

### Skill radar (10 canonical skills, CURRENT state)
In `CANONICAL_SKILLS` (src/utils/skill-calc.js):
SELECT Basics · Filter & Sort · Aggregation · GROUP BY · JOIN Tables · Subqueries · String Functions · Date Functions · CASE Statements · Window Functions

**Pending user-approved taxonomy reshuffle (NOT YET SHIPPED):**
- Merge `SELECT Basics` + `Filter & Sort` → **Querying Basics** (foundational, auto-floored)
- Merge `Aggregation` + `GROUP BY` → **Aggregation & Grouping**
- Rename `JOIN Tables` → **Joins**
- Rename `Subqueries` → **Subqueries & CTEs**
- Rename `CASE Statements` → **Conditional Logic**
- Add NEW: **NULL Handling** (10 challenges tagged)
- Drop **Set Operations** from radar (only 4 challenges — too thin)
- Net: 9 skills. Existing user data migrates by taking max of merged-skill scores.
- Content gaps flagged: String Functions (5 challenges), Window Functions skew (31 Hard / 1 Medium / 1 Easy)

### Recent skill-calc fixes (all shipped)
1. **Provenance policy** — require attempt corroboration for credit when user has ANY attempt history. Legacy pre-tracking users (zero attempts) still get full credit. Fixes "user has N solves in the Set but never really attempted them."
2. **Canonical dedupe** — pre-scan (SOURCE 1 totals) and solve-credit loop both dedupe canonical keys. Fixes double-counting when a challenge has ["SELECT", "DISTINCT"] both mapping to SELECT Basics.
3. **Foundational floor** — after all skills compute, SELECT Basics floors at MAX of advanced skills, Filter & Sort at 85% of that. Fixes "I can do Windows at 70 but the radar says my SELECT is 40."
4. **Attempts buffer** bumped 100 → 500 in auto-save.
5. **Elena's case** was a double bug: stale solvedChallenges without attempts + dedupe bug. Final Windows score: 78 → 27.

### Landing pages + marketing
Three variant pages, all with analytics events isolated by `variant` tag:
- `/` — adaptive_tutor_v1
- `/after-the-sql-course/` — after_course_v1 (Udemy/Coursera targeting)
- `/after-bootcamp/` — after_bootcamp_v1 (Flatiron/GA/Metis targeting)

All share the Coach screenshot-style mock in `scripts/coach-mock-snippet.html` (10-axis SVG radar, next-step card, streak). Sitemap + structured data updated. Analytics events: `landing_view`, `cta_hero_primary`, `cta_coach_section`, `faq_open`, `scroll_depth`.

### Email capture (USER MUST DEPLOY)
Three Supabase Edge Functions (code committed, NOT deployed):
- `capture-email` — POST from signed-out Coach → upsert into `email_captures` table
- `capture-email-drip` — daily cron, 5-email sequence over 10 days
- `email-unsubscribe` — token-based GET, flips unsubscribed=true

Schema migration SQL documented in `supabase/functions/capture-email/index.ts` docstring. User needs to:
1. Run migration SQL in Supabase dashboard
2. `supabase functions deploy capture-email capture-email-drip email-unsubscribe`
3. Schedule pg_cron for drip function at 14:00 UTC daily

### Pricing (Pro modal)
$19/mo · $99/yr · $199 lifetime. Rewritten Coach-forward:
- "Free includes the Coach. Pro adds:" → Unlimited AI Tutor, Hard challenges, Full Mock Interview bank, All Daily difficulties, Full Warm-Up bank, 30-Day Challenge, Priority support.

### Testing
- **329 tests passing** across 10 test files (vitest). Runs via `npm run test:run` or `npx vitest run`.
- `scripts/smoke-test.js` (headless Chrome e2e): 8/8 pass against a live dev server. Run with `npm run smoke` (dev server must be up on :4321 or pass URL arg).

### Notifications
Major overhaul this session: persist `dismissedNotifs`, `_subtabEnabled()` gates routes by feature flag, threshold-aligned with Quick Drill (<65), dedup by `target` string, clock-tick recompute, NOTIF_PRI constants (streak=0). Reviews Due block commented-out until Coach surfaces retrieval checks outside goals.

### Outstanding inline mirrors (Phase 2.2 pending)
- **Weekly Report** (~190 lines, around line 6710 in app.jsx) — not yet imported from src/utils/weekly-report.js
- **Skill-drill helpers** (~50 lines, around line 1498) — top-level scope, easy swap
- **Canonical skill mapper** (line ~7216) — regex-based; intentionally different from SKILL_TO_RADAR, leave as-is

### Key files
- `src/app.jsx` (~24,200 lines) — the monolith. Most session work lives here.
- `src/utils/coach.js` · `skill-calc.js` · `weekly-report.js` · `skill-drill.js` — pure functions with tests
- `src/data/goals.js` · `challenges.js` (125) · `lessons.js` (10) — content
- `tests/` — 10 test files, 329 tests total
- `vite.config.js` — build config, dev server, data bundle plugin
- `scripts/smoke-test.js` · `build-og.sh` · `build-ads.sh` — dev tooling

### Known deferred items (no urgency)
- Coach Phase 3 item 3: AI daily intro + step summary (rate-capped)
- Weekly-report + skill-drill inline mirror deletion
- Dead-code prune for orphan Skill Forge helpers (detectWeaknesses, etc)
- Browser push notifications via the existing `notificationsEnabled` state
- OG image V2 showing the Coach mock (current is hero-only)
