// Per-page Open Graph cards (2026-11-24, founder's go: "önerdiklerini kur ve
// kullan"). Until today every page on the site shared /og-image.png, so a
// company page, a trap page and a blog post all unfurled on LinkedIn / X /
// Slack as the same homepage card. A shared link should show the page it
// opens: this script renders one 1200×630 PNG per targeted page, with that
// page's own H1, and points the page's og:image / twitter:image at it.
//
// TARGETS (start small, ~60 pages): the company interview pages
// (src/*-sql-interview.html), the SQL trap pages (SQL_PATTERNS) and the blog
// posts. /questions/ pages are NOT targeted (frozen template, and 300+ cards
// for pages nobody shares). Every other page keeps the global /og-image.png.
//
// WHERE IT RUNS: in `npm run build`, right after scripts/build-static-pages.js,
// on the BUILT copies under public/ — the src files keep the global image, so
// no generator (build-company-pages.mjs, build-pattern-pages.mjs) and no
// hand-written blog post has to know about this. The title is read from the
// built page's <h1>, so the card cannot disagree with the page.
//
// THE PNGs ARE NOT COMMITTED (public/og/ is in .gitignore). Production builds
// from source (`vercel build` runs `npm run build`), so the deploy renders
// them; the committed HTML carries only the changed meta tags.
//
// DETERMINISTIC AND CACHED: satori + resvg (renderPng in api/_og-png.js, the
// same renderer api/og-card.js uses since @vercel/og was dropped) give the
// same bytes for the same input. The fonts are the vendored Geist files
// (DESIGN.md's body face; never a network font). A glyph Geist lacks reaches
// satori's missing-glyph hook, which here records it and fetches nothing:
// the build fails loudly instead of depending on a Google font download. A card is re-rendered only when the hash of
// (title + kind + this file + the fonts) changes; the hashes live in
// public/og/.cache.json next to the PNGs.
//
// DESIGN.md: dark palette only (#0E0F13 / #2A2E38 / #F2F0EA / #8A8E99), the
// brand mark is the favicon's purple bolt tile, and the accent yellow is not
// used — a share card has no CTA, score or streak on it.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pathToFileURL } from 'url';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
export const OG_DIR = path.join(PUB, 'og');
export const OG_BASE_URL = 'https://sqlquest.app/og/';
export const GLOBAL_OG_IMAGE = 'https://sqlquest.app/og-image.png';
export const WIDTH = 1200;
export const HEIGHT = 630;

const C = {
  bg: '#0E0F13',
  border: '#2A2E38',
  text: '#F2F0EA',
  muted: '#8A8E99',
  brand: '#7c3aed', // the favicon tile (public/favicon.svg), the site's brand mark
};

export const KIND_LABEL = {
  company: 'SQL interview prep',
  pattern: 'SQL trap, explained',
  blog: 'SQL Quest blog',
};

// ---- targets ---------------------------------------------------------------

async function blogPostSlugs() {
  // The list build-static-pages.js publishes. Read from its source rather than
  // a second hand-kept list, so a new post gets a card automatically.
  const src = fs.readFileSync(path.join(ROOT, 'scripts', 'build-static-pages.js'), 'utf8');
  const block = src.match(/const blogPosts = \[([\s\S]*?)\];/);
  if (!block) throw new Error('[build-og-images] blogPosts list not found in build-static-pages.js');
  return [...block[1].matchAll(/^\s*'([a-z0-9-]+)',/gm)].map(m => m[1]);
}

async function patternSlugs() {
  const mod = await import(pathToFileURL(path.join(ROOT, 'src', 'data', 'sql-patterns.js')).href);
  return mod.SQL_PATTERNS.map(p => p.slug);
}

function companySlugs() {
  return fs.readdirSync(path.join(ROOT, 'src'))
    .filter(f => f.endsWith('-sql-interview.html'))
    .map(f => f.slice(0, -'.html'.length))
    .sort();
}

// Every targeted page: { slug, kind, files } where files are the BUILT copies
// (relative to the repo root) whose meta this script rewrites. files[0] is the
// one the title is read from.
export async function ogTargets() {
  const out = [];
  for (const slug of companySlugs()) {
    out.push({ slug, kind: 'company', files: [`public/${slug}/index.html`, `public/${slug}.html`] });
  }
  for (const slug of await patternSlugs()) {
    out.push({ slug, kind: 'pattern', files: [`public/${slug}/index.html`] });
  }
  for (const slug of await blogPostSlugs()) {
    out.push({ slug, kind: 'blog', files: [`public/blog/${slug}/index.html`] });
  }
  const seen = new Set();
  for (const t of out) {
    if (seen.has(t.slug)) throw new Error(`[build-og-images] two targets share the slug ${t.slug}`);
    seen.add(t.slug);
  }
  return out;
}

