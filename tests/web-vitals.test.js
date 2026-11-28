// SQL Quest — real-user page speed (metric `web_vitals`, 2026-11-24)
//
// Ledger claim "real-user speed is measured": src/track.js (every static
// page) and the /app shell load Google's web-vitals lazily and write one
// `web_vital` row per metric per page load. What these tests pin:
//   1. The payload is an allowlist: no URL, no query string, no referrer, no
//      DOM entries — even when the page URL, the referrer and the metric's
//      entries all carry a query string and an email address.
//   2. One row per metric per page load: a second report of the same metric
//      (CLS/INP grow; bfcache restores start new ones) writes nothing.
//   3. A bot user agent, a soft crawler fingerprint, localhost and an
//      internal account never even load the library.
//   4. The ES5 copy in track.js and src/utils/web-vitals-report.js agree on
//      the same inputs, and the version is one number in four places
//      (package.json exact pin, the module, track.js, the built file).
//   5. app.jsx arms it once, on the settled session, through
//      trackActivationEvent with page 'app'.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {
  WEB_VITALS_VERSION, VITAL_NAMES, vitalPayload, vitalDevice, isInternalUser, armWebVitals,
} from '../src/utils/web-vitals-report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const trackSource = readFileSync(path.join(root, 'src/track.js'), 'utf8');
const appSource = readFileSync(path.join(root, 'src/app.jsx'), 'utf8');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

const REAL_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// A fake web-vitals: records each on* callback so a test can fire reports.
function fakeWebVitals() {
  const cbs = {};
  const lib = {};
  for (const n of ['onLCP', 'onINP', 'onCLS', 'onFCP', 'onTTFB']) {
    lib[n] = cb => { (cbs[n.slice(2)] = cbs[n.slice(2)] || []).push(cb); };
  }
  const fire = (name, metric) => (cbs[name] || []).forEach(cb => cb({ name, ...metric }));
  return { lib, fire, cbs };
}

const LEAKY = 'https://sqlquest.app/sql-exercises/?email=jane%40example.com&utm_source=x';
const leakyMetric = extra => ({
  // 6.2.3's real report also carries navigationURL (seen in a browser,
  // 2026-11-24): the page's full URL, query string included.
  value: 1234.567, rating: 'needs-improvement', delta: 10, id: 'v5-123', navigationType: 'navigate',
  navigationURL: LEAKY, navigationId: 'n1',
  entries: [{ url: LEAKY, element: { outerHTML: '<img src="?email=jane@example.com">' } }],
  attribution: { url: LEAKY, target: 'div#x' },
  ...extra,
});

// Run the real track.js in a vm against a stubbed browser, through load, idle
// and the script's onload. Returns every fetch body and the injected scripts.
function runTracker({
  userAgent = REAL_UA, hostname = 'sqlquest.app', pathname = '/sql-exercises/',
  search = '?email=jane%40example.com&utm_source=chatgpt.com', referrer = LEAKY,
  innerWidth = 390, innerHeight = 844, tz = 'Europe/London', store = new Map(),
} = {}) {
  const calls = [];
  const scripts = [];
  const winListeners = {};
  const wv = fakeWebVitals();
  const ctx = {
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: k => { store.delete(k); },
    },
    location: { hostname, pathname, search, href: `https://${hostname}${pathname}${search}` },
    document: {
      referrer,
      readyState: 'interactive',
      visibilityState: 'visible',
      addEventListener() {},
      removeEventListener() {},
      createElement: tag => ({ tagName: tag }),
      head: { appendChild: el => { scripts.push(el); } },
    },
    navigator: { userAgent, webdriver: false },
    innerWidth,
    innerHeight,
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ timeZone: tz }) }) },
    addEventListener: (type, fn) => { (winListeners[type] = winListeners[type] || []).push(fn); },
    requestIdleCallback: fn => fn(),
    setTimeout: fn => fn(),
    fetch: (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      return Promise.resolve({ ok: true });
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(trackSource, ctx, { filename: 'track.js' });
  // The page finishes loading; the idle callback injects the script; it loads.
  (winListeners.load || []).forEach(fn => fn({ type: 'load' }));
  for (const s of scripts) { ctx.webVitals = wv.lib; if (s.onload) s.onload(); }
  const vitals = () => calls.filter(c => c.body.event === 'web_vital');
  return { calls, scripts, fire: wv.fire, vitals, ctx };
}
const metaOf = call => JSON.parse(call.body.metadata);

