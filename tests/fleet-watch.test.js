// Fleet watch: the hourly tripwire's rules (scripts/fleet/watch.mjs). The
// thresholds come from the 11-22 deploy outage: 88 deployments in a day,
// 69 rate-limited main commits, fixes undeployed for 19 h.
//
// Deploy signals follow the 2026-11-23 deploy path (#275, #276): production is
// deployed by .github/workflows/deploy-prod.yml, Vercel's Git integration no
// longer deploys main, so main commits carry no Vercel commit status and no
// GitHub deployment. The fixtures below are shaped like the GitHub jobs API
// (step names from deploy-prod.yml) and like deploy-prod.yml's run list.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { evaluate, THRESHOLDS, runDeployed, countDeploys, strandedVerdict, siteCommitsSince } from '../scripts/fleet/watch.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.split('\n').filter(l => !/^\s*(#|\/\/)/.test(l)).join('\n');
const healthy = { prsLastHour: 3, deploysLast24h: 6, strandedCommits: 0, smokeLastRuns: ['success', 'failure', 'success'] };

// --- jobs API fixtures for one deploy-prod.yml run -------------------------
const step = (name, conclusion) => ({ name, conclusion });
const job = (gated) => [{ name: 'deploy', steps: [
  step('Set up job', 'success'),
  step('Run actions/checkout@v4', 'success'),
  step('Are the Vercel secrets configured?', 'success'),
  step('Which commit is live?', 'success'),
  step('Decide whether the site changed since then', 'success'),
  step('Run actions/setup-node@v4', gated[0]),
  step('vercel pull (production settings and env)', gated[0]),
  step('vercel build --prod', gated[1]),
  step('vercel deploy --prebuilt --prod', gated[2]),
] }];
const DEPLOYED = job(['success', 'success', 'success']);       // decide=true, deploy succeeded
const SKIPPED = job(['skipped', 'skipped', 'skipped']);        // decide=false
const BUILD_FAILED = job(['success', 'failure', 'skipped']);   // decide=true, build failed

const NOW = new Date('2026-11-23T12:00:00Z');
const SINCE = new Date(NOW - 864e5).toISOString();
const run = (h, jobs) => ({ created_at: new Date(NOW - h * 3600e3).toISOString(), jobs });

describe('fleet watch rules', () => {
  it('a healthy hour raises nothing', () => {
    expect(evaluate(healthy)).toEqual([]);
  });
  it('a PR flood and three failed smokes each raise one line (unchanged)', () => {
    expect(THRESHOLDS.prsPerHour).toBe(12);
    expect(evaluate({ ...healthy, prsLastHour: THRESHOLDS.prsPerHour + 1 })).toHaveLength(1);
    expect(evaluate({ ...healthy, prsLastHour: THRESHOLDS.prsPerHour })).toEqual([]);
    expect(evaluate({ ...healthy, smokeLastRuns: ['failure', 'failure', 'failure', 'success'] })).toHaveLength(1);
    expect(evaluate({ ...healthy, smokeLastRuns: ['failure', 'success', 'failure'] })).toEqual([]);
  });
  it('the deploy budget alerts above 20 in 24 h, not at 20 (target about 6)', () => {
    expect(THRESHOLDS.deploysPerDay).toBe(20);
    expect(evaluate({ ...healthy, deploysLast24h: 20 })).toEqual([]);
    const a = evaluate({ ...healthy, deploysLast24h: 21 });
    expect(a).toHaveLength(1);
    expect(a[0]).toMatch(/21 production deploys in the last 24 h/);
  });
  it('a stranded verdict raises one line naming the reason and the live commit', () => {
    const m = { ...healthy, strandedCommits: 2, strandedReason: 'deploy_failed', oldestStranded: 'a'.repeat(40), liveSha: 'b'.repeat(40) };
    const a = evaluate(m);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatch(/2 main commit\(s\) change the site but are not live \(oldest aaaaaaa\).*failed.*bbbbbbb/);
    expect(evaluate({ ...m, strandedReason: 'no_deploy' })[0]).toMatch(/more than 30 minutes/);
  });
});

