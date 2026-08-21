#!/usr/bin/env bash
# One-shot VPS setup for the SQL Quest autonomous agent.
# Run this ON the VPS, as the user that will own the agent. Not as root.
#
#   curl -fsSL https://raw.githubusercontent.com/goktugozdem2/sql-quest2/main/scripts/agent/install-vps.sh | bash
#
# or clone first and run it locally. It is idempotent — safe to re-run.

set -euo pipefail

AGENT_HOME="${AGENT_HOME:-$HOME/sqlquest-agent}"
REPO_URL="${AGENT_REPO_URL:-git@github.com:goktugozdem2/sql-quest2.git}"

echo "==> Installing SQL Quest agent into $AGENT_HOME"

# --- prerequisites ---------------------------------------------------------
need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING: $1"; return 1; }; }
MISSING=0
need git  || MISSING=1
need node || MISSING=1
need gh   || MISSING=1
if [ "$MISSING" = 1 ]; then
  cat <<'EOF'

Install the missing tools first. On Debian/Ubuntu:

  sudo apt update
  sudo apt install -y git curl
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  (type -p wget >/dev/null || sudo apt install wget -y) \
    && sudo mkdir -p -m 755 /etc/apt/keyrings \
    && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg >/dev/null \
    && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       | sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null \
    && sudo apt update && sudo apt install -y gh

  npm install -g @anthropic-ai/claude-code

EOF
  exit 1
fi
command -v claude >/dev/null 2>&1 || {
  echo "==> Installing Claude Code"
  npm install -g @anthropic-ai/claude-code
}

mkdir -p "$AGENT_HOME/logs"

# --- secrets FIRST ---------------------------------------------------------
# The clone needs GH_TOKEN, so secrets have to exist before we try it. An
# earlier version of this script cloned first and told you about the deploy key
# afterwards, which could never work on a fresh box.
#
# We authenticate git over HTTPS with the same GH_TOKEN that `gh pr create`
# already needs. One credential instead of two — no deploy key, no SSH key, no
# password anywhere.
if [ ! -f "$AGENT_HOME/.env" ]; then
  cat > "$AGENT_HOME/.env" <<'EOF'
# Fill these in, then re-run install-vps.sh. Never commit this file.
#
# AUTH — pick ONE.
#
#   Subscription (cheaper, recommended for a solo founder):
#     run `claude setup-token` on any machine where you are logged in,
#     paste the result here. Draws from the SAME quota as your interactive
#     sessions, so the fleet is capped and confined to quiet hours below.
#
#   API key (isolated quota, pay per token):
#     console.anthropic.com -> API keys
#
CLAUDE_CODE_OAUTH_TOKEN=
# ANTHROPIC_API_KEY=

# GitHub: github.com/settings/tokens -> fine-grained, this repo only,
#         Contents: read+write, Pull requests: read+write
GH_TOKEN=

# --- Budget discipline (subscription mode) ---------------------------------
# Quiet hours in LOCAL server time. The fleet only runs inside this window so
# it burns quota while you sleep, not while you work. "" disables.
AGENT_QUIET_HOURS=2-6
# Hard stop, regardless of how many timers fire.
AGENT_MAX_RUNS_PER_DAY=4
# One open PR at a time: the reviewer is the bottleneck, not the writer.
AGENT_MAX_OPEN_PRS=1
# Cheap work on a cheap model. Override per-task in the timer if needed.
# AGENT_MODEL=claude-sonnet-5

# AGENT_MAX_CHANGED_LINES=400
EOF
  chmod 600 "$AGENT_HOME/.env"
  echo
  echo "==> Wrote $AGENT_HOME/.env"
  echo "    Fill in ANTHROPIC_API_KEY and GH_TOKEN, then run this script again."
  exit 0
fi
chmod 600 "$AGENT_HOME/.env"

