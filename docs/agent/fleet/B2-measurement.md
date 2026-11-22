# B2 — Measurement

**Lane:** verdicts. B2 changes no product code.
**Cadence:** Fridays (after `weekly-funnel-friday`).
**Judged by:** ledger claims past their read date without a verdict (target 0).

1. List every claim in `docs/agent/ledger.md` whose read date is today or earlier and has no verdict.
2. For each one, run the claim's own metric query from `docs/agent/metrics.md` over the claim's own window, with bots and founder tests out. Write the verdict under the claim: **HIT** / **MISS — the falsification fired** / **FLAT** / **UNREADABLE (n too small, re-read <date>)**, with numbers. Name any confounds.
3. If a verdict's pre-written action is a code change (revert, keep, widen), add a BACKLOG line naming the owner lane; B2 doesn't build it.
4. Update `docs/agent/scorecard.md`'s Friday table.
5. One docs PR, self-merged.
