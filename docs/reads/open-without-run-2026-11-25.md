# Open without a run — who opens a challenge and never runs a query (A05, 2026-11-25)

Investor plan A05 (`docs/plans/investor-90-day-2026-11-25.md`): diagnose the
people who open a challenge and never run a query, and name the smallest
fixes. Read-only: production `pro_events` through the read-only Supabase MCP,
the code on `main` at `8ead30c6`. No code, flag or data changed. Aggregates
only — no aid, username or email in this file.

## How it was read

- **Window:** challenge opens from 2026-10-28 00:00 to 2026-11-25 00:00 UTC
  (28 days). Runs and solves are counted up to 24 h after the window ends.
- **People** = `coalesce(aid, username)`; metadata read as
  `(metadata #>> '{}')::jsonb`.
- **Humans only.** A person is out when any row of theirs, at any time,
  matches the exclusion block of `scripts/scorecard-weekly.sql` (PR #387):
  internal usernames; the founder's walk aids, the 11-20 checkout tests and
  the 11-24 walk guests; `bot` / `wd` / `uaBot` stamps; the viewports
  `tablet:800x600`, `desktop:1280x1200`, `desktop:1919x992`,
  `desktop:1024x1024`; `ref:aocr.org` / `verify-test`; `app1lang`,
  `topic1lang`, the LA/1920x1080 pre-stamp shape, `utc1280`, `cn_app` and the
  `langs = 2` no-landing group. The landing-only rules (`utc_landing`,
  `cn_reader`, `google_ua`) cannot match a challenge opener, who by
  definition opened the app.
- **Unit:** each person's **first challenge open in the window**. 468 of the
  511 were the person's first open ever; 43 had opened a challenge before.
- **Ran** = a `challenge_first_run` (either `via`, the starter included) for
  the **same** `challengeId` at or after the open — the `open_to_first_run`
  definition in `docs/agent/metrics.md`. Reported beside it: **ran anything
  within 24 h** (any challenge), because some people leave the opened
  challenge for another one and run that.
- **Device** = the `viewport` band on the `challenge_opened` row itself.
  **Door** = the row's `arrivalSrc` (an `ai:` `landingSrc` wins), grouped.
- **How the challenge was opened:** `openedFrom` = `company_direct` or
  `deeplink_swap`; **first-screen #91** = a `first_screen_assigned` arm
  `challenge` within 2 minutes before an open of #91; **auto deep link** =
  the open landed < 3 s after the `app_opened` (a `?challenge=` link from a
  page); otherwise **chosen in app**. (On the unfiltered first opens, 90%
  land inside 1 s of the app open or more than a minute after it, so the
  3 s cut is not sensitive.)

## 0. The headline, and why it is not 67%

| Population (first open in the 28 days) | Openers | No run on that challenge | No run at all within 24 h |
|---|---|---|---|
| Raw, no filter | 1,548 | 1,307 (84%) | — |
| **Humans** | **511** | **275 (54%)** | **244 (48%)** |

- **Two thirds of the "challenge openers" are machines:** 1,037 of 1,548
  (67%) are excluded by the human rules, nearly all of them `viewport`,
  `app1lang`, `bot_stamp` and `cn_app`. Read on all rows the leak is 84%;
  read on people it is **54% (same challenge) / 48% (anything in 24 h)**. The
  ~67% in the due-diligence answers sits between the two and could not be
  reproduced on either filter; quote the human figure.
- B1's 11-24 read (new app openers, its own filter) lost 44% between
  "opened a challenge" and "first run" — the same order as 48% here.
- **This is an arrival leak, not a content leak.** On a challenge opened as
  a person's *later* open, no-run is 5–17% (#95 5%, #93 9%, #96 12%, #92
  17%). On the first open it is 50–74% almost whatever the challenge (§3).

## 1. Who does not run — splits

All splits are humans, first open in the window; "no run" is the same
challenge, "no run 24 h" is any challenge.

**Device**

| Device | Openers | No run | No run 24 h |
|---|---|---|---|
| desktop | 464 | 237 (51%) | 44% |
| **mobile** | **37** | **30 (81%)** | **81%** |
| tablet | 9 | 7 (78%) | 78% |

**Door**

| Door | Openers | No run | No run 24 h |
|---|---|---|---|
| topic / question pages | 131 | 76 (58%) | 51% |
| `/sql-exercises/` | 119 | 58 (49%) | 46% |
| company pages | 85 | 44 (52%) | 46% |
| other pages (blog, comparison, tools, learn) | 73 | 41 (56%) | 49% |
| homepage | 39 | 24 (62%) | **41%** |
| AI assistant (`landingSrc ai:`) | 36 | 20 (56%) | 53% |
| direct (no source) | 28 | 12 (43%) | 43% |

