// The quarterly plan — $49 every 3 months (2026-09-14).
//
// $29/month is the wrong unit for interview prep: a job hunt is measured in
// months. The founder's call is three packages — 1 month, 3 months, 1 year.
//
// It existed for about an hour as a ONE-TIME pass before becoming recurring,
// which is why these tests are pointed at the difference: a plan that renews
// and a plan that does not need OPPOSITE answers on grace, on auto-renew and
// on the "Renews / Ends" label. Getting one of those backwards is silent.
//
// Two failures this file exists to prevent, both of which take money:
//   - activation grants 30 days instead of 90 (the amount fallback used to
//     send anything under $99 to `monthly`)
//   - RENEWAL extends by nothing, because that branch knew only monthly and
//     annual by name. A quarterly subscriber would pay every three months and
//     lose access anyway.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const app = read('src/app.jsx');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
const flags = read('src/data/feature-flags.js');
const proAccess = read('src/utils/pro-access.js');

describe('the release order is enforced by the code, not by memory', () => {
  it('ships dark', () => {
    expect(flags).toMatch(/quarterlyPlan:\s*false/);
  });

  it('the webhook maps the price and the product, and 90 days is stated once', () => {
    expect(webhook).toContain('STRIPE_PRICE_QUARTERLY');
    expect(webhook).toContain('STRIPE_PRODUCT_QUARTERLY');
    expect(webhook, 'durations must live in one map, not per call site').toMatch(/PLAN_DAYS[\s\S]*?quarterly:\s*90/);
  });

  it('RENEWAL reads the same map as activation', () => {
    // The old branch was `if monthly +30 else if annual +365` — anything it
    // did not name was extended by ZERO days, so a quarterly subscriber would
    // have paid every three months and lost access anyway.
    const ren = webhook.slice(webhook.indexOf('invoice.payment_succeeded'));
    expect(ren).toContain('PLAN_DAYS[userData.proType]');
    expect(ren, 'a second copy of the durations is back').not.toMatch(/proType === "monthly"/);
  });

  it('an unknown plan is loud, not silent', () => {
    const ren = webhook.slice(webhook.indexOf('invoice.payment_succeeded'));
    expect(ren).toContain('console.error');
    expect(ren).toContain('renewDays || 30');
  });

  it('the amount fallback catches $49 BEFORE it reaches monthly', () => {
    // The old chain was `>=19900 | >=9900 | else monthly`, so 4900 became 30
    // days. This is the line that makes a missing secret survivable.
    const fb = webhook.slice(webhook.indexOf('Fallback: determine by amount'), webhook.indexOf('Fallback: determine by amount') + 900);
    expect(fb).toContain('amount >= 4900');
    expect(fb.indexOf('4900'), '$49 must be tested before the monthly default').toBeLessThan(fb.indexOf('plan("monthly")'));
  });

  it('quarterly is NOT treated as one-time — it bills every three months', () => {
    // It was one-time for an hour. Leaving it in this set would set
    // proAutoRenew false on a live subscription and deny it the grace window.
    expect(webhook).toMatch(/ONE_TIME_PLANS\s*=\s*new Set\(\["lifetime"\]\)/);
    expect(webhook).toContain('userData.proAutoRenew = !ONE_TIME_PLANS.has(planInfo.type)');
    expect(proAccess).toMatch(/NON_RENEWING\s*=\s*\['trial'\]/);
  });

  it('no trace of the one-time shape survives anywhere', () => {
    for (const [name, body] of [['app.jsx', app], ['stripe-webhook', webhook], ['pro-access', proAccess], ['feature-flags', flags]]) {
      expect(body, `${name} still mentions pass3m`).not.toContain('pass3m');
    }
  });
});

describe('the modal offers two cards, never three', () => {
  it('offers all three packages, each exactly once', () => {
    const grid = app.slice(app.indexOf('data-pro-plans'), app.indexOf('Secure payment via Stripe'));
    for (const plan of ['monthly', 'quarterly', 'annual']) {
      expect((grid.match(new RegExp(`beginCheckout\\('${plan}'\\)`, 'g')) || []).length, plan).toBe(1);
    }
    expect(grid, 'the grid must widen to three when the flag is on').toContain("ftbFlag('quarterlyPlan') ? 'sm:grid-cols-3' : 'sm:grid-cols-2'");
  });

  it('annual keeps the highlight — adding a tier does not reverse the 09-12 decision', () => {
    const grid = app.slice(app.indexOf('data-pro-plans'), app.indexOf('Secure payment via Stripe'));
    const annualAt = grid.indexOf("beginCheckout('annual')");
    expect(grid.slice(annualAt, annualAt + 700)).toContain("2px solid #FFE34D");
    const quarterlyAt = grid.indexOf("beginCheckout('quarterly')");
    expect(grid.slice(quarterlyAt, quarterlyAt + 700), 'two highlighted cards is no highlight').not.toContain('2px solid #FFE34D');
  });

  it('the checkout link exists and is the one Stripe created', () => {
    expect(app).toMatch(/quarterly:\s*'https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+'/);
  });

  it('every plan the modal sells has a checkout link', () => {
    const links = app.slice(app.indexOf('const CHECKOUT_LINKS'), app.indexOf('const CHECKOUT_LINKS') + 1400);
    for (const plan of ['monthly', 'quarterly', 'annual']) expect(links).toContain(`${plan}:`);
  });
});
