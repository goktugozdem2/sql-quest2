#!/usr/bin/env bash
# Should .github/workflows/deploy-prod.yml create a production deployment?
#
#   LIVE_SHA=<commit of the live deployment> FORCE=true|false EVENT=<event> \
#     bash scripts/deploy-decide.sh
#
# Writes deploy=true|false to $GITHUB_OUTPUT (when set) and one line saying
# why. Always exits 0.
#
# The comparison is against the LIVE deployment's commit (LIVE_SHA, from
# scripts/vercel-live-sha.sh), never the parent commit and never the push's
# `before`. Diffing HEAD^..HEAD stranded site changes on 2026-11-22: a site
# merge was rate-limited, the next merges were docs-only, every later build was
# skipped, and production stayed on the old build (S1 sentinel, finding F2).
#
# Rules, in order:
#   1. EVENT is not workflow_dispatch and vercel.json still lets Vercel's Git
#      integration deploy main  → skip (that integration is deploying; two
#      deployments per merge would double the spend). Setting
#      git.deploymentEnabled.main=false in vercel.json is what turns the push
#      and schedule paths on; reverting that one line turns them off again.
#   2. FORCE=true                                  → deploy
#   3. LIVE_SHA unknown / not a commit we can find → deploy
#   4. LIVE_SHA is HEAD, or HEAD is behind it      → skip
#   5. a file outside scripts/site-paths.sh's list changed since LIVE_SHA → deploy
#   6. otherwise                                   → skip
set -u
. "$(cd "$(dirname "$0")" && pwd)/site-paths.sh"
cd "$(git rev-parse --show-toplevel)" || exit 0

decide() {
  [ -n "${GITHUB_OUTPUT:-}" ] && echo "deploy=$1" >> "$GITHUB_OUTPUT"
  echo "deploy=$1: $2"
  exit 0
}

if [ "${EVENT:-}" != "workflow_dispatch" ]; then
  git_main="$(jq -r 'if .git.deploymentEnabled.main == false then "off" else "on" end' vercel.json 2>/dev/null || echo on)"
  [ "$git_main" = "on" ] && decide false "Vercel's Git integration still deploys main (vercel.json git.deploymentEnabled.main is not false); this workflow deploys only by hand until it is"
fi

[ "${FORCE:-false}" = "true" ] && decide true "forced by hand"

live="${LIVE_SHA:-}"
[ -z "$live" ] && decide true "the live deployment's commit is unknown"

head="$(git rev-parse HEAD)"
[ "$live" = "$head" ] && decide false "the live deployment is already $head"

if ! git cat-file -e "${live}^{commit}" 2>/dev/null; then
  GIT_TERMINAL_PROMPT=0 git fetch --quiet origin "$live" 2>/dev/null || true
fi
git cat-file -e "${live}^{commit}" 2>/dev/null || decide true "the live commit $live is not in this clone"

if git merge-base --is-ancestor HEAD "$live" 2>/dev/null; then
  decide false "the live deployment ($live) is newer than this commit ($head)"
fi

changed="$(git diff --name-only "$live" HEAD 2>/dev/null)" || decide true "cannot diff against the live commit $live"
[ -z "$changed" ] && decide false "no file differs from the live commit $live"

if printf '%s\n' "$changed" | touches_site; then
  decide true "files that reach the site changed since the live commit $live"
fi
decide false "only docs / tests / supabase / CI files changed since the live commit $live"
