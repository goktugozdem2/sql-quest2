// `<lastmod>` has to be earned (2026-09-14).
//
// The sitemap's dates were hand-maintained and had stopped moving: after
// thirty company pages and the homepage changed on 09-14, all 316 entries
// still read 2026-09-13 and the homepage read 2026-09-12. At the same time
// build-question-pages.mjs stamped TODAY on all 299 question pages every
// build, changed or not. Wrong in both directions at once.
//
// scripts/sitemap-lastmod.mjs makes the date follow the built bytes. These
// tests pin the three ways that can go wrong: a date that moves when nothing
// changed, a date that does not move when something did, and a first run that
// simply stamps today on everything.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readEntries, applyDates, resolveDates, fileFor } from '../scripts/sitemap-lastmod.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const XML = `<?xml version="1.0"?>
<urlset>
  <url>
    <loc>https://sqlquest.app/</loc>
    <lastmod>2026-09-01</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://sqlquest.app/a/</loc>
    <lastmod>2026-09-02</lastmod>
  </url>
  <url>
    <loc>https://sqlquest.app/b/</loc>
  </url>
</urlset>`;

const TODAY = '2026-09-14';

describe('reading the sitemap', () => {
  it('finds every url with its path and current date', () => {
    expect(readEntries(XML).map(e => [e.path, e.lastmod])).toEqual([
      ['/', '2026-09-01'],
      ['/a/', '2026-09-02'],
      ['/b/', null],
    ]);
  });
});

describe('a date moves only when the page did', () => {
  const entries = readEntries(XML);
  const manifest = {
    '/': { hash: 'h-root', lastmod: '2026-09-01' },
    '/a/': { hash: 'h-a', lastmod: '2026-09-02' },
  };

  it('keeps the old date when the bytes are identical', () => {
    const { dates, changed } = resolveDates(entries, { '/': 'h-root', '/a/': 'h-a' }, manifest, null, TODAY);
    expect(dates['/']).toBe('2026-09-01');
    expect(dates['/a/']).toBe('2026-09-02');
    expect(changed).toEqual([]);
  });

  it('moves to today when the bytes changed', () => {
    const { dates, changed } = resolveDates(entries, { '/': 'h-root', '/a/': 'DIFFERENT' }, manifest, null, TODAY);
    expect(dates['/']).toBe('2026-09-01');
    expect(dates['/a/']).toBe(TODAY);
    expect(changed).toEqual(['/a/']);
  });

  it('dates a page the manifest has never seen', () => {
    const { dates, changed } = resolveDates(entries, { '/': 'h-root', '/b/': 'h-b' }, manifest, null, TODAY);
    expect(dates['/b/']).toBe(TODAY);
    expect(changed).toEqual(['/b/']);
  });

  it('leaves a url with no built file exactly as it found it', () => {
    const { dates } = resolveDates(entries, { '/': 'h-root' }, manifest, null, TODAY);
    expect(dates['/a/']).toBe('2026-09-02');
  });
});

describe('the first run does not stamp today on everything', () => {
  it('takes each page\'s date from git, not the clock', () => {
    const entries = readEntries(XML);
    const baseline = { '/': '2026-08-20', '/a/': '2026-09-02' };
    const { dates, seeded } = resolveDates(entries, { '/': 'h1', '/a/': 'h2' }, {}, baseline, TODAY);
    expect(seeded).toBe(true);
    expect(dates['/']).toBe('2026-08-20');   // corrected backwards, not to today
    expect(dates['/a/']).toBe('2026-09-02'); // already right, untouched
  });

  it('falls back to the date already in the sitemap when git knows nothing', () => {
    const entries = readEntries(XML);
    const { dates } = resolveDates(entries, { '/': 'h1' }, {}, {}, TODAY);
    expect(dates['/']).toBe('2026-09-01');
  });
});

describe('writing the dates back', () => {
  it('replaces one block\'s date and leaves the rest of the block alone', () => {
    const out = applyDates(XML, { '/': '2026-09-14', '/a/': '2026-09-02' });
    expect(out).toContain('<loc>https://sqlquest.app/</loc>\n    <lastmod>2026-09-14</lastmod>');
    expect(out).toContain('<priority>1.0</priority>');
    expect(out).toContain('<lastmod>2026-09-02</lastmod>');
  });

  it('adds a lastmod to a block that has none', () => {
    const out = applyDates(XML, { '/b/': '2026-09-14' });
    expect(out).toMatch(/<loc>https:\/\/sqlquest\.app\/b\/<\/loc>\s*\n\s*<lastmod>2026-09-14<\/lastmod>/);
  });
});

describe('the live sitemap and its manifest agree', () => {
  const xml = read('public/sitemap.xml');
  const entries = readEntries(xml);
  const manifest = JSON.parse(read('src/data/sitemap-lastmod.json')).pages;

  it('every url that has a built page is in the manifest', () => {
    const missing = entries.filter(e => fileFor(e.path) && !manifest[e.path]).map(e => e.path);
    expect(missing, `run node scripts/sitemap-lastmod.mjs:\n${missing.slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('the sitemap carries the date the manifest recorded', () => {
    const drift = entries
      .filter(e => manifest[e.path] && manifest[e.path].lastmod !== e.lastmod)
      .map(e => `${e.path}: sitemap ${e.lastmod}, manifest ${manifest[e.path].lastmod}`);
    expect(drift, `run node scripts/sitemap-lastmod.mjs:\n${drift.slice(0, 10).join('\n')}`).toEqual([]);
  });

  it('no date is in the future', () => {
    const ahead = entries.filter(e => e.lastmod && e.lastmod > new Date().toISOString().slice(0, 10));
    expect(ahead.map(e => `${e.path} ${e.lastmod}`)).toEqual([]);
  });

  it('runs last in the build, after cachebust', () => {
    const build = JSON.parse(read('package.json')).scripts.build;
    expect(build).toContain('scripts/sitemap-lastmod.mjs');
    expect(build.indexOf('sitemap-lastmod')).toBeGreaterThan(build.indexOf('cachebust'));
  });
});
