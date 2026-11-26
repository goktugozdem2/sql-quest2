// Lighthouse accessibility on the marketing pages (A4, 2026-11-25).
// The unlighthouse scan of 161 pages and Lighthouse CI (#325) failed on:
// - link-in-text-block (92 pages): the purple link is 1.03:1 against the grey
//   text around it, so colour was the only cue;
// - landmark-one-main (55 pages): no <main>;
// - color-contrast (25 pages): the sourced-format note at #5b6577 (3.43:1),
//   the legal pages' grey (#64748b, #475569), links with no colour of their
//   own (the browser's #0000ee, ~2.1:1 on the near-black);
// - CLS 0.156 on /questions/: the font files started late, with no
//   preconnect to fonts.gstatic.com.
// /challenges/window-functions/ and /sql-exercises/ sat on the CI's a11y
// floor of 90; both read 100 after this.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { withPartnerLink, LINK_CUE_STYLE } from '../scripts/footer-partner-link.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const read = rel => fs.readFileSync(path.join(PUB, rel), 'utf8');

// Every built marketing page: public/**/index.html plus the three hand-kept
// legal pages. /app is the product; /weekly/ is date-stamped and committed
// only by its own build.
function builtPages() {
  const out = [];
  const walk = (dir, rel = '') => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const r = rel ? `${rel}/${d.name}` : d.name;
      if (d.isDirectory()) walk(path.join(dir, d.name), r);
      else if (d.name === 'index.html') out.push(r);
    }
  };
  walk(PUB);
  return out.filter(r => !/^(app|weekly)\//.test(r)).concat(['privacy.html', 'refund.html', 'terms.html']);
}

describe('links in running text carry a non-colour cue', () => {
  it('the injected rule underlines unclassed links in p/li/td and bare footer links, never nav or header', () => {
    expect(LINK_CUE_STYLE).toMatch(/:is\(p,li,dd,td,blockquote,figcaption\)>a:not\(\[class\]\):not\(nav \*\):not\(header \*\)/);
    expect(LINK_CUE_STYLE).toMatch(/footer\.ft>a:not\(\[class\]\)/);
    expect(LINK_CUE_STYLE).toMatch(/\{text-decoration:underline;/);
    expect(LINK_CUE_STYLE).not.toMatch(/color:/); // no colour enters the palette
  });
  it('rides with the footer line, once, and an older page gains it on the next build', () => {
    const page = '<html><head><title>x</title></head><body><p>x <a href="/a/">a</a></p><footer class="ft"><a href="/b/">b</a></footer></body></html>';
    const once = withPartnerLink(page);
    expect(once.split('data-link-cue').length - 1).toBe(1);
    // in <head>, never under <footer> (html-validate: a <style> there is not permitted content)
    expect(once.indexOf(LINK_CUE_STYLE)).toBeLessThan(once.indexOf('</head>'));
    expect(withPartnerLink(once)).toBe(once);
    const older = once.replace(LINK_CUE_STYLE, '');
    expect(withPartnerLink(older)).toBe(once);
  });
  it('every built page with a footer carries it (template pages named)', () => {
    for (const rel of ['challenges/window-functions/index.html', 'sql-exercises/index.html', 'questions/group-by-having/index.html',
      'sql-not-in-null/index.html', 'blog/is-null-vs-equals-null/index.html', 'doordash-sql-interview/index.html']) {
      expect(read(rel), rel).toContain(LINK_CUE_STYLE);
    }
    const missing = builtPages().filter(r => r.endsWith('index.html')).filter(r => { const h = read(r); return h.includes('</footer>') && !h.includes('data-link-cue'); });
    expect(missing).toEqual([]);
  });
});

describe('every marketing page has one <main> landmark', () => {
  it('no built page lacks it, and none has two', () => {
    const bad = builtPages().map(r => [r, (read(r).match(/<main[\s>]/g) || []).length]).filter(([, n]) => n !== 1);
    expect(bad).toEqual([]);
  });
  it('the generators that write pages without a source file emit it', () => {
    for (const g of ['build-company-pages.mjs', 'build-topic-extra.mjs']) {
      const s = fs.readFileSync(path.join(ROOT, 'scripts', g), 'utf8');
      expect(s, g).toMatch(/<\/nav>\n<main>\n/);
      expect(s, g).toMatch(/\n<\/main>\n<footer class="ft">/);
    }
  });
});

describe('text contrast on the pages that failed', () => {
  it('the sourced-format note is not the 3.43:1 grey', () => {
    const s = fs.readFileSync(path.join(ROOT, 'scripts/build-company-pages.mjs'), 'utf8');
    expect(s).not.toMatch(/#5b6577/i);
    expect(read('doordash-sql-interview/index.html')).not.toMatch(/#5b6577/i);
  });
  it('the legal pages use --text-muted for the date and footer lines', () => {
    for (const f of ['privacy.html', 'refund.html', 'terms.html']) {
      const h = read(f);
      expect(h, f).not.toMatch(/#64748b|#475569/i);
      expect(h, f).toMatch(/\.updated\{[^}]*color:#8A8E99/);
    }
  });
  it('the debug-hub link never paints the browser default blue', () => {
    const h = read('sql-exercises/index.html');
    const a = h.match(/<a [^>]*data-track="cta_exercises_debug_hub"[^>]*>/);
    expect(a && a[0]).toMatch(/style="color:inherit;text-decoration:underline;"/);
  });
});

describe('question pages start the font files early (CLS)', () => {
  it('preconnects to fonts.gstatic.com', () => {
    expect(read('questions/below-department-average/index.html')).toMatch(/<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/);
  });
});
