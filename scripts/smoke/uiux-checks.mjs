// The UI/UX audit's checks, as pure functions (A4, docs/agent/fleet/A4-uiux.md).
//
// The browser side (scripts/smoke/uiux-audit.mjs) only COLLECTS plain data
// from a rendered page: boxes, computed colours, font sizes, which element
// sits at a point. Every judgement — is this a finding, how severe — is made
// here, on that data, so tests/uiux-audit.test.js can prove each check on
// fixture data without a browser.
//
// A finding is { check, severity, selector, detail }. The runner adds page,
// viewport and theme.

export const SEVERITY = Object.freeze({
  U1: 'critical', U2: 'critical', U3: 'major', U4: 'major', U5: 'major',
  U6: 'major', U7: 'critical', U8: 'critical', U9: 'minor', U10: 'major',
  U11: 'minor', U12: 'major',
});

export const CHECK_NAMES = Object.freeze({
  U1: 'horizontal scroll',
  U2: 'interactive element off screen',
  U3: 'tap target under 44×44',
  U4: 'text too small',
  U5: 'text clipped',
  U6: 'contrast below AA',
  U7: 'fixed/sticky element covers a primary button',
  U8: 'modal cannot reach its primary button',
  U9: 'layout shift',
  U10: 'keyboard: primary unreachable or no focus ring',
  U11: 'DESIGN.md: blacklisted font or misplaced accent',
  U12: 'console error or failed request',
});

export const VIEWPORTS = Object.freeze([
  { name: 'phone-s', width: 375, height: 667, phone: true },
  { name: 'phone', width: 390, height: 844, phone: true },
  { name: 'phone-android', width: 412, height: 915, phone: true },
  { name: 'tablet', width: 768, height: 1024, phone: false },
  { name: 'laptop', width: 1366, height: 800, phone: false },
  { name: 'desktop', width: 1920, height: 1080, phone: false },
]);

export const THEMES = Object.freeze(['dark', 'light']);

// One pixel of slack everywhere a box meets an edge: sub-pixel layout
// rounds, and a 0.5 px overhang is not something a person can see.
const SLACK = 1;

function finding(check, selector, detail) {
  return { check, severity: SEVERITY[check], selector, detail };
}

// ── Colour ──────────────────────────────────────────────────────────────

/** Parse a computed CSS colour ("rgb(…)", "rgba(…)", "#rrggbb"). null if not a plain colour. */
export function parseColor(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  let m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) {
    let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
  }
  return null;
}

/** Paint `top` (with alpha) over an opaque `bottom`. */
export function blend(top, bottom) {
  const a = top.a;
  return {
    r: top.r * a + bottom.r * (1 - a),
    g: top.g * a + bottom.g * (1 - a),
    b: top.b * a + bottom.b * (1 - a),
    a: 1,
  };
}

/**
 * The colour actually behind a piece of text: its background stack from the
 * element outward (innermost first), painted over the canvas. Returns null
 * when an image or gradient sits in the stack — contrast is then unknown,
 * never guessed.
 */
export function effectiveBackground(stack, canvas = { r: 255, g: 255, b: 255, a: 1 }) {
  let layers = [];
  for (const layer of stack || []) {
    if (layer.image) return null;
    const c = parseColor(layer.color);
    if (!c) return null;
    if (c.a === 0) continue;
    layers.push(c);
    if (c.a >= 1) break;
  }
  let out = canvas;
  for (let i = layers.length - 1; i >= 0; i--) out = blend(layers[i], out);
  return out;
}

