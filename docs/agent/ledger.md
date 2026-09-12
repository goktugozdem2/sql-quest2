# Ledger — did the change do what it said?

Every entry starts as a claim made at merge time and ends as a verdict measured
on the read date. The verifier (`scripts/agent/tasks/verify.md`) appends the
verdict; nobody edits a claim after the fact.

**Why this file is the point of the whole agent system.** Without it the fleet
only produces more pull requests, and "we shipped a lot" is not the same as
"the numbers moved". The ledger is also the input that lets triage rank work:
if content fixes keep moving numbers, do more; if they do not, stop.

## Verdicts

| verdict | meaning |
|---|---|
| `HIT` | reached or beat the target |
| `MOVED` | moved in the right direction, short of target |
| `FLAT` | inside noise |
| `MISS` | moved the wrong way |
| `UNREADABLE` | n too small, or the window is confounded — say why |
| `UNDEFINED` | the metric is not in `docs/agent/metrics.md`; nothing was measured |

`UNREADABLE` is a real and frequent outcome at this scale. It is not a failure
of the verifier and must never be rounded to `FLAT`.

---

## Open

### three hand-written founder emails to the checkout abandoners of 09-04 / 09-06 — **OPEN**

- **Sent** 2026-09-12 evening by the founder from Gmail (drafts written by the
  agent; addresses deliberately not in git). Three people who clicked a plan
  and left Stripe Checkout without submitting a card (Stripe checked the same
  day: no failed or incomplete payment exists): `alexis_montesdeoca`
  (lifetime, 25 min on the page, 12 solves since), `harinivr02` (monthly,
  `company:Stripe`, 28 solves since), `rereremin` (monthly, Moscow, 24 s on
  the page, not seen since). One question each — what stopped you — no
  pitch, no follow-up, per the email rule in CLAUDE.md.
- **Contact load, known before sending:** each had already received the
  automated `checkout_abandon` note (09-05 / 09-07 / 09-08), a `streak_save`,
  a `weekly_digest`, and two of them a `skill_decay_lesson` at 10:00Z the
  same morning. This is the third to fifth email in eight days. If nobody
  answers, that is one candidate reason; read it before reading "the
  question was wrong".
- **Metric** `outreach_replies` (metrics.md): replies within 7 days, by
  name, verbatim. **Read** 2026-09-19.
- **Target** 1 of 3 replies. **Falsification:** 0 of 3 → the abandonment
  reason stays unknown; do not mail these three again, and do not build the
  merchant-of-record change on an assumption — read the M1 wall's
  `pro_checkout_returned.outcome` split by `tz` instead.
- **Verdict** _pending_

### Revolut membership: everything but the signature — **SIGNED 2026-09-12**

- **Signed** 2026-09-12 by Göktuğ, in chat ("imzaladım, revolut'u kayda
  taşı"); the block moved into `INTERVIEW_ARCHETYPES` as the second
  archetype (`neobank-analyst` on `finans_neobank`), the registry test now
  asserts two. This is the pre-registered "a second value in `company`"
  trigger firing, by design: from this date every prep read splits by
  company, and the two rows are never summed.
- **Written** 2026-09-12. Not a claim to read; a state to sign. The registry
  checklist (src/data/interview-archetypes.js) is met on every point a script
  may meet: a dated source (interviewquery's 2026 guide, 27 candidate reports
  stamped Q3 2026), a ledger of the sourced shape (`finans_neobank`), twelve
  challenges on it tagged Revolut (300-311), a mock keyed to the exact name
  running on that ledger and nothing else (`revolut-analytics-screen`: 6
  multiple choice whose correct options are computed from the data + 2
  written tasks, 60 minutes), the page section with a `Sources:` line
  (src/revolut-sql-interview.html, now in `SOURCED_PAGES`), and the
  archetype + member block — `PENDING_INTERVIEW_ARCHETYPES`, `declaredBy:
  null`. tests/revolut-mock.test.js proves that with a placeholder signature
  every other validator check passes and `eligibleTargets` returns Capital
  One and Revolut.
- **To sign** (the founder, in one commit): set `declaredOn` / `declaredBy`,
  move the block into `INTERVIEW_ARCHETYPES`, change the "exactly one
  archetype and one member today" assertion in tests/interview-prep.test.js
  to two. That commit fires the pre-registered stop-and-look on
  `interview_prep_funnel` — a second value in its `company` column — so read
  the funnel split by company from that date, and keep the two companies'
  rows separate in every prep read.
- **What changes for a person when it is signed:** a Revolut arrival with a
  named target gets the prep flow (readiness, the day plan, the mock offer)
  that only Capital One arrivals get today. Until then the page already
  links the mock and the twelve challenges directly.

### weak skills come back at 3, 7 and 14 days (P2 spaced retrieval + daily quota)

- **Claimed** 2026-09-12 · **Flips** 2026-10-12 by the same scheduled task
  as the interview-prep wall (Coach surface; after the Coach-trust read
  10-11) · **Read** 2026-11-02 (flip + 21 days).
- **Change** behind `spacedRetrievalCard` (off): a "Due today · spaced
  retrieval" card on the Coach tab, between the radar and the countdown.
  A canonical skill is due when it has been practised, its mastery is below
  70, and the days since its `lastPracticed` (the user_skill row) reach
  3 / 7 / 14 for its first / second / later review; up to two skills, each
  with one unsolved challenge at the level the person has shown on it
  (`src/utils/spaced-retrieval.js`). Start opens it; the solve credits the
  review (`retrievalLog`, `retrieval_completed`). Events
  `retrieval_due_shown`, `retrieval_started`, `retrieval_completed`. Behind
  `dailyQuota` (off, same flip): the days-left chip on the Coach reads "12
  days left · 6 a day" — unsolved challenge steps on the active goal (or the
  interview-prep goal as the reference plan) over the days left.
- **Why** the landing has promised "Tomorrow · spaced retrieval" since the
  Coach shipped, and nothing was behind it outside a goal's own
  retrieval_check steps and the lesson-1 review. The founder's P2 list.
- **Metric** `retrieval_funnel` (metrics.md): people shown the card, share
  who start, share who complete; and the retrieved skill's mastery 14 days
  after the review vs matched non-reviewed weak skills. Guardrail:
  `coach_page_take_rate` on the next-step card (the card must not steal the
  Coach's one answer).
- **Baseline** structurally 0 (events born at the flip). Weak-skill
  regression baseline: measured at the flip — mean mastery change over 14
  days for skills with mastery < 70 and no practice.
- **Target** ≥ 40% of people shown start one; ≥ 60% of starts complete;
  reviewed skills hold or gain over 14 days while non-reviewed weak skills
  decay.
- **Falsification, stated in advance:** starts < 20% at n ≥ 60 shown → the
  card is ignored; move the due item into the Coach's next-step card as a
  step type rather than a second card. Next-step take rate falls > 10 points
  in the same window → the card competes; revert.
- **Confounds** the interview-prep wall (M2) flips the same day on the same
  tab; split on goal. The quota chip is display only and is read by
  `intake_funnel` (dates) rather than its own metric.
- **Verdict** _pending_

### the weekly digest says what moved and one thing to do (P2, live)

- **Claimed** 2026-09-12 · **Deployed** when `supabase functions deploy
  weekly-digest` lands (see the deploy note in the report) · **Read**
  2026-10-13 (three Monday sends).
- **Change** live in the function: two lines under the stats strip —
  "Moved most: Joins +9 (42 → 51)" from the canonical user_skill rows on
  `users.data.skillMastery` against the prior report's snapshot, and "One
  thing this week: three challenges on <weakest practised skill> (n/100)"
  with a tagged link (`weekly_digest_one_thing`). Rows without a numeric
  mastery (the old record, on accounts that have not loaded the new bundle)
  are ignored, so nobody is told a made-up number.
- **Metric** `returned_48h` for `weekly_digest` (scripts/funnel-report.sql
  §5–6), and clicks on the `weekly_digest_one_thing` utm vs the CTA.
- **Baseline** read from `email_events` for the three sends before deploy.
- **Target** returned_48h up ≥ 5 points over three sends.
- **Falsification:** flat at n ≥ 100 sends → the lines are decoration;
  keep the mastery line, drop the recommendation.
- **Deployed at** 2026-09-12 (the founder ran `supabase functions deploy
  weekly-digest`; verified on the project as version 6 with the new source —
  a first attempt earlier the same day had not landed, the keychain prompt
  had stopped it). First send with the new lines: Monday 2026-09-14 09:00Z.
- **Verdict** _pending_

### the wrong-answer panel says what is wrong, and one hint (P1 diff engine)

- **Claimed** 2026-09-12 · **Flips** 2026-09-30 by scheduled task, after the
  cold-start read (09-29) is written — the panel is the solve surface that
  read measures · **Read** 2026-10-21 (flip + 21 days).
- **Change** behind `diagnosisHints` (off): on a wrong submit the panel's
  second line is the diff engine's sentence ("Wrong number of rows —
  expected 12, got 30") instead of "Your output doesn't match the expected
  result. Try again!", and the diagnosis block shows ONE hint chosen for the
  diagnosis kind and the query as written (`primaryHint` in
  src/utils/diagnose.js: a missing GROUP BY when the query aggregates without
  one, a LEFT JOIN when rows are missing behind an INNER JOIN, `IS NULL`
  when the query says `= NULL`, the ORDER BY column lifted from the
  description) instead of the fixed three. Live regardless of the flag: the
  new `row_set` diagnosis kind — right count, wrong rows, reported as extra
  and missing rows rather than as "wrong values".
- **Why** the founder's P1 list: "remove the fixed hint list; one hint per
  diagnosis type; 'Try again!' → a diagnosis sentence". The engine already
  knew what was wrong; the panel told the student to try again.
- **Metric** `hint_to_solve` (docs/agent/metrics.md): of people who get a
  wrong submit on a challenge, the share who solve THAT challenge within the
  same session, split by the flag; secondary: wrong submits per eventual
  solve. Baseline read at the flip over the prior 21 days.
- **Target** wrong→solve same session up ≥ 5 points at n ≥ 300 wrong-submit
  people; never a drop in first-contact solve (the cold-start guardrail).
- **Falsification, stated in advance:** wrong→solve flat or down at n ≥ 300
  → the sentence was not the constraint; keep the row_set kind, revert the
  panel to the list, and read which diagnosis kinds stall. n < 300 by 10-21
  → extend to 11-11.
- **Confounds** the tutor ladder and the weak-skill picker flip the same
  day on different surfaces; a wrong submit that opens the tutor is read
  under the ladder claim, not here (split on `inline_help_opened` /
  `tutor_bypass_clicked`).
- **Verdict** _pending_

### the tutor speaks to the query, climbs a ladder, and remembers the habit (P1 tutor)

- **Claimed** 2026-09-12 · **Flips** 2026-09-30 with the panel claim ·
  **Read** 2026-10-21. Live from 2026-09-12 regardless of the flag: the
  enriched context (both tutor doors carry the student's query as written,
  the just-failed diagnosis, user_skill rows for the challenge's skills,
  the error patterns of the last ten wrong submits with a REPEAT line at
  three or more, the Coach goal and days to the interview date), and error-
  pattern recording (`challenge_error_pattern {kind, primary, patterns,
  repeat}`; store `userData.errorPatterns`; src/utils/error-patterns.js).
- **Change** behind `socraticLadder` (off): the inline help panel opens on a
  diagnosis of THEIR query (the diff sentence plus the one hint) instead of
  the static topic explanation; both doors follow a ladder — request 1 names
  the defect at clause level, request 2 gives the exact clause, request 3+
  the full corrected query with one line on why; asking for the answer
  outright bypasses the ladder, and a "Show me the answer" button does the
  asking. Flag off, the tutor never reveals the solution, as today.
- **Why** the founder's P1 list, and the measured state of the doors: the
  panel users actually see opened with `TOPIC_EXPLANATIONS[topic]` — the
  same paragraph for everyone on that topic — and the hint chain's prompt
  carried no query, no mastery and no history of mistakes. "This is the
  third time" was impossible: nothing counted.
- **Metric** `tutor_ladder` (metrics.md): of people who open the inline
  panel on a challenge (`inline_help_opened`), the share who solve it in
  the session, split by flag and by `opener`; bypass rate
  (`tutor_bypass_clicked` ÷ opens); REPEAT lines shown (people whose
  `challenge_error_pattern.repeat ≥ 3`).
- **Baseline** read at the flip over the prior 21 days: panel opens, solves
  after open. `challenge_error_pattern` is born 2026-09-12.
- **Target** open→solve same session ≥ 55% under the ladder (baseline TBD
  at flip); bypass ≤ 40% of opens.
- **Falsification, stated in advance:** open→solve under the ladder below
  the no-ladder arm at n ≥ 80 opens → the ladder gives away too much or too
  little; read bypass rate to tell which, then move rung 3 to rung 4 (too
  much) or rung 2's snippet to rung 1 (too little). Bypass > 60% → the
  first two rungs are not worth asking for; make rung 2 the opener.
- **Confounds** the free AI cap (20/day) — a person who hits it mid-ladder
  is read as unresolved; exclude `rate_limit` shows. The live nudge
  (`live_nudge` mode) also carries the REPEAT line from 09-12.
- **Verdict** _pending_

### the next quest is the weakest skill, one step up (P1 picker)

- **Claimed** 2026-09-12 · **Flips** 2026-09-30 with the panel claim ·
  **Read** 2026-10-21.
- **Change** behind `weakSkillNext` (off): after a solve, the "Next quest"
  strip recommends a challenge on the person's WEAKEST canonical skill (by
  the user_skill mastery row), one difficulty above the highest they have
  solved on that skill (Easy if none; Hard only once mastery ≥ 50), in
  curriculum order — `pickNextBySkill` in src/utils/user-skill.js, never
  raw id order. The strip says why ("Weakest skill · Joins (42/100) · one
  step up"); `next_rec_started {source, skill}` on the click. Flag off, the
  strip picks curriculum-next at the same difficulty, as today.
- **Why** the founder's P1 list. Today's pick ignores the radar entirely.
- **Metric** `next_rec_take` (metrics.md): clicks on the strip ÷ solves
  that showed it, and solve rate of the recommended challenge within the
  session, split by `source`.
- **Baseline** `next_rec_started` is born 2026-09-12; the strip's take
  rate before the flip is read from it over 09-12 → 09-30.
- **Target** take rate ≥ the curriculum arm at n ≥ 200 strips shown, with
  the recommended solve rate ≥ 60%.
- **Falsification, stated in advance:** recommended solve rate < 45% → "one
  step up" is a cliff; drop the tier to same-as-highest-solved and re-read.
  Take rate < 70% of the curriculum arm → people do not want the weakest
  skill after a win; revert and keep the picker for the Coach's drill only.
- **Confounds** the intent-routing read (10-13) reads reach-6 over the same
  weeks; this moves what the second solve is. Noted on that entry.
- **Verdict** _pending_

### company sets: three free, then Pro (free-tier boundary M1)

- **Claimed** 2026-09-12 · **Flips** 2026-10-14 by scheduled task — after the
  intent-routing read (10-13) on `reach_6_rate`, which this moves for company
  arrivals by design · **Read** 2026-11-04 (flip + 21 days).
- **Change** behind `companySetGate` (off): in a company view the first three
  of the set are free, whatever their difficulty, and the fourth meets a wall
  — `content_lock_reached {surface: 'challenge_set', wall: 'company_set',
  setPosition, setSize, freeCount, solvedInSet}`, the cold-start diversion,
  then the Pro modal under reason `company_set` naming the set, the count and
  (M5) the company's mock when one exists. The banner says "3 of Stripe's 35
  are free to try" before anyone clicks; locked rows wear the Pro lock; the
  set-complete ask fires on the third solve. A solved challenge is never
  taken back, and every question stays reachable one by one from the general
  list — the curated set is what Pro buys. Pure half
  `src/utils/free-tier-boundary.js`; company-page copy ("21 free") changes at
  the flip, count guards enforcing it.
- **Why** measured 2026-09-12: the company page is the highest-intent door
  (169 arrivals in 30 days; 11% hit a wall vs 6.5% from the homepage) and the
  product it promises — "Stripe's SQL questions" — is mostly free: Snowflake
  53 free / 42 locked, Stripe 23 / 12, Plaid 25 / 9, Capital One 19 / 6.
  Amazon (10 / 24) is the one mostly-Pro set, and it produced a payer
  (sergelafarge, $99 annual, via `company:Amazon`) and a checkout click.
  harinivr02 arrived via `company:Stripe`, solved 6, clicked, did not pay —
  with 23 free Stripe questions there was nothing to pay for.
- **Metric** `company_set_wall` (docs/agent/metrics.md): company arrivals
  (`app_opened.arrivalSrc` like `company:%`) reaching the set wall, clicks
  per person at it, and purchases whose `arrivalSrc` is a company, all by
  `aid`. Guardrail: company-arrival reach-6 share.
- **Baseline** 30 days to 2026-09-12: 169 company arrivals, 45 solved
  anything, 21 reached six (12.4%), 19 hit a wall, 2 clicked, 0 paid.
  All-time company-arrival purchases: 1.
- **Target** ≥ 10% of company arrivals reach the set wall, ≥ 8% of those
  click, and ≥ 1 purchase attributed to a company arrival in the 21 days,
  with company-arrival reach-6 ≥ 8%.
- **Falsification, stated in advance:** company-arrival reach-6 below 8%
  with no purchase in the window → the door was worth more open; revert.
  Wall reached by < 5% → the wall is not where they are; read where company
  arrivals actually stop before touching it. 1 purchase at n < 100 arrivals
  → UNREADABLE, extend to 2026-11-25.
- **Confounds** the intent-routing read (10-13, `reach_6_rate`) — this flips
  after it for that reason. M2 flips 10-12 on the Coach; a company arrival
  holding the interview-prep goal is on both surfaces, split on goal. The
  payment-geography finding (0 of 7 non-US checkouts paid) caps what any
  wall can show in purchases; read clicks before purchases. Stripe checked
  2026-09-12: no failed or incomplete payment since 09-01 — the three
  non-payers left Checkout without submitting a card (abandonment, not a
  decline).
- **Verdict** _pending_

### the interview-prep goal meets the wall at step 4 (free-tier boundary M2)

- **Claimed** 2026-09-12 · **Flips** 2026-10-12 by scheduled task, after the
  Coach-trust read (10-11) — it changes what that goal's first steps ARE ·
  **Read** 2026-11-02 (flip + 21 days).
- **Change** behind `goalWallEarly` (off): the interview-prep curriculum is
  reordered at read time (`withEarlyWall`, one resolver for the engine and
  the card): positions 1–2 unchanged, 3 = the free Hard preview (iv-5,
  challenge 23), 4 = a locked Hard (iv-7, challenge 71, Top-N per Category),
  then the rest in its original order; with `mockDoor` (M5) the free mock at
  5 and a Pro mock at 6. The locked-step card says which step is Pro and
  offers "Set aside for now" — `coachState.stepsSkipped`, which the engine
  passes over without counting (never progress, returns when removed);
  event `coach_step_skipped`. The registry file is untouched.
- **Why** measured 2026-09-12: the first locked step was 11 and the goal held
  no mock, so a first session — where every purchase has happened — never
  met the paid good. Of 79 interview-intent people, 39 reached six solves
  and were asked, **68 never opened a Hard challenge, 0 opened a mock**.
- **Metric** `goal_wall_early` (metrics.md): of people who start the
  interview-prep goal after the flip, the share who open a Hard challenge or
  a mock within 24h of the goal start; skip rate on the locked step;
  guardrail `coach_goal_to_step` for that goal.
- **Baseline** interview-intent people opening a Hard in 30 days: 11 of 79
  (14%); a mock: 0. Goal-holder baseline read at the flip from
  `coach_step_started` on the goal.
- **Target** ≥ 50% of new interview-prep goal holders open a Hard or a mock
  within 24h; ≥ 1 click on `coach_path` or `coach_mock` from them.
- **Falsification, stated in advance:** first-24h Hard/mock opens < 25% →
  the reorder did not reach them; read where they stop (step 1–2 solve
  rate) before touching the order. `coach_goal_to_step` for the goal falls
  below its no-flag arm by > 10 points → the wall is costing the step, revert.
  Fewer than 40 goal starters by 11-02 → UNREADABLE, extend to 11-23.
- **What this must not become** a wall with no way past: the skip is by
  test, and a skipped step is never credited. Nor a change to the other two
  goals — same reference, by test.
- **Confounds** the intake flip (09-16) hands this goal to intake-goal
  holders (`coachState.source='intake'`); split on source. M5 ships with it
  — same surface, same read; the mock steps are read as their own line.
- **Verdict** _pending_

### the six-solve ask speaks to the deadline (free-tier boundary M3)

- **Claimed** 2026-09-12 · **Flips** 2026-10-06 by scheduled task, after the
  intake read (09-30) that gives it dates · **Read** 2026-11-24, joined to
  the `paywall_ask_efficiency` read (n is small — ~7 milestone clicks a
  month; a 21-day read would be UNREADABLE by construction).
- **Change** behind `deadlineOffer` (off): when the milestone modal fires
  for a person whose date — the intake's or the countdown card's, as
  `prepTarget.date` — is inside 45 days, the ask leads with the date ("12
  days to your interview.") and names what stands between them and it: the
  count of locked Hard challenges and the company's mock (or "a scored
  mock"). `pro_modal_shown` carries `deadline` and `daysOut` (the integer;
  the date never leaves). No date, past 45 days, or flag off: today's modal.
- **Why** every purchase was a first-session decision at 6–10 solves, two of
  them at this exact modal in 31 seconds and 7 minutes; the buyers were
  deadline-driven ("interview coming up"). The modal has never mentioned the
  deadline it is being bought for.
- **Metric** `deadline_offer_split` (metrics.md): milestone_solves clicks per
  person shown, split by `deadline` true/false, by `aid`. Mechanism check
  2026-10-20: `deadline=true` shows > 0.
- **Baseline** milestone_solves 30 days to 2026-09-12: 171 people shown, 7
  clicked (4.1%), 2 paid. With a date: structurally 0 before the intake.
- **Target** deadline arm ≥ 10% clicks per person shown at n ≥ 30 shown.
- **Falsification, stated in advance:** deadline arm ≤ the no-date arm at
  n ≥ 30 → the date is a marker, not a lever; revert the copy, keep the
  event. n < 30 by 11-24 → UNREADABLE; the intake is not producing dates,
  read its verdict first. Never widen the window past 45 days to get n.
- **Confounds** M4 (flips 09-29) removes low-value shows and raises clicks
  per shown mechanically — this reads milestone_solves only, which M4 never
  touches. The 09-29 copy fix on the modal ("50+ tutor calls a day" for
  "unlimited") lands before this flips.
- **Verdict** _pending_

### quiet the asks that have never sold (free-tier boundary M4)

- **Claimed** 2026-09-12 · **Flips** 2026-09-29 by scheduled task, after the
  cold-start read (09-29) is written · **Read** 2026-10-13 (flip + 14 days).
- **Change** behind `quietEarlyAsks` (off): the streak modal
  (`milestone_streak`) never fires; a company Hard wall (`company_hard`) at
  three solves or fewer gets the free-preview catcher instead of the modal;
  a locked mock at three solves or fewer opens the free mock instead
  (`interview_lock_nudged`, a toast). The lock rows are still written.
  Live from 2026-09-12 regardless of the flag: the locked-mock ask is stamped
  `interview_locked` instead of inheriting `generic` (metrics.md, reason
  discontinuity). User-initiated asks — the header button, the Coach strip —
  are untouched: they asked.
- **Why** measured 2026-09-12, 30 days: `milestone_streak` 13 people, 0
  clicks, none ever; `company_hard` 12 people at an average of 1.8 solves,
  1 click; `generic` at ≤3 solves 25 of 45 people, 0 clicks — most of them
  locked-mock clicks wearing the wrong label. Fifty people a month, no sale
  in the product's history from any of them, and the surface burns: 1.9
  shows per person, 43 people asked three or more times (60d to 09-08).
- **Metric** `early_ask_quiet` (metrics.md): `pro_modal_shown` per person
  shown, people shown 3+ times, and shows under the three quieted reasons;
  guardrail: `pro_plan_clicked` + `pro_checkout_clicked` people unchanged or
  up, and `interview_lock_nudged` → free-mock `interview_started` share.
- **Baseline** 380 shows / 203 people = 1.87 per person; quieted-reason
  people: 13 + 12 + ~25 = ~50 a month; clicks 10 people.
- **Target** ≤ 1.3 shows per person, people asked 3+ times < 10 a month,
  clicks per month ≥ 10; ≥ 40% of nudged mock clicks start the free mock.
- **Falsification, stated in advance:** clicks per month fall below 7 → one
  of the quieted asks was selling after all; read which reason's clicks
  vanished and restore that one only. Nudged-to-free-mock starts < 20% →
  the nudge is a dismissal, not a door; replace it with the plain ask.
- **Confounds** M1 (10-14) changes the company wall; this reads to 10-13.
  Fewer shows raise every "per shown" ratio mechanically — the guardrail is
  absolute clicks, never a rate.
- **Verdict** _pending_

### the mocks get a door (free-tier boundary M5)

- **Claimed** 2026-09-12 · **Flips** 2026-10-12 with M2 (it is M2's steps
  5–6) · **Read** 2026-11-02, as its own line in the M2 read.
- **Change** behind `mockDoor` (off, read only when `goalWallEarly` is on):
  the free mock (`sql-fundamentals-free`) becomes step 5 of interview-prep
  and a Pro mock step 6 — the company the person named, when it has a mock,
  else the generic `top-10-most-asked`; never a company nobody typed. A
  curriculum mock step completes on a sitting (`interviewHistory` after the
  goal start), starts through `startInterview` — the one gate — and never
  spends the Coach's once-per-session offer flag. The company wall (M1) names
  the company's mock. Engine: `isStepComplete` for `mock_interview`.
- **Why** the Interview tab was reached by 3 people in 30 days; 0 of 79
  interview-intent people opened a mock. "Full mock interview bank" has been
  a bullet on a modal nobody could find the door to.
- **Metric** `goal_wall_early` mock line: interview-prep goal holders who
  start the free mock within 7 days of the goal start; `coach_mock` clicks;
  `interview_reach` for the goal's holders.
- **Baseline** interview-intent people opening a mock: 0 of 79 (30d).
- **Target** ≥ 30% of new goal holders sit the free mock within 7 days.
- **Falsification, stated in advance:** < 10% start it → a mock is not what
  a step-5 person wants; move it to the end of Phase B and keep the door on
  the company wall only. `coach_mock` dismissed with no skip and no start by
  > 60% → the Pro mock step is a dead end; drop step 6, keep step 5.
- **Confounds** the `interviewCountdown` flag (off) owns the synthetic
  offer; its once-per-session flag is untouched by curriculum mocks, by
  test. Intent routing (09-13) opens the Interview tab to hiring-intent
  people — a second door in the same window; split mock starts by
  `coach_step_started type=mock_interview` vs the tab.
- **Verdict** _pending_

### the Coach stops asking twice: a first-run placement is a placement

- **Claimed** 2026-09-12 · **Flips** 2026-09-27 by scheduled task, after the
  Coach page read (09-26) and only if that claim was not extended · **Read**
  2026-10-11 (flip + 14 days).
- **Change** behind `coachTrustQuizPlacement` (off): a Coach goal started by
  someone the first run already placed — the four-question quiz or a level
  picked by hand — no longer gets the Coach's own five-challenge placement
  check. At both goal doors (the Coach picker, the onboarding intake) the
  first-run record is read and the placement is written `skipped: true,
  skippedBy: 'first_run_quiz'`; a goal that already holds a pending check
  when the quiz completes is marked the same way. The tier becomes **seed
  floors** that only the engine's `skipIf` clauses see
  (`src/utils/coach.js` `applySeedFloors`): Foundations none; Intermediate
  Querying Basics 70; Advanced + Aggregation 60, Joins 60; Interview-ready
  70/70/70 and 60 on Conditional Logic, Subqueries & CTEs, Window Functions
  — exactly the goals' own thresholds (no goal skips on NULL Handling, so no
  floor there), so a tier skips the
  intro lessons on what it evidences and nothing more. The radar keeps
  showing what was measured, graduation reads the radar, challenges still
  gate, and "Retake placement" on the Coach still works. Event
  `coach_placement_skipped {by, level, tier, goalId, at: goal_start |
  placement, placementSource}`. Pure half `src/utils/placement.js`;
  engine tests in `tests/placement.test.js` (floors pass a skipIf lesson,
  never a goal, never write the radar).
