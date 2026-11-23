// Crawler signatures stamped at the source (2026-11-23, B2).
// One fire / no-fire pair per rule, on fixtures shaped like the rows read in
// pro_events that day (user agents and window sizes as the crawlers sent
// them; no person's data), plus: the landing tracker's ES5 copy gives the
// module's answer on every input, the app passes what the rules read, and
// the read-side view and content_funnel carry the hand rules for the rows
// written before the stamp.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {
  CRAWLER_SIGNATURES, crawlerSignature, staleUserAgent, phoneAgentOnDesktop, readPriorAid, botSignals, LANGS2_ZONES,
} from '../src/utils/bot-signals.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

// Agents as the 2026-11-22/23 waves sent them.
const UA = {
  chrome117: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.132 Safari/537.36',
  chrome125: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.60 Safari/537.36',
  firefox109: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0',
  ios10: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1',
  nexus5: 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
  iphone18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  androidK: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36',
  // People: current browsers, and the oldest agents a real solver has used.
  chrome156: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
  chrome141: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  firefox112: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  android16: 'Mozilla/5.0 (Linux; Android 16; SM-S921U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  androidTablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36',
};

describe('vp1600x1200 — the UTC wave\'s window', () => {
  it('fires on a 1600x1200 window whatever the agent says', () => {
    expect(crawlerSignature({ userAgent: UA.chrome156, viewport: 'desktop:1600x1200' }, 'landing')).toBe('vp1600x1200');
    expect(crawlerSignature({ userAgent: UA.chrome117, viewport: 'desktop:1600x1200' }, 'app')).toBe('vp1600x1200');
  });
  it('does not fire on ordinary desktop windows', () => {
    for (const vp of ['desktop:1600x900', 'desktop:1920x1080', 'desktop:1200x1600', 'tablet:1000x1200']) {
      expect(crawlerSignature({ userAgent: UA.chrome156, viewport: vp }, 'landing'), vp).toBe(null);
    }
  });
});

describe('staleua — an agent older than any person who has acted', () => {
  it('fires on Chrome < 126, Firefox < 110, iOS < 13 and Android < 7 (the Nexus 5 emulation string)', () => {
    for (const k of ['chrome117', 'chrome125', 'firefox109', 'ios10', 'nexus5']) {
      expect(staleUserAgent(UA[k]), k).toBe(true);
      expect(crawlerSignature({ userAgent: UA[k], viewport: 'mobile:375x667' }, 'landing'), k).toBe('staleua');
    }
  });
  it('does not fire on current agents, nor on the oldest a real solver used (Chrome 141, Firefox 112)', () => {
    for (const k of ['chrome156', 'chrome141', 'firefox112', 'safariMac', 'android16', 'iphone18', 'ipad', 'androidTablet']) {
      expect(staleUserAgent(UA[k]), k).toBe(false);
    }
    expect(staleUserAgent('')).toBe(false);
    expect(staleUserAgent(null)).toBe(false);
  });
});

describe('uamismatch — a phone\'s agent in a desktop window', () => {
  it('fires on an iPhone or an Android phone agent at a desktop size', () => {
    expect(phoneAgentOnDesktop(UA.iphone18, 'desktop:1920x1080')).toBe(true);
    expect(crawlerSignature({ userAgent: UA.androidK, viewport: 'desktop:1920x1080' }, 'landing')).toBe('uamismatch');
    expect(crawlerSignature({ userAgent: UA.iphone18, viewport: 'desktop:1280x800' }, 'app')).toBe('uamismatch');
  });
  it('does not fire on a phone at a phone size, an iPad, an Android tablet, or a desktop agent', () => {
    expect(phoneAgentOnDesktop(UA.iphone18, 'mobile:390x844')).toBe(false);
    expect(phoneAgentOnDesktop(UA.androidK, 'tablet:800x1280')).toBe(false);
    expect(phoneAgentOnDesktop(UA.ipad, 'desktop:1180x820')).toBe(false);
    expect(phoneAgentOnDesktop(UA.androidTablet, 'desktop:1280x800')).toBe(false);
    expect(phoneAgentOnDesktop(UA.chrome156, 'desktop:1920x1080')).toBe(false);
    expect(phoneAgentOnDesktop(UA.iphone18, null)).toBe(false);
  });
});

