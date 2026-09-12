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

## Email voice — RULE, applies to every email written for Göktuğ

**The subject line must say the founder is writing.** Not the body alone — the
headline. The recipient decides whether to open based on the subject, and the
one thing that makes a cold email from a 164-user product worth opening is that
the person who built the thing is writing to them personally. Vary the phrasing
so a batch does not look like a mailing:

- `I build SQL Quest — <the specific thing>`
- `From SQL Quest's founder — <the specific thing>`
- `SQL Quest's founder here — <the specific thing>`
- `From the person who builds SQL Quest — <the specific thing>`
- `A question from the person who builds SQL Quest`

Then the specific: the challenge they got stuck on, the plan they clicked, the
number of solves. Founder signal earns the open; the specific earns the reply.

Rest of the rule:
- Sign off **`Göktuğ` / `Founder, SQL Quest`**, never a bare name.
- Say somewhere in the body that this is written by hand to a short list —
  "I'm writing this myself", "one at a time", "there are only a couple of dozen
  people on this list". At our size that is *true*, and it is the whole
  advantage we have over a company that cannot do it.
- Never send a batch of byte-identical bodies. Same substance is fine, shared
  paragraphs are not. Thirteen identical messages inside a minute is the
  fingerprint bulk filters look for — see `docs/outreach-2026-08-05.md`.
- Still no pitch, no follow-up sequence, and say so. The ask is one question.

This is the *outreach* voice. LinkedIn/Twitter copy is a different register —
see the linkedin-voice section above.

## Agent-PR review ritual — standing rule

