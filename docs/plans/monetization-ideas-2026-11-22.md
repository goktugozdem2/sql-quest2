# Monetization ideas — ranked, measured, ready to build (2026-11-22)

Written for the implementer agent and the founder. Every number was read on
2026-11-22 from production (`pro_events`, `email_events`; Supabase, read-only),
people by `coalesce(aid, username)`, money only from `reason='stripe_webhook'`.
Bots out everywhere: `metadata.bot` set, viewports `tablet:800x600`,
`desktop:1280x1200`, `desktop:1919x992`, `landingSrc='ref:aocr.org'`, and the
internal usernames (`^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)`).
No person is named here; the repo is public. Re-measure before quoting.

**The objective.** The brief for this doc names O1 (50 paying customers a
month by 2026-12-08). `docs/agent/objectives.md` records that O1 was reset by
the founder on 2026-11-10 to **O2: 10 payers / 30 days by 2027-02-08**, with
a day-30 checkpoint of **4 payers / 30 d on 2026-12-10**. Today: **3**. Both
objectives point at the same gap — the ranking below is by expected payers
per unit of work, and nothing here pretends to reach 50.

Competitor context: `docs/reads/monetization-competitors-2026-11-22.md`.

---

## 1. Where money leaks today

### 1a. The 30-day funnel (to 2026-11-22)

| Stage | Count | Note |
|---|---|---|
| People who opened the app | 1,077 | `app_opened` |
| Solved ≥ 1 | 235 | 22% |
| Saw the Pro modal | 117 | |
| Clicked a plan | 17 | 14.5% of viewers |
| Reached a Stripe session (server) | 20 people / 21 sessions | `pro_checkout_started` |
| Sessions expired unpaid | 23 | **15 were trial sessions** |
| Trials started | 5 | |
| Purchases | 3 ($157) | 2 of them a trial's day-7 charge |

```sql
-- shape of every query below (30 d; swap the event list)
with ev as (select event, reason, username, created_at, (metadata #>> '{}')::jsonb m
            from pro_events where created_at > now() - interval '30 days'),
bad as (select distinct coalesce(m->>'aid', username) pid from ev
        where m->>'bot' is not null
           or m->>'viewport' in ('tablet:800x600','desktop:1280x1200','desktop:1919x992')
           or m->>'landingSrc' = 'ref:aocr.org'),
e as (select *, coalesce(m->>'aid', username) pid from ev
      where coalesce(username,'') !~* '^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)')
select count(distinct pid) filter (where event='pro_modal_shown' and pid not in (select pid from bad)) ...
```

Lifetime, for scale: **10 purchases ever** (7 monthly, 3 annual, $410 gross),
**2 renewals ever**, 1 refund.

### 1b. Leak 1 — the Stripe page (unchanged since the 11-22 money read)

Since 2026-10-06, 31 people reached a Stripe session, split by what they chose:

| Session | People | Started a trial or paid within a day |
|---|---|---|
| default region, monthly, trial | 16 | 4 (25%) |
| default region, **annual**, trial | 6 | **3 (50%)** |
| **India, monthly, trial** | 8 | **1 (12.5%)** |
| India, annual | 0 | — |

People who came back from Stripe without paying stayed a **median 31 s**
(n = 20, 60 d). Annual sessions start trials at twice the monthly rate, yet
plan clicks are **39 monthly : 11 annual** (60 d).

### 1c. Leak 2 — the day-7 charge (new finding)

Nine trials started since 2026-10-01. Eight have reached day 7:

| Outcome | Trials |
|---|---|
| Paid on day 7 (or after a retry) | 3 |
| Cancelled during the trial (at 2 h, ~2 d, ~2 d, ~4.5 d) | 4 |
| **Day-7 charge failed and never recovered** (annual, $99; 4 failed retries 11-06 → 11-16, still `past_due`) | 1 |

Of the four trials that reached the charge without cancelling, **the first
charge failed for two** (`invoice.payment_failed`, `billing_reason
subscription_cycle`). One recovered after 16 days; one is still lost. Also:
the one India buyer of the period (monthly $9, 10-01) failed the first
renewal on 11-01 with `will_retry: false` and the subscription was cancelled
11-16 — the RBI e-mandate rule makes off-session charges on Indian cards fail
unless a mandate was registered (Stripe docs, read 2026-11-22:
docs.stripe.com/india-recurring-payments).

What the person is told today: `stripe-webhook`'s `payment_failed` email asks
them to **"just reply to this email and I'll send you a secure Stripe link"**
(3 sent in 45 days). There is no self-serve card update in that email, none
in the app, and the copy calls a trial's first charge a "renewal".

**One record to check by hand (founder, Stripe dashboard):** the mid-October
trial whose day-7 charge failed bought a *second* monthly subscription on
10-23 while the first was retrying; the first went `active` again on 11-03.
That customer may be paying for two subscriptions — a refund owed and a
dispute waiting.

### 1d. Leak 3 — the asks the product makes vs the asks people make

