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

## REVERSED, same day, before anything shipped

The decision above survived about an hour. Checking whether the content
existed to back the two pages killed both, and the reasoning is worth more
than the original call.

### What the check found

Company pages are fed by `?company=<Name>`, resolved through
`src/data/challenge-companies.js`. Revolut has 26 challenges tagged, Wise 16,
Ramp 32. **Monzo and Brex have zero** — so writing either page starts with
tagging, and that file's own convention is strict:

> each company gets a SUBSET chosen against its own page's stated topics, one
> line of reasoning per challenge … The obvious wrong answer was tagging all 25
> card challenges to all five payments companies: Wise would then be 35
> challenges of which 25 are identical to Stripe's, five doors sharing one core.

**Brex is Ramp's business. Monzo is Revolut's.** A genuinely distinct subset
for either is not available, because the work is not distinct. Picking
different challenges purely to avoid overlap would be differentiation theatre —
the same dishonesty the 2026-09-07 pass removed, wearing a different hat.

### And the segment was wrong anyway

Sorting the eight existing fintech pages by clicks, 28 days:

| Page | Clicks | Impressions | Segment |
|---|---|---|---|
| revolut | **40** | 277 | consumer neobank |
| wise | **14** | 102 | consumer transfers |
| jpmorgan | 4 | 76 | bank |
| ramp | 1 | 45 | **B2B spend** |
| plaid | 1 | 30 | **B2B infrastructure** |
| morgan-stanley | 0 | 6 | bank |

"Fintech works" was the wrong reading of the 09-08 data. **Consumer fintech
with a large candidate pool works**; B2B fintech gets one click a month. Brex
sits squarely in the Ramp segment. The stale-incumbent logic was sound and I
applied it to the segment we have already measured as not converting.

### The real blocker, which neither name would have solved

The bank holds two fintech shapes: `finans` (57 challenges of **FDIC
call-report data** — bank assets by state, charter classes, deposit totals)
and `card_analytics` (25 challenges of card transaction and merchant spend).
Eight fintech pages already draw on those 82 challenges.

There is **no consumer-neobank content that is not already Revolut's**. No
ledger or balance-history shape, no faster-payments timing, no
savings-pot analytics. A Monzo page today would be Revolut's content under a
different name — a doorway, which `tests/company-pages.test.js` exists to
prevent.

### What actually follows

The next traffic move is **not a tenth company page**. It is one of:

1. **New content that opens a shape we do not have.** Consumer-neobank ledger
   analytics is a real gap and it would back Monzo, Starling, N26 and Chime at
   once — four doors from one authoring pass, instead of one door split off an
   existing core.
2. **A different page type.** The 09-08 read found the role queries sitting at
   position 34-46 with real impressions: `sql interview questions for data
   analyst` (28 imp, 45.5), `sql interview preparation course` (34 imp, 34.8),
   `data analyst sql interview questions` (9 imp, 44.9). We have pages for
   these — `/sql-interview-questions-data-analyst/` at position 28 — so this
   is an improvement job on existing pages, not authoring.

Option 2 is cheaper and unblocked. Option 1 is the larger prize and is the
prerequisite for ever adding a ninth fintech page honestly.

**Neither Monzo nor Brex should be written until option 1 exists.**

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
