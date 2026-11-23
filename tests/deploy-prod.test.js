// Guard on .github/workflows/deploy-prod.yml (2026-11-23): production deploys
// made by an Action, created only when the served site changes. On 11-22 main
// got 88 commits and Vercel's Git integration created a deployment for each
// one it saw — 35 "Canceled by Ignored Build Step" still counted against the
// Hobby cap, 28 were rate-limited and never retried.
//
// What must hold: the workflow parses; one path rule shared with
// scripts/vercel-ignore.sh; no secret is ever printed; one deploy at a time;
// and the decision diffs against the LIVE deployment's commit, never HEAD^
// (the 11-22 stranding bug: S1 sentinel, finding F2).
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const WF_PATH = '.github/workflows/deploy-prod.yml';
const src = read(WF_PATH);
// Comments explain; the guards read what runs.
const strip = (s) => s.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
const code = strip(src);
const DECIDE = path.join(ROOT, 'scripts/deploy-decide.sh');
const LIVE = path.join(ROOT, 'scripts/vercel-live-sha.sh');
const decideSrc = strip(read('scripts/deploy-decide.sh'));
const liveSrc = strip(read('scripts/vercel-live-sha.sh'));
const ignoreSrc = strip(read('scripts/vercel-ignore.sh'));
// Each of these makes real git commits in a temp repo and runs a script per
// commit; vitest's default 5000 ms timed out on CI (run 45227377403).
const GIT_TIMEOUT = 20_000;

