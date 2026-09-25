# Checkout Sessions + optional 7-day trial — release plan (2026-09-26)

Founder's written go (2026-09-26): server-created Stripe Checkout Sessions
with an optional card-required 7-day free trial, shipped **dark**.

The flag and money-path wiring in the client is the founder's to apply, so
this branch builds only the server side, the pure client module and their
tests. This file holds **the exact `src/app.jsx` and `feature-flags.js`
change** (section 4) so it can be applied or approved as written.

## 1. What is built (this branch)

| Piece | File | State |
|---|---|---|
| Edge function that creates the session | `supabase/functions/create-checkout-session/index.ts` | new, not deployed |
| Webhook: interval-based plan, IN prices, trials, first-invoice fix | `supabase/functions/stripe-webhook/index.ts` | changed, not deployed |
| trial-reminder-cron skips Stripe trialists | `supabase/functions/trial-reminder-cron/index.ts` | one guard, not deployed |
| Pure client half | `src/utils/checkout-session.js` | new, imported by nothing yet |
| Guards | `tests/checkout-session.test.js`, `tests/stripe-webhook.test.js` | new / extended |

### Why

Adaptive Pricing is "Always on" for Payment Links: a Turkish buyer clicks
$99 and meets TRY 5,021.88. A Checkout Session created on the server sets
`adaptive_pricing: { enabled: false }`, so the buyer pays the USD the modal
showed. The same door carries the trial and the India price.

### The session (create-checkout-session)

- Input `{ plan: 'monthly'|'annual', region: 'default'|'IN', username, email?, trial?, promo? }`,
  every field allow-listed or shape-checked. Output `{ url, plan, region, trial, notes }`:
  `region` / `trial` are what was **applied**; `notes` says why they differ
  (`in_price_unset`, `country_mismatch`, `trial_already_used`, `promo_not_found`).
- `mode: 'subscription'`, `client_reference_id = username`, `customer_email`
  when given, `payment_method_collection: 'always'` (the card is required even
  for the trial), `subscription_data.trial_period_days = 7` only when the trial
  was asked for and this username has no earlier `pro_trial_started`.
- Promo: a code that resolves to an **active** promotion code is applied as a
  discount; otherwise `allow_promotion_codes: true` (Stripe refuses both at once).