- **Why** measured 2026-09-12 on the users table: **102 goal starters were
  handed the placement check. 50 never attempted one of its five
  challenges, 43 stopped inside it, 4 finished it, 5 skipped it — and 4 of
  the 102 ever completed a curriculum step.** The placement check is where
  the Coach loses cold goal-starters, and from 09-16 the onboarding intake
  hands a Coach goal to every new person who answers it, all cold, all at
  this wall, minutes after they have just answered the first-run quiz that
  exists to place them. Asking twice is the product not trusting its own
  question.
- **Metric** `coach_goal_to_step` (docs/agent/metrics.md): of people who
  start a Coach goal (`coachState.startedAt` after the flip), the share with
  at least one curriculum step completed within 14 days; mechanism
  `coach_step_started` with `type ≠ placement_check` within 7 days of the
  goal start, and `coach_placement_skipped` volume against goal starts.
  Guardrail: the first Coach challenge step's solve rate within 24h
  (`coach_step_started type=challenge` → `challenge_solved` same id), split
  by whether the goal holds seed floors — a floor that sends someone to a
  step they cannot do would show here first.
- **Baseline** 4 of 102 (3.9%) all-time, 4 of 82 since 2026-07-01.
  `coach_placement_skipped` is structurally 0 until the flip.
- **Target** ≥ **25%** of goal starters complete a curriculum step within
  14 days, at n ≥ 60 goal starters; first-step solve rate with floors
  ≥ **50%**.
- **Falsification, stated in advance:** < 10% → the placement check was not
  the wall, the first curriculum step is; read which step people stall on
  before touching anything else. 10–25% → inconclusive, extend to
  2026-10-25, change nothing. First-step solve rate with floors < 35% while
  the no-floor arm is above 50% → the floors are too generous; drop the
  Advanced and Interview-ready floors to the gte-60 thresholds only, keep
  the skip. Fewer than 60 goal starters by 10-11 → the intake is not
  producing goals; read its 09-30 verdict before this one.
- **What this must not become** a fabricated radar: floors never write
  `weaknessTracking`, by test, and never enter `isGoalGraduated`. Nor a
  removal of the Coach placement for everyone — a warm-account goal-picker
  with no first-run record still gets the Coach's own check, unchanged.
- **Confounds** the Coach page claim (reads 09-26) measures the take rate
  of the full-shell Coach split by first-step type; this changes what the
  first step IS for quiz-placed people, hence the flip after that read. The
  intake (09-16) supplies the population and is read on 09-30 on the start
  screen, not here. Adaptive placement (10-01) changes which tier the quiz
  assigns to a 4/4 — the floors follow the tier, so from 10-01 the
  Interview-ready floors appear; note it in the read.
- **Verdict** _pending_

### adaptive placement: interview-ready is earned on a second round, not declared

- **Claimed** 2026-09-12 · **Flips** 2026-10-01 by scheduled task, after the
  intake read (09-30) and only if that claim was not extended · **Read**
  2026-10-15 (flip + 14 days), extend to 10-22 if the interview-ready arm has
  not reached n ≥ 30.
- **Change** behind `adaptivePlacement` (off): a full score on the four
  recognition questions opens a **second round of four** — a window function
  (RANK OVER), a CTE, a NULL comparison (`<> 5` drops the NULLs), the
  anti-join (LEFT JOIN … IS NULL) — and only a pass there (3 of 4) places
  someone on the interview-ready track (`foundations-advanced`, opener
  challenge 1, unchanged). Everyone else lands where the 08-14 cap put them:
  0–1 Foundations (`brand-new`), 2 Intermediate (`basics`), 3 or a failed
  round 2 Advanced (`working`, the 105 opener). Four tiers named on the four
  ids that already exist; the manual "I already know my level" list keeps
  every level and now shows the tier. With the flag off the quiz returns
  byte-for-byte what it returned before (`tests/placement.test.js` pins all
  five scores). Events either way: `placement_completed {source: quiz |
  manual, levelId, tier, score1, score2, round2}` — scores, never answers —
  and `placement_round2_started {score1}`. Pure half `src/utils/placement.js`;
  smoke step for both flag states. P0-2 on the founder's 2026-09-12 list.
- **Why** the 08-14 cap (ledger, Closed, HIT) was right and incomplete. It
  stopped a four-question recognition quiz from declaring people
  interview-ready — challenge 1 had been the front door for half of all first
  contacts and 75% never finished it — but it left the interview-ready track
  reachable only by self-declaration. Measured 08-14 → 09-11: **25 people
  declared it and 44.0% activated on challenge 1**, against 35.2% (n=261)
  when the quiz sent everyone there. A self-report is a weak instrument; four
  more recognition questions on the things an interview asks are a stronger
  one, and the people who pass them are the population the Capital One and
  interview-intent signals say we should be able to place well.
- **Metric** `first_contact_activation(1)` for the **quiz-placed** arm —
  people whose `placement_completed` carries `source='quiz'` and
  `tier='Interview-ready'`, joined by aid to their first contact — against
  the **self-declared** arm (`source='manual', levelId='advanced'`) in the
  same window: same seat, two doors. Mechanism: `placement_mix`
  (docs/agent/metrics.md) — the tier split of quiz completions and round-2
  completion among round-2 starters. Guardrail `first_run_reach` against
  the post-intake baseline the 09-30 read records.
- **Baseline** challenge 1 as opener, self-declared only, 08-14 → 09-11:
  **44.0%** (n=25). Quiz-placed arm structurally 0; the round-2 events are
  born at the flip. Tier mix before the flip: `placement_completed` fires
  from this deploy with the flag off, so the 10-01 flip has a two-week
  baseline of the four-question split.
- **Target** quiz-placed Interview-ready opener activation ≥ **60%** at
  n ≥ 30; round-2 completion ≥ **80%** of round-2 starters; `first_run_reach`
  within 3 points of its post-intake baseline.
- **Falsification, stated in advance:** quiz-placed ≤ **44%** (no better than
  a self-report) → the four recognition questions do not identify readiness
  either; restore the cap (round 2 stays as data, its pass no longer routes).
  44–60% → inconclusive, extend to 2026-10-29, change nothing. Round-2
  completion < 60% → the second round costs more than it tells; cut it to
  two questions or drop it, whatever the opener number says.
  `first_run_reach` down > 3 points → the quiz got longer for exactly the
  people most likely to leave; read next to round-2 completion before
  blaming the opener.
- **What this must not become** a third swap of the 'working' opener (its
  own claim closed 09-13; the seat is untouched here) or a reopening of the
  cap by the back door: a 4/4 still lands on 105 unless round 2 says
  otherwise, by test.