The homepage gap (62% → 41%) is people who leave #91 and run a different
challenge (§2).

**First-ever open vs a returning opener**

| | Openers | No run | No run 24 h |
|---|---|---|---|
| first open ever | 468 | 249 (53%) | 47% |
| had opened a challenge before the window | 43 | 26 (60%) | 56% |

**Difficulty of the opened challenge**

| Difficulty | Openers | No run |
|---|---|---|
| Easy | 428 | 226 (53%) |
| Medium | 74 | 42 (57%) |
| Hard | 9 | 7 (78%) |

Hard first opens are rare: the 11-22 deep-link swap sends a cold Hard link
to a free preview (`deeplink_preview_swap`, 4 human first opens).

**How the challenge was opened**

| How | Openers | No run | No run 24 h |
|---|---|---|---|
| auto deep link (page → `?challenge=`) | 181 | 114 (63%) | 56% |
| first-screen #91 (prefilled editor) | 166 | 89 (54%) | 44% |
| chosen in app | 155 | 65 (42%) | 41% |
| company direct-open (`companyDirectOpen`, from 11-23) | 5 | 4 | — |
| deep-link swap | 4 | 3 | — |

Desktop only, by how × door (cells under 5 left out):

| Desktop | Openers | No run | No run ≤ 10 min | No run 24 h | Left for another challenge |
|---|---|---|---|---|---|
| **auto deep link** | **160** | **95 (59%)** | 99 (62%) | 83 (52%) | 18 |
| · topic / question | 111 | 61 | 61 | 53 | 11 |
| · company | 25 | 18 (72%) | 20 | 15 | 4 |
| · `/sql-exercises/` | 10 | 7 | 7 | 6 | 2 |
| **first-screen #91** | **152** | **81 (53%)** | 74 (49%) | 65 (43%) | **24** |
| · `/sql-exercises/` | 54 | 27 | 30 | 25 | 3 |
| · other pages | 41 | 22 | 19 | 18 | 6 |
| · homepage | 25 | 16 | 10 | **7** | **10** |
| · direct | 17 | 7 | 7 | 7 | 1 |
| · AI | 13 | 8 | 7 | 7 | 3 |
| **chosen in app** | **143** | **54 (38%)** | 63 (44%) | 52 (36%) | 8 |
| · company | 46 | 14 | 19 | 13 | 1 |
| · `/sql-exercises/` | 44 | 16 | 19 | 16 | 3 |

Mobile (n = 37, directional only): auto deep link 16 → 14 no run (0
solved in 24 h); chosen 10 → 9; first-screen #91 11 → 7.

**Weekly, first-ever opens** (the 11-23 row is two days):

| Week | Openers | No run | #91: n / no run | Other challenges: n / no run | Mobile: n / no run |
|---|---|---|---|---|---|
| 09-28 | 125 | 50% | 55 / 36% | 70 / 60% | 8 / 75% |
| 10-05 | 228 | 57% | 88 / 51% | 140 / 61% | 21 / 57% |
| 10-12 | 147 | 45% | 72 / 42% | 75 / 48% | 8 / 75% |
| 10-19 | 127 | 46% | 51 / 33% | 76 / 55% | 15 / 60% |
| 10-26 | 124 | 50% | 36 / 47% | 88 / 51% | 9 / 89% |
| 11-02 | 97 | 52% | 45 / 53% | 52 / 50% | 7 / 86% |
| 11-09 | 107 | 49% | 39 / 36% | 68 / 56% | 13 / 85% |
| 11-16 | 120 | 53% | 49 / 47% | 71 / 58% | 6 / 67% |
| 11-23 (2 days) | 65 | 63% | 37 / **68%** | 28 / 57% | 5 / 80% |

- The rate has been flat at ~50% for two months; nothing shipped on this step
  has moved it yet (the 12-20 reads are still due).
- **Watch #91 since 11-23** (25 first opens on 11-23 with 15 not run, 12 on
  11-24 with 10 not run). It coincides with `firstScreenChallenge` sending
  every start-screen arrival to #91 (11-22) — people who used to get the
  quiz now land on "Your First Query" — and most of them did something else
  rather than nothing (§2). Two days; read again 12-01.
- **The 11-22 "Run on an empty editor runs the starter" change is barely
  used:** `via = 'starter'` on 2 first runs in the 28 days, against 139
  empty-editor runners who typed a query first. The editor still looks
  empty (the starter is a grey placeholder), so almost nobody presses Run
  before writing.

