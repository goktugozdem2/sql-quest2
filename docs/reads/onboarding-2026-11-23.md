# Onboarding read — where new people are lost, by door (B5, 2026-11-23)

Source: production `pro_events` through the read-only MCP, 2026-11-23, aggregates
only. Cohort: people (by `aid`) whose FIRST `app_opened` falls in the 14 days to
2026-11-23. Out: the internal usernames (metrics.md, shared filters),
`bot` / `wd` / `uaBot` true, viewports `tablet:800x600` / `desktop:1280x1200` /
`desktop:1919x992`, `desktop:1920x1080` + `America/Los_Angeles` with no
`landingSrc`, `desktop:1280x720` + `UTC`, and **a new crawler fingerprint (§4)**.
Door = the first `app_opened`'s `arrivalSrc`: `home` → homepage;
`company:*`, `*-sql-interview`, `sector:*`, `sql-interview-prep` → company;
`sql-exercises*` → /sql-exercises/; `challenges-*` → topic pages (broken out
because it is now the largest door); null → direct; the rest → blog/other.

**Read the window with this in mind.** Almost all of it predates the 11-22
merges #99 (first screen is a challenge for everyone), #100 and #101 (Run on an
empty editor runs the starter), and `companyDirectOpen` went live today. The
first two steps below are the ones those changes target; they are read on
`open_to_first_run` / `first_solve_10m` until 12-20 and are not touched here.

## 1. The funnel by door (people, 14 days)

| Door | App opened | Opened a challenge | First run | First solve | Solve ≤ 10 min | 2 solves | 3 solves | 6+ solves | Signup | Back ≤ 7 d* |
|---|---|---|---|---|---|---|---|---|---|---|
| **All** | **377** | 290 (77%) | 138 (48% of openers) | 107 (78% of runners) | 63 (16.7%) | 80 | 70 | 29 | 28 | 18 / 172 (10.5%) |
| company | 105 | 70 | 29 | 23 | 11 | 17 | 13 | 5 | 7 | 4 / 40 |
| topic pages | 78 | 70 | 28 | 19 | 12 | 13 | 12 | 4 | 4 | 1 / 35 |
| blog/other | 65 | 53 | 20 | 17 | 10 | 12 | 10 | 3 | 6 | 4 / 27 |
| /sql-exercises/ | 62 | 50 | 34 | 27 | 16 | 24 | 22 | 12 | 5 | 6 / 37 |
| direct | 35 | 24 | 11 | 11 | 9 | 9 | 9 | 5 | 6 | 2 / 19 |
| homepage | 32 | 23 | 16 | 10 | 5 | 5 | 4 | 0 | 0 | 1 / 14 |

\* `second_session_7d`: only people whose first open is ≥ 7 days old.

Before the app — `landing_view` → `app_opened`, landing people with a
`landingSrc` stamp only (a real referrer; the unstamped rows carry the crawlers):
homepage 87 → 47 (54%), company 157 → 68 (43%), /sql-exercises/ 67 → 41 (61%),
topic 89 → 66 (74%), blog/other 215 → 48 (22%).

Median time, all doors: first open → first run **199 s** (challenge open → first
run 144 s); first open → first solve **482 s**; first run → first solve **35 s**.
Slowest to the first run: company **502 s** and homepage **373 s**; fastest
direct (80 s) and topic pages (114 s).

## 2. The leaks (people lost at each step, all doors)

| Step | Lost | Being read now? |
|---|---|---|
| first challenge opened → first run | **152** | yes — #99/#101 and `companyDirectOpen` on `open_to_first_run` / `first_solve_10m` to 12-20; `stuckAsk` waits for the same reason |
| back within 7 days | **154 of 172** | `day2Ask` went live today with `second_session_7d` as its reverse rule; B4 / the founder own the quota's retention cost (funnel read 11-22 §3c) |
| app opened → no challenge | **87** | company 35 (`companyDirectOpen`, live today); ~35 of the rest held the old `quiz` first-screen arm, which #99 retired on 11-22 |
| 3 → 6 solves | 41 | B1, #98 (account ask at 3) and the #90 revert, read 11-24 / 12-01 |
| **first run → first solve** | **31** | **no** |
| 1 → 2 solves | 27 | B1 (the post-solve handoff) |

Per door, the largest single loss is the first run everywhere except the
homepage: company 70 → 29, topic 70 → 28, blog/other 53 → 20, /sql-exercises/
50 → 34, direct 24 → 11. The homepage loses most before the app (87 → 47) and
then at arrival → challenge (32 → 23). Before the app, the company pages lose
89 of 157 stamped landers and blog/other 167 of 215 (informational readers).

**The pick.** The two largest leaks sit on metrics being read today, so this run
does not stack on them. The next-largest leak that no read covers is **first
run → first solve: 31 people, and two thirds of it is one thing.**