- **Confounds** the onboarding intake (flips 09-16, reads 09-30) sits on the
  same start screen — the flips are sequential by design and the intake read
  closes first. The 'working' seat loses its 4/4-then-pass people to the
  interview-ready track from 10-01, so 105's activation can drift down for a
  mix reason after its claim has closed; say so if anyone re-reads it. The
  Coach's own five-challenge placement (`COACH_PLACEMENT_CHALLENGE_IDS`) is
  a different instrument and is untouched.
- **Verdict** _pending_

### onboarding intake: three optional questions before the quiz

- **Claimed** 2026-09-12 · **Flips** 2026-09-16 by scheduled task, after the
  105 verdict and only if that claim was not extended · **Read** 2026-09-30
  (flip + 14 days; ~28 first-run viewers a day, so n ≈ 390).
- **Change** three OPTIONAL questions in front of the placement quiz, for
  first-run users on the Learning Path tab, behind `onboardingIntake` (off):
  what brings you here (an interview / job-ready / SQL in general), by when
  (a date), and what you do (six fixed roles). Every step has a skip; skipping
  all three is a completed intake and nobody is asked twice. Each answer lands
  in the store that already owns it — the goal writes the intent key the
  post-solve ask writes (`sqlquest_user_intent`, so the Interview door and
  every event's `intent` stamp agree) and the Coach goal it maps to
  (`interview-prep` / `analyst-day-one` / `fundamentals`), stamped
  `coachState.source = 'intake'`; the date goes to `prepTarget.date`, the
  countdown card's own store, and is shown back as "🗓 N days left" on the
  Coach radar panel; the role goes to `userGoals.role` as a key. A skipped
  goal still gets the one-question ask after the first solve, as today; an
  answered one gets the same `applyIntentRouting` the modal would apply, at
  the same moment — after the first solve, never before it, and tagged
  `source='intake'`. Pure half `src/utils/onboarding-intake.js`, 40 tests
  and source guards in `tests/onboarding-intake.test.js`, smoke step in
  `scripts/smoke-test.js`. P0-1 on the founder's 2026-09-12 list; the goal is
  optional by the founder's instruction.
- **Why** the goal was collected in three places and none of them before the
  quiz (the post-solve ask, the Coach picker, the mentor chat — dead
  `FIRST_RUN_GOALS` sat next to the quiz and rendered nowhere); the date
  existed only behind `interviewCountdown`; the role was free text from a
  chat. Of the people who answer the post-solve ask, 73% declare a hiring or
  learning intent (60 days to 09-12: interview 98, job_ready 98, learning 83,
  "just exploring" 103 people), and the product asks them only after they
  have already been routed by a quiz that knows nothing about it. The
  landing pages promise a Coach that knows the goal; P0-4 made the Coach page
  show one; this is where it comes from for a new person.
- **Metric** `intake_funnel` (docs/agent/metrics.md): of the people shown the
  intake, the share who answer the goal (not skipped), the date, the role,
  and who complete it. **Guardrail** `first_run_reach`: of first-run shell
  viewers (`coach_tab_viewed shell='first_run'`, first per aid), the share
  with a `first_challenge_started` within 24h — the intake sits exactly on
  this stretch. Second guardrail `cold_first_solve_rate`, both arms, split at
  the flip timestamp.
- **Baseline** `first_run_reach` **56.7%** (444 of 783 first-run viewers, 28
  days to 2026-09-12; 30.9% solve within 24h; 217 viewers in the last 7).
  The intake events are structurally 0 until the flip; the flip's deploy
  timestamp is their birth.
- **Target** (i) ≥ **50%** of people shown the intake answer the goal, at
  n ≥ 150 shown; (ii) `first_run_reach` in the 14 days after the flip
  ≥ **52%** (baseline − 5 points) at n ≥ 300 viewers.
- **Falsification, stated in advance:** goal answered < 30% → the question
  is not wanted at the door; move the ask back to after the first solve (the
  modal exists) and keep the record format. `first_run_reach` < 47% (−10)
  while the warm arm of `cold_first_solve_rate` is flat → the intake costs
  first contacts; take it off the start screen the same day, whatever the
  answer rate. 47–52% → inconclusive, extend to 2026-10-14, change nothing.
  Both conditions met → keep; the next question is whether an intake goal
  changes what people do after the first solve (Interview-tab reach by
  `reason='intent'`), which is the 10-13 intentRouting read's to answer.
- **Guardrails, and what this must not be used for** the goal is never a
  step toward checkout — the block renders nothing about Pro, by test — and
  an intake-mapped Coach goal is not a chosen one: the 11-24 goal split
  under `paywall_ask_efficiency` must exclude `coachState.source='intake'`,
  or the "every payer had set a goal" marker is manufactured exactly the way
  the goal-setting entry below warns against. `goal_selected` /
  `goal_picker_shown` are untouched (the intake fires neither), so the Coach
  page claim's picker secondary keeps its meaning; but from 09-16 that
  claim's denominator (full shell, hasGoal) gains intake goals —
  `coach_tab_viewed` now carries `goalSource`, split on it. 105's seat is
  after the intake and its activation is per opener, so it cannot move for
  a reason that lives here; `first_contact_share` can, if fewer people reach
  any opener — that is what `first_run_reach` is for.
- **Confounds** flips three days after `intentRouting` (09-13), and both
  feed the Interview tab: separated by `intent_routed.source` ('ask' /
  'intake') and `interview_tab_viewed.reason`; the 10-13 read must split by
  source. The 09-29 cold-start read is untouched by construction: a
  deep-linked challenge opener never sees the start screen, and the
  cold-start dialog is unchanged. Guest continuity (09-26): an intake record
  rides the guest blob into the account like any other field.
- **Verdict** _pending_

### the Coach page shows the goal, the step, the challenge and the radar

- **Claimed** 2026-09-12 · **Read** 2026-09-26 (14 days).
- **Change** the full-shell Coach now carries what the landing mockup
  (`scripts/coach-mock-snippet.html`, embedded in `/after-the-sql-course/`
  and `/after-bootcamp/`) has promised since 09-07: a **step counter** ("Step
  N of M", exact for curriculum steps, absent for the synthetic placement /
  preview / mock steps); the next step **named** — the challenge or lesson
  title, a difficulty chip, up to three topic chips and the bank's own
  `xpReward` — where the card used to say "Challenge"; an **up next** line
  showing the following curriculum step, display only; and a **9-axis radar
  panel** with archetype, overall, weakest three, streak, solves and XP, read
  from `weaknessTracking.skillLevels` (already computed on every solve —
  nothing calls the expensive recompute; 1,179 people render this tab). The
  mockup's invented "~4 min" became the XP chip the live card actually shows.
  **Display only:** the engine call, `handleCoachStepStart`, the hard-preview
  stamping (`openedFrom='preview_coach'`) and the locked-step branch are
  untouched, and `tests/coach-page.test.js` fails the build if any of them
  move. P0-4 on the founder's 2026-09-12 list.
- **Why** the ad showed a product the tab did not have. Live before this: a
  typed card, a percentage, no counter, no name, and no radar anywhere in the
  shipped app except Profile → Skills (the header mini-radar sits inside the
  dead legacy nav and never renders). Measured over the 14 days to 09-12:
  **25 people saw the full Coach with a goal** (68 viewer-days); **16 (64%)
  opened a challenge or lesson the same day** — a proxy, because the click on
  the card itself was never recorded.
- **Metric** `coach_page_take_rate` (docs/agent/metrics.md): people with
  `coach_step_started` ÷ people with `coach_tab_viewed` shell=full,
  hasGoal=true, same day. Secondary: `goal_selected` ÷ `goal_picker_shown`,
  which this change does not touch — a move there is mix or the radar
  changing picker behaviour, and either way is to be said, not banked.
- **Baseline** the event is structural 0; the proxy is 16/25 = 64%.
- **Target** ≥ **60%** of full-with-goal viewers take the card's step the
  same day, at n ≥ 20 viewers. Below 20, UNREADABLE, extend.
- **Guardrails** `preview_open_to_solve` (09-20 read) keeps its mechanism:
  the preview offer is still the only path that stamps `preview_coach`. The
  first-run shell is untouched, so `first_contact_activation` cannot move.
- **Falsification, stated in advance:** < 40% → naming the step is not what
  was missing; the card is not what people take even when it says what it
  is, and the next move is the first-run shell (where most Coach viewers
  are), not more of this. 40–60% → inconclusive, extend to 2026-10-10,
  change nothing. Picker conversion moves ≥ 10 points either way → say so
  and read the radar's effect on goal choice before crediting anything.
- **Confounds** ships the evening before the 105 read (full shell only; the
  first-run shell is the read's surface and is untouched). `intentRouting`
  flips 09-13 on the same returning population. The countdown card
  (`interviewCountdown`, after 09-20) will render on this tab below the
  radar panel; that is its own claim. **Added 2026-09-12:** the onboarding
  intake (above) flips 09-16 and maps a Coach goal for new people who answer
  it, so from that day the full-with-goal denominator holds goals nobody
  chose on the picker; `coach_tab_viewed` carries `goalSource` — read the
  picker goals and the intake goals as two rows. A date set at the intake
  also adds a small "days left" chip to the radar panel's stats line.
  **Added 2026-09-12 (evening):** "the Coach stops asking twice" (above)
  flips 09-27, the day after this read closes, and changes what the first
  step is for quiz-placed people; nothing about it is live during this
  window.
- **Verdict** _pending_

### anonymous progress survives the reload and follows the login

- **Claimed** 2026-09-12 · **Read** 2026-09-26 (14 days), and the 30-day
  returning-solver number again at the O1 day-30 read on 2026-10-09.
- **Change** three things, one module. A browser keeps one guest identity
  (`localStorage.sqlquest_guest_user`); `startGuestMode` resumes it from the
  LOCAL blob when it holds progress and was active in the last 90 days,
  else mints a fresh one. Login folds the guest blob into the account before
  the session loads (`mergeGuestIntoAccount` → `src/utils/progress-merge.js`,
  a pure union: the account wins identity, money and every scalar it holds;
  collections union; XP only for solves the account did not have; idempotent).
  The auth-modal register path carries the blob the same way — until now it
  wrote `xp: 0, solvedChallenges: []` and lost every solve; only the
  post-solve prompt carried progress. Events: `guest_resumed`,
  `guest_progress_merged`, `signup_completed.carriedSolves`. 22 unit tests
  and source guards in `tests/progress-merge.test.js`. Verified in the local
  preview: solve 91 as a fresh guest, reload `/app/` plainly → same
  `guest_*` name, 210 XP in the header, the solve kept, no quiz.
- **Why** every page load minted `guest_<Date.now()>` and reset the state
  (objectives.md: 4,989 guest rows that were page loads, not people), and
  `loadUserSession` replaced state wholesale on login, discarding whatever a
  guest had in hand. Measured 2026-09-12 over 30 days, people by `aid` with
  `isGuest=true`: **265 guests solved at least one challenge; 30 of them
  solved on two or more distinct days, 9 on three or more** — every one of
  those returns started from the placement quiz with zero solves. P0-3 on
  the founder's 2026-09-12 list; the only item on it with no read-calendar
  conflict.
- **Metric** `guest_continuity` (docs/agent/metrics.md): `resumed_people`,
  `merges_with_solves`, `signups_carrying_solves` since the deploy; and the
  30-day count of guests solving on 2+ distinct days, which is the number
  this should move.
- **Baseline** structural 0 for the three events. Returning guest solvers:
  **30 / 30 days** (2+ days), 9 (3+ days).
- **Target** by 09-26: `resumed_people` ≥ **30** in 14 days (returning
  browsers with progress, whether or not they solve again), and
  `merges_with_solves + signups_carrying_solves` ≥ **5**. By 10-09: guests
  solving on 2+ distinct days ≥ **45 / 30 days** (from 30).
- **Guardrails** `first_contact_activation` must not move — structurally it
  cannot (a first contact is an aid's first open, which a resumed browser
  already had; noted on the 105 claim as confound iii). The 09-19 "users
  writes restored" read counts rows, not fields; the register path still
  writes one row.
- **Falsification, stated in advance:** `resumed_people` < 10 in 14 days →
  the returning population was smaller than the row count implied and the
  rows were bounces; keep the change on correctness grounds (a reload must
  not erase work) and stop expecting a retention effect from it. 2+-day
  solvers flat at 10-09 with resumes ≥ 30 → keeping progress does not bring
  people back to solve; the return is driven by something upstream (email,
  habit), not by state. Any `guest_progress_merged` with `newSolves` > 0
  followed by a login whose record lacks those solves → the force-save is
  not landing; read `postgres_logs` before anything else.
- **Confounds** ships the evening before the 105 read closes (returning
  browsers only; first contacts untouched by construction). The 09-13
  `intentRouting` flip lands the next day on the same returning population;
  `guest_resumed` is not conditioned on intent, so the two are separable by
  `intent_captured`.
- **Verdict** _pending_

### users writes restored: the referral trigger blocked every registered save for four days

- **Claimed** 2026-09-12 · **Read** 2026-09-19 (seven days of restored
  writes), and again inside the O1 day-30 read on 2026-10-09.
- **What broke** `20260908b_referral_codes_are_assigned.sql` was applied
  2026-09-08 08:53:32Z. Its last lines revoke EXECUTE on `gen_ref_code()`
  from `anon`, and it installs a SECURITY INVOKER `BEFORE INSERT` trigger on
  `public.users` that calls that function. Every client save is a PostgREST
  upsert sent with the anon key; upserts fire BEFORE INSERT triggers; so
  every non-guest write failed with `permission denied for function
  gen_ref_code` — 1,103 times on 09-08, 40–115 an hour every hour since.
  Guests skip the loop, so guest rows kept flowing and the tables looked
  like a quiet week. Reproduced 2026-09-12 with a rolled-back insert as
  `anon`: `users_assign_ref_code() line 9 at assignment`.
- **Blast radius, measured 2026-09-12 10:40Z** last successful registered
  write 2026-09-08 08:53:26 — six seconds before the first failure. Since
  then 0 registered rows created or updated. 36 people completed the signup
  form and were told "Your XP, streak, and solves are saved to your account"
  with no row written: `supabaseFetch` returns `null` on a 403, and
  `_flushCloudSave` read `null` as success, so `saveUserData({ force: true })`
  — whose contract is "throws on failure" — resolved. 57 registered accounts
  were active, 27 of them solving; none of it reached the cloud. 12 logins.
  0 purchases in the window against ~0.3 expected at the 30-day rate, so
  money is not readable here.
- **Change** database:
  `20260912100000_ref_code_trigger_must_not_block_user_writes.sql` — grant
  `anon` EXECUTE on the generator, make the trigger SECURITY DEFINER, and
  wrap its loop so any failure yields a row with a null code instead of no
  row. Applied by the founder with `supabase db query --linked -f …` (the
  agent's write was stopped by the permission classifier; the agent wrote
  the file and the probe). Client, same day: `supabaseFetch` gains
  `throwOnError`, `_flushCloudSave` passes it so a rejected write comes back
  as `{ ok: false }`; `created_at` is dropped from the upsert payload
  (merge-duplicates was overwriting it on every save). Guard:
  `tests/cloud-save-contract.test.js`.
- **Metric** two daily counts, internal accounts excluded: registered rows
  whose `updated_at` falls on the day (`users`, `username not like
  'guest%'`), and people completing signup who have a `users` row within
  five minutes (`signup_completed` by aid, joined to `users` on the
  `newUsername` in metadata).
- **Baseline** 09-09..09-12: 0 and 0 per day. The week before the break,
  09-01..09-07: 4–17 registered rows/day, 5–9 signups/day.
- **Target** within one hour of apply, a registered `updated_at` newer than
  the apply time exists. By 09-19, ≥8 registered rows/day and ≥5 signups/day
  with rows — back inside the pre-break band.
- **Applied 2026-09-12 ~10:58:30Z** by the founder. Verified within minutes:
  the `anon` probe now reaches its own RAISE (the insert passes the trigger;
  no probe row left behind); `gen_ref_code` ACL carries `anon=X`;
  `users_assign_ref_code` is SECURITY DEFINER with `search_path=public`; the
  last `permission denied` in `postgres_logs` is 10:58:12Z after 202 in the
  preceding two hours; the first registered write in four days landed at
  10:58:46Z, 34 seconds after the last error. The first-hour target is met.
- **Falsification** still 0 an hour after apply → the fix is insufficient;
  look at RLS on `users` and the postgres error log before anything else.
  Signups-with-rows under 3/day across the week → a client path is still
  lying; read `feedback` verbatims and `postgres_logs` severity ERROR before
  touching paywall or traffic work.
- **Recovery** automatic for anyone who returns on the same browser: the
  client sends the whole `data` blob, so the next save re-creates or catches
  up the row. Anyone who signed up on one device and logged in on another
  has no account, and the 36 cannot be written to — no row, no email.
- **Effect on other reads** the 09-13 105-opener read uses `pro_events`
  only and is unaffected. O1's day-0 baseline (2026-09-09) was measured
  inside the outage; treat 09-08 08:53Z → apply as a hole in the signups
  column at the day-30 read, and say so there.

### validate AI-generated SQL: a non-brand answer door with a practice handoff

- **Claimed** 2026-09-09. The page is new, so its baseline is zero by
  construction. In GSC's 90-day exact-query filter, `validate ai generated
  sql` had **0 impressions and 0 clicks** before publication.
- **Change** publish `/blog/validate-ai-generated-sql/`: a seven-check,
  source-backed workflow with three SQLite-tested queries, one named practice
  handoff repeated at the worked example and close, three contextual SQLQuest
  links, and one tracked,
  editorial SQLQuest → ClaudeQuest link. `/blog/` and
  `/sql-for-the-ai-era/` link back to it in the same change.
- **Why** 81% of search clicks were still branded at the 2026-09-08 traffic
  read. This page answers a task-shaped, non-brand query close to the product's
  actual value: detecting when plausible SQL is wrong. It is a search and GEO
  door first, not a claim that editorial traffic will convert like practice
  traffic.
- **Metric** GSC impressions and clicks for the page/query cluster, plus
  `blog_practice_exit` for attributed app opens and first solves. Identity and
  exclusions follow that metric's existing definition. The practice events are
  `cta_practice_validate_ai_sql_mid` and
  `cta_practice_validate_ai_sql_end`; the CTA source is
  `validate-ai-generated-sql`; the cross-product event is
  `editorial_claudequest_click`.
- **Index check** 2026-09-16. Not indexed means a discovery/distribution
  failure, not a content verdict.
- **Read date** 2026-10-07, 28 days after publication.
- **Target and falsification:**
  - **0 non-brand impressions** by day 28 → acquisition/query hypothesis
    falsified. Do not clone or translate the page.
  - **1–29 impressions** → `UNREADABLE`; reread on day 56.
  - **≥30 impressions** → read CTR, average position and actual query match.
  - Once **≥30 attributed app opens** exist, **<5% first-solve** means the
    handoff failed; **≥9%** holds the existing editorial baseline.
  - **Amended 2026-09-09, before any data exists**, because the band between
    those two numbers had no verdict and a 7% result would have left the claim
    unresolved. **5–9% → the handoff works and is no better than the blog
    average.** In that case the page keeps its place on search and GEO grounds
    alone; do not cite it as evidence that editorial traffic converts, and do
    not build the next two articles on that premise.
  - **Expect `UNREADABLE` on the handoff side at the 10-07 read.** Every post
    under `/blog/` together produced **46 arrivals in 90 days** (measured
    2026-09-09, `door_solve_rate` by arrival door). One article reaching 30
    attributed app opens in 28 days would be roughly twice the entire blog's
    current rate. The impressions side already has its 1–29 → UNREADABLE rule;
    the solve-rate side needs the same discipline, so do not read a 3-of-11 as
    a percentage.
  - A verified AI citation or an `ai:*` arrival is a separate GEO success
    signal. It does not replace GSC evidence.
- **Risk if wrong** is bounded: one new article, two internal discovery links,
  and one contextual cross-product link. Removal is a page-and-links revert;
  no product or paywall behavior changes.
- Full publication decisions and checks:
  `docs/reads/validate-ai-sql-publish-decisions-2026-09-09.md`.

### blog posts get a real exit: one named challenge, at the moment the idea lands

- **Claimed** 2026-09-08 — built and tested; ships with the next static-page
  deploy. No flag: it is HTML on 21 pages, live the moment `public/` publishes.
  The deploy timestamp dates every event here.
- **Change** every post under `src/blog/` now ends its core idea with a link to
  **one named challenge that exercises exactly what the post just taught**, and
  repeats it in the closing card with a single secondary "keep going" link (a
  topic page, the `/challenges/` hub, or the matching track). Two exits per
  post, no more. Ten short posts already had a specific-challenge link before
  the FAQ tail — those kept their position, gained a unique `data-track`, and
  three had their challenge corrected (`where-vs-having` pointed at GROUP BY
  Basics, which contains no HAVING; `sql-anti-join` and
  `row-number-vs-rank-vs-dense-rank` pointed at challenges one rung off their
  subject). Eleven long posts had **no** specific exit at all and now have two.
  Nothing any post teaches was changed; no price is quoted; no challenge count
  was added anywhere `tests/site-counts.test.js` binds.
- **Why** the practice pages convert five to twenty-five times better than the
  posts, and the difference is what the reader is handed at the end. Measured
  2026-09-08 over 30 days: `sql-exercises` 360 visitors → 94 solved (26.1%),
  `sql-interview-prep` 25.0%, `learn-sql` 21.4% — against
  `blog/faang-sql-interview-guide` 8.3%, `blog/sql-for-fraud-analytics` 5.0%,
  `blog/sql-cte-tutorial` 3.8%, `blog/null-handling-mistakes` **0.0%**.
  `door_solve_rate` reads the same thing from the app side: blog brought 37
  arrivals in 28 days and 5% of them solved. The posts rank and bring readers;
  a reader who has just understood one idea was being handed a homepage.
- **Metric** `blog_practice_exit` (docs/agent/metrics.md), distinct people by
  `COALESCE(aid, username)`. **Baseline**, the four posts above, 30 days to
  2026-09-08: **171 readers, 8 solved, 4.7%**; `took_an_exit` is **0 by
  construction** — the events are born with this change.
- **Read date 2026-10-08**, over the 30 days from the deploy.
- **Target.** Three rungs, in order:
  1. **≥ 40 `cta_practice_*` clicks from ≥ 30 distinct browsers** across all 21
     posts. A plumbing check, not a hypothesis: if it misses, the exits are not
     being seen and the finding is about placement, not about readers.
  2. **The four baseline posts, combined, ≥ 9% view-to-solve** — roughly 16 of
     ~170 rather than 8. Sized as a doubling of 4.7% that still lands at about a
     third of the practice pages' 25%, because a blog reader arrived to read and
     a `/sql-exercises/` visitor arrived to practise. Predicting parity would be
     predicting that the exit changes the intent, which it cannot.
  3. **≥ 6 people solve the specific challenge their post's exit points at**,
     within 7 days of the click, joined by `aid`. This is the rung that says the
     exit did the work rather than something else that moved in the same month.
- **Risk if it is wrong**: two extra links per post on 21 pages. The pages are
  otherwise unchanged, so a revert is a revert of this diff. The live risk is
  editorial, not technical — a post that reads like an ad break loses the
  readers it currently keeps. That is why the count is capped at two and why the
  mid exit is a single inline line, not a card.
- **Falsification, stated in advance:**
  - **≥ 40 clicks, view-to-solve inside noise of 4.7%** → the exit is not the
    bottleneck; the reader clicks, arrives inside a challenge, and stops there.
    The next move is the first thirty seconds in the editor, **not** a third
    exit and not louder copy. Verdict `FLAT` on rung 2 with rung 1 met.
  - **Fewer than 15 `cta_practice_*` clicks in 30 days across all 21 posts,
    while `landing_view` on those posts is unchanged and `cta_blog` — the nav
    button, deliberately untouched by this change — is also near zero** → **the
    exit was never the problem.** Two exits per post, one of them at the exact
    moment the idea lands, in front of several hundred readers, producing under
    fifteen clicks is not a placement failure: it is an audience that came for
    the answer, got it, and left. Pre-registered so that outcome cannot be
    re-described afterwards as "wrong wording" or "wrong challenge". The move
    then is to stop treating blog readers as a practice funnel — measure the
    blog on impressions and rankings, put the effort into the pages whose
    readers already arrive wanting to practise — and **not** to add a third
    exit.
  - **Under 15 clicks but `cta_blog` is healthy on the same pages** → the
    opposite reading: readers do click, just not these. That is placement or
    copy, and the exits move or get rewritten.
  - **The four posts' rate rises and their `landing_view` count rises with it**
    → a traffic-mix move. Blog traffic is search-driven and seasonal; check the
    per-page split and the query mix before crediting anything. `UNREADABLE` if
    the mix moved materially.
  - **Only `blog/sql-for-fraud-analytics` and
    `blog/capital-one-codesignal-data-analyst-assessment` move** → those two
    point into the `finans_fraud` card ledger, which has its own live claim and
    its own content shipping. Confounded; do not credit the exit.
  - **`content_lock_reached` rises on the `blog-recursive` door** → the one
    deliberately Pro exit (challenge 81, the only recursive CTE in the bank) is
    functioning as a wall. Repoint it at 179 regardless of every other number.
  - **Any post stays under ~30 readers in the window** → `UNREADABLE` for that
    post on its own; it is only readable inside the four-post total.

#### Cohort B — the comparison pages get the same exit

- **Added 2026-09-08**, the same day the claim above was made and before either
  cohort had produced a single event. This is an extension of an unread claim,
  not an edit to a measured one; nothing above was changed.
- **The two cohorts are read separately, and their numbers are never pooled.**
  A tutorial reader arrived to understand one idea; a comparison reader arrived
  to decide between products and is mid-decision when the exit appears. Same
  button, two different questions, and no reason to expect them to move
  together — so cohort A's rungs stay blog-only (`page LIKE 'blog/%'`) and
  cohort B has its own baseline, its own rungs and its own verdict. A
  `cta_practice_*` count taken with no page filter is now a mix of both and is
  a reading of neither.
- **Change** — six pages (`vs-datalemur`, `vs-stratascratch`, `vs-leetcode-sql`,
  `sql-practice-comparison`, plus the two siblings `vs-hackerrank-sql` and
  `best-sql-practice-sites`) each gained **one mid-page exit at the point the
  argument resolves** — after the wrong-answer code demo, after the "5 things"
  grid, after the decision tree, after the final verdict — and **one in the
  closing card**, plus a single secondary link to the topic page or hub that
  fits. Both exits on a page point at the **same named free challenge**; each
  carries its own `data-track`; each uses the page's **existing** `?src` door,
  so no new door series was invented. Purely additive: **66 lines inserted, 0
  deleted** across the six files. No competitor figure, no price, no count and
  no existing link was touched — including the four pre-existing untracked
  `/app/?src=` links, which are deliberately left as the control.
- **Page → challenge**, one line of reasoning each; all six free, all six
  distinct, none of them the target of a cohort-A exit so that "did anyone
  solve the challenge this page pointed at" stays attributable:
  `vs-datalemur` → **106** (its near-miss, `COUNT(*)` giving 1 where 0 is
  right, is the exact shape of the diagnostic this page demos);
  `vs-stratascratch` → **51** (a percentage-per-group question of the kind
  their Premium bank is bought for, free here, and its wrong answers —
  integer division, no rounding — are what a "here is the expected table"
  platform cannot explain); `vs-leetcode-sql` → **161** (LeetCode #185's shape,
  and RANK vs DENSE_RANK vs ROW_NUMBER is the tie-handling near-miss SQL
  specialisation can actually name); `sql-practice-comparison` → **144** (the
  quickest in the set, for the least-committed reader on the page with the most
  traffic and the second-worst open rate); `vs-hackerrank-sql` → **113** (the
  pivot pattern a certificate does not test and an interview does);
  `best-sql-practice-sites` → **157** (WHERE-vs-HAVING, the most common
  intermediate error, whose near-miss is a wrong row set rather than a wrong
  number).
- **Metric** `blog_practice_exit`, cohort B (docs/agent/metrics.md), distinct
  people by `COALESCE(aid, username)`, `page` in the four slugs.
  **Baseline**, 30 days to 2026-09-08, measured before any exit existed:
  `sql-practice-comparison` 123 → 12, `vs-datalemur` 44 → 4,
  `vs-stratascratch` 41 → 5, `vs-leetcode-sql` 39 → 1 —
  **247 readers, 22 app opens, 8.9%**, against 74% on `/sql-exercises/`.
  Of the openers these pages do send, **42-50% go on to solve**, at or above
  `/sql-exercises/`'s 35%: the reader is not the problem, the page never
  invited them. `took_an_exit` is **0 by construction**.
  `vs-stratascratch`'s row is reconstructed by subtraction (it was below the
  cut of the printed table) — re-measure it directly rather than quoting it.
  The two siblings are outside the denominator: `vs-hackerrank-sql` has **no**
  pre-period row at all (verdict `UNDEFINED` for that page, never `FLAT`), and
  `best-sql-practice-sites` was already at **58 of 188 (31%)**, the best of the
  family, so counting it here would flatter the change with a page that
  already worked.
- **Read date 2026-10-08**, the same as cohort A, over the 30 days from the
  deploy.
- **Target.** Four rungs, in order:
  1. **≥ 20 `cta_practice_*` clicks from ≥ 15 distinct browsers** across the
     four pages. Plumbing: 15 of 247 readers is 6%, and a miss means the exits
     are not being seen.
  2. **The four together, ≥ 16% landed → opened**, roughly 40 of ~247 rather
     than 22. A doubling, which still leaves them at a fifth of
     `/sql-exercises/`'s 74%, because a comparison reader arrived to decide and
     not to practise. **This rung is not independent of rung 1** — the exit
     links straight into `/app/`, so clicks mechanically produce opens. It is
     the size check, not the hypothesis.
  3. **The openers' solve rate holds at ≥ 40%** while that volume rises. This
     is the rung that can actually fail: if the extra people the exit sends in
     solve at half the rate of the ones who used to arrive unprompted, the exit
     manufactured clicks rather than practice, and rungs 1-2 mean nothing.
  4. **≥ 6 people solve the specific challenge their page pointed at**, within
     7 days of the click, joined by `aid`.
- **Risk if it is wrong**: three added links per page on six pages, all
  additive, so a revert is a revert of this diff. The editorial risk is larger
  here than on the blog: these pages earn their traffic by being an honest
  comparison that concedes when the competitor wins, and a reader who smells an
  ad break stops believing the concessions too. That is why the mid exit is one
  quiet outline button and a line of grey text rather than a card, why the
  count is capped at two, and why nothing in the added copy states a count, a
  price or anything at all about a competitor.
- **Falsification, stated in advance:**
  - **Rungs 1-2 met, rung 3 collapses below ~25%** → the exit is sending in
    people who were never going to practise. The invitation is doing volume,
    not work. The move is to change *which* challenge each page points at
    (shorter, or free-er, or closer to the argument) — **not** to add exits.
  - **Fewer than 8 `cta_practice_*` clicks in 30 days across the four pages
    while their `landing_view` is unchanged** → the exit is not the missing
    piece for a comparison reader. Pre-registered so it cannot later be
    re-described as "wrong challenge" or "wrong copy": a reader who has just
    read a verdict, is offered one named question, and does not take it in
    front of ~250 readers is telling us the page's job ends at the verdict.
    The move then is to stop treating comparison traffic as a practice funnel.
  - **Clicks are healthy but the four pages' `app_opened` from their own doors
    does not rise** → the exit cannibalised the untracked hero/closing buttons
    rather than adding anyone. Same people, better instrumented. `FLAT`, and
    the honest report is that we learned what the existing CTAs were worth.
  - **Only `best-sql-practice-sites` moves** → confounded. It was at 31% before
    this change and is outside the cohort; it must never be used to carry the
    cohort's verdict.
  - **Any of the four stays under ~40 readers in the window** → `UNREADABLE`
    for that page alone. `vs-leetcode-sql`'s entire pre-period is one app
    opener, so it has no readable per-page verdict at any outcome.

### interview countdown: a company, a date, and a plan between now and it
- **Claimed** 2026-09-08 — built, tested and merged to `main`; **NOT LIVE**.
  Ships behind `FEATURE_FLAGS.features.interviewCountdown = false`.
- **The flag flip is part of this claim.** The card renders at the top of the
  Interview Prep tab and sends people into the same free/Pro challenge boundary
  the open "paywall surfaces" claim below is reading until **2026-09-20**. One
  surface, one change at a time (docs/data-driven-product.md P7). The flip
  lands **after** that read, and the deploy timestamp of the flip is what dates
  every event here — not the merge, not `min(created_at)`.
- **Change** a card (never a modal): pick a company, pick a date, get back a
  readiness number **with its three parts shown** and today's list of work. It
  shipped at the top of the Interview Prep tab on 2026-09-08 and moved to the
  Coach the same day — see the amendment below. Logic is pure and tested —
  `src/utils/interview-prep.js`, `tests/interview-prep.test.js`, 93 tests
  (83 at the merge; the Coach move and the archetype change added the rest).
  EN + TR. The target date is a plain preference (browser mirror + the user
  record); no new network call, and no event carries the date.
- **Nothing here predicts an interview outcome.** The number is progress
  through our own material: coverage of the target's own 10 challenges (0.45),
  the radar weighted by what that set demands (0.30), and the timed mock
  (0.25, reallocated rather than zeroed when the mock has not been sat, so a
  free user is not capped at 75 by a paywall). Nobody has ever told this
  product whether they got a job, so a pass probability has no data behind it
  and is not offered. A source guard in `tests/interview-prep.test.js` fails
  the build on prediction words in either language, and was mutation-verified.
- **Only one company is offerable, and it is computed — from editorial input.**
  **AMENDED 2026-09-08, same claim, no change to the target or the read date.**
  The third conjunct used to be a computed exclusivity share: ≥ 0.9 of the
  dataset's company tags had to be the target's. That is a proxy, and it
  punished the honest case — the card ledger is the shape of *every* card
  issuer's analyst screen, so co-tagging those ten challenges for a second
  issuer took Capital One to 0.5 and dropped **both** companies out of the
  flow. It is now an **archetype**: a written, dated, signed claim in
  `src/data/interview-archetypes.js` that a dataset is shaped like a particular
  kind of company's screen, with named members and a checklist for adding one
  (a citable, dated source for the screen format; a confirmed data-shape match;
  the page section). `eligibleTargets` asks three things — is the company a
  **declared member**, does a mock keyed to its exact name run on the
  archetype's dataset, are ≥ 8 challenges on that dataset tagged for it — and
  Capital One clears all three (`card-payments-analyst`, `finans_fraud`, 10
  challenges). The other 22 tagged companies are members of nothing and are
  refused. A tag can never grant membership, and a member whose content has
  gone missing now fails the **build** (`archetypeProblems`) instead of
  dropping out of the picker in silence. The registry is asserted at exactly
  one archetype and one member, so adding a second is a reviewed diff — and it
  is the thing that would fire the "a second value in `company`" trigger below.
- **Why** both payers we can name were preparing for one company. The content
  for it shipped 2026-09-07 and the way in did not exist: no date anywhere in
  the codebase, the company chip buried among the difficulty filters, and a
  goal picker with three goals and no company in it.
- **Metric** `interview_prep_funnel` (docs/agent/metrics.md) — distinct people
  by `COALESCE(aid, username)`: `reached_card` → `set_a_target` → `saw_a_plan`
  → `opened_an_item`. **Baseline 0 on all four, structurally**: the events do
  not exist before the flag flip.
- **THE BIGGEST RISK IN THIS CLAIM WAS DISCOVERY, NOT THE CARD. IT IS NOW
  RESOLVED — see the amendment below.** `showLegacyPrimaryNav` is hard-coded
  `false` in `src/app.jsx`, so the shipped primary nav is two tabs and
  `activeTab === 'trials'` is reachable only via the `?interview=<id>` deep
  link on the company pages and the onboarding `goal === 'interview'` branch.
  Measured 2026-09-08, shared filters: **22 accounts in the product's whole
  history carry any `interviewHistory` row**, and the tab has never had an
  impression event. `prep_readiness_shown` is the first measurement this
  surface has ever had. **A decision was owed before the flip**: either restore
  the Interview Prep nav entry, or move this card to the Coach tab (965 people
  viewed it in the 31 days to 2026-09-07). Flipping the flag without making
  that decision would produce an `UNREADABLE` verdict by construction, and that
  outcome would be the process failing, not the feature.
- **Target — SUPERSEDED 2026-09-08, kept here because a claim is not edited
  away.** In an 18-day window ending on the read date: ≥ 10 people reach the
  card, ≥ 4 of them set a target, ≥ 2 open something from the plan. Its own
  text conceded the problem: *"Against the tab as it stands today, 17 accounts
  have ever reached the interview surface at all, so the honest prediction
  without a nav change is 0-2 and ≥ 10 is not achievable."* **That target was
  written for a surface nobody could reach.** It is not a target, it is a
  prediction of an `UNREADABLE`, and it is replaced below.

- **AMENDMENT 2026-09-08 — the surface changed, so the target and the
  falsification are re-sized against the Coach.** Same claim, same flag, same
  read date; a second claim would double-count one feature.
  - **What changed.** The card moved out of the Interview Prep tab and into the
    Coach, below the next-step card and above the Pro strip. The nav entry was
    **not** restored — that reverses a deliberate onboarding decision and was
    explicitly not on the table. Both existing doors into the trials tab (the
    `?interview=` deep link, the onboarding `goal === 'interview'` branch) are
    untouched and guarded by tests. The Coach also gained an offer of its own:
    a `mock_interview` step type (`src/utils/coach.js`, `pickMockInterviewStep`)
    that surfaces the timed rehearsal as the Coach's next step when five
    conditions hold at once — the flag, **Pro**, a named target, the
    `interview-prep` exit criteria met at 80% of every threshold, and no
    sitting of that mock in 14 days. It is inert for everyone else, and that
    inertness is the tested invariant, not a comment: `tests/coach.test.js`
    asserts byte-identical `computeNextStep` output across a matrix of user
    states for any caller that does not opt in, and the assertion was
    mutation-verified by defaulting the flag on (2 tests fail by name).
  - **The mock is never offered to a free user, on purpose.** The Coach's
    next-step card is not a list, it is the single thing the Coach says to do
    next; a Pro wall there would *displace* a doable curriculum step rather
    than sit beside free work the way the prep card's plan rows do, and it
    would add a second `content_lock_reached` source on the surface the
    paywall-surfaces claim below is reading. It also follows a decision this
    feature already made one level down: `companyReadiness` reallocates the
    mock's weight rather than scoring an untaken Pro mock as zero, so the
    readiness number is not a paywall lever. Free users keep the path they
    have: the plan places the mock on the last planned day, and starting it
    goes through `startInterview`, which owns the one gate.
  - **New target, 18 days to the read date.** **≥ 200 people reach the card**,
    **≥ 8 of them set a target**, **≥ 4 open something from the plan.** Sizing:
    965 distinct people viewed the Coach in the 31 days to 2026-09-07;
    discounted for an 18-day window and for the first-run shell (which
    suppresses the card until the first solve), 200 is a plumbing check, not a
    hypothesis — if it is missed, the render gate is the finding. The two
    numbers that carry information are the ones after it. 155 people declared
    an `interview` or `job_ready` intent in those 31 days and 83 reached the
    5-solve evidence bar; ≥ 8 is roughly a tenth of the 18-day share of that
    83, which is the honest guess for how many are interviewing at **the one
    company on the list** rather than somewhere else.
  - **No target on `coach_step_mock_offered`.** Pro-only, five conditions, and
    three people have ever paid. A zero there is expected and is not evidence
    about anything; a non-zero number alongside a rise in
    `content_lock_reached` on the `interview` surface would mean the `isPro`
    gate is broken, which is a bug report, not a metric.
  - **Falsification, re-sized:**
    - **`reached_card` < 200** → the render gate, not the card and not the nav.
      Check the first-run-shell and guest distribution before anything else.
      Verdict `UNREADABLE` on the funnel; the finding is about the gate.
    - **≥ 200 reached, < 8 set a target** → this is the read the old surface
      could never produce, and it is now interpretable. The picker is one
      company long and that is visible on the card by design. Next move is
      content for a second target — 8+ challenges tagged on an archetype's
      dataset, a mock on it, and a written membership with a dated source —
      never widening the eligibility bar and never louder copy.
    - **≥ 200 reached, `set_a_target` at or near 0, and nothing in `feedback`
      about it** → the honest reading is that the card is noise on the Coach
      for the ~98% who are not interviewing anywhere. The move then is to make
      it conditional on declared intent (`intent in ('interview','job_ready')`)
      or to take it off the Coach — **not** to make it bigger or move it above
      the next-step card. Pre-registered so that outcome cannot be
      re-described later as a placement problem.
    - **≥ 8 set a target, < 4 open an item** → the plan is not credible or not
      actionable. Read `prep_plan_viewed.status` first; a run of `past` is a
      different bug.
    - **The Coach's own funnel moves down** — `goal_picker_shown` → `goal_selected`
      conversion falls against the pre-flip fortnight — → the card is
      displacing the Coach's primary job. Revert the placement regardless of
      the prep numbers. The Coach is the surface 1,179 people see; it is not
      ours to spend.
    - **`opened_an_item` concentrated on `kind='mock'` with a
      `content_lock_reached` spike** → this shipped as a paywall funnel. Revert
      the mock from the plan regardless of the other numbers. (Unchanged.)
    - **A second value ever appears in `company`** → content changed under the
      eligibility bar. Stop and look. (Unchanged.) **Fired 2026-09-12:**
      Revolut signed as the second member (`neobank-analyst` on
      `finans_neobank`, 12 challenges, mock `revolut-analytics-screen`).
      From that date read this funnel split by company; never sum the rows.
    - **Any prediction wording appears on the card or in the Coach offer** →
      revert immediately, regardless of the numbers. (Unchanged; the guard now
      covers the Coach offer's copy in both languages too.)
- **Guardrail** `content_lock_reached` on the `interview` surface, directional
  only: the plan's last item is a Pro mock, and a spike there would mean this
  card is functioning as a paywall funnel rather than a study plan. And
  `purchases`, directional only.
- **Read on** **2026-10-12**
- **Falsification, stated in advance:**
  - **`reached_card` < 10** → discovery, not the card, and the next move is the
    nav decision above — **not** copy, **not** the eligibility bar, **not**
    lowering the 5-solve evidence gate. Verdict `UNREADABLE`; say why.
  - **≥ 10 reached, < 4 set a target** → the picker is the barrier. Most likely
    cause, and it is visible on the card by design: the list is one company
    long, and a person preparing for anywhere else is told so honestly and then
    has nothing to click. Next move is content for a second target (8+
    challenges on its own dataset AND a mock), never widening the bar.
  - **≥ 4 set a target, < 2 open an item** → the plan is not credible or not
    actionable. Read `prep_plan_viewed.status` first: a run of `past` means
    people are entering dates that have gone by, which is a different bug.
  - **`opened_an_item` concentrated on `kind='mock'` with a `content_lock_reached`
    spike** → this shipped as a paywall funnel. Revert the mock from the plan
    regardless of the other numbers.
  - **A second value ever appears in `company`** → content changed under the
    eligibility bar. Stop and look at what changed before reading anything.
    **Fired 2026-09-12** (Revolut signed; see "Revolut membership" above):
    the change is a second archetype on a second ledger, not a change to
    Capital One's set — read Capital One's rows as before and Revolut's as a
    new series born that day.
  - **Any prediction wording appears on the card** → revert immediately,
    regardless of the numbers. That is not a metric question.
- **Confounds** (i) The flip lands days after the paywall-surfaces read closes,
  and the plan routes people into free-vs-Pro challenges — a shift in
  `content_lock_reached` across the flip has two candidate causes. (i-b, added
  2026-09-08) The Coach is also where the hard-preview offer from that same
  claim lives. The two cannot both fire — the preview rule is non-Pro only and
  the mock offer is Pro only — and the engine checks the preview first so the
  ordering holds even if a gate is relaxed. But they now share the same card,
  so any post-flip reading of the Coach's next-step card belongs to both
  claims and should be reported to both. (ii) The
  target set (ids 275-284) shipped 2026-09-07 with **0 solves by anyone**, so
  the `coverage` part starts at 0 for every user and the first fortnight of
  `bucket` measures the radar part alone. (iii) The review-ask flag is
  scheduled to flip in the same window on an adjacent surface; record which
  flipped first. (iv) The Capital One landing page also shipped 2026-09-07 and
  had 1 visitor to 2026-09-08 — any traffic growth on that door during the
  window is the page's, not this card's. (v) The ten target challenges have no
  `title_tr`, so a Turkish user reads Turkish chrome around English challenge
  titles; that is pre-existing content debt, but it lands inside this card for
  the first time.
- **Verdict** _pending_
- **2026-09-08, before the flag ever flipped: the plan had holes in it.** The
  card set grew from 10 challenges to 25 the same day, and that exposed a
  slicing bug `planToDate` had carried since it was written. It divided the
  work by a fixed ceiling — `Math.ceil(items / planDays)` — so 22 items over
  14 days filled eleven days at two apiece and left days twelve and thirteen
  **empty**, with the mock alone on the last one. Three days of nothing, in a
  plan whose entire promise is what to do before a date. It could not appear
  while the set was small: with ten challenges `work.length <= planDays` made
  every day a one-item day and the ceiling was always 1. The remainder is now
  spread over the first days, front-loaded on purpose, because the days
  nearest the decision to start are the ones a person actually has.
  Consequence for the read: `prep_plan_viewed` and `prep_plan_item_opened`
  measure a materially different artefact than they would have on 09-07. The
  same 14-day window that drew 7 items over 7 days and then stopped a full
  week short of the interview now draws 22 items plus the mock across all 14.
  Nobody saw either version — the flag has never been on — so this is a
  correction to the instrument, not a confound, and the baseline stays zero.
### review ask: give real users a way to say something in public
- **Claimed** 2026-09-07 — built, tested and merged to `main`; **NOT LIVE**.
  Ships behind `FEATURE_FLAGS.features.reviewAsk = false`.
- **The flag flip is part of this claim.** The card renders in the post-solve
  success panel, which is the same surface and the same population the open
  "paywall surfaces" claim below is reading until **2026-09-20**. One surface,
  one change at a time (docs/data-driven-product.md P7). The flag flips
  **after** that read lands, and the deploy timestamp of the flip is what
  dates every event below — not the merge, not `min(created_at)`.
- **Change** a card (never a modal, never an interruption) in the post-solve
  success panel, above "What's next", offering two doors side by side: leave a
  public review on Trustpilot, or send a private note instead (the existing
  feedback widget, preset to a `review` topic). Plus dismiss. Eligibility is a
  pure, tested function — `src/utils/review-ask.js`: 15+ lifetime solves, 2+
  distinct active days, once per browser ever, a permanent dismissal, a 7-day
  do-not-stack-asks cooldown, and never in a session that hit a paid wall.
  EN + TR. Also: the profile share link is surfaced on the same card, and the
  feedback flow gains an optional, default-off, separately-worded consent to
  be quoted (checkbox + display name + consent timestamp;
  `supabase/migrations/20260907_feedback_quote_consent.sql`, **applied —
  verified against the live schema 2026-09-08**).
- **Nothing is offered in exchange for a review** — no discount, no XP, no Pro
  days, no badge. FTC 16 CFR Part 255 and every platform's terms; a source
  guard in `tests/review-ask.test.js` fails the build if an incentive word
  reaches the copy, in either language, and was mutation-verified.
- **Why** the product has never once asked anybody anything. 318 public
  profiles auto-published, `profile_link_copied` **zero rows ever**, the
  peer-to-peer referral loop at zero personal-code rows in its whole history,
  5 rows in `feedback`. (Corrected 2026-09-08: "referral functions at zero
  events" was wrong — `referrals` holds 103 rows over 37 codes since
  2026-04-29, all of them marketing campaign codes. The *personal* half is
  what has never produced a row, and the cause is a missing column and a
  missing RPC, not apathy — see the cold diagnosis in
  `supabase/migrations/20260908_referral_personal_codes.sql`.) There is no
  third-party text about SQL Quest for Google or an AI assistant to read, and
  the AI-recommendation channel is the only one that has produced a paying
  customer (payer #2, Gemini, 2026-08-28). Related finding, measured
  2026-09-07: the share buttons on Profile → Skills have produced **zero**
  interactions of any kind — 0 `profile_link_copied`, 0 `profile_opened`, and
  0 of the 14 `radar_png_copied` rows, all 14 of which came from the
  post-solve radar toast (`surface='radar_pop'`, 8 people, 08-07..09-03).
  That is why the ask lives in the post-solve panel and not on the profile.
- **Metric** `review_ask_funnel` (docs/agent/metrics.md) — distinct people,
  by `COALESCE(aid, username)`: `shown` → `clicked_public` / `chose_private` /
  `dismissed`. **Baseline 0 on all four, structurally**: the events do not
  exist before the flag flip, and absence before it is the flag, not apathy.
- **Secondary, and the only one that is actually the point:** the number of
  reviews visible on `https://www.trustpilot.com/evaluate/sqlquest.app`'s
  public page. Baseline **0** (verified 2026-09-03: the profile is claimed and
  unfilled). Read **by hand** and recorded with that provenance — Trustpilot
  gives us no callback, and the card promises the user we cannot see who wrote
  what. `clicked_public` is an intent; it must never be reported as a review.
- **Guardrail** `feedback_failed` stays at 0 (a row there is someone who tried
  to reach us and could not), and `purchases`, directional only.
- **Target**, sized from the population rather than a wish: in an 18-day window
  ending on the read date, **≥ 25 people shown**, **≥ 4 of them take either
  door**, of which **≥ 2 click the public review**, and **≥ 1 review actually
  visible on the Trustpilot page**. Sizing: 75 people have ever met the
  eligibility rule; 45 of them solved a challenge while already eligible in
  the 18 days to 2026-09-07, which is the ceiling on `shown` for a comparable
  window (measured, shared filters, people by aid).
- **Read on** **2026-10-08**
- **Falsification, stated in advance:**
  - **< 15 shown** → the gate, not the card. Either the eligibility rule is
    too tight or wall-hitters are eating the population (a session that fires
    `content_lock_reached` can never fire this). Next move is to instrument
    the `REVIEW_ASK_REASONS` distribution and read it — **not** to rewrite the
    copy, and **not** to lower the thresholds before knowing which branch is
    firing.
  - **≥ 25 shown and 0 clicks of either kind** → people do not want to be
    asked at this moment. Next move is placement (weekly digest email, or the
    profile after a milestone), not copy. The already-asked cohort is spent —
    once-ever means there is no second attempt at these same people, ever.
  - **≥ 25 shown, ≥ 4 clicks, 0 reviews on Trustpilot after 14 days** → the
    ask is not the barrier; Trustpilot's own signup wall is. Next move is a
    destination with no account requirement, or dropping the public door and
    keeping the private one.
  - **1-3 clicks on ≥ 25 shown** → inconclusive at this n. Extend to the next
    read; change nothing. `UNREADABLE` is the honest verdict, not `FLAT`.
  - **Any incentive appears anywhere near this feature** → revert immediately,
    regardless of the numbers. That is not a metric question.
- **Confounds** (i) The flag flip lands days after the paywall-surfaces read
  closes, on the same panel — a shift in post-solve behaviour across 09-20 has
  two candidate causes and the `openedFrom`-stamped preview metric is the only
  one isolated from this. (ii) The profile share link moves onto this card in
  the same change, so a first-ever `profile_link_copied` row is attributable to
  the review card and to nothing else — which is the point, but it means the
  old profile-banner surface is not being tested. (iii) The quote-consent
  checkbox ships to the feedback widget for everyone, not only review-card
  arrivals, so `feedback_submitted` volume is exposed to it independently.
  (iv) AlternativeTo and G2 are off; if the founder lists on either during the
  window, `clicked_public` gains a destination mid-read — record the date.
  **Recorded: AlternativeTo was submitted 2026-08-27 and paid into the
  priority queue, confirmed 2026-09-08; the listing is expected live
  2026-09-09..09-15.** That is BEFORE this claim's 18-day window opens (it
  ends 2026-10-08, so it starts ~09-20), and before the flag flip, which
  itself waits on the 09-20 paywall read. So the listing is part of the
  baseline this claim is measured against, not a mid-read change — provided
  it lands on schedule. If it slips past 09-20, it becomes a live confound
  and this note must be revisited.
  (v) **The Trustpilot secondary is already contaminated, before this ships.**
  Four hand-written review invitations went out on 2026-09-07 (sab3r,
  tausif1122, luciej, supertrunker — logged under the outreach claim in
  Closed). Any review that appears on the public page during this window may
  be theirs and not the card's, and there is no way to tell: Trustpilot gives
  us no attribution and the card promises the user we cannot see who wrote
  what. So the **primary is `review_ask_funnel`**, which only the card can
  produce; the Trustpilot count is context, and a review from one of those
  four must not be credited to this change. Check the four names against the
  invitation list before reading the public page.
- **Verdict** _pending_

### paywall surfaces: lead people to the free Hard previews
- **Claimed** 2026-09-06 — commit `2bab2b2`, deployed 2026-09-06 14:17Z
  (Vercel; verified: `/app/` serves `app.js?v=a85e3aa2`, the bundle the
  23/23 smoke ran against, `preview_dialog` present)
- **Change** three entry surfaces for the six free Hard previews, none of
  which existed before (plan: `docs/plans/paywall-surfaces-plan.md`):
  (i) the Hard list pins the previews first, tags them, dims locked rows and
  carries a counts-from-bank banner; (ii) clicking a locked Hard challenge
  opens a collision catcher — the unsolved previews in curriculum order, Pro
  as a muted footer — in place of the "keep solving Easy + Medium" soft
  toast (the `companyFilter` wall branch is untouched); (iii) the Coach may
  offer the first unsolved preview as its next step, once per session, when
  an advanced radar skill is ≥ 65. Plus a win-state line per preview solved,
  the banner's 6/6 flip to "Unlock Hard", and the `content_lock_reached`
  multi-fire dedupe (2s per user+challenge). Every surface is hidden for Pro.
- **Why** the 08-21 lock read: 16 people hit a paid wall in 6 days, **15 of
  16 with all 6 previews untouched** — targeted share LOW, so moving the wall
  changes nothing until something leads people to it. Payer #2 bought "to
  unlock the harder questions". Build order fixed then: surfaces first,
  radar indicator second (separate PR), wall placement only after this read.
- **Metric** `preview_open_to_solve` — people with `openedFrom` stamped on
  `challenge_opened` (`preview_list` / `preview_dialog` / `preview_coach`)
  who then `challenge_solved` the same id. Baseline **0**: the field is born
  at ship; absence is organic by design.
- **Also** the lock-time secondary under the same metric: share of
  `content_lock_reached` people whose LAST lock in the window has
  `freeHardPreviewsUnsolved < 6`. Baseline **1/16 (6%)**. Declared
  confounded — it moves only on repeat collisions, since a first-time hitter
  is stamped before any surface could reach them.
- **Guardrail** `purchases`, directional only — single-digit n in any
  two-week window cannot carry a gate.
- **Target** ≥ **15 people** open a preview via a new surface in 14 days
  AND ≥ **40%** of them solve one.
- **Read on** **2026-09-20** (deploy + 14 days)
- **Falsification, stated in advance:** < 15 people in 14 days → the
  surfaces are not being seen: findability, not desire. Next move is
  placement / traffic, not copy. ≥ 15 people but < 25% solve → the previews
  are the wrong six (all Window/CTE cluster) → re-curate; the TODOS item
  exists. 25-40% → inconclusive, extend, no copy change.
- **Confounds** three surfaces ship in one PR; attribution lives in
  `openedFrom` only, and the lock-time secondary reads the combined effect.
  The 105-opener and grader-ordering changes ship in the same push and
  touch other surfaces (first contacts; grading across the whole bank) —
  neither can produce a stamped open, so the primary is the read; the
  secondary and the guardrail are not isolated from them.
- **Verdict** _pending_
- **Mid-window check, 2026-09-07** (day 1 of 14, not a verdict). The
  instrumentation is sound and the surfaces are being reached; nobody has
  taken them yet:
  - **The `openedFrom` stamp works end to end.** Verified against the live
    bundle with `npm run smoke` (23/23): clicking "Try this one free" in the
    catcher emits exactly one `challenge_opened` carrying
    `openedFrom='preview_dialog'` with the card's own challenge id. So the
    **zero** stamped opens in production are zero *clicks*, not lost rows —
    do not read the metric as UNREADABLE on 09-20 for want of a stamp.
  - **The catcher fires:** 8 `content_lock_reached` rows,
    `wall='preview_dialog'`, **4 people**, 09-06 14:23Z → 09-07 08:35Z. The
    old `soft_toast` branch caught 2 more people (the `companyFilter` wall,
    untouched by design).
  - **Preview opens:** 2, one each on ids 50 and 86, **both unstamped** —
    i.e. reached from the ordinary challenge list, not from any of the three
    new surfaces. The stamp is conditional on the call site by design
    (`preview_dialog` / `preview_list` / `preview_coach`), so an unstamped
    preview open is a real "found it another way", not a defect.
  - Reading of the day: 4 people saw the catcher, 0 clicked a preview inside
    it. n is far too small to act on — stated here only so the 09-20 read
    compares against a known-good instrument.
- **Mid-window check, 2026-09-08** (day 2 of 14, not a verdict). Read at
  2026-09-07 22:43Z, covering 09-06 13:42Z → now: 12 lock rows / **8 people**,
  2 stamped preview opens / **1 person**.
  - **The primary metric is non-zero.** aid `58762b91`, 09-07: solved 37,
    then opened **23 from `preview_list`** at 18:07:51 and **solved it at
    18:11:58** — 4m07s — then opened **24 from `preview_list`**. So
    `preview_open_to_solve` stands at **1 person, 1 of 2 stamped opens
    converted**. Yesterday's note recorded zero; the surface produces real
    rows in production, not just in `npm run smoke`.
  - **Feasibility arithmetic, stated now so the 09-20 verdict is not a
    surprise.** 8 people reached a wall in 1.4 days ≈ 5.7/day ≈ **80 people
    over the 14**. The target of ≥ 15 preview-openers therefore needs ≈ **19%
    of wall-hitters to click a preview**. The rate so far is 1/8 = 12.5%.
    Reachable, not comfortable. This is arithmetic on the denominator, not a
    verdict on the claim.
  - **The secondary is repeating 08-21 exactly: `freeHardPreviewsUnsolved`
    is 6 on all 12 rows — 8 of 8 people.** Baseline was 1/16 (6%); we are at
    **0/8**. Nobody who has met a wall had touched a preview first. The
    surfaces are still not upstream of the wall for anyone.
  - **The most informative single user.** aid `ef5885e6` (19 solves, door
    `sql-interview-prep`) hit the catcher on challenge **3 four times in 23
    seconds** (00:24:46, :51, 00:25:02, :05) and then challenge 12, taking no
    preview. Our most engaged wall-hitter bounced off the same locked door
    four times. The catcher gave that person nothing to do.
  - **Measurement note for the 09-20 read — use people, not rows.** Those
    four repeats are 4 legitimate rows: the T3 dedupe is 2s per
    user+challenge and every gap was 2.8-10.7s. So `lock_rows` (12)
    overstates `lock_people` (8) by 50% in this window. The denominator on
    09-20 is **people**.
  - **Two rows still carry `wall='soft_toast'`** (09-06 15:01 and 21:45, both
    on challenge 31) *after* the 13:42Z deploy, while a 20:10 row on the same
    challenge carries `preview_dialog`. Stale cached bundles, not a second
    code path. Expect a small `soft_toast` tail in the 09-20 read and count
    those people as catcher-eligible-but-not-served.
  - **Two of the eight had `solvedCount = 0`** — aid `2eb0db72` (door
    `company:Snowflake`, challenge 89, `wall='company_modal'`, i.e. a buyable
    Pro modal) and aid `e7914d44` (door `challenges-window-functions`,
    `surface='interview'`). Asking for money from someone who has solved
    nothing inverts "satisfy first, then ask" (docs/data-driven-product.md).
    Being fixed under the cold-start entry below; **that fix removes 0-solve
    people from the catcher population mid-window**, which shrinks this
    claim's denominator by ~25% and makes the ≥ 15 target harder, not easier.
    Recorded here, before the fix ships, so the 09-20 verdict is read against
    the change and not against a denominator nobody wrote down.
### cold start: nobody is asked to pay before they have solved anything
- **Claimed** 2026-09-08
- **Change** `src/utils/paid-wall.js`: a person with zero solves never sees a
  Pro ask. All four gates (`challenge_hard`, `interview`, `thirty_day`,
  `daily_difficulty`) call `openColdStartInstead()` between their
  `trackLockReached` and whatever asks for money; the collision is still
  written, under the new `wall='cold_start'`. They get a dialog naming one
  free challenge picked in curriculum order — no price, no "Pro", no Hard
  preview. Its CTA opens that challenge with **no `openedFrom` stamp**, so it
  cannot forge rows into `preview_open_to_solve`. 16 unit tests + a source
  guard (mutation-verified: removing one `openColdStartInstead` fails it by
  name) + a new smoke step that asserts `wall='cold_start'` and that the
  dialog mentions neither Pro nor a price.
- **Why** measured 2026-09-07 over 45 days: **38 people met a paid wall having
  solved nothing, and 3 of them ever solved anything (7.9%).** For 22 of the
  38 the lock event is the last thing they ever did. `docs/data-driven-product.md`
  states the order — satisfy first, then ask — and this population was the
  product doing the reverse to roughly two people a day. The live example:
  aid 2eb0db72 arrived on /snowflake-sql-interview/, clicked Hard challenge
  89 with zero solves, and got the **buyable** company modal.
- **Metric** `cold_start_first_solve` (docs/agent/metrics.md). Baseline
  **3/38 = 7.9%** over the 45 days to 2026-09-07; **3/21 = 14.3%** excluding
  the 08-26 cluster.
- **Guardrail** `purchases`, directional only. This change can only reduce
  asks, so a fall in `pro_modal_shown` is the mechanism working, not a
  regression — but a fall in *purchases* would mean some of those asks were
  converting, and that would be worth knowing.
- **Target** ≥ **25%** of cold-start people solve at least one challenge.
- **Read on** **2026-09-29** (deploy + 21 days; ~2 cold-start people a day, so
  21 days buys n ≈ 40 — 14 would have left the read on a dozen people).
- **Falsification, stated in advance:** < 15% → the dialog is not the lever
  and the next move is **placement**, not copy: a zero-solve visitor should
  not be able to reach a locked Hard from a company page at all, and the fix
  is upstream in what those pages link to. 15-25% → inconclusive, extend to
  2026-10-13, change nothing. ≥ 25% but `purchases` falls below 2 in the
  window → the ask was doing work we just removed; re-open the threshold
  question (`COLD_START_SOLVE_THRESHOLD`) rather than reverting.
- **Confounds** it lands mid-flight in the paywall-surfaces claim reading to
  2026-09-20 and **shrinks that claim's denominator by ~25%** (2 of its 8
  wall-hitters were zero-solve). Recorded in that claim's 09-08 mid-window
  note as well. The two must be read together, and the ≥ 15 preview-opener
  target there is now harder to reach for a reason that has nothing to do
  with the surfaces.
