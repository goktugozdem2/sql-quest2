#!/usr/bin/env bash
# First step of every scheduled Bing job: is BING_WMT_KEY there at all?
# A schedule without the secret skips (output on=false) with a warning; a
# run started by hand without it fails. Says only whether the key is set.
set -euo pipefail
if [ -n "${BING_WMT_KEY:-}" ]; then
  echo "on=true" >> "$GITHUB_OUTPUT"
  exit 0
fi
echo "::warning::BING_WMT_KEY is not set, so nothing ran. Add it under Settings → Secrets and variables → Actions."
echo "on=false" >> "$GITHUB_OUTPUT"
if [ "${EVENT:-}" = "workflow_dispatch" ]; then
  echo "A run started by hand needs the key." >&2
  exit 1
fi
