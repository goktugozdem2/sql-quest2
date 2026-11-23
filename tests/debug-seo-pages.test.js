// /sql-debugging-practice/ — the Debug set's one SEO page (2026-11-23 decision
// row: S1 RED exception, at most 2 pages, rendered only while
// features.debugQuestions is true, linked in the same commit, no /questions/
// page per item). Generator: scripts/build-debug-pages.mjs.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDebugPages, pageModel, renderHub, linkTargets, withHubLink, withSitemapBlock,
  llmsEntryPoint, FAMILIES, FAMILY_BY_ID, TITLE, SLUG, URL_PATH,
} from '../scripts/build-debug-pages.mjs';
import { loadDebugItems, debugFlagOn } from '../scripts/debug-discovery.mjs';
import { freeTierSentence } from '../src/utils/display-count.js';
import { sqlQuestFacts } from '../scripts/build-alternatives-pages.mjs';
import { ENTRY_POINTS } from '../scripts/build-llms-txt.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const items = loadDebugItems().filter(c => c.type === 'debug');
const model = pageModel();
const html = renderHub(model);
const noComments = s => s.replace(/<!--[\s\S]*?-->/g, '');
const visible = s => noComments(s).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const norm = s => unesc(s).replace(/\s+/g, ' ').trim();

// A throwaway public/: a sitemap and every page the hub links from, each
// carrying its anchor (the AI pages as debug-discovery leaves them, flag on).
function fixturePub() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'debug-hub-'));
  fs.writeFileSync(path.join(dir, 'sitemap.xml'), '<?xml version="1.0"?>\n<urlset>\n  <url><loc>https://sqlquest.app/</loc></url>\n</urlset>\n');
  for (const t of linkTargets(model.n)) {
    const f = path.join(dir, t.file);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, `<html><body><main>x ${t.anchor} y</main></body></html>`);
  }
  return dir;
}
const snapshot = dir => {
  const out = {};
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out[path.relative(dir, p)] = fs.readFileSync(p, 'utf8'); } };
  walk(dir);
  return out;
};

describe('flag off: no page, no sitemap entry, no link', () => {
  let dir;
  beforeAll(() => { dir = fixturePub(); });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('a build with the flag off changes nothing', () => {
    const before = snapshot(dir);
    const r = buildDebugPages({ flagOn: false, pub: dir });
    expect(r).toEqual({ pages: 0, links: 0 });
    expect(snapshot(dir)).toEqual(before);
    expect(fs.existsSync(path.join(dir, SLUG))).toBe(false);
  });
  it('turning the flag back off removes the page and its sitemap block', () => {
    buildDebugPages({ flagOn: true, pub: dir });
    expect(fs.existsSync(path.join(dir, SLUG, 'index.html'))).toBe(true);
    buildDebugPages({ flagOn: false, pub: dir });
    expect(fs.existsSync(path.join(dir, SLUG))).toBe(false);
    expect(fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8')).not.toContain(URL_PATH);
  });
  it('the link and sitemap helpers are no-ops with the flag off', () => {
    for (const t of linkTargets(model.n)) {
      const page = `<p>${t.anchor}</p>`;
      expect(withHubLink(page, t, { flagOn: false })).toBe(page);
    }
    const xml = '<urlset>\n</urlset>';
    expect(withSitemapBlock(xml, { flagOn: false })).toBe(xml);
    expect(llmsEntryPoint(false)).toEqual([]);
  });
  it('the committed build matches the committed flag', () => {
    const on = debugFlagOn();
    expect(fs.existsSync(path.join(ROOT, 'public', SLUG))).toBe(on);
    expect(fs.readFileSync(path.join(ROOT, 'public/sitemap.xml'), 'utf8').includes(URL_PATH)).toBe(on);
    for (const t of linkTargets(model.n)) {
      const f = path.join(ROOT, 'public', t.file);
      if (fs.existsSync(f)) expect(fs.readFileSync(f, 'utf8').includes(`href="${URL_PATH}"`), t.file).toBe(on);
    }
    expect(ENTRY_POINTS.some(([p]) => p === URL_PATH)).toBe(on);
  });
});

describe('flag on: the page, its sitemap block and every inbound link', () => {
  let dir;
  beforeAll(() => { dir = fixturePub(); buildDebugPages({ flagOn: true, pub: dir }); });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('writes the page with a short title, a description, canonical and OG', () => {
    const page = fs.readFileSync(path.join(dir, SLUG, 'index.html'), 'utf8');
    expect(page).toBe(html);
    expect(TITLE.length).toBeLessThanOrEqual(60);
    expect(page).toContain(`<title>${TITLE}</title>`);
    expect(TITLE).toMatch(/SQLQuest\.app$/);
    const desc = unesc(page.match(/<meta name="description" content="([^"]+)"/)[1]);
    expect(desc.length).toBeGreaterThanOrEqual(110);
    expect(desc.length).toBeLessThanOrEqual(160);
    expect(page).toContain(`<link rel="canonical" href="https://sqlquest.app${URL_PATH}">`);
    expect(page).toContain(`<meta property="og:url" content="https://sqlquest.app${URL_PATH}">`);
    expect(page).toContain('<meta name="robots" content="index, follow">');
  });
  it('adds one sitemap block, once, however many builds run', () => {
    buildDebugPages({ flagOn: true, pub: dir });
    const xml = fs.readFileSync(path.join(dir, 'sitemap.xml'), 'utf8');
    expect(xml.match(/<!-- debug-hub:start -->/g)).toHaveLength(1);
    expect(xml.split(`<loc>https://sqlquest.app${URL_PATH}</loc>`)).toHaveLength(2);
  });
  it('links the page from the homepage footer, /sql-exercises/, the five trap pages, the two AI pages, TikTok and Shopify — once each', () => {
    const files = linkTargets(model.n).map(t => t.file);
    expect(files).toEqual(expect.arrayContaining([
      'index.html', 'sql-exercises/index.html', 'sql-not-in-null/index.html', 'sql-join-fan-out/index.html',
      'sql-between-timestamp/index.html', 'sql-average-of-averages/index.html', 'sql-left-join-where-filter/index.html',
      'sql-for-the-ai-era/index.html', 'blog/validate-ai-generated-sql/index.html', 'tiktok-sql-interview/index.html', 'shopify-sql-interview/index.html',
    ]));
    for (const f of files) {
      const page = fs.readFileSync(path.join(dir, f), 'utf8');
      expect(page.split(`href="${URL_PATH}"`).length - 1, f).toBe(1);
    }
  });
  it('the llms.txt entry point appears with the flag on', () => {
    expect(llmsEntryPoint(true)[0][0]).toBe(URL_PATH);
  });
});

describe('the FAQ schema is the visible FAQ, verbatim', () => {
  it('same questions and answers, same order', () => {
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const faq = ld.find(o => o['@type'] === 'FAQPage');
    const schema = faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text]);
    const section = html.match(/<section class="faq">([\s\S]*?)<\/section>/)[1];
    const shown = [...section.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map(m => [norm(m[1]), norm(m[2])]);
    expect(shown.length).toBeGreaterThanOrEqual(5);
    expect(schema.map(([q, a]) => [norm(q), norm(a)])).toEqual(shown);
  });
});

