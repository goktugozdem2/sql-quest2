// The upstream crawler user-agent list as a stamp (2026-11-24).
//
// BOT_UA_RE (src/utils/bot-signals.js) is hand-kept and drops a row whose
// user agent names itself a bot. It misses fetchers with no "bot" in the
// name — GoogleOther and Google-NotebookLM were 155 of 972 new landing
// people in the week to 2026-11-24. monperrus/crawler-user-agents (MIT,
// exact-pinned devDependency) names them; scripts/vendor-crawler-ua.mjs
// writes the patterns BOT_UA_RE does not already cover into
// src/data/crawler-user-agents.js and into src/track.js.
//
// Measurement only: the landing tracker stamps `cuaBot` on landing_view.
// Nothing is dropped, nothing a visitor sees changes, and no read filters on
// it until a metric PR says so. This module is the testable half (and what a
// Node read script can import); the app does not bundle it — no listed
// fetcher has ever opened the app, and the list is 6.5 kB gzip of app.js.
import { CRAWLER_UA_PATTERNS } from '../data/crawler-user-agents.js';

let re = null;

export function isListedCrawler(userAgent) {
  const ua = String(userAgent || '');
  if (!ua) return false;
  if (!re) re = new RegExp(CRAWLER_UA_PATTERNS.join('|'));
  return re.test(ua);
}
