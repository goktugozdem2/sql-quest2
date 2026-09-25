// Server-created Stripe Checkout Sessions — the client's pure half
// (founder's written go, 2026-09-26).
//
// Why this exists: checkout today is Stripe Payment Links, and Adaptive
// Pricing is "Always on" for Payment Links — a buyer in Turkey clicks $99 and
// meets TRY 5,021.88, with no setting that stops it (CLAUDE.md, "The Stripe
// side"). A Checkout Session created on the server can turn Adaptive Pricing
// off, so the buyer sees the USD price the modal showed. The same door lets us
// offer an optional card-required 7-day trial and a regional (India) price.
//
// The edge function is supabase/functions/create-checkout-session; the
// webhook side (trial start, first real charge, trial cancelled) is
// supabase/functions/stripe-webhook. The app.jsx wiring and the two flags
// (`checkoutSessions`, `checkoutTrial`) are described, not applied, in
// docs/plans/checkout-sessions-release.md.
//
// THE RULE THIS FILE ENCODES: checkout can never break because of this path.
// `launchWithFallback` resolves to the Payment Link on ANY failure — flag off,
// network error, non-2xx, a timeout, a body without a Stripe URL. A buyer who
// clicked a plan always reaches a Stripe page.
//
// Pure: no window, no document, no localStorage. Everything the browser owns
// is passed in, so the tests can drive every branch.

export const TRIAL_DAYS = 7;

export const CHECKOUT_PLANS = Object.freeze(['monthly', 'annual']);
export const CHECKOUT_REGIONS = Object.freeze(['default', 'IN']);

// Same shape the edge function accepts. Kept in sync by
// tests/checkout-session.test.js, which reads both files.
export const USERNAME_RE = /^[A-Za-z0-9_.@+-]{1,64}$/;
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
export const PROMO_RE = /^[A-Za-z0-9_-]{1,40}$/;

// A session URL we will navigate to. Anything else is treated as a failure
// and the Payment Link is used instead — the function never hands the browser
// an arbitrary redirect.
export const STRIPE_CHECKOUT_URL_RE = /^https:\/\/checkout\.stripe\.com\//;

// The trial promise, word for word, around the modal's OWN price string.
// There is deliberately no price in this file: the modal's price cards are
// the one source (tests/site-counts.test.js and tests/checkout-surface.test.js
// parse them), and a second copy here would be the next stale "$19".
export const TRIAL_COPY = Object.freeze({
  before: `Start ${TRIAL_DAYS}-day free trial — then `,
  after: `, cancel before day ${TRIAL_DAYS} and you pay nothing`,
});

/**
 * The sentence a plan button carries when the trial is on, built around the
 * price text the modal already prints ("$29/month").
 */
export function trialLine(priceText) {
  const p = String(priceText || '').trim();
  if (!p) return '';
  return `${TRIAL_COPY.before}${p}${TRIAL_COPY.after}`;
}

// India is the one regional price for now. The zone names are the IANA ones
// a browser reports; Asia/Calcutta is the legacy alias some still do.
const IN_TIME_ZONES = new Set(['Asia/Kolkata', 'Asia/Calcutta']);

/**
 * Which regional price to ask for. A hint only — the edge function checks the
 * request's country header when the platform provides one and falls back to
 * the default price when they disagree.
 *
 * @param {{ timeZone?: string, country?: string }} ctx
 * @returns {'default'|'IN'}
 */
export function pickRegion(ctx = {}) {
  const country = String(ctx.country || '').toUpperCase();
  if (country) return country === 'IN' ? 'IN' : 'default';
  if (IN_TIME_ZONES.has(String(ctx.timeZone || ''))) return 'IN';
  return 'default';
}

/**
 * Does this click ask Stripe for a trial? Only when BOTH flags are on (a
 * trial promised in the modal must travel on the session path — a Payment
 * Link carries no trial) and only for a subscription plan.
 */
export function wantsTrial({ sessionsOn, trialOn, plan } = {}) {
  return sessionsOn === true && trialOn === true && CHECKOUT_PLANS.includes(plan);
}

/**
 * The request body for create-checkout-session, or null when the inputs
 * cannot make a valid one (the caller then uses the Payment Link).
 */
export function buildCheckoutSessionBody({ plan, username, email, trial, promo, region } = {}) {
  if (!CHECKOUT_PLANS.includes(plan)) return null;
  const user = String(username || '');
  if (!USERNAME_RE.test(user)) return null;
  const body = {
    plan,
    region: CHECKOUT_REGIONS.includes(region) ? region : 'default',
    username: user,
    trial: trial === true,
  };
  const mail = String(email || '').trim().toLowerCase();
  if (mail && mail.length <= 254 && EMAIL_RE.test(mail)) body.email = mail;
  const code = String(promo || '').trim();
  if (code && PROMO_RE.test(code)) body.promo = code;
  return body;
}

/**
 * POST the body to the edge function and resolve to the Stripe URL.
 * Rejects — never resolves to something unusable — on a non-2xx, a body
 * without a checkout.stripe.com URL, or after `timeoutMs`.
 *
 * @returns {Promise<{ url: string, trial: boolean, region: string }>}
 */
export async function requestCheckoutSession({ fetchImpl, endpoint, anonKey, body, timeoutMs = 8000 } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('no_fetch');
  if (!endpoint || !anonKey) throw new Error('not_configured');
  if (!body) throw new Error('invalid_body');

  let timer = null;
  const timeout = new Promise((_, reject) => {
    timer = globalThis.setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });
  try {
    const res = await Promise.race([
      fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify(body),
      }),
      timeout,
    ]);
    if (!res || !res.ok) throw new Error(`http_${res ? res.status : 'none'}`);
    const data = await Promise.race([res.json(), timeout]);
    const url = data && typeof data.url === 'string' ? data.url : '';
    if (!STRIPE_CHECKOUT_URL_RE.test(url)) throw new Error('bad_url');
    return { url, trial: data.trial === true, region: typeof data.region === 'string' ? data.region : 'default' };
  } finally {
    globalThis.clearTimeout(timer);
  }
}

/**
 * The whole decision, in one place: try the session when the flag is on,
 * otherwise — or on any failure — take the Payment Link path.
 *
 * `request` returns a promise of { url }; `fallback(reason)` runs the
 * existing Payment Link navigation; `navigate(url)` sends the browser to the
 * session. Resolves to what happened, for the event.
 *
 * @returns {Promise<{ via: 'session'|'link', reason: string|null }>}
 */
export async function launchWithFallback({ sessionsOn, request, navigate, fallback } = {}) {
  if (sessionsOn !== true || typeof request !== 'function') {
    fallback('flag_off');
    return { via: 'link', reason: 'flag_off' };
  }
  let result;
  try {
    result = await request();
  } catch (err) {
    const reason = (err && err.message) || 'error';
    fallback(reason);
    return { via: 'link', reason };
  }
  if (!result || !STRIPE_CHECKOUT_URL_RE.test(String(result.url || ''))) {
    fallback('bad_url');
    return { via: 'link', reason: 'bad_url' };
  }
  try {
    navigate(result.url);
  } catch (_) {
    fallback('navigate_failed');
    return { via: 'link', reason: 'navigate_failed' };
  }
  return { via: 'session', reason: null };
}
