// The UI/UX audit's browser × device matrix and its mobile-browser checks
// U13–U18 (A4, docs/agent/fleet/A4-uiux.md), proven on fixture data: each
// fixture breaks exactly one check on the iPhone SE row and must produce
// exactly that finding; the clean twin produces none on any row.
// Also: the daily issue's diff and decision (scripts/smoke/uiux-issue.mjs).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import {
  SEVERITY, CHECK_NAMES, DEVICE_MATRIX, VIEWPORTS, runChecks, engineTotals, fingerprint,
  checkU8, checkU13, checkU14, checkU15, checkU16, checkU17, checkU18, TOOLBAR_PX,
} from '../scripts/smoke/uiux-checks.mjs';
import { matrixRows, playwrightProjects, hermeticRefusal, parseArgs, renderReport } from '../scripts/smoke/uiux-audit.mjs';
import { newSince, decide, renderBody, groups, MARKER } from '../scripts/smoke/uiux-issue.mjs';

const row = (name) => DEVICE_MATRIX.find(r => r.name === name);
const iphoneSE = row('iphone-se');
const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

// A clean page with every collection the mobile checks read.
const clean = (width = 375) => ({
  docWidth: width,
  interactive: [{ selector: 'a.cta', rect: box(16, 100, 200, 48), visible: true }],
  texts: [{ selector: 'p', visible: true, fontSize: 16, fontWeight: '400', color: 'rgb(242, 240, 234)', opacity: 1, bgStack: [{ color: 'rgb(14, 15, 19)' }], body: true }],
  clipBoxes: [],
  canvas: 'rgb(14, 15, 19)',
  coverProbes: [{ selector: 'a.cta', positions: [{ block: 'start', coveredBy: null }] }],
  modals: [],
  media: [],
  cls: 0,
  primaries: [{ selector: 'a.cta', visible: true, focusable: true, ringVisible: true }],
  styled: [],
  consoleErrors: [], failedRequests: [], origin: 'http://localhost:4321',
  vhBoxes: [{ selector: 'div.hero', visible: true, value: 'min-height: 100vh', fixed: false, heightRatio: 1, control: 'a.cta', controlGap: 200, roomBelow: 900 }],
  stickies: [{ selector: 'aside.toc', visible: true, ancestor: 'div.panel', overflow: 'auto', scrolls: true, room: 600 }],
  inputs: [{ selector: 'input.email', visible: true, type: 'email', fontSize: 16 }],
  fixedBars: [{ selector: 'div.bar', visible: true, edge: 'bottom', cover: true, hasControl: true, usesSafeArea: true }],
  dateInputs: [{ selector: 'input.date', visible: true, empty: true, placeholder: false, labelled: true, minHeight: 44 }],
  smoothScrolls: [],
});

const BREAKS = {
  U13: s => { s.vhBoxes[0] = { ...s.vhBoxes[0], value: 'height: 100vh', controlGap: 24, roomBelow: 0 }; },
  U14: s => { s.stickies[0] = { ...s.stickies[0], overflow: 'hidden', scrolls: false }; },
  U15: s => { s.inputs[0].fontSize = 14; },
  U16: s => { s.fixedBars[0].usesSafeArea = false; },
  U17: s => { s.dateInputs[0].minHeight = 0; },
  U18: s => { s.smoothScrolls = [{ api: 'scrollIntoView', target: '[data-testid="result"]' }]; },
};

