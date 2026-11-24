# Indexing queue — generated

Written by `node scripts/index-queue.mjs --engine gsc --days 7 --write-queue` on 2026-11-23, for the days from 2026-11-24. Rules: `docs/plans/indexing-queue-2026-11-23.md`.
Re-generated every day by S1 (with `--live`), so day 1 is the only binding line; days 2–7 are the order as it stands today.
Nothing here has been requested. Results go into `docs/agent/index-requests.json`.

## Indexing queue · GSC · from 2026-11-24

S1: Google GREEN · Bing RED · index status: gsc_index_status read 2026-11-23 ~16:20 UTC (MCP, read-only) · live checks: 16 pages

### 2026-11-24 · GSC · 8 of cap 8

1. T2 `https://sqlquest.app/sql-rollup-interview-questions/` — pending: #127; its ledger claim's 28-day window starts at the request · live ✓
2. T2 `https://sqlquest.app/paypal-sql-interview/` — pending: #76 · live ✓
3. T2 `https://sqlquest.app/for-teams/` — pending: #188 · live ✓
4. T3 `https://sqlquest.app/blog/revolut-data-analyst-sql-screen/` — not indexed (URL is unknown to Google) · live ✓
5. T5 `https://sqlquest.app/questions/ages-on-record-by-class/` — not indexed (URL is unknown to Google) · live ✓
6. T5 `https://sqlquest.app/questions/every-employee-next-to-their-departments-top-salary/` — not indexed (URL is unknown to Google) · live ✓
7. T5 `https://sqlquest.app/questions/hires-per-year/` — not indexed (URL is unknown to Google) · live ✓
8. T5 `https://sqlquest.app/questions/number-each-customers-orders/` — not indexed (URL is unknown to Google) · live ✓

### 2026-11-25 · GSC · 2 of cap 8 · not before 2026-11-25 15:58 UTC

1. T5 `https://sqlquest.app/questions/reviewed-twice-scored-higher-the-second-time/` — not indexed (URL is unknown to Google) · live: check on the day
2. T5 `https://sqlquest.app/questions/weekend-logins/` — not indexed (URL is unknown to Google) · live: check on the day

### 2026-11-26 · GSC · 0 of cap 8 · not before 2026-11-26 15:58 UTC

_Nothing to request._

### 2026-11-27 · GSC · 0 of cap 8

_Nothing to request._

### 2026-11-28 · GSC · 0 of cap 8

_Nothing to request._

### 2026-11-29 · GSC · 0 of cap 8

_Nothing to request._

### 2026-11-30 · GSC · 0 of cap 8

_Nothing to request._

#### Waiting on a gate (joins the queue on the first day the gate is open, checked with --live)

- `/challenges/window-functions/` (T2, #260 (learn, practice, next step)): waits for "topic-learn:start" live on the page
- `/challenges/cte/` (T2, #260 (learn, practice, next step)): waits for "topic-learn:start" live on the page
- `/sql-debugging-practice/` (T2, #256, rendered only with debugQuestions on): waits for flag debugQuestions on
- `/` (T1, #256 links the Debug hub from here): waits for flag debugQuestions on and "/sql-debugging-practice/" live on the page
- `/sql-exercises/` (T1, #256 links the Debug hub from here): waits for flag debugQuestions on and "/sql-debugging-practice/" live on the page
- `/sql-for-the-ai-era/` (T4, #256 links the Debug hub from here): waits for flag debugQuestions on and "/sql-debugging-practice/" live on the page
- `/blog/validate-ai-generated-sql/` (T4, #256 links the Debug hub from here): waits for flag debugQuestions on and "/sql-debugging-practice/" live on the page

#### Held on day 1

| Held because | Pages | Examples |
|---|---|---|
| only a site-wide change | 406 | `/turkce-sql-ogren/`, `/finans-sql/`, `/gayrimenkul-sql/` … |
| indexed, crawled | 11 | `/`, `/plaid-sql-interview/`, `/shopify-sql-interview/` … |
| on the skip list | 4 | `/weekly/`, `/privacy/`, `/terms/` … |
| flag-off | 1 | `/sql-debugging-practice/` |
