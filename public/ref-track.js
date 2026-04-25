// Affiliate referral tracking — runs on EVERY landing page.
//
// Why a separate file (not inline): partners share /, /turkce-sql-ogren/,
// /after-the-sql-course/, /after-bootcamp/, and 11 company-specific
// /<company>-sql-interview/ pages. Those pages are static HTML and never
// load app.jsx — so the module-load capture inside src/app.jsx never
// runs for them. A 1KB shared script in <head> fixes that without
// duplicating logic across 40+ HTML files.
//
// Mirrors the regex + 30-day window from src/utils/referrals.js.
// Mirrors the click-event payload shape from src/app.jsx (module-load).
//
// The Supabase URL + anon key are intentionally hardcoded here — they are
// already public (visible in app.js bundle, in the auth flow, and meant
// to be exposed; the security boundary is RLS, not key secrecy).

(function () {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

  // Mirror src/utils/referrals.js — keep these in lockstep.
  var REF_CODE_RE = /^[a-z0-9_-]{2,60}$/i;

  var SUPABASE_URL = 'https://abmgtjafghpupaqsjnwe.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFibWd0amFmZ2hwdXBhcXNqbndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzIzMjMsImV4cCI6MjA4NDUwODMyM30.8KS-UKN1r8YANggQ9HqsQmSHY95ghRL1Oq_d5LO19y4';

  try {
    var params = new URLSearchParams(window.location.search);
    var raw = params.get('ref');
    if (!raw) return;
    var trimmed = String(raw).trim();
    if (!REF_CODE_RE.test(trimmed)) return;
    var ref = trimmed.toLowerCase();

    var prev = localStorage.getItem('sqlquest_referrer');
    localStorage.setItem('sqlquest_referrer', ref);
    localStorage.setItem('sqlquest_referrer_at', String(Date.now()));

    // Persist a hint that the visitor came in via a Türkçe-flagged link
    // even before the app loads. Belt-and-suspenders for ?lang=tr.
    var lang = params.get('lang');
    if (lang === 'tr') localStorage.setItem('sqlquest_lang', 'tr');
    else if (lang === 'en') localStorage.removeItem('sqlquest_lang');

    // Surgical URL strip — keep ?challenge, ?company, ?promo, ?lang.
    // Without this, partner links would render visibly with the tag,
    // which makes them ugly to share and trips up screenshot tools.
    var clean = new URLSearchParams(window.location.search);
    clean.delete('ref');
    var search = clean.toString();
    var newUrl = window.location.pathname + (search ? '?' + search : '') + window.location.hash;
    if (window.history && typeof window.history.replaceState === 'function') {
      try { window.history.replaceState({}, document.title, newUrl); } catch (_) {}
    }

    // Fire 'click' event only when the ref actually changed — prevents
    // refresh spam from inflating click counts. Best-effort; never blocks
    // the page render and never throws.
    if (prev === ref) return;
    if (typeof fetch !== 'function') return;

    fetch(SUPABASE_URL + '/functions/v1/track-referral', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        ref_code: ref,
        event_type: 'click',
        metadata: {
          path: window.location.pathname,
          search: window.location.search.slice(0, 200),
          lang: localStorage.getItem('sqlquest_lang') || null,
          source: 'landing',
        },
      }),
      keepalive: true,
    }).catch(function () {});
  } catch (_) { /* tracking failures must never break the page */ }
})();
