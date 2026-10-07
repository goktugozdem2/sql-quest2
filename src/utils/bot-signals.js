// Bot signals for the APP's events (2026-10-07).
//
// The landing tracker (src/track.js) has dropped self-declared bots since
// July. The app's event writer never did, and on 2026-10-06/07 a crawler
// that ignores robots.txt walked the topic pages' /app/?challenge= links:
// viewport exactly desktop:1919x992, no landingSrc, five rotating US time
// zones, ~3 events, no solve — 184 of 228 "new people" on 10-06 and 360 of
// 406 by 14:00 on 10-07 (docs/reads/p1-guardrail-bing-2026-10-07.md). Every
// one entered first_solve_10m, the quota and the funnel as a person.
//
// Two tiers:
//   hard — navigator.webdriver, or a user agent that names itself a bot.
//          The event is not written at all (the landing tracker's rule).
//   soft — a known crawler fingerprint with no landing source. The event is
//          written and stamped `bot: '<fingerprint>'`, so a read can exclude
//          it and a false positive is never lost.
// `app_opened` also carries three coarse signals (wd, uaBot, langs) so the
// next wave can be told apart from people by what the browser says, not only
// by its window size.

// Kept identical to isBot() in src/track.js (tests/bot-signals.test.js).
export const BOT_UA_RE = /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pagespeed|gtmetrix|ahrefs|semrush|inspectiontool|google-read|adsbot|apis-google|mediapartners|facebookexternalhit|embedly|chatgpt-user|perplexity-user|claude-user|python|curl\/|wget|go-http|axios|node-fetch|java\//i;

// Fingerprints seen in production with no landing source and no solves.
// Each entry carries the date it was measured; a new one needs a read.
export const SOFT_FINGERPRINTS = [
  { id: 'vp1919x992', since: '2026-10-06', match: ({ viewport, landingSrc }) => viewport === 'desktop:1919x992' && !landingSrc },
  { id: 'la1920x1080', since: '2026-09-17', match: ({ viewport, landingSrc, tz }) => viewport === 'desktop:1920x1080' && tz === 'America/Los_Angeles' && !landingSrc },
  { id: 'utc1280x720', since: '2026-09-30', match: ({ viewport, tz }) => viewport === 'desktop:1280x720' && tz === 'UTC' },
];

export function botSignals({ userAgent = '', webdriver = false, languages = null, viewport = null, landingSrc = null, tz = null } = {}) {
  const uaBot = BOT_UA_RE.test(String(userAgent || ''));
  const wd = webdriver === true;
  const hard = wd || uaBot;
  const fp = SOFT_FINGERPRINTS.find(f => f.match({ viewport, landingSrc, tz }));
  return {
    hard,
    soft: fp ? fp.id : null,
    // coarse, never the UA string itself
    wd,
    uaBot,
    langs: Array.isArray(languages) ? languages.length : null,
  };
}

// What the writer does with an event.
export function botDecision(signals) {
  if (!signals) return { write: true, stamp: null };
  if (signals.hard) return { write: false, stamp: null };
  return { write: true, stamp: signals.soft };
}
