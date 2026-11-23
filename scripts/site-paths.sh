# The ONE list of paths that cannot change the served site (sourced, not run).
#
# Two callers, so the rule cannot drift between them:
#   scripts/vercel-ignore.sh  — Vercel's Ignored Build Step (Git integration)
#   scripts/deploy-decide.sh  — .github/workflows/deploy-prod.yml
# Everything NOT matched here reaches the site (src/, public/, api/,
# scripts/, vercel.json, package*.json, …) and makes a deploy.
#
# Usage:  . scripts/site-paths.sh
#         printf '%s\n' "$changed" | touches_site && echo "deploy"
SITE_IGNORE_RE='^(docs/|tests/|supabase/|\.github/|\.claude/|[^/]+\.(md|sql)$)'

# Reads file names, one per line, on stdin. Succeeds when at least one of them
# is outside SITE_IGNORE_RE, i.e. when the served site can change.
touches_site() {
  grep -Ev "$SITE_IGNORE_RE" >/dev/null
}
