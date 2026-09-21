# Ticket exercises — PM-style requests on real data (2026-09-21)

Part of `post-hire-track-2026-09-21.md`.

## Why
A challenge says exactly what to return. A ticket at work says "why did
checkout conversion drop last week?" — the analyst decides the columns, the
grain and the filters. That translation step is the first-90-days skill, and
nothing in the bank trains it.

## What it is
- A ticket: a short request in a PM's words, a dataset, and a deadline-style
  framing ("needed for Monday's review"). No column list, no expected shape.
- Grading in two parts: (1) the numbers — the answer must contain the right
  figures, checked against a reference computed from the data, tolerant of
  column names and order; (2) a one-line written answer to the PM, reviewed by
  the tutor (the same path as `getApproachFeedback` in the mocks).
- Runs on the existing SQLite datasets (ecommerce, neobank, finans) first;
  `dirty-dataset-2026-09-21.md` makes them harder later.

## What it does not change
- The challenge bank and its grading. Tickets are a new type, not a mode of
  challenges.
- Never publish a ticket's reference query (same rule as question pages).

## Open questions
- Grading on "contains the right numbers" needs a tolerance rule (rounding,
  percent vs fraction). Write it before the first ticket, with tests.

## Claim (ledger-ready)
- **Metric:** `ticket_completion` — share of started tickets finished with the
  numbers right. **Not in `docs/agent/metrics.md`**; define at build start.
- Read alongside `post_hire_retention`.

## Status
OPEN. First content of the post-hire track.