describe('langs2nolv — the langs = 2 cluster that never loaded the page it names', () => {
  const crawler = {
    userAgent: UA.chrome156, viewport: 'mobile:667x375', languages: ['zh-CN', 'zh'],
    landingSrc: null, arrivalSrc: 'netflix-sql-interview', tz: 'Asia/Hong_Kong', priorAid: false,
  };
  it('fires on a first visit to /app/?src=<page> with no landing source, two languages, a cluster zone', () => {
    expect(crawlerSignature(crawler, 'app')).toBe('langs2nolv');
    expect(crawlerSignature({ ...crawler, viewport: 'desktop:1236x1006', tz: 'America/Mexico_City', arrivalSrc: 'challenges-aggregation', landingSrc: '' }, 'app')).toBe('langs2nolv');
    for (const tz of LANGS2_ZONES) expect(crawlerSignature({ ...crawler, tz }, 'app'), tz).toBe('langs2nolv');
  });
  it('does not fire when any clause is missing, nor on the landing tracker', () => {
    expect(crawlerSignature({ ...crawler, priorAid: true }, 'app'), 'browser loaded a page before').toBe(null);
    expect(crawlerSignature({ ...crawler, priorAid: null }, 'app'), 'storage unreadable').toBe(null);
    expect(crawlerSignature({ ...crawler, landingSrc: 'search:google' }, 'app'), 'a landing source').toBe(null);
    expect(crawlerSignature({ ...crawler, languages: ['zh-CN'] }, 'app'), 'one language').toBe(null);
    expect(crawlerSignature({ ...crawler, languages: ['en-US', 'en', 'tr'] }, 'app'), 'three languages').toBe(null);
    expect(crawlerSignature({ ...crawler, languages: null }, 'app'), 'no languages').toBe(null);
    expect(crawlerSignature({ ...crawler, arrivalSrc: null }, 'app'), 'no door').toBe(null);
    expect(crawlerSignature({ ...crawler, arrivalSrc: 'home' }, 'app'), 'home door').toBe(null);
    // The two real solvers the rule without a zone would take (28 days to 2026-11-23).
    expect(crawlerSignature({ ...crawler, tz: 'America/Chicago', arrivalSrc: 'sql-cheat-sheet', viewport: 'desktop:1145x587' }, 'app')).toBe(null);
    expect(crawlerSignature({ ...crawler, tz: 'Asia/Calcutta', arrivalSrc: 'challenges-window-functions', viewport: 'desktop:1528x732' }, 'app')).toBe(null);
    expect(crawlerSignature(crawler, 'landing'), 'app only').toBe(null);
  });
  it('the prior aid is read from storage: present, absent, unreadable', () => {
    const store = v => ({ getItem: () => v });
    expect(readPriorAid(store('0123456789abcdef0123456789abcdef'))).toBe(true);
    expect(readPriorAid(store(null))).toBe(false);
    expect(readPriorAid(store('guest'))).toBe(false);
    expect(readPriorAid({ getItem: () => { throw new Error('blocked'); } })).toBe(null);
    expect(readPriorAid(null)).toBe(null);
  });
});

