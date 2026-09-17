# Search queries by intent class — raw numbers, 2026-09-17

Pulled 2026-09-17 by hand in the browser (Chrome MCP, read-only: date
ranges and the `query=*` contains-filter only). Feeds
`docs/plans/seo-interview-longtail-2026-09-17.md`. Product side from
Supabase `pro_events` (read-only), internal accounts excluded.

## Sources and windows

| Source | Window | Header totals |
|---|---|---|
| Google Search Console, `sc-domain:sqlquest.app`, Performance → Search results, Web | **28 days**, 2026-08-18 → 09-14 (last update 3.5 h before the read) | 527 clicks · 34.1K impressions · CTR 1.5% · position 15 |
| same | **3 months**, 2026-06-15 → 09-14 | 1.1K clicks · 77.6K impressions |
| Bing Webmaster Tools, site `sqlquest.app` (picker checked), Search Performance → Keywords, Web only | **30 D**, 2026-08-18 → 09-15 | 478 clicks · 11.3K impressions · CTR 4.24% |
| same | **3 M**, 2026-06-17 → 09-15 | 944 clicks · 27K impressions · CTR 3.5% |
| Supabase `pro_events` | last 30 days to 2026-09-17 | 2,639 landing people |

Coverage caveats, stated once:

- GSC's query table is capped at **1,000 rows**. The 28-day rows sum to
  233 clicks / 17,295 impressions of the 527 / 34.1K header; the 3-month
  rows to 511 / 30,374 of 1.1K / 77.6K. The rest is the anonymised long
  tail Google does not list. Every class split below is over the listed
  rows, so treat shares as shares of the *listed* set.
- Bing's 30 D keyword list has 345 rows; **180 were collected** (every row
  with ≥ 2 impressions; the uncollected 165 have 1 impression each, and
  page 1's last ten rows, 2 impressions each, were not rendered). Listed
  rows sum to 208 clicks / 2,919 impressions against the 478 / 11.3K
  header — Bing's keyword table is far from the header, as its own note
  says (Web only, and unlisted queries). The 3 M list has 932 rows; the
  **top 70 by impressions** were collected.
- Bing renders its keyword grid virtualised, 100 rows a page, ~70 in the
  DOM at a time; scroll the `.mainContainer.scrollVisible` container with
  JS (no `await` — an awaited loop froze the renderer for 45 s) and merge.
  `Download all` was not used (a file download).

## Intent classes (the Monday task's FRAME definition, applied verbatim)

Precedence: brand → interview → tool → practice → learn → other.

- **brand**: `sql quest`, `sqlquest`, `query quest`, `quest sql`, `sqlqest`, `sqlクエスト`, `sql side quest`
- **interview**: contains `interview`, `screen`, `assessment`, `codesignal` / `code signal`, `hackerrank`, `karat`, `analyst`, `data engineer`, `scientist`, or a company name from `COMPANIES` in `scripts/build-company-crosslinks.mjs`
- **tool**: `checker`, `formatter`, `explainer`, `optimizer`
- **practice**: `practice`, `exercise(s)`, `question(s)`, `challenge(s)` without an interview word
- **learn**: `tutorial`, `learn`, `how to`, `cheat sheet`, `explain`
- **other**: everything else — the definitional head terms (`ctes`, `sql joins`, `sql group by`) land here under the strict definition, as do the competitor brands (`stratascratch`, `datalemur`), which are reported as a sub-line.

Two classification traps the definition carries, so the Monday read knows
them: a company name alone makes a query "interview" (`stripe sql` is
Stripe Sigma intent, `snowflake sql practice` is practice intent — both
count as interview here); and `datalemur sql interview questions official`
is interview-class by the word but has no lever (see the competitor line).

## A. Google, 28 days (listed rows: 233 clicks, 17,295 impressions)