export const ogImageUrl = slug => `${OG_BASE_URL}${slug}.png`;

// ---- the title ---------------------------------------------------------------

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', rarr: '→' };

// The page's first <h1> as plain text: tags dropped (<br> is a space),
// entities decoded, whitespace collapsed. This is the card's title verbatim.
export function h1Text(html) {
  const m = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  return m[1]
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (all, n) => ENTITIES[n.toLowerCase()] ?? all)
    .replace(/\s+/g, ' ')
    .trim();
}

// ---- the card ---------------------------------------------------------------

const BOLT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">' +
  `<rect width="512" height="512" rx="112" fill="${C.brand}"/>` +
  '<path d="M277 43 64 299h192l-21 170 213-256H256l21-170z" fill="none" stroke="#fff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';
const BOLT_URI = `data:image/svg+xml;base64,${Buffer.from(BOLT_SVG).toString('base64')}`;

export function titleFontSize(title) {
  const n = title.length;
  if (n <= 36) return 76;
  if (n <= 60) return 64;
  if (n <= 90) return 54;
  return 46;
}

const el = (type, style, children, extra = {}) => ({ type, props: { style, children, ...extra } });

// The satori element tree. Pure: the same (title, kind) gives the same tree.
export function cardTree(title, kind) {
  const label = KIND_LABEL[kind];
  if (!label) throw new Error(`[build-og-images] unknown kind ${kind}`);
  return el('div', {
    width: WIDTH, height: HEIGHT, display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', padding: '64px 72px 56px',
    backgroundColor: C.bg, color: C.text, fontFamily: 'Geist',
  }, [
    el('div', { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, [
      el('div', { display: 'flex', alignItems: 'center' }, [
        el('img', { width: 56, height: 56 }, undefined, { src: BOLT_URI, width: 56, height: 56 }),
        el('div', { display: 'flex', marginLeft: 18, fontSize: 30, fontWeight: 700 }, 'SQL Quest'),
      ]),
      el('div', { display: 'flex', fontSize: 20, color: C.muted, letterSpacing: 2, textTransform: 'uppercase' }, label),
    ]),
    el('div', {
      display: 'flex', fontSize: titleFontSize(title), fontWeight: 700,
      lineHeight: 1.12, letterSpacing: -1, maxWidth: WIDTH - 144,
    }, title),
    el('div', {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderTop: `1px solid ${C.border}`, paddingTop: 24, fontSize: 22, color: C.muted,
    }, [
      el('div', { display: 'flex' }, 'sqlquest.app'),
      el('div', { display: 'flex' }, 'Personalized SQL interview practice'),
    ]),
  ]);
}

// The title text the tree carries (what a test compares to the page's H1).
export function cardTitle(tree) {
  return tree.props.children[1].props.children;
}

let FONTS = null;
function fonts() {
  if (FONTS) return FONTS;
  const read = f => fs.readFileSync(path.join(ROOT, 'assets', 'fonts', f));
  FONTS = [
    { name: 'Geist', data: read('Geist-400.ttf'), weight: 400, style: 'normal' },
    { name: 'Geist', data: read('Geist-700.ttf'), weight: 700, style: 'normal' },
  ];
  return FONTS;
}

// The template's identity: this file + the fonts. A change to either
// re-renders every card; a change to one page's H1 re-renders that card only.
let TEMPLATE_HASH = null;
function templateHash() {
  if (TEMPLATE_HASH) return TEMPLATE_HASH;
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(new URL(import.meta.url)));
  for (const f of fonts()) h.update(f.data);
  TEMPLATE_HASH = h.digest('hex');
  return TEMPLATE_HASH;
}
export const cardHash = (title, kind) =>
  crypto.createHash('sha256').update(`${templateHash()}\n${kind}\n${title}`).digest('hex').slice(0, 16);

