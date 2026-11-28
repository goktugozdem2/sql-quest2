# Niche sector SQL question shapes — dated public reports (read 2026-11-23)

**Asked by:** the founder, 2026-11-23: "yeni mülakat soruları bul: banka, tech,
finance, retail vs. sektörlerin niş, bulması zor sorularını araştır, bul, bizim
sisteme ekle".
**Run:** fleet R1 + content, one laptop session. Open web only, no production
data in the same run (fleet README rule 7b).
**Result:** 31 sources opened and read; 12 shapes the bank did not cover became
challenges 343–354 (`tests/challenges-343-354.test.js`).

## How to read this file

- Every source below was **opened**, not read from a search snippet. The date
  is the one the page shows. "Read" is 2026-11-23 for all of them.
- **Dating caveat.** Most usable pages are on PracHub, which aggregates
  user-submitted questions. Its *interview-experience* pages carry an
  interview month and a publish date and are first-person (the site says it
  edited them). Its *interview-question* pages carry a company, role and
  round tag, but many show only "last updated 2026-03-29", which looks like a
  site-wide refresh, not a report date. Those are marked **(weak date)** and
  never carry a company claim onto a page on their own.
- Shapes are paraphrased in our own words. No question text is copied.
- No frequency claim anywhere: a count here is the number of reports read,
  never how often anything is asked.
- **Refused, not retried** (R1 rule: a refusal is final for the run):
  Glassdoor (403, every page), 1point3acres (403), Blind (402), LeetCode
  Discuss (403), dataford.io (429), one Medium post (403). These are the
  richest candidate forums; a hand read is listed under FOUNDER.
- **Excluded after opening:** pages that say their problems are AI-generated
  or the site's own invention (a Synchrony 30+ DPD item on lockedinai.com; a
  PayPal DAU/MAU item on codemia.io that does not say a candidate reported it).

## Sources

### Banking, cards, payments, fintech

