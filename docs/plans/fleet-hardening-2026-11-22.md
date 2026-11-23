# Fleet hardening: running SQL Quest 24/7 with agents, safely (2026-11-22)

This plan rests on `docs/reads/autonomous-dev-sources-2026-11-22.md`, which
covers 30 sources. The orchestrator re-read the three load-bearing claims at
the source on 11-22:

- **Anthropic, "How we built Claude Code auto mode"** (published 2026-03-25).
  On real over-eager actions the classifier misses **17%** (n = 52). Anthropic
  calls it "the honest number", and says auto mode is not a replacement for
  careful human review on high-stakes infrastructure. The auto-mode docs say
  `permissions.deny` and `permissions.ask` rules are evaluated *before* the
  classifier, and they point to PreToolUse hooks for full-command checks.
- **Simon Willison, "The lethal trifecta"** (2025-06-16). The three
  ingredients are private data, untrusted content, and a way to communicate
  out. Guardrail products cannot be relied on; avoid the combination.
- **Meta, "Agents Rule of Two"** (2025-10-31). A session should hold at most
  two of three properties: untrusted input, sensitive data, and the ability to
  change state or communicate. A task that needs all three runs supervised.

## What this means for us, in one paragraph

Today our "nevers" are words in a README, enforced only by the agents'
compliance and the auto-mode classifier, which misses about one over-eager
action in six. `main` accepts direct pushes. Every agent acts on GitHub as
the founder. The laptop session holds Gmail, read-only production data,
open-web reading and `gh` all at once: the trifecta. The fleet works because
the agents behave well, not because anything stops them when they don't.
The plan below turns the most important rules into mechanisms, cheapest
first.

## Done on 11-22 by the agents (docs-level, merged)

| # | Change | Source |
|---|---|---|
| 1 | Lethal-trifecta rule. Untrusted text is data. A draft goes to the named recipient only. Web-reading runs take no customer rows; customer-data runs read no web. Nothing is sent automatically. (README 7b, #197) | Willison; Meta Rule of Two |
| 2 | PAUSE switch: `docs/agent/fleet/PAUSE` halts every agent at its first step (README rule 0) | Anthropic long-running harnesses; ops practice |
| 3 | Task claims with a 4-hour expiry in `claims.md`, so two runtimes stop doing the same work | Cognition "Don't build multi-agents"; our duplicated work on 11-22 |
| 4 | Run caps: about 45 min, about 150 tool calls, 2 PRs, at most 3 retries per step | Anthropic multi-agent research system; Willison on agent loops |
| 5 | Never grade yourself: a metric, test or scorer change ships in its own PR | Anthropic reward-hacking research |
| 6 | New lanes start supervised: their first 5 runs are drafts, merged only once trusted | Anthropic "measuring agent autonomy" |
| 7 | The same model cannot audit itself: money, auth, permission and `supabase/` PRs are held for a look outside the model family, and D2 samples 3 merged PRs a week for the founder | Project Vend |
| 8 | A1 brief fixed: A1 gives the verdict, A0 merges (the brief had said A1 merges) | our own drift |

## Needs the founder: settings, accounts, money

These are the high-leverage, mechanical steps. They are yours because they
change permissions, accounts or spend, and no agent may change its own
permissions.

1. **Protect `main`** (GitHub → Settings → Rules). Require a pull request and
   the `verify` status check before merging. Keep "no force push / no
   delete". Don't require a human review yet, or A0 cannot merge. This one
   setting turns "never push to main" from a rule into a fact.
2. **A separate merge identity for A0.** A GitHub App or a machine user with
   merge rights, so "an agent never merges its own PR" becomes checkable.
   Every agent acts as you today.
3. **Deny rules for the laptop**, in `~/.claude/settings.json` or the repo's
   `.claude/settings.json`. Per Anthropic's docs these are checked before the
   classifier. A starting set to review:
   - deny: `Bash(supabase functions deploy:*)`, `Bash(supabase db query --linked:*)`,
     `Bash(git push --force:*)`, `Bash(git add -A:*)`,
     `Bash(GSTACK_REDACT_PREPUSH=skip:*)`, the Gmail **send** tools (`send_message`,
     `reply`, `forward`), and `Bash(git push * main)`;
   - ask: `Bash(gh pr merge:*)`, `Bash(vercel:*)`.

   Today's local settings hold about 800 allow rules and no deny rules.
4. **Gmail on the laptop.** Keep the draft and read tools and disconnect the
   send tools. That removes the trifecta's "way out" for good.
5. **Spend caps.** A capped Anthropic workspace for the fleet, separate from
   the tutor's $10 workspace, so a runaway loop hits a ceiling.
6. **A second-model reviewer** for money, auth and permission PRs, when you
   want one. Until then, you skim D2's 3 sampled PRs each week.

## Later (agents can do these; ordered)

- **Trim CLAUDE.md** from about 1,400 lines to a map of about 150 lines that
  points into `docs/`. Every agent reads all of it on every run. That costs
  tokens and buries the rules that matter. This is a large rewrite of the
  project's instructions, so it goes through you before it ships.
- **A per-lane state file in the repo** (`docs/agent/fleet/state/<ID>.md`)
  holding the last run, the open threads and the next step, with no customer
  data, so a lane resumes in either runtime.
- **D2 adds change-failure rate and time-to-restore** (DORA), and a PR-size
  cap that matches review capacity.
- **Anomaly alerts.** More than N PRs an hour, more than N failed runs in a
  row, or deploy-cap use above 80% → create PAUSE and tell the founder.
