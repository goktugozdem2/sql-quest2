# Scorecard — the founder's metric frame, with measured baselines (2026-09-23)

The frame is the founder's (chat, 2026-09-23): five groups, 30-day targets,
a backward calculation from the 2026-12-08 objective, and five numbers read
every week. His own warning stands: at four subscribers every money ratio is
noise; the targets set direction, they are not evidence, and the industry
ranges are general knowledge, not a read done today.

What this file adds: every "today" measured on the same definitions, and the
rows the frame marked "not measured" that already were. Windows: people by
`aid`, internal accounts out, the rendering crawler of 09-17 → 09-23 out
(metrics.md, `first_solve_10m` trap). Cohort rows use people whose first
`app_opened` fell 2026-08-17 → 09-16 (n = 1,177) so each had seven days to
act; flow rows use the 30 days to 2026-09-23.

## 1. Activation

| Metric | Frame said | Measured | 30-day target | Metric |
|---|---|---|---|---|
| First open → correct solve in 10 min | 12.4% | **15.5%** | 20% | `first_solve_10m` |
| First open → opened a challenge (ever) | 59% | **58.0%** | 75% | `first_solve_10m` (secondary) |
| Opened → solved (people) | 41% | **51.8%** | 60% | `first_solve_10m` (secondary) |
| Challenge opened → first run (new) | — | from 09-23 | measure, then target | `open_to_first_run` |

12.4% was the 08-24 → 09-20 baseline; 15.5% is the later, overlapping
window. Both stand; read the trend from here on one definition.

**Where activation actually leaks (measured 09-23).** Of 5,505
person-challenge opens in 30 days, 73% were solved. Of the 1,482 that were
not, **92% never ran a submit** — no SQL error, no wrong result. Only 4.5%
ended after a wrong result and 3.2% after an SQL error. The leak is between
opening a challenge and running anything, which is why `challenge_first_run`
exists from today. The first screen test (`firstScreenChallenge`, queue row
2) and the diagnosis panel (`diagnosisHints`, row 1) are the two flags aimed
at this.

## 2. Product quality

| Metric | Frame said | Measured | Target | Metric |
|---|---|---|---|---|
| Wrong result → solves the same challenge | not measured | **88.7%** of challenge pairs (people, 24 h: 87.4%) | 60% | `hint_to_solve` |
| SQL error → solves the same challenge | — | **81.8%** | — | `hint_to_solve` (errored arm) |
| Solves without opening the hint | not measured | from 09-23 | track | `hint_opened_rate` |

The 60% target is already beaten by a wide margin, so it is not the lever:
people who get feedback mostly finish. The ones who leave never ask for
feedback — see §1.

## 3. The middle of the funnel

| Metric | Frame said | Measured (30 d) | Target | Metric |
|---|---|---|---|---|
| Solver → sees the price modal | not measured | **52.3%** (cohort) | 20% | `modal_click_rate` family |
| Modal → sent to Stripe | not measured | **2.3%** (6 of 257 people) | 30% | `checkout_abandonment` |
| Stripe → paid | not measured | **33%** (2 of 6) | 50% | `checkout_abandonment` |
| Visitor → payer, end to end | ~0.25% | **0.05%** (2 of 3,864) | 1% | `visitor_to_payer` |

All of these events existed (`pro_modal_shown`, `pro_plan_clicked`,
`pro_checkout_clicked`, `pro_checkout_returned`, `pro_checkout_expired`,
`pro_purchase_completed`); no new event was needed. The measured shape moves
the priority: people see the modal far more than the target asks (52%), and
almost nobody goes from the modal to Stripe (2.3% against 30%). **The middle
leak is modal → Stripe**, not activated → modal. 0.25% end to end was four
payers over ~1,577 visitors; the 30-day window has two payers
(`stripe_webhook`) over 3,864 people who viewed a landing page or opened the
app. That count still includes crawler landing views, so treat 0.05% as a
floor.

## 4. Revenue and retention

