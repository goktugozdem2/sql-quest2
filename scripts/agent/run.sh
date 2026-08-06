#!/usr/bin/env bash
# Autonomous SQL Quest agent — one task per invocation.
#
# Shape:  fresh main → branch → Claude Code headless → guard → build:check → PR
#
# It NEVER pushes to main and NEVER merges. Every run ends as a pull request a
# human reviews. Four independent gates have to pass before anything reaches
# the repo, and CI re-runs the whole verification on the PR itself:
#
#   1. scripts/agent/guard.sh   protected paths, money symbols, size cap
#   2. npm run build:check      lint + tests + build + artifact validation
#   3. GitHub Actions on the PR the same checks, from a clean checkout
#   4. you                      the merge button
#
# Usage:  ./run.sh <task-name>        e.g. ./run.sh weekly-read
# Tasks:  scripts/agent/tasks/<task-name>.md

set -euo pipefail

TASK="${1:-}"
[ -z "$TASK" ] && { echo "usage: run.sh <task-name>" >&2; exit 2; }

AGENT_HOME="${AGENT_HOME:-/opt/sqlquest-agent}"
REPO="${AGENT_REPO:-$AGENT_HOME/repo}"
LOGDIR="${AGENT_LOGDIR:-$AGENT_HOME/logs}"
MAX_OPEN_PRS="${AGENT_MAX_OPEN_PRS:-3}"

mkdir -p "$LOGDIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
LOG="$LOGDIR/$TASK-$STAMP.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== agent run: $TASK @ $STAMP ==="

# Secrets live in the environment, never in the repo.
# shellcheck disable=SC1091
[ -f "$AGENT_HOME/.env" ] && set -a && . "$AGENT_HOME/.env" && set +a
: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY not set}"
: "${GH_TOKEN:?GH_TOKEN not set}"

cd "$REPO"

TASK_FILE="scripts/agent/tasks/$TASK.md"

# --- Backlog guard ---------------------------------------------------------
# If nobody is reviewing, stop producing. An agent that opens PRs faster than a
# human merges them is generating work, not doing it.
OPEN=$(gh pr list --author '@me' --state open --json number --jq 'length' 2>/dev/null || echo 0)
if [ "$OPEN" -ge "$MAX_OPEN_PRS" ]; then
  echo "SKIP: $OPEN agent PRs already open (cap $MAX_OPEN_PRS). Review them first."
  exit 0
fi

# --- Fresh main ------------------------------------------------------------
git fetch --quiet origin
git checkout --quiet main
git reset --hard --quiet origin/main
git clean -fdq

[ -f "$TASK_FILE" ] || { echo "no such task: $TASK_FILE" >&2; exit 2; }

BRANCH="agent/$TASK-$STAMP"
git checkout --quiet -b "$BRANCH"

npm ci --silent

# --- The agent ------------------------------------------------------------
# --dangerously-skip-permissions is deliberate here: this is an unattended
# container with no TTY to answer prompts. It is safe ONLY because of the four
# gates above — the branch is disposable, the guard blocks the money path, and
# nothing merges without a human. Do not reuse this flag interactively.
set +e
claude -p "$(cat "$TASK_FILE")" \
  --dangerously-skip-permissions \
  --output-format text
AGENT_RC=$?
set -e
echo "agent exit: $AGENT_RC"

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

**Written unattended. Read the diff.** Log: \`$LOG\` on the VPS.

🤖 Generated with [Claude Code](https://claude.com/claude-code)" \
  --base main --head "$BRANCH"

echo "DONE: PR opened from $BRANCH"
