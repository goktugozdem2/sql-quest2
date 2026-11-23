# Mobile acquisition: where phone visitors fall out, and the fix plan (2026-11-23)

Founder: "mobilden de kullanıcı alabilmemiz lazım" (we need to win users on
mobile too). This is a research run. No code changed. The data is read-only
Supabase over the 28 days to 2026-11-23. The live walk used headless Chrome
against https://sqlquest.app at 390×844, with an iPhone user agent, touch
emulation, every Supabase/functions host blocked and every write answered
in-page (`HERMETIC_PREAMBLE`). No tutor call was made and no row was written.
Screenshots are in `docs/plans/mobile-acquisition-2026-11-23/`.

## 1. The numbers, cleaned

The orchestrator's table put mobile open → first run at 10% (7 of 68),
against 35% on desktop. Two things in that table mix humans with machines.

**a. A crawler cluster inflates the "opened" step on both devices.** It
reaches `/app/?src=<page>` without any `landing_view` and without a
`landingSrc`. It always has `langs = 2`, a rotating time zone (Hong Kong,
Singapore, Shanghai, Los Angeles, Mexico City) and often a landscape phone
size (667×375, 726×340, 750×340, 568×320). The app's first-screen test then
auto-opens a challenge for it. Over 28 days it is 34 "mobile people" (30
opened, **0 ran**) and 193 "desktop people" (134 opened, 2 ran). It is not
in `bot-signals` yet. FOUNDER/B2: add it in its own PR (rule 6b).

**b. "Opened a challenge" is not a decision.** Since `firstScreenChallenge`
(arm `challenge` for everyone from 2026-11-22), and on every
`?challenge=` deep link, the app opens the challenge itself. The
non-runners' last event is `first_challenge_started`, fired at the same
millisecond as the open (median gap 0.002 s). After the open, nothing else
fires: no error, no hint, no focus.

People who came from a page or a source (`landing_view` or `landingSrc`),
bots and internal accounts excluded:

| Device | People | Reached /app | Opened | Ran | Solved | Signup | Pro modal | Checkout click |
|---|---|---|---|---|---|---|---|---|
| desktop | 729 | 573 (79%) | 449 | **263 (59% of opens)** | 212 | 55 | 100 | 12 |
| mobile | 84 | 54 (64%) | 35 | **7 (20% of opens)** | 5 | 3 | 5 | 3 |

Mobile is 10% of these people (84 of 829; tablet 16). The gap is real: 20%
against 59%.

**Where the mobile 84 stop:**
- 30 never reach the app. Their last event is `landing_view` (21) or
  `landing_engaged` (8). Top pages: `stripe-sql-interview` (8), the
  homepage (4), `questions/*` (4), `bloomberg-sql-interview` (3).
- 19 reach the app and open nothing.
- 28 have a challenge opened for them and never run it. The median span
  from their first event to their last is 60 s.
- 7 run.

**The split that matters is a prefilled editor against an empty one:**

| First challenge | Mobile opened → ran | Desktop opened → ran |
|---|---|---|
| #91 (editor prefilled with `SELECT * FROM passengers LIMIT 10;`) | 5 / 12 (42%) | 192 / 259 (74%) |
| any other (deep links from `/sql-exercises/`, topic and company pages; empty editor) | **2 / 23 (9%)** | 54 / 159 (34%) |

