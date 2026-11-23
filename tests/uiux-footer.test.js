// The footer, on a phone and in contrast (A4 UI/UX audit, 2026-11-22).
// Baseline, every marketing page, 6 viewports × 2 themes:
// - the Datrick line inherited the footer text at opacity .55 — on the slate
//   footers (blog posts, question pages) that is 2.50:1 (U6, 55 pages);
// - `.flk a` links were 17 px tall on a phone (U3, 60 pages);
// - the © line was 11 px (U4, 70 pages; DESIGN.md's smallest size is 12).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { withPartnerLink, PARTNER_LINE, FOOTER_FIT_STYLE, FOOTER_MUTED } from '../scripts/footer-partner-link.mjs';

// WCAG 2 contrast, inline so this guard stands without the audit harness.
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const ROOT = path.resolve(import.meta.dirname, '..');

describe('the Datrick line passes AA on every footer', () => {
  it('takes --text-muted at full opacity: ≥ 4.5:1 on the darkest and the lightest page backgrounds used', () => {
    expect(PARTNER_LINE).toContain(`color:${FOOTER_MUTED}`);
    expect(PARTNER_LINE).not.toMatch(/opacity/);
    for (const bg of ['#06060f', '#0E0F13']) expect(contrast(FOOTER_MUTED, bg)).toBeGreaterThan(4.5);
  });
  it('replaces an older line in a page built before it', () => {
    const old = '<footer><p data-partner="datrick" style="opacity:.55">x</p></footer>';
    const out = withPartnerLink(old);
    expect(out).toContain(PARTNER_LINE);
    expect(out).not.toContain('opacity:.55');
    expect(withPartnerLink(out)).toBe(out);
  });
});

describe('footer links are 44 px tap targets on a phone', () => {
  it('the injected rule gives .flk a and .fnav a a 44 px box under 600 px', () => {
    expect(FOOTER_FIT_STYLE).toMatch(/@media\(max-width:600px\)/);
    expect(FOOTER_FIT_STYLE).toMatch(/\.flk a\{[^}]*min-height:44px[^}]*min-width:44px/);
    expect(FOOTER_FIT_STYLE).toMatch(/\.fnav a\{[^}]*min-height:44px/);
  });
  it('a built company page carries it', () => {
    const built = fs.readFileSync(path.join(ROOT, 'public/wise-sql-interview/index.html'), 'utf8');
    expect(built).toContain(FOOTER_FIT_STYLE + PARTNER_LINE);
  });
});

describe('no footer text under 12 px in a source page or generator', () => {
  const files = [];
  const walk = (d, re) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, re); else if (re.test(e.name)) files.push(p); } };
  walk(path.join(ROOT, 'src'), /\.html$/);
  walk(path.join(ROOT, 'scripts'), /\.(mjs|js)$/);
  it('scans the pages', () => expect(files.length).toBeGreaterThan(80));
  it('every <footer> block states 12 px or more', () => {
    const bad = [];
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      for (const m of text.matchAll(/<footer[\s\S]*?<\/footer>/g)) {
        if (/font-size:\s*(?:[0-9]|1[01])px/.test(m[0])) bad.push(path.relative(ROOT, f));
      }
    }
    expect(bad).toEqual([]);
  });
  it('the homepage sitemap footer headings are 12 px', () => {
    expect(fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8')).toContain('.fnav h3{font-size:12px');
  });
});
