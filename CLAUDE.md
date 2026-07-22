# SQL Quest — Claude Instructions

## Design System
Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, border-radius, and aesthetic direction are defined there.
Do not deviate without explicit user approval.

## LinkedIn / Marketing Voice
For any LinkedIn, Twitter, or external-facing copy (build-in-public posts, launch posts, educator/investor outreach), always read `~/.gstack/projects/goktugozdem2-sql-quest2/linkedin-voice.md` first. Core principle: **ağırlık + otorite + iki tarafı onurlandırma**. No hustle/funnel-disclose tone. No anecdotal "bile denedi" framing. Use "Hoca / Hocamız" register. Bilingual posts: Türkçe önce, `———` ayraç, English altta.

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

### Email lifecycle (LIVE as of 2026-07-16, all Resend-based)
All deployed + scheduled via pg_cron. Cron jobs MUST use full `https://` URLs —
scheme-less URLs make pg_net fail with a misleading "Out of memory" (this
silently killed streak-reminder/skill-decay/welcome-back for months).

| Function | Cron (UTC) | Job |
|---|---|---|
| `capture-email-drip` | 14:00 daily | 5-email drip to captured leads |
| `welcome-back` (job: welcome-back-daily) | 10:00 daily | low-XP, 3d+ inactive |
| `skill-decay` | 10:00 daily | XP≥100, 5d+ inactive, rusty skills |
| `streak-reminder` | 18:00 daily | streak alive, active yesterday, not today |
| `checkout-abandon` | 15:00 daily | clicked checkout 24-72h ago, didn't buy — founder note, reply-to goktug@datrick.com, ONCE per user ever |
| `weekly-digest` | Mon 09:00 | personalized weekly report (the "newsletter") |
| `resend-webhook` | (webhook) | Resend delivered/opened/clicked/bounced → email_events |

Measurement: every send logs to `email_events` (best-effort); Resend webhook
appends engagement rows joined by resend_id. Read side: sections 5-6 of
`scripts/funnel-report.sql` — the metric that matters is returned_48h, not opens.
Shared plumbing (utm/ensureUnsubToken/sendAndLog) is INLINED per function —
keep the blocks in sync. Registered-user unsubscribe: `?ut=<users.data.unsubToken>`
on email-unsubscribe → sets `emailOptOut` (every sender checks it).
Pending user action: Resend dashboard → webhook endpoint + `supabase secrets set RESEND_WEBHOOK_SECRET`.

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

### Search-engine indexing
**A sitemap entry is discovery, not a crawl signal.** On a domain with this little
authority, a page with zero internal links does not get crawled — no matter how
healthy the sitemap is. The 4 fintech pages (shipped Jul 16) sat unindexed on BOTH
engines through Jul 22 while Bing's sitemap report read "57 URLs, Success, crawled
yesterday" and URL Inspection read "not known to Bing". They were orphans: zero
internal links. `stripe-sql-interview`, linked from 7 places, was indexed on both.
**Ship every new landing page with internal links in the same commit** — the
homepage nav dropdown + footer (`src/index.html`) and the relevant hub. Note company
pages do not cross-link each other at all; that gap is still open.

- **Google**: GSC domain property `sc-domain:sqlquest.app`. New pages need a manual
  URL Inspection → Request Indexing.
- **Bing**: Webmaster Tools IS set up (site picker also holds claudequest.app and
  datrick.com — check the selected site before reading anything). URL Inspection →
  Request Indexing there too, quota 100 URLs/day. The submission lands via the
  quota counter, not the URL Submission table, which lags.
- **IndexNow**: `npm run indexnow` — submits sitemap URLs with `lastmod` in the last
  7 days, so run it after any deploy that bumps lastmod. Ownership key is
  `public/<32-hex>.txt`; the script derives the key from the filename and probes
  that it's live before POSTing. Feeds Bing/Yandex/Seznam/Naver — Google ignores it.

### Known deferred items (no urgency)
- Coach Phase 3 item 3: AI daily intro + step summary (rate-capped)
- Weekly-report + skill-drill inline mirror deletion
- Dead-code prune for orphan Skill Forge helpers (detectWeaknesses, etc)
- Browser push notifications via the existing `notificationsEnabled` state
- OG image V2 showing the Coach mock (current is hero-only)
