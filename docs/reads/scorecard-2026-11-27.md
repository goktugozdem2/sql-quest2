# The human scorecard — Friday 2026-11-27 (B2)

The first Friday read of the five numbers on bot-filtered **people**, on
the exclusion block of `scripts/scorecard-weekly.sql` (#387) with A2's
live-QA walk aids added in this PR (every `aid` starting `a2a2`, plus
`d9fe96e2…`; fleet README rule 2). Read-only Supabase MCP, read time
2026-11-27 ~12:45 UTC, every window ending 2026-11-27 00:00 UTC.
Aggregates only.

## The numbers

"This week" = first opens / events 2026-11-20 → 11-26. A 7-day metric
needs seven days of runway, so its "this week" is the cohort of
11-13 → 11-19 (its runway closed 11-26 24:00) and its comparison is
11-06 → 11-12.

| # | Number | This week | n | Previous week | n | Fisher p |
|---|---|---|---|---|---|---|
| 1 | `first_solve_10m` (new human openers, solve ≤ 10 min of first `app_opened`) | **23.8%** (36) | 151 (11-20 → 26) | 15.3% (23) | 150 (11-13 → 19) | 0.08 |
| 2 | `visitor_to_payer` (webhook first charges ÷ human visitors, 30 d) | **0.10%** (2 ÷ 2,090; trials 6, never added) | 30 d to 11-26 | 0.09% (2 ÷ 2,110; trials 5) | 30 d to 11-19 | — |
| 3 | `hint_to_solve` (person-challenge with a wrong submit → that challenge solved ≤ 60 min) | **73.3%** (77) | 105 pairs, 49 people (11-20 → 26) | 82.3% (116) | 141 pairs, 45 people (11-13 → 19) | 0.12 |
| 4 | `second_session_7d` (another `app_opened` > 1 h and ≤ 7 d after the first) | **12.0%** (18) | 150 (cohort 11-13 → 19) | 14.6% (18) | 123 (cohort 11-06 → 12) | 0.59 |
| 5 | Active subscribers (Query 3, `users.data` + webhook amount) | **4** (1 monthly, 3 annual), MRR **$49.58**; 1 in a free trial; 1 lifetime grant outside MRR | snapshot | 4, $49.58 | 11-25 snapshot | — |
| T | **6+ distinct solves in 7 days** (the tournament's decision metric) | **11.3%** (17) | 150 (cohort 11-13 → 19) | 12.2% (15) | 123 (cohort 11-06 → 12) | 0.85 |

The 11-20 → 11-26 cohort's 6-in-7 is still a floor: 12 of 151 (7.9%) with
the runway open. `second_session_7d`'s cross-check (any non-landing row on a
later UTC day within 7 days): 12.7% (19 / 150) against 16.3% (20 / 123).

### Interview-target vs everyone else (#409, entry version)

Interview-target = the first `app_opened`'s `arrivalSrc` is a company page
(`*-sql-interview`), `company:<Name>`, `blog-capital-one` or `readiness`
(the tournament metric's segment; `docs/reads/funnel-by-segment-2026-11-26.md`).

| Number | Interview-target | Everyone else |
|---|---|---|
| `first_solve_10m`, 11-20 → 26 | 23.5% (8 / 34) | 23.9% (28 / 117) |
| `first_solve_10m`, 11-13 → 19 | 7.1% (3 / 42) | 18.5% (20 / 108) |
| 6+ in 7 d, cohort 11-13 → 19 | 9.5% (4 / 42) | 12.0% (13 / 108) |
| 6+ in 7 d, cohort 11-06 → 12 | 8.0% (2 / 25) | 13.3% (13 / 98) |
| `second_session_7d`, cohort 11-13 → 19 | 11.9% (5 / 42) | 12.0% (13 / 108) |
| `second_session_7d`, cohort 11-06 → 12 | 16.0% (4 / 25) | 14.3% (14 / 98) |

Interview-target people were 20–28% of new human openers in these three
weeks (34 / 151, 42 / 150, 25 / 123), above the 15% of the 90-day read.

## What it says (and does not)

- **No number moved beyond noise.** The largest change, `first_solve_10m`
  15.3% → 23.8%, has p = 0.08 at n ≈ 150, and almost all of it is the
  interview-target segment (7.1% → 23.5%, n 42 / 34, p = 0.06). That
  segment's week includes the `companyDirectOpen` arm (live 11-23, which
  opens question 1 for half of zero-solve company arrivals) and #75 (a
  company arrival gets a first question to press). The A/B's own read
  (`docs/reads/company-direct-open-2026-11-27.md`) does not show `direct`
  ahead, so this is not evidence for either change; read it again next
  Friday.
- **`hint_to_solve` 82% → 73%** (p = 0.12) is inside the 73–89% band
  seen since September on varying windows; one week, not a trend.
- **The tournament baseline holds.** 6+ in 7 days reads 11.3% on the
  scorecard's human block against the plan's 11.8% (10-05 → 11-18, 108 /
  915). Interview-target people do **not** reach depth more often (9.5% vs
  12.0%); their 6× money advantage in #409 comes after the price.
- **`second_session_7d` stays at 12–15%**, under the restated 18.7%
  baseline (08-17 → 09-16); the step down is the one B1 dated to the
  09-25/26 cohorts (`docs/reads/second-session-2026-11-25.md`).
- **Money:** 2 first charges and 5–6 trial starts per 30 days on ~2,100
  human visitors. At these counts read the counts, not the rate.

## Method notes

- Every number uses the person-level exclusion block of
  `scripts/scorecard-weekly.sql` (one row marks the whole browser), with
  the `a2a2` prefix rule and `d9fe96e2…` added: A2's 13 walk browsers
  of 11-26 (11:38–11:45 UTC, all first opened that day, one solved) are
  out of the 11-20 → 26 cohort.
- `hint_to_solve` uses the 60-minute person-challenge form of the 11-22
  P1 verdicts: the first `challenge_error_pattern` per (person, challenge)
  in the window, solved within 60 minutes of it.
- The 11-22 Friday-table row used the older filters (no `app1lang`,
  `utc1280`, `cn_app`, …), so its rates are not on this series; read
  week over week from this row on.
- A01 Query 1 was re-run as committed (with the new rule) and reproduced
  the 11-25 block's W40–W47 table **exactly**, every column; the A2 aids
  are all in W48, which is not complete. W47's 7-day columns are still
  floors (runway ends 11-30). Query 3 matches the 11-25 snapshot.
