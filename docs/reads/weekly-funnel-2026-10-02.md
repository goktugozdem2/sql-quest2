# Weekly funnel — Friday 2026-10-02

Written by hand: the scheduled `weekly-funnel-friday` task stalled this
morning, and no earlier Friday file exists in the repository, so **this is
the first one and it sets the columns** (metric | last 7 | previous 7 | Δ).

- **Last 7:** 2026-09-25 11:00 UTC → 2026-10-02 11:00 UTC.
  **Previous 7:** 2026-09-18 11:00 UTC → 2026-09-25 11:00 UTC.
  30-day values: 2026-09-02 11:00 UTC → 2026-10-02 11:00 UTC.
- People by `aid` unless stated; money only `pro_purchase_completed` with
  `reason='stripe_webhook'`, by username.
- Out of every people count: internal accounts
  (`^(test|qa_|fabletest|linktest|internalroutine|sqlquest$)`, `elena`); the
  rendering crawler (first `app_opened` with empty `landingSrc` and LA +
  1920x1080 or UTC + 1280x720: 7 people in the last 7, 211 in the previous
  7); and **the 09-30 burst** — 1,334 "people" between 16:48 and 20:22 UTC
  that day, every row tz `UTC`, viewport 1280x720, `landingSrc =
  search:google`, no solve. The task's crawler filter does not catch that
  burst (it requires an empty `landingSrc`); the rule used is the one in
  docs/reads/regional-demand-2026-10-01.md — every row tz `UTC` and no solve
  ever. With the task's filter alone the last-7 `first_solve_10m` would read
  5.1% (85 of 1,666) and app opens 1,771.
- Context read, not repeated here: docs/reads/checkout-clickers-2026-10-01.md,
  docs/reads/regional-demand-2026-10-01.md,
  docs/reads/bing-api-first-read-2026-10-01.md.

## The five numbers

| metric | last 7 | previous 7 | Δ | 30 days |
|---|---|---|---|---|
| 1. `first_solve_10m` | **25.6%** (85 of 332) | 21.1% (87 of 412) | +4.5 pt | 20.4% (285 of 1,400) |
| 1b. `open_to_first_run` (born 09-23 13:24 UTC) | 72.7% (758 of 1,042 person-challenge opens; 560 by Run, 198 by Submit) | not a full week — 09-23 13:25 → 09-25 11:00: 79.3% (582 of 734) | — | — |
| 2. `visitor_to_payer` | 0.11% (1 of 887) | 0.10% (1 of 956) | — | 0.06% (2 of 3,280) |
| 3. `hint_to_solve` — wrong submit → solved that challenge within 24 h, person × challenge pairs | 86.6% (313 pairs) | 88.7% (645 pairs) | −2.1 pt | 87.5% (1,220 pairs) |
| 4. `second_session_7d` — newest week that has had its seven days | 23.8% (98 of 412; first opens 09-18 → 09-25) | 16.5% (55 of 333; first opens 09-11 → 09-18) | +7.3 pt | 18.0% (258 of 1,437; first opens 08-26 → 09-25) |
| 5. Active subscribers | **3** | 3 | 0 (one in, one out) | — |

- **1.** New people fell 412 → 332 while the number solving inside ten
  minutes held (87 → 85). Confounded upward by the first-screen test (on
  since 09-25 22:41 UTC): half of first-run visitors land in challenge 91's
  editor.
- **1b.** Lower than the partial week before the first-screen test; the
  challenge arm opens challenge 91 for the person, so an open no longer means
  a choice.
- **2.** One payer in each window. n is one; this is not a rate, it is a
  count. The founder's rule stands: at three subscribers every money ratio is
  noise.
- **3.** By people (any wrong-submit challenge solved within 24 h): 83.5%
  (96 of 115) against 88.4% (152 of 172). Since the `diagnosisHints` flip
  (09-30 09:29 UTC): 89.9% of 79 pairs — too few to read. My reconstruction
  gives 86.8% for the week to 09-29 where docs/agent/flag-queue.md quotes
  87.4%; the definitions differ by a fraction of a point somewhere.
