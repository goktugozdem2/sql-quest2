#!/usr/bin/env bash
# Prints the git commit of the LIVE production deployment, or nothing.
#
#   VERCEL_TOKEN=… VERCEL_PROJECT_ID=… [VERCEL_ORG_ID=…] bash scripts/vercel-live-sha.sh
#
# "Live" = the newest READY production deployment of the project (the same
# query scripts/smoke/vercel-rollback.mjs makes). Its commit is
# meta.deployCommitSha when .github/workflows/deploy-prod.yml made it, or
# meta.githubCommitSha when Vercel's Git integration did. Any failure (HTTP
# error, no deployment, no commit on it) prints nothing, and an unknown commit
# makes scripts/deploy-decide.sh deploy — never skip on a guess.
#
# The token only ever travels in the Authorization header. Nothing here prints
# it, and curl runs without -v so the header is never written to the log.
set -u
[ -n "${VERCEL_TOKEN:-}" ] && [ -n "${VERCEL_PROJECT_ID:-}" ] || exit 0
q="projectId=${VERCEL_PROJECT_ID}&target=production&state=READY&limit=1"
[ -n "${VERCEL_ORG_ID:-}" ] && q="${q}&teamId=${VERCEL_ORG_ID}"
body="$(curl -fsS --max-time 30 -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v6/deployments?${q}" 2>/dev/null)" || { echo "live sha: the deployments API did not answer" >&2; exit 0; }
sha="$(printf '%s' "$body" | jq -r '(.deployments // [])[0].meta // {} | (.deployCommitSha // .githubCommitSha // empty)' 2>/dev/null)"
case "$sha" in
  *[!0-9a-f]*|'') exit 0 ;;
esac
[ "${#sha}" -eq 40 ] && printf '%s\n' "$sha"
exit 0
