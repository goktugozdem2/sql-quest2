# Getting to 1,500 interview-intent visitors a month

Written 2026-09-10. Target set by the founder after the market sizing: 50 payers
a month needs roughly 1,500 interview-intent visitors, against 130-190 today.
That is 8-11×. Every number below is measured; re-measure before quoting.

## The rule this plan is built on

The 2026-09-08 keyword read segmented the 23 company pages by CTR, and the split
is not about quality or position. It is about **whether the company's name plus
"SQL" means anything other than an interview.**

| Converts (CTR ≥ 5%) | Does not (CTR < 2%, at positions 7-18) |
|---|---|
| revolut 14.4% · wise 13.7% · spotify 8.1% · snowflake 7.4% · stripe 5.5% · jpmorgan 5.3% | shopify 1.6% (pos 7.4) · google 1.6% (9.8) · apple 1.6% (10.8) · meta 1.6% (13.4) · amazon 1.8% (18.0) · airbnb 1.8% (16.7) · uber **0%** (12.8) |

The losers are mass consumer brands whose SQL query space belongs to their own
products: "google sql" is Cloud SQL and BigQuery, "amazon sql" is Redshift and
Athena, "shopify sql" is ShopifyQL. We rank for those queries and nobody
searching them wants interview prep.

`/shopify-sql-interview/` proves it is not position or effort: it ranks **7.4**
with **307 impressions**, better and bigger than Revolut's 7.7 and 277, and
converts **nine times worse**. Meanwhile `/amazon-sql-interview/` is our most
worked page — 3,150 words, 34 challenge links — at 1.8%.

**The rule: build a company page only where the company's name plus SQL has
exactly one plausible meaning.**

## The arithmetic

A winning page measures ~275 impressions and ~14% CTR per 28 days, so roughly
**38 interview-intent visitors a month**. A losing page produces ~5.

```
   1,500 visitors / month
   -----------------------  =  ~40 winning company pages
   38 per winning page

   we have 6 today  ->  34 to build
```

That is the whole plan. Not more traffic in general, not better copy: **34 more
pages that satisfy the rule.**

## The filter, both halves

**Half one, from the read: the name must be unambiguous.** No page for a company
whose name attaches to a database, a query language, a BI tool, or a consumer
product.

**Half two, learned the harder way: the company must hire enough.** The
2026-09-09 read reversed a Monzo/Brex decision inside an hour after finding that
B2B fintech at Ramp and Plaid scale converts at about **1 click a month**.
Revolut has ~10,000 employees and Wise ~5,000; Ramp and Plaid are nearer 1,000.

**So: unambiguous name AND roughly 3,000+ employees AND a real analytics
function.** Both halves, or the page is one of the 5-a-month kind.

## Where 34 such companies come from

Candidate pools that pass half one by construction. Each needs half two checked
before it is written.

- **Consumer fintech at scale** — Klarna, Adyen, Nubank, Chime, Robinhood, Coinbase, SoFi, Affirm, Block, N26, Monzo, Starling.
- **Data infrastructure** — Databricks, Confluent, MongoDB, Elastic, Datadog, Fivetran, dbt Labs. Snowflake already wins at 7.4% and is the proof this pool works.
- **Marketplaces and logistics with heavy analytics** — Deliveroo, Just Eat, Instacart, DoorDash, Wolt, Bolt, Getir, Gopuff.
- **Health and insurance tech** — Oscar Health, Babylon, Ro, Hims, Lemonade, Root.
- **Banking beyond JPMorgan**, which already wins at 5.3% — Goldman Sachs, Barclays, HSBC, Citi, Capital One. Capital One matters twice: two of our first three payers prepped for its CodeSignal screen, and we already own 25 challenges written for that shape.

Do not build for: Google, Amazon, Apple, Meta, Microsoft, Uber, Airbnb, Shopify,
Netflix, Tesla, NVIDIA. Their pages exist, they do not convert, and this rule
explains why. Leave them; do not add more of that kind.

## Sequencing, and the deadline that actually binds

A new page on this domain needs internal links in the same commit (the orphan
rule: four fintech pages sat unindexed on both engines with a healthy sitemap
because nothing linked to them), a sitemap entry, `npm run indexnow`, and a
manual GSC URL Inspection at ~10 URLs a day. Then it needs weeks to rank.

Working back from 2026-12-08:

| | |
|---|---|
| A page shipped **09-20** | indexed early October, readable traffic late October, ranked by late November |
| A page shipped **10-15** | readable traffic late November, barely counts |
| A page shipped **11-01** | does not count for 12-08 at all |

**Everything that is going to matter must ship by roughly 2026-10-15.** That is
five weeks for 34 pages, which is ~7 a week.

At ~3 hours of CC time per page plus links, sitemap and IndexNow, 34 pages is
around 100-120 hours of assisted work. That is feasible. The GSC indexing quota
of ~10 URLs a day is the harder ceiling: 34 pages is four clean days of quota
with nothing else queued, and the nine topic pages plus the AI-SQL article are
already waiting in that queue.

## Phase 1, and the thing that must happen before phase 2

**Do not write 34 pages on this argument.** The rule is derived from six winning
pages and one contrasting loser. It is a good hypothesis and it is not yet a
verdict.

- **09-11 to 09-12** — pick 6 candidates that pass both halves of the filter. One from each pool. Check employee count and check that the name plus SQL returns no product in the SERP.
- **09-13 to 09-17** — write and ship all six, each with internal links, sitemap and IndexNow in the same commit.
- **09-18** — request indexing for all six in one GSC pass.
- **2026-10-13** — read. Compare the six against the existing winners on CTR and against the existing losers.

**Gate: at least 4 of the 6 must clear 5% CTR.** That is the line the read
itself draws between converts and does not. Clear it, and the remaining 28
pages are justified with five weeks left, which is exactly enough. Miss it, and
the rule is wrong and 28 more pages would have been 84 hours spent on a bad
hypothesis.

## What this plan does not claim

**It does not get to 1,500 by itself, on this timeline.** Even at full success,
34 pages shipped by mid-October are ranking through November and reach their
measured value in December or January. The honest expectation for 2026-12-08 is
a fraction of 1,500, with the full number arriving in Q1.

**It is one channel.** Everything above is Google. Our measured non-brand reach
is ~3,800 impressions a month and 81% of our clicks are people who already knew
our name. Interview candidates also gather on Reddit, Blind and LinkedIn, and
the GenAI recommendation channel already sends us buyers invisibly (they land as
`arrivalSrc=home` with no referrer). None of that is in this plan, and a second
channel is the obvious next question once the 10-13 gate answers.

## Falsification

If fewer than 4 of the 6 phase-1 pages clear 5% CTR by 2026-10-13, the
unambiguous-name rule does not generalise beyond the six pages it was derived
from. Stop building company pages, and the 1,500 has to come from a channel that
is not Google.