- **4.** People who first opened in the last 7 days have not had seven days:
  10.8% so far (36 of 332), not readable.
- **5.** Source: `users.data` (a `stripeCustomerId` and a future `proExpiry`),
  not Stripe's dashboard. Two annual (sergelafarge, harinivr02) and one
  monthly (the 10-01 buyer in India, US$9). jeromezhao ended 2026-10-02
  06:12 UTC.

## Interview cohort (`interview_cohort_funnel`)

Defined in docs/agent/metrics.md (added today). A person is in the cohort if
inside the window they declared interview / job-ready intent, completed an
intake with a date, set a prep target, or arrived with `arrivalSrc`
`company:…`.

| # | metric | last 7 | previous 7 | Δ | not-cohort, last 7 | not-cohort, previous 7 |
|---|---|---|---|---|---|---|
| 1 | cohort people | 88 (83 by intent, 31 by company arrival) | 139 (135, 52) | −51 (−37%) | 358 | 356 |
| 2 | with a date | 0 | 0 | — | 0 | 0 |
| 3 | with a company named | 36 | 57 | −21 | 0 | 0 |
| 4 | reached the Interview tab | 19 | 38 | −19 | 46 | 46 |
| 5 | saw the plan | 0 | 0 | — | 0 | 0 |
| 6 | opened a plan item | 0 | 0 | — | 0 | 0 |
| 7 | met a Pro item | 35 | 45 | −10 | 65 | 48 |
| 8 | clicked a plan | 6 | 3 | +3 | 7 | 3 (2 people: one used two browsers) |
| 9 | paid | 1 | 0 | +1 | 0 | 1 (harinivr02) |

| rate | last 7 | previous 7 | not-cohort, last 7 | not-cohort, previous 7 |
|---|---|---|---|---|
| cohort → with a date | 0% | 0% | — | — |
| with a date → opened a plan item | no denominator | no denominator | — | — |
| met a Pro item → clicked | 14.3% (5 of 35) | 4.4% (2 of 45) | 9.2% (6 of 65) | 6.3% (3 of 48) |

- **Rows 2, 5 and 6 are 0 by construction, and not because of 09-21.** The
  task expected a flip on 09-21; it did not happen. `onboardingIntake`,
  `goalMeasure`, `interviewCountdown` and `interviewFirst` are still `false`,
  and none of `intake_*`, `prep_target_set`, `prep_readiness_shown`,
  `prep_plan_viewed`, `prep_plan_item_opened` has ever written a row. Nobody
  can give us a date today. The Interview tab's own list wrote
  `plan_item_started` for 4 cohort people (13 the week before) — a different
  event, shown here so the zero is not read as "nobody opens anything".
- The previous-7 payer (harinivr02, annual) is an interview person — every
  event of hers carries `intent: interview` and her first arrival was
  `company:Stripe` on 09-14 — but the intent was captured before the window,
  so the window-bound definition puts her in the comparison column. Read row
  9 as "2 payers in 14 days, both interview-shaped", not as 1 against 1.
- The cohort is smaller than the week before on every row but the clicks.
  Both doors into it shrank: `intent_captured` rows from the post-solve ask
  131 → 103 (first solves 154 → 119), from a company link 54 → 31.

## All people

