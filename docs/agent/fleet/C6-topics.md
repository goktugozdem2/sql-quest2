# C6 — Topics: research, content and the question funnel

**Lane:** SQL *topics*: the subjects people search for and get asked in interviews, whatever the company. C5 owns company pages and guides. C6 owns:
- topic guides and blog posts;
- topic hub pages (`/challenges/<topic>/`);
- the practice questions behind them, written to B3's rules;
- the path from each guide to question 1 in the app.

C1 owns snippets, crawl and links, so C6 hands it the links each new page needs.

**Cadence:** daily, one funnel step per run. A full topic funnel ships in about a week.

**Judged by:**
- people who reach a topic page and solve one of its questions (`topic_funnel`, defined in metrics.md);
- solve-through on the new questions against the bank's median for their level;
- trials or purchases traced to a topic door, read quarterly. Topic doors convert worse than company doors (§1f), so this one is read slowly and honestly.

Every ledger claim on a C6 page reads **`content_funnel` for that page** (docs/agent/metrics.md): landing people → app opened → first run → first solve → 3 solves → trial or purchase, 28-day row, at 28 and 56 days. `topic_funnel` stays the question-level read. A new page's baseline is 0.

Founder's order, 2026-11-22: "SQL tarafında başka hangi konular var … günlük araştırıp içerik ve soru funnel'ı oluşturan bir agent … en niş konuları da eklesin, mesela DDL/DML gibi konular eksik bizde."

## What we cover today (measured 2026-11-22, 421 challenges, reference solutions grepped)

| Topic | Challenges using it | Guide or hub |
|---|---|---|
| CREATE TABLE, constraints | **0** | none |
| CREATE INDEX, query plans | **0** | none |
| Views | **0** | none |
| UPSERT (ON CONFLICT / REPLACE / MERGE) | **0** | none |
| Transactions (BEGIN / COMMIT / ROLLBACK) | **0** | none |
| INSERT … SELECT | 1 | none |
| UPDATE / DELETE | 3 / 2 (some may be words in text, not statements) | none |
| EXCEPT / INTERSECT | 0 / 1 | none |
| JSON functions | **0** | none |
| UNION | 11 | none |
| Recursive CTEs | 4 | blog |
| Pivot (CASE inside an aggregate) | 28 | none |

**The engine gap behind DDL/DML.** Today a challenge is graded on the rows a `SELECT` returns, against the shared `db`. A DML or DDL answer changes *state* instead. These challenges need:
- **a fresh database per attempt.** The pattern already exists for tickets (`ticketDbFor` in app.jsx): never the shared `db`.
- **a `check` query that grades the resulting state.** It runs after the person's statements, and its result is compared with the reference's.
- **a statement allow-list per challenge.** For example, a DELETE challenge must not be passable with `DROP TABLE`.

That is product code (app.jsx, the challenge schema and the question-page generator). It ships first, as its own PR, with tests.

**Skillmap.** The 9 canonical skills are the product's radar and brand. Adding a 10th axis, "Data Definition & Modification", is the founder's decision. Until he decides, DDL/DML challenges carry the tag `DDL/DML` that `SKILL_TO_RADAR` leaves unmapped. They count as solves but move no radar axis, and the PR says so.

## The topic backlog (seed, re-ranked every run)

Rank by interview relevance (analyst and data engineer), search demand (web research plus the laptop's GSC queries), our gap, and how close the topic sits to the money door.

1. **DML.** INSERT … SELECT, UPDATE with a join or subquery, DELETE duplicates keeping one, UPSERT. The "find and delete duplicates" family links to the existing `/sql-find-duplicates/`.
2. **DDL and constraints.** CREATE TABLE, PK / FK / UNIQUE / CHECK / NOT NULL, ALTER TABLE, and "design the schema for X", which is an interview staple.
3. **Transactions and ACID.** BEGIN / COMMIT / ROLLBACK and what happens on failure. Mostly concept, plus graded state.
4. **Indexes and query plans.** `EXPLAIN QUERY PLAN` in SQLite, when an index helps, and why a query is slow (links to `/sql-query-optimizer/`).
5. **Views,** including materialised vs plain in other dialects.
6. **Set operations.** EXCEPT / INTERSECT / UNION ALL vs UNION.
7. **Gaps and islands, sessionization.**
8. **Slowly changing dimensions (SCD type 2), soft deletes, snapshot tables.** These are data-engineer-shaped.
9. **Normalization, 1NF–3NF,** and when analysts denormalize.
10. **JSON in SQL** (SQLite `json_extract`; dialect notes for Postgres, BigQuery and Snowflake).
11. **Percentiles and median in SQLite,** date spines and calendar tables, sampling, data-quality checks.

## The funnel, per topic, one step per run

1. **Research read.** Write `docs/reads/topic-<slug>-<date>.md` covering:
   - what people ask, from dated fetched sources (interview lists, docs, Q&A);
   - who already ranks for it;
   - what we can say better;
   - which datasets fit.

   No frequency claims.
2. **Questions.** 3–8 challenges from Easy to Hard, on existing datasets, to B3's rules:
   - prompts that never name the method;
   - reference solutions run and pinned in a test;
   - one common wrong answer that must fail.
3. **Guide.** A blog post or guide in which every query shown runs in a test on our data, plus the dialect sentence (`dialect-notes.js`). It links to question 1 (`/app/?challenge=<id>&src=topic-<slug>`). A link without a `src` gets the page's own door at build time (`scripts/stamp-app-src.mjs`) and `tests/app-link-src.test.js` fails on any that escapes, but write the `src` yourself.
4. **Hub.** A `/challenges/<topic>/` page, made through `EXTRA_TOPIC_SPECS` in `scripts/build-topic-extra.mjs`, never by hand.
5. **Links.** C1 adds the hub, the sitemap entry and related-links from existing pages, through the generators.

## Rules

- **Budget.** At most 2 new indexable pages a week from C6, and at most 3 site-wide together with C5. Scaled thin pages hurt the whole domain.
- Bank counts come only through `bankCountLabel`. Counts are bound by `tests/site-counts.test.js`.
- **Question pages publish no solution** (`tests/question-pages.test.js`).
- Every new test is proven by a deliberate break.
- One PR per run. A1 reviews and A0 decides. Product-code PRs (the engine) are reviewed with the fragile areas in mind: hooks above early returns, and never the shared `db` for a state challenge.
- **Cloud runs have no production data.** Research comes from the web and the repo, and the GSC demand read is left to the laptop.
