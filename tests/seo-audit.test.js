import { describe, it, expect } from 'vitest';
import { audit, resolvePath } from '../scripts/seo-audit.mjs';

// The technical SEO guard over the built site (public/). Written 2026-09-13
// after the Search Console page-indexing report listed eight 404s that were
// our own relative links, redirecting URLs inside the sitemap and a duplicate
// /terms.html beside /terms/. Every rule here is one Google already flagged.
describe('technical SEO over public/', () => {
  const r = audit();
  const show = list => list.map(e => `  ${e.rule}: ${e.url}${e.detail !== undefined ? ' → ' + e.detail : ''}`).join('\n');

  it('no internal link resolves to a 404 from the page it sits on', () => {
    const bad = r.errors.filter(e => e.rule === 'link-404');
    expect(bad, show(bad)).toEqual([]);
  });

  it('every sitemap URL is served directly — no redirects, no 404s, nothing noindexed', () => {
    const bad = r.errors.filter(e => /^sitemap-|noindex-in-sitemap/.test(e.rule));
    expect(bad, show(bad)).toEqual([]);
  });

  it('every indexable page has a self-referencing canonical, a title, and is in the sitemap', () => {
    const bad = r.errors.filter(e => /^canonical-|title-missing|indexable-not-in-sitemap/.test(e.rule));
    expect(bad, show(bad)).toEqual([]);
  });

  it('no two indexable pages share a <title>', () => {
    const bad = r.errors.filter(e => e.rule === 'duplicate-title');
    expect(bad, show(bad)).toEqual([]);
  });

  it('internal links use the served form (/privacy/, not /privacy.html)', () => {
    const bad = r.warnings.filter(e => e.rule === 'link-redirects');
    expect(bad, show(bad)).toEqual([]);
  });

  it('the resolver matches Vercel cleanUrls + trailingSlash', () => {
    expect(resolvePath('/sql-exercises/')).toBe('ok');
    expect(resolvePath('/sql-exercises')).toBe('redirect');
    expect(resolvePath('/privacy/')).toBe('ok');
    expect(resolvePath('/privacy.html')).toBe('redirect');
    expect(resolvePath('/definitely-not-a-page/')).toBe('missing');
  });
});
