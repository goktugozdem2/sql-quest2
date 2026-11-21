# BACKLOG — ranked by impact (audit of 2026-10-06)

Concrete issues found in the repo and the production data, highest impact
first. Each line says what is wrong, the evidence, and where to start. The
work order is `docs/PLAN.md`; the founder's open feature list is
`docs/plans/backlog-2026-09-21.md`. Numbers were measured on the date above —
re-measure before acting on one.

## Progress — the autonomous run from 2026-11-22

The founder's instruction (2026-11-22): keep developing without asking,
close the open items one by one, keep this file current. One item, one
branch, one PR; nothing merges without the founder's go. Each item below
carries its own **DONE** / **Status** line.

| # | item | PR | state |
|---|---|---|---|
| 6 | Capital One read + page | #77 | open |
| 11 | CDN pins + SRI | #78 | open |
| 28 | landing rows: crawler fingerprints | #79 | open |
| 19 | stale root copies | #80 | open |
| 22 | root notes → docs/archive | #81 | open |
| 14 | lint app.jsx (2 live ReferenceErrors) | #82 | open |
| 23 | build leaves the tree clean | #83 | open |
| — | overdue ledger reads (5) + this table | #84 | open |
| 10 | measure /app boot before splitting data.js | #85 | open |
| 12 | users_public readers | #84 | audited, no action |
| 9 | Google + Bing view (`search_weekly`) | #86 | open — founder applies the migration |
| 5 | tutor spend | #84 | volume read; dollars in the console (founder) |
| 20 | inline mirrors | — | already removed |
| 21 | lapsed-pro held until its copy is rewritten | #87 | open — founder deploys |
| 13 | resend-webhook signature, executed | #88 | open — founder deploys |
| 24 | CLAUDE.md: five sections to the archive | #89 | open |
| 13 | account-password, executed | #91 | open |
| 29 | (new) one SHA-256 for passwords | #91 | written up — founder's call |
| 17 | Quiz JSON-LD on question pages | — | closed, not doing (no rich result for SQL) |
| 15 | quota wall checked in a real browser (smoke) | #92 | open |
| — | `guest_resumed.solvedCount` was 0 on all 755 rows | #93 | open |
| — | syntax errors get the line that fixes them | #94 | open |
| 8 | Google brand searches | #84 | read: demand, not ranking |
| — | P1 reads: diff panel FLAT, tutor HIT/MISS, picker MISS | #84 | written |
| — | `weakSkillNext` off (its falsification fired) | #90 | open |
| 16 | faq_open / scroll_depth | — | already fixed |
| 7 | Bing question pages | — | superseded by #72 |

Founder decisions surfaced, not taken: the free quota's 10-09 rule fired
(2 < 3 → quota to 20) and was never asked; the session-token cut (item 1);
the Stripe endpoint's `setup_intent.setup_failed` subscription (item 2).

## Decisions taken 2026-11-22 (founder: "kararlar sana ait olsun")

