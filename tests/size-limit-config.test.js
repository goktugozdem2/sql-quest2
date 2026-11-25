// Bundle size budgets (2026-11-24): .size-limit.json holds a gzip limit for
// each of the three files every /app visit downloads, and CI runs it on the
// fresh build. This pins the three entries and the CI step, so a budget
// cannot silently fall out of the config or the workflow.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const config = JSON.parse(read('.size-limit.json'));
const pkg = JSON.parse(read('package.json'));
const ci = read('.github/workflows/ci.yml');

const BUDGETED = ['public/app.js', 'public/data.js', 'public/styles.css'];

// size-limit reads "418.55 kB" with kB = 1000 bytes.
const toBytes = (limit) => {
  const m = /^([\d.]+)\s*(B|kB|MB)$/.exec(String(limit).trim());
  if (!m) return NaN;
  return Number(m[1]) * { B: 1, kB: 1000, MB: 1000 * 1000 }[m[2]];
};

describe('.size-limit.json', () => {
  it('budgets exactly app.js, data.js and styles.css', () => {
    expect(config.map((e) => e.path).sort()).toEqual([...BUDGETED].sort());
  });

  it('measures every entry gzipped, with a numeric limit', () => {
    for (const entry of config) {
      expect(entry.gzip, entry.path).toBe(true);
      const bytes = toBytes(entry.limit);
      expect(Number.isFinite(bytes) && bytes > 0, `${entry.path} limit "${entry.limit}"`).toBe(true);
    }
  });

  it('keeps each limit in the range of the bundle it guards', () => {
    // Measured 2026-11-24 on a fresh build (gzip): app.js 406.36 kB,
    // data.js 658.28 kB, styles.css 13.7 kB. A limit far outside these
    // means the budget was raised (or typed) without a read.
    const ranges = { 'public/app.js': [300e3, 600e3], 'public/data.js': [500e3, 900e3], 'public/styles.css': [8e3, 30e3] };
    for (const entry of config) {
      const [lo, hi] = ranges[entry.path];
      const bytes = toBytes(entry.limit);
      expect(bytes >= lo && bytes <= hi, `${entry.path} limit ${entry.limit}`).toBe(true);
    }
  });
});

describe('CI runs the size budget', () => {
  it('package.json has `npm run size` → size-limit', () => {
    expect(pkg.scripts.size).toBe('size-limit');
  });

  it('ci.yml runs `npm run size` after `npm run build`', () => {
    const build = ci.indexOf('run: npm run build\n');
    const size = ci.indexOf('run: npm run size');
    expect(build, 'ci.yml builds').toBeGreaterThan(-1);
    expect(size, 'ci.yml runs npm run size').toBeGreaterThan(build);
  });
});
