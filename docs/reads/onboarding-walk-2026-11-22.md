# Onboarding walk — five doors to the first Run (B5, 2026-11-22)

B5's first run, steps 2–4 of `docs/agent/fleet/B5-onboarding.md`. Step 1 (the
weekly door table from `pro_events`) needs production data and is left for
the laptop session. This read is the walk; no number here comes from
production.

## How it was walked

- `npm run build` on origin/main `23ead8e8`, `npx serve public -l 4400`.
- Headless Chromium (pre-installed Playwright), fresh storage per walk,
  375 × 812 (`isMobile`) and 1366 × 800.
- Hermetic: `HERMETIC_PREAMBLE` from `scripts/smoke/lib.mjs`, and every
  request to Supabase, `functions/v1` (the tutor included), `/api/` and
  analytics answered in the browser. No real tutor call, no write.
- The sandbox blocks the CDNs, so React, ReactDOM, sql.js, CodeMirror,
  lucide and supabase-js came from npm copies at the pinned versions, with
  SRI dropped (`vendorFile` from `scripts/smoke/uiux-audit.mjs`, A4's
  harness).
- Events were read off the preamble's `analytics muted on localhost` lines.
- Timing is local, with libraries on disk. In every door the challenge
  opened **0.1–0.3 s** after `app_opened`, so the wall clock says nothing
  about the doors. Production adds CDN and data.js load (`app_boot`, #85).
  What separates the doors is **presses, reading and scrolling**, which is
  what the table records.
- No overlay, modal or tour appeared on any door in the first 15 s after
  the editor opened. Run was never covered, never disabled. Since #101, Run
  on the empty editor runs the placeholder starter, so an enabled Run is a
  runnable Run.

Walker and screenshots are in the session scratchpad, not the repo.

## Door × step

"Presses" counts presses from the landing page to an editor whose Run is
enabled. "Run y" is the Run button's page offset when the challenge opens
(viewport heights 812 / 800). Selector for Run: `[data-onboarding="run"]`.

| Door | Landing CTA (selector → href) | Presses to editor | Read / decide before the editor | Run y 375 / 1366 | Words in the problem |
|---|---|---|---|---|---|
| Home `/` | `a.bp[href^="/app/?src=home"]` "Start free" → `/app/?src=home` | **1** | Nothing: first screen is challenge 91, pre-filled (`SELECT * FROM passengers LIMIT 10;`, #99). A "Step 2 of 2 · your first challenge" strip | 863 / 920 | 71 |
| Company, general (`/wise-sql-interview/`, and every hero built by `build-company-pages.mjs` except Capital One) | hero "Solve Wise question 1 now: Country Codes in Uppercase — free, no sign-up" → `/app/?company=Wise&goal=interview` | **2** | Lands on the **Challenges list**, not the question. Before the button: the three-tab card, "Want guided lessons?", the guest notice with "Save Progress", the banner heading, a 4-line provenance note, a 4-line quota note. Then `[data-testid="company-banner-start"]` "Start with question 1: Country Codes in Uppercase →", at y 638 (375, at the fold, the 💬 button over its right edge) / 384 (1366). **The same promise as the hero, to press a second time** | **1467 / 1220** (after the banner press) | 113 |
| Company, Capital One | `a[href*="challenge=275"][href*="company="]` "Practice on Card Data — Free" | **1** | Opens challenge 275 straight away; the step strip | 1071 / 944 | 103 |
| `/sql-exercises/` | `a[href*="/app/?challenge="]` "Run it in the editor →" (solutions block) → `?challenge=94` | **1** | The step strip | 859 / 896 | 63 |
| `/questions/<slug>/` | `a[href^="/app/?challenge="]` "Solve it in the browser editor →" → `?challenge=229` | **1** | The step strip | 911 / 920 | 66 |
| Readiness test | `#go`, then 10 × (`#opts button` + `#next`), then `#plan` "Build My Personalized Practice Plan" → `/app/?src=readiness&challenge=19&goal=interview` | **22** (21 inside the test, by design) | The test itself; in the app, the step strip | 1585 / 1278 | 125 |

Everywhere, Run sits under the problem card: a person scrolls about one
screen before the first press, at both widths. That is the same on every
door, so it is not where one door loses more than another.

The general company door is the outlier twice over:

1. **Two presses where every other door needs one**, and the second repeats
   the first. The hero names the question and says "now". The app answers
   with a list and a banner that names the same question again.
2. **Run is furthest down.** Once the question opens from the list, the full
   challenge chrome stays on: the guest notice and the six-button nav card
   (Back, Lessons, Tutor, Previous, Next) sit above the problem. Twelve
   buttons above Run, against six to eight on every other door. The
   resolver sets `firstRunCompleted`, so the first-run shell, which hides
   that chrome on the other doors, never shows.

## The step to change, and why this one

**The general company door's list screen. The hero's promise opens the
question.**

- **The best money door.** Company arrivals: 2.3% trial-or-paid per arrival,
  against 0.5% for `/sql-exercises/` (monetization ideas, 1f). Of 34
  company pages, 33 send `/app/?company=X` without a challenge. Only Capital
  One deep-links its question.
- **Measured loss at this step.** 149 company search arrivals in 35 days to
  11-20: 63 opened no challenge, 57 of them intent-routed and then idle
  (ledger, "a company arrival gets a first question to press"). The banner
  button was that claim's fix. This walk shows the button still costs a
  second press, under about 16 lines of text at 375. It reads on 12-18.
- **Not falsified anywhere in the ledger.** The falsified ideas are the
  placement quiz as the first screen, the goal gate, and questions before
  the first solve. This one asks nothing, gates nothing, and removes a
  screen.
- **Not activation queue rows 3, 6 or 7.** Not `coachTrustQuizPlacement`,
  `onboardingIntake` + `goalMeasure`, or `interviewFirst` +
  `interviewCountdown`.
- **Does not touch the first screen #99 is being read on.** A `?company=`
  arrival never sees the first screen: no `first_screen_assigned` fires on
  this door, and the list resolver sets `firstRunCompleted`. Nothing changes
  for `/?src=home` or any `?challenge=` door.
- **No quota, price or paywall change.** The direct arm opens what
  `companyBannerNext()` returns: the same function and locks the banner
  button uses (Hard, company set gate, free quota), through the same
  `openChallenge`. Capital One and Revolut keep their free three.

Not chosen, written down for later:

- **The chrome above Run on the company door** (point 2). Second in line.
  Measure it only after this test reads, on the same arrivals.
- **The 💬 button over the banner button's right edge at 375.** A4's lane,
  noted for them.
- **Run is one screen down on every door.** It touches every door, the
  first screen included, so it waits for #99's read.

## The experiment

Full claim in `docs/agent/ledger.md`, "a company arrival opens question 1".
Metric: `company_direct_split` in `docs/agent/metrics.md`.

- **Hypothesis.** A cold company-page arrival who lands in question 1
  instead of the list solves within 10 minutes more often. The list costs a
  press, a screen of reading, and the promise made twice.
- **Arms.** By aid, `companyDirectArm` (FNV + murmur3 finalizer, test id
  `company_direct_v1`). Independence is tested against the first-screen,
  company-ask, quota-wall-inline and modal-layout arms.
  - `direct`: a person with zero solves arriving with `?company=` (no
    `?challenge=`, no `?interview=`) is put into the banner's question.
  - `list`: today's screen.
  - Assigned once (`company_direct_assigned {testId, arm, company,
    nextId}`). The open carries `challenge_opened.openedFrom =
    'company_direct'`.
- **Flag.** `companyDirectOpen`, **false**. Flip no earlier than
  2026-12-19, after the banner claim's 12-18 read on the same arrivals.
  A0 may flip it: it is not a money flag. Queue row 16 in
  `docs/agent/flag-queue.md`.
- **Headless check of both arms** (this build, 375 and 1366, flag forced on,
  aid pinned per arm):

  | Case | Result |
  |---|---|
  | `direct`, cold | editor open on "Country Codes in Uppercase" (#136, "#1 of 16 · Wise pattern"); `company_direct_assigned {arm: direct, nextId: 136}`; `challenge_opened {challengeId: 136, openedFrom: company_direct}`; **1 press** to Run |
  | `list`, cold | list + banner unchanged; `company_direct_assigned {arm: list}`; no open; 2 presses |
  | `direct`, returning guest with 3 solves | list + banner; not assigned |
  | flag off | list + banner; nothing assigned |

## Proof

- `tests/company-direct.test.js`: 20 tests. Three deliberate breaks, each
  failed by name and was then restored:
  - murmur finalizer removed → "is independent of the first screen test";
  - the cold check dropped from `open` → "someone with solves is never
    assigned and never sent straight in";
  - the `if (!currentUser) return;` wait removed from the effect → "waits
    for the session and the guest before deciding (the deep-link rule)".
- Build, full test suite, lint: see the PR.
