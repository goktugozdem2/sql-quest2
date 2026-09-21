# Post-hire track — "First 90 Days", and the status that switches to it (2026-09-21)

## Why
SQL Quest is interview prep for job-hunters (`interview-first-2026-09-17.md`),
and that frame has a built-in end: the interview. Every payer so far was
interview-shaped, and a monthly subscriber whose interview is over has no
reason to stay — `sabar2001` (paid 2026-08-23) is scheduled to cancel on
2026-09-23. The product currently has nothing to say to someone who got the
job. The `interview-outcome-note` sender (2026-09-19) already asks "how did
it go?" and records `interview_outcome = passed`; today that answer changes
nothing on screen.

## What it is
1. **A status: Preparing / Hired.** Set by the outcome link (`?outcome=passed`
   asks "Did you get the offer?" before switching), or by hand in the profile.
   Stored through the existing single writer, `setUserIntent` →
   `userData.intent` — no fourth store (the intake's rule).
2. **The home screen follows the status.** Preparing = today's product
   (countdown, company plan, mocks). Hired = the First 90 Days track: the
   work a new analyst actually meets in the first quarter.
3. **The track's content** is four separate features, each with its own plan
   and each shippable alone:
   - `ticket-exercises-2026-09-21.md` — PM-style requests on real data
   - `query-review-2026-09-21.md` — review of a pasted work query
   - `refactor-drills-2026-09-21.md` — messy query in, readable CTEs out
   - `dirty-dataset-2026-09-21.md` — the data as it really arrives

## What it does not change
- Nothing for Preparing users. The interview-first surfaces stay as they are.
- No new price. Hired users are on the same Pro; the point is that Pro still
  has a job after the interview.
- The status is never inferred from behaviour. A person says it.

## Build order
Status + switch first, shipped with ONE piece of content (tickets), behind a
flag. An empty track behind a status switch would be worse than none.

## Claim (ledger-ready)
- **Metric:** `post_hire_retention` — of payers who set Hired, the share still
  subscribed 60 days later. **Not in `docs/agent/metrics.md`**; define it and
  measure the baseline (payers whose interview date passed, subscribed 60 days
  on) at build start.
- **Guardrail:** `interview_outcome` response rate must not drop — the
  "did you get the offer?" step must not make people stop answering.
- **Falsification:** Hired payers cancel at the same rate as payers who never
  set a status. n will be tiny (payers, not users); read the verbatims too.
- **Read:** 60 days after the flip.

## Status
OPEN.
