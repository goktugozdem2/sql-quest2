// The failed-charge email (M-01, 2026-11-22;
// supabase/functions/stripe-webhook/payment-failed-email.ts). Run, not read:
// the module is pure and import-free, so vitest runs what Deno runs.
// Pins: the button is the invoice's own hosted_invoice_url and nothing else;
// the Customer Portal is the second line; "the free week ended" only for a
// subscription_cycle invoice that follows a trial, "renewal" otherwise; the
// reply line is the last line before the sign-off; the subject names the
// founder; the sign-off is Göktuğ / Founder, SQL Quest; the portal URL is the
// app's own.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { paymentFailedEmail, stripeInvoiceUrl, startsAtTrialEnd, PORTAL_URL_DEFAULT } from '../supabase/functions/stripe-webhook/payment-failed-email.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');

const INVOICE = 'https://invoice.stripe.com/i/acct_1AbC/live_YWNjdF8xQWJD';
const base = { username: 'learner', amountCents: 9900, currency: 'usd', billingReason: 'subscription_cycle', afterTrial: true, willRetry: true, invoiceUrl: INVOICE, portalUrl: PORTAL_URL_DEFAULT };
const hrefs = html => [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
const paras = html => [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());

describe('the button is the invoice\'s own Stripe page', () => {
  it('carries hosted_invoice_url as the button and the portal as the second link', () => {
    const m = paymentFailedEmail(base);
    expect(m.invoiceUrl).toBe(INVOICE);
    expect(hrefs(m.html)).toEqual([INVOICE, PORTAL_URL_DEFAULT]);
    expect(m.html).toMatch(new RegExp(`<a href="${INVOICE.replace(/[.?]/g, '\\$&')}" data-role="invoice"[^>]*>Fix it in Stripe</a>`));
  });
  it('leaves the button out for any link that is not https://invoice.stripe.com, and keeps the portal', () => {
    for (const bad of [null, '', 'http://invoice.stripe.com/i/x', 'https://invoice.stripe.com.evil.example/i/x', 'https://evil.example/', 'javascript:alert(1)']) {
      const m = paymentFailedEmail({ ...base, invoiceUrl: bad });
      expect(m.invoiceUrl, String(bad)).toBeNull();
      expect(hrefs(m.html), String(bad)).toEqual([PORTAL_URL_DEFAULT]);
      expect(m.html).not.toContain('data-role="invoice"');
    }
  });
  it('a portal URL that is not billing.stripe.com falls back to the app\'s own', () => {
    expect(hrefs(paymentFailedEmail({ ...base, portalUrl: 'https://evil.example/p' }).html)[1]).toBe(PORTAL_URL_DEFAULT);
    expect(hrefs(paymentFailedEmail({ ...base, portalUrl: null }).html)[1]).toBe(PORTAL_URL_DEFAULT);
  });
  it('the webhook\'s portal default is the app\'s STRIPE_CUSTOMER_PORTAL_URL', () => {
    const m = app.match(/const STRIPE_CUSTOMER_PORTAL_URL = '([^']+)'/);
    expect(m).not.toBeNull();
    expect(PORTAL_URL_DEFAULT).toBe(m[1]);
  });
  it('stripeInvoiceUrl answers the normalised URL or null', () => {
    expect(stripeInvoiceUrl(INVOICE)).toBe(INVOICE);
    expect(stripeInvoiceUrl('https://INVOICE.stripe.com/i/x')).toBe('https://invoice.stripe.com/i/x');
    expect(stripeInvoiceUrl({ href: INVOICE })).toBeNull();
  });
});

describe('worded by billing_reason', () => {
  it('the first charge after a trial says the free week ended and the first charge failed', () => {
    const m = paymentFailedEmail(base);
    expect(m.kind).toBe('trial_first_charge');
    expect(m.html).toContain('Your free week of Pro has ended, and the first charge (99.00 USD) didn&#39;t go through.');
    expect(m.html).not.toMatch(/renewal/i);
    expect(m.subject).toMatch(/free week/);
  });
  it('a later cycle, a non-trial cycle and a plan change are renewals', () => {
    for (const input of [{ afterTrial: false }, { billingReason: 'subscription_update', afterTrial: true }, { billingReason: null, afterTrial: true }]) {
      const m = paymentFailedEmail({ ...base, ...input });
      expect(m.kind, JSON.stringify(input)).toBe('renewal');
      expect(m.html).toContain('Your Pro renewal charge (99.00 USD) didn&#39;t go through.');
      expect(m.html).not.toMatch(/free week/);
      expect(m.subject).toMatch(/renewal/);
    }
  });
  it('says whether Stripe will retry', () => {
    expect(paymentFailedEmail(base).html).toContain('Stripe will retry the charge automatically');
    expect(paymentFailedEmail({ ...base, willRetry: false }).html).toContain('Stripe has stopped retrying');
  });
  it('the first-charge rule: the period starts within six hours of the trial end', () => {
    const t = 1_800_000_000;
    expect(startsAtTrialEnd(t, t)).toBe(true);
    expect(startsAtTrialEnd(t + 6 * 3600, t)).toBe(true);
    expect(startsAtTrialEnd(t + 30 * 86400, t)).toBe(false);
    expect(startsAtTrialEnd(t, null)).toBe(false);
    expect(startsAtTrialEnd(null, t)).toBe(false);
  });
});

describe('the founder\'s voice', () => {
  it('the subject names the founder, in both wordings', () => {
    for (const afterTrial of [true, false]) {
      expect(paymentFailedEmail({ ...base, afterTrial }).subject).toMatch(/^From SQL Quest's founder — /);
    }
  });
  it('"reply to me" is the last line before the sign-off, with or without the button', () => {
    for (const invoiceUrl of [INVOICE, null]) {
      const p = paras(paymentFailedEmail({ ...base, invoiceUrl }).html).filter(Boolean);
      expect(p.at(-2)).toMatch(/just reply to this email — it comes straight to me\.$/);
      expect(p.at(-1)).toBe('GöktuğFounder, SQL Quest');
    }
    expect(paymentFailedEmail(base).html).toContain('Göktuğ<br>Founder, SQL Quest');
  });
  it('the old "reply and I\'ll send you a link" and the untrue "stays active" are gone', () => {
    const h = paymentFailedEmail(base).html;
    expect(h).not.toMatch(/send you\s+a secure Stripe link/);
    expect(h).not.toMatch(/stays active through the retry window/);
  });
  it('a username is escaped', () => {
    expect(paymentFailedEmail({ ...base, username: '<b>x</b>' }).html).toContain('Hi &lt;b&gt;x&lt;/b&gt;,');
  });
});
