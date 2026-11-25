// The internal-link push for /sql-interview-questions-data-analyst/
// (C1, 2026-11-23; ledger "/sql-interview-questions-data-analyst/ on Google").
//
// The /sql-exercises/ claim (HIT, read 2026-11-23) moved Google position
// 24.5 → 11.3 after its linking pages went 31 → 132. This page is the next
// page-two page: 17.4 on 196 impressions in 28 days, linked from 4 pages in
// content. The push links it from the 34 company pages (their "Keep prepping"
// strip, scripts/build-company-crosslinks.mjs) and from 38 topic, blog and hub
// pages (scripts/build-related-links.mjs). This test pins three things, on the
// BUILT site: each of those links is there, in content (not nav or footer);
// the target serves a 200 (a built page, in the sitemap, not noindexed, no
// redirect off its path); and the count does not quietly fall back.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inboundLinks, internalTargets, stripChrome, sitemapPaths, fileFor } from '../scripts/seo/inbound-links.mjs';
import { RELATED, DA } from '../scripts/build-related-links.mjs';
import { COMPANIES } from '../scripts/build-company-crosslinks.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

// Linking pages before the push (scripts/seo/inbound-links.mjs, 2026-11-23):
// /questions/, /sql-cte-vs-subquery/, /sql-find-duplicates/, /sql-interview-prep/.
const BEFORE = 4;
const FLOOR = 70;

const srcToPath = rel => `/${rel.replace(/(?:index)?\.html$/, '').replace(/\/$/, '')}/`.replace('//', '/');

const relatedSources = Object.entries(RELATED)
  .filter(([, e]) => e.links.some(([href]) => href === DA))
  .map(([rel]) => srcToPath(rel));
const companySources = Object.keys(COMPANIES).map(slug => `/${slug}-sql-interview/`);

describe('the data-analyst link push', () => {
  it('names the page it is for', () => {
    expect(DA).toBe('/sql-interview-questions-data-analyst/');
  });

  it('the target serves a 200: built, in the sitemap, not noindexed, no redirect off it', () => {
    const f = fileFor(DA);
    expect(f, `${DA} has no built file`).toBeTruthy();
    const html = fs.readFileSync(f, 'utf8');
    expect(html).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    expect(sitemapPaths(read('public', 'sitemap.xml'))).toContain(DA);
    const prune = JSON.parse(read('src', 'data', 'seo-prune.json'));
    expect(prune.noindex).not.toContain(DA);
    const vercel = JSON.parse(read('vercel.json'));
    const bare = DA.replace(/\/$/, '');
    const moved = (vercel.redirects || []).filter(r => r.source === DA || r.source === bare);
    expect(moved, `${DA} is redirected`).toEqual([]);
  });

  it('every related-links source carries the link in its content, on the built page', () => {
    expect(relatedSources.length).toBeGreaterThanOrEqual(38);
    const missing = [];
    for (const p of relatedSources) {
      const f = fileFor(p);
      if (!f || !internalTargets(stripChrome(fs.readFileSync(f, 'utf8'))).has(DA)) missing.push(p);
    }
    expect(missing, `no link to ${DA} on: ${missing.join(', ')}`).toEqual([]);
  });

  it('every company page carries it in the Keep prepping strip, on the built page', () => {
    expect(companySources.length).toBeGreaterThanOrEqual(34);
    const missing = [];
    for (const p of companySources) {
      const f = fileFor(p);
      if (!f || !internalTargets(stripChrome(fs.readFileSync(f, 'utf8'))).has(DA)) missing.push(p);
    }
    expect(missing, `no link to ${DA} on: ${missing.join(', ')}`).toEqual([]);
  });

  it(`the page has at least ${FLOOR} linking pages (was ${BEFORE})`, () => {
    const n = (inboundLinks().get(DA) || []).length;
    expect(n).toBeGreaterThanOrEqual(FLOOR);
  });
});
