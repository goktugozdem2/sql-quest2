// Technical SEO audit over the BUILT site (public/), 2026-09-13.
//
// Why this exists: the Search Console page-indexing report (read 2026-09-13,
// data as of 2026-09-04) listed eight 404s that were all our own links —
// relative hrefs like `app.html` and `terms.html` written on pages that are
// published at /<slug>/, so the browser resolves them to /<slug>/app.html —
// plus redirecting URLs inside the sitemap (/privacy.html, /refund.html) and a
// duplicate /terms.html indexed beside /terms/. None of that is visible from
// src/; it only exists once the page is served from a directory. So the audit
// runs on public/, exactly as Vercel serves it (cleanUrls + trailingSlash).
//
// Usage:  node scripts/seo-audit.mjs            → report, exit 1 on errors
//         node scripts/seo-audit.mjs --json     → machine-readable
// Guard:  tests/seo-audit.test.js runs the same checks.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const SITE = 'https://sqlquest.app';

// Pages that are deliberately not for the index. The app shell is noindex by
// design (every deep link is the same document); the affiliate page is a
// partner-only landing.
export const NOINDEX_OK = new Set(['/app/', '/affiliate/']);
// Pages built only as public/<slug>.html and served at /<slug>/ by cleanUrls.
const FLAT_PAGES = ['privacy', 'terms', 'refund'];
// Weekly archive permalinks are real pages but deliberately not in the sitemap.
const SITEMAP_OPTIONAL = p => /^\/weekly\/\d{4}-W\d{2}\/$/.test(p);

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (f === 'index.html') out.push(p);
  }
  return out;
}

// The public URL of a built file: public/x/index.html → /x/, public/index.html → /
const urlOf = file => {
  if (!file.endsWith('index.html')) return `/${path.basename(file, '.html')}/`;
  const rel = path.relative(PUB, path.dirname(file)).split(path.sep).join('/');
  return rel ? `/${rel}/` : '/';
};

// Does a same-site path resolve to a served document under cleanUrls +
// trailingSlash? Returns 'ok' | 'redirect' | 'missing'.
export function resolvePath(p) {
  const clean = p.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return 'ok';
  const decoded = decodeURIComponent(clean);
  const asFile = path.join(PUB, decoded);
  // Static assets (js, css, images, txt, xml, svg, json) served as-is.
  if (/\.[a-z0-9]{2,5}$/i.test(decoded) && !/\.html$/i.test(decoded)) {
    return fs.existsSync(asFile) ? 'ok' : 'missing';
  }
  if (/\.html$/i.test(decoded)) {
    // cleanUrls: /x.html 308s to /x/ when either form exists.
    const base = decoded.replace(/\.html$/i, '');
    return fs.existsSync(path.join(PUB, base, 'index.html')) || fs.existsSync(path.join(PUB, `${base}.html`)) ? 'redirect' : 'missing';
  }
  const dirIndex = path.join(PUB, decoded, 'index.html');
  // cleanUrls also serves /x/ from public/x.html (the legal pages live only there).
  const flat = path.join(PUB, `${decoded.replace(/\/$/, '')}.html`);
  if (decoded.endsWith('/')) return fs.existsSync(dirIndex) || fs.existsSync(flat) ? 'ok' : 'missing';
  // No trailing slash: trailingSlash 308s to /x/.
  return fs.existsSync(dirIndex) || fs.existsSync(path.join(PUB, `${decoded}.html`)) ? 'redirect' : 'missing';
}

// vercel.json redirects that make an otherwise-missing path valid.
function vercelRedirects() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    return (cfg.redirects || []).filter(r => !r.has).map(r => r.source);
  } catch { return []; }
}
const redirectMatches = (p, sources) => sources.some(src => {
  const re = new RegExp('^' + src.replace(/:[a-z]+\*/gi, '.*').replace(/:[a-z]+/gi, '[^/]+') + '$');
  return re.test(p);
});