describe('the page never gives the answer away', () => {
  const text = html;
  it('no reference solution', () => {
    for (const c of items) expect(text, `solution of ${c.id}`).not.toContain(c.solution);
    for (const c of items) expect(norm(visible(text)), `solution of ${c.id}`).not.toContain(norm(c.solution));
  });
  it('no broken query, not even two of its lines in a row', () => {
    for (const c of items) {
      const lines = c.brokenQuery.split('\n').map(l => l.trim()).filter(l => l.length > 12 && !l.startsWith('--'));
      for (const l of lines) expect(unesc(text), `${c.id}: "${l}"`).not.toContain(l);
    }
  });
  it('no bug note (it names the fix)', () => {
    for (const c of items) expect(unesc(text)).not.toContain(c.bugNote);
  });
  it('no deep link to a locked Hard (the app would swap in another question)', () => {
    // Decided here, not through the generator's own openable(), so a change there cannot pass itself.
    const locked = c => c.difficulty === 'Hard' && c.freePreview !== true;
    expect(items.some(locked)).toBe(true);
    for (const c of items.filter(locked)) expect(text).not.toContain(`challenge=${c.id}&`);
    for (const c of items.filter(c => !locked(c))) expect(text).toContain(`/app/?challenge=${c.id}&amp;src=seo-debug`);
  });
});

describe('every count comes from the data', () => {
  it('the number of questions and the difficulty split', () => {
    expect(model.n).toBe(items.length);
    for (const d of ['Easy', 'Medium', 'Hard']) expect(model.split[d]).toBe(items.filter(c => c.difficulty === d).length);
    const page = visible(html);
    expect(page).toContain(`The ${items.length} questions`);
    expect(page).toContain(model.splitText);
    expect(html.match(/<tbody>([\s\S]*?)<\/tbody>/)[1].match(/<tr>/g)).toHaveLength(items.length);
  });
  it('every Debug item has a bug family, and every family is used', () => {
    for (const c of items) expect(FAMILIES[FAMILY_BY_ID[c.id]], `item ${c.id}`).toBeTruthy();
    expect(new Set(items.map(c => FAMILY_BY_ID[c.id]))).toEqual(new Set(Object.keys(FAMILIES)));
    expect(() => pageModel([...items, { ...items[0], id: 999 }])).toThrow(/999/);
  });
  it('no hard-coded question count in the generator', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/build-debug-pages.mjs'), 'utf8');
    expect(src).not.toMatch(/\b12 (?:SQL|practice|questions|debugging)/i);
  });
});

describe('no claim the site forbids', () => {
  const page = visible(html) + ' ' + html.match(/<head>[\s\S]*?<\/head>/)[0];
  const FREQUENCY = [/most[- ]asked/i, /by (?:rough )?frequency/i, /\b\d{1,3}% of /i, /asked in roughly/i, /top-\d most/i, /interview reports from/i];
  it('no interview-frequency claim', () => { for (const re of FREQUENCY) expect(page).not.toMatch(re); });
  it('the free tier is said the way the gates decide it', () => {
    expect(unesc(page)).toContain(freeTierSentence(sqlQuestFacts().n));
    expect(page).toMatch(/Easy and Medium Debug questions count toward those free challenge solves; the Hard ones are Pro/);
    expect(page).not.toMatch(/free forever|unlimited|no trial clock|free is the product/i);
    expect(page).not.toMatch(/\b\d+ free (?:challenges|questions|debug)/i);
  });
  it('the accent is on the primary CTA only, and no blacklisted font', () => {
    expect(html.match(/#FFE34D/gi)).toHaveLength(1);
    expect(html).toMatch(/\.btn\{[^}]*background:#FFE34D/);
    expect(html.match(/class="btn"/g)).toHaveLength(1);
    expect(html).not.toMatch(/\b(?:Inter|Roboto|Poppins|Montserrat)\b/);
  });
});
