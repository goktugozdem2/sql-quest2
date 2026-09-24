#!/usr/bin/env bash
# Failure notice for the GSC workflows: one open issue per workflow, labelled
# gsc-pipeline; later failures comment on it instead of opening another.
# GitHub emails the repo's watchers on both. Usage: notify-failure.sh "<title>" "<run url>"
set -euo pipefail
title="$1"; run_url="$2"
gh label create gsc-pipeline --color B60205 --description "GSC data pipeline" 2>/dev/null || true
existing=$(gh issue list --label gsc-pipeline --state open --search "\"$title\" in:title" --json number --jq '.[0].number // empty')
body="Run: $run_url ($(date -u +%Y-%m-%dT%H:%MZ)). Scripts: scripts/gsc/. Check the step log; a 403 is the API or the property permission, a token error is the GSC_SA_KEY secret."
if [ -n "$existing" ]; then
  gh issue comment "$existing" --body "$body"
else
  gh issue create --title "$title" --label gsc-pipeline --body "$body"
fi
