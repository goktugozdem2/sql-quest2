// Whose Stripe event is it, and why did the card fail (2026-11-28;
// supabase/functions/stripe-webhook/attribution.ts and decline.ts).
//
// Found by docs/reads/india-checkout-2026-11-28.md §7: 19 webhook rows sat
// under the username "unknown" — logProEvent's stand-in for "no row holds this
// customer id". Every Checkout Session makes a new Stripe customer and
// checkout.session.completed writes it over the row's stripeCustomerId, so a
// person who bought a second subscription lost the first one's mapping: its
// retries, its recovery payment and its renewals fell off the account (the
// paid invoice left no row at all). The same stand-in caught checkout
// declines on a minutes-old customer and status changes that raced the
// checkout's own write.
//
// Pins: the customer id alone picks the row the webhook may WRITE to; the
// subscription's metadata, then its Checkout Session, only NAME the person;
// every branch that used to write "unknown" now writes the name; and the
// failure rows carry Stripe's decline code and 3D Secure facts, read by
// nothing. The pure modules are run, the Deno wiring is read.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attributeEvent, subscriptionUsername, cleanUsername } from '../supabase/functions/stripe-webhook/attribution.ts';
import { pickCustomerRow } from '../supabase/functions/stripe-webhook/customer-row.ts';
import { paymentFailureFields, setupFailureFields, EMPTY_FAILURE_FIELDS } from '../supabase/functions/stripe-webhook/decline.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(join(ROOT, 'supabase/functions/stripe-webhook/index.ts'), 'utf8');
const code = src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
const branch = type => {
  const at = code.indexOf(`event.type === "${type}"`);
  expect(at, `no handler for ${type}`).toBeGreaterThan(-1);
  const next = code.indexOf('if (event.type ===', at + 10);
  return code.slice(at, next === -1 ? code.length : next);
};

describe('attributeEvent: the customer id writes, the subscription only names', () => {
  const row = { username: 'payer', data: { stripeCustomerId: 'cus_B' } };

  it('a customer-id match is the row, writable', () => {
    expect(attributeEvent(row, 'someone_else')).toEqual({ row, username: 'payer', matchedBy: 'customer' });
  });

  it('an attributed-only match is never writable', () => {
    const meta = attributeEvent(null, 'payer');
    expect(meta).toEqual({ row: null, username: 'payer', matchedBy: 'subscription_metadata' });
    const ref = attributeEvent(null, null, 'payer');
    expect(ref).toEqual({ row: null, username: 'payer', matchedBy: 'checkout_session' });
    expect(attributeEvent(null, null, null)).toEqual({ row: null, username: null, matchedBy: null });
  });

  it('metadata beats the Checkout Session; a malformed name is nobody', () => {
    expect(attributeEvent(null, 'from_meta', 'from_session').username).toBe('from_meta');
    expect(attributeEvent(null, 'bad name; drop', 'from_session').matchedBy).toBe('checkout_session');
    expect(cleanUsername('x'.repeat(65))).toBe(null);
    expect(cleanUsername(42)).toBe(null);
    expect(cleanUsername('guest_1700000000000')).toBe('guest_1700000000000');
  });

  // The 10-11 → 11-18 case, replayed: the row now holds the SECOND
  // subscription's customer; an event on the first one names the person and
  // writes nothing.
  it('a second subscription moved stripeCustomerId on: the first one\'s events are named, not written', () => {
    const rows = [row].filter(r => r.data.stripeCustomerId === 'cus_A'); // the lookup by the first customer
    const hit = pickCustomerRow(rows, 'payer');
    const first = attributeEvent(hit, subscriptionUsername({ subscription_details: { metadata: { username: 'payer' } } }));
    expect(first).toEqual({ row: null, username: 'payer', matchedBy: 'subscription_metadata' });
  });
});

describe('subscriptionUsername reads every object the webhook sees', () => {
  it('an invoice (subscription_details, then its first line), a subscription (metadata)', () => {
    expect(subscriptionUsername({ subscription_details: { metadata: { username: 'a' } }, metadata: { username: 'b' } })).toBe('a');
    expect(subscriptionUsername({ lines: { data: [{ metadata: { username: 'c' } }] } })).toBe('c');
    expect(subscriptionUsername({ metadata: { username: 'd', plan: 'monthly' } })).toBe('d');
    expect(subscriptionUsername({ metadata: {} })).toBe(null);
    expect(subscriptionUsername(null)).toBe(null);
  });
});