export function audit() {
  const files = walk(PUB).concat(FLAT_PAGES.map(f => path.join(PUB, `${f}.html`)).filter(f => fs.existsSync(f)));
  const redirects = vercelRedirects();
  const errors = [];
  const warnings = [];
  const pages = [];
  const titles = new Map();

  const sitemapXml = fs.readFileSync(path.join(PUB, 'sitemap.xml'), 'utf8');
  const sitemap = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(SITE, '') || '/');
  const sitemapSet = new Set(sitemap);

  for (const file of files) {
    const url = urlOf(file);
    const html = fs.readFileSync(file, 'utf8');
    const head = html.slice(0, html.indexOf('</head>') > 0 ? html.indexOf('</head>') : 20000);
    const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(head);
    const canonical = (head.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || head.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i) || [])[1] || null;
    const title = (head.match(/<title>([^<]*)<\/title>/i) || [])[1] || null;
    const description = (head.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || null;
    const h1s = (html.match(/<h1[\s>]/gi) || []).length;
    pages.push({ url, noindex, canonical, title, h1s, inSitemap: sitemapSet.has(url) });

    const isArchive = SITEMAP_OPTIONAL(url);
    if (!noindex && !NOINDEX_OK.has(url)) {
      if (!canonical) errors.push({ url, rule: 'canonical-missing' });
      else if (canonical !== `${SITE}${url}`) errors.push({ url, rule: 'canonical-mismatch', detail: canonical });
      if (!title) errors.push({ url, rule: 'title-missing' });
      if (!description) warnings.push({ url, rule: 'description-missing' });
      if (h1s !== 1) warnings.push({ url, rule: 'h1-count', detail: h1s });
      if (!sitemapSet.has(url) && !isArchive) errors.push({ url, rule: 'indexable-not-in-sitemap' });
      if (title) {
        if (!titles.has(title)) titles.set(title, []);
        titles.get(title).push(url);
      }
    }
    if (noindex && sitemapSet.has(url)) errors.push({ url, rule: 'noindex-in-sitemap' });
    if (noindex && !NOINDEX_OK.has(url) && !isArchive) warnings.push({ url, rule: 'unexpected-noindex' });

    // Internal links, resolved the way a browser resolves them from this URL.
    const hrefs = [...html.matchAll(/<a\b[^>]*\shref=["']([^"'#][^"']*)["']/gi)].map(m => m[1]);
    for (const href of hrefs) {
      if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
      let abs;
      try { abs = new URL(href, `${SITE}${url}`); } catch { errors.push({ url, rule: 'link-unparseable', detail: href }); continue; }
      if (abs.origin !== SITE) continue;
      const p = abs.pathname;
      if (p.startsWith('/api/') || p.startsWith('/functions/')) continue;
      const res = resolvePath(p);
      if (res === 'missing' && !redirectMatches(p, redirects)) {
        errors.push({ url, rule: 'link-404', detail: href });
      } else if (res === 'redirect' && !/^\/app(\.html)?$/.test(p)) {
        warnings.push({ url, rule: 'link-redirects', detail: href });
      }
    }
  }

  for (const loc of sitemap) {
    const res = resolvePath(loc);
    if (res !== 'ok') errors.push({ url: loc, rule: res === 'redirect' ? 'sitemap-redirect' : 'sitemap-404' });
  }
  for (const [title, urls] of titles) {
    if (urls.length > 1) errors.push({ url: urls.join(' , '), rule: 'duplicate-title', detail: title });
  }

  return { pages, errors, warnings, sitemapCount: sitemap.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = audit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    const group = list => Object.entries(list.reduce((a, e) => ((a[e.rule] = a[e.rule] || []).push(e), a), {}));
    console.log(`[seo-audit] ${r.pages.length} built pages · ${r.sitemapCount} sitemap URLs · ${r.errors.length} errors · ${r.warnings.length} warnings`);
    for (const [rule, items] of group(r.errors)) {
      console.log(`\nERROR ${rule} (${items.length})`);
      for (const e of items.slice(0, 25)) console.log(`  ${e.url}${e.detail !== undefined ? '  →  ' + e.detail : ''}`);
    }
    for (const [rule, items] of group(r.warnings)) {
      console.log(`\nwarn  ${rule} (${items.length})`);
      for (const e of items.slice(0, 8)) console.log(`  ${e.url}${e.detail !== undefined ? '  →  ' + e.detail : ''}`);
    }
    process.exit(r.errors.length ? 1 : 0);
  }
}
