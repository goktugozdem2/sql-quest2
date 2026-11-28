// The "when the other site is better" bullets fit a 320 px phone (A4 UI/UX
// audit, issue #308, run 2026-11-25 16:25, U1 + U2 on the Galaxy S9+ row).
//
// The six vs- pages share `.hon-li`, a <p> set `display:flex; gap:10px` so
// its "•" ::before sat beside the text. A flex container turns every run of
// text, every <strong> and every <a> inside it into its own flex item, and
// no item shrinks below its min-content. /vs-datalemur/'s "Both if you want
// maximum coverage … the five-way comparison covers …" bullet laid those
// items in one row 310 px wide in a 218 px box: the page ran 42 px
// sideways, and the fixed nav stretched with it until "Start Free →" sat
// off screen (the U2 on `#nav a.btn.bp`). The bullet is now a block with
// the dot positioned in its left padding, so the text wraps as text.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const pagesWithBullets = fs.readdirSync(path.join(ROOT, 'src'))
  .filter(f => f.endsWith('.html'))
  .filter(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').includes('.hon-li{'));

const rule = (html, sel) => html.match(new RegExp(sel.replace(/[.:]/g, m => '\\' + m) + '\\{([^}]*)\\}'))?.[1] || '';

describe('the vs- page bullets wrap as text on a 320 px phone', () => {
  it('finds the vs- pages that carry the bullet', () => {
    expect(pagesWithBullets).toContain('vs-datalemur.html');
    expect(pagesWithBullets.length).toBeGreaterThanOrEqual(6);
  });

  for (const f of pagesWithBullets) {
    it(`${f}: .hon-li is not a flex row (each text run would be an unshrinkable item)`, () => {
      const html = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
      const li = rule(html, '.hon-li');
      expect(li).not.toMatch(/display:\s*(inline-)?flex/);
      expect(li).toMatch(/position:\s*relative/);
      expect(rule(html, '.hon-li::before')).toMatch(/position:\s*absolute/);
    });

    it(`${f}: the built page carries the same rule`, () => {
      const slug = f.replace(/\.html$/, '');
      const built = fs.readFileSync(path.join(ROOT, 'public', slug, 'index.html'), 'utf8');
      expect(rule(built, '.hon-li')).not.toMatch(/display:\s*(inline-)?flex/);
    });
  }
});
