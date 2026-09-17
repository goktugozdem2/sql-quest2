# SEO — the interview long tail (2026-09-17)

Point 4 of `docs/plans/interview-first-2026-09-17.md`: long-tail queries
are prioritised by interview intent first, traffic second. This file holds
the queue. Every number is from `docs/reads/seo-interview-intent-2026-09-17.md`
(GSC 28 days and 3 months to 09-14; Bing 30 D and 3 M to 09-15; Supabase
last 30 days), pulled 2026-09-17. Nothing on the site changes in this
commit.

## 1. Intent classes and the current split

The classes are the ones the Monday task (`weekly-seo-dashboard`, FRAME of
2026-09-17) now uses, applied verbatim, precedence brand → interview → tool
→ practice → learn → other:

| Class | Rule |
|---|---|
| brand | `sql quest`, `sqlquest`, `query quest`, `quest sql`, misspellings |
| **interview** | contains `interview`, `screen`, `assessment`, `codesignal`, `hackerrank`, `karat`, `analyst`, `data engineer`, `scientist`, **or a company name from `COMPANIES`** (scripts/build-company-crosslinks.mjs) |
| tool | `checker`, `formatter`, `explainer`, `optimizer` |
| practice | `practice`, `exercise`, `question`, `challenge` — with no interview word |
| learn | `tutorial`, `learn`, `how to`, `cheat sheet`, `explain` |
| other | the rest — definitional head terms (`ctes`, `sql joins`, `sql group by`) and the competitor brands (`stratascratch`, `datalemur`), which are reported as their own line |

