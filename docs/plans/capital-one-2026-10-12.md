# Capital One — the first job on 2026-10-12

Written 2026-09-25 (founder: "12 Ekim'de ilk iş bu"). Two of the first three
payers prepped for Capital One's CodeSignal data-analyst screen; this is the
revenue page. **Nothing on `/capital-one-sql-interview/` or the Capital One
blog post changes before the 10-12 read** — the D2 change (H1 span "for the
CodeSignal assessment", blog → page link, 09-17) and the 09-19 mock paragraph
are still being read (docs/plans/seo-interview-longtail-2026-09-17.md, §"Added
2026-09-19"). Competitor read: docs/reads/capital-one-serp-2026-09-25.md.

## Where it stands (gsc_daily, to 2026-09-23)

| Page | Impressions | Clicks | Position | Queries it is seen for |
|---|---|---|---|---|
| `/capital-one-sql-interview/` | 64 (all since September) | 1 | 6.8 | **none visible** — every impression is an anonymised query |
| `/blog/capital-one-codesignal-data-analyst-assessment/` | 116 (September) | 5 | 9.0 | "capital one data analyst assessment" 14 · 0 · 8.9; "… data analyst codesignal assessment" 5 · 0 · 4.8; "capital one codesignal assessment" 1 · 1 · 46; "capital one codesignal questions", "capital one code assessment", "code signal data analytics assessment", "codesignal capital one" — 1 each at 36–40 |

The target queries — **"capital one sql"**, **"capital one codesignal"**,
**"capital one data analyst sql"**, **"capital one sql interview"** — have
**no impression row at all** for either page. We are not on the first ~100
results for them yet, or they are too rare to be shown. The family's traffic
goes to the blog post, which is informational ("what it asks"); the company
page is the transactional one ("practise it") and has not been matched to a
visible query yet.

The page itself: 3,554 words, 50 internal pages link to it, title "Capital
One SQL Interview Questions — CodeSignal Data Analyst Screen", no year and no
count. **Check on 10-12:** the description says "6 challenges from the bank, 5
free" while the bank tags **25** challenges Capital One — confirm which the
page means and make the two agree (site-counts guard).

## What the ranking pages do that ours does not

From the 09-25 read: every ranking page carries a **year or a count** in its
title ("9 Capital One SQL Interview Questions (Updated 2025)", "Top 10 …
2026", "… in 2026"). None of them offers a **runnable** Capital One-shaped
practice — DataLemur's editor holds other companies' problems, the rest is
prose — and none has a timed, scored mock on card-transaction data. The Final
Round "top 10" page ranks for "capital one codesignal" while answering the
*software* GCA; "data analyst" in our title is the distinction.

## The 10-12 read, and what each outcome means

Read the two pages from gsc_daily (query × page slice, 28 days to the last
date in the table, i.e. ~10-09) — `scripts/gsc/report.mjs` already prints the
company pages; add this family by hand:

```sql
select replace(page,'https://sqlquest.app','') page, query, sum(impressions) imp, sum(clicks) clk,
  round(sum(position*impressions)/nullif(sum(impressions),0),1) pos
from gsc_daily where query ~* 'capital ?one' and query is not null and page is not null
  and date >= (select max(date) - 27 from gsc_daily)
group by 1, 2 order by imp desc;
```

The pre-written rule (2026-09-19) stands and decides the first branch:

1. **Company page, `capital one sql interview*` ≥ 20 impressions and average
   worse than 10** → the sourced-template rebuild (the Amazon path:
   `company-interviews.js` format rows from the dated reads), and the title
   below.
2. **Still < 20 impressions on the company page** → demand or crawl, not copy:
   request indexing again, change no copy on it, and do step C below (links
   and title of the *blog*, which is the page Google already matches).
3. **The blog keeps the family and the page gets nothing** (the likely case
   on today's numbers) → stop fighting it: make the blog the door and the
   page the product. Blog title/meta stay informational; the blog's first
   screen gets one clear line into the page's runnable set and the timed
   mock. The page's title goes transactional (below).

## Changes ready for the day (apply the ones the branch calls for)

**A. Company page title/meta (branches 1 and 3).** Year + count + the thing
nobody else has, in the Shopify/best-sql-practice-sites shape:

- title: `Capital One SQL Interview Practice (2026): N Card-Data Questions + a Timed Mock | SQLQuest.app`
  — N = the page's own set count, bound by a test like the Shopify one.
- description: `Practise Capital One-style SQL on card-transaction data — accounts, merchants, transactions, chargebacks. N runnable questions and a 70-minute timed mock (12 multiple choice + 2 written SQL), in the browser, no setup.`
  (the mock's composition is ours to state; the *screen's* format stays in
  the sourced section only).
- H1 unchanged (it already carries "for the CodeSignal assessment").

**B. Inbound links (all branches, low risk).** The five SQL trap pages each
name a Capital One mock question; add one line on each — "Preparing for the
Capital One screen? [The Capital One SQL practice set →](/capital-one-sql-interview/)"
— and a link from `/sql-join-fan-out/` and `/sql-average-of-averages/`
bodies where grain is the point. Deferred until 10-12 on purpose: new inbound
links during the read would confound it.

**C. The blog post (branches 2 and 3).** Title stays informational, gains the
year where it is missing from the visible part; the intro's link to the
company page becomes the first sentence's link, and a "practise it" box sits
above the fold with the mock link (`/app/?interview=capital-one-codesignal&src=capital-one-blog`).

**D. Not doing:** importing any competitor's format numbers (they disagree
with each other and with our sources); a year in the H1; a new page for
"capital one codesignal" (the blog already owns it).

## How it is judged

Ledger claim written on 10-12 with the branch taken. Metric: gsc_daily for
both pages, 28 days after the change — clicks and CTR for the family, and
whether any `capital one sql*` query appears for the company page. Money
side: `pattern_to_checkout` and the `interview_locked` / `pattern_mock` asks
with `topic='Capital One'` (metrics.md) — the page is judged by the paid
screen it leads to, not by clicks alone.