- **Verdict** _pending_
### paywall: ask fewer people, at most twice, and never the ones who came to learn
- **Claimed** 2026-09-08 — **NOT YET SHIPPED.** Ships after the cold-start read
  on **2026-09-29**, because `purchases` is a directional guardrail on both
  that claim and the paywall-surfaces claim reading 09-20, and changing who
  sees the Pro modal moves it. Plan:
  `docs/plans/signup-to-subscriber-2026-09-08.md`.
- **Change** three things to the milestone Pro modal, together: never shown to
  `learning` intent; shown to people with no captured intent only after asking
  for the intent instead; and a hard lifetime cap of **two shows per person**.
- **Why** measured 2026-09-08. Over 60 days the modal reached 282 people and
  produced 12 checkout clicks (4.3%), of which 4 paid — a third of clickers
  buy, so the bottom of the funnel is fine and the top is growing (+94%
  signups, engaged share 55% → 64.5%). The break is shown→click, and two
  things explain it. **Intent:** of people with a recorded intent, `interview`
  went 41 shown → 4 clicked and `job_ready` 48 → 2, while `learning` (41) and
  no-intent (52) produced **zero clicks between them** — 93 people, no
  exception. **Fatigue:** 1.91 shows per person, **43 people saw it three or
  more times and one saw it eight**, against a 95% dismiss rate. Solve count,
  the thing the trigger is built on, does not predict clicking at all —
  clickers averaged 11.4 solves against 13.4 for everyone shown.
