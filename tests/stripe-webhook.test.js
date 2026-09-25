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

// ── Trials and regional prices (2026-09-26, create-checkout-session) ────────
// pro_purchase_completed with reason stripe_webhook is the only money truth in
// this company. A card-required trial takes no money at checkout, so its
// checkout must never write that row; the row is written ONCE, at the first
// real charge. These guard the branches that decide it.
describe('stripe-webhook: a trial is not a purchase', () => {
  it('the checkout trial path returns before any purchase row', () => {
    const b = branch('checkout.session.completed');
    const trialReturn = b.indexOf('return new Response("Trial started"');
    expect(trialReturn, 'the trial path returns on its own').toBeGreaterThan(-1);
    const trialBlock = b.slice(b.lastIndexOf('if (isTrial) {', trialReturn), trialReturn);
    expect(trialBlock).toContain('logProEvent("pro_trial_started"');
    expect(trialBlock).not.toContain('pro_purchase');
    // every purchase row in the branch sits after the trial has returned
    const purchases = [...b.matchAll(/logProEvent\("pro_purchase_completed"/g)].map(m => m.index);
    expect(purchases).toHaveLength(1);
    for (const at of purchases) expect(at).toBeGreaterThan(trialReturn);
  });

  it('an unmatched trial is not filed as a pending purchase', () => {
    const b = branch('checkout.session.completed');
    const pendingPurchase = b.indexOf('logProEvent("pro_purchase_pending"');
    const trialPendingReturn = b.indexOf('return new Response("User not found, trial stored for later"');
    expect(trialPendingReturn).toBeGreaterThan(-1);
    expect(pendingPurchase).toBeGreaterThan(trialPendingReturn);
  });

  it('a trial is read from Stripe, only for a $0 subscription checkout', () => {
    const b = branch('checkout.session.completed');
    expect(b).toMatch(/session\.mode === "subscription" && subscriptionId && \(session\.amount_total \?\? 0\) === 0/);
    expect(b).toContain('sub.status === "trialing"');
    expect(b).toContain('userData.proTrial = true');
    // Pro runs to the trial end, not a plan period
    expect(b).toContain('new Date((trialEnd as number) * 1000)');
  });

  it('a redelivered checkout is not counted twice', () => {
    const b = branch('checkout.session.completed');
    const check = b.indexOf('userData.stripeSessionId === session.id');
    expect(check).toBeGreaterThan(-1);
    expect(b.indexOf('logProEvent("pro_purchase_completed"')).toBeGreaterThan(check);
    expect(b.indexOf('logProEvent("pro_trial_started", userRecord.username')).toBeGreaterThan(check);
  });

  it('$0 and first invoices return before anything is extended or logged', () => {
    const b = branch('invoice.payment_succeeded');
    const zero = b.indexOf('if (amountPaid <= 0)');
    const create = b.indexOf('if (invoice.billing_reason === "subscription_create")');
    expect(zero).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(zero);
    const firstEffect = Math.min(b.indexOf('logProEvent('), b.indexOf('proExpiry ='), b.indexOf('from("users")'));
    expect(firstEffect).toBeGreaterThan(create);
    expect(b).not.toContain('"invoice.paid"');
  });

  it('the first charge after a trial is the one purchase row, with after_trial', () => {
    const b = branch('invoice.payment_succeeded');
    const purchase = b.indexOf('logProEvent("pro_purchase_completed"');
    expect(purchase).toBeGreaterThan(-1);
    // the nearest condition above the purchase row is the afterTrial test
    const guard = b.lastIndexOf('if (', purchase);
    expect(b.slice(guard, guard + 17), 'the purchase row is behind afterTrial').toBe('if (afterTrial) {');
    expect(b.slice(guard, purchase)).not.toContain('} else');
    expect(b.slice(purchase, purchase + 300)).toContain('after_trial: true');
    // every other paid cycle stays a renewal
    expect(b).toContain('logProEvent("pro_renewal_completed"');
    expect(b.indexOf('logProEvent("pro_renewal_completed"')).toBeGreaterThan(b.indexOf('} else {', purchase));
    // afterTrial is decided by the subscription's trial end, not guessed
    expect(b).toContain('sub.trial_end');
    expect(b).toContain('userData.proTrialConvertedInvoice === invoice.id');
  });

  it('exactly two purchase rows exist in the whole file: checkout, and after a trial', () => {
    expect(src.match(/logProEvent\("pro_purchase_completed"/g)).toHaveLength(2);
  });

  it('a trial cancelled before paying is pro_trial_cancelled, and ends at the trial end', () => {
    const u = branch('customer.subscription.updated');
    const trialing = u.indexOf('if (subscription.status === "trialing")');
    expect(trialing).toBeGreaterThan(-1);
    expect(u.indexOf('"pro_trial_cancelled"')).toBeGreaterThan(trialing);
    expect(u.indexOf('"pro_trial_cancelled"')).toBeLessThan(u.indexOf('"pro_subscription_cancelled"'));

    const d = branch('customer.subscription.deleted');
    expect(d).toContain('userData.proExpiry = trialEndIso');
    const trialLog = d.indexOf('logProEvent("pro_trial_cancelled"');
    const trialReturn = d.indexOf('return new Response("Trial cancelled"');
    expect(trialLog).toBeGreaterThan(-1);
    expect(trialReturn).toBeGreaterThan(trialLog);
    expect(d.indexOf('logProEvent("pro_subscription_cancelled"')).toBeGreaterThan(trialReturn);
  });
});

describe('stripe-webhook: the plan comes from the price before the amount', () => {
  // The function itself, run: strip the one type annotation and hand it the
  // file's own `plan` helper.
  const start = src.indexOf('function planFromInterval(');
  const fnSrc = src.slice(start, src.indexOf('\n}\n', start) + 2).replace(/\(price: [^)]*\)/, '(price)');
  const planFromInterval = new Function('plan', `${fnSrc}; return planFromInterval;`)(
    type => ({ type, durationDays: { monthly: 30, quarterly: 90, annual: 365 }[type] }),
  );

  it('reads the billing interval', () => {
    expect(planFromInterval({ recurring: { interval: 'year', interval_count: 1 } }).type).toBe('annual');
    expect(planFromInterval({ recurring: { interval: 'month', interval_count: 3 } }).type).toBe('quarterly');
    expect(planFromInterval({ recurring: { interval: 'month', interval_count: 1 } }).type).toBe('monthly');
    expect(planFromInterval({ recurring: { interval: 'month' } }).type).toBe('monthly');
    expect(planFromInterval({ recurring: null })).toBeNull();
    expect(planFromInterval(undefined)).toBeNull();
    expect(planFromInterval({ recurring: { interval: 'week', interval_count: 1 } })).toBeNull();
  });

  it('runs before the amount fallback at checkout', () => {
    const b = branch('checkout.session.completed');
    const byInterval = b.indexOf('planFromInterval(');
    const byAmount = b.indexOf('amount >= 9900');
    expect(byInterval).toBeGreaterThan(-1);
    expect(byAmount).toBeGreaterThan(byInterval);
  });

  it('the India prices are mapped by id', () => {
    const block = src.slice(src.indexOf('const PRICE_TO_PLAN'), src.indexOf('};', src.indexOf('const PRICE_TO_PLAN')));
    expect(block).toMatch(/Deno\.env\.get\("STRIPE_PRICE_MONTHLY_IN"\) \|\| ""\]: plan\("monthly"\)/);
    expect(block).toMatch(/Deno\.env\.get\("STRIPE_PRICE_ANNUAL_IN"\) \|\| ""\]: plan\("annual"\)/);
    // an unset secret must not become a "" key that matches an empty id
    expect(src).toContain('delete PRICE_TO_PLAN[""]');
  });
});

describe('trial-reminder-cron: not the Stripe trial reminder', () => {
  const cron = fs.readFileSync(join(ROOT, 'supabase/functions/trial-reminder-cron/index.ts'), 'utf8');
  it('skips a Stripe trialist before any send', () => {
    const skip = cron.indexOf('if (user.data?.proTrial === true)');
    expect(skip).toBeGreaterThan(-1);
    expect(cron.indexOf('sendViaResend(RESEND_KEY')).toBeGreaterThan(skip);
    expect(cron).toContain('data->>proType=eq.trial');
  });
});
