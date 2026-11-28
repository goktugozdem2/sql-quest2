# The personal roadmap — company, level, focus, deadline → a plan (2026-11-26)

**Status:** pure engine + tests. `src/utils/personal-roadmap.js`
(`buildRoadmap`, `resolveProfile`), `tests/personal-roadmap.test.js`.
**Not wired into `src/app.jsx`.** Tournament arms B and D call it in their
own PRs (`docs/plans/first-session-tournament-2026-11-26.md` §8).

**The founder's direction (chat, 2026-11-26, verbatim):** "mülakata
hazırlananlarda kendi içerisinde olacak yani neye hazırlanıyor hangi sektör
seviyesi nedir özellikle öğrenmek istediği konu nedir deadline var mı vs.
buna göre de kırılımlar olacak bu kırılımlara göre farklı roadmap oluşması
lazım yani tamamiyle kişiselleştirilmiş"

Put simply: for people preparing for an interview, the plan is built from
what they are preparing for, the sector, their level, the topic they most
want to learn and whether there is a deadline. Each combination gets a
different roadmap.

Metric `plan_steps_done_7d` (`docs/agent/metrics.md`). Ledger claim: "the
personal roadmap engine".

---

## 1. Two layers: personalization and the experiment

The orchestrator's framing, and the rule this engine is built to:

1. **Personalization.** The roadmap's content is computed for each person
   from their profile. It is deterministic and rule-based, and every
   tournament arm that shows a plan gets the same engine.
2. **Experiment.** The tournament arms test **how the profile is captured
   and how the plan is shown**:
   - arm B infers the profile silently from the door and the 4-question
     ladder;
   - arm D asks for the company in one tap and sets a 14-day sprint;
   - arm C uses the readiness test's ten questions.

Reads stay on the arm level, split into **four strata**: the entry segment
from #409 (interview-target or other) × the device band (desktop, or phone
and tablet). Both are fixed at assignment, and both are already tournament
splits. At ~23 new people a day (~8 per arm), one personalization slice,
such as "Capital One × Advanced × weak on window functions", sees a few
people a month. That is far too few to A/B slices one by one. So the
engine's rules are written down here and judged at arm level. Its own
metric, `plan_steps_done_7d`, says whether people follow the plan at all
(§8), not whether one rule beat another.

> Papercut: "the 4 strata" is not defined anywhere in the repo. This doc
> uses segment × device. If the orchestrator meant other strata, it is a
> one-line change in the metric.

---

## 2. The profile: six dimensions, none asked by a form at the door

`resolveProfile(profile, bank, opts)` returns each dimension and its
source (`*Source`), so an arm can log what was known and what was
defaulted.

| Dimension | Where it comes from, in order (the first one present wins) | When nothing is known |
|---|---|---|
| **Target company** | 1. A `?company=` arrival or a company-page door (inferred). 2. Arm D's one tap, or the company ask (one optional tap). 3. The readiness test's `?company=` (test). | No company. Then the sector, then the goal's skills. |
| → **its tagged skill mix** | `findPlanTarget`: a signed archetype (Capital One, Revolut: the set + its own mock) or a **tagged** target (≥ `MIN_TAGGED_CHALLENGES` = 5 tagged; the generic Pro mock; the honest `taggedTargetNote`; **never a readiness number**, interview-prep.js rule 2). The mix is the set's skills, counted with `challengeMatchesSkill`, so "Querying Basics" means basic-only (the 2026-09-19 rule), not "every challenge with a SELECT". | — |
| **Sector** | 1. `?sector=` door (inferred). 2. An industry answer (one optional tap). Used when the company has < 5 tagged. The pool is the sector's datasets (`finans_*`, `gayrimenkul_*`, `uretim_*`, `ecommerce`). `SECTOR_TAGS` is not used: it is stale, and has 2 finance rows for 109 sector challenges. | Goal scope: the Coach goal's `skillsTargeted`. |
| **Level** | 1. Arm B's ladder tier, or a placement (inferred from solving). 2. The readiness band, `levelForReadiness` (test). Always one of the four `placement.js` ids. | Interview goal → `basics` (Intermediate): interview people run and solve at 80% (#409, segment B). Otherwise `brand-new` (Foundations). |
| **Focus topic** | 1. Stated (one optional tap). 2. The **weakest canonical skill** among the ladder or readiness scores, not counting Querying Basics, and only if it is below `WEAK_BELOW` (70). | No focus. The plan follows the scope's mix. |
| **Deadline** | 1. **Days** the person states. Arm D's sprint passes 14. | **The default sprint by level: Foundations and Intermediate 14 days, Advanced and Interview-ready 10 days.** It is a number in the result and **never a date anywhere**. The engine writes nothing (test-pinned), so it can never fill `prepTarget.date`. That date would turn on `deadlineOffer`'s "N days to your interview" and the interview-outcome mail. |
| **Goal** | 1. Stated (`interview` / `job_ready` / `learning`). 2. A company or a date → `interview`. 3. Advanced or Interview-ready level → `job_ready`. | `learning`. |
| **Device** | Viewport band, inferred. | `desktop`. |

