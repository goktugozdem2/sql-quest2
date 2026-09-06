// Landing-source classification — making the AI-assistant channel visible.
//
// THE PROBLEM (measured 2026-09-06)
// ---------------------------------
// The only channel that has ever produced a paying user is AI-assistant
// recommendation: both payers arrived through the `arrivalSrc='home'` door,
// and payer #2 wrote that Gemini sent him for "analytics prep". In 60 days of
// data there is not one arrival stamped chatgpt / perplexity / gemini /
// copilot / claude. The channel is real and it is dark.
//
// Mechanism: assistants link to the homepage. ChatGPT appends
// `?utm_source=chatgpt.com`, Perplexity sends a referrer — and src/track.js
// only wrote document.referrer into the landing_view row and persisted
// nothing. The visitor then clicks `/app/?src=home`, and app.jsx stamps the
// first-touch door from the explicit `?src` param. By the time the first
// event fires, the utm and the referrer are gone. Gemini sends neither and
// stays dark regardless; that is a limit of the channel, not of this code.
//
// WHY A NEW FIELD AND NOT A BETTER arrivalSrc
// -------------------------------------------
// `arrivalSrc` is the door series every open ledger claim reads
// (`door_solve_rate` in docs/agent/metrics.md). Re-labelling `home` arrivals
// as `ai:chatgpt` mid-flight would silently rewrite the history those reads
// are compared against. So `landingSrc` is a second first-touch field,
// stored under its own key, stamped alongside `arrivalSrc` on the same
// events. `home` keeps meaning "clicked the homepage CTA"; `landingSrc`
// says who sent them to the homepage. Read them together.
//
// TWO COPIES, ONE TABLE
// ---------------------
// src/track.js is a plain ES5 script injected into every static page — it
// cannot import this module. It carries an inline copy of the same table and
// the same rules, and tests/track.test.js parses that copy out of the file
// text and compares it to LANDING_SRC_TABLE, then runs the tracker and this
// helper over the same inputs. Change one, change both, or the test fails.
//
// Stored values are labels and hostnames only — never a path, never a query
// string (an assistant's share URL can carry the user's prompt).

export const LANDING_SRC_KEY = 'sqlquest_landing_src';

// [pattern, label]. A pattern matches a value exactly or as a dot-suffix
// (`chat.openai.com` matches `openai.com`). Bare words are utm_source aliases
// (`?utm_source=copilot`). Order matters only where a host is a subdomain of
// another rule: `gemini.google.com` must sit above the `google.*` search rule
// in classify(), which is why search:google is a regex there and not a row.
// LANDING_SRC_TABLE:begin — byte-for-byte the same rows as src/track.js
export const LANDING_SRC_TABLE = [
  ['chatgpt.com', 'ai:chatgpt'],
  ['openai.com', 'ai:chatgpt'],
  ['chatgpt', 'ai:chatgpt'],
  ['openai', 'ai:chatgpt'],
  ['perplexity.ai', 'ai:perplexity'],
  ['perplexity', 'ai:perplexity'],
  ['gemini.google.com', 'ai:gemini'],
  ['bard.google.com', 'ai:gemini'],
  ['gemini', 'ai:gemini'],
  ['bard', 'ai:gemini'],
  ['copilot.microsoft.com', 'ai:copilot'],
  ['copilot', 'ai:copilot'],
  ['claude.ai', 'ai:claude'],
  ['claude', 'ai:claude'],
  ['google', 'search:google'],
  ['bing.com', 'search:bing'],
  ['bing', 'search:bing'],
  ['duckduckgo.com', 'search:ddg'],
  ['duckduckgo', 'search:ddg'],
  ['reddit.com', 'social:reddit'],
  ['reddit', 'social:reddit'],
  ['linkedin.com', 'social:linkedin'],
  ['lnkd.in', 'social:linkedin'],
  ['linkedin', 'social:linkedin'],
  ['t.co', 'social:x'],
  ['twitter.com', 'social:x'],
  ['x.com', 'social:x'],
  ['twitter', 'social:x'],
  ['facebook.com', 'social:facebook'],
  ['facebook', 'social:facebook'],
  ['news.ycombinator.com', 'social:hn'],
  ['hackernews', 'social:hn'],
];
// LANDING_SRC_TABLE:end