Pro modal, 60 days, by why it opened (people → clicked a plan):

| Reason | Shown | Clicked | Rate |
|---|---|---|---|
| `milestone_solves` (automatic, 6 solves) | 247 | 8 | 3.2% |
| `free_quota` (the 10-solve wall) | 144 | 19 | 13.2% |
| `company_set` | 24 | 2 | 8.3% |
| **`generic` (a person pressed a Pro button)** | 22 | 7 | **31.8%** |
| **`pricing_link`** | 15 | 4 | **26.7%** |
| `pattern_mock` / `mock_link` | 13 / 11 | 0 / 0 | 0% |

Clicks that became a trial or a purchase, since 10-01, by the reason on the
click: free_quota 10 → 4, milestone 8 → 3, generic 5 → 2, pricing_link 4 → 1,
company_set 2 → 2, company_hard 1 → 1, interview_locked 2 → 1.
Person-initiated opens convert at 2–10× the automatic ones, and **a free user
has no Pro button in the header** (removed 2026-09-14 with the paying user's
countdown chip; src/app.jsx, header comment).

### 1e. Leak 4 — the quota wall shows itself too often

142 people met the wall from 09-26 (50 of them guests). Median 3 lock hits
each; **75 (53%) saw the Pro modal three or more times**; 47 (33%) came back
on a later day, 14 on three or more later days; 31 took the free road back
(daily 24, Coach 7).

### 1f. Where buyers come from (45 days, first `app_opened` arrivalSrc)

| Door | Arrivals | Solved | Clicked a plan | Trial or paid |
|---|---|---|---|---|
| **Company pages** (`company:*`, excl. Capital One) | 171 | 47 (27%) | 9 | **4 (2.3%)** |
| /sql-exercises/ | 367 | 138 (38%) | 2 | 2 (0.5%) |
| Homepage | 92 | 25 | 5 | 0 |
| Topic / question pages | 221 | 13 | 0 | 0 |
| /capital-one-sql-interview/ | 23 | 6 | 0 | 0 |

Company pages are the best money door per arrival by ~4×, and **81% of the
people who land on one never open the app** (1,290 company-page landing
people in 45 days → 247 opened the app → ~79 solved).

### 1g. What is already measured as not working (do not re-propose)

