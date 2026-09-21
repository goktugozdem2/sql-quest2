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
OPEN. Small: a flag per question plus copy.
