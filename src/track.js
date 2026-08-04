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

  function send(event, props) {
    try {
      if (isBot()) return;
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

  try { send('landing_view', { returning: !!localStorage.getItem('sqlquest_user') }); } catch (_) {}

  document.addEventListener('click', function (e) {
    try {
      var el = e.target && e.target.closest && e.target.closest('[data-track]');
      if (!el || !el.dataset || !el.dataset.track) return;
      send(el.dataset.track, { href: (el.getAttribute('href') || null) });
    } catch (_) {}
  }, true);
})();
