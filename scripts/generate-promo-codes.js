#!/usr/bin/env node
//
// scripts/generate-promo-codes.js
//
// Generates single-use Stripe promotion codes for LinkedIn giveaway winners.
// Each code is attached to a 100% off coupon (which must exist in Stripe
// Dashboard first — see SETUP below). Output is DM-ready: "@username: CODE".
//
// SETUP (one-time, in Stripe Dashboard):
//   1. Coupons → "+ New" → 100% off, "Once" duration, no max redemptions
//   2. Note the coupon ID (e.g. LINKEDIN_30D)
//   3. Apply this coupon to your Pro monthly product (or use a flat discount)
//
// USAGE:
//   STRIPE_SECRET_KEY=sk_live_... \
//   node scripts/generate-promo-codes.js \
//     --coupon LINKEDIN_30D \
//     --winners user1,user2,user3
//
//   --coupon   Existing Stripe coupon ID
//   --winners  Comma-separated SQL Quest usernames
//   --prefix   Optional code prefix (default: LKDN)
//   --dry-run  Preview without calling Stripe API
//
// OUTPUT:
//   ✓ user1 → LKDN_USER1_4821
//   ✓ user2 → LKDN_USER2_4822
//   ...
//   --- DM-ready output ---
//   @user1: LKDN_USER1_4821 → https://buy.stripe.com/...?prefilled_promo_code=LKDN_USER1_4821
//
// SAFETY: each code is single-use (max_redemptions: 1) and tied to a single
// username via metadata. If a code leaks, only that one username can claim
// — no spam vector. Codes don't expire by default; pass --expires to set TTL.

import { argv, exit, env } from 'node:process';

// --- Arg parsing -----------------------------------------------------

const args = {};
for (let i = 2; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true; // flag
    } else {
      args[key] = next;
      i++;
    }
  }
}

const STRIPE_KEY = env.STRIPE_SECRET_KEY;
if (!args['dry-run'] && !STRIPE_KEY) {
  console.error('✗ Missing STRIPE_SECRET_KEY env var. Set it or pass --dry-run.');
  exit(1);
}
if (!args.coupon) {
  console.error('✗ Missing --coupon <coupon_id> (must exist in Stripe Dashboard).');
  exit(1);
}
if (!args.winners) {
  console.error('✗ Missing --winners user1,user2,...');
  exit(1);
}

const winners = args.winners
  .split(',')
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

if (winners.length === 0) {
  console.error('✗ No valid winners after parsing.');
  exit(1);
}

const prefix = (args.prefix || 'LKDN').toUpperCase().replace(/[^A-Z0-9]/g, '');

// --- Stripe API helper -----------------------------------------------

async function createPromotionCode(winner, code) {
  if (args['dry-run']) {
    return { code, dryRun: true };
  }
  const params = new URLSearchParams();
  params.append('coupon', args.coupon);
  params.append('code', code);
  params.append('max_redemptions', '1');
  params.append('metadata[username]', winner);
  params.append('metadata[source]', 'linkedin_giveaway');
  params.append('metadata[generated_at]', new Date().toISOString());
  if (args.expires) {
    // expires_at expects unix timestamp seconds
    const ts = Math.floor(Date.now() / 1000) + parseInt(args.expires, 10) * 86400;
    params.append('expires_at', String(ts));
  }
  const res = await fetch('https://api.stripe.com/v1/promotion_codes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  return await res.json();
}

// --- Main -----------------------------------------------------------

console.log(
  `${args['dry-run'] ? '[DRY RUN] ' : ''}Generating ${winners.length} promo codes for coupon ${args.coupon}...\n`
);

const results = [];
for (const winner of winners) {
  const sanitized = winner.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const suffix = Math.random().toString(36).slice(-4).toUpperCase();
  const code = `${prefix}_${sanitized}_${suffix}`;
  try {
    const json = await createPromotionCode(winner, code);
    if (json.error) {
      console.error(`  ✗ ${winner}: ${json.error.message}`);
      results.push({ winner, code: null, error: json.error.message });
    } else {
      console.log(`  ✓ ${winner} → ${json.code || code}`);
      results.push({ winner, code: json.code || code });
    }
  } catch (err) {
    console.error(`  ✗ ${winner}: ${err.message}`);
    results.push({ winner, code: null, error: err.message });
  }
}

// --- DM-ready summary -----------------------------------------------

const success = results.filter((r) => r.code);
const failed = results.filter((r) => !r.code);

console.log(`\n--- Summary ---`);
console.log(`✓ ${success.length} created`);
if (failed.length) console.log(`✗ ${failed.length} failed`);

if (success.length > 0) {
  console.log('\n--- DM-ready output (copy/paste) ---\n');
  for (const r of success) {
    const buyUrl = `https://buy.stripe.com/bJe14o2uleSw8m20nOdMI0a?prefilled_promo_code=${encodeURIComponent(r.code)}`;
    console.log(`@${r.winner}`);
    console.log(`Tebrikler! 1 ay sqlquest Pro promo code'un:\n  ${r.code}`);
    console.log(`Tıkla, $0 öde, 30 gün açılsın:\n  ${buyUrl}\n`);
  }
}

if (failed.length > 0) {
  console.log('\n--- Failed (manual retry) ---');
  for (const r of failed) console.log(`  ${r.winner}: ${r.error}`);
}
