# The 34-page plan does not survive its own SERP test

**Read 2026-09-10.** Ran the candidate-selection method from
`company-page-candidates-2026-09-09.md` against the pools named in
`docs/plans/interview-intent-1500-2026-09-10.md`. **Four candidates tested, one
survives.** The plan's arithmetic (34 more winning pages) does not hold, and the
reason is structural rather than a bad candidate list.

## What the test found

| Candidate | SQL-titled results | Who | Verdict |
|---|---|---|---|
| Zillow | 3+, fresh | **DataLemur** (11 questions, 2025), StrataScratch, Interview Query | reject |
| Goldman Sachs | 2+, fresh | **DataLemur** (10 questions, 2025), Exponent (SQL-filtered) | reject |
| CoStar | 0, and no interview content at all | — | too thin |
| **Siemens** | **0** | six Interview Query *guides*, Glassdoor, datainterview — none SQL-specific | **accept** |

## The structural finding

**Every company with proven SQL-interview demand already has a fresh DataLemur
page.** That is not a coincidence and it is not a gap in our candidate list. It
is DataLemur's whole product, it is free, and it outranks us everywhere.

So the plan's filter — unambiguous name, 3,000+ employees, real analytics
function — selects exactly the companies DataLemur has already covered. The
filter is well specified and it finds occupied ground.

The one candidate that passed did so for a different reason. Siemens has
**six** Interview Query guides (Siemens, Siemens Healthineers, Siemens Digital
Industries Software, ×data analyst / data scientist / data engineer), so demand
is visible and repeated. **Not one of them is SQL-specific.** Proven demand,
empty SQL shelf. That is a better position than Monzo's (no demand signal) and
better than Brex's (stale incumbent), the two the 09-09 read chose between.

## What is actually untapped, and it is not a company

The gap is a **vertical**, not a name. DataLemur, StrataScratch, Exponent and
Interview Query all target tech and finance. None of them targets industrial,
manufacturing, energy, logistics or healthcare-provider analytics.

And that is where our unused content is:

| dataset | challenges | companies drawing on it |
|---|---|---|
| `uretim_industrial` | 20 | **Tesla only** |
| `gayrimenkul_nyc` | 20 | **none at all** |
| `finans_banking` | 27 | JPMorgan, Morgan Stanley |

Two datasets are sitting idle. The 09-09 read concluded there was "no
consumer-neobank content that is not already Revolut's", which was correct, and
then the search stayed inside fintech. Outside it there are 40 authored
challenges nobody has ever pointed a door at.

## What this means for the plan

`docs/plans/interview-intent-1500-2026-09-10.md` says 1,500 visitors needs ~40
winning pages, so 34 more. **That arithmetic is unchanged and the supply is
not there.** Honest capacity against existing content and an open SERP:

- **1 page now** — Siemens, backed by the 19 untouched industrial challenges.
- **1-2 more** in the same vertical, if a distinct subset genuinely exists.
  Splitting 20 challenges across three doors is the differentiation theatre the
  09-09 read named and rejected.
- **Real estate** needs a candidate that is not Zillow or Redfin, and CoStar
  showed the pool may be too thin to have demand at all.

**So the 34 pages are not blocked by page-writing. They are blocked by
content.** A new vertical dataset backs four to six doors from one authoring
pass, which is the shape the 09-09 read already proposed and the 09-10 plan
skipped past.

## Correction to the 09-10 plan

The plan's phase 1 — six pages by 09-17, gate 4 of 6 at 5% CTR on 10-13 — cannot
run as written. There are not six defensible candidates. Amended: **ship
Siemens alone**, read it on the same 10-13 date, and treat it as the test of the
whole industrial-vertical hypothesis rather than of the company-page rule.

If Siemens clears 5% CTR, the vertical is open and the next authoring pass is a
dataset, not a page. If it does not, company pages are finished as a growth
lever and 1,500 has to come from a channel that is not Google.
