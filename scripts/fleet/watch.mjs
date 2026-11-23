// Fleet watch (2026-11-23): an hourly tripwire for the agent fleet.
// The fleet-hardening plan's "anomaly alerts" item: the 11-22 deploy outage
// (Vercel Hobby's 100-a-day cap, 69 of 122 main commits rate-limited, merged
// fixes undeployed for 19 h) was seen by a person hours late. This counts the
// signals that went wrong that day and opens or comments one GitHub issue
// labelled `fleet-alert`. It never pauses agents or changes anything else: a
// PAUSE is the founder's or the orchestrator's call (README rule 0).
//
// Run: GH_TOKEN=… GITHUB_REPOSITORY=owner/repo node scripts/fleet/watch.mjs [--dry]

export const THRESHOLDS = {
  prsPerHour: 12,          // more PRs opened in the last hour than a reviewer can read
  deploysPerDay: 80,       // 80% of Vercel Hobby's 100 deployments a day
  strandedCommits: 1,      // main commits rate-limited AFTER the newest successful deploy
  smokeFailuresInARow: 3,  // the last N smoke runs all failed
};

/** Pure: metrics → list of alert lines (empty = healthy). */
export function evaluate(m, t = THRESHOLDS) {
  const out = [];
  if (m.prsLastHour > t.prsPerHour) out.push(`${m.prsLastHour} PRs opened in the last hour (limit ${t.prsPerHour}).`);
  if (m.deploysToday >= t.deploysPerDay) out.push(`${m.deploysToday} Vercel deployments today (alert at ${t.deploysPerDay} of 100).`);
  if (m.strandedCommits >= t.strandedCommits) out.push(`${m.strandedCommits} main commit(s) rate-limited since the last successful deploy — production is on an older build until the next push to main deploys.`);
  if (m.smokeLastRuns.length >= t.smokeFailuresInARow && m.smokeLastRuns.slice(0, t.smokeFailuresInARow).every(c => c === 'failure')) {
    out.push(`The last ${t.smokeFailuresInARow} smoke runs failed.`);
  }
  return out;
}

async function gh(path, token) {
  const r = await fetch(`https://api.github.com${path}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
  if (!r.ok) throw new Error(`GitHub ${r.status} on ${path.split('?')[0]}`);
  return r.json();
}

async function collect(repo, token, now = new Date()) {
  const hourAgo = new Date(now - 3600e3).toISOString().slice(0, 19) + 'Z';
  const dayAgo = new Date(now - 864e5).toISOString();
  const midnight = now.toISOString().slice(0, 10) + 'T00:00:00Z';
  const prs = await gh(`/search/issues?q=${encodeURIComponent(`repo:${repo} is:pr created:>=${hourAgo}`)}&per_page=1`, token);
  const deployments = await gh(`/repos/${repo}/deployments?per_page=100`, token);
  const deploysToday = deployments.filter(d => d.created_at >= midnight).length;
  const commits = await gh(`/repos/${repo}/commits?sha=main&since=${dayAgo}&per_page=100`, token);
  // Newest first. Stop at the newest commit that deployed: rate-limited
  // commits older than a successful deploy are already live through it.
  let strandedCommits = 0;
  for (const c of commits) {
    const st = await gh(`/repos/${repo}/commits/${c.sha}/statuses?per_page=20`, token);
    const v = st.find(s => /vercel/i.test(s.context));
    if (!v) continue;
    if (/deployment has completed/i.test(v.description || '')) break;
    if (/rate limit/i.test(v.description || '')) strandedCommits++;
  }
  const runs = await gh(`/repos/${repo}/actions/workflows/smoke.yml/runs?status=completed&per_page=5`, token);
  const smokeLastRuns = (runs.workflow_runs || []).map(r => r.conclusion);
  return { prsLastHour: prs.total_count || 0, deploysToday, strandedCommits, smokeLastRuns };
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
  const alerts = evaluate(metrics);
  console.log(JSON.stringify({ metrics, alerts }));
  if (alerts.length && !process.argv.includes('--dry')) await report(repo, token, alerts, metrics);
}
