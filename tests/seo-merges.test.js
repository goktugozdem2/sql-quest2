// SEO merges (plan P4.25 "Merge" row; prune read docs/reads/prune-2026-11-25.md).
// A merged page is a permanent vercel.json redirect to the stronger page that
// serves the same intent. For each one: the redirect is there and permanent,
// the source has left the sitemap, the target is an indexable sitemap page,
// and no built page links to the source any more (a link to a redirect wastes
// a crawl and leaks the old URL back into the index).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readPrune } from '../scripts/apply-seo-prune.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');

export const MERGES = [
  // 2026-11-25: 0 clicks ever (205 impressions since 2026-05-27); its top query
  // ("sqlquest") is also /learn-sql/'s, which has 21 clicks in 90 days.
  { from: '/learn-sql-for-beginners/', to: '/learn-sql/' },
  // 2026-11-25: 0 clicks ever (99 impressions since 2026-08-04); the CTE tutorial
  // covers the same definition and has 9 clicks in 90 days.
  { from: '/blog/what-is-a-cte-in-sql/', to: '/blog/sql-cte-tutorial/' },
];

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const sitemap = fs.readFileSync(path.join(PUB, 'sitemap.xml'), 'utf8');
const loc = p => `<loc>https://sqlquest.app${p}</loc>`;

function builtPages(dir = PUB, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/^(weekly|app)$/.test(e.name) && dir === PUB) continue;
      builtPages(f, out);
    } else if (e.name.endsWith('.html')) out.push(f);
  }
  return out;
}
const pages = builtPages();
const pagePath = f => '/' + path.relative(PUB, f).replace(/index\.html$/, '').replace(/\.html$/, '/');

describe.each(MERGES)('merge $from → $to', ({ from, to }) => {
  it('is a permanent redirect in vercel.json', () => {
    const r = (vercel.redirects || []).find(x => x.source === from && !x.has);
    expect(r, `${from} needs a redirect`).toBeTruthy();
    expect(r.destination).toBe(to);
    expect(r.permanent).toBe(true);
  });

  it('the source has left the sitemap and the target is an indexable sitemap page', () => {
    expect(sitemap).not.toContain(loc(from));
    expect(sitemap).toContain(loc(to));
    expect(readPrune(ROOT).noindex).not.toContain(to);
    expect((vercel.redirects || []).some(x => x.source === to)).toBe(false);
  });

  it('no built page links to the source', () => {
    const linking = pages
      .filter(f => pagePath(f) !== from)
      .filter(f => fs.readFileSync(f, 'utf8').includes(`href="${from}"`) || fs.readFileSync(f, 'utf8').includes(`href="https://sqlquest.app${from}"`))
      .map(pagePath);
    expect(linking, `pages still linking to ${from}`).toEqual([]);
  });
});
