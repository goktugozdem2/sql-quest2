// One brand mark everywhere (founder, 2026-09-14): a solid #7c3aed square with
// the line lightning bolt. Before this, pages carried four marks — the
// homepage's line bolt, a purple→pink gradient square with an emoji ⚡, a bare
// emoji, and text only — plus a 🎯 on the app's sign-in card.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BOLT = 'M13 2 3 14h9l-1 8 10-12h-9l1-8z';
const list = dir => fs.readdirSync(path.join(ROOT, dir)).filter(f => /\.(html|mjs|js)$/.test(f)).map(f => path.join(dir, f));
const sources = [...list('src'), ...list('src/blog'), ...list('src/challenges'), ...list('scripts')];

describe('brand mark', () => {
  it('no emoji-in-a-gradient-square logo is left in any page source or generator', () => {
    const bad = sources.filter(f => /justify-content:center;font-size:\d+px;(?:color:#000;)?">(?:⚡|&#9889;)<\/div>/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    expect(bad).toEqual([]);
  });

  it('every generated page nav and the app use the line bolt', () => {
    for (const f of ['scripts/build-question-pages.mjs', 'scripts/build-sql-tools.mjs', 'scripts/build-alternatives-pages.mjs', 'scripts/build-readiness-test.mjs', 'scripts/build-topic-extra.mjs']) {
      expect(fs.readFileSync(path.join(ROOT, f), 'utf8'), f).toContain(BOLT);
    }
    const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
    expect(app.split(BOLT).length - 1).toBeGreaterThanOrEqual(2);
    expect(app).not.toMatch(/from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl">\s*🎯/);
    expect(fs.readFileSync(path.join(ROOT, 'public/favicon.svg'), 'utf8')).not.toMatch(/linearGradient/);
  });

  it('the homepage footer stays short: four groups, no duplicate links', () => {
    const home = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
    const footer = home.slice(home.indexOf('<footer class="ft">'), home.indexOf('</footer>', home.indexOf('<footer class="ft">')));
    expect((footer.match(/<h3>/g) || []).length).toBe(4);
    const hrefs = [...footer.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    expect(hrefs.length).toBeLessThanOrEqual(32);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
