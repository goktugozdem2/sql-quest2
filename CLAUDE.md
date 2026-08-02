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

## Data-driven development
The operating system for measurement and product decisions is
`docs/data-driven-product.md` — principles (people-not-events, kill
criteria written before data, stripe_webhook as the only money truth),
metric definitions (engaged = 5+ solves), instrumentation standards,
the read calendar, and the measurement-debt list. Read it before adding
events, metrics, hypotheses, or anything paywall-adjacent. Read side:
`scripts/funnel-report.sql` (§14 = hypothesis registry) + `npm run
metrics:report`.

## Current state of play (April 2026)

### Build system
- **Vite** (NOT Babel CLI). `npm run build` → `vite build` → `public/app.js` (IIFE, React external, window.SQLQuest set at bottom of src/app.jsx).
- `npm run dev:vite` → HMR at :5173. `npm run dev` still runs `npx serve public/` for the preview MCP on :4321.
- Babel fallback kept as `build:jsx:babel` for one release.
- `ws` dev-dep installed for scripts/smoke-test.js (headless Chrome e2e).

### Coach engine (source of truth: src/utils/coach.js)
- Pure function `computeNextStep` imported into app.jsx (Coach inline mirror deleted).
- **Step types**: lesson, challenge, drill, mastery_check, retrieval_check, placement_check.
- **Goals** in src/data/goals.js: Fundamentals (27), Analyst Day-One (25), SQL Interview Prep (28). The goal picker just maps `window.coachGoals`, so a new goal needs no UI work.
- **Authoring a goal — the two traps that already bit us:**
  1. Skill names must be the 9 canonical ones (see Skill radar above). `tests/goals-registry.test.js` enforces this against the live radar.
  2. Never put a `retrieval_check` on a lesson that only appears behind a
     `skipIf` without knowing the rule: the engine treats a radar-skipped
     source lesson as the learning event and anchors spacing to goal start.
     Before that fix, strong users skipped the lesson and then jammed on the
     retrieval check forever (analyst-day-one d1-9 / d1-24).
- Coach tab is live for all users (`tabs.guide: true` in feature-flags.js). Skill Forge retired — folded into the Coach's Quick Drill card.
- Placement check auto-injects for cold users (< 150 summed skill points).

### Skill radar (9 canonical skills — the reshuffle SHIPPED)
`CANONICAL_SKILLS` (src/utils/skill-calc.js) is the single source of truth:
Querying Basics · Aggregation & Grouping · Joins · Subqueries & CTEs · Conditional Logic · Window Functions · String Functions · Date Functions · NULL Handling

The old 10-skill names (SELECT Basics, Filter & Sort, Aggregation, GROUP BY,
JOIN Tables, Subqueries, CASE Statements) are **retired**. They survive only as
input keys in `SKILL_TO_RADAR` / `SkillRadar.KEY_NORM`, which map raw challenge
tags and legacy stored data onto the 9. Never author a new reference to them.

**Three namespaces, don't confuse them:**
- `weaknessTracking.skillLevels`, goal `skipIf`, goal `exitCriteria` → the 9
  canonical names. This is what `calculateSkillLevels()` returns.
- `challengeAttempts[].topics` → RAW challenge tags (`challenge.skills` +
  `category`: "LEFT JOIN", "ROW_NUMBER", "Window Functions + CTE"). Resolve
  through `SKILL_TO_RADAR` before comparing to a canonical name.
- `drill.skill`, `challengeMatchesSkill()` → canonical (it resolves tags itself).

This drift already cost us once: goals.js kept the 10-skill names after the
radar shipped the 9, and 46 references went dead silently — see "Coach goal
registry" below. `tests/goals-registry.test.js` now binds the registry to the
live radar keyspace so it can't happen again.

Measured content depth per canonical skill (Jul 22, via `challengeMatchesSkill`
against the live bank — the older "5 String Functions / 31-1-1 window" note was
stale by a wide margin):

| Skill | Easy | Medium | Hard |
|---|---|---|---|
| Window Functions | 3 | 9 | 32 |
| Joins | 4 | 18 | 16 |
| Subqueries & CTEs | 3 | 25 | 34 |
| String Functions | 7 | 4 | 1 |

Measured 2026-07-23, after IDs 168-179 shipped the on-ramps. All three had a
cliff — Window Functions had **zero** Easy against 32 Hard; Joins had one;
Subqueries & CTEs had none, and its gentlest entry was "Your First CTE" at
Medium (a CTE plus COUNT plus AVG plus GROUP BY, four ideas at once).
String Functions is the inverse shape: a floor but no ceiling, 1 Hard.
Re-measure before quoting; this table went stale twice within a day.

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