- **Metric** `paywall_ask_efficiency` (docs/agent/metrics.md). Baseline
  **12 clicks / 282 people shown = 4.3%** over the 60 days to 2026-09-08.
- **Guardrail** absolute `pro_checkout_clicked` people must not fall, and
  `purchases`, directional only.
- **Target** over the 8 weeks after ship: **shown→click ≥ 8.6%** (double)
  **AND absolute clicks ≥ 12**, i.e. the same number of clicks from roughly
  half the asks.
- **Read on** **2026-11-24** (ship 09-29 + 8 weeks). Eight weeks, not two: the
  baseline rests on 12 clicks, and a two-week window on this n reads noise.
- **Falsification, stated in advance:**
  - **Absolute clicks fall below 12** → the gate is cutting buyers we cannot
    identify in advance. Revert the intent gate, keep the frequency cap, and
    re-read the cap alone. The cap is the half of this change that cannot cost
    us a buyer.
  - **Rate below 6%** → intent is not the axis. Next move is moment, not
    audience — i.e. move 2 of the plan, driven by the 09-20 read, not more
    copy.
  - **6-8.6% with clicks held** → inconclusive at this n, extend to 2026-12-22,
    change nothing.
  - **Any discount, urgency or scarcity appears in this modal** → revert
    regardless of the numbers. Our buyers are deadline-driven, not
    price-shopping, and we have never tested otherwise.
