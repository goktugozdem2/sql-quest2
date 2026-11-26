// scripts/ab/read-test.mjs: argument parsing, the per-test SQL and the
// payload handed to read.py (gbstats). The Python side is tested by
// scripts/ab/test_read.py in CI's `ab-stats` job; this file needs no Python.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TESTS, CRAWLER_VIEWPORTS, INTERNAL_RE, parseArgs, getTest, sqlFor, buildPayload,
} from '../scripts/ab/read-test.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('parseArgs', () => {
  it('takes one test id and the flags', () => {
    const a = parseArgs(['companyDirectOpen', '--counts', '[]', '--python', '/x/python', '--since', '2026-11-23', '--format', 'json', '--secondary']);
    expect(a).toMatchObject({ test: 'companyDirectOpen', counts: '[]', python: '/x/python', since: '2026-11-23', format: 'json', secondary: true });
  });
  it('defaults to text, no counts', () => {
    expect(parseArgs(['mobileOneLayer'])).toMatchObject({ test: 'mobileOneLayer', counts: null, format: 'text', secondary: false });
  });
  it('rejects what it cannot use', () => {
    expect(() => parseArgs(['a', 'b'])).toThrow(/one test id/);
    expect(() => parseArgs(['a', '--nope'])).toThrow(/unknown option/);
    expect(() => parseArgs(['a', '--counts'])).toThrow(/needs a value/);
    expect(() => parseArgs(['a', '--format', 'csv'])).toThrow(/text or json/);
    expect(() => parseArgs(['a', '--since', "2026-11-23'; drop table x"])).toThrow(/ISO/);
    expect(() => parseArgs(['a', '--counts', '[]', '--counts-file', 'f'])).toThrow(/not both/);
  });
  it('accepts ISO timestamps for --since', () => {
    expect(parseArgs(['a', '--since', '2026-11-24T11:09:00Z']).since).toBe('2026-11-24T11:09:00Z');
  });
});

describe('the test registry', () => {
  it('knows the live tests and refuses an unknown one', () => {
    expect(Object.keys(TESTS)).toEqual(expect.arrayContaining(['companyDirectOpen', 'mobileOneLayer']));
    expect(() => getTest('nope')).toThrow(/unknown test/);
  });
  it('every test names a control among its arms', () => {
    for (const t of Object.values(TESTS)) expect(t.arms).toContain(t.control);
  });
});

describe('the SQL', () => {
  const ids = Object.keys(TESTS);
  for (const id of ids) {
    it(`${id}: carries the README population filters`, () => {
      const sql = sqlFor(id, '2026-11-24T00:00:00Z');
      expect(sql).toContain(INTERNAL_RE);
      for (const vp of CRAWLER_VIEWPORTS) expect(sql).toContain(`'${vp}'`);
      expect(sql).toMatch(/m->>'bot'/);
      expect(sql).toMatch(/f\.m->>'langs' = '1'/);           // app1lang crawler
      expect(sql).toMatch(/event = 'landing_view'/);
      expect(sql).toContain("'2026-11-24 11:00:00+00'");    // the walk guests
      expect(sql).toContain("'Europe/Istanbul'");
      expect(sql).toMatch(/select (a|p)\.arm, count\(\*\) users/);
      expect(sql).toMatch(/\) conversions/);
    });
    it(`${id}: read-only and safe to paste on one line`, () => {
      const sql = sqlFor(id, '2026-11-24T00:00:00Z');
      expect(sql).not.toMatch(/\b(insert|update|delete|drop|alter|truncate|grant)\b/i);
      expect(sql).not.toMatch(/--/); // a line comment swallows the rest once joined
    });
  }
  it('uses the flip as the window by default, --since when given', () => {
    expect(sqlFor('companyDirectOpen')).toContain("timestamptz '2026-11-23T00:00:00Z'");
    expect(sqlFor('companyDirectOpen', '2026-12-01')).toContain("timestamptz '2026-12-01'");
  });
  it('a dark test needs --since', () => {
    expect(() => sqlFor('mobileRunBar')).toThrow(/--since/);
  });
  it('companyDirectOpen: solve within 10 minutes of assignment, full windows only', () => {
    const sql = sqlFor('companyDirectOpen');
    expect(sql).toMatch(/event = 'company_direct_assigned'/);
    expect(sql).toMatch(/e\.event = 'challenge_solved'\s+and e\.created_at >= a\.t0 and e\.created_at <= a\.t0 \+ interval '10 minutes'/);
    expect(sql).toMatch(/a\.t0 < now\(\) - interval '10 minutes'/);
  });
  it('mobileOneLayer: mobile first solvers, a different challenge, same session', () => {
    const sql = sqlFor('mobileOneLayer');
    expect(sql).toMatch(/fs\.band = 'mobile'/);
    expect(sql).toMatch(/s\.cid is distinct from p\.cid/);
    expect(sql).toMatch(/gap > interval '30 minutes'/);
    expect(sql).toMatch(/t1 < now\(\) - interval '1 hour'/);
  });
});

