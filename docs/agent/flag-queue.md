# Flag queue — one flag at a time, activation first

Written 2026-09-22 on the founder's decision list:

> Beşini birden açma. Önce aktivasyonu hedefleyenler, tek tek, birer hafta.
> Para bayrakları sonra, aktivasyon oturduktan sonra.

Why it changed: on 2026-09-21 the laptop scheduler was set to flip
`onboardingIntake`, `goalMeasure`, `interviewFirst`, `interviewCountdown`,
`freeQuota` and `deadlineOffer` inside one afternoon. It stalled (two runs
parked on permission prompts, one never started), so nothing flipped and
every flag below is still `false`. The stall was luck, not a decision: six
flags in six hours is six confounded reads on a funnel that measures twelve
first solves in a hundred first visits (`first_solve_10m`, 12.4%, 08-24 →
09-20, n = 1,465).

## How a flip happens now

- The VPS fleet task `flag-flip` (Wednesdays 04:15, `scripts/agent/tasks/flag-flip.md`)
  reads this file, takes the FIRST row whose status is `queued`, and opens a
  PR flipping exactly that flag — if and only if every rule below holds.
  Otherwise it changes nothing.
- The founder merges the PR. That merge is the flip; the fleet cannot push to
  `main`. The merge time goes into the row and into the flag's ledger entry.
- The laptop scheduler no longer flips flags. Its flip tasks are disabled
  (2026-09-22) and stay disabled.

## Rules (the task checks every one; a failed rule means no PR)

1. **One flag per PR, one PR per week.** A row may flip only when the
   previous row's `Flipped` date is at least 7 days ago.
2. **Not before its `Earliest` date**, which exists to keep a named read
   clean.
3. **Guardrail:** `first_solve_10m` (docs/agent/metrics.md) over the 7 days
   since the previous flip must not be more than 3 points below its value in
   the 7 days before it. A drop stops the queue: no PR, and the task writes the
   two numbers into the row's Note for the founder. It does not revert
   anything itself.
4. **Money rows need the founder's go written in the row** (`Go:` with a
   date). Without it the task stops at that row and writes nothing else —
   money never flips because a date arrived.
5. The PR body carries the flag's ledger claim (metric, baseline, target,
   read date) — the claims already exist, one per flag; the task updates the
   claim's Flipped/Read lines, it does not write a new one.

## The queue

| # | Flag | Kind | Earliest | Why here | Ledger claim | Status |
|---|---|---|---|---|---|---|
| 1 | `diagnosisHints` | activation | 2026-09-30 | Aimed at the measured leak: 59% of people who open a challenge never solve one. The wrong-answer panel says what is wrong instead of "Try again!". After the cold-start read (09-29), which reads the same surface. | "the wrong-answer panel says what is wrong, and one hint" · `hint_to_solve` · Read = flip + 21 days | queued |
| 2 | `firstScreenChallenge` | activation — **A/B, half of new visitors** | flip #1 + 7 d | The only row that reaches the 42% who never open a challenge: half land in challenge 91's editor instead of the four-question quiz (406 of the never-openers saw it in their first minute, 15 finished it). Randomised by aid, so it reads cleanly beside row 1. | "the first screen is a challenge, not a quiz" · `first_screen_split` · Read = flip + 21 days | queued |
| 3 | `coachTrustQuizPlacement` | activation | flip #2 + 7 d | Goal starters stop at the Coach placement check (102 handed it, 4 finished, 09-12). | the Coach-trust entry · Read = flip + 14 days | queued |
| 4 | `socraticLadder` | activation | flip #3 + 7 d | The tutor walks a stuck person to the fix in three steps. | "the tutor speaks to the query, climbs a ladder…" | queued |
| 5 | `weakSkillNext` | activation | flip #4 + 7 d | The second solve: "next" picks the weakest skill. Reaches only solvers, so it goes after the first-contact rows. | the P1 picker entry | queued |
| 6 | `onboardingIntake` + `goalMeasure` | activation — **adds questions before the first solve** | flip #5 + 7 d | May cut `first_solve_10m` rather than lift it; that is why it is behind the five that cannot. The guardrail in rule 3 is the whole test. `goalMeasure` only acts inside the intake, so they are one flip. | intake + "the goal is asked, measured and planned…" | queued |
| 7 | `interviewFirst` + `interviewCountdown` | interview plan | flip #6 + 7 d | For people with a company or a date; one surface (the countdown card moves under `interviewFirst`). | "interview-first: the plan is the product…" | queued |
| 8 | `freeQuota` + `deadlineOffer` | **money** | founder's go | Only after activation has held. The founder moved these two together on 09-16. | quota + M3 entries | needs Go |
| 9 | `quietEarlyAsks` | money-adjacent | founder's go | Removes asks; still read as a money change. | M4 | needs Go |
| 10 | `goalWallEarly` + `mockDoor` | **money** | founder's go | `mockDoor` is inert without `goalWallEarly`. | M2 + M5 | needs Go |
| 11 | `companySetGate` | **money** | founder's go | Signed archetype companies only. | M1 | needs Go |
| 12 | `adaptivePlacement` | placement | founder's go | Changes who reaches challenge 1; read with the placement mix. | placement entry | needs Go |
| 13 | `intakeAfterFirstSolve` | activation — **A/B, ask after the first solve** | founder's go, after the founder walks it in production | The founder's plan of 2026-09-25 (P0 1–3): one company question after the first solve, again at the third, then silent; replaces the withdrawn door gate. Cannot move `first_solve_10m` (it comes after the first solve); its guardrail is the second solve in 24 h by arm. | "one question after the first solve" · `company_ask_split` · Read = flip + 7 days | needs Go |

The 42% of first visitors who never open a challenge: row 2 (added
2026-09-23) is the first flag that reaches them.

## Log

| Row | Flipped (merge, UTC) | PR | Guardrail read | Note |
|---|---|---|---|---|
| — `goalGate` (not a queue row) | on 2026-09-25, **off again the same night** | — | none — withdrawn before it reached anyone | Replaced by `intakeAfterFirstSolve` (after the first solve, skippable). Live for minutes; the only shown row was the localhost preview, so rule 1's spacing is unaffected: row 1 stays at its own Earliest (2026-09-30). |
