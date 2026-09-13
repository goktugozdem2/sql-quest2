#!/usr/bin/env node
/**
 * Apply src/data/seo-prune.json to the built site (SEO plan P4.25).
 *
 * For every path under `noindex` (e.g. "/questions/some-slug/"): the built
 * page's robots meta becomes "noindex, follow" (links on it still pass), and
 * its <url> block is removed from public/sitemap.xml. Runs last in
 * `npm run build`, after every generator has rewritten its pages and sitemap
 * blocks, so the end state is the same on every build. Idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');

export function readPrune(root = ROOT) {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'src/data/seo-prune.json'), 'utf8'));
  const noindex = (raw.noindex || []).map(p => `/${String(p).replace(/^\/+|\/+$/g, '')}/`);
  return { noindex };
}

export function noindexHtml(html) {
  if (/<meta name="robots" content="[^"]*"\s*\/?>/i.test(html)) {
    return html.replace(/<meta name="robots" content="[^"]*"(\s*\/?)>/i, '<meta name="robots" content="noindex, follow"$1>');
  }
  return html.replace(/<head>/i, '<head>\n  <meta name="robots" content="noindex, follow">');
}

export function dropFromSitemap(xml, paths) {
  let out = xml;
  for (const p of paths) {
    const loc = `https://sqlquest.app${p}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`\\s*<url>\\s*<loc>${loc}</loc>[\\s\\S]*?</url>`, 'g'), '');
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { noindex } = readPrune();
  let pages = 0;
  for (const p of noindex) {
    for (const f of [path.join(PUB, p, 'index.html'), path.join(PUB, `${p.replace(/\/$/, '')}.html`)]) {
      if (!fs.existsSync(f)) continue;
      const before = fs.readFileSync(f, 'utf8');
      const after = noindexHtml(before);
      if (after !== before) { fs.writeFileSync(f, after); }
      pages++;
    }
  }
  const sm = path.join(PUB, 'sitemap.xml');
  const xml = fs.readFileSync(sm, 'utf8');
  const next = dropFromSitemap(xml, noindex);
  if (next !== xml) fs.writeFileSync(sm, next);
  console.log(`[seo-prune] ${noindex.length} path(s) noindexed (${pages} files), sitemap ${next === xml ? 'unchanged' : 'updated'}`);
}
