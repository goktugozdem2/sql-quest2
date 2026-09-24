// Technical SEO checks from the GSC pipeline task (2026-09-25, item 6),
// pinned against the BUILT pages in public/ — what crawlers are served.
// Each was checked live the same day (and against Google's own URL
// Inspection for the app URLs); these tests keep them true.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { collectBankFacts } from '../scripts/build-llms-txt.js';
import { bankCountLabel } from '../src/utils/display-count.js';

const ROOT = new URL('../', import.meta.url).pathname;
const BANK = collectBankFacts(ROOT);   // the live bank, read the way the build reads it
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

function htmlFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...htmlFiles(rel));
    else if (e.name.endsWith('.html')) out.push(rel);
  }
  return out;
}

describe('the app URLs', () => {
  const robots = read('public/robots.txt');
  const defaultGroup = robots.split(/\n(?=User-agent:)/).find(g => /User-agent: \*/.test(g));

  it('robots.txt closes /app.html and every parameterised app URL', () => {
    for (const rule of ['Disallow: /app.html', 'Disallow: /app/?', 'Disallow: /app?']) expect(defaultGroup).toContain(rule);
  });

  it('robots.txt leaves /app/ itself crawlable — on purpose', () => {
    // A robots-blocked page's noindex is never read, and Google can index
    // the bare URL from links ("Indexed, though blocked by robots.txt").
    // Crawlable + noindex is what keeps it out: URL Inspection 2026-09-25
    // reads /app/ and /app.html as "Excluded by 'noindex' tag".
    expect(defaultGroup).not.toMatch(/^Disallow: \/app\/?\s*$/m);
  });

  it('both app URLs are noindex and canonical to /app/; /app.html redirects there', () => {
    for (const f of ['public/app/index.html', 'public/app.html']) {
      const html = read(f);
      expect(html, f).toMatch(/<meta name="robots" content="noindex, follow">/);
      expect(html, f).toContain('<link rel="canonical" href="https://sqlquest.app/app/">');
    }
    expect(JSON.parse(read('vercel.json')).cleanUrls).toBe(true);   // /app.html → 308 /app/
  });
});

describe('the sitemap lists only pages meant to be indexed', () => {
  const locs = [...read('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const fileFor = (loc) => {
    const p = loc.replace('https://sqlquest.app', '');
    if (p === '/') return 'public/index.html';
    return [`public${p}index.html`, `public${p.replace(/\/$/, '')}.html`].find(exists) || null;
  };

  it('every URL is a built page', () => {
    expect(locs.length).toBeGreaterThan(300);
    for (const loc of locs) expect(fileFor(loc), loc).not.toBeNull();
  });

  it('no noindex page and no app URL is in it', () => {
    for (const loc of locs) {
      expect(loc).not.toMatch(/\/app(\/|\.html|\?|$)/);
      expect(read(fileFor(loc)), loc).not.toMatch(/<meta name="robots" content="noindex/);
    }
  });
});

describe('homepage and hub claims match the data', () => {
  const home = read('public/index.html');

  it('the Capital One card states the mock as built: 12 MCQ + 2 written SQL', () => {
    const mocks = read('src/data/mock-interviews.js');
    const block = mocks.slice(mocks.indexOf("id: 'capital-one-codesignal'"), mocks.indexOf("id: 'capital-one-codesignal'") + 3000);
    expect(block).toMatch(/questionsCount: 14, \/\/ 12 multiple choice .* \+ 2 written SQL/);
    expect(home).toContain('12 MCQ + 2 written SQL');
    expect(home).not.toMatch(/8 MCQ \+ 6 written/);
  });

  it('the Turkish banner is not in the served HTML — the script writes it for a Turkish visitor', () => {
    expect(home).toMatch(/<div class="tr-banner" id="trBanner" lang="tr"><\/div>/);
    const visible = home.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
    expect(visible).not.toContain('SQL Quest artık Türkçe');
  });

  it('the interview hub title and description state the live counts', () => {
    const hub = read('public/sql-interview-prep/index.html');
    const companies = fs.readdirSync(path.join(ROOT, 'public')).filter(d => /-sql-interview$/.test(d) && exists(`public/${d}/index.html`)).length;
    expect(companies).toBeGreaterThanOrEqual(30);
    const title = hub.match(/<title>([^<]*)<\/title>/)[1];
    expect(title).toContain(`${companies} Company Tracks`);
    expect(hub).toContain(`${bankCountLabel(BANK.challengeCount)} challenges`);
    expect(hub).not.toMatch(/12 Company-Specific Tracks|200\+ challenges/);
  });

  it('every "N of M" free-share claim on the site is the one pair from the bank', () => {
    const free = BANK.freeChallengeCount;
    const label = bankCountLabel(BANK.challengeCount);
    for (const f of htmlFiles('public')) {
      const text = read(f).replace(/<!--[\s\S]*?-->/g, '');
      for (const m of text.matchAll(/\b(\d{3}) of (?:the )?(\d{3}\+?)(?!\d)/g)) {
        if (/accounts|rows|transactions/.test(text.slice(m.index, m.index + 60))) continue;   // dataset facts, not the bank
        expect(`${m[1]} of ${m[2]}`, f).toBe(`${free} of ${label}`);
      }
    }
  });
});