describe('stripe-webhook: no event is written as "unknown" when Stripe names the person', () => {
  it('one resolver: the customer id first, then the subscription, then its Checkout Session', () => {
    const fn = code.slice(code.indexOf('async function resolveSubscriber'), code.indexOf('async function invoiceDeclineFields'));
    const byCustomer = fn.indexOf('findUserByCustomer(customerId, hint)');
    const byHint = fn.indexOf('if (row || hint) return attributeEvent(row, hint);');
    const bySession = fn.indexOf('await sessionUsernameFor(subscriptionId)');
    expect(byCustomer).toBeGreaterThan(-1);
    expect(byHint).toBeGreaterThan(byCustomer);
    expect(bySession).toBeGreaterThan(byHint);
    const session = code.slice(code.indexOf('async function sessionUsernameFor'), code.indexOf('async function resolveSubscriber'));
    expect(session).toContain('stripe.checkout.sessions.list({ subscription: subscriptionId, limit: 1 })');
    expect(session).toMatch(/catch \(_\) \{\s*return null;/);
  });

  for (const type of ['invoice.payment_succeeded', 'invoice.payment_failed', 'customer.subscription.updated', 'customer.subscription.deleted', 'charge.refunded']) {
    it(`${type}: writes only to the customer-id row, names the person on every row`, () => {
      const b = branch(type);
      expect(b).toContain('await resolveSubscriber(customerId,');
      expect(b).toContain('const userRecord = subscriber.row;');
      // nothing written to a row found any other way
      expect(b).not.toMatch(/revokeProAccess\(subscriber|\.eq\("username", subscriber/);
      expect(b).not.toMatch(/findUserByCustomer\(/);
      // no pro_events row under the customer-id match alone
      expect(b).not.toMatch(/logProEvent\([^;]*userRecord\?\.username \|\| null/);
    });
  }

  it('a paid invoice no row holds is recorded as money, with nothing extended', () => {
    const b = branch('invoice.payment_succeeded');
    const orphan = b.slice(b.indexOf('} else {', b.indexOf('if (userRecord) {')), b.indexOf('return new Response("Subscription extended"'));
    expect(orphan).toContain('logProEvent("pro_renewal_completed", subscriber.username');
    expect(orphan).toContain('applied: false,');
    expect(orphan).toContain('amount_cents: amountPaid,');
    expect(orphan).not.toMatch(/\.update\(|proExpiry|proStatus/);
  });

  it('a subscription no row holds that goes unpaid / incomplete_expired is a status row, never a revoke row', () => {
    const b = branch('customer.subscription.updated');
    expect(b).toContain('if ((subscription.status === "unpaid" || subscription.status === "incomplete_expired") && userRecord) {');
    expect(b.match(/"pro_access_revoked"/g).length).toBe(1);
  });

  it('a subscription that ends with no row is still somebody\'s, and revokes nothing', () => {
    const b = branch('customer.subscription.deleted');
    const tail = b.slice(b.lastIndexOf('} else {'));
    expect(tail).toContain('logProEvent("pro_subscription_cancelled", subscriber.username');
    expect(tail).toContain('revoked: false,');
  });
});

describe('decline fields: why the card failed (measurement only)', () => {
  it('a 3D Secure failure at checkout', () => {
    const f = paymentFailureFields({
      status: 'requires_payment_method',
      last_payment_error: { code: 'payment_intent_authentication_failure', type: 'card_error' },
      latest_charge: { failure_code: null, outcome: null, payment_method_details: { card: { three_d_secure: { result: 'failed' } } } },
    });
    expect(f.three_d_secure).toBe(true);
    expect(f.three_d_secure_result).toBe('failed');
    expect(f.error_code).toBe('payment_intent_authentication_failure');
    expect(f.decline_code).toBe(null);
  });

  it('an issuer decline with no 3D Secure', () => {
    const f = paymentFailureFields({
      status: 'requires_payment_method',
      last_payment_error: { code: 'card_declined', decline_code: 'do_not_honor', type: 'card_error' },
      latest_charge: { failure_code: 'card_declined', outcome: { network_status: 'declined_by_network', reason: 'generic_decline' }, payment_method_details: { card: { three_d_secure: null } } },
    });
    expect(f).toMatchObject({ decline_code: 'do_not_honor', error_code: 'card_declined', failure_code: 'card_declined', network_status: 'declined_by_network', outcome_reason: 'generic_decline', three_d_secure: false });
  });

  it('an off-session charge waiting for the customer (the India e-mandate shape)', () => {
    const f = paymentFailureFields({
      status: 'requires_action',
      next_action: { type: 'use_stripe_sdk' },
      last_payment_error: { code: 'authentication_required', decline_code: 'authentication_required', type: 'card_error' },
    });
    expect(f).toMatchObject({ three_d_secure: true, intent_status: 'requires_action', next_action: 'use_stripe_sdk', decline_code: 'authentication_required' });
  });

  it('nothing to read is all null — never a guess', () => {
    expect(paymentFailureFields(null)).toEqual(EMPTY_FAILURE_FIELDS);
    expect(Object.values(EMPTY_FAILURE_FIELDS).every(v => v === null)).toBe(true);
  });

  it('a card that failed setup on a trial: the SetupIntent and its latest attempt', () => {
    const f = setupFailureFields({
      status: 'requires_payment_method',
      last_setup_error: { code: 'setup_intent_authentication_failure', type: 'invalid_request_error' },
      latest_attempt: { payment_method_details: { card: { three_d_secure: { result: 'failed' } } } },
    });
    expect(f).toMatchObject({ three_d_secure: true, three_d_secure_result: 'failed', error_code: 'setup_intent_authentication_failure' });
    const plain = setupFailureFields({ status: 'requires_payment_method', last_setup_error: { code: 'card_declined', decline_code: 'insufficient_funds' } });
    expect(plain).toMatchObject({ three_d_secure: false, decline_code: 'insufficient_funds' });
  });

  it('both pro_payment_failed rows and the setup row carry them; nothing branches on them', () => {
    const b = branch('invoice.payment_failed');
    expect(b).toContain('const decline = await invoiceDeclineFields(invoice);');
    expect(b.match(/\.\.\.decline,/g).length).toBe(2);
    // read by nothing: no `decline.` property access outside the spread
    expect(code).not.toMatch(/\bdecline\.(?!ts")[a-z_]+/);
    const fn = code.slice(code.indexOf('async function invoiceDeclineFields'), code.indexOf('async function revokeProAccess'));
    expect(fn).toContain('stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge"] })');
    expect(fn).toMatch(/catch \(err\) \{[\s\S]*return \{ \.\.\.EMPTY_FAILURE_FIELDS \};/);
    const s = branch('setup_intent.setup_failed');
    expect(s).toContain('stripe.setupIntents.retrieve(si.id, { expand: ["latest_attempt"] })');
    expect(s).toContain('...setupFields,');
    expect(s).not.toMatch(/api\.resend\.com|revokeProAccess|proStatus|proExpiry|\.update\(/);
  });
});