describe('the matrix', () => {
  it('has the eight rows the founder named: desktop Chrome ×2, desktop Safari, two iPhones, two Androids, an iPad', () => {
    expect(DEVICE_MATRIX.map(r => `${r.name}:${r.engine}`)).toEqual([
      'chrome-1366:chromium', 'chrome-1920:chromium', 'safari-1440:webkit',
      'iphone-se:webkit', 'iphone-15:webkit', 'pixel-7:chromium', 'galaxy-s9:chromium', 'ipad-mini:webkit',
    ]);
    expect(row('chrome-1366')).toMatchObject({ width: 1366, height: 800 });
    expect(row('chrome-1920')).toMatchObject({ width: 1920, height: 1080 });
    expect(row('safari-1440')).toMatchObject({ width: 1440, height: 900 });
    // Safari rules are judged only on WebKit touch rows; the short screen is the SE.
    expect(DEVICE_MATRIX.filter(r => r.ios).every(r => r.engine === 'webkit' && r.touch)).toBe(true);
    expect(DEVICE_MATRIX.filter(r => r.short).map(r => r.name)).toEqual(['iphone-se']);
  });
  it('the legacy six viewports stay Chromium rows (the uiux_findings baseline)', () => {
    expect(matrixRows('viewports').map(r => r.name)).toEqual(VIEWPORTS.map(v => v.name));
    expect(matrixRows('viewports').every(r => r.engine === 'chromium' && !r.device)).toBe(true);
    expect(() => matrixRows('phones')).toThrow(/unknown matrix/);
  });
  it('rows become Playwright projects; descriptors bind where Playwright is installed', () => {
    let devices = null;
    try { devices = createRequire(import.meta.url)('playwright').devices; } catch { /* CI without Playwright */ }
    const fake = Object.fromEntries(DEVICE_MATRIX.map(r => [r.device, { viewport: { width: r.width, height: r.height }, isMobile: !!r.touch, defaultBrowserType: r.engine }]));
    const projects = playwrightProjects(matrixRows('devices'), devices || fake);
    expect(projects.map(p => p.use.browserName)).toEqual(DEVICE_MATRIX.map(r => r.engine));
    for (const [i, r] of DEVICE_MATRIX.entries()) {
      expect(projects[i].use.viewport).toEqual({ width: r.width, height: r.height });
      if (devices && !r.override) {
        // The written-out size is the descriptor's own: the checks judge the page the browser drew.
        expect(devices[r.device].viewport).toEqual({ width: r.width, height: r.height });
        expect(devices[r.device].defaultBrowserType).toBe(r.engine);
      }
    }
    expect(() => playwrightProjects([{ name: 'x', device: 'Nokia 3310', engine: 'chromium' }], {})).toThrow(/no Playwright descriptor/);
  });
  it('parses --matrix and --engines', () => {
    const a = parseArgs(['--matrix', 'devices', '--engines', 'chromium']);
    expect(a.matrix).toBe('devices');
    expect(a.engines).toEqual(['chromium']);
    expect(parseArgs([]).matrix).toBe('viewports');
  });
});

describe('a production run must say it is hermetic', () => {
  it('local is fine; sqlquest.app needs UIUX_HERMETIC=1', () => {
    expect(hermeticRefusal('http://localhost:4321', {})).toBeNull();
    expect(hermeticRefusal('https://sqlquest.app', {})).toMatch(/UIUX_HERMETIC=1/);
    expect(hermeticRefusal('https://sqlquest.app', { UIUX_HERMETIC: '1' })).toBeNull();
  });
});

describe('the clean fixture', () => {
  it('produces no finding on any row', () => {
    for (const r of DEVICE_MATRIX) expect(runChecks(clean(r.width), r)).toEqual([]);
  });
});

describe('each mobile check catches its own deliberate break on the iPhone SE, and only it', () => {
  for (const [check, mutate] of Object.entries(BREAKS)) {
    it(`${check} ${CHECK_NAMES[check]} (${SEVERITY[check]})`, () => {
      const s = clean();
      mutate(s);
      const found = runChecks(s, iphoneSE);
      expect(found.map(f => f.check)).toEqual([check]);
      expect(found[0].severity).toBe(SEVERITY[check]);
    });
  }
});

describe('which rows judge which rule', () => {
  const broken = (check) => { const s = clean(); BREAKS[check](s); return s; };
  it('iOS rules (U15 U16 U17) fire on WebKit touch rows only, never on Android or desktop', () => {
    for (const check of ['U15', 'U16', 'U17']) {
      const rows = DEVICE_MATRIX.filter(r => runChecks({ ...broken(check), docWidth: r.width }, r).some(f => f.check === check)).map(r => r.name);
      expect(rows).toEqual(['iphone-se', 'iphone-15', 'ipad-mini']);
    }
  });
  it('the mobile toolbar (U13) and smooth scroll (U18) fire on every touch row, Android included', () => {
    for (const check of ['U13', 'U18']) {
      const rows = DEVICE_MATRIX.filter(r => runChecks({ ...broken(check), docWidth: r.width }, r).some(f => f.check === check)).map(r => r.name);
      expect(rows).toEqual(['iphone-se', 'iphone-15', 'pixel-7', 'galaxy-s9', 'ipad-mini']);
    }
  });
  it('a sticky that never sticks (U14) is an engine fact: every row', () => {
    const rows = DEVICE_MATRIX.filter(r => runChecks({ ...broken('U14'), docWidth: r.width }, r).some(f => f.check === 'U14'));
    expect(rows).toHaveLength(DEVICE_MATRIX.length);
  });
  it('U8 judges the short screen: phone-s in the viewport matrix, the iPhone SE in the device one', () => {
    const m = [{ selector: '[role=dialog]', primarySelector: 'button.bp', reachable: false }];
    expect(checkU8(m, iphoneSE)).toHaveLength(1);
    expect(checkU8(m, VIEWPORTS[0])).toHaveLength(1);
    expect(checkU8(m, row('iphone-15'))).toEqual([]);
  });
});

