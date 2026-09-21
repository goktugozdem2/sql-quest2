# Pricing modal: stronger annual emphasis; the currency note (2026-09-21)

Covers two ideas: "Stronger annual plan emphasis" and "Currency note in
pricing modal".

## Currency note — shipped
"Billed in USD; your local currency may be shown at checkout." is in the
modal since 2026-09-20 (`data-testid="billed-currency"`,
`tests/checkout-surface.test.js`). Stripe's Adaptive Pricing is "Always on"
for Payment Links, so a Turkish buyer who clicks $99 lands on TRY 5,021.88;
the note says so first. **SHIPPED 2026-09-20.**

## Removed 2026-09-21: "most people choose this"
Gone from the modal and from the homepage pricing card (it was on both).
"SAVE 72%" stays — that is arithmetic, bound to the prices in
`tests/checkout-surface.test.js`, which now also fails if the popularity line
returns. If it ever comes back, it comes back with a measured share.

## Annual emphasis — open
Today the annual card is already the highlighted one: yellow border,
"SAVE 72%", "$8.25/month". Its subline also says **"most people choose
this"** — and that is not true. Of the four real subscriptions to date, two
are annual and two monthly (Stripe, read 2026-09-20). A claim on the buying
surface that the data does not support should go before anything is added.

Then, the emphasis itself — why it matters here: interview prep has a natural
end, and a monthly payer cancels after the interview (`sabar2001` cancels
2026-09-23). An annual plan pays for the whole search and for the post-hire
track (`post-hire-track-2026-09-21.md`). Candidate changes, one at a time:
- Frame annual by the job search, not the discount ("covers the whole search
  and your first months in the job").
- Default the homepage pricing link to `plan=annual` (it already supports
  `?plan=annual|monthly`).

## What it does not change
- Prices. `tests/checkout-surface.test.js` binds the badge and the per-month
  figure to the live prices.

## Claim (ledger-ready)
- **Metrics (exist):** `modal_click_rate`, `purchases` — read the plan mix
  from `stripe_webhook` rows only (the money truth).
- The 2026-10-03 read of `modal_click_rate` is already confounded by the
  09-20 modal change; land this after that read.

## Status
Currency note SHIPPED 09-20. False subline REMOVED 09-21. Annual emphasis
OPEN — after the 2026-10-03 `modal_click_rate` read.