| # | metric | last 7 | previous 7 | Δ |
|---|---|---|---|---|
| 1 | landing people (`landing_people`: `landing_engaged` or any non-landing event; both windows start after 09-16) | 736 | 821 | −85 (−10%) |
| 2 | app opened | 437 | 487 | −50 (−10%) |
| 3 | first challenge opened | 251 | 258 | −7 (−3%) |
| 4 | first solve | 119 | 154 | −35 (−23%) |
| 5 | solvers · solves | 146 · 693 | 192 · 1,675 | −46 (−24%) · −982 (−59%) |
| 6 | reached six distinct solves in the window | 53 | 80 | −27 (−34%) |
| 7 | accounts created (`users.data.createdAt`; no fallback needed) | 33 | 63 | −30 (−48%) |
| 8 | returned next day | 143 | 151 | −8 (−5%) |
| 9 | Pro modal shown | 106 | 99 | +7 |
| | — `milestone_solves` | 62 | 84 | −22 |
| | — `email_link` | 0 | 0 | — |
| | — `pricing_link` | 4 | 2 | +2 |
| | — all other reasons | 77 (`free_quota` 57, `pattern_mock` 8, `generic` 6, `mock_link` 3, six others 1–2 each) | 18 | +59 |
| 10 | plan / checkout clicked · annual ÷ all | 13 · 1 of 13 (7.7%) | 6 by aid, 5 people · 1 of 6 | +7 |
| 11 | `pro_checkout_returned` | `left_checkout` 8 rows, 6 people | `left_checkout` 5 rows, 4 people | +3 rows |
| | `pro_checkout_expired` | 24 rows, 18 usernames | 5 rows, 3 usernames | +19 rows |
| 12 | paid · gross | 1 · US$9 | 1 · US$49 | 0 · −US$40 |
| 13 | `content_lock_reached` — `preview_dialog` | 12 | 10 | +2 |
| | — `company_modal` | 1 | 3 | −2 |
| | — `cold_start` | 20 | 21 | −1 |
| | — `company_set` (on from 09-25 22:41 UTC) | 5 | 0 | +5 |
| | — `free_quota` (on from 09-25 22:41 UTC) | 56 (198 rows) | 0 | +56 |
| 14 | `challenge_error_pattern` people · top 3 `primary` | 115 · syntax_error 55, value_calc 42, sort_order 39 | 172 · value_calc 101, syntax_error 77, sort_order 58 | −57 |
| 15 | `pro_subscription_cancelled` scheduled | 0 | 0 | — |
| | `pro_subscription_cancelled` ended | 1 (jeromezhao, `days_since_purchase` 30) | 1 (sab3r, 31) | 0 |
| | `pro_subscription_reactivated` | 0 | 0 | — |
| 16 | `activated_note` sent / delivered / bounced | 40 / 39 / 1 (batch 2, 10-01 17:35 UTC) | 0 / 0 / 0 | — |
| | of those: `email_link` modal · clicks after · purchases | 0 · 0 · 0 (17 hours after the send; 1 of the 40 has any event since) | — | — |

Notes on the rows:

- **4–6.** Solves fell by more than half and six-solvers by a third in the
  week the ten-solve quota went live (09-25 22:41 UTC). 56 people met the
  quota wall, 3.5 times each. Daily solvers: 44–51 on 09-21 → 09-24, then 14–34
  on the same weekdays after the flip; 09-30 had 14 solvers on 70 new people,
  the lowest weekday in the two windows.
- **7.** Accounts halved (63 → 33); `signup_completed` agrees (64 → 33
  people).
- **9.** A person can be in more than one split. `email_link` has never
  written a row, in either batch.
- **10.** All 13 chose monthly (one also clicked annual). 11 of the 13 clicked
  from the `free_quota` modal: 57 shown → 11 clicked = 19.3%. The previous
  window's rows carry `quarterly` clicks from one person (the plan was
  removed on 09-19).
- **11.** Last 7: 6 of the 24 expired rows are the 10-01 buyer's own earlier
  sessions and 1 has username `unknown`. Previous 7: 3 of the 5 are `unknown`
  rows opened 09-20 14:04–15:09 UTC, the hour of the founder's own checkout
  walk (test7 paid at 14:23) — probably his, not provable from the row.
  Internal rows (sqlquest 7, test7 2) are excluded.
- **12.** Not counted, as instructed and as the rows say: jeromezhao's
  `pro_renewal_completed` (10-01 23:06 UTC, US$29) was a charge on a
  subscription he had been told was cancelled; `pro_refunded` in full
  10-02 06:12 UTC. The three `pro_payment_failed` rows of 10-01 (username
  `unknown`, `billing_reason: subscription_create`) are the buyer's failed
  3D Secure attempts, not dunning. test7's 09-20 purchase is the founder's
  test.