| Class | Queries | Clicks | Impressions | CTR | Share of impressions | Share of clicks |
|---|---|---|---|---|---|---|
| brand | 21 | 185 | 492 | 37.6% | 2.8% | 79.4% |
| **interview** | 100 | **17** | **430** | **4.0%** | **2.5%** | **7.3%** |
| practice | 112 | 11 | 551 | 2.0% | 3.2% | 4.7% |
| learn | 51 | 0 | 97 | 0% | 0.6% | 0% |
| tool | 0 | 0 | 0 | — | — | — |
| other | 716 | 20 | 15,725 | 0.1% | 90.9% | 8.6% |
| — of which competitor-brand (`stratascratch*`, `datalemur*`, `data lemur*`, misspellings) | 116 | 17 | 13,754 | 0.1% | 79.5% | 7.3% |

Excluding brand and competitor-brand rows (3,049 impressions, 31 clicks):
interview is **14.1% of impressions and 54.8% of clicks**, at 4.0% CTR
against practice 2.0% and learn 0%.

## B. Google, 3 months (listed rows: 511 clicks, 30,374 impressions)

| Class | Queries | Clicks | Impressions | CTR | Share of impressions | Share of clicks |
|---|---|---|---|---|---|---|
| brand | 25 | 422 | 1,239 | 34.1% | 4.1% | 82.6% |
| **interview** | 123 | **32** | **1,487** | **2.2%** | **4.9%** | **6.3%** |
| practice | 140 | 16 | 1,788 | 0.9% | 5.9% | 3.1% |
| learn | 43 | 0 | 229 | 0% | 0.8% | 0% |
| tool | 0 | 0 | 0 | — | — | — |
| other | 669 | 41 | 25,631 | 0.2% | 84.4% | 8.0% |
| — of which competitor-brand | 175 | 34 | 20,792 | 0.2% | 68.5% | 6.7% |

Excluding brand and competitor-brand (8,343 impressions, 55 clicks):
interview is **17.8% of impressions and 58.2% of clicks**.

## C. Bing, 30 D (180 collected rows: 208 clicks, 2,919 impressions)

| Class | Queries | Clicks | Impressions | CTR | Share of impressions | Share of clicks |
|---|---|---|---|---|---|---|
| **practice** | 72 | **137** | **2,119** | **6.5%** | **72.6%** | **65.9%** |
| brand | 18 | 61 | 419 | 14.6% | 14.4% | 29.3% |
| **interview** | 15 | **4** | **34** | 11.8% | **1.2%** | **1.9%** |
| learn | 8 | 0 | 11 | 0% | 0.4% | 0% |
| tool | 0 | 0 | 0 | — | — | — |
| other | 67 | 6 | 336 | 1.8% | 11.5% | 2.9% |

Every Bing interview-class row, 30 D (impressions · clicks · position):
`amazon sql bie interview` 6·1·2.2 · `snowflake quiz sample question` 5·1·5 ·
`amazon sql interview questions` 3·0·4.7 · `sql interview exercises` 2·1·1 ·
`sql interview preparation` 2·0·1 · `amazon sql phone interview` 2·0·9 ·
`amazon sql bie interview medium` 2·0·8 · `what is google cloud sql api interview` 2·0·10 ·
seven more at 1–2 impressions.

## D. Bing, 3 M (top 70 rows by impressions)

| Class | Queries | Clicks | Impressions |
|---|---|---|---|
| practice | 32 | 214 | ≈ 4.1K (`sql practice questions` 1.3K, `sql practice exercises` 822, `sql practice` 539, `sql exercises` 521, `sql query practice` 169, `datalemur sql practice` 129, `sql exercises for practice` 92, `sql queries practice` 75, `sql bolt exercises` 74, `sqlzoo practice exercises` 57, `sql practice problems` 44, 21 rows under 40) |
| brand | 12 | 111 | 949 |
| other | 17 | 5 | 1,255 (of which `cte acronym meanings education sql` 795 · 0 clicks · 5.94; `datalemur` 187; `test query` 147) |
| **interview** | 9 | **7** | **78** |

Bing 3 M interview rows: `amazon sql interview questions` 16·3·3.8 ·
`comprehensive sql topics for faang interviews` 12·0·3.3 · `sql topic wise
practice questions` 10·2·4.1 (analyst-less; classed by "questions"? no — by
nothing; listed because the grid matched "interview" in a sibling row —
disregard) · `sql interview questions product analytics joins retention churn
attendance payments` 8·0·3.3 · `anti-spam analyst interview sql patterns`
7·0·4 · `amazon sql bie interview` 7·1·2.9 · `best sql practice platforms data
engineer interviews 2026` 5·0·4 · `snowflake quiz sample question` 5·1·5.

