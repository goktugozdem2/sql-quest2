#!/usr/bin/env bash
# Guardrail check for the autonomous agent. Runs against the working tree diff
# BEFORE anything is committed or pushed.
#
# The agent runs unattended. That is fine for content and copy; it is not fine
# for the money path, the email senders, the schema, or its own guardrails.
# Everything below is a HARD FAIL: the run aborts, nothing is pushed, and the
# reason is printed for the human.
#
# Exit 0 = safe to proceed. Exit 1 = abort the run.

set -euo pipefail
# Allowlist globs may use extended patterns: `src/!(app|blog/*|data/*).html`
# is how seo-page admits a new page while refusing the app shell, the blog
# and the data directory. A plain `src/*.html` admitted all three — `*`
# matches `/` in a `case` glob — and the README had to say "the blog rule
# is prompt-enforced", which is the same as saying it is not enforced.
shopt -s extglob

MAX_CHANGED_LINES="${AGENT_MAX_CHANGED_LINES:-400}"
MAX_CHANGED_FILES="${AGENT_MAX_CHANGED_FILES:-25}"

fail() { echo "GUARD FAIL: $*" >&2; exit 1; }

# --- 1. Paths the agent may never touch unattended -------------------------
# supabase/functions  → deploying these sends real email and touches Stripe.
# supabase/migrations → schema changes are one-way doors.
# .github/workflows   → the agent must not be able to weaken its own CI gate.
# scripts/agent       → the agent must not be able to edit its own guardrails.
# vercel.json         → redirects/rewrites; a bad edit takes the site down.
PROTECTED_PATHS=(
  'supabase/functions/'
  'supabase/migrations/'
  '.github/workflows/'
  'scripts/agent/'
  'vercel.json'
  'package.json'
  'package-lock.json'
)

CHANGED="$(git diff --name-only HEAD; git ls-files --others --exclude-standard)"
[ -z "$CHANGED" ] && { echo "GUARD: no changes"; exit 0; }

# --- 0. Per-task allowlist (only when the runner sets one) -----------------
# run.sh reads `<!-- allowed-paths: A:B -->` off the first line of the task
# file and exports it as AGENT_ALLOWED_PATHS: colon-separated bash `case`
# globs. A pattern ending in `/` is a prefix (`docs/reads/` admits anything
# under it); anything else is matched as written (`docs/agent/ledger.md`,
# `src/*.html`). When it is set, every changed or untracked file must match
# at least one pattern. Unset = no allowlist, which is how every task behaved
# before the header existed.
#
# The denylist below says what NO task may touch. This says what THIS task
# may, and the gap between the two is the point: nothing in the denylist
# covers src/app.jsx — it is the product — so a read task that was told
# "only docs/reads/" and then quietly fixes the bug it noticed in app.jsx
# would pass this guard and reach the reviewer as an app change wearing a
# report's PR title. The prompt is a request; this is the wall. The run
# fails and names the file instead.
#
# It runs before the denylist because "outside allowed paths" is the better
# error: it tells the reviewer the prompt went sideways, not that the agent
# went for the money path. The header itself lives under scripts/agent/,
# which IS denylisted, so a task cannot widen its own scope.
#
# Two things to know before leaning on it. A `case` glob's `*` matches `/`,
# so `src/*.html` would admit `src/blog/x.html` and `src/app.html` too; with
# extglob on (top of this file) a header writes `src/!(app|blog/*|data/*).html`
# and the wall covers them — verified under bash 3.2: matches src/new.html
# and src/index.html, refuses src/app.html, src/blog/x.html, src/data/x.html.
# And this runs BEFORE build:check, so the build's own outputs never trip it;
# a task that runs `npm run build` itself must list what the build writes.
if [ -n "${AGENT_ALLOWED_PATHS:-}" ]; then
  IFS=':' read -r -a ALLOWED <<< "$AGENT_ALLOWED_PATHS"
  # Guarded expansion: bash < 4.4 under set -u treats an empty array as unbound.
  NPAT=0; for p in ${ALLOWED[@]+"${ALLOWED[@]}"}; do [ -n "$p" ] && NPAT=$((NPAT + 1)); done
  [ "$NPAT" -gt 0 ] || fail "AGENT_ALLOWED_PATHS is set but holds no pattern: '$AGENT_ALLOWED_PATHS'"
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    ok=0
    for p in "${ALLOWED[@]}"; do
      [ -z "$p" ] && continue
      case "$p" in */) p="$p*" ;; esac      # trailing slash = anything under
      case "$f" in
        $p) ok=1; break ;;                   # $p unquoted on purpose: it is a glob
      esac
    done
    [ "$ok" = 1 ] || fail "outside allowed paths: $f (task allows: $AGENT_ALLOWED_PATHS)"
  done <<< "$CHANGED"
