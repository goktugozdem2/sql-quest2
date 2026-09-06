/* First-party landing analytics.
 *
 * WHY THIS EXISTS
 * ---------------
 * The landing pages called trackLanding(), which sends only to window.va —
 * Vercel's custom-events API. Vercel's own pricing table lists Custom Events
 * as unavailable on Hobby, and this team is on Hobby (verified 2026-07-28 for
 * both the personal account and team_boYL1sce...). So every landing_view,
 * cta_hero_primary, cta_coach_section, faq_open and scroll_depth ever fired
 * has been silently discarded. pro_events confirms it: zero rows for all
 * five, ever. CLAUDE.md documented them as live analytics.
 *
 * That left the marketing funnel with a product side and no denominator. We
 * know 167 people arrived at the app from the homepage in 30 days
 * (arrivalSrc, which does work); we have never known how many saw it.
 *
 * WHY NOT JUST UPGRADE TO PRO
 * ---------------------------
 * $20/mo would buy custom events back, but it would not close the loop:
 * app.html is the only one of 47 pages without the Vercel analytics script,
 * and Hobby/Pro alike offer no join between a pageview and a later solve.
 * Writing to our own table does close it — every row here carries the same
 * `aid` the app stamps (src/utils/anon-id.js), so a landing_view and a
 * challenge_solved 20 minutes later are the same browser.
 *
 * It also removes two Hobby constraints that would have bitten later: the
 * 1-month reporting window (older data is gone, not recoverable) and the
 * 50,000 events/month cap shared across all ten projects on this team.
 *
 * SCOPE
 * -----
 * Injected by scripts/build-static-pages.js into every page carrying the
 * Vercel insights script, so coverage does not depend on remembering to add
 * it to the next landing page. Fires landing_view on load and relays clicks
 * on [data-track] elements. Deliberately does NOT touch the existing
 * trackLanding() — that keeps feeding window.va, which costs nothing and
 * starts working if the team ever moves to Pro.
 *
 * Known remainder: faq_open and scroll_depth are called directly through
 * trackLanding rather than via [data-track], so they stay Vercel-only (i.e.
 * still discarded) until those call sites are moved.
 */