// Parse with Ruby's stdlib YAML (Psych; present on the macOS laptop and on
// ubuntu-latest) so the repo needs no YAML dependency. YAML 1.1 reads the key
// `on` as true, hence wf.on ?? wf.true.
function parseYaml(file) {
  const out = execFileSync('ruby', ['-ryaml', '-rjson', '-e', 'puts JSON.generate(YAML.load(File.read(ARGV[0])))', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out);
}

describe('deploy-prod.yml: shape', () => {
  // Parse errors are caught here so the failure is reported by the test's
  // name below, not as a suite that could not be collected.
  let wf = {}, parseError = null;
  try { wf = parseYaml(path.join(ROOT, WF_PATH)); } catch (e) { parseError = String(e.stderr || e.message).split('\n')[0]; }
  const on = wf.on ?? wf.true ?? {};
  const steps = wf.jobs?.deploy?.steps ?? [];

  it('parses as YAML into one deploy job', () => {
    expect(parseError).toBeNull();
    expect(wf.name).toBe('Deploy (production)');
    expect(Object.keys(wf.jobs)).toEqual(['deploy']);
    expect(Array.isArray(steps)).toBe(true);
  });
  it('runs on a push to main, by hand with an optional force, and every 6 hours', () => {
    expect(on.push.branches).toEqual(['main']);
    expect(on.workflow_dispatch.inputs.force.type).toBe('boolean');
    expect(on.workflow_dispatch.inputs.force.default).toBe(false);
    expect(on.schedule).toHaveLength(1);
    expect(on.schedule[0].cron).toMatch(/^\d+ \*\/6 \* \* \*$/);
  });
  it('one deploy at a time, never cancelling a running one', () => {
    expect(wf.concurrency).toEqual({ group: 'deploy-prod', 'cancel-in-progress': false });
  });
  it('reads only (no write permission to the repo)', () => {
    expect(wf.permissions).toEqual({ contents: 'read' });
  });
  it('pins the Vercel CLI and runs pull → build --prod → deploy --prebuilt --prod', () => {
    expect(wf.env.VERCEL_CLI).toMatch(/^vercel@\d+\.\d+\.\d+$/);
    const runs = steps.map(s => s.run || '').join('\n');
    const calls = runs.match(/npx --yes \S+ \w+/g);
    expect(calls).toEqual([
      'npx --yes "$VERCEL_CLI" pull',
      'npx --yes "$VERCEL_CLI" build',
      'npx --yes "$VERCEL_CLI" deploy',
    ]);
    expect(runs).toMatch(/pull --yes --environment=production/);
    expect(runs).toMatch(/build --prod/);
    expect(runs).toMatch(/deploy --prebuilt --prod --meta deployCommitSha="\$head_sha"/);
    expect(code).not.toMatch(/vercel@(latest|\^|~)/);
  });
  it('every Vercel step runs only when the decision says deploy', () => {
    for (const s of steps.filter(x => /VERCEL_CLI|setup-node/.test((x.run || '') + (x.uses || '')))) {
      expect(s.if, s.name || s.uses).toBe("steps.decide.outputs.deploy == 'true'");
    }
  });
  it('without the secrets: a warning and exit 0 on push/schedule, a failure by hand', () => {
    const cfg = steps.find(s => s.id === 'cfg');
    expect(cfg.run).toMatch(/::warning::/);
    expect(cfg.run).toMatch(/echo "on=false"/);
    expect(cfg.run).toMatch(/if \[ "\$EVENT" = "workflow_dispatch" \]; then[\s\S]*exit 1/);
    for (const id of ['live', 'decide']) expect(steps.find(s => s.id === id).if).toBe("steps.cfg.outputs.on == 'true'");
  });
});

describe('deploy-prod: the path rule is shared, not duplicated', () => {
  const RULE_FRAGMENT = /docs\/\|tests\//;
  it('scripts/site-paths.sh holds the rule', () => {
    expect(read('scripts/site-paths.sh')).toMatch(/^SITE_IGNORE_RE='\^\(docs\/\|tests\/\|supabase\/\|\\\.github\/\|\\\.claude\/\|\[\^\/\]\+\\\.\(md\|sql\)\$\)'$/m);
  });
  it('both callers source it and neither spells the rule out', () => {
    expect(ignoreSrc).toMatch(/\. "\$\(dirname "\$0"\)\/site-paths\.sh"/);
    expect(decideSrc).toMatch(/site-paths\.sh"/);
    for (const [name, s] of [['vercel-ignore.sh', ignoreSrc], ['deploy-decide.sh', decideSrc], ['deploy-prod.yml', code]]) {
      expect(s, name).not.toMatch(RULE_FRAGMENT);
    }
    expect(ignoreSrc).toMatch(/\| touches_site/);
    expect(decideSrc).toMatch(/\| touches_site/);
  });
  it('no other script or workflow carries its own copy', () => {
    const hits = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = path.join(dir, e.name);
        if (e.isDirectory()) walk(rel);
        else if (/\.(sh|ya?ml|mjs|js)$/.test(e.name) && rel !== path.join('scripts', 'site-paths.sh') && RULE_FRAGMENT.test(strip(read(rel)))) hits.push(rel);
      }
    };
    walk('scripts');
    walk('.github');
    expect(hits).toEqual([]);
  });
  it('the workflow hands the decision to deploy-decide.sh', () => {
    expect(code).toMatch(/run: bash scripts\/deploy-decide\.sh/);
  });
});

describe('deploy-prod: no secret is ever printed', () => {
  const SECRETS = ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'];
  it('secrets enter only through env:, never interpolated into a script', () => {
    const lines = code.split('\n').filter(l => l.includes('${{ secrets.'));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) expect(l, l).toMatch(/^\s+(VERCEL_TOKEN|VERCEL_ORG_ID|VERCEL_PROJECT_ID): \$\{\{ secrets\.\1 \}\}$/);
  });
  it('no echo / printf / summary line names a secret, and no shell tracing', () => {
    for (const [name, s] of [['deploy-prod.yml', code], ['deploy-decide.sh', decideSrc], ['vercel-live-sha.sh', liveSrc]]) {
      for (const l of s.split('\n').filter(x => /\b(echo|printf)\b/.test(x))) {
        // Naming a secret in a hint is fine; expanding its value is not.
        for (const k of SECRETS) expect(l, `${name}: ${l.trim()}`).not.toMatch(new RegExp(`\\$\\{?${k}\\b`));
      }
      expect(s, name).not.toMatch(/set -[a-z]*x|set -o xtrace|bash -x/);
      expect(s, name).not.toMatch(/curl[^\n]*\s(-v|--verbose|--trace)/);
    }
  });
  it('vercel-live-sha.sh does not print the token even when the API echoes it back', () => {
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-prod-bin-'));
    // A fake curl that answers with the Authorization header it was given.
    fs.writeFileSync(path.join(bin, 'curl'), '#!/usr/bin/env bash\nfor a in "$@"; do case "$a" in Authorization:*) h="$a";; esac; done\nprintf \'{"deployments":[{"meta":{"note":"%s"}}]}\' "$h"\n', { mode: 0o755 });
    const r = spawnSync('bash', [LIVE], { encoding: 'utf8', env: { ...globalThis.process.env, PATH: `${bin}:${globalThis.process.env.PATH}`, VERCEL_TOKEN: 'tok-SHOULD-NOT-APPEAR', VERCEL_PROJECT_ID: 'prj_x', VERCEL_ORG_ID: 'team_x' } });
    expect(r.stdout + r.stderr).not.toContain('tok-SHOULD-NOT-APPEAR');
    expect(r.stdout).toBe('');
  });
});

