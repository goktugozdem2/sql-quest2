# Who meets the price, by country — 30 days to 2026-10-01

Asked by the founder: beyond India, which countries are candidates for a
regional price? People by `aid`, internal accounts and the rendering crawler
excluded; app events only (no landing-only visitors). **Country is the
browser's time zone, a proxy** — the price itself is decided by the server's
country header, which events do not carry except as `priceRegion` (IN /
default). 1,362 "people" with time zone `UTC` and no solve at all are bots
and are left out.

| Country (by time zone) | People | Solved ≥ 1 | Solved ≥ 6 | Saw the modal | Met the quota wall | Clicked a plan | Paid |
|---|---|---|---|---|---|---|---|
| India | 646 | 267 | 119 | 121 | 26 | 12 | 2 |
| United States | 264 | 75 | 39 | 42 | 7 | 1 | 1 |
| United Kingdom | 65 | 35 | 20 | 19 | 2 | 1 | 0 |
| Canada | 44 | 17 | 14 | 14 | 2 | 0 | 0 |
| Turkey | 29 | 5 | 3 | 4 | 1 | 0 | 0 |
| Mexico | 24 | 16 | 11 | 12 | 2 | 1 | 0 |
| Australia | 24 | 7 | 5 | 5 | 0 | 0 | 0 |
| Spain | 22 | 8 | 4 | 5 | 0 | 1 | 0 |
| Poland | 20 | 10 | 6 | 5 | 1 | 0 | 0 |
| Brazil | 19 | 6 | 2 | 2 | 0 | 0 | 0 |
| Singapore | 18 | 9 | 4 | 3 | 1 | 0 | 0 |
| Germany | 16 | 7 | 1 | 3 | 0 | 0 | 0 |
| France | 15 | 5 | 3 | 2 | 0 | 0 | 0 |
| Indonesia | 12 | 5 | 4 | 3 | 2 | 0 | 0 |
| South Africa | 12 | 4 | 1 | 1 | 0 | 0 | 0 |
| Thailand | 11 | 5 | 3 | 4 | 1 | 0 | 0 |
| Egypt | 9 | 4 | 2 | 2 | 1 | 0 | 0 |
| Nigeria | 7 | 2 | 2 | 1 | 1 | 1 | 0 |

"Paid" is the 30-day window: India 09-19 (annual, US$49 with a code) and
10-01 (monthly, US$9); United States 09-01 (monthly, US$29). Every payer the
product has had: three in the United States at full price, two in India at
a reduced one.

## What it says

- **There is no second India.** The six-solve population — the only people
  the ask works on — is India 119, then the three full-price markets (United
  States 39, United Kingdom 20, Canada 14), then Mexico 11. No other
  lower-income country has more than four.
- Every lower-income country outside India put together (Mexico, Indonesia,
  Turkey, Thailand, Brazil, Egypt, Nigeria): **27 six-solvers a month**. At
  India's own rates (10% of modal viewers click, two of twelve clickers pay)
  that is well under one payer a month. A second price tier would not move
  the objective.
- **The gap is in the full-price markets, and it is not a discount
  question.** United States + United Kingdom + Canada: 73 six-solvers, 75
  saw the modal, 2 clicked (2.7%). India: 121 saw it, 12 clicked (9.9%).
  The people who can pay US$29 without a card problem are the ones who do
  not click. That is the population `checkoutTrial` is aimed at.
- India's own leak is after the click: 12 clicked, 2 paid, and the one who
  paid at the regional price failed 3D Secure three times first
  (docs/reads/checkout-clickers-2026-10-01.md).

n is small everywhere but India and the United States; nothing here is a
verdict, and nothing was changed on this read.
