// The interview hub lists every company page there is (founder's list,
// 2026-09-14). It had claimed 30 tracks over a list of 23 — the seven pages
// shipped on 09-13 never reached it, so they had no inbound link from the hub
// that is supposed to carry them.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { render, grid, existingDescriptions, GROUPS, START, END } from '../scripts/build-interview-hub.mjs';
import { COMPANIES } from '../scripts/build-company-crosslinks.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const hub = fs.readFileSync(path.join(ROOT, 'src/sql-interview-prep.html'), 'utf8');
const pageSlugs = fs.readdirSync(path.join(ROOT, 'src'))
  .filter(f => /-sql-interview\.html$/.test(f))
  .map(f => f.replace(/-sql-interview\.html$/, ''))
  .sort();

describe('the hub', () => {
  it('links every company page that exists, and nothing that does not', () => {
    const linked = [...hub.matchAll(/href="\/([a-z0-9-]+)-sql-interview\/"/g)].map(m => m[1]);
    expect([...new Set(linked)].sort()).toEqual(pageSlugs);
  });

  it('the registry and the page set agree', () => {
    expect(Object.keys(COMPANIES).sort()).toEqual(pageSlugs);
  });

  it('states the number it lists', () => {
    const n = pageSlugs.length;
    for (const m of hub.matchAll(/(\d+) company-specific question (sets|tracks)/g)) expect(Number(m[1])).toBe(n);
    for (const m of hub.matchAll(/from the (\d+) tracks above/g)) expect(Number(m[1])).toBe(n);
  });

  it('is generated: the file is what the generator writes today', () => {
    expect(hub, 'stale — run node scripts/build-interview-hub.mjs').toBe(render(hub));
    expect(hub).toContain(START);
    expect(hub).toContain(END);
  });

  it('keeps the editorial description a company already had', () => {
    const existing = existingDescriptions(hub);
    expect(existing.amazon.desc).toMatch(/\w/);
    const out = grid(COMPANIES, existing);
    expect(out).toContain(existing.amazon.desc);
  });

  it('every sector in the registry has a group', () => {
    const sectors = new Set(Object.values(COMPANIES).map(c => c.sector));
    for (const s of sectors) expect(GROUPS.map(g => g[0])).toContain(s);
  });
});
