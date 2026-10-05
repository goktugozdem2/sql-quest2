# BACKLOG — ranked by impact (audit of 2026-10-06)

Concrete issues found in the repo and the production data, highest impact
first. Each line says what is wrong, the evidence, and where to start. The
work order is `docs/PLAN.md`; the founder's open feature list is
`docs/plans/backlog-2026-09-21.md`. Numbers were measured on the date above —
re-measure before acting on one.

## P0 — security and money

1. **Any account's data can still be overwritten with the public anon key.**
   Session tokens are recorded but not enforced (step 4 of
   `docs/plans/account-session-tokens-2026-09-22.md`, "the cut"). In the 7
   days to 2026-10-06, `session_token_misses` logged 50 calls without a token
   from 33 usernames — the cut would refuse those, so the client paths that
   still send none must be found first. Needs the founder's go.
2. **A trial's card failure is invisible.** The webhook handles
   `setup_intent.setup_failed` (since 2026-10-02), but the Stripe endpoint is
   not subscribed to it (dashboard, founder). With `checkoutTrial` on since
   10-01, a 3D Secure failure on a trial leaves no row anywhere.
3. **No trial has started yet** (0 `pro_trial_started` to 2026-10-03, 1 trial
   plan click). The first trial and its day-7 charge must be checked by hand
   (earliest 2026-10-08). If a trial conversion is disputed, `checkoutTrial`
   goes off the same day (ledger rule).
4. **The modal → checkout step is still the leak.** Milestone ask: 178
   shown → 14 clicked (7.9%, up from 3.4%), but 2 paid in 30 days. The plan
   mix is 19 monthly / 2 annual choosers. There is no single document of the
   funnel's events (PLAN item 1): they exist (`pro_modal_shown`,
   `pro_plan_clicked`, `pro_checkout_clicked`, `checkout_session_fallback`,
   `pro_checkout_expired`, `pro_trial_started`, `pro_purchase_completed`,
   `pro_payment_failed`, `pro_card_setup_failed`) but are spread across
   `docs/agent/metrics.md` and the code. Write `docs/funnel.md`.
5. **The AI tutor runs on a $10/month workspace.** The live nudge reaches
   browsers since 2026-10-03 (it never did before — CORS); ~100 wrong submits
   a day, capped at two nudges per challenge. A spend limit took the tutor
   down for three days on 2026-09-27. Check spend weekly until a month of
   data exists.

## P1 — the pages that bring buyers

6. **Capital One page (2 of the first 3 payers prepared for it):** cards
   give the solution shape away, the page quotes six different counts, and
   both mock buttons are Pro without saying so. Frozen until the 2026-10-12
   read; the exact changes are written in
   `docs/plans/capital-one-2026-10-12.md` (section E).
7. **135 `/questions/` pages have never been crawled by Bing** (all 135 of
   the never-crawled sitemap URLs, `bing_url_status`, 2026-10-01). Bing sends
   about as much traffic as Google. The automatic submitter can re-send them
   from Monday 2026-10-12 (14-day cooldown). Recount on 10-08.
8. **Google brand searches fell from 2026-09-27** (homepage landers from
   Google 127 → 21 week on week). Not explained yet; read `gsc_daily` by query
   before changing any page.
9. **PLAN item 6 conflicts with what was built.** Bing data lives in its own
   tables (`bing_site_daily`, `bing_stats`, `bing_crawl_daily`,
   `bing_url_status`, `bing_submissions`), not in `gsc_daily` with an
   `engine` column — Bing's query/page rows are weekly buckets, Google's are
   daily, so one table would mix grains. Recommend a read-only view
   (`search_daily` with `engine`) over both instead of a migration; decide
   before session 6.

## P2 — performance

