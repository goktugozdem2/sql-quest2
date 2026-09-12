import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(join(ROOT, 'vercel.json'), 'utf8'));

// 2026-09-12, founder's cleanup item 12: sector deep links are English
// (?sector=finance | real-estate | manufacturing) while the data ids stay
// Turkish. Two halves must hold together: every read of the parameter in the
// app goes through canonicalSectorId, and the legacy spellings 301 to the
// English ones so old links do not fork the arrival series.
describe('sector parameter: English on the wire, canonical inside', () => {
  const block = app.slice(app.indexOf('const SECTOR_PARAM_ALIASES'), app.indexOf('function canonicalSectorId'));
  it('maps the three English names to the data ids', () => {
    expect(block).toMatch(/finance: 'finans'/);
    expect(block).toMatch(/'real-estate': 'gayrimenkul'/);
    expect(block).toMatch(/manufacturing: 'uretim'/);
  });
  it('every read of ?sector= goes through canonicalSectorId', () => {
    const reads = [...app.matchAll(/[A-Za-z]+\.get\('sector'\)/g)].map(m => m.index);
    expect(reads.length).toBeGreaterThanOrEqual(4);
    for (const at of reads) {
      const before = app.slice(Math.max(0, at - 40), at);
      if (/!!\s*$/.test(before)) continue;              // a truthiness check, never a value
      expect(before, app.slice(at - 60, at + 30)).toMatch(/canonicalSectorId\($/);
    }
  });
  it('the legacy Turkish spellings 301 to the English ones', () => {
    const legacy = { finans: 'finance', gayrimenkul: 'real-estate', uretim: 'manufacturing' };
    for (const [oldName, newName] of Object.entries(legacy)) {
      const rule = vercel.redirects.find(r => r.source === '/app/' && (r.has || []).some(h => h.type === 'query' && h.key === 'sector' && h.value === oldName));
      expect(rule, `no redirect for ?sector=${oldName}`).toBeTruthy();
      expect(rule.destination).toContain(`sector=${newName}`);
      expect(rule.permanent).toBe(true);
    }
  });
  it('no English page still links a Turkish sector id', () => {
    const offenders = [];
    const walk = dir => {
      for (const f of fs.readdirSync(dir)) {
        const p = join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.html$/.test(f) && /sector=(finans|gayrimenkul|uretim)\b/.test(fs.readFileSync(p, 'utf8'))) offenders.push(p.replace(ROOT + '/', ''));
      }
    };
    walk(join(ROOT, 'src'));
    // The Turkish pages link their own sector by data id on purpose; the
    // generated Turkish sector landings (scripts/build-sector-landings.js) too.
    expect(offenders.filter(f => !/^src\/(turkce-sql-ogren|datalemur-karsilastirma)\.html$/.test(f))).toEqual([]);
  });
});