All share the Coach screenshot-style mock in `scripts/coach-mock-snippet.html` (10-axis SVG radar, next-step card, streak). Sitemap + structured data updated.

**Landing analytics — read this before trusting a landing number.** Until
2026-07-28 this section claimed `landing_view` / `cta_hero_primary` /
`cta_coach_section` / `faq_open` / `scroll_depth` were live. They were not.
`trackLanding()` sent only to `window.va`, and **Vercel Custom Events require
Pro** — this team is on Hobby (verified against the API for both the personal
account and the team). Every one of those events had been discarded since the
day it was written; `pro_events` had zero rows for all five, ever.

Now: `src/track.js` is injected into all 99 built page copies by
`scripts/build-static-pages.js` (anchored on the Vercel insights tag, falling
back to `</body>` for the 10 blog posts, which carried no analytics of any
kind). It writes `landing_view` and every `[data-track]` click straight to
`pro_events` with `reason='landing'`, carrying the same `aid` the app stamps —
so a landing view and a later solve are joinable for the first time.

- **`app.html` is excluded on purpose**, the only page that is. It has richer
  first-party instrumentation and a second pageview source would only burn the
  50k/month Hobby event cap, which is **shared across all ten team projects**.
- Still Vercel-only (i.e. still discarded): `faq_open` and `scroll_depth`,
  which are called directly through `trackLanding` rather than via
  `[data-track]`. Move those call sites if you want them.
- Vercel Hobby also caps the reporting window at **1 month** and offers no UTM
  parameters, so don't plan a paid-acquisition read on it.
- Three `reason='landing'` rows on 2026-07-28 (aid `e5fcbad1a022…`) are
  localhost verification traffic — exclude that aid from the first read.

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

### Inbound: how users reach us (fixed 2026-07-25)

Until this date they could not, at all. The app had no contact affordance —
no mailto, no help, no feedback — and all 8 mailto links on the site pointed
at `support@sqlquest.app` on a domain with **no MX record**, so every message
anyone sent was dropped by DNS. Those links are on refund/privacy/terms, i.e.
where an unhappy paying customer goes. Root cause: Cloudflare Email Routing
had been half-configured five months earlier — rule Active, destination
Verified, DNS records never added, service Disabled.

| Channel | State |
|---|---|
| **In-app widget** | 💬 button on every screen → `feedback` table. Primary channel — carries screen, solve count, guest/pro, intent, arrival source, tz, viewport, which email never will. |
| **`support@sqlquest.app`** | Cloudflare Email Routing → `goktug@datrick.com`. **Inbound only** — you cannot send *from* support@; replies go from goktug@. |
| `goktug@datrick.com` | reply-to on all transactional mail. Not published on the site. |

- Table + RLS: `supabase/migrations/20260725_feedback.sql`. INSERT-only for
  anon; there is no select policy, so the shipped anon key cannot read anyone's
  feedback back out. Verified: anon insert hits the CHECK (23514, permitted),
  anon select returns `[]`.
- **Read it weekly — §16 of `scripts/funnel-report.sql`.** A channel nobody
  reads is the same failure as the referral functions (deployed, wired, zero
  events for months). n will be small: read the verbatims, don't aggregate.
- Events: `feedback_opened` / `feedback_submitted` / `feedback_failed`.
  `feedback_failed` should stay at zero — a row there is someone who tried to
  reach us and couldn't.
- Known gap: DMARC `rua` points at `dmarc@sqlquest.app`, which has no routing
  rule, and catch-all is Drop/Disabled — so aggregate reports bounce. Harmless
  today (`p=none`), but add a rule before relying on DMARC reporting.
- Don't put a root SPF on `sqlquest.app` without checking Resend first:
  sending uses `send.sqlquest.app` as Return-Path (its own SPF + amazonses MX)
  with DKIM at `resend._domainkey`. Cloudflare added MX only, which is why
  outbound was unaffected.

### Email lifecycle (LIVE as of 2026-07-16, all Resend-based)
All deployed + scheduled via pg_cron. Cron jobs MUST use full `https://` URLs —
scheme-less URLs make pg_net fail with a misleading "Out of memory" (this
silently killed streak-reminder/skill-decay/welcome-back for months).