# shellcheck disable=SC1091
set -a && . "$AGENT_HOME/.env" && set +a
if [ -z "${CLAUDE_CODE_OAUTH_TOKEN:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Set CLAUDE_CODE_OAUTH_TOKEN (subscription) or ANTHROPIC_API_KEY (api) in $AGENT_HOME/.env"
  echo "For the subscription: run 'claude setup-token' where you are logged in, paste the result."
  exit 1
fi
[ -n "${GH_TOKEN:-}" ] || { echo "GH_TOKEN is empty in $AGENT_HOME/.env"; exit 1; }

# --- repo ------------------------------------------------------------------
# Token goes in the credential helper, not in the remote URL — a URL with a
# token in it ends up in `git remote -v`, in logs, and in every error message.
git config --global credential.helper store
printf 'https://x-access-token:%s@github.com\n' "$GH_TOKEN" > "$HOME/.git-credentials"
chmod 600 "$HOME/.git-credentials"

HTTPS_URL="$(printf '%s' "$REPO_URL" | sed -E 's#^git@github\.com:#https://github.com/#')"

if [ -d "$AGENT_HOME/repo/.git" ]; then
  echo "==> Repo present, fetching"
  git -C "$AGENT_HOME/repo" remote set-url origin "$HTTPS_URL"
  git -C "$AGENT_HOME/repo" fetch --quiet origin
else
  echo "==> Cloning $HTTPS_URL"
  git clone --quiet "$HTTPS_URL" "$AGENT_HOME/repo"
fi

git -C "$AGENT_HOME/repo" config user.name  "sqlquest-agent"
git -C "$AGENT_HOME/repo" config user.email "agent@sqlquest.app"

# --- systemd timers --------------------------------------------------------
# User units, so this needs no root. Enable lingering once so they fire while
# you are logged out:  sudo loginctl enable-linger "$USER"
UNIT_DIR="$HOME/.config/systemd/user"
mkdir -p "$UNIT_DIR"

make_unit() {
  local name="$1" task="$2" cal="$3" desc="$4"
  cat > "$UNIT_DIR/$name.service" <<EOF
[Unit]
Description=$desc

[Service]
Type=oneshot
Environment=AGENT_HOME=$AGENT_HOME
WorkingDirectory=$AGENT_HOME/repo
ExecStart=/usr/bin/env bash $AGENT_HOME/repo/scripts/agent/run.sh $task
TimeoutStartSec=3600
EOF
  cat > "$UNIT_DIR/$name.timer" <<EOF
[Unit]
Description=$desc (timer)

[Timer]
OnCalendar=$cal
Persistent=true
RandomizedDelaySec=600

[Install]
WantedBy=timers.target
EOF
}

# Scheduled inside AGENT_QUIET_HOURS so a subscription-backed fleet spends the
# shared quota overnight. The PR is waiting when you sit down; the quota is not
# already gone.
make_unit sqlquest-weekly-read  weekly-read  'Mon *-*-* 03:00:00' 'SQL Quest weekly funnel read'
# Monday too, so the founder's morning packet is complete: funnel read +
# who to write to this week, in one sitting.
make_unit sqlquest-outreach     outreach-queue 'Mon *-*-* 03:20:00' 'SQL Quest founder outreach queue'
make_unit sqlquest-content-fix  content-fix  'Wed *-*-* 03:30:00' 'SQL Quest worst-challenge copy fix'
# Daily, because ledger read-dates are arbitrary and a weekly verifier would
# sit on a due verdict for up to six days. It exits without writing when
# nothing is due, which is most days.
make_unit sqlquest-verify       verify       '*-*-* 04:00:00'     'SQL Quest ledger verification'
# Daily, BEFORE the verifier: a verdict written on a lying sensor is worse
# than no verdict. Every check in this task is a measurement failure that
# actually happened (constant-username events, 3x multi-fire, founder
# localhost sessions writing to prod).
make_unit sqlquest-sensor-check sensor-check '*-*-* 03:45:00'     'SQL Quest sensor audit'

systemctl --user daemon-reload
systemctl --user enable --now \
  sqlquest-weekly-read.timer sqlquest-outreach.timer sqlquest-content-fix.timer \
  sqlquest-verify.timer sqlquest-sensor-check.timer

cat <<EOF

==> Installed.

One thing left, needs sudo once so the timers fire while you are logged out:

    sudo loginctl enable-linger \$USER

Check:      systemctl --user list-timers | grep sqlquest
Run once:   AGENT_HOME=$AGENT_HOME bash $AGENT_HOME/repo/scripts/agent/run.sh weekly-read
Logs:       $AGENT_HOME/logs/

The agent opens pull requests. It never pushes to main and never merges.
EOF