- Annual-first highlighting alone does not move the plan mix (ledger "the
  price story": MISS on mix, 19 monthly / 2 annual).
- The plans-above-the-fold A/B reads 0.91× control (ledger interim, 11-22).
- A quarterly plan: 2 clicks, 0 purchases in five days, then off (founder's
  "one price architecture", 2026-09-19).
- A lifetime card: zero purchases ever, removed 09-12.
- Moving the quota to 20: retired by the 11-22 decision (the wall sells).
- `/for-teams/`: **0 `team_interest` rows** to date.
- The tier-10 milestone ask (removed #104; 72% closed it under 3 s).
- Abandon mails exist and are weak: 112 mailed in 60 days, 24 back within
  48 h, 4 plan clicks, 1 trial-or-paid within 14 days.

---

## 2. Who may ship what

- **AGENT-NOW** — copy, flow or UI; reversible; no price, no plan, no Stripe
  setting, no edge-function deploy, no migration, no outward email. Ships as
  one PR with a ledger claim. (Ask surfaces changed under the founder's
  2026-11-22 delegation, like #95 and #104, carry a pre-registered revert.)
- **FOUNDER** — any price or plan change, a money flag flip, a Stripe
  dashboard setting, `supabase functions deploy …`, a migration, or an
  outward email. The agent can write the code and the PR; it cannot make it
  live.

## 3. The ranked list

Ranked by expected payers per unit of effort. Effort: S ≤ ½ day, M ≤ 2 days,
L > 2 days of agent work (founder steps listed separately).

| # | Idea | Who | Effort | Expected payers / 30 d |
|---|---|---|---|---|
| M-01 | The day-7 charge gets a self-serve fix | FOUNDER (deploy + Stripe settings) | S | +0.5–1 (recovers money already won) |
| M-02 | Company pages hand off to the app | AGENT-NOW | S | +0.5–1 |
| M-03 | India pays once, not by subscription | FOUNDER (price + deploy) | M | +1–2 |
| M-04 | A "Try Pro free" button free users can press | AGENT-NOW | S | +0.5 |
| M-05 | Cancellation reasons and one save offer in Stripe's portal | FOUNDER (dashboard only) | S | +0.3–0.5 |
| M-06 | Two untrue lines on the paying surface | AGENT-NOW | S | small; protects against disputes |
| M-07 | The quota wall asks once a day, then waits inline | AGENT-NOW | S–M | +0.3, plus retention |
| M-08 | The trial button defaults to annual (A/B) | FOUNDER (money surface) | S | +0.5 if the 50% vs 25% holds |
| M-09 | A card-free trial (the 11-22 proposal) | FOUNDER (2 deploys + money) | L | +1–3, high variance |
| M-10 | Day 5 of a trial: what you used, what is left, when the charge comes | AGENT-NOW | S | small; fewer surprise failures and disputes |
| M-11 | An expired Stripe session gets its recovery link | FOUNDER (deploy + email) | M | +0.3 |
| M-12 | The wall speaks to the person's company | AGENT-NOW | S | +0.1–0.2 (small population) |

**AGENT-NOW, in order:** M-02, M-04, M-06, M-07, M-10, M-12.
**FOUNDER, in order:** M-01, M-03, M-05, M-08, M-09, M-11.

---

### M-01 · The day-7 charge gets a self-serve fix — FOUNDER

- **Data.** 1c: of 4 trials that reached day 7 without cancelling, 2 first
  charges failed; 1 recovered after 16 days, 1 ($99 annual) is lost. The one
  India renewal of the period failed with no retry. The failure email says
  "reply and I'll send you a link"; the app shows nothing.
- **Change.**
  1. `supabase/functions/stripe-webhook/index.ts`, the `invoice.payment_failed`
     branch: put a button in the email that opens the invoice's own
     `hosted_invoice_url` (Stripe's page where the person pays the open
     invoice with another card), and the portal link
     (`STRIPE_CUSTOMER_PORTAL_URL`, src/app.jsx line ~737) as the second
     line. Word it by `billing_reason`: `subscription_cycle` right after a
     trial → "your free week ended and the first charge didn't go through";
     a later cycle → "renewal". Keep "reply to me" as the last line.
  2. Same webhook, `pro_subscription_status` with `status: past_due`: write
     `users.data.billingIssue = { since, invoiceUrl }` (cleared on `active`),
     a server-owned field like the other pro fields (`sq_save_user` keeps it).
     The app shows one line under the header for that person: "Your card
     didn't go through — fix it in Stripe" → `invoiceUrl`. Event
     `billing_issue_shown` / `billing_issue_clicked`.
  3. Stripe dashboard (founder): Billing → Revenue recovery → Smart Retries on,
     "Send emails when card payments fail" on with the Stripe-hosted link.
  4. By hand, once: check the possible double subscription (1c).
- **Kind.** Money path (no price change). **Needs** `supabase functions deploy
  stripe-webhook`; part 2 needs `sq_save_user` to list `billingIssue` among
  the server-owned keys (a migration). Part 3 is dashboard only and can ship
  alone first.
- **Expected effect.** At ~5 trials a month and ~50% of matured ones reaching
  the charge, ~1 failed first charge a month; a self-serve link typically
  turns a large share of those around within days instead of 16. Recovering
  half is +0.5 payer/month — the cheapest payer on this list, because the
  person already decided to pay.
- **Effort** S (agent: ~3 h code + tests). **Risks** a wrong invoice URL in a
  money email (test it); showing the banner to someone whose subscription was
  already cancelled (clear the field on `customer.subscription.deleted`).
- **Metric** new `failed_charge_recovery` (register in metrics.md): first
  charges and renewals with `pro_payment_failed {billing_reason:
  subscription_cycle}` → `pro_purchase_completed` / `pro_renewal_completed`
  or `status: active` on the same subscription within 14 days.
  **Baseline** 1 of 3 recovered (2026-10-01 → 11-22), median 16 days.
- **Target** ≥ 2 of 3 recovered within 7 days, over the next 6 failures.
- **Falsification, in advance.** After 6 failures, ≤ 1 recovered within 14
  days → the card itself is the block (India mandates, prepaid cards), not
  the link; stop here and move effort to M-03 / M-09.
- **Test plan.**
  - Unit (`tests/stripe-webhook.test.js`, source guards in the existing
    style): the failed-payment email contains `hosted_invoice_url`; the
    trial-ending wording appears only when `billing_reason ===
    'subscription_cycle'` and the subscription had a trial; the "reply"
    line remains; `billingIssue` is written on `past_due` and removed on
    `active` and on `subscription.deleted`. Deliberate break: drop the
    invoice URL from the template, watch the test fail by name.
  - `tests/account-access.test.js`: `billingIssue` is in the server-owned
    list (a client save cannot set or clear it).
  - App: a pure `billingIssueLine(userData)` in `src/utils/` (returns null
    without a field, the URL otherwise; https://invoice.stripe.com/ only).
  - Headless browser: `/app?ff_...` not needed — seed a local user blob with
    `billingIssue`, load `/app/`, assert the banner text and that its link
    host is `invoice.stripe.com`; a blob without it shows no banner.
  - Founder after deploy: Stripe test mode, card `4000000000000341` (attaches,
    fails on charge) on a 1-minute trial clock → email arrives with a working
    link.

### M-02 · Company pages hand off to the app — AGENT-NOW

- **Data.** 1f: company arrivals are the best money door (2.3% trial-or-paid
  per arrival vs 0.5% for /sql-exercises/), but only **19%** of company-page
  landing people open the app (247 / 1,290, 45 d). The page's primary button
  reads "Start the <Company> set — free" and sits under the hero; the first
  runnable question is not on screen.
- **Change.** In `scripts/build-company-pages.mjs` (the seven generated
  pages) and in the shared block `build-company-crosslinks.mjs` injects into
  the 23 older pages: one hero CTA that names the first question and the
  time — "Solve <Company> question 1 now — free, no sign-up" — linking to
  `/app/?company=<Name>&src=<slug>&goal=interview` exactly as today (the
  in-app banner of 11-20 then opens question 1). Name question 1 from the
  same curriculum-order pick the banner uses (`pickNextChallengeWith` over
  the set). Do **not** switch the link to `?challenge=` yet: the banner's own
  claim reads 12-18 on in-app arrivals, and changing the landing screen
  would confound it. If that read is a MISS (opened < 62%), the next step is
  the `?challenge=<first id>&company=` deep link (same resolver rules —
  guest mode, return, open on the next run).
- **Kind.** UX/copy. No deploy. Capital One's freeze ended 10-12 (its page is
  in the generator since #77).
- **Expected effect.** Page → app 19% → 25% is +~40 arrivals per 45 days; at
  2.3% that is ~+1 trial-or-paid per 45 days, ~+0.5–1 payer a month once
  trials convert.
- **Effort** S–M (generator + 23 injected pages, rebuild, sitemap lastmod).
- **Risks** the frozen/pinned page tests (`tests/company-sections.test.js`,
  `company-template.test.js`) must be regenerated, not hand-edited; a
  question title in a CTA that drifts from the bank (bind it by test).
- **Metric** `company_page_door` (metrics.md), extended with one step to
  register there: landing people on `*-sql-interview` pages →
  `app_opened` (same aid) within 1 h.
  **Baseline** 19.1% (247 / 1,290, 2026-10-08 → 11-22).
- **Target** ≥ 25% at ≥ 600 landing people; guardrail: company arrivals'
  first-solve rate not below 27%.
- **Falsification, in advance.** Under 21% at ≥ 600 → the CTA's words are not
  what keeps people on the page; revert the copy and look at scroll depth
  before the hero instead.
- **Test plan.**
  - Unit: `tests/company-template.test.js` regenerates and diffs; add a guard
    in `tests/company-sections.test.js` that every company page's first
    `data-track="cta_hero_primary"` names a challenge title that exists in
    the bank and is the curriculum-first of that company's tagged set.
    Deliberate break: hand-edit one title, watch it fail.
  - `tests/site-counts.test.js` and `tests/seo-consistency.test.js` must stay
    green (no exact bank count, no frequency claim).
  - Headless: `npm run build && npm run dev`, open
    `/wise-sql-interview/`, the hero button text contains the question title;
    click it → `/app/?company=Wise…`, the company banner's button names the
    same title; Run is clickable within 10 s on a fresh profile.

### M-03 · India pays once, not by subscription — FOUNDER

- **Data.** 1b: India is a third of modal viewers (78 of 236 since 10-02),
  clicks at the same rate (11.5% vs 12.7%), then starts a trial at half the
  default rate (1 of 8 sessions). The India buyer of the period was lost at
  the first renewal (`will_retry: false`). Stripe's India page (read
  2026-11-22): off-session charges on Indian cards need an e-mandate and a
  24-hour pre-debit notice, and without a mandate "the payment will be
  declined". A trial's day-7 charge is off-session; a one-time payment is not.
- **Change.** For `priceRegion === 'IN'` only: the modal offers one on-session
  payment — e.g. **"12 months of Pro — $39, one payment, no renewal"** (and,
  if the founder wants a second card, "3 months — $15") — through
  `create-checkout-session` with `mode: 'payment'` and no trial. The webhook
  grants the days on `checkout.session.completed` (`ONE_TIME_PLANS`, today
  only `lifetime`, extended by plan length). Default region unchanged.
  `regional-price.js` gets the new table entry; `checkout-surface.test.js`
  binds shown price to the Stripe price.
- **Kind.** Price/plan architecture (founder's "one price architecture" of
  09-19 is the thing being changed — explicit go needed). **Needs** new
  Stripe prices (founder), deploy of `create-checkout-session` and
  `stripe-webhook`.
- **Expected effect.** ~45 India modal viewers a month × 11.5% click ≈ 5
  clickers; an on-session payment that clears 3D Secure at even 40% is ~2
  payers a month — today India yields ~0 net.
- **Effort** M. **Risks** a one-time pass never renews (lower LTV than a
  working subscription, but the subscription is not working); access expiry
  must be honoured by `pro-access.js` without the old auto-renew bug
  (CLAUDE.md, lapsed-pro note); a VPN visitor gets the India price (already
  true today).
- **Metric** `trial_funnel` split by region, plus a new `india_pass` line:
  India `pro_plan_clicked` → `pro_purchase_completed` (stripe_webhook)
  within 1 day. **Baseline** India click → trial-or-paid 1 of 8 sessions
  (10-06 → 11-22); India net payers / 30 d: 0.
- **Target** ≥ 3 India purchases in the first 30 days; click → paid ≥ 30%.
- **Falsification, in advance.** < 15% click → paid at ≥ 10 India clickers →
  the card, not the mandate, is the block (3D Secure itself); revert to the
  subscription prices and read `pro_payment_failed {at_checkout}` decline
  codes.
- **Test plan.** Unit: `regional-price.js` returns the pass for IN only;
  `checkout-session.test.js` — `buildCheckoutSessionBody` carries
  `plan: 'pass_12m'` only with region IN, the edge function's allow-list
  matches; webhook test: a `mode: payment` session grants exactly 365 days
  and never sets `proAutoRenew`. Deliberate break: grant 30 days, watch the
  test fail. Headless: `/app/?geo=IN` preview (or the `/api/geo/` stub) →
  modal shows one card, "$39 · one payment"; `?geo=US` shows today's two
  cards byte for byte (snapshot the modal text).

### M-04 · A "Try Pro free" button free users can press — AGENT-NOW

- **Data.** 1d: when a person opens the modal themselves it converts at
  26.7–31.8% (`pricing_link`, `generic`), vs 3.2–13.2% for automatic asks;
  person-opened clicks produced 3 of the ~14 trial-or-paid outcomes since
  10-01. A free user has no Pro entry in the header; the only buttons are
  in the Profile panel and the Interview tab.
- **Change.** In the app header, for a non-Pro person with ≥ 3 solves (never
  on the first-run shell before the first solve), a small button "Try Pro
  free" (when `trialOfferOn`) or "Pro" (otherwise) next to the identity chip.
  It opens the modal with reason `header` (new reason, copy = today's
  `pricing_link` headline). One event `header_pro_clicked {solves}`. Accent
  colour only because it is a primary CTA (DESIGN.md); never for Pro users.
- **Kind.** UX, no price. No deploy.
- **Expected effect.** If 4% of the ~235 monthly solvers press it (~10) and
  25% of those click a plan with the measured ~40% click → trial-or-paid,
  that is ~1 trial-or-paid a month, ~+0.5 payer.
- **Effort** S. **Risks** header clutter at 375 px (hide below 400 px wide
  or collapse to an icon); it could pull clicks from the wall rather than
  add them (read the wall's own rate as guardrail).
- **Metric** new `header_pro` (register): people shown the button → pressed
  → plan click → trial/paid (stripe_webhook, by username).
  **Baseline** none (new surface); comparison: `pricing_link` 26.7% modal →
  click.
- **Target** ≥ 10 presses / 30 d, ≥ 20% press → plan click; `quota_wall`
  click rate not below 10%.
- **Falsification, in advance.** < 5 presses in 30 days → nobody looks for it;
  remove. Wall clicks fall below 10% while header clicks rise → it moved
  clicks, did not add; remove.
- **Test plan.** Unit: a pure `headerProCta({ isPro, solves, trialOn,
  firstRunShell })` in `src/utils/paywall-moments.js` (null for Pro, < 3
  solves, first-run shell; label by `trialOn`); source guard that the header
  button calls it and sets reason `header`. Deliberate break: show it at 0
  solves. Headless (`npm run smoke` step or a one-off script with
  `scripts/smoke/lib.mjs`): fresh guest → no button; solve 3 (CodeMirror
  `setValue`, Submit) → button visible; click → modal with `data-testid`
  `pro-modal` and the plan cards; Pro test account → no button; 375 px →
  no horizontal scroll.

### M-05 · Cancellation reasons and one save offer in Stripe's portal — FOUNDER

- **Data.** 1c: 4 of 8 matured trials cancelled, two at about day 2 after 15
  and 23 solves in two days — people who got what they came for in a week.
  We do not know why any of them left; the portal captures nothing today.
- **Change.** Stripe → Settings → Billing → Customer portal: turn on
  "Cancellation reasons" and a retention coupon offered on cancel (suggested:
  switch to annual at the regular $99, or one month at 50%). No code;
  `customer.subscription.updated` already logs the scheduled cancel. Agent
  follow-up (AGENT-NOW, after the founder switches it on): a read script
  that pulls `cancellation_details` from the webhook payload into
  `pro_subscription_cancelled` metadata (needs a webhook deploy — founder).
- **Kind.** Money (a coupon is a price) — founder. Dashboard only.
- **Expected effect.** At ~2 trial cancels a month, saving one in four is
  +0.5 payer/month; the reasons are worth more than the saves.
- **Effort** S (dashboard, 10 minutes). **Risks** a coupon that undercuts
  list for people who would have paid; limit it to the cancel flow.
- **Metric** `payer_churn` and `trial_funnel` step 3 (trial → paid).
  **Baseline** 3 of 8 matured trials paid (37.5%).
- **Target** ≥ 50% over the next 8 matured trials; ≥ 4 cancellation reasons
  recorded.
- **Falsification, in advance.** 0 saves in the first 6 cancel flows → the
  offer is not what they want; keep the reasons, drop the coupon.
- **Test plan.** Founder: Stripe test mode, start a test subscription, open
  the portal link, cancel → the reason picker and the offer appear. Agent:
  `tests/stripe-webhook.test.js` guard that `cancellation_details.reason` /
  `feedback` are copied into the event metadata when present.

### M-06 · Two untrue lines on the paying surface — AGENT-NOW

- **Data.** The modal's terms block (src/app.jsx ~32735–32750) says "Billed by
  Datrick, Inc. — that is the name on your card statement", while CLAUDE.md
  records the statement descriptor as **SQLQUEST.APP** since 2026-09-20; and
  "your local currency may be shown at checkout", which is only true on the
  Payment Link fallback — the session path (`checkoutSessions`, on since
  09-30) charges USD with Adaptive Pricing off. A line at the payment moment
  that does not match the card statement is a dispute; a line that warns of
  a currency switch that will not happen is friction.
- **Change.** Statement line → "Your card statement will read SQLQUEST.APP
  (Datrick, Inc.)" — **founder confirms the descriptor from one real receipt
  before merge**; currency line only when `checkoutSessions` is off (or
  reworded "Billed in USD").
- **Kind.** Copy. No deploy.
- **Expected effect.** Small on conversion; removes a dispute trigger on a
  trial's day-7 charge (a trial charge with an unfamiliar name is the
  classic chargeback; the ledger rule turns the trial off on one dispute).
- **Effort** S. **Risk** stating the wrong descriptor — hence the receipt
  check.
- **Metric** disputes (`pro_refunded` / Stripe disputes) on trial conversions;
  guardrail `modal_click_rate`. **Baseline** 0 disputes, 1 refund ever.
- **Target / falsification** no dispute from a trial conversion through
  2027-01-31; if one arrives citing the descriptor, the line was not enough —
  add the name to the trial reminder too.
- **Test plan.** `tests/checkout-surface.test.js`: assert the modal's
  `data-testid="billed-by"` text contains the descriptor constant (export it
  from `checkout-session.js` and reference it in CLAUDE.md); the currency
  line renders only when the session flag is off. Deliberate break: revert
  to "Datrick, Inc." only. Headless: open the modal at `/app/?pro=1`, read
  both lines.

### M-07 · The quota wall asks once a day, then waits inline — AGENT-NOW

- **Data.** 1e: 53% of the 142 wall people saw the modal 3+ times (median 3
  lock hits); the wall's click rate is 13.2% of people, and its
  `modal_dismissed` rows outnumber people 3 : 1. Asked a third time, a
  person learns to swat (the tier-10 lesson: 72% under 3 s).
- **Change.** `quotaGate` (src/utils/free-tier-boundary.js) returns, besides
  the lock, `showModal: true` only on the first wall hit of the person's day
  (stamp `userData.quotaWallModalDay`); later hits that day open an inline
  card in place of the editor: "10 free solves used — Try Pro free for 7 days
  · or today's daily / your Coach plan", the same buttons as the modal's.
  `content_lock_reached` still fires on every hit, with `modal: true|false`.
- **Kind.** UX on the best-selling surface, no price. Ship as an A/B by aid
  (murmur-finalised hash, CLAUDE.md A/B trap), not a flip.
- **Expected effect.** Same first ask, fewer swats; expected to hold clicks
  and raise next-day return among wall people (33% today). Payers: +0.3 if
  the later-day returners click at the first-ask rate.
- **Effort** S–M. **Risks** fewer modal impressions → fewer clicks if the
  repeats were selling (the falsification covers it).
- **Metric** `quota_wall` per arm: clicks per person, trial-or-paid within 7
  days, returned on a later day. **Baseline** 12.8% click, 4.3%
  trial-or-paid within 7 d, 33% later-day return (09-26 → 11-21).
- **Target** inline arm: clicks ≥ control − 2 points, later-day return
  ≥ control + 8 points, at ≥ 60 wall people per arm.
- **Falsification, in advance.** Inline arm clicks < 0.7× control at ≥ 60 per
  arm → the repeats were selling; keep the modal on every hit.
- **Test plan.** Unit (`tests/free-tier-boundary.test.js`): first hit of a day
  → `showModal`; second hit same day → inline; next day → modal again;
  arm assignment independent of `modal_layout_v1` and the CTA test (reuse
  the independence check in `tests/company-ask.test.js`). Deliberate break:
  drop the day stamp. Headless (pattern of #92's quota smoke): seed a guest
  with 10 solves, open an unsolved challenge → modal; close; open another →
  inline card with the trial button and the two free paths; no modal.

### M-08 · The trial button defaults to annual (A/B) — FOUNDER

- **Data.** 1b: annual trial sessions start trials at 50% (3/6), monthly at
  25% (4/16); plan clicks are 78% monthly. Monthly payers leave after the
  interview (ledger "First 90 Days"). Highlighting annual did not move the
  mix (ledger MISS) — a highlight is not a default.
- **Change.** In the arm: one primary button "Start 7-day free trial —
  then $99/year ($8.25/mo)" (prices from `planPrices`), monthly as a
  secondary text link under it. Control: today's two cards. A/B by aid
  (murmur hash), `pro_modal_shown.modalLayout = 'annual_default'`.
- **Kind.** Money surface (plan presentation) — founder's go.
- **Expected effect.** If the trial-start rate per click rises from ~30% to
  ~40% and the trial → paid rate holds, +0.5 payer/month and ~3× revenue
  per payer.
- **Effort** S. **Risks** fewer clicks from price-sensitive people (a $99
  commitment after 7 days); a higher day-7 charge fails more often (M-01
  first).
- **Metric** `modal_layout_split`, extended: per arm, plan click → trial
  started → paid; revenue per modal viewer. **Baseline** click → trial ~30%
  (7/22 default-region trial sessions); annual share of clicks 22%.
- **Target** revenue per modal viewer ≥ 1.3× control at ≥ 150 viewers per arm.
- **Falsification, in advance.** Clicks < 0.7× control, or trial → paid
  below 25% in the arm → revert.
- **Test plan.** `tests/modal-layout.test.js`: three arms, independent hash;
  `tests/checkout-surface.test.js`: the arm's button text is built from
  `planPrices` (no literal price). Headless: force each arm with a seeded
  aid, open the modal, assert the button text and that the click requests
  `plan: 'annual'`.

### M-09 · A card-free trial — FOUNDER

- **Data.** 15 of 17 expired sessions in the 11-22 money read were trial
  sessions; median 31 s on Stripe. Full proposal, unchanged:
  BACKLOG.md "The money read of 2026-11-22" (`cardlessTrial`, three pieces).
- **Change / kind / deploys.** As written there: `payment_method_collection:
  'if_required'` on trial sessions behind a flag, a `billing-portal` edge
  function, `trial-reminder-cron` links the portal. Two deploys + money go.
  **Build after M-01**: a card-free trial converts only through the same
  add-a-card link M-01 builds.
- **Expected effect.** Trial starts per session 25% → 60–80%; day-7
  conversion unknown and probably low (no card). Net +1–3 payers a month if
  ≥ 15% of card-free trials add a card.
- **Effort** L. **Risks** trials that never pay crowd the tutor budget ($10
  workspace); people who would have paid now take the free week instead.
- **Metric / baseline / target / falsification** as in BACKLOG: trial starts
  per session (~25%), day-7 conversion; card-free day-7 conversion under
  20% → off.
- **Test plan.** `tests/checkout-session.test.js`: `if_required` only with the
  flag on and a trial; webhook: `customer.subscription.deleted` with
  `missing_payment_method` cancel ends access and writes
  `pro_trial_cancelled {reason: 'no_card'}`. Headless: Stripe test mode
  session shows no card fields; the app on day 5 of a card-free trial shows
  "Add a card to keep Pro" with the portal link.

### M-10 · Day 5 of a trial: what you used, what is left, when the charge comes — AGENT-NOW

- **Data.** 1c: two of four trials that reached day 7 failed the charge; 4 of
  8 cancelled; the two-day cancellers solved 15–23 in the trial. Stripe's
  own reminder is on (ledger, 10-01), but in-app nothing says the date or
  what Pro still holds for them.
- **Change.** For a person in a Stripe trial (`userData.proTrial` /
  `proTrialEnd`), from 48 h before the end: one line on the Coach and the
  challenge list — "Your free week ends on <date>. Then $<price>/<period>.
  Still ahead in Pro: <n> Hard you haven't opened, the <company> mock." with
  "Manage plan" (portal link). Event `trial_day5_shown`. No price change; the
  price shown comes from `planPrices(region)`.
- **Kind.** UX, honest-disclosure. No deploy.
- **Expected effect.** Fewer failed day-7 charges from cards that needed a
  top-up, and a reason to stay for the cancellers who did not see what was
  left; payer effect small (+0.2), dispute risk lower.
- **Effort** S. **Risks** reminding people to cancel — accepted; a surprise
  charge is worse (the trial turns off on one dispute).
- **Metric** `trial_funnel` step 3. **Baseline** 3 of 8 matured paid; 2 of 4
  charges failed.
- **Target** over the next 8 matured trials: ≥ 3 paid and ≤ 1 failed charge.
- **Falsification, in advance.** Cancellations rise to ≥ 6 of 8 → the line
  pushes people out; reword to the "still ahead" half only.
- **Test plan.** Unit: pure `trialEndingLine({ proTrialEnd, now, region,
  plan, hardLeft, mockTitle })` — null outside the last 48 h, null for paid
  Pro, price from `planPrices`. Deliberate break: show it 72 h early.
  Headless: seed a user blob with `proTrial: true`, `proTrialEnd` = now +
  30 h → line visible on the Coach with the right date; + 80 h → hidden.

### M-11 · An expired Stripe session gets its recovery link — FOUNDER

- **Data.** 23 sessions expired in 30 days; 7 `checkout_abandon` mails were
  sent (the mail needs an email we hold; 14 of 41 checkout clickers in 60 d
  were guests). Abandon mails return 21% within 48 h but produce ~1
  trial-or-paid per 112 mailed.
- **Change.** `create-checkout-session`: `after_expiration: { recovery: {
  enabled: true, allow_promotion_codes: true } }`; the webhook stores
  `after_expiration.recovery.url` and `customer_details.email` from
  `checkout.session.expired`; `checkout-abandon` links that recovery URL
  (the same plan, the same trial, one click back to the card form) and can
  reach people who typed an email at Stripe but never gave us one.
- **Kind.** Outward email + two deploys — founder.
- **Expected effect.** +0.3 payer/month (more reachable abandoners × a
  shorter path back).
- **Effort** M. **Risks** emailing an address typed at Stripe needs the
  consent rules (Stripe's recovery requires `consent_collection.promotions`
  for Stripe-sent mail; our own mail is transactional to a started purchase
  — the founder decides).
- **Metric** `checkout_abandonment`: expired sessions → mailed → paid within
  7 days. **Baseline** 7 mailed / 23 expired; 1 trial-or-paid per 112
  abandon mails (60 d).
- **Target** ≥ 15 of 23 mailed; ≥ 2 recoveries in 60 days.
- **Falsification, in advance.** 0 recoveries from ≥ 20 recovery-link mails →
  the session was not the obstacle; stop.
- **Test plan.** `tests/checkout-session.test.js` source guard on the
  `after_expiration` params; webhook test stores the URL only when it is
  `https://checkout.stripe.com/`; `checkout-abandon` dry run (`?dry=1`)
  lists the recovery URLs without sending.

### M-12 · The wall speaks to the person's company — AGENT-NOW

- **Data.** Company-set clickers converted 2 of 2 since 10-01; company
  arrivals are the best door (1f); the 10-solve wall's headline is generic
  ("10 free solves done. Try Pro free for 7 days."). People with a
  `prepTarget.company` meet the same words.
- **Change.** `quotaWallHeadline(quota, trialOn, company)`: with a company
  that has a tagged set (`findPlanTarget`), the sub-line becomes "The rest of
  the <Company> set and its mock are in Pro" (signed archetypes: name the
  mock; tagged-only: "the <Company> set", never a readiness number —
  interview-prep.js rule). Headline unchanged (#95 is being read).
- **Kind.** Copy. No deploy.
- **Expected effect.** +0.1–0.2 payer/month. The population is small:
  of 142 wall people since 09-26, 11 arrived from a company page and 9
  named a company (≤ 20, ~14%). Cheap, so it stays on the list, last.
- **Effort** S. **Risks** confounding #95's headline read — change only the
  sub-line, and split the 12-20 read by `company` present/absent.
- **Metric** `quota_wall` split by `prepTarget.company` present.
  **Baseline** 12.8% click overall (09-26 → 11-21); compute the company
  split at ship time and write it into the claim.
- **Target** company-present clicks ≥ 1.3× their own baseline at ≥ 25
  people (expect ~10 a month — read at 2027-01-17 at the earliest).
- **Falsification, in advance.** Below their baseline at ≥ 25 → the company
  is not the lever at the wall; revert the sub-line. Fewer than 25 by
  2027-01-17 → UNREADABLE; keep it (it is true) and stop reading it.
- **Test plan.** Unit in `tests/checkout-session.test.js`: no company → the
  current strings exactly; Capital One → names the mock; a tagged-only
  company → no mock, no number. Deliberate break: allow a readiness % in the
  line. Headless: seed `prepTarget.company = 'Revolut'` and 10 solves →
  the wall modal's sub-line names Revolut.

---

## 4. What is not proposed, and why

- **A lower global price.** No data says the default region's price is the
  block (click rates by region are equal; the leak is after the click).
- **A lifetime or quarterly plan for everyone.** Both were tried: zero
  lifetime purchases ever; quarterly 2 clicks, 0 purchases. M-03 is the only
  one-time price, and only where the subscription demonstrably fails.
- **A team / bootcamp plan.** `/for-teams/` has 0 `team_interest` rows.
- **Quieting the 6-solve ask (`quietEarlyAsks`).** It is weak (3.2%) but sold
  3 of ~14 trial-or-paid since 10-01; silencing it costs money.
- **A free first question of the Capital One mock.** Parked 11-22 (BACKLOG
  idea 2): ~3 clicks a month on the door.
- **More abandon-mail copy.** 112 mailed, 1 trial-or-paid; M-11 changes the
  mechanism (a recovery link), not the words.

## 5. Order of work

1. Founder, this week: M-01 part 3 (Stripe dashboard, minutes), M-05
   (dashboard), the double-subscription check (1c), confirm the statement
   descriptor for M-06.
2. Agent, now: M-02, M-04, M-06, then M-12 and M-10; M-07 as an A/B.
3. Founder decisions with the code ready: M-01 deploy, M-03 (price + deploy),
   M-08 (money surface), then M-09 and M-11.

Every shipped idea gets a ledger claim with the metric, baseline, target and
falsification above, and a read date no later than 28 days after merge.
