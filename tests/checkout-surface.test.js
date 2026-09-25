// The checkout surface — what the buyer reads at the moment of paying.
//
// Founder QA, 2026-09-20, after the first real run through Stripe:
//  - the modal said SAVE 72% while the Stripe product still said 57% (its
//    name was written when monthly was $19: 228 -> 99 is 57%). Two different
//    discounts at the moment of paying is the worst place to lose trust, so
//    the modal's own numbers are bound to each other here and the Stripe
//    product name is the founder's to fix in the dashboard.
//  - the card statement reads "Datrick, Inc." while the buyer came from
//    SQL Quest. The modal now says so before they pay.
//  - "Just completed payment? -> Verify Payment" sat next to the price. A
//    manual verify button on the buying surface says the payment might not
//    arrive. Measured the same day: in all four real purchases the
//    stripe_webhook row landed 3-6 SECONDS BEFORE the buyer's browser got
//    back, and that button never activated anyone. It now lives only on the
//    pending screen, which is reached only after six failed polls.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(resolve(root, 'src/app.jsx'), 'utf8');

import { PRICE_TABLE, planPrices, priceRegionFor, checkoutLinkFor } from '../src/utils/regional-price.js';

// The modal renders every price from src/utils/regional-price.js (2026-09-26,
// when India got its own price). These bind the table to the prices the
// founder set and the badge/per-month lines to arithmetic, per region.
const MONTHLY = 29;
const ANNUAL = 99;

describe('the price the buyer reads', () => {
  it('shows the two live prices, from the one table', () => {
    expect(PRICE_TABLE.default).toEqual({ monthly: MONTHLY, annual: ANNUAL });
    expect(planPrices('default')).toMatchObject({ monthly: '$29', annual: '$99' });
    expect(app).toMatch(/\{shownPrices\.monthly\}/);
    expect(app).toMatch(/\{shownPrices\.annual\}/);
    expect(app).not.toMatch(/>\$(29|99|9|39)</); // no hard-coded price left in the modal
  });

  it('claims the discount the prices actually give, in every region', () => {
    for (const region of Object.keys(PRICE_TABLE)) {
      const { monthly, annual } = PRICE_TABLE[region];
      const real = Math.round((1 - annual / (monthly * 12)) * 100);
      expect(planPrices(region).saveBadge, region).toBe(`SAVE ${real}%`);
    }
    expect(planPrices('default').saveBadge).toBe('SAVE 72%'); // 29*12 = 348, 99 -> 72%
    expect(app).toMatch(/\{shownPrices\.saveBadge\}/);
  });

  it('breaks the annual price down correctly, in every region', () => {
    for (const region of Object.keys(PRICE_TABLE)) {
      const perMonth = (PRICE_TABLE[region].annual / 12).toFixed(2);
      expect(planPrices(region).annualPerMonth, region).toBe(`$${perMonth}/month`);
    }
    expect(app).toMatch(/\{shownPrices\.annualPerMonth\}/);
  });

  it('India is $9 / $39, and only a server-read IN with the flag on gets it', () => {
    expect(PRICE_TABLE.IN).toEqual({ monthly: 9, annual: 39 });
    expect(priceRegionFor('IN', true)).toBe('IN');
    expect(priceRegionFor('in', true)).toBe('IN');
    expect(priceRegionFor('IN', false)).toBe('default');
    expect(priceRegionFor('US', true)).toBe('default');
    expect(priceRegionFor(null, true)).toBe('default');
    // The region is the server's reading (/api/geo/), never the browser's.
    expect(app).toMatch(/fetch\('\/api\/geo\/'/);
    expect(app).not.toMatch(/priceRegionFor\([^)]*(navigator|Intl|timeZone)/);
  });

  it('the checkout link follows the region and falls back to the default', () => {
    const links = { default: { monthly: 'D-m', annual: 'D-a' }, IN: { monthly: 'I-m', annual: 'I-a' } };
    expect(checkoutLinkFor('monthly', 'IN', links)).toBe('I-m');
    expect(checkoutLinkFor('annual', 'default', links)).toBe('D-a');
    expect(checkoutLinkFor('quarterly', 'IN', { ...links, default: { ...links.default, quarterly: 'D-q' } })).toBe('D-q');
    expect(app).toMatch(/checkoutLinkFor\(plan, priceRegion, CHECKOUT_LINKS_BY_REGION\)/);
  });

  it('every ask and click says which price the person saw', () => {
    for (const ev of ['pro_modal_shown', 'pro_plan_clicked', 'pro_checkout_clicked']) {
      const at = app.indexOf(`trackActivationEvent('${ev}'`);
      expect(at, ev).toBeGreaterThan(-1);
      expect(app.slice(at, at + 1200), ev).toMatch(/priceRegion/);
    }
  });

  it('warns that checkout may show a local currency', () => {
    // Adaptive Pricing is "Always on" for Payment Links, so a TRY buyer
    // clicking $99 lands on TRY 5,021.88. The modal says so first.
    expect(app).toMatch(/data-testid="billed-currency"/);
    expect(app).toMatch(/Billed in USD; your local currency may be shown at checkout/);
  });

  it('names the entity on the card statement', () => {
    expect(app).toMatch(/data-testid="billed-by"/);
    expect(app).toMatch(/Billed by Datrick, Inc\./);
  });
});

describe('no popularity claim the data does not support', () => {
  // 2026-09-21: "most people choose this" sat under the annual price on the
  // modal and the homepage. Of four real subscriptions, two were annual. If a
  // popularity line ever comes back, it comes back with a measured share.
  const home = readFileSync(resolve(root, 'src/index.html'), 'utf8');
  it('is gone from the modal and the homepage', () => {
    expect(app).not.toContain('most people choose this</div>');
    expect(home).not.toContain('most people choose this');
  });
});

describe('the recovery button is not on the buying surface', () => {
  it('no manual verify prompt next to the price', () => {
    // rendered text, not the incident note above the recovery function
    expect(app).not.toContain('>Just completed payment?<');
    expect(app).not.toMatch(/>\s*Verify Payment\s*</);
  });

  it('the recovery runs through one function, offered once', () => {
    const calls = app.match(/onClick=\{verifyPurchase\}/g) || [];
    expect(calls).toHaveLength(1);
  });

  it('and only on the pending screen', () => {
    const at = app.indexOf('onClick={verifyPurchase}');
    expect(at).toBeGreaterThan(-1);
    const before = app.slice(Math.max(0, at - 800), at);
    expect(before).toContain("paymentSuccessState === 'pending'");
  });
});
