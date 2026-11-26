# Interview Pass vs subscription — test design (A06, 2026-11-25)

Investor 90-day plan, action A06 (`docs/plans/investor-90-day-2026-11-25.md`):
"One-time Interview Pass ($49–79, 60–90 days) vs subscription — designed
now, launched after the holdout, one price first, rules written before."

**This is a design only. It contains no code, no flag and no Stripe object.**
The test launches only when two things are true:
1. The freeQuota holdout (#384, read 2026-12-31) has been read, and the
   founder has decided the free tier.
2. The founder has given a written go on the price.

The metric is `interview_pass_test` in `docs/agent/metrics.md`, registered
in this PR's first commit (rule 6b).

---

## 1. Why now: what the numbers say

| Fact | Source |
|---|---|
| **0 of 5** monthly subscriptions renewed | due-diligence answers (Drive, 2026-11-25) |
| Annual is **63%** of revenue | same |
| 10 purchases ever (7 monthly, 3 annual), $410 gross, 2 renewals, 1 refund | `monetization-ideas-2026-11-22.md` §1a |
| Payers decide on **day 1, after ~6 solves**, for an interview | due diligence; `monetization-2026-09-24.md` finding 5 |
| 3 of 4 people who reach Stripe leave in ~34 s; 15 of 23 expired sessions were trial sessions | due diligence; ideas §1a–1b |
| Plan clicks are 78% monthly (39 : 11), but annual sessions start trials at 2× the monthly rate | ideas §1b |
| India: a day-7 or renewal charge is off-session and needs an RBI e-mandate. Without one, "the payment will be declined" | Stripe docs, re-read 2026-11-25 (§10) |

What this means: the monthly plan is not a subscription in practice. It is
a one-off $29 purchase that looks like a commitment. Buyers bring an
interview date, buy in their first session, and leave after the interview.

What was already tried, so it is not repeated blind:
- **Lifetime $199:** zero purchases. Removed 09-12.
- **Quarterly $49 / 3 months as a subscription:** 2 clicks, 0 purchases in
  five days, then off (founder's "one price architecture", 09-19).
- **A one-time "Interview Pass", 2026-09-14:** it existed for about an hour
  before the founder turned it into the quarterly subscription
  (`src/data/feature-flags.js`, the `quarterlyPlan` note). It was never
  shown to anyone, so it has never been tested.
- **The Debug $9 one-time pack:** parked 11-23 (decisions log; PR #253 is a
  draft). Its checkout and refund pattern for `mode: 'payment'` is reusable
  here (§6).

## 2. Hypothesis

> **H1.** For a new visitor in the default price region, a one-time
> 60-day Interview Pass at $59 in the monthly card's place earns **more net
> revenue per eligible visitor** in 45 days than today's monthly card. The
> annual card, India and every past payer stay unchanged.

The mechanism, in one sentence: the buyer's need has an end date. A
payment with an end date and nothing to cancel matches that need better
than a subscription they expect to cancel.

**H2 (later, separate): India.** A one-time on-session payment avoids the
e-mandate that kills Indian renewals and day-7 charges. It is not tested
here (§10).

## 3. The one price and duration to test: **$59 for 60 days**

The comparison below uses what a monthly buyer actually pays: **$29**,
because 0 of 5 renewed.

| Candidate | $/day | vs 2 × monthly ($58) | Would-be monthly buyers it can lose and still break even¹ | Problem |
|---|---|---|---|---|
| $49 / 60 d | 0.82 | $9 cheaper | 41% | It is a discount, so a win would not say whether the *shape* or the *price* did it. The thinnest margin against cannibalisation. |
| **$59 / 60 d** | **0.98** | **the same (+$1)** | **51%** | — |
| $79 / 90 d | 0.88 | cheaper per day | 63% | It sits $20 under annual, so it pulls annual buyers (63% of revenue). 90 days is the quarterly shape that sold nothing. |
| $59 / 90 d | 0.66 | a clear discount | 51% | A discount again, and the old quarterly length. |

¹ Revenue break-even if each would-be monthly buyer either buys the pass
or leaves: `price × (1 − r) = 29`, so `r = 1 − 29/price`.

**Why $59 / 60 days:**
1. **It tests the shape, not a discount.** At $0.98 a day it costs the same
   per day as monthly ($0.97). If it wins, it won on "one payment, an end
   date, nothing to cancel", not on price. That is the hypothesis.
2. **Annual stays clearly the better deal.** $99 buys six times the days.
   Someone who wants a year has every reason to keep choosing annual. This
   protects the 63% line.
3. **It has margin against cannibalisation.** It can lose half of the
   people who would have bought monthly and still match today's revenue.
   Even if the pass took monthly and annual buyers in today's 7 : 3 mix,
   they would have paid $50 each on average (0.7 × 29 + 0.3 × 99), below $59.
4. **60 days fits the job.** Buyers come with an interview date. Two months
   covers a screen and the rounds after it. We have **no measured
   distribution** of how far away the interview is: two date-holders on
   09-24, more since the intake. At launch, read `prepTarget` days-out for
   the eligible people and write it in the ledger claim. If most dates are
   under 30 days, say so; the duration then becomes the next question, not
   this test's.
5. **It is inside the founder's $49–79 range,** with no "save X%" to keep
   honest. Two monthly payments are $58, so the pass is never cheaper than
   monthly, and the copy never says it is (§7).

## 4. The arms: the pass **replaces the monthly card**, and monthly stays as a link

- **Control:** today's modal, unchanged. Monthly and annual cards, the trial
  wherever `trialOffered` allows it, and today's order and highlight.
- **Treatment (`pass`):** the pass card takes the **monthly card's slot**:
  "Interview Pass · $59 · 60 days of Pro · one payment, never renews". The
  annual card is unchanged, trial included. Under the cards, one text link
  keeps monthly reachable: "Prefer to pay monthly? $29/month", built from
  `planPrices`, with its trial if offered.

Why this and not adding the pass as a third card:
1. **The question is whether the pass beats monthly,** for the 78% of
   clickers who choose monthly today. Putting it in monthly's place asks
   exactly that. A third card asks "does more choice help?", which is a
   different question. Our own history says no: the quarterly third card
   sold nothing, and annual emphasis on its own missed (ledger, "the price
   story").
2. **Annual is held constant.** Its card, its trial and its place are the
   same in both arms, so any loss on the annual line is cannibalisation we
   can measure, not a layout change.
3. **Monthly stays one tap away.** The homepage, the company pages and the
   pricing section all say "$29/month" in both arms. Removing monthly
   outright would make that line false for half of the visitors. The link
   keeps every advertised price buyable, which is also the same pattern
   M-08 uses.
4. **Reverting is one branch.** Turn the flag off, and the modal is
   byte-for-byte today's.

The cost of this choice, said plainly: the pass has no trial. A person who
would have started the monthly trial now sees the trial only on annual or
behind the link. The primary metric counts that loss, because it is per
eligible visitor and not per buyer.

## 5. Who is eligible, and how the arm is assigned

**Eligible (the denominator):**
- **A new visitor:** the browser's first app open falls inside the
  enrolment window. Use the holdout's rule (#384): a browser that holds any
  `sqlquest_*` key outside `PRE_APP_KEYS` is `returning` and is not
  enrolled. A signed-in account created before the window gets the control
  cards and is not enrolled.
- **Never a past payer or a past trialist.** The app does not enrol a
  record that has `proType` or `stripeCustomerId`. The server refuses the
  pass to a username with any `stripe_webhook` `pro_purchase_completed` or
  `pro_trial_started` row (the same lookup as `trialAlreadyUsed`), answering
  `pass_not_eligible`. The client then shows the control cards, never a
  Payment Link.
- **Not Pro now** (`mayBeOffered` in pro-access.js).
- **Default price region at the modal.** A visitor priced for India sees
  the India control cards in both arms and is left out of the read (H2).
- Internal accounts and bots are removed at the read (metric filters).

**Assignment:**
- **When:** at the first app open (enrolment), before any price is seen.
  This keeps the denominator independent of the treatment.
- **The hash:** `interviewPassArm(aid)` is FNV-1a over
  `'interview_pass_v1:' + aid`, then **the murmur3 `fmix32` finalizer**,
  then `% 2` → `pass` | `control`. Without the finalizer, every two-arm FNV
  test lands in the exact opposite arm of every other one (CLAUDE.md, the
  A/B hash trap).
- **Independence:** a test asserts independence from every live or queued
  arm: first-screen, CTA, company-ask, company-direct, quota-wall-inline,
  modal-layout / `modalPlansFirst`, run/submit, mobile-run-bar,
  mobile-one-layer, `freeQuotaHoldout`.
- **Stickiness:** the stored record `sqlquest_interview_pass_v1` always
  wins, so nobody is re-armed. The first arm is copied to `userData.ipArm`
  on sign-in. An account that already carries an arm imposes it on a new
  browser, so one person never sees both modals.
- **Events:** `interview_pass_arm_assigned {testId, arm, status,
  firstOpenAt}` fires once per browser. `ipArm` is stamped on every
  `pro_events` row from an enrolled browser, as `fqArm` is.
- **The cell:** this test owns the **plan cards → payment** cell, on all
  devices, **exclusively**. No other plan-card, price or trial test runs
  during enrolment: M-08 annual default, M-03 India one-time, M-09
  card-free trial and `modalPlansFirst` are all excluded. Tests on other
  steps (first run, after a solve) may run, and the read is split 2×2
  where they meet the same person (decisions log, 11-24 cell rule).

## 6. What it takes to build (a list, not a build)

The code PR ships **dark** behind `interviewPassTest`, which stays off until
the founder's written go on the price. It is money-path work (rule 6d), so
it needs a review and never auto-merges.

**Client (pure halves first, each with a test):**
1. `src/utils/interview-pass.js`: the constants `PASS = { plan: 'pass_60d',
   days: 60 }`, `interviewPassArm`, `passEligible`, the enrolment window,
   and the card copy. **The plan type is `pass_60d`, never
   `interview_pass`**, because that string is already an achievement id
   (`src/data/config.js`, "Hired!") and would collide in event filters.
2. `src/utils/regional-price.js`: `PRICE_TABLE.default.pass_60d = 59`, for
   the default region only. `planPrices` returns `pass` / `passDays`.
   `tests/checkout-surface.test.js` binds the shown $59 to the table.
3. `src/utils/checkout-session.js`: `CHECKOUT_PLANS` gains `pass_60d`.
   `wantsTrial` must return false for it (today it is true for any plan in
   `CHECKOUT_PLANS`, so this needs an explicit exclusion).
   `buildCheckoutSessionBody` forces `region: 'default'` for the pass.
4. `src/utils/pro-access.js`: `pass_60d` joins `NON_RENEWING`. Nothing
   renews it, so there is no webhook-lag grace, the same as a trial.
   `planLabel` gives "Pro · Interview Pass — N days left". `planRenews`
   returns false.
5. `src/app.jsx` Pro modal:
   - in the `pass` arm, the pass card goes in the monthly slot and the
     monthly link sits under the cards;
   - `pro_modal_shown.planSet` is `monthly_annual` or `pass_annual`;
   - `pro_plan_clicked.plan` is `pass_60d` and `via` is `card` or
     `monthly_link`;
   - `CHECKOUT_LINKS.default.pass_60d` is the fallback Payment Link;
   - the account screen says "Ends <date>", never "Renews", and has no
     "Manage subscription" button for a pass;
   - the post-expiry modal for an expired pass offers the pass again or
     annual, and never says "your trial ended";
   - one in-app line on day 53: "Your pass ends in 7 days". No email
     without the founder's go.
   - `?plan=monthly` deep links (homepage pricing cards) still open the
     modal. In the `pass` arm, the person reaches monthly through the link.
6. Enrolment: the holdout's shape at module load (#384 `freeQuotaArm`). The
   enrolment code may be shared, with its own key and its own salt.

**Edge functions (the founder deploys):**

7. `create-checkout-session`:
   - `PLANS` gains `pass_60d`, priced from `STRIPE_PRICE_PASS_60D`;
   - for the pass: `mode: 'payment'`, no `subscription_data`, no trial;
   - **`customer_creation: 'always'`**. A payment-mode session makes no
     Customer by default. The webhook would then write `stripeCustomerId =
     null`, and a later `charge.refunded` could not find the person, so a
     refund would not revoke access;
   - `payment_intent_data.metadata = { username, plan: 'pass_60d', ip_arm }`,
     the #253 pattern, so a refund is recognised by its PaymentIntent;
   - `region` forced to `default`, and `pass_not_eligible` for a past payer;
   - `after_expiration.recovery` as today. `pro_checkout_started {plan}` is
     unchanged.
8. `stripe-webhook`:
   - `PLAN_DAYS.pass_60d = 60` and `ONE_TIME_PLANS` gains `pass_60d`, so
     `proAutoRenew` is false;
   - map the price and product by id (`STRIPE_PRICE_PASS_60D`,
     `STRIPE_PRODUCT_PASS_60D`), and also by `session.metadata.plan`;
   - **the amount fallback must never see the pass.** $59 is ≥ $49, so an
     unmapped pass today becomes `quarterly`: 90 days with auto-renew on.
     That is the 09-07 auto-renew incident's shape. For a `mode: 'payment'`
     session with an unmapped price, grant nothing, log
     `pro_purchase_unmapped`, and answer non-2xx so Stripe redelivers after
     the secret is fixed;
   - set the expiry to `max(now, current expiry) + 60 days`;
   - `pro_purchase_completed {plan_type: 'pass_60d', amount_cents, one_time:
     true, ip_arm}`;
   - store `proPassPaymentIntent`. On `charge.refunded` with no invoice,
     match by PaymentIntent (#253); a full refund revokes;
   - `pro_refunded` gains `plan_type`, and **`pro_renewal_completed` gains
     `amount_cents`** (missing today; the metric needs it for the control
     arm).
9. `checkout-abandon`: the pass's expired session gets the recovery link.
   The copy must say "pass", never "subscription" or "trial".
10. `lapsed-pro` (unscheduled): exclude `proType = 'pass_60d'`, because its
    copy says "trial ended". No other sender changes.

**Pages:**

11. `src/refund.html` gains a pass section stating the usage-based rule
    in §7a word for word. It ships with the flip, not before.
11a. **Refund request flow (semi-automatic, §7a):** an "Ask for a refund"
    button on the account page for a pass holder → a server function reads
    the pass's purchase time and usage (Pro solves, finished mocks, tutor
    calls over the free daily cap) and classifies the request:
    `eligible` → the founder gets a one-click approval with the usage
    summary (the refund itself is issued in Stripe by the founder or by
    that approval; no code issues money on its own); `not_eligible` → the
    person gets the reason politely, the founder gets a copy and may make
    an exception. Events `refund_requested {eligible, reason, hoursSince,
    proSolves, mocksFinished}` — never the amount or card. Full automatic
    refunds only if pass sales pass 20–30 a month (founder decision then).

**Tests, each proven by a deliberate break (rule):**

12. `tests/interview-pass.test.js` covers:
   - arm independence (break: remove the finalizer);
   - a stored record wins;
   - a past payer is never enrolled;
   - IN gets control;
   - `wantsTrial` is false for the pass;
   - webhook source guards: `pass_60d` is in `ONE_TIME_PLANS` and in
     `PLAN_DAYS` = 60, and the payment-mode amount fallback grants nothing
     (break: delete the guard and watch `quarterly` come back);
   - `customer_creation: 'always'` is set on the pass session;
   - `pro-access`: a pass gets no grace;
   - the copy guards in §7.

**Docs and ledger (in the code PR):**

13. A ledger claim "the Interview Pass" (metric `interview_pass_test`, the
    §8 baseline/target/falsification, read date). Flag-queue row. A
    decision row at the flip.

## 7. Copy rules

The pass card, word for word except the price, which comes from
`PRICE_TABLE`:

> **Interview Pass** · **$59** · 60 days of Pro · One payment — never
> renews, nothing to cancel · Full refund within 7 days if you haven't
> used Pro yet (under 10 Pro solves, no finished mock)

After purchase: "Pro · Interview Pass — ends 8 Mar 2027" (a date, not a
renewal).

**Never** on the card, the modal, the Stripe product, an email or a page:
- **"Unlimited"** (the tutor caps Pro at 50/75/100 calls a day;
  `tests/tutor-limit-claims.test.js`).
- **"Save", a percentage, "best value", or "cheaper than monthly".** $59 is
  more than two monthly payments ($58), and annual is the better value per
  day.
- **"Lifetime"**, or **"trial"** on the pass.
- **"Pass your interview", "guaranteed"**, or any claim about how often
  something is asked (seo-consistency rule).
- A countdown, scarcity or urgency.
- A number not read from `PRICE_TABLE` / `planPrices`.

The **Stripe product** is "SQL Quest Pro — 60-day Interview Pass". The name
carries no percentage, because that is what went stale on "Annual (Save
57%)". The description mirrors the card. The statement descriptor stays
SQLQUEST.APP.

**Turkish** copy carries the same facts and nothing more.


## 7a. Refund rule (founder's go, chat 2026-11-25: "uygulayabilirsin")

Subscriptions keep today's rule (7 days, unconditional): 1 refund and 0
disputes ever, no abuse seen. The pass gets a usage-based rule, because
interview prep is short: buy, prepare for a few days, ask for the money
back.

"Used" = any of: ≥ 10 Pro solves since purchase · ≥ 1 finished timed
mock · tutor calls above the free daily cap.

| When | Not used | Used |
|---|---|---|
| First 48 h | full refund | no refund (founder may give a partial one) |
| Day 3–7 | full refund | no refund |
| After day 7 | no refund | no refund |

Conditions that make it hold:
1. **Shown before payment.** The card line in §7 and the Stripe checkout's
   custom text state the rule; an unannounced rule loses disputes.
2. **EU buyers:** a required checkbox at checkout — "Start my access now; I
   understand I lose the 14-day right of withdrawal once I use it" (digital
   content waiver). Without it an EU buyer may withdraw within 14 days.
3. **Disputes:** on a card dispute, submit the usage log (solves, mocks,
   timestamps) and the accepted terms as evidence. A generous first 48 h
   is cheaper than disputes ($15 fee each plus account risk).

## 8. Metric, sample size, duration and stopping rules

**Primary metric: net revenue per eligible visitor (NRPV)** over a 45-day
horizon from each person's enrolment. It is net of full and partial
refunds and of disputes plus the $15 fee. Stripe fees are left out in both
arms. Payers are joined by username, and `stripe_webhook` is the only money
truth. Full definition and SQL: `interview_pass_test` in metrics.md.

**Secondary metrics:**
- payment conversion, by plan and path;
- refund rate and days to refund;
- usage in days 1–30 and 31–60 after purchase;
- support load (verbatims);
- the Stripe page (started → paid, expired, 3DS failures) by plan;
- arm balance;
- re-purchase after a pass expires (day 120).

**The honest sample-size arithmetic.** About 2 payments a month (brief).
The default region, with India left out, is somewhat fewer.
- 12 weeks of enrolment gives about **5–6 payers in total, so about 3 per
  arm**.
- Power is set by the **number of payers**, not visitors. For a Poisson
  rate ratio at 80% power and 5% two-sided, the required effect is
  `ln RR ≥ 2.80 · √(1/μ₀ + 1/(RR·μ₀))`, where μ₀ is the control arm's
  expected payers.

| Control-arm payers in the window (μ₀) | Minimum detectable payer-count ratio |
|---|---|
| 2.5 (≈ 2 payments/month, 12 weeks) | **≈ 6.7×** |
| 5 (≈ 4/month, the O2 checkpoint pace) | ≈ 4.1× |
| 10 | ≈ 2.8× |
| 80 | ≈ 1.5× |

- **NRPV is noisier still**, because each payer brings $29, $59 or $99.
- At the baseline, conversion per eligible visitor is ~0.2–0.3% and NRPV
  is ≈ $0.10 (2 payers × ~$41 over ~750 default-region new people a
  month). Doubling conversion with classical power would take **~7,800
  eligible people per arm**, which is more than a year of today's traffic.
- **No 8–12 week test can prove a realistic effect at this volume.** What
  it *can* do is catch the pass being clearly worse, and show a direction
  next to the customer interviews (A03).
- Re-estimate the flow at launch from the holdout's
  `free_quota_arm_assigned` rows, which count new visitors exactly. Write
  it into the ledger claim.

**Duration:**
- Enrolment is a **fixed 12 weeks** from the flip. If the founder's go
  comes in time, that is about **2027-01-07 → 04-01**.
- The read is on the **last enrollee + 45 days (≈ 2027-05-16)**, plus the
  day-120 descriptive read.
- At the investor review on 02-23 the test has ~7 weeks enrolled. It reports
  counts and balance only, labelled "not a result".
- No early winner. Stopping at week 8 because it "looks good" is peeking.

**Safety stops (any time; these are the only early reads):**
- **S1:** the pass arm has 0 payers while control has ≥ 5 (one-sided
  p ≈ 0.03) → revert.
- **S2:** annual buyers in the pass arm are 0 while control has ≥ 4 →
  revert (cannibalisation).
- **S3:** ≥ 3 full pass refunds that are also ≥ 30% of pass sales → pause
  and read the reasons.
- **S4:** one pass dispute → the founder reads it the same day. Two → stop.
- **S5:** any access bug → stop the same day and fix. That means a pass
  holder with `proAutoRenew` true, `proType` `quarterly`, the wrong number
  of days, no grant within 10 minutes, or a refund that does not revoke.
- **S6:** arm balance outside 45–55% on day 2 → stop. It is a bug.
- **S7:** the free tier, a price, the modal cards or the trial change during
  enrolment → the test restarts. The two periods are read separately and
  never pooled.

**The verdict at the read (pre-written; the same text is in metrics.md):**
- **ADOPT** only if all four hold:
  - NRPV_pass ≥ 1.2 × NRPV_control;
  - payers_pass ≥ payers_control − 1;
  - pass full refunds ≤ 20%;
  - annual buyers in the pass arm ≥ control − 1.
- **REVERT** if any one holds:
  - NRPV_pass ≤ 0.8 × control;
  - payers_pass ≤ control − 3;
  - annual buyers in the pass arm ≤ control − 2;
  - pass refunds > 30% (with ≥ 3 passes sold).
- **INCONCLUSIVE** otherwise. Extend enrolment once, by 8 weeks, under the
  same rules, and do one combined read. If it is still inconclusive,
  **today's plans stay**. The pass's revenue is one-time, not MRR, so it
  has to earn the change.
- Also report a bootstrap P(NRPV_pass > NRPV_control) as a number, never as
  a gate.

## 9. Stripe setup the founder does (dashboard; nothing done by an agent)

1. **Product** "SQL Quest Pro — 60-day Interview Pass". The description
   mirrors §7. There is no percentage in the name or the description. Use
   the same tax code as the existing products.
2. **A one-time Price** of USD 59.00, lookup key `sqlquest_pass_60d`. It is
   not recurring. It is not the default price of any other product.
3. **A fallback Payment Link** for that price:
   - redirect to `/app/?payment=success`;
   - **"Create customers" set to always**;
   - promotion codes on, as on the live links (both arms keep the same
     promo rules);
   - no trial.

   The URL is not written into the repo (a public repo; see the India
   links' note).
4. **Supabase function secrets:** `STRIPE_PRICE_PASS_60D` and
   `STRIPE_PRODUCT_PASS_60D`.
5. **The webhook endpoint:** confirm it still lists
   `checkout.session.completed`, `checkout.session.expired` and
   `charge.refunded`. Add `charge.dispute.created` so disputes are counted
   by the webhook, not by hand (optional; it needs a small webhook branch).
6. **Settings → Customer emails → Successful payments** must be on. A
   one-time payment's receipt comes from that setting, not from an invoice.
7. **Refund policy:** decide the pass's rule (§11). `src/refund.html` is
   updated at the flip.
8. **Verify before the flip, as the CLAUDE.md rule says** ("open a real
   session and read the page after any price change"):
   - **Test mode first.** Run a pass session through to the grant, check
     `proExpiry` is now + 60 and `proAutoRenew` is false, then fully refund
     and check that access is revoked.
   - **Then one live $59 purchase and a full refund** on the founder's own
     account. This costs about $2 in Stripe fees.

## 10. India (H2, later; not in this test)

**Re-read of Stripe's India page, 2026-11-25:**
- RBI's rules apply to "any off-session, merchant-initiated transaction".
- An off-session payment without a mandate "will be declined".
- Off-session charges also need a 24-hour pre-debit notice.
- "The on-session PaymentIntent for an initial payment never enters the
  `processing` state".
- A **one-time on-session payment needs no e-mandate**, only the usual
  authentication (3D Secure).
- Two more facts that explain what we saw:
  - for a non-INR subscription, a mandate is registered only if an India
    card is attached when the subscription is created;
  - Stripe does not support e-mandates on bare PaymentIntents or
    SetupIntents.

So our USD trial-then-charge path is the worst case for an Indian card.

**H2:** for `priceRegion = 'IN'`, a one-time pass beats the $9 / $39
subscription on net payers. It runs after H1 reads, as its own test with
its own metric. It must be **reconciled with M-03** (ideas doc: "12 months
of Pro — $39, one payment") into **one** India one-time design. It must not
run beside M-03 as a second India offer. 3D Secure failures on the initial
payment are its main risk (`pro_payment_failed {at_checkout}`).

## 11. Risks

| Risk | What would show it | Guard |
|---|---|---|
| **The pass takes annual buyers** (annual = 63% of revenue) | annual buyers fall in the pass arm | annual's card, trial and place unchanged; $59/60 d is worse per day than annual; S2 and the ADOPT/REVERT annual rules |
| **Refunds:** buy, cram for a week, refund (7 days is 12% of the 60) | pass full-refund rate; days to refund | S3; the founder may choose the lifetime rule instead ("< 10 solves") |
| **Cards that fail 3D Secure on the one payment** | `pro_checkout_expired` and `pro_payment_failed {at_checkout}` by plan | read by plan. A payment-mode failure writes no `invoice.payment_failed`, so add `payment_intent.payment_failed` to the endpoint if 3DS becomes the question |
| **No trial on the pass,** so would-be triallers leave | monthly-link clicks; Stripe started → paid by plan | the metric is per eligible visitor, so this loss is counted |
| **Access bugs:** the 09-07 auto-renew class, or the amount fallback selling 90 days with auto-renew | `plan_type = 'quarterly'` on a $59 row; `proAutoRenew` true on a pass | §6 items 7–8; S5; webhook source guards |
| **One-time revenue presented as MRR** | the investor deck | report pass revenue as one-time, never in MRR; the day-120 re-purchase read says how much repeats |
| **The test is too small to decide** | INCONCLUSIVE | said in advance (§8); one extension, then the status quo |
| **Confounds:** January hiring season, the quota decision, the static pages still showing $29 | — | the same in both arms; S7 for any mid-test change; start only after the quota decision |
| **The name "Interview Pass" reads as a promise** | support or feedback verbatims | no "pass your interview" copy (§7) |

## 12. Founder decisions needed

1. **The price and duration, in writing:** $59 for 60 days, as recommended.
   Any other choice re-runs the §3 table before build.
2. **The arm shape:** the pass replaces the monthly card, with monthly kept
   as a link (recommended), or the pass as a third card.
3. **The pass's refund rule:** 7 days full, like monthly (recommended), or
   the lifetime-style "14 days and fewer than 10 solves".
4. **If revenue and payers disagree,** which wins? This plan: NRPV is
   primary, and payers are a non-inferiority guard (−1 to adopt, −3 to
   revert). O2 counts payers, so the founder may want them reversed.
5. **The freeze:** no other price, plan-card, trial or free-tier change for
   12 weeks plus the read. That holds M-08, M-03 and M-09.
6. **The order:** the quota decision after 12-31 → M-01 (the self-serve
   card fix) live → the code PR merged dark → the Stripe setup (§9) → two
   deploys (`create-checkout-session`, `stripe-webhook`) → the verification
   purchase and refund → the flip.
7. **H2 (India)** waits for H1's read and is merged with M-03.

## 13. Timeline

| Date | Step | Who |
|---|---|---|
| 2026-11-25 | this design + metric | orchestrator |
| by 12-10 | founder reads it; decisions 1–5 | founder |
| Dec | code PR, dark, money-path review | fleet + A1 |
| 12-31 | holdout read → quota decision | B1 / founder |
| early Jan | Stripe objects, secrets, deploys, verification purchase/refund | founder |
| ≈ 01-07 | flip (decision row; start of enrolment) | founder's go |
| 01-09 | balance check (S6) | orchestrator |
| 02-23 | investor review: counts only, "not a result" | — |
| ≈ 04-01 | enrolment ends | — |
| ≈ 05-16 | the read (§8 verdict) | B2 |
| ≈ 07-30 | day-120 re-purchase read | B2 |
