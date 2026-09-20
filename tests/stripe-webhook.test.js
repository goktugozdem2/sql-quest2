import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(join(ROOT, 'supabase/functions/stripe-webhook/index.ts'), 'utf8');

// The webhook is the money path and runs on Deno, so it has no unit harness
// here; these are source guards on the three things the 2026-09-12 read
// found missing (docs/reads/checkout-clickers-2026-09-12.md §4, founder's
// week-2 item 9): an expired Checkout Session left no trace, a scheduled
// cancellation was invisible until the period ended, and the cancellation
// that did arrive wrote no pro_events row.
// A handler's code, comments stripped: the next handler's explanatory
// comment sits between the two `if (event.type ===` lines and must not
// count against the one before it.
const branch = type => {
  const at = src.indexOf(`event.type === "${type}"`);
  expect(at, `no handler for ${type}`).toBeGreaterThan(-1);
  const next = src.indexOf('if (event.type ===', at + 10);
  return src.slice(at, next === -1 ? src.length : next)
    .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
};

describe('stripe-webhook: the events that make abandonment and churn readable', () => {
  it('records an expired Checkout Session as pro_checkout_expired, touching no user data', () => {
    const b = branch('checkout.session.expired');
    expect(b).toContain('logProEvent("pro_checkout_expired"');
    expect(b).toContain('"stripe_webhook"');
    expect(b).not.toMatch(/from\("users"\)/);
    expect(b).not.toMatch(/proStatus|proExpiry|proAutoRenew/);
  });

  it('a scheduled cancellation (cancel_at_period_end) writes the flag and a dated pro_events row', () => {
    const b = branch('customer.subscription.updated');
    expect(b).toContain('cancel_at_period_end');
    expect(b).toContain('previous_attributes');
    expect(b).toContain('userData.proAutoRenew = !subscription.cancel_at_period_end');
    expect(b).toContain('"pro_subscription_cancelled"');
    expect(b).toContain('"pro_subscription_reactivated"');
    expect(b).toContain('days_since_purchase');
    // Scheduling a cancel never shortens access: Pro runs to the period end.
    expect(b).not.toMatch(/proExpiry\s*=/);
    expect(b).not.toMatch(/proStatus\s*=/);
  });

  // 2026-09-14: this used to assert `proStatus` was NEVER cleared here —
  // "let it expire naturally", applied to every subscription that ended. That
  // was right for a cancellation (the period was paid for) and wrong for a
  // failed payment, where it handed out up to a free month, or a free year on
  // annual. The assertion now pins the DISTINCTION rather than the blanket
  // rule: revoke only when Stripe says nobody paid.
  it('the subscription ending leaves a row, and only revokes when payment failed', () => {
    const b = branch('customer.subscription.deleted');
    expect(b).toContain('userData.proAutoRenew = false');
    expect(b).toContain('logProEvent("pro_subscription_cancelled"');
    expect(b).toContain('ended: true');
    // The revoke exists…
    expect(b).toContain('userData.proStatus = false');
    // …and is reached only through the non-payment test, never unconditionally.
    const at = b.indexOf('userData.proStatus = false');
    const guard = b.lastIndexOf('if (endedForNonPayment) {', at);
    expect(guard, 'proStatus is cleared outside the payment-failure guard').toBeGreaterThan(-1);
    expect(at - guard, 'the guard is not the one wrapping this line').toBeLessThan(400);
    // A voluntary cancellation must still keep what it paid for.
    expect(b).toContain('endedForNonPayment');
    expect(b).toContain('cancellation_details');
  });

  it('every pro_events write in the file carries reason stripe_webhook', () => {
    const calls = [...src.matchAll(/logProEvent\(\s*"([a-z_]+)",[\s\S]*?,\s*"([a-z_]+)"/g)];
    expect(calls.length).toBeGreaterThanOrEqual(5);
    for (const m of calls) expect(m[2], m[1]).toBe('stripe_webhook');
  });
});

// ── The payment lifecycle (founder QA, 2026-09-20) ──────────────────────────
// Until this date the webhook could take money and extend access, but almost
// nothing could take access away: a refunded customer kept Pro to their
// expiry (a year, on the annual plan), a card that finally stopped paying
// kept it too, and a subscription moving to past_due or unpaid changed
// nothing at all. These guard the four events that close the loop.
describe('stripe-webhook: access comes back off', () => {
  it('a full refund revokes access and cancels the subscription', () => {
    const b = branch('charge.refunded');
    expect(b).toContain('amount_refunded');
    expect(b).toContain('revokeProAccess');
    expect(b).toContain('stripe.subscriptions.cancel');
    expect(b).toContain('logProEvent("pro_refunded"');
  });

  it('a partial refund revokes nothing', () => {
    const b = branch('charge.refunded');
    // every revoking action sits behind the `full` test
    const guard = b.indexOf('if (full)');
    expect(guard, 'the full-refund guard').toBeGreaterThan(-1);
    expect(b.indexOf('revokeProAccess')).toBeGreaterThan(guard);
    expect(b.indexOf('stripe.subscriptions.cancel')).toBeGreaterThan(guard);
  });

  it('a failed payment revokes only once Stripe has stopped retrying', () => {
    const b = branch('invoice.payment_failed');
    expect(b).toContain('if (!willRetry && userRecord)');
    expect(b).toContain('revokeProAccess');
    expect(b).toContain('"pro_access_revoked"');
    // the revoke must not be reachable while retries are scheduled
    const at = b.indexOf('revokeProAccess');
    const guard = b.indexOf('if (!willRetry');
    expect(at).toBeGreaterThan(guard);
  });

  it('an unpaid subscription revokes; past_due only records', () => {
    const b = branch('customer.subscription.updated');
    expect(b).toContain('statusChanged');
    expect(b).toContain('subscription.status === "unpaid"');
    expect(b).toContain('revokeProAccess');
    expect(b).toContain('"pro_subscription_status"');
  });

  it('one lookup and one revocation, shared by every branch', () => {
    expect(src).toContain('async function findUserByCustomer');
    expect(src).toContain('async function revokeProAccess');
    // revoking always clears all three fields — the flag lapsed-pro segments
    // on is proAutoRenew, and a copy of this block once forgot it
    const fn = src.slice(src.indexOf('async function revokeProAccess'), src.indexOf('// Plan durations'));
    expect(fn).toContain('userData.proStatus = false');
    expect(fn).toContain('userData.proExpiry = new Date().toISOString()');
    expect(fn).toContain('userData.proAutoRenew = false');
    expect(fn).not.toContain('proType =');
  });

  it('the header names every event the endpoint must subscribe to', () => {
    const header = src.slice(0, src.indexOf('import '));
    for (const type of ['charge.refunded', 'customer.subscription.updated', 'checkout.session.expired']) {
      expect(header, `header mentions ${type}`).toContain(type);
    }
  });
});
