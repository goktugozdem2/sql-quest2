# India checkout — where the clicks die (B1, 2026-11-22)

The question, from the 11-22 demand read (branch `docs/playbook-next-app`):
India is 16 of the 46 people who clicked through to checkout in 90 days, and
1 of the 9 payers. Where do Indian checkout clicks die, and what is the
cheapest fix that does not touch prices or money flags?

**Short answer.** They die **on Stripe's page, in seconds, without a card
attempt we can see.** Not at the modal, not at session creation, not on a
3D Secure failure. Since 2026-10-08, 8 new people priced in India reached a
Stripe session. None started a trial or paid. None left a decline or a
card-setup failure. The ones who came back to the app came back 21–39 s
after the click, against ~76 s for everyone else. The one Indian
subscription of the period went through on the 7th try and then died at its
first off-session renewal. **The cheapest next step is a 15-minute read of
those 8 sessions in the Stripe dashboard (founder)**, because the data
cannot tell "no UPI/RuPay" from "card blocked for international use" from
"no card for a trial". After that read: one India-only line before Stripe
(code).

## Source and filters

- Production `pro_events` through the read-only MCP, 90 days to 2026-11-22.
  Client metadata is stored as a JSON string and was parsed before reading.
- People = the browser `aid`; a webhook row (no aid) joins through its
  username to that username's latest aid.
- **India** = priced in India: `priceRegion = 'IN'` on any client event, or
  `region = 'IN'` on a server session or expiry. n = **17** clickers (one of
  them has a London time zone but was priced IN by the country header).
  **Rest** = everyone else who clicked, n = **29**. That includes 4 people
  with an Indian time zone who were priced at the default price (3 of them
  before the regional price shipped on 09-26). The demand read's 16 / 30
  split differs by that one London-tz person; the total, 46, matches.
- Out: `metadata.bot`, viewports `tablet:800x600` / `desktop:1280x1200` /
  `desktop:1919x992`, referrer or landingSrc `aocr.org`, usernames `test2`,
  `sqlquest`, `fabletest*`, `linktest*`, `internalroutine*`, and accounts or
  click emails on `@datrick.com` / `@example.com` / `@mailtest.com`.
- Aggregates only below. No usernames, emails, aids or Stripe ids.

## 1. The funnel by region (people, 90 days)

| Step | India | Rest |
|---|---|---|
| `pro_modal_shown` (any region signal, incl. tz) | 222 | 353 |
| `pro_plan_clicked` (same broad signal) | 22 | 28 |
| `pro_checkout_clicked` (priced-region split) | **17** | **29** |
| — clicked monthly / annual | 17 / 1 | 23 / 7 |
| — clicked with the trial offered (`trial: true`) | 10 of 10 session-era clickers | 20 |
| Stripe session created (`pro_checkout_started`, logged from 10-08) | 8 | 17 |
| `checkout_session_fallback` (to a Payment Link) | 2 (10-01, 10-08) | 2 |
| `pro_checkout_expired` (people) | **17 of 17** | 19 |
| `pro_payment_failed {subscription_create}`, at checkout | 1 person, 3 rows, all 10-01 | 0 |
| `pro_card_setup_failed` (trial card, 3DS) | **0** | **0** (0 rows ever, any region) |
| `pro_trial_started` (webhook) | 1 | 7 |
| `pro_purchase_completed` (webhook) | 1 | 5 |
| **Trial or paid** | **1 of 17 (6%)** — the same person both times | **9 of 29 (31%)** |

The modal and the plan click are not where India is lost. The 11-22
monetization ideas file (`docs/plans/monetization-ideas-2026-11-22.md`,
§1b) has India's modal → click rate at 11.5% against 12.7%. Everything
after the click is.

### India in two eras

| Era | New people | Stripe page | Trial or paid | Came back to the app, s after click |
|---|---|---|---|---|
| Payment Link (09-24 → 10-01; the link forces INR) | 8 | 8 of 8 sessions expired | **0** | 7, 7, 9, 11 (n = 4) |
| Checkout Session (10-05 → 11-17; USD, trial on) | 8 | 8 of 8 expired | **0** | 21, 25, 39 (n = 3) |
| The one payer (both eras) | 1 | 6 sessions expired on 10-01, paid $9 on the 7th | 1 purchase, later 1 trial | 18, 224, 169 |

