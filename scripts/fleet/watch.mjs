// Fleet watch (2026-11-23): an hourly tripwire for the agent fleet.
// The fleet-hardening plan's "anomaly alerts" item: the 11-22 deploy outage
// (Vercel Hobby's 100-a-day cap, 69 of 122 main commits rate-limited, merged
// fixes undeployed for 19 h) was seen by a person hours late. This counts the
// signals that went wrong that day and opens or comments one GitHub issue
// labelled `fleet-alert`. It never pauses agents or changes anything else: a
// PAUSE is the founder's or the orchestrator's call (README rule 0).
//
// Deploy signals follow the deploy path of 2026-11-23 (#275, #276): production
// is deployed by .github/workflows/deploy-prod.yml (`vercel deploy --prebuilt
// --prod --meta deployCommitSha=<sha>`), and Vercel's Git integration no
// longer deploys main (vercel.json git.deploymentEnabled.main=false). So main
// commits carry NO Vercel commit status and NO GitHub deployment; nothing here
// reads either. Deploys are counted from deploy-prod.yml's runs, and the live
// commit is read the way the deploy workflow reads it
// (scripts/vercel-live-sha.sh), diffed with the deploy workflow's own path rule
// (scripts/site-paths.sh).
//
// Run (from a full clone of main):
//   GH_TOKEN=… GITHUB_REPOSITORY=owner/repo [VERCEL_TOKEN=… VERCEL_PROJECT_ID=…
//   VERCEL_ORG_ID=…] node scripts/fleet/watch.mjs [--dry]
import { execFileSync } from 'node:child_process';

export const THRESHOLDS = {
  prsPerHour: 12,           // more PRs opened in the last hour than a reviewer can read
  deploysPerDay: 20,        // alert ABOVE this many production deploys in 24 h (target ≈ 6)
  strandedCommits: 1,       // site commits on main that are not live, with no deploy coming
  strandedGraceMinutes: 30, // how long a site change may wait with no deploy-prod run
  smokeFailuresInARow: 3,   // the last N smoke runs all failed
};

const DEPLOY_WORKFLOW = 'deploy-prod.yml';
const FAILED = new Set(['failure', 'timed_out', 'startup_failure']);

/** Pure: metrics → list of alert lines (empty = healthy). */
export function evaluate(m, t = THRESHOLDS) {
  const out = [];
  if (m.prsLastHour > t.prsPerHour) out.push(`${m.prsLastHour} PRs opened in the last hour (limit ${t.prsPerHour}).`);
  if (m.deploysLast24h > t.deploysPerDay) out.push(`${m.deploysLast24h} production deploys in the last 24 h (alert above ${t.deploysPerDay}; the target is about 6, Vercel Hobby's cap is 100).`);
  if (m.strandedCommits >= t.strandedCommits) {
    const why = m.strandedReason === 'deploy_failed'
      ? `the newest ${DEPLOY_WORKFLOW} run for them failed`
      : `no ${DEPLOY_WORKFLOW} run has deployed them for more than ${t.strandedGraceMinutes} minutes`;
    out.push(`${m.strandedCommits} main commit(s) change the site but are not live (oldest ${String(m.oldestStranded).slice(0, 7)}) — ${why}. Production is on ${String(m.liveSha).slice(0, 7)}.`);
  }
  if (m.smokeLastRuns.length >= t.smokeFailuresInARow && m.smokeLastRuns.slice(0, t.smokeFailuresInARow).every(c => c === 'failure')) {
    out.push(`The last ${t.smokeFailuresInARow} smoke runs failed.`);
  }
  return out;
}

/**
 * Pure: did this deploy-prod.yml run create a production deployment?
 * Yes when the decide step said deploy=true — the steps it gates (vercel pull /
 * build / deploy) are then not skipped — or when the "vercel deploy" step
 * succeeded. The jobs API carries step names and conclusions, not outputs.
 */
export function runDeployed(jobs) {
  const steps = (jobs || []).flatMap(j => j.steps || []);
  const gated = steps.filter(s => /^vercel (pull|build|deploy)\b/i.test(s.name || ''));
  if (gated.some(s => /^vercel deploy\b/i.test(s.name) && s.conclusion === 'success')) return true;
  return gated.some(s => s.conclusion && s.conclusion !== 'skipped');
}