- `success_url = <origin>/app/?payment=success` — the same round trip the
  Payment Links use (the app's `pendingPaymentSuccessRef` poll). `cancel_url =
  <origin>/app/`, where the checkout breadcrumb records the abandon exactly as
  for someone pressing Back. **Check the Payment Links' configured redirect in
  the dashboard is also `/app/?payment=success`** — nothing in git records it.
- CORS: only `https://sqlquest.app`, `https://www.sqlquest.app` and the local
  dev ports 4321 / 5173 (localhost and 127.0.0.1); any other Origin gets 403.
- Stripe errors are logged (type and code only), never returned: the browser
  sees `{ error: 'checkout_unavailable' }` and falls back to the Payment Link.
- Region is the browser's hint (time zone). If the platform sends a country
  header (`cf-ipcountry` / `x-vercel-ip-country`) that disagrees, the default
  price is used. **If no such header reaches Supabase functions, the India
  price is honour-system**: anyone who sends `region: 'IN'` gets it. Decide
  that before setting the IN price secrets.

### The webhook

- **Plan detection:** price id → product id → **the price's own billing
  interval** (`year` → annual, `month`×3 → quarterly, `month` → monthly) →
  only then the amount. The amount fallback would have read a sub-$49 regional
  annual as a month. `STRIPE_PRICE_MONTHLY_IN` / `STRIPE_PRICE_ANNUAL_IN` are
  mapped by id too. Unset secrets no longer leave a `""` key in the maps.
- **Trial start:** `checkout.session.completed` with `amount_total 0` on a
  subscription reads the subscription; `trialing` → Pro to the trial end,
  `proType` = the plan, `proTrial: true`, `proTrialEnd`, `pro_trial_started
  {plan_type, trial_end, stripe_session_id, stripe_subscription_id}`. **No
  `pro_purchase_completed`, no referral conversion.**
- **The money:** `invoice.payment_succeeded`, `billing_reason
  subscription_cycle`, whose line period starts at the subscription's
  `trial_end` → the ONE `pro_purchase_completed` for that subscription
  (`reason stripe_webhook`, `after_trial: true`, `amount_cents`, `invoice_id`),
  expiry extended by the plan, `proTrial: false`, referral conversion written.
  Every later cycle is `pro_renewal_completed` as before.
- **Two invoice fixes that the trial forced:**
  - a `$0` invoice (the trial's opening invoice) extends nothing — before, it
    would have added a whole plan period on top of the trial;
  - a `subscription_create` invoice extends nothing — `checkout.session.completed`
    owns activation. Before, when that invoice happened to land AFTER the
    checkout event, a new buyer got two periods and a `pro_renewal_completed`
    row for their first payment (inflating the renewal count in metrics.md).
- **Trial cancelled before paying:** `customer.subscription.updated` on a
  `trialing` subscription logs `pro_trial_cancelled {scheduled}` /
  `pro_trial_reactivated` instead of `pro_subscription_cancelled` (a trialist is
  not payer churn); access is unchanged — its expiry already is the trial end.
  `customer.subscription.deleted` for a subscription that ended inside its
  trial (or whose record still says `proTrial`) sets `proExpiry` to the trial
  end, logs `pro_trial_cancelled {ended}` and returns before the payer-churn row.
  A first charge that finally fails still revokes at once (`endedForNonPayment`).
- **Redelivery:** a checkout whose session id is already on the user row is
  acknowledged and not logged again; a trial conversion whose invoice id is
  already recorded likewise. Normal non-trial purchases still log exactly one
  `pro_purchase_completed`.
- `invoice.paid` is deliberately not handled: the endpoint subscribes to
  `invoice.payment_succeeded`, and answering both would count one charge twice.

### trial-reminder-cron

It does **not** work for Stripe trials, and should not: it selects
`proType = 'trial'` (the old card-less in-app trial), its copy says access
will *lock* and links a Payment Link to *buy* Pro ("Lock in Pro — $19/mo",
itself stale). A Stripe trialist has a subscription that will *charge* them;
that email would tell them the wrong thing and invite a second subscription.
Stripe trialists carry `proType monthly|annual` + `proTrial`, so the query
already excludes them; an explicit `proTrial === true` skip now pins it.
**Their reminder is a founder decision:** Stripe's own trial-reminder email
(Dashboard → Settings → Billing → Subscriptions and emails), or a new sender
on `customer.subscription.trial_will_end` (fires 3 days before the end; the
endpoint would need to subscribe to it). Card-network rules on trial
reminders are worth reading before choosing none.

## 2. Founder checklist

**Secrets** (Supabase → Edge Functions → Secrets). Already set:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`,
`STRIPE_PRICE_ANNUAL`. New, optional — unset means India pays the default
price and the response says `in_price_unset`:

- `STRIPE_PRICE_MONTHLY_IN`
- `STRIPE_PRICE_ANNUAL_IN`

(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.)

**Deploy** (in this order):

```
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy create-checkout-session
supabase functions deploy trial-reminder-cron
```

`create-checkout-session` keeps JWT verification ON (the browser sends the
anon key, like capture-email). stripe-webhook stays `--no-verify-jwt`.

**Stripe endpoint events** — no new ones are required. The endpoint must
already carry: `checkout.session.completed`, `checkout.session.expired`,
`invoice.payment_succeeded`, `invoice.payment_failed`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`charge.refunded`. Verify all seven are ticked (the trial path depends on
`customer.subscription.updated` and `.deleted` for cancellation, and on
`invoice.payment_succeeded` for the money). Add
`customer.subscription.trial_will_end` only if a reminder sender is built.

**Release order — the webhook must know before any buyer can reach it:**

1. Deploy `stripe-webhook` and read its source back from the dashboard
   (2026-09-14 lesson: the first "deployed it" was the old version). Look for
   `planFromInterval` and `pro_trial_started`.
2. Set the IN price secrets (optional), then deploy `create-checkout-session`.
3. **Test mode first:** with test keys on a branch/preview, run one monthly
   session with `trial: false` and one with `trial: true` (card 4242…); confirm
   the checkout page shows **USD** (the `adaptive_pricing` parameter is newer
   than the webhook's pinned API version `2023-10-16` — confirm Stripe accepts
   it on this account), then `pro_trial_started` (not a purchase), then advance
   the test clock past the trial and see exactly one `pro_purchase_completed
   {after_trial: true}`; cancel a second trial and see `pro_trial_cancelled`.
4. Apply the app.jsx + flags diff below; flip `checkoutSessions` only
   (trial still off). Read `pro_checkout_clicked.via` and
   `checkout_session_fallback` for a few days — fallbacks should be ~0.
5. Flip `checkoutTrial` last, with the modal copy in the same PR.

Rollback: flip the flag(s) off — the Payment Links are untouched and remain
the fallback throughout.

## 3. Known gaps (not built here)

- `proTrial`, `proTrialEnd`, `proTrialConvertedInvoice` are **not** in
  `sq_save_user`'s `server_keys`, so a client save can drop (or resurrect) them.
  The webhook decides trials from Stripe's own fields and uses `proTrial` only
  as a second signal, so the damage is a label — but add the three keys to
  `server_keys` / `plan_keys` in the next migration that redefines
  `sq_save_user`.
- The existing dunning email in `invoice.payment_failed` says "renewal" and
  "Pro stays active through the retry window"; for a failed first charge after
  a trial, access runs only to the trial end + the 3-day read grace.
- A trial whose user row cannot be matched at checkout goes to
  `pending_subscriptions`; its first charge would then find no user by
  customer id and log nothing. Checkout Sessions are only created from the
  app with a live username, so this should not happen, but it is not guarded.
- The existing `pro_payment_failed` dedupe queries `.like("metadata", …)`,
  but `pro_events.metadata` is jsonb (double-encoded, metrics.md) — Postgres
  has no LIKE on jsonb, so that dedupe likely always errors and fails open
  (one dunning email per retry). Unverified against production; worth a look.
- "Billed in USD; your local currency may be shown at checkout" stays true
  but becomes over-cautious once sessions carry every purchase; revisit after
  the flag is stable (`tests/checkout-surface.test.js` pins the line).

## 4. The client wiring — the diff to apply (src/app.jsx, feature-flags.js)

### 4a. `src/data/feature-flags.js`, inside `features`, after `directCheckout`

```js
    // Server-created Stripe Checkout Sessions (founder's written go,
    // 2026-09-26): a plan click asks supabase/functions/create-checkout-session
    // for a session with Adaptive Pricing OFF, so the buyer pays the USD the
    // modal showed (Payment Links force the local currency). ANY failure falls
    // back to the Payment Link — src/utils/checkout-session.js,
    // launchWithFallback. RELEASE ORDER: stripe-webhook deployed (interval
    // plan detection + trial handling) BEFORE this flips; see
    // docs/plans/checkout-sessions-release.md.
    checkoutSessions: false,
    // Card-required 7-day free trial on the session path. Inert without
    // `checkoutSessions` (a Payment Link carries no trial). When on, the plan
    // cards say so in the founder's words around the modal's own price text.
    checkoutTrial: false,
```

### 4b. `src/app.jsx`, import (next to the pro-access import, ~line 28)

```js
import { pickRegion, wantsTrial, buildCheckoutSessionBody, requestCheckoutSession, launchWithFallback, TRIAL_COPY } from './utils/checkout-session.js';
```

### 4c. `src/app.jsx`, `launchCheckout` (~line 7030)

`CHECKOUT_LINKS` and the final `window.location.href = …` line are **not
touched**: the link path is reached by calling `launchCheckout` again with
`{ linkFallback: true }`, so whatever the final line becomes, the fallback
uses it.

```diff
-  const launchCheckout = (plan, email) => {
+  const launchCheckout = (plan, email, opts = {}) => {
     try { localStorage.setItem('sqlquest_purchase_user', currentUser || ''); } catch (_) {}
-    trackActivationEvent('pro_checkout_clicked', { plan, email: email || null, modalReason: proModalReason?.type || null, patternSlug: proModalReason?.patternSlug || null, linkSrc: proModalReason?.linkSrc || null });
+    // Server-created session (checkoutSessions) or the Payment Link. A
+    // fallback call re-enters with linkFallback and does not count a second click.
+    const sessionsOn = !opts.linkFallback && window.FF?.feature('checkoutSessions') === true;
+    const trial = wantsTrial({ sessionsOn, trialOn: window.FF?.feature('checkoutTrial') === true, plan });
+    if (!opts.linkFallback) {
+      trackActivationEvent('pro_checkout_clicked', { plan, email: email || null, modalReason: proModalReason?.type || null, patternSlug: proModalReason?.patternSlug || null, linkSrc: proModalReason?.linkSrc || null, via: sessionsOn ? 'session' : 'link', trial });
+    }
     …breadcrumb block unchanged…
+    if (sessionsOn) {
+      const promoCode = (() => { try { return sessionStorage.getItem('sqlquest_promo') || ''; } catch (_) { return ''; } })();
+      let region = 'default';
+      try { region = pickRegion({ timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }); } catch (_) { /* default */ }
+      const body = buildCheckoutSessionBody({ plan, username: currentUser, email, trial, promo: promoCode, region });
+      launchWithFallback({
+        sessionsOn: true,
+        request: () => requestCheckoutSession({
+          fetchImpl: window.fetch.bind(window),
+          endpoint: `${window.SUPABASE_URL}/functions/v1/create-checkout-session`,
+          anonKey: window.SUPABASE_ANON_KEY,
+          body,
+        }),
+        navigate: url => { window.location.href = url; },
+        fallback: reason => {
+          trackActivationEvent('checkout_session_fallback', { plan, reason, trial });
+          launchCheckout(plan, email, { linkFallback: true });
+        },
+      });
+      return;
+    }
     const promo = …unchanged…
     const promoSuffix = …unchanged…
     window.location.href = …unchanged final line…
   };
```

A trial promised in the modal and then lost to a fallback lands on a Payment
Link that charges today; Stripe's page states the amount due, so nobody is
charged unawares, but `checkout_session_fallback {trial: true}` is the row to
watch.

### 4d. `src/app.jsx`, the modal's plan cards (~line 32045)

The trial sentence is built **around the price strings the cards already
print** — no new price literal (the cards are what `tests/site-counts.test.js`,
`tests/llms-txt.test.js` and `tests/checkout-surface.test.js` parse). Above the
`data-pro-plans` grid:

```js
const trialOffered = wantsTrial({ sessionsOn: window.FF?.feature('checkoutSessions') === true, trialOn: window.FF?.feature('checkoutTrial') === true, plan: 'monthly' });
```

Monthly card, last line:

```diff
-<div className="text-xs mt-2" style={{ color: '#8A8E99' }}>$29/month</div>
+<div className="text-xs mt-2" style={{ color: '#8A8E99' }}>{trialOffered && TRIAL_COPY.before}$29/month{trialOffered && TRIAL_COPY.after}</div>
```

renders "Start 7-day free trial — then $29/month, cancel before day 7 and you
pay nothing".

Annual card, the "Billed yearly" line (the `$99` sits directly above it):

```diff
-<div className="text-xs mt-1" style={{ color: '#8A8E99' }}>Billed yearly</div>
+<div className="text-xs mt-1" style={{ color: '#8A8E99' }}>{trialOffered ? <>{TRIAL_COPY.before}billed yearly{TRIAL_COPY.after}</> : 'Billed yearly'}</div>
```

The founder may prefer "then $99/year" on the annual card; that needs a
`$99/year` sub-line (the monthly card already carries both `$29` and
`$29/month`). Not `$8.25/month` — the trial ends in a $99 charge, and the
sentence must name what is charged.

### 4e. `src/app.jsx`, the `?payment=success` poll (~line 25440)

A trial comes back with `proType` monthly/annual and `proTrial: true`, so the
poll celebrates and fires the client-side `pro_purchase_completed`
(`source: 'redirect_return'`, reason `activation_funnel`) for a trial. It is
not the money truth, but it will mislead the activation funnel. In the
success branch:

```diff
-          trackActivationEvent('pro_purchase_completed', { plan: fresh.proType || 'unknown', source: 'redirect_return' });
+          trackActivationEvent(fresh.proTrial === true ? 'pro_trial_started' : 'pro_purchase_completed', { plan: fresh.proType || 'unknown', source: 'redirect_return' });
```

and the profile's plan line (`planRenews`) will say "Renews on …" for a
trialist; it should read "Trial — first charge on …" once `checkoutTrial` is on.

### Events and metrics

- `pro_checkout_clicked` gains `via: 'session'|'link'` and `trial: bool`.
- `checkout_session_fallback {plan, reason, trial}` — should stay near zero.
- Webhook: `pro_trial_started`, `pro_trial_cancelled`, `pro_trial_reactivated`;
  `pro_purchase_completed` gains `after_trial` and `stripe_subscription_id`.
  Money truth is unchanged: `pro_purchase_completed` + `reason =
  'stripe_webhook'`. Add a `trial_conversion` definition to
  `docs/agent/metrics.md` (trial starts → after_trial purchases, by start
  week, read ≥ 8 days after the last start) before the trial flag flips.
