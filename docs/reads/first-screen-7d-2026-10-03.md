# First-screen test — the 7-day read (2026-10-03)

`firstScreenChallenge` on 2026-09-26 (flag-queue log). Ledger claim "the first
screen is a challenge, not a quiz"; metric `first_screen_split`. This is the
7-day check the log scheduled, **not** the claim's read (2026-10-17, flip + 21
days, n ≥ 300 per arm).

## Population
People whose `first_screen_assigned` came within 2 minutes of their first
`app_opened`, 09-26 → 10-03 16:45 UTC, internal accounts excluded. Bots
excluded by the two known fingerprints (tz America/Los_Angeles + desktop:1920x1080
+ no landingSrc; tz UTC + desktop:1280x720): **84 bot rows (50 challenge / 34
quiz), all from 09-30, all 0 solves** — they would drag the challenge arm from
51.3% to 35.8% on paper. The remaining viewport clusters (1528x732, 1912x948,
1272x588 from Bing) span 2–6 timezones each and carry real solves: laptops,
not one machine.

## Result (bots out)

| | challenge | quiz |
|---|---|---|
| people | 115 | 130 |
| **first_solve_10m** | **51.3%** (59) | **21.5%** (28) |
| opened a challenge in 10 min | 100% | 54.6% |
| ever solved | 56.5% | 32.3% |
| 2+ distinct solves | 38.3% | 27.7% |
| 5+ distinct solves | 26.1% | 15.4% |
| active on 2+ days | 24.3% | 15.4% |
| saw the Pro modal | 26.1% | 13.8% |
| plan clicks (people) | 4 | 2 |
| signed up | 16.5% | 11.5% |
| median session span | 13.3 min | 1.7 min |

Desktop only: 54.3% vs 23.7% (105 / 118). Mobile and tablet: 10 and 12
people — unreadable.

Baseline (quiz for all, 08-24 → 09-20): 12.4%. Both arms are above it this
week; the confounds (`diagnosisHints` and two other P1 flags on 09-30, the free
quota and the trial) hit both arms alike — the split is randomised by aid.

## What it means
- Primary gap +29.8 points against a target of +5; at these n that is far
  outside noise (two-proportion z ≈ 4.8).
- The revert condition (challenge arm up, `pct_ever_solved` down) is not
  met: ever-solved is up 24 points, and every later step — second solve,
  fifth solve, second day, modal — is higher in the challenge arm.
- **n is 115 / 130, under the 300 per arm the claim requires.** The
  pre-registered rule says: change nothing, read on 10-17. So the test keeps
  running; no arm is shipped to 100% today.
- If 10-17 holds: ship the challenge arm to everyone, and the quiz moves
  behind the first solve (that also frees the `adaptivePlacement` row, which
  waits on this test).
