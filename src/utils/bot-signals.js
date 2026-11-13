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

// Fingerprints seen in production with no solves, ever.
// Each entry carries the date it was measured; a new one needs a read.
export const SOFT_FINGERPRINTS = [
  // 2026-11-12: the no-source clause let 49 through from 2026-10-05, New
  // York, carrying `search:google`. 916 people at this size over all time,
  // none ever ran a query: the window size alone.
  { id: 'vp1919x992', since: '2026-10-06', match: ({ viewport }) => viewport === 'desktop:1919x992' },
  { id: 'la1920x1080', since: '2026-09-17', match: ({ viewport, landingSrc, tz }) => viewport === 'desktop:1920x1080' && tz === 'America/Los_Angeles' && !landingSrc },
  { id: 'utc1280x720', since: '2026-09-30', match: ({ viewport, tz }) => viewport === 'desktop:1280x720' && tz === 'UTC' },
  // The 800x600 tablet crawler. Found 2026-10-18 as LA with no landing
  // source (308 then); on 2026-11-05 it came back as Asia/Shanghai carrying
  // `ref:aocr.org`, 378 more in four days. Measured 2026-11-12 over all
  // time: 943 people opened the app at tablet:800x600, in three time zones,
  // with and without a landing source, and not one ever ran a query, solved,
  // or signed up. So the window size alone: a tz or a landing-source clause
  // is what the second wave walked around. Soft, so a person is never lost.
  { id: 'tab800x600', since: '2026-08-12', match: ({ viewport }) => viewport === 'tablet:800x600' },
  // 2026-11-12: 511 people from 2026-10-15, every one Asia/Shanghai with no
  // landing source, none ever ran a query, signed up or solved; still
  // arriving. Nobody else has ever opened the app at this size.
  { id: 'vp1280x1200', since: '2026-10-15', match: ({ viewport }) => viewport === 'desktop:1280x1200' },
  // Referrer spam: a landing source that is only ever a crawler's.
  { id: 'refspam', since: '2026-10-28', match: ({ landingSrc }) => isSpamReferrer(landingSrc) },
];

// Hosts whose referrals are only ever crawlers (2026-11-12). aocr.org: 816
// landing_view people from 2026-10-28, all Asia/Shanghai, then the 378 app
// openers above; none ran a query. The landing tracker (src/track.js) keeps
// the same list, character for character (tests/bot-signals.test.js), and
// stamps `bot: 'refspam'` on its rows — it never drops them.
export const SPAM_REFERRERS = ['aocr.org'];

// `landingSrc` as both trackers store it: 'ref:<host>' (www. already gone).
export function isSpamReferrer(landingSrc) {
  const m = /^ref:(.+)$/.exec(String(landingSrc || ''));
  if (!m) return false;
  const host = m[1].toLowerCase();
  return SPAM_REFERRERS.some(d => host === d || host.endsWith('.' + d));
}

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
