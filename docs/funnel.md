# The Pro funnel — events, where they fire, how to read them

PLAN item 1 (2026-10-06). Every step from "the Pro modal opened" to "money
arrived", with the event that records it, who writes it, and the trap in
reading it. All rows land in `pro_events` (`event`, `username`, `reason`,
`metadata` — a jsonb that holds a JSON *string*, so read it as
`(metadata #>> '{}')::jsonb`, `created_at`).

**Two rules before any number:**
1. **Money truth is the Stripe webhook only** — `reason = 'stripe_webhook'`.
   The client also writes `pro_purchase_completed` (reason
   `activation_funnel`) when the success page sees Pro; it double-counts and
   can never be trusted for revenue.
2. **People, not events.** Count distinct people. Client rows carry
   `metadata.aid` (the browser's id, stable across guest → account); server
   rows carry only `username`. Join on `username` across the two; within
   client rows use `coalesce(metadata.aid, username)`. Exclude internal
   accounts (`^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)`).

## The stages

| # | Stage | Event | Written by | Key properties |
|---|---|---|---|---|
| 1 | Modal opened | `pro_modal_shown` | client (`src/app.jsx`, the effect on `showProModal`), reason `activation_funnel` | `reason` (why it opened: `milestone_solves`, `free_quota`, `company_hard`, `pricing_link`, `pattern_mock`, `mock_link`, …), `priceRegion`, `trialOffered`, `modalLayout` (`plans_first`/`control`, from 10-08), `deadline`/`daysOut`, `patternSlug`, `linkSrc` |
| 1b | Modal closed without a plan | `modal_dismissed` | client (`dismissProModal`), reason = the modal's reason | `via` (`backdrop`, `escape`, `free_path_<to>`, …), `msOpen`, `sawPlans` |
| 2 | Plan selected | `pro_plan_clicked` | client (plan card click), reason `activation_funnel` | `plan` (`monthly`/`annual`), `modalLayout`, `modalReason`, `priceRegion`, `hadEmailOnFile` |
| 2b | Email step (guests) | `checkout_email_step_shown` / `checkout_email_captured` / `checkout_email_skipped` / `checkout_email_step_bypassed` | client | — |
| 3 | Checkout clicked | `pro_checkout_clicked` | client (`launchCheckout`), reason `activation_funnel` | `plan`, `email` (for the abandon mail), `modalReason`, `trial` |
| 4 | **Checkout started** (a Stripe session exists) | `pro_checkout_started` — **new 2026-10-06** | server (`create-checkout-session`), reason `checkout_session` | `session_id`, `plan`, `region`, `trial`, `promo`, `notes` |
| 4f | Session could not be made | `pro_checkout_session_failed` — **new 2026-10-06** (server) and `checkout_session_fallback` (client, falls back to the Payment Link) | server / client | `stage` (`no_price`, `stripe`, `no_url`), `error_type`, `error_code` / `reason` |
| 5a | Completed — paid | `pro_purchase_completed` | **server** (`stripe-webhook`, reason `stripe_webhook`) | `plan_type`, `amount_cents`, `stripe_session_id`; `after_trial: true` + `invoice_id` on a trial's day-7 charge |
| 5b | Completed — trial started | `pro_trial_started` | server (`stripe-webhook`) | `plan_type`, `trial_end`, `stripe_session_id`; the charge is a later `pro_purchase_completed {after_trial: true}` |
| 6a | Abandoned at Stripe | `pro_checkout_expired` | server (`stripe-webhook`, `checkout.session.expired`, ~24 h after creation) | `source`, `trial`, `region` |
| 6b | Came back without paying | `pro_checkout_returned` | client (next app load reads a breadcrumb) | `outcome`: `never_navigated` (the redirect failed — a bug, not a decision), `instant_bounce`, `left_checkout`; `secondsAway` |
| 6c | Card failed | `pro_payment_failed {at_checkout: true}` (first invoice) · `pro_card_setup_failed` (a trial's card, 3D Secure) | server | `code`, `decline_code`, `three_d_secure` |

Also from the webhook at checkout: `pro_purchase_pending` — Stripe paid but
no account matched the session yet (stored for the buyer's first sign-in;
counts as money, `amount_cents` set, never also count the later match).

After the money (all `stripe_webhook`): `pro_renewal_completed`,
`pro_subscription_cancelled` (`scheduled` or `ended`),
`pro_subscription_reactivated`, `pro_trial_cancelled` (a trial ended before
its charge), `pro_trial_reactivated`, `pro_subscription_status` (Stripe moved
the subscription to `past_due` / `unpaid` / … — `status`, `from_status`),
`pro_refunded`, `pro_access_revoked`. (A referral's conversion goes to the
`referrals` table as `event_type = 'pro_conversion'`, not to `pro_events`.)

**Legacy duplicates — do not mix series.** `modal_shown` and `click_monthly`
/ `click_annual` / `click_quarterly` (reason = the modal's reason) are older
copies of stages 1 and 2, still written. Use the `pro_*` events; the legacy
ones are useful only because their `reason` column is the modal reason.

## Known gaps (2026-10-06)
- **Stage 4 is new.** Before this date nothing recorded that a session was
  made; "clicked" (3) and "saw Stripe" were one number. `pro_checkout_started`
  starts filling after `create-checkout-session` is deployed with this
  change. Payment-Link fallbacks never write stage 4.
- **Stage 6c for trials needs the Stripe endpoint subscribed to
  `setup_intent.setup_failed`** (dashboard, founder). Until then a trial's
  failed card leaves no row.
- **Stage 6a counts Stripe sessions, not people, and includes Payment Link
  sessions**, so it can exceed stage 3 (20 vs 19 in the 30 days below).
- Stage 5b has never fired (no trial started yet, 2026-10-06).

## The query

```sql
with ev as (
  select username, event, reason, created_at,
         coalesce(((metadata #>> '{}')::jsonb)->>'aid', username) as pid,
         (metadata #>> '{}')::jsonb as m
  from pro_events
  where created_at > now() - interval '30 days'
    and username !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)'
)
select
  count(distinct pid)      filter (where event = 'pro_modal_shown')       as modal_shown,
  count(distinct pid)      filter (where event = 'pro_plan_clicked')      as plan_selected,
  count(distinct pid)      filter (where event = 'pro_checkout_clicked')  as checkout_clicked,
  count(distinct username) filter (where event = 'pro_checkout_started')  as checkout_started,
  count(distinct username) filter (where event = 'pro_checkout_expired'  and reason = 'stripe_webhook') as checkout_expired,
  count(distinct pid)      filter (where event = 'pro_checkout_returned' and m->>'outcome' = 'never_navigated') as never_reached_stripe,
  count(distinct username) filter (where event = 'pro_trial_started'     and reason = 'stripe_webhook') as trial_started,
  count(distinct username) filter (where event = 'pro_purchase_completed' and reason = 'stripe_webhook') as purchased
from ev;
```

Split by `m->>'reason'` on `pro_modal_shown` (and `modalReason` on the click
events) to read one ask at a time; the milestone ask and the free-quota wall
behave differently (7.9% vs 18% click, 10-03 read).

## The 30 days to 2026-10-06

| Stage | People |
|---|---|
| Modal opened | 298 |
| Modal closed without a plan | 265 |
| Plan selected | 22 |
| Checkout clicked | 19 |
| Checkout started (server) | — (new) |
| Never reached Stripe (redirect failed) | 1 |
| Abandoned at Stripe (sessions expired) | 20 |
| Trial started | 0 |
| Paid | 2 |

Modal → plan 7.4%; plan → checkout click 86%; checkout click → paid 11%.
The leak is the modal itself (93% close it) and the Stripe page (most who
reach it leave). Stage 4 will say how many of the 19 actually saw it.

## Where it is defined elsewhere
`docs/agent/metrics.md`: `modal_click_rate`, `checkout_abandonment`,
`trial_funnel`, `payer_churn`, `pattern_to_checkout`. Report SQL:
`scripts/funnel-report.sql`. This file is the single map of the events; the
metric definitions stay where the ledger points.
