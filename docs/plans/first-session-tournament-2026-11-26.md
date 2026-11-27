# First-session tournament — new visitors split across first sessions, the worst one replaced (2026-11-26)

**Status:** plan only. No app code in this PR. Flag `firstSessionTournament`
(dark), launch **no earlier than 2026-12-10**.

**Recommendation: start with three arms, not four.** Control, B (single
path) and D (interview sprint). C (proof first) is built and queued as the
first replacement. The real traffic is ~23 human openers a day, not 100
(§1a). With four arms, each arm gets ~6 people a day, the first elimination
is ~5 weeks out, and the 0.80 rule catches a clearly worse arm about half
the time. With three arms it is ~8 a day, ~4 weeks out, and ~70% of the
time (§5.5). A fourth slot opens when the 4-week average reaches 30 human
openers a day (§2.1).

**Where this comes from (founder, chat, 2026-11-26, verbatim):**
1. "uygulamaya yeni gelen kişiyi hemen seviyesini bi şekilde anlayıp onun
   seviyesine göre bir yol haritası vereceğiz ona seçenek tanımadan.
   kullanıcı uygulamada tek birşeye odaklanacak ve bi noktaya kadar ücretsiz
   olacak." The orchestrator named this shape "Tek Yol" (single path). It is
   arm B below.
2. Later the same day, the scope changed. "hipotezlerini oluştur her birini
   farklı kullanıcılarda dene … 4 tane farklı seçenek olsun … elinde veri
   birikince bu 4ün en kötüsünü ele onun yerine başka bi tane koy, ve bu hep
   böyle devam etsin … hangisi daha çok subscription sağlıyor gör." So the
   single path is not a stand-alone A/B. It is one arm of a permanent 4-arm
   tournament on new visitors. Arm A, today's product, never leaves.

