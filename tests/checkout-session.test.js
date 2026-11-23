// Server-created Checkout Sessions (founder's go, 2026-09-26).
//
// Two halves: the client's pure module (src/utils/checkout-session.js) and the
// edge function that creates the session
// (supabase/functions/create-checkout-session). The function runs on Deno and
// has no harness here, so it gets source guards; the module gets real tests.
//
// The one promise under all of it: a buyer who clicked a plan always reaches
// a Stripe page. `launchWithFallback` takes the Payment Link on ANY failure.
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TRIAL_DAYS,
  TRIAL_COPY,
  USERNAME_RE,
  EMAIL_RE,
  PROMO_RE,
  trialLine,
  pickRegion,
  wantsTrial,
  buildCheckoutSessionBody,
  requestCheckoutSession,
  launchWithFallback,
} from '../src/utils/checkout-session.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(join(ROOT, p), 'utf8');
const fn = read('supabase/functions/create-checkout-session/index.ts');
const code = fn.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const SESSION_URL = 'https://checkout.stripe.com/c/pay/cs_test_abc';
const okFetch = body => vi.fn(async () => ({ ok: true, status: 200, json: async () => body }));

describe('the trial promise', () => {
  it("is the founder's sentence, around the modal's own price text", () => {
    expect(trialLine('$29/month')).toBe(
      'Start 7-day free trial — then $29/month, cancel before day 7 and you pay nothing',
    );
    expect(TRIAL_DAYS).toBe(7);
  });

  it('carries no price of its own (the modal cards are the one source)', () => {
    expect(TRIAL_COPY.before + TRIAL_COPY.after).not.toMatch(/\$\d/);
    const moduleCode = read('src/utils/checkout-session.js').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
    expect(moduleCode).not.toMatch(/\$\d/);
    expect(trialLine('')).toBe('');
  });

  it('is offered only when both flags are on, and only for a subscription plan', () => {
    expect(wantsTrial({ sessionsOn: true, trialOn: true, plan: 'monthly' })).toBe(true);
    expect(wantsTrial({ sessionsOn: true, trialOn: true, plan: 'annual' })).toBe(true);
    // a Payment Link carries no trial, so the trial never rides without sessions
    expect(wantsTrial({ sessionsOn: false, trialOn: true, plan: 'monthly' })).toBe(false);
    expect(wantsTrial({ sessionsOn: true, trialOn: false, plan: 'monthly' })).toBe(false);
    expect(wantsTrial({ sessionsOn: true, trialOn: true, plan: 'lifetime' })).toBe(false);
    // a missing flag key reads TRUE in window.FF — only === true counts here
    expect(wantsTrial({ sessionsOn: 'true', trialOn: 1, plan: 'monthly' })).toBe(false);
  });
});

describe('region', () => {
  it('India by time zone, otherwise the default price', () => {
    expect(pickRegion({ timeZone: 'Asia/Kolkata' })).toBe('IN');
    expect(pickRegion({ timeZone: 'Asia/Calcutta' })).toBe('IN');
    expect(pickRegion({ timeZone: 'Europe/Istanbul' })).toBe('default');
    expect(pickRegion({})).toBe('default');
  });

  it('a known country wins over the time zone', () => {
    expect(pickRegion({ country: 'us', timeZone: 'Asia/Kolkata' })).toBe('default');
    expect(pickRegion({ country: 'IN', timeZone: 'America/New_York' })).toBe('IN');
  });
});

describe('the request body', () => {
  it('carries exactly the fields the function accepts', () => {
    expect(buildCheckoutSessionBody({
      plan: 'annual', username: 'guest_1727', email: ' A@B.co ', trial: true, promo: 'FRIEND20', region: 'IN',
    })).toEqual({ plan: 'annual', region: 'IN', username: 'guest_1727', trial: true, email: 'a@b.co', promo: 'FRIEND20' });
  });

  it('refuses a plan or username that cannot make a valid session', () => {
    expect(buildCheckoutSessionBody({ plan: 'lifetime', username: 'x' })).toBeNull();
    expect(buildCheckoutSessionBody({ plan: 'quarterly', username: 'x' })).toBeNull();
    expect(buildCheckoutSessionBody({ plan: 'monthly', username: '' })).toBeNull();
    expect(buildCheckoutSessionBody({ plan: 'monthly', username: 'a b' })).toBeNull();
    expect(buildCheckoutSessionBody({ plan: 'monthly', username: 'x'.repeat(65) })).toBeNull();
  });

  it('drops a bad email, promo or region rather than sending it', () => {
    const b = buildCheckoutSessionBody({ plan: 'monthly', username: 'ada', email: 'nope', promo: 'x y', region: 'US', trial: 'yes' });
    expect(b).toEqual({ plan: 'monthly', region: 'default', username: 'ada', trial: false });
  });
});