describe('the exemptions', () => {
  const touch = { touch: true, ios: true };
  it('U13: dvh/svh, a short box, a control clear of the toolbar, or a page that scrolls it clear', () => {
    const b = { selector: 'div', visible: true, value: 'height: 100vh', fixed: false, heightRatio: 1, control: 'button', controlGap: 10, roomBelow: 0 };
    expect(checkU13([b], touch)).toHaveLength(1);
    expect(checkU13([{ ...b, value: 'height: 100dvh' }], touch)).toEqual([]);
    expect(checkU13([{ ...b, heightRatio: 0.5 }], touch)).toEqual([]);
    // A min-h-screen shell its content stretched to three screens ends where the page ends.
    expect(checkU13([{ ...b, heightRatio: 3, value: 'min-height: 100vh' }], touch)).toEqual([]);
    expect(checkU13([{ ...b, heightRatio: 1.1 }], touch)).toHaveLength(1);
    expect(checkU13([{ ...b, controlGap: TOOLBAR_PX }], touch)).toEqual([]);
    expect(checkU13([{ ...b, roomBelow: 400 }], touch)).toEqual([]);
    expect(checkU13([{ ...b, roomBelow: 400, fixed: true }], touch)).toHaveLength(1);
    expect(checkU13([b], { touch: false })).toEqual([]);
  });
  it('U14: overflow clip, a deliberate auto/scroll scroller (scrolling yet or not), or no room to stick are not findings', () => {
    const s = { selector: 'nav', visible: true, ancestor: 'div', overflow: 'hidden', scrolls: false, room: 500 };
    expect(checkU14([s])).toHaveLength(1);
    expect(checkU14([{ ...s, overflow: 'clip' }])).toEqual([]);
    expect(checkU14([{ ...s, overflow: 'auto', scrolls: true }])).toEqual([]);
    // 2026-11-22 local run: a max-h-72 result table with three rows is not a defect.
    expect(checkU14([{ ...s, overflow: 'auto', scrolls: false }])).toEqual([]);
    expect(checkU14([{ ...s, room: 0 }])).toEqual([]);
    expect(checkU14([{ ...s, ancestor: null }])).toEqual([]);
  });
  it('U15: 16 px passes; disabled, read-only and a locked viewport are exempt', () => {
    const i = { selector: 'input', visible: true, type: 'text', fontSize: 15 };
    expect(checkU15([i], touch)[0].detail).toMatch(/iOS zooms/);
    expect(checkU15([{ ...i, fontSize: 16 }], touch)).toEqual([]);
    expect(checkU15([{ ...i, disabled: true }], touch)).toEqual([]);
    expect(checkU15([{ ...i, viewportLocked: true }], touch)).toEqual([]);
  });
  it('U16: without viewport-fit=cover Safari keeps the safe area itself', () => {
    const b = { selector: 'div', visible: true, edge: 'bottom', cover: false, hasControl: true, usesSafeArea: false };
    expect(checkU16([b], touch)).toEqual([]);
    expect(checkU16([{ ...b, cover: true }], touch)).toHaveLength(1);
    expect(checkU16([{ ...b, cover: true, hasControl: false }], touch)).toEqual([]);
  });
  it('U17: a labelled date input with a placeholder is fine; an unlabelled one is not', () => {
    const d = { selector: 'input', visible: true, empty: false, placeholder: true, labelled: false, minHeight: 44 };
    expect(checkU17([d], touch)[0].detail).toMatch(/no placeholder/);
    expect(checkU17([{ ...d, labelled: true }], touch)).toEqual([]);
  });
  it('U18: one finding per call site, however often it fires', () => {
    const c = { api: 'scrollIntoView', target: 'div.panel' };
    expect(checkU18([c, c, c], touch)).toHaveLength(1);
    expect(checkU18([c], { touch: false })).toEqual([]);
  });
});

