import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  readRc, readBaseline, parseBaseline, failureKeys, compareToBaseline, urlPath, PRESETS,
} from '../scripts/lighthouse/gate.mjs';
import { loadQuestionBank, questionSlugs } from '../scripts/question-slugs.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------------------------------------------------------------------------
// Lighthouse CI (2026-11-24). The job itself needs Chrome and a build, so it
// runs in .github/workflows/lighthouse.yml, not here. This file pins what the
// job must keep doing: the six template URLs, the gates, private reports, and
// a baseline that only ever names a real page and a real gate.
// ---------------------------------------------------------------------------

const SIX = [
  '/',
  '/sql-exercises/',
  '/challenges/window-functions/',
  '/capital-one-sql-interview/',
  '/sql-not-in-null/',
];

describe('lighthouserc.json', () => {
  const rc = readRc();

  it('runs the six template pages, three runs each, on the locally served public/', () => {
    const urls = rc.ci.collect.url;
    const paths = urls.map(urlPath);
    expect(urls.every(u => u.startsWith('http://localhost:4321/'))).toBe(true);
    expect(paths).toHaveLength(6);
    for (const p of SIX) expect(paths).toContain(p);
    const q = paths.filter(p => p.startsWith('/questions/'));
    expect(q, 'exactly one /questions/<slug>/ page').toHaveLength(1);
    expect(rc.ci.collect.numberOfRuns).toBe(3);
    expect(rc.ci.collect.startServerCommand).toMatch(/serve(@[\d.]+)? public -l 4321/);
  });

  it('the question page is a real slug of the live bank, and every page exists in the build source', () => {
    const slugs = new Set(questionSlugs(loadQuestionBank().bank).values());
    const q = rc.ci.collect.url.map(urlPath).find(p => p.startsWith('/questions/'));
    expect(slugs.has(q.split('/')[2]), `${q} is not a slug of the bank`).toBe(true);
    for (const p of rc.ci.collect.url.map(urlPath)) {
      expect(fs.existsSync(path.join(ROOT, 'public', p, 'index.html')), `public${p}index.html is not built`).toBe(true);
    }
  });

  it('fails on SEO < 1.0, accessibility < 0.9 and CLS > 0.1; only warns on performance', () => {
    const a = rc.ci.assert.assertions;
    expect(a['categories:seo']).toEqual(['error', expect.objectContaining({ minScore: 1 })]);
    expect(a['categories:accessibility']).toEqual(['error', expect.objectContaining({ minScore: 0.9 })]);
    expect(a['cumulative-layout-shift']).toEqual(['error', expect.objectContaining({ maxNumericValue: 0.1 })]);
    expect(a['categories:performance'][0]).toBe('warn');
    for (const v of Object.values(a)) expect(v[1].aggregationMethod).toBe('median');
    // No other gate may be quietly weakened by an assertMatrix or a preset.
    expect(rc.ci.assert.assertMatrix).toBeUndefined();
    expect(rc.ci.assert.preset).toBeUndefined();
  });

  it('keeps reports private: filesystem upload, never temporary-public-storage', () => {
    expect(rc.ci.upload.target).toBe('filesystem');
    for (const f of ['lighthouserc.json', '.github/workflows/lighthouse.yml', 'scripts/lighthouse/run.mjs']) {
      // The words may appear in a comment explaining the ban; a target may not.
      expect(read(f), f).not.toMatch(/target["']?\s*[:=]\s*["']?temporary-public-storage/);
      expect(read(f), f).not.toMatch(/--upload\.target(=|\s+)temporary/);
    }
  });

  it('blocks the analytics hosts so no run writes to production or Clarity', () => {
    const blocked = rc.ci.collect.settings.blockedUrlPatterns.join(' ');
    for (const h of ['clarity.ms', 'supabase.co', '/_vercel/']) expect(blocked).toContain(h);
  });
});

describe('.github/workflows/lighthouse.yml', () => {
  const wf = read('.github/workflows/lighthouse.yml');

  it('runs on pull requests touching src/, scripts/ or public/, and by hand', () => {
    expect(wf).toMatch(/pull_request:/);
    for (const p of ["'src/**'", "'scripts/**'", "'public/**'"]) expect(wf).toContain(p);
    expect(wf).toMatch(/workflow_dispatch:/);
  });

  it('builds, runs the gate for both presets, and keeps the reports as an artifact', () => {
    expect(wf).toMatch(/run: npm run build/);
    expect(wf).toMatch(/run: node scripts\/lighthouse\/run\.mjs\s*$/m); // no preset argument = both
    expect(wf).toMatch(/actions\/upload-artifact@v4/);
    expect(wf).toMatch(/path: lhci-reports\//);
    expect(wf, 'the gate step must not be allowed to fail silently').not.toMatch(/continue-on-error:\s*true/);
  });

  it('@lhci/cli is an exact-pinned devDependency', () => {
    const v = JSON.parse(read('package.json')).devDependencies['@lhci/cli'];
    expect(v).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('the baseline (scripts/lighthouse-baseline.txt) — a shrink-only ratchet', () => {
  const rc = readRc();
  const paths = new Set(rc.ci.collect.url.map(urlPath));
  const gates = new Set(Object.entries(rc.ci.assert.assertions).filter(([, v]) => v[0] === 'error').map(([k]) => k));

  it('names only a real preset, one of the six pages and an error-level gate, once each', () => {
    const base = readBaseline();
    expect(new Set(base).size).toBe(base.length);
    for (const line of base) {
      const [preset, p, gate] = line.split('\t');
      expect(PRESETS, line).toContain(preset);
      expect(paths.has(p), line).toBe(true);
      expect(gates.has(gate), `${line}: performance is warn-only and never belongs here`).toBe(true);
    }
  });

  it('a failure outside the baseline is NEW and fails; a baseline line that passes is STALE and fails', () => {
    const results = [
      { level: 'error', passed: false, url: 'http://localhost:4321/', auditId: 'categories', auditProperty: 'accessibility' },
      { level: 'error', passed: false, url: 'http://localhost:4321/sql-exercises/', auditId: 'cumulative-layout-shift' },
      { level: 'warn', passed: false, url: 'http://localhost:4321/', auditId: 'categories', auditProperty: 'performance' },
    ];
    const failures = failureKeys('mobile', results);
    expect(failures).toEqual([
      'mobile\t/\tcategories:accessibility',
      'mobile\t/sql-exercises/\tcumulative-layout-shift',
    ]);
    const baseline = parseBaseline('# c\nmobile\t/\tcategories:accessibility\nmobile\t/sql-not-in-null/\tcategories:seo\ndesktop\t/\tcategories:seo\n');
    const { fresh, stale, known } = compareToBaseline(failures, baseline, ['mobile']);
    expect(known).toEqual(['mobile\t/\tcategories:accessibility']);
    expect(fresh).toEqual(['mobile\t/sql-exercises/\tcumulative-layout-shift']);
    // desktop did not run, so its line is neither stale nor known
    expect(stale).toEqual(['mobile\t/sql-not-in-null/\tcategories:seo']);
  });

  it('a malformed baseline line is refused, not skipped', () => {
    expect(() => parseBaseline('mobile / categories:seo')).toThrow(/bad line/);
  });
});
