# Card Transactions — a synthetic fraud dataset for SQL practice

A small, fully synthetic credit-card dataset for practising analytics and
fraud SQL: accounts, merchants, transactions and chargebacks, with realistic
fraud patterns injected on top of ordinary activity. It is the dataset behind
the card-transactions practice set on [SQL Quest](https://sqlquest.app/),
where every question on it runs in the browser and is graded against the
data — no setup.

## Tables

| File | Rows | Columns |
|---|---|---|
| `accounts.csv` | 200 | `account_id`, `email`, `signup_at`, `country`, `device_fingerprint`, `ip_block`, `status` |
| `merchants.csv` | 25 | `merchant_id`, `name`, `category`, `country`, `risk_tier` |
| `transactions.csv` | 2,165 | `txn_id`, `account_id`, `amount`, `txn_at`, `merchant_id`, `lat`, `lng`, `status` |
| `chargebacks.csv` | 76 | `chargeback_id`, `txn_id`, `account_id`, `merchant_id`, `reason_code`, `opened_at`, `resolved_at`, `status`, `related_chargeback_id` |

Joins: `transactions.account_id → accounts.account_id`,
`transactions.merchant_id → merchants.merchant_id`,
`chargebacks.txn_id → transactions.txn_id`, and
`chargebacks.related_chargeback_id → chargebacks.chargeback_id` (a chain —
good for recursive CTEs).

## What is in it

Generated with a fixed seed (20260503), so every run of the generator gives
the same data. On top of ordinary activity the generator injects:

- 5 accounts flagged (`accounts.status = 'flagged'`)
- 5 accounts sharing one device fingerprint (`dev_x4f2a9b1c7e`) — a collusion
  ring; three of them are among the flagged
- 15 amount outliers (more than 3 standard deviations above the mean)
- 4 accounts with velocity bursts (6 or more transactions inside 5 minutes)
- accounts with impossible travel (a home-country purchase, then one on the
  other side of the world minutes later)
- chargebacks concentrated on the flagged accounts
- 6 chargebacks linked through `related_chargeback_id`: one 3-deep chain and
  one parent with two children

Every count above was checked against the published files. Some fraud is
planted without a label, on purpose: finding it is the exercise.

Questions it answers well: decline and chargeback rates by merchant risk
tier, velocity rules with window frames, anomaly bounds, shared-device rings,
the average-of-averages trap, and join fan-out.

## Fictional, and safe to publish

Everything is generated. Names of merchants are invented; no real person,
card or merchant is in it. For this public copy, email addresses use only
reserved domains (`example.com`, `mail.test`, `inbox.example`) and IP
addresses come from the RFC 5737 documentation ranges, mapped one-to-one so
accounts that share an address still share one.

## Practise on it

- In the browser, graded: [SQL Quest](https://sqlquest.app/) — the fraud
  analytics track and a timed card-transactions mock screen
- The walkthrough: [SQL for fraud analytics](https://sqlquest.app/blog/sql-for-fraud-analytics/)

## Licence

Public domain (CC0 1.0). Use it for anything. A link back to
[sqlquest.app](https://sqlquest.app/) is appreciated, not required.
