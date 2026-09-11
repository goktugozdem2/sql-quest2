# Why 15.7 is the wrong number, and what to move instead

**Measured 2026-09-11**, Search Console, 3 months to 09-08. Written after
`docs/plans/backlinks-2026-09-11.md` used the site-wide average position of
15.7 as the thing to improve. Query-level data says that framing is wrong, and
the real target is one page.

---

## 1. A quarter of our impressions are competitor names

Top Google queries by impressions:

| Query | Clicks | Impressions | CTR | Position |
|---|---|---|---|---|
| **stratascratch** | 4 | **8,467** | 0.0% | 7.6 |
| **datalemur** | 9 | **6,388** | 0.1% | 7.1 |
| **datalemur sql** | 7 | **1,798** | 0.4% | 7.0 |
| sql quest | 307 | 742 | **41.4%** | **2.2** |
| ctes | 0 | 517 | 0% | 30.9 |
| sql cte | 0 | 452 | 0% | 25.1 |
| cte sql | 0 | 427 | 0% | 30.8 |
| stratascratch sql | 1 | 376 | 0.3% | 8.8 |
| sql joins | 0 | 193 | 0% | 46.2 |

**Four competitor-brand queries account for 17,029 impressions — 23% of our
73,600 — and produce 21 clicks between them.** Nobody who types a company's
name clicks the seventh result. There is no title that wins a brand query from
position 7; the searcher already knows which link they want.

Those impressions are what drags the site-wide average to 15.7 and the CTR to
1.3%. **Both numbers are artifacts.** Strip the four queries and the site is a
different shape.

Two consequences:

- **Stop reporting a site-wide average position.** It moves when Google decides
  to show us more or less often for DataLemur, which is not a thing we do.
- **Do not "optimise" those queries.** The T2 retitle of `/vs-datalemur/`
  shipped today is still right for the reason it was made — the *Bing*
  positions there are 8.16-8.68 with the same zero clicks — but nobody should
  expect Google's 8,000 StrataScratch impressions to convert. They are a
  measurement problem, not an opportunity.

## 2. Our brand is safe, and worth saying out loud

`sql quest` sits at **2.2** with 41.4% CTR, `sqlquest` at **1.5** with 46.1%.
Together they are 307 of our 982 clicks — 31% of all Google traffic from 1.2%
of impressions.

Worth knowing because of what section 4 found: there is now another product
called SQLQuest.

## 3. Most of our pages are already on page one. One is not.

Top Google pages:

| Page | Clicks | Impressions | CTR | Position |
|---|---|---|---|---|
| `/` | 450 | 2,153 | 20.9% | 6.7 |
| `/revolut-sql-interview/` | 68 | 461 | 14.8% | 7.8 |
| `/best-sql-practice-sites/` | 59 | 3,486 | 1.7% | 9.7 |
| `/sql-practice-comparison/` | 57 | 8,648 | 0.7% | 8.5 |
| `/stripe-sql-interview/` | 45 | 751 | 6.0% | 10.6 |
| `/snowflake-sql-interview/` | 39 | 551 | 7.1% | 13.2 |
| `/wise-sql-interview/` | 26 | 174 | 14.9% | 8.6 |
| `/blog/faang-sql-interview-guide/` | 21 | 616 | 3.4% | 11.1 |
| **`/sql-exercises/`** | **20** | **1,250** | **1.6%** | **24.5** |
| `/blog/sql-for-fraud-analytics/` | 20 | 556 | 3.6% | 8.3 |

Positions 6.7 to 13.2 is the bottom of page one and the top of page two. That
is a normal place for a young site and it is not a crisis.

**The outlier is the whole story:**

| | Bing | Google |
|---|---|---|
| `/sql-exercises/` position | **6.36** | **24.5** |
| impressions, 3 months | **11,400** | 1,250 |
| clicks | **489** | 20 |

The same page. The same content. Eighteen positions apart, and because rank
governs how often you are shown at all, Google gives it **nine times fewer
impressions** as well. Our best door — 48% of our Bing impressions, more
solvers than any other page — is effectively absent from Google.

That single page is the target. Not 15.7.

## 4. What `sql-quest.app` turned out to be

Search Console listed it as one of only four real linking domains. It is not a
squatter and not a fan page.

**It is a different product with our name:** *SQLQuest — Master SQL Through
Detective Investigations*, a SQL mobile game for iOS and Android, French and
English, hosted at OVH, contact address a personal Gmail. Entirely separate
from us.

The reason Search Console thinks it links to us is a mistake on their side, and
it is a big one: **every page of their site carries `rel=canonical`, both
`hreflang` alternates, `og:url` and `og:image` pointing at `sqlquest.app` —
our domain, without the hyphen.** They typed their own domain wrong in their
Next.js metadata config. Their site tells Google that the canonical home of
their content is us, and their social cards serve **our** OG image.

Checked on our side: `/en/` and `/fr/` return 308 to our homepage, so anyone
their tags misdirect lands somewhere real. `og-image.png` is ours and returns
200. Nothing is broken here, and none of the 8 Google "Not found" errors comes
from this.

Nothing to fix in our code. It is worth one email from the founder — partly
because it is a genuine favour to another builder whose SEO is quietly broken,
and partly because a product with our exact name in the same category is
something we would rather know than discover from a support ticket. Contact is
published on their site.

## 5. So: how do we move position up

In order of speed, not of glamour.

**Already shipped today, and `/sql-exercises/` is what it was for.**
Internal links to it went from 31 of 141 pages to 132, and its title now
carries "practice questions". A page that underperforms its own content usually
does so for one of two reasons — nobody links to it internally, or its title
does not match the query — and today both were true at once. That is the single
most likely explanation for 24.5 against Bing's 6.36, and it cost nothing.
**Read its Google position on 2026-10-12.** Baseline 24.5.

**Next, the bottom-of-page-one pages.** `/snowflake-sql-interview/` at 13.2 and
`/stripe-sql-interview/` at 10.6 convert at 7.1% and 6.0% — they are real pages
with real intent that just sit too low. These respond to the same two levers
and to depth: a page with more of the thing it promises outranks one with less.

**Then links**, which is `docs/plans/backlinks-2026-09-11.md` and takes
quarters, not weeks. Section 3 is the clearest argument for it that we have:
the same page ranks 6 on one engine and 24.5 on the other, and the difference
between the two engines at equal content is how much they weight authority.

**And not at all:** the competitor-brand impressions. 17,029 of them, 21
clicks, and no lever.

## 6. What to change in how we report this

- Register the competitor-brand query list as an exclusion. Any future read of
  "average position" or "CTR" that includes `stratascratch`, `datalemur`,
  `datalemur sql` and `stratascratch sql` is measuring Google's opinion of our
  competitors, not our own progress.
- Read position **per page**, against the same page's Bing position. The gap
  between the two engines is the most informative number on this site and we
  had never once looked at it until today.