- **15.** The `ended` row in the last 7 is that refund's cancellation, not a
  customer leaving at renewal by choice this week — he pressed cancel in his
  first month (ledger). No `scheduled` row was ever written for him or for
  sab3r (sab3r's was placed before 2026-09-12; jeromezhao's never reached
  Stripe). test7's scheduled row (09-20) is internal.
- **Trial (`checkoutTrial`, on 10-01 ~09:20 UTC):** 16 people saw the modal
  since, 12 with `trialOffered: true`, 1 clicked with `trial: true`,
  **0 `pro_trial_started`**.

### Rates

| rate | last 7 | previous 7 | Δ |
|---|---|---|---|
| first solve ÷ first challenge opened | 47.4% (119 of 251) | 59.7% (154 of 258) | −12.3 pt — **not comparable**: the first-screen challenge arm writes `first_challenge_started` for everyone it lands in the editor (97 of 97), so the denominator changed on 09-25 |
| reached six ÷ first solve | 44.5% (53 of 119) | 51.9% (80 of 154) | −7.4 pt |
| clicked ÷ shown, `milestone_solves` | 8.1% (5 of 62) | 6.0% (5 of 84) | +2.1 pt |

### Homepage watch

- **(a) home → app: 49.1%** (54 of 110) against 57.2% (115 of 201) the week
  before. **Below the 51.9% line** by three people. By variant:
  `personalized_v1` 50.0% (54 of 108) | 57.5% (115 of 200);
  `adaptive_tutor_v1` 0 of 2 | 0 of 1 (stale cached pages). People viewing
  the homepage nearly halved: 27–45 a day until 09-26, 13–21 a day from
  09-27; Google-sourced home views went from 10–21 a day to 2–8.
- **(b) modal → checkout (`milestone_solves`): 8.1%** (5 of 62) against 6.0%
  (5 of 84); baseline 3.4%, target 15% by 2026-10-09. Plan mix of those
  clicks: annual 1 of 5 | 1 of 5. **Read it with this:** by the definition
  (shown the six-solve modal, clicked anything in the window) it is 8.1%, but
  `modalReason` (on click rows since 09-25) says only 1 of the 5 clicked from
  the six-solve modal itself — 1.6% of 62; the other four clicked at the
  quota wall. The previous window's clicks carry no `modalReason`, so the
  strict version has no second Friday.
- **No REVERT.** (b) is above 3.4% on both Fridays by the written
  definition, and 141 people were shown across them (under 150).

## Cohorts (docs/reads/cohorts-2026-09-12.md)

Appended today — two rows, because the 09-14 week was never appended (no
Friday run had completed):

| signup week | signups | solved one | reached six | paid |
|---|---|---|---|---|
| 09-14 | 51 | 37 (73%) | 23 (45%) | 0 real — the query returns 1 (2.0%), which is test7 |
| 09-21 | 56 | 43 (77%) | 23 (41%) | 1 (1.8%) — the 10-01 buyer |

Both are younger than 14 days on part or all of their signups and are still
maturing. Two older rows moved and carry the new numbers in parentheses:
08-31 paid 1 → 2 (harinivr02 signed up on 09-06 and paid on 09-19, thirteen
days later — the first payer who did not buy in her first days), and 09-07
signups 7 → 14.

## Objective

- **Payers, trailing 30 days on 2026-10-02: 2** (harinivr02 09-19, annual,
  US$49 with a code; the 10-01 buyer, monthly, US$9). Gross US$58. Next
  interim target: **10 by 2026-10-31**; the day-30 checkpoint asks for 6 on
  2026-10-09. jeromezhao's 09-01 purchase left the window thirteen hours
  before this read.
- Accounts created, trailing 30 days: 174 (the day-30 line is 340; the
  falsification floor is 250).
- **Payer churn** (`pro_subscription_cancelled`, `stripe_webhook`, by
  username): trailing 30 days — scheduled 0, ended 2 (sab3r 09-23 at 31 days;
  jeromezhao 10-02 at 30 days, after the renewal that should not have been
  charged, refunded). Of the two payers inside the 30-day window, 0 have a
  cancellation row (13 days and 1 day old). **Every monthly subscription that
  has reached a renewal date has ended: 2 of 2.** Cancellations placed before
  2026-09-12 left no row.
