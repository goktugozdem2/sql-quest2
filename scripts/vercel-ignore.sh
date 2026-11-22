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
# Everything else builds. Anything unexpected (no parent, empty diff) builds.
set -u
ref="${VERCEL_GIT_COMMIT_REF:-}"
if [ "$ref" != "main" ]; then
  echo "skip: preview build for branch '${ref:-unknown}'"
  exit 0
fi
changed="$(git diff --name-only HEAD^ HEAD 2>/dev/null)" || { echo "build: no parent commit to diff"; exit 1; }
if [ -z "$changed" ]; then
  echo "build: empty diff"
  exit 1
fi
if printf '%s\n' "$changed" | grep -Ev '^(docs/|tests/|supabase/|\.github/|\.claude/|[^/]+\.(md|sql)$)' >/dev/null; then
  echo "build: files that reach the site changed"
  exit 1
fi
echo "skip: only docs / tests / supabase / CI files changed"
exit 0
