// The Vercel ignored-build step (2026-11-22, scripts/vercel-ignore.sh): the
// Hobby build limit was hit twice in one day by agent previews and docs-only
// merges. Previews never build; on main, only files that can change the site
// build. Run against a throwaway git repo, the way Vercel runs it.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

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
const run = (ref = 'main') => spawnSync('bash', [SCRIPT], { cwd: repo, env: { ...globalThis.process.env, VERCEL_GIT_COMMIT_REF: ref } }).status;
const SKIP = 0, BUILD = 1;

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
  });
  it('builds main when the site can change', () => {
    for (const f of ['src/app.jsx', 'public/app.js', 'vercel.json', 'api/geo/index.js', 'package.json', 'scripts/build-question-pages.mjs']) {
      commitTouching([f]);
      expect(run(), f).toBe(BUILD);
    }
  });
  it('skips main when only docs, tests, supabase or CI changed', () => {
    commitTouching(['docs/agent/ledger.md', 'BACKLOG.md']);
    expect(run()).toBe(SKIP);
    commitTouching(['tests/x.test.js', 'supabase/functions/stripe-webhook/index.ts', '.github/workflows/ci.yml']);
    expect(run()).toBe(SKIP);
  });
  it('a mixed commit builds', () => {
    commitTouching(['docs/x.md', 'src/data/challenges.js']);
    expect(run()).toBe(BUILD);
  });
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
  const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const de = (v.git && v.git.deploymentEnabled) || {};
  it('never disables main', () => {
    for (const [pattern, on] of Object.entries(de)) {
      expect(pattern === 'main' || pattern === '*' || pattern === '**', `pattern ${pattern}`).toBe(false);
      expect(on).toBe(false);
    }
  });
  it('turns off every fleet branch prefix', () => {
    for (const p of ['docs', 'feat', 'fix', 'qa', 'claude', 'content', 'chore', 'ci', 'seo']) {
      expect(de[`${p}/**`], p).toBe(false);
    }
  });
});