| Function | Cron (UTC) | Job |
|---|---|---|
| `capture-email-drip` | 14:00 daily | 5-email drip to captured leads |
| `welcome-back` (job: welcome-back-daily) | 10:00 daily | low-XP, 3d+ inactive |
| `skill-decay` | 10:00 daily | XP≥100, 5d+ inactive, rusty skills |
| `streak-reminder` | **hourly** (`0 * * * *`) | streak alive, active yesterday, not today. Runs hourly BY DESIGN: it mails each user only when THEIR local clock reads 18:xx, from the tz stamped on their events. Do not "simplify" this to a daily cron — that would collapse it to one timezone band. Verified against cron.job 2026-07-26. |
| `checkout-abandon` | 15:00 daily | clicked checkout 24-72h ago, didn't buy — founder note, reply-to goktug@datrick.com, ONCE per user ever |
| `weekly-digest` | Mon 09:00 | personalized weekly report (the "newsletter") |
| `lapsed-pro` | **NOT SCHEDULED** | win-back for expired Pro. `?dry=1` previews the audience. Targets `proStatus=true` AND expiry past — the stale flag IS the segment. 5+ solves, 3d after expiry, once per user ever, capped 8/run. The only channel that reaches them: they stopped returning, so no in-app trigger can fire. Cron deliberately unset — sending is a decision, not a default. |
| `resend-webhook` | (webhook) | Resend delivered/opened/clicked/bounced → email_events |

Measurement: every send logs to `email_events` (best-effort); Resend webhook
appends engagement rows joined by resend_id. Read side: sections 5-6 of
`scripts/funnel-report.sql` — the metric that matters is returned_48h, not opens.
Shared plumbing (utm/ensureUnsubToken/sendAndLog) is INLINED per function —
keep the blocks in sync. Registered-user unsubscribe: `?ut=<users.data.unsubToken>`
on email-unsubscribe → sets `emailOptOut` (every sender checks it).
Resend webhook LIVE (2026-07-23): endpoint → resend-webhook fn, 5 events, secret set, e2e-verified (401 on forged sig, 200 + email_events row on valid). Stripe endpoint listens to 4 events incl. `invoice.payment_failed`.

**Internal accounts** (`test2`, `sqlquest`, `fabletest*`, `linktest*`,
`internalroutine*`) carry real addresses and used to pass every audience
filter, landing in `email_events` and inflating the send counts and
48h-return rates these campaigns are judged by. FIXED 2026-07-28: all seven
senders now carry the same broad `isInternalAccount` as `src/utils/leagues.js`,
matching on username patterns AND on `@datrick.com` / `@example.com` /
`@mailtest.com`. It is one of the inlined blocks — keep it in sync.

**A cooldown is not a limit.** `skill-decay` mailed 59 people in one morning on
2026-07-28: 58 were the same batch first mailed on 07-17, whose `COOLDOWN_DAYS
= 10` expired together. (The 07-27 run fired at 10:00:04.448, inside the
boundary by milliseconds, so only 3 cleared that day — hence 3 then 59.)
Nothing was wrong with the audience query; the cooldown only *spaces* sends,
it never *stops* them, so a user who lapses and never returns clears it
forever. Both automatic senders now have `MAX_LIFETIME_SENDS = 3` (counted
from `email_events`, which spans the `skill_decay` → `skill_decay_lesson`
rename of 07-20, so the ceiling covers users mailed before it existed) and
`MAX_DORMANT_DAYS = 90`. `checkout-abandon` and `lapsed-pro` were always
once-per-user-ever; those two were the ones written as a decision rather than
a default.

**`users.data.lastActive` is epoch-ms on some rows and an ISO string on
others.** `new Date()` swallows both, so JS gates are fine — but SQL over it
needs a `~ '^[0-9]+$'` branch or it dies with "date/time field value out of
range".

**`opened` has been 0 since the webhook went live.** `delivered` flows
normally (79 on 07-28), so the endpoint and signature are fine — open
tracking is off at the send call. Don't read opens as engagement; they are
structurally zero. returned_48h is the metric anyway.


### Pricing (Pro modal)
**$29/mo · $99/yr ($8.25/mo) · $199 lifetime** — verified 2026-07-25 against
the live modal in `src/app.jsx` (~line 26320), which is the surface that calls
`beginCheckout`. This line previously read "$19/mo" and was wrong; 13 landing
pages correctly said $29 and nearly got "corrected" to match the stale doc.
Prices live in the modal, not here — re-read the modal before quoting.
Rewritten Coach-forward:
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
homepage nav dropdown + footer (`src/index.html`) and the relevant hub. Company-page
cross-linking gap CLOSED 2026-08-02: all 22 company pages now carry a
grouped sibling strip (FAANG/AI/fintech/banking/consumer/data) — GSC had
shown /anthropic-sql-interview/ crawled-but-not-indexed as the cost.

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
