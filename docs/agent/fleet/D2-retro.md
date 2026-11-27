---
id: D2
name: "Weekly retro"
owner: orchestrator
runtime: laptop
status: active
cadence: "weekly (Mon)"
metric: [purchases]
writes_code: false
version: 1.0.0
last_changed: 2026-11-26
---
# D2 — Weekly retro

**Lane:** the fleet itself.
**Cadence:** Monday.
**Judged by:** whether the fleet's merged work moved O2: paying customers per 30 days.

1. Read the run ledger `docs/agent/fleet/runs/<YYYY-MM>.jsonl` (one line per lane run: minutes, tokens, outcome, PRs, merged, papercuts), `docs/agent/fleet/SKILLS.md` (`npm run fleet:index`) and the week's PRs. The laptop's `~/.claude/sqlquest-fleet/state.json` is the orchestrator's scratch copy; the ledger is the record.
2. Write `docs/agent/fleet-scorecard.md`. For each agent:
   - runs, merged PRs, A1 rejections, reverts;
   - tokens per merged PR;
   - its own number from its brief, this week vs last.
   - **with/without by brief version:** merged-PR rate, A1 REVISE rate and minutes per run, before vs after the brief's last version bump (`version` / `## Changelog`). A brief edit that did not move them is reported as such.
3. Optimize, and write each change and why at the bottom of the scorecard:
   - two weeks of `noop` or rejected work → halve its cadence, or pause it;
   - a rejected PR whose cause was the brief → tighten that brief in `docs/agent/fleet/`;
   - an agent whose merged work moved its number → may double its cadence, within the budgets.
4. Write the week's three lines for the founder: what shipped, what moved, what he must do.
5. Docs PR, self-merged.

## Changelog

- 1.0.0 (2026-11-26) — versioned for the skills loop: front-matter added. Step 1 reads the repo run ledger; step 2 adds the with/without comparison by brief version.
