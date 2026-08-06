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

# --- Daily cap -------------------------------------------------------------
# A fleet that retry-storms through a rate limit does not just exhaust today's
# window, it eats tomorrow's too. Count runs and stop.
CAP="${AGENT_MAX_RUNS_PER_DAY:-4}"
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
AGENT_OUT="$LOGDIR/$TASK-$STAMP.agent.txt"
set +e
claude -p "$(cat "$TASK_FILE")" \
  ${AGENT_MODEL:+--model "$AGENT_MODEL"} \
  --dangerously-skip-permissions \
  --output-format text | tee "$AGENT_OUT"
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

**Written unattended. Read the diff.** Log: \`$LOG\` on the VPS.

🤖 Generated with [Claude Code](https://claude.com/claude-code)" \
  --base main --head "$BRANCH"

echo "DONE: PR opened from $BRANCH"
