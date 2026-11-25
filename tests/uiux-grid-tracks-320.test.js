// Grid tracks that are wider than a 320 px phone (A4 UI/UX audit, issue
// #308, 2026-11-24, U1/U2 at 320 on the Galaxy S9+ row).
//
// `repeat(auto-fit, minmax(300px, 1fr))` never drops below its minimum, so
// on a 320 px screen with the pages' 24 px gutters (a 272 px content box)
// one column is still 300 or 320 px wide and the page scrolls sideways.
// That one pattern was 150 of the 168 criticals at 320: the company pages'
// question cards (.qg 320 / 300), format cards (.fg), "patterns" and prep
// plan lists (.pl), the topic columns, the homepage company sets, the vs-
// pages' cards. The fix is `minmax(min(Npx, 100%), 1fr)`: unchanged where
// N fits, one full-width column where it does not.
//
// Any fixed track minimum above the narrowest row's content box must be
// wrapped in min(…, 100%). The width comes from the audit's own matrix, so
// a narrower row added there tightens this guard.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DEVICE_MATRIX } from '../scripts/smoke/uiux-checks.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const GUTTER = 24;
const NARROWEST = Math.min(...DEVICE_MATRIX.map(r => r.width));
const CONTENT = NARROWEST - 2 * GUTTER;

const sources = [];
const walk = (d, re) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, re); } else if (re.test(e.name)) sources.push(p); } };
walk(path.join(ROOT, 'src'), /\.(html|css)$/);
walk(path.join(ROOT, 'scripts'), /\.(mjs|js)$/);

/** Every bare `minmax(Npx,` whose N is wider than `limit`. `minmax(min(Npx,100%),` is not bare. */
function wideTrackMinimums(text, limit) {
  return [...text.matchAll(/minmax\(\s*(\d+)px\s*,/g)].map(m => +m[1]).filter(n => n > limit);
}

describe('grid tracks fit the narrowest phone', () => {
  it('the matrix has the 320 px row (orchestrator decision 2026-11-22)', () => {
    expect(NARROWEST).toBe(320);
    expect(CONTENT).toBe(272);
  });
  it('the scanner sees a bare wide minimum and passes a wrapped one', () => {
    expect(wideTrackMinimums('grid-template-columns:repeat(auto-fit,minmax(300px,1fr))', CONTENT)).toEqual([300]);
    expect(wideTrackMinimums('grid-template-columns:repeat(auto-fit,minmax( 320px , 1fr))', CONTENT)).toEqual([320]);
    expect(wideTrackMinimums('grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))', CONTENT)).toEqual([]);
    expect(wideTrackMinimums('grid-template-columns:repeat(auto-fit,minmax(220px,1fr))', CONTENT)).toEqual([]);
  });
  it('the scan reaches the company pages and their generator', () => {
    const rel = sources.map(f => path.relative(ROOT, f));
    expect(rel).toContain('src/meta-sql-interview.html');
    expect(rel).toContain('scripts/build-company-pages.mjs');
    expect(rel).toContain('src/index.html');
  });
  it(`no page or generator has a bare track minimum above ${CONTENT} px`, () => {
    const offenders = sources
      .map(f => ({ f: path.relative(ROOT, f), wide: wideTrackMinimums(fs.readFileSync(f, 'utf8'), CONTENT) }))
      .filter(o => o.wide.length)
      .map(o => `${o.f}: ${o.wide.join(', ')}px`);
    expect(offenders).toEqual([]);
  });
});