(function () {
  'use strict';

  var ENDPOINT = 'https://abmgtjafghpupaqsjnwe.supabase.co/rest/v1/pro_events';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4';

  // Same key and format as src/utils/anon-id.js. These two MUST agree — the
  // whole point is that a landing page and the app produce one id for one
  // browser. If you change the format there, change it here.
  var AID_KEY = 'sqlquest_aid';

  function aid() {
    try {
      var existing = localStorage.getItem(AID_KEY);
      if (existing && /^[0-9a-f]{32}$/.test(existing)) return existing;
    } catch (_) {}
    var out = '';
    try {
      if (window.crypto && crypto.randomUUID) {
        out = crypto.randomUUID().replace(/-/g, '');
      } else if (window.crypto && crypto.getRandomValues) {
        var b = new Uint8Array(16);
        crypto.getRandomValues(b);
        for (var i = 0; i < b.length; i++) out += ('0' + b[i].toString(16)).slice(-2);
      }
    } catch (_) {}
    if (!/^[0-9a-f]{32}$/.test(out)) {
      out = '';
      for (var j = 0; j < 32; j++) out += Math.floor(Math.random() * 16).toString(16);
    }
    try { localStorage.setItem(AID_KEY, out); } catch (_) {}
    return out;
  }

  // Cheap bot filter. Vercel drops known crawlers server-side; we do not get
  // that for free, and an inflated denominator is worse than no denominator
  // because it makes conversion look broken. Not exhaustive — treat these
  // counts as "browsers that ran JS", which is the honest description.
  function isBot() {
    try {
      if (navigator.webdriver) return true;
      // Google-InspectionTool (the GSC "Test live URL" fetcher) carries no
      // 'bot' substring, so it sailed through and landed 47 aids in the
      // 2026-08-03 landing read — one unique aid per view, all tz
      // America/Los_Angeles, ~28% of every landing number. Same for
      // Chrome-Lighthouse and the AdsBot variants.
      return /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pagespeed|gtmetrix|ahrefs|semrush|inspectiontool|google-read|adsbot|apis-google|mediapartners/i
        .test(navigator.userAgent || '');
    } catch (_) { return false; }
  }

  // Page identity that matches how arrivalSrc names things, so the two sides
  // of the funnel join on the same string: "/" -> home, "/x/" -> x.
  function slug() {
    try {
      var p = (location.pathname || '/').replace(/\/+$/, '').replace(/^\/+/, '');
      p = p.replace(/\.html$/, '');
      return p === '' || p === 'index' ? 'home' : p;
    } catch (_) { return 'unknown'; }
  }

  // ── Landing source: the AI-assistant channel (2026-09-06) ─────────────
  //
  // The only channel that has ever produced a paying user is AI-assistant
  // recommendation — both payers arrived as arrivalSrc='home', and payer #2
  // wrote that Gemini sent him for "analytics prep" — and it was invisible:
  // zero arrivals stamped chatgpt/perplexity/gemini/copilot/claude in 60
  // days. Assistants link to the homepage; ChatGPT appends
  // ?utm_source=chatgpt.com and Perplexity sends a referrer. This file wrote
  // the referrer into landing_view and persisted nothing, so when the
  // visitor clicked /app/?src=home the app stamped first-touch
  // arrivalSrc='home' from the explicit ?src and the utm/referrer was gone.
  //
  // `landingSrc` is a NEW first-touch field under its own key, stamped next
  // to arrivalSrc on the app's events. It is deliberately not a change to
  // arrivalSrc: `home` is the door series every open ledger claim reads
  // (door_solve_rate), and re-labelling those rows mid-flight would rewrite
  // the history the claims compare against. `home` keeps meaning "clicked
  // the homepage CTA"; landingSrc says who sent them there. Gemini sends no
  // utm and no referrer, so it stays dark — that is the channel's limit.
  //
  // This block is an ES5 copy of src/utils/landing-src.js (this file cannot
  // import). tests/track.test.js parses LANDING_SRC_TABLE out of this text,
  // compares it to the module's export, and runs both over the same inputs.
  // Change one, change both. Stored values are labels and hostnames only —
  // never a path or query string; an assistant share URL can carry a prompt.
  var LANDING_SRC_KEY = 'sqlquest_landing_src';
  var MAX_UTM_LEN = 40;
  var MAX_HOST_LEN = 60;

  // LANDING_SRC_TABLE:begin — byte-for-byte the same rows as src/utils/landing-src.js
  var LANDING_SRC_TABLE = [
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

  function cleanSource(v) {
    if (v == null) return null;
    var s = String(v).toLowerCase().replace(/^\s+|\s+$/g, '');
    s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^www\./, '');
    s = s.split(/[/?#]/)[0];
    s = s.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return s || null;
  }

  function parseReferrer(referrer) {
    var m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)([^?#]*)/i.exec(String(referrer || '').replace(/^\s+|\s+$/g, ''));
    if (!m) return null;
    var host = m[1].toLowerCase();
    var at = host.lastIndexOf('@');
    if (at >= 0) host = host.slice(at + 1);
    host = host.replace(/:\d+$/, '').replace(/^www\./, '');
    if (!host) return null;
    return { host: host, path: m[2] || '/' };
  }

  function hostMatches(host, pattern) {
    return host === pattern || host.slice(-(pattern.length + 1)) === '.' + pattern;
  }

  function lookupLandingSrc(value) {
    for (var i = 0; i < LANDING_SRC_TABLE.length; i++) {
      if (hostMatches(value, LANDING_SRC_TABLE[i][0])) return LANDING_SRC_TABLE[i][1];
    }
    if (/^google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(value)) return 'search:google';
    return null;
  }

  function isSameSite(host, siteHost) {
    if (!host) return true;
    if (host === 'sqlquest.app' || host.slice(-13) === '.sqlquest.app') return true;
    var site = String(siteHost || '').toLowerCase().replace(/^www\./, '');
    return !!site && host === site;
  }

  function classifyLandingSrc(source, referrer, siteHost) {
    var utm = cleanSource(source);
    if (utm) return lookupLandingSrc(utm) || ('utm:' + utm.slice(0, MAX_UTM_LEN));
    var r = parseReferrer(referrer);
    if (!r || isSameSite(r.host, siteHost)) return null;
    if (hostMatches(r.host, 'bing.com') && /^\/chat(\/|$)/i.test(r.path)) return 'ai:copilot';
    return lookupLandingSrc(r.host) || ('ref:' + r.host.slice(0, MAX_HOST_LEN));
  }

  // No URLSearchParams — this runs on every static page, in whatever the
  // visitor brought. Returns the decoded raw value or null.
  function param(name) {
    try {
      var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search || '');
      if (!m) return null;
      var v = m[1].replace(/\+/g, ' ');
      try { v = decodeURIComponent(v); } catch (_) {}
      v = v.replace(/^\s+|\s+$/g, '');
      return v || null;
    } catch (_) { return null; }
  }

  // utm_source for the event row (this view's, not the first touch), run
  // through the same cleanSource as the persisted key and capped so a junk
  // value cannot bloat metadata. 2026-09-06 review: this returned the raw
  // param, so `?utm_source=some.site/with/path?x=1` persisted `utm:some.site`
  // but the landing_view row carried the whole path and query — the one
  // param an assistant share URL controls, and the one this file promises
  // never to store. Hostname only, on the row as well as in storage.
  function utmSource() {
    var v = cleanSource(param('utm_source'));
    return v ? v.slice(0, MAX_UTM_LEN) : null;
  }

  function landingSrc() {
    try { return localStorage.getItem(LANDING_SRC_KEY) || null; } catch (_) { return null; }
  }

  // First touch wins — the same rule arrivalSrc uses in app.jsx. Explicit
  // param beats referrer: utm_source, else ref, else src (an assistant or a
  // share link can carry any of the three onto a landing page). Runs before
  // the bot/localhost gate on purpose: persisting is local and harmless, and
  // the landing_view row must already carry the value.
  function persistLandingSrc() {
    try {
      if (localStorage.getItem(LANDING_SRC_KEY)) return;
      var source = param('utm_source') || param('ref') || param('src');
      var value = classifyLandingSrc(source, document.referrer, location.hostname);
      if (value) localStorage.setItem(LANDING_SRC_KEY, String(value).slice(0, 64));
    } catch (_) {}
  }

  function send(event, props) {
    try {
      if (isBot()) return;
      // Local dev and headless smoke runs must not write production analytics —
      // each run mints a fresh aid, so no static exclusion list can catch it.
      // Same guard as ANALYTICS_MUTED in src/app.jsx.
      if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
      var meta = props || {};
      meta.aid = aid();
      meta.page = slug();
      // LANDING_VARIANT is declared `const` at the top level of an inline
      // script, so it lives in the global LEXICAL scope and never appears on
      // window — checking window.LANDING_VARIANT silently yields null on
      // every page. A bare reference resolves it; this file is deferred, so
      // the inline declaration has already run. Guarded because only the
      // three variant pages declare it at all.
      try { meta.variant = (typeof LANDING_VARIANT === 'string') ? LANDING_VARIANT : null; }
      catch (_) { meta.variant = null; }
      try { meta.ref = document.referrer ? document.referrer.slice(0, 200) : null; } catch (_) {}
      // utm = this view's utm_source, cleaned to a hostname-shaped label;
      // landingSrc = the browser's first-touch classification (see the
      // landing-source block above).
      // Both on every row, so a cta_* click is attributable without a join.
      try { meta.utm = utmSource(); } catch (_) { meta.utm = null; }
      meta.landingSrc = landingSrc();
      try { meta.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (_) {}

      var user = null;
      try { user = localStorage.getItem('sqlquest_user') || null; } catch (_) {}

      var body = JSON.stringify({
        event: event,
        username: user || 'guest',
        reason: 'landing',
        metadata: JSON.stringify(meta),
        created_at: new Date().toISOString()
      });

      // keepalive so a click that navigates away still reports — without it
      // cta_* would under-count exactly the clicks we most want to measure.
      fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,
        headers: {
          'apikey': ANON_KEY,
          'Authorization': 'Bearer ' + ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: body
      }).catch(function () {});
    } catch (_) {}
  }

  window.sqTrack = send;

  persistLandingSrc();
  try { send('landing_view', { returning: !!localStorage.getItem('sqlquest_user') }); } catch (_) {}

  document.addEventListener('click', function (e) {
    try {
      var el = e.target && e.target.closest && e.target.closest('[data-track]');
      if (!el || !el.dataset || !el.dataset.track) return;
      send(el.dataset.track, { href: (el.getAttribute('href') || null) });
    } catch (_) {}
  }, true);
})();