| # | Source | Date shown | Company named | Shape (paraphrased) | Niche concept |
|---|---|---|---|---|---|
| B1 | prachub.com/interview-questions/write-sql-to-monitor-weekly-chargeback-spikes | updated 2026-03-29 (weak date) | Stripe (DS onsite) | Weekly GMV and chargeback rate by country and industry, chargebacks counted against payments made 7–14 days earlier (joined on the payment id), then the week-over-week change | **chargeback attributed to the payment's period, not the filing's** |
| B2 | prachub.com/interview-experiences/robinhood-intern-data-scientist-interview-experience-four-sql-and-two-python-questions-in-45-minutes | interview 2026-10, published 2026-11-12 | Robinhood (intern DS) | Each user's largest transfer per bank, summed by bank name; follow-up ranks by inflow and outflow | **two-stage aggregation over funding transfers** |
| B3 | prachub.com/interview-experiences/coinbase-senior-data-scientist-interview-experience-sql-a-b-test-design-and-a-btc-volatility-case | interview 2025-03, published 2026-08-25 | Coinbase (Senior DS) | Share of users with 3+ trades in the last 30 days; 7-day retention and what "retained" means | active-user share at a fintech |
| B4 | prachub.com/interview-experiences/coinbase-data-scientist-interview-experience-case-study-sql-and-a-live-python-eda-round | interview 2025-10, published 2026-08-25 | Coinbase (DS) | Time from adoption to first transaction; transactions outside the region of the first one | time between funnel steps |
| B5 | prachub.com/interview-experiences/chime-data-scientist-interview-experience-a-schema-less-sql-retention-question-in-the-hm-screen (+ linked question page, weak date) | interview 2025-11, published 2026-08-25 | Chime (DS) | Early engagement (distinct transaction days in the first week, bucketed 0/1/2/3+) against later retention, only users old enough for the full window, users with no transactions kept | **early-habit buckets vs retention, with cohort maturity** |
| B6 | prachub.com/interview-experiences/chime-data-scientist-interview-experience-sql-and-a-business-case-in-one-technical-screen | interview 2025-10, published 2026-08-25 | Chime (DS) | Transaction time series building from CTEs to DENSE_RANK, LAG, rolling SUM; no business question given | generic |
| B7 | prachub.com/interview-experiences/revolut-data-analyst-interview-experience-a-brutal-four-question-sql-round (near-duplicate published 2026-08-24, counted once) | interview 2026-02, published 2026-08-25 | Revolut (DA) | Completed spend in a category in the first 7 days after account opening above a threshold; top click-through product; a plan's success metric; suspicious-activity rules | spend inside a window after opening |
| B8 | prachub.com/interview-questions/funnel-sql-cohort-signup-rate-campaign-kyc-submit-rates-and-monthly-visitor-growth | posted 2026-08-15 | Airwallex (DS) | Signup rate and KYC-submit rate by campaign and cohort; recent cohorts have had less time to submit KYC | **signup → KYC funnel, cohort maturity** |
| B9 | prachub.com/interview-questions/reconcile-monthly-bank-account-balances-across-two-datasets and …/find-the-latest-balance-for-a-bank-account | posted 2026-08-31 | Stripe (SWE) | Compare an account's balance across two imports for a month (missing record vs zero balance); latest balance per account | **balance as of a date** |
| B10 | prachub.com/interview-questions/build-sql-pivot-with-lookups-and-currency-conversion | updated 2026-07-04 | none | Convert each transaction at the latest FX rate on or before its date; flag missing rates | FX at the transaction-date rate |
| B11 | prachub.com/interview-guide/wise-data-scientist-interview-questions-guide-2026 | updated 2026-09-24 | Wise (guide, candidate reports + editorial) | Settled volume low on one day: authorisation vs settlement columns, settlement lag vs real loss | authorisation vs settlement (diagnosis, not a query) |
| B12 | prachub.com/interview-questions/write-sql-for-rolling-default-rates | updated 2026-03-29 (weak date) | Wells Fargo (DS) | Rolling 12-month default rate per segment as a ratio of window sums, not an average of monthly rates | **a portfolio rate is a ratio of sums** |
| B13 | prachub.com/interview-questions/investigate-rising-loan-delinquency-with-stable-approval-rates | posted 2026-09-23 | Affirm (DA) | Why 30-days-past-due rises with flat approvals (mix vs drift); not SQL | delinquency (30 DPD) |
| B14 | prachub.com/interview-guide/a-global-insurer-data-scientist-interview-questions-guide-2026 | updated 2026-09-24 | unnamed insurer | Loss ratio per accident quarter at exactly 12 months of development; immature quarters kept as NULL | **insurance loss ratio, claims development** |
| B15 | prachub.com/coding-questions/calculate-ultimate-loss-by-policy-term | updated 2026-05-07 | Plymouth Rock Assurance (DS) | Reverse cumulative loss over later policy terms | insurance (weak) |
| B16 | prachub.com/interview-questions/write-sql-to-flag-suspect-payments-and-chargebacks | updated 2026-03-29 (weak date) | Roblox (DS) | Per-user 7-day suspect-payment counts and any chargeback in 60 days | fraud rules |

### Retail and e-commerce