**Constraints this plan does not touch** (`docs/plans/investor-90-day-2026-11-25.md`):
- no price change and no quota change: `FREE_SOLVE_QUOTA` stays 10;
- the freeQuota holdout (#384) runs orthogonally. It enrols 11-27 → 12-24,
  with the money read on 12-11 and the full read on 2027-01-01 (moved a day
  on 2026-11-26: it starts on merge);
- money copy needs the founder's go. §7 lists every such string.

Metrics: `first_session_tournament` (the decision metric) and
`single_path_split` (arm B diagnostics; it never decides), both in
`docs/agent/metrics.md`. Ledger claim: "the first-session tournament".

---

## 1. Evidence

All counts are humans, filtered as in `scripts/scorecard-weekly.sql` (PR
#387): internal, founder walks, bot stamps, crawler viewports, `app1lang`,
`topic1lang`, `prestamp_fp`, `utc1280`, `cn_app`, `langs2`. A person is
`coalesce(meta->>'aid', username)` with `meta = (metadata #>> '{}')::jsonb`.
Read-only MCP, 2026-11-26.

### 1a. Volume and the baseline the tournament is judged against

Cohort: people whose **first ever `app_opened`** fell between 2026-10-05
and 2026-11-18 (45 days, every person with 7 full days of follow-up). The
period starts on 10-05 for a reason. The week of 09-28 carries a crawler
burst: 1,734 raw first opens, 1,350 of them in tz UTC. Two runs of the same
filter count that week differently (13 vs ~400 humans), so it is left out
(see the papercut in the PR).

| Device | New people | ≥ 1 solve in 7 d | **6+ solves in 7 d** | 10+ solves in 7 d | met the quota wall in 7 d | first_solve_10m | second_session_7d | plan click in 7 d | trial in 30 d | paid in 30 d |
|---|---|---|---|---|---|---|---|---|---|---|
| all | **915** | 338 (36.9%) | **108 (11.8%)** | 51 (5.6%) | 48 (5.2%) | 213 (23.3%) | 146 (16.0%) | 14 (1.5%) | 4 | 3 |
| desktop | 818 | 326 | 106 (13.0%) | 49 | 46 | 205 | 140 | 12 | 4 | 3 |
| mobile | 84 | 9 | **0** | 0 | 0 | 7 | 5 | 2 | 0 | 0 |
| tablet | 13 | 3 | 2 | 2 | 2 | 1 | 1 | 0 | 0 | 0 |

The wider 90-day window (first opens 08-21 → 11-18) gives 2,888 people and
394 at 6+ (13.6%). It spans the 09-26 quota flip and the 09-28 burst, so it
is context only. Since the quota, 6+ in 7 days has been 11.6–11.8% on both
reads. Weekly, from 10-05: 122, 177, 160, 143, 121, 128, 139 new people;
6+ solvers 25, 25, 10, 9, 15, 15, 10.

**The founder assumed 100 new people a day. The real number is ~20–23 a
day.** This read found 915 new app openers in 45 days (~142 a week). B1's
90-day read (`docs/reads/funnel-by-segment-2026-11-26.md`, #409) found
2,099 human challenge openers in 90 days, **~23 a day, ~161 a week**, which
is the planning number below. 5,609 browsers opened a challenge before the
bot filter; that is probably where 100 a day came from.

**Who pays** (#409):
- **Interview-target openers** are 15% of openers (302 of 2,099). They
  arrived from a company page, a `?company=` link or the readiness test.
  They give **7 of the 12 payers: 2.0 trial-or-paid per 100**, against
  0.33 per 100 for everyone else.
- The loss before the price is **the same in both groups.** About 45%
  never run a query, and about 75% never see a price.
- 10 of the 12 buyers bought at ≥ 6 solves, a median of 1.3 days after
  their first open. That is why 6+ solves in 7 days stays the decision
  metric (§5.1).
- **Nobody sets an interview date:** `prep_target_set` has 0 rows in 90
  days, and 7 accounts in all of `users` carry a `prepTarget.date`. Arm D
  therefore never asks for one (§4).

### 1b. Why one path, and why levels from questions rather than a quiz

- **A screen of questions at the door loses people.** The first-screen test
  measured `first_solve_10m` at 37.2% (challenge first) vs 15.5% (quiz
  first), 527 / 536 people (ledger HIT, 11-22). Of 406 who saw the quiz in
  their first minute, 15 finished it. The Coach's own placement check: 102
  handed it, 50 never started, 43 stopped inside, 4 finished. `goalGate` was
  turned off the day it shipped for the same reason. **So arm B measures
  level from the solving itself.** Nothing on screen is a quiz.
- **People leave by choosing.** In
  `docs/reads/open-without-run-2026-11-25.md` §2, 25% of first-open
  non-runners opened a different challenge and 23% went to another tab. 24
  of 81 desktop #91 non-runners left it for another challenge after about 3
  minutes. Every exit is a menu. Arm B removes the menu until the level is
  known.
- **The first output must come fast.** On the prefilled #91, 65% of runners
  ran inside a minute; on an empty editor, 16% did. Arm B reuses the
  runnable starter text from #402 on every first-contact editor.
- **Arm B serves both segments.** The open → run → solve leak is the same
  for interview-target people and everyone else (#409), and arm B acts on
  exactly that stretch. Arm D acts on the 15% who buy at 6× the rate.
- **What the activation metric is.** Every purchase in the product's
  history was a first-session decision at 6–10 solves
  (`docs/plans/free-tier-boundary-2026-09-12.md`). Six solves is the step
  closest to the money that has volume: 108 people in 45 days against 7
  trial-or-paid.

### 1c. Measured solve times on the candidate rungs (since 2026-09-01, humans)

"Clean" means solved with ≤ 1 wrong submit and no hint. Time is measured
from the first `challenge_opened` to the first `challenge_solved` on that
challenge. The p25 / p50 / p75 columns are over solvers.

| # | Title | Diff | Openers | Solved | p25 / p50 / p75 (s) | Clean ≤ 3 min | Clean ≤ 5 min |
|---|---|---|---|---|---|---|---|
| 91 | Your First Query | E | 556 | 315 | 30 / 52 / 132 | 239 | 252 |
| 93 | Filter with WHERE | E | 235 | 209 | 69 / 114 / 200 | 134 | 149 |
| 95 | Multiple Conditions | E | 120 | 112 | 148 / 259 / 529 | 34 | 52 |
| 97 | Sorting and Limiting | E | 84 | 70 | 121 / 211 / 604 | 23 | 31 |
| 100 | GROUP BY Basics | E | 27 | 19 | 132 / 158 / 402 | 10 | 10 |
| 105 | Your First JOIN | E | 199 | 109 | 219 / 407 / 674 | 17 | 36 |
| 98 | Counting Rows | E | 107 | 71 | 381 / 673 / 2369 | 3 | 7 |
| 107 | GROUP BY + HAVING | M | 96 | 65 | 481 / 728 / 1424 | 0 | 1 |
| 106 | LEFT JOIN: Keep Everyone | M | 100 | 55 | 678 / 1291 / 2379 | 0 | 2 |
| 168 | Your First Window Function | E | 16 | 11 | 203 / 268 / 410 | 0 | 5 |
| 179 | Give a Query a Name (WITH) | E | 13 | 6 | 272 / 338 / 413 | 0 | 2 |
| 171 | Salary vs Dept Avg (PARTITION BY) | M | 4 | 2 | 356 / 397 / 439 | 0 | 0 |
| 163 | Second-Highest Earner (ROW_NUMBER) | M | 6 | 3 | 253 / 288 / 366 | 0 | 2 |
| 275 | Capital One Q1 | E | 59 | 28 | 245 / 364 / 807 | 3 | 7 |

**This changes the shape the orchestrator sketched.** The sketch was
"Easy basics → JOIN/GROUP BY Medium → window/CTE". But the JOIN / GROUP BY
**Mediums** (#107, #106) take a median of 12–21 minutes, and 1–2% of their
solvers solve them clean inside 5 minutes. As question 2 they would stall
nearly everyone. So rung 1 of the ladder is the **Easy** JOIN / GROUP BY
pair (#100, #105). The Mediums appear only as confirmation items deeper in
the rung. Rung 2's evidence is thin (n = 4–16 per item); §3.3 says how the
thresholds get re-set.

### 1d. The readiness test, the mechanism of arm C

Over 90 days, the public readiness test was started by 44 people, finished
by 12 (27%), and its plan link was clicked by 6 (one-week-old filter: bot
stamps and internal only). Arm C puts the same ten questions at the app's
door. 1b predicts it loses on `first_solve_10m`. The tournament exists to
find out instead of predicting, and C's harm stop (§5.5) caps the cost.

---

## 2. The tournament

### 2.1 Who enters

- **New visitors only.** A browser enters when the tournament flag is on,
  it has no SQL Quest app key (the `PRE_APP_KEYS` rule from #384, reused,
  not copied), and this is its **first app open**.
- **Never entered:**
  - returning browsers;
  - signed-in accounts created before the browser's first open;
  - `hired` intent;
  - a first open carrying `?interview=` (a mock link: it goes to the Pro
    modal or the free mock, today's behaviour, all arms);
  - a first open carrying `?profile=` (they came to view someone).
  - Each gets a record with `status: returning | excluded_interview_link |
    excluded_profile` and no event.
- **Assignment** happens once, at module load, before the app writes any
  key (the holdout's order). The record is
  `sqlquest_tournament_v1 = {status, slot, arm, armVersion, round,
  assignedAt}`. A stored record always wins, so nobody is re-armed. A slot
  whose arm is replaced keeps its people in the old arm: their record names
  the arm, not the slot.
- **Hash:** FNV over `${aid}:first_session_tournament_v1:${stratum}`, then
  the murmur3 finalizer (the `companyDirectArm` pattern). The draw
  `u = h / 2^32` falls into the stratum's cumulative weights over the
  active arms (§2.1a; amended 2026-11-26 — it was `h % SLOTS`).
- **`SLOTS` is 3 at launch** (control, B, D). It goes to 4 only by an
  orchestrator decision row, once the 4-week average of human new openers
  reaches **30 a day**. That is ~52 per arm a week at four arms, which is
  what three arms get today.
  - Changing `SLOTS` re-buckets only browsers that have no record yet.
    Stored records keep their arm.
  - The read restarts its per-arm counts at the change, because a slot
    share moves from 1/3 to 1/4 and arms are never pooled across it. The test
  checks independence over 10,000 aids against every two-arm test
  (first-screen, CTA, company-ask, company-direct, quota-wall-inline,
  modal-layout, run/submit, mobile-run-bar, mobile-one-layer, freeQuota
  holdout, runnable-starter) and checks that each slot × holdout-arm cell
  holds an equal share (1/6 at three slots).
- **Event:** `tournament_assigned {test, slot, arm, armVersion, round,
  firstOpenAt, stratum, profile, weights, weightsVersion, draw, reason}`,
  written once (the door and the viewport band ride every row through
  `trackActivationEvent`, and the profile holds them too). `tArm` and `tArmV` are
  stamped on **every** `pro_events` row from an enrolled browser, in
  `writeProEvent`, exactly like `fqArm`. Server rows (`stripe_webhook`)
  join by username.

### 2.1a Assignment: profile first, then the stratum, then the draw (amended 2026-11-26)

**Founder, chat, 2026-11-26 (verbatim):** "her bir grubu tek tek test et.
ben de testi görebileyim. o kişiye o gruba niye atadın o kişinin profilini
de çıkar. yani kişinin profilini anlamadan onu bir gruba alamayız. profile
göre gruba almalıyız".

**The design that keeps the experiment valid** (orchestrator): the profile
decides the person's STRATUM, never their arm. If the arm were picked from
the profile (say, every Capital One visitor to D), arm and profile would be
one variable and no read could say which of the two moved the number. So:

1. **Profile** at the first app open, before the person does anything
   (`buildVisitorProfile`, src/utils/tournament.js). Only signals known at
   that moment, no PII:
   - **door**: company page (+ company slug), `?company=` link, readiness
     test, `/sql-exercises/`, topic (`/challenges/*`, the trap pages),
     question page, blog, homepage, AI assistant (`landingSrc` `ai:*`),
     another page, an external referrer, or direct / unknown — read from
     `?src` / `utm_source` / `?company` / the referrer and the stored
     `landingSrc`, the rules `arrivalSrc` and #409's door table use;
   - **interviewTarget** (#409's entry definition): a company page, a
     `?company=` link, the readiness test or its stored result
     (`sqlquest_readiness_v1`), the Capital One blog — and which of these;
   - **device** (desktop / tablet / phone, the landing tracker's bands);
   - **country** (ISO-2, only if `/api/geo/` is already cached in the tab —
     at a first open it usually is not; the announce fills it in when it
     has answered, never the stratum) and **priceRegion** (india / default);
   - **language** (`?lang=`, else the browser's), a **timezone bucket**
     (americas / europe_africa / gulf_south_asia / east_asia_oceania — never
     the zone name), **landingBefore** (a landing page ran first in this
     browser), the **readiness band** (low / mid / high) if the public test
     was taken.
2. **Stratum** = interview-target (IT / NI) × desktop (D; an unreadable
   device too) / phone+tablet (M): **IT-D, IT-M, NI-D, NI-M**. Four only:
   at ~23 new people a day every extra cut halves each cell.
3. **Draw inside the stratum**: the hash above, salted by the stratum, over
   the stratum's weights — equal across the active arms unless the stratum
   is routed (`TOURNAMENT_STRATUM_WEIGHTS` in the registry, empty at
   launch).
4. **Log** `stratum`, `profile`, `weights`, `weightsVersion`, `draw` and a
   human `reason` on `tournament_assigned` and in the stored record, e.g.
   "interview-target (Capital One page) · desktop → stratum IT-D; equal
   weights A/B/D; hash draw 0.41 → B". `scripts/tournament-people.sql` lists
   every assigned person (a hashed 8-character id, never the aid) with the
   profile, the reason and their progress, so the founder can see each
   group person by person.
5. **Read per stratum AND pooled** (§5.4). Elimination and promotion stay
   pooled; a stratum with a proven winner is **routed** to it by weights,
   keeping ≥ 20% exploration (§5.5 rule 7).

**Expected people per stratum** (first app openers 2026-10-05 → 11-22 by
door and viewport, read-only MCP 2026-11-26, scaled to #409's ~161 a week):

| Stratum | share | per week | per arm per week (3 arms) | 100 per arm |
|---|---|---|---|---|
| IT-D | 17% | ~28 | ~9 | ~11 weeks |
| IT-M | 3% | ~5 | ~1.6 | > 1 year |
| NI-D | 72% | ~116 | ~39 | ~2.6 weeks |
| NI-M | 7% | ~12 | ~4 | ~25 weeks |

Raw counts: IT-D 220, IT-M 39, NI-D 918, NI-M 94 first app openers in 48
days. Interview-target is 20% here against #409's 15% (this counts app
openers with a lighter bot filter, #409 counted challenge openers with the
full one), so read the IT rows as an upper bound.

So routing can only ever happen in NI-D in the first months, and in IT-D
around March 2027; IT-M and NI-M are explore-only in practice. That is the
honest price of four strata at this volume, and why the decisions stay
pooled.

### 2.2 The registry

`src/data/tournament-arms.js` is the single source. The app, the tests and
`scripts/tournament-read.sql` read it.

```js
export const TOURNAMENT_TEST_ID = 'first_session_tournament_v1';
export const TOURNAMENT_SLOTS = 3;            // slot 0 is control, forever; 4 only by decision row (§2.1)
export const TOURNAMENT_ARMS = [
  { id: 'A_control',          slot: 0, version: 1, start: '2026-12-10', status: 'permanent',
    hypothesis: "Today's product; anchors drift and is never eliminated." },
  { id: 'B_single_path',      slot: 1, version: 1, start: '2026-12-10', status: 'live',
    hypothesis: 'No choices until the level is known: a 4-question adaptive ladder sets the level from solving, then one line says the next step — fewer exits, more solves.' },
  { id: 'C_proof_first',      slot: null, version: 1, start: null,      status: 'queued',   // first replacement
    hypothesis: 'Seeing your own Skillmap first (the readiness test\'s ten questions) creates a reason to follow the plan it builds.' },
  { id: 'D_interview_sprint', slot: 2, version: 1, start: '2026-12-10', status: 'live',
    hypothesis: 'A 14-day sprint for a named company (one tap, the date set for them) turns a vague visit into a daily count to keep.' },
];
// Retired arms stay in the file with status 'eliminated' | 'promoted' and an end date.
```

- **`version`** bumps on any behaviour change of an arm, and the read never
  pools across versions. That includes control: when a separate A/B ships
  its winner into today's product, `A_control` goes v1 → v2.
- **`round`** increments on every replacement.

### 2.3 What arm A keeps, and what B–D supersede

For arm A **and for every browser outside the tournament**, nothing changes.
`firstScreenChallenge` (shipped: #91 first), `companyDirectOpen`,
`runnableStarter` (once flipped) and `mobileRunBar` (if flipped) assign and
behave as today. The per-cell A/B cap (orchestrator decision 2026-11-24)
applies to everything outside the tournament.

For every challenger arm ("B–D" below means whichever challengers are live:
B and D at launch, C when it enters), the arm's first session
**supersedes** those four tests.
Their decision functions are short-circuited before assignment, so a
B–D person never writes `first_screen_assigned`,
`company_direct_assigned`, `runnable_starter_assigned` or
`mobile_run_bar_assigned`. Instead:

| Test | What a B–D person gets | How that test's read stays clean |
|---|---|---|
| `firstScreenChallenge` (shipped, read closed) | B: #91 as question 1, as today. C: the readiness check first. D: the sprint screen first. | Read closed (HIT 11-22); nothing to protect. |
| `companyDirectOpen` (live 50/50 since 11-23) | B and D: a `?company=` arrival opens the company's question 1 directly, using the `direct` arm's resolver `companyBannerNext()`. C: the readiness check first, weighted by that company (`?company=` → `companySkillWeights`). | Its read keeps only people with no `tournament_assigned` or arm A. **Gate:** its 120-per-arm verdict should be in before launch. If it is not, it accrues at a quarter of today's rate after 12-10. |
| `runnableStarter` (approved to flip after #402) | B–D: the starter text on every first-contact empty editor (`src/utils/runnable-starter.js`, the `starter` arm's behaviour, reused). | Its read keeps only people with no `tournament_assigned` or arm A. Its +15 pp interim read (~160 per arm, 12-17) lands mostly before launch. **Its +10 pp final (360 per arm, 01-07) cannot be reached on a quarter of the traffic.** Read it at the interim, and treat a HIT there as the ship decision (arm A then goes v2). |
| `mobileRunBar` (dark) | B–D phones: today's sticky bar (the `control` behaviour) until that test is read, then whatever ships. | Its read keeps only people with no `tournament_assigned` or arm A. |
| `freeQuotaHoldout` (live 11-27 → 12-24) | **Orthogonal, not superseded.** Every arm can be in `quota` or `holdout`. | Both reads report the 2×2. The holdout's 2027-01-01 read gives its primary twice: on all its enrolled people, and on its people outside arms B–D (enrolled before 12-10, or arm A), and says whether they differ. |
| Later-step tests (`runSubmitNudge`, `mobileOneLayer`, `quotaWallInline`, `modalPlansFirst`, `exitReasonAsk`, `day2Ask`) | Run in every arm as today, by their own hash. | Their reads add `tArm` as a split column. A test whose surface an arm removes reports that arm's cell as "not exposed" (B suppresses the post-solve "What's next" strip, for example). |

### 2.4 Launch gates (the flip PR checks all of them)

1. PRs 1, 2 (arm B) and 3 (arm D) merged, each with a headless walk of its
   arm on desktop and at 375 × 812. PR 4 (arm C) can land later, because C
   only enters as the first replacement. If B or D is late, launch with its
   slot running **arm A again** (`A_control_twin`). That is an A/A check of
   the whole pipeline, and it is worth the delay of one arm.
2. **Not before 2026-12-10.** The holdout's halfway money read (12-10)
   must be written first. If it triggers its money stop (holdout 0 trials
   while quota has ≥ 3), the tournament waits for the founder's call.
3. `companyDirectOpen` has a verdict, or the orchestrator accepts its
   slower read in a decision row.
4. The founder's go on the money strings in §7.
5. A production walk on a fresh profile. The first `/app/` open writes the
   record and one `tournament_assigned` row. A second profile lands in a
   different slot. A returning profile is not enrolled. On day 2, the slot
   split is within ± 5 points of 1/SLOTS (33% at launch).

---

## 3. Arm B — the single path ("Tek Yol")

### 3.1 The screens

**Screen B1 — arrival (no menu, no tabs, no choice).**

```
Desktop (≥ 1024)                                    Phone (375)
┌──────────────────────────────────────────────┐    ┌──────────────────────┐
│ SQL Quest                       Log in   💬  │    │ SQL Quest   Log in 💬│
│ Finding your level · question 1 of 4         │    │ Your level · 1 of 4  │
├────────────────────┬─────────────────────────┤    ├──────────────────────┤
│ Your First Query   │  editor: starter text,  │    │ Your First Query     │
│ task text          │  selected on focus      │    │ task text (collapsed │
│ table preview      │  [Run]  [Submit]        │    │ after 3 lines)       │
│                    │  output                 │    │ editor               │
└────────────────────┴─────────────────────────┘    │ [Run] [Submit] pinned│
                                                    └──────────────────────┘
```

- The header keeps the logo (inert, not a link out), Log in and the 💬
  feedback widget. Nothing else: no tab row, no lives or coins, no Pro
  button. `headerProButton` only shows at 3+ solves outside the first-run
  shell anyway. The Pro modal still opens wherever today's rules open it
  (§3.6).
- One line under the header: "Finding your level · question 1 of 4". It is
  body type, grey, never the accent.
- The challenge page is today's first-run shell
  (`showFirstRunSimpleShell`). It is extended: instead of ending at the
  first solve, it ends when the ladder ends. #91's "Welcome to SQL!" stays
  in the task text. The first-run banner is replaced by the line above.
- Editor: #91 keeps its prefill. Every other ladder question gets the
  runnable starter text (`-- Press Run to see the data first…` +
  `SELECT * FROM <table> LIMIT 5;`), selected when the editor gets focus
  while untouched (#402's behaviour).
- Phone: the same, with today's sticky Run/Submit bar (§2.3).

**Screen B2 — after a solve, during the ladder.**
- The verdict (today's), then **one** button: "Next question →". It opens
  the ladder's next question.
- No "What's next" strip, no intent modal, no company ask (both are
  questions; the founder's line is "seçenek tanımadan"). No achievement or
  streak layers until the ladder ends. They are held, not dropped (the
  `mobileOneLayer` pattern), and released at B4.
- `intent_ask_suppressed {by: 'single_path'}` is logged so the intent
  funnel can exclude arm B.

**Screen B3 — stuck, during the ladder.**
- Triggers: 3 wrong submits without a solve, or the stuck timer with no
  solve (6 min at rung 0, 10 min at rungs 1–2; about p75 of solvers, §1c).
- Then one grey line appears under the output: "This one's a step up — try
  a closer one →". Pressing it sets the question aside (it returns later in
  the plan) and opens the next question one rung down.
- It is one button, never a list. Hints and the inline tutor stay exactly
  as today.

**Screen B4 — the ladder ends (after question 4 is solved or set aside).**

```
┌──────────────────────────────────────────────────────────────┐
│ Your level: Intermediate                                      │
│ Your plan: SQL Fundamentals · 12 questions · 4/12 · Next →    │
└──────────────────────────────────────────────────────────────┘
```

- One card, in the same place as the line. No radar chart and no tier
  explanation. One sentence: "Set from how you solved the last four."
- "Next →" opens the plan's next question.
- The plan line gets a one-time 3-second highlight. The held layers are
  released here, one at a time, and at most one held sign-up / save prompt
  is asked (§3.5).
- **The tab row does not appear yet** (walk fix, 2026-11-26): it comes back
  after 3 plan steps (§3.5). Until then the plan line and "Next in your
  plan →" are the only navigation, and the plan's next step opens by itself
  when no question is open. No "Take tour" prompt in B's first session.

**Screen B5 — on the plan (every tab, every session).**
- The line "Your plan: <name> · N questions · k/N · Next →" sits where the
  interview status strip sits. It replaces that strip for arm B; the strip
  is dark anyway (`interviewFirst` is off). It shows on every tab.
- After any solve, the verdict's one button is "Next in your plan →". Arm A
  keeps today's strip.
- Phone: the line shortens to "Plan · 4/12 · Next →".

**Screen B6 — the wall.**
- **Quota arm.** At the 10th solve, the quota wall opens unchanged: same
  trigger, same modal, same plans, same prices, same "keep practising free"
  roads. One line changes, in the slot `quotaWallCompany` already uses:
  **"10 of 12 done — the rest of your plan is Pro."** (§7, founder's go).
- **Holdout arm, or when the plan's free steps run out first.** No wall
  exists there, so the plan line ends in a card: "k of N done — the rest of
  your plan is Pro." It has one button, "See Pro", which opens today's modal
  under the new reason `plan_end` (§7), and the Practice tab is already
  visible.

### 3.2 The ladder (questions 1–4)

Three rungs. Each rung is an ordered list run through the challenge-order
helpers: `buildCurriculumOrder(LADDER_RUNGS)` gives a dedicated order map,
and `pickNextChallengeWith(ladderOrder, challenges, c => rung.has(c.id) &&
!solved.has(c.id) && !setAside.has(c.id) && !isContentLocked('challenge',
c))` picks within a rung. **Never raw order** (fragile area 4).

| Rung | What it tests | Ids, in pick order | Verified on the live bank (2026-11-26) |
|---|---|---|---|
| 0 | Querying basics (SELECT, WHERE, ORDER BY) | **91**, 93, 95, 97, 92 | all Easy, core bank, not Pro-only, not sector |
| 1 | Joins and grouping, entry | **100**, 105, 176, 107, 106 | 100 / 105 / 176 Easy; 107 / 106 Medium; none Pro-only |
| 2 | Window functions and CTEs | **168**, 171, 179, 163, 112 | 168 / 179 Easy; 171 / 163 / 112 Medium; none Pro-only |

The checks were run with `buildCurriculumOrder` + `isFreePreview` over
`challenges.js` + `sector-challenges.js` (+ Debug), `goals.js` and
`roadmap-stages.js`. #98 is left out of rung 1: its p50 is 11 minutes, and
7 of 71 solvers were clean inside 5 minutes (§1c). It is a COUNT trap, not a
level signal.

**Outcome of one question:**
- `fast`: solved, ≤ 1 wrong submit, no hint, no solution reveal, within
  T(rung). T0 = 150 s (#91 p75 132 s, #93 p75 200 s). T1 = 300 s (#100 p50
  158 s; top third of #105's solvers). T2 = 420 s (#168 / #179 / #171 p75
  410–440 s).
- `solved`: solved, but not fast.
- `stuck`: set aside through B3.

**Transitions:**
- `fast` → up one rung (2 is the top; at rung 2 the next item is the next
  Medium in its list).
- `solved` → same rung, next item.
- `stuck` → down one rung (0 is the floor).

**Question 1** is #91 for every arrival without a content link. A deep
link changes question 1 only (§3.4).

**Level after question 4** (the four tiers of `src/utils/placement.js`;
pure function `levelForLadder(outcomes)` added there):

| Tier (`levelId`) | Rule | Typical sequence |
|---|---|---|
| Interview-ready (`advanced`) | a `fast` at rung 2 **and** a second rung-2 question solved with ≤ 1 wrong and no hint | 91 fast → 100 fast → 168 fast → 171 clean |
| Advanced (`working`) | any rung-2 solve, or two rung-1 solves with one `fast` | 91 fast → 100 fast → 168 stuck → 100-rung solve |
| Intermediate (`basics`) | any rung-1 solve, or two `fast` at rung 0 | 91 fast → 100 solved → 105 stuck → 93 fast |
| Foundations (`brand-new`) | anything else | 91 solved → 93 solved → 95 stuck → 97 solved |

- **The 08-14 rule holds.** Interview-ready needs two produced window/CTE
  queries, one of them a Medium. That is stronger evidence than round 2's
  recognition questions (3 of 4).
- `placement_completed {source: 'ladder', levelId, tier, outcomes:
  [{q, rung, challengeId, outcome, secs, wrongs}]}`. The `placement_mix`
  read splits on `source`.
- `'first_run_ladder'` joins `FIRST_RUN_PLACEMENT_SOURCES`, so
  `readFirstRunPlacement` and `coachPlacementFor` honour it. The Coach never
  asks again, and the tier's seed floors (`COACH_SEED_FLOORS`) reach the
  plan's `skipIf` and nothing else. This is the `coachTrustQuizPlacement`
  mechanism, applied inside arm B only, with that flag unchanged.

### 3.3 The plan (the roadmap)

**Goal, inferred, never asked:**

| Signal (first match wins) | Goal |
|---|---|
| any interview signal: a `?company=` arrival; `?goal=interview`; `?src=readiness`; an `arrivalSrc` from a company page, `/sql-interview-*`, the interview hub, the readiness test or a trap page; a stored `prepTarget` or readiness record; intent `interview` | `interview-prep` (with `withEarlyWall` as `resolveCoachGoal` applies it today) |
| tier `brand-new` or `basics` | `fundamentals` |
| tier `working` or `advanced` | `analyst-day-one` |

`goalSource: 'single_path'` goes on `coachState.source`. The Coach reads
already split on `goalSource`. Arm-B goals are excluded from the
goal-picker reads.

**Plan composition** (`buildSinglePathPlan`, a pure helper in
`src/utils/single-path.js`; ordered challenge ids, recomputed after every
solve):
1. The ladder's four questions, solved or set aside.
2. Company arrivals only: the company's set in `companySetOrder` order.
   That is the full signed set for Capital One (25) and Revolut (12), and a
   tagged set capped at 12 in curriculum order.
3. The goal's **challenge steps**, walked as `computeNextStep` walks them:
   `stepsCompleted`, `isStepComplete`, and `skipIf` against the radar plus
   the ladder's seed floors. Ids already in 1–2 are dropped. Lessons,
   drills, mastery and retrieval checks are **not** plan steps in v1. They
   stay on the Coach tab, which opens after the ladder. The plan is
   "questions", which is what the line says.
4. **Fill.** While the plan's open-to-this-person steps number fewer than
   `FREE_SOLVE_QUOTA` (10), append free challenges on the goal's
   `skillsTargeted` at the tier's difficulty (Easy for Foundations /
   Intermediate, Medium otherwise). The order is
   `pickNextChallengeWith(curriculumOrder, …)` with `challengeMatchesSkill`.
   This keeps the quota wall the first wall in every case, as it is today.
   Without the fill, an Interview-ready person on interview-prep would run
   out of free steps at solve 7 (see below).

**N and the steps that are Pro.** N is the count of steps 1–4.
- A step that is locked for this person (a Hard non-preview, or
  company-set-gated under `companySetGate`) stays in N and is shown with a
  "Pro" label on the plan sheet.
- `Next →` passes over it, the way `coachState.stepsSkipped` does, without
  counting it as done.
- `Next →` never opens a locked step, so the only walls are today's (quota,
  modal).

**Plan sizes by tier and goal**, from the live registry with the tier's
seed floors, before the fill and excluding the ladder:

| Tier | Goal | Goal challenge steps after skipIf | Free | Pro |
|---|---|---|---|---|
| Foundations / Intermediate | fundamentals | 12 (ladder overlap leaves ~8) | all | 0 |
| Advanced / Interview-ready | analyst-day-one | 15 | 10 (6 Medium + 4 Hard previews) | 5 |
| Foundations / Intermediate | interview-prep | 23 | 8 | 15 |
| Advanced | interview-prep | 21 | 6 | 15 |
| Interview-ready | interview-prep | 18 | 3 | 15 |

So the line reads roughly "12 questions" for a beginner and "22–27
questions" for an interview person. The wall says "10 of 24 done — the rest
of your plan is Pro" — the founder's example almost word for word, and true
under the quota.

### 3.4 Deep links in arm B (the resolvers stay as they are)

Fragile area 5 holds for every case: a resolver starts guest mode, returns,
and opens on the next run. The ladder state is read after the session
loads, never before.

| Arrival | Question 1 | Ladder after it |
|---|---|---|
| none (`/app/`, homepage CTAs) | #91 | from rung 0 |
| `?challenge=ID` (topic, question and trap pages; Capital One hero) | ID itself, after today's `deeplink_preview_swap` for a locked Hard | starts at the rung ID belongs to. Canonical skill: Querying Basics / NULL / String / Date → 0; Joins / Aggregation / Conditional → 1; Window / Subqueries & CTEs or any Hard preview → 2. T(rung) applies. |
| `?company=X` | `companyBannerNext()` (the `direct` resolver; same locks, quota and set gate) | from that question's rung; goal interview-prep; company set in the plan (3.3 step 2) |
| `?sector=` | the sector's first free challenge in curriculum order | from its rung; goal by tier |
| `?goal=interview`, `?src=readiness&company=` | #91 (or the link's `challenge=`) | goal interview-prep; the readiness `company` sets `prepTarget.company` as today |
| `?interview=`, `?profile=` | not enrolled (§2.1) | — |
| `?pro=1&plan=…` (homepage pricing cards) | the modal opens as today, reason `pricing_link`; on close, B1 | unchanged money surface |

### 3.5 What hides, and until when

*Amended 2026-11-26 after the orchestrator's walk of #417: the sign-up /
save prompt interrupted the ladder at the 3rd solve, the "Take tour" prompt
appeared at the ladder's end, and the tab row and the guest banner all came
back with the plan, so the single focus was lost the moment the plan
appeared. The pure rule is `pathUiFlags` / `pathTabsOpen` in
src/utils/single-path.js; `tests/single-path.test.js` pins it.*

- **Hidden during the ladder:**
  - the tab row (Coach, Practice, Interview Prep, Leaderboard, Profile,
    Speed Mode, Drills);
  - the post-solve "What's next" strip;
  - the intent modal;
  - the company ask;
  - the achievement / level-up / streak / share layers (held, not
    dropped);
  - the quota counter. Today's first-run shell already hides it before the
    first solve; arm B keeps it hidden until the ladder ends, then it shows
    where it does today. That is an exposure change on a money line, so it
    is listed in §7;
  - every sign-up / save prompt (the guest ladder's `signupAskAtThree` ask,
    the soft email capture, the tutor's guest-limit prompt). They are held,
    not dropped: when the ladder ends, **at most one** is asked — today's
    guest ladder on the real solve total, else the one the tutor held.
- **Hidden after the ladder, until 3 plan steps are done** (`PLAN_FOCUS_STEPS`):
  - the tab row;
  - the "Playing as Guest / Save Progress" banner;
  - the rest of the first-run shell's hiding: the header's stats (lives,
    coins, level bar — and so the quota counter), the challenge page's
    "Back to Challenges / Previous / Next Question" row. The plan line and
    "Next in your plan →" are the only way on.
  They come back, once, at the first of: the 3rd plan step done after the
  ladder (`trigger: plan_steps`), the plan line's "All steps"
  (`all_steps`), or no free plan step left to open (`plan_end`, so the
  Practice tab is visible beside the plan-end card).
  `tournament_tabs_revealed` fires then, not at the ladder's end.
- **One layer at a time, the whole first session** (walk fix round 2,
  2026-11-26, arms B and D; `pathLayerDecide` in src/utils/single-path.js).
  The re-walk found the 6-solve Pro modal, an achievement toast with its
  share card and the "What held you back?" survey open at once at B's 7th
  solve, and the archetype card beside an achievement toast from the first
  plan step on. Now one queue:
  - priority: the Pro / `plan_end` ask (and a modal the person opened
    themselves) > the save / sign-up ask > achievement (level-up, milestone
    toast, share bar, streak card) > the archetype (Skillmap) card > the
    survey;
  - at most one per solve: the first granted layer shows; everything else
    that solve raises is dropped (cleared, `tournament_layer_dropped`), not
    held for later. A toast never sits on a modal. A new challenge open is a
    fresh slot;
  - the solve's slot grants nothing but the Pro ask for 2.4 s, because the
    asks land 1.5–1.8 s after the solve; the Pro ask is never dropped;
  - the exit survey never asks in the first session;
  - on B's ladder the achievement / archetype layers are held (§3.1 B2) and
    compete with the ladder-end ask: one shows, the rest are dropped;
  - the first session ends at the first hour away (the gap
    `second_session_7d` and the feedback prompts use), and the queue with
    it. After that, today's rules.
  - **one Pro ask in any 3 consecutive solves** (orchestrator decision
    2026-11-27, `pathProAskAllowed`): the automatic asks a solve raises (the
    6-solve milestone, "set complete", the streak ask) are spaced; a skipped
    one waits for a later session (its once-key stays unwritten,
    `tournament_pro_ask_spaced`). The quota wall, `plan_end` and every Pro
    modal the person opens are never spaced. The re-walk had met the 6-solve
    ask and "set complete" on solves 6 and 7.
- **One plan on screen** (walk fix round 2): once the plan line shows, the
  Coach's own "Your {company} plan" card is hidden (`hideCoachPlan`, as D3
  does for D). The re-walk found "Your Capital One plan" beside B's plan line
  on the Learning Path tab once the tabs were back.
- **One goal on screen** (orchestrator decision 2026-11-27): once the plan
  shows, B also hides "Pick a goal to get started" and Focus Tracks on the
  Learning Path tab (`hideGoalPicker`, the switch D uses).
- **Never in B's first session:** the "Take tour — 60 seconds" prompt (and,
  as before, the onboarding tour). The tour stays in the profile menu.
- **Shown at any time:**
  - the header's Log in (the person's own click is not a prompt);
  - 💬 feedback;
  - hints, the inline tutor, and the dialect notes;
  - every Pro modal today's rules open (milestone tier 6, the quota wall,
    `?pro=1`).
- **The threshold for the questions and the layers is the end of the
  ladder (4 questions solved or set aside),** not a solve count; the tab
  row waits 3 plan steps more. Why:
  - it is the moment the level and the plan exist, so the tabs can open
    under a line that says what to do;
  - it cannot strand a beginner, because B3's step-down always moves the
    ladder forward;
  - the alternative thresholds lose on the evidence. "3 solves" would open
    the menu before the level is set. "6 solves" (the metric itself) would
    keep a stuck beginner from the lessons for a long time: 47% of new
    people solve nothing in 24 h (§1a).
- **Ladder duration.** Medians from §1c put the ladder at ~4–15 minutes for
  a solver, 1–2 sessions for most.
- After the ladder, the plan line stays on every tab and in every session
  until the plan is complete or the person is Pro and picks another Coach
  goal.

### 3.6 Code it reuses, replaces, adds

- **Reuses:**
  - `showFirstRunSimpleShell` (extended, not forked);
  - `firstScreenDecision` (short-circuited for B);
  - `companyBannerNext` / `companyDirectDecision`'s `direct` branch;
  - `runnable-starter.js`;
  - `challenge-order.js` (`buildCurriculumOrder`, `pickNextChallengeWith`,
    `isFreePreview`);
  - `placement.js` (`PLACEMENT_TIERS`, `COACH_SEED_FLOORS`,
    `FIRST_RUN_PLACEMENT_SOURCES`);
  - `coach.js` (`computeNextStep`, `isStepComplete`, `matchesSkipIf`,
    `applySeedFloors`);
  - `goals.js`;
  - `free-tier-boundary.js` (`withEarlyWall`, `quotaGate`, `companySetGate`,
    `FREE_SOLVE_QUOTA`, untouched);
  - the quota wall and its `quotaWallCompany` line slot;
  - `mobile-one-layer.js`'s hold-and-release.
- **Supersedes, for arm B only:**
  - the first-run placement quiz and `adaptivePlacement` round 2 (never
    shown);
  - `onboardingIntake` and `intakeAfterFirstSolve` (never shown; both are
    dark anyway);
  - the intent modal at the first solve;
  - the post-solve "What's next" strip;
  - `FIRST_RUN_LEVELS` / `FIRST_RUN_PATHS` as the route after the first
    solve. The ladder replaces them; they stay for arm A.
- **Adds:**
  - `src/utils/single-path.js` (pure: the ladder state machine,
    `levelForLadder` is re-exported from placement.js, `buildSinglePathPlan`,
    the plan-line model);
  - i18n strings (EN + TR);
  - events (§3.7).
- **Hooks.** Every new `useState` / `useEffect` / `useMemo` sits **above**
  `if (showAuth)` and `if (!dbReady) return` (fragile area 1). A source
  guard in `tests/single-path.test.js` pins it, the way
  `interview-status.test.js` does.
- **State.** `sqlquest_single_path_v1 = {ladder: [...], rung, levelId,
  goalId, goalSource, planIds, setAside}` is mirrored to
  `userData.singlePath` so it rides the autosave. `progress-merge.js` takes
  the account's value when both exist and the guest's when only it does
  (union of `setAside`).

### 3.7 Events (arm B)

| Event | When | Metadata |
|---|---|---|
| `ladder_question_started` | a ladder question opens | `q, rung, challengeId, door` |
| `ladder_question_resolved` | solved or set aside | `q, rung, challengeId, outcome (fast/solved/stuck), secs, wrongs, hint` |
| `path_stepdown_shown` / `path_stepdown_clicked` | B3 | `q, rung, trigger (wrongs/timer)` |
| `placement_completed` | the ladder ends | `source: 'ladder', levelId, tier, outcomes` |
| `path_plan_built` | B4, and on any recompute that changes N | `goalId, goalSource, n, freeN, proN, company, fillN` |
| `path_tabs_revealed` | the 3rd plan step after the ladder, "All steps", or no free step left (§3.5) | `trigger (plan_steps/all_steps/plan_end), secsSinceAssigned, solves` |
| `path_next_clicked` | any "Next →" | `k, n, challengeId, from (line/verdict)` |
| `path_plan_end_shown` | B6 (holdout or free steps ran out) | `k, n` |

---

## 4. Arms D and C (D is the launch challenger beside B; C is queued)

Each arm gets its own PR, its own walk, and the same rules: no price change,
no quota change, money strings listed in §7.

**Why D launches and C waits.** With three slots there is room for two
challengers.
- **B** is the founder's direction.
- **D** acts on the segment that pays: interview-target people are 15% of
  openers and give 7 of 12 payers (#409).
- **C** repeats a mechanism that has already lost once: quiz first, 15.5%
  vs 37.2% on `first_solve_10m`. It is built (PR 4) and takes the first
  freed slot, unless the orchestrator prefers H1 (C'), its "after the first
  solve" variant.

### Arm C — proof first (`C_proof_first`, queued)

**Mechanism.** Seeing your own Skillmap first gives you a reason to follow
the plan built from it.

**Screens.**
1. Arrival: the ten questions of `src/data/readiness-questions.js`, scored
   by `scoreReadiness` / `summarizeScores` (the module the public test and
   the dark `goalMeasure` already share). A `?company=` arrival is weighted
   by `companySkillWeights`. No tabs.
2. Result: the nine-axis Skillmap (the existing SVG) and the weakest skill.
   The level comes from `levelForReadiness` and the floors from
   `seedFloorsFromReadiness`.
3. "Your plan: N questions · Next →". It is arm B's plan builder (§3.3)
   with the readiness level in place of the ladder. Tabs open with the plan.
4. From then on, the plan line exactly as in arm B (B5, B6).

**Reuses.** The `goalMeasure` machinery (events `goal_measure_*` with
`source: 'tournament_c'`, which `goal_measure_funnel` already defines), and
arm B's plan builder and line. So C ships after B.

**Its risk is known.** Quiz-first lost 15.5% vs 37.2% on
`first_solve_10m`, and 27% of public-test starters finish. The harm stop
(§5.5) is what caps it. If C goes, its first replacement is H1 in the
backlog: the same proof, **after** the first solve.

### Arm D — interview sprint (`D_interview_sprint`)

**Mechanism.** A plan for a named company with a fixed length turns a visit
into a daily count to keep. Interview-target people are the payers: 2.0
trial-or-paid per 100 against 0.33 for everyone else, and 7 of the 12
payers (#409).

**It never depends on a date being entered.** `prep_target_set` has 0 rows
in 90 days (#409), so a design that waits for a date reaches nobody. The
sprint length is set for the person.

**Screens.**
1. Arrival: one screen, one tap: "Which company are you preparing for?" It
   shows a search over `INTAKE_COMPANIES` (`matchCompanies` from
   company-ask.js) and a "Not sure yet" button. A `?company=` arrival skips
   this screen.
2. The sprint, with no second question. It is always **14 days from
   today**. The length can be changed later on the plan sheet; it is never
   asked.
   - `prepTarget.company` is written through the existing writer.
   - **The sprint end is NOT written to `prepTarget.date`.** It lives in its
     own field, `userData.sprint = {company, startedAt, endsAt}`. Two
     reasons:
     - `deadlineOffer` (on) would make the milestone modal lead with "N
       days to your interview", which is a money surface;
     - the `interview-outcome-note` sender would later ask "How did it go?"
       about an interview the person never named.
     A date the person types themselves still goes to `prepTarget.date`, as
     today.
   - The plan is `planToDate(findPlanTarget(company), sprint.endsAt)` from
     interview-prep.js (archetype or tagged), plus arm B's fill rule (§3.3
     step 4), so the first wall is still the quota.
   - "Not sure yet" gets interview-prep's free steps on the same 14 days.
3. The line: "Day 1 of 14 · Capital One sprint · 3 today · Next →". The
   daily count comes from `dailyQuota` in spaced-retrieval.js, capped by
   `MAX_PLAN_ITEMS_PER_DAY` (3). The first question opens directly, with
   the starter text.
4. Tabs open after the first day's count is done or at the first solve of
   day 2, whichever comes first.
5. **Walk fixes (2026-11-26, the orchestrator's walk of #418):**
   - *The level.* With a readiness band, the plan uses it. Without one the
     level is **assumed** (the roadmap's interview default, Intermediate)
     and the why-line says so: "We assumed Intermediate; your first two
     answers will adjust it." The first two plan steps solved are read with
     the ladder's thresholds (`ladderOutcome` at each question's rung,
     `levelForLadder`); at the second the plan is re-laid from that level,
     those two steps leading it (`tournament_sprint_level`, then
     `tournament_plan_shown {recompute: true}`). Chosen over a 2-question
     mini-ladder in front of the sprint: a company link's question must be
     step 1 (next bullet), a rung-0 question would be exactly the "Counting
     Rows" that the walk flagged for a Capital One arrival, and D's
     mechanism is two taps and the plan, with no third screen.
   - *A company link's question is step 1.* The question the link opens
     (`companyBannerNext()`) leads the plan (moved to the head if the
     roadmap already held it), so the header, the open question and the
     plan agree.
   - *One plan.* While the sprint line shows, the Coach's own "Your
     {Company} plan" card is hidden (`pathUi.hideCoachPlan`).
   - From B's fixes: the guest banner waits with the tabs, and no "Take
     tour" prompt.
6. **Walk fixes, round 2 (2026-11-26, the re-walk of #418):**
   - *N stays put.* The level re-plan grew the plan (header `2/14` →
     `2/16`). The re-laid plan is now fitted to the N the person was shown
     (`fitPlanToLength`): steps come off its tail (never a lead step, a
     solved one or the mock), or the old plan's unsolved steps fill it before
     the part past the wall. Only if N truly cannot be kept does it change,
     and the why-line says "Plan updated for your level: N steps."
   - *One goal.* With a sprint set, the Learning Path tab hides "Pick a goal
     to get started" and Focus Tracks (`pathUi.hideGoalPicker`): the sprint
     is the goal.
   - *One layer at a time* for the whole first session, as in B (§3.5).

**Reuses.**
- `interview-prep.js` (`findPlanTarget`, `planToDate`, `daysUntil`);
- `interview-first.js` (`interviewStatusModel` for the line);
- `company-ask.js`;
- `spaced-retrieval.js`;
- the `interview_outcome` ask after the date (unchanged, unscheduled).

**Events.** `sprint_screen_shown`, `sprint_set {company|undecided, days,
planKind}`, then arm B's `path_*` events with `arm: 'D'`.

---

## 5. Metric, elimination and promotion (written before the data)

### 5.1 Decision metric — `first_session_tournament`

- **What it is.** The share of assigned people with **6+ distinct
  challenges solved within 7 days** of `tournament_assigned`, by arm (and
  arm version).
- **Why this metric.** 10 of the 12 buyers in 90 days bought at ≥ 6
  solves, a median of 1.3 days after their first open (#409). The decision
  metric sits where the purchase decision is made, on a step with ~100x the
  volume of payments.
- **Baseline.** 11.8% (§1a; desktop 13.0%, phone 0%).
- **Counting.** Mock answers do not count: challenges only, which is the
  baseline's definition.

### 5.2 Secondary (reported at every read, never decisive)

- **reached the 10-solve quota wall within 7 days.** Baseline 5.2%. Read
  inside `fqArm != 'holdout'` only, because the holdout arm has no wall.
- **plan click within 7 days** (`pro_plan_clicked` or
  `pro_checkout_clicked`). Baseline 1.5%.
- **trial and payment within 30 days**, from the webhook rows by username.
  Baseline 4 trials and 3 payments in 915 people (0.77% combined).
  - #409's 90-day rate is 0.57% (12 of 2,099). At ~700 human openers a
    month, that is **~4 trial-or-paid a month in total: ~1.3 per arm with
    three arms, ~1 with four**, and fewer than half of those are payments.
  - Telling 0.77% from 1.54% (a doubling) at 80% power needs ~3,000 people
    per arm, which is **~85 weeks** at today's volume. Subscriptions cannot
    pick the winner at this traffic. The founder's real question ("hangisi
    daha çok subscription sağlıyor") is answered through the step that has
    volume. Every read prints the money counts beside it, so a challenger
    that sells nothing is visible.

### 5.3 Guardrails

- **`first_solve_10m` from assignment.** Baseline 23.3%.
- **`second_session_7d`** (any non-landing event on a later UTC day within
  7 days). Baseline 16.0%.

### 5.4 The weekly read

- **When and who.** Fridays, by B2, with `scripts/tournament-read.sql`
  (PR 1).
- **Eligibility.** A read counts a person only when 7 days have elapsed
  since assignment. Each arm's numbers are taken within its current
  `version`.
- **Posteriors.** Beta(1 + successes, 1 + failures) per arm, uniform
  prior. Monte-Carlo with 20,000 draws, in the SQL file's companion script.
- **Every read is split by segment and by stratum** (§2.1a; the segment is
  the stratum's first half — interview-target or not, fixed by the profile
  before the person does anything). Query 4 of the read is the decision
  table per stratum; `tournament-posteriors.mjs --strata` gives P(best in
  stratum), the routing verdict and the post-stratified pool.
  - The decision uses the pooled arm. The segment split is reported beside
    it and never decides on its own: at ~15%, it is ~8 people per arm a
    week.
  - **Escalation rule.** If an arm wins the pool but trails control by ≥ 10
    points inside interview-target at ≥ 60 per arm, its promotion waits for
    the founder. That segment carries 7 of 12 payers.

### 5.5 Rules

1. **Gate.** Nothing is decided until **every challenger has ≥ 150
   eligible people**.
2. **Elimination.**
   - Eliminate the challenger with **P(worst among challengers) ≥ 0.80**.
   - If none reaches that within **6 weeks of its start**, eliminate the
     challenger with the lowest posterior mean at that read.
   - Control is never eliminated.
3. **Promotion.**
   - A challenger with **P(better than control) ≥ 0.95** is promoted: it
     becomes the new control (`A_control` vN+1 runs its behaviour), and the
     old control's behaviour is retired.
   - The founder's go is needed only if the challenger touches money copy.
     All current challengers do (§7), so in practice it is needed.
   - **Amendment proposed by this plan:** the 0.95 must hold on **two
     consecutive Friday reads**. Simulation (below) shows a single look
     promotes a challenger that is no better than control about 11% of the
     time with two challengers and 10–16% with three, because each
     challenger gets its own one-sided 5%. Two
     looks bring that down sharply. The orchestrator accepts or drops this
     in its decision row.
4. **Harm stop, any week.** A challenger whose `first_solve_10m` trails
   control by ≥ 10 points at ≥ 100 eligible per arm is stopped that day.
   That counts as its elimination, and its slot runs control until the
   replacement ships.
5. **Replacement.** The next week, the backlog's top-ranked hypothesis
   (§6) takes the free slot, `round` + 1. It must ship as its own PR with
   its own walk. Until it does, the slot runs `A_control_twin`.
6. **Money stop.** If a challenger shows 0 trial-or-paid while control
   shows ≥ 3 in the same weeks, report to the founder the same day. This
   does not eliminate by itself.
7. **Routing a stratum (added 2026-11-26, §2.1a).** A stratum is routed to
   an arm only when that arm has **P(best in the stratum) ≥ 0.95 on two
   consecutive Friday reads with ≥ 100 eligible per arm in that stratum**.
   Routing is a decision row that adds the stratum to
   `TOURNAMENT_STRATUM_WEIGHTS` with the winner at ≤ 80%; every other
   active arm keeps a share, so **≥ 20% always explores** (a table that
   breaks this is ignored by the app and fails the test). The stratum's
   `weightsVersion` bumps and its per-arm counts restart. From then on the
   pooled rules 2–3 read the **post-stratified** pool (each stratum
   weighted by its share of eligible people), not the plain pool, because
   the arm mix now differs by stratum. A routed stratum's winner that is
   later eliminated from the pool, or that loses P(best) ≥ 0.95 on two
   consecutive reads, goes back to equal weights by the same kind of row.

**What these rules can see** (a 40-line Beta/binomial Monte-Carlo, 400 runs
per row, rates per read; PR 1 commits it as `scripts/tournament-sim.mjs`).

**Three arms** (control + 2 challengers, the launch shape):

| Eligible per arm | Truth | Elimination fires | …on the true worst | Promotion (0.95, one look) |
|---|---|---|---|---|
| 150 | all at 11.8% | 38% | — (random) | false 11% |
| 150 | one challenger at 7% | 72% | 71% | false 4% |
| 150 | one challenger at 8.5% | 60% | 54% | — |
| 150 | B at 18% | 75% (the other goes) | 75% | true 44%, false 9% |
| 150 | B at 20% | 87% | 87% | true 62% |
| 250 | one challenger at 7% | 86% | 85% | — |
| 250 | B at 20% | 97% | 97% | true 78% |

**Four arms** (control + 3 challengers), for comparison:

| Eligible per arm | Truth | Elimination fires | …on the true worst | Promotion (0.95, one look) |
|---|---|---|---|---|
| 150 | all at 11.8% | 20% | 6% (random) | false 14% |
| 150 | one challenger at 7% | 54% | 53% | — |
| 150 | one challenger at 8.5% | 36% | 33% | — |
| 150 | B at 18% | — | — | true 42%, false 8% |
| 150 | B at 20% | — | — | true 63% |
| 250 | B at 20% | — | — | true 81% |
| 350 | one challenger at 7% | 84% | 83% | — |

Plainly: with three arms, the 0.80 rule catches a challenger that cuts
activation by ~40% about 7 times in 10 at the first read. With four arms it
is about 5 in 10, and the first read comes a week later. Smaller differences are decided by the 6-week fallback,
which at equal arms eliminates a coin-flip loser. That is the accepted
price of a tournament that never stops. A frequentist reference for B vs A
at +6 points (11.8% → 17.8%), 80% power, two-sided, needs ~545 per arm,
about 15 weeks.

### 5.6 Timing at the real volume

| | |
|---|---|
| | **Three arms (recommended)** | Four arms |
|---|---|---|
| new human openers | ~161 a week, ~23 a day (#409) | same |
| per arm | **~54 a week (~8 a day)** | ~40 a week (~6 a day) |
| 150 eligible per arm | 2.8 weeks of enrolment + 7 days | 3.7 weeks + 7 days |
| launch | Thu 2026-12-10 at the earliest | same |
| first read with every arm at 150 | **Fri 2027-01-08**. A late-December dip could make it 01-15. | Fri 2027-01-15 (likely 01-22) |
| 6-week fallback | 01-21, so **the first elimination falls on Fri 01-22 at the latest**, and most likely on 01-08 or 01-15 | same latest date, less likely earlier |
| the cadence after that | ~4 weeks per replacement (a new arm needs its own 150). **By the investor review (02-23), expect 2 eliminations.** | ~5 weeks, 1–2 eliminations |
| money per arm | ~1.3 trial-or-paid a month | ~1 a month |
| interview-target people per arm | ~8 a week | ~6 a week |

---

## 6. The hypothesis backlog (the replacements)

Ranked. The top one takes the first free slot. Each has a mechanism in one
sentence and evidence from our own reads.

| # | Hypothesis | Mechanism | Evidence |
|---|---|---|---|
| H0 | **Proof first** (arm C, §4; built in PR 4) | The readiness test's ten questions and the Skillmap at the door. | See §4. It is queued first because it is the founder's third named option and is already built. The orchestrator may put H1 ahead of it. |
| H1 | **Proof after the first solve** (C') | One runnable question first, then the ten readiness questions and the Skillmap: the proof without the cost at the door. | First-screen HIT (challenge first 37.2% vs quiz 15.5%); the readiness test finishes 27% of starters cold (§1d). C's replacement if C goes. |
| H2 | **Debug first** | Question 1 is an AI-written wrong query to fix (Debug set, ids 331-342, live). Fixing is cheaper than writing from blank, and it is the job AI-era analysts do. | Empty editor 16% run inside a minute vs prefilled 65% (A05 §4); Debug set live since 11-23 (`debug_solve_through`). |
| H3 | **"I already write SQL" exit** | One link on question 1 jumps a confident person straight to rung 1. Choice once, then the path. | 24 of 81 desktop #91 non-runners left for another challenge after ~3 min; 11 were back on the marketing site in ~10 s (A05 §2, rec. 2). |
| H4 | **Mock first for interview doors** | Company and interview arrivals start in the free mock (`sql-fundamentals-free`): a timed, scored sitting is the thing they came for. | Interview-shaped doors (company, interview, readiness pages) were 13–32% of new humans a week from 10-05; mocks were reached by 3 people a month; payers 3 / 3 interview-shaped. |
| H5 | **Tutor-led first question** | The inline tutor opens beside question 1 with a Socratic first line, so help is seen before someone gives up. | 9 of 275 non-runners opened a hint and 1 the tutor (A05 §2): help exists but is not seen. Cost: billed tutor calls under the `#nudge` budget. Needs the tutor budget check. |
| H6 | **A daily target at the first solve** | One tap, "how many a day?" (1 / 3 / 5), sets a count that the line, the streak reminder and the weekly digest repeat. | `second_session_7d` 16% (§1a), and the 11-25 read says it fell for real; `streak-reminder` already sends by local time. |

---

## 7. Strings that need the founder's go (money copy)

None of these changes a price, a plan, the quota number or a gate. They
change words on or next to the paywall, or which money surface a person
sees. That is the founder's to approve (CLAUDE.md, "Money flags … need the
founder's explicit go").

| Arm | Where | EN | TR |
|---|---|---|---|
| B, C | quota wall, the `quotaWallCompany` line slot | "{k} of {N} done — the rest of your plan is Pro." | "{N} sorunun {k} tanesi tamam — planının geri kalanı Pro'da." |
| B, C | plan-end card (holdout arm, or free steps ran out) | "{k} of {N} done — the rest of your plan is Pro." + button "See Pro" | same + "Pro'yu gör" |
| B, C | new modal reason `plan_end` | the modal unchanged; a new `reason` value on `pro_modal_shown` | — |
| B, C, D | plan sheet | a "Pro" label on locked steps | "Pro" |
| B | quota counter hidden until the ladder ends and 3 plan steps after it (exposure change, §3.5; ~7 solves, under the quota of 10) | — | — |
| D | quota wall line slot | "Day {d} of {D} — the rest of your {Company} sprint is Pro." | "{D} günün {d}. günü — {Company} sprint'inin geri kalanı Pro'da." |
| D | sprint sheet | "Pro" on locked days' items | "Pro" |

Unchanged in every arm:
- prices and plans;
- `FREE_SOLVE_QUOTA` = 10;
- the Hard lock and the company-set gate;
- the modal's own copy and its order;
- the trial terms;
- the static pages' "10 free challenge solves" (bound by
  `tests/site-counts.test.js`).

---

## 8. Build: four PRs, in order (registry, B, D, C)

Every PR leaves the flag dark, proves each new test by a deliberate break,
passes `npm run build` + `test:run` + `lint`, has a headless walk at 1366
and 375 with `?ff_features_firstSessionTournament=true`, and passes the
hermetic smoke run.

1. **Registry, assignment, events, flag, read SQL.**
   - Files: `src/data/tournament-arms.js`, `src/utils/tournament.js`
     (enrolment reusing #384's `PRE_APP_KEYS` detection, the slot hash, the
     record), the `tArm` / `tArmV` stamp in `writeProEvent`, and
     `tournament_assigned`.
   - The superseding short-circuits for `firstScreenDecision`,
     `companyDirectDecision`, the runnable-starter decision and
     `mobileRunBar`'s decision, keyed on `arm !== 'A_control'`.
   - Every slot runs arm A's behaviour until its arm's PR lands. That makes
     an A/A launch possible on day one.
   - `scripts/tournament-read.sql`: the decision metric, the secondaries
     and the guardrails per arm and version, the 2×2 with `fqArm`, and the
     human filter of `scorecard-weekly.sql`. It ships here, before any arm
     changes behaviour (rule 6b). The metric definition is already in
     `metrics.md` from this docs PR.
   - Depends on #384. #402 (`runnableStarter`) is already merged.
2. **Arm B (single path)** — `src/utils/single-path.js` (ladder, level,
   plan, line), `levelForLadder` in placement.js, the shell extension, B1–B6,
   the events, and i18n. Tests:
   - the ladder ids exist, are not Pro-only and are not sector, run over the
     live bank;
   - every pick goes through `pickNextChallengeWith` (source guard against
     raw `.find`);
   - hooks sit above the early returns;
   - deep-link resolvers return before opening;
   - the plan never opens a locked step;
   - the fill keeps free steps ≥ 10;
   - nothing in the wall slot appears outside arms B–D.
3. **Arm D (interview sprint)** — the sprint screen, `userData.sprint`,
   `planToDate` and the day line, plus arm B's plan builder and fill. Tests:
   - nothing in arm D writes `prepTarget.date` (source guard);
   - a `?company=` arrival skips the screen.
4. **Arm C (proof first, queued)** — reuses `goalMeasure`'s component with
   `source: 'tournament_c'` and arm B's plan builder. It merges dark-in-dark:
   its registry status is `queued`, so no slot runs it until a decision row
   gives it a freed slot.

Then **the flip**: one line plus an orchestrator decision row, after the
§2.4 gates. A0 merges it; the founder's go is attached.

**Order and slack.**
- PR 1 can merge as soon as #384 does.
- PRs 2 and 3 are on the launch path. Each takes one code-agent run, and
  they can be built in parallel after PR 1 (the fleet's cap of 2 code
  agents).
- PR 4 is not on the launch path. It is needed by the first elimination,
  around 01-08 to 01-22.
- A 12-10 target is tight but possible. The `A_control_twin` fallback
  means a late arm delays only itself.

---

## 9. The three riskiest decisions

1. **Hiding the tab row until the ladder ends.**
   - The bet is that the menu is the exit (A05: 48% of non-runners left
     through another challenge or another tab).
   - If the menu is instead what keeps curious people around, B loses on
     `second_session_7d`.
   - The harm stop watches `first_solve_10m`, not returns. Read
     `second_session_7d` by arm at every Friday read, and treat a ≥ 8-point
     deficit at 150 per arm as a reason to stop.
2. **Rung 1 starts Easy, against the sketch.** The data (§1c) says the
   JOIN / GROUP BY Mediums stall almost everyone in a first session. Rung
   1's thresholds rest on n = 19–199, and rung 2's on n = 4–16.
   `ladder_question_resolved` re-measures every threshold within two weeks.
   T0–T2 move once, by a docs + config PR, with a `version` bump on arm B.
3. **A tournament on ~23 people a day, launched inside the holdout's
   enrolment.**
   - Three arms rather than four is this plan's recommendation; four
     unlock only at 30 openers a day.
   - It decides on activation, not money: ~1.3 trial-or-paid per arm a
     month cannot rank arms. It will eliminate roughly one arm every ~4
     weeks, and at equal arms the 6-week fallback discards a coin-flip
     loser.
   - Launching on 12-10 makes half of the holdout's enrolment a 2×2.
     Independent hashes keep both reads unbiased, but an interaction is
     possible: B hides the counter, and D changes who reaches the wall.
   - **The alternative is a 12-24 launch** (the day after the holdout
     enrolment closes). That gives a clean holdout read, and the first
     elimination moves to ~01-22 → 02-05. The orchestrator picks in the flip's
     decision row. This plan defaults to 12-10, because both reads are
     reported as 2×2s and the holdout's primary is also read outside arms
     B–D.
