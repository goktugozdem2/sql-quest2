# `companyDirectOpen` — the read due 2026-11-27 (B2)

Claim: ledger "a company arrival opens question 1 (`companyDirectOpen`,
A/B)". Metric `company_direct_split` (metrics.md). Flipped ON at 50/50 on
2026-11-23 (#226). The 11-27 date comes from orchestrator-decisions
2026-11-26 ("once `companyDirectOpen` reads (11-27) and frees the slot");
the claim's own stop rule, written before the data, decides.

Read-only Supabase MCP, 2026-11-27 ~12:50 UTC. Population: the first
`company_direct_assigned` row per person since 2026-11-23, by `arm`.
Humans only: the person-level exclusion block of
`scripts/scorecard-weekly.sql` with this PR's A2 rule. No
`tournament_assigned` row exists yet (the tournament launches no earlier
than 12-10), so nobody is dropped for it.

## Result

| Arm | n (human) | first solve ≤ 10 min of t0 | first run ≤ 10 min | 3 solves ≤ 24 h | plan click ≤ 14 d | trial or paid ≤ 14 d | opened via `company_direct` ≤ 1 min |
|---|---|---|---|---|---|---|---|
| `direct` | **8** (7 desktop, 1 tablet) | 2 (25%) | 2 (25%) | 2 | 0 | 0 | 8 / 8 |
| `list` | **10** (9 desktop, 1 mobile) | 4 (40%) | 5 (50%) | 2 | 1 | 1 | 0 / 10 |

- Primary: `direct` 2/8 (25%) vs `list` 4/10 (40%): −15 points,
  Fisher p = 0.64, P(`direct` beats `list`) ≈ 0.27 (Beta(1,1) prior). At
  n < 15 per arm this is direction only.
- Secondary (run ≤ 10 min): 2/8 vs 5/10, p = 0.37.
- **The arm does what it says:** every `direct` person had a
  `challenge_opened` with `openedFrom = 'company_direct'` within a minute
  of assignment (8/8; no `nextId` was null). In `list`, 6 of 10 opened a
  challenge within 10 minutes.
- Guardrails: 3 solves in 24 h 2 vs 2. Plan clicks 0 vs 1 and
  trial-or-paid 0 vs 1, with the 14-day windows still open; the hold rule
  (`direct` 0 against ≥ 4 for `list`) is not met.
- Every first `app_opened` was desktop-band except two; the phone cell is
  one person.

## Verdict, by the claim's own rule

**UNREADABLE today — the test continues (extend to its own read).** The
rule has exactly two decision points: the early harm check at **60 per
arm** and HIT / FLAT / MISS at **120 per arm** (hard stop 2027-02-27).
At 8 and 10, neither is reached; the 11-27 date was a schedule note, not
a decision point the claim wrote. Nothing in the rule allows a keep or a
kill now. The flag stays ON at 50/50.

**Desktop open → first-run cell: not freed.** `companyDirectOpen` still
holds one of its two slots, with `runnableStarter` (approved, not yet
flipped) the second. The #91 "Welcome to SQL!" test for interview
arrivals waits.

## Things the orchestrator should know

1. **Volume is the problem, not the arms.** 18 human assignments in
   3.5 days (~5 a day, ~2.6 per arm). At that rate the harm check (60 per
   arm) falls around 2026-12-16 and the decision (120 per arm) around
   2027-01-08. The tournament plan (launch ≥ 12-10) keeps only
   non-tournament / arm-A people in this read, a quarter of the flow from
   then: about 44 per arm by 12-10, the harm check around 2027-01-04,
   and 120 per arm around April — **after the 2027-02-27 hard stop, so on
   that path the claim ends UNREADABLE** and the flag goes off by its own
   rule. Either launch the tournament after this test's 120 (the plan's
   own gate), or accept UNREADABLE now and free the slot; that choice is
   the orchestrator's (rule: "do not extend a second time").
2. **The metric's SQL in metrics.md does not exclude the crawlers.** 63
   browsers were assigned; **45 of them (71%) are `app1lang`** (24
   `direct`, 21 `list`; 0 runs, 0 solves) and 2 carry a bot stamp. The
   `company_direct_split` block filters only `metadata.bot` and internal
   names, so read as written it would report ~32 vs ~31 per arm and
   rates diluted about threefold. Read this test only on the
   `scorecard-weekly.sql` exclusion block (as here). Changing the
   metric's SQL is a definition change for its own PR (fleet README 6b);
   BACKLOG line, owner B2.
3. The `list` arm's single trial-or-paid person is n = 1; it tells
   nothing about the money door yet.
