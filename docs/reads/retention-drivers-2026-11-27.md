# What in the first session predicts a second one? (read 2026-11-27)

Lane B1, an extra retention read. `second_session_7d` read 12.0% for first
opens 11-13 → 19, and 14.6% the week before. The 11-25 reads put the step at
the 09-26 flag batch (`docs/reads/second-session-2026-11-25.md`,
`docs/reads/returns-0926-flags-2026-11-25.md`). The `freeQuota` holdout
starts enrolling 2026-11-28. This read asks something narrower: **among
humans, which first-session behaviours go with a return within 7 days, and
did that change at the quota?** The answers feed the tournament backlog
(`docs/plans/first-session-tournament-2026-11-26.md` §6).

Read-only queries (Supabase MCP), aggregates only. No aid, username or email
leaves the database or appears here. The model ran in a scratchpad script
on exported cell counts (one row per feature combination with its count).
Nothing of it is in the repo.

## Verdict

1. **The quota turned heavy first sessions from the best returners into the
   worst.** Before 09-26, a person who solved 10+ challenges in their first
   sitting came back 68% of the time (n 56). After, 10% did (n 29, 27 of
   them met the quota wall in that sitting). In the pooled model, the
   interaction "post-quota × 10+ solves" has OR 0.07 (95% CI 0.02–0.27,
   LR χ² 20.1). This is the only first-session behaviour whose effect
   *reversed* across the flip. It is the most likely causal effect in this
   read, because the change of rule produced it. The money does not make up
   for it: 1 trial and 0 payments in 30 days from those 27, against 1
   payment from the 56 before.
2. **It is a small slice of the total.** The 10+ sitting is 2% of first
   opens. Return fell at every solve level: 0 solves 14.2 → 10.9%, 1 solve
   30.2 → 17.3%, 2–5 40.1 → 22.1%, 6–9 52.6 → 37.3%. Post-quota, extra
   solves in sitting one no longer buy a return. At equal session length,
   2–5 solves carry OR 0.37 (0.15–0.91) after the flip, against 1.94
   (0.90–4.19) before. That fits the framing story in the 11-25 read: a
   countdown makes each solve a spend. It does not prove it. The holdout's
   1–9 split is the test.
3. **The strongest single predictor is how long the first sitting lasts.**
   30+ minutes: OR 7.6 (3.6–16.1), +32 pts. This is mostly selection.
   60% of first sittings end inside 2 minutes and return at 8.8%.
4. **Hints, the tutor, the tutor nudge, lessons, the Coach, India vs the
   rest, the hour of day and weekend all predict nothing** once solves and
   session length are in the model (every OR between 0.82 and 1.24, every
   CI spanning 1).
5. **Returns are self-initiated.** 1 of 188 post-quota returners came back
   through an email link within 7 days (pre: 3 of 315). No pull channel
   works in week 1. That bears on any hypothesis that leans on reminders.

## Method

- **People and humans.** Person = `coalesce(meta->>'aid', username)`,
  `meta = (metadata #>> '{}')::jsonb`. Human = the `base:begin … base:end`
  block of `scripts/scorecard-weekly.sql`, run as is: internal, founder
  walks incl. `a2a2%` and the 11-26 walk aid, bot stamps, crawler
  viewports, ref spam, `app1lang`, `topic1lang`, `prestamp_fp`, `utc1280`,
  `cn_app`, `langs2` and the landing-only classes. One row marks the whole
  person.
- **Cohorts.** First human `app_opened`:
  - **post** = 2026-09-28 → 11-19 (n 1,448);
  - **pre** = 2026-08-17 → 09-25 22:45 UTC, the flip (n 1,498).
  Every person has 7 full days. People whose first `app_opened` already
  carried solves or `returning=true` are out (2 post).
- **First session.** Non-landing events from the first open (−5 min) until
  the first gap > 30 minutes.
- **Outcome (primary).** Any non-landing event after session 1 that is on a
  later UTC day than the first open, within 7 days. This is the
  tournament's `second_session_7d` guardrail and the scorecard's
  `returned_7d` rule, plus "after session 1", so a sitting that runs past
  midnight UTC is not a return. Base: **post 14.2%, pre 23.0%**. The
  metrics.md `second_session_7d` definition (`app_opened` > 1 h after the
  first) gives 12.6% / 20.5% and the same ranking (model in §3). Also
  reported: **6+ distinct solves in 7 days** (post 11.3%, pre 16.0%).
- **Model.** Logistic regression (binomial GLM, frequency weights over the
  exported cells). Variables: door, mobile, India tz, session-1 solves,
  signup, intent, help (hint or tutor), mock, lesson, session length, local
  hour, and in post the tutor nudge. Variables are ranked by the
  likelihood-ratio χ² from dropping each one. For each level, the average
  marginal effect (AME) is the mean change in predicted probability when
  that level is switched on vs the reference. 95% CIs are Wald.
