#!/usr/bin/env bash
# Autonomous SQL Quest agent — one task per invocation.
#
# Shape:  fresh main → branch → Claude Code headless → guard → build:check → PR
#
# It NEVER pushes to main and NEVER merges. Every run ends as a pull request a
# human reviews. Four independent gates have to pass before anything reaches
# the repo, and CI re-runs the whole verification on the PR itself:
#
#   1. scripts/agent/guard.sh   task allowlist, protected paths, money symbols, size cap
#   2. npm run build:check      lint + tests + build + artifact validation
#   3. GitHub Actions on the PR the same checks, from a clean checkout
#   4. you                      the merge button
#
# Usage:  ./run.sh <task-name>        e.g. ./run.sh weekly-read
# Tasks:  scripts/agent/tasks/<task-name>.md
#         line 1 may be `<!-- allowed-paths: A:B -->` — the paths that task
#         may touch; guard.sh enforces it. No header, no allowlist.

set -euo pipefail

TASK="${1:-}"
[ -z "$TASK" ] && { echo "usage: run.sh <task-name>" >&2; exit 2; }

AGENT_HOME="${AGENT_HOME:-/opt/sqlquest-agent}"
REPO="${AGENT_REPO:-$AGENT_HOME/repo}"
LOGDIR="${AGENT_LOGDIR:-$AGENT_HOME/logs}"
# One. The reviewer is the bottleneck, not the writer — an agent that opens
# pull requests faster than a human merges them is generating work, not doing it.
MAX_OPEN_PRS="${AGENT_MAX_OPEN_PRS:-1}"

mkdir -p "$LOGDIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
LOG="$LOGDIR/$TASK-$STAMP.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== agent run: $TASK @ $STAMP ==="

# Secrets live in the environment, never in the repo.
# shellcheck disable=SC1091
[ -f "$AGENT_HOME/.env" ] && set -a && . "$AGENT_HOME/.env" && set +a
: "${GH_TOKEN:?GH_TOKEN not set}"

# Auth: subscription (OAuth token from `claude setup-token`) or API key.
# Subscription is the cheaper default for a solo founder, but it draws from the
# SAME quota as your interactive Claude Code sessions — an overnight fleet can
# leave you rate-limited at your own desk in the morning. Hence the quiet-hours
# window and the hard daily cap below.
if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
  AUTH_MODE="subscription"
elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  AUTH_MODE="api-key"
else
  echo "set CLAUDE_CODE_OAUTH_TOKEN (subscription) or ANTHROPIC_API_KEY (api) in $AGENT_HOME/.env" >&2
  exit 2
fi
echo "auth: $AUTH_MODE"

# --- Quiet hours -----------------------------------------------------------
# Subscription quota is shared with the human. Burn it while they sleep.
# Set AGENT_QUIET_HOURS="" to disable, or AGENT_FORCE=1 for a manual run.
# No colon in the expansion: an explicitly empty AGENT_QUIET_HOURS= must mean
# "disabled", not "fall back to the default". With ${VAR:-default} it silently
# meant the opposite, and the README documented the behaviour the code lacked.
QUIET="${AGENT_QUIET_HOURS-2-6}"
if [ "$AUTH_MODE" = "subscription" ] && [ -n "$QUIET" ] && [ -z "${AGENT_FORCE:-}" ]; then
  HOUR=$(date +%-H)
  QSTART="${QUIET%-*}"; QEND="${QUIET#*-}"
  if [ "$HOUR" -lt "$QSTART" ] || [ "$HOUR" -ge "$QEND" ]; then
    echo "SKIP: outside quiet hours ($QUIET, now ${HOUR}h). AGENT_FORCE=1 to override."
    exit 0
  fi
fi

# --- One run at a time -----------------------------------------------------
# Every task runs in the same checkout, $REPO, and a run starts by wiping it
# (checkout main, reset --hard, clean -fdq). Monday fires three timers half an
# hour apart with a minute of jitter, and TimeoutStartSec allows a run an
# hour, so a second run arriving while the first is still writing is the
# expected case, not the edge. Without a lock, the second run's reset erases
# the first run's in-progress edits and untracked files; the first run's
# `git add -A` then commits whatever both agents wrote onto whichever branch
# is checked out, checked against only the first task's allowlist —
# weekly-read and seo-read both allow docs/reads/, so a mixed PR passes the
# guard under the wrong title. One lock per AGENT_HOME, held for the whole
# run, fd 9. A late arrival waits rather than skips: a systemd oneshot timer
# does not retry, so a skipped Monday run is gone for the week. The wait is
# bounded so a wedged predecessor cannot hold the queue past its own service
# timeout (install-vps.sh sizes TimeoutStartSec as wait + run). Sits before
# the daily cap so a run that gave up waiting does not spend a slot.
command -v flock >/dev/null 2>&1 || { echo "flock not found (util-linux); refusing to run without a repo lock" >&2; exit 2; }
LOCK_WAIT="${AGENT_LOCK_WAIT:-1800}"
exec 9>"$AGENT_HOME/.lock"
if ! flock -w "$LOCK_WAIT" 9; then
  echo "SKIP: another run has held $REPO for ${LOCK_WAIT}s; not sharing a checkout."
  exit 0
