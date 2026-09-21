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

## The demand signal — ask, don't infer (founder, 2026-09-21)
"Did people open the syntax notes" is a weak signal. Ask one question instead:
**"Which database does your target company use?"** — Postgres / Snowflake /
BigQuery / MySQL / SQL Server / Not sure. Where:
- in the intake's interview goal, beside company and level (it already asks
  those — `INTAKE_COMPANIES`), and
- once before a person's first mock, for people who skipped the intake.
Stored on the intake record (`userData.intake`), not a new store. It never
blocks: "Not sure" is a first-class answer. Event `target_db_answered {db}`.
It costs nothing and it says exactly how many people are on each engine.

## Order
The question first. The notes next, for whichever dialects the answers name.
The toggle only when the answers justify a second engine.

## Claim (ledger-ready)
- **Metric:** `target_db_mix` — the answers to the question above, by
  engine, over people who answered. **Not in `docs/agent/metrics.md`**;
  define at build start. This is the read that decides the toggle.
  `dialect_note_open` stays a secondary read once notes exist.

## Status
OPEN.