describe('web_vital payload — an allowlist, never a URL', () => {
  it('keeps exactly name, value, rating, device, navType, lib', () => {
    const p = vitalPayload({ name: 'LCP', ...leakyMetric() }, 390);
    expect(p).toEqual({ name: 'LCP', value: 1235, rating: 'needs-improvement', device: 'mobile', navType: 'navigate', lib: WEB_VITALS_VERSION });
  });

  it('rounds CLS to 4 decimals and the timings to whole ms', () => {
    expect(vitalPayload({ name: 'CLS', value: 0.123456 }, 1440).value).toBe(0.1235);
    expect(vitalPayload({ name: 'TTFB', value: 88.6 }, 1440).value).toBe(89);
  });

  it('refuses a metric it does not know, or a value that is not a number', () => {
    expect(vitalPayload({ name: 'FID', value: 10 }, 1440)).toBeNull();
    expect(vitalPayload({ name: 'LCP', value: NaN }, 1440)).toBeNull();
    expect(vitalPayload({ name: 'LCP', value: -1 }, 1440)).toBeNull();
    expect(vitalPayload(null, 1440)).toBeNull();
  });

  it('device: mobile below 768 px, desktop from 768 (tablets fold in)', () => {
    expect(vitalDevice(375)).toBe('mobile');
    expect(vitalDevice(767)).toBe('mobile');
    expect(vitalDevice(768)).toBe('desktop');
    expect(vitalDevice(0)).toBeNull();
  });

  it('the row track.js sends carries no query string, referrer, email or UA', () => {
    const { fire, vitals } = runTracker();
    for (const name of VITAL_NAMES) fire(name, leakyMetric());
    expect(vitals()).toHaveLength(5);
    for (const c of vitals()) {
      const raw = c.body.metadata;
      expect(raw).not.toMatch(/\?|jane|example\.com|%40|outerHTML|Mozilla/);
      const m = metaOf(c);
      expect(m.ref).toBeUndefined();
      expect(m.ua).toBeUndefined();
      expect(m.page).toBe('sql-exercises');
      expect(m.device).toBe('mobile');
      expect(m.lib).toBe(WEB_VITALS_VERSION);
      expect(m.aid).toMatch(/^[0-9a-f]{32}$/);
    }
  });

  it('landing_view still carries its referrer (only web_vital drops it)', () => {
    const { calls } = runTracker({ referrer: 'https://www.bing.com/' });
    const lv = calls.find(c => c.body.event === 'landing_view');
    expect(metaOf(lv).ref).toBe('https://www.bing.com/');
  });
});

describe('one web_vital per metric per page load', () => {
  it('a second report of the same metric writes nothing', () => {
    const { fire, vitals } = runTracker();
    fire('CLS', { value: 0.01, rating: 'good' });
    fire('CLS', { value: 0.3, rating: 'poor' });
    fire('INP', { value: 120, rating: 'good' });
    fire('INP', { value: 640, rating: 'poor' });
    fire('LCP', { value: 2100, rating: 'good' });
    const names = vitals().map(c => metaOf(c).name).sort();
    expect(names).toEqual(['CLS', 'INP', 'LCP']);
    expect(metaOf(vitals().find(c => metaOf(c).name === 'CLS')).value).toBe(0.01);
  });

  it('the library is injected once, lazily, from our own origin', () => {
    const { scripts } = runTracker();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe('/web-vitals.js');
    expect(scripts[0].async).toBe(true);
  });

  it('the app module dedupes the same way and arms once per document', () => {
    const sent = [];
    const wv = fakeWebVitals();
    const scripts = [];
    const win = { innerWidth: 1440, requestIdleCallback: fn => fn(), addEventListener() {}, setTimeout: fn => fn() };
    const doc = { readyState: 'complete', createElement: () => ({}), head: { appendChild: s => scripts.push(s) } };
    expect(armWebVitals({ win, doc, send: p => sent.push(p) })).toBe(true);
    expect(armWebVitals({ win, doc, send: p => sent.push(p) })).toBe(false);
    win.webVitals = wv.lib;
    scripts[0].onload();
    wv.fire('LCP', { value: 3000, rating: 'needs-improvement', navigationType: 'reload' });
    wv.fire('LCP', { value: 5000, rating: 'poor' });
    expect(scripts).toHaveLength(1);
    expect(sent).toEqual([{ name: 'LCP', value: 3000, rating: 'needs-improvement', device: 'desktop', navType: 'reload', lib: WEB_VITALS_VERSION }]);
  });
});

