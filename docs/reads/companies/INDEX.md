# Company interview dossiers — index

Owned by R1 (`docs/agent/fleet/R1-company-research.md`). One dossier per
company in this folder, `<slug>.md`: format rows with dated sources, topic
counts ("N of M reports", never "most asked"), paraphrased question shapes,
role variants, a confidence per fact. A dossier older than 60 days is due for
a refresh. A low-confidence fact never reaches a page.

Older per-run reads (not dossiers; pages cite them today):
`docs/reads/company-research-2026-09-13.md` (DoorDash, Goldman Sachs,
Walmart, TikTok, LinkedIn, Microsoft, Bloomberg), `-09-14.md` (Amazon, Meta),
`-11-20.md` (PayPal, Coinbase, Monzo; Robinhood, Klarna, Adyen deferred),
`-11-22.md` (Chime; Nubank, N26 deferred). A company whose only read is one of
these shows "none" below, with the read in the last column.

## The 34 page companies (`COMPANIES`, `scripts/build-company-crosslinks.mjs`)

Impressions / clicks: gsc_daily page slice, 28 days to 2026-11-21.

| company | sector | dossier | confidence of the format | 28-day imp / clk | what is new / older read |
|---|---|---|---|---|---|
| Capital One | fintech | **2026-11-22** | high (DA screen shape) | 106 / 9 (+ blog 658 / 39) | CodeSignal's own help page: DAA = 70 min, 14 quiz + 1 coding, CSV in any tool, 200–600, retake 2× in 180 days; DS gets 4 Python tasks / 90 min; BA gets cases. Our mock is 12 + 2. |
| Revolut | fintech | **2026-11-22** | medium (four-question SQL round) | 205 / 36 | Second family confirms the four-question round (PracHub, Feb 2026); new shapes: CTR from an event log, define-a-metric, fraud rules; Revolut's careers page names the stage order. |
| Stripe | fintech | **2026-11-22** | high (live SQL in DS/DA loops; DS take-home) | 69 / 4 | First dated sources: three candidate reports; HM first round; one-week DS take-home. The page can become sourced. |
| Wise | fintech | **2026-11-22** | high (analyst take-home, first-party) | 206 / 53 | wise.jobs documents the analyst case: 7 days, ~2 h, ≤ 3 h. No source for a "30-minute SQL interview". |
| JPMorgan | fintech | **2026-11-22** | low (nothing page-ready) | 56 / 3 | Only generic first-party lines; the JPMC application PDF (HireVue / HackerRank) needs a hand read. |
| PayPal | fintech | none | — | 0 / 0 | read 2026-11-20 (page cites it) |
| Coinbase | fintech | none | — | 0 / 0 | read 2026-11-20 |
| Monzo | fintech | none | — | 0 / 0 | read 2026-11-20 |
| Chime | fintech | none | — | 0 / 0 | read 2026-11-22 |
| Plaid | fintech | none | — | 14 / 1 | no read |
| Ramp | fintech | none | — | 31 / 3 | no read |
| Goldman Sachs | fintech | none | — | 5 / 0 | read 2026-09-13 (stale) |
| Morgan Stanley | fintech | none | — | 49 / 2 | no read |
| Bloomberg | fintech | none | — | 1 / 0 | read 2026-09-13 (stale) |
| Amazon | bigtech | none | — | 123 / 5 | read 2026-09-14 + one emailed report 2026-10-21 (stale) |
| Google | bigtech | none | — | 75 / 2 | no read |
| Meta | bigtech | none | — | 90 / 7 | read 2026-09-14 (stale) |
| Apple | bigtech | none | — | 46 / 5 | no read |
| Netflix | bigtech | none | — | 29 / 1 | no read |
| LinkedIn | bigtech | none | — | 20 / 0 | read 2026-09-13 (stale) |
| Microsoft | bigtech | none | — | 17 / 0 | read 2026-09-13 (stale) |
| Uber | consumer | none | — | 20 / 2 | no read |
| Airbnb | consumer | none | — | 25 / 0 | no read |
| Shopify | consumer | none | — | 75 / 7 | no read |
| Spotify | consumer | none | — | 21 / 1 | no read |
| DoorDash | consumer | none | — | 10 / 1 | read 2026-09-13 (stale) |
| Walmart | consumer | none | — | 11 / 2 | read 2026-09-13 (stale) |
| TikTok | consumer | none | — | 51 / 0 | read 2026-09-13 (stale) |
| NVIDIA | datainfra | none | — | 27 / 0 | no read |
| Databricks | datainfra | none | — | 84 / 4 | no read |
| Snowflake | datainfra | none | — | 132 / 10 | no read |
| OpenAI | ailab | none | — | 22 / 4 | no read |
| Anthropic | ailab | none | — | 26 / 2 | no read |
| Tesla | industrial | none | — | 74 / 3 | no read |

Coverage on 2026-11-22: **5 of 34** with a dossier younger than 60 days.

## Companies with search demand and no page

Checked 2026-11-22: gsc_daily query slice (90 days) for about 60 large
employers without a page (Deloitte, Accenture, Booking, Lyft, Instacart, Salesforce,
Adobe, Oracle, IBM, Citi, Bank of America, Wells Fargo, Amex, Visa,
Mastercard, Nubank, N26, Klarna, Adyen, Robinhood, Block, Affirm, SoFi,
Intuit, Pinterest, eBay, Expedia, Zillow, the Big Four, McKinsey, Optum,
Target, Barclays, HSBC, Citadel, Discover, Synchrony, Fidelity, BlackRock and
others), plus bing_stats (90 days). **None has an interview-intent query.**
The only hits are dialect or noise ("oracle cte", "visa chargeback reason
code 76"). Caveat: GSC shows only queries we already rank for, so it is
blind to a company we have no page for. C7's clusters are the other source;
re-check monthly.

## Queue (next runs, 2–3 companies each)

1. **Plaid, Ramp, Morgan Stanley** — buyer-signal fintechs with a page and no read.
2. **Goldman Sachs, Amazon, Snowflake** — stale reads (Sept) or no read; Amazon and Snowflake carry the most impressions after the five done.
3. **Meta, Google, Databricks** — demand 75–90 impressions, Meta's read is stale.
4. **PayPal, Coinbase, Monzo, Chime** — convert the 11-20 / 11-22 reads into dossiers before they turn 60 days old (by 2027-01-19).
5. Then Shopify, Tesla, TikTok, Apple, and the rest by impressions.