fi

while IFS= read -r f; do
  [ -z "$f" ] && continue
  for p in "${PROTECTED_PATHS[@]}"; do
    case "$f" in
      "$p"*) fail "touched protected path: $f (matches '$p')" ;;
    esac
  done
done <<< "$CHANGED"

# --- 2. Money / paywall / auth strings anywhere in the diff -----------------
# The monolith (src/app.jsx) holds the pricing modal and the checkout handler
# alongside everything else, so a path denylist cannot protect it. Match on
# content instead. A content edit that drags one of these in is not a content
# edit.
FORBIDDEN_PATTERNS=(
  'buy\.stripe\.com'
  'beginCheckout'
  'pro_purchase_completed'
  'stripe_webhook'
  'SUPABASE_SERVICE_ROLE'
  'ANTHROPIC_API_KEY'
  'proStatus'
  'RESEND_API_KEY'
  # 2026-09-06: the ai-visibility task exports three more engine keys into
  # the agent's own shell (run.sh sources .env with set -a). The task spec
  # and the probe both promised "guard.sh fails a diff carrying an API-key
  # variable name" — true for one of the four names until this line.
  'GEMINI_API_KEY'
  'OPENAI_API_KEY'
  'PERPLEXITY_API_KEY'
)

# Untracked files are invisible to `git diff HEAD`. Checked in a scratch
# repo with the previous version of this script: a NEW src/new.html carrying
# `href=https://buy.stripe.com/x` and `sk-ant-abc` came back "GUARD OK: 1
# files, 0 lines", the same two lines appended to a tracked file failed
# correctly, and a 5000-line new file passed the 400-line cap as 0 lines.
# Latent while every task wrote markdown into directories that already
# existed; the moment seo-page's whole output is a new page, sections 2-4
# would skip exactly the file that task produces. So every untracked file is
# diffed against /dev/null — all-added, which is what it is — and appended
# to the tracked diff. Nothing is staged: the index is left alone so a human
# running this by hand gets no side effect. `--no-index` exits 1 when the
# files differ, hence the `|| true`.
full_diff() {
  git diff "$@" HEAD
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    git diff --no-index "$@" -- /dev/null "$f" || true
  done < <(git ls-files --others --exclude-standard)
}

DIFF="$(full_diff)"
for pat in "${FORBIDDEN_PATTERNS[@]}"; do
  if printf '%s' "$DIFF" | grep -qE "^[+-].*${pat}"; then
    fail "diff touches a protected symbol: /${pat}/ — money, auth or secret path"
  fi
done

# --- 3. Runaway size cap ---------------------------------------------------
# An agent that rewrote half the repo is a bug, not a contribution. Cheap
# backstop against a prompt that went sideways.
NFILES="$(printf '%s\n' "$CHANGED" | grep -c . || true)"
NLINES="$(full_diff --numstat | awk '{a+=$1; d+=$2} END {print (a+d)+0}')"

[ "$NFILES" -gt "$MAX_CHANGED_FILES" ] && fail "changed $NFILES files, cap is $MAX_CHANGED_FILES"
[ "$NLINES" -gt "$MAX_CHANGED_LINES" ] && fail "changed $NLINES lines, cap is $MAX_CHANGED_LINES"

# --- 4. Nothing that looks like a credential -------------------------------
# 2026-09-06: widened from `sk-ant-` / JWT / PEM to the value shapes of every
# key the fleet's shell can hold — Gemini (AIza…), OpenAI (sk-…, sk-proj-…),
# Perplexity (pplx-…) and the GitHub token run.sh needs (github_pat_ / ghp_).
# The ai-visibility probe redacts its own output, but the agent reads the
# same environment and writes docs/reads/, which becomes a PR; before this
# line any of those four pasted into a report reached GitHub. Mirrors
# KEY_SHAPES in ai-visibility-probe.mjs — change one, change both.
if printf '%s' "$DIFF" | grep -qE '^\+.*(sk-ant-|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|pplx-[A-Za-z0-9]{20,}|eyJhbGciOi|github_pat_|ghp_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY)'; then
  fail "diff appears to add a credential"
fi

echo "GUARD OK: $NFILES files, $NLINES lines"
exit 0