10. **`/app` downloads ~1 MB gzipped of JavaScript before it is useful:**
    `public/app.js` 1.39 MB (376 KB gz) and `public/data.js` 2.47 MB
    (646 KB gz, every dataset and the whole bank, needed or not). Split
    `data.js` by dataset and load a dataset when its first challenge opens;
    measure LCP/INP on `/app` first (the homepage is measured, `/app` is not).
11. **React and ReactDOM load from unpkg.com** (`src/app.html`), a
    third-party CDN in the critical path, without integrity attributes.
    Self-host the two UMD files or add SRI.
12. **`users_public` computes its JSON for every row** — any sorted or
    filtered read through it rebuilds the table (the leaderboard cost ~39 h of
    DB time in nine days). The fix pattern exists (`leaderboard_public`);
    audit the remaining readers.

## P3 — missing tests

13. **No test file for `create-checkout-session`** (the function that makes
    every paid session; its price env var once pointed at the old $19 price),
    **`resend-webhook`**, or **`account-password`**. The `ai-tutor` function's
    rate limiting and buckets are pinned only by source greps
    (`tests/live-nudge.test.js`), not run.
14. **`src/app.jsx` is not linted** (`npm run lint` covers `src/utils/` and
    `tests/`). 41,000 lines, the file most edited. Lint it with a separate,
    looser config first; 41 known warnings in the linted part.
15. **Most app behaviour is pinned by source guards** (regexes over
    app.jsx), not by rendering. They catch removals, not regressions in
    logic. The smoke test (28 checks) is the only render-level coverage;
    paywall moments (PLAN item 3) have none.

## P4 — SEO gaps

16. **`faq_open` and `scroll_depth` are still discarded** — they go to
    Vercel custom events, which the Hobby plan drops. Move them to
    `[data-track]` / `track.js`.
17. **Question pages carry `LearningResource` + `BreadcrumbList` but no
    per-question `Quiz`/`Question` structured data**, and the template is
    frozen until 2026-10-27 (template change rule). Plan it for that date.
18. **DMARC aggregate reports bounce** (`rua` points at an address with no
    routing rule). Harmless at `p=none`; needed before tightening the policy.

## P5 — dead code and repo hygiene

19. **Stale copies at the repo root, all tracked:** `app.jsx` (883 KB, an
    April copy of `src/app.jsx`), `ai-tutor.ts`, `stripe-webhook.ts`,
    `sql-quest-code-fixes.js`, `plan.md`, plus `src/data/challenges.js.bak`
    and `dist/`. A grep for a function name finds the wrong file first.
    Delete after confirming nothing imports them (nothing in `scripts/`,
    `tests/` or `vite.config.js` does today).
20. **Inline mirrors in app.jsx** — the weekly report (~190 lines) and the
    skill-drill helpers duplicate `src/utils/weekly-report.js` and
    `skill-drill.js`; orphan Skill Forge helpers remain.
21. **`lapsed-pro` sender exists with copy that is false for part of its
    audience** ("your trial ended" to people whose access we withdrew). It is
    unscheduled; rewrite or delete before anyone runs it.
22. **Twenty analysis/setup `.md` files at the root** (AI_TUTOR_ANALYSIS,
    SOUND-FIXES, UX-SIMPLIFICATION-GUIDE, …) predate the current product and
    contradict it in places. Move to `docs/archive/` with a dated note.
23. **`public/weekly/` changes on every build** (date-stamped), so the tree
    is never clean after a build and a careless `git add` ships it.
24. **`CLAUDE.md` is 1,400 lines** of operating history with stale lines
    (fixed four on 2026-10-06). Keep the repo map at the top current; prune
    sections whose features were removed.

## P6 — data quality traps (for anyone reading numbers)

25. `users.data.lastActive` is epoch-ms on some rows and ISO on others; SQL
    over it needs both branches.
26. `users.created_at` was overwritten on every save before 2026-09-12; use
    `users.data.createdAt` for cohorts.
27. Email `opened` events are structurally zero (open tracking off at send);
    judge campaigns by return within 48 h.