## E. Google interview-class queries, 3 months, ≥ 8 impressions (query · impressions · clicks · position)

```
stripe sql                                              147  0  23.7   (Stripe Sigma intent — company-name rule)
amazon interview questions on sql                        84  0  37.5
meta sql interview questions                             73  1  14.0
snowflake sql practice                                   69  6  15.3   (28d: 17 · 1 · 4.3)
hackerrank sql track                                     47  0   8.3
datalemur sql interview questions official               45  0   5.9   (competitor)
stripe sql interview questions                           43 10   4.1
sql interview preparation course                         42  0  33.4
revolut sql interview questions                          40 12   3.4
uber sql interview questions                             35  0  21.3
sql interview questions for data analyst                 35  0  46.4
stratascratch sql interview questions official           34  0   7.5   (competitor)
google sql interview questions                           30  0  32.0
snowflake sql interview questions                        25  0   8.7
datalemur official sql interview questions               24  0   5.6   (competitor)
faang sql interview questions                            23  1   7.8
amazon sql interview questions                           23  0  31.7
apple sql interview questions                            21  1  13.9
stratascratch sql interview practice platform            20  0   8.6   (competitor)
hackerrank sql practice official 2026                    20  0   9.6
datalemur sql interview practice platform                19  0   8.5   (competitor)
"snowflake questions"                                    19  0  14.6
stratascratch sql interview practice platform official   18  0   8.9   (competitor)
sql preparation for amazon interview                     18  0  34.8
datalemur sql interview practice official                17  0   6.2   (competitor)
google data analyst interview sql window functions       16  0   7.7
stratascratch sql interview practice site                16  0   9.1   (competitor)
sql interview prep guide                                 16  0  26.7
is hackerrank sql certification worth it                 15  0   9.3
sql practice platforms leetcode hackerrank stratascratch 14  0   4.6
capital one data analyst assessment                      14  0   8.9
facebook sql interview questions                         14  0  46.0
datalemur sql interview questions official 2026          13  0   8.9   (competitor)
hackerrank sql official 2026                             12  0   8.6
sql interview questions for data analysts                12  0  40.2
jp morgan sql interview questions                        11  0   7.3
stratascratch sql interview practice official            11  0   8.9   (competitor)
best sql practice platforms leetcode hackerrank stratascratch 10 0 6.8
stratascratch official sql interview questions           10  0   7.4   (competitor)
datalemur sql interview questions 2026                   10  0   8.7   (competitor)
spotify data scientist interview                         10  0  41.1
data analyst sql interview questions                     10  0  45.8
datalemur sql interview questions platform                9  0   8.6   (competitor)
datalemur sql interview practice site                     9  0   9.0   (competitor)
amazon sql interview                                      9  0  29.3
sql interview preparation and mastery                     9  0  37.7
stratascratch official sql interview practice             8  0   8.2   (competitor)
google sql interview                                      8  0  25.1
sql interview questions for business analyst              8  0  47.4
```

