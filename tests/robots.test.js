// robots.txt — the crawl budget rule (2026-09-23). The app shell is one
// noindex page linked under 1,105 query strings; Bing reported "limited crawl
// capacity" and crawled 85 of 2.9K IndexNow submissions. Every group must
// keep the parameterised shell out, and must never block a content page.
//
// Except bingbot (2026-11-22, docs/reads/bing-drop-2026-11-22.md): Bing put
// the blocked URLs in its index as bare URLs — blocked_by_robots 0 → 819 and
// in_index 163 → 830 against a 422-URL sitemap — and can only drop them by
// reading the shell's noindex. So bingbot may fetch them; every other group
// still may not.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const txt = fs.readFileSync(path.join(import.meta.dirname, '..', 'public/robots.txt'), 'utf8');
const groups = txt.split(/\n(?=User-agent:)/).filter(g => /^User-agent:/m.test(g)).map(g => ({
  agent: g.match(/^User-agent:\s*(.+)$/m)[1].trim(),
  disallow: [...g.matchAll(/^Disallow:\s*(\S+)/gm)].map(m => m[1]),
}));
// Prefix match, as every major crawler reads a Disallow without wildcards.
const blocked = (g, p) => g.disallow.some(d => p.startsWith(d));
const APP_URLS = ['/app/?challenge=91&src=question-x', '/app?company=Revolut', '/app.html'];
const isBing = (g) => /^bingbot$/i.test(g.agent);

describe('robots.txt', () => {
  it('every group but bingbot keeps the parameterised app shell out', () => {
    for (const g of groups.filter(g => !isBing(g))) {
      for (const p of APP_URLS) {
        expect(blocked(g, p), `${g.agent} ${p}`).toBe(true);
      }
    }
  });
  it('bingbot has its own group and may fetch the app URLs, so it reads their noindex', () => {
    const bing = groups.filter(isBing);
    expect(bing).toHaveLength(1);
    for (const p of APP_URLS) expect(blocked(bing[0], p), `bingbot ${p}`).toBe(false);
    // The bundles stay closed to it, as in the default group.
    for (const p of ['/api/geo/', '/app.js', '/app.js.map', '/data.js']) {
      expect(blocked(bing[0], p), `bingbot ${p}`).toBe(true);
    }
  });
  it('no group blocks a content page or the app root', () => {
    for (const g of groups) {
      for (const p of ['/', '/app/', '/questions/', '/questions/distinct-values/', '/challenges/joins/', '/blog/where-vs-having/', '/sql-exercises/']) {
        expect(blocked(g, p), `${g.agent} ${p}`).toBe(false);
      }
    }
  });
  it('still names the sitemap', () => {
    expect(txt).toMatch(/^Sitemap: https:\/\/sqlquest\.app\/sitemap\.xml$/m);
  });
});