At the start of any session (and whenever asked "durum ne" / "what's
pending"), check `gh pr list --state open` for branches matching `agent/*`.
For each one, do a real review — diff, its ledger claim, guard/CI status —
and present an approval brief, not the raw diff:

- **What it changes** (2 sentences, plain language)
- **The claim**: metric, baseline, target, read date — and whether the metric
  exists in `docs/agent/metrics.md` (missing = flag, the verdict would be
  UNDEFINED)
- **Risk**: what breaks if it's wrong, one sentence
- **Recommendation**: MERGE / REJECT / REVISE, with the reason. Recommending
  REJECT is expected behaviour, not failure — a reviewer that always says
  merge is not a gate.

Never merge without the founder's explicit go in chat. Never treat silence as
approval. If the fleet and the reviewer are the same model family, say so in
the brief when the change is subtle enough that correlated blind spots matter.

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

## Objectives — read this first
`docs/agent/objectives.md` holds the current objective, its measured starting
point, its checkpoints and what we would conclude at each. The ledger holds
claims; objectives hold what the claims are *for*. Read it at the start of a
session, before the ledger. Current: **50 paying customers per month by
2026-12-08**, from 2 on 2026-09-09.

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
- **The placement check is where cold goal-starters stop** (measured
  2026-09-12: 102 handed it, 50 never started it, 43 stopped inside, 4
  finished, 4 ever completed a curriculum step). Behind
  `coachTrustQuizPlacement` (flips 2026-09-27) a first-run placement is
  trusted instead: `placement.skippedBy='first_run_quiz'` and
  `coachState.seedFloors` — floors that ONLY `skipIf` sees
  (`applySeedFloors` in coach.js); never the radar, never graduation.
  `tests/placement.test.js` pins all three.

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

### Challenge recommendation ordering — the raw-array trap (fixed 2026-08-05)

**Never `.find()` or `[0]` over the raw `challenges` array to pick what a user
should do next.** It is FAANG-interview ordered — ids 1-90 hard bank, 91-105
beginner ladder, 106-115 medium bridge — so the first Medium by id is **id 1**,
which was our worst challenge: 138 openers, 33 finishers, **24% solve-through**,
and all 30 `challenge_errored` rows on the beginner list. Id 91, the one written
to be first, converts at 73% on an identical definition.

Every curriculum path was already correct: `FIRST_RUN_LEVELS` starts brand-new
users at 91, `SQL_ROADMAP_STAGES[0]` is `[91, 92]`, `COACH_PLACEMENT_CHALLENGE_IDS`
starts at 91. Challenge 1 was legitimately first in exactly one place — the
`advanced` first-run track, where a Medium diagnostic is the point. The leak was
four *recommendation* sites reading raw id order and overriding all of it:
post-solve `nextChallengeRec`, the warm-up card's `nextUp`, and the "What's
next" strip's `nextSameDiff` / `nextHarder`. Every Medium solver was handed
challenge 1 as "what's next".

The same bug had already been found and fixed once, locally, in the onboarding
handoff. It was never generalised, so it grew back four times.

- Pure logic + the full incident note: `src/utils/challenge-order.js`
  (`buildCurriculumOrder`, `makeChallengeComparator`, `pickNextChallengeWith`).
- app.jsx wraps it as `pickNextChallenge(pool, predicate)`. Use it.
- `tests/challenge-order.test.js` binds to the LIVE bank and the LIVE roadmap
  (parsed out of app.jsx so it can't drift), and carries a **source guard** that
  fails on any `challenges.find(c => … difficulty …)` reappearing. Mutation-
  verified: reverting the picker to raw order fails 3 tests by name.
- Measured after the fix, in the live bundle: cold user `#1 → #91`, post-Medium
  `#1 → #107`.

**Re-measure challenge 1 around 2026-08-12.** Its description was also rewritten
on 08-05. Two changes landed the same week, so the read is confounded by design —
if solve-through moves, you will not know which one did it. What you *can* read
is whether it still receives first-contact traffic at all; it should not.

### Landing pages + marketing
Three variant pages, all with analytics events isolated by `variant` tag:
- `/` — adaptive_tutor_v1
- `/after-the-sql-course/` — after_course_v1 (Udemy/Coursera targeting)
- `/after-bootcamp/` — after_bootcamp_v1 (Flatiron/GA/Metis targeting)

All share the Coach screenshot-style mock in `scripts/coach-mock-snippet.html` (9-axis SVG radar on the 9 canonical skills since 2026-09-07, next-step card, streak). Sitemap + structured data updated.

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

- **The homepage and the two variant pages have a 29-day hole in their
  tracking: live 07-28..08-04, silent 08-05..09-05, live again 2026-09-06.**
  The injector's presence check was `includes('/track.js')`,
  and `src/index.html`, `after-the-sql-course`, `after-bootcamp` and
  `sql-for-the-ai-era` mention "/track.js" in a comment — so the four main
  doors lost the tag. Fixed to match the tag itself. Read those four pages
  from 2026-09-06 only; do not read a landing jump across that date as
  growth (details: docs/agent/metrics.md, shared traps).
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
  reads is the same failure as the peer-to-peer referral loop (deployed,
  wired, and pointed at a column and an RPC that were never created — see
  `supabase/migrations/20260908_referral_personal_codes.sql`; the campaign
  half of the same table has 103 rows). n will be small: read the verbatims,
  don't aggregate.
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
| `trial-reminder-cron` | 14:00 daily | Pro trial ending in 2 days / today. **Was missing from this table entirely** despite an active cron since April — found 2026-08-04 while tracing unjoinable webhook rows. |
| `welcome-back` (job: welcome-back-daily) | 10:00 daily | low-XP, 3d+ inactive |
| `skill-decay` | 10:00 daily | XP≥100, 5d+ inactive, rusty skills |
| `streak-reminder` | **hourly** (`0 * * * *`) | streak alive, active yesterday, not today. Runs hourly BY DESIGN: it mails each user only when THEIR local clock reads 18:xx, from the tz stamped on their events. Do not "simplify" this to a daily cron — that would collapse it to one timezone band. Verified against cron.job 2026-07-26. |
| `checkout-abandon` | 15:00 daily | clicked checkout 24-72h ago, didn't buy — founder note, reply-to goktug@datrick.com, ONCE per user ever |
| `weekly-digest` | Mon 09:00 | personalized weekly report (the "newsletter") |
| `lapsed-pro` | **NOT SCHEDULED** | win-back for expired Pro. `?dry=1` previews the audience. Targets `proStatus=true` AND expiry past — the stale flag IS the segment. 5+ solves, 3d after expiry, once per user ever, capped 8/run. The only channel that reaches them: they stopped returning, so no in-app trigger can fire. Cron deliberately unset — sending is a decision, not a default. **DO NOT SCHEDULE without rewriting the copy first (measured 2026-09-08).** The audience is now 50 accounts, and the email tells a non-payer "Your SQL Quest Pro trial ended {N} days ago" under the subject "Your trial ended before the best part shipped". For at least 7 of them that sentence is false in our favour: their trial did not lapse, the client's auto-renew branch kept pushing `proExpiry` forward on every login until **we** removed it on 2026-09-07 (src/utils/pro-access.js). Telling someone their trial ended, when what actually happened is that we withdrew access we had been giving them by mistake, is a lie of omission in an outward-facing email. Also measured: **0 of the 50 have been active since the fix**, so there is no confusion to clean up and no urgency — 44 were trials, expiries run 2026-03-26 to 09-04, 13 have 10+ solves, 47 have an email. If this segment is ever mailed, the honest version says we were still giving them Pro and stopped, and says why. That is the founder's call to make, not a default to inherit. |
| `resend-webhook` | (webhook) | Resend delivered/opened/clicked/bounced → email_events |

**Every sender must write a `sent` row carrying its `resend_id`.** resend-webhook
resolves template+username by looking that id up; with no matching row it falls
through to `template='unknown'`, and the engagement is unattributable forever.
`capture-email-drip` and `trial-reminder-cron` never logged at all, which is
where all 107 unknown rows came from (fixed + deployed 2026-08-04).
`stripe-webhook` still hard-codes `resend_id: null` in source-fixed-but-not-yet-
deployed form — `payment_failed` has never fired, so it ships with the next
intentional deploy of that function rather than touching the money path early.

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
- **1,406 tests passing** across 59 test files (vitest), incl. `tests/site-counts.test.js` — the guard that fails on any stale product count on a static page — and `tests/cloud-save-contract.test.js`, the guard on the one write that must never lie. Runs via `npm run test:run`. (Measured 2026-09-12 evening; this line goes stale fast — re-run before quoting it.)
- `scripts/smoke-test.js` (headless Chrome e2e): 8/8 pass against a live dev server. Run with `npm run smoke` (dev server must be up on :4321 or pass URL arg).

### Database writes — read before touching `users` or its triggers (2026-09-12)

- **Every client save is a PostgREST upsert sent as `anon`**
  (`_flushCloudSave`, `users?on_conflict=username`). An upsert fires BEFORE
  INSERT triggers even when it resolves to an UPDATE, and a trigger runs as
  the caller unless it is SECURITY DEFINER. So never revoke from `anon`
  anything a `users` trigger calls. The 09-08 referral migration did exactly
  that, and for four days no account could be created and no registered
  account could save; guest rows kept flowing, so nothing looked wrong.
  Ledger entry "users writes restored" has the numbers; the fix is
  `supabase/migrations/20260912100000_*.sql`.
- **`supabaseFetch` returns `null` for success-with-empty-body AND for
  failure.** Pass `{ throwOnError: true }` on any write that must not lie;
  `_flushCloudSave` does, which is what makes `saveUserData({ force: true })`
  actually throw. `tests/cloud-save-contract.test.js` pins both.
- **Tooling:** the Supabase MCP `execute_sql` is read-only. `supabase db
  query --linked -f <file>` reaches production from this machine (the CLI is
  linked through the Management API), but the agent's production writes are
  stopped by the permission classifier — the founder runs the command; the
  agent writes the migration and a rolled-back `set role anon; do $$ … $$`
  probe to prove the failure before and the fix after. `supabase migration
  list` shows 20260725 / 20260907 / 20260908 as applied by hand and
  unrecorded; `db push` would re-run them — do not.
- **Read the postgres error log weekly**: `query_logs` on `postgres_logs`,
  severity ERROR. It is the only place this outage was visible.

### Guest progress — persists, resumes, merges (2026-09-12)

- A browser keeps ONE guest identity under `localStorage.sqlquest_guest_user`;
  `startGuestMode` resumes it from the local blob (never cloud-first — the
  07-24 shredder) when it holds progress and was active in the last 90 days,
  else mints a fresh `guest_<ts>` and forgets the old blob. `sqlquest_user`
  is never set for guests: the mount guard deletes any `guest_*` found there.
- Login merges the guest blob into the account before the session loads
  (`mergeGuestIntoAccount` → `src/utils/progress-merge.js`, a pure union:
  account wins identity, money and scalars; collections union; XP only for
  new solves). The auth-modal register path carries the blob the same way;
  the post-solve prompt always did. Both forget the guest afterwards.
- Events: `guest_resumed`, `guest_progress_merged`, `signup_completed.carriedSolves`
  → `guest_continuity` in `docs/agent/metrics.md`. Tests:
  `tests/progress-merge.test.js` (unit + source guards).

### Onboarding intake — three optional questions before the quiz (2026-09-12)

- Behind `onboardingIntake` (off until the 2026-09-16 scheduled flip, after
  the 105 read). First-run users on the Learning Path tab see goal (an
  interview / job-ready / SQL in general), date, role — each skippable;
  skipping all three completes it; nobody is asked twice. Pure half:
  `src/utils/onboarding-intake.js`; guards: `tests/onboarding-intake.test.js`.
- **No fourth store.** The goal writes `sqlquest_user_intent` +
  `sqlquest_intent_asked` (the post-solve ask's own keys) and maps a Coach
  goal stamped `coachState.source='intake'`; the date goes to
  `prepTarget.date`; the role to `userGoals.role` as a fixed key. The record
  (`sqlquest_intake_v1`, mirrored to `userData.intake`) never holds the date.
- **Never a step toward checkout, never a first-contact mover.** The block
  mentions nothing about Pro (by test); routing for an intake-captured intent
  runs after the first solve through `applyIntentRouting(intent, 'intake')`.
  It fires none of `goal_selected` / `prep_target_set` / `intent_captured`,
  so those funnels keep their meaning; its own events are `intake_shown`,
  `intake_answered`, `intake_completed` (metrics: `intake_funnel`, guardrail
  `first_run_reach`). `coach_tab_viewed` carries `goalSource` — split the
  Coach reads on it, and exclude intake goals from the 11-24 goal split.

### First-run placement — the cap, and the second round that earns it (2026-09-12)

- The level a quiz score maps to lives in `src/utils/placement.js`, nowhere
  else. Flag off: the 2026-08-14 cap — 0–1 `brand-new`, 2 `basics`, 3–4
  `working`; a four-question recognition quiz never declares anyone
  interview-ready (ledger: closed HIT, challenge 1 had been the front door
  for half of all first contacts). Flag `adaptivePlacement` on (scheduled
  2026-10-01): a 4/4 opens `FIRST_RUN_PLACEMENT_ROUND2` (window, CTE, NULL,
  anti-join) and only 3 of 4 there routes to `advanced`. Tiers on the four
  ids: Foundations / Intermediate / Advanced / Interview-ready.
- Events `placement_completed` (`source` quiz | manual, scores, tier — never
  answers) and `placement_round2_started`; metric `placement_mix`. The
  interview-ready opener (challenge 1) is read per door, quiz-placed vs
  self-declared (44%, n=25, 08-14 → 09-11).
- Do not swap the `working` opener a third time from here, and do not let a
  4/4 reach `advanced` without round 2 — `tests/placement.test.js` pins both.

### The free-tier boundary — five flags, all dark (2026-09-12)

- **The finding, not the founder's premise:** the free tier is not too big,
  it is in front of the paid good. Locked Hard is opened by 9% of people who
  open anything, the mocks by 3 people a month and by none of 79
  interview-intent people; company sets are mostly free except Amazon, the
  one set that produced a payer; the interview-prep goal's first locked step
  was 11 and it held no mock. Every purchase was a first-session decision at
  6–10 solves. **Never cut Easy/Medium** — that is the denominator the only
  working ask has (`docs/plans/free-tier-boundary-2026-09-12.md`).
- Pure half `src/utils/free-tier-boundary.js`, guards
  `tests/free-tier-boundary.test.js`, flags in `feature-flags.js`, each with
  its own ledger claim and flip task. `ftbFlag(name)` in app.jsx reads
  `=== true`. Flip calendar: **09-29** `quietEarlyAsks` (M4) · **10-06**
  `deadlineOffer` (M3) · **10-12** `goalWallEarly` + `mockDoor` (M2, M5) ·
  **10-14** `companySetGate` (M1, after the intent-routing reach-6 read it
  would confound). Nothing monetisation-adjacent flips before 09-29.
- M1: in a company view the first three of the set are free, the fourth
  meets `wall='company_set'` (`surface='challenge_set'`), reason
  `company_set`; the banner, the row locks and the set-complete ask all read
  `companyGateFreeIds()`. Solved is never taken back; the general list is
  untouched. Company-page copy ("21 free") changes at the flip — count
  guards will force it.
- M2/M5: `withEarlyWall` reorders interview-prep at read time — one
  resolver (`resolveCoachGoal`) for the engine AND the card, so "Step N of
  M" and the next step cannot disagree. Locked steps offer "Set aside for
  now" → `coachState.stepsSkipped`; the engine passes a skipped step over
  **without counting it**. Curriculum `mock_interview` steps complete on an
  `interviewHistory` sitting and start through `startInterview` before the
  switch in `handleCoachStepStart`, never through the synthetic offer's door.
- M3: the milestone modal reads `prepTarget.date` via `daysUntil`; inside 45
  days the ask leads with the date. `pro_modal_shown` carries
  `deadline`/`daysOut`, never the date.
- M4: streak modal silent; `company_hard` and a locked mock at ≤3 solves get
  the catcher / the free mock. Locked-mock asks are stamped
  `interview_locked` **live** (label fix; behaviour unchanged) — the
  `generic` series splits on 2026-09-12 (metrics.md).
- Still to ship in the 09-29 batch: "Unlimited AI Tutor" appears in 45
  places and the backend caps Pro at 50/75/100 calls a day
  (`supabase/functions/ai-tutor`). Fix the words, not the cap.

### P1 — skill model, diff engine, tutor (2026-09-12)

- **user_skill is derived, canonical, and fed by attempts.**
  `skillMastery` (state, `userData.skillMastery`, localStorage
  `sqlquest_skill_mastery`) is rebuilt by `src/utils/user-skill.js` from
  `challengeAttempts` + the radar + `lessonSkillStats` (the lessons' own
  counts, `updateSkillMastery`). Same field names as the old fourteen-name
  record, so every reader (tutor context, rust notifications, session recap)
  kept working and now sees solves. A saved OLD record is folded in once
  (`isLegacyMasteryRecord`); a canonical one is never re-read as input.
  There is no `user_skill` table: `users.data` already carries the rows for
  the server-side senders.
- **Picker:** `pickNextBySkill` (weakest canonical skill, one difficulty
  above the highest solved on it, Hard only at mastery ≥ 50, curriculum
  comparator — never raw order). Wired to the post-solve strip behind
  `weakSkillNext`. Skill filter on Practice (`skillFilter`, session-only) is
  live.
- **Diff engine:** `diagnose.js` gained `row_set` (right count, wrong rows —
  before this it was reported as wrong values) and `primaryHint(diagnosis,
  {query, description})`, one hint by kind and by what the query actually
  says. The panel shows the sentence + one hint behind `diagnosisHints`; the
  three-item lists remain the tutor's material.
- **Error patterns:** `src/utils/error-patterns.js` names the habit behind
  a wrong submit (missing_group_by, cross_join, wrong_join_type,
  null_handling, extra_filter, …), recorded on both wrong paths into
  `userData.errorPatterns` (counts + last 50) with
  `challenge_error_pattern {kind, primary, patterns, repeat}`. LIVE.
- **Tutor:** `buildChallengeTutorContext` is the ONE context builder for
  both tutor doors on the challenge page (the hint chain and the inline
  panel): query as written, diagnosis, mastery rows for the challenge's
  skills, error patterns with a REPEAT line at ≥3, goal + days to the date.
  LIVE. Behind `socraticLadder`: the panel opens on the diagnosis (not
  `TOPIC_EXPLANATIONS`), the ladder (defect → clause → full query), bypass
  by phrase or button. The live nudge carries the REPEAT line too.
- Flip 2026-09-30 for the three flags (one task), reads 2026-10-21; claims
  in the ledger. `/coach/` now redirects to `/app` (it 404'd; nothing linked
  to it).

### Revolut — the second interview-prep member (signed 2026-09-12)

- `neobank-analyst` on `finans_neobank`, member Revolut, `declaredBy:
  'Göktuğ'`: twelve challenges tagged Revolut on the ledger (300-311), the
  mock `revolut-analytics-screen` (6 MCQ whose correct options are computed
  from the data + 2 written, 60 min, all on the ledger), the page's sourced
  rounds section with `Sources:` (in `SOURCED_PAGES`). tests/revolut-mock.
  test.js and the registry test pin all of it; `PENDING_INTERVIEW_ARCHETYPES`
  is the empty waiting room for the next candidate.
- **From this date `interview_prep_funnel` has two values in `company`.**
  That was the pre-registered stop-and-look; read the funnel split by
  company and never sum the rows. A Revolut arrival with a named target now
  gets the prep flow (readiness, day plan, mock offer) Capital One's did.

### P2 — retention (2026-09-12)

- **Spaced retrieval** (`src/utils/spaced-retrieval.js`): weak canonical
  skills (mastery < 70) are due 3 / 7 / 14 days after `lastPracticed` on the
  user_skill row, by reviews done (`userData.retrievalLog`); the Coach card
  (`data-testid="coach-retrieval-card"`, behind `spacedRetrievalCard`, flips
  10-12 with M2) shows up to two, each with one unsolved challenge at the
  level shown on that skill; `pendingRetrievalRef` credits the review on the
  solve. The landing's "Tomorrow · spaced retrieval" now has something
  behind it.
- **Daily quota** (`dailyQuota`, same flip): the days-left chip reads
  "12 days left · 6 a day" from the active goal's unsolved challenge steps
  (or interview-prep as the reference plan) over the days left.
- **Weekly digest** (`supabase/functions/weekly-digest`): "Moved most" from
  the canonical user_skill rows vs the prior report's snapshot, and "One
  thing this week" on the weakest practised skill (utm
  `weekly_digest_one_thing`). Old fourteen-name records are ignored. Needs
  `supabase functions deploy weekly-digest` — the founder runs it if the
  agent's deploy is blocked.
- Done from the cleanup list: "Why this matters" follows the declared
  intent; `/coach/` redirects to `/app`; "Try again!" → diagnosis sentence
  (behind `diagnosisHints`).

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
  URL Inspection → Request Indexing. Quota is ~10 URLs/day and the 11th returns
  "Quota Exceeded" — which is also the only reliable proof the earlier ones
  consumed it, since GSC shows no per-URL "requested" state afterwards.
- **Resubmitting the sitemap needs the FULL URL.** On a domain property,
  `sitemap.xml` is rejected with "Invalid sitemap address"; it must be
  `https://sqlquest.app/sitemap.xml`. This bit us silently: the 2026-08-02
  resubmit was never accepted, so Google's last read stayed 2026-07-28 at 67
  pages while the live file had 77, and every one of the 10 new blog posts
  inspected as "No referring sitemaps detected". Re-submitted properly on
  2026-08-04 → Last read Aug 4, 77 discovered. **Check the Submitted/Last read
  dates after submitting; a toast you did not see is not a submission.**
- **Bing**: Webmaster Tools IS set up (site picker also holds claudequest.app and
  datrick.com — check the selected site before reading anything). URL Inspection →
  Request Indexing there too, quota 100 URLs/day. **URL Submission is a
  separate panel** and takes a batch, one URL per line — its own path is
  `/webmasters/submiturl` (`/webmasters/url-submission` renders "No pages
  found", the same trap as `searchperf` vs `searchperformance`). Corrected
  2026-09-11: the Submitted Urls table does NOT lag — rows appear with a
  timestamp straight after the toast. Read the quota counter anyway (100 →
  98 for a two-URL batch); a number is better proof than a row.
  **Bing Webmaster Tools also has an AI Performance panel** reporting
  Copilot citations — 12.6K in the 3 months to 2026-09-08. See
  `bing_page_ctr` / `bing_citations` in `docs/agent/metrics.md`.
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
