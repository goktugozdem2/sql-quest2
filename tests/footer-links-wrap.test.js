// The footer link row wraps on a phone (A2 live QA, 2026-11-22).
// `.flk` holds six links (Start Practicing … Refund Policy). On 25 pages it
// was a flex row without `flex-wrap`, so at 375 px the row needed 370 px in a
// 327 px footer and every one of those pages scrolled sideways: 23 company
// pages by 19 px, /sql-interview-prep/ by 93 px. Company pages are the best
// money door per arrival (ledger, M-02). Every page and generator that
// defines `.flk` as a flex row must let it wrap.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
function files(dir, re) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...files(p, re));
    else if (re.test(e.name)) out.push(p);
  }
  return out;
}
const sources = [...files(path.join(ROOT, 'src'), /\.html$/), ...files(path.join(ROOT, 'scripts'), /\.(mjs|js)$/)];
const rules = [];
for (const f of sources) {
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(/\.flk\{([^}]*)\}/g)) rules.push({ file: path.relative(ROOT, f), body: m[1] });
}

describe('footer link row (.flk)', () => {
  it('is defined somewhere (the scan found the pages)', () => {
    expect(rules.length).toBeGreaterThan(40);
  });
  it('every flex `.flk` wraps', () => {
    const bad = rules.filter(r => /display:\s*flex/.test(r.body) && !/flex-wrap:\s*wrap/.test(r.body)).map(r => r.file);
    expect(bad).toEqual([]);
  });
  it('the built company pages carry the wrapping rule', () => {
    const built = fs.readFileSync(path.join(ROOT, 'public/wise-sql-interview/index.html'), 'utf8');
    expect(built).toMatch(/\.flk\{[^}]*display:flex[^}]*flex-wrap:wrap/);
  });
});