| # | Source | Date shown | Company named | Shape (paraphrased) | Niche concept |
|---|---|---|---|---|---|
| R1 | prachub.com/coding-questions/write-sql-to-verify-quarterly-sales-decline | updated 2026-03-29 (weak date) | Fetch Rewards (DS) | Is a quarter's decline real: totals and % change vs prior quarter and same quarter last year, revenue for stores open across both periods only, a flag when revenue and units both fell more than 5% | **same-store (like-for-like) growth; revenue vs units** |
| R2 | prachub.com/interview-questions/debug-row-loss-after-sql-joins | posted 2025-12-15 | Home Depot (DA) | Fix a promotion join that loses rows: store-specific and national (NULL store) promotions must both match | promotion / markdown join with a NULL key |
| R3 | prachub.com/interview-questions/count-customers-buying-both-kindle-and-alexa | updated 2026-03-29 (weak date) | Amazon (BIE) | Distinct customers who bought both of two products | bought X and Y |
| R4 | prachub.com/interview-questions/find-most-copurchased-product-pairs-in-sql | updated 2026-06-05 | Google (DS) | Top unordered product pairs bought together, deduped per order, smaller id first | **basket pairs** |
| R5 | prachub.com/interview-experiences/walmart-principal-data-analyst-interview-experience-five-rounds-sql-live-coding-to-a-senior-director-case-study | interview 2026-04, published 2026-08-25 | Walmart (Principal DA) | Revenue by its business definition; new customers as first activity inside a period; current vs prior rolling period | **new vs returning customers** |
| R6 | prachub.com/interview-experiences/amazon-business-intelligence-engineer-interview-experience-sql-interrupted-and-a-shortened-phone-screen | interview 2026-09, published 2026-09-28 | Amazon (BIE) | Departments where most staff beat targets but sales growth trails the company, year over year | growth vs a benchmark |
| R7 | datalemur.com/blog/amazon-sql-interview-questions | updated 2025-04-11 | Amazon (the page says a DA candidate was asked it) | Average stars per product per month | reviews (no purchase join) |

### Product analytics and big tech

