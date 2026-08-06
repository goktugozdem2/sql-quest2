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

# --- repo ------------------------------------------------------------------
if [ -d "$AGENT_HOME/repo/.git" ]; then
  echo "==> Repo already present, fetching"
  git -C "$AGENT_HOME/repo" fetch --quiet origin
else
  echo "==> Cloning $REPO_URL"
  echo "    (needs a deploy key with WRITE access on this box: ssh-keygen -t ed25519,"
  echo "     then add the .pub to GitHub → repo → Settings → Deploy keys, allow write)"
  git clone "$REPO_URL" "$AGENT_HOME/repo"
fi

# --- secrets ---------------------------------------------------------------
if [ ! -f "$AGENT_HOME/.env" ]; then
  cat > "$AGENT_HOME/.env" <<'EOF'
# Fill these in. This file must never be committed.
ANTHROPIC_API_KEY=
GH_TOKEN=
# Optional overrides
# AGENT_MAX_OPEN_PRS=3
# AGENT_MAX_CHANGED_LINES=400
EOF
  chmod 600 "$AGENT_HOME/.env"
  echo "==> Wrote $AGENT_HOME/.env — fill in ANTHROPIC_API_KEY and GH_TOKEN"
fi
chmod 600 "$AGENT_HOME/.env"

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

make_unit sqlquest-weekly-read  weekly-read  'Mon *-*-* 08:00:00' 'SQL Quest weekly funnel read'
make_unit sqlquest-content-fix  content-fix  'Wed *-*-* 08:00:00' 'SQL Quest worst-challenge copy fix'

systemctl --user daemon-reload
systemctl --user enable --now sqlquest-weekly-read.timer sqlquest-content-fix.timer

cat <<EOF

==> Installed.

Remaining, by hand:
  1. Fill in $AGENT_HOME/.env  (ANTHROPIC_API_KEY, GH_TOKEN)
  2. gh auth login             (or rely on GH_TOKEN)
  3. sudo loginctl enable-linger \$USER    # timers run while logged out
  4. Deploy key with WRITE access, so the agent can push branches

Check:      systemctl --user list-timers | grep sqlquest
Run once:   AGENT_HOME=$AGENT_HOME bash $AGENT_HOME/repo/scripts/agent/run.sh weekly-read
Logs:       $AGENT_HOME/logs/

The agent opens pull requests. It never pushes to main and never merges.
EOF
