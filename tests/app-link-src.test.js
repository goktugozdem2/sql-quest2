// Guard: every link from a built content page into the app carries an
// attribution door (2026-11-22, B2). See scripts/stamp-app-src.mjs for the
// rule and why `company` / `sector` count as a door.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  HREF_RE, hasDoor, isExempt, doorForPath, dominantSrc, withSrc, stampHtml, listPages, shouldVisit,
} from '../scripts/stamp-app-src.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

describe('stamp-app-src: the rule', () => {
  it('reads a door from src, utm_source, company or sector, with &amp; encoding', () => {
    expect(hasDoor('/app/?challenge=5&amp;src=blog-x')).toBe(true);
    expect(hasDoor('/app/?utm_source=newsletter')).toBe(true);
    expect(hasDoor('/app/?company=Airbnb&amp;goal=interview')).toBe(true);
    expect(hasDoor('/app/?sector=finance')).toBe(true);
    expect(hasDoor('/app/')).toBe(false);
    expect(hasDoor('/app/?challenge=270&ref=lp_fraud')).toBe(false);   // ref is the referral code, not a door
    expect(hasDoor('/app/?src=')).toBe(false);
  });

  it('exempts the sign-in link only', () => {
    expect(isExempt('/app/?signin=1')).toBe(true);
    expect(isExempt('/app/?goals=mentor')).toBe(false);
  });

  it('names a page the way the site already names its doors', () => {
    expect(doorForPath('index.html')).toBe('home');
    expect(doorForPath('kpis.html')).toBe('kpis');
    expect(doorForPath('sql-interview-prep/index.html')).toBe('sql-interview-prep');
    expect(doorForPath('blog/faang-sql-interview-guide/index.html')).toBe('blog-faang-sql-interview-guide');
    expect(doorForPath('challenges/joins/index.html')).toBe('challenges-joins');
    expect(doorForPath('challenges/index.html')).toBe('challenges');
    expect(doorForPath('questions/running-total/index.html')).toBe('question-running-total');
  });

  it('reuses the src the page already uses most, ignoring template placeholders', () => {
    const html = '<a href="/app/?src=blog-wh">a</a><a href="/app/?challenge=1&amp;src=blog-wh">b</a>'
      + '<a href="/app/?src=other">c</a><a href="/app/?src=x&challenge=${f.id}">d</a>';
    expect(dominantSrc(html)).toBe('blog-wh');
    expect(dominantSrc('<a href="/app/?src=${slug}">x</a>')).toBe(null);
  });

  it('appends src before a hash, keeping the href\'s own ampersand style', () => {
    expect(withSrc('/app/', 'home')).toBe('/app/?src=home');
    expect(withSrc('/app/?a=1&amp;b=2', 'p')).toBe('/app/?a=1&amp;b=2&amp;src=p');
    expect(withSrc('/app/?a=1&b=2', 'p')).toBe('/app/?a=1&b=2&src=p');
    expect(withSrc('/app/#x', 'p')).toBe('/app/?src=p#x');
    expect(withSrc('/app/?', 'p')).toBe('/app/?src=p');
  });

  it('stamps only door-less links and is idempotent', () => {
    const html = '<a href="/app/">a</a><a href="/app/?company=Uber">b</a><a href="/app/?signin=1">c</a>'
      + "<a href='https://sqlquest.app/app/?goals=mentor'>d</a><a href=\"/apps/\">e</a>";
    const once = stampHtml(html, 'challenges/joins/index.html');
    expect(once.stamped).toBe(2);
    expect(once.html).toContain('href="/app/?src=challenges-joins"');
    expect(once.html).toContain("href='https://sqlquest.app/app/?goals=mentor&src=challenges-joins'");
    expect(once.html).toContain('href="/app/?company=Uber"');
    expect(once.html).toContain('href="/app/?signin=1"');
    expect(once.html).toContain('href="/apps/"');
    expect(stampHtml(once.html, 'challenges/joins/index.html')).toEqual({ html: once.html, stamped: 0 });
  });

  it('leaves the app shell and the weekly archive to their own steps', () => {
    expect(shouldVisit('app.html')).toBe(false);
    expect(shouldVisit('app/index.html')).toBe(false);
    expect(shouldVisit('weekly.html')).toBe(false);
    expect(shouldVisit('weekly/2026-W06/index.html')).toBe(false);
    expect(shouldVisit('kpis.html')).toBe(true);
  });
});

describe('the built site: every /app/ link has a door', () => {
  const pages = listPages(PUBLIC);

  it('scans the whole built site', () => {
    expect(pages.length).toBeGreaterThan(400);
    expect(pages).toContain('index.html');
    expect(pages.some(p => p.startsWith('questions/'))).toBe(true);
    expect(pages.some(p => p.startsWith('blog/'))).toBe(true);
  });

  it('finds no door-less link outside the sign-in link', () => {
    const missing = [];
    for (const rel of pages) {
      const html = fs.readFileSync(path.join(PUBLIC, rel), 'utf8');
      for (const m of html.matchAll(HREF_RE)) {
        if (!hasDoor(m[3]) && !isExempt(m[3])) missing.push(`${rel}: ${m[3]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('runs in npm run build after every page generator, and in build:weekly', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const steps = pkg.scripts.build.split('&&').map(s => s.trim());
    const at = steps.indexOf('node scripts/stamp-app-src.mjs');
    expect(at).toBeGreaterThan(-1);
    for (const gen of ['build-static-pages.js', 'build-question-pages.mjs', 'build-pattern-pages.mjs', 'apply-seo-prune.mjs']) {
      expect(at, gen).toBeGreaterThan(steps.findIndex(s => s.includes(gen)));
    }
    expect(at).toBeLessThan(steps.findIndex(s => s.includes('sitemap-lastmod.mjs')));
    expect(pkg.scripts['build:weekly']).toContain('node scripts/stamp-app-src.mjs --weekly');
  });
});
