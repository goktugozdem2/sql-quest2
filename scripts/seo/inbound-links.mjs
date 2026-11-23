/**
 * Inbound internal links per sitemap URL, from the built site (2026-11-22).
 *
 * A sitemap entry is discovery, not a crawl signal (CLAUDE.md, "Search-engine
 * indexing"): on a domain with this little authority a page nobody links to
 * does not get crawled. This counts, for every URL in public/sitemap.xml, the
 * DISTINCT built pages that link to it, with the site-wide chrome removed
 * first: <nav>, <footer> and the mega-menu link strips repeat on every page
 * and say nothing about the page they point at.
 *
 *   node scripts/seo/inbound-links.mjs            # table, fewest first
 *   node scripts/seo/inbound-links.mjs --json     # machine-readable
 *
 * Pure half exported for tests/internal-links.test.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = path.join(ROOT, 'public');
const ORIGIN = 'https://sqlquest.app';

export function sitemapPaths(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim().replace(ORIGIN, '') || '/');
}

// The chrome every page repeats: the nav bar, the footer, and the footer-style
// link strips (class "flk"). What is left is the page's own content.
export function stripChrome(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b(?![^>]*application\/ld\+json)[\s\S]*?<\/script>/gi, ' ')
    .replace(/<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<div class="flk">[\s\S]*?<\/div>/gi, ' ');
}

// Every internal href on a page, normalised to the sitemap's form: path only,
// trailing slash, no query or hash. /app/ links are left out (noindex).
export function internalTargets(html) {
  const out = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    let href = (m[2] ?? m[3] ?? '').trim();
    if (!href || href.startsWith('#') || /^(?:mailto|tel|javascript):/i.test(href)) continue;
    if (/^https?:\/\//i.test(href)) {
      if (!href.startsWith(ORIGIN)) continue;
      href = href.slice(ORIGIN.length) || '/';
    }
    if (!href.startsWith('/')) continue;
    href = href.replace(/[?#].*$/, '');
    if (href.endsWith('.html')) href = href.replace(/(?:index)?\.html$/, '');
    if (!href.endsWith('/')) href += '/';
    href = href.replace(/\/{2,}/g, '/');
    if (href.startsWith('/app/')) continue;
    out.add(href);
  }
  return out;
}

// The file a sitemap path is served from.
export function fileFor(p) {
  const rel = p === '/' ? 'index.html' : path.join(p.replace(/^\//, ''), 'index.html');
  const f = path.join(PUBLIC, rel);
  if (fs.existsSync(f)) return f;
  const flat = path.join(PUBLIC, `${p.replace(/^\/|\/$/g, '')}.html`);
  return fs.existsSync(flat) ? flat : null;
}

/** Map of sitemap path → sorted array of distinct linking sitemap paths. */
export function inboundLinks({ publicDir = PUBLIC } = {}) {
  const paths = sitemapPaths(fs.readFileSync(path.join(publicDir, 'sitemap.xml'), 'utf8'));
  const set = new Set(paths);
  const inbound = new Map(paths.map(p => [p, new Set()]));
  for (const from of paths) {
    const f = fileFor(from);
    if (!f) continue;
    for (const to of internalTargets(stripChrome(fs.readFileSync(f, 'utf8')))) {
      if (to !== from && set.has(to)) inbound.get(to).add(from);
    }
  }
  return new Map([...inbound].map(([k, v]) => [k, [...v].sort()]));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const all = inboundLinks();
  const rows = [...all].map(([p, from]) => ({ path: p, n: from.length, from }))
    .sort((a, b) => a.n - b.n || a.path.localeCompare(b.path));
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    const nonQ = rows.filter(r => !r.path.startsWith('/questions/'));
    console.log(`${rows.length} sitemap URLs (${nonQ.length} outside /questions/)`);
    for (const r of nonQ) console.log(`${String(r.n).padStart(4)}  ${r.path}`);
    const q = rows.filter(r => r.path.startsWith('/questions/'));
    console.log(`/questions/: ${q.length} pages, min ${Math.min(...q.map(r => r.n))}, ${q.filter(r => r.n < 2).length} with fewer than 2`);
  }
}
