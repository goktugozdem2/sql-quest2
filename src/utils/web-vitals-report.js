// Real-user page speed — the /app half of metric `web_vitals`
// (docs/agent/metrics.md; ledger "real-user speed is measured", 2026-11-24).
//
// WHY
// ---
// Landed → first solve was 20.1% on desktop and 3.2% on mobile (AN read
// 2026-11-24), and nothing said whether slow loads are part of it: the app's
// own `lcpMs` (boot-timing.js, metric app_boot) covers /app only, once a day,
// with no INP or CLS, and Vercel Speed Insights cannot be joined to a solve.
// Google's `web-vitals` library (exact-pinned, the attribution-free build,
// copied to /web-vitals.js by scripts/build-static-pages.js) reports the five
// numbers; this module turns each report into one `web_vital` row.
//
// THE RULES (each one pinned by tests/web-vitals.test.js)
// -------------------------------------------------------
// - One row per metric per page load: the first report wins. CLS and INP
//   report again as they grow and after a back-forward-cache restore; those
//   later reports are dropped.
// - The payload is built from an allowlist. Never the metric's `entries`
//   (DOM nodes), never a URL or query string, never the referrer.
// - Loaded lazily — after `load`, at the first idle moment — so the measuring
//   never competes with the page it measures.
// - Nothing is loaded for a muted browser (localhost), a bot (hard or soft
//   signal) or an internal account.
//
// src/track.js carries an ES5 copy of `vitalDevice` / `vitalPayload` /
// `isInternalUser` between WEB_VITALS:begin/end (it cannot import); the test
// runs both over the same inputs. Change one, change both.

import { isInternalAccount } from './leagues.js';

// Must equal package.json's exact pin and VITALS_LIB in src/track.js (test-bound).
export const WEB_VITALS_VERSION = '6.2.3';
export const VITALS_SCRIPT_SRC = '/web-vitals.js';
export const VITAL_NAMES = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB'];
const RATINGS = ['good', 'needs-improvement', 'poor'];
const NAV_TYPES = ['navigate', 'reload', 'back-forward', 'back-forward-cache', 'prerender', 'restore'];

/** mobile below 768 px wide (the `mobile:` viewport band), else desktop. */
export function vitalDevice(width) {
  const w = Number(width);
  if (!Number.isFinite(w) || w <= 0) return null;
  return w < 768 ? 'mobile' : 'desktop';
}

/**
 * The row for one library report, or null when the report is not one of the
 * five metrics or carries no usable value. Only these keys, ever.
 */
export function vitalPayload(metric, width) {
  if (!metric || VITAL_NAMES.indexOf(metric.name) < 0) return null;
  const v = Number(metric.value);
  if (!Number.isFinite(v) || v < 0) return null;
  return {
    name: metric.name,
    value: metric.name === 'CLS' ? Math.round(v * 10000) / 10000 : Math.round(v),
    rating: RATINGS.indexOf(metric.rating) >= 0 ? metric.rating : null,
    device: vitalDevice(width),
    navType: NAV_TYPES.indexOf(metric.navigationType) >= 0 ? metric.navigationType : null,
    lib: WEB_VITALS_VERSION,
  };
}

/** A signed-in internal account (leagues.js rule). Guests are never internal. */
export function isInternalUser(username) {
  const u = String(username || '');
  if (!u || u === 'guest' || /^guest_/.test(u)) return false;
  return isInternalAccount(u);
}

/** One `web_vital` per metric per page load: the first report wins. */
export function createVitalReporter(send, getWidth) {
  const sent = {};
  return metric => {
    try {
      const p = vitalPayload(metric, getWidth ? getWidth() : null);
      if (!p || sent[p.name]) return;
      sent[p.name] = true;
      send(p);
    } catch {}
  };
}

/**
 * Load the library at the first idle moment after `load` and wire the five
 * callbacks to `send(payload)`. Returns true when it armed (or will arm),
 * false when this browser is not measured. Once per document.
 */
export function armWebVitals({ win, doc, send, blocked }) {
  try {
    if (blocked || !win || !doc || typeof send !== 'function') return false;
    if (win.__sqVitalsArmed) return false;
    win.__sqVitalsArmed = true;
    const report = createVitalReporter(send, () => win.innerWidth);
    const wire = () => {
      const wv = win.webVitals;
      if (!wv) return;
      ['onLCP', 'onINP', 'onCLS', 'onFCP', 'onTTFB'].forEach(fn => {
        try { if (typeof wv[fn] === 'function') wv[fn](report); } catch {}
      });
    };
    const inject = () => {
      try {
        if (win.webVitals) { wire(); return; }
        const s = doc.createElement('script');
        s.src = VITALS_SCRIPT_SRC;
        s.async = true;
        s.onload = wire;
        (doc.head || doc.body || doc.documentElement).appendChild(s);
      } catch {}
    };
    const idle = () => {
      if (typeof win.requestIdleCallback === 'function') win.requestIdleCallback(inject, { timeout: 3000 });
      else win.setTimeout(inject, 1);
    };
    if (doc.readyState === 'complete') idle();
    else win.addEventListener('load', idle, { once: true });
    return true;
  } catch { return false; }
}