// The live deployment's commit, read back from the API (fake curl, real jq).
describe('vercel-live-sha.sh', () => {
  const A = 'a'.repeat(40), B = 'b'.repeat(40);
  const runWith = (json, { ok = true } = {}) => {
    const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-prod-bin-'));
    fs.writeFileSync(path.join(bin, 'args'), '');
    fs.writeFileSync(path.join(bin, 'curl'), `#!/usr/bin/env bash\nprintf '%s\\n' "$@" | grep -v Authorization >> "${bin}/args"\n${ok ? `cat <<'J'\n${JSON.stringify(json)}\nJ` : 'exit 22'}\n`, { mode: 0o755 });
    const r = spawnSync('bash', [LIVE], { encoding: 'utf8', env: { ...globalThis.process.env, PATH: `${bin}:${globalThis.process.env.PATH}`, VERCEL_TOKEN: 't', VERCEL_PROJECT_ID: 'prj_x', VERCEL_ORG_ID: 'team_x' } });
    return { out: r.stdout.trim(), args: fs.readFileSync(path.join(bin, 'args'), 'utf8'), status: r.status };
  };
  it('asks for the newest READY production deployment of the project', () => {
    const { args } = runWith({ deployments: [] });
    expect(args).toMatch(/v6\/deployments\?projectId=prj_x&target=production&state=READY&limit=1&teamId=team_x/);
  });
  it("prefers this workflow's deployCommitSha, falls back to the Git integration's githubCommitSha", () => {
    expect(runWith({ deployments: [{ meta: { deployCommitSha: A, githubCommitSha: B } }] }).out).toBe(A);
    expect(runWith({ deployments: [{ meta: { githubCommitSha: B } }] }).out).toBe(B);
  });
  it('prints nothing (= unknown, so the decision deploys) on no deployment, no commit, junk, or an HTTP error', () => {
    expect(runWith({ deployments: [] }).out).toBe('');
    expect(runWith({ deployments: [{ meta: {} }] }).out).toBe('');
    expect(runWith({ deployments: [{ meta: { githubCommitSha: 'not-a-sha; rm -rf /' } }] }).out).toBe('');
    const r = runWith({}, { ok: false });
    expect(r.out).toBe('');
    expect(r.status).toBe(0);
  });
});