function channel(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
export function luminance(c) {
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}
export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** WCAG large text: ≥ 24 px, or bold (≥ 700) at ≥ 18.66 px. */
export function isLargeText(fontSize, fontWeight) {
  return fontSize >= 24 || (Number(fontWeight) >= 700 && fontSize >= 18.66);
}

// ── U1 horizontal scroll ────────────────────────────────────────────────
// Measured against the viewport width SET, never innerWidth: with mobile
// emulation the layout viewport stretches to the content, so innerWidth
// grows with the overflow it should expose (A2, 2026-11-22).
export function checkU1({ docWidth, vw }) {
  if (docWidth > vw + SLACK) return [finding('U1', 'html', `document ${docWidth}px wide at ${vw}px (+${docWidth - vw})`)];
  return [];
}

// ── U2 interactive element off screen ───────────────────────────────────
// `inScroller`: the element sits inside an ancestor that scrolls sideways
// (a carousel, a code block): reachable by scrolling it, not a finding.
// `clippedBy`: an overflow-hidden ancestor cuts the element off — nobody
// can reach it, so it is a finding even inside the viewport.
export function checkU2(elements, vw) {
  const out = [];
  for (const el of elements || []) {
    if (!el.visible || el.inScroller) continue;
    const r = el.rect;
    if (!r || r.width <= 0 || r.height <= 0) continue;
    if (r.left < -SLACK || r.right > vw + SLACK) {
      out.push(finding('U2', el.selector, `left ${Math.round(r.left)} right ${Math.round(r.right)} at ${vw}px`));
    } else if (el.clippedBy) {
      out.push(finding('U2', el.selector, `cut off by ${el.clippedBy} (overflow hidden)`));
    }
  }
  return out;
}

// ── U3 tap target ───────────────────────────────────────────────────────
// Phones only. A link inside running text is exempt (WCAG 2.5.8's inline
// exception). The box measured is the element's own, so padding counts.
export const TAP_MIN = 44;
export function checkU3(elements, { phone }) {
  if (!phone) return [];
  const out = [];
  for (const el of elements || []) {
    if (!el.visible || el.inlineText || el.disabled) continue;
    const r = el.rect;
    if (!r || r.width <= 0 || r.height <= 0) continue;
    if (r.width < TAP_MIN - 0.5 || r.height < TAP_MIN - 0.5) {
      out.push(finding('U3', el.selector, `${Math.round(r.width)}×${Math.round(r.height)}`));
    }
  }
  return out;
}

// ── U4 text size ────────────────────────────────────────────────────────
// `texts`: one row per element that directly holds visible text.
// `body`: running text (p, li, td, dd, blockquote, or a block of 40+ chars),
// as opposed to a label, badge or caption.
export function checkU4(texts, { phone }) {
  const out = [];
  for (const t of texts || []) {
    if (!t.visible) continue;
    if (t.fontSize < 12 - 0.01) out.push(finding('U4', t.selector, `${t.fontSize}px text`));
    else if (phone && t.body && t.fontSize < 14 - 0.01) out.push(finding('U4', t.selector, `${t.fontSize}px body text on a phone`));
  }
  return out;
}

// ── U5 clipped text ─────────────────────────────────────────────────────
// An element that hides overflow and holds more than its box. Deliberate
// truncation (text-overflow: ellipsis, line-clamp) shows "…" and is exempt;
// visually hidden helpers (≤ 2 px boxes) are exempt.
export function checkU5(boxes) {
  const out = [];
  for (const b of boxes || []) {
    if (!b.visible || b.ellipsis || b.lineClamp) continue;
    if (b.clientWidth <= 2 || b.clientHeight <= 2) continue;
    const overX = b.clipX && b.scrollWidth > b.clientWidth + SLACK;
    const overY = b.clipY && b.scrollHeight > b.clientHeight + SLACK;
    if (overX || overY) {
      out.push(finding('U5', b.selector, overX
        ? `content ${b.scrollWidth}px in a ${b.clientWidth}px box`
        : `content ${b.scrollHeight}px tall in a ${b.clientHeight}px box`));
    }
  }
  return out;
}

// ── U6 contrast ─────────────────────────────────────────────────────────
export function checkU6(texts, canvas) {
  const out = [];
  const base = parseColor(canvas) || { r: 255, g: 255, b: 255, a: 1 };
  for (const t of texts || []) {
    if (!t.visible) continue;
    const fg0 = parseColor(t.color);
    if (!fg0) continue;
    const bg = effectiveBackground(t.bgStack, base.a ? base : { r: 255, g: 255, b: 255, a: 1 });
    if (!bg) continue;
    const alpha = (fg0.a ?? 1) * (t.opacity ?? 1);
    if (alpha <= 0.05) continue; // invisible on purpose
    const fg = blend({ ...fg0, a: alpha }, bg);
    const ratio = contrastRatio(fg, bg);
    const need = isLargeText(t.fontSize, t.fontWeight) ? 3 : 4.5;
    if (ratio < need - 0.005) {
      out.push(finding('U6', t.selector, `${ratio.toFixed(2)}:1 (needs ${need}:1)`));
    }
  }
  return out;
}

// ── U7 fixed/sticky element covers a primary button ─────────────────────
// `probes`: one row per primary button, with what sat on its centre at each
// scroll position tried (start, centre, end of the viewport). It is a
// finding only when NO position leaves it uncovered — a sticky bar a person
// can scroll past is not covering anything.
export function checkU7(probes, { phone }) {
  if (!phone) return [];
  const out = [];
  for (const p of probes || []) {
    const tries = p.positions || [];
    if (!tries.length) continue;
    const blocked = tries.filter(t => t.coveredBy);
    if (blocked.length === tries.length) {
      out.push(finding('U7', p.selector, `covered by ${blocked[0].coveredBy}`));
    }
  }
  return out;
}

// ── U8 modal on a short screen ──────────────────────────────────────────
// `modals`: each open dialog with its primary button, after the runner
// tried to scroll that button into view. A finding when the button stays
// outside the viewport or under something else.
export function checkU8(modals, { name }) {
  if (name !== 'phone-s') return [];
  const out = [];
  for (const m of modals || []) {
    if (!m.primarySelector) continue;
    if (!m.reachable) out.push(finding('U8', m.selector, `primary ${m.primarySelector} unreachable (${m.why || 'off screen'})`));
  }
  return out;
}

// ── U9 layout shift ─────────────────────────────────────────────────────
export const CLS_LIMIT = 0.1;
export function checkU9({ media = [], cls = 0 } = {}) {
  const out = [];
  for (const m of media) {
    if (!m.visible || m.hasDims) continue;
    out.push(finding('U9', m.selector, 'image/iframe without width and height'));
  }
  if (cls > CLS_LIMIT) out.push(finding('U9', 'document', `CLS ${cls.toFixed(3)} on load`));
  return out;
}

// ── U10 keyboard ────────────────────────────────────────────────────────
export function checkU10(primaries) {
  const out = [];
  for (const p of primaries || []) {
    if (!p.visible) continue;
    if (!p.focusable) out.push(finding('U10', p.selector, 'primary button not reachable by Tab'));
    else if (!p.ringVisible) out.push(finding('U10', p.selector, 'no visible focus ring'));
  }
  return out;
}

// ── U11 DESIGN.md ───────────────────────────────────────────────────────
export const BLACKLISTED_FONTS = Object.freeze(['inter', 'roboto', 'poppins', 'montserrat', 'arial', 'helvetica']);
export const ACCENTS = Object.freeze([{ r: 0xFF, g: 0xE3, b: 0x4D }, { r: 0xF5, g: 0xC5, b: 0x18 }]);

export function firstFontFamily(stack) {
  return String(stack || '').split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
}
export function isAccent(str) {
  const c = parseColor(str);
  if (!c || c.a < 0.5) return false;
  return ACCENTS.some(a => Math.abs(a.r - c.r) <= 2 && Math.abs(a.g - c.g) <= 2 && Math.abs(a.b - c.b) <= 2);
}

/**
 * `styled`: elements with { fontFamily, background, borderColors[], interactive }.
 * `interactive` = the element is, or sits inside, a link or a button — the
 * accent's one allowed background (a primary CTA).
 */
export function checkU11(styled) {
  const out = [];
  for (const s of styled || []) {
    if (!s.visible) continue;
    const fam = firstFontFamily(s.fontFamily);
    if (BLACKLISTED_FONTS.includes(fam)) out.push(finding('U11', s.selector, `font ${fam}`));
    if (isAccent(s.background) && !s.interactive) out.push(finding('U11', s.selector, 'accent as a background outside a CTA'));
    if ((s.borderColors || []).some(isAccent)) out.push(finding('U11', s.selector, 'accent as a border'));
  }
  return out;
}

// ── U12 console and requests ────────────────────────────────────────────
// Analytics and the hermetic stubs are excluded: they are what the run
// itself blocks or answers, not a defect of the page.
export const U12_IGNORE = /_vercel\/|vercel-insights|va\.vercel|clarity\.ms|googletagmanager|google-analytics|pro_events|\/track\.js|favicon\.ico/i;
export function checkU12({ consoleErrors = [], failedRequests = [], origin = '' } = {}) {
  const out = [];
  for (const e of consoleErrors) {
    const text = String(e.text || e);
    if (U12_IGNORE.test(text) || U12_IGNORE.test(String(e.url || ''))) continue;
    // A resource failure is reported once, by the request below.
    if (/^Failed to load resource/.test(text)) continue;
    out.push(finding('U12', 'console', text.slice(0, 200)));
  }
  for (const r of failedRequests) {
    const url = String(r.url || '');
    if (U12_IGNORE.test(url)) continue;
    if (origin && !url.startsWith(origin)) continue; // same-origin only
    out.push(finding('U12', 'request', `${r.status || r.failure || 'failed'} ${url.replace(origin, '')}`.slice(0, 200)));
  }
  return out;
}

// ── All checks over one collected snapshot ──────────────────────────────
export function runChecks(snap, viewport) {
  const vw = viewport.width;
  return [
    ...checkU1({ docWidth: snap.docWidth, vw }),
    ...checkU2(snap.interactive, vw),
    ...checkU3(snap.interactive, viewport),
    ...checkU4(snap.texts, viewport),
    ...checkU5(snap.clipBoxes),
    ...checkU6(snap.texts, snap.canvas),
    ...checkU7(snap.coverProbes, viewport),
    ...checkU8(snap.modals, viewport),
    ...checkU9({ media: snap.media, cls: snap.cls }),
    ...checkU10(snap.primaries),
    ...checkU11(snap.styled),
    ...checkU12({ consoleErrors: snap.consoleErrors, failedRequests: snap.failedRequests, origin: snap.origin }),
  ];
}

/** Collapse identical findings (same check + selector + page) and keep a count. */
export function dedupe(findings) {
  const map = new Map();
  for (const f of findings) {
    const key = [f.check, f.page, f.viewport, f.theme, f.selector].join('\u0001');
    if (map.has(key)) map.get(key).count++;
    else map.set(key, { ...f, count: 1 });
  }
  return [...map.values()];
}

/** Counts per check × viewport (deduplicated findings). */
export function countMatrix(findings, viewports = VIEWPORTS.map(v => v.name)) {
  const m = {};
  for (const c of Object.keys(SEVERITY)) { m[c] = {}; for (const v of viewports) m[c][v] = 0; }
  for (const f of findings) if (m[f.check] && f.viewport in m[f.check]) m[f.check][f.viewport]++;
  return m;
}

export function severityTotals(findings) {
  const t = { critical: 0, major: 0, minor: 0 };
  for (const f of findings) t[f.severity]++;
  return t;
}
