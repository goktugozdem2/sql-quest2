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
)

DIFF="$(git diff HEAD)"
for pat in "${FORBIDDEN_PATTERNS[@]}"; do
  if printf '%s' "$DIFF" | grep -qE "^[+-].*${pat}"; then
    fail "diff touches a protected symbol: /${pat}/ — money, auth or secret path"
  fi
done

# --- 3. Runaway size cap ---------------------------------------------------
# An agent that rewrote half the repo is a bug, not a contribution. Cheap
# backstop against a prompt that went sideways.
NFILES="$(printf '%s\n' "$CHANGED" | grep -c . || true)"
NLINES="$(git diff --numstat HEAD | awk '{a+=$1; d+=$2} END {print (a+d)+0}')"

[ "$NFILES" -gt "$MAX_CHANGED_FILES" ] && fail "changed $NFILES files, cap is $MAX_CHANGED_FILES"
[ "$NLINES" -gt "$MAX_CHANGED_LINES" ] && fail "changed $NLINES lines, cap is $MAX_CHANGED_LINES"

# --- 4. Nothing that looks like a credential -------------------------------
if printf '%s' "$DIFF" | grep -qE '^\+.*(sk-ant-|eyJhbGciOi|-----BEGIN [A-Z ]*PRIVATE KEY)'; then
  fail "diff appears to add a credential"
fi

echo "GUARD OK: $NFILES files, $NLINES lines"
exit 0
