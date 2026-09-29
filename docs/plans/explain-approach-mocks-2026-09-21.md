# "Explain your approach" in more mocks (2026-09-21)

## Why
Live SQL rounds grade the reasoning, not only the query. The box shipped in
one mock — `capital-one-live-sql` (`explainApproach: true`, feedback via
`getApproachFeedback`) — and nowhere else.

## What it is
- Turn it on for every written (non-MCQ) question in the sourced mocks where
  the real round is known to be live or talk-through, and in the generic
  practice mocks' written questions.
- Where a source says the round is a timed online test with no talking
  (CodeSignal-style), leave it off — adding it would train the wrong format.

## What it does not change
- MCQ questions. The box is for written answers.
- The mock's score. Approach feedback is advice, not points.

## Claim (ledger-ready)
- **Metric:** `approach_box_use` — share of written answers in enabled mocks
  that include an approach. **Not in `docs/agent/metrics.md`**; define at
  build start (the one live mock gives the first number).

## Status
BUILT 2026-09-29 (founder-approved 2026-09-29, backlog #5). Per-question flag
`explainApproach: true` (src/utils/mock-approach.js): on for the seven generic
practice mocks' 39 written questions and `capital-one-live-sql`'s four; off,
with the reason in the data file, on the written questions of
`capital-one-codesignal` (CodeSignal, timed, untalked) and
`revolut-analytics-screen` (HackerRank round one; the talk-through is round
two, no mock yet). Event `mock_approach_submitted`; metric `approach_box_use`
defined in docs/agent/metrics.md with the baseline (none — no per-answer event
before this date, and the one live mock had only internal traffic). Ledger
claim: "Explain your approach in every live / talk-through mock", read
2026-10-20. Guards: tests/mock-approach.test.js.