| First run was | People | Solved | Left after graded feedback | **Left never graded** |
|---|---|---|---|---|
| Run | 100 | 72 | 7 | **21** |
| Submit | 41 | 37 | 4 | **0** |
| starter (#101, from 11-22) | 2 | 2 | 0 | 0 |

21 of the 32 runners who never solved pressed Run, saw a table, and left without
ever pressing Submit — no wrong result, no SQL error, nothing graded. Nobody
whose first run was Submit left that way. It is downstream of the first run, so
it does not move `open_to_first_run`, and it is limited to the first solve, so
it does not move B1's 1 → 3 / 3 → 6.

## 3. The walk (production, headless Chrome, hermetic, fresh profile per run)

Script: `scratchpad/onb/walk.mjs` (`HERMETIC_PREAMBLE` from scripts/smoke/lib.mjs —
nothing written). Doors `/`, `/capital-one-sql-interview/`, `/sql-exercises/` at
375 × 812 and 1366 × 900. Screenshots (absolute paths, this session's scratchpad):
`/private/tmp/claude-501/-Users-cgozdemm-sql-quest2/f2fc8cfc-964f-4851-a7cb-b89106487ccb/scratchpad/onb/shots/`.

**Flow.**
- /sql-exercises/ and the homepage (375): one press ("Start Free →" /
  "Start Practicing") lands in challenge 91's editor. No tour, no banner, no ask
  before the first run. Two clicks to a first run. `sqlex-375-2-app.png`,
  `home/home-375-2-app.png`.
- Capital One (both widths): this browser drew the `direct` arm of
  `companyDirectOpen` and landed in "Monthly Spend Per Account" with the editor
  open. `capone-375-2-app.png`.
- Homepage at 1366: the walker found no `/app` link in the first 1.5 screens
  other than "Log In" — the hero button is the CTA A/B (`src/track.js`), whose
  arms partly point to `/sql-quiz/` and the readiness test. Not a dead end, but
  the desktop homepage has no plain "open the app" link above the fold for
  three of its five arms. B1 owns that test (its per-arm read is 11-22).
- **Friction 1 — Run says nothing about Submit.** On challenge 91 the first
  Run on the empty editor (#101) writes and runs `SELECT * FROM passengers LIMIT 10;`
  — the whole answer — and the output is identical to the Expected Output under
  it. Nothing says the challenge is not done until Submit is pressed. A typed
  correct query on Run reads the same. `sqlex-375-3-run-empty.png`,
  `sqlex-375-5-run-correct.png`, `capone-1366-5-run-correct.png`.
- **Friction 2 — the first solve is a pile-up.** Submitting the first correct
  answer opens, at once: a "LEVEL UP! Silver" toast, the Explorer archetype
  card with the Skillmap, the "One quick question — What brings you to SQL
  Quest?" intent modal on top, an "Achievement: Unicorn" toast, and under them
  a "Want a quick tour?" card beside "Next challenge →". Three dialogs to close
  before the next step. `sqlex-375-6-solved.png`, `home/home-375-6-solved.png`.
  This is the solve-1 → solve-2 step, which B1 reads (the post-solve handoff);
  recorded here for B1, not changed.

**Teaching.**
- The first challenge explains itself: "Select every column and limit the
  results to the first 10 rows", with the expected output on the page.
- A wrong Submit says why: "Wrong number of columns — expected 10, got 1", with
  a line on how the grader compares. `sqlex-375-4-submit-wrong.png`.
- After the first solve the next step exists ("Next challenge →", "2 more to
  find your level") but is buried under friction 2.
- The gap is between Run and Submit: Run shows output and never says whether it
  is right or that grading is a separate press.

## 4. A crawler in the topic-page door (for B2)

200 of the 261 people who arrived from a topic page (`challenges-*`) have no
`landingSrc` stamp; 179 of them report exactly one browser language, and **none
of the 179 ran a query** (desktop, mostly 1280–1400 wide, `Asia/Shanghai` /
`Asia/Hong_Kong` / `America/Mexico_City` among others, ~0.8 challenge opens each
— the first screen opening 91 for them). Fingerprint used here: an
`app_opened` with `arrivalSrc` set, `landingSrc` null and `langs = 1`.
People per day with it: 0–6 until 11-13, 28–34 on 11-14 / 11-15, **85 on 11-22
and 83 on 11-23**. Unfiltered, it doubles the 14-day arrival count (569 vs 377)
and makes topic pages look like a 13% first-run door when they are a 40% one.
Any `first_solve_10m`, `open_to_first_run` or `second_session_7d` read across
these dates needs it out. It belongs in `src/utils/bot-signals.js` and the
metrics.md shared traps, in B2's own PR (rule 6b), not this one.

## 5. The fix (dark, A/B) — "Run is not Submit"

Flag `runSubmitNudge` (off), test `run_submit_nudge_v1`, murmur-finalised hash
of the aid (independent of the first-screen, company-ask, company-direct,
quota-wall-inline and modal-layout arms — tested). A person with **zero solves**
whose Run returns rows on an unsolved, non-writing challenge is assigned once
(`run_submit_nudge_assigned {testId, arm, challengeId}`, both arms). The `nudge`
arm gets one line at the top of the Your Output panel:
- output matches the expected result (the same `resultsMatch` Submit uses):
  "This matches the expected output. Press Submit to complete the challenge."
- otherwise: "Run only shows your output. Submit checks it against the expected
  output."

`run_submit_nudge_shown {kind}` per Run shown. Nothing is asked, gated or priced;
no accent colour; the line disappears on Submit. Smallest change that names the
mechanism: the 21 people who never pressed Submit.

Why not a bigger change (Run grades automatically, or auto-submit on a match):
that changes what Run is for everyone and moves `open_to_first_run`'s `via`
split, which is being read.

**Flip.** Not in this PR. `companyDirectOpen` "runs alone" (flag-queue row 16):
the orchestrator decides whether a second, orthogonal onboarding A/B at a later
step may run beside it. The assignment happens only at a Run, after
`companyDirectOpen`'s assignment, and the hashes are independent, so each test
reads within its own arms; a read of this one can also exclude `?company=`
arrivals. Ledger "Run is not Submit"; flag-queue row 17.
