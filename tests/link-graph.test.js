// The internal link graph, measured on the built site (2026-09-23).
//
// Why this exists: on 2026-09-23 Bing had indexed 211 of the 405 sitemap URLs
// and most of the 2026-09-13 batch sat at "discovered but not crawled". The
// graph had two real holes. The question pages' "Related questions" picked
// the six same-skill questions closest in difficulty, so a handful of low-id
// questions were related to everything and many to nothing (min 1 inbound
// link — the hub alone, median 6). And the three SQL tool pages and the topic
// guides were linked from almost nowhere (3–5 inbound). Both are fixed in
// scripts/build-question-pages.mjs; these floors keep them fixed.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SKILL_GUIDES } from '../scripts/build-question-pages.mjs';

const ROOT = path.join(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const sitemap = [...fs.readFileSync(path.join(PUB, 'sitemap.xml'), 'utf8').matchAll(/<loc>https:\/\/sqlquest\.app([^<]*)<\/loc>/g)].map(m => m[1]);
const norm = p => { p = p.split('#')[0].split('?')[0]; if (!p.startsWith('/')) return null; if (!p.endsWith('/') && !p.includes('.')) p += '/'; return p; };
const files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) files.push(p); } };
walk(PUB);
const pageOf = f => '/' + path.relative(PUB, f).replace(/index\.html$/, '').replace(/\.html$/, '/');
const inbound = new Map(sitemap.map(u => [u, new Set()]));
for (const f of files) {
  const from = pageOf(f);
  if (!inbound.has(from)) continue;
  const html = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of html.matchAll(/href="(?:https:\/\/sqlquest\.app)?(\/[^"]*)"/g)) {
    const to = norm(m[1]);
    if (to && to !== from && inbound.has(to)) inbound.get(to).add(from);
  }
}
const isQuestion = u => u.startsWith('/questions/') && u !== '/questions/';
const count = u => inbound.get(u)?.size ?? 0;

describe('internal link graph (built site)', () => {
  it('no sitemap page is an orphan: every one has at least two internal links in', () => {
    const weak = sitemap.filter(u => u !== '/' && count(u) < 2).map(u => `${u} (${count(u)})`);
    expect(weak).toEqual([]);
  });

  it('every question page is linked from at least six other pages', () => {
    const weak = sitemap.filter(isQuestion).filter(u => count(u) < 6).map(u => `${u} (${count(u)})`);
    expect(weak).toEqual([]);
  });

  it('the three SQL tools are linked from the question pages, not only from each other', () => {
    for (const u of ['/sql-query-checker/', '/sql-query-explainer/', '/sql-query-optimizer/']) {
      expect(count(u), u).toBeGreaterThanOrEqual(50);
    }
  });

  it('every topic guide a question page points at is a live page in the sitemap', () => {
    const targets = Object.values(SKILL_GUIDES).flat().map(([u]) => u);
    const missing = targets.filter(u => !inbound.has(u));
    expect(missing).toEqual([]);
  });
});