export const MAX_UTM_LEN = 40;
export const MAX_HOST_LEN = 60;

// Normalise an explicit source value (utm_source, or ref/src on a landing
// page): lowercase, no scheme, no www., cut at the first path/query/fragment
// character so a pasted URL degrades to its host, and squash anything that
// is not a hostname character to '-'.
export function cleanSource(v) {
  if (v == null) return null;
  let s = String(v).toLowerCase().replace(/^\s+|\s+$/g, '');
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^www\./, '');
  s = s.split(/[/?#]/)[0];
  s = s.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return s || null;
}

// Host + path of a referrer, without new URL() so the ES5 copy can be the
// same code: lowercase host, userinfo and port dropped, leading www. removed.
export function parseReferrer(referrer) {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)([^?#]*)/i.exec(String(referrer || '').replace(/^\s+|\s+$/g, ''));
  if (!m) return null;
  let host = m[1].toLowerCase();
  const at = host.lastIndexOf('@');
  if (at >= 0) host = host.slice(at + 1);
  host = host.replace(/:\d+$/, '').replace(/^www\./, '');
  if (!host) return null;
  return { host, path: m[2] || '/' };
}

export function hostMatches(host, pattern) {
  return host === pattern || host.slice(-(pattern.length + 1)) === '.' + pattern;
}

export function lookupLandingSrc(value) {
  for (let i = 0; i < LANDING_SRC_TABLE.length; i++) {
    if (hostMatches(value, LANDING_SRC_TABLE[i][0])) return LANDING_SRC_TABLE[i][1];
  }
  // google.com, google.co.uk, google.com.tr — the search property. Any other
  // google subdomain (mail., docs.) is a plain referrer and falls through.
  if (/^google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(value)) return 'search:google';
  return null;
}

// Same-site is our own domain or whatever host the page is on (localhost in
// dev, a preview deployment) — a hop from the homepage to /app/ is not a
// source.
export function isSameSite(host, siteHost) {
  if (!host) return true;
  if (host === 'sqlquest.app' || host.slice(-13) === '.sqlquest.app') return true;
  const site = String(siteHost || '').toLowerCase().replace(/^www\./, '');
  return !!site && host === site;
}

// The one classification. `source` is the explicit param the caller chose
// to trust (the landing pages pass utm_source, else ref, else src; the app
// passes utm_source only — its `?src` is the arrivalSrc door and its `?ref`
// is an affiliate code). Explicit beats referrer. Returns a label or null;
// null means "store nothing", never "store unknown".
export function classifyLandingSrc({ source, referrer, siteHost } = {}) {
  const utm = cleanSource(source);
  if (utm) return lookupLandingSrc(utm) || ('utm:' + utm.slice(0, MAX_UTM_LEN));
  const r = parseReferrer(referrer);
  if (!r || isSameSite(r.host, siteHost)) return null;
  // Bing Copilot lives at bing.com/chat; plain bing.com is the search engine.
  if (hostMatches(r.host, 'bing.com') && /^\/chat(\/|$)/i.test(r.path)) return 'ai:copilot';
  return lookupLandingSrc(r.host) || ('ref:' + r.host.slice(0, MAX_HOST_LEN));
}

// First touch wins — the same rule arrivalSrc uses. Returns the value that
// is now stored (existing or new), or null when nothing was stored.
export function persistLandingSrc(storage, value) {
  try {
    const existing = storage.getItem(LANDING_SRC_KEY);
    if (existing) return existing;
    if (!value) return null;
    storage.setItem(LANDING_SRC_KEY, String(value).slice(0, 64));
    return value;
  } catch (_) {
    return null;
  }
}
