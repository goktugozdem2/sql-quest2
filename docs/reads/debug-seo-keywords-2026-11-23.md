# Debug question type — keyword read (2026-11-23)

For: the SEO pages for the Debug set (ids 331–342, flag `debugQuestions`),
under the 2026-11-23 exception row in `docs/agent/fleet/orchestrator-decisions.md`
(S1 RED: at most 2 new pages, keywords from our own GSC/Bing queries plus a
dated SERP read). Written before any page ships. Rule 7b: this run read the
open web (SERP) and the GSC/Bing query tables only — no customer rows.

## 1. Our own queries (read 2026-11-23, last 90 days)

Sources: `gsc_daily` (query slice `page IS NULL`, page slice `query IS NULL`,
query×page slice — read separately, never summed across slices) and
`bing_stats` (query and page rows are **weekly buckets**; `wks` = buckets
seen). Position = impression-weighted mean.

### Debug / fix / mistake intent — almost no direct demand

| Query | Engine | Impr. | Clicks | Pos. | Lands on |
|---|---|---|---|---|---|
| how to govern ai-generated sql before it reaches production | GSC | 214 | 0 | 3.1 | /blog/validate-ai-generated-sql/ |
| how should i validate ai-generated sql before allowing it to modify production data? | GSC | 5 | 0 | 7.2 | same |
| join fan out / join fan-out / fan out join / join fanout | GSC | 8 / 2 / 1 / 1 | 0 | 6.1 / 10.5 / 1 / 16 | /sql-join-fan-out/ |
| LEFT JOIN + WHERE "customers without orders disappear" (pasted quiz questions) | GSC | 4 + 3 + 3 | 0 | 6.5–9.7 | /sql-left-join-where-filter/ |
| fix my query / fix the query | GSC | 1 / 1 | 0 | 10 / 1 | — |
| whats wrong with my querry? | Bing | 3 (1 wk) | 0 | — | — |
| "… where is my mistake" (a pasted LEFT JOIN … IS NULL query) | Bing | 2 (1 wk) | 0 | — | — |
| "what is wrong with the following join and how can it be fixed?" | Bing | 2 (1 wk) | 0 | — | — |
| "… messing up the window function. what am i doing wrong" | Bing | 2 (1 wk) | 0 | — | — |
| find duplicates in sql (≈25 variants) | GSC | ~110 combined | 1 | 30–90 | no page of ours fits |

No query contains "debug", "debugging", "find the bug" or "common sql
mistakes" with more than 1 impression on either engine. The pattern that
does show: people **paste a wrong query or a quiz item and ask what is wrong**
— chat-turn queries (AI grounding, per the GenAI-channel note), on both
engines.

### The pages the hub sits next to

| Page | GSC impr. / clicks / pos. | Bing impr. / clicks / pos. |
|---|---|---|
| /sql-exercises/ | 3,350 / 150 / 13.4 | 24,680 / 1,292 / 6.0 (12 wks) |
| /blog/validate-ai-generated-sql/ | 661 / 12 / 4.3 | 1 / 0 |
| /sql-left-join-where-filter/ | 405 / 4 / 5.6 | 16 / 0 / 5.9 |
| /shopify-sql-interview/ | 462 / 10 / 8.8 | — |
| /sql-for-the-ai-era/ | 247 / 3 / 6.0 | — |
| /sql-between-timestamp/ | 158 / 2 / 5.9 | — |
| /sql-not-in-null/ | 134 / 0 / 6.4 | — |
| /sql-join-fan-out/ | 110 / 0 / 7.0 | 2 / 0 |
| /tiktok-sql-interview/ | 102 / 1 / 7.7 | 1 / 0 |
| /sql-average-of-averages/ | 26 / 0 / 6.0 | — |

Bing head terms the hub can borrow relevance from (all land on
/sql-exercises/): "sql practice" 4,391 impr. / 61 clicks / pos. 8.2;
"sql practice questions" 2,063 / 144 / 5.1; "sql practice exercises"
742 / 91 / 3.0; "sql exercises" 551 / 44 / 3.8; "sql query practice"
265 / 4 / 8.0.

## 2. SERP read (WebSearch, standard mode, 2026-11-23)