describe('requestCheckoutSession', () => {
  const base = { endpoint: 'https://x.supabase.co/functions/v1/create-checkout-session', anonKey: 'anon', body: { plan: 'monthly' } };

  it('resolves to the Stripe URL on success', async () => {
    const f = okFetch({ url: SESSION_URL, trial: true, region: 'default' });
    await expect(requestCheckoutSession({ ...base, fetchImpl: f })).resolves.toEqual({ url: SESSION_URL, trial: true, region: 'default' });
    const [, init] = f.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ plan: 'monthly' });
  });

  it('rejects on a non-2xx', async () => {
    const f = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({ error: 'checkout_unavailable' }) }));
    await expect(requestCheckoutSession({ ...base, fetchImpl: f })).rejects.toThrow('http_502');
  });

  it('rejects a URL that is not Stripe Checkout', async () => {
    await expect(requestCheckoutSession({ ...base, fetchImpl: okFetch({ url: 'https://evil.example/pay' }) })).rejects.toThrow('bad_url');
    await expect(requestCheckoutSession({ ...base, fetchImpl: okFetch({}) })).rejects.toThrow('bad_url');
  });

  it('rejects after the timeout instead of leaving the buyer on a dead button', async () => {
    const hang = vi.fn(() => new Promise(() => {}));
    await expect(requestCheckoutSession({ ...base, fetchImpl: hang, timeoutMs: 20 })).rejects.toThrow('timeout');
  });

  it('rejects when it is not configured', async () => {
    await expect(requestCheckoutSession({ ...base, anonKey: '', fetchImpl: okFetch({ url: SESSION_URL }) })).rejects.toThrow('not_configured');
    await expect(requestCheckoutSession({ ...base, body: null, fetchImpl: okFetch({ url: SESSION_URL }) })).rejects.toThrow('invalid_body');
  });
});

