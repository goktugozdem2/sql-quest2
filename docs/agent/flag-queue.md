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
| 2 | `coachTrustQuizPlacement` | activation | flip #1 + 7 d | Goal starters stop at the Coach placement check (102 handed it, 4 finished, 09-12). | the Coach-trust entry · Read = flip + 14 days | queued |
| 3 | `socraticLadder` | activation | flip #2 + 7 d | The tutor walks a stuck person to the fix in three steps. | "the tutor speaks to the query, climbs a ladder…" | queued |
| 4 | `weakSkillNext` | activation | flip #3 + 7 d | The second solve: "next" picks the weakest skill. Reaches only solvers, so it goes last of the four. | the P1 picker entry | queued |
| 5 | `onboardingIntake` + `goalMeasure` | activation — **adds questions before the first solve** | flip #4 + 7 d | May cut `first_solve_10m` rather than lift it; that is why it is behind the four that cannot. The guardrail in rule 3 is the whole test. `goalMeasure` only acts inside the intake, so they are one flip. | intake + "the goal is asked, measured and planned…" | queued |
| 6 | `interviewFirst` + `interviewCountdown` | interview plan | flip #5 + 7 d | For people with a company or a date; one surface (the countdown card moves under `interviewFirst`). | "interview-first: the plan is the product…" | queued |
| 7 | `freeQuota` + `deadlineOffer` | **money** | founder's go | Only after activation has held. The founder moved these two together on 09-16. | quota + M3 entries | needs Go |
| 8 | `quietEarlyAsks` | money-adjacent | founder's go | Removes asks; still read as a money change. | M4 | needs Go |
| 9 | `goalWallEarly` + `mockDoor` | **money** | founder's go | `mockDoor` is inert without `goalWallEarly`. | M2 + M5 | needs Go |
| 10 | `companySetGate` | **money** | founder's go | Signed archetype companies only. | M1 | needs Go |
| 11 | `adaptivePlacement` | placement | founder's go | Changes who reaches challenge 1; read with the placement mix. | placement entry | needs Go |

Not in the queue because no flag exists for it: **42% of first visitors
never open a challenge.** None of the flags above reaches them. That needs a
change to the first screen (landing straight in challenge 91's editor), built
and claimed on its own — see `docs/plans/backlog-2026-09-21.md`.

## Log

| Row | Flipped (merge, UTC) | PR | Guardrail read | Note |
|---|---|---|---|---|