- Live Pro accounts (`proStatus='true'`, unexpired, non-trial, internal
  excluded): 4 — 3 with a stripe row (the three subscribers) and one lifetime
  account without one. Two more rows still read `proStatus='true'` with an
  expiry in the past (sab3r 09-22; one monthly row with no stripe id, 09-30).

## The reading

Payers are 2 against 10 by 10-31, and the factor below its own line is
click→pay — 1 of 13 clickers paid (7.7%; 30 days: 2 of 22 by aid, 9.1%) against the
33% it was when the line was drawn, about 25 points short — while clicks per
person shown is 8.1% (over the 3.4% baseline, 6.9 points under the 15% set
for 10-09, and carried by the quota wall, not by the six-solve modal) and
people reaching six fell to 53 from 80 in the week the quota landed; churn is
2 of 2 on every monthly subscription that reached a renewal, home→app is
49.1% against its 51.9% line, and nothing says REVERT.

## Flags flipped inside the two windows (src/data/feature-flags.js, git)

Previous 7:

- 2026-09-19 — `quarterlyPlan` off (the founder's 24-item QA pass; one price
  architecture).
- 2026-09-23 15:02 UTC — `directCheckout` on: a plan click without an email
  on file goes straight to Stripe.
- 2026-09-24 21:35 → 21:43 UTC — `goalGate` on, then off the same night
  (docs/agent/flag-queue.md: withdrawn before it reached anyone).

Last 7:

- 2026-09-25 22:41 UTC — `freeQuota`, `companySetGate`, `deadlineOffer`,
  `goalWallEarly`, `mockDoor`, `firstScreenChallenge` (A/B by aid) on, one
  commit, the founder's written Go.
- 2026-09-25 22:47 UTC — `regionalPrice` on: India sees $9 / $39.
- 2026-09-30 00:02 UTC — `checkoutSessions` on: server-created Checkout
  Sessions in USD, Payment Link as the fallback (1 `checkout_session_fallback`
  row since).
- 2026-09-30 09:29 UTC — `diagnosisHints`, `socraticLadder`, `weakSkillNext`
  on.
- 2026-10-01 ~09:20 UTC — `checkoutTrial` on: 7 days free, a card required.

Six flags in one commit on 09-25 means the week's moves are not separable,
by the founder's own decision (flag-queue log); only the first-screen test is
randomised. Its arms so far, crawlers out, first opens after the flip:
challenge 52 of 97 solved inside ten minutes, quiz 22 of 106 — the 10-03
read's subject, not a verdict here. That read must drop the 09-30 burst: 84
of those "people" were assigned an arm.

## What looked off

- **The 09-30 burst (1,334 "people", 16:48 → 20:22 UTC)** arrives with
  `landingSrc = search:google`, `arrivalSrc` the topic and company pages,
  and a `challenge_opened` for 844 of them — the `/app/?challenge=…` links
  robots.txt has disallowed since 09-23. It is in every raw people count for
  the week and in `first_screen_assigned`.
- **Homepage traffic halved from 09-27** (Google-sourced views most of all).
  The last change to the page before that is the free-tier copy, commit
  3f853276, 09-25 22:17 UTC. A coincidence in time, not a cause shown.
- **09-30: 14 solvers** on 70 new people — the day the three P1 flags
  flipped, and the day the tutor's three-day 502 outage was found.
- **`second_session_7d` jumped** 16.5% → 23.8% for first opens 09-18 → 09-25
  with nothing shipped at it. Not explained here.
- **`scripts/cohort-report.sql` does not exclude test7 or a second `test…`
  account** (its filter names test2 only): the 09-14 row counts both as
  signups and test7 as a payer. Without them: 49 signups, 37 (76%), 23 (47%),
  0.
- **The usage line on the homepage had not been refreshed since 12 Sep**
  (5,745 solutions · 1,195 people). Today: **8,860 accepted solutions ·
  1,498 people last 30 days.** The people number excludes the crawlers above;
  by the task's wording alone (internal accounts out, nothing else) it would
  have read 3,094, of which about 1,600 are not people.
