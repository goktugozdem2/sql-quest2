#!/usr/bin/env bash
# Call one of the gated email senders (supabase/functions/*) as the founder.
#
#   bash scripts/sender-call.sh activated-note          # dry run (default)
#   bash scripts/sender-call.sh activated-note send     # real send
#
# The sender gate accepts only SENDER_SECRET or the service role key
# (CLAUDE.md, "Every sender refuses anything but the service role"). This
# reads `sender_secret` from Vault through the linked Supabase CLI, uses it
# for one request and never prints it. Nothing secret lives in this file.
set -euo pipefail

fn="${1:-}"
mode="${2:-dry}"
if [[ -z "$fn" ]]; then
  echo "usage: bash scripts/sender-call.sh <function> [dry|send]" >&2
  exit 1
fi

# The CLI prints "Initialising login role..." and an update notice around the
# CSV; take the line right after the header, which is the value itself.
key=$(supabase db query --linked --agent=no -o csv \
  "select decrypted_secret from vault.decrypted_secrets where name='sender_secret'" 2>/dev/null \
  | awk 'f{print; exit} /^decrypted_secret$/{f=1}' | tr -d '"\r')

if [[ ${#key} -lt 32 ]]; then
  echo "could not read sender_secret from Vault (got ${#key} chars)" >&2
  exit 1
fi

url="https://abmgtjafghpupaqsjnwe.supabase.co/functions/v1/${fn}"
if [[ "$mode" == "dry" ]]; then
  url="${url}?dry=1"
elif [[ "$mode" != "send" ]]; then
  echo "mode must be dry or send" >&2
  exit 1
else
  read -r -p "Really SEND ${fn}? type yes: " ok
  [[ "$ok" == "yes" ]] || { echo "not sent"; exit 1; }
fi

curl -s "$url" -H "Authorization: Bearer ${key}"
echo