describe('the table', () => {
  it('has the four ids, each with a measured start date; only langs2nolv is app-only', () => {
    expect(CRAWLER_SIGNATURES.map(s => s.id)).toEqual(['vp1600x1200', 'staleua', 'uamismatch', 'langs2nolv']);
    for (const s of CRAWLER_SIGNATURES) expect(s.since, s.id).toMatch(/^2026-\d\d-\d\d$/);
    expect(CRAWLER_SIGNATURES.filter(s => s.appOnly).map(s => s.id)).toEqual(['langs2nolv']);
  });
  it('a self-declared bot is still hard (dropped), not a signature', () => {
    expect(botSignals({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1)' }).hard).toBe(true);
  });
});

// ── src/track.js: the ES5 copy stamps the same landing rows ──────────────
function runTracker({ userAgent, innerWidth = 1440, innerHeight = 900, tz = 'UTC', referrer = '' }) {
  const store = new Map();
  const calls = [];
  const ctx = {
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    location: { hostname: 'sqlquest.app', pathname: '/stripe-sql-interview/', search: '', href: 'https://sqlquest.app/stripe-sql-interview/' },
    document: { referrer, visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    navigator: { userAgent, webdriver: false },
    innerWidth, innerHeight,
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: tz }) }) },
    fetch: (url, opts) => { calls.push(JSON.parse(opts.body)); return Promise.resolve({ ok: true }); },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read('src/track.js'), ctx, { filename: 'track.js' });
  const lv = calls.find(c => c.event === 'landing_view');
  return lv ? JSON.parse(lv.metadata) : null;
}

describe('src/track.js — crawler signatures on landing rows', () => {
  it('stamps the UTC wave\'s shapes and leaves people alone — and sends both', () => {
    expect(runTracker({ userAgent: UA.chrome117, innerWidth: 1600, innerHeight: 1200, referrer: 'https://bing.com/' }).bot).toBe('vp1600x1200');
    expect(runTracker({ userAgent: UA.firefox109, innerWidth: 1920, innerHeight: 1080 }).bot).toBe('staleua');
    expect(runTracker({ userAgent: UA.iphone18, innerWidth: 1920, innerHeight: 1080 }).bot).toBe('uamismatch');
    const person = runTracker({ userAgent: UA.chrome156, innerWidth: 1920, innerHeight: 1080, tz: 'Europe/Istanbul' });
    expect(person, 'a person is sent').toBeTruthy();
    expect(person).not.toHaveProperty('bot');
  });

  it('gives the module\'s answer on every input (window fingerprints first, then signatures)', () => {
    const sizes = [[1600, 1200], [1920, 1080], [375, 667], [800, 600], [1440, 900], [780, 493]];
    let n = 0;
    for (const ua of Object.values(UA)) for (const [w, h] of sizes) {
      const meta = runTracker({ userAgent: ua, innerWidth: w, innerHeight: h, tz: 'UTC' });
      const want = botSignals({ userAgent: ua, viewport: meta.viewport, landingSrc: meta.landingSrc, tz: 'UTC' }).soft
        || crawlerSignature({ userAgent: ua, viewport: meta.viewport }, 'landing');
      expect(meta.bot ?? null, `${meta.viewport} ${ua}`).toBe(want);
      n++;
    }
    expect(n).toBe(Object.keys(UA).length * sizes.length);
  });
});

