# The dirty dataset — data as it really arrives (2026-09-21)

Part of `post-hire-track-2026-09-21.md`; also useful to interview prep.

## Why
Every dataset in the bank is clean (titanic, movies, employees, ecommerce,
the sector sets). Real tables have duplicates, rows that land days late,
timestamps in mixed time zones and NULLs where the schema promised values.
The mistakes that cost analysts their credibility live there — and three of
them are already patterns the diagnosis engine names (`dateUpperBoundTrap`,
NULL handling in NOT IN, fan-out).

## What it is
- A "dirty" variant of `ecommerce` (first) in `src/data/datasets.js`:
  seeded duplicates, late-arriving rows (`created_at` vs `loaded_at`), mixed
  time-zone strings, NULLs in join keys and amounts.
- Used by tickets and refactor drills first; a small set of challenges on it
  later, with the trap named in the diagnosis rather than the prompt.

## What it does not change
- The clean datasets. Existing challenges keep their data byte for byte.
- SQLite semantics. Mixed time zones must be solvable in SQLite; check
  `SQLITE_TUTOR_RULES` covers what the tutor will be asked.

## Claim (ledger-ready)
- No claim of its own — it is material. Read through `ticket_completion` and
  `challenge_solve_through` on the challenges that use it.

## Status
OPEN.
