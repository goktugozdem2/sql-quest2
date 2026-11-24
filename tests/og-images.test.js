// Per-page Open Graph cards (scripts/build-og-images.mjs, 2026-11-24).
//
// The company pages, the SQL trap pages and the blog posts each unfurl with a
// 1200×630 PNG of their own H1; every other page keeps /og-image.png. The
// PNGs are rendered by `npm run build` (production included) and are not
// committed, so these tests read the committed BUILT pages for the meta tags
// and render a card themselves to prove the renderer still produces one.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ogTargets, ogImageUrl, h1Text, cardTree, cardTitle, setShareImage,
  renderCard, GLOBAL_OG_IMAGE, WIDTH, HEIGHT,
} from '../scripts/build-og-images.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const TARGETS = await ogTargets();
const SLUGS = new Set(TARGETS.map(t => t.slug));

const meta = (html, attr, name) => {
  const m = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)">`));
  return m ? m[1] : null;
};

function htmlFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...htmlFiles(rel));
    else if (e.name.endsWith('.html')) out.push(rel);
  }
  return out;
}

// The PNG's own header: signature, then IHDR width/height (big-endian).
function pngSize(buf) {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('which pages get their own card', () => {
  it('covers every company page, trap page and blog post (and nothing is counted twice)', () => {
    const kinds = TARGETS.reduce((a, t) => ((a[t.kind] = (a[t.kind] || 0) + 1), a), {});
    const companies = fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('-sql-interview.html')).length;
    expect(kinds.company).toBe(companies);
    expect(kinds.pattern).toBeGreaterThanOrEqual(5);
    expect(kinds.blog).toBeGreaterThanOrEqual(20);
    expect(SLUGS.size).toBe(TARGETS.length);
  });

  it('never targets a /questions/ page', () => {
    for (const t of TARGETS) for (const f of t.files) expect(f).not.toMatch(/\/questions\//);
  });
});

describe('every targeted built page points at its own card', () => {
  for (const t of TARGETS) {
    for (const file of t.files) {
      if (!fs.existsSync(path.join(ROOT, file))) continue;
      it(`${file} → /og/${t.slug}.png`, () => {
        const html = read(file);
        const url = `https://sqlquest.app/og/${t.slug}.png`;
        expect(ogImageUrl(t.slug)).toBe(url);
        expect(meta(html, 'property', 'og:image')).toBe(url);
        expect(meta(html, 'name', 'twitter:image')).toBe(url);
        expect(meta(html, 'property', 'og:image:width')).toBe(String(WIDTH));
        expect(meta(html, 'property', 'og:image:height')).toBe(String(HEIGHT));
      });
    }
  }

  it('no built page points at an /og/ card the build does not produce', () => {
    const orphans = [];
    for (const file of htmlFiles('public')) {
      if (file.startsWith('public/weekly')) continue;
      const html = read(file);
      for (const m of html.matchAll(/https:\/\/sqlquest\.app\/og\/([a-z0-9-]+)\.png/g)) {
        if (!SLUGS.has(m[1])) orphans.push(`${file} → ${m[1]}`);
      }
    }
    expect(orphans).toEqual([]);
  });
});

describe('the card says what the page says', () => {
  // The H1 read independently of h1Text: first <h1>, tags → space, squeeze.
  const plainH1 = (html) => html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)[1]
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

  for (const t of TARGETS) {
    it(`${t.slug}: the card title is the page H1`, () => {
      const html = read(t.files[0]);
      const title = h1Text(html);
      expect(title).toBeTruthy();
      expect(cardTitle(cardTree(title, t.kind))).toBe(plainH1(html));
    });
  }

  it('reads the H1s people see, <br> and inline markup included', () => {
    expect(h1Text(read('public/stripe-sql-interview/index.html'))).toBe('Stripe SQL Interview Questions');
    expect(h1Text(read('public/blog/is-null-vs-equals-null/index.html')))
      .toBe('IS NULL vs = NULL — why = NULL returns zero rows, every time');
    expect(h1Text('<h1>A&nbsp;&amp;&#32;B<br/>C</h1>')).toBe('A & B C');
  });
});

