// The prune list (SEO plan P4.25): a listed path is noindexed and leaves the
// sitemap; nothing else changes.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readPrune, noindexHtml, dropFromSitemap } from '../scripts/apply-seo-prune.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('seo prune', () => {
  it('rewrites an existing robots meta, or adds one', () => {
    expect(noindexHtml('<head><meta name="robots" content="index, follow"></head>')).toContain('content="noindex, follow"');
    expect(noindexHtml('<html><head><title>x</title></head>')).toMatch(/<head>\n {2}<meta name="robots" content="noindex, follow">/);
  });

  it('drops exactly the listed URLs from a sitemap', () => {
    const xml = '<urlset>\n  <url>\n    <loc>https://sqlquest.app/a/</loc>\n  </url>\n  <url>\n    <loc>https://sqlquest.app/ab/</loc>\n  </url>\n</urlset>';
    const out = dropFromSitemap(xml, ['/a/']);
    expect(out).not.toContain('sqlquest.app/a/<');
    expect(out).toContain('sqlquest.app/ab/');
  });

  it('every pruned path is built, noindexed, out of the sitemap, and has a dated note', () => {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/seo-prune.json'), 'utf8'));
    const xml = fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8');
    for (const p of readPrune(ROOT).noindex) {
      const f = path.join(ROOT, 'public', p, 'index.html');
      expect(fs.existsSync(f), p).toBe(true);
      expect(fs.readFileSync(f, 'utf8')).toContain('content="noindex, follow"');
      expect(xml).not.toContain(`<loc>https://sqlquest.app${p}</loc>`);
      expect(String((raw.notes || {})[p] || (raw.notes || {})[p.replace(/\/$/, '')] || ''), `${p} needs a note with the read date`).toMatch(/20\d\d-\d\d-\d\d/);
    }
  });
});