- **Confounds** (i) it ships after two other paywall changes land, so the
  09-20 and 09-29 verdicts must be written before this one starts. (ii) The
  intent gate changes the *population* shown, so `shown` is not comparable
  across the ship date — only clicks are. (iii) If the founder mails the 61
  dismissers (move 4 of the plan) during the window, some of them may return
  and buy for a reason that is not this change; record the send dates.
- **Verdict** _pending_

### goal-setting: a marker of a deadline, or something we can manufacture?
- **Claimed** 2026-09-08 — **observation, not an intervention.** Nothing ships
  for it. It exists so the tempting move is written down before somebody makes
  it.
- **The finding** among engaged users (5+ solves) over 90 days: 75 have a
  Coach goal and 216 do not. Shown the modal: 52 vs 78. Clicked: 3 (5.8%) vs
  6 (7.7%) — goal-setters click *less*. Paid: **3 vs 0.** Every paying
  engaged customer had set a goal.
- **Why it is not an instruction to make people set goals.** n = 3; Fisher
  exact on 3/3 vs 0/6 gives **p ≈ 0.08**. And the causal reading matters more
  than the p-value: a goal most plausibly *marks* somebody with a real
  deadline rather than *causing* them to pay. Make goal-setting a step toward
  checkout and it stops meaning "I chose this" and starts meaning "I clicked
  past a gate" — the correlation would not survive its own exploitation.
- **What to do instead** ask goal-less engaged users to set one because the
  Coach works better with one (94 of 652 active users have a goal; 216 engaged
  users do not), then watch whether the paid-vs-goal association survives the
  larger population. If it holds at n ≥ 10 payers, it is real and worth
  building on. If it dissolves, it was a marker and we learned that cheaply.
- **Metric** the goal split under `paywall_ask_efficiency`. **From the
  2026-09-16 intake flip, exclude `coachState.source='intake'`** — a goal the
  onboarding intake mapped from a one-tap answer is not the deliberate choice
  this observation is about, and counting it would manufacture the marker.
- **Read on** **2026-11-24**, alongside the claim above, or the first time
  cumulative payers reach 10 — whichever is later.
- **Falsification, stated in advance:** if by then goal-holders and
  goal-less engaged users convert within a factor of two of each other, the
  3/0 was noise and no offer should ever be conditioned on a goal.
- **Verdict** _pending_

### grader: ties inside an ORDER BY no longer fail a correct query
- **Claimed** 2026-09-06 — deployed 2026-09-06 13:42Z
- **Change** `src/utils/grade.js` ordered mode is tie-tolerant: the SEQUENCE
  of sort-key tuples must match the reference exactly and the multiset of
  full rows must match; tied rows may come in any order. Keys are resolved
  from the solution's final ORDER BY to output columns (plain identifiers,
  aliases, positions; qualifiers and NULLS FIRST/LAST stripped). 27 and 69
  use expression keys and stay strict. All nine grading sites now pass the
  reference columns. 12 new tests incl. the 121 fixture.
- **Why** feedback #6 (2026-09-02, hakko504, 131 solves, job_ready) on 121
  "Multi-Month Active Customers": `ORDER BY distinct_months DESC,
  total_orders DESC`, no tiebreaker — tied customers land in engine order
  and a correct query with a different tie order was marked wrong; he
  abandoned 121. Same class as payer #2's complaint (REPLY #2) one week
  earlier. **175 of 185 solutions carry a top-level ORDER BY**, so the
  exposure is the whole bank, not one challenge.
- **Metric** pooled `challenge_solve_through` (person-challenge pairs, 28
  days) by band. Baselines to 09-06: hard bank 1-90 **66.5%** (489/735);
  bridge+ 106-185 **75.9%** (975/1284); beginner 91-105 **78.0%**
  (1332/1707) — the control: short single-key outputs, ties rare. 121
  alone: 55.6% (5/9), direction only.
- **Target** hard bank ≥ 70% and bridge+ ≥ 78% over the 28 days after
  deploy, with beginner flat (± 3 pts).
- **Read on** **2026-10-04** — deployed 2026-09-06 13:42Z (tie parser verified
  in the served bundle)
- **Falsification, stated in advance:** if hard and bridge+ move < 3 pts
  while beginner is flat → tie rejections were rare in practice; the two
  complaints were the visible tail, not a mass leak. Keep the fix (it is
  correctness), stop spending on grading, and the next lever is content
  (tiebreakers in solutions, prompts that state the order). If all three
  bands move together → traffic mix, UNREADABLE — extend.