fi

# --- Daily cap -------------------------------------------------------------
# A fleet that retry-storms through a rate limit does not just exhaust today's
# window, it eats tomorrow's too. Count runs and stop.
# Five, not four: Monday fires five timers (weekly-read, seo-read, outreach,
# sensor-check, verify), and the counter below increments before the backlog
# guard, so a run that then skips for open PRs still counts. At four, the
# fifth fire — verify, at 04:00 — would be refused every Monday, and a
# verdict that never gets written reads exactly like a change nobody checked.
CAP="${AGENT_MAX_RUNS_PER_DAY:-5}"
TODAY="$(date -u +%Y%m%d)"
COUNTER="$AGENT_HOME/.runs-$TODAY"
RUNS=$(cat "$COUNTER" 2>/dev/null || echo 0)
if [ "$RUNS" -ge "$CAP" ]; then
  echo "SKIP: $RUNS runs already today (cap $CAP)."
  exit 0
fi
echo $((RUNS + 1)) > "$COUNTER"
find "$AGENT_HOME" -maxdepth 1 -name '.runs-*' -mtime +7 -delete 2>/dev/null || true

cd "$REPO"

TASK_FILE="scripts/agent/tasks/$TASK.md"

# --- Backlog guard ---------------------------------------------------------
# If nobody is reviewing, stop producing. An agent that opens PRs faster than a
# human merges them is generating work, not doing it.
#
# Counted PER TASK (branches agent/<task>-*), not fleet-wide. 2026-09-06: with
# a fleet-wide count of 1, every report task that opened a PR blocked every
# other task behind it — on Monday seo-read and outreach-queue skipped behind
# weekly-read, and verify skipped on any day behind the sensor report opened
# fifteen minutes earlier, so the one task that writes verdicts could never
# run. A per-task cap keeps the intent (no pile of unreviewed proposals of one
# kind) without letting a sensor starve the verifier.
OPEN=$(gh pr list --author '@me' --state open --json headRefName \
  --jq "[.[] | select(.headRefName | startswith(\"agent/$TASK-\"))] | length" 2>/dev/null || echo 0)
if [ "$OPEN" -ge "$MAX_OPEN_PRS" ]; then
  echo "SKIP: $OPEN open PR(s) from task $TASK already (cap $MAX_OPEN_PRS per task). Review them first."
  exit 0
fi

# --- Fresh main ------------------------------------------------------------
git fetch --quiet origin
git checkout --quiet main
git reset --hard --quiet origin/main
git clean -fdq

[ -f "$TASK_FILE" ] || { echo "no such task: $TASK_FILE" >&2; exit 2; }

# --- Per-task allowlist ----------------------------------------------------
# A task file may open with `<!-- allowed-paths: docs/reads/ -->` — colon-
# separated bash globs, trailing slash = anything under. guard.sh enforces it;
# no header = no allowlist, exactly the old behaviour. The prompt already
# states the scope in bold, but a prompt is a request and the guard is a wall:
# the denylist never covered src/app.jsx, so a read task that helpfully fixes
# what it found there would reach the reviewer as a PR titled like a report.
# The header stays in the prompt on purpose — the model reads its own scope.
#
# The parse fails CLOSED. An earlier pattern required exactly one space after
# `<!--`, so `<!--allowed-paths: …`, a double space, or a UTF-8 BOM before the
# comment each yielded an empty value, which this script then reported as
# "(none: no header, denylist only)" and guard.sh treated as the old
# no-allowlist behaviour — an editor reflowing the comment silently removed
# the wall for that task. Now: BOM and CR stripped, any whitespace tolerated,
# and a first line that mentions allowed-paths but does not parse aborts the
# run and prints the line, instead of running the task unwalled.
HEADER_LINE="$(head -n 1 "$TASK_FILE" | tr -d '\r')"
BOM="$(printf '\357\273\277')"
HEADER_LINE="${HEADER_LINE#"$BOM"}"
AGENT_ALLOWED_PATHS="$(printf '%s\n' "$HEADER_LINE" \
  | sed -nE 's/^<!--[[:space:]]*allowed-paths:[[:space:]]*([^[:space:]]+)[[:space:]]*-->[[:space:]]*$/\1/p')"