**Region (India) is not a dimension.** The price belongs to the modal
(`regional-price.js`). The plan is the same in every region (persona 6).

---

## 3. The rules

All constants are exported from `personal-roadmap.js`. The tests read them
from there and do not copy them.

1. **Length.** Core steps = clamp(deadline days × daily cap,
   `MIN_ROADMAP_STEPS` = 12, the level cap).
   - The level caps are Foundations 15, Intermediate 20, Advanced 25,
     Interview-ready 30. **A phone is always 12**: 0 of 84 phone arrivals
     reached 6 solves (tournament plan §1a).
   - 12 = the 10 free solves + 2, so the wall always falls inside the
     plan.
   - Reviews and mocks come on top of the core steps.
2. **Pace (the daily count).** `dailyCount = clamp(ceil(core / days),
   MIN_DAILY = 2, cap)`. The cap is 3 on a desktop
   (`MAX_PLAN_ITEMS_PER_DAY`, interview-prep's "today's three") and 2 on a
   phone.
   - The floor of 2 puts six solves inside the first three days. 10 of 12
     buyers bought at ≥ 6 solves, a median of 1.3 days after the first open
     (#409).
   - A stated date shorter than the plan needs (e.g. 3 days) keeps the cap
     and reports `overrunsDeadline: true`. It never piles 5 a day on
     someone.
3. **Difficulty ramp by level** (`DIFFICULTY_MIX_BY_LEVEL`):

   | Level | Easy | Medium | Hard |
   |---|---|---|---|
   | Foundations | 70% | 30% | 0% |
   | Intermediate | 40% | 50% | 10% |
   | Advanced | 15% | 55% | 30% |
   | Interview-ready | 0% | 45% | 55% |

   A beginner never meets a Hard (test). The one exception to the level
   mix is a signed set's free three (rule 7).
4. **Mix = the scope's skill weights × weakness, with the focus
   guaranteed.**
   - The weight of a skill is its count in the scope (the company set,
     else the sector pool, else the goal's skills, 1 each) ×
     (1 + (100 − score)/100) when a score is known.
   - The focus gets at least `FOCUS_SHARE` = 30% of the weight.
   - A Foundations person only gets the `fundamentals` goal's five skills
     plus the focus, whatever the company.
   - The slots are spread by a smooth weighted round-robin, and each slot
     gets a difficulty from the ramp.
5. **Picking for a slot, in order.**
   - **Before the wall:** the slot's skill in scope → the slot's skill
     anywhere → the neighbouring difficulty → any weighted skill.
   - **After the wall:** the company's or sector's own set first, whatever
     the skill (it is what Pro opens), then the same fall-backs.
   - Every pick is the first match under `makeChallengeComparator(
     SQL_ROADMAP_CHALLENGE_ORDER)`, never the raw bank. A reversed bank
     gives the identical plan (test).
   - Debug items (331–342) are never planned. They belong to hypothesis
     H2.
6. **Order.** The plan has two parts: the free part (up to the wall) and
   the part after the wall.
   - Each part is sorted by difficulty (the ramp), then by the curriculum
     comparator. The tests pin "curriculum order within a difficulty"
     inside each part.
   - The ramp restarts after the wall: the company's own Easy items come
     back at the start of the Pro part. The reason is that the Pro part is
     the set itself, read Easy → Hard.
7. **Where the 10-solve wall lands.**
   - `wallAt` is the step that is the person's `FREE_SOLVE_QUOTA − solved`th
     free solve, which is 10 for someone new.
   - **No Pro-only step comes before it.** Pro-only means a Hard that is not
     a `freePreview`, a signed set's item beyond the gate's free three
     (`companySetFreeIds`, `companySetGate` is on), or a Pro mock.
   - So the quota stays the first wall, and there are always ≥ 10 free
     steps.
   - If the free bank ever runs out before the wall, the Pro-only steps are
     dropped rather than moved forward.
   - **A company person meets their company inside the free ten.** The
     set's free three (signed sets, at any level), or the first three free
     tagged or sector items, are reserved into the free part.
8. **Where a mock goes** (interview goal only).
   - **The free mock** (`sql-fundamentals-free`) goes right after the wall.
     The quota does not close it, so the plan's next step past the wall is
     still something the person can do. It is a free road, like the wall's
     `quotaFreePaths`.
   - **The Pro mock** is the last step: the company's own if it is signed,
     else `top-10-most-asked` through `pickProMockId`. A timed sitting is
     a dress rehearsal, and it goes at the end, as in `planToDate`.
9. **Spaced-retrieval inserts.**
   - With a focus below `WEAK_BELOW`, a **review** step on the focus skill
     is inserted at the start of the day 3, 7 and 14 days
     (`INTERVALS_DAYS`) after the focus is first planned. Only days inside
     both the plan and the deadline get one.
   - A review is free, unsolved, and at or below the hardest focus
     difficulty planned so far: recall, never a stretch
     (`pickRetrievalChallenge`'s rule).
   - Reviews count as solves for the wall.
   - At runtime the app re-checks against `dueRetrievals` (user_skill).
     The roadmap's insert is the schedule, not a substitute for it.
10. **Recompute.** The engine is pure, and `solvedIds` is an input. After
    each solve the arm calls it again. Solved items never come back, and
    the wall moves forward by one (test).

---

## 4. Fallbacks when a dimension is unknown

| Unknown | Rule fired | Source string |
|---|---|---|
| company, or a company with < 5 tagged | the sector if one is known, else the goal's `skillsTargeted`. The why line says "We have fewer than 5 questions tagged X" | `scope: 'sector' \| 'goal'` |
| sector | the goal's skills | `scope: 'goal'` |
| level | interview → `basics`, else `brand-new` | `levelSource: 'default'` |
| focus | none (no ladder or readiness scores), or none because nothing scored is below 70 | `focusSource: null` |
| deadline | default sprint by level (14 / 14 / 10 / 10 days) | `deadlineSource: 'default_by_level'` |
| goal | company or date → interview; Advanced+ → job-ready; else learning | `goalSource` |
| device | desktop | — |

---

## 5. Six worked personas, from the live bank (2026-11-26)

**Bank:** `challenges.js` + `sector-challenges.js` + Debug (bundle order),
`challenge-companies.js`, `mock-interviews.js` and `goals.js`, as in
`tests/personal-roadmap.test.js`. That test pins each list id for id, so
a bank change that moves a plan fails there, and this table is updated in
the same commit.

Notation: E/M/H = difficulty, **P** = Pro-only, *r* = review, a bold step
number = `wallAt` (the 10th free solve).

**1. Capital One analyst, 10 days to the screen, weak on window functions.**
- Profile: `{company: 'Capital One', level: 'working', deadlineDays: 10,
  skillScores: {Window Functions: 20, Joins: 70, Aggregation: 75}}`.
- Result: archetype, interview goal (inferred), focus Window Functions
  (weakest). **29 steps, 3 a day, 9 days, wall at 10, 67% Capital One.**
- Steps:
  - Free part: 98E · 105E · 168E · 275E · 276E · 277E · 107M · 110M · 57M ·
    **169E *r***
  - Free mock: `sql-fundamentals-free`
  - After the wall: 112M · 285E P · 278M P · 279M P · 280M P · 281M P ·
    282M P · 290M P · 291M P · 292M P · 283H P · 284H P · 23H *r* ·
    296H P · 297H P · 298H P · 299H P
  - Last: `capital-one-codesignal` P
- Why:
  - "Built on our 25-question Capital One set and its timed mock."
  - "Window Functions comes up 9 times: it was your weakest skill so far."
  - "10 days to your interview: 3 a day, starting at Easy for your
    Advanced level."
- What happens: the gate's free three (275–277) sit inside the free ten.
  The window functions review returns on day 4 (#169, Easy) and day 8
  (#23, a free Hard preview). Day 15 is past the date.

**2. Revolut, no date, intermediate.**
- Profile: `{company: 'Revolut', level: 'basics'}`.
- Result: archetype, default 14-day sprint. **22 steps, 2 a day, 10 days,
  wall at 10, 60% Revolut.**
- Steps:
  - Free part: 98E · 99E · 105E · 103E · 104E · 174E · 177E · 300E · 301M ·
    **303M**
  - Free mock: `sql-fundamentals-free`
  - After the wall: 304M P · 306M P · 309M P · 311M P · 31H P · 302H P ·
    305H P · 307H P · 308H P · 310H P
  - Last: `revolut-analytics-screen` P
- Every one of the 12 Revolut questions is in the plan.

**3. A learner with no company.**
- Profile: `{goal: 'learning'}`.
- Result: Foundations (default), 14-day sprint. **15 steps, 2 a day,
  8 days, wall at 10.**
- Steps: 91E · 92E · 98E · 99E · 105E · 104E · 127E · 174E · 177E · **178E**
  · 93E · 107M · 106M · 34M · 57M.
- It starts at #91, the first contact every curriculum path uses. Nothing
  in it is Pro-only.

**4. Meta: a big-tech company with ≥ 5 tagged (22) and no signed set.**
- Profile: `{company: 'Meta', level: 'working', goal: 'interview'}`.
- Result: tagged target, 10-day default. **27 steps, 3 a day, 9 days,
  wall at 10, 84% Meta.**
- Steps:
  - Free part: 98E · 168E · 177E · 34M · 35M · 46M · 53M · 56M · 66M ·
    **121M**
  - Free mock: `sql-fundamentals-free`
  - After the wall: 2H P · 9H P · 11H (free preview) · 26H P · 54H P ·
    55H P · 59H P · 60H P · 61H P · 72H P · 77H P · 83H P · 85H P ·
    87H P · 88H P
  - Last: `top-10-most-asked` P
- The why line is `taggedTargetNote`: "Built from the 22 questions tagged
  Meta and your weakest skills — not Meta's process." There is no number.

**5. A company with < 5 tagged → sector fallback.**
- Profile: `{company: 'American Express', sector: 'finans', level:
  'basics'}`. American Express has 0 tagged, so `findPlanTarget` returns
  null, and the sector came in through `?sector=finance`.
- Result: **22 steps, 2 a day, 10 days, wall at 10, 95% finance
  datasets.**
- Steps:
  - Free part: 177E · 200E · 201E · 202E · 203E · 207E · 208E · 209E · 276E ·
    **277E**
  - Free mock: `sql-fundamentals-free`
  - After the wall: 210M · 211M · 212M · 213M · 214M · 215M · 278M · 279M ·
    271H P · 296H P
- Re-derived 2026-11-27 after #268 added ids 343–354: the eleven new finance
  challenges reweight the sector's skill mix (Subqueries & CTEs 24 → 34,
  Date Functions 12 → 17, NULL Handling 7 → 11), so the slots moved
  (168 → 209, 218 → 215, 216/260 → 271/296); none of 343–354 is picked,
  because earlier finance items sort first in curriculum order.
  - Last: `top-10-most-asked` P
- #276–279 sit on the card ledger (Capital One's set). Outside the Capital
  One company view the gate does not apply, so they are free here.
- Why: "We have fewer than 5 questions tagged American Express, so this plan
  uses the finance datasets."

**6. India, phone, beginner, wants an analyst job.**
- Profile: `{level: 'brand-new', device: 'mobile', goal: 'job_ready'}`.
- Result: **12 steps, 2 a day, 6 days, wall at 10.**
- Steps: 91E · 92E · 98E · 99E · 105E · 104E · 174E · 177E · 34M · **57M**
  · 107M · 184M.
- The region changes nothing in the plan; the device makes it the shortest
  plan. The analyst goal's skills are narrowed to the fundamentals five,
  because a Foundations person starts there.

| Persona | Steps | A day | Days | Wall | Scope share | Pro-only steps |
|---|---|---|---|---|---|---|
| Capital One, 10 d, weak window | 29 | 3 | 9 | 10 | 67% | 16 |
| Revolut, no date, Intermediate | 22 | 2 | 10 | 10 | 60% | 11 |
| Learner, no company | 15 | 2 | 8 | 10 | — | 0 |
| Meta (tagged 22) | 27 | 3 | 9 | 10 | 84% | 15 |
| American Express → finance | 22 | 2 | 10 | 10 | 95% | 3 |
| India, phone, beginner | 12 | 2 | 6 | 10 | — | 0 |

---

## 6. What the person sees

- **One line:** `summary`, e.g. "Your plan: Capital One prep · 29 steps ·
  3 a day". Arms B and D render it in their own place: B's plan line, D's
  "Day 1 of 14 · … · 3 today".
- **"Why this plan":** `why`, 2–3 sentences naming the person's own
  inputs:
  - the target, with the honest note for a tagged company and the "fewer
    than 5 tagged" fallback;
  - the focus and why it is the focus (stated, or their weakest);
  - the pace and where the number came from (their date, or the default
    sprint for their level).
- No line in `summary` or `why` names Pro (test).
- **Per step:** `reason` (`company_free`, `company_set`, `sector`, `focus`,
  `weak_skill`, `skill_mix`, `retrieval`, `mock_free`, `mock_pro`),
  `free` / `proOnly`, `part`, `day`. The plan sheet can show a short
  reason per step ("from your Capital One set", "your weakest skill",
  "review").

---

## 7. What needs the founder's go

The engine names no Pro in any string. These presentation choices do, and
each arm's PR needs the go before its flag flips. They join the tournament
plan's §7 list.

| Where | String or behaviour | Why it is money copy |
|---|---|---|
| plan sheet | a "Pro" label on `proOnly` steps (EN "Pro", TR "Pro") | it names Pro next to the person's own plan |
| plan line at the wall | "{k} of {N} done — the rest of your plan is Pro." (B, C), "Day {d} of {D} — the rest of your {Company} sprint is Pro." (D) | already listed in tournament §7; N now comes from `buildRoadmap().length` |
| the free mock right after the wall | a free step placed where the quota wall's modal is | changes what sits beside the paywall |
| the Pro mock as the last step | `capital-one-codesignal` / `revolut-analytics-screen` / `top-10-most-asked` shown as the plan's end | a Pro item as the destination of the plan |

Not money copy: the `why` lines, the summary, the step reasons.

---

## 8. Measurement (rule 6b: defined before the code that is measured)

- **Metric `plan_steps_done_7d`** (metrics.md). It is per arm (B, D, later
  C) × the four strata. It counts the distinct plan challenge ids solved
  within 7 days of the person's first `path_plan_built`, plus plan
  adherence (the share of their 7-day solves that were plan steps).
  - It **attributes**. It does not decide: `first_session_tournament`
    decides.
  - It tells the reader whether an arm's result can be put down to the
    roadmap. People who did not follow the plan were not moved by it.
- **What the arms must log** (in their PRs): `path_plan_built` with the
  `profile` block this engine returns (scope, targetKind, level and
  levelSource, focus and focusSource, deadlineDays and deadlineSource,
  goal and goalSource, device), `planIds` (the challenge ids, in order),
  `wallAt`, `dailyCount` and `length`. A recompute that changes the ids
  logs again with `recompute: true`.
- **Personalization slices** (scope × level × focus) are reported as n
  only, and directional. They are never a decision at this volume (§1).

---

## 9. Tests (`tests/personal-roadmap.test.js`, 34) and the break each was proven by

| Invariant | Deliberate break that failed it |
|---|---|
| six personas pinned id for id | every break below changes at least one pin |
| no Pro-only step before `wallAt`; `wallAt` is the 10th free solve | the free part made 3 slots short (`i < F - 3`): 13 tests failed, including the wall test |
| every `free` step is free to a free account | locked Hards marked not Pro-only: the free-step test failed |
| curriculum order within a difficulty, the ramp, in each part | the in-part sort switched to raw id: the order test and 5 pins failed |
| scope share ≥ 50%, or every slot the set may legally fill | the after-wall scope preference removed: the share test, the sector-fallback test and 4 pins failed |
| only the level's difficulties (the signed free three excepted) | Hard allowed at every level: the level test failed |
| the free mock after the wall, the Pro mock last | the free mock put at step 1: the mock test and the wall test failed |
| no `prepTarget`, no date, no storage, no clock in the module | `profile.prepTarget.date` written: the frozen-profile test and the source guard failed |
| deterministic | `Math.random` in the round-robin: the determinism test and the source guard failed |
| never raw bank order (a reversed bank gives the same plan) | `.sort(cmp)[0]` → `[0]`: the reversed-bank test and 5 pins failed |
| no Debug item | the type filter removed: the thin-bank Debug test failed. (On the full bank, Debug items sort last and were never reached, so the test runs on a thin bank where they would be.) |