describe('the per-engine split', () => {
  const f = (check, engine, viewport = 'iphone-se') => ({ check, severity: SEVERITY[check], engine, page: '/', viewport, theme: 'dark', selector: 'x', detail: 'd' });
  it('totals by engine, and the report names the rows and the limit', () => {
    const fs = [f('U1', 'webkit'), f('U15', 'webkit'), f('U3', 'chromium', 'pixel-7'), f('U9', 'chromium', 'pixel-7')];
    expect(engineTotals(fs)).toEqual({ webkit: { critical: 1, major: 1, minor: 0 }, chromium: { critical: 0, major: 1, minor: 1 } });
    const md = renderReport(fs, { viewports: DEVICE_MATRIX.map(r => r.name), rows: DEVICE_MATRIX, skipped: [{ engine: 'webkit', rows: ['iphone-se'], reason: 'not installed' }], repoReport: true });
    expect(md).toContain('| webkit | 1 | 1 | 0 |');
    expect(md).toContain('| iphone-se | webkit | Safari | iPhone SE (3rd gen) | 375×667 |');
    expect(md).toMatch(/not devices/);
    expect(md).toContain('**Skipped:** webkit (iphone-se) — not installed');
  });
});

describe('the daily issue', () => {
  const f = (check, page, selector = 'x') => ({ check, severity: SEVERITY[check], page, viewport: 'iphone-se', device: 'iPhone SE (3rd gen)', browser: 'Safari', engine: 'webkit', theme: 'dark', selector, detail: 'd' });
  it('new = critical/major whose fingerprint the last run did not have; minors never count', () => {
    const prev = [f('U1', '/'), f('U3', '/a')];
    const cur = [f('U1', '/'), f('U3', '/a'), f('U2', '/b'), f('U9', '/c')];
    expect(newSince(cur, prev).map(fingerprint)).toEqual([fingerprint(f('U2', '/b'))]);
    expect(newSince(cur, null)).toHaveLength(3); // first run: every critical/major is new
  });
  it('opens, updates, closes on a clean run, and does nothing when clean with no issue', () => {
    expect(decide({ blockingCount: 3, openIssue: null })).toBe('open');
    expect(decide({ blockingCount: 3, openIssue: { number: 1 } })).toBe('update');
    expect(decide({ blockingCount: 0, openIssue: { number: 1 } })).toBe('close');
    expect(decide({ blockingCount: 0, openIssue: null })).toBe('none');
  });
  it('the body lists each new finding with page, device, browser, theme, selector and check, and stays under the cap', () => {
    const cur = [f('U1', '/', 'html'), f('U15', '/app/', 'input.email')];
    const body = renderBody({ report: { at: 't', base: 'https://sqlquest.app', totals: { critical: 1, major: 1, minor: 0 }, engines: engineTotals(cur), findings: cur }, fresh: cur, runUrl: 'https://x/run/1' });
    expect(body.startsWith(MARKER)).toBe(true);
    expect(body).toContain('| critical | U1 | / | iPhone SE (3rd gen) | Safari | dark | `html` | d |');
    expect(body).toMatch(/not devices/);
    const many = Array.from({ length: 5000 }, (_, i) => f('U3', '/p' + i, 'a.very-long-selector-name-' + i));
    const big = renderBody({ report: { totals: {}, findings: many }, fresh: many });
    expect(big.length).toBeLessThanOrEqual(60100);
    expect(big).toMatch(/more in the run's artifact/);
  });
  it('groups the queue by root cause (check + selector)', () => {
    const g = groups([f('U3', '/a', 'footer a'), f('U3', '/b', 'footer a'), f('U1', '/', 'html')]);
    expect(g[0]).toMatchObject({ check: 'U1', n: 1 });
    expect(g[1]).toMatchObject({ check: 'U3', n: 2 });
    expect(g[1].pages.size).toBe(2);
  });
});