- **Start writing →** (the first-run card's scroll-to-editor button) was
  pressed by 1 of 35 mobile first-challenge people, against 33 of 418 on
  desktop.
- The placement-quiz arm ran 1 of 14 on mobile; the challenge arm ran 3
  of 8. The quiz arm gets no new assignments since 2026-11-22, so that
  part is already fixed.

**Errors.** There is no mobile-only error. Mobile has 4 `challenge_errored`
rows (2 people, e.g. "no such table") and 6 `challenge_error_pattern` rows.
The app sends no client JS error event, so a crash that kills the page
would be invisible. `bootMs` is on 2 mobile `app_opened` rows only (median
10.3 s, n too small to read), so load-time abandonment cannot be measured
yet.

**Search or the page?** `gsc_daily` has no device column (`date, query,
page, clicks, impressions, ctr, position`), so whether Google ranks us
lower on mobile cannot be answered from our data. What we can see:
- Among source-tagged people, mobile Google is 43 against desktop Google
  323 (12%).
- Mobile Bing is under 5 against desktop Bing 145.
- `landing_view` has carried a viewport only since 2026-11-22. Since
  2026-11-16, search-sourced landers reach the app at 2 of 15 on mobile
  (13%) against 42 of 91 on desktop (46%), and engage at 33% against 59%.

So both things are true: fewer mobile people arrive, and those who arrive
leave the page and the challenge more often. FOUNDER/C1: add a `device`
slice to `scripts/gsc/fetch.mjs` (the API supports the dimension) in its
own PR, so the search half can be read in 4 weeks.

## 2. What the walk showed (390×844, iPhone UA, touch)

Home → Start free → first challenge (#91) → Run → Submit → post-solve →
deep link #105 → Capital One page → Pro modal.

| # | Finding | Evidence |
|---|---|---|
| W1 | **Run is not on the first screen of any challenge.** The bar is `sticky bottom-0`, but sticky only holds inside its own card, and the card starts below the fold. #91: the editor starts at y = 850 and Run sits at y = 839–879 of an 844 screen, a 5 px sliver. #105 (the top deep link): the editor starts at y = 1048. The first screen is the header, three 86 px tabs, the "Step 2 of 2" card and the problem text. | `02-app-first-screen.jpg`, `08-deeplink-105-fold.jpg` |
| W2 | **With the keyboard up, Run and Submit are fully hidden** (0 px visible). The editor shows 198 of 224 px; the schema ("Tables used") is visible above it on #91. This is a simulated 336 px keyboard over the layout viewport, which is how iOS Safari and Chrome Android (resizes-visual) behave: fixed and sticky bottom bars stay under the keyboard. | `04-keyboard-up-prefilled.jpg`, `05-keyboard-up-typed.jpg` |
| W3 | **Five layers at once after the first solve:** the "One quick question: what brings you to SQL Quest?" modal (full screen); a 320 px "The Explorer" Skillmap card; a LEVEL UP / Silver overlay; an "Achievement! Unicorn" toast; and an "Achievement Unlocked, Share" toast. Close targets are 24×24 and 9×16 px. | `07-after-submit.jpg` |
| W4 | **The answer on a deep link is long to type.** The #105 answer (JOIN orders and customers, five columns, ORDER BY, LIMIT) is about 150 characters, with about 20 on the iOS symbol layer (`.` `=` `_` `,` `*`). #91 is prefilled, so it needs 0 characters and 3 taps (Start free, then scroll or Start writing, then Run). | `08-deeplink-105-fold.jpg` |
| W5 | **The editor input is set up correctly:** a `textarea`, with `autocapitalize="off"`, `autocorrect="off"` and `spellcheck="false"`. It has no `inputmode`, `enterkeyhint` or `autocomplete="off"`. Its font size is **14 px**, and iOS Safari zooms the page on focus of an input under 16 px. Headless Chrome cannot show that zoom: check on a real iPhone. | step3 log |
| W6 | **Start writing → on mobile scrolls but does not focus.** That is deliberate (app.jsx `scrollToChallengeEditor`: focusing would raise the keyboard over Run). After the scroll, Run is at y = 559 and visible. The button is the only bridge to Run on the first screen, and 1 of 35 pressed it. | `03-after-start-writing.jpg` |
| W7 | **The homepage is 10,745 px tall at 390** (6,659 at 1024). 27 of 71 links are under 32 px tall, the three nav links are 17 px, and the fixed nav is 109 px (13% of the screen). The hero CTA is on the first screen (y = 590). The Capital One page is 13,060 px, its Start Free CTA is in the header, and 17 of 70 targets are under 32 px. | `01-home-fold.jpg`, `09-company-capital-one-fold.jpg` |
| W8 | **In the Pro modal the prices are 1.4 screens down.** The first plan card is at y = 1108 inside a 758 px scroller of 1,621 px; the first screen is the serif headline and the feature list; "Maybe later" is at the very bottom. The few mobile people who reached it still clicked checkout (3 of 5), so this is not the leak. | `10-pro-modal.jpg`, `11-pro-modal-plans.jpg` |
| W9 | No horizontal page scroll on home or the company page (scrollWidth 390). The result table scrolls inside its box (749 px wide). | step logs |

One thing already shipped helps here and is not visible to a phone user.
From 2026-11-22, pressing Run on an empty editor runs the placeholder
starter (`starterSqlFromHint`, `SELECT * FROM <table> LIMIT 5;`). A first
Run on any challenge is therefore one tap away, as long as the person can
see Run. W1 is the gap.

## 3. Ranked plan

Expected lift is on the mobile open → first-run step first, then on solves.
Cost is S (≤ 1 day, one file plus app.jsx call sites), M (2–3 days) or
L (a week or more). Each item has a flag, an A/B design, a metric and a
falsification written now.

**Read on sample size for every row.** About 35 mobile first-challenge
people arrive per 28 days. A 50/50 split gives about 17 per arm per month,
which can only show a large effect. Each rule below is an effect-size rule
fixed in advance, not a p-value. If an arm has fewer than 15 people at the
read date, extend the read by 28 days once, then call it.

| Rank | Idea | Cost | Why it should move the step | Flag / test | Metric | Falsified if (written 2026-11-23) |
|---|---|---|---|---|---|---|
| **1** | **Run on the first screen.** On narrow touch screens, the challenge's Run · Submit bar is `position: fixed` to the viewport (safe-area padded), not sticky inside the card, so it is visible the moment a challenge opens. For a first-contact person whose editor is empty, a one-line label sits above the buttons: "Tap Run to see the table". | S | W1 + W6. The 11-22 starter run makes one tap enough. The prefilled #91 already runs 42% on mobile against 9% for empty deep links; the difference is that #91's path shows the person what to press. | `mobileRunBar`; 50/50 by `aid` with the murmur3 finalizer (`companyAskArm` pattern), assigned at the first challenge open on `(pointer: coarse)` and width < 768; event `mobile_run_bar_assigned {arm}` | `open_to_first_run`, mobile band, first-contact opens; secondary: mobile people with a `challenge_solved` | at the 2026-12-21 read, the arm's open → first-run is below 35%, or under 15 points above control |
| **2** | **A keyboard-aware editor bar.** When the editor has focus on touch, the same bar rides above the keyboard (`visualViewport` resize/scroll → `translateY`). It gains one scrolling row of SQL keys (SELECT, FROM, WHERE, JOIN, ON, GROUP BY, ORDER BY, LIMIT, COUNT(*), `*`, `,`, `.`, `=`, `'`, `(`, `)`, `_`) and a second row of column chips from `challenge.tables`, each inserting at the cursor through `cm.replaceSelection`. Also set `inputmode="text"` and `enterkeyhint="enter"` on the input, and a 16 px font in the editor on touch (W5). | M | W2 + W4. Run stays reachable while typing, and the symbol-layer characters and long column names cost one tap. | `mobileKeyBar` (on top of rank 1, so it ships after rank 1's read, or as a second arm, not stacked inside the same arm) | mobile first-contact people with an **edited** run, i.e. a query that is not the starter. That needs `challenge_first_run.prefilled` and `edited` stamped first, in a measurement PR (6b). Secondary: mobile `challenge_solved` people | mobile people with an edited run do not reach 2× the 28 days before the flip (baseline to be read from the stamp's first 28 days; today's floor is 7 runs of any kind) |
| **3** | **One layer at a time after a solve on mobile.** On narrow screens, the first solve shows the verdict + **Next challenge →** only. The achievement toasts, the LEVEL UP overlay and the Explorer card are suppressed on mobile; they are still awarded, the same rule `interviewFirstOn` already applies to achievement toasts. The intent question is asked inline (the `intakeAfterFirstSolve` pattern), never as a modal over the editor. | S | W3. Five layers and 9 px close targets at the moment a phone user has just succeeded. | `mobileCalmSolve`; 50/50 by `aid` at the first solve | second solve in the same session, mobile; secondary: mobile `signup_completed` | mobile second-solve-in-session in the arm is not ≥ 10 points above control at 2026-12-21 (n will be tiny: report it as directional, and keep the change only if it is not worse) |
| **4** | **The first mobile challenge is a Debug Easy** (#331–334, "an AI wrote this query, fix it"; PR #249, `debugQuestions` dark). The query is already in the editor, and the fix is one token or one clause, which suits a phone keyboard. | S once #249 ships | It removes W4 entirely: the person edits instead of typing. | `mobileDebugFirst`, **only after** the `debug_solve_through` read (t0 = the Debug flip + 28 d). Routing phone first-runs into Debug items before then would change that read's population. | `open_to_first_run` and `first_solve_10m`, mobile | mobile `first_solve_10m` in the arm is not above control |
| 5 | **"Send this to my laptop."** A one-field email box on a mobile challenge's first screen ("Practising on a laptop is easier. Get a link to this challenge"), with an explicit consent checkbox. It writes one `email_captures` row (`source='mobile_handoff'`, the challenge id, an opaque handoff token, never the email in a URL) and sends **one** transactional email with `/app/?challenge=<id>&src=mobile_handoff&h=<token>`. It is **not** added to `capture-email-drip`'s five-mail sequence unless the person ticks a second, separate box. Legal points: GDPR/UK-GDPR consent as the lawful basis, recorded with a timestamp and the exact wording; a privacy-policy line saying what the address is used for; an unsubscribe link; deletion on request; no address in `pro_events`. Outward email needs the founder's go (CLAUDE.md), and the subject follows the email-voice rule only if it is a founder note (it is not: it is a transactional link). | M | Mobile visitors leave within about 60 s. A handoff keeps the visit even when the phone is the wrong tool. | `mobileHandoff`, 50/50 | new metric `mobile_handoff`: captures per mobile first-challenge person, and the share whose token comes back on desktop within 7 days. Register it in metrics.md before the flip. | captures are under 5% of mobile first-challenge people, or under 25% of captures come back within 7 days |
| 6 | **A shorter mobile landing** for the doors phones use (`/sql-exercises/`, `/stripe-sql-interview/`, topic pages): the practice CTA in the first screen, `/app/?challenge=` links that open the starter-ready challenge, and 44 px tap targets on the nav (W7). | M | Mobile landing → app is 13% against 46% (n = 15). | `mobileLandingLite` via `src/track.js` arms (like `CTA_ARMS`) | `home_door` / landing → app, mobile band | mobile landing → app does not reach 25% |
| 7 | Pro modal: on narrow screens, show the plan cards before the feature list (W8). | S | It is not a leak today (3 checkout clicks from 5 mobile modals). It is cheap. | `mobileModalPlansFirst` (a money surface: founder's go) | `modal_click_rate`, mobile | not run until rank 1 has moved mobile solves |
| 8 | A PWA / add-to-home-screen. | M | It helps returning people, not first contact. Nothing in the data asks for it. | none | none | **not planned** |

The "prefilled skeleton query for mobile" from the brief is folded into rank
1. Since 2026-11-22, an empty editor's Run already runs a skeleton, so
putting text in the editor adds nothing that a visible Run does not.
Multiple-choice warm-ups as the mobile first step lose to rank 4: the
placement quiz arm ran 1 of 14 on mobile, and a Debug item keeps the person
writing SQL.

## 4. First build spec — `mobileRunBar` (rank 1)

**Goal.** On a phone, Run is visible the moment any challenge opens. For a
first-contact person with an empty editor, one tap on Run shows the table
(the starter run that shipped 2026-11-22).

**Files.**
- `src/utils/mobile-run-bar.js` (new, pure, import-free):
  - `isNarrowTouch({ coarse, width })`: true when `coarse` or
    `width < 768`. Keep this the same rule as `scrollToChallengeEditor`.
  - `mobileRunBarArm(aid)`: FNV hash plus the murmur3 finalizer, copied
    from `companyAskArm` in `src/utils/company-ask.js` (CLAUDE.md, the
    A/B hash trap). Arms: `['control', 'bar']`.
  - `mobileRunBarDecision({ flagOn, narrowTouch, stored, aid })`: returns
    `{ arm, assign, show }`, sticky in
    `localStorage.sqlquest_mobile_run_bar_v1`, with the same shape as
    `firstScreenDecision`.
  - `runBarLabel({ solvedCount, editorEmpty, starterHint })`: returns
    "Tap Run to see the table" when `solvedCount === 0` and
    `editorEmpty` and `starterSqlFromHint(starterHint)` is set, else null.
    It goes into i18n (`practice.runBarFirstHint`, Turkish "Tabloyu görmek
    için Run'a dokun").
- `src/data/feature-flags.js`: add `mobileRunBar: false`.
- `src/app.jsx`, the challenge Run/Submit bar (the
  `sticky bottom-0 z-20 … md:static` div next to `data-onboarding="run"`,
  near the "Sticky on mobile, normal flow from md up" comment):
  - In the `bar` arm, below `md` only, use
    `fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3`,
    with the same surface and hairline (`#16181F` / `#2A2E38`; Submit
    keeps the accent; DESIGN.md).
  - Add bottom padding of the bar's height to the challenge view so the
    expected output is never covered.
  - Put the label from `runBarLabel` above the buttons in `text-gray-400`
    (never the accent).
  - `md:` and up must be byte-identical to today.
  - Compute the decision in a `useEffect` placed **above** the
    `if (showAuth)` / `if (!dbReady) return` early returns (fragile area 1).
  - Fire `mobile_run_bar_assigned {arm}` once, at the first challenge open.
- `src/input.css`: in the `bar` arm the feedback bubble sits on top of the
  fixed bar (bubble at bottom 80 px, bar about 64 px tall plus the safe
  area). Raise `.sq-feedback-fab` to `bottom: 96px` only when
  `body[data-run-bar="fixed"]` is set.

**Do not:**
- focus the editor on touch (the `scrollToChallengeEditor` rule stands);
- change what counts as `challenge_first_run`;
- touch the timed mock's editor (a separate surface);
- show the bar over a modal (it lives inside the challenge view, z-30,
  under the z-50 modals).

**Tests** (`tests/mobile-run-bar.test.js`):
1. `isNarrowTouch` is true at a coarse pointer or width 390, and false at
   1280 with a fine pointer.
2. The arm is sticky, assigned once, and independent of
   `firstScreenArm` and `companyAskArm` over 10,000 synthetic aids, within
   ±3 points of 50/50 (the parity trap).
3. `runBarLabel` returns null with a saved query, after any solve, and
   with no starter hint.
4. Source guards over app.jsx:
   - the Run bar's class string still carries `md:static`;
   - the bar's decision hook sits above the `if (!dbReady) return`;
   - no `.focus()` call is reachable for touch in
     `scrollToChallengeEditor`.
5. Every challenge in the live bank has a `tables[0]` whose starter runs
   on its dataset. The rank-1 promise is "one tap shows a table", so it
   has to hold bank-wide.

Deliberate breaks to name in the commit:
- change `isNarrowTouch` to ignore width → test 1 fails;
- drop the murmur finalizer → test 2 fails;
- move the hook below the early return → test 4 fails.

**Headless check.** Use `scripts/smoke/lib.mjs` at 390×844, mobile UA,
touch, `?ff_features_mobileRunBar=true` and the arm pinned in
localStorage. On `/app/?challenge=105&src=sql-exercises`, assert:
- the Run button's rect is fully inside the viewport at load;
- a tap on it shows "Your Output";
- at 1280 the bar's computed position is `static`.

Run `SMOKE_HERMETIC=1 node scripts/smoke-test.js` against the worktree.

**Ledger claim** (write it with the build PR, metric already in
metrics.md):
- metric `open_to_first_run`, mobile band, first-contact opens, by arm;
- baseline 20% (7 of 35, 28 days to 2026-11-23; 9% on empty-editor
  challenges);
- target ≥ 35% in the arm;
- read 2026-12-21;
- falsification as in row 1.

## 5. For other lanes (FOUNDER / orchestrator)

- **B2:** a new crawler fingerprint. It has `langs = 2`, no `landing_view`
  and no `landingSrc`, arrives on `/app/?src=<page>`, often with a
  landscape phone viewport and rotating Asian or Americas time zones: 227
  "people" in 28 days, 2 runs. Add it to `bot-signals` in its own PR.
- **B2:** the app sends no client JS error event, and `bootMs` is nearly
  absent on mobile. Both are needed to see a phone that crashes or stalls
  before the first event.
- **C1:** add `device` to the GSC fetch (a new slice) so "do we rank
  lower on mobile" becomes answerable.
- **A4:** add W1 (Run below the fold at 390×844) and W3 (five layers after
  a solve) to the UI matrix as named checks.
- **On a real iPhone, by hand:** does focusing the editor zoom the page
  (W5, 14 px input)?