describe('deploys per day — from deploy-prod.yml runs', () => {
  it('a run counts when its deploy step ran (decide=true) or vercel deploy succeeded', () => {
    expect(runDeployed(DEPLOYED)).toBe(true);
    expect(runDeployed(BUILD_FAILED)).toBe(true);
    expect(runDeployed(SKIPPED)).toBe(false);
    expect(runDeployed([])).toBe(false);
  });
  it('counts only runs in the last 24 h that deployed', () => {
    const runs = [run(1, DEPLOYED), run(2, SKIPPED), run(5, BUILD_FAILED), run(23, DEPLOYED), run(25, DEPLOYED)];
    expect(countDeploys(runs, { since: SINCE })).toBe(3);
  });
  it('takes the max with the Vercel cross-check when there is one', () => {
    const runs = [run(1, DEPLOYED), run(2, DEPLOYED)];
    expect(countDeploys(runs, { since: SINCE, vercelCount: 30 })).toBe(30);
    expect(countDeploys(runs, { since: SINCE, vercelCount: 1 })).toBe(2);
    expect(countDeploys(runs, { since: SINCE, vercelCount: null })).toBe(2);
  });
  it('the 11-22 day (every merge deployed) alerts; a batched day does not', () => {
    const flood = Array.from({ length: 23 }, (_, i) => run(i + 0.5, DEPLOYED));
    expect(evaluate({ ...healthy, deploysLast24h: countDeploys(flood, { since: SINCE }) })).toHaveLength(1);
    const batched = [...Array.from({ length: 6 }, (_, i) => run(i * 4 + 1, DEPLOYED)), ...Array.from({ length: 40 }, (_, i) => run(i / 2 + 0.1, SKIPPED))];
    expect(evaluate({ ...healthy, deploysLast24h: countDeploys(batched, { since: SINCE }) })).toEqual([]);
  });
});

describe('stranded — the live commit vs main HEAD on the site path rule', () => {
  const LIVE = 'f'.repeat(40);
  const c = (n, minsAgo, site) => ({ sha: String(n).repeat(40), date: new Date(NOW - minsAgo * 60e3).toISOString(), site });
  const commits = [c(1, 90, false), c(2, 60, true), c(3, 45, false)];
  const HEAD = commits[2].sha;
  const base = { live: LIVE, headSha: HEAD, siteDiffers: true, commits, now: NOW };
  const r = (sha, status, conclusion, minsAgo = 40) => ({ head_sha: sha, status, conclusion, updated_at: new Date(NOW - minsAgo * 60e3).toISOString() });

  it('nothing when live is HEAD, when only docs/tests changed, or when the live commit is unknown', () => {
    expect(strandedVerdict({ ...base, live: HEAD, runs: [] }).strandedCommits).toBe(0);
    expect(strandedVerdict({ ...base, siteDiffers: false, runs: [] }).strandedCommits).toBe(0);
    expect(strandedVerdict({ ...base, live: null, runs: [] }).strandedCommits).toBe(0);
  });
  it('alerts when the newest run for a commit at or after the oldest stranded one failed', () => {
    const v = strandedVerdict({ ...base, runs: [r(HEAD, 'completed', 'failure'), r(commits[1].sha, 'completed', 'success', 55)] });
    expect(v).toEqual({ strandedCommits: 2, strandedReason: 'deploy_failed', oldestStranded: commits[1].sha });
  });
  it('a failed run for a commit BEFORE the oldest stranded one does not count', () => {
    const v = strandedVerdict({ ...base, runs: [r(commits[0].sha, 'completed', 'failure')] });
    expect(v.strandedReason).toBe('no_deploy'); // none ran for the site commit for 60 min
  });
  it('alerts when no run came for more than 30 minutes, not before', () => {
    expect(strandedVerdict({ ...base, runs: [] }).strandedReason).toBe('no_deploy');
    const fresh = [c(1, 90, false), c(2, 20, true)];
    expect(strandedVerdict({ ...base, commits: fresh, headSha: fresh[1].sha, runs: [] }).strandedCommits).toBe(0);
  });
  it('a queued or running deploy is not stranded', () => {
    expect(strandedVerdict({ ...base, runs: [r(HEAD, 'in_progress', null)] }).strandedCommits).toBe(0);
    expect(strandedVerdict({ ...base, runs: [r(HEAD, 'queued', null)] }).strandedCommits).toBe(0);
  });
  it('a run that finished without moving production (rollback, skip) alerts 30 min after it', () => {
    expect(strandedVerdict({ ...base, runs: [r(HEAD, 'completed', 'success', 10)] }).strandedCommits).toBe(0);
    expect(strandedVerdict({ ...base, runs: [r(HEAD, 'completed', 'success', 31)] }).strandedReason).toBe('no_deploy');
  });
});

