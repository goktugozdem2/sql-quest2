# Monetization: what to build next for money (2026-09-24)

The founder's ask of 2026-09-24: plan the developments that would make us
money. This file is grounded in numbers read today from the live database
(people by `aid`, internal accounts out, money only from
`pro_events.reason='stripe_webhook'`). It ranks by expected payers per unit of
work, because objective O1 counts **paying customers**, not revenue
(docs/agent/objectives.md: 50 a month by 2026-12-08, from 2).

## What the data says today

1. **42% of the people who see the Pro modal are in India.** 30 days: 109 of
   258 modal viewers have an Indian timezone; US/Canada 48, Europe 46, the
   rest spread thin. 90 days, shown → plan click: India 5 of 139 (3.6%),
   Europe 5 of 81 (6.2%), US/Canada 1 of 81, rest 3 of 79. The one Indian
   buyer (harinivr02, 09-19) bought only after writing in for a discount:
   $49 annual against the $99 list. The largest audience we ask sees a price
   that the only buyer from it could not pay.
2. **Both real purchases in 30 days came from the automatic
   `milestone_solves` modal** (docs/plans/modal-to-stripe-2026-09-23.md).
   The ask works when it lands; the doors after it were the leak, and the
   email step is gone since 09-23 (`directCheckout`, read 10-23).
3. **Almost nobody has told us their interview date.** Two accounts have
   ever set `prepTarget.date`; eight have a company. Every deadline-shaped
   money idea — `deadlineOffer` (queue row 8), the countdown, the outcome
   note — has an audience of about zero until the intake asks for the date
   (queue row 6, `onboardingIntake` + `goalMeasure`). **Flipping
   `deadlineOffer` before row 6 would read nothing.**
4. **The second ask has a pool and almost no history.** 209 registered
   people have 6+ solves, an email, no Pro and no opt-out. 40 of them got
   `activated_note` on 09-12: delivered 40, no purchase since. 169 have never
   been asked by email.
5. **Payers are interview-shaped** (3 of 3; 2 of the first 3 prepped for the
   Capital One screen). They buy for a date, in the first session, at 6–10
   solves.

## The plan, ranked

Money-path changes ship dark and flip only on the founder's written Go
(docs/agent/flag-queue.md, rule 4). Activation rows 1–7 keep their order;
nothing here jumps them except item 1, which the founder can choose to put
first because it touches only the price shown to one country.

| # | Build | Why (evidence) | Work | Needs | Read |
|---|---|---|---|---|---|
| 1 | **A regional price for India.** Two more Payment Links in Stripe (monthly + annual at a purchasing-power price), shown only when `/api/geo/` answers `IN` (the server's country header, never browser language). Flag `regionalPrice`. Everyone else sees today's modal byte for byte. | Finding 1: 42% of the audience, 3.6% click rate, the only buyer from there needed a discount by email. O1 counts payers, so a lower price that converts is a direct win even at a lower average revenue per payer. | Founder: 2 Payment Links (~10 min). Agent: `CHECKOUT_LINKS_BY_REGION`, modal price text from the same table, a test binding the shown price to the link, events carry `priceRegion` (~3 h) | **Go + the two prices** | India shown → plan click, 3.6% (90 d) → ≥ 8%; India purchases ≥ 2 in 30 days; guardrail: non-India purchases do not fall |
| 2 | **Ask for the interview date before the money asks.** No new build: this is queue row 6 (`onboardingIntake` + `goalMeasure`). What changes is the order of the money rows: `deadlineOffer` (row 8) should wait until row 6 has been live 14 days and at least 30 people carry a date. | Finding 3: 2 dates ever. Every deadline-based offer is inert without them. | a note in the queue | founder agrees to the reorder | `prepTarget.date` holders, 2 → ≥ 30 within 14 days of the row-6 flip |
| 3 | **Run the second ask on the 169 never mailed.** `activated-note` is built, guarded, dry-runnable; 40 a run, quiet 7 days after any other campaign. | Finding 4: the pool exists and the sender's first run was too small to read (40, 0 purchases). | Founder runs it: `?dry=1` first, then 40 a week for four weeks | Go per run (sending is outward-facing) | `returned_48h` and purchases per run; stop after two runs with zero plan clicks |
| 4 | **Fix the tutor-limit claims before any money flag — done 2026-09-24.** Of the 45 "Unlimited AI Tutor" places counted on 09-12, seven were left: "go unlimited" ×2 and "Pro removes the daily AI limit" on the tutor panel, "unlimited access to all interviews" (EN + TR), and the trial-reminder email's "unlimited AI tutor" ×4. Two more were wrong numbers: the app said "all 10 free AI tutor calls" and the email "Free is capped at 10/day"; `ai-tutor` gives Free 20 and caps Pro at 50/75/100. The words changed, not the cap. | A money claim we cannot honour is a refund and a chargeback waiting. | done; `tests/tutor-limit-claims.test.js` (binds any stated free number to `DAILY_LIMITS`; mutation-checked) | `trial-reminder-cron` redeploy | the guard test |
| 5 | **The paid unit for a company: its interview set.** Built and dark: `companySetGate` (row 11), signed archetypes only (Capital One, Revolut). | Finding 5: the payers bought a company's interview. | built | Go (row 11) | M1's ledger claim |
| 6 | **A seats plan for instructors and bootcamps, tested before it is built.** One page, `/for-teams/`, with the honest offer (N seats, the instructor sees progress) and one button that writes a `team_interest` row with seat count — no checkout. The open dataset (GitHub, Kaggle notebook) and the after-bootcamp door are where instructors see us. | No evidence yet — a hypothesis. That is why the test is a door with a counter, not a product. | ~2 h | Go to publish the page | Kill: fewer than 3 `team_interest` rows in 30 days → drop it, write it down |
| 7 | **Server-created Checkout Sessions** (USD by default, coupons, trials, a regional price without a second link). | Payment Links force local currency (Adaptive Pricing, always on) and cannot carry a coupon rule. | a real change to the money path, ~1–2 days + webhook | Go, and only after #1 shows the regional price moves anything | — |

**Not doing:** a lower global price (the two non-Indian buyers paid list
within minutes of seeing it); another modal copy rewrite (closed in 4 s
either way); paid traffic (Vercel Hobby cannot read it, and conversion is
the constraint — docs/plans/seo-authority-2026-09-22.md, "the gate on new
traffic").

**Held for the founder's price architecture decision:** a one-time
"interview sprint" pass (30 days, no renewal) fits the interview-shaped buyer
exactly, but the founder moved to one price architecture on 09-19
(`quarterlyPlan` off, lifetime removed 09-12). Raise it only if #1 and #5
leave the monthly plan as the main churn complaint.

## What 50 a month needs from this

O1's arithmetic (objectives.md): signups ~6× and signup→payer 1.2% → 5%.
Item 1 is the only one here that changes the price for the largest audience
we already reach; at India's current modal volume (~110 a month), a click
rate of 8% and the measured click→pay of 33% is ~3 payers a month from India
alone — more than the whole product made in any month so far, and still far
from 50. Items 2, 3 and 5 are how the rest of the gap is attacked; none of
them is enough alone, and this file does not pretend otherwise.

## Decisions for the founder

1. Go on `regionalPrice` for India, and the two prices (monthly / annual).
   Suggestion to start the conversation: $9 / $39, i.e. under a third of list,
   close to what harinivr02 paid.
2. Agree that `deadlineOffer` waits for 30 date-holders after row 6.
3. Go on the next `activated-note` run (dry run first).