describe('launchWithFallback — checkout can never break', () => {
  const run = opts => {
    const navigate = vi.fn();
    const fallback = vi.fn();
    return { navigate, fallback, p: launchWithFallback({ navigate, fallback, ...opts }) };
  };

  it('flag off: the Payment Link, and the session is never requested', async () => {
    const request = vi.fn();
    const { navigate, fallback, p } = run({ sessionsOn: false, request });
    expect(await p).toEqual({ via: 'link', reason: 'flag_off' });
    expect(request).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('flag on: navigates to the session', async () => {
    const { navigate, fallback, p } = run({ sessionsOn: true, request: async () => ({ url: SESSION_URL }) });
    expect(await p).toEqual({ via: 'session', reason: null });
    expect(navigate).toHaveBeenCalledWith(SESSION_URL);
    expect(fallback).not.toHaveBeenCalled();
  });

  it('any error on the way falls back to the Payment Link', async () => {
    for (const request of [
      async () => { throw new Error('http_502'); },
      async () => { throw new Error('timeout'); },
      async () => { throw undefined; },
      async () => null,
      async () => ({ url: 'https://evil.example/' }),
    ]) {
      const { navigate, fallback, p } = run({ sessionsOn: true, request });
      const out = await p;
      expect(out.via).toBe('link');
      expect(fallback).toHaveBeenCalledTimes(1);
      expect(navigate).not.toHaveBeenCalled();
    }
  });

  it('a navigation that throws falls back too', async () => {
    const fallback = vi.fn();
    const out = await launchWithFallback({
      sessionsOn: true,
      request: async () => ({ url: SESSION_URL }),
      navigate: () => { throw new Error('blocked'); },
      fallback,
    });
    expect(out).toEqual({ via: 'link', reason: 'navigate_failed' });
    expect(fallback).toHaveBeenCalledWith('navigate_failed');
  });
});

describe('create-checkout-session: the edge function', () => {
  it('validates with the same shapes as the client module', () => {
    for (const re of [USERNAME_RE, EMAIL_RE, PROMO_RE]) {
      expect(fn, re.source).toContain(`/${re.source}/`);
    }
    expect(code).toContain('const PLANS = ["monthly", "annual"]');
    expect(code).toContain('const REGIONS = ["default", "IN"]');
  });

  it('turns Adaptive Pricing off — the reason this function exists', () => {
    expect(code).toMatch(/adaptive_pricing:\s*\{\s*enabled:\s*false\s*\}/);
    expect(code).toContain('mode: "subscription"');
    expect(code).toContain('payment_method_collection: "always"');
    expect(code).toContain('client_reference_id: username');
  });

  it('asks Stripe for a trial only when the trial was asked for and allowed', () => {
    const at = code.indexOf('trial_period_days: TRIAL_DAYS');
    expect(at).toBeGreaterThan(-1);
    const guard = code.lastIndexOf('...(trial', at);
    expect(guard, 'trial_period_days sits behind the trial test').toBeGreaterThan(-1);
    expect(at - guard).toBeLessThan(120);
    expect(code.match(/trial_period_days/g)).toHaveLength(1);
    expect(code).toContain('export const TRIAL_DAYS = 7');
  });

  // 2026-11-17: a lapsed payer was given a fresh trial. A webhook-recorded
  // purchase must count as a used trial, read from the webhook's own rows.
  it('gives no trial to an account that already had one OR already paid', () => {
    expect(code).toContain('const TRIAL_USED_EVENTS = ["pro_trial_started", "pro_purchase_completed"]');
    const fnAt = code.indexOf('async function trialAlreadyUsed');
    const body = code.slice(fnAt, code.indexOf('\n}\n', fnAt));
    expect(body).toContain('.in("event", TRIAL_USED_EVENTS)');
    expect(body).toContain('.eq("reason", "stripe_webhook")');
    expect(code).toMatch(/if \(trial && await trialAlreadyUsed\(username\)\)/);
  });

  it('comes back to the same ?payment=success the app already handles', () => {
    expect(code).toContain('success_url: `${base}/app/?payment=success`');
    expect(read('src/app.jsx')).toContain("get('payment') === 'success'");
  });

  it('answers only the site and the local dev servers', () => {
    const block = code.slice(code.indexOf('ALLOWED_ORIGINS = new Set(['), code.indexOf(']);', code.indexOf('ALLOWED_ORIGINS')));
    const origins = [...block.matchAll(/"([^"]+)"/g)].map(m => m[1]).sort();
    expect(origins).toEqual([
      'http://127.0.0.1:4321', 'http://127.0.0.1:5173',
      'http://localhost:4321', 'http://localhost:5173',
      'https://sqlquest.app', 'https://www.sqlquest.app',
    ]);
    expect(code).not.toContain('"Access-Control-Allow-Origin": "*"');
    expect(code).toContain('origin_not_allowed');
  });

  it('never echoes a Stripe error or a secret to the browser', () => {
    // every json(...) response body is a literal error code or the url result
    const bodies = [...code.matchAll(/return json\((\{[^}]*\})/g)].map(m => m[1]);
    expect(bodies.length).toBeGreaterThan(5);
    for (const b of bodies) {
      const literalCode = /^\{ error: "[a-z_]+" \}$/.test(b);
      const theResult = b === '{ url: session.url, plan, region: chosen.region, trial, notes }'
        // the Debug pack's one-time session (2026-11-23, tests/debug-pack.test.js)
        || b === '{ url: session.url, product: DEBUG_PACK_PRODUCT, region, trial: false, notes }';
      expect(literalCode || theResult, b).toBe(true);
    }
    expect(code).toContain('checkout_unavailable');
  });

  it('an unset IN price falls back to the default and says so', () => {
    expect(code).toContain('STRIPE_PRICE_MONTHLY_IN');
    expect(code).toContain('STRIPE_PRICE_ANNUAL_IN');
    expect(code).toContain('note: "in_price_unset"');
  });

  it('applies a promo only when it resolves to an active promotion code', () => {
    expect(code).toContain('stripe.promotionCodes.list({ code, active: true, limit: 1 })');
    const discounts = code.indexOf('params.discounts = [{ promotion_code: promotionCode }]');
    const open = code.indexOf('if (!params.discounts) params.allow_promotion_codes = true');
    expect(discounts).toBeGreaterThan(-1);
    expect(open).toBeGreaterThan(discounts);
  });
});

// The app wiring (2026-09-30, checkoutSessions flipped on after the live
// check). The Payment Link stays the fallback for every failure.
describe('launchCheckout wiring', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const flags = fs.readFileSync(new URL('../src/data/feature-flags.js', import.meta.url), 'utf8');
  const fn = app.slice(app.indexOf('const launchCheckout = (plan, email, opts = {}) => {'));
  const body = fn.slice(0, fn.indexOf('\n  };\n'));

  // 2026-10-01, the first paying session buyer: a double click, then Back
  // from Stripe, and the second request's stale timeout sent him to the
  // Payment Link.
  it('one checkout at a time: a second click inside the window is dropped before anything is counted or sent', async () => {
    const { checkoutInFlight, CHECKOUT_REENTRY_MS } = await import('../src/utils/checkout-session.js');
    const t0 = 1_790_000_000_000;
    expect(checkoutInFlight(0, t0)).toBe(false);
    expect(checkoutInFlight(undefined, t0)).toBe(false);
    expect(checkoutInFlight(t0, t0 + 1700)).toBe(true);            // the double click
    expect(checkoutInFlight(t0, t0 + CHECKOUT_REENTRY_MS)).toBe(false);
    expect(checkoutInFlight(t0 + 5000, t0)).toBe(false);           // a clock that went backwards never locks the button
    const { CHECKOUT_REQUEST_TIMEOUT_MS } = await import('../src/utils/checkout-session.js');
    expect(CHECKOUT_REENTRY_MS).toBeGreaterThan(CHECKOUT_REQUEST_TIMEOUT_MS); // longer than the request's own timeout
    const guard = body.indexOf('if (checkoutInFlight(checkoutStartedAtRef.current)) return;');
    expect(guard, 'the re-entry guard').toBeGreaterThan(-1);
    expect(guard).toBeLessThan(body.indexOf("trackActivationEvent('pro_checkout_clicked'"));
    expect(guard).toBeLessThan(body.indexOf('launchWithFallback('));
    // the Payment Link fallback re-enters and must not be stopped by it
    expect(body.slice(0, guard)).toContain('if (!opts.linkFallback) {');
    // a page restored from the back/forward cache starts clean
    expect(body).toMatch(/addEventListener\('pageshow', \(\) => \{ checkoutStartedAtRef\.current = 0; setCheckoutOpening\(null\); \}/);
  });

  it('sessions on, trial on (founder\u2019s Go 2026-10-01)', () => {
    expect(flags).toMatch(/^\s+checkoutSessions: true,/m);
    expect(flags).toMatch(/^\s+checkoutTrial: true,/m);
  });

  it('the trial is offered only with both flags on and no trial on the record', async () => {
    const { trialOffered } = await import('../src/utils/checkout-session.js');
    expect(trialOffered({ sessionsOn: true, trialOn: true, userData: null })).toBe(true);
    expect(trialOffered({ sessionsOn: true, trialOn: true, userData: { proType: 'monthly' } })).toBe(true);
    expect(trialOffered({ sessionsOn: false, trialOn: true })).toBe(false);   // a Payment Link carries no trial
    expect(trialOffered({ sessionsOn: true, trialOn: false })).toBe(false);
    expect(trialOffered({ sessionsOn: true, trialOn: true, userData: { proTrial: true } })).toBe(false);
    expect(trialOffered({ sessionsOn: true, trialOn: true, userData: { proTrial: false, proTrialEnd: '2026-10-08T00:00:00Z' } })).toBe(false);
    expect(trialOffered({ sessionsOn: 'yes', trialOn: 1 })).toBe(false);
  });

  it('the cards and the line under them say the trial only when it is offered, in words Stripe\u2019s page repeats', async () => {
    const { TRIAL_CARD_COPY, TRIAL_TERMS, TRIAL_DAYS } = await import('../src/utils/checkout-session.js');
    expect(TRIAL_CARD_COPY).toEqual({ monthly: '7 days free, then billed monthly', annual: '7 days free, then billed yearly' });
    expect(TRIAL_TERMS).toBe('7-day free trial: a card is required and nothing is charged today. Cancel before day 7 and you pay nothing.');
    expect(TRIAL_DAYS).toBe(7);
    // no price in the trial copy: the cards print their own (PRICE_TABLE)
    expect(`${TRIAL_CARD_COPY.monthly} ${TRIAL_CARD_COPY.annual} ${TRIAL_TERMS}`).not.toMatch(/\$\d/);
    expect(app).toContain("{trialOfferOn ? TRIAL_CARD_COPY.monthly : 'Billed monthly'}");
    expect(app).toContain("{trialOfferOn ? TRIAL_CARD_COPY.annual : 'Billed yearly'}");
    expect(app).toMatch(/\{trialOfferOn && \(\s*<p[^>]*data-testid="trial-terms">\s*\{TRIAL_TERMS\}/);
    // the offer reads both flags and the person's own record, and rides on the modal event
    expect(app).toMatch(/trialOffered\(\{\s*sessionsOn: window\.FF\?\.feature\?\.\('checkoutSessions'\) === true,\s*trialOn: window\.FF\?\.feature\?\.\('checkoutTrial'\) === true,\s*userData: d,/);
    expect(app).toContain('trialOffered: trialOfferOn,');
  });
  it('asks create-checkout-session with the server-read region, and falls back to the link', () => {
    expect(body).toMatch(/feature\?\.\('checkoutSessions'\) === true/);
    expect(body).toMatch(/buildCheckoutSessionBody\(\{ plan, username: currentUser, email, trial, promo, region: priceRegion \}\)/);
    expect(body).toMatch(/functions\/v1\/create-checkout-session/);
    expect(body).toMatch(/launchCheckout\(plan, email, \{ linkFallback: true \}\)/);
    expect(body).not.toMatch(/pickRegion|timeZone/);
  });
  it('counts one click per plan press and says which door it used', () => {
    expect(body).toMatch(/if \(!opts\.linkFallback\) \{\s*trackActivationEvent\('pro_checkout_clicked'/);
    expect(body).toMatch(/via: sessionsOn \? 'session' : 'link'/);
    expect(body).toMatch(/'checkout_session_fallback'/);
  });
  it('a returning trialist is not counted as a purchase', () => {
    expect(app).toMatch(/fresh\.proTrial === true \? 'pro_trial_started' : 'pro_purchase_completed'/);
  });
});

// 2026-11-20: every session in the week to 11-20 took 7–9 s from click to
// Stripe against an 8 s client timeout. Nothing on screen moved, so buyers
// clicked the card 5–25 times, and one was thrown onto the Payment Link (local
// currency, no trial) a second before his session was ready.
describe('the wait between the plan click and Stripe', () => {
  const app = read('src/app.jsx');
  const fn = read('supabase/functions/create-checkout-session/index.ts');

  it('the client waits well past the slowest session seen (9 s) before falling back', async () => {
    const { CHECKOUT_REQUEST_TIMEOUT_MS, requestCheckoutSession } = await import('../src/utils/checkout-session.js');
    expect(CHECKOUT_REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(15000);
    // the default is the constant, not a literal that can drift from it
    vi.useFakeTimers();
    try {
      const hang = () => new Promise(() => {});
      const p = requestCheckoutSession({ fetchImpl: hang, endpoint: 'https://x/fn', anonKey: 'k', body: { plan: 'monthly' } });
      let settled = false; p.catch(() => { settled = true; });
      await vi.advanceTimersByTimeAsync(9500);
      expect(settled, 'still waiting at 9.5 s').toBe(false);
      await vi.advanceTimersByTimeAsync(CHECKOUT_REQUEST_TIMEOUT_MS);
      expect(settled).toBe(true);
    } finally { vi.useRealTimers(); }
  });

  it('the plan cards say checkout is opening and take no second click', () => {
    expect(app).toContain('const [checkoutOpening, setCheckoutOpening] = useState(null);');
    expect(app.indexOf('const [checkoutOpening, setCheckoutOpening]')).toBeLessThan(app.indexOf('  if (showAuth) {'));
    const launch = app.slice(app.indexOf('const launchCheckout = '), app.indexOf('const beginCheckout = '));
    expect(launch).toContain('setCheckoutOpening(plan);');
    for (const plan of ['monthly', 'annual']) {
      expect(app).toContain(`onClick={() => { if (checkoutOpening) return; trackProEvent('click_${plan}'); beginCheckout('${plan}'); }}`);
      expect(app).toContain(`{checkoutOpening === '${plan}' && <CheckoutOpeningLine />}`);
    }
    expect((app.match(/disabled=\{!!checkoutOpening\}/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(app).toContain('data-testid="checkout-opening"');
  });

  it('the modal wakes the function with a warm-up that makes no session', async () => {
    const { warmCheckoutSession } = await import('../src/utils/checkout-session.js');
    const calls = [];
    const ok = warmCheckoutSession({ fetchImpl: (u, o) => { calls.push([u, o]); return Promise.reject(new Error('offline')); }, endpoint: 'https://x/fn', anonKey: 'k' });
    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0][1].method).toBe('POST');
    expect(JSON.parse(calls[0][1].body)).toEqual({ warm: true });
    expect(warmCheckoutSession({ fetchImpl: () => { throw new Error('x'); }, endpoint: 'e', anonKey: 'k' })).toBe(false);
    expect(warmCheckoutSession({})).toBe(false);
    // fired from the modal-shown effect, behind the sessions flag
    const effect = app.slice(app.indexOf("trackProEvent('modal_shown');"), app.indexOf("trackActivationEvent('pro_modal_shown', {"));
    expect(effect).toContain('warmCheckoutSession(');
    expect(effect).toContain("window.FF?.feature?.('checkoutSessions') === true");
    // the function answers it before validation, with no session and no row
    const warm = fn.indexOf('if (input.warm === true) {');
    expect(warm).toBeGreaterThan(-1);
    expect(warm).toBeLessThan(fn.indexOf('const plan = input.plan;'));
    const warmBlock = fn.slice(warm, fn.indexOf('return new Response(null, { status: 204', warm));
    expect(warmBlock).not.toContain('checkout.sessions.create');
    expect(warmBlock).not.toContain('logCheckoutEvent');
  });
});

// 2026-11-20: the function's own log read `timing pre=8449ms stripe=447ms`.
// The ~8 s before Stripe was trialAlreadyUsed scanning all of pro_events
// (no index on username). The partial index only serves the query while the
// query keeps `reason = 'stripe_webhook'` and `username` as filters.
describe('the trial check is served by an index', () => {
  const migDir = 'supabase/migrations';
  const migs = fs.readdirSync(join(ROOT, migDir))
    .map(f => read(`${migDir}/${f}`).replace(/--.*$/gm, ''));
  const idx = migs.find(s => /create index[^;]*on public\.pro_events\s*\(username\)\s*where reason = 'stripe_webhook'/i.test(s));

  it('a migration creates the partial index on pro_events(username) for webhook rows', () => {
    expect(idx, 'no migration creates the pro_events(username) WHERE reason=stripe_webhook index').toBeTruthy();
    expect(idx).toMatch(/concurrently/i);
  });

  it('the trial lookup filters on exactly what the index covers', () => {
    const start = code.indexOf('async function trialAlreadyUsed');
    const body = code.slice(start, code.indexOf('\n}', start));
    expect(body).toContain('.from("pro_events")');
    expect(body).toContain('.eq("reason", "stripe_webhook")');
    expect(body).toContain('.eq("username", username)');
  });
});

// The quota wall's headline says the trial when the trial is on offer
// (2026-11-22, ledger "the quota wall's headline says the trial").
import { quotaWallHeadline } from '../src/utils/checkout-session.js';
describe('the quota wall headline', () => {
  it('leads with the trial when it is offered, and is the old line when it is not', () => {
    expect(quotaWallHeadline(10, true)).toBe(`10 free solves done. Try Pro free for ${TRIAL_DAYS} days.`);
    expect(quotaWallHeadline(10, false)).toBe('10 free solves done. Pro opens the rest.');
  });

  it("the modal's free_quota headline is this helper, fed the same trialOfferOn the plan cards read", () => {
    const app = read('src/app.jsx');
    expect(app).toMatch(/proModalReason\.type === 'free_quota'\s*\?\s*quotaWallHeadline\(proModalReason\.quota, trialOfferOn\)/);
    expect(app).toMatch(/\{trialOfferOn \? TRIAL_CARD_COPY\.monthly : 'Billed monthly'\}/);
  });
});

// The quota wall speaks to the person's company (M-12,
// docs/plans/monetization-ideas-2026-11-22.md). Pins: no company → the wall
// is exactly what it was; a signed archetype names its mock; a tagged-only
// company gets "the <Company> set", no mock, no number; the headline is not
// touched; the line is fed by findPlanTarget on prepTarget.company and logged.
import { quotaWallCompanyLine } from '../src/utils/checkout-session.js';
import { findPlanTarget, TARGET_KIND } from '../src/utils/interview-prep.js';
import { loadQuestionBank } from '../scripts/question-slugs.mjs';
import vm from 'node:vm';
describe('the quota wall names the person\'s company', () => {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(read('src/data/mock-interviews.js'), ctx);
  const mocks = ctx.window.mockInterviewsData || [];
  const { bank, tags } = loadQuestionBank();

  it('no company, or a company with no plan target → null (the old words stay)', () => {
    expect(quotaWallCompanyLine(null)).toBeNull();
    expect(quotaWallCompanyLine({})).toBeNull();
    expect(quotaWallCompanyLine({ company: '  ' })).toBeNull();
    expect(findPlanTarget('Nowhere Inc', bank, tags, mocks)).toBeNull();
    expect(quotaWallHeadline(10, true)).toBe(`10 free solves done. Try Pro free for ${TRIAL_DAYS} days.`);
  });

  it('Capital One and Revolut (signed archetypes) name their mock', () => {
    for (const company of ['Capital One', 'Revolut']) {
      const t = findPlanTarget(company, bank, tags, mocks);
      expect(t.kind, company).toBe(TARGET_KIND.ARCHETYPE);
      const title = mocks.find(m => m.id === t.mockId).title;
      expect(quotaWallCompanyLine(t, title)).toBe(`The rest of the ${company} set and the ${title} are in Pro.`);
    }
  });

  it('a tagged-only company gets its set — no mock, no number, no readiness', () => {
    const t = findPlanTarget('Wise', bank, tags, mocks);
    expect(t.kind).toBe(TARGET_KIND.TAGGED);
    const line = quotaWallCompanyLine(t, 'Ten Classic SQL Interview Patterns');
    expect(line).toBe('The rest of the Wise set is in Pro.');
    expect(line).not.toMatch(/\d|%|mock|ready|readiness/i);
  });

  it('app.jsx: fed by findPlanTarget on prepTarget.company, behind the flag, stamped on both free_quota reasons, logged', () => {
    const app = read('src/app.jsx');
    const flags = read('src/data/feature-flags.js');
    expect(flags).toMatch(/\n\s*quotaWallCompany: true,/);
    const at = app.indexOf('const quotaWallCompany = () => {');
    const fn = app.slice(at, app.indexOf('\n  };', at));
    expect(fn).toContain("window.FF?.feature?.('quotaWallCompany') !== true");
    expect(fn).toContain('findPlanTarget(prepTarget.company');
    expect(fn).toContain('target.kind === TARGET_KIND.ARCHETYPE ? companyMockTitle(target.company) : null');
    // M-07 routes both free_quota reasons through presentQuotaWall.
    expect((app.match(/presentQuotaWall\((?:withDebugLock\()?\{ type: 'free_quota'[^}]*wallCompany: quotaWallCompany\(\) \}/g) || []).length).toBe(2);
    expect((app.match(/(setProModalReason|presentQuotaWall)\((?:withDebugLock\()?\{ type: 'free_quota'/g) || []).length).toBe(2);
    expect(app).toContain('data-testid="quota-wall-company"');
    expect(app).toContain('wallCompany: proModalReason?.wallCompany?.company || null,');
    expect(app, 'the headline is #95\'s and stays').toMatch(/proModalReason\.type === 'free_quota'\s*\?\s*quotaWallHeadline\(proModalReason\.quota, trialOfferOn\)/);
  });
});