So the result is the same with INR and with USD, and with and without a
trial. What the two eras share is Stripe's payment form.

## 2. Plan and trial

- **Monthly, always.** 17 of 17 India clickers clicked monthly. 1 also
  clicked annual, once, through a Payment Link on 09-26. Since sessions
  shipped, India has **0 annual clicks** (rest: 7 of 29 people clicked
  annual).
- **Trial, always.** All 10 session-era India clicks carried `trial: true`
  (`checkoutTrial` on since 10-01). Every India session since 10-08 was
  `IN / monthly / trial`: 9 sessions by 9 people. The only trial that
  started belongs to the returning payer (11-17). That person was handed
  a trial although they had paid before; that bug was fixed the same day
  (`trialAlreadyUsed` now counts purchases).
- Rest, sessions since 10-08: **6 of 16** session starters trialled or
  paid (38%). India: **1 of 8** (the returning payer), and **0 of 7** new
  people.

## 3. Timing

- **Click → session:** median **5.7 s** in India (n = 9) and **7.0 s** for
  the rest (n = 25). Session creation is not an India problem.
- **Click → expiry** is **24.0 h** for every row (India n = 25, rest
  n = 30). That is Stripe's default session lifetime, so it carries no
  information. The useful clock is the return.
- **Click → back in the app** (`pro_checkout_returned.secondsAway`, which
  starts at the click):

  | | n | Values (s) | Median |
  |---|---|---|---|
  | India, new people | 7 | 7, 7, 9, 11, 21, 25, 39 | **11** |
  | India, all returns | 10 | + 18, 169, 224 (the payer, during 3DS declines) | 19.5 |
  | Rest, since 09-24 | 12 | 10 … 3,519 | **~76** |

  For a session, subtract ~6 s of creation time: the session-era Indians
  were on Stripe's page for roughly **15–33 s**. The Payment Link era ones
  were there for 7–11 s. Typing a card and passing an OTP takes longer than
  that: the payer's 3DS attempts took 169 s and 224 s. 8 of 17 India
  clickers came back to the app at all. The other 9 closed the tab.

## 4. Card failures — do they cluster?

- **There are almost none to cluster.** In the whole window the only India
  card failures are the payer's **3** at-checkout declines on 10-01
  (`billing_reason: subscription_create`, $9 due). They came before the
  `at_checkout` field existed, so they carry no decline code. Since then:
  **0** at-checkout declines and **0** `pro_card_setup_failed` in India.
- `pro_card_setup_failed` has **0 rows ever, in any region**, across ~25
  trial sessions and 9 trials started. There are two possible reasons, and
  the data cannot tell them apart: nobody's card setup failed, or the
  Stripe endpoint is not subscribed to `setup_intent.setup_failed` (CLAUDE.md
  says the founder must add it in the dashboard). Until that is checked, "0
  setup failures" is not evidence of "0 attempts". The timing in §3 is
  what says most Indians never tried a card.
- **Trial or direct purchase?** India's session-era clicks were all trial
  (card setup, no charge today). The only card failures were on a direct
  purchase (10-01, before the trial existed for that person).
- **Renewal:** that purchase's first off-session renewal failed on 11-01
  (`subscription_cycle`, `will_retry: false`). The subscription ended on
  11-16. This is consistent with the RBI e-mandate rule the ideas file
  cites (an off-session charge on an Indian card without a registered
  mandate is declined), but it is one case.
- **A live test lands tomorrow.** The returning payer's trial started
  11-17 17:59 UTC, so its day-7 charge is due around **11-24 18:00 UTC**.
  It is an off-session charge on (probably) the same Indian card. If it
  fails, the mandate is the renewal block. Read it on 11-25: does
  `pro_payment_failed {subscription_cycle}` or `pro_purchase_completed
  {after_trial}` arrive for an India-priced username?

## 5. Did the same person try more than once?

- **India mostly tries once.** 3 of 17 people had more than one Stripe
  session:
  - the payer: 6 sessions plus 3 declines on 10-01, then one more on 11-17;
  - one person who got 3 sessions in 21 s on 10-08: the client's 8 s
    timeout fired 0.45 s before the session arrived, so a Payment Link and
    a session both opened, and then they clicked again. This was before the
    11-20 warm-up; there has been no India fallback since;
  - one person who opened annual, then monthly (Payment Links, 09-26).