- **Left out of the model on purpose:** `streak_card_opened` (fires on the
  day's first solve), `session_warmup_complete` (fires on the 3rd solve)
  and the `milestone_solves` modal (fires at a solve tier). All three
  restate the solve count. In a first fit with them in, the solve
  coefficients blew up (CI 0.12–16.5). Their single-variable tables are
  in §2.
- **Not measurable:**
  - Country: there is no country field on app events, so "India" means a
    first open in `Asia/Kolkata` / `Asia/Calcutta`.
  - Guest vs registered at the first open: `app_opened.isGuest` is
    `'false'` on 11,763 of 11,764 rows since 08-01, so it carries nothing
    (papercut below).
  - The daily challenge: it has no event of its own.

## 1. Who comes back: the population

| | pre (08-17 → 09-25) | post (09-28 → 11-19) |
|---|---|---|
| first openers (humans) | 1,498 | 1,448 |
| returned within 7 d (primary) | 23.0% | 14.2% |
| `second_session_7d` (metrics.md) | 20.5% | 12.6% |
| 6+ solves in 7 d | 16.0% | 11.3% |
| ≥ 1 solve in session 1 | 30.7% | 30.7% |
| session 1 under 2 min | 55.7% | 60.5% |
| signed up in session 1 | 12.8% | 7.8% |

Weekly (primary outcome, all first openers / session-1 solvers):

| Week of first open | n | returned | solvers | solvers returned | 6+ solvers in s1 | of them returned |
|---|---|---|---|---|---|---|
| 08-17 | 185 | 21.6% | 57 | 42.1% | 19 | 9 |
| 08-24 | 191 | 19.4% | 53 | 43.4% | 25 | 11 |
| 08-31 | 230 | 23.9% | 75 | 38.7% | 20 | 12 |
| 09-07 | 271 | 22.1% | 82 | 36.6% | 23 | 16 |
| 09-14 | 300 | 23.7% | 90 | 50.0% | 16 | 13 |
| 09-21 (to the flip) | 321 | 25.5% | 103 | 45.6% | 29 | 17 |
| 09-28 | 273 | 15.8% | 95 | 24.2% | 24 | 6 |
| 10-05 | 306 | 13.7% | 80 | 31.3% | 15 | 3 |
| 10-12 | 183 | 14.2% | 64 | 25.0% | 15 | 4 |
| 10-19 | 171 | 15.8% | 51 | 17.6% | 4 | 2 |
| 10-26 | 150 | 15.3% | 48 | 20.8% | 4 | 2 |
| 11-02 | 131 | 8.4% | 37 | 10.8% | 9 | 2 |
| 11-09 | 138 | 16.7% | 41 | 17.1% | 9 | 4 |
| 11-16 (to 11-19) | 96 | 11.5% | 28 | 10.7% | 8 | 2 |

The week of 09-28 carries the crawler burst the tournament plan warns about.
Dropping it changes nothing material. From 10-05 on: 10+ sitting 3 of 19
returned, 6–9 16 of 45, 2–5 40 of 177, 1 15 of 108, 0 89 of 826.

## 2. Each feature on its own

Primary outcome. "ret" = returned, "non" = did not. The 95% CI is Wilson,
on the post rate. Read these as associations: §3 controls them against each
other.

**Arrival door** (`landingSrc` `ai:*` first, then the first open's
`arrivalSrc`. Company = `company:*`, `*-sql-interview*`, readiness, the
Capital One blog. Topic = `challenges-*`. Other = learn-sql, comparison
pages, blog, cheat sheet.)

| Door | post n | ret / non | post rate (CI) | pre n | pre rate | post 6+ in 7 d |
|---|---|---|---|---|---|---|
| sql-exercises | 507 | 88 / 419 | 17.4% (14.3–20.9) | 529 | 24.0% | 17.0% |
| other page | 153 | 28 / 125 | 18.3% (13.0–25.2) | 164 | 22.6% | 12.4% |
| topic | 236 | 34 / 202 | 14.4% (10.5–19.5) | 51 | 15.7% | 9.7% |
| AI assistant | 73 | 9 / 64 | 12.3% (6.6–21.8) | 23 | 13.0% | 6.8% |
| company / interview | 281 | 32 / 249 | 11.4% (8.2–15.6) | 225 | 21.8% | 7.1% |
| direct (no source) | 71 | 8 / 63 | 11.3% (5.8–20.7) | 129 | 15.5% | 8.5% |
| homepage | 73 | 6 / 67 | 8.2% (3.8–16.8) | 347 | 26.8% | 5.5% |
| email | 18 | 1 / 17 | 5.6% | 17 | 17.6% | 0.0% |
| question page | 36 | 0 / 36 | 0.0% (0–9.6) | 13 | 38.5% | 2.8% |

**Device, country band, hour, weekend**

| Feature | Level | post n | ret / non | post rate | pre n | pre rate |
|---|---|---|---|---|---|---|
| device | desktop | 1,289 | 193 / 1,096 | 15.0% | 1,272 | 24.7% |
| | mobile | 138 | 11 / 127 | 8.0% | 203 | 11.8% |
| | tablet | 18 | 2 / 16 | 11.1% | 17 | 41.2% |
| India tz | yes | 537 | 81 / 456 | 15.1% | 669 | 22.0% |
| | no | 911 | 125 / 786 | 13.7% | 829 | 23.9% |
| local hour of the first open | 00–05 | 120 | 17 / 103 | 14.2% | 127 | 22.0% |
| | 06–11 | 313 | 39 / 274 | 12.5% | 322 | 22.0% |
| | 12–17 | 561 | 86 / 475 | 15.3% | 624 | 23.2% |
| | 18–23 | 453 | 64 / 389 | 14.1% | 425 | 23.8% |
| weekend (local) | yes | 318 | 49 / 269 | 15.4% | 287 | 22.6% |
| | no | 1,129 | 157 / 972 | 13.9% | 1,211 | 23.1% |

**What happened in session 1**

| Feature | Level | post n | ret / non | post rate (CI) | pre n | pre rate | post 6+ in 7 d |
|---|---|---|---|---|---|---|---|
| solves | 0 | 1,004 | 109 / 895 | 10.9% (9.1–12.9) | 1,038 | 14.2% | 2.3% |
| | 1 | 139 | 24 / 115 | 17.3% (11.9–24.4) | 116 | 30.2% | 7.9% |
| | 2–5 | 217 | 48 / 169 | 22.1% (17.1–28.1) | 212 | 40.1% | 19.4% |
| | 6–9 | 59 | 22 / 37 | 37.3% (26.1–50.0) | 76 | 52.6% | 100% |
| | 10+ | 29 | 3 / 26 | **10.3%** (3.6–26.4) | 56 | **67.9%** | 100% |
| quota wall (`free_quota`) | met | 31 | 3 / 28 | 9.7% (3.3–24.9) | — | — | 93.5% |
| other content lock | met | 126 | 19 / 107 | 15.1% | 59 | 22.0% | 11.1% |
| first Pro modal, by reason | none | 1,314 | 174 / 1,140 | 13.2% | 1,303 | 18.5% | 5.7% |
| | `milestone_solves` | 92 | 26 / 66 | 28.3% (20.1–38.2) | 158 | 57.0% | 94.6% |
| | locked content (company set/hard, mock link, pattern mock, cold start) | 27 | 4 / 23 | 14.8% | 12 | 25.0% | 3.7% |
| | other | 15 | 2 / 13 | 13.3% | 25 | 44.0% | 6.7% |
| signed up | yes | 113 | 36 / 77 | 31.9% (24.0–40.9) | 191 | 46.6% | 42.5% |
| | no | 1,335 | 170 / 1,165 | 12.7% | 1,307 | 19.6% | 8.7% |
| goal / intent stated | none | 858 | 92 / 766 | 10.7% | 1,017 | 14.8% | 2.2% |
| | interview | 293 | 43 / 250 | 14.7% (11.1–19.2) | 181 | **37.6%** | 16.7% |
| | job-ready | 89 | 29 / 60 | 32.6% (23.7–42.9) | 115 | 49.6% | 36.0% |
| | learning | 95 | 24 / 71 | 25.3% | 84 | 40.5% | 34.7% |
| | other (`ask`, unset) | 113 | 18 / 95 | 15.9% | 101 | 34.7% | 27.4% |
| hint opened | yes | 226 | 55 / 171 | 24.3% | 28 | 46.4% | 35.0% |
| inline tutor opened | yes | 136 | 32 / 104 | 23.5% | 72 | 45.8% | 50.7% |
| tutor nudge shown | yes | 236 | 54 / 182 | 22.9% | — | — | 39.4% |
| mock started | yes | 36 | 13 / 23 | 36.1% (22.5–52.4) | 14 | 64.3% | 19.4% |
| Coach tab viewed | yes | 1,250 | 179 / 1,071 | 14.3% | 1,245 | 24.7% | 12.1% |
| | no | 198 | 27 / 171 | 13.6% | 253 | 14.6% | 6.6% |
| lesson 1 | yes | 118 | 30 / 88 | 25.4% | 175 | 36.0% | 30.5% |
| streak card shown (day's first solve) | yes | 433 | 96 / 337 | 22.2% | 98 | 43.9% | 32.3% |
| warm-up complete (3rd solve) | yes | 248 | 66 / 182 | 26.6% | 282 | 48.9% | 50.4% |
| time to first solve | < 3 min | 196 | 35 / 161 | 17.9% | 66 | 34.8% | 32.1% |
| | 3–10 min | 139 | 32 / 107 | 23.0% | 220 | 42.3% | 35.3% |
| | 10+ min | 109 | 30 / 79 | 27.5% | 174 | 47.1% | 26.6% |
| | no solve | 1,004 | 109 / 895 | 10.9% | 1,038 | 14.2% | 2.3% |
| session length | < 2 min | 876 | 77 / 799 | 8.8% (7.1–10.8) | 835 | 11.9% | 1.6% |
| | 2–10 min | 193 | 31 / 162 | 16.1% | 210 | 22.9% | 7.8% |
| | 10–30 min | 219 | 43 / 176 | 19.6% | 229 | 35.4% | 21.0% |
| | 30+ min | 160 | 55 / 105 | 34.4% (27.5–42.0) | 224 | 52.2% | 55.6% |

Notes on the table:
- **The Coach tab** is viewed in 86% of first sessions. It is the landing
  tab, so viewing it is not a choice and the row says nothing.
- **Hints, the tutor and the nudge** reach many more people after the flip
  (the live nudge since 10-03). Every help row's rate is the solver rate in
  disguise. The model removes that (§3).
- **A fast first solve (< 3 min)** returns *less* than a slow one. The
  runnable starter and the challenge-first screen produce quick, easy
  first solves. Among solvers, the model finds no time-to-first-solve
  effect at all (§3).
- **Interview intent fell the furthest** of any stated goal: 37.6 → 14.7%,
  −61% relative, against job-ready −34%, learning −38% and no goal −28%.
  That is arm D's population.

## 3. The model

Post cohort, primary outcome, n 1,447 (one person without a valid tz is
dropped). The variables, ranked by LR χ² (drop one variable, refit):

| Rank | Variable | LR χ² | df | p |
|---|---|---|---|---|
| 1 | session-1 length | 28.1 | 3 | < 0.0001 |
| 2 | session-1 solves | 19.1 | 4 | 0.0008 |
| 3 | arrival door | 18.6 | 8 | 0.017 |
| 4 | stated goal | 9.7 | 4 | 0.046 |
| 5 | signed up in session 1 | 4.3 | 1 | 0.038 |
| 6 | started a mock | 4.1 | 1 | 0.043 |
| — | local hour 2.2 · mobile 1.8 · India 1.2 · tutor nudge 0.4 · lesson 0.1 · hint/tutor 0.0 | | | all p > 0.15 |

The top five, with effect sizes:

| # | Predictor (vs reference) | OR (95% CI) | AME | n exposed | pre-quota OR (CI) | Likely |
|---|---|---|---|---|---|---|
| 1 | session 30+ min (vs < 2 min) | **7.60** (3.60–16.06) | +31.6 pts | 160 | 3.23 (1.74–5.99) | **selection** |
| | session 10–30 min | 2.50 (1.40–4.44) | +10.3 | 219 | 2.71 (1.62–4.54) | |
| | session 2–10 min | 1.77 (1.06–2.96) | +5.7 | 193 | 1.87 (1.22–2.88) | |
| 2 | 10+ solves in session 1 (vs 0) | **0.05** (0.01–0.27) | −17.4 | 29 | **4.97** (1.84–13.44) | **causal (the quota)** |
| | 2–5 solves | 0.37 (0.15–0.91) | −9.7 | 217 | 1.94 (0.90–4.19) | framing, untested |
| | 6–9 solves | 0.55 (0.19–1.57) | −6.5 | 59 | 2.84 (1.16–6.98) | |
| 3 | homepage door (vs sql-exercises) | 0.39 (0.16–0.99) | −8.9 | 73 | 1.34 (0.94–1.91) | selection (traffic) |
| | question-page door | 0 of 36 returned | — | 36 | — | selection |
| | company / interview door | 0.67 (0.35–1.30) | −4.5 | 281 | 1.13 (0.74–1.74) | |
| 4 | goal job-ready (vs none) | **3.32** (1.36–8.10) | +16.8 | 89 | 1.07 (0.50–2.27) | mostly selection |
| | goal learning | 2.01 (0.83–4.83) | +8.5 | 95 | 0.63 (0.28–1.39) | |
| | goal interview | 1.23 (0.60–2.54) | +2.2 | 293 | 0.84 (0.43–1.65) | |
| 5 | signed up in session 1 | **1.74** (1.04–2.90) | +7.0 | 113 | 1.25 (0.84–1.84) | mixed |
| 6 | started a mock | 2.24 (1.05–4.78) | +11.0 | 36 | 3.75 (1.09–12.85) | mixed |

**Pooled model with a post × solves interaction** (n 2,945): post main
effect OR 0.74 (0.55–0.98). The interactions:

| Interaction | OR (CI) | LR χ² |
|---|---|---|
| post × 10+ | **0.07** (0.02–0.27) | 20.1 |
| post × 2–5 | 0.60 (0.35–1.01) | 3.8 |
| post × 6–9 | 0.74 (0.34–1.60) | — |
| post × 1 | 0.87 (0.44–1.71) | — |

Session length, mock and signup keep their pre-quota direction.

**Robustness:**
- **`second_session_7d` as the outcome** (metrics.md definition) gives
  the same top six in nearly the same order: length 19.2, door 15.2,
  solves 15.0, signup 6.7, mock 6.2, intent 3.6. Under it: signup OR
  2.04 (1.20–3.45), mock 2.72 (1.28–5.81), 10+ solves 0.09 (0.02–0.43).
- **Solvers only** (post, n 444): 10+ OR 0.11 (0.02–0.49) vs 1 solve;
  signup 2.08 (1.14–3.80); 30+ min 4.63 (1.02–20.95). Time to first solve
  is nothing: 3–10 min 1.11, 10+ min 1.25, LR 0.3.

### Lever or selection — plainly

- **Session length: selection.** People who meant to practise stay
  longer, and they would have come back anyway. The arrow can also run
  the other way: a person planning to return stops early. Nothing here
  says that making a sitting longer causes a return. The usable fact is
  the floor: 60% of first sittings are under 2 minutes, and they return
  at 8.8%. Getting someone past two minutes is activation, which the
  tournament's arms already target (B, D, H2).
- **10+ solves in sitting one after the flip: causal, most likely.** The
  same behaviour carried OR 4.97 before the rule and 0.05 after, and the
  people did not change: same doors, same solve rate in sitting one
  (30.7% both periods). The mechanism is plain. The 10th solve spends the
  free tier, and the only free things left are the daily challenge, the
  warm-up and the Coach. The holdout tests it directly. Prediction,
  written now: **in the holdout arm, people with 10+ solves in sitting one
  return at ≥ 50%**, against ~10% in the quota arm. With ~4 such people a
  week, the gap will be visible but the CI wide.
- **Extra solves no longer predicting a return (2–5: OR 0.37 after,
  1.94 before): plausibly causal, unproven.** This is the "counter and
  copy" path from the 11-25 read, seen at the level of the person. The
  holdout's 1–9 split is the test. The alternative: low-intent topic and
  question doors grew after the flip, and they produce 1–5-solve dabblers.
  Door is in the model, but door is a coarse proxy for intent.
- **Door: selection.** It describes traffic, not the product. The home
  door's fall (OR 1.34 → 0.39) matches the 11-25 read (home solvers 50 →
  16%). The question-page door (0 of 36) is a known low-intent door.
- **Stated goal: mostly selection.** The person states it. Two facts make
  it useful anyway: job-ready and learning people now return 2–3× as often
  as people with no goal, and interview people lost the most (37.6 →
  14.7%). The interview goal is the one the quota's copy and the paywall
  talk to most directly.
- **Signup: mixed.** Committed people sign up. Email is not the path,
  though: 1 of 188 returns came through an email link in week 1. So if
  signup works, it works through identity and saved progress. Signups in
  sitting one fell from 12.8% to 7.8%.
- **Mock: mixed, small n** (36 post, 14 pre), consistent in both periods.
  It supports the backlog's H4 (mock first for interview doors) more than
  it argues for anything new.
- **Not levers on this evidence:** hints, the inline tutor, the tutor
  nudge, lesson 1, the Coach tab, the hour of day. Help is used by people
  who are already solving, and adds nothing beyond the solving.

## 4. Pre- vs post-quota in one line

Before 09-26 every extra solve in sitting one bought a return (10+ solvers:
68%, OR 4.97). After it, the heaviest sitting returns least (10%, OR 0.05;
interaction OR 0.07, CI 0.02–0.27). Return fell at every solve level, so
the wall alone accounts for ~1 pt of the 8.8-pt gap (29 people × the 58-pt fall).

## 5. Hypotheses for the tournament backlog

Appended to `docs/plans/first-session-tournament-2026-11-26.md` §6 as H7–H9,
from predictors 2, 4–5 and the email finding. Predictors 1 and 3 (length,
door) are selection: their lever is activation and acquisition, which arms
B/D and H2 already cover, so they get no new arm.

- **H7 — Quiet counter** (from #2, solves × quota). The same quota and
  wall; the "N of 10 used" counter and the Coach strip's quota line are
  hidden until the 8th solve.
  - **Mechanism:** the countdown frames session 1 as a ten-question trial,
    so each solve spends instead of building.
  - **Evidence:** after the flip, 2–5 solves in sitting one carry OR 0.37
    vs 1.94 before, at equal session length; 1–9 solvers' return fell
    39.6 → 22.7%.
  - **Expected effect:** if framing explains half the 1–9 gap, solver
    return +8 pts, population second session +2 pts, 6+ in 7 d +1–2 pts.
  - **Gates:** run only if the holdout's 1–9 split recovers. It is an
    exposure change on a money surface, so it needs the founder's go.
- **H8 — Tomorrow's question at the wall and at the end of sitting one**
  (from #2, the 10+ reversal, and the email finding).
  - **What it does:** when a sitting ends after ≥ 1 solve, and always at
    the quota wall, the person sees a named free next step for tomorrow:
    the daily challenge, plus one spaced-retrieval review on the weakest
    skill. One tap sets a browser reminder. Prices and the quota do not
    change.
  - **Mechanism:** the wall ends the relationship because nothing named
    is left. A queued, specific, free task gives the return a reason, and
    returns are self-initiated (email: 1 of 188).
  - **Expected effect:** sitting-one 10+ return 10 → ~30%; solver return
    +5 pts; population second session +1.5 pts.
  - **Gates:** the wall-modal line is money copy (§7) and needs the
    founder's go. The 10+ group alone is too small for an arm to read, so
    read the end-of-session part.
- **H9 — Save your progress at the third solve** (from #5).
  - **What it does:** at the warm-up's third solve, an inline (not modal)
    "Save your 3 solves" one-step signup.
  - **Mechanism:** an account makes the person an identity with saved
    progress. Signup carries OR 1.74 (1.04–2.90) with solves and length
    held, and signups in sitting one fell 12.8 → 7.8%.
  - **Expected effect:** sitting-one signups 8 → ~14%. If a third of the
    association is causal, second session +0.5–1 pt. Honest: the smallest
    of the three, and mostly selection until shown otherwise.
  - **Gates:** none on money. It must not stack with the company ask at
    the first solve (one question at a time).

Plus one evidence note for the existing rows: **H4 (mock first)** gains the
mock OR 2.24 post / 3.75 pre. **Arm D** should know its population, the
interview-goal people, has the steepest return fall (37.6 → 14.7%).

## Papercuts

- `app_opened.isGuest` is `'false'` on 11,763 of 11,764 rows since 08-01.
  It is stamped before guest mode starts, so it cannot split guests from
  registered people at the first open. Read guest status from
  `challenge_solved.isGuest` or the username prefix.
- There is no event for opening or solving the daily challenge, so "did the
  daily in session 1" cannot be read.
- The money join for heavy solvers goes through usernames on the person's
  rows. A guest who later registered under a name never seen on their own
  rows would be missed. Small here (27 people), but the holdout's money read
  should use the same rule as `funnel-by-segment-2026-11-26.md`.

---

## Appendix A — base query

The human filter is `scripts/scorecard-weekly.sql` lines `base:begin` →
`base:end`, verbatim, with `params AS (SELECT now() AS t)`. The `weeks` and
`visits` CTEs are dropped (not used). Each run is prefixed with
`SET statement_timeout = '300s'; SET enable_nestloop = off;`. Without that
prefix the first run hit the default timeout.

## Appendix B — session-1 features (appended after the base's `clean`)

```sql
fo AS (
  SELECT DISTINCT ON (pid) pid, created_at fo, m FROM clean WHERE event='app_opened' ORDER BY pid, created_at
),
co AS (
  SELECT fo.pid, fo.fo, fo.m,
    CASE WHEN fo >= '2026-08-17' AND fo < '2026-09-25 22:45+00' THEN 'pre'
         WHEN fo >= '2026-09-28' AND fo < '2026-11-20' THEN 'post' END AS cohort,
    (COALESCE(m->>'solvedCount','0') ~ '^[1-9]' OR m->>'returning' = 'true') AS prior,
    tz.name AS tzok
  FROM fo LEFT JOIN pg_timezone_names tz ON tz.name = fo.m->>'tz'
),
ev AS (
  SELECT c.pid, c.event, c.created_at, c.m
  FROM clean c JOIN co ON co.pid = c.pid
  WHERE co.cohort IS NOT NULL AND NOT co.prior
    AND c.reason IS DISTINCT FROM 'landing'
    AND c.created_at >= co.fo - interval '5 minutes' AND c.created_at <= co.fo + interval '7 days'
),
g AS (
  SELECT *, CASE WHEN created_at - lag(created_at) OVER (PARTITION BY pid ORDER BY created_at) > interval '30 minutes' THEN 1 ELSE 0 END brk FROM ev
),
s AS (
  SELECT *, sum(brk) OVER (PARTITION BY pid ORDER BY created_at ROWS UNBOUNDED PRECEDING) sn FROM g
),
pp AS (
  SELECT s.pid,
    count(DISTINCT m->>'challengeId') FILTER (WHERE sn = 0 AND event = 'challenge_solved') sv,
    min(created_at) FILTER (WHERE sn = 0 AND event = 'challenge_solved') fs_at,
    max(created_at) FILTER (WHERE sn = 0) s1_end,
    bool_or(sn = 0 AND event = 'content_lock_reached' AND m->>'wall' = 'free_quota') wall,
    bool_or(sn = 0 AND event = 'content_lock_reached' AND m->>'wall' IS DISTINCT FROM 'free_quota') olock,
    (array_agg(m->>'reason' ORDER BY created_at) FILTER (WHERE sn = 0 AND event = 'pro_modal_shown'))[1] modal,
    bool_or(sn = 0 AND event = 'signup_completed') su,
    (array_agg(COALESCE(m->>'intent','?') ORDER BY created_at) FILTER (WHERE sn = 0 AND event IN ('intent_captured','goal_selected')))[1] intent,
    bool_or(sn = 0 AND event = 'challenge_hint_opened') hint,
    bool_or(sn = 0 AND event = 'inline_help_opened') tut,
    bool_or(sn = 0 AND event = 'tutor_nudge_shown') nud,
    bool_or(sn = 0 AND event = 'interview_started') mock,
    bool_or(sn = 0 AND event = 'coach_tab_viewed') coach,
    bool_or(sn = 0 AND event IN ('lesson1_started','lesson1_exercise_completed')) les,
    bool_or(sn = 0 AND event = 'streak_card_opened') st,
    bool_or(sn = 0 AND event = 'session_warmup_complete') wu,
    bool_or(sn >= 1 AND (created_at AT TIME ZONE 'UTC')::date > (c0.fo0 AT TIME ZONE 'UTC')::date) ret,
    bool_or(event = 'app_opened' AND created_at > c0.fo0 + interval '1 hour') ss,
    count(DISTINCT m->>'challengeId') FILTER (WHERE event = 'challenge_solved') sv7
  FROM s JOIN (SELECT pid, fo AS fo0 FROM co) c0 ON c0.pid = s.pid
  GROUP BY s.pid
),
f AS (
  SELECT co.pid, co.fo AS fo_at, co.cohort,
    CASE WHEN co.m->>'landingSrc' LIKE 'ai%' THEN 'ai'
         WHEN co.m->>'arrivalSrc' IS NULL OR co.m->>'arrivalSrc' = '' THEN 'direct'
         WHEN co.m->>'arrivalSrc' LIKE 'company:%' OR co.m->>'arrivalSrc' LIKE '%sql-interview%'
              OR co.m->>'arrivalSrc' LIKE '%readiness%' OR co.m->>'arrivalSrc' LIKE 'blog-capital%' THEN 'company'
         WHEN co.m->>'arrivalSrc' LIKE 'sql-exercises%' THEN 'exercises'
         WHEN co.m->>'arrivalSrc' LIKE 'challenges%' THEN 'topic'
         WHEN co.m->>'arrivalSrc' LIKE 'question%' THEN 'question'
         WHEN co.m->>'arrivalSrc' = 'home' THEN 'home'
         WHEN co.m->>'arrivalSrc' = 'email' THEN 'email'
         ELSE 'other' END door,
    COALESCE(split_part(co.m->>'viewport', ':', 1), '?') dev,
    CASE WHEN co.m->>'tz' IN ('Asia/Kolkata','Asia/Calcutta') THEN 1 ELSE 0 END ind,
    CASE WHEN sv = 0 THEN '0' WHEN sv = 1 THEN '1' WHEN sv <= 5 THEN '2-5' WHEN sv <= 9 THEN '6-9' ELSE '10+' END svb,
    wall::int wall, olock::int olock,
    CASE WHEN modal IS NULL THEN 'none' WHEN modal = 'milestone_solves' THEN 'milestone' WHEN modal = 'free_quota' THEN 'quota'
         WHEN modal IN ('cold_start_anyway','company_set','company_hard','hard_challenge','interview_locked','mock_link','pattern_mock') THEN 'locked_content' ELSE 'other' END modal,
    su::int su,
    CASE WHEN intent IS NULL THEN 'none' WHEN intent IN ('interview','job_ready','learning') THEN intent ELSE 'other' END intent,
    hint::int hint, tut::int tut, nud::int nud, mock::int mock, coach::int coach, les::int les, st::int st, wu::int wu,
    CASE WHEN fs_at IS NULL THEN 'none' WHEN fs_at - co.fo < interval '3 minutes' THEN '<3m'
         WHEN fs_at - co.fo < interval '10 minutes' THEN '3-10m' ELSE '10m+' END ttfs,
    CASE WHEN s1_end - co.fo < interval '2 minutes' THEN '<2m' WHEN s1_end - co.fo < interval '10 minutes' THEN '2-10m'
         WHEN s1_end - co.fo < interval '30 minutes' THEN '10-30m' ELSE '30m+' END len,
    CASE WHEN co.tzok IS NULL THEN '?' ELSE
      CASE WHEN extract(hour FROM co.fo AT TIME ZONE co.tzok) < 6 THEN '00-05'
           WHEN extract(hour FROM co.fo AT TIME ZONE co.tzok) < 12 THEN '06-11'
           WHEN extract(hour FROM co.fo AT TIME ZONE co.tzok) < 18 THEN '12-17' ELSE '18-23' END END hr,
    CASE WHEN co.tzok IS NULL THEN '?' WHEN extract(isodow FROM co.fo AT TIME ZONE co.tzok) >= 6 THEN '1' ELSE '0' END wkend,
    COALESCE(ret, false)::int ret, COALESCE(ss, false)::int ss, (sv7 >= 6)::int six7
  FROM pp JOIN co ON co.pid = pp.pid
)
```

## Appendix C — the exports and follow-ups

Cell export, run once with `'post'` and once with `'pre'`. It returns
feature combinations with counts, never a person:

```sql
, t AS (
  SELECT concat_ws('|', cohort, door, dev, ind, svb, wall, olock, modal, su, intent, hint, tut, nud,
                   mock, coach, les, st, wu, ttfs, len, hr, wkend, ret, ss, six7) k, count(*) n
  FROM f WHERE cohort = 'post' GROUP BY 1
)
SELECT count(*) tuples, sum(n) people, string_agg(k || '#' || n, ';' ORDER BY k) x FROM t
```

(The run of 2026-11-27 also carried an always-1 `guest` column from
`app_opened.isGuest`; see the papercut. It is dropped here.) The single-
variable tables (§2) and the models (§3) are computed from these cells.

Weekly table, heavy-sitting money and the from-10-05 check:

```sql
, wk AS (
  SELECT 'week' AS part, to_char(date_trunc('week', fo_at), 'MM-DD') AS lvl, count(*) n, sum(ret) ret,
         count(*) FILTER (WHERE svb <> '0') solvers, sum(ret) FILTER (WHERE svb <> '0') solver_ret,
         count(*) FILTER (WHERE svb IN ('6-9','10+')) heavy, sum(ret) FILTER (WHERE svb IN ('6-9','10+')) heavy_ret
  FROM f GROUP BY 2
),
heavy AS (SELECT f.pid, f.cohort, f.svb, f.wall, f.ret, f.fo_at FROM f WHERE f.svb IN ('6-9','10+') OR f.wall = 1),
names AS (SELECT DISTINCT h.pid, c.username FROM heavy h JOIN clean c ON c.pid = h.pid WHERE c.username IS NOT NULL),
money AS (
  SELECT n.pid, bool_or(e.event = 'pro_trial_started') trial, bool_or(e.event = 'pro_purchase_completed') paid
  FROM names n JOIN pro_events e ON e.username = n.username AND e.reason = 'stripe_webhook'
  JOIN heavy h ON h.pid = n.pid AND e.created_at <= h.fo_at + interval '30 days'
  GROUP BY n.pid
),
hv AS (
  SELECT 'heavy', h.cohort || ' svb=' || h.svb || ' wall=' || h.wall, count(*), sum(h.ret),
    count(*) FILTER (WHERE m.trial), count(*) FILTER (WHERE m.paid), null::bigint, null::bigint
  FROM heavy h LEFT JOIN money m ON m.pid = h.pid GROUP BY 2
),
late AS (
  SELECT 'post_from_10_05', svb, count(*), sum(ret), null::bigint, null::bigint, null::bigint, null::bigint
  FROM f WHERE cohort = 'post' AND fo_at >= '2026-10-05' GROUP BY 2
)
SELECT * FROM wk UNION ALL SELECT * FROM hv UNION ALL SELECT * FROM late ORDER BY 1, 2
```

Results: post 10+ with the wall 27 → 3 returned, 1 trial, 0 paid; post 6–9
57 → 22, 2 trials, 0 paid; pre 10+ 56 → 38, 0 trials, 1 paid; pre 6–9
76 → 40, 0 / 0.

Email-attributed returns. Every aid with a first `app_opened` in the
window, without the human filter: crawlers do not return through email.

```sql
WITH e AS (SELECT created_at, (metadata #>> '{}')::jsonb m FROM pro_events
           WHERE event = 'app_opened' AND created_at >= '2026-08-10'),
fo AS (SELECT DISTINCT ON (m->>'aid') m->>'aid' aid, created_at fo FROM e
       WHERE m->>'aid' IS NOT NULL ORDER BY m->>'aid', created_at),
r AS (
  SELECT CASE WHEN fo.fo >= '2026-08-17' AND fo.fo < '2026-09-25 22:45+00' THEN 'pre'
              WHEN fo.fo >= '2026-09-28' AND fo.fo < '2026-11-20' THEN 'post' END c, fo.aid,
    bool_or((e.created_at AT TIME ZONE 'UTC')::date > (fo.fo AT TIME ZONE 'UTC')::date) ret_open,
    bool_or((e.created_at AT TIME ZONE 'UTC')::date > (fo.fo AT TIME ZONE 'UTC')::date
            AND e.m->>'arrivalSrc' = 'email') ret_email
  FROM fo JOIN e ON e.m->>'aid' = fo.aid AND e.created_at <= fo.fo + interval '7 days'
  GROUP BY 1, 2
)
SELECT c, count(*) FILTER (WHERE ret_open) returners, count(*) FILTER (WHERE ret_email) via_email
FROM r WHERE c IS NOT NULL GROUP BY 1;
-- post 188 / 1, pre 315 / 3
```

Model (scratchpad, not in the repo): statsmodels 0.14 `GLM(Binomial,
freq_weights=n)` on the cells. Reference levels: door = sql-exercises,
solves = 0, intent = none, length = < 2 min, hour = 12–17. The LR χ² for
a variable is the deviance gain from dropping all its dummies. The AME
switches a level on vs the reference for every cell, weighted by n.
