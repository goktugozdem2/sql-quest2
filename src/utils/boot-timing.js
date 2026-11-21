// Real-user boot timing for /app (2026-11-22, BACKLOG item 10).
//
// The backlog's perf item says "measure LCP/INP on /app first": /app pulls
// ~1 MB gzipped (app.js 376 KB + data.js 646 KB) before it is useful, and
// the only number we had was the smoke runner's shell time from a GitHub
// data centre (923 ms on 2026-11-21) — not a visitor's phone in India. This
// stamps the visitor's own numbers on `app_opened` (once per browser per
// day, fired when the session has settled), so the split-data.js decision
// is made on what people actually wait.
//
// All values are whole milliseconds measured from navigation start, or null
// when the browser does not expose them. Never a URL, never a size.
//   bootMs    — navigation start → the session settled (app_opened fires)
//   renderMs  — navigation start → React render requested (app.html)
//   lcpMs     — largest contentful paint so far (Chromium; app.html observer)
//   appJsMs   — fetch time of app.js (resource timing, start → responseEnd)
//   dataJsMs  — fetch time of data.js
//   net       — navigator.connection.effectiveType ('4g', '3g', …)

const ms = v => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);

export function bootTiming({ perf, nav, win } = {}) {
  const out = { bootMs: null, renderMs: null, lcpMs: null, appJsMs: null, dataJsMs: null, net: null };
  try {
    if (perf && typeof perf.now === 'function') out.bootMs = ms(perf.now());
    if (win) {
      out.renderMs = ms(win.sqRenderMs);
      out.lcpMs = ms(win.sqLcpMs);
    }
    if (perf && typeof perf.getEntriesByType === 'function') {
      const entries = perf.getEntriesByType('resource') || [];
      const fetchMs = file => {
        const e = entries.find(r => typeof r.name === 'string' && new RegExp(`/${file}(\\?|$)`).test(r.name));
        return e ? ms(e.responseEnd - e.startTime) : null;
      };
      out.appJsMs = fetchMs('app\\.js');
      out.dataJsMs = fetchMs('data\\.js');
    }
    const conn = nav && nav.connection;
    if (conn && typeof conn.effectiveType === 'string') out.net = conn.effectiveType.slice(0, 8);
  } catch (_) {
    // timing is best-effort; never break the event
  }
  return out;
}