describe('buildPayload', () => {
  it('maps MCP rows to read.py input, control from the registry', () => {
    const p = buildPayload('companyDirectOpen', [
      { arm: 'direct', users: '5', conversions: '0' },
      { arm: 'list', users: 6, conversions: 2 },
    ]);
    expect(p.control).toBe('list');
    expect(p.test).toBe('companyDirectOpen');
    expect(p.arms).toEqual([
      { arm: 'direct', users: 5, conversions: 0 },
      { arm: 'list', users: 6, conversions: 2 },
    ]);
  });
  it('an arm with no rows is reported as 0 people, not dropped', () => {
    const p = buildPayload('mobileOneLayer', [{ arm: 'control', users: 1, conversions: 0 }]);
    expect(p.arms).toContainEqual({ arm: 'one', users: 0, conversions: 0 });
  });
  it('reads the secondary column on request', () => {
    const rows = [{ arm: 'list', users: 6, conversions: 2, secondary_conversions: 3 }];
    const p = buildPayload('companyDirectOpen', rows, null, { secondary: true });
    expect(p.arms[0].conversions).toBe(3);
    expect(p.metric).toMatch(/first run/);
    expect(() => buildPayload('mobileOneLayer', [], null, { secondary: true })).toThrow(/no secondary/);
  });
  it('refuses an arm the test does not have, or a shape it cannot read', () => {
    expect(() => buildPayload('companyDirectOpen', [{ arm: 'control', users: 1, conversions: 0 }])).toThrow(/not an arm/);
    expect(() => buildPayload('companyDirectOpen', { nope: 1 })).toThrow(/JSON array/);
  });
});

describe('the engine is gbstats, run isolated', () => {
  const py = fs.readFileSync(path.join(root, 'scripts/ab/read.py'), 'utf8');
  it('read.py uses gbstats test classes, not a hand-rolled formula', () => {
    expect(py).toMatch(/from gbstats\.bayesian\.tests import EffectBayesianABTest/);
    expect(py).toMatch(/from gbstats\.frequentist\.tests import TwoSidedTTest/);
    expect(py).not.toMatch(/norm\.(sf|cdf|ppf)|erf\(/);
  });
  it('gbstats is pinned and CI runs the Python tests in isolated mode', () => {
    const req = fs.readFileSync(path.join(root, 'scripts/ab/requirements.txt'), 'utf8');
    expect(req).toMatch(/^gbstats==\d+\.\d+\.\d+$/m);
    const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toMatch(/python-version: '3\.11'/);
    expect(ci).toMatch(/python -I scripts\/ab\/test_read\.py/);
  });
  it('the wrapper runs python with -I', () => {
    const js = fs.readFileSync(path.join(root, 'scripts/ab/read-test.mjs'), 'utf8');
    expect(js).toMatch(/spawnSync\(python, \['-I'/);
  });
});
