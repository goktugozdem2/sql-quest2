// The UI/UX audit's checks (A4, docs/agent/fleet/A4-uiux.md), proven on
// fixture data: each fixture breaks exactly one check and must produce
// exactly that finding, and its clean twin must produce none.
// Browser-free: the collectors only measure; these functions judge.
import { describe, it, expect } from 'vitest';
import {
  SEVERITY, VIEWPORTS, parseColor, contrastRatio, effectiveBackground, isLargeText,
  checkU1, checkU2, checkU3, checkU4, checkU5, checkU6, checkU7, checkU8, checkU9,
  checkU10, checkU11, checkU12, runChecks, dedupe, countMatrix, severityTotals,
} from '../scripts/smoke/uiux-checks.mjs';
import { marketingPages, aidForQuotaArm, guestSeed, renderReport, vendorFile, parseArgs } from '../scripts/smoke/uiux-audit.mjs';
import { quotaWallHashArm } from '../src/utils/quota-wall-inline.js';

const phoneS = VIEWPORTS.find(v => v.name === 'phone-s');
const laptop = VIEWPORTS.find(v => v.name === 'laptop');
const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height });

// A clean page: every collection present, nothing wrong.
const clean = () => ({
  docWidth: 375,
  interactive: [{ selector: 'a.cta', rect: box(16, 100, 200, 48), visible: true }],
  texts: [{ selector: 'p', visible: true, fontSize: 16, fontWeight: '400', color: 'rgb(242, 240, 234)', opacity: 1, bgStack: [{ color: 'rgb(14, 15, 19)' }], body: true }],
  clipBoxes: [{ selector: 'div.card', visible: true, clipX: true, clipY: true, clientWidth: 300, clientHeight: 100, scrollWidth: 300, scrollHeight: 100 }],
  canvas: 'rgb(14, 15, 19)',
  coverProbes: [{ selector: 'a.cta', positions: [{ block: 'start', coveredBy: null }] }],
  modals: [{ selector: '[role=dialog]', primarySelector: 'button.bp', reachable: true }],
  media: [{ selector: 'img', visible: true, hasDims: true }],
  cls: 0,
  primaries: [{ selector: 'a.cta', visible: true, focusable: true, ringVisible: true }],
  styled: [{ selector: 'p', visible: true, fontFamily: 'Geist, sans-serif', background: 'rgba(0, 0, 0, 0)', borderColors: [] }],
  consoleErrors: [], failedRequests: [], origin: 'http://localhost:4321',
});

describe('the clean fixture', () => {
  it('produces no finding at phone-s or laptop', () => {
    expect(runChecks(clean(), phoneS)).toEqual([]);
    expect(runChecks({ ...clean(), docWidth: 1366 }, laptop)).toEqual([]);
  });
});

// Each break: a mutation of the clean page, and the one check it must trip.
const BREAKS = {
  U1: s => { s.docWidth = 412; },
  U2: s => { s.interactive[0].rect = box(300, 100, 100, 48); },
  U3: s => { s.interactive[0].rect = box(16, 100, 61, 28); },
  U4: s => { s.texts[0].fontSize = 11; },
  U5: s => { s.clipBoxes[0].scrollWidth = 340; },
  U6: s => { s.texts[0].color = 'rgb(75, 85, 99)'; },
  U7: s => { s.coverProbes[0].positions = [{ block: 'start', coveredBy: 'div.fixed.bottom-4' }, { block: 'end', coveredBy: 'div.fixed.bottom-4' }]; },
  U8: s => { s.modals[0].reachable = false; s.modals[0].why = 'button at 700–744 of 667'; },
  U9: s => { s.media[0].hasDims = false; },
  U10: s => { s.primaries[0].ringVisible = false; },
  U11: s => { s.styled[0].borderColors = ['rgb(255, 227, 77)']; },
  U12: s => { s.consoleErrors = [{ text: 'TypeError: x is undefined' }]; },
};

describe('each check catches its own deliberate break, and only it', () => {
  for (const [check, mutate] of Object.entries(BREAKS)) {
    it(`${check} (${SEVERITY[check]})`, () => {
      const s = clean();
      mutate(s);
      const found = runChecks(s, phoneS);
      expect(found.map(f => f.check)).toEqual([check]);
      expect(found[0].severity).toBe(SEVERITY[check]);
    });
  }
});