| # | Source | Date shown | Company named | Shape (paraphrased) | Niche concept |
|---|---|---|---|---|---|
| P1 | prachub.com/interview-questions/detect-sessions-and-gaps-using-sql-lead | updated 2026-07-23 | Apple (DS) | Sessions split on a 30-minute gap, exactly 30 stays in the session | sessionisation |
| P2 | prachub.com/interview-questions/analyze-shopping-funnel-with-joins-and-windows | updated 2026-06-19 | TikTok (DS) | View → cart → checkout → purchase, a step counts only after the previous one, 24 h and 7-day windows | time-ordered funnel |
| P3 | prachub.com/interview-questions/compute-daily-net-users-from-event-logs | updated 2026-03-29 (weak date) | Tubi (DS) | New / retained / churned devices day over day, and the net | **growth accounting** |
| P4 | datalemur.com/questions/reactivated-users | updated 2023-08-04 | Facebook (DataLemur's attribution) | Users inactive last month and active this month | **resurrected users** |
| P5 | prachub.com/interview-questions/sql-zero-filled-dau-rolling-30-day-mau-and-the-mau-impact-of-a-user-id-rehash | posted 2026-09-30 | Glean (DS) | DAU with zero-filled days, rolling 30-day MAU, DAU/MAU, effect of an ID rehash | **DAU/MAU with a date spine** |
| P6 | prachub.com/interview-experiences/mixpanel-data-scientist-interview-experience-four-retention-sql-questions-in-a-45-minute-screen | interview 2026-09, published 2026-09-28 | Mixpanel (DS) | Day-7 retention; first-week retention by signup-week cohort with non-returners kept; split by plan | cohort retention |
| P7 | prachub.com/interview-questions/turn-a-vague-retention-request-into-a-metric-and-sql-at-a-home-sharing-marketplace | posted 2026-08-01 | Airbnb (DS) | Define retention precisely (cohort, event, window, incomplete cohorts), then query it | **incomplete cohorts** |
| P8 | prachub.com/interview-questions/compute-percent-of-active-users-with-50plus-calls | updated 2026-03-29 (weak date) | Meta (DS) | Among one country's actives, share with 50+ calls in the prior 7 days | per-user threshold in a trailing window |
| P9 | prachub.com/interview-questions/write-sql-for-retention-conversion-and-churn | updated 2026-03-29 (weak date) | Meta (DS) | Conversion on users' local dates with a date spine, week-over-week drop flag, churn | rolling conversion |

## Already covered by the bank — dropped

Checked by concept against `challenges.js` and `sector-challenges.js` on
2026-11-23 (titles, descriptions and solutions).

| Shape | Covered by |
|---|---|
| Sessionisation by an inactivity gap (P1) | #9 Order Sessionization by Customer |
| Cohort retention (P6) | #88 Customer Retention Cohort, #303 Signup Cohort Activation |
| Order funnel (P2, in part) | #82 Order Funnel Conversion |
| Chargeback rate per merchant (B1, the merchant cut) | #280 |
| Customers who bought in every / both categories (R3) | #77 Customers with Orders in ALL Categories |
| Daily and monthly actives (P8, B3 in part) | #60 Daily Active Customers, #301 Monthly Active Users, #121, #157 |
| Spend inside a window after signup (B7) | #311 Referred vs Organic: First-Month Spend, #303 |
| Suspect-payment rules (B16) | #270–#273 fraud track |
| Rolling sums, LAG series (B6) | #283, #294, #50, #173 and others |

## Uncovered but not built this run

| Shape | Why not now |
|---|---|
| FX conversion at the latest rate on or before the date (B10) | no dated FX-rate table in any dataset (`currencies` has one static rate) |
| Insurance loss ratio at a fixed development age (B14) | no insurance data; would need a new dataset |
| Promotion join with a NULL "national" store (R2) | no promotions table |
| Days-past-due buckets, roll rates, vintage curves (B13) | no loan-level data, and the only report is not a SQL question |
| Settlement lag, authorisation vs capture (B11) | a diagnosis prompt, and no settlement columns in our ledgers |
| Department growth vs company benchmark (R6) | no sales/targets tables |

These are candidates for B3 if a small dataset is ever added.

## The twelve built (2026-11-23)

| id | Sector | Concept | Dataset | Level | Modelled on |
|---|---|---|---|---|---|
| 343 | retail | revenue vs units: a real decline needs both down more than 5% | ecommerce | Medium | R1 (Fetch Rewards) |
| 344 | retail / fintech | new vs returning spenders, first month over the whole ledger | finans_neobank | Medium | R5 (Walmart, 2026-08-25) |
| 345 | payments | dispute rate dated by the payment month, not the filing month | finans_fraud | Medium | B1 (Stripe) |
| 346 | banking | system NPL ratio weighted by loans, not averaged | finans_banking | Medium | B12 (Wells Fargo) |
| 347 | fintech | each user's largest top-up per method, summed per method | finans_neobank | Medium | B2 (Robinhood, 2026-11-12) |
| 348 | fintech | customer funds rebuilt from a ledger as of a date | finans_neobank | Hard | B9 (Stripe, 2026-08-31) |
| 349 | fintech | signup → KYC → first payment, each step timed from the last, mature cohorts only | finans_neobank | Hard | B8 (Airwallex, 2026-08-15), P7 |
| 350 | retail | like-for-like growth: markets that traded in both Julys | finans_neobank | Hard | R1 (Fetch Rewards) |
| 351 | retail | cross-shopping category pairs and the share of A that also shops B | finans_fraud | Hard | R4 (Google) |
| 352 | product | growth accounting: new, retained, resurrected, churned | finans_neobank | Hard | P3 (Tubi), P4 (Facebook) |
| 353 | product | DAU/MAU with zero-activity days counted | finans_neobank | Hard | P5 (Glean, 2026-09-30) |
| 354 | product | early-habit buckets vs later retention, mature users only | finans_neobank | Hard | B5 (Chime, 2026-08-25) |

None carries a company tag. The sources name companies, but most dates are
weak and a challenge tag would put a card into a company set (and its page
counts) on one report. The read is here for C1/B3 if a second source turns up.

## FOUNDER

- Glassdoor, Blind and 1point3acres refused automated reads. They hold the
  Capital One card/transaction reports this lane wants most. A hand read in
  a signed-in browser is the only way to see them.
