# Refactor drills — messy query in, readable CTEs out (2026-09-21)

Part of `post-hire-track-2026-09-21.md`.

## Why
New analysts inherit queries: nested subqueries four deep, repeated
expressions, no names. Rewriting one without changing its result is a daily
skill and is not trained anywhere in the product.

## What it is
- A drill hands over a working but unreadable query. The task: rewrite it.
- Grading, both required:
  1. **Same result** — the rewrite returns the same rows as the original
     (the existing result diff in `diagnose.js`).
  2. **Readable** — structural checks from `src/utils/sql-tools.js`: nesting
     depth under a limit, repeated expressions factored into a CTE, named
     CTEs. Every new rule gets a fire/no-fire pair in
     `tests/sql-tools.test.js` (the file's own rule).

## What it does not change
- `sql-tools.js` stays import-free (it is inlined into the tools pages).

## Claim (ledger-ready)
- **Metric:** `refactor_pass_rate` — drills passed on both checks.
  **Not in `docs/agent/metrics.md`**; define at build start.

## Status
OPEN.
