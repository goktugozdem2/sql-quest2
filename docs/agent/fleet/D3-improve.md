---
id: D3
name: "Improve the fleet from its results"
owner: orchestrator
runtime: laptop
status: active
cadence: "weekly (Mon, after D2); monthly meta check"
metric: [purchases]
writes_code: false
version: 1.0.0
last_changed: 2026-11-26
---
# D3 — Improve the fleet from its results

**Lane:** the fleet's own instructions: briefs, menus, cadences, the daily merge slots.
**Cadence:** weekly, Monday, right after D2's scorecard. It runs on the laptop because it needs production numbers. A monthly meta check runs on the first Monday of each month.
**Judged by:** O2, paying customers per 30 days. Nothing else.

Founder, 2026-11-23: "Recursive self improvement nasıl yaparsın daha fazla subscription için." D2 counts what the fleet did. D3 changes what it will do, based on what paid.

## The three loops

1. **Product loop (exists).** Every change carries a ledger claim, and the claim gets a verdict. D3 does not run this loop. It enforces it: **a surface with an overdue verdict gets no new experiment** until the verdict is written. On 2026-11-23 five verdicts were overdue (#274).
2. **Fleet loop (this brief, weekly).** Turn verdicts and attributed money into changes to the briefs.
3. **Meta loop (monthly).** Judge the fleet loop itself. Did the changes D3 made come before an O2 move? If they did not, simplify.

## Weekly run

1. **Attribute.** For the last 28 days, read every trial and purchase with its first door (`arrivalSrc`, `landingSrc`, the content `src=` door from #173) and the page or feature it came through. Credit each one to the lane that made or last changed that page or feature (git blame on the page source, or the ledger claim's lane). Unattributed is its own row. Never spread it across lanes.
2. **Score each lane** on payers + trials per merged person-visible PR, and on its leading indicator from its brief. Show both. A lane with money and no leading indicator is fine. A lane with a leading indicator and no money for 8 weeks is suspect.
3. **Reallocate,** within the README budgets:
   - **Lanes with attributed money:** they get the first merge slots in A0's train and may double their cadence.
   - **Lanes with 4 weeks of zero attributed trials or purchases and a flat leading indicator:** halve their cadence. After 8 weeks, pause them.
   - **The menu:** reorder each content lane's menu (C5, C6, C7, B3) by money per hour measured, not expected.
4. **Rewrite briefs from verdicts.** Every verdict written that week becomes one line:
   - **HIT:** add a line to the owning brief's "what works" section, with the number and the ledger link.
   - **MISS or UNREADABLE:** add a line to its "don't re-learn" section, and remove any menu item that depended on it.
   - **The same defect twice** in Q1 or A1 reviews of one lane: add a check to that lane's brief.
5. **One PR per week** (`docs/d3-<date>`), docs only. A1 reviews it. A0 merges it unless it removes a guard, a held kind or a hard limit. Those stay with the founder.
6. **Three lines for the founder:** what earned money, what was cut, what changed in which brief.

## The skills loop, weekly (2026-11-26)

Every brief in this folder is a versioned skill (README, "The skills loop"). Each Monday, after the steps above:

1. Read `docs/agent/fleet/papercuts.md` (open rows) and the last 7 days of the run ledger `docs/agent/fleet/runs/*.jsonl` (`papercuts`, `outcome`, `minutes`, merged vs opened).
2. For each open papercut and each lane whose runs went `noop`, `blocked` or REVISE twice, propose a brief edit, **as a PR**: bump the brief's `version` (patch for wording, minor for a new rule or step, major for a changed lane or metric), set `last_changed`, add a `## Changelog` line that names the papercut or trace it answers, and mark the papercut row `fixed — #PR` in the same PR.
3. **Owner-reviewed, never self-merged:** A1 reviews edits to cloud lanes; the orchestrator reviews edits to laptop lanes; the founder reviews any edit that touches a money or outward rule (prices, money flags, sends, the session-token cut), whatever the lane.
4. Run `npm run fleet:index` and commit `SKILLS.md` with the edit; `tests/fleet-skills.test.js` must pass.

## Monthly meta check

- Compare O2's 30-day payers against the 4 weeks before the first D3 run, and against the checkpoints in `objectives.md`.
- List every D3 reallocation of the month and what followed it. With n this small, say plainly that the read is confounded.
- **Two months with no O2 move:** cut the fleet to the lanes with attributed money plus the gate (Q1, A1, A0). Fewer agents means less noise in every read.

## Guardrails (each one exists because an optimizer will find the shortcut)

- **Money is the target. Clicks, impressions and merges are not.** A lane that grows clicks while payers stay flat is not rewarded.
- **Guardrail metrics are checked before any reward:**
  - refunds and disputes;
  - `first_solve_10m`;
  - `second_session_7d`;
  - modal → checkout.
  A lane whose change moved one of these the wrong way loses the reward that week.
- **No self-grading.** D3 never scores its own changes. The monthly meta check is read by A1, and the founder gets the three lines.
- **Same-model blind spots.** Brief changes that touch money, auth, the quota wall or checkout are held for an independent reviewer, the same as code.
- **Small n.** With fewer than about 10 payers in a month, a lane's money row is a signal, not a verdict. Use the funnel chain to explain it, and never cut a lane on one week:
  landing → app open → first solve → 6 solves → modal → checkout → trial → paid.
- **Hard limits never move through D3:** prices, money flags, sends, production writes, the session-token cut.
- **No customer-level detail in the repo.** Per-page and per-lane money numbers go in the laptop's mailed report, not in this public repo. The PR carries ranks and directions only.

## Changelog

- 1.0.0 (2026-11-26) — versioned for the skills loop: front-matter added. The weekly skills loop (papercuts + run ledger → versioned brief edits) added.
