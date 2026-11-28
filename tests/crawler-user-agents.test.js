// The upstream crawler list as a stamp (2026-11-24; scripts/vendor-crawler-ua.mjs).
// Pins: the vendored copy is the pinned package's, byte for byte; a fetcher
// the list names and BOT_UA_RE misses is stamped `cuaBot: true` on
// landing_view; the browsers real people used in the week to 11-24 are not;
// and the stamp is a stamp — the landing tracker still writes the row.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { vendor, coveredByOurRegex } from '../scripts/vendor-crawler-ua.mjs';
import { CRAWLER_UA_META, CRAWLER_UA_PATTERNS } from '../src/data/crawler-user-agents.js';
import { isListedCrawler } from '../src/utils/crawler-ua.js';
import { BOT_UA_RE } from '../src/utils/bot-signals.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Seen on landing_view in the 7 days to 2026-11-24 (read-only, aggregates).
// GoogleOther: 116 + 29 people, Google-NotebookLM: 10; none opened the app.
// The mobile GoogleOther string is given whole here — landing_view caps `ua`
// at 160 characters, which cuts it to "…(compatible; GoogleOt".
const LISTED_NOT_OURS = [
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GoogleOther) Chrome/157.0.8103.78 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.8103.78 Mobile Safari/537.36 (compatible; GoogleOther)',
  'Google-NotebookLM',
];

// User agents of people who ran a query, solved or signed up in that week,
// plus the in-app and desktop-app browsers seen alongside them.
const PEOPLE = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:160.0) Gecko/20100101 Firefox/160.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:152.0) Gecko/20100101 Firefox/152.0',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Mobile Safari/537.36 EdgA/157.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 OPR/139.0.0.0 (Edition Yx GX)',
  'Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.1 Mobile/15E148 Safari/604.1 Brave',
  'Mozilla/5.0 (iPad; CPU OS 26_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/158.0.8127.35 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/24A446 Instagram 456.0.0.36.62 (iPhone18,1; iOS 27_0_1;',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/448.4.1021463781 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Claude/6.6395.1 Chrome/156.0.8078.100 Safari/537.36',
  'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
];

describe('crawler-user-agents — the vendored list', () => {
  it('is the exact-pinned package, byte for byte, and current', () => {
    const pkg = JSON.parse(read('package.json'));
    expect(pkg.devDependencies['crawler-user-agents']).toBe(CRAWLER_UA_META.version); // exact, no ^ or ~
    const raw = fs.readFileSync(path.join(ROOT, 'node_modules/crawler-user-agents/crawler-user-agents.json'));
    expect(crypto.createHash('sha256').update(raw).digest('hex')).toBe(CRAWLER_UA_META.sha256);
    const { dataSrc, trackOut } = vendor();
    expect(read('src/data/crawler-user-agents.js'), 'run node scripts/vendor-crawler-ua.mjs').toBe(dataSrc);
    expect(read('src/track.js'), 'run node scripts/vendor-crawler-ua.mjs').toBe(trackOut);
  });

  it('track.js carries the same patterns as the module', () => {
    const m = /var CUA_PATTERNS = (\[.*\]);/.exec(read('src/track.js'));
    expect(m, 'CUA_PATTERNS in src/track.js').toBeTruthy();
    expect(JSON.parse(m[1])).toEqual(CRAWLER_UA_PATTERNS);
    expect(CRAWLER_UA_PATTERNS.length).toBe(CRAWLER_UA_META.kept);
  });

  it('drops only patterns BOT_UA_RE provably covers', () => {
    expect(coveredByOurRegex('Googlebot\\/')).toBe(true);
    expect(coveredByOurRegex('^AdsBot-Google$')).toBe(true);
    expect(coveredByOurRegex('Bot\\d')).toBe(false); // an escape we do not read: kept
    expect(coveredByOurRegex('GoogleOther')).toBe(false);
    expect(coveredByOurRegex('Google-NotebookLM')).toBe(false);
    expect(coveredByOurRegex('foo|bot')).toBe(false);
    expect(coveredByOurRegex('ro?bot')).toBe(false);
    for (const p of CRAWLER_UA_PATTERNS) expect(coveredByOurRegex(p), p).toBe(false);
  });
});

describe('crawler-user-agents — what it stamps', () => {
  it('names the fetchers our own regex lets through', () => {
    for (const ua of LISTED_NOT_OURS) {
      expect(BOT_UA_RE.test(ua), `BOT_UA_RE already drops ${ua}`).toBe(false);
      expect(isListedCrawler(ua), ua).toBe(true);
    }
  });
  it('never names an ordinary browser', () => {
    for (const ua of PEOPLE) expect(isListedCrawler(ua), ua).toBe(false);
    expect(isListedCrawler('')).toBe(false);
    expect(isListedCrawler(null)).toBe(false);
  });
});

describe('crawler-user-agents — a stamp, never a drop', () => {
  const trackSource = read('src/track.js');
  function landingMeta(userAgent) {
    const calls = [];
    const ctx = {
      localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
      location: { hostname: 'sqlquest.app', pathname: '/', search: '', href: 'https://sqlquest.app/' },
      document: { referrer: '', visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
      navigator: { userAgent, webdriver: false },
      innerWidth: 1440, innerHeight: 900,
      Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: 'Europe/London' }) }) },
      fetch: (url, opts) => { calls.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true }); },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(trackSource, ctx, { filename: 'track.js' });
    const lv = calls.find(c => c.event === 'landing_view');
    return lv ? JSON.parse(lv.metadata) : null;
  }

  it('the landing tracker writes a listed fetcher’s landing_view, stamped', () => {
    const m = landingMeta(LISTED_NOT_OURS[0]);
    expect(m, 'landing_view written').toBeTruthy();
    expect(m.cuaBot).toBe(true);
    expect(landingMeta(PEOPLE[0]).cuaBot).toBe(false);
  });

  it('the landing tracker never drops on it', () => {
    const send = trackSource.slice(trackSource.indexOf('function send(event, props) {'), trackSource.indexOf('window.sqTrack = send;'));
    expect(send).not.toMatch(/cuaBot|listedCrawler/);
  });
});
