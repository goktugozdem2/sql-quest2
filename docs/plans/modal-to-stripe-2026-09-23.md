# Modal → Stripe: why 2.3% and what to do (2026-09-23)

The scorecard (docs/agent/scorecard.md) put the middle-funnel leak here:
257 people saw the Pro modal in 30 days, 6 were sent to Stripe (2.3%, the
founder's target is 30%). This file is the read and the plan. People by
`aid`, internal accounts out, 30 days to 2026-09-23. n is tiny at every step
past the modal; read the shape, not the decimals.

## What the data says

**1. The automatic modal has not produced a purchase in 30 days.** Both
payers in the window reached Stripe from the homepage pricing link
(`arrivalSrc=home`, `landingSrc=ref:buy.stripe.com`), not from a modal the
app opened on them. harinivr02 saw the modal on 09-06, clicked monthly,
never reached Stripe (`never_navigated`), and bought the annual plan
thirteen days later from the pricing section.

| Modal reason | People | Plan clicked | To Stripe | Paid |
|---|---|---|---|---|
| `milestone_solves` (automatic, after N solves) | 215 | 8 | 5 | 0 |
| `generic` | 36 | 2 | 2 | 0 |
| `milestone_streak` | 16 | 0 | 0 | 0 |
| `company_hard` | 10 | 1 | 0 | 0 |
| `rate_limit` | 6 | 1 | 1 | 0 |
| every other reason | 13 | 2 | 1 | 0 |

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

**Side note to check, not act on:** harinivr02's annual purchase recorded
`amount_cents: 4900`, not 9900. Most likely a promo code (`sqlquest_promo`
prefills one); confirm in Stripe → Payments.

## The plan

Ordered by what it costs and what it can move. Money-path changes follow the
flag queue's rule: they ship dark and flip on the founder's written Go.

| # | Change | Why | Cost | Needs |
|---|---|---|---|---|
| 1 | **Remove the email step.** A plan click goes straight to Stripe; Stripe collects the email; `prefilled_email` only when we have one | 4 of 4 without an email stopped there; Stripe already asks | an hour, behind a flag | founder's Go (money path) |
| 2 | **Make the pricing link the main door, not the popup.** The Pro modal's automatic `milestone_solves` open moves to a quiet banner (in the solve result, one line, dismissible); the full modal opens when the person asks — header "Pro", locked content, pricing link | both payers came through a door they chose; the automatic popup produced 0 in 30 days and is closed in 4 s | a day, behind a flag | founder's Go |
| 3 | **Ask behind paid value, not in front of it.** This is the free-tier boundary work already built and queued: `freeQuota` + `deadlineOffer` (row 8), `goalWallEarly` + `mockDoor` (row 10), `companySetGate` (row 11) | the modal meets people with nothing locked; the asks that sold (first-session, 6–10 solves, interview date) were at a wall | built, dark | founder's Go, after activation (the queue's rule) |
| 4 | **Payment methods on the Stripe page:** check Payments → Payment methods for Link, Apple Pay, Google Pay; decide whether to keep Adaptive Pricing's local currency | 3 of 5 left Stripe inside 30 s, all on non-US/India cards | dashboard, 15 min | founder (Stripe dashboard) |
| 5 | **Measure the step we cannot see:** `checkout_email_step_shown` and an abandon event when the modal closes with a plan pending (moot if #1 ships) | the four were invisible until someone read plan clicks by hand | 20 min | none — ships now |

**Not doing:** another modal copy rewrite. The copy was rewritten 09-12 and
09-21; the reader closes it in 4 s either way, so copy is not the constraint.
Not doing: lower prices. Nobody reached the price in a state to pay it.

## How it is read

- Metric `modal_click_rate` (already defined; `pro_modal_shown` →
  `pro_plan_clicked`/`pro_checkout_clicked`) and `checkout_abandonment` for
  the steps after it, split by modal `reason` — never the total, since #2
  changes who is shown.
- Guardrail: `purchases` (stripe_webhook) must not fall; at 1–2 a month it
  cannot be read inside a month, so each change gets a 30-day window and the
  step rates (plan click → Stripe, Stripe → paid) are read, not the
  purchase count.
- #1 is read at 30 days: plan clickers without an email reaching Stripe ≥ 3
  of 4. #2 at 30 days: `plan_click_rate` per person who saw any ask ≥ the
  3.4% baseline, with the pricing-link door counted.
