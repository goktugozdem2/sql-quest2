# The seven who clicked, the two who paid, the five Pro accounts — and the corrected growth rates

**Read 2026-09-12**, for the founder's week-1 list (items 3, 4, 5). People by
`aid`, internal accounts excluded, money only from `stripe_webhook`. Re-measure
before quoting; every table here is the live database on the evening of
09-12.

---

## 3. Everyone who reached a plan or checkout click in the last 30 days

Seven people clicked; two paid (one of the two, jeromezhao, has no click row —
his purchase arrived from a session whose click event was never written; the
webhook row is the truth). Columns: solves at the moment of the click, minutes
from their first tracked event, the last challenge solved before clicking, the
modal that preceded the click, the plan, what happened on Stripe.

| who | clicked (UTC) | plan | tz | intent · arrival | solves before | min. from first visit | last solved before | modal | Stripe | after |
|---|---|---|---|---|---|---|---|---|---|---|
| chaand | 08-18 12:33 | monthly | Kolkata | interview · company:Amazon | 6 | 1,346 | #50 7-Day Rolling Revenue Average (Hard) | company_hard | no attempt | 0 solves |
| guest_…923133 | 08-20 13:37 | lifetime | Berlin | interview · sql-exercises | 10 | 52 | #99 SUM, AVG, MIN, MAX (Easy) | milestone_solves | no attempt | 4 solves |
| **sab3r** | 08-23 19:04 | monthly | New York | interview · home | 6 | 114 | #34 LEFT JOIN NULL Semantics (Medium) | milestone_solves | **paid $29** | 18 solves |
| guest_…910619 | 08-29 18:28 | monthly | Lagos | learning · best-sql-practice-sites | 6 | 103 | #95 Multiple Conditions (Easy) | milestone_solves | no attempt | 14 solves |
| **jeromezhao** | 09-01 ~22:05 | monthly | Los Angeles | (none) · home | 6 | 14 | — | milestone_solves | **paid $29** | 31 solves |
| alexis_montesdeoca | 09-04 04:18 | lifetime | Mexico City | job_ready · home | 1 | 18 | #98 Counting Rows (Easy) | generic (header button) | left, 25 min, no card | 11 solves |
| harinivr02 | 09-06 03:11 | monthly | Kolkata | interview · company:Stripe | 6 | 770 | #95 Multiple Conditions (Easy) | milestone_solves | closed, no card | 22 solves |
| rereremin | 09-06 21:46 | monthly | Moscow | job_ready · best-sql-practice-sites | 20 | 1,396 | #4 Department Roster (Medium) | generic (header button) | left, 24 s, no card | 0 solves |

What the table says, in three lines:

- **Six of the eight clicks came at exactly six solves, from the milestone
  modal** (chaand's was the company wall at six too). Both payers were at six.
  The ask that sells fires once, at the sixth solve, in the first session
  (14 and 114 minutes in). Item 1 of the week is therefore already true in
  the code: the modal fires on the same render as the sixth "Accepted".
- **The five who did not pay never reached a card.** Stripe holds no failed
  or incomplete payment for any of them (checked 2026-09-12). Three had a
  `pro_checkout_returned` row — 24 s, 62 s, 25 min away — and came back to
  keep solving (14, 22, 11 solves after). Abandonment at the price step, not
  a decline, and not a loss of the user.
- **The two who clicked from the header button (generic) were at 1 and 20
  solves** — the two ends. The one at 20 (rereremin) is the only person in
  the table who has not been back since.

## 4. The five live Pro accounts against Stripe

`users.data.proStatus = true` and unexpired today, excluding trials and
internal test accounts:

| account | plan | paid (stripe_webhook) | expiry | auto-renew | solves |
|---|---|---|---|---|---|
| sergelafarge | annual | 07-22 $99 | 2027-07-22 | true | 39 |
| sab3r | monthly | 08-23 $29 | 2026-09-22 | **false** | 24 |
| jeromezhao | monthly | 09-01 $29 | 2026-10-01 | **false** | 37 |
| adinajoshi | monthly | **none** | 2026-09-30 23:59:59 | true | 112 |
| muluken | lifetime | **none** | 2099 | — | 5 |

- **Two of five have no payment.** adinajoshi (112 solves, expiry set to the
  last second of September) and muluken (lifetime, 5 solves) carry Pro with
  no `stripe_webhook` row — granted by hand, or claimed through
  `pending_subscriptions` under another name. The founder knows which; the
  ledger should say. Neither is revenue.
- **Both monthly payers carry `proAutoRenew=false`, and neither value came
  from Stripe.** Read against Stripe → Subscriptions on the evening of 09-12:
  the Active list holds exactly three — sergelafarge (annual, active),
  jeromezhao (monthly, **active, no cancellation scheduled, next charge
  2026-10-01**) and sab3r (monthly, **cancels 2026-09-23**, cancel-at-period-
  end). `customer.subscription.deleted`, the only webhook path that writes the
  flag false, fires when a subscription actually ends; it has fired for
  neither. The writer was the app's own cancel button, which until 2026-09-03
  flipped the local flag and never reached Stripe (src/app.jsx, the note above
  `openManageSubscription`: "payer #2 had to email to cancel"). Payer #2 is
  sab3r: paid 08-23, pressed cancel in the app, the card would have kept
  being charged, he emailed, and the cancellation was placed in Stripe by
  hand. jeromezhao paid 09-01, two days before the fix; his flag is false and
  nothing else writes it, so he most likely pressed the same button in his
  first days — and Stripe never heard. **He will be billed $29 on 2026-10-01
  for a subscription he tried to cancel.** That is not a renewal to count; it
  is a refund waiting to happen. A founder email before 10-01 is the honest
  move (Gmail draft prepared 09-12, not sent).
- **The cancellation date is still recorded nowhere in our data**, for two
  reasons now: the old button wrote no event, and the `subscription.deleted`
  handler logs to the console and writes no `pro_events` row. Instrument it
  (`pro_subscription_cancelled {plan, days_since_purchase}`) and handle
  `customer.subscription.updated` with `cancel_at_period_end`, so a scheduled
  cancel is visible the day it is placed, not the day it takes effect. Until
  then payer churn is read from the dashboard by hand, and
  `users.data.proAutoRenew` is not evidence of anything Stripe did.
- **No monthly subscription has ever renewed.** The only
  `pro_renewal_completed` row is the July guest's first invoice, the same
  day as the purchase — and that July "payer" (`guest_1783707523106`, $19)
  was **the founder's own test**: Stripe shows the customer as the founder's
  address, SQL Quest Pro Monthly, created 10 Jul 21:48, cancelled 22:20, and
  all seven cancelled subscriptions in the account belong to the founder or
  `test2`. Real payers in the product's history are three: sergelafarge $99,
  sab3r $29, jeromezhao $29 — **gross $157**, not $176, and the "four ever" in
  objectives.md is three. The "drop" from July is arithmetic on a test row:
  July held one real annual; August and September held one $29 each.
- **Where the revenue problem actually is:** acquisition is one a month, and
  both monthly payers tried to leave inside their first month — one managed
  it (sab3r, by email, because the button was broken) and one is still being
  billed because the same button was broken (jeromezhao). Nothing in the
  product asks a paying user to stay, and until 09-03 what it offered them
  instead was a cancel button that did not cancel. Item 4's cause: **payer
  churn — 2 of 2 by intent, 1 of 2 in Stripe, unmeasured in our own data.**

## 5. The footnotes, resolved — comparable windows only

The "previous 30 days" in the 09-12 CEO panel (Jul 14 – Aug 13) predates the
2026-07-28 fix that put an `aid` on every event; before it, every guest event
sat under the literal username `guest` and collapsed to one person. People
counts before 07-28 are therefore not comparable with anything after. The
landing pages also lost their tag 08-05 → 09-05, and 09-08 08:53Z → 09-12
10:58Z the database refused every account creation. The clean comparison is
**per day, 07-28 → 08-12 (17 days) against 08-13 → 09-12 (30 days)**, with
accounts counted from `users.created_at`, not from `signup_completed`:

| per day | 07-28 → 08-12 | 08-13 → 09-12 | change |
|---|---|---|---|
| app opened (people) | 25.8 | 39.5 | +53% |
| first challenge opened | 15.1 | 21.7 | +44% |
| first solve | 6.4 | 10.3 | +61% |
| **reached six solves** | 3.04 | 5.40 | **+78%** |
| returned next day | 5.6 | 7.9 | +41% |
| accounts created | 2.5 | 5.8 | +133% (and 09-08 → 09-12 created none by construction; ~36 people finished the form and got nothing) |

Landing views are readable only from 09-06: 56, 99, 112, 94, 138, 108, 81
people a day (09-06 → 09-12), about **98 a day**. No prior window exists for
the main pages; do not quote a landing growth rate until 10-06.

**Corrected reading of the panel:** the funnel's top is growing at roughly
+45–60% month on month on every clean step, activation (six solves) faster
than the top, and accounts faster still even with four dead days. The two
numbers that did not move are the two that matter for the objective: clicks
per person shown (3.4%) and payers (2), and the one number nobody was
watching is payer churn (2 of 2 by intent — §4).