if printf '%s' "$HEADER_LINE" | grep -q 'allowed-paths' && [ -z "$AGENT_ALLOWED_PATHS" ]; then
  echo "malformed allowed-paths header in $TASK_FILE: $(printf '%q' "$HEADER_LINE")" >&2
  exit 2
fi
export AGENT_ALLOWED_PATHS
echo "allowed-paths: ${AGENT_ALLOWED_PATHS:-(none: no header, denylist only)}"

BRANCH="agent/$TASK-$STAMP"
git checkout --quiet -b "$BRANCH"

npm ci --silent

# --- The agent ------------------------------------------------------------
# --dangerously-skip-permissions is deliberate here: this is an unattended
# container with no TTY to answer prompts. It is safe ONLY because of the four
# gates above — the branch is disposable, the guard blocks the money path, and
# nothing merges without a human. Do not reuse this flag interactively.
#
# "Never pushes to main" is true of THIS script, not of the process: the
# agent has a shell, and the checkout's credential helper holds a token with
# Contents read+write, so nothing here stops the model running
# `git push origin HEAD:main` mid-run. That wall is a ruleset on `main` at
# GitHub — pull request required, CI check required, no bypass for the
# fleet's token — and the README's install steps put it before the fleet.
# fd 9 is the run lock; close it for the agent so a background process it
# leaves behind (a dev server, say) cannot hold every later run at the door.
AGENT_OUT="$LOGDIR/$TASK-$STAMP.agent.txt"
set +e
claude -p "$(cat "$TASK_FILE")" \
  ${AGENT_MODEL:+--model "$AGENT_MODEL"} \
  --dangerously-skip-permissions \
  --output-format text 9>&- | tee "$AGENT_OUT"
AGENT_RC=${PIPESTATUS[0]}
set -e
echo "agent exit: $AGENT_RC"

# --- Fail closed on a usage limit -----------------------------------------
# On a subscription the quota is shared with the human. If we hit the ceiling,
# stop for the day rather than retrying — a retry storm burns tomorrow's window
# too, and leaves the founder rate-limited at their own keyboard.
if grep -qiE 'usage limit|rate limit|quota exceeded|429' "$AGENT_OUT" 2>/dev/null; then
  echo "STOP: hit a usage limit. Parking the fleet until tomorrow."
  echo "$CAP" > "$COUNTER"
  git checkout --quiet main 2>/dev/null || true
  git branch -D "$BRANCH" >/dev/null 2>&1 || true
  exit 0
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "DONE: no changes proposed. Nothing to review."
  git checkout --quiet main && git branch -D "$BRANCH" >/dev/null
  exit 0
fi

# --- Gate 1: guardrails ----------------------------------------------------
if ! bash scripts/agent/guard.sh; then
  echo "ABORT: guardrail failed. Branch discarded, nothing pushed."
  git reset --hard --quiet && git checkout --quiet main && git branch -D "$BRANCH" >/dev/null
  exit 1
fi

# --- Gate 2: the project's own verification --------------------------------
if ! npm run build:check; then
  echo "ABORT: build:check failed. Branch discarded, nothing pushed."
  git reset --hard --quiet && git checkout --quiet main && git branch -D "$BRANCH" >/dev/null
  exit 1
fi

# Build artifacts are committed in this repo, so stage everything that survived
# both gates.
git add -A
git commit --quiet -m "agent($TASK): automated proposal $STAMP

Opened by scripts/agent/run.sh. Passed guard.sh and build:check.
Review the diff before merging — this was written unattended.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"

git push --quiet -u origin "$BRANCH"

gh pr create \
  --title "agent($TASK): $STAMP" \
  --body "Automated proposal from \`scripts/agent/run.sh\`, task \`$TASK\`.

Gates passed: \`guard.sh\`, \`npm run build:check\`. CI will re-verify from a clean checkout.

### Measures

Before merging, add a line to \`docs/agent/ledger.md\` under \`## Open\` naming
the metric this is expected to move, its baseline, the target, and a read date:

    - **Metric** <name from docs/agent/metrics.md> — baseline <value>
    - **Target** <value>
    - **Read on** <YYYY-MM-DD>

A change that cannot name a metric it should move is a change nobody will ever
check. The \`verify\` task reads that file on the date and writes the verdict —
including \`MISS\`, which is the outcome worth having.

**Written unattended. Read the diff.** Log: \`$LOG\` on the VPS.

🤖 Generated with [Claude Code](https://claude.com/claude-code)" \
  --base main --head "$BRANCH"

echo "DONE: PR opened from $BRANCH"