/** Pure: production deploys in the window = max(deploy-prod runs that deployed, Vercel's own count). */
export function countDeploys(runs, { since, vercelCount = null } = {}) {
  const fromRuns = runs.filter(r => r.created_at >= since && runDeployed(r.jobs)).length;
  return vercelCount == null ? fromRuns : Math.max(fromRuns, vercelCount);
}

/**
 * Pure: is main stranded?
 *   live        — the live production commit (null = unknown)
 *   headSha     — main's HEAD
 *   siteDiffers — a file outside scripts/site-paths.sh's ignore list differs live..HEAD
 *   commits     — live..HEAD, oldest first: { sha, date (ISO), site (bool) }
 *   runs        — deploy-prod.yml runs, newest first: { head_sha, status, conclusion, updated_at }
 * Stranded when the site differs and either the newest run for a commit at or
 * after the oldest stranded commit failed, or none ran (or deployed) for more
 * than the grace period.
 */
export function strandedVerdict({ live, headSha, siteDiffers, commits, runs, now = new Date() }, t = THRESHOLDS) {
  const none = { strandedCommits: 0, strandedReason: null, oldestStranded: null };
  if (!live || live === headSha || !siteDiffers) return none;
  const idx = commits.findIndex(c => c.site);
  if (idx < 0) return none;
  const range = commits.slice(idx);
  const inRange = new Set(range.map(c => c.sha));
  const relevant = runs.filter(r => inRange.has(r.head_sha));
  const newest = relevant[0];
  const verdict = (reason) => ({ strandedCommits: range.length, strandedReason: reason, oldestStranded: range[0].sha });
  if (newest && newest.status === 'completed' && FAILED.has(newest.conclusion)) return verdict('deploy_failed');
  if (newest && newest.status !== 'completed') return none; // queued or running: a deploy is coming
  // No run, or a run that finished without moving production past these commits
  // (it skipped, it was cancelled, or a rollback undid it).
  const since = Math.max(Date.parse(range[0].date), newest ? Date.parse(newest.updated_at) : 0);
  if ((now - since) / 60e3 > t.strandedGraceMinutes) return verdict('no_deploy');
  return none;
}

