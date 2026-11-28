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

// ── Crawler signatures, 2026-11-23 (B2; docs/agent/metrics.md, "Trap: three
// crawlers stamped at the source") ────────────────────────────────────────
// A second table, beside SOFT_FINGERPRINTS rather than inside it, because
// these read the browser's own words (the user agent) and, for the app, its
// arrival: things the window-size table never needed. Same tier: soft, the
// row is written and stamped `bot: '<id>'`, never dropped. The landing
// tracker (src/track.js) carries the `landing` rows in ES5 between the
// CRAWLER_SIGNATURES markers; tests/bot-signals.test.js runs both over the
// same inputs. Measured read-only on pro_events, 2026-11-23:
//
// vp1600x1200 — a landing window never seen in the app, over all time. 30
//   landing people from 2026-11-22 (the UTC wave, spoofed bing.com
//   referrer), 0 ran, solved, signed up or saw the Pro modal.
// staleua     — a user agent older than any person who has ever acted:
//   Chrome < 126, Firefox < 110 (a real solver used 112), iOS < 13, or
//   Android < 7 (the Nexus 5 / MRA58N emulation string carries Chrome 143 on
//   Android 6, which no Chrome after 106 runs on). Landing rows carry `ua`
//   from 2026-09-15: 1,337 people in 120 days match, 1 opened the app, 0 ran,
//   solved, signed up, saw the modal or clicked checkout (of 9,393 people
//   with a `ua`, 980 of whom did). It is most of the UTC wave (Chrome 117 /
//   125, Firefox 109, Nexus 5) and 446 of ~900 Asia/Shanghai no-source
//   landers (Chrome 103-124, iOS 10-12).
// uamismatch  — a phone's user agent in a desktop-band window (>= 1024 wide):
//   an iPhone agent at 1920x1080, a Nexus 5 at 1920x1080. A phone asking for
//   the desktop site sends a desktop agent, not the reverse. 19 landing
//   people from 2026-11-22, 0 acted.
// langs2nolv  — app only: the langs = 2 cluster (docs/plans/
//   mobile-acquisition-2026-11-23.md §1a). It opens /app/?src=<page> as a
//   first visit — no aid in this browser before the app loaded, i.e. it
//   never loaded the page it claims to come from — with no landing source,
//   two browser languages and one of six rotating time zones, often at a
//   landscape phone size. 28 days to 2026-11-23: 206 people (32 mobile, 167
//   desktop, 7 tablet), 0 ran, solved or signed up; 1 saw the Pro modal,
//   which a trap-page mock link opens by itself (reason pattern_mock). Over
//   all time (`langs` from 2026-10-07; first seen 10-08): 537 people beyond
//   the window-size fingerprints, 0 ran, solved, signed up or clicked
//   checkout.
//   The time-zone clause is the trade-off: without it the rule also takes
//   2 real solvers in 28 days (America/Chicago, Asia/Calcutta). A wave that
//   moves zone walks around it; the read-side view (crawler_people) keeps
//   the behavioural rule for that.

export const STALE_UA_FLOORS = { chrome: 126, firefox: 110, ios: 13, android: 7 };

function majorOf(ua, re) {
  const m = re.exec(ua);
  return m ? parseInt(m[1], 10) : null;
}

export function staleUserAgent(userAgent) {
  const ua = String(userAgent || '');
  if (!ua) return false;
  const chrome = majorOf(ua, /Chrome\/(\d+)/);
  if (chrome !== null && chrome < STALE_UA_FLOORS.chrome) return true;
  const firefox = majorOf(ua, /Firefox\/(\d+)/);
  if (firefox !== null && firefox < STALE_UA_FLOORS.firefox) return true;
  const ios = majorOf(ua, /iPhone OS (\d+)_/);
  if (ios !== null && ios < STALE_UA_FLOORS.ios) return true;
  const android = majorOf(ua, /Android (\d+)/);
  if (android !== null && android < STALE_UA_FLOORS.android) return true;
  return false;
}

export function phoneAgentOnDesktop(userAgent, viewport) {
  const ua = String(userAgent || '');
  if (!/^desktop:/.test(String(viewport || ''))) return false;
  if (/iPad/.test(ua)) return false;
  return /iPhone|iPod/.test(ua) || (/Android/.test(ua) && /Mobile/.test(ua));
}

export const LANGS2_ZONES = ['Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Singapore', 'America/Los_Angeles', 'America/Mexico_City', 'Etc/Unknown'];

export const CRAWLER_SIGNATURES = [
  { id: 'vp1600x1200', since: '2026-11-22', match: ({ viewport }) => viewport === 'desktop:1600x1200' },
  { id: 'staleua', since: '2026-09-15', match: ({ userAgent }) => staleUserAgent(userAgent) },
  { id: 'uamismatch', since: '2026-11-22', match: ({ userAgent, viewport }) => phoneAgentOnDesktop(userAgent, viewport) },
  { id: 'langs2nolv', since: '2026-10-08', appOnly: true,
    match: ({ languages, landingSrc, arrivalSrc, tz, priorAid }) =>
      Array.isArray(languages) && languages.length === 2
      && !landingSrc
      && !!arrivalSrc && arrivalSrc !== 'home'
      && priorAid === false
      && LANGS2_ZONES.includes(tz) },
];

// The signature id, or null. `surface` 'landing' skips the app-only rows.
export function crawlerSignature(ctx = {}, surface = 'app') {
  const f = CRAWLER_SIGNATURES.find(s => (surface === 'app' || !s.appOnly) && s.match(ctx));
  return f ? f.id : null;
}

// Was there an aid in this browser before the app's own code ran? Read once,
// when this module is evaluated — before getAnonId() can mint one. The
// landing tracker mints the aid on a page's first event, so false means this
// browser never sent a landing event: whatever `?src=` says, it did not come
// from that page. null when storage cannot be read (never a signal).
export function readPriorAid(storage) {
  try {
    const s = storage !== undefined ? storage : (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return null;
    return /^[0-9a-f]{32}$/.test(String(s.getItem('sqlquest_aid') || ''));
  } catch (_) { return null; }
}
export const PRIOR_AID_AT_LOAD = readPriorAid();
