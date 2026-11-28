# Sector articles — keyword read (2026-11-23)

Read for the founder's ask of 2026-11-23: keyword articles on niche sector SQL
interview questions (banking, fintech/payments, retail/e-commerce, big tech).
SEO-loop rule 1 is RED (Bing's index ~1.9× the sitemap), so the founder's
explicit ask is the exception and the cap is **3 new posts**.

Sources: `gsc_daily` (query slice and query×page slice) and `bing_stats` (query
slice, weekly buckets), last 90 days to 2026-11-22, read-only through the
Supabase MCP on 2026-11-23. SERP: 10 web searches (standard mode), 2026-11-23,
US results.

## 1. Our own queries, by sector (90 days)

Totals the orchestrator handed over (keyword groups): fintech/payments 209
impressions / 35 clicks / position 10.4; big tech 241 / 4 / 16.5;
retail/e-commerce 181 / 1 / 35; banking 120 / 2 / 12.3.

What the query rows say underneath those totals:

- **Almost every impression is a company-named query.** The generic sector
  heads barely exist for us: no `banking sql interview questions`, no
  `fintech sql interview questions`, no `e-commerce sql interview questions`
  row in GSC. Bing has the nearest ones: `sql questions practice for
  e-commerce` (2 impressions, position 6), `sql question bank risk analyst`
  (2, position 2), `practice sql for wise fintech interview` (1, 1 click).
- **Banking:** Capital One queries (`capital one data analyst assessment` 21,
  `capital one code signal assessment` 18, `capital one codesignal` 11,
  `capital one data analytics assessment` 11, …) land on
  `/blog/capital-one-codesignal-data-analyst-assessment/` (100 impressions,
  2 clicks, position 12.2). `jp morgan sql interview questions` 11 at 7.0 and
  `jpmorgan chase sql interview recursive queries window functions 2025` 8 land
  on `/jpmorgan-sql-interview/` (21, 0, 6.3). Bing: `sql jp morgan chase` 1
  impression, 2 clicks; `i said i know sql on my jp morgan cv … superday` 1.
- **Fintech / payments:** `revolut sql interview questions` 66 / 27 clicks /
  1.5, `stripe sql interview questions` 37 / 8 / 3.0, `wise sql interview
  questions` 19 / 10 / 1.7, `stripe sql` 22 at 23.7. Pages: Stripe 61 / 8 /
  11.1, Wise 24 / 10 / 3.3. Fraud: `/blog/sql-for-fraud-analytics/` 36
  impressions at 8.4 (`sql fraud`, `velocity rules fraud`, `fraud analytics
  in banking`). `chargeback reason code 76` (11 + 5 + 2) reaches a question page
  at ~33 — not a SQL query, not a target.
- **Retail / e-commerce:** `amazon interview questions on sql` 83 at 36.1,
  `amazon sql interview questions` 29 at 37.0; the Amazon page holds 142
  impressions, 0 clicks, position 36.5. Shopify 36 at 32 (mostly
  "datalemur shopify …" — navigational). `walmart sql interview questions` 3
  at 6.7, 1 click. Bing: `amazon sql bie interview` 6 at 2.0, 1 click.
- **Big tech:** `google sql interview questions` 61 at 18.2, `apple …` 44 at
  9.8, `meta …` 43 at 18.4, `uber …` 28 at 22. All company-named, all already
  served by company pages and `/blog/faang-sql-interview-guide/`.

## 2. SERP read (2026-11-23, standard web search, US)

| Query | What wins | Page type, depth, freshness |
|---|---|---|
| banking sql interview questions | DataLemur, ~15 of 20 results, one listicle per bank (Wells Fargo, BofA, Citi, PNC, Truist …); one Scribd doc | company listicles, 8–11 questions each, "Updated 2024/2025" in the title |
| fintech sql interview questions | DataLemur company listicles (PB Fintech, Marqeta, Visa, Fiserv, Synchrony); letsdatascience fintech dataset; a DEV post on Square | company listicles; one practice-dataset page |
| payments data analyst sql interview questions | DataLemur (Global Payments, Mastercard, PayPal, Adyen, Visa, Stripe); Interview Query Stripe / PayPal / Global Payments guides | company listicles + company guides |
| e-commerce sql interview questions | DataLemur (Shopify, eBay, Global-e, Rakuten, Instacart, Coupang); a devgenius Medium post; letsdatascience retail set | company listicles; **one** generic sector article (Medium) |
| retail sql interview questions data analyst | DataLemur retailer listicles; Interview Query Walmart guide; finalroundai "what makes retail data analyst interviews different" | listicles + one generic guide (no runnable SQL) |
| credit card data analyst sql interview questions | DataLemur (Mastercard, Discover, Visa, Capital One, JPMorgan, Amex); Interview Query Amex / Cardworks | company listicles |
| product analytics sql interview questions | Interview Query, StrataScratch, DataLemur Amplitude, Glassdoor | strong incumbents with large banks |
| sql interview questions bank data analyst delinquency loan default | DataLemur listicles (OneMain, Huntington, Truist); a prachub DS guide naming a vintage-delinquency table | listicles name the shape, few work it |
| sql payments reconciliation refunds chargebacks interview | levelup/Medium, letsdatascience, datadriven.io, prachub, DataLemur | practice sites and blog posts; no single dominant guide |
| market basket analysis sql interview question | Medium tutorials, Microsoft archive blog, O'Reilly chapter, remasto | tutorials; nothing interview-framed and runnable |

What this says:

1. The sector head terms are **company-listicle SERPs owned by DataLemur**:
   one thin page per company, a few shapes each, mostly untimed. Nobody ranks
   a single, worked *sector* guide whose queries run.
2. The **concept tails** (delinquency buckets, roll rates, reconciliation,
   refunds, basket affinity) are held by Medium posts and practice sites.
   They are winnable with depth: real queries, real results, the trap named.
3. **Product analytics / big tech** has strong incumbents (Interview Query,
   StrataScratch) and our own FAANG guide already targets it — no new post.

## 3. The three posts (buyer value × winnable SERP)

| # | Post | Head + tail keywords | Buyer value | Why winnable |
|---|---|---|---|---|
| 1 | `/blog/banking-sql-interview-questions/` | banking sql interview questions · credit card data analyst sql interview · delinquency buckets / roll rate sql | Capital One is the sharpest buyer signal (2 of the first 3 payers); JPMorgan page at 6.3 with 0 clicks | head is listicles only; the roll-rate and bucket tails have no runnable answer |
| 2 | `/blog/payments-sql-interview-questions/` | payments sql interview questions · fintech sql interview questions · authorization vs capture · reconciliation · refunds · FX | fintech is our best-clicking group (35 of 42 sector clicks); Stripe/Revolut/Wise payers | reconciliation and approval-rate tails are blog posts and practice sites |
| 3 | `/blog/ecommerce-sql-interview-questions/` | e-commerce sql interview questions · retail sql interview questions · GMV vs net revenue · repeat purchase rate · basket affinity sql | Amazon produced 3 of 15 payers; its page sits at 36 with 0 clicks | the only generic sector article is a Medium post; basket-affinity SERP has no interview framing |

Big tech is not picked: highest impressions, but every query names a company
that already has a page, and `/blog/faang-sql-interview-guide/` targets the
generic term. A fourth post would break the cap of 3.

**Cannibalisation check.** `/fraud-analytics-sql/` and
`/blog/sql-for-fraud-analytics/` own fraud *detection* (anomaly bounds,
velocity, impossible travel, collusion, chargeback chains). The banking post
covers credit-quality buckets, roll rates and dispute timing; the payments
post covers authorisation, reversals, currency and reconciliation. Both link
the fraud pages instead of repeating them. The Revolut and Capital One guides
are company guides; the new posts link to them as the company-level door.

## 4. Data limits written down before writing

- No account-level loan or card delinquency table exists in the bank. The
  banking post teaches bucket and roll-rate mechanics on the FDIC
  `finans_banking` data (bank-level non-performing-loan ratios, four
  quarters of 2025) and dispute timing on the synthetic `finans_fraud`
  card ledger, and says so.
- The `ecommerce` dataset is small (40 orders, 16 customers, one product per
  order, no returns table). The retail post says so, measures affinity
  across a customer's orders rather than inside a basket, and treats returns
  as a shape without data.
- No post shows a Capital One mock question or answer, a Revolut mock
  question, or any bank challenge's reference solution
  (`tests/sector-articles.test.js`).