- **Rest: 13 of 23** people with a webhook row had more than one session.
  Elsewhere people come back and try again. In India they leave.

## 6. What the session asks for (code-based)

This section is from `supabase/functions/create-checkout-session/index.ts`
and `stripe-webhook/index.ts` only. **The Stripe dashboard was not visible
to this run.**

- The session sets **no `payment_method_types`**. That leaves the choice to
  the account's dashboard settings, which is how Checkout behaves when no
  list is passed. Three things narrow it: `mode: 'subscription'`, the price
  currency (**USD**, with `adaptive_pricing: { enabled: false }`), and
  `payment_method_collection: 'always'`, so even a trial must take a
  payment method. (`automatic_payment_methods` is a PaymentIntent
  parameter; Checkout does not take it.)
- **UPI** cannot appear on the session path. UPI is a rupee method, the
  session is USD-only, and the mode is subscription. From general Stripe
  knowledge, not verified here: UPI on Stripe is also limited to
  India-registered accounts, and the business is a US company. The Payment
  Link fallback shows INR through Adaptive Pricing, but nothing in code
  turns UPI on there either.
- **RuPay** is a card network. Whether a RuPay card is accepted depends on
  the account's card-network support in Stripe, not on this code. It cannot
  be answered from the repo.
- **Indian e-mandates:** nothing in the code asks for one. There is no
  `payment_method_options.card.mandate_options` and no pre-debit notice. If
  Stripe registers a mandate on its own for an Indian card in a
  subscription Checkout, that happens in Stripe and is not visible here.
  The 11-01 renewal failure suggests it did not, for that card.
- The webhook records exactly four card-friction signals:
  `pro_payment_failed {at_checkout}`, `pro_card_setup_failed`,
  `pro_checkout_expired` (with `trial` and `region` from the session) and
  `pro_payment_failed {subscription_cycle}`. Nothing records which payment
  methods Stripe showed, or whether a card was typed and abandoned before
  submit.

## 7. Where it dies, ranked

1. **On the Stripe page, before any card is submitted: 16 of 16 new India
   clickers** (none left a recorded attempt). Short dwell (median 11 s from click to return), no recorded
   decline, the same with INR and USD, and with and without a trial. The
   likely causes, which this data cannot separate: no UPI or RuPay option; a
   debit card not enabled for international online payments; or not wanting
   to give a card for a free trial.
2. **At the first off-session charge: 1 of 1 India subscription.** The
   10-01 purchase renewed on 11-01 and failed with no retry.
3. **At 3D Secure on checkout: 1 person, 3 declines, then success** (10-01).
   Real, but not where the volume goes.
4. **Not at session creation** (latency 5.7 vs 7.0 s; 2 vs 2 fallbacks) and
   **not at the modal** (click rate 11.5% vs 12.7%).

## 8. Fixes, ranked (proposals only — nothing here was built)

### 1 · Read the 8 India sessions in the Stripe dashboard — FOUNDER (dashboard, ~15 min)

- **What.** Open the India sessions since 10-08 (Payments → Checkout
  sessions; or customers created with `region: IN` metadata). For each,
  note: was any payment or setup attempt made, and with what result? Which
  payment methods were on the page? Also check that the webhook endpoint
  lists `setup_intent.setup_failed`, and that no Radar rule blocks or
  challenges Indian cards. Note whether RuPay appears under Settings →
  Payment methods → Cards.
- **Expected effect.** No payers directly. It decides between fix 2 (people
  never tried: an expectations or method problem) and fix 3 (they tried
  and were declined: an issuer, 3DS or mandate problem). It also tells us
  whether `pro_card_setup_failed` can fire at all.
- **Who.** The founder (Stripe dashboard; B1 cannot see it).
- **Ledger claim.** "India clicks die before a card attempt." Metric: India
  Stripe sessions with ≥ 1 payment or setup attempt, of 8 (10-08 → 11-17).
  Baseline: unknown (0 recorded). Target / expectation: ≤ 2 of 8.
  **Falsification:** ≥ 3 of 8 show a declined or 3DS-failed attempt. Then
  the block is the card network or the issuer, not expectations; drop fix
  2 and go to fix 3.