describe('who is never measured', () => {
  it('a bot user agent loads nothing and sends nothing', () => {
    const { scripts, calls } = runTracker({ userAgent: BOT_UA });
    expect(scripts).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });

  it('a soft crawler fingerprint (tablet:800x600) loads nothing', () => {
    const { scripts, vitals } = runTracker({ innerWidth: 800, innerHeight: 600 });
    expect(scripts).toHaveLength(0);
    expect(vitals()).toHaveLength(0);
  });

  it('localhost loads nothing', () => {
    expect(runTracker({ hostname: 'localhost' }).scripts).toHaveLength(0);
  });

  it('an internal account loads nothing; a guest or a real user does', () => {
    expect(runTracker({ store: new Map([['sqlquest_user', 'test2']]) }).scripts).toHaveLength(0);
    expect(runTracker({ store: new Map([['sqlquest_user', 'fabletestux']]) }).scripts).toHaveLength(0);
    expect(runTracker({ store: new Map([['sqlquest_user', 'priya_k']]) }).scripts).toHaveLength(1);
  });

  it('the app module arms nothing when blocked', () => {
    const win = { innerWidth: 390, requestIdleCallback: fn => fn(), addEventListener() {} };
    const doc = { readyState: 'complete', createElement: () => ({}), head: { appendChild() { throw new Error('loaded'); } } };
    expect(armWebVitals({ win, doc, send() {}, blocked: true })).toBe(false);
    expect(win.__sqVitalsArmed).toBeUndefined();
  });
});

describe('track.js and the module cannot drift', () => {
  const m = /\/\/ WEB_VITALS:begin([\s\S]*?)\/\/ WEB_VITALS:end/.exec(trackSource);
  const inline = vm.runInNewContext(`${m[1]}; ({ vitalPayload, vitalDevice, isInternalUser, VITALS_LIB, VITALS_SRC })`);

  it('same payload for the same report', () => {
    const inputs = [
      [{ name: 'LCP', value: 2600.4, rating: 'needs-improvement', navigationType: 'back-forward-cache' }, 390],
      [{ name: 'CLS', value: 0.000049, rating: 'good', navigationType: 'prerender' }, 1024],
      [{ name: 'INP', value: 512, rating: 'poor', navigationType: 'soft-navigation' }, 800],
      [{ name: 'FCP', value: 1, rating: 'weird' }, undefined],
      [{ name: 'FID', value: 1 }, 390],
    ];
    for (const [metric, w] of inputs) {
      expect(JSON.parse(JSON.stringify(inline.vitalPayload(metric, w)))).toEqual(vitalPayload(metric, w));
    }
  });

  it('same internal-account rule', () => {
    for (const u of ['test', 'test2', 'qa3', 'sqlquest', 'fabletestux', 'linktest348013', 'internalroutine768',
      'guest', 'guest_1732000000', '', null, 'priya_k', 'tester', 'elena']) {
      expect(inline.isInternalUser(u), String(u)).toBe(isInternalUser(u));
    }
  });

  it('one version in four places: package.json pin, module, track.js, built file', () => {
    expect(pkg.dependencies['web-vitals']).toBe(WEB_VITALS_VERSION);
    expect(inline.VITALS_LIB).toBe(WEB_VITALS_VERSION);
    expect(inline.VITALS_SRC).toBe('/web-vitals.js');
    const built = path.join(root, 'public/web-vitals.js');
    if (existsSync(built)) {
      const head = readFileSync(built, 'utf8').slice(0, 200);
      expect(head).toContain(`web-vitals ${WEB_VITALS_VERSION}`);
      expect(head).toContain('var webVitals=');
    }
  });
});

describe('app.jsx wiring', () => {
  it('arms once on the settled session, page app, through trackActivationEvent', () => {
    expect(appSource).toMatch(/import \{ armWebVitals, isInternalUser \} from '\.\/utils\/web-vitals-report\.js'/);
    const at = appSource.indexOf('armWebVitals({');
    expect(at).toBeGreaterThan(0);
    const block = appSource.slice(at - 1500, at + 600);
    expect(block).toMatch(/if \(isSessionLoading\) return;/);
    expect(block).toMatch(/trackActivationEventRef\.current\('web_vital', \{ \.\.\.payload, page: 'app' \}\)/);
    expect(block).toMatch(/blocked: ANALYTICS_MUTED \|\| hardBotBrowser\(\)/);
    expect(block).toMatch(/isInternalUser\(currentUser\)/);
    // Hooks above the early returns (CLAUDE.md fragile area 1).
    expect(at).toBeLessThan(appSource.indexOf('if (showAuth) {'));
  });
});
