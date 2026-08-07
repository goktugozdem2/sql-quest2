# Ledger — did the change do what it said?

Every entry starts as a claim made at merge time and ends as a verdict measured
on the read date. The verifier (`scripts/agent/tasks/verify.md`) appends the
verdict; nobody edits a claim after the fact.

**Why this file is the point of the whole agent system.** Without it the fleet
only produces more pull requests, and "we shipped a lot" is not the same as
"the numbers moved". The ledger is also the input that lets triage rank work:
if content fixes keep moving numbers, do more; if they do not, stop.

## Verdicts

| verdict | meaning |
|---|---|
| `HIT` | reached or beat the target |
| `MOVED` | moved in the right direction, short of target |
| `FLAT` | inside noise |
| `MISS` | moved the wrong way |
| `UNREADABLE` | n too small, or the window is confounded — say why |
| `UNDEFINED` | the metric is not in `docs/agent/metrics.md`; nothing was measured |

`UNREADABLE` is a real and frequent outcome at this scale. It is not a failure
of the verifier and must never be rounded to `FLAT`.

---

## Open

### challenge-1 rewrite + recommendation routing
- **Claimed** 2026-08-05 · commits `982ad18`, `3dcb8a0` lineage
- **Metric** `challenge_solve_through(1)` — baseline **24%** (138 openers, 33 solvers)
- **Also** `first_contact_share(1)` — baseline **210 first-contacts**, the largest of any challenge
- **Target** solve-through ≥ 40%; first-contact share falls toward zero
- **Read on** 2026-08-12
- **Confound, stated in advance:** the description was rewritten *and* four
  recommendation sites stopped routing here in the same week. If solve-through
  moves you will not know which change did it. `first_contact_share` is the
  clean read — the routing fix should drive it down regardless of copy.
- **Verdict** _pending_

### first-run layout + Run/Submit pinned on mobile
- **Claimed** 2026-08-07
- **Metric** `challenge_solve_through(91)` — baseline **68%** (88 openers, 60 solvers)
- **Also** `first_run_start_writing_rate` — baseline **0%** (event born 08-07)
- **Also** `mobile_give_up_rate` — **no baseline**, viewport stamp born 08-07
- **Target** 91 solve-through ≥ 80%
- **Read on** 2026-08-13
- **Note** the two `Also` metrics have no pre-period by construction. First read
  establishes a baseline; it cannot show a delta. Do not report one.
- **Verdict** _pending_

### working-track reorder: #99 before #100
- **Claimed** 2026-08-07
- **Metric** `first_contact_share(100)` — baseline **67 first-contacts**, 27% first-solve
- **Target** 100 stops appearing as a first challenge for the 'working' level
- **Read on** 2026-08-13
- **Verdict** _pending_

---

## Closed

_Nothing yet. The first entries close 2026-08-12._
