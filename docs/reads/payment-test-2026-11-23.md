# Payment flow, end to end up to Stripe's page (2026-11-23)

One run, 11:41–12:10 UTC. Headless Chrome (`scripts/smoke/lib.mjs`'s
`launchChrome`) against **production** (`https://sqlquest.app`, main at
`013d4b11`). Every check is hermetic (all Supabase, function and `/api/`
calls answered in the page, Stripe navigations stubbed) except one
non-hermetic run that opened two real Checkout Sessions to read them.
No card, email or other data was typed anywhere; no purchase, no trial.
Webhook and `users` checks are read-only aggregates through the Supabase MCP.

**Short answer.** The flow works. Every door shows $29 / $99, the 7-day trial
on both cards and the terms line. A plan click reaches a USD Stripe page with
"7 days free", $0.00 due today and the right after-trial price in 2.7–5.1 s.
A double click sends one request, Back returns cleanly, and a failed session
falls back to the right Payment Link with `checkout_session_fallback`. One
client bug was found and fixed: **an onboarding tour rendered on top of the
Pro modal** (PR linked from the run report). This morning's 403 was **Meta's
crawler**, not a visitor.

## Exclude these rows from any read

| What | Value |
|---|---|
| Real sessions (non-hermetic) | 2026-11-23 **11:52:02 → 11:52:45 UTC** |
| aid | `bee9e05647c7443b8775560d4cdcab42` |
| usernames | `guest_1795434722953` (monthly), `guest_1795434745460` (annual) |
| Rows written | 2 × `pro_checkout_started` (reason `checkout_session`, trial true, region default). The client's own events were dropped as a bot (headless UA), as designed. |
| Still to come | 2 × `pro_checkout_expired` from the webhook around **11:52 UTC on 11-24** (Stripe's 24 h expiry), same usernames. |

The hermetic runs wrote nothing (every write answered in-page).

## 1. The five doors (hermetic, desktop 1280 px)

Expected, from `PRICE_TABLE.default` and `TRIAL_CARD_COPY` / `TRIAL_TERMS`:
$29 "7 days free, then billed monthly" $29/month; SAVE 72% $99 "7 days free,
then billed yearly" $8.25/month; the trial terms line; no currency line
(sessions on).

| Door | How it was reached | Modal reason | Prices + trial cards + terms | Verdict |
|---|---|---|---|---|
| Header Pro button | guest with 5 solves, Challenges tab, `header-pro` | `header` | as expected | **OK** (tour on top: fixed, below) |
| Quota wall | guest at 10/10 → `/app/?challenge=101` | `free_quota`, after `content_lock_reached {challenge_quota}` | as expected; headline "10 free solves done. Try Pro free for 7 days." | **OK** |
| Locked Hard | guest with 3 solves, Hard filter, locked row → catcher "or unlock all 78 with Pro" | `hard_challenge`, after `content_lock_reached {challenge_hard}` | as expected | **OK** (tour on top: fixed) |
| `/app/?src=home&pro=1&plan=annual` / `monthly` | cold visitor | `pricing_link` | as expected, both | **OK** |
| Company `?interview=` | guest, `/app/?interview=capital-one-codesignal` | `mock_link` ("… CodeSignal-Style Mock is Pro. 70 minutes, 14 questions, timed") | as expected | **OK** |

`pro_modal_shown` carried `trialOffered: true` and `priceRegion: default`
on every door. "Billed by Datrick, Inc. — that is the name on your card
statement." shows on every door (see founder items).

## 2. Plan click → Stripe (real sessions, production)

| Step | Monthly | Annual |
|---|---|---|
| Warm-up (`{warm:true}` on modal open) | 204 | 204 |
| click → session request sent | 12 ms | 10 ms |
| click → create-checkout-session 200 | **1,902 ms** | **1,331 ms** |
| click → navigation to checkout.stripe.com | 2,576 ms | 1,629 ms |
| click → Stripe page rendered with a price | **5,104 ms** | **2,683 ms** |
| function log (annual): trial lookup / Stripe call | — | pre 373 ms / stripe 405 ms |
| Session requests for a click + a second click 200 ms later | 1 | 1 |

The 11-20 note had every session at 7–9 s; with the warm-up it is now
1.3–1.9 s to the session and under ~5 s to a rendered page.

What Stripe's page said (read, then left with Back):

- Monthly: "Try SQL Quest Pro — Monthly · **7 days free** · Then **$29.00
  per month** starting November 30, 2026 … Total due today **$0.00**".
- Annual: "Try SQL Quest Pro — Annual · 7 days free · Then **$99.00 per
  year** starting November 30, 2026 … Total due today $0.00".
- Currency **USD** on both (Adaptive Pricing off works). The trial line
  matches the modal's card copy word for word ("7 days free").
- Payment methods shown (desktop, this run's location): **Apple Pay, Link,
  Card (Mastercard, Visa, Discover, Amex), US bank account.** "Add promotion
  code" is open. Button: "Start trial".
- Product description still lists "every Daily difficulty, the full Warm-Up
  bank, the 30-Day Challenge, and priority support" — older than the
  modal's outcome copy (founder item; dashboard text).

**Double click:** the hermetic run (session held 2.5 s) clicked three times
in 300 ms: one `pro_checkout_clicked`, one request, both buttons
`disabled`, the "Preparing your secure Stripe checkout…" line shown.
**OK.** **Back from Stripe:** the app reloads on the same URL, the modal is
open again, buttons enabled, no "Preparing…" line, the breadcrumb says
`left: true`. **OK.**

## 3. Fallback (hermetic, session call answered 500)

| Plan | Payment Link opened | Event |
|---|---|---|
| monthly | `buy.stripe.com/bJe14o2u…0a` (= `CHECKOUT_LINKS.monthly`) after ~320 ms | `checkout_session_fallback {plan: monthly, reason: http_500, trial: true, priceRegion: default}` |
| annual | `buy.stripe.com/bJe9AU0m…0b` (= `CHECKOUT_LINKS.annual`) after ~310 ms | same, plan annual |

**OK.** One honest gap, known since M-06: a fallback buyer was promised "7
days free" on the card and lands on a Payment Link with no trial (and in
local currency). 4 of 61 clicks in the 60 days to 11-22.

## 4. This morning's 403 (09:59:16 UTC)

- `create-checkout-session` returns 403 in exactly two places, both the
  Origin check: an OPTIONS or a POST whose `Origin` is missing or not in
  `ALLOWED_ORIGINS` (sqlquest.app, www.sqlquest.app, localhost/127.0.0.1 on
  4321 and 5173). A bad or missing JWT is the gateway's **401**, not 403.
- The request (function edge log): a **POST with no preflight**, 13-byte
  body (= `{"warm":true}`, the modal's warm-up), anon key, from **AS Meta
  Platforms Ireland**, user agent `meta-externalagent/1.1` (Meta's
  crawler). A crawler rendering a page that opens the Pro modal (for example
  a `?pro=1` link) fired the warm-up from its own fetch stack, which sends
  no CORS Origin. Every other call in the 24 h (6 warm-ups from GB, US, PL,
  TH) had its preflight 200 and its POST 204.
- **No visitor lost anything:** it was a warm-up, which never makes a
  session, and the client ignores its failure.
- Could a real visitor on an allowed page hit it? **No** — browsers always
  send Origin on this cross-origin POST, and both production hosts are on
  the list (`http:` is redirected to https by Vercel before the app loads).
  Who would: a Vercel preview host (`*.vercel.app`), a proxy that re-serves
  the page under its own origin (Google Translate's `*.translate.goog`, web
  archives), or a non-browser client. Those buyers would fall back to the
  Payment Link (no trial, local currency) with
  `checkout_session_fallback {reason: http_403}`. That row has not appeared;
  not worth widening the allowlist for.
- The function edge log does not record the Origin or Referer header, so the
  origin itself cannot be read back; the UA and AS are enough here.

## 5. After payment (code reading + aggregates)

**How Pro is granted** (`supabase/functions/stripe-webhook/index.ts`):

- `checkout.session.completed`: plan from the price id (IN prices map to the
  same plans), then product, then interval, then amount. A $0 subscription
  checkout reads the subscription: `trialing` → Pro until `trial_end`,
  `proTrial: true`, row `pro_trial_started` (never a purchase). A paid one →
  Pro for 30 / 365 days, row `pro_purchase_completed`. Redelivery is caught
  by `stripeSessionId`. No user row → `pending_subscriptions`.
- The after-trial charge: `invoice.payment_succeeded`, `subscription_cycle`,
  period starting at `trial_end` → extends from the trial end by the plan,
  `proTrial: false`, one `pro_purchase_completed {after_trial: true}`. $0
  invoices and `subscription_create` invoices are ignored (no double grant).
- The client gives paid plans 3 days of grace past `proExpiry`
  (`GRACE_DAYS`), trials none, so a 30-day grant on a 31-day Stripe month
  does not lock a payer out before the renewal lands.

**Webhook rows, 60 days** (`reason = 'stripe_webhook'`):

| Event | Rows | People | Plan / amount |
|---|---|---|---|
| `pro_trial_started` | 9 | 9 | 6 monthly, 3 annual |
| `pro_purchase_completed` | 4 | 4 | monthly $29 ×1, monthly $29 after trial ×1, annual $99 after trial ×1, monthly **$9** ×1 (India, 10-01) |
| `pro_renewal_completed` | 1 | 1 | monthly |
| `pro_trial_cancelled` | 8 | 4 | 2 rows per trial by design (`scheduled`, then `ended`) — count people, not rows |
| `pro_subscription_cancelled` | 3 | 3 | monthly |
| `pro_payment_failed` | 11 | 4 | |
| `pro_refunded` | 1 | 1 | $29 |

- **Plan:** every trial and purchase that carries a `stripe_session_id`
  joins to its `pro_checkout_started` row, and the plan agrees in all 8 that
  join (7 default, 1 IN). The rest predate the 10-08 session row or are
  after-trial invoices (no session id). Every amount matches its plan and
  region ($9 = IN monthly).
- **Region is not on the webhook rows.** It is only recoverable through the
  session join or the amount; a trial row has neither amount nor region. A
  measurement gap, not a money bug.

**`users` against the webhook, counts only:**

- Payers without Pro: **0.** All 4 purchasers have `proStatus: true`; 3 have
  a future `proExpiry`, 1 is inside the 3-day grace (a monthly bought
  10-23 whose Stripe renewal falls due today, 11-23 ~16:37 UTC — check it
  arrived as `pro_renewal_completed`).
- The 6 trial-only people: `proStatus` still true, `proExpiry` past — no
  access (trials get no grace). The stale flag is the known pattern; access
  reads the expiry.
- Pro without a payment: **2**, both explained — 1 `internal_test_20260919`
  grant (annual) and 1 legacy lifetime with no Stripe customer. Every other
  live paid Pro has a webhook row and a Stripe customer.

## 6. Mobile (375 × 812, hermetic)

On the pricing link, the quota wall and the locked Hard: no horizontal
scroll (document 375 px wide), the modal is 343 px wide with 16 px gutters,
both plan cards 293 × 130 px, and a tap at each card's centre lands on the
card. On the plans-first arm both cards are on the first screen. **OK** —
except the tour, below.

## Findings

| # | Severity | Finding | Where | Action |
|---|---|---|---|---|
| F1 | **Medium** | The Challenges onboarding tour ("STEP 1 OF 5", z 9999) rendered **on top of the Pro modal** when a guest with a solve opened a locked Hard or pressed the header Pro button before finishing the tour. Desktop: tooltip and spotlight ring over the plans. 375 px: the tooltip is pinned across the bottom ~200 px, over the trial terms and everything below. Reproduced on production for both doors. | `src/app.jsx`, the four `<OnboardingTour>` renders | **Fixed (client PR):** every tour render now waits for `!showProModal`; `tests/tour-over-pro-modal.test.js`, proven by removing the guard from the Challenges tour (fails "every tour render is gated…"). Verified in the browser on the fixed build: no tour over the modal, plans tappable. The tour comes back when the modal closes. |
| F2 | Medium (founder check) | One person whose trial's first charge failed (10-18, `past_due`) bought again through a **new** session on 10-23. Nothing about the old subscription was logged afterwards. `create-checkout-session` never passes an existing `customer`, so a returning buyer gets a new Stripe customer, the row's `stripeCustomerId` is overwritten, and the old customer's later events cannot find the account. If Stripe retried and charged the old one, that is a double charge we cannot see. | Stripe dashboard; `supabase/functions/create-checkout-session` | Founder: open that customer's subscriptions in Stripe (the 10-11 trial, monthly). If two exist, cancel/refund the old one. A code change (reuse the customer, refuse a second live subscription) waits on that read; it is money path, rule 6d. |
| F3 | Low | Fallback buyers are promised "7 days free" and land on a Payment Link with no trial, local currency. | `launchCheckout` fallback | Known since M-06; no change. |
| F4 | Low | Webhook trial/purchase rows carry no `region`. | stripe-webhook `logProEvent` metadata | Measurement: add `region` from session metadata next time the webhook is deployed for another reason. |
| F5 | Low (founder) | Modal says "Billed by Datrick, Inc. — that is the name on your card statement."; CLAUDE.md records the descriptor as SQLQUEST.APP and the DBA as SQL Quest. One of the two is wrong. | modal copy vs Stripe settings | Founder: read a real receipt/statement line, then the copy changes to match. |
| F6 | Low (founder) | Stripe product descriptions list "every Daily difficulty, the full Warm-Up bank, the 30-Day Challenge" — the modal no longer sells those. | Stripe dashboard (products) | Founder, dashboard text only. |
| F7 | Info | 403 at 09:59 = Meta crawler warm-up with no Origin. | — | None. |

## Not walked

- India pricing (the run's location priced default; `/api/geo/` decides it).
- A real phone browser (Safari/WebView); the mobile check is Chrome at
  375 px emulation.
- Anything after "Start trial" — by rule.