| Query | What ranks | Winning page type |
|---|---|---|
| sql debugging exercises | Aalto open course lesson; a DataCamp course exercise; Metabase "Debugging SQL" guides; MariaDB KB; O'Reilly book lesson; research papers | course lessons and guides; **no dedicated interactive set** |
| sql debugging practice questions | Aalto; Metabase guides; DataCamp; Hugging Face debugging datasets; Sentry's SQL hub | same: guides, a single course exercise, datasets |
| fix the sql query practice find the bug | DataCamp workspace; a Dev Genius "5 SQL queries with bugs" post; Aalto; TDS "querying mistakes"; LearnSQL beginner tips; HF datasets | blog posts with a handful of static bugs |
| common sql mistakes practice | DZone, TDS, InfoWorld, Medium, LearnSQL, Analytics Vidhya, Red Gate | listicles (syntax, indexes, injection, NULL) |
| common sql mistakes interview | Exponent course pages, Interview Query, KDnuggets, TDS, Substack, Data Engineer Academy | interview-prep articles (pressure, NULL, joins, window ORDER BY) |
| debug ai generated sql query | Stanford CS145 module, OWOX, Basedash checklist, DZone "valid SQL, wrong answer", DEV posts, Microsoft ISE blog | checklists and vendor blogs on reviewing AI SQL |

Read: for "SQL debugging practice / exercises" nobody ranks with a set of
graded, runnable debug items — the results are guides, one course exercise
and blog posts with five static bugs. That is the gap a hub with 12 graded
items fills. "Common SQL mistakes (interview)" is owned by listicles and
interview-prep articles and overlaps our five trap pages; "debug AI-generated
SQL" is review-checklist intent that our validate-AI post already serves.
No competitor feature or price is stated here or on the page.

## 3. Keywords ranked by buyer value (orchestrator, 2026-11-23)

Buyers are people preparing for a SQL interview or job; learner traffic
ranks below them. Each keyword names the page it serves.

| Rank | Keyword | Intent | Evidence | Page |
|---|---|---|---|---|
| 1 | **sql debugging practice** (primary) | practise a skill interviews and the job test | SERP gap (no graded set ranks); our "sql practice" Bing cluster | **/sql-debugging-practice/** (new) |
| 2 | sql debugging exercises | same | SERP gap | hub |
| 3 | fix the sql query / find the bug in sql query | same, phrased as the task | GSC "fix my query"/"fix the query" (1 each); SERP = blog posts | hub |
| 4 | common sql mistakes interview | interview prep, buyer | SERP = interview-prep articles; 0 own impressions | hub (secondary H2/FAQ language), trap pages |
| 5 | sql query returns wrong result / what's wrong with my query | job-shaped, chat-turn | Bing chat-turn queries (2–3 impr. each) | hub; trap pages answer the specific ones |
| 6 | join fan out | interview/job concept | GSC 8 + 4 variants, pos. 6–16 | /sql-join-fan-out/ (keeps it; hub links) |
| 7 | left join where filter / customers without orders disappear | interview quiz concept | GSC 10 across pasted quiz items | /sql-left-join-where-filter/ (hub links) |
| 8 | not in null / between timestamp / average of averages | concept | page slices above | the three trap pages (hub links) |
| 9 | rank vs row_number ties; integer division sql; count(*) vs count(column) | concept | no own impressions | hub (bug families) |
| 10 | debug / validate ai-generated sql | job (reviewing), mostly governance | GSC 214 impr. at pos. 3.1, 0 clicks — governance intent, not practice | /blog/validate-ai-generated-sql/ (strengthened with a hub link, not cannibalised) |
| — | find duplicates in sql | learner how-to | ~110 impr. at pos. 30–90 | no page; not this feature |

## 4. Decision: one page

- **Build /sql-debugging-practice/** for rank 1–5 (title "SQL Debugging
  Practice: Find and Fix the Bug | SQLQuest.app", 59 characters).
- **No second page.** The candidate intents do not support one: "common SQL
  mistakes" has zero own impressions and a listicle SERP that our trap pages
  already cover; "fix AI-generated SQL" is the validate-AI post's intent
  (661 impr.) and `/sql-for-the-ai-era/`'s. A second page would cannibalise
  them while S1 is RED. Both get a hub link instead.
- No `/questions/` page for a Debug item (decision row; question pages
  average 34 impressions each against 625 for hub/topic pages over 90 days,
  per the orchestrator's GSC read).
- English only: no Turkish counterpart of the trap or AI pages exists to
  follow.

## 5. What would change this read

- The 28-day read after the flip: GSC + Bing impressions for the rank-1–5
  cluster on the hub. Under 100 impressions in 28 days, or the hub taking
  impressions from /blog/validate-ai-generated-sql/ (that page's GSC
  impressions falling by more than 30% against its prior 28 days), means the
  page is not earning its place: noindex it through `seo-prune.json`.
