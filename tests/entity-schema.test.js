// SQL Quest — one entity in the structured data AI assistants read (G1, 2026-11-22)
//
// THE FINDING (docs/reads/geo-2026-11-22.md)
//
// Assistants ground on search indexes and on a page's JSON-LD to decide what
// a site IS. On the four pages they cite for the buyer-prompt panel
// (/, /sql-practice-comparison/, /best-sql-practice-sites/, /sql-exercises/)
// the site was described as several loosely joined things:
//   - the homepage Organization carries "@id": "https://sqlquest.app/#organization",
//     but the comparison pages' author/publisher and the Course providers were
//     bare {"name": "SQL Quest"} nodes with no @id and no url, so nothing tied
//     the article's publisher to the organization;
//   - the SoftwareApplication said "https://sqlquest.app" while every other
//     node says "https://sqlquest.app/";
//   - the homepage Course and the WebSite SearchAction pointed at /app.html,
//     a 308 (CLAUDE.md: link the app as /app/, never /app.html), and the
//     SearchAction advertised "?q=" — a search the app does not have.
// These tests hold one name, one URL, one @id across those pages.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(join(ROOT, p), 'utf8');

const ORG_ID = 'https://sqlquest.app/#organization';
const SITE_URL = 'https://sqlquest.app/';
const PAGES = ['src/index.html', 'src/sql-practice-comparison.html', 'src/best-sql-practice-sites.html', 'src/sql-exercises.html'];

export function jsonLdBlocks(html) {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
  return [...noComments.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
}

// Every object node in a JSON-LD tree, with the key it sits under.
function nodes(value, key = null, out = []) {
  if (Array.isArray(value)) { for (const v of value) nodes(v, key, out); return out; }
  if (value && typeof value === 'object') {
    out.push({ key, node: value });
    for (const [k, v] of Object.entries(value)) nodes(v, k, out);
  }
  return out;
}

const parsed = Object.fromEntries(PAGES.map(p => [p, jsonLdBlocks(read(p)).map(b => JSON.parse(b))]));

// A node that stands for SQL Quest the organization: the Organization itself,
// or the author / publisher / provider of anything on these pages.
export function ourOrgNodes(blocks) {
  return nodes(blocks).filter(({ key, node }) =>
    node['@type'] === 'Organization' && /^SQL ?Quest$/i.test(node.name || '') &&
    (key === null || ['author', 'publisher', 'provider', 'creator'].includes(key)));
}

describe('JSON-LD on the four panel-cited pages', () => {
  it('every block parses, in source and in the built page', () => {
    for (const p of PAGES) {
      const built = p === 'src/index.html' ? 'public/index.html' : `public/${p.slice(4, -5)}/index.html`;
      for (const f of [p, built]) {
        const blocks = jsonLdBlocks(read(f));
        expect(blocks.length, f).toBeGreaterThan(0);
        for (const b of blocks) expect(() => JSON.parse(b), f).not.toThrow();
      }
    }
  });

  it('the homepage defines the Organization once, by @id, at the site URL', () => {
    const orgs = parsed['src/index.html'].filter(b => b['@type'] === 'Organization');
    expect(orgs).toHaveLength(1);
    expect(orgs[0]['@id']).toBe(ORG_ID);
    expect(orgs[0].name).toBe('SQL Quest');
    expect(orgs[0].url).toBe(SITE_URL);
  });

  it('every SQL Quest author, publisher and provider is that one entity (@id + url)', () => {
    for (const p of PAGES) {
      const found = ourOrgNodes(parsed[p]);
      expect(found.length, p).toBeGreaterThan(0);
      for (const { key, node } of found) {
        expect(node['@id'], `${p} ${key}`).toBe(ORG_ID);
        expect(node.url, `${p} ${key}`).toBe(SITE_URL);
      }
    }
  });

  it('the app entity sits at the same URL and is published by the Organization', () => {
    const app = parsed['src/index.html'].find(b => b['@type'] === 'SoftwareApplication' || b['@type'] === 'WebApplication');
    expect(app).toBeTruthy();
    expect(app.url).toBe(SITE_URL);
    expect(app.publisher && app.publisher['@id']).toBe(ORG_ID);
  });

  it('no structured-data URL points at /app.html (a 308)', () => {
    for (const p of PAGES) {
      expect(JSON.stringify(parsed[p]).match(/https:\/\/sqlquest\.app\/app\.html[^"]*/g) || [], p).toEqual([]);
    }
  });

  it('no SearchAction advertises a search the app does not have', () => {
    const appReadsQ = /\.get\(\s*['"]q['"]\s*\)/.test(read('src/app.jsx'));
    const actions = nodes(parsed['src/index.html']).filter(({ node }) => node['@type'] === 'SearchAction');
    if (!appReadsQ) expect(actions).toHaveLength(0);
  });
});
