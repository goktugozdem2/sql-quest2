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

const MONTHLY = 29;
const ANNUAL = 99;

describe('the price the buyer reads', () => {
  it('shows the two live prices', () => {
    expect(app).toContain('>$29<');
    expect(app).toContain('>$99<');
  });

  it('claims the discount the prices actually give', () => {
    const badge = app.match(/SAVE (\d+)%/);
    expect(badge, 'the annual badge').not.toBeNull();
    const claimed = Number(badge[1]);
    const real = Math.round((1 - ANNUAL / (MONTHLY * 12)) * 100);
    expect(claimed).toBe(real); // 29*12 = 348, 99 -> 72%
  });

  it('breaks the annual price down correctly', () => {
    const perMonth = (ANNUAL / 12).toFixed(2);
    expect(app).toContain(`$${perMonth}/month`);
  });

  it('names the entity on the card statement', () => {
    expect(app).toMatch(/data-testid="billed-by"/);
    expect(app).toMatch(/Billed by Datrick, Inc\./);
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
