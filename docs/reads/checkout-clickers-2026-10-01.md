# Checkout clickers, 09-22 → 10-01 — nobody types a card

Read 2026-10-01 05:30 UTC, two days before the 10-03 read, because the first
real Checkout Session click arrived (09-30 13:08 UTC) and still no purchase.
Not a verdict on any claim; the 10-03 read stands. People by `aid`, internal
accounts excluded.

## What the wall does (flip 09-25 22:41 UTC → 10-01 05:30 UTC)

| modal reason | people shown | shows | people → Stripe |
|---|---|---|---|
| `free_quota` | 50 (24 priced IN) | 181 | 9 (18.0%) |
| `milestone_solves` | 45 (21 IN) | 68 | 0 |
| `pattern_mock` / `mock_link` / `pricing_link` | 15 | 15 | 0 |
| `generic` | 5 | 6 | 2 |
| `company_set`, `hard_challenge`, `company_hard`, `interview_locked` | 7 | 7 | 0 |

- The quota wall is the only ask that moves people to Stripe: 18% of the
  people who met it, against 3.4% for the old modal and a 15% target for
  10-09. The six-solve milestone ask moved nobody out of 45.
- A person at the quota wall sees the modal 3.6 times on average: they keep
  trying to open the next challenge.

## What happens at Stripe

- 12 people clicked a plan from 09-22 to 10-01, 11 of them after the quota
  flip. **All 12 chose monthly. 0 paid.**
- Stripe, payments created since 09-26 with status failed or incomplete:
  **none**. Nobody typed a card and was refused; they looked at the page and
  left.
- 8 of the 12 are in India: 6 were shown $9, one clicked the day before the
  regional price existed, one was shown $29 (an Indian timezone with a
  non-Indian country header — 2 of 27 Indian-timezone modal viewers were
  priced `default`, which is VPN/travel-sized, not a race in the geo read).
  One is in Nigeria and has clicked twice (09-22, 09-30).
- 7 of the 12 produced no event at all after the click; of the 10 who
  clicked at the wall for the first time, none has solved anything since.
  Solve counts among them: 138, 95, 84, 47. The wall is where the heaviest
  free users stop.
- `checkout-abandon` reached the 7 with an address ("what stopped you?").
  0 replies in the inbox, 0 returns.
- Only one of the 12 clicks went through a Checkout Session (the flag
  flipped 09-30 00:02 UTC); it opened without a fallback. The other 11 saw a
  Payment Link in local currency, so currency is still a live explanation
  for those 11 and the session path has n = 1.

## What this does and does not say

- It does not say the price is wrong: a click is made with the price on
  screen ($9 for most of them).
- It says the Stripe page is where it ends, before a card number. Two
  explanations fit and the data cannot split them: (a) no usable card —
  Indian debit cards are often closed to international and recurring
  charges, and a US Stripe account cannot take UPI; (b) "pay now" for
  something not yet tried from the inside.
- `checkoutTrial` (built, dark) tests (b): the Stripe page reads "$0 today".
  It does nothing for (a). Its gate was "after the first session purchase is
  seen through the webhook" — at 0 of 12 that gate may never open, so the
  gate itself is now the founder's decision.
- (a) is not a flag: UPI needs a different processor (a merchant of record),
  which is a change to the money path and the founder's call.

## Subscribers

jeromezhao's monthly ends today (2026-10-01 22:05 UTC, cancelled at period
end). From tomorrow: 2 active subscribers, both annual. Trailing-30-day
payers on 10-01: 1 (09-19). The 10-09 checkpoint asks for 6.
