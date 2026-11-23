// Internal links — no sitemap page is an orphan (C1, 2026-11-22).
//
// CLAUDE.md, "Search-engine indexing": a sitemap entry is discovery, not a
// crawl signal. The four fintech pages of 2026-07-16 sat unindexed on both
// engines with a healthy sitemap because nothing linked to them. This test
// reads the BUILT site (public/), removes the chrome every page repeats
// (<nav>, <footer>, the footer link strips) and counts, for every sitemap URL
// outside /questions/, the distinct pages that link to it in their content.
// Fewer than two fails. The 2026-11-22 count, before scripts/build-related-
// links.mjs: /weekly/ 0, /datalemur-karsilastirma/ 0, /stratascratch-
// alternatives/ 2 (docs/reads/internal-links-2026-11-22.md).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inboundLinks, internalTargets, stripChrome, sitemapPaths } from '../scripts/seo/inbound-links.mjs';
import { RELATED, START, END, block } from '../scripts/build-related-links.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

export const MIN_INBOUND = 2;
// The legal pages are linked from every page's footer and from nowhere in
// content, on purpose. They are exempt here and pinned to the homepage footer
// below instead.
const FOOTER_ONLY = ['/privacy/', '/terms/', '/refund/'];

const inbound = inboundLinks();
const sitemap = sitemapPaths(read('public', 'sitemap.xml'));

describe('the counter', () => {
  it('strips nav, footer and the footer link strip, keeps content links', () => {
    const html = '<nav><a href="/a/">a</a></nav><main><a href="/b/">b</a> <a href="/c?x=1#y">c</a> <a href="https://sqlquest.app/d.html">d</a> <a href="/app/?src=x">app</a> <a href="https://other.com/e/">e</a></main><div class="flk"><a href="/f/">f</a></div><footer><a href="/g/">g</a></footer>';
    expect([...internalTargets(stripChrome(html))].sort()).toEqual(['/b/', '/c/', '/d/']);
  });
});

describe('every sitemap page outside /questions/ has internal links', () => {
  it(`at least ${MIN_INBOUND} distinct linking pages, chrome excluded`, () => {
    const thin = sitemap
      .filter(p => !p.startsWith('/questions/') && !FOOTER_ONLY.includes(p))
      .map(p => [p, (inbound.get(p) || []).length])
      .filter(([, n]) => n < MIN_INBOUND)
      .map(([p, n]) => `${p} — ${n} linking page${n === 1 ? '' : 's'}`);
    expect(thin).toEqual([]);
  });

  it('the footer-only legal pages are in the homepage footer', () => {
    const footer = /<footer[\s\S]*?<\/footer>/.exec(read('src', 'index.html'))[0];
    for (const p of FOOTER_ONLY) expect(footer, p).toContain(`href="${p}"`);
  });
});

describe('the related-links registry (scripts/build-related-links.mjs)', () => {
  it('every target is a sitemap page, never the source itself', () => {
    const set = new Set(sitemap);
    for (const [rel, { links }] of Object.entries(RELATED)) {
      const self = `/${rel.replace(/(?:index)?\.html$/, '').replace(/\/$/, '')}/`.replace('//', '/');
      for (const [href] of links) {
        expect(set.has(href), `${rel} → ${href} is not in the sitemap`).toBe(true);
        expect(href, `${rel} links to itself`).not.toBe(self);
      }
    }
  });

  it('every source page carries exactly the block the registry renders', () => {
    for (const [rel, entry] of Object.entries(RELATED)) {
      const html = read('src', rel);
      const a = html.indexOf(START);
      const b = html.indexOf(END);
      expect(a, `${rel} has no related-links block — run npm run build`).toBeGreaterThanOrEqual(0);
      expect(html.slice(a, b + END.length), rel).toBe(block(entry));
      expect(html.indexOf(START, a + 1), `${rel} has two blocks`).toBe(-1);
    }
  });
});