- **Confounds** the 08-28 unordered fix and the 105 opener ship in the
  same push. 105 touches first contacts only (beginner band); the
  unordered fix touches the 10 solutions without ORDER BY — negligible in
  the hard and bridge+ bands, which are the read.
- **Verdict** _pending_

### the recommended path stops hand-listing 38 of 287 challenges
- **Claimed** 2026-09-09, **shipped behind `features.roadmapV2 = false`**.
  The claim is written now, before the flag is flipped, because a target
  invented after seeing the data is not a target.
- **Why now** `SQL_ROADMAP_STAGES` hand-listed 38 challenge ids, and the
  Practice tab's path filter defaults to `'recommended'`, which resolves to the
  user's *current* stage. So the default view of a 287-challenge bank showed
  between 2 and 7 challenges. Measured 2026-09-09 across 299 engaged users
  (5+ solves): **66.1% of every solve lands on those 38 ids**, and the average
  engaged user has solved **17.1 of 213 free challenges**. No sector challenge
  (200-299) was reachable from any stage, and String Functions and Date
  Functions — two of the nine canonical skills — had no stage at all.
- **Change** `src/utils/roadmap.js` grows each stage from the live bank by the
  stage's own canonical skills and a difficulty ceiling, plus two new stages for
  the two missing skills. Verified in the browser: 38 → **134 of the 219 free
  challenges**, Foundations 2 → 14 exercises, 20 sector challenges reachable.
  Curated ids stay first in their authored order (prefix test + mutation test),
  so first contact is untouched.
- **Metric** `reach_6_rate` — of people who solve at least one challenge in the
  window, the share who reach six distinct solves. Six is the rung the milestone
  modal fires on and the only surface that has produced a sale since 07-23, so
  it is the activation number that touches revenue.
  **Baseline: 47.4% (149 of 314), 30 days to 2026-09-09, people by `aid`.**
- **Mechanism check, and it must pass before the outcome is read:**
  `share_of_solves_on_the_38` must fall from **66.1%**. If it does not, the
  wider path never reached anybody and the outcome number is measuring traffic
  mix. Same shape as the 105 claim's `first_contact_share(99)` check.
- **Control** first-contact activation must not move. This change appends only;
  it never reorders a curated id and never touches `FIRST_RUN_PATHS`. If first
  contacts move at all, something appended is being served as an opener and the
  change is not what it claims to be.
- **Target** `reach_6_rate` ≥ **55%** at n ≥ 250 solvers, with
  `share_of_solves_on_the_38` below 50%.
- **Read on** **2026-10-13**, and not before — the flag cannot be flipped until
  the 105-opener claim reads on 09-13, because both act on the same stretch of
  funnel. Thirty days of post-flip data from a 09-13 flip lands on 10-13.
- **Falsification, stated in advance:**
  (a) `reach_6_rate` ≥ 55% with the mechanism check passing → discoverability
  was a real constraint on depth; next is raising the per-stage cap of 14 and
  giving the two new stages lessons.
  (b) mechanism passes, `reach_6_rate` within ±3 points of 47.4% → **people were
  not short of findable work.** This is the outcome I expect to be most likely,
  because the nine users who cleared 30+ of the 38 all found their way off the
  roadmap unaided, averaging 44 off-roadmap solves. Keep the change on
  correctness grounds — 85% of the bank being unreachable by default is a defect
  either way — and stop spending on discoverability. The next lever is the goal
  picker: 230 people were shown it in 30 days and **51 set a goal**, and goal
  setters reach six solves at 68.6% against 35.2% for people who saw the picker
  and did not. That gap is confounded by self-selection and is the largest
  unexplained gap in the funnel.
  (c) mechanism fails → UNREADABLE, the flag did not reach the surface. Check
  the three render sites that read the stage list; two of them were reading the
  raw constant on 2026-09-09 and the flag did nothing there until it was fixed.
- **Confounds** none intended — it ships alone, after the 105 read closes. If
  anything else lands on the Practice tab in the read window, say so here.
- **Verdict** _pending_

### subscription management hands off to Stripe — no more client-side "cancel"
- **Claimed** 2026-09-03 — correctness + measurement, no target on purpose
- **Change** the "Auto-Renew ON/OFF" toggle (Pro panel and profile) flipped
  a localStorage flag and never reached Stripe — a user who clicked it saw
  "your subscription will not renew" while the card kept being charged;
  "reactivate" granted 30 Pro days client-side with no payment. Both now
  open Stripe's Customer Portal (`STRIPE_CUSTOMER_PORTAL_URL` — empty
  09-03..09-07; the no-code link was activated in Stripe on 2026-09-07 with
  cancel-at-period-end on, and ships with the next deploy, so `portal=true`
  rows exist only from that deploy on) or a pre-filled support@ email,
  and write `manage_subscription_clicked` {intent, portal}. Found while
  building the cancel path payer #2 asked for; the localhost analytics
  guard (D10) shipped in the same commit.
- **Metric** `manage_subscription_clicked` people, 30 days — how many Pro
  users look for the door, and via which route. Baseline unknown: the old
  toggle recorded nothing. No target — the count decides whether the portal
  link is worth its setup, and the honest hand-off is the floor either way.
- **Read on** 2026-10-03
- **Falsification** none that would revert this: a client-side "cancel"
  that lies is not an option to go back to. The read only ranks the portal
  link against other work.
- **Verdict** _pending_

### working-track opener: 105 replaces 99 as the first contact
- **Claimed** 2026-09-02
- **Change** every `'working'` first-run track (`FIRST_RUN_PATHS` zero /
  interview / business / weak-spots) and the `FIRST_RUN_LEVELS` fallback now
  open on **105 "Your First JOIN"**; 99 drops to step 2. All five moved
  together — the 08-06 note records that fixing one list "looked right and
  changed nothing" because the tracks override the level.
- **Why now** 99 is the front door for **52% of all first contacts** (221 of
  425, 28 days to 09-02) and activates **47.1%** of them. Its track siblings
  read 73-83% solve-through as later steps (105: 82.7%, 100: 77%, 98: 73%).
  Last-7 overall activation fell to 37% (67/179) from 52% the week before;
  this seat is the largest single leak in the funnel.
- **The trap, stated before the read:** this seat has been swapped once
  already. On 08-06, 100 activated 27% as the opener and 99 read 85% as a
  later step, so 99 was moved in front — and fell to 47%, while 100,
  demoted, now reads 77%. The seat may be what's hard (the 'working'
  self-placement collects over-claimers and cold bouncers), not the
  challenge. This claim is designed to tell those two apart.
- **Metric** `first_contact_activation(105)` — 105 in the opener seat.
  Baseline for the seat: 99 at **47.1%** (n=221). Mechanism check:
  `first_contact_share(99)` must fall from 52% toward zero and 105's share
  rise to match; if it does not, the change never reached the front door.
- **Also** overall `first_contact_activation` (last-7) — baseline **37%**.
  Control: 91 as the brand-new opener, 71% (n=45) — should not move.
- **Target** 105 as opener ≥ **60%** activation at n ≥ 60; overall last-7
  activation ≥ 48%.
- **Read on** **2026-09-13** — deployed 2026-09-06 13:42Z (Vercel, verified
  live: `[105,99,100,98]` in the served bundle); the 09-09 date written at
  claim time is void, the change sat unpushed until 09-06.
- **Amended 2026-09-06, before deploy, after one more week of baseline:**
  with NO code change live, 99-as-opener read 48.6% (n=72) one week and
  63.3% (n=79) the next, and overall activation swung 36% → 58%, because
  the low-intent `(none)`-door surge of 08-23→30 receded. The seat-level
  metric moves ~15 points with traffic mix alone. So: (i) baseline is the
  **28-day** figure, 47.1%, not one week; (ii) the same-week **91 control**
  is part of the verdict — if 91 moved ≥ 10 points in the read week, the
  week is a mix week and the read is UNREADABLE-mix, extend; (iii) n ≥ 60
  first contacts on 105 before any verdict. Thresholds below unchanged.
- **Pre-read note, 2026-09-11 (two days early, deliberately written BEFORE the
  read so it cannot be selected afterwards).** Both target conditions are
  currently met and one of them hides a tension:
  - 105 as opener: **61.3%** activation, n=**75**. Target was ≥60% at n≥60, so
    both halves clear. 99 no longer appears in the opener seat at all, which
    confirms the swap took mechanically.
  - Overall last-7 activation: **53.7%** (94/175). Target was ≥48%, so it
    clears.
  - **But the seven days BEFORE the deploy read 57.2%** (83/145), and the
    window since the deploy reads 52.1% (76/146). So the site-wide number did
    not rise — it drifted down — while 105's own seat performs well above the
    line it was given.
  The honest reading on 09-13 is therefore not a clean HIT on both halves. 105
  beat its target in its seat; the funnel it sits in did not improve. Decide on
  09-13 whether the claim's second condition (≥48% overall) was too weak to be
  informative, and say so in the verdict rather than banking a number that
  passed a bar set below the prior week's actual.
- **Falsification, two-sided, stated in advance:**
  (a) 105-as-opener ≥ 60% → the *challenge* was the constraint: 99's
  five-column exact-alias prompt is too much for a first contact. Keep 105
  in front, rewrite 99 for step 2.
  (b) 105-as-opener ≤ 50%, i.e. within noise of 99's 47% → the *seat* is
  the constraint. **Do not swap a third time.** The next move is the entry
  experience of the 'working' level itself: a placement check instead of a
  self-report, or a lesson-first ramp like brand-new gets.
  (c) 50-60% → inconclusive; extend one week, no other change to the track.
- **Confounds** (i) The grader-ordering fix (`20a5779`) ships in the same
  push. 105's solution carries a top-level ORDER BY, so its grading is
  unchanged by that fix; 99's result is a single row, so it is unchanged
  too. Overall activation could still get a small lift from other unordered
  first contacts — read 105-as-opener as the primary, overall as secondary.
  (ii) Traffic mix is shifting fast (+51% new people, `(none)` door 22→92);
  the seat-level read is mix-independent, the overall rate is not.
  (iii) Added 2026-09-12, the evening before the read: guest progress now
  survives a reload (ledger: "anonymous progress survives the reload").
  Returning browsers keep their solves and no longer re-run the opener; a
  first contact is an aid's FIRST `challenge_opened`, which such a browser
  already had, so neither the seat metric nor its denominator moves. Said
  here so the read does not discover it.
- **Mechanism check, 2026-09-09 (NOT a verdict).** Run early on purpose: if
  the deploy had not reached the front door there would still have been time
  to fix it before the read window closed. It reached it. Since the 09-06
  13:42Z deploy, **105 holds 37.4% of first contacts (40 of 107)** and **99
  no longer appears in the top twelve** — its 52% share is gone, which is
  exactly the substitution the metric demanded. Control 91 reads 75% (n=8)
  against its 71% baseline, inside the ±10 mix band, but n=8 cannot carry
  that test and the real control reading is due on 09-13.
  **n=40 of the required 60**, accumulated in three days, so 60 arrives
  around 09-11 and the 09-13 date holds. 105-as-opener is running at 55.0%,
  which is inside the (c) inconclusive band and **is not to be acted on** —
  the claim fixed n≥60 in advance and 40 is not 60. Recorded so the read is
  known to be readable, not to pre-empt it.
- **Verdict** _pending_

---

## Closed

### hand-written founder check-ins replace the automated engagement email — **UNREADABLE**
- **Claimed** 2026-08-21 (design: `cgozdemm-main-design-20260818-013802.md`)
- **Metric** `outreach_replies` — baseline **0** (never sent before today)
- **Target** 3 replies from the first 10 hand-written emails
- **Read on** 2026-09-01
- **Falsification, stated in advance:** fewer than 2 replies from 10 means the
  problem is not the channel or the wording — these users do not want to talk
  to us, and the paywall decision gets made from behavioural data alone.