describe('U1 horizontal scroll', () => {
  it('compares against the viewport set, with 1 px of slack', () => {
    expect(checkU1({ docWidth: 376, vw: 375 })).toEqual([]);
    expect(checkU1({ docWidth: 412, vw: 375 })[0].detail).toMatch(/\+37/);
  });
});

describe('U2 off screen', () => {
  it('ignores an element inside a sideways scroller (a carousel) and hidden ones', () => {
    expect(checkU2([{ selector: 'a', rect: box(400, 0, 50, 50), visible: true, inScroller: true }], 375)).toEqual([]);
    expect(checkU2([{ selector: 'a', rect: box(400, 0, 50, 50), visible: false }], 375)).toEqual([]);
    expect(checkU2([{ selector: 'a', rect: box(-20, 0, 50, 50), visible: true }], 375)).toHaveLength(1);
    // Inside the viewport but cut off by an overflow-hidden window: the
    // mock interview's Quit button on a phone.
    expect(checkU2([{ selector: 'button.quit', rect: box(300, 0, 30, 20), visible: true, clippedBy: '[data-testid="interview-window"]' }], 375)[0].detail).toMatch(/cut off/);
  });
});

describe('U3 tap targets', () => {
  it('only on phones, and a link inside running text is exempt', () => {
    const small = { selector: 'a', rect: box(0, 0, 30, 20), visible: true };
    expect(checkU3([small], phoneS)).toHaveLength(1);
    expect(checkU3([small], laptop)).toEqual([]);
    expect(checkU3([{ ...small, inlineText: true }], phoneS)).toEqual([]);
    expect(checkU3([{ ...small, rect: box(0, 0, 44, 44) }], phoneS)).toEqual([]);
  });
});

describe('U4 text size', () => {
  it('any text under 12 px anywhere; body under 14 px on phones only', () => {
    expect(checkU4([{ selector: 'p', visible: true, fontSize: 11 }], laptop)).toHaveLength(1);
    expect(checkU4([{ selector: 'p', visible: true, fontSize: 13, body: true }], phoneS)).toHaveLength(1);
    expect(checkU4([{ selector: 'p', visible: true, fontSize: 13, body: true }], laptop)).toEqual([]);
    expect(checkU4([{ selector: 'span', visible: true, fontSize: 13, body: false }], phoneS)).toEqual([]);
  });
});

describe('U5 clipped text', () => {
  it('deliberate truncation (ellipsis, line-clamp) and hidden helpers are exempt', () => {
    const over = { selector: 'div', visible: true, clipX: true, clipY: false, clientWidth: 100, clientHeight: 20, scrollWidth: 160, scrollHeight: 20 };
    expect(checkU5([over])).toHaveLength(1);
    expect(checkU5([{ ...over, ellipsis: true }])).toEqual([]);
    expect(checkU5([{ ...over, lineClamp: true }])).toEqual([]);
    expect(checkU5([{ ...over, clientWidth: 1, scrollWidth: 80 }])).toEqual([]);
    // Overflow on an axis that does not clip is not clipped text.
    expect(checkU5([{ ...over, clipX: false }])).toEqual([]);
  });
});

describe('U6 contrast', () => {
  it('parses colours and computes WCAG ratios', () => {
    expect(parseColor('#FFE34D')).toEqual({ r: 255, g: 227, b: 77, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 0.5)').a).toBe(0.5);
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 1);
  });
  it('blends translucent layers onto the canvas, and gives up on an image', () => {
    const bg = effectiveBackground([{ color: 'rgba(255, 255, 255, 0.5)' }, { color: 'rgb(0, 0, 0)' }]);
    expect(Math.round(bg.r)).toBe(128);
    expect(effectiveBackground([{ color: 'rgba(0,0,0,0)', image: true }])).toBeNull();
  });
  it('large text needs 3:1, body 4.5:1', () => {
    expect(isLargeText(24, '400')).toBe(true);
    expect(isLargeText(19, '700')).toBe(true);
    expect(isLargeText(19, '400')).toBe(false);
    // #8A8E99 on #0E0F13 ≈ 5.9:1 — DESIGN.md's muted text passes.
    const muted = { selector: 'p', visible: true, fontSize: 14, fontWeight: '400', color: 'rgb(138, 142, 153)', opacity: 1, bgStack: [{ color: 'rgb(14, 15, 19)' }] };
    expect(checkU6([muted], 'rgb(14, 15, 19)')).toEqual([]);
    // The same grey at 40 % opacity fails.
    expect(checkU6([{ ...muted, opacity: 0.4 }], 'rgb(14, 15, 19)')).toHaveLength(1);
  });
});

