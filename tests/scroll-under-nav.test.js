// A page with a fixed top nav must not scroll a target under it.
//
// 2026-11-28 (#308, the one critical): on /paypal-sql-interview/ (Pixel 7)
// the hero CTA "a.btn.bp" was "covered by #nav". Two causes, on every static
// page that shares the nav:
//   1. no `scroll-padding-top`, so scrollIntoView({block:'start'}) and every
//      in-page anchor (#format, #faq, …) land the target under the 73 px
//      fixed nav;
//   2. `html{scroll-behavior:smooth}` with no reduced-motion guard, so a
//      person who asked for reduced motion still got the animation, and the
//      audit (which runs with reducedMotion:'reduce') probed the CTA mid-
//      scroll.
// Rule: a page whose `.nav` is position:fixed carries
// `html{scroll-padding-top:80px}` and smooth scrolling only inside
// `@media (prefers-reduced-motion:no-preference)`. The two generators that
// write the same <style> head carry it too.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'src');

function htmlFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['data', 'utils', 'components', 'pg-mode'].includes(e.name)) continue;
      out.push(...htmlFiles(p));
    } else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const FIXED_NAV = /\.nav\{[^}]*position:fixed/;
const PAD = /html\{scroll-padding-top:(\d+)px\}/;
const GUARDED = '@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}';

function smoothOutsideGuard(css) {
  // every `scroll-behavior:smooth` must sit inside the guarded block
  const all = css.split('scroll-behavior:smooth').length - 1;
  const guarded = css.split(GUARDED).length - 1;
  return all - guarded;
}

const pages = htmlFiles(SRC).filter(f => FIXED_NAV.test(fs.readFileSync(f, 'utf8')));

describe('a fixed nav never covers a scrolled-to target', () => {
  it('finds the pages that carry the fixed nav (the set is not empty)', () => {
    expect(pages.length).toBeGreaterThan(80);
    expect(pages.map(p => path.relative(SRC, p))).toContain('paypal-sql-interview.html');
  });

  it('every such page pads the scroll by at least the nav height', () => {
    const bad = pages.filter(f => {
      const m = fs.readFileSync(f, 'utf8').match(PAD);
      return !m || Number(m[1]) < 74;
    }).map(f => path.relative(SRC, f));
    expect(bad).toEqual([]);
  });

  it('every such page animates scrolling only for people who did not ask for reduced motion', () => {
    const bad = pages.filter(f => smoothOutsideGuard(fs.readFileSync(f, 'utf8')) !== 0)
      .map(f => path.relative(SRC, f));
    expect(bad).toEqual([]);
  });

  it('the two generators that write this <style> head carry the same rule', () => {
    for (const g of ['scripts/build-company-pages.mjs', 'scripts/build-sector-landings.js']) {
      const s = fs.readFileSync(path.join(ROOT, g), 'utf8');
      expect(s, g).toMatch(PAD);
      expect(smoothOutsideGuard(s), g).toBe(0);
    }
  });

  it('the built PayPal page (the #308 critical) ships it', () => {
    const built = path.join(ROOT, 'public/paypal-sql-interview/index.html');
    const s = fs.readFileSync(built, 'utf8');
    expect(s).toMatch(PAD);
    expect(smoothOutsideGuard(s)).toBe(0);
  });
});