- **Send log:**
  - 2026-08-21 · Digvijay (guest, feedback #4/#5, schema-columns report) —
    reply confirming the bug + fix shipped, one question
  - 2026-08-21 · sagepati (feedback #3, layout overload) — honest no-fix-yet,
    one question (what were you trying to do)
  - 2026-08-25 · sab3r (payer #2 — first funnel-sourced sale) — thank-you +
    one question: "what was the moment you decided it was worth paying?"
    Answer tests the milestone/momentum theory directly.
  - 2026-09-02 08:50Z · jeromezhao (payer #3 — second milestone-modal sale,
    32s from modal to purchase, arrivalSrc='home') — thank-you + one
    question: "what brought you to SQL Quest?" — the channel, the one thing
    the data cannot show. Sent to an Apple Hide-My-Email relay address.
- **REPLY #1 — 2026-08-25 20:17Z, sab3r, ~24h after send.** Verbatim core:
  enjoyed "the UI and the progression of questions and wanted to unlock the
  harder questions. Hence bought it!!", "Have an interview coming up so I
  needed the practice", and "AI recommended me to the site — you must have
  some good GenAI SEO". Three decision-grade facts: (1) purchase MOTIVE was
  Hard access — the milestone modal was the moment, Hard unlock was the why;
  do not give Hard away on the DataLemur argument without weighing this.
  (2) Deadline intent (interview) was the accelerant. (3) Acquisition channel
  was an AI assistant's recommendation — invisible in analytics: his
  arrivalSrc reads 'home' because AI apps strip referrers. GenAI-recommended
  traffic hides inside the 'home' door; today's record 95-person day with
  flat landing traffic is consistent with more of it.
- **Thread continued (2026-08-26/27):** sab3r is cancelling — reason stated
  plainly: "not too well on money right now", NOT product dissatisfaction;
  will keep practicing through the paid month and "spread the word". He then
  had to EMAIL to cancel: **there is no self-serve cancellation path in the
  app** (his screenshot shows him looking for one). Product gap logged in
  TODOS.md — for a US customer this also touches the FTC click-to-cancel
  rule. Churn effective 2026-09-22; MRR returns to Serge-only after that.
  Handled by founder: cancel-at-period-end in the Stripe dashboard.
- **REPLY #2 — 2026-08-28 02:00Z, sab3r, 3 minutes after the cancellation
  confirmation.** Unprompted product feedback plus channel detail:
  (1) **"The grader is too strict sometimes on ordering. Some questions
  prompts don't specify the correct order. That's my only complaint."**
  Confirmed in code the same night: every grader compares
  `JSON.stringify(values)` strictly — main challenge (`app.jsx` ~20134),
  speed run (~7690), interview (~8865), daily (~19236) — so row order always
  matters even when neither the prompt nor the solution demands an ORDER BY.
  A paying user was told "wrong" for correct queries. Logged in TODOS.md.
  (2) AI tutor "a little erroneous" — he attributes it to the model, low
  heat. (3) **Retention despite churn:** "will definitely be using it even
  after my subscription ends" — the free tier keeps him as a user and a
  word-spreader. (4) **Channel named:** the AI that sent him was **Gemini**,
  and the query context was **analytics prep** — first time the GenAI channel
  has a vendor and a query space attached, not just "AI recommended".
- **Read** 2026-09-07 (due 09-01; read six days late, by hand — the verifier
  is still not installed). Gmail checked the same day.
- **Measured:** 4 emails sent, not 10 — 08-21 ×2 (Digvijay, sagepati; both
  feedback-widget users), 08-25 (sab3r, payer #2), 09-02 (jeromezhao, payer
  #3, Apple Hide-My-Email relay). Replies: **1 person of 4** — sab3r, five
  messages across two threads. Digvijay, sagepati and jeromezhao: silent as of
  09-07 (17, 17 and 5 days). Only 3 of the 4 were sent by the read date.
- **Verdict** UNREADABLE — n. The target ("3 of the first 10") and the
  falsifier ("fewer than 2 of 10") were both written on a denominator that was
  never sent; 1/4 sits between them and, at this n, nothing separates the two
  readings. What the read did produce, and no counter captures: the one reply
  carried four decision-grade facts (purchase motive = Hard access; deadline
  intent; the Gemini / analytics-prep channel; the strict-ordering grader
  bug), exposed the missing self-serve cancel path, and led to three shipped
  fixes (unordered grader 08-28, tie-tolerant grader 09-06, cancel path 09-06).
  The value of this channel is in the *content* of a reply, not the count.
- **Decision:** the ritual stays as a standing practice — one hand-written
  email after every purchase and every feedback-widget message, send log
  continued here — but it carries no metric claim. Re-open as a claim only
  once 10 sends have accumulated, same 3/10 line, read 30 days after the
  tenth send. Sends 5 and 6, both 2026-09-07, both by the founder from
  goktug@datrick.com: sab3r (in-thread — cancel path and the tie-tolerant
  grader are live, one question: what did you ask Gemini) and hakko504
  (new thread — feedback #6, challenge 121 tie order fixed, one question:
  did the grader fight you elsewhere). Six sends now; re-open the claim as
  written after the tenth.
- **REPLY #3 — 2026-09-07 10:57Z, sab3r**, two hours after the founder asked
  what he had actually typed into Gemini. Verbatim core: *"I asked it about
  the company I am interviewing for and it pointed me to SQL Quest."* The
  trigger is a **company-name interview query**, not the generic "analytics
  prep" phrasing recorded on 2026-08-28 — that was his paraphrase, this is
  the query shape. Decision-grade, because it says which of our pages the
  channel actually feeds: the 23 company pages, not the homepage and not the
  comparison hub. It also raises the value of the Capital One work (page,
  card-transaction challenges, CodeSignal mock) from "the payers asked for
  it" to "this is the query shape an assistant answers". Gemini still cannot
  be probed (personalised UI), so this reply is the only evidence of its
  behaviour we will get; treat it as n=1 and do not model a rate from it.
- **Review invitations, 2026-09-07 — logged here, deliberately NOT counted
  toward the 3/10 line.** Four hand-written emails went out the same day
  asking for a public Trustpilot review: sab3r (in-thread, he had offered to
  spread the word), tausif1122 (114 solves, 20-day streak, the longest active
  streak on the site), luciej (105 solves, 14-day streak) and supertrunker
  (102 solves, active the day before). Selected on **usage, not on predicted
  sentiment** — screening for who is likely to be positive before inviting is
  the manipulation regulators name, and inviting the heaviest users is not.
  No incentive offered, no wording suggested, and each says plainly that an
  honest criticism is welcome and that there will be no follow-up.
  They are excluded from `outreach_replies` because the ask is different in
  kind: "answer my question" and "please review us" do not share a reply
  rate, and folding them into one denominator would make both unreadable.
  Their own measurement is the `review_ask` claim (read 2026-10-08).
  hakko504 and adinajoshi were deliberately left out — both had already
  received a different email from the founder that day.

### /sql-exercises/ on Google — the page that ranks 6 on Bing and 24.5 here — **OPEN**
- **Claimed** 2026-09-11 · **Read** 2026-10-12
- **The observation that opened it:** the same page, same content, ranks
  **6.36 on Bing with 11,400 impressions and 489 clicks** and **24.5 on Google
  with 1,250 impressions and 20 clicks** over the same three months. Rank
  governs how often you are shown at all, so Google gives our best door nine
  times fewer impressions than Bing does. Every other page of ours sits at
  Google 6.7-13.2; this one is the outlier, and it is the one that matters.
- **Change** two things shipped 2026-09-11, both cheap and both aimed here:
  internal links to the page went **31 → 132 of 141 pages** (it had fewer than
  `terms.html`), and its title now carries "practice questions", the phrase
  that was our largest Bing query and appeared nowhere on the page.
- **Metric** `gsc_position('/sql-exercises/')` — baseline **24.5**
  (1,250 impressions, 20 clicks, 1.6% CTR, 3 months to 2026-09-08).
- **Target** ≤ **15** — the top of page two, i.e. evidence the page moved at
  all. Page one is not a 30-day ask.
- **Falsification** still above **22** → internal links and title were not what
  was holding it, the constraint is domain authority, and the honest response is
  that `docs/plans/backlinks-2026-09-11.md` is the only remaining lever and it
  runs in quarters. Say that rather than shipping another title.
- **Note on what is NOT being claimed:** the site-wide average position of 15.7
  is an artifact of 17,029 competitor-brand impressions at 0% CTR and is not a
  target. See `docs/reads/google-position-2026-09-11.md`.

### Bing T1 — /sql-exercises/ answers the query it actually ranks for — **OPEN**
- **Claimed** 2026-09-11 · **Read** 2026-10-09 (with O1's day-30 checkpoint)
- **Change** title / og / twitter / meta description / h1 on
  `src/sql-exercises.html` now carry "practice questions" alongside
  "exercises". Reason, from the first Bing Webmaster Tools read ever done on
  this site: our single largest query is **`sql practice questions`, 1,200
  impressions at position 7.44 and 2.93% CTR**, and the phrase appeared **zero
  times** on the page it ranks. Exact-word queries against the same page clear
  8.07% (`sql exercises`), 16.30% (`sql exercises for practice`) and 27.91%
  (`sql practice problems`).
- **Metric** `bing_page_ctr('/sql-exercises/')` — baseline **4.28%** at
  position 6.36 (11.4K impressions, 489 clicks, 3 months to 2026-09-08).
- **Target** ≥ **6.0%** over the 21 days after propagation.
- **Guardrail** landing→solve for the page must not fall. A broader title that
  buys clicks from people who bounce has cost us, not earned.
- **Falsification** below **5.0%** → the title was not the constraint and the
  position is, which is a slower and different job (links, not words). Say so
  and stop editing titles on this page.
- **Confound, stated in advance** this is the door feeding `door_solve_rate`
  and, indirectly, the 09-29 cold-start read. Bing title propagation runs 1-3
  weeks, so the effect should land after that read closes. If the cold-start
  numbers move oddly in early October, check here first.

### Bing T2 — the competitor-brand queries we rank for and never convert — **OPEN**
- **Claimed** 2026-09-11 · **Read** 2026-10-12
- **Change** `/vs-datalemur/` retitled from "SQL Quest vs DataLemur: …" to
  "Is DataLemur Free? 2026 Pricing, Free Tier & SQL Practice". Someone
  searching a competitor's name is not looking for ours, and a title that
  opens with ours reads as an advertisement. The description now discloses in
  its own words that a competitor wrote the page, which the old title did
  implicitly and the new one does not.
- **Metric** clicks on `datalemur`, `datalemur sql practice`, `sql bolt
  exercises`, `sqlzoo practice exercises` — baseline **0 clicks against 452
  impressions** across 3 months, positions 6.91-8.68.
- **Target** ≥ **15 clicks** in 30 days.
- **Falsification** under **5** → competitor-brand searchers do not leave for
  a comparison page whatever the title says.
- **Amended the same day, and the amendment is the honest part.** The
  falsification above originally read "…and the two unbuilt pages (SQLBolt,
  SQLZoo) in the plan should not be built". The founder asked for both pages
  immediately, so this read no longer gates them and the claim is weaker for
  it: we now learn *from* those pages rather than *about* whether to build
  them. Shipped 2026-09-11 as `/vs-sqlbolt/` and `/vs-sqlzoo/`, with internal
  links in the same commit.
- **What the two new pages add to the read.** `sql bolt exercises` (74
  impressions, position 7.47, 0 clicks) and `sqlzoo practice exercises` (57,
  6.91, 0 clicks) currently rank on `/best-sql-practice-sites/` alone. Both now
  have a dedicated page whose title leads with the competitor's name. If those
  two queries move and the two DataLemur queries do not, the lever is a
  dedicated page, not a title — which is a more useful thing to learn than the
  original claim would have told us.
- **A note on what these pages could not argue.** SQLBolt and SQLZoo are both
  free with no paid tier, verified by fetching them on 2026-09-11. The free-tier
  comparison every other vs- page leads with does not exist here, so both pages
  say so in the first screen and argue the surrounding product instead. A
  comparison page that cannot find an honest advantage should say that rather
  than manufacture one.

### Bing T3 — get the other 44 pages into the index — **OPEN**
- **Claimed** 2026-09-11 · **Read** 2026-10-12
- **Change** `npm run indexnow -- --all` submitted all 87 sitemap URLs,
  HTTP 200. No quota on IndexNow; Bing's URL Submission holds 100/day in
  reserve, thirty times Google's.
- **Also submitted 2026-09-11 02:03** via Bing's URL Submission panel, which is
  a separate queue from IndexNow: `/vs-sqlbolt/` and `/vs-sqlzoo/`, the two new
  pages. Quota went 100 → 98, so both consumed a slot rather than only appearing
  in the table.
- **Metric** pages with ≥1 Bing impression — baseline **41 of 85 built pages**
  (3 months to 09-08). The two new pages raise the denominator to 87, so read
  the target against 87 rather than 85.
- **Target** ≥ **60**.
- **Falsification** under **50** → submission was never the constraint, and
  those pages have a quality or duplication problem. That is worth knowing
  before writing more of them, which is the whole reason this is a claim
  rather than a chore.

### schema columns on the challenge card (first-run shell had none) — **MISS**
- **Claimed** 2026-08-21 · **Read** 2026-08-30 (window 08-21→08-29 per protocol)
- **Change** `app.jsx` ~32022: the always-rendered "Tables used" card now lists
  each table's columns as chips. Root cause: the schema sidebar is gated behind
  `!showFirstRunSimpleShell`, and `isFirstRunUser = zero solves` — so the
  coldest users were the only ones who could not see any table's columns, on
  any viewport, and could not graduate out of the shell without the solve the
  missing schema was blocking. Reported by feedback #4/#5 (2026-08-18, mobile
  guest, 384px): "I dont see the input table columns".
- **Metric** `challenge_solve_through(99)` — baseline **46%** (39/85 openers,
  window 08-14→08-21). Target was ≥55%.
- **Measured:** 08-21→08-29: **43.8%** (42/96 openers). Through 08-30:
  44.8% (47/105). By calendar week: 08-16→23 45.9% (39/85), 08-23→30
  45.6% (36/79). Flat within noise — the fix did not move the metric.
- **Control:** 91 held at 73% (44/60) vs 73% baseline — the front door
  itself didn't shift, so this is not a cohort-mix artifact.
- **Verdict** MISS, per the falsification stated in advance: the missing
  schema was NOT the binding constraint on 99. Next candidate named at claim
  time: prompt complexity — 99 demands five computed columns with exact
  aliases and ROUND. Note: 99's solution is a single-row aggregate, so the
  2026-08-28 grader-ordering fix cannot move it either — whatever is failing
  people on 99 is in the writing of the query, not the comparison of results.
  The schema card stays (it is correct UX and cost nothing), but it earned no
  metric claim.
- **Amended 2026-09-11 — the verdict was right about its instrument and wrong
  about the change.** The fix removed the schema from *first-run users on any
  challenge*. `challenge_solve_through(99)` measures *one challenge, all
  users*, and 99's openers are mostly warm — the treated population barely
  appears in the denominator, so the metric could not have moved even if the
  fix worked perfectly. Re-read on `cold_first_solve_rate` (registered in
  metrics.md the same day, with the warm arm as a control): cold browsers went
  **39.7% → 46.0%** across this deploy (269/678 → 184/400, z = 2.0) while the
  warm control held at **86.8% → 85.4%**. The MISS process was sound — the
  falsification was written in advance and honoured — but the instrument was
  chosen badly ten days earlier. **A claim on a per-challenge metric cannot
  test a change scoped to a user state.** Match the instrument's population to
  the change's population before writing the target down. Full working:
  `docs/reads/signup-growth-cause-2026-09-11.md`.

### instrument the paid walls before moving them — **HIT**
- **Claimed** 2026-08-15 · **Read** 2026-08-21, one day early at the founder's
  request (6 of 7 collection days), by hand — verifier still not installed
- **Claim as made:** measurement-only; `lock_reach_rate` and
  `targeted_lock_share` baselines unknown, no target on purpose. Decision it
  feeds: the 2026-08-14 packaging call — move the wall off content and onto
  targeting (competitors give Hard away; LeetCode monetises company targeting).
- **Measured** (excluding the founder-test aid): **16 people** collided with a
  paid wall in 6 days, all on `challenge_hard` — 12 via `soft_toast` (browse),
  4 via `company_modal` (inside a deliberately-chosen company filter).
  47 raw events for those 16 people: the multi-fire defect (~3 events per
  click, 192ms apart) is real — **count people, never hits** until fixed.
- **`targeted_lock_share`:** 4/16 (25%) in company context. Weakest-skill
  match: 0 by exact string; **2/16 after resolving `category` through
  SKILL_TO_RADAR by hand** (both Joins). Combined targeted share ~25-37%.
  That is **LOW** — most wall-hitters are browsing the Hard list and bumping
  into locks, not arriving with specific intent.
- **But the targeted minority carries all the money signal.** The only Stripe
  checkout arrival ever measured (chaand, 08-18, monthly) was a wall-hitter:
  wall → offer → plan click → Stripe, end-to-end. 10 of 16 wall-hitters saw
  the offer afterward; 1 clicked.
- **The free-preview finding, the sharpest in the read:** **15 of 16 people
  hit a wall with all 6 free Hard previews untouched** — the previews are
  invisible where the collision happens. Exactly 1 person had used all 6 and
  came back for more; that profile is the strongest buy signal in the data.
- **Verdict** HIT — the instrumentation shipped, survived a week, and answered
  the question it was built to answer.
- **Decision, per the rule stated in advance:** the share is low, so **moving
  the wall now changes nothing** — people must first be LED to targeted
  moments. Build order confirmed: (1) surface the 6 free Hard previews at the
  collision point and in the Coach, (2) radar "remaining X are Hard"
  indicator, (3) only then revisit wall placement. Also fix the multi-fire
  before the next read.
- **Carried-forward exclusions:** founder-test aid
  `4a07da304d844d2e96795d4151699219` (the 08-15 verification click) and
  browse-session aid `d937d99161eb470a8ff28cce04f668eb` (08-21, Digvijay
  repro: `app_opened`, `challenge_opened` #91, first-run tour events — no lock
  clicks). Deploy was confirmed 08-16 against the production bundle.


### placement quiz tops out at 'working', not 'advanced' — **HIT**
- **Claimed** 2026-08-14 · **Read** 2026-08-21, on the date, by hand (verifier
  still not installed)
- **Claim as made:** `first_contact_share(1)` baseline **50.7%**, target below
  15%. Also `challenge_solve_through(91)` baseline 69% on 35 openers, target
  91 recovers >=35 openers/week.
- **Measured** (window 08-14 12:00Z → 08-21): challenge 1 first-contact share
  **50.7% → 8.6%** (14 of 163). Challenge 91: **64 openers** in the week
  (target >=35) at **73% solve-through** (47/64), up from the 66-69% band.
- **Verdict** HIT on both. The falsification test failed to fire: the share did
  not stay above 40%, so the quiz WAS the route feeding challenge 1 — the
  08-14 diagnosis was correct.
- **Read** The front door is now challenge **99** at **47.2%** of first
  contacts, converting **46%** as a first contact (39/85). Better than
  challenge 1's 24%, and consistent with the known "easy in context, hard as
  first contact" pattern already recorded in the working-track reorder entry.
  99-as-front-door is now the single worst conversion point among high-traffic
  challenges and is the natural next content fix — a follow-up, not a revert.

### offer gate stops trusting a stale proStatus flag — **UNREADABLE**
- **Claimed** 2026-08-07 · **Read** 2026-08-21, on the date, by hand (verifier
  still not installed)
- **Claim as made:** `engaged_never_asked` baseline **47**, target falls by at
  least 4 among 30d-active users. Scope stated in advance: recovers only the 4
  users whose trial expiry had already passed (apriwaymw, thurai, jhn_vinz,
  subhan); does not reach the auto-renew four.
- **Measured** `staleProRecovered` fired **0** times in 14 days. But all four
  in-scope users have emitted **zero events since 2026-07-10** — none returned
  at any point in the measurement window, so the gate never had a chance to
  fire. `engaged_never_asked` moved 47 → **53**, but the engaged denominator
  grew 127 → 152 over the same days; the raw count cannot carry a verdict.
- **Verdict** UNREADABLE — zero exposure, not zero effect. Per this file's own
  rule, not rounded to FLAT.
- **Read** The mechanism is deployed and untested by reality. It stays in place
  at no cost; if any of the four ever returns, the flag will show it. The real
  finding is about the segment: users whose trial expired in early July and
  who have been gone 6+ weeks are unreachable by any in-app change — that was
  the stated case for `lapsed-pro`, which remains deliberately unscheduled.
  No re-read date; the flag is its own tripwire.

### challenge-1 rewrite + recommendation routing — **MISS**
- **Claimed** 2026-08-05 · **Read** 2026-08-14 (2 days late; verifier not yet installed)
- **Measured** solve-through **31% pre → 25% post** (45→75 openers). Target was >=40%.
- **Measured** first-contact share **35.1% → 50.7%** (39 → 68 first-contacts). Target was "falls toward zero".
- **Verdict** MISS on both. The share moved the *wrong way*: challenge 1 is now
  the front door for **half** of all first contacts, up from a third.
- **Read** The rewrite and the routing fix were both real, and the routing bug
  was real — but neither fed this. Root cause found 2026-08-14 by walking the
  live flow: the 4-question placement quiz scores 4/4 as `advanced`
  (`app.jsx:19530`), and the advanced first-run track is `[1, 6, 7, 10]`.
  55 of the 68 post-fix first-contacts arrive directly after `coach_tab_viewed`,
  which is the quiz screen. The quiz asks recognition questions — what SELECT
  returns, which clause filters, what COUNT counts, what a JOIN is for — and
  anyone who has read one tutorial answers all four. Challenge 1 then demands
  *production*: a GROUP BY with aliases. Recognition is being treated as
  interview-readiness, and 75% of the people it routes there do not finish.
- **Next** Fix the quiz-to-level mapping, not challenge 1. A 4/4 on recognition
  is `working` at most. This is a one-line threshold change plus a re-read.

### first-run layout + Run/Submit pinned on mobile — **FLAT**
- **Claimed** 2026-08-07 · **Read** 2026-08-14
- **Measured** challenge 91 solve-through **66% pre → 69% post** (21/32 → 24/35).
  Target was >=80%.
- **Verdict** FLAT. A 3-point move on ~35 openers is inside noise; do not read
  it as an improvement.
- **Read** The layout fix is verified to work mechanically — one click puts the
  editor, Run and Submit on a 375x812 screen — but 91's traffic **collapsed**
  from 42 first-contacts to 14 over the same period, because the quiz now sends
  those users to challenge 1 instead. The fix may be fine; it barely got tested.
  Re-read after the quiz threshold is corrected.

### working-track reorder: #99 before #100 — **HIT**
- **Claimed** 2026-08-07 · **Read** 2026-08-14
- **Measured** #100 first-contacts **20 → 0**. #99 took the slot with 28.
- **Verdict** HIT. #100 no longer appears as anyone's first challenge.
- **Read** The intended change landed exactly. But the replacement is only
  partly better: #99 as a *first* challenge runs **37% solve-through** (14/38),
  against #100's 25%. #99 measures 85% mid-curriculum, so this is the same
  lesson as #100 — a challenge that is easy in context is hard as a first
  contact. Worth a follow-up, not a revert.