/** The live production commit, read exactly as deploy-prod.yml reads it. Never prints the token. */
export function liveShaFromVercel(env = process.env, root = process.cwd()) {
  if (!env.VERCEL_TOKEN || !env.VERCEL_PROJECT_ID) return null;
  try {
    const out = execFileSync('bash', ['scripts/vercel-live-sha.sh'], { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^[0-9a-f]{40}$/.test(out) ? out : null;
  } catch { return null; }
}

/**
 * live..HEAD from the local clone, classified by scripts/site-paths.sh's
 * touches_site (sourced, so the rule is the deploy workflow's own). Returns
 * null when the live commit is not in this clone.
 */
export function siteCommitsSince(live, root = process.cwd()) {
  const script = `
    set -u
    . scripts/site-paths.sh
    git cat-file -e "$LIVE^{commit}" 2>/dev/null || { echo MISSING; exit 0; }
    if git diff --name-only "$LIVE" HEAD | touches_site; then echo DIFFERS; else echo SAME; fi
    git rev-list --reverse "$LIVE..HEAD" | while read -r c; do
      if git diff-tree --no-commit-id --name-only -r -m --root "$c" | touches_site; then s=1; else s=0; fi
      printf '%s %s %s\\n' "$c" "$(git show -s --format=%cI "$c")" "$s"
    done`;
  const out = execFileSync('bash', ['-c', script], { cwd: root, env: { ...process.env, LIVE: live }, encoding: 'utf8' }).trim().split('\n');
  if (out[0] === 'MISSING') return null;
  const commits = out.slice(1).filter(Boolean).map(l => { const [sha, date, s] = l.split(' '); return { sha, date, site: s === '1' }; });
  return { siteDiffers: out[0] === 'DIFFERS', commits };
}

async function gh(path, token) {
  const r = await fetch(`https://api.github.com${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  if (!r.ok) throw new Error(`GitHub ${r.status} on ${path.split('?')[0]}`);
  return r.json();
}

// Vercel's own count of production deployments in the window (cross-check
// only). The token only travels in the Authorization header; errors carry the
// status code, never the URL or the header.
async function vercelProductionCount(env, sinceMs) {
  if (!env.VERCEL_TOKEN || !env.VERCEL_PROJECT_ID) return null;
  const q = new URLSearchParams({ projectId: env.VERCEL_PROJECT_ID, target: 'production', since: String(sinceMs), limit: '100' });
  if (env.VERCEL_ORG_ID) q.set('teamId', env.VERCEL_ORG_ID);
  try {
    const r = await fetch(`https://api.vercel.com/v6/deployments?${q}`, { headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` } });
    if (!r.ok) { console.error(`vercel cross-check: HTTP ${r.status}`); return null; }
    const body = await r.json();
    return (body.deployments || []).filter(d => (d.created ?? d.createdAt ?? 0) >= sinceMs).length;
  } catch { console.error('vercel cross-check: the API did not answer'); return null; }
}

async function collect(repo, token, now = new Date(), env = process.env) {
  const hourAgo = new Date(now - 3600e3).toISOString().slice(0, 19) + 'Z';
  const dayAgo = new Date(now - 864e5);
  const prs = await gh(`/search/issues?q=${encodeURIComponent(`repo:${repo} is:pr created:>=${hourAgo}`)}&per_page=1`, token);

  // Deploys: deploy-prod.yml runs in the last 24 h whose deploy step ran.
  const runsResp = await gh(`/repos/${repo}/actions/workflows/${DEPLOY_WORKFLOW}/runs?branch=main&per_page=100`, token);
  const runs = runsResp.workflow_runs || [];
  const since = dayAgo.toISOString();
  for (const r of runs.filter(x => x.created_at >= since)) {
    r.jobs = (await gh(`/repos/${repo}/actions/runs/${r.id}/jobs?per_page=10`, token)).jobs || [];
  }
  const vercelCount = await vercelProductionCount(env, dayAgo.getTime());
  const deploysFromRuns = countDeploys(runs, { since });
  const deploysLast24h = countDeploys(runs, { since, vercelCount });

  // Stranded: the live commit vs main's HEAD, on the deploy workflow's path rule.
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const live = liveShaFromVercel(env);
  const range = live ? siteCommitsSince(live) : null;
  const stranded = range
    ? strandedVerdict({ live, headSha, ...range, runs, now })
    : { strandedCommits: 0, strandedReason: null, oldestStranded: null };

  const smoke = await gh(`/repos/${repo}/actions/workflows/smoke.yml/runs?status=completed&per_page=5`, token);
  const smokeLastRuns = (smoke.workflow_runs || []).map(r => r.conclusion);
  return {
    prsLastHour: prs.total_count || 0,
    deploysLast24h, deploysFromRuns, deploysFromVercel: vercelCount,
    liveSha: live, liveKnown: Boolean(range), headSha,
    ...stranded,
    smokeLastRuns,
  };
}

async function report(repo, token, alerts, metrics) {
  const body = `**Fleet watch** — ${new Date().toISOString().slice(0, 16)}Z\n\n${alerts.map(a => `- ${a}`).join('\n')}\n\nMetrics: \`${JSON.stringify(metrics)}\`\n\nNothing was paused or changed. The founder or the laptop orchestrator decides whether to create \`docs/agent/fleet/PAUSE\`.`;
  const open = await gh(`/repos/${repo}/issues?state=open&labels=fleet-alert&per_page=1`, token);
  const url = open.length ? `https://api.github.com/repos/${repo}/issues/${open[0].number}/comments` : `https://api.github.com/repos/${repo}/issues`;
  const payload = open.length ? { body } : { title: 'Fleet watch: an anomaly needs a look', body, labels: ['fleet-alert'] };
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`GitHub ${r.status} writing the fleet-alert issue`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const token = process.env.GH_TOKEN; const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) { console.error('GH_TOKEN and GITHUB_REPOSITORY are required'); process.exit(1); }
  const metrics = await collect(repo, token);
  if (!metrics.liveKnown) console.log('::warning::the live production commit is unknown (VERCEL_TOKEN / VERCEL_PROJECT_ID missing, the API did not answer, or the commit is not in this clone) — the stranded check was skipped');
  const alerts = evaluate(metrics);
  console.log(JSON.stringify({ metrics, alerts }));
  if (alerts.length && !process.argv.includes('--dry')) await report(repo, token, alerts, metrics);
}
