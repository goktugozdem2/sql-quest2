// The Interview Pass — $49 once, 90 days, nothing renews (2026-09-14).
//
// $29/month is the wrong unit for interview prep: nobody subscribes for six
// months to pass one screen, and every purchase in our history was a
// first-session decision. It is also the only kind of change this surface can
// MEASURE — at 209 modal views a month and a 3.3% click rate, detecting a +50%
// relative lift needs 2,160 people per arm (20 months), while detecting a move
// to the founder's 15% target needs 95 per arm (~4 weeks). The modal can test
// a different OFFER; it cannot test different words.
//
// The failure this file exists to prevent: a buyer pays $49 for three months
// and is granted one. That happens if the link is reachable before
// stripe-webhook knows the price — its amount fallback used to send anything
// under $99 to `monthly`.

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
    expect(flags).toMatch(/interviewPass:\s*false/);
  });

  it('the webhook maps the price and the product to 90 days', () => {
    expect(webhook).toContain('STRIPE_PRICE_PASS3M');
    expect(webhook).toContain('STRIPE_PRODUCT_PASS3M');
    const rows = [...webhook.matchAll(/type:\s*"pass3m",\s*durationDays:\s*(\d+)/g)].map(m => Number(m[1]));
    expect(rows.length, 'expected a price map, a product map and the amount fallback').toBeGreaterThanOrEqual(3);
    for (const d of rows) expect(d, 'a pass3m mapping granted the wrong number of days').toBe(90);
  });

  it('the amount fallback catches $49 BEFORE it reaches monthly', () => {
    // The old chain was `>=19900 | >=9900 | else monthly`, so 4900 became 30
    // days. This is the line that makes a missing secret survivable.
    const fb = webhook.slice(webhook.indexOf('Fallback: determine by amount'), webhook.indexOf('Fallback: determine by amount') + 900);
    expect(fb).toContain('amount >= 4900');
    expect(fb.indexOf('4900'), '$49 must be tested before the monthly default').toBeLessThan(fb.indexOf('type: "monthly"'));
  });

  it('a one-time plan never gets an auto-renew flag', () => {
    // The 2026-09-07 incident: an auto-renew flag on something that never
    // renews pushed proExpiry forward on every login for 47 accounts.
    expect(webhook).toContain('ONE_TIME_PLANS');
    expect(webhook).toMatch(/ONE_TIME_PLANS\s*=\s*new Set\(\["lifetime",\s*"pass3m"\]\)/);
    expect(webhook).toContain('userData.proAutoRenew = !ONE_TIME_PLANS.has(planInfo.type)');
  });

  it('a one-time plan gets no grace window, because nothing is in flight', () => {
    expect(proAccess).toMatch(/NON_RENEWING\s*=\s*\['trial',\s*'pass3m'\]/);
  });
});

describe('the modal offers two cards, never three', () => {
  it('the pass REPLACES annual rather than joining it', () => {
    const grid = app.slice(app.indexOf('data-pro-plans'), app.indexOf('Secure payment via Stripe'));
    expect(grid).toContain("ftbFlag('interviewPass')");
    // One highlighted card either way, plus monthly.
    expect((grid.match(/beginCheckout\('pass3m'\)/g) || []).length).toBe(1);
    expect((grid.match(/beginCheckout\('annual'\)/g) || []).length).toBe(1);
    expect((grid.match(/beginCheckout\('monthly'\)/g) || []).length).toBe(1);
  });

  it('does not promise "cancel anytime" for something with nothing to cancel', () => {
    const fine = app.slice(app.indexOf('Secure payment via Stripe'), app.indexOf('Secure payment via Stripe') + 220);
    expect(fine).toContain("ftbFlag('interviewPass')");
    expect(fine).toContain('nothing to cancel');
  });

  it('the checkout link exists and is the one Stripe created', () => {
    expect(app).toMatch(/pass3m:\s*'https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+'/);
  });
});
