// The Vercel ignored-build step (2026-11-22, scripts/vercel-ignore.sh): the
// Hobby build limit was hit twice in one day by agent previews and docs-only
// merges. Previews never build; on main, only files that can change the site
// build. Run against a throwaway git repo, the way Vercel runs it.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
// Minimatch semantics for branch globs without brace/extglob: '**' spans '/', '*' does not.
const minimatch = (str, pat) => new RegExp('^' + pat.split('**').map(part => part.split('*').map(x => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$').test(str);

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts/vercel-ignore.sh');
let repo;
const git = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'pipe' }).toString();

function commitTouching(files) {
  for (const f of files) {
    const p = path.join(repo, f);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, `${Math.random()}\n`);
  }
  git('add', '-A');
  git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'c');
}
const sha = (rev) => git('rev-parse', rev).trim();
// prev = the commit of the last successful deployment (VERCEL_GIT_PREVIOUS_SHA); default: the parent.
const run = (ref = 'main', prev = sha('HEAD^')) => spawnSync('bash', [SCRIPT], { cwd: repo, env: { ...globalThis.process.env, VERCEL_GIT_COMMIT_REF: ref, VERCEL_GIT_PREVIOUS_SHA: prev ?? '' } }).status;
const SKIP = 0, BUILD = 1;
// Each of these makes real git commits in a temp repo and runs a script per
// commit; vitest's default 5000 ms timed out on CI (run 45227377403).
const GIT_TIMEOUT = 20_000;

beforeAll(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), 'vercel-ignore-'));
  git('init', '-q');
  commitTouching(['README.md']);
});

describe('vercel-ignore.sh', () => {
  it('never builds a preview branch', () => {
    commitTouching(['src/app.jsx']);
    expect(run('feat/anything')).toBe(SKIP);
    expect(run('')).toBe(SKIP);
  }, GIT_TIMEOUT);
  it('builds main when the site can change', () => {
    for (const f of ['src/app.jsx', 'public/app.js', 'vercel.json', 'api/geo/index.js', 'package.json', 'scripts/build-question-pages.mjs']) {
      commitTouching([f]);
      expect(run(), f).toBe(BUILD);
    }
  }, GIT_TIMEOUT);
  it('skips main when only docs, tests, supabase or CI changed', () => {
    commitTouching(['docs/agent/ledger.md', 'BACKLOG.md']);
    expect(run()).toBe(SKIP);
    commitTouching(['tests/x.test.js', 'supabase/functions/stripe-webhook/index.ts', '.github/workflows/ci.yml']);
    expect(run()).toBe(SKIP);
  }, GIT_TIMEOUT);
  it('a mixed commit builds', () => {
    commitTouching(['docs/x.md', 'src/data/challenges.js']);
    expect(run()).toBe(BUILD);
  }, GIT_TIMEOUT);
  it('vercel.json runs it', () => {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    expect(v.ignoreCommand).toBe('bash scripts/vercel-ignore.sh');
  });
});

// 2026-11-22 (later): the ignored-build step does not save the Hobby budget —
// Vercel CREATES the deployment, then cancels it, and the creation counts
// ("more than 100, code: api-deployments-free-per-day"). Branch pushes must not
// create deployments at all: git.deploymentEnabled turns them off by prefix.
describe('vercel.json git.deploymentEnabled', () => {
  it('a catch-all turns off any branch with a slash (new lanes included)', () => {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    const pats = Object.keys(v.git.deploymentEnabled);
    expect(pats).toContain('*/**');
    for (const b of ['s1/sentinel-2026-11-22', 'newlane/x', 'r1/batch-4']) {
      expect(pats.some(p => minimatch(b, p)), b).toBe(true);
    }
  });
  const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const de = (v.git && v.git.deploymentEnabled) || {};
  // 2026-11-23 (the switch): main is OFF for the Git integration too. The
  // production deploy is .github/workflows/deploy-prod.yml, which creates a
  // deployment only when a site file changed since the live one. Rollback:
  // revert the "main": false line in vercel.json.
  it('main is off: the Git integration creates no deployment for it', () => {
    expect(de.main).toBe(false);
  });
  it('main is off only because the deploy Action exists to deploy it', () => {
    const wf = path.join(ROOT, '.github/workflows/deploy-prod.yml');
    expect(fs.existsSync(wf), 'deploy-prod.yml must be merged before this switch').toBe(true);
    expect(fs.readFileSync(wf, 'utf8')).toMatch(/deploy --prebuilt --prod/);
  });
  it('every other pattern is off and none is a catch-all that could hide main by accident', () => {
    for (const [pattern, on] of Object.entries(de)) {
      expect(on, pattern).toBe(false);
      if (pattern !== 'main') {
        expect(minimatch('main', pattern), `pattern ${pattern} matches main`).toBe(false);
        expect(pattern === '*' || pattern === '**', `pattern ${pattern}`).toBe(false);
      }
    }
  });
  it('turns off every fleet branch prefix', () => {
    for (const p of ['docs', 'feat', 'fix', 'qa', 'claude', 'content', 'chore', 'ci', 'seo', 's1', 'r1']) {
      expect(de[`${p}/**`], p).toBe(false);
    }
  });
});

// 2026-11-22 (S1, finding F2): a site change that was never deployed (the
// deploy was rate-limited) must still build on the next docs-only commit.
describe('vercel-ignore.sh compares against the last successful deployment', () => {
  it('builds a docs-only commit when an undeployed site change sits between it and the last deployment', () => {
    commitTouching(['docs/x.md']);
    const lastDeployed = sha('HEAD');
    commitTouching(['src/app.jsx']);      // merged, but its deploy was rate-limited
    commitTouching(['docs/ledger.md']);   // the next merge is docs-only
    expect(run('main', lastDeployed)).toBe(BUILD);
  }, GIT_TIMEOUT);
  it('still skips when nothing since the last deployment reaches the site', () => {
    commitTouching(['docs/a.md']);
    const lastDeployed = sha('HEAD');
    commitTouching(['docs/b.md']);
    commitTouching(['tests/c.test.js']);
    expect(run('main', lastDeployed)).toBe(SKIP);
  }, GIT_TIMEOUT);
  it('builds when the last deployment sha is not in the clone', () => {
    commitTouching(['docs/e.md']);
    expect(run('main', 'deadbeef'.repeat(5))).toBe(BUILD);
  }, GIT_TIMEOUT);
  it('builds when the last deployment is unknown', () => {
    commitTouching(['docs/d.md']);
    expect(run('main', '')).toBe(BUILD);
  }, GIT_TIMEOUT);
});
