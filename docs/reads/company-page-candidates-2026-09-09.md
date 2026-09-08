# Which company page to write next — SERP evidence, 2026-09-09

Serves **O1** (`docs/agent/objectives.md`): 50 paying customers/month by
2026-12-08, whose traffic half needs ~6× signups and is the only half not
blocked until 09-29.

## Why a company page at all

The 2026-09-08 read established that our one working search shape is the
company interview page, and that it works for reasons that have nothing to do
with our content — the 23 pages are one template, and the two that convert sit
in the middle of it:

| Page | CTR | Position |
|---|---|---|
| revolut | **14.4%** | 7.7 |
| wise | **13.7%** | 8.2 |
| shopify | 1.6% | 7.4 |
| uber | 0% | 12.8 |

Winners are mid-size fintech, where `<company> sql interview` has one
plausible meaning. Losers are mass consumer brands whose query space belongs
to a data product (Redshift, BigQuery, ShopifyQL).

## The method, and why GSC could not do it

The first plan was to find company names already drawing impressions that we
have no page for. **That is structurally impossible** — GSC reports only
queries we already appear for, and we appear only for companies we have
written about. The top 230 queries of the last 90 days contain no new company
name, and that is a property of the instrument, not of demand.

So: the SERP test the 2026-09-07 read used. Search
`"<company>" sql interview questions` and count the results whose **title** is
SQL-specific. That count measures both things at once — if several publishers
wrote a dedicated page, demand exists; if they are many and fresh, we cannot
win. Run 2026-09-09 on DuckDuckGo, top 10 per name.

| Company | SQL-titled results | Who | Freshness |
|---|---|---|---|
| **Monzo** | **0** | — (Glassdoor ×4, interviewpal, prepfully, ambitionbox) | — |
| **Starling Bank** | **0** (7 results total) | — | — |
| **Brex** | **2** | Exponent ×2 | **both "Updated 2024"** |
| Chime | 3 | Exponent ×2, prachub | mostly 2024 |
| Marqeta | 2 | DataLemur, Glassdoor | DataLemur 2025 |
| Adyen | 2 | DataLemur, letsdatascience | fresh |
| Klarna | 3 | Exponent ×2, sql-academy | Exponent has a **2026** edition |
| Robinhood | **6** | DataLemur, sqlpad, letsdatascience, Exponent ×2, bigtechinterviews | fresh |

## Decision: Monzo and Brex — one of each archetype

The table contains two different bets and there is no evidence to choose
between them, so we run both and let the read decide. Two pages is cheap; a
guess carried for three months is not.

**Archetype A — the Revolut clone: MONZO.** Zero SQL-specific incumbents, UK
neobank, the direct analogue of our best-performing page. The bet: Revolut
ranks 2.9 *because* nobody wrote a dedicated page, and the same vacuum exists
here. The risk, stated plainly: zero incumbents may mean zero demand, and
nobody wrote a page because there is nothing to write for.

**Archetype B — the stale incumbent: BREX.** Demand is *proven* — Exponent
wrote the page twice — and every competing page is stamped 2024, two years
stale. Direct analogue of our existing Ramp page, so the content pattern
exists. The bet: proven demand plus stale competition beats an empty niche.

**Rejected, with reasons:** Robinhood (six fresh incumbents including
DataLemur); Adyen and Marqeta (DataLemur present, and it outranks us
everywhere); Klarna (Exponent maintains a 2026 edition); Chime (demand and
staleness comparable to Brex, but "chime" is an everyday word and the
2026-09-08 read is explicit about what happens when a company name carries
other intent — Shopify ranks 7.4 and converts at 1.6%); Starling (zero
incumbents *and* only seven results at all, which reads as too thin even for
archetype A).

## What these pages may and may not say

The 2026-09-07 pass removed unsourced interview formats, invented sample
questions and fabricated topic percentages from 22 pages, and
`tests/company-pages.test.js` now fails on their return. **We have no sourced
information about how Monzo or Brex interview.** Neither page may state a
duration, a format, or a question they ask.

What they may say is what the 2026-09-06 fintech pass established: the data
shapes the business actually runs on, and real challenges from our bank that
match those shapes. Monzo is neobank ledger and transaction analytics; Brex is
corporate card spend analytics — the same `finans` and `card_analytics` banks
that back the Capital One and Ramp pages.

A name-swap of an existing page is a doorway. Each page earns its place by
routing to challenges that genuinely match its shape, or it should not ship.