describe('U7 covered primary', () => {
  it('only when no scroll position leaves the button uncovered, and only on phones', () => {
    const covered = [{ selector: 'button', positions: [{ coveredBy: 'div.fixed' }, { coveredBy: 'div.fixed' }] }];
    expect(checkU7(covered, phoneS)).toHaveLength(1);
    expect(checkU7(covered, laptop)).toEqual([]);
    expect(checkU7([{ selector: 'button', positions: [{ coveredBy: 'div.fixed' }, { coveredBy: null }] }], phoneS)).toEqual([]);
  });
});

describe('U8 modal on a short screen', () => {
  it('is judged on phone-s only, and a modal without a primary is skipped', () => {
    const bad = [{ selector: 'dialog', primarySelector: 'button', reachable: false }];
    expect(checkU8(bad, phoneS)).toHaveLength(1);
    expect(checkU8(bad, VIEWPORTS.find(v => v.name === 'phone'))).toEqual([]);
    expect(checkU8([{ selector: 'dialog', primarySelector: null }], phoneS)).toEqual([]);
  });
});

describe('U9 layout shift', () => {
  it('flags CLS over 0.1', () => {
    expect(checkU9({ cls: 0.25 })).toHaveLength(1);
    expect(checkU9({ cls: 0.1 })).toEqual([]);
  });
});

describe('U10 keyboard', () => {
  it('a primary that Tab cannot reach is a finding of its own', () => {
    expect(checkU10([{ selector: 'div[role=button]', visible: true, focusable: false }])[0].detail).toMatch(/not reachable/);
  });
});

describe('U11 DESIGN.md', () => {
  it('a blacklisted font first in the stack, the accent as a background outside a CTA', () => {
    expect(checkU11([{ selector: 'p', visible: true, fontFamily: '"Inter", sans-serif' }])).toHaveLength(1);
    expect(checkU11([{ selector: 'p', visible: true, fontFamily: 'Geist, Arial' }])).toEqual([]);
    expect(checkU11([{ selector: 'div', visible: true, background: 'rgb(245, 197, 24)', interactive: false }])).toHaveLength(1);
    expect(checkU11([{ selector: 'a.bp', visible: true, background: 'rgb(255, 227, 77)', interactive: true }])).toEqual([]);
  });
});

describe('U12 console and requests', () => {
  it('ignores analytics and other origins, keeps same-origin failures', () => {
    const r = checkU12({
      origin: 'http://localhost:4321',
      consoleErrors: [{ text: 'Failed to load resource: 404' }, { text: 'x', url: 'https://va.vercel-scripts.com/v1/script.js' }],
      failedRequests: [
        { url: 'http://localhost:4321/_vercel/insights/script.js', status: 404 },
        { url: 'https://example.com/x.js', status: 500 },
        { url: 'http://localhost:4321/og/missing.png', status: 404 },
      ],
    });
    expect(r.map(f => f.detail)).toEqual(['404 /og/missing.png']);
  });
});

describe('aggregation and the report', () => {
  const f = (check, page, viewport, selector) => ({ check, severity: SEVERITY[check], page, viewport, theme: 'dark', selector, detail: 'd' });
  it('dedupes per page, viewport, theme and selector and counts by viewport', () => {
    const d = dedupe([f('U3', '/', 'phone-s', 'a'), f('U3', '/', 'phone-s', 'a'), f('U1', '/', 'phone', 'html')]);
    expect(d).toHaveLength(2);
    expect(d.find(x => x.check === 'U3').count).toBe(2);
    const m = countMatrix(d);
    expect(m.U3['phone-s']).toBe(1);
    expect(m.U1.phone).toBe(1);
    expect(severityTotals(d)).toEqual({ critical: 1, major: 1, minor: 0 });
  });
  it('the repo report carries no screenshot paths', () => {
    const md = renderReport([{ ...f('U1', '/', 'phone-s', 'html'), shot: '/tmp/x/shots/home.png' }], { repoReport: true });
    expect(md).toContain('| U1 horizontal scroll | critical |');
    expect(md).not.toContain('.png');
    expect(renderReport([{ ...f('U1', '/', 'phone-s', 'html'), shot: '/tmp/x/shots/home.png' }])).toContain('home.png');
  });
});

