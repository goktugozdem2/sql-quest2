// Real-user boot timing on app_opened (2026-11-22, BACKLOG item 10).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { bootTiming } from '../src/utils/boot-timing.js';

const ROOT = new URL('../', import.meta.url).pathname;
const read = p => fs.readFileSync(ROOT + p, 'utf8');

const perfWith = (now, entries) => ({
  now: () => now,
  getEntriesByType: t => (t === 'resource' ? entries : []),
});

describe('bootTiming', () => {
  it('reads boot, render, LCP, the two bundles and the connection, in whole ms', () => {
    const perf = perfWith(2412.7, [
      { name: 'https://sqlquest.app/styles.css?v=1', startTime: 10, responseEnd: 50 },
      { name: 'https://sqlquest.app/app.js?v=5ccd4bc1', startTime: 120.2, responseEnd: 980.9 },
      { name: 'https://sqlquest.app/data.js?v=9f315629', startTime: 121, responseEnd: 1731.4 },
    ]);
    expect(bootTiming({ perf, nav: { connection: { effectiveType: '4g' } }, win: { sqRenderMs: 1802.2, sqLcpMs: 2101.5 } }))
      .toEqual({ bootMs: 2413, renderMs: 1802, lcpMs: 2102, appJsMs: 861, dataJsMs: 1610, net: '4g' });
  });

  it('does not mistake another file for app.js (react-dom… / app.js.map / sql-wasm.js)', () => {
    const perf = perfWith(100, [
      { name: 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', startTime: 0, responseEnd: 999 },
      { name: 'https://sqlquest.app/app.js.map', startTime: 0, responseEnd: 999 },
      { name: 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js', startTime: 0, responseEnd: 999 },
    ]);
    const t = bootTiming({ perf, nav: {}, win: {} });
    expect(t.appJsMs).toBeNull();
    expect(t.dataJsMs).toBeNull();
  });

  it('returns nulls, never throws, when the browser exposes nothing', () => {
    expect(bootTiming()).toEqual({ bootMs: null, renderMs: null, lcpMs: null, appJsMs: null, dataJsMs: null, net: null });
    expect(bootTiming({ perf: { now: () => { throw new Error('x'); } } }).bootMs).toBeNull();
    expect(bootTiming({ perf: perfWith(NaN, []), win: { sqLcpMs: -5 } })).toMatchObject({ bootMs: null, lcpMs: null });
  });
});

describe('the app stamps it', () => {
  it('app_opened spreads bootTiming()', () => {
    const app = read('src/app.jsx');
    const at = app.indexOf("trackActivationEvent('app_opened', {");
    expect(at).toBeGreaterThan(0);
    expect(app.slice(at, at + 400)).toMatch(/\.\.\.bootTiming\(\{ perf: window\.performance, nav: navigator, win: window \}\)/);
  });

  it('app.html records the render time and observes LCP', () => {
    const html = read('src/app.html');
    expect(html).toMatch(/root\.render\(React\.createElement\(SQLQuest\)\);\s*window\.sqRenderMs = performance\.now\(\);/);
    expect(html).toMatch(/observe\(\{ type: 'largest-contentful-paint', buffered: true \}\)/);
  });
});
