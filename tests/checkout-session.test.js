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
      const theResult = b === '{ url: session.url, plan, region: chosen.region, trial, notes }';
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
