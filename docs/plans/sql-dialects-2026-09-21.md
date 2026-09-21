# SQL dialects — Postgres toggle; Snowflake and BigQuery syntax notes (2026-09-21)

## Why
Every query in SQL Quest runs on SQLite (`sql.js` 1.8.0 from cdnjs). Most
interviews and most jobs run Postgres, Snowflake or BigQuery. The differences
bite exactly where interviews probe: date functions, `DATE_TRUNC`,
`QUALIFY`, string functions, integer division.

## What it is — two parts, very different in cost
1. **Syntax notes (cheap, first).** On challenges that use a
   dialect-sensitive function, a small "In Postgres / Snowflake / BigQuery"
   note: the same query in each dialect. Static content, no engine change.
2. **Postgres toggle (expensive, later).** A real Postgres in the browser —
   PGlite (WASM, on jsdelivr, allowed by the CDN rule) — behind a flag, on a
   subset of challenges. Every reference solution is SQLite-flavoured
   (`strftime`), so each Postgres-enabled challenge needs its own reference
   solution, and result comparison must tolerate type differences
   (timestamps, numeric formatting).

## What it does not change
- SQLite stays the default engine and the grader of record.
- No dialect claim about a company's stack without a dated source (the
  company-page rule).

## Order
Notes first, measured. The toggle only if the notes show people want it.

## Claim (ledger-ready)
- **Metric:** `dialect_note_open` — share of challenge views on
  dialect-sensitive challenges where the note is opened. **Not in
  `docs/agent/metrics.md`**; define at build start. This is the demand read
  that decides whether the toggle is worth building.

## Status
OPEN.
