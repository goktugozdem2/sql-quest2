# Daily Reward → the streak card; the streak counts solves (2026-09-21)

Covers two ideas: "Daily Reward redesign as a non-blocking toast" and
"Streak tied to solved questions, not logins".

## What shipped
The Daily Reward modal is gone. The header streak is a chip that opens a
non-blocking card; the card slides in once after the day's first solve. One
number, `dailyStreak`, moved only by a correct submit. +10 XP, claimable only
after a solve. Details: `src/utils/streak-card.js`, `tests/streak-card.test.js`.

## Claim
On the ledger: "the streak card: reward a solved question, not a visit".
Metric `practice_next_day` (in `docs/agent/metrics.md`), baseline 42.8%
(2026-08-24 → 09-20), read 2026-10-19.

## Status
**SHIPPED 2026-09-21.**
