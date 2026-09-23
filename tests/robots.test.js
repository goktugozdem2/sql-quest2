// robots.txt — the crawl budget rule (2026-09-23). The app shell is one
// noindex page linked under 1,105 query strings; Bing reported "limited crawl
// capacity" and crawled 85 of 2.9K IndexNow submissions. Every group must
// keep the parameterised shell out, and must never block a content page.
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

describe('robots.txt', () => {
  it('every group keeps the parameterised app shell out', () => {
    for (const g of groups) {
      for (const p of ['/app/?challenge=91&src=question-x', '/app?company=Revolut', '/app.html']) {
        expect(blocked(g, p), `${g.agent} ${p}`).toBe(true);
      }
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
