# The fleet — how every agent runs (2026-11-22)

The roster and its reasons are in `docs/plans/agent-fleet-2026-11-22.md`.
Each agent has a brief in this folder, and the orchestrator starts an agent
by handing it its brief. The orchestrator is the main loop: the laptop
session, with the scheduled task `sqlquest-autodev-loop` as its fallback.
An agent reads `CLAUDE.md`, this file and its own brief, in that order.

## G1 sets the day's work (2026-11-22)

G1, the goal owner (`G1-goal.md`), runs first every day. A scheduled cloud
task fires it at 06:47 Europe/Istanbul, and the laptop orchestrator runs it
when no plan for the day exists. It does three things:
- reads the current objective (`objectives.md`) against the newest numbers;
- names the short lever;
- writes `docs/agent/goal/<date>.md`: at most 6 rows, each with a lever, an
  expected effect and a read date.

**The orchestrator takes its rows from that plan before anything else.** The
dated `queue-*.md` files are history. The running state of the objective is
`docs/agent/goal/tracker.md`.

## The common protocol (every agent)

1. **Workspace.** Fetch `origin/main`:
   `git -c credential.helper= -c credential.helper='!gh auth git-credential' fetch -q https://github.com/goktugozdem2/sql-quest2.git main:refs/remotes/origin/main`.
   Then work in your own worktree under the session scratchpad, branched from
   `origin/main`:
   `git -C /Users/cgozdemm/sql-quest2 worktree add <scratchpad>/w-<agent>-<date> -b <lane>/<slug> origin/main`.
   Symlink `node_modules` from `<scratchpad>/w-fastcheckout/node_modules`.
   Never edit `/Users/cgozdemm/sql-quest2` itself.
2. **Data.** Supabase through MCP is read-only. Read metadata as
   `(metadata #>> '{}')::jsonb`, and count a person as
   `coalesce(aid, username)`. Exclude bots (`metadata.bot`, viewports
   `tablet:800x600`, `desktop:1280x1200`, `desktop:1919x992`,
   `ref:aocr.org`), internal usernames
   (`^(test|qa_|fabletest|linktest|internalroutine|sqlquest$|elena$)`), and
   the founder's own checkout tests (2026-11-20 guest sessions with reason
   `email_link` and 0 solves).
3. **Proof.**
   - Every new test fails by name under one deliberate break, and the
     commit says which break.
   - `npm run build`, `npm run test:run` and `npm run lint` (0 errors).
   - A visible change also gets a headless check (`scripts/smoke/lib.mjs`
     against the worktree's `public/` on a free port) and
     `SMOKE_HERMETIC=1 node scripts/smoke-test.js http://localhost:<port>`.
   - Never make a real AI-tutor call; they are billed.
4. **Claim.** A product change gets a ledger claim: a metric from
   `docs/agent/metrics.md`, a baseline, a target, a falsification written
   in advance, and a read date within 28 days.
5. **Commit.**
   - Stage with `git add <paths>`, never `-A`. Never stage `public/weekly/`.
     Stage `src/data/sitemap-lastmod.json` together with any page you change.
   - End the commit message with the session's `Co-Authored-By` line.
   - Push:
     `git -c credential.helper= -c credential.helper='!gh auth git-credential' push https://github.com/goktugozdem2/sql-quest2.git <branch>`
     (never with the redaction hook skipped; see "Two runtimes" for the bundles).
   - Open the PR with `gh pr create`. Its body ends with the session's
     PR attribution line.
6. **Merge rule.**
   - A **docs-only** PR (only `docs/**` and/or `BACKLOG.md`) may be merged
     by its author with `<scratchpad>/mergeone.sh <PR#>`.
   - **A content PR goes to Q1 (content QA) first**, which posts QA PASS / QA FAIL
     (`Q1-content-qa.md`). A FAIL goes back to the author.
   - **Any other PR is left open for A1 (reviewer)**, which posts MERGE /
     REVISE / REJECT. **A0 (gate) then decides the go** and merges, in the
     founder's place (delegated 2026-11-22, `A0-gate.md`). Never merge your
     own code PR.
   - A failing "Vercel" check that says "Deployment rate limited" is the
     Hobby build limit, not a code fault.
7. **Never:**
   - send email or post anywhere (Gmail drafts only, and only E1 / C3 / C4
     write them);
   - write to the production DB or run `supabase functions deploy`;
   - change prices, Stripe settings or money flags (the founder decides);
   - put customer names or addresses in the repo;
   - edit a surface another agent's lane owns.

   Anything that needs the founder goes into your report under "FOUNDER:".
8. **Report.** End with a short Turkish summary for the founder, then one
   machine line the orchestrator logs:

       FLEET-RESULT {"agent":"A2","outcome":"pr|merged|read|drafts|noop|blocked","prs":[123],"value":"one line: what changed for a person or what we learned","founder":["..."]}

## Two runtimes — who does what (2026-11-22)

- **Cloud** (claude.ai/code): A0 gate, A1 reviewer and every lane that needs
  only the repo (content, local QA, page and SEO work from data already in the
  repo). The cloud's A1 and A0 review and merge **all** agent PRs, laptop ones
  included, and log each decision in `decisions.md`. The cloud cannot reach
  production data, Gmail or sqlquest.app.
- **Laptop** (the main session plus `sqlquest-autodev-loop`): the lanes that
  need read-only Supabase, the GSC/Bing tables, Gmail drafts or the live site
  (B1, B2, A3, E1, C1/C2 reads, production QA after a deploy). The laptop
  **does not review or merge cloud PRs**; it opens its own PRs and leaves
  them for A1 → A0, except docs-only PRs, which it may self-merge.
- **Build output from the laptop.** The laptop's pre-push redaction hook
  cannot scan `public/app.js`, `public/app.js.map` or `public/data.js`
  (> 1 MB), and agents may not bypass it. A laptop code PR therefore commits
  **source only** and leaves those three bundles out. It says so in the PR
  body, and A0 merges `origin/main` in, rebuilds and pushes the bundles from
  the cloud before merging. Never push with `GSTACK_REDACT_PREPUSH=skip`.

## Budgets

- At most **2 code agents** at a time; read and draft agents run beside them.
- About **15 merges a day** across the fleet. The Vercel Hobby build limit
  was hit on 2026-11-22, and a rate-limited deploy is never retried; the
  next push is what deploys.
- When a run finds nothing worth doing, the agent reports `noop` and stops.
  A `noop` is a good outcome, not a failure.

## Performance and optimization

- The orchestrator logs each run in `~/.claude/sqlquest-fleet/state.json`,
  outside the repo: agent, start, duration, tokens, outcome, PRs and value.
- On Mondays, D2 (retro) writes `docs/agent/fleet-scorecard.md`. Each agent
  gets: runs, PRs merged, PRs rejected by A1, reverts, tokens per merged
  PR, and its own number from the plan. The changes D2 makes:
  - an agent with two weeks of `noop` or rejected work moves to a slower
    cadence or pauses;
  - an agent whose brief caused a rejected PR gets its brief tightened in
    this folder;
  - cadence goes up only where merged work moved the agent's number.