## 2. What happens before they leave

Non-runners = 275. Window: the open → 2 hours later, or until the person
moves to another screen.

| What the non-runner did | People | Share |
|---|---|---|
| **no event at all after the open** | **147** | **53%** (desktop 122 / 237; mobile 19 / 30) |
| last event under 20 s after the open | 18 | 7% |
| last event 20 s – 2 min after | 41 | 15% |
| last event over 2 min after | 69 | 25% |
| opened a different challenge (within 2 h) | 68 | 25% |
| went to another tab (Coach, Interview, goal picker, lesson, placement) | 63 | 23% |
| back on a marketing page within 60 s | 17 | 6% |
| opened a hint **on the challenge they did not run** | 9 | 3% |
| opened the inline tutor on it | 1 | 0% |
| pressed "Start writing →" (first-run banner) | 5 | 2% |
| met a lock or quota wall within 2 h | 16 | 6% |
| saw a Pro or sign-up modal before leaving | 5 | 2% |
| wrote feedback / stuck verdict | 0 | 0% |
| came back on a later day within 7 days | 31 | 11% |
| ran something later than 2 h after | 11 | 4% |

First thing after the open, by how it was opened (non-runners):

| How | Nothing | Opened another challenge | Back to a page | Interview tab | Placement quiz | Hint |
|---|---|---|---|---|---|---|
| auto deep link (114) | 70 | 12 (median 163 s later) | 11 (median 53 s) | 5 | 4 | 3 |
| first-screen #91 (89) | 36 | **18 (median 189 s later)** | 11 (median **10 s**) | 7 | 8 | 0 |
| chosen in app (65) | 38 | 4 | 3 | 3 | 0 | 4 |