The split, per engine (listed query rows; GSC lists at most 1,000 queries
and Bing's table sums to a fraction of its header — see the read):

| | Google 28 d | Google 3 m | Bing 30 D | Bing 3 M (top 70) |
|---|---|---|---|---|
| brand | 185 c · 492 i | 422 c · 1,239 i | 61 c · 419 i | 111 c · 949 i |
| **interview** | **17 c · 430 i · CTR 4.0%** | **32 c · 1,487 i · 2.2%** | **4 c · 34 i · 11.8%** | **7 c · 78 i** |
| practice | 11 c · 551 i · 2.0% | 16 c · 1,788 i · 0.9% | 137 c · 2,119 i · 6.5% | 214 c · ≈4.1K i |
| learn | 0 c · 97 i | 0 c · 229 i | 0 c · 11 i | — |
| tool | 0 | 0 | 0 | 0 |
| other | 20 c · 15,725 i | 41 c · 25,631 i | 6 c · 336 i | 5 c · 1,255 i |
| — competitor-brand inside other | 17 c · 13,754 i | 34 c · 20,792 i | 0 c · 63 i | 0 c · 187 i |
| interview share of listed impressions | 2.5% | 4.9% | 1.2% | ≈1% |
| interview share, brand + competitor removed | **14.1% of impressions, 54.8% of clicks** | **17.8% / 58.2%** | 1.3% / 2.7% | — |

What the split says, in three sentences:

- **On Google, the interview class is small and converts best.** 4.0% CTR
  against practice 2.0% and learn 0% (28 d); with our own brand and the
  competitor brands removed it is a seventh of the impressions and more
  than half the clicks. Two queries do most of it: `revolut sql interview
  questions` (21 i · 8 c · 2.1) and `stripe sql interview questions`
  (13 i · 5 c · 3.2).
- **Bing is a practice channel, not an interview channel.** 34 interview
  impressions in 30 days against 2,119 practice; the biggest interview row
  on Bing is `amazon sql bie interview` at 6 impressions. The Bing plan
  (`docs/plans/bing-channel-2026-09-11.md`) stands as written; nothing in
  this queue is a Bing lever.
- **"Practice" is not the same as "learner".** The practice door
  `/sql-exercises/` has the highest interview yield on the site (16.6 per
  100 landers, 72 of the 146 interview-intent people in 30 days). The
  low-yield class is **learn/definitional** (blog tutorials: ≈330 landers,
  3 interview) and **competitor-brand** (`vs-*` pages: 109 landers, 0).
  Section 3 names them.

**Interview yield** (the product-side weight): interview-intent people per
100 landers on a page, last 30 days, person = aid, internal excluded. Site
5.5. `sql-interview-prep` 17.2 · `challenges/window-functions` 16.7 (n=12) ·
`sql-exercises` 16.6 · `home` 11.6 · `wise` 11.5 · `stripe` 11.5 ·
`revolut` 8.6 · `snowflake` 8.0 · `best-sql-practice-sites` 5.1 ·
`amazon` 4.3 · company cluster 5.1 · comparisons 3.4 · blog 0.9 · every
`vs-*` page 0. Tiers used below: **1.0** ≥ 10 · **0.75** 5–9.9, or under 20
landers on a cluster ≥ 5 (company pages) · **0.5** 1–4.9, or under 20
landers on a cluster < 5 · **0.25** 0 with ≥ 20 landers, or the blog
cluster.

## 2. The queue

**The strict test — interview class, ≥ 20 impressions in 28 days, position
8–30 — returns one row on Google and none on Bing.** The one row is
`stripe sql` (29 i · 0 c · 24.1), classed interview only because "stripe" is a
company name; it is Stripe Sigma intent (the 09-07 and 09-08 reads both
said so) and has no lever. At our size the 28-day window is too short for a
queue, so the operating queue is the **3-month** rows at ≥ 20 impressions
and position 8–30, competitor-brand rows removed, with the 28-day figures
beside them; a **watch** tier holds 10–19 impressions; an **out-of-range**
table holds the families sitting past 30. Rank = 3-month impressions ×
(1 if position ≤ 15 else 0.5) × yield tier.

### (a) `<company> sql interview …`

| # | Query | 3 m i · c · pos | 28 d i · c · pos | Lands on | Yield (tier) | The one change | Score |
|---|---|---|---|---|---|---|---|
| Q1 | meta sql interview questions | 73 · 1 · 14.0 | 19 · 0 · 12.7 | /meta-sql-interview/ | 0 of 13 (0.75) | Title is already exact; H1 reads "Meta SQL Interview" — make it "Meta SQL Interview Questions", say "Facebook" once in the intro (`facebook sql interview questions` 14 i at 46 lands here), and link it from /blog/faang-sql-interview-guide/ (13 c · 8.8), the strongest FAANG page we have. | **54.8** |
| Q2 | snowflake sql practice | 69 · 6 · 15.3 | 17 · 1 · **4.3** | /snowflake-sql-interview/ | 8.0 (0.75) | None — it moved to page one inside the 28-day window on its own (the title leads with "Snowflake SQL Practice"). Monday marks it *moved*; it stays in the queue only to be read. | 51.8 |
| Q3 | uber sql interview questions | 35 · 0 · 21.3 | 10 · 0 · 24.3 | /uber-sql-interview/ | 0 of 7 (0.75) | The page has 72 impressions and 0 clicks at 11 in 28 days; `uber sql` collides with Uber's data products (09-08 read). The only change that has moved a hand-written page is the sourced format section (Amazon and Meta got one on 09-14) — **build**, and only if a dated candidate report exists. Otherwise nothing. | 13.1 |
| Q4 | snowflake sql interview questions | 25 · 0 · 8.7 | 6 · 0 · 9.0 | /snowflake-sql-interview/ | 8.0 (0.75) | Title carries "Practice … + Interview Patterns"; the interview query sits at 8.7 with 0 clicks while the practice query converts at 8.7% CTR. Retitle to carry both nouns — "Snowflake SQL Interview Questions & Practice — 95 Runnable Challenges" — with the practice CTR as the guardrail. | 18.8 |
| Q5 | apple sql interview questions | 21 · 1 · 13.9 | 12 · 1 · 11.7 | /apple-sql-interview/ | 0 of 11 (0.75) | Same H1 fix as Meta ("Apple SQL Interview" → "… Questions") and a link from the FAANG guide. Low expectation: Apple's page space is the same mass-brand collision as Google's. | 15.8 |
| W1 | "snowflake questions" | 19 · 0 · 14.6 | 16 · 0 · 14.0 | /snowflake-sql-interview/ | 8.0 (0.75) | Rides on Q4. | 14.3 |
| W2 | jp morgan sql interview questions | 11 · 0 · 7.3 | 9 · 0 · 7.4 | /jpmorgan-sql-interview/ | 0 of 11 (0.75) | Page one, 0 clicks from 17 impressions: meta description only — lead with the format line the page already states. | 8.3 |
| W3 | google data analyst interview sql window functions | 16 · 0 · 7.7 | — | /google-sql-interview/ | 0 of 11 (0.75) | Already page one and the title already says "Window Functions for Analysts"; description only. | (below 8) |

Companies with tags but no page: **none** — all 30 tagged companies have a
page, and no untagged company name appears in either console (the 09-09
read explains why GSC cannot surface one). No page candidates from this
data.

### (b) Role queries

| # | Query family | 3 m i · c · pos | 28 d | Lands on | Yield (tier) | The one change | Score if in range |
|---|---|---|---|---|---|---|---|
| B1 | sql interview questions for data analyst(s) · data analyst sql interview questions · sql interview questions for business analyst · sql analyst interview questions | 65 · 0 · 40–47 | 32 · 0 · 41–50 | /sql-interview-questions-data-analyst/ (28 d: 190 i · 4 c · 26.7) | 0 of 25 (0.25) | **Out of range** (past 30). The page exists and has 5 internal links; the change is inbound links from the pages that rank — the interview hub's intro and the readiness block every company page carries (that block is injected by `build-company-pages.mjs`, so a **build**). Not a new page. | 8.1 |
| — | spotify data scientist interview | 10 · 0 · 41.1 | — | /spotify-sql-interview/ | 0 of 7 | Nothing. | — |

### (c) Pattern queries

**Empty at the threshold.** No query with an interview word and a pattern
reaches 20 impressions on either engine in either window. The whole set:
`google data analyst interview sql window functions` 16 (W3 above),
`jpmorgan chase sql interview recursive queries window functions 2025` 6 at
3.2, `sql window function questions` 3 at 37, and on Bing `rank vs
row_number` 6, `row_number vs rank` 4, `dense rank vs row number` 2, `sql
anti join` 2, `practice window functions sql` 2. The pattern demand we do
see is learn-class (`sql running total` 54 at 12.9 → /blog/sql-running-total/;
`nested cte` 49 at 11.6 → the CTE tutorial) and practice-class on the topic
pages (`/challenges/window-functions/` 194 i · 6 c · 22.4;
`/challenges/joins/` 306 i · 1 c · 49.4; `/challenges/aggregation/` 238 · 0 ·
14.2). One topic page shows interview yield — `/challenges/window-functions/`,
2 of 12 — and it is the one the FAANG guide and the Google page point at.
Nothing to build for interview intent here; re-read at the 10-12 four-week
read. Do not map `/questions/<slug>/` pages to anything yet: 64 of 299 have
an impression, 133 impressions in total, 2 clicks.

### (d) Assessment-platform queries

| # | Query family | 3 m i · c · pos | 28 d | Lands on | Yield (tier) | The one change | Score |
|---|---|---|---|---|---|---|---|
| D1 | hackerrank sql track · hackerrank sql practice official 2026 · is hackerrank sql certification worth it · hackerrank sql official 2026 · hackerrank sql | 47+20+15+12 = 94 · 0 · 8.3–9.6 | 10+5 · 0 · 7.6 / 3.4 | /vs-hackerrank-sql/ (3 m: 95 i · 0 c · 8.4; 28 d: 167 i · 2 c · 7.7) | 1 of 6 (comparisons 0.5) | The page is a comparison titled "SQL Quest vs HackerRank SQL"; the queries ask about the *track* and the *certification*. Add two FAQ entries that answer them by name ("Is the HackerRank SQL track enough for an interview?", "Is the HackerRank SQL certification worth it?"). Copy only; the FAQ JSON-LD on that page must mirror the visible text. | **23.5** (family 47) |
| D2 | capital one data analyst assessment · capital one data analyst codesignal assessment · capital one codesignal questions · code signal data analytics assessment · capital one code assessment | 14+5+1+1+1 · 0 · 4.8–8.9 | 14+5+1 · 0 · 4.8–8.9 | /blog/capital-one-codesignal-data-analyst-assessment/ (28 d: 105 i · 5 c · 9.2) and /capital-one-sql-interview/ (24 i · 0 c · 7.8) | blog 0 of 12, page 0 of 7 (0.5) | Two pages split one query family. Link the blog post's opening paragraph to the company page and put "CodeSignal assessment" in the company page's H1 span (it is in the title, not the H1). Copy only. This is the payer-signal company (memory: capital-one-payer-signal); the yield here is n = 19 and says nothing yet. | 7.0 |
| — | codesignal (generic), karat, coderpad | 0 · — | Bing `coderpad practice exercises sql` 2 | — | — | Nothing appears. | — |

### Out of range (past 30) — read, do not chase yet

| Family | 3 m i · c · pos | Lands on | Note |
|---|---|---|---|
| amazon interview questions on sql · amazon sql interview questions · sql preparation for amazon interview · amazon sql interview | 84+23+18+9 = **134 · 0 · 29–38** | /amazon-sql-interview/ (`*amazon`: 165 i · 0 c · 35.1 over 3 m; 28 d 155 i · 2 c · 15.1) | The biggest interview family on Google and the page with the most content (3,150 words, 34 challenge links) — zero clicks in three months. The 09-08 read blamed Redshift for `amazon sql`; these queries say "interview questions" and still sit at 35, so the page itself is not rated. It received a sourced format section on 09-14 (commit 3944b14). **Read its position on 2026-10-12 before doing anything else**; if still past 30, the move is the template rebuild (build), the same move as Tesla. |
| sql interview preparation course · sql interview prep guide · sql interview preparation and mastery | 42+16+9 · 0 · 27–38 | /sql-interview-prep/ (`*sql interview prep`: 78 i · 0 · 33.2) | The hub has the best yield on the site (17.2) and ranks 33 for its own name. Its H1 says "SQL Interview"; nothing says "preparation" or "guide" above the fold. Copy fix, low expectation until links land. |
| google sql interview questions · google sql interview | 30+8 · 0 · 25–32 | /google-sql-interview/ | Mass-brand collision (09-08). Description only. |
| facebook sql interview questions | 14 · 0 · 46 | /meta-sql-interview/ | Rides on Q1. |

**Queue length: 7 rows in range (Q1–Q5, D1, D2) + 3 watch rows (W1–W3) +
1 out-of-range role family (B1) + 4 out-of-range families.** Top five by
score: Q1 Meta 54.8 · Q2 Snowflake practice 51.8 (already moved) · D1
HackerRank family 23.5 · Q4 Snowflake interview 18.8 · Q5 Apple 15.8.

Not in the queue, on purpose: every `datalemur … interview … official` /
`stratascratch … interview … platform` row (≈ 250 impressions at 5–9, 0
clicks; they read as AI grounding queries and a brand searcher does not
click result seven) and `stripe sql` (Sigma).

## 3. Queries to stop optimising for

Named so the Monday read does not count them as wins when their impressions
move. High volume, zero or near-zero interview yield on the page they land
on:

| Family | Volume | Lands on | Yield |
|---|---|---|---|
| **CTE definitional**: `ctes`, `sql cte`, `cte sql`, `cte in sql`, `what is cte in sql`, `cte meaning sql`, `cte sql example`, `cte syntax`, `ctes sql`, `cte sql query` | ≈ 2,300 i · 0 c · 26–47 (Google 3 m); Bing `cte acronym meanings education sql` 795 i · 0 c · 5.9 | /blog/sql-cte-tutorial/ | 51 landers · 3 opened · 0 interview |
| **JOIN definitional**: `sql joins`, `joins in sql`, `joins`, `sql joins explained`, `2026 sql joins` | ≈ 420 i · 0 c · 5–53 | /blog/sql-joins-explained/ | 17 landers · 0 opened |
| **GROUP BY head term**: `sql group by`, `group by sql`, `sql select group by` | ≈ 200 i · 0 c · 65–72 | /blog/sql-group-by-tutorial/ | 19 landers · 0 opened |
| **Competitor brands**: `stratascratch`, `datalemur`, `datalemur sql`, `stratascratch sql`, `data lemur sql`, misspellings, and the `… official / platform / 2026` variants | 13,754 of 17,295 listed Google impressions in 28 d · 17 c | /vs-stratascratch/ 36 landers · 0 interview; /vs-datalemur/ 24 · 0; /vs-leetcode-sql/ 43 · **0 app opens** | 0 |
| `sql side quest` | 154 i · 0 c · 7.1 | / | Another product's name (`sql-quest.app`, google-position read §4); not ours |
| Bing `sql practice` (generic), `test query` | 438 i · 4 c · 8.3; 147 i · 0 c · 8 | /sql-exercises/ | generic single-word intent; `sql practice questions` / `exercises` are the ones that convert and are already the Bing T1 |
| `null handling` family | /blog/null-handling-mistakes/ 1,095 i · 4 c · 9.9 (28 d) | 37 landers · 0 opened | 0 |

What is **not** on this list: `sql practice questions`, `sql practice
exercises`, `sql exercises` (Bing; 6–10% CTR, landing on the page with the
best interview yield) and `best sql practice platform` (Google, 16.7% CTR,
best-sites yield 5.1). The frame says a learner query is worth less than a
candidate with a date; the data says the practice queries are how most
candidates arrive.

## 4. Top 10 actions, in order

None is a new hand-written page (the rule); none touches the homepage title
or H1 (fixed 09-14). **Copy** = safe now, no build step beyond the static
page build; **build** = a generator or data-file change.

1. **Q4, copy.** Retitle `/snowflake-sql-interview/` to carry "Interview Questions" beside "Practice"; guardrail: `snowflake sql practice` CTR (8.7% over 3 m) must not fall. Read 10-12.
2. **Q1, copy.** Meta H1 "Meta SQL Interview" → "Meta SQL Interview Questions"; "Facebook" once in the intro; a link to it from `/blog/faang-sql-interview-guide/`.
3. **D1, copy.** Two FAQ entries on `/vs-hackerrank-sql/` answering the HackerRank *track* and *certification* questions by name; JSON-LD mirrors the visible FAQ. 94 impressions at 8–10 with 0 clicks.
4. **D2, copy.** Link the Capital One blog post's first paragraph to `/capital-one-sql-interview/`; add "CodeSignal assessment" to the company page's H1 span so one page owns the family.
5. **Q5, copy.** Apple H1 "→ … Questions" and the same FAANG-guide link as Meta. Do it in the same edit as 2; expect little.
6. **B1, build.** Add a "SQL interview questions for data analysts" link to the readiness block that `scripts/build-company-pages.mjs` injects into every company page, and to the interview hub's intro (`scripts/build-interview-hub.mjs`); run both generators + cross-links + build. 65 impressions past 40 with the page already written.
7. **Out-of-range Amazon, read first.** On 2026-10-12 read `*amazon` position (baseline 35.1, 165 i, 0 c over 3 m); only if still past 30, rebuild the page on the sourced template (build, `company-interviews.js` already holds Amazon's format rows).
8. **W2 + W3, copy.** Meta descriptions for `/jpmorgan-sql-interview/` and `/google-sql-interview/` leading with the format line each page already states — page one, 0 clicks, nothing else to change.
9. **Q3, build, conditional.** Uber gets a `SOURCED_FORMATS` entry only if a dated candidate report exists (docs/reads/company-research-*); no source, no change.
10. **Read side, no site change.** The Monday task's fifth row set reads this queue (§5); and `/sql-interview-readiness-test/` (27 landers, 0 `app_opened` in 30 days) gets its own read — it is either a funnel hole or an attribution hole, and the plan's yield tier for it is wrong until we know which.

The order is the score order with the reads placed where they gate the next
action. Items 1–5 and 8 are one copy commit; 6 is one generator commit.

## 5. How the Monday read scores this

The `weekly-seo-dashboard` task classifies every query in its sections A, B
and D into the six classes of §1, prints the intent split (clicks and
impressions per class, W vs W-1, and the interview class's share) under
section A, adds an `intent` column to section D, and adds a fifth row set:
the top 10 interview-class queries by impressions at position 8–30 with
their landing page. From this file it reads the queue (Q1–Q5, W1–W3, B1,
D1, D2 and the out-of-range families), records each row's position and
impressions for the week, and marks a row **moved** when its position
improves by 2 or more or it earns its first click — Q2 is already marked
moved. The week's score is the non-brand interview-class clicks and the
sum over landing pages of landers × interview yield, not total impressions
and not average position: a week where `ctes` or `stratascratch` doubles
counts for nothing, a week where `meta sql interview questions` earns three
clicks counts even if the site-wide numbers fall. The interview-class share
of non-brand, non-competitor impressions (14.1% on the 28 d baseline) is the
line to watch drift; the yield table is re-pulled with
`docs/reads/seo-interview-intent-2026-09-17.md`'s §J query at the 10-12
four-week read, not weekly, because 146 interview-intent people a month do
not split across 50 pages in a week. A queued query that does not move in
two four-week reads after its action shipped leaves the queue.

## Applied 2026-09-17 — the copy batch (§4 items 1–5 and 8)

One commit, `seo(copy): interview-intent titles, H1s and links from the
long-tail queue`. Every page below is hand-written (`src/<slug>.html`); none
of the seven generated pages was touched, and `src/data/company-interviews.js`
is unchanged. No format claim was added anywhere; the only platform word
added is on the Capital One page, which is in `SOURCED_PAGES`. Baselines are
the read's numbers (GSC, 3 m to 09-14 · 28 d to 09-14, as i · c · pos); the
Monday task re-reads each row and marks it *moved* on +2 positions or a first
click.

| § | Page | What changed (before → after) | Re-read on Monday |
|---|---|---|---|
| 1 · Q4 | `/snowflake-sql-interview/` | `<title>`, `og:title`, `twitter:title`: **"Snowflake SQL Practice — 95 Runnable Challenges + Interview Patterns \| SQLQuest.app" → "Snowflake SQL Interview Questions & Practice — 95 Runnable Challenges \| SQLQuest.app"**. H1 untouched — it already read "Snowflake SQL Interview / Questions". Description untouched. | `snowflake sql interview questions` 25 · 0 · 8.7 (28 d 6 · 0 · 9.0); W1 `"snowflake questions"` 19 · 0 · 14.6 (28 d 16 · 0 · 14.0). **Guardrail** `snowflake sql practice` 69 · 6 · 15.3, CTR 8.7% (28 d 17 · 1 · 4.3) — if its CTR falls at the 10-12 read, revert the title. |
| 2 · Q1 | `/meta-sql-interview/` + `/blog/faang-sql-interview-guide/` | **H1 not changed** — it already reads "Meta SQL Interview / Questions" (the queue read only the text before the `<br>`). **"Facebook" not added** — the intro has carried "Meta (formerly Facebook)" since 09-07. The FAANG guide already linked the page from its company table and footer; the intro paragraph now links "Meta" as well. | `meta sql interview questions` 73 · 1 · 14.0 (28 d 19 · 0 · 12.7); `facebook sql interview questions` 14 · 0 · 46.0. Expect little — the on-page fixes were already in place. |
| 3 · D1 | `/vs-hackerrank-sql/` | FAQ 7 → 8 entries, JSON-LD and the visible `FAQS` array identical (verified on the built page). New: **"Is the HackerRank SQL track enough for an interview?"** — the track described only from `docs/reads/alternatives-facts-2026-09-13.md` §4 (subdomains, free with an account, MySQL/Oracle/T-SQL/DB2), then what an interview adds and what we grade. Renamed: **"Is the HackerRank SQL certificate worth it?" → "Is the HackerRank SQL certification worth it?"** (answer unchanged) so the entry carries the query's own noun. No number about HackerRank was added. | `hackerrank sql track` 47 · 0 · 8.3 (28 d 10 · 0 · 7.6); `is hackerrank sql certification worth it` 15 · 0 · 9.3; `hackerrank sql practice official 2026` 20 · 0 · 9.6; `hackerrank sql official 2026` 12 · 0 · 8.6. Page: 95 · 0 · 8.4 (28 d 167 · 2 · 7.7). |
| 4 · D2 | `/capital-one-sql-interview/` + `/blog/capital-one-codesignal-data-analyst-assessment/` | H1: **"Capital One SQL Interview / Questions" → "Capital One SQL Interview Questions / for the CodeSignal assessment"** (span text). The blog post's intro paragraph gained one sentence linking the company page ("The runnable practice cut for the same screen is the Capital One SQL interview questions page") — it already linked it from the skip-ahead box, day 9, the closing CTA and the related list. Title and description untouched. | `capital one data analyst assessment` 14 · 0 · 8.9 (same in 28 d); `capital one data analyst codesignal assessment` 5 · 0 · 4.8 (28 d). Blog 28 d 105 · 5 · 9.2; company page 28 d 24 · 0 · 7.8 — the read is whether the family's landing page shifts from the post to the company page. |
| 5 · Q5 | `/apple-sql-interview/` + FAANG guide | **H1 not changed** — already "Apple SQL Interview / Questions". The FAANG guide had no link to the Apple page at all: added in the intro paragraph, on the company-table row (the only unlinked row), and in the footer strip. | `apple sql interview questions` 21 · 1 · 13.9 (28 d 12 · 1 · 11.7). |
| 8 · W2 | `/jpmorgan-sql-interview/` | `description`, `og:description`, `twitter:description`: **"Practice the SQL patterns JPMorgan tests in data analyst and quantitative analyst interviews. Financial metrics, risk analytics, customer segmentation, and regulatory reporting with AI tutoring. Free." → "JPMorgan SQL interview questions with runnable answers: bank league tables, capital and credit-quality ratios, quarter-over-quarter growth on real FDIC call-report data. In-browser, AI tutor, no signup to start."** The queue said "lead with the format line the page already states"; the page states no format (it is not in `SOURCED_PAGES`), so the description leads with the query's noun and the page's real data instead. | `jp morgan sql interview questions` 11 · 0 · 7.3 (28 d 9 · 0 · 7.4); page (`morgan`) 17 · 0 · 5.8. |
| 8 · W3 | `/google-sql-interview/` | `description`, `og:description`, `twitter:description`: **"Google SQL interview questions with runnable answers: ROW_NUMBER top-N per group, LAG month-over-month, CTEs. 32 challenges in-browser, no signup. Sep 2026." → "Google data analyst SQL interview questions with runnable answers: window functions (ROW_NUMBER top-N per group, LAG month-over-month), CTEs, conditional aggregation. 32 challenges in-browser, no signup."** Title/H1 untouched. | `google data analyst interview sql window functions` 16 · 0 · 7.7; `google sql interview questions` 30 · 0 · 32.0 (28 d 11 · 0 · 27.6). |

Not applied, on purpose: **6** (B1, a generator change), **7** (Amazon —
read 10-12 first), **9** (Uber — no dated candidate report exists in
`docs/reads/`), **10** (read side). Homepage title and H1 untouched.

Found while applying: `scripts/build-company-pages.mjs` is not idempotent on
whitespace — every rerun prepends one more blank line before each injected
block on all 30 company pages (20 unrelated pages moved on a no-data rerun).
The churn was reverted here rather than committed; fix it in its own change.
