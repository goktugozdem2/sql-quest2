// The Pro funnel's events (PLAN item 1, 2026-10-06; map in docs/funnel.md).
// Pins: the checkout-session function records stage 4 (a session exists) and
// its failures, after the session and before the answer, never able to break
// a checkout; and docs/funnel.md names every funnel event the client and the
// webhook write, so a new event cannot ship undocumented.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const fn = read('supabase/functions/create-checkout-session/index.ts');
const doc = read('docs/funnel.md');

describe('create-checkout-session records stage 4', () => {
  it('pro_checkout_started is written after the session is created and before the url is returned', () => {
    const created = fn.indexOf('await stripe.checkout.sessions.create(');
    const logged = fn.indexOf('await logCheckoutEvent("pro_checkout_started"');
    const answered = fn.indexOf('return json({ url: session.url');
    expect(created).toBeGreaterThan(0);
    expect(logged).toBeGreaterThan(created);
    expect(answered).toBeGreaterThan(logged);
    expect(fn.slice(logged, answered)).toContain('session_id: session.id');
  });

  it('every refusal after validation records pro_checkout_session_failed with its stage', () => {
    for (const stage of ['no_price', 'no_url', 'stripe']) {
      expect(fn, stage).toMatch(new RegExp(`logCheckoutEvent\\("pro_checkout_session_failed", username, \\{[^}]*stage: "${stage}"`));
    }
  });

  it('the log can never break a checkout: caught, raced against a timeout, reason checkout_session', () => {
    const body = fn.slice(fn.indexOf('async function logCheckoutEvent'), fn.indexOf('async function resolvePromotionCode'));
    expect(body).toMatch(/try \{[\s\S]*\} catch \(_\) \{/);
    expect(body).toContain('Promise.race([write, new Promise((r) => setTimeout(r, LOG_TIMEOUT_MS))])');
    expect(body).toContain('reason: "checkout_session"');
    expect(fn).toMatch(/const LOG_TIMEOUT_MS = \d{3,4};/);
    // it never logs the email or the promo code itself
    expect(body).not.toMatch(/email/);
    expect(fn.slice(fn.indexOf('logCheckoutEvent("pro_checkout_started"'), fn.indexOf('return json({ url: session.url'))).not.toMatch(/\bemail\b|promo:\s*promo/);
  });
});

describe('docs/funnel.md is the map of every funnel event', () => {
  const clientEvents = [...new Set([...read('src/app.jsx').matchAll(/trackActivationEvent\('((?:pro|checkout)_[a-z_]+)'/g)].map(m => m[1]))];
  const webhookEvents = [...new Set([...read('supabase/functions/stripe-webhook/index.ts').matchAll(/logProEvent\("(pro_[a-z_]+)"/g)].map(m => m[1]))];
  const serverEvents = [...new Set([...fn.matchAll(/logCheckoutEvent\("(pro_[a-z_]+)"/g)].map(m => m[1]))];

  it('finds the events it is checking', () => {
    expect(clientEvents).toEqual(expect.arrayContaining(['pro_modal_shown', 'pro_plan_clicked', 'pro_checkout_clicked', 'pro_checkout_returned']));
    expect(webhookEvents).toEqual(expect.arrayContaining(['pro_purchase_completed', 'pro_trial_started', 'pro_checkout_expired']));
    expect(serverEvents.sort()).toEqual(['pro_checkout_session_failed', 'pro_checkout_started']);
  });

  it('names every one of them', () => {
    const missing = [...clientEvents, ...webhookEvents, ...serverEvents].filter(e => !doc.includes(`\`${e}\``) && !doc.includes(`\`${e} `));
    expect(missing).toEqual([]);
  });

  it('counts money only from the webhook', () => {
    expect(doc).toMatch(/event = 'pro_purchase_completed' and reason = 'stripe_webhook'/);
    expect(doc).toMatch(/Money truth is the Stripe webhook only/);
  });
});