- **Half leave no row at all.** The app writes nothing between the open and
  the run — no typing, focus, scroll or leave event — so a two-second bounce
  and a ten-minute give-up look the same. `challenge_left` (#287) is the
  missing instrument and is **still open**, not merged.
- **Help is not what they reach for:** 9 of 275 opened a hint on the
  challenge, 1 the tutor. The stuck ask (`stuckAsk`, 3 minutes on screen)
  is dark until 12-20.
- **#91 loses people who know SQL.** 24 of the 81 desktop first-screen #91
  non-runners left it for another challenge after ~3 minutes of looking (on
  the homepage door, 10 of 25), most of them to run that one. 30 of the 104
  #91 first-open non-runners had pressed a site CTA or nav link in the 3
  minutes before;
  11 were back on the marketing site within ~10 s. The page says "Welcome to
  SQL!" to people who arrived to practise interview questions.
- **Not explained by load time or walls.** Median `bootMs` on the first
  `app_opened`: 1,085 ms non-runners vs 963 ms runners (p90 2.7 s vs
  2.4 s; none over 8 s). 16 of 275 met a wall within 2 h, mostly after
  moving on. 256 of 275 non-runners had a `landing_engaged` row, and their
  language count, time zones and source mix match the runners' — they are
  people, not a crawler the rules missed.

**Not measurable today:**
- **The challenge tour** writes no event. It cannot be the cause on a first
  open: the code never shows it on the first-run shell or on a content deep
  link (`showFirstRunSimpleShell`, `hasContentDeepLink`), which together
  are nearly every first open.
- **Schema / table view** writes no event (`setShowChallengeStructure` is
  silent).
- **`challenge_left` reasons**: #287 not merged; 0 rows.
- **`web_vital`**: 0 rows in production (the code PR has not deployed), so
  the LCP-band split of `open_to_first_run` cannot be read yet.

## 3. The challenges with the worst open → run (n ≥ 15 person-opens)

Person-challenge opens in the window (a person counted once per challenge),
humans:

| Challenge | Difficulty | Person-opens | No run | First opens: n / no run | Solved | Mostly from |
|---|---|---|---|---|---|---|
| #154 Country × Category Coverage Matrix (Cross Join) | Medium | 24 | 17 (71%) | 23 / 74% | 3 | topic pages |
| #177 A Subquery That Returns One Value | Easy | 27 | 19 (70%) | 19 / 74% | 6 | topic pages |
| #275 (Capital One set) | Easy | 31 | 18 (58%) | 21 / 62% | 12 | company page / view (29 of 31) |
| #136 Country Codes in Uppercase | Easy | 19 | 10 (53%) | 16 / 50% | 9 | company views (Wise; 18) |
| #1 Class Survival Breakdown | Medium | 15 | 8 (53%) | 3 / — | 6 | mixed |
| #105 Your First JOIN | Easy | 80 | 38 (48%) | 47 / 51% | 34 | `/sql-exercises/` |
| #170 Rank Everyone by Salary | Easy | 29 | 14 (48%) | 25 / 48% | 13 | topic pages |
| #91 Your First Query (prefilled) | Easy | 285 | 122 (43%) | 197 / 52% | 148 | first screen |
| … | | | | | | |
| #92 Pick Your Columns | Easy | 133 | 23 (17%) | 0 / — | 103 | later opens |
| #93 Filter with WHERE | Easy | 104 | 9 (9%) | 4 / — | 92 | later opens |
| #95 | Easy | 55 | 3 (5%) | 0 / — | 51 | later opens |

Every challenge at the top is a **first** open reached by a link; every
challenge at the bottom is a second-or-later open on the beginner ladder.
#154 and #177 are topic-page entries that teach a new idea on an empty
editor (a cross join; a scalar subquery) to a person who has run nothing.

## 4. People who ran: the first 60 seconds

Runners = 236 (desktop 227, mobile 7, tablet 2).

| | Runners | Ran ≤ 30 s | 30–60 s | 1–3 min | 3–10 min | > 10 min | via Submit | via starter |
|---|---|---|---|---|---|---|---|---|
| #91 (prefilled editor) | 97 | **41** | **22** | 19 | 6 | 9 | 41 | 0 |
| every other challenge (empty editor) | 139 | 9 | 13 | 48 | 45 | 24 | 31 | 2 |

- On the prefilled #91, **63 of 97 runners (65%) ran inside a minute**. On
  an empty editor **22 of 139 (16%)** did; the median empty-editor runner
  needed about 3 minutes of writing before seeing any output.
- In their first 60 s runners leave almost no more rows than non-runners:
  37 of 236 wrote anything before the run or the 60-second mark ("Start
  writing →" 11, dialect notes 8, a hint 2). What separates them is not a
  visible action; it is whether the first output arrives before they give
  up. The non-runners spent less time on the landing page before arriving
  (median 18–26 s vs 45–64 s for people who ran after 1–10 minutes) — a
  weaker-intent visitor, which a faster first output is for.

## 5. Recommendations (at most three, ranked by people per week)

Volumes: 511 human first opens in 28 days ≈ **128 a week**, of whom ~69 do
not run that challenge and ~61 run nothing within 24 h. Desktop is 91% of
them.

**Cells (orchestrator decision 2026-11-24: at most two live A/Bs per funnel
step × device).**
- open → first run, **phones: full** (`companyDirectOpen` + `mobileRunBar`
  once #366 flips).
- open → first run, **desktop: one free slot** (`companyDirectOpen` only).
- first run → solve: `runSubmitNudge` (merged 11-25, flag off).
- No paywall, price or quota change is proposed (freeQuota holdout reads
  12-31).

### 1. Prefill the starter query on a first-contact open with an empty editor (desktop) — ~+6 people a week reach a first run

- **What changes.** For a person with zero solves opening any challenge
  other than #91 on desktop, the editor holds the runnable starter it
  already computes (`SELECT * FROM <first table> LIMIT 5;`) as real text,
  selected, so the first keystroke replaces it — exactly what #91 does
  today — instead of a grey placeholder. Run then shows the table at the
  first click. One line in `openChallenge`; the 09-19 QA objection (a
  comment starter was submitted alongside the person's query) does not
  apply because the text is one runnable statement that typing replaces.
  Nothing else on the page changes.
- **Why.** The leak is the time to first output: 65% of #91's runners ran
  inside a minute against 16% on empty editors; the placeholder route to the
  starter was used twice in 28 days; the auto-deep-link door (desktop
  160 / 28 days, 59% no run) is the largest leaking group.
- **Metric.** `open_to_first_run` restricted to first-contact desktop opens
  of empty-editor challenges, **ran the same challenge within 10 minutes**,
  by arm. Secondary: any `challenge_solved` within 24 h. Guardrail: share of
  first submits that are the unedited starter (a wrong answer the person did
  not write).
- **A/B: yes, in the free desktop open → first-run slot** (2nd of 2 with
  `companyDirectOpen`; read crossed 2×2 with its arms). Arm assigned by aid
  with the FNV + murmur3 finaliser (`companyAskArm` pattern), independent of
  `company_direct_v1`, `run_submit_nudge_v1`, both mobile tests,
  `next_up_first_v1` and the freeQuota holdout (#384), tested over 10,000
  aids. Phones stay out (their cell is full). **Start after the 12-20 read**
  of the starter-run / deep-link-swap claims, or read those claims inside
  control only — this test changes the same starter.
- **Baseline / target / n.** Desktop empty-editor first opens ran within
  10 min: ~38% (auto deep link: 61 of 160). Target: prefill ≥ control + 8
  points. ~70 eligible people a week → 120 per arm in ~3.5 weeks.
- **Expected gain.** Half of the gap to #91's 10-minute rate (51%), on
  ~70 people a week: ~+4 to +8 first runners a week (~6), ~80% of whom
  solve (the first run → solve rate).
- **Falsification.** At 120 per arm, prefill is within ± 5 points of
  control on the 10-minute run, **or** higher on runs but not on 24-h
  solves → FLAT, flag off, the placeholder stays. Harm check at 60 per arm:
  prefill trails control by ≥ 10 points on 24-h solves → off the same day.

### 2. A "Know SQL already?" exit on the first-screen #91 (desktop) — ~+3 people a week

- **What changes.** One link on the first-run banner of the auto-opened
  #91 only: "Already write SQL? Start at interview level →", opening the
  curriculum pick for the `working` level (`pickNextChallenge` — never raw
  order). #91, its prefill and the banner otherwise unchanged.
- **Why.** 24 of the 81 desktop #91 non-runners left it for another
  challenge after ~3 minutes of searching (10 of 25 on the homepage door);
  30 of 104 had just pressed a site CTA or nav link; 11 were back on the
  marketing site in ~10 s. Since 11-22 every start-screen arrival lands
  there.
- **Metric.** Of first-screen #91 arrivals, **ran any challenge within 10
  minutes**, by arm; secondary any solve within 24 h; guardrail: #91 solve
  rate among those who do not take the link.
- **A/B: yes, but it does not fit now** — it is the same desktop open →
  first-run cell, which #1 fills. Queue it for the first slot that frees
  (`companyDirectOpen` verdict at 120 per arm, or #1's verdict). Same hash
  rules as #1.
- **Baseline / target / n.** Ran within 10 min: 51% (78 of 152). Target
  + 8 points. ~38 a week → 120 per arm in ~6.5 weeks.
- **Expected gain.** Recovering a third of the 24 "searched then left or ran
  late" plus some of the 11 bouncers: ~+3 a week (range 2–5).
- **Falsification.** Within ± 5 points at 120 per arm → FLAT, remove the
  link. Link arm's 24-h solve rate ≥ 10 points below control at 60 per arm
  (people jump to a question they cannot finish) → off.

### 3. Phones: flip `mobileRunBar` (#366) as queued, add nothing — ~+1 to +2 a week

- **What changes.** Nothing new. The phone cell is full; the step already
  has `mobileRunBar` queued and `mobileOneLayer` after the solve.
- **Why it is third.** Phones are 37 first opens in 28 days (~9 a week) at
  81% no run — the worst rate and the smallest group. 16 of the 37 came by
  deep link and none of those solved within 24 h.
- **Metric / rule.** Its own: `open_to_first_run` mobile band by arm
  (metrics.md), read 28 days after the flip.
- **Before the read:** the five `mobile_run_bar_assigned` rows that exist
  today (2026-11-25 10:24–10:30 UTC, `Europe/Istanbul`, `mobile:390x663` /
  `mobile:375x812`, 4 `bar`, 1 `control`) were written while the flag is
  off on `main` — a preview walk with the flag overridden. Add them to the
  walk exclusions (fleet README rule 2) so they do not seed the arms.
- **Falsification.** The flag's own ledger rule.

### Before any of them: merge #287 (`challenge_left`)

Not a fix — no people gained directly — but 53% of non-runners leave no row,
so neither #1 nor #2 can say *why* an arm lost without it. It is
measurement only (rule 6b), touches no cell, and should land before #1's
flip so both arms carry it.

### Noted, not recommended now

- **`stuckAsk` (flips 12-20) sits on this step.** A05 says only
  independently randomised changes until the holdout reads; a flag-on for
  everyone would hit both arms of #1 and of `companyDirectOpen` alike but
  break the before/after reads. Flip it as an A/B or after #1's verdict.
- **#154 / #177 as topic-page entries.** They lose 74% of first opens; #1
  covers them (empty editor). Swapping topic links to an on-ramp is a
  content change for after #1 reads.

## 6. Reproduce

The queries are the `scorecard-weekly.sql` exclusion block (PR #387) over
the openers' rows, then: first open in the window per person; `ran` by
`challengeId`; `how` by `openedFrom`, `first_screen_assigned` and the gap to
the latest `app_opened`; door by `arrivalSrc` / `landingSrc`. Run through
the read-only MCP on 2026-11-25 between ~11:05 and ~11:40 UTC.