| Metric | Frame said | Measured | Target | Source |
|---|---|---|---|---|
| Active subscribers | 4 | **3**: sergelafarge (annual), harinivr02 (annual), jeromezhao (monthly, cancel intent, access to 10-01). sab3r ended 09-22. | — | Stripe; `users.data` read 09-23 |
| Annual share | 2/4 | **2/3** | 50% | same |
| Second-month churn | not measured | both monthly payers cancelled or tried to before renewal (2 of 2 by intent) | < 30% | `payer_churn` |
| Refunds | 0% | 0 real (test7 was a test) | < 5% | `pro_refunded` |
| Second session within 7 days | not measured | **16.2%** | 25% | `second_session_7d` |

## 5. Health

| Metric | Target | Where it is read |
|---|---|---|
| Daily payment-path smoke | 100% | VPS fleet (not yet installed) |
| Queries > 200 ms with > 1,000 calls | 0 | the 09-23 check task, then the smoke bot's daily check |
| Interactive in | < 3 s | smoke bot's first check (docs/plans/smoke-bot-rollback) |

## The backward calculation, on measured numbers

Per month now: ~1,200 new people × 15.5% activated ≈ **185 activated** ×
~1.1% activated → payer ≈ **2 payers**. The objective (50/month) needs, for
example, 4,000 × 25% × 5% = 50. The founder's order holds — activation, then
the funnel, then traffic — with one amendment from the data: inside "the
funnel", the step to fix is modal → Stripe (2.3%), not reaching the modal.

## The five numbers, every week

Read in the Friday table (`weekly-funnel-friday`), same windows each week:

1. `first_solve_10m`
2. `visitor_to_payer`
3. `hint_to_solve` (wrong result → solved)
4. `second_session_7d`
5. Active subscribers (Stripe)

Everything else is diagnosis, read when one of the five moves.

## The Friday table

One row per read, same definitions as the sections above unless the row
says otherwise; bots out (`metadata.bot`, viewports `tablet:800x600`,
`desktop:1280x1200`, `desktop:1919x992`, `ref:aocr.org`), internal accounts
out. The O2 columns are defined in `docs/agent/objectives.md`.

| Read | `first_solve_10m` | `visitor_to_payer` | `hint_to_solve` | `second_session_7d` | Active subscribers | O2: payers / 30 d | O2: six-solvers / 30 d |
|---|---|---|---|---|---|---|---|
| 2026-09-23 (the frame) | 15.5% (first opens 30 d) | 0.05% (2 ÷ 3,864) | 88.7% (pairs, any later solve) | 16.2% (first opens 08-17 → 09-16) | 3 (Stripe) | 2 | — |
| **2026-11-22 — Sunday extra read (B2), not a Friday** | **14.8%** (first opens 11-08 → 11-21, n 379; 11.6% the two weeks before, n 558) | **0.05%** (2 ÷ 3,970, 10-24 → 11-22; a floor — landing views still hold unfingerprinted crawlers) | **80.3%** (367 / 457 wrong submits → that challenge solved within 60 min, 10-24 → 11-22 — the 60-minute form the 11-22 P1 verdicts use, 84.9% for 09-30 → 11-20) | **6.9%** (first opens 11-01 → 11-14, n 390; 7.9% the two weeks before, n 559) | **5** (3 annual, 2 monthly; `users.data` + webhook rows, not Stripe) | **3** at 09:29Z (2 from 16:37Z) | **64** (day 0, 11-10: 72) |

Notes on the 11-22 row:

- **`second_session_7d` is the number that moved:** 6.9–7.9% against the
  16.2% baseline, on the same query. It is read over every first
  `app_opened`, so it includes guests who never solved; the first-screen
  claim's people (assigned within 2 minutes) are a different population.
  Diagnose before acting: `app_opened` rows per first-open person halved
  (2.13 for the 08-17 → 09-16 cohort, 1.13 for 11-01 → 11-14) while the
  share who ever solved fell less (35.1% → 26.3%). An `app_opened` that
  stopped firing on a return visit — the 10-08 bot-stamping change (#49) is
  the one commit since September that touches the event — would read
  exactly like this. BACKLOG line, owner B1.
- `first_solve_10m` here is all first opens; the first-screen verdict's
  37.2% is the challenge arm among people assigned within two minutes of
  their first open. Both stand on their own definitions.
- The O2 day-0 row, the factor that is short (six-solvers, 4–5×) and the
  12-10 gap are in `docs/agent/objectives.md`.