The `… official`, `… platform`, `… 2026` competitor rows read like AI-assistant
grounding queries (the same shapes appear in Bing's Copilot panel), not
typed searches; 0 clicks at position 6–9 across all of them.

## F. Google interview-class queries, 28 days, ≥ 5 impressions

```
amazon interview questions on sql              30  0  32.6
stripe sql                                     29  0  24.1
revolut sql interview questions                21  8   2.1
meta sql interview questions                   19  0  12.7
sql interview preparation course               18  0  28.9
snowflake sql practice                         17  1   4.3
sql interview questions for data analyst       17  0  50.1
"snowflake questions"                          16  0  14.0
capital one data analyst assessment            14  0   8.9
stripe sql interview questions                 13  5   3.2
apple sql interview questions                  12  1  11.7
google sql interview questions                 11  0  27.6
hackerrank sql track                           10  0   7.6
uber sql interview questions                   10  0  24.3
jp morgan sql interview questions               9  0   7.4
amazon sql interview questions                  9  0  30.7
faang sql interview questions                   8  1   6.2
jpmorgan chase sql interview recursive queries window functions 2025  6 0 3.2
snowflake sql interview questions               6  0   9.0
sql interview questions for business analyst    6  0  47.3
data analyst sql interview questions            6  0  47.7
hackerrank sql                                  5  0   3.4
capital one data analyst codesignal assessment  5  0   4.8
datalemur sql interview questions official      5  0   5.8   (competitor)
datalemur sql interview practice official       5  0   6.2   (competitor)
sql interview prep guide                        5  0  26.4
```

Strict queue test — **interview class, ≥ 20 impressions in 28 days, position
8–30: exactly one row, `stripe sql` (29 · 0 · 24.1), and it is the Sigma
trap.** Nothing on Bing qualifies (max interview impressions 6). The plan's
queue is therefore built on the 3-month rows with the 28-day figures beside.

## G. Landing page per queue query (GSC, 3 months, `query=*<contains>` → Pages)

| Contains-filter | Page | Clicks | Impressions | Position |
|---|---|---|---|---|
| `stripe sql` | /stripe-sql-interview/ | 10 | 190 | 19.3 |
| `meta sql interview` | /meta-sql-interview/ | 1 | 73 | 14.0 |
| `snowflake sql practice` | /snowflake-sql-interview/ | 6 | 69 | 15.3 |
| `hackerrank sql` | /vs-hackerrank-sql/ 95 · 0 · 8.4; /sql-practice-comparison/ 10 · 0 · 8.5 | 0 | 106 | — |
| `uber sql interview` | /uber-sql-interview/ | 0 | 35 | 21.3 |
| `snowflake sql interview` | /snowflake-sql-interview/ | 0 | 25 | 8.7 |
| `apple sql interview` | /apple-sql-interview/ | 1 | 21 | 13.9 |
| `sql interview prep` | /sql-interview-prep/ | 0 | 78 | 33.2 |
| `sql interview preparation` | /sql-interview-prep/ | 0 | 58 | 35.1 |
| `capital one` | /blog/capital-one-codesignal-data-analyst-assessment/ | 1 | 23 | 13.4 |
| `google data analyst interview` | /google-sql-interview/ | 0 | 16 | 7.7 |
| `sql interview questions for data analyst` | /sql-interview-questions-data-analyst/ | 0 | 51 | 44.7 |
| `amazon` | /amazon-sql-interview/ | 0 | 165 | 35.1 |
| `morgan` | /jpmorgan-sql-interview/ | 0 | 17 | 5.8 |
| `facebook` | /meta-sql-interview/ | 0 | 14 | 46.0 |

## H. Google pages, 28 days (clicks · impressions · position)

Clusters (pages with ≥ 1 impression; position impression-weighted):

| Cluster | Pages | Clicks | Impressions | Position |
|---|---|---|---|---|
| home | 1 | 214 | 975 | 6.7 |
| company pages | 25 | 137 | 2,420 | 9.5 |
| comparisons | 7 | 90 | 18,920 | 7.2 |
| blog | 37 | 48 | 10,527 | 27.7 |
| hubs | 6 | 18 | 1,206 | 19.5 |
| topic pages | 11 | 12 | 1,097 | 30.6 |
| question pages | 64 | 2 | 133 | 6.4 |
| tools & tests | 2 | 2 | 68 | 20.7 |
| other | 17 | 6 | 812 | 14.2 |

Company pages: revolut 50·337·6.9 · snowflake 25·244·11.1 · stripe 17·256·7.8 ·
wise 13·92·7.6 · shopify 4·349·7.2 · meta 3·155·12.6 · jpmorgan 3·100·7.8 ·
spotify 3·64·10.2 · apple 3·60·8.8 · google 2·176·8.6 · amazon 2·155·15.1 ·
airbnb 2·102·14.8 · anthropic 2·36·9.6 · databricks 2·32·12.4 · ramp 2·30·8.9 ·
openai 2·28·9.6 · netflix 1·46·10.6 · nvidia 1·24·10 · uber 0·72·11 ·
capital-one 0·24·7.8 · plaid 0·18·15.9 · morgan-stanley 0·12·3.2 ·
doordash 0·4·7.2 · tiktok 0·3·10.3 · walmart 0·1·9 (goldman-sachs, linkedin,
microsoft, bloomberg, tesla: no impression row).

Topic and question pages with ≥ 5 impressions: /challenges/window-functions/
6·194·22.4 · /challenges/cte/ 3·187·45.5 · /challenges/subqueries/ 2·65·13.3 ·
/challenges/joins/ 1·306·49.4 · /challenges/aggregation/ 0·238·14.2 ·
/challenges/ 0·45·20.7 · /challenges/date-functions/ 0·25·7.1 ·
/challenges/null-handling/ 0·17·6.1 · /questions/left-join-null-semantics-inactive-customers/ 0·9·7.1 ·
/challenges/case-when/ 0·8·9.6 · /questions/left-join-keep-everyone/ 0·8·12.1 ·
/questions/self-join-employee-and-manager/ 0·7·5.7 ·
/questions/salary-vs-department-average-partition-by/ 0·6·3.5 ·
/challenges/ranking-functions/ 0·6·6.2 · /challenges/string-functions/ 0·6·7.3.

Other pages, top of the list: / 214·975·6.7 · /best-sql-practice-sites/
48·1,979·6.9 · /sql-practice-comparison/ 21·1,481·8.6 ·
/blog/faang-sql-interview-guide/ 13·225·8.8 · /vs-datalemur/ 12·6,285·6.5 ·
/sql-exercises/ 11·422·25.6 · /blog/sql-for-fraud-analytics/ 11·382·6.6 ·
/vs-stratascratch/ 6·8,836·7.6 · /blog/sql-cte-tutorial/ 5·2,946·27.1 ·
/blog/capital-one-codesignal-data-analyst-assessment/ 5·105·9.2 ·
/blog/null-handling-mistakes/ 4·1,095·9.9 · /learn-sql/ 4·253·7.4 ·
/sql-interview-questions-data-analyst/ 4·190·26.7 · /blog/sql-running-total/
3·273·11.5 · /blog/sql-group-by-tutorial/ 2·1,888·54.5 · /vs-hackerrank-sql/
2·167·7.7 · /sql-interview-prep/ 2·108·18.4 · /blog/sql-joins-explained/
1·1,821·28 · /blog/window-functions-tutorial/ 0·544·26.3.

Google pages, 3 months, top 8: / 492·2,328·6.4 · /best-sql-practice-sites/
78·4,124·9.0 · /revolut-sql-interview/ 77·544·7.4 · /sql-practice-comparison/
57·8,360·8.5 · /snowflake-sql-interview/ 47·580·12.1 · /stripe-sql-interview/
43·776·10.2 · /wise-sql-interview/ 29·190·8.3 · /sql-exercises/ 23·1,335·23.6.

## I. Non-interview rows worth naming (for the stop list)

Google 3 months, `other`/`learn`/`practice`, ≥ 40 impressions, competitor
brands removed: `ctes` 488·0·33.8 · `sql cte` 411·0·26.3 · `cte sql`
404·0·32.2 · `sql joins` 202·0·44.4 · `first match wins in conditional logic
example` 183·0·4.4 · `"this pattern needs a bit of syntax that is easiest if
in a cte"` 170·0·9.1 · `sql side quest` 154·0·7.1 · `"i also like the way they
handle missing/null in predicates"` 144·0·9 · `sql exercises` 140·3·32.7 ·
`sql group by` 133·0·70.8 · `what is cte in sql` 121·0·27.8 · `cte sql query`
120·0·37.4 · `ctes sql` 115·0·34.8 · `cte in sql` 111·0·35.9 · `sql cte
example` 68·0·47.1 · `group by sql` 64·0·71.6 · `joins` 61·0·40.3 · `2026 sql
joins` 57·0·5 · `cte meaning sql` 56·0·41 · `sql running total` 54·0·12.9 ·
`sql joins explained` 52·0·36.5 · `joins in sql` 50·0·52.6 · `nested cte`
49·0·11.6 · `cte syntax` 41·0·25.5.

Google 28 days, same filter, ≥ 15: `ctes` 108·0·53.8 · `sql joins` 98·0·42.8 ·
`sql group by` 82·0·72.3 · `cte sql` 79·0·45.5 · `sql side quest` 62·0·7.2 ·
`sql cte` 59·0·44.3 · `2026 sql joins` 57·0·5 · `sql exercises` 52·1·27.2 ·
`sql cte example` 48·0·46.8 · `group by sql` 43·0·72.3 · `joins` 39·0·33.9 ·
`cte sql query` 35·0·45.3 · `cte meaning sql` 29·0·48 · `cte in sql`
28·0·45.4 · `joins in sql` 28·0·52.5 · `ctes sql` 23·0·46.2 · `sql select
group by` 16·0·65.1 · `what is cte in sql` 15·0·46.8.

Bing 30 D, ≥ 15: `sql practice questions` 698·21·7.2 · `sql practice`
438·4·8.26 · `sql practice exercises` 352·34·3.91 · `sql exercises` 208·21·3.03 ·
`test query` 147·0·8 · `sql query practice` 81·3·8.04 · `datalemur` 63·0·8.65 ·
`sqlzoo practice exercises` 54·0·6.83 · `sql exercises for practice`
42·10·3.6 · `sql practice problems` 33·10·4.06 · `sql queries practice`
23·3·8.22 · `sql exercises online` 21·1·5.62 · `sql bolt exercises` 21·0·7.95 ·
`sql problems` 20·3·4.8 · `new query question` 18·0·7.06.

## J. Interview yield per landing page (Supabase, last 30 days)

Query: first `landing_view` (`reason='landing'`) per person in the last 30
days, person = `COALESCE(metadata.aid, username)`; internal aids and the
localhost aid excluded; then, after that landing: `app_opened`,
`intent_captured` with `intent IN ('interview','job_ready')`,
`challenge_solved`. **Yield = interview-intent people per 100 landers.**
`intent_captured` is the post-solve ask, so every interview-intent person has
solved (interview_intent = interview_solved on every row).

Totals: **2,639 landed · 730 opened the app · 288 solved · 146 interview
intent → yield 5.5.**

| Page | Landed | Opened | Solved | Interview | Yield |
|---|---|---|---|---|---|
| sql-exercises | 434 | 328 | 129 | 72 | **16.6** |
| home | 241 | 121 | 57 | 28 | 11.6 |
| best-sql-practice-sites | 197 | 65 | 24 | 10 | 5.1 |
| sql-practice-comparison | 100 | 12 | 5 | 4 | 4.0 |
| revolut-sql-interview | 70 | 36 | 15 | 6 | 8.6 |
| blog/faang-sql-interview-guide | 54 | 8 | 3 | 3 | 5.6 |
| blog/sql-cte-tutorial | 51 | 3 | 1 | 0 | 0 |
| snowflake-sql-interview | 50 | 32 | 17 | 4 | 8.0 |
| vs-leetcode-sql | 43 | 0 | 0 | 0 | 0 |
| blog/null-handling-mistakes | 37 | 0 | 0 | 0 | 0 |
| vs-stratascratch | 36 | 3 | 0 | 0 | 0 |
| blog/sql-for-fraud-analytics | 32 | 3 | 0 | 0 | 0 |
| sql-interview-prep | 29 | 10 | 6 | 5 | **17.2** |
| sql-interview-readiness-test | 27 | 0 | 0 | 0 | 0 |
| wise-sql-interview | 26 | 19 | 4 | 3 | 11.5 |
| stripe-sql-interview | 26 | 10 | 5 | 3 | 11.5 |
| sql-interview-questions-data-analyst | 25 | 2 | 0 | 0 | 0 |
| vs-datalemur | 24 | 4 | 2 | 0 | 0 |
| amazon-sql-interview | 23 | 7 | 2 | 1 | 4.3 |
| blog/window-functions-tutorial | 19 | 2 | 1 | 0 | 0 |
| learn-sql | 19 | 7 | 2 | 0 | 0 |
| blog/sql-group-by-tutorial | 19 | 0 | 0 | 0 | 0 |
| blog/sql-joins-explained | 17 | 0 | 0 | 0 | 0 |
| blog/sql-case-when-tutorial | 14 | 0 | 0 | 0 | 0 |
| blog/left-join-vs-inner-join | 14 | 0 | 0 | 0 | 0 |
| blog/where-vs-having | 14 | 0 | 0 | 0 | 0 |
| meta-sql-interview | 13 | 4 | 1 | 0 | 0 |
| blog/capital-one-codesignal-data-analyst-assessment | 12 | 1 | 1 | 0 | 0 |
| blog/sql-anti-join | 12 | 0 | 0 | 0 | 0 |
| challenges/window-functions | 12 | 6 | 3 | 2 | 16.7 |
| fraud-analytics-sql | 12 | 0 | 0 | 0 | 0 |
| jpmorgan-sql-interview | 11 | 2 | 0 | 0 | 0 |
| apple-sql-interview | 11 | 3 | 0 | 0 | 0 |
| sql-find-duplicates | 11 | 0 | 0 | 0 | 0 |
| google-sql-interview | 11 | 3 | 1 | 0 | 0 |
| shopify-sql-interview | 11 | 6 | 1 | 1 | 9.1 |
| blog/is-null-vs-equals-null | 11 | 0 | 0 | 0 | 0 |
| sql-cheat-sheet | 10 | 0 | 0 | 0 | 0 |
| databricks-sql-interview | 10 | 2 | 0 | 0 | 0 |
| tesla 8·0·0·0 · challenges/case-when 8·1·0·0 · ramp 8·1·0·0 · airbnb 8·4·1·1 (12.5) · after-the-sql-course 8·0 · capital-one 7·0·0·0 · uber 7·0·0·0 · spotify 7·0·0·0 · netflix 7·2·1·0 · anthropic 6·2·0·0 · vs-hackerrank-sql 6·1·1·1 (16.7) · doordash 6·1·1·0 · openai 6·0 · sql-quiz 6·2·1·0 · challenges/cte 5·4·1·1 (20) · challenges/subqueries 5·2·0·0 · goldman-sachs 5·0 · walmart 5·0 · tiktok 5·0 · microsoft 5·0 · nvidia 5·0 · questions/order-funnel-conversion 5·1·1·1 (20) · bloomberg 4·0 · linkedin 4·0 · morgan-stanley 4·0 · plaid 2·0 | | | | | |

Cluster yields (from the rows above): company pages 376 landed / 19
interview → **5.1** (Revolut, Wise, Stripe, Snowflake carry 16 of the 19);
blog 20+ pages ≈ 330 landed / 3 interview → **0.9**; comparisons (`vs-*`,
best-sites, comparison) 406 / 14 → 3.4 (all 14 from best-sites and
comparison; the four `vs-*` pages: 109 landed, 0); hubs: sql-exercises 16.6,
sql-interview-prep 17.2, learn-sql 0; topic pages 12+8+5+5 → 3 of 30 (10).

Flag, not in scope here: `/sql-interview-readiness-test/` — 27 landers in
30 days, **0 `app_opened`** after the landing. Either nobody finishes the
ten questions or the `?src=readiness` arrival is not writing `app_opened`
under the same aid. Worth its own read.

## K. Company tags vs pages

Every company with tagged challenges has a page (30 = 30). Tag counts:
Snowflake 95 · Revolut 38 · Stripe 35 · Amazon 34 · Plaid 34 · Google 32 ·
Ramp 32 · Airbnb 27 · Capital One 25 · NVIDIA 23 · Tesla 23 · Meta 22 ·
Netflix 21 · OpenAI 21 · Spotify 20 · Anthropic 20 · Databricks 20 ·
JPMorgan 19 · Uber 18 · DoorDash 18 · TikTok 16 · Walmart 16 · Wise 16 ·
Microsoft 16 · Goldman Sachs 16 · LinkedIn 16 · Bloomberg 16 · Shopify 15 ·
Apple 14 · Morgan Stanley 12. No company name without a page appears in
either console (the 09-09 read explains why that is structural).
