# Homepage usage line, 2026-11-28

Measured 2026-11-28 11:34 UTC with `scripts/usage-line.sql` through the
read-only Supabase MCP. These two numbers are the ones on the homepage
(`src/index.html`, `data-testid="usage-line"`); `tests/usage-line.test.js`
binds the line to the newest file of this name.

accepted_solutions: 11297
people_30d: 735

## Definitions

- **accepted_solutions** — every `challenge_solved` row ever, re-solves
  included (as on 09-12 and 10-02), people through the human filter.
- **people_30d** — distinct people (`COALESCE(aid, username)`) with any
  non-landing row in the 30 days before the run, human filter.
- **Human filter** — the exclusion block of `scripts/scorecard-weekly.sql`,
  copied byte for byte (the test pins it). The 10-02 line used the crawler
  filter known then: internal accounts out, plus the `first_solve_10m`
  fingerprints (`prestamp_fp`, `utc1280`). The scorecard block is its
  successor. So the people number uses a filter that existed at the time,
  only in its current, wider form.

## The same query, re-run as of 2026-10-02 11:00 UTC

| | published 10-02 | re-read with today's filter | today |
|---|---|---|---|
| accepted solutions | 8,860 | 8,856 | **11,297** |
| people, last 30 days | 1,498 | 1,423 | **735** |
| people, internal out only | 3,094 | 3,123 | 2,401 |

- The solutions series is the same series: 8,856 against 8,860 published.
  About 2,440 solutions were added in eight weeks.
- On the same filter, people in the last 30 days fell from 1,423 to 735.
  The published 1,498 reproduces as 1,526 on the 10-02 filter alone. The
  wider filter takes out 75 to 103 more people on that date, so the drop is
  not a change of definition. The number on the page reads worse than the
  old one. It is the honest number, so it goes up as it is.
- `solutions_internal_out` today is 11,334. The 37 rows the human filter
  also drops are founder or A2 walks and bot fingerprints.

## Next

B2 re-runs `scripts/usage-line.sql` on Fridays, writes
`docs/reads/usage-line-<date>.md` with the two lines above, and puts the
numbers and the date into the line (`docs/agent/fleet/B2-measurement.md`
step 4b).