// ── app.jsx hands the rules what they read ──────────────────────────────
describe('app.jsx applies the signatures', () => {
  const app = read('src/app.jsx');
  const t = app.slice(app.indexOf('const trackActivationEvent = (event, metadata = {}, options = {}) => {'), app.indexOf('// A save the server refused as a regression'));
  it('calls crawlerSignature with the agent, window, languages, door, landing source, zone and prior aid, before the write', () => {
    const call = t.slice(t.indexOf('crawlerSignature({'), t.indexOf("}, 'app');"));
    for (const s of ['userAgent: navigator.userAgent', 'viewport: payload.viewport', 'languages: navigator.languages',
      'landingSrc: payload.landingSrc', 'arrivalSrc: payload.arrivalSrc', 'tz: payload.tz', 'priorAid: PRIOR_AID_AT_LOAD']) {
      expect(call, s).toContain(s);
    }
    expect(t.indexOf('if (sig) payload.bot = sig;')).toBeGreaterThan(-1);
    expect(t.indexOf('if (sig) payload.bot = sig;')).toBeLessThan(t.indexOf("writeProEvent(event, 'activation_funnel', payload)"));
    // An earlier fingerprint keeps its id; a hard bot is never written anyway.
    expect(t).toMatch(/if \(!payload\.bot && decision\.write\) \{/);
  });
  it('PRIOR_AID_AT_LOAD is read when the module loads, before anything can mint an aid', () => {
    const mod = read('src/utils/bot-signals.js');
    expect(mod).toMatch(/export const PRIOR_AID_AT_LOAD = readPriorAid\(\);/);
    expect(mod.replace(/\/\/[^\n]*/g, '')).not.toMatch(/getAnonId|anon-id/);
    expect(read('src/app.html')).not.toMatch(/sqlquest_aid/);
  });
});

// ── the read side: the view and content_funnel carry the hand rules ─────
describe('the read side', () => {
  const view = read('supabase/migrations/20261123180000_crawler_people_view.sql');
  it('crawler_people names every rule, stamped and by hand, and is closed to the browser key', () => {
    for (const s of ["m->>'bot'", 'tablet:800x600', 'desktop:1280x1200', 'desktop:1919x992', 'desktop:1600x1200', 'aocr', "'challenges-%'", "m->>'langs' = '2'",
      "'Asia/Shanghai'", "m->>'tz' = 'UTC'", "'2026-11-22'", 'Chrome/', 'Firefox/', 'iPhone OS', 'Android', 'security_invoker = true',
      "'staleua'", "'uamismatch'", "'topic1lang'", "'langs2nolv'", "'cn_nosrc_lander'", "'utc_lander'"]) {
      expect(view, s).toContain(s);
    }
    expect(view).toMatch(/revoke all on public\.crawler_people from public, anon, authenticated;/);
    expect(view).not.toMatch(/grant select on public\.crawler_people to (anon|authenticated)/);
  });
  it('the behavioural rules only ever take people who never opened the app', () => {
    // Shanghai with no source and the UTC wave: by hand, so a person who
    // opened the app is kept, whatever the time zone.
    for (const rule of ["'cn_nosrc_lander'", "'utc_lander'"]) {
      const at = view.indexOf(rule);
      expect(at, rule).toBeGreaterThan(-1);
      const clause = view.slice(at, view.indexOf('UNION ALL', at) > 0 ? view.indexOf('UNION ALL', at) : view.indexOf(')\nSELECT', at));
      expect(clause, rule).toMatch(/NOT EXISTS \(SELECT 1 FROM app_openers o WHERE o\.pid = e\.pid\)/);
    }
    expect(view.slice(view.indexOf("'cn_nosrc_lander'"))).toMatch(/e\.m->>'tz' = 'Asia\/Shanghai'\s+AND COALESCE\(e\.m->>'landingSrc', ''\) = ''/);
    expect(view.slice(view.indexOf("'utc_lander'"))).toMatch(/e\.m->>'tz' = 'UTC'\s+AND e\.created_at >= '2026-11-22'/);
    // Keyed on aid only: an aid-less row is 'guest' or a real username.
    expect(view).toMatch(/\(metadata #>> '\{\}'\)::jsonb->>'aid' AS pid/);
    expect(view.replace(/--[^\n]*/g, '')).not.toMatch(/COALESCE\([^)]*aid[^)]*username/i);
  });
  it('content_funnel keeps an app opener whatever the zone', () => {
    const sql = read('scripts/content-funnel.sql');
    expect(sql).toMatch(/pid NOT IN \(SELECT pid FROM app_openers\)\s+AND \(\s+\(m->>'tz' = 'Asia\/Shanghai' AND COALESCE\(m->>'landingSrc', ''\) = ''\)/);
  });
  it('content_funnel drops the same landing crawlers', () => {
    const sql = read('scripts/content-funnel.sql');
    for (const s of ['desktop:1600x1200', "'Asia/Shanghai'", "m->>'tz' = 'UTC'", 'Chrome/', 'Firefox/', 'iPhone OS']) expect(sql, s).toContain(s);
  });
});
