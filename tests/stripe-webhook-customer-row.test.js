// Which users row is "this Stripe customer" (2026-10-30;
// supabase/functions/stripe-webhook/customer-row.ts).
//
// A guest who trials and then registers leaves two rows with one
// stripeCustomerId. The webhook took users[0] of an unordered result, so the
// day-7 charge after a trial (or a renewal) could extend Pro on the abandoned
// guest row while the account that paid stayed lapsed. Pins: the account
// beats the guest, the subscription's metadata breaks ties between equals,
// then the newest row; and every customer lookup in the webhook goes through
// the one helper — no handler keeps its own users[0].
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickCustomerRow, isGuestUsername } from '../supabase/functions/stripe-webhook/customer-row.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(join(ROOT, 'supabase/functions/stripe-webhook/index.ts'), 'utf8');
const code = src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

describe('pickCustomerRow', () => {
  const guest = { username: 'guest_1700000000000', updated_at: '2026-10-27T03:28:36Z' };
  const account = { username: 'newaccount', updated_at: '2026-10-21T18:43:00Z' };

  it('the registered account beats the guest row, whatever order the database returns', () => {
    expect(pickCustomerRow([guest, account])).toBe(account);
    expect(pickCustomerRow([account, guest])).toBe(account);
    // even when the guest row is newer and the subscription metadata names the guest
    expect(pickCustomerRow([guest, account], 'guest_1700000000000')).toBe(account);
  });

  it('between two accounts the metadata name wins, then the newest row', () => {
    const a = { username: 'alice', updated_at: '2026-10-01T00:00:00Z' };
    const b = { username: 'bob', updated_at: '2026-10-20T00:00:00Z' };
    expect(pickCustomerRow([a, b])).toBe(b);
    expect(pickCustomerRow([a, b], 'alice')).toBe(a);
    expect(pickCustomerRow([b, a], 'nobody')).toBe(b);
  });

  it('one row is that row; nothing is null; a guest alone is still found', () => {
    expect(pickCustomerRow([guest])).toBe(guest);
    expect(pickCustomerRow([])).toBe(null);
    expect(pickCustomerRow(null)).toBe(null);
    expect(isGuestUsername('guest_1')).toBe(true);
    expect(isGuestUsername('guestbook')).toBe(false);
  });
});

describe('stripe-webhook uses it everywhere', () => {
  it('no handler picks users[0] or filters by stripeCustomerId on its own', () => {
    expect(code).not.toMatch(/users\[0\]/);
    expect((code.match(/data->>stripeCustomerId/g) || []).length).toBe(1);
    expect(code).toContain('return pickCustomerRow(users, hintUsername);');
    expect(code).toContain('import { pickCustomerRow } from "./customer-row.ts";');
  });

  it('the money branches pass the subscription\'s own username as the tie-break hint', () => {
    const paid = code.slice(code.indexOf('event.type === "invoice.payment_succeeded"'), code.indexOf('event.type === "invoice.payment_failed"'));
    expect(paid).toMatch(/const userRecord = await findUserByCustomer\(customerId,\s*\([\s\S]*?subscription_details\?\.metadata\?\.username \|\| null\);/);
    const deleted = code.slice(code.indexOf('event.type === "customer.subscription.deleted"'));
    expect(deleted).toContain('const userRecord = await findUserByCustomer(customerId, subscription.metadata?.username || null);');
  });
});
