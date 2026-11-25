#!/usr/bin/env bash
# Vercel "Ignored Build Step" (vercel.json ignoreCommand): exit 0 = SKIP the
# build, exit 1 = BUILD.
#
# Why (2026-11-22): the Hobby plan's build limit was hit twice in one day.
# Every agent branch push made a preview build and every merge a production
# build, and docs-only merges (ledger verdicts, reads, fleet briefs) spent the
# same budget as code. A rate-limited production deploy is never retried:
# the site stays on the old build until the next push. So:
#   - previews (any branch but main) never build;
#   - on main, a commit that only touches files that cannot change the
#     served site skips the build.
# Everything else builds. Anything unexpected (no previous deployment sha, a sha
# not in the clone, an empty diff) builds.
set -u
ref="${VERCEL_GIT_COMMIT_REF:-}"
if [ "$ref" != "main" ]; then
  echo "skip: preview build for branch '${ref:-unknown}'"
  exit 0
fi
# Compare against the LAST SUCCESSFUL DEPLOYMENT, not the parent commit.
# Vercel sets VERCEL_GIT_PREVIOUS_SHA to the commit of the last successful
# deployment. Comparing only HEAD^..HEAD stranded site changes on 11-22: a
# site-touching merge was rate-limited (never deployed), the next merges were
# docs-only, so every later build was skipped and the site stayed on the old
# build (S1 sentinel, finding F2). If the previous deployment's commit is not
# known or not in the clone, build.
base="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -z "$base" ]; then
  echo "build: no previous deployment sha"
  exit 1
fi
if ! git cat-file -e "$base^{commit}" 2>/dev/null; then
  GIT_TERMINAL_PROMPT=0 git fetch --quiet --depth=200 origin "$base" 2>/dev/null || true
fi
changed="$(git diff --name-only "$base" HEAD 2>/dev/null)" || { echo "build: cannot diff against the last deployment ($base)"; exit 1; }
if [ -z "$changed" ]; then
  echo "build: empty diff"
  exit 1
fi
# The path rule lives in scripts/site-paths.sh, shared with deploy-decide.sh.
. "$(dirname "$0")/site-paths.sh"
if printf '%s\n' "$changed" | touches_site; then
  echo "build: files that reach the site changed"
  exit 1
fi
echo "skip: only docs / tests / supabase / CI files changed"
exit 0