// The decision, run the way the workflow runs it, in a throwaway repo.
describe('deploy-decide.sh compares against the LIVE deployment, never HEAD^', () => {
  let repo;
  const git = (...a) => execFileSync('git', a, { cwd: repo, stdio: 'pipe' }).toString();
  const sha = (rev = 'HEAD') => git('rev-parse', rev).trim();
  const commitTouching = (files) => {
    for (const f of files) {
      const p = path.join(repo, f);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.appendFileSync(p, `${Math.random()}\n`);
    }
    git('add', '-A');
    git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'c');
  };
  const setGitMain = (on) => {
    fs.writeFileSync(path.join(repo, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: on ? { 'docs/**': false } : { main: false, 'docs/**': false } } }));
    commitTouching([]);
  };
  const decide = ({ live, force = 'false', event = 'push' }) => {
    const out = path.join(repo, '.gh-output');
    fs.writeFileSync(out, '');
    const r = spawnSync('bash', [DECIDE], { cwd: repo, encoding: 'utf8', env: { ...globalThis.process.env, LIVE_SHA: live ?? '', FORCE: force, EVENT: event, GITHUB_OUTPUT: out } });
    expect(r.status).toBe(0);
    const m = fs.readFileSync(out, 'utf8').match(/^deploy=(true|false)$/m);
    return m ? m[1] === 'true' : null;
  };

  beforeAll(() => {
    repo = fs.mkdtempSync(path.join(os.tmpdir(), 'deploy-decide-'));
    git('init', '-q');
    commitTouching(['README.md']);
    fs.writeFileSync(path.join(repo, 'vercel.json'), JSON.stringify({ git: { deploymentEnabled: { main: false } } }));
    git('add', 'vercel.json');
    git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'v');
  });

  it('the 11-22 case: an undeployed site change behind a docs-only HEAD deploys', () => {
    commitTouching(['docs/x.md']);
    const live = sha();
    commitTouching(['src/app.jsx']);      // merged, never deployed
    commitTouching(['docs/ledger.md']);   // HEAD is docs-only: HEAD^..HEAD would say skip
    expect(decide({ live })).toBe(true);
  }, GIT_TIMEOUT);
  it('skips when nothing since the live commit reaches the site', () => {
    commitTouching(['src/app.jsx']);
    const live = sha();
    commitTouching(['docs/a.md', 'BACKLOG.md']);
    commitTouching(['tests/b.test.js', 'supabase/functions/x/index.ts', '.github/workflows/ci.yml']);
    expect(decide({ live })).toBe(false);
  }, GIT_TIMEOUT);
  it('deploys when a site file changed since the live commit', () => {
    const live = sha();
    commitTouching(['public/app.js']);
    expect(decide({ live })).toBe(true);
    for (const f of ['vercel.json', 'api/geo.js', 'package.json', 'scripts/build-question-pages.mjs']) {
      const l = sha();
      commitTouching([f === 'vercel.json' ? 'vercel.extra.json' : f]);
      expect(decide({ live: l }), f).toBe(true);
    }
  }, GIT_TIMEOUT);
  it('skips when the live deployment is already HEAD or newer than it', () => {
    commitTouching(['src/a.js']);
    expect(decide({ live: sha() })).toBe(false);
  }, GIT_TIMEOUT);
  it('deploys when the live commit is unknown or not in the clone', () => {
    expect(decide({ live: '' })).toBe(true);
    expect(decide({ live: 'deadbeef'.repeat(5) })).toBe(true);
  }, GIT_TIMEOUT);
  it('force deploys even with nothing changed', () => {
    expect(decide({ live: sha(), force: 'true', event: 'workflow_dispatch' })).toBe(true);
  }, GIT_TIMEOUT);
  it("while Vercel's Git integration still deploys main, push and schedule skip; a manual run still decides", () => {
    setGitMain(true);
    const live = sha();
    commitTouching(['src/app.jsx']);
    expect(decide({ live, event: 'push' })).toBe(false);
    expect(decide({ live, event: 'schedule' })).toBe(false);
    expect(decide({ live, event: 'workflow_dispatch' })).toBe(true);
    setGitMain(false);
    expect(decide({ live, event: 'push' })).toBe(true);
  }, GIT_TIMEOUT);
  it('source guard: no parent-commit or push-before diff anywhere in the decision', () => {
    for (const [name, s] of [['deploy-decide.sh', decideSrc], ['deploy-prod.yml', code]]) {
      expect(s, name).not.toMatch(/HEAD\^|HEAD~|github\.event\.before|\bBEFORE\b|VERCEL_GIT_PREVIOUS_SHA/);
    }
    expect(decideSrc).toMatch(/git diff --name-only "\$live" HEAD/);
    expect(decideSrc).toMatch(/live="\$\{LIVE_SHA:-\}"/);
    expect(code).toMatch(/LIVE_SHA: \$\{\{ steps\.live\.outputs\.sha \}\}/);
    expect(code).toMatch(/bash scripts\/vercel-live-sha\.sh/);
  });
});