describe('siteCommitsSince — a real repo, scripts/site-paths.sh sourced', () => {
  it('classifies live..HEAD with the deploy workflow\'s own rule', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-watch-'));
    const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim();
    const put = (p, s) => { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), s); };
    g('init', '-q');
    put('scripts/site-paths.sh', read('scripts/site-paths.sh'));
    put('src/a.js', '1');
    g('add', '.'); g('commit', '-qm', 'base');
    const live = g('rev-parse', 'HEAD');
    put('docs/x.md', 'd'); g('add', '.'); g('commit', '-qm', 'docs');
    put('src/a.js', '2'); g('add', '.'); g('commit', '-qm', 'site');
    put('tests/t.test.js', 't'); g('add', '.'); g('commit', '-qm', 'tests');
    const res = siteCommitsSince(live, dir);
    expect(res.siteDiffers).toBe(true);
    expect(res.commits.map(x => x.site)).toEqual([false, true, false]);
    expect(res.commits.every(x => /^[0-9a-f]{40}$/.test(x.sha) && !Number.isNaN(Date.parse(x.date)))).toBe(true);
    // docs-only since live: nothing differs on the site
    const res2 = siteCommitsSince(res.commits[1].sha, dir);
    expect(res2.siteDiffers).toBe(false);
    expect(siteCommitsSince('0'.repeat(40), dir)).toBeNull();
    fs.rmSync(dir, { recursive: true, force: true });
  }, 20_000);
});

describe('sources: the new deploy path, the shared helpers, no token in logs', () => {
  const src = strip(read('scripts/fleet/watch.mjs'));
  it('reads no Vercel commit status and no GitHub deployment', () => {
    expect(src).not.toMatch(/\/statuses/);
    expect(src).not.toMatch(/\/deployments\?per_page|repos\/\$\{repo\}\/deployments/);
  });
  it('counts deploy-prod.yml runs and reuses vercel-live-sha.sh and site-paths.sh', () => {
    expect(src).toContain("'deploy-prod.yml'");
    expect(src).toContain('scripts/vercel-live-sha.sh');
    expect(src).toMatch(/\. scripts\/site-paths\.sh[\s\S]*touches_site/);
  });
  it('never prints the Vercel token', () => {
    for (const line of src.split('\n').filter(l => /console\.(log|error)|throw new Error/.test(l))) {
      expect(line).not.toMatch(/env\.VERCEL_TOKEN|\$\{[^}]*VERCEL_TOKEN/);
    }
  });
  it('the workflow runs hourly on a full clone of main, passes the Vercel secrets, and can only write issues', () => {
    const wf = read('.github/workflows/fleet-watch.yml');
    expect(wf).toMatch(/cron: '\d+ \* \* \* \*'/);
    expect(wf).toContain('node scripts/fleet/watch.mjs');
    expect(wf).toContain('issues: write');
    expect(wf).toContain('actions: read');
    expect(wf).not.toMatch(/contents: write/);
    expect(wf).not.toMatch(/deployments:|statuses:/);
    expect(wf).toMatch(/fetch-depth: 0/);
    for (const s of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID']) expect(wf).toContain(`${s}: \${{ secrets.${s} }}`);
  });
});