describe('every other page keeps the global card', () => {
  for (const file of [
    'public/index.html',
    'public/sql-exercises/index.html',
    'public/sql-interview-prep/index.html',
    'public/blog/index.html',
    'public/challenges/index.html',
  ]) {
    it(file, () => {
      expect(meta(read(file), 'property', 'og:image')).toBe(GLOBAL_OG_IMAGE);
    });
  }

  it('a /questions/ page', () => {
    const q = fs.readdirSync(path.join(ROOT, 'public/questions'), { withFileTypes: true }).find(e => e.isDirectory());
    const html = read(`public/questions/${q.name}/index.html`);
    if (html.includes('og:image')) expect(meta(html, 'property', 'og:image')).toBe(GLOBAL_OG_IMAGE);
  });
});

describe('setShareImage', () => {
  const URL_ = 'https://sqlquest.app/og/x.png';

  it('replaces the tags a page has', () => {
    const html = `<head>\n  <meta property="og:image" content="${GLOBAL_OG_IMAGE}">\n  <meta property="og:image:width" content="1">\n  <meta property="og:image:height" content="2">\n  <meta name="twitter:image" content="${GLOBAL_OG_IMAGE}">\n</head>`;
    const out = setShareImage(html, URL_);
    expect(out).not.toContain(GLOBAL_OG_IMAGE);
    expect(meta(out, 'property', 'og:image:width')).toBe('1200');
    expect(meta(out, 'property', 'og:image:height')).toBe('630');
    expect(meta(out, 'name', 'twitter:image')).toBe(URL_);
  });

  it('adds width, height and twitter:image when the page lacks them, once', () => {
    const html = `<head>\n  <meta property="og:image" content="${GLOBAL_OG_IMAGE}">\n  <meta name="twitter:card" content="summary_large_image">\n</head>`;
    const out = setShareImage(html, URL_);
    expect(out).toBe(`<head>\n  <meta property="og:image" content="${URL_}">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta name="twitter:card" content="summary_large_image">\n  <meta name="twitter:image" content="${URL_}">\n</head>`);
    expect(setShareImage(out, URL_)).toBe(out);
  });

  it('refuses a page with no og:image tag (fails the build, never ships silently)', () => {
    expect(() => setShareImage('<head></head>', URL_)).toThrow(/no <meta property="og:image">/);
  });
});

describe('the renderer', () => {
  it('produces a 1200×630 PNG, the same bytes every time', async () => {
    const a = await renderCard('Stripe SQL Interview Questions', 'company');
    const b = await renderCard('Stripe SQL Interview Questions', 'company');
    expect(pngSize(a)).toEqual({ width: 1200, height: 630 });
    expect(a.equals(b)).toBe(true);
  }, 30000);

  it('never fetches a font at build time — a glyph Geist lacks fails loudly', async () => {
    await expect(renderCard('SQL 面试', 'blog')).rejects.toThrow(/not in the vendored Geist fonts/);
  }, 30000);

  it('uses no accent yellow and no blacklisted font', () => {
    const src = read('scripts/build-og-images.mjs');
    expect(src).not.toMatch(/FFE34D/i);
    expect(src).not.toMatch(/\b(Inter|Roboto|Poppins|Montserrat|Arial|Helvetica)\b/);
  });
});

describe('the build wiring', () => {
  it('runs after the pages are copied, and the PNGs are never committed', () => {
    const build = JSON.parse(read('package.json')).scripts.build;
    const i = build.indexOf('build-static-pages.js');
    const j = build.indexOf('build-og-images.mjs');
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
    expect(read('.gitignore')).toMatch(/^public\/og\/$/m);
  });
});
