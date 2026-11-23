# Indexing queue — generated

Written by `node scripts/index-queue.mjs --engine gsc --days 7 --write-queue` on 2026-11-23, for the days from 2026-11-24. Rules: `docs/plans/indexing-queue-2026-11-23.md`.
Re-generated every day by S1 (with `--live`), so day 1 is the only binding line; days 2–7 are the order as it stands today.
Nothing here has been requested. Results go into `docs/agent/index-requests.json`.

## Indexing queue · GSC · from 2026-11-24

S1: Google GREEN · Bing RED · index status: gsc_index_status / bing_url_status via Supabase MCP (read-only), 2026-11-23; rows for T1, pending and not-indexed pages only · live checks: not run (pass --live on the day)

### 2026-11-24 · GSC · 8 of cap 8

1. T1 `https://sqlquest.app/` — T1, changed 2026-11-23, never requested · live: check on the day
2. T1 `https://sqlquest.app/sql-exercises/` — T1, changed 2026-11-23, never requested · live: check on the day
3. T1 `https://sqlquest.app/sql-interview-prep/` — T1, changed 2026-11-23, never requested · live: check on the day
4. T1 `https://sqlquest.app/capital-one-sql-interview/` — T1, changed 2026-11-23, never requested · live: check on the day
5. T1 `https://sqlquest.app/revolut-sql-interview/` — T1, changed 2026-11-23, never requested · live: check on the day
6. T1 `https://sqlquest.app/sql-interview-readiness-test/` — T1, changed 2026-11-23, never requested · live: check on the day
7. T2 `https://sqlquest.app/sql-rollup-interview-questions/` — pending: #127; its ledger claim's 28-day window starts at the request · live: check on the day
8. T2 `https://sqlquest.app/paypal-sql-interview/` — pending: #76 · live: check on the day

### 2026-11-25 · GSC · 8 of cap 8 · not before 2026-11-25 16:00 UTC

1. T2 `https://sqlquest.app/for-teams/` — pending: #188 · live: check on the day
2. T3 `https://sqlquest.app/blog/revolut-data-analyst-sql-screen/` — not indexed (URL is unknown to Google) · live: check on the day
3. T5 `https://sqlquest.app/questions/ages-on-record-by-class/` — not indexed (URL is unknown to Google) · live: check on the day
4. T5 `https://sqlquest.app/questions/every-employee-next-to-their-departments-top-salary/` — not indexed (URL is unknown to Google) · live: check on the day
5. T5 `https://sqlquest.app/questions/hires-per-year/` — not indexed (URL is unknown to Google) · live: check on the day
6. T5 `https://sqlquest.app/questions/number-each-customers-orders/` — not indexed (URL is unknown to Google) · live: check on the day
7. T5 `https://sqlquest.app/questions/reviewed-twice-scored-higher-the-second-time/` — not indexed (URL is unknown to Google) · live: check on the day
8. T5 `https://sqlquest.app/questions/weekend-logins/` — not indexed (URL is unknown to Google) · live: check on the day

### 2026-11-26 · GSC · 0 of cap 8 · not before 2026-11-26 16:00 UTC

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
| only a site-wide change | 408 | `/turkce-sql-ogren/`, `/finans-sql/`, `/gayrimenkul-sql/` … |
| on the skip list | 4 | `/weekly/`, `/privacy/`, `/terms/` … |
| indexed, crawled | 3 | `/coinbase-sql-interview/`, `/monzo-sql-interview/`, `/chime-sql-interview/` |
| flag-off | 1 | `/sql-debugging-practice/` |

#### Seed notes (2026-11-23, replaced by the first S1 run)

- Index status: `gsc_index_status` read through the Supabase MCP (read-only) on 2026-11-23, passed as a `--status` snapshot. Unknown to Google: `/sql-rollup-interview-questions/`, `/for-teams/`, `/paypal-sql-interview/`, `/blog/revolut-data-analyst-sql-screen/` and six `/questions/` pages. Chime, Coinbase and Monzo were crawled and indexed on 11-23, so they are held, not queued.
- `--live` on 2026-11-23 ~15:55 UTC: all eight day-1 URLs answered 200 with no redirect, a self canonical, no noindex for Google, and are in the live sitemap. Re-run on the day.
- `/challenges/window-functions/` and `/challenges/cte/` wait for #260's `topic-learn:start` on the live page; `/sql-debugging-practice/` (404 today) and the pages linking it wait for `debugQuestions` on.
- Bing by hand on 2026-11-23: nothing (every T1 change today is the site-wide footer, which IndexNow already sent).
- Nothing was requested in this run.