| Decision | Data | Next read |
|---|---|---|
| **Free quota stays at 10.** The 10-09 rule (2 < 3 → move to 20) is retired, not executed. | Since 09-26: 141 met the wall, 18 clicked (12.8%), 5 trials + 1 sale within 7 days — the wall is the surface that sells. Moving it to 20 would halve how many reach it. | quota_wall, 2026-12-20 |
| **`weakSkillNext` off** (#90). | Its own falsification: take rate 40.8% → 17.3% (29.3% → 15.7% under 10 solves). | — |
| **`diagnosisHints` stays on.** The written revert is not taken. | FLAT (84.9% vs 84.9%): no cost, no gain; the list it would restore says less. The rule's useful half — "read which kinds stall" — is done: `syntax_error` (75.1%) and `column_set` (69.7%) stall; #94 answers the first. | syntax claim, 12-20 |
| **Activation flag queue paused** (rows 3, 6, 7). | Row 3 reaches ~1.5 goal starters a week (12 in 8 weeks); rows 6–7 add questions before the first solve while `first_solve_10m` sits at its long-run ~13%. Work goes to the surfaces people actually reach: the challenge list, the quota wall, company pages. | revisit 12-20 |
| **No second AI-comparison page, no next trap batch, no blog exit.** | /vs-chatgpt/ 10 impressions; trap pages 352 / 500; blog 7 practice clicks — all pre-registered falsifications. | — |

Merging: the agent's merge call is refused by the session's permission classifier; PRs wait for the founder's merge (or a permission rule).

## Ideas — proposed 2026-11-22, each from a number read today

Ranked by expected effect on payers (O1: 50 a month by 12-08). Each would get a ledger claim when built.

1. **Trial-first at the quota wall.** The wall sells (12.8% click) and the trial is how people buy (9 trials, most sales after a trial). Make "Start 7 days free" the wall modal's primary button, the plans second. Metric `quota_wall` trial starts per person; target 2× in 28 days.
2. **A free first question of the Capital One mock.** 0 Pro modals from the Capital One / trap-page mock links in 28 days, 3 clicks on the page's mock buttons — the mock is a locked door with no window. Let question 1 of the 70-minute mock run free, then the modal (`mock_link`). Capital One is 2 of the first 3 payers.
3. **`column_set` gets its own line** (69.7% recovery, the weakest kind): name the extra / missing column against the expected header (`SELECT *` → list them). Same pattern as #94.
4. **Count AI-grounded impressions.** GSC query slices for trap and company pages are chat turns ("давай", "rispondi", pasted exam questions). A weekly count of chat-shaped queries per page (`ai_grounded_impressions`) tells which pages assistants retrieve — the channel two payers came through — and where an answer-first summary would be quoted.
5. **Company-set guardrail split.** Reach-6 fell to 5.8% (12.4% before). Split by "met the set wall" before touching the gate; if the wall is the cost, open 5 of the Capital One set instead of 3 (that set's arrivals are the most valuable).
6. **Tutor ladder: bypass at 52%.** Half of Help opens skip to the answer. A/B rung 2 (the clause) as the opener for people who bypassed before — keep the 72% open→solve.
7. **Password hashing to PBKDF2 on next sign-in** (item 29): dual-scheme, account-login re-hashes after a successful check. Defence in depth; no user-visible change.
8. **Split data.js** only if `app_boot` (#85) shows `dataJsMs` ≥ 40% of boot at p75 in a band (read ~12-06).
9. **Brand demand** fell with mail volume (sends ~350 → 84–245 a week). A monthly "new questions for your company" note to engaged non-payers is the test — outward email, so it needs the founder's words.
10. **The `guest_resumed` fix (#93) unlocks a real continuity read:** how many solves people bring back on day 2+, and whether a "save your progress" ask at 3 solves (88% never sign up) moves sign-ups.

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
   **Status 2026-11-22:** 9 trials started through the webhook; checked by
   hand per trial in the payer reads. Open only as a watch item.
4. **The modal → checkout step is still the leak.** Milestone ask: 178
   shown → 14 clicked (7.9%, up from 3.4%), but 2 paid in 30 days. The plan
   mix is 19 monthly / 2 annual choosers. There is no single document of the
   funnel's events (PLAN item 1): they exist (`pro_modal_shown`,
   `pro_plan_clicked`, `pro_checkout_clicked`, `checkout_session_fallback`,
   `pro_checkout_expired`, `pro_trial_started`, `pro_purchase_completed`,
   `pro_payment_failed`, `pro_card_setup_failed`) but are spread across
   `docs/agent/metrics.md` and the code. **`docs/funnel.md` written
   2026-10-06** (PLAN item 1), with a new server-side stage 4
   (`pro_checkout_started`); the leak itself is PLAN item 2.
   **Status 2026-11-22:** the `modalPlansFirst` A/B reads 0.91× control at
   100 / 110 viewers (ledger interim) — the fold is not the friction; the
   Stripe-step fix of 11-20 (#70) is the next thing to read.
5. **The AI tutor runs on a $10/month workspace.** The live nudge reaches
   browsers since 2026-10-03 (it never did before — CORS); ~100 wrong submits
   a day, capped at two nudges per challenge. A spend limit took the tutor
   down for three days on 2026-09-27. Check spend weekly until a month of
   data exists.
   **Status 2026-11-22:** `ai_usage` holds steady at ~200 calls a week for
   six weeks (178–283; ~65% are `#nudge` calls), 45–55 people a week, on
   `claude-sonnet-5-5`. The dollars are only in the Anthropic console: the
   founder checks the month's spend against the $10 cap there — at this
   volume on this model the cap may be close.

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
   **Superseded 2026-11-20** (#72): the 307 question pages carry `bingbot`
   noindex, follow — they leave Bing's index on purpose. Closed.
8. **Google brand searches fell from 2026-09-27** (homepage landers from
   Google 127 → 21 week on week). Not explained yet; read `gsc_daily` by query
   before changing any page.
   **Read 2026-11-22** (`gsc_daily` query slice, Friday weeks): not a ranking
   loss — brand (`sql ?quest`) position went 7.9 (Sep 1–26) → 2.6 after.
   Fewer people search the name: brand impressions 99–177 a week in
   September → 22–63 in October–November, brand clicks 47–56 → 5–28.
   Non-brand visible clicks held (11–25 a week). Same weeks, mail sent fell
   ~350 → 84–245 a week (lifetime caps and cooldowns, by design). Not
   proven as the cause; nothing on a page explains it. Watch item, no page
   change.
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
    **Status 2026-11-22:** audited on `ops.query_stats_daily` (24 h to
    11-21): no `users_public` sort in the top eight any more; the client
    reads one row through `rpc/sq_load_account`. The heaviest statement now
    is the email senders' scan of `users` (username, email, data) — 40 calls,
    94 s a day, ~2.4 s each. Not urgent; the fix is a narrow view or a
    column filter in the senders (edge-function deploy, founder).

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
    **DONE before 2026-11-22** (found already fixed): both go through
    `window.sqTrack` (`FIRST_PARTY_ONLY` on the four landing pages) — 22
    `faq_open` and 103 `scroll_depth` rows in the 60 days to 11-18.
17. **Question pages carry `LearningResource` + `BreadcrumbList` but no
    per-question `Quiz`/`Question` structured data**, and the template is
    frozen until 2026-10-27 (template change rule). Plan it for that date.
    **Closed, not doing (2026-11-22):** Google's Education Q&A (Quiz)
    markup feeds a carousel keyed to established curriculum frameworks
    (Common Core, UK National Curriculum —
    developers.google.com/search/docs/appearance/structured-data/education-qa);
    nothing supports SQL interview questions as a subject, so the markup
    would buy no result type. The question pages' snippet was already
    rewritten under the 10-27 rule (#63).
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
    **Mostly done before 2026-11-22** (found): both mirrors are gone —
    app.jsx imports `buildWeeklyReport` / `buildDrillQueue` from the
    utils. What remains is a few unused imports (`DRILL_SIZE`,
    `prioritizeBySector`, …), which the app.jsx lint (#82) can catch once
    `no-unused-vars` is turned on for it.
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
