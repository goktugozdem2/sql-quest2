// Technical SEO checks from the GSC pipeline task (2026-09-25, item 6),
// pinned against the BUILT pages in public/ — what crawlers are served.
// Each was checked live the same day (and against Google's own URL
// Inspection for the app URLs); these tests keep them true.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { collectBankFacts } from '../scripts/build-llms-txt.js';
import { bankCountLabel } from '../src/utils/display-count.js';
import { freeTierFlags } from './free-tier-state.js';

const QUOTA_ON = freeTierFlags().freeQuota;

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

describe('one host: every other host the project answers on redirects to sqlquest.app', () => {
  // 2026-11-25 (G1, R1-3): sql-quest2.vercel.app served a full 200 copy of
  // the site; search engines indexed it and the week's only AI-search
  // citation credited sql-quest2.vercel.app/llms.txt instead of sqlquest.app.
  //
  // 2026-11-26 (live QA §4): the single `/:path*` rule fired for /app.js,
  // /robots.txt and /sitemap.xml but never for /, /app/, /blog/ or
  // /sql-exercises/. Cause, read in @vercel/routing-utils: a redirect source
  // is compiled by path-to-regexp v6 with `strict: true`, so `/:path*`
  // cannot match a path that ends in "/", and under `trailingSlash: true`
  // every page ends in "/". The fix is a `/` and a `/:path*/` entry per
  // host, ahead of `/:path*`. This block simulates Vercel's order
  // (trailingSlash routes, then redirects) with that compiler's output.
  const config = JSON.parse(read('vercel.json'));
  const redirects = config.redirects;
  const HOSTS = { 'www.sqlquest.app': 308, 'sql-quest2.vercel.app': 301 };

  // path-to-regexp v6, { strict: true, sensitive: true, delimiter: '/' },
  // for the only syntax host rules use: literals, `/:name`, `/:name*`.
  const SEG = '[^\\/#\\?]+?';
  function sourceToRegex(source) {
    if (/[()?+]/.test(source)) throw new Error(`unsupported source in host rule: ${source}`);
    const names = [];
    let re = '';
    let rest = source;
    while (rest) {
      const m = rest.match(/^\/:(\w+)(\*?)/);
      if (m) {
        names.push(m[1]);
        re += m[2] ? `(?:\\/((?:${SEG})(?:\\/(?:${SEG}))*))?` : `\\/(${SEG})`;
        rest = rest.slice(m[0].length);
      } else {
        re += rest[0].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
        rest = rest.slice(1);
      }
    }
    return { re: new RegExp(`^${re}$`), names };
  }
  const fill = (dest, names, m) => names.reduce((d, n, i) =>
    d.replace(new RegExp(`/:${n}\\*?`), m[i + 1] === undefined ? '' : `/${m[i + 1]}`), dest);
  const statusOf = (r) => r.statusCode ?? (r.permanent === false ? 307 : 308);

  // convertTrailingSlash(true) in @vercel/routing-utils, then the redirects.
  const TRAILING = [
    { re: /^\/\.well-known(?:\/.*)?$/, stop: true },
    { re: /^\/((?:[^/]+\/)*[^/.]+)$/, to: (m) => `/${m[1]}/` },
    { re: /^\/((?:[^/]+\/)*[^/]+\.\w+)\/$/, to: (m) => `/${m[1]}` },
  ];
  function hop(host, path) {
    if (config.trailingSlash === true) {
      for (const t of TRAILING) {
        const m = path.match(t.re);
        if (m) { if (t.stop) return null; return { status: 308, location: t.to(m) }; }
      }
    }
    for (const r of redirects) {
      const hostHas = (r.has || []).find(h => h.type === 'host');
      if (!hostHas || hostHas.value !== host) continue;   // path-only rules are not under test here
      const { re, names } = sourceToRegex(r.source);
      const m = path.match(re);
      if (m) return { status: statusOf(r), location: fill(r.destination, names, m) };
    }
    return null;
  }
  // Follows hops the way a client does; returns the first off-host hop.
  function resolve(host, path) {
    for (let i = 0; i < 4; i++) {
      const h = hop(host, path);
      if (!h) return { served: `${host}${path}` };
      if (/^https?:\/\//.test(h.location)) return h;
      path = h.location;
    }
    throw new Error('redirect loop');
  }

  const CASES = [
    ['/', 'https://sqlquest.app/'],
    ['/app/', 'https://sqlquest.app/app/'],
    ['/blog/', 'https://sqlquest.app/blog/'],
    ['/sql-exercises/', 'https://sqlquest.app/sql-exercises/'],
    ['/questions/second-highest-salary/', 'https://sqlquest.app/questions/second-highest-salary/'],
    ['/sql-exercises', 'https://sqlquest.app/sql-exercises/'],   // trailing-slash hop on the host first
    ['/app.js', 'https://sqlquest.app/app.js'],
    ['/robots.txt', 'https://sqlquest.app/robots.txt'],
    ['/sitemap.xml', 'https://sqlquest.app/sitemap.xml'],
  ];

  for (const [host, status] of Object.entries(HOSTS)) {
    for (const [path, want] of CASES) {
      it(`${host}${path} → ${want} (${status})`, () => {
        const got = resolve(host, path);
        expect(got.location, `${host}${path} was served on that host`).toBe(want);
        expect(got.status).toBe(status);
      });
    }
    it(`${host}: "/" and "/:path*/" sit ahead of "/:path*"`, () => {
      const idx = (src) => redirects.findIndex(r => r.source === src && (r.has || []).some(h => h.type === 'host' && h.value === host));
      expect(idx('/')).toBeGreaterThanOrEqual(0);
      expect(idx('/:path*/')).toBeGreaterThanOrEqual(0);
      expect(idx('/:path*')).toBeGreaterThan(Math.max(idx('/'), idx('/:path*/')));
    });
  }

  it('sqlquest.app itself is never redirected by a host rule', () => {
    for (const p of ['/', '/sql-exercises/', '/app.js']) expect(resolve('sqlquest.app', p)).toEqual({ served: `sqlquest.app${p}` });
  });

  it('a host rule sets permanent or statusCode, never both (Vercel rejects the config)', () => {
    for (const r of redirects.filter(r => (r.has || []).some(h => h.type === 'host'))) {
      expect('permanent' in r && 'statusCode' in r, r.source).toBe(false);
    }
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

  it('a company page title that counts its problems states its tagged-challenge count', () => {
    // Shopify, 2026-09-25: "(2026): 15 Practice Problems" — the count must follow the tags.
    let checked = 0;
    for (const c of BANK.companies) {
      const f = `public/${c.slug}/index.html`;
      if (!exists(f)) continue;
      const m = read(f).match(/<title>[^<]*?(\d+) Practice Problems/);
      if (!m) continue;
      expect(Number(m[1]), c.slug).toBe(c.taggedChallenges);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(1);
  });

  it('every "N of M" free-share claim on the site is the one pair from the bank', () => {
    const free = BANK.freeChallengeCount;
    const label = bankCountLabel(BANK.challengeCount);
    for (const f of htmlFiles('public')) {
      const text = read(f).replace(/<!--[\s\S]*?-->/g, '');
      for (const m of text.matchAll(/\b(\d{3}) of (?:the )?(\d{3}\+?)(?!\d)/g)) {
        if (/accounts|rows|transactions/.test(text.slice(m.index, m.index + 60))) continue;   // dataset facts, not the bank
        // Under the free quota (2026-09-26) there is no free share: any such pair is stale.
        if (QUOTA_ON) expect(`${m[1]} of ${m[2]}`, `${f}: a free-share pair while freeQuota is on`).toBe('');
        else expect(`${m[1]} of ${m[2]}`, f).toBe(`${free} of ${label}`);
      }
    }
  });
});