export async function renderCard(title, kind) {
  const { renderPng } = await import('../api/_og-png.js');
  // satori asks loadAdditionalAsset for any glyph the given fonts lack (an
  // emoji, a CJK character, ...). api/og-card.js answers that with a Google
  // Fonts / twemoji download; this build never does. The hook records the
  // request, hands back nothing (so nothing is fetched), and the render is
  // turned into an error: left alone, satori would draw nothing for the glyph.
  const missing = [];
  const png = await renderPng(cardTree(title, kind), {
    width: WIDTH, height: HEIGHT, fonts: fonts(),
    loadAdditionalAsset: async (code, segment) => { missing.push(`${code}:${segment}`); return []; },
  });
  if (missing.length) {
    throw new Error(`[build-og-images] a glyph in "${title}" is not in the vendored Geist fonts (renderer asked for ${missing.join(', ').slice(0, 80)})`);
  }
  return png;
}

// ---- the meta tags ------------------------------------------------------------

const OG_IMAGE_RE = /<meta property="og:image" content="[^"]*">/;
const metaRe = (attr, name) => new RegExp(`<meta ${attr}="${name}" content="[^"]*">`);

// Point a page's share image at `url`: og:image, og:image:width/height,
// twitter:image. Missing width/height/twitter tags are added next to the ones
// the page has. Idempotent. Throws when the page has no og:image tag at all —
// a template change that drops it must fail the build, not ship silently.
export function setShareImage(html, url) {
  if (!OG_IMAGE_RE.test(html)) throw new Error('[build-og-images] page has no <meta property="og:image"> tag');
  let out = html.replace(OG_IMAGE_RE, `<meta property="og:image" content="${url}">`);
  const ogTag = `<meta property="og:image" content="${url}">`;
  const indent = (out.match(/\n([ \t]*)<meta property="og:image" content=/) || [, '  '])[1];

  for (const [name, value] of [['og:image:height', HEIGHT], ['og:image:width', WIDTH]]) {
    const re = metaRe('property', name);
    if (re.test(out)) out = out.replace(re, `<meta property="${name}" content="${value}">`);
    else out = out.replace(ogTag, `${ogTag}\n${indent}<meta property="${name}" content="${value}">`);
  }
  // Re-order the two inserted tags so width precedes height when both were added.
  out = out.replace(
    `<meta property="og:image:height" content="${HEIGHT}">\n${indent}<meta property="og:image:width" content="${WIDTH}">`,
    `<meta property="og:image:width" content="${WIDTH}">\n${indent}<meta property="og:image:height" content="${HEIGHT}">`,
  );

  const tw = metaRe('name', 'twitter:image');
  if (tw.test(out)) {
    out = out.replace(tw, `<meta name="twitter:image" content="${url}">`);
  } else {
    const card = out.match(/<meta name="twitter:card" content="[^"]*">/);
    const anchor = card ? card[0] : `<meta property="og:image:height" content="${HEIGHT}">`;
    out = out.replace(anchor, `${anchor}\n${indent}<meta name="twitter:image" content="${url}">`);
  }
  return out;
}

// ---- main ------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  fs.mkdirSync(OG_DIR, { recursive: true });
  const cacheFile = path.join(OG_DIR, '.cache.json');
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8')); } catch { /* first build */ }
  const next = {};
  let rendered = 0, reused = 0, pages = 0;

  const targets = await ogTargets();
  for (const t of targets) {
    const first = path.join(ROOT, t.files[0]);
    if (!fs.existsSync(first)) throw new Error(`[build-og-images] ${t.files[0]} is not built — run after build-static-pages.js`);
    const title = h1Text(fs.readFileSync(first, 'utf8'));
    if (!title) throw new Error(`[build-og-images] ${t.files[0]} has no <h1>`);

    const png = path.join(OG_DIR, `${t.slug}.png`);
    const hash = cardHash(title, t.kind);
    if (cache[t.slug] === hash && fs.existsSync(png)) {
      reused++;
    } else {
      fs.writeFileSync(png, await renderCard(title, t.kind));
      rendered++;
    }
    next[t.slug] = hash;

    for (const rel of t.files) {
      const file = path.join(ROOT, rel);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, 'utf8');
      const out = setShareImage(html, ogImageUrl(t.slug));
      if (out !== html) fs.writeFileSync(file, out);
      pages++;
    }
  }

  // Drop cards for pages that are no longer targeted.
  for (const f of fs.readdirSync(OG_DIR)) {
    if (f.endsWith('.png') && !(f.slice(0, -4) in next)) fs.unlinkSync(path.join(OG_DIR, f));
  }
  fs.writeFileSync(cacheFile, JSON.stringify(next, null, 2) + '\n');
  console.log(`[build-og-images] ${targets.length} cards (${rendered} rendered, ${reused} unchanged), ${pages} page copies pointed at their own image, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(err => { console.error(err); process.exit(1); });
}