### 2 · One India-only line before Stripe, and a one-tap "what stopped you?" on return — CODE (agent, after fix 1)

- **What.** Two small changes.
  - Under the plan buttons, when `priceRegion === 'IN'`: "Card payment
    only — Visa, Mastercard or Amex with international online payments
    switched on (most Indian debit cards have this off by default; it's one
    toggle in your bank app). UPI isn't available yet."
  - On `pro_checkout_returned` with `left_checkout`, one inline row (all
    regions): "Didn't go through? — My card didn't work · Wanted UPI ·
    Didn't want to add a card · Just looking". Event
    `checkout_return_reason`.
  - No price, flag or Stripe change. The copy must stay true: if fix 1
    shows RuPay is accepted, the line says so.
- **Expected effect.** India brings ~5–6 session starters a month. If the
  line turns even 15–20% of them into a trial or a purchase (rest: 38%),
  that is **~+1 trial-or-paid a month** from India. The tap gives the
  reason directly. At India's n it takes ~6–8 weeks to reach 10 answers.
- **Who.** Code (B1 PR, reviewed by A1). It sits on the money surface, so
  it goes under FOUNDER for the merge go.
- **Ledger claim.** Metric `trial_funnel` split by region: India session
  starter → trial or purchase within 1 day. Baseline **0 of 7** new people
  (10-08 → 11-17). Target ≥ 2 of the next 10. Read date: when 10 India
  session starters have passed, or 2027-01-31, whichever is first.
  **Falsification:** ≤ 1 of 10, *and* median click → return still ≤ 30 s.
  Then the form itself is the block (no local method), not the
  expectation. Remove the line and go to fix 3 or 4.

### 3 · India pays on-session: no trial, or a one-time pass — PRICE / MONEY FLAG (founder only)

- **What.** Either of two changes. (a) `checkoutTrial` off for `region IN`
  only: a direct $9 purchase is one on-session payment, so there is no
  day-7 off-session charge. (b) M-03 in the ideas file: a one-time "12
  months for $39" pass (`mode: 'payment'`), with no renewal and no mandate.
- **Why.** India session-era trial sessions: 1 of 9 started (the returning
  payer). The only India subscription died at its first off-session charge.
  The 11-24 day-7 charge (§4) is a free test of the same thing.
- **Expected effect.** M-03's own estimate is ~2 India payers a month if the
  on-session payment clears at ≥ 40%. Fix 1 says whether people even reach
  the card field. If they do not, this changes little.
- **Who.** The founder (money flag, price architecture, two deploys).
- **Falsification:** as in M-03. Fewer than 15% click → paid at ≥ 10 India
  clickers means the payment form or the card, not the subscription, is the
  block.

### 4 · A local method (UPI / RuPay) for a one-time pass — FOUNDER (provider decision)

- **What.** Only if fix 1 shows "no attempt" and fix 2 falsifies: take the
  one-time India pass through a provider or account that offers UPI.
- **Expected effect.** It is the only change that removes "card only".
  Size unknown.
- **Who.** The founder: a new payment provider or account, plus webhook work.
- **Falsification:** < 3 India purchases in the first 30 days with UPI live
  and ≥ 10 India clickers. Then India's problem is willingness to pay, not
  method; stop investing in India checkout.

## 9. Measurement notes for the next reader

- `pro_checkout_started` exists only from 10-08, and 1 India session-era
  click (10-05) has no row; expiry rows carry `source` / `region` from
  10-02. Before that, "Payment Link or session" is read from the expiry's
  `source` (null = link).
- `pro_checkout_returned.secondsAway` starts at the click, so it includes
  session creation (~6 s). Its `instant_bounce` cut (< 5 s) therefore never
  fires for a session. A session-era bounce reads as `left_checkout` at
  6–10 s.
- The 46 / 9 / 1 headline (demand read) and this read agree on 46 clickers.
  "1 of 9 payers" counts the priced region. By time zone, India has a
  second payer in history: $49 at the default price on 09-19, before the
  regional price.

FOUNDER: fix 1 (15 min in the Stripe dashboard) unblocks everything after
it. The 11-24 day-7 charge on the one India trial is worth a look on 11-25.
