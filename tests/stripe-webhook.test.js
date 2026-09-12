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

  it('the subscription ending still only flips the flag, and now leaves a row', () => {
    const b = branch('customer.subscription.deleted');
    expect(b).toContain('userData.proAutoRenew = false');
    expect(b).toContain('logProEvent("pro_subscription_cancelled"');
    expect(b).toContain('ended: true');
    expect(b).not.toMatch(/proStatus\s*=\s*false/);
  });

  it('every pro_events write in the file carries reason stripe_webhook', () => {
    const calls = [...src.matchAll(/logProEvent\(\s*"([a-z_]+)",[\s\S]*?,\s*"([a-z_]+)"/g)];
    expect(calls.length).toBeGreaterThanOrEqual(5);
    for (const m of calls) expect(m[2], m[1]).toBe('stripe_webhook');
  });
});
