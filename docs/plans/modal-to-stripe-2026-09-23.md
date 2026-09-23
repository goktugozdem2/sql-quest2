# Modal → Stripe: why 2.3% and what to do (2026-09-23)

The scorecard (docs/agent/scorecard.md) put the middle-funnel leak here:
257 people saw the Pro modal in 30 days, 6 were sent to Stripe (2.3%, the
founder's target is 30%). This file is the read and the plan. People by
`aid`, internal accounts out, 30 days to 2026-09-23. n is tiny at every step
past the modal; read the shape, not the decimals.

## What the data says

**1. CORRECTED the same day: the automatic modal produced both purchases.**
The first read of this file said the opposite — "no purchase from the
automatic modal, both payers came through the homepage pricing link" — and
it was wrong. The join matched purchases to modal viewers by `aid`, but the
`stripe_webhook` purchase row carries only the username, so both payers fell
out of the join. Read by username:

- **jeromezhao** (09-01): `milestone_solves` modal at 22:05:02, paid monthly
  at 22:05:34 — thirty-two seconds.
- **harinivr02** (09-19): `milestone_solves` modal at 02:09 on desktop and
  again at 02:16 on the phone, clicked quarterly, monthly and annual across
  two devices over five minutes, paid at 02:19 (annual, $49 — see the note).

The `landingSrc=ref:buy.stripe.com` on their return rows is Stripe's
redirect back, not the door they came in by. Per reason, then:
`milestone_solves` 215 people → 8 plan clicks → 5 to Stripe → **2 paid**
(all the purchases in the window); every other reason 0.

**Trap for every future read:** join purchases to people by username (or
by the `aid` on the app-side `pro_purchase_completed` row, reason
`activation_funnel`), never by the webhook row's `aid` — it has none.

**2. The modal meets people who are content with the free tier.** The median
modal stays open 4.1 s; 59% close within 5 s. After a `milestone_solves`
show, 265 of 354 (75%) solve another challenge within two hours — the ask
does not drive them away, and it does not stop them either. At an average of
12.6 solves they have hit nothing they cannot do free. This is the free-tier
boundary finding of 2026-09-12 in the data: the ask arrives in front of the
paid value, not behind it. Half the audience (135 of 273) are guests.

**3. The email step lost 4 of 4.** Ten people clicked a plan. Six had an email
on file and went straight to Stripe. Four had none, met "Where should your
receipt go?", and none of them reached Stripe — not one
`checkout_email_captured`, not one `checkout_email_skipped`. The step renders
correctly (preview, 09-23), so this is not a bug; it is a second decision
placed between the decision to buy and the payment. Stripe asks for the email
itself, and the purchase is linked by `client_reference_id` (the username),
so the step adds nothing Stripe does not already do.

**4. Stripe loses 3 of 5 who arrive, and the ones it loses are foreign cards.**
Returned without paying: Lagos after 17 s, Moscow after 24 s, Mexico City
after 25 min (the since-removed lifetime plan). Stripe does not process
Russian cards; Nigerian cards fail often on international merchants; and
Payment Links run Adaptive Pricing ("Always on"), so the page shows local
currency. The two who paid were in India and the US.

**Closed 2026-09-24 — the $49 annual:** harinivr02 asked for a discount by
email and the founder gave one; that is what let them buy. The annual price
in Stripe is not in question. Two things to keep from it: a negotiated
discount is a real door (read `amount_cents`, not the plan, when summing
revenue), and the one buyer from India wrote in before paying — the reply
channel (support@ → goktug@) is part of the checkout for some people.

## The plan

Ordered by what it costs and what it can move. Money-path changes follow the
flag queue's rule: they ship dark and flip on the founder's written Go.

| # | Change | Why | Cost | Needs |
|---|---|---|---|---|
| 1 | **Remove the email step.** A plan click goes straight to Stripe; Stripe collects the email; `prefilled_email` only when we have one | 4 of 4 without an email stopped there; Stripe already asks | an hour, behind a flag | **done 2026-09-23** on the founder's go — flag `directCheckout` on, ledger read 10-23 |
| 2 | ~~Demote the automatic popup to a banner~~ — **withdrawn 2026-09-23.** It rested on the wrong read in §1: the automatic `milestone_solves` modal is the door both payers used. Keep it. | — | — | — |
| 3 | **Ask behind paid value, not in front of it.** This is the free-tier boundary work already built and queued: `freeQuota` + `deadlineOffer` (row 8), `goalWallEarly` + `mockDoor` (row 10), `companySetGate` (row 11) | the modal meets people with nothing locked; the asks that sold (first-session, 6–10 solves, interview date) were at a wall | built, dark | founder's Go, after activation (the queue's rule) |
| 4 | **Payment methods on the Stripe page** | 3 of 5 left Stripe inside 30 s, all on non-US/India cards | — | **checked 2026-09-23: nothing to change.** The Default configuration already enables Cards, Apple Pay, Google Pay, Link and ACH Direct Debit. Russian cards cannot be fixed; local currency is Adaptive Pricing, always on for Payment Links |
| 5 | **Measure the step we cannot see:** `checkout_email_step_shown` and `modal_dismissed.emailStepPending` | the four were invisible until someone read plan clicks by hand | 20 min | **done 2026-09-23** |

**Not doing:** another modal copy rewrite. The copy was rewritten 09-12 and
09-21; the reader closes it in 4 s either way, so copy is not the constraint.
Not doing: lower prices. The two who paid did so within minutes of seeing
the price; the leak is the step between the modal and Stripe, not the
number on it.

## How it is read

- Metric `modal_click_rate` (already defined; `pro_modal_shown` →
  `pro_plan_clicked`/`pro_checkout_clicked`) and `checkout_abandonment` for
  the steps after it, split by modal `reason` — never the total, since the
  free-tier flags (#3) change who is shown.
- Guardrail: `purchases` (stripe_webhook) must not fall; at 1–2 a month it
  cannot be read inside a month, so each change gets a 30-day window and the
  step rates (plan click → Stripe, Stripe → paid) are read, not the
  purchase count.
- #1 is read at 30 days (2026-10-23): plan clickers without an email
  reaching Stripe ≥ 3 of 4. #3 is read under each flag's own ledger claim.
