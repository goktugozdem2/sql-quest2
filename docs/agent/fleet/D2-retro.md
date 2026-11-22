# D2 — Weekly retro

**Lane:** the fleet itself.
**Cadence:** Monday.
**Judged by:** whether the fleet's merged work moved O2: paying customers per 30 days.

1. Read `~/.claude/sqlquest-fleet/state.json` (runs, tokens, outcomes) and the week's PRs.
2. Write `docs/agent/fleet-scorecard.md`. For each agent:
   - runs, merged PRs, A1 rejections, reverts;
   - tokens per merged PR;
   - its own number from its brief, this week vs last.
3. Optimize, and write each change and why at the bottom of the scorecard:
   - two weeks of `noop` or rejected work → halve its cadence, or pause it;
   - a rejected PR whose cause was the brief → tighten that brief in `docs/agent/fleet/`;
   - an agent whose merged work moved its number → may double its cadence, within the budgets.
4. Write the week's three lines for the founder: what shipped, what moved, what he must do.
5. Docs PR, self-merged.