describe('surfaces', () => {
  it('samples five /questions/ pages and keeps every other sitemap page', () => {
    const xml = ['/', '/pricing/', ...Array.from({ length: 300 }, (_, i) => `/questions/q-${i}/`)]
      .map(p => `<url><loc>https://sqlquest.app${p}</loc></url>`).join('');
    const pages = marketingPages(xml);
    expect(pages.filter(p => p.path.startsWith('/questions/'))).toHaveLength(5);
    expect(pages.map(p => p.path)).toContain('/pricing/');
  });
  it('pins both quota-wall arms through the app\'s own hash', () => {
    expect(quotaWallHashArm(aidForQuotaArm('inline'))).toBe('inline');
    expect(quotaWallHashArm(aidForQuotaArm('control'))).toBe('control');
  });
  it('a seeded guest carries its solves and the badges they earned', () => {
    const s = guestSeed('guest_1', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(s).toContain('challenge_10');
    expect(guestSeed('guest_1', [1, 2, 3])).not.toContain('challenge_5');
  });
  it('maps the pinned CDN files to their npm copies', () => {
    expect(vendorFile('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/codemirror.min.js', '/v')).toBe('/v/node_modules/codemirror/lib/codemirror.js');
    expect(vendorFile('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.18/addon/hint/sql-hint.min.js', '/v')).toBe('/v/node_modules/codemirror/addon/hint/sql-hint.js');
    expect(vendorFile('https://unpkg.com/react@18.3.1/umd/react.production.min.js', '/v')).toBe('/v/node_modules/react/umd/react.production.min.js');
  });
  it('parses its arguments', () => {
    const a = parseArgs(['http://localhost:4400/', '--viewports', 'phone-s,laptop', '--repo-report']);
    expect(a.base).toBe('http://localhost:4400');
    expect(a.viewports).toEqual(['phone-s', 'laptop']);
    expect(a.repoReport).toBe(true);
  });
});

describe('the advisory smoke step (SMOKE_UIUX=1)', async () => {
  const fs = await import('node:fs');
  const { uiuxSmokeArgs, summarizeUiux, UIUX_SMOKE_CHECKS } = await import('../scripts/smoke/uiux-smoke.mjs');
  it('runs the critical checks on three surfaces at 375 and 1366', () => {
    const a = uiuxSmokeArgs('http://localhost:4321', '/tmp/x');
    const pages = new RegExp(a[a.indexOf('--pages') + 1]);
    expect(pages.test('/')).toBe(true);
    expect(pages.test('/capital-one-sql-interview/')).toBe(true);
    expect(pages.test('app:challenge-result')).toBe(true);
    expect(pages.test('/pricing/')).toBe(false);
    expect(a[a.indexOf('--viewports') + 1]).toBe('phone-s,laptop');
    expect([...UIUX_SMOKE_CHECKS]).toEqual(['U1', 'U2', 'U7', 'U8']);
  });
  it('summarizes without failing', () => {
    expect(summarizeUiux({ findings: [] }).clean).toBe(true);
    expect(summarizeUiux({ findings: [{ check: 'U1', page: '/', viewport: 'phone-s', selector: 'html', detail: '+14' }] }).line).toMatch(/1 finding/);
  });
  it('smoke-test.js gates it behind SMOKE_UIUX=1 and never counts it', () => {
    const src = fs.readFileSync(new URL('../scripts/smoke-test.js', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf("process.env.SMOKE_UIUX === '1'"), src.indexOf('// ── Report'));
    expect(block.length).toBeGreaterThan(0);
    expect(block).toContain('runUiuxAdvisory');
    expect(block).not.toMatch(/\b(pass|fail)\(/);
  });
});
