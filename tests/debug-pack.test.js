// The Debug pack — the Debug set sold on its own (founder's decision
// 2026-11-23, PR #251): $9 once, India $3, Pro includes it. Money path.
//
// Pins:
//   1. the pack unlocks Debug items only — never another Hard, never the free
//      quota for a non-Debug challenge (src/utils/debug-pack.js);
//   2. the offer: only in a Debug lock's modal, only behind `debugPack`, only
//      to someone with neither Pro nor the pack; the copy and its prices;
//   3. checkout: `product: 'debug_pack'` → a one-time session on the pack's
//      own prices, 503 `debug_pack_unconfigured` when a price secret is unset,
//      no trial, no Payment Link fallback on the client;
//   4. the webhook: idempotent on the session id, never touches a Pro field,
//      routed before the Pro activation, a refund never revokes Pro;
//   5. the server-owned field: the migration is the live body plus two marked
//      changes, so a client save can neither set nor clear debugPackOwned
//      (the replica SQL proves the behaviour on a local Postgres);
//   6. flag off: the modal, the walls and the events are today's.
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEBUG_PACK_PRODUCT, debugPackOn, ownsDebugPack, debugPackUnlocks, proForChallenge,
  isDebugLockReason, debugPackOffered, debugPackCopy,
  buildDebugPackSessionBody, launchDebugPack, isDebugPackReturn,
} from '../src/utils/debug-pack.js';
import { DEBUG_PACK_PRICE, debugPackPrice, PRICE_TABLE } from '../src/utils/regional-price.js';
import { quotaGate, companySetGate } from '../src/utils/free-tier-boundary.js';
import { withDebugLock, proModalReasonLabel, debugLockedAs } from '../src/utils/debug-questions.js';
import {
  isDebugPackSession, packPriceIds, packRecordFrom, applyPackPurchase, applyPackRefund,
} from '../supabase/functions/stripe-webhook/debug-pack.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const stripComments = (src) => src.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const debugHard = { id: 340, type: 'debug', difficulty: 'Hard', title: 'Debug Hard' };
const debugEasy = { id: 331, type: 'debug', difficulty: 'Easy', title: 'Debug Easy' };
const plainHard = { id: 1, difficulty: 'Hard', title: 'Plain Hard' };
const plainEasy = { id: 91, difficulty: 'Easy', title: 'Plain Easy' };
const OWNED = { at: '2026-11-23T10:00:00.000Z', sessionId: 'cs_test_1', paymentIntent: 'pi_1', amount: 900, currency: 'usd' };

// ── 1. entitlement ──
describe('the pack unlocks Debug items, and only Debug items', () => {
  it('ownership is the webhook\'s record shape, nothing looser', () => {
    expect(ownsDebugPack(OWNED)).toBe(true);
    for (const bad of [null, undefined, true, 'yes', {}, [], { at: '2026-11-23' }, { sessionId: 'cs' }, { at: '', sessionId: 'cs' }]) {
      expect(ownsDebugPack(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it('proForChallenge: Pro opens everything; the pack opens Debug items only', () => {
    for (const c of [debugHard, debugEasy, plainHard, plainEasy]) {
      expect(proForChallenge({ isPro: true, challenge: c, packRecord: null }), c.title).toBe(true);
    }
    expect(proForChallenge({ isPro: false, challenge: debugHard, packRecord: OWNED })).toBe(true);
    expect(proForChallenge({ isPro: false, challenge: debugEasy, packRecord: OWNED })).toBe(true);
    expect(proForChallenge({ isPro: false, challenge: plainHard, packRecord: OWNED })).toBe(false);
    expect(proForChallenge({ isPro: false, challenge: plainEasy, packRecord: OWNED })).toBe(false);
    expect(proForChallenge({ isPro: false, challenge: debugHard, packRecord: null })).toBe(false);
    expect(debugPackUnlocks(plainHard, OWNED)).toBe(false);
  });

  it('through the real gates: a pack owner past the quota opens a Debug item, never another challenge', () => {
    const at = (c) => quotaGate({ flagOn: true, isPro: proForChallenge({ isPro: false, challenge: c, packRecord: OWNED }), solvedCount: 10, alreadySolved: false }).gated;
    expect(at(debugEasy)).toBe(false);
    expect(at(debugHard)).toBe(false);
    expect(at(plainEasy)).toBe(true);
    expect(at(plainHard)).toBe(true);
    // a non-owner past the quota meets it on a Debug item too (free rules unchanged)
    expect(quotaGate({ flagOn: true, isPro: proForChallenge({ isPro: false, challenge: debugEasy, packRecord: null }), solvedCount: 10, alreadySolved: false }).gated).toBe(true);
    // the company set gate the same way
    const scoped = [plainEasy, plainHard, { id: 2, difficulty: 'Easy' }, { id: 3, difficulty: 'Easy' }, { ...debugEasy, companies: ['X'] }];
    const set = (c) => companySetGate({ flagOn: true, isPro: proForChallenge({ isPro: false, challenge: c, packRecord: OWNED }), companyFilter: 'Capital One', challenge: c, scoped, solved: new Set() });
    expect(set(scoped[4]).gated).toBe(false);
  });

  it('app.jsx asks the one helper at every per-challenge gate', () => {
    const app = read('src/app.jsx');
    expect(app).toContain('const accessFor = (challenge) => proForChallenge({ isPro, challenge, packRecord: debugPackRecord });');
    expect(app).toContain("    if (isPro) return false;\n    // The Debug pack opens Debug items, and only those (accessFor above).\n    if (type === 'challenge' && accessFor(item)) return false;\n    switch (type) {");
    // the open path's set gate and quota, and the list row's two locks
    expect(app).toMatch(/const setGate = companySetGate\(\{\n\s+flagOn: ftbFlag\('companySetGate'\),\n\s+isPro: accessFor\(challenge\),/);
    expect(app).toContain("const quota = quotaGate({ flagOn: ftbFlag('freeQuota'), isPro: accessFor(challenge), solvedCount: solvedChallenges.size, alreadySolved: solvedChallenges.has(challenge.id) });");
    expect(app).toContain("const isQuotaLocked = quotaGate({ flagOn: ftbFlag('freeQuota'), isPro: accessFor(c), solvedCount: solvedChallenges.size, alreadySolved: isSolved }).gated;");
    // the client only READS the record; it never writes one
    expect(app).not.toMatch(/\.debugPackOwned\s*=[^=]|debugPackOwned:\s/);
    expect(app).toContain('setDebugPackRecord(ownsDebugPack(userData.debugPackOwned) ? userData.debugPackOwned : null);');
  });
});

// ── 2. the offer ──
describe('the offer: a Debug lock, the flag, neither Pro nor the pack', () => {
  const lock = withDebugLock({ type: 'hard_challenge', topic: null, solvedCount: 4 }, debugHard);

  it('the flag is on only when literally true', () => {
    expect(debugPackOn({ features: { debugPack: true } })).toBe(true);
    for (const f of [null, {}, { features: {} }, { features: { debugPack: 'true' } }, { features: { debugPack: 1 } }]) expect(debugPackOn(f)).toBe(false);
    expect(read('src/data/feature-flags.js')).toMatch(/\n\s+debugPack: false,\n/);
  });

  it('a Debug lock (#252\'s stamp) keeps its wall and is labelled debug_lock', () => {
    expect(lock).toMatchObject({ type: 'hard_challenge', debugLock: true, solvedCount: 4 });
    expect(isDebugLockReason(lock)).toBe(true);
    expect(isDebugLockReason({ type: 'debug_lock' })).toBe(true);
    expect(isDebugLockReason({ type: 'hard_challenge' })).toBe(false);
    expect(isDebugLockReason(withDebugLock({ type: 'hard_challenge' }, plainHard))).toBe(false);
    expect(proModalReasonLabel(lock)).toBe('debug_lock');
    expect(debugLockedAs(lock)).toBe('hard_challenge');
  });

  it('offered only with the flag, on a Debug lock, to a non-Pro non-owner', () => {
    expect(debugPackOffered({ flagOn: true, reason: lock, isPro: false, packRecord: null })).toBe(true);
    expect(debugPackOffered({ flagOn: false, reason: lock, isPro: false, packRecord: null })).toBe(false);
    expect(debugPackOffered({ flagOn: true, reason: { type: 'hard_challenge' }, isPro: false, packRecord: null })).toBe(false);
    expect(debugPackOffered({ flagOn: true, reason: lock, isPro: true, packRecord: null })).toBe(false);
    expect(debugPackOffered({ flagOn: true, reason: lock, isPro: false, packRecord: OWNED })).toBe(false);
  });

  it('the copy, EN and TR, with the region\'s own price', () => {
    expect(debugPackCopy('en', 'default').line).toBe('Debug set — $9 once, yours to keep. Pro includes it.');
    expect(debugPackCopy('en', 'IN').line).toBe('Debug set — $3 once, yours to keep. Pro includes it.');
    expect(debugPackCopy('tr', 'default').line).toBe("Debug seti — bir kez $9, hep senin. Pro'da zaten var.");
    expect(debugPackCopy('en').error).toBe("Couldn't open checkout — try again.");
    expect(DEBUG_PACK_PRICE).toEqual({ default: 9, IN: 3 });
    expect(debugPackPrice('default')).toBe('$9');
    expect(debugPackPrice('IN')).toBe('$3');
    expect(debugPackPrice('XX')).toBe('$9');
    // the subscription table is untouched
    expect(PRICE_TABLE.default).toEqual({ monthly: 29, annual: 99 });
  });

  it('the card is secondary: never the accent, and only behind debugPackOfferNow', () => {
    const app = read('src/app.jsx');
    const at = app.indexOf('{debugPackOfferNow && !checkoutPendingPlan && (() => {');
    expect(at).toBeGreaterThan(-1);
    const card = app.slice(at, app.indexOf('})()}', at));
    expect(card).toContain('data-testid="debug-pack-cta"');
    expect(card).not.toMatch(/#FFE34D/i);
    expect(card).toContain('onClick={beginDebugPackCheckout}');
    expect(app.match(/data-testid="debug-pack-offer"/g).length).toBe(1);
    expect(app).toContain('const debugPackOfferNow = debugPackOffered({ flagOn: DEBUG_PACK_OFFER_ON, reason: proModalReason, isPro: userProStatus, packRecord: debugPackRecord });');
    expect(app).toContain('const DEBUG_PACK_OFFER_ON = DEBUG_QUESTIONS_ON && debugPackOn(window.FEATURE_FLAGS);');
  });
});

// ── 3. checkout ──
describe('checkout: one product, its own prices, no fallback', () => {
  it('the session body: product, region, username — never a plan, a trial or a promo', () => {
    expect(buildDebugPackSessionBody({ username: 'alice', email: 'A@Example.com', region: 'IN' }))
      .toEqual({ product: DEBUG_PACK_PRODUCT, region: 'IN', username: 'alice', email: 'a@example.com' });
    expect(buildDebugPackSessionBody({ username: 'alice', region: 'FR' })).toEqual({ product: 'debug_pack', region: 'default', username: 'alice' });
    expect(buildDebugPackSessionBody({ username: 'bad name!' })).toBeNull();
    expect(Object.keys(buildDebugPackSessionBody({ username: 'alice' }))).not.toContain('trial');
  });

  it('launchDebugPack: a failure never navigates; only a Stripe URL is followed', async () => {
    const navigate = vi.fn();
    const onError = vi.fn();
    expect(await launchDebugPack({ request: () => Promise.reject(new Error('http_503')), navigate, onError })).toEqual({ via: 'error', reason: 'http_503' });
    expect(await launchDebugPack({ request: async () => ({ url: 'https://buy.stripe.com/abc' }), navigate, onError })).toEqual({ via: 'error', reason: 'bad_url' });
    expect(await launchDebugPack({ navigate, onError })).toEqual({ via: 'error', reason: 'no_request' });
    expect(navigate).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(3);
    expect(await launchDebugPack({ request: async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' }), navigate, onError })).toEqual({ via: 'session', reason: null });
    expect(navigate).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1');
  });

  it('the client click: product on both click events, no Payment Link anywhere in it', () => {
    const app = read('src/app.jsx');
    const at = app.indexOf('const beginDebugPackCheckout = () => {');
    const fn = app.slice(at, app.indexOf('\n  };\n', at));
    expect(fn).toContain("trackActivationEvent('pro_plan_clicked', { ...label");
    expect(fn).toContain("trackActivationEvent('pro_checkout_clicked', { ...label");
    expect(fn).toContain('const label = { plan: DEBUG_PACK_PRODUCT, product: DEBUG_PACK_PRODUCT, modalReason: proModalReasonLabel(proModalReason), lockedAs: debugLockedAs(proModalReason), priceRegion };');
    for (const bad of ['launchCheckout', 'CHECKOUT_LINKS', 'checkoutLinkFor', 'buy.stripe.com', 'launchWithFallback']) expect(fn, bad).not.toContain(bad);
    expect(fn).toContain('launchDebugPack({');
  });

  it('create-checkout-session: its own two prices, 503 when unset, payment mode, no trial, no recovery mail', () => {
    const fn = stripComments(read('supabase/functions/create-checkout-session/index.ts'));
    const priceFor = fn.slice(fn.indexOf('function debugPackPriceFor'), fn.indexOf('async function debugPackSession'));
    expect(priceFor).toContain('Deno.env.get("STRIPE_PRICE_DEBUG_PACK_IN")');
    expect(priceFor).toContain('Deno.env.get("STRIPE_PRICE_DEBUG_PACK")');
    expect(priceFor).not.toMatch(/STRIPE_PRICE_(MONTHLY|ANNUAL)/);
    const sess = fn.slice(fn.indexOf('async function debugPackSession'));
    expect(sess).toMatch(/if \(!price\) \{[\s\S]*?return json\(\{ error: "debug_pack_unconfigured" \}, 503, origin\);/);
    expect(sess).toContain('mode: "payment"');
    expect(sess).toContain('const metadata = { username, product: DEBUG_PACK_PRODUCT, region, source: "checkout_session" };');
    expect(sess).toContain('payment_intent_data: { metadata }');
    expect(sess).toContain('success_url: `${origin}/app/?payment=success&product=${DEBUG_PACK_PRODUCT}`');
    for (const bad of ['trial_period_days', 'subscription_data', 'after_expiration', 'allow_promotion_codes', 'discounts']) expect(sess, bad).not.toContain(bad);
    // the same origin gate runs first: the product branch sits after it
    const serve = fn.slice(fn.indexOf('serve(async (req) =>'), fn.indexOf('export const DEBUG_PACK_PRODUCT'));
    expect(serve.indexOf('origin_not_allowed')).toBeLessThan(serve.indexOf('return await debugPackSession(req, input, origin);'));
    expect(serve.indexOf('input.warm === true')).toBeLessThan(serve.indexOf('return await debugPackSession(req, input, origin);'));
    expect(serve).toContain('if (input.product !== DEBUG_PACK_PRODUCT) return json({ error: "invalid_product" }, 400, origin);');
  });

  it('the return: ?payment=success&product=debug_pack is the pack\'s, never the Pro poll\'s', () => {
    expect(isDebugPackReturn('?payment=success&product=debug_pack')).toBe(true);
    expect(isDebugPackReturn('?payment=success')).toBe(false);
    expect(isDebugPackReturn('?product=debug_pack')).toBe(false);
    const app = read('src/app.jsx');
    expect(app).toContain("return new URLSearchParams(window.location.search).get('payment') === 'success' && !isDebugPackReturn(window.location.search);");
    const at = app.indexOf('const pendingDebugPackReturnRef = useRef(');
    const eff = app.slice(at, app.indexOf('}, [isSessionLoading, currentUser]);', at));
    expect(eff).toContain('ownsDebugPack(fresh.debugPackOwned)');
    expect(eff).toContain('setDebugFilter(true);');
    expect(eff).not.toMatch(/setUserProStatus|setProType|setProExpiry/);
    expect(eff).toContain('if (attempts < 6) setTimeout(poll, 2000);');
  });

  it('checkout-abandon never mails a Pro note about a pack click', () => {
    const fn = read('supabase/functions/checkout-abandon/index.ts');
    expect(fn).toContain("if (product === 'debug_pack') continue");
  });
});

// ── 4. the webhook ──
describe('stripe-webhook: idempotent, never a Pro field, routed before Pro', () => {
  const session = {
    id: 'cs_test_1', mode: 'payment', payment_status: 'paid', payment_intent: 'pi_1',
    amount_total: 900, currency: 'usd', metadata: { username: 'alice', product: 'debug_pack', region: 'default' },
  };
  const NOW = new Date('2026-11-23T10:00:00.000Z');
  const proRow = {
    xp: 40, solvedChallenges: [1, 2], proStatus: true, proType: 'annual', proExpiry: '2027-11-01T00:00:00.000Z',
    proAutoRenew: true, stripeCustomerId: 'cus_a', stripeSessionId: 'cs_pro', proTrial: false,
  };

  it('a pack session is recognised by its metadata or by its price', () => {
    const env = { STRIPE_PRICE_DEBUG_PACK: 'price_pack', STRIPE_PRICE_DEBUG_PACK_IN: 'price_pack_in' };
    const prices = packPriceIds(k => env[k]);
    expect(prices).toEqual(['price_pack', 'price_pack_in']);
    expect(packPriceIds(() => undefined)).toEqual([]);
    expect(isDebugPackSession(session, 'price_x', [])).toBe(true);
    expect(isDebugPackSession({ id: 'cs', metadata: {} }, 'price_pack_in', prices)).toBe(true);
    expect(isDebugPackSession({ id: 'cs', metadata: { plan: 'annual' } }, 'price_annual', prices)).toBe(false);
    expect(isDebugPackSession({ id: 'cs', metadata: {} }, '', [])).toBe(false);
  });

  it('writes one key, the record; every Pro and Stripe-id field is untouched', () => {
    const rec = packRecordFrom(session, NOW);
    expect(rec).toEqual({ at: NOW.toISOString(), sessionId: 'cs_test_1', paymentIntent: 'pi_1', amount: 900, currency: 'usd' });
    const before = JSON.parse(JSON.stringify(proRow));
    const out = applyPackPurchase(proRow, rec);
    expect(out.changed).toBe(true);
    expect(proRow).toEqual(before); // never mutates
    const { debugPackOwned, ...rest } = out.data;
    expect(debugPackOwned).toEqual(rec);
    expect(rest).toEqual(before);
    // a non-Pro buyer stays non-Pro
    const free = applyPackPurchase({ xp: 1, proStatus: false }, rec).data;
    expect(free.proStatus).toBe(false);
    expect(Object.keys(free).sort()).toEqual(['debugPackOwned', 'proStatus', 'xp']);
  });

  it('is idempotent on the session id; a second purchase changes nothing', () => {
    const rec = packRecordFrom(session, NOW);
    const once = applyPackPurchase({ xp: 1 }, rec).data;
    const again = applyPackPurchase(once, packRecordFrom(session, new Date('2026-11-24T00:00:00Z')));
    expect(again).toMatchObject({ changed: false, already: 'same_session' });
    expect(again.data).toEqual(once);
    const second = applyPackPurchase(once, { ...rec, sessionId: 'cs_test_2' });
    expect(second).toMatchObject({ changed: false, already: 'owned' });
    expect(second.data.debugPackOwned.sessionId).toBe('cs_test_1');
  });

  it('a refund clears the record only when full and for its own payment; nothing else moves', () => {
    const owned = { ...proRow, debugPackOwned: packRecordFrom(session, NOW) };
    expect(applyPackRefund(owned, 'pi_1', false).cleared).toBe(false);
    expect(applyPackRefund(owned, 'pi_other', true).cleared).toBe(false);
    const out = applyPackRefund(owned, 'pi_1', true);
    expect(out.cleared).toBe(true);
    expect(out.data).toEqual(proRow);
  });

  it('index.ts: the pack is routed before any plan mapping, and its handler names no Pro field', () => {
    const src = read('supabase/functions/stripe-webhook/index.ts');
    const code = stripComments(src);
    const completed = code.slice(code.indexOf('event.type === "checkout.session.completed"'), code.indexOf('event.type === "invoice.payment_succeeded"'));
    const route = completed.indexOf('if (isDebugPackSession(session as unknown as Parameters<typeof isDebugPackSession>[0], priceId, DEBUG_PACK_PRICES)) {\n        return await handleDebugPackCompleted(session, username || null, email || null);\n      }');
    expect(route).toBeGreaterThan(-1);
    expect(route).toBeLessThan(completed.indexOf('let planInfo'));
    expect(route).toBeLessThan(completed.indexOf('userData.proStatus = true'));
    const handler = code.slice(code.indexOf('async function handleDebugPackCompleted'), code.indexOf('async function debugPackRefundTarget'));
    for (const k of ['proStatus', 'proType', 'proExpiry', 'proAutoRenew', 'stripeCustomerId', 'stripeSessionId', 'proTrial', 'pending_subscriptions', 'pro_purchase_completed']) {
      expect(handler, k).not.toContain(k);
    }
    expect(handler).toContain('if (session.payment_status !== "paid")');
    expect(handler).toContain('applyPackPurchase(');
    expect(handler).toContain('if (applied.already === "same_session")');
    expect(handler).toContain('logProEvent("debug_pack_purchased", userRecord.username, "stripe_webhook", { ...base, payment_intent: record.paymentIntent });');
    expect(handler).toMatch(/const base = \{\n\s+stripe_session_id: session\.id,\n\s+region,\n\s+amount: session\.amount_total \?\? null,/);
  });

  it('index.ts: a pack refund returns before the Pro revocation; a pack expiry is not pro_checkout_expired', () => {
    const code = stripComments(read('supabase/functions/stripe-webhook/index.ts'));
    const refund = code.slice(code.indexOf('event.type === "charge.refunded"'));
    const packAt = refund.indexOf('if (pack.isPack) {');
    expect(packAt).toBeGreaterThan(-1);
    const packBlock = refund.slice(packAt, refund.indexOf('return new Response("Debug pack refund recorded", { status: 200 });') + 10);
    expect(packAt).toBeLessThan(refund.indexOf('revokeProAccess(userRecord)'));
    expect(packBlock).not.toContain('revokeProAccess');
    expect(packBlock).not.toContain('subscriptions.cancel');
    expect(packBlock).toContain('logProEvent("debug_pack_refunded"');
    const target = code.slice(code.indexOf('async function debugPackRefundTarget'), code.indexOf('serve(async (req) =>'));
    expect(target).toContain('if (charge.invoice) return { isPack: false');
    expect(target).toContain('.filter("data->debugPackOwned->>paymentIntent", "eq", paymentIntent)');
    const expired = code.slice(code.indexOf('event.type === "checkout.session.expired"'), code.indexOf('event.type === "customer.subscription.updated"'));
    expect(expired.indexOf('logProEvent("debug_pack_checkout_expired"')).toBeGreaterThan(-1);
    expect(expired.indexOf('logProEvent("debug_pack_checkout_expired"')).toBeLessThan(expired.indexOf('logProEvent("pro_checkout_expired"'));
  });
});

// ── 5. the server-owned field ──
describe('debugPackOwned is server-owned (migration 20261123150000)', () => {
  const bill = read('supabase/migrations/20261122130000_billing_issue_server_owned.sql');
  const mig = read('supabase/migrations/20261123150000_debug_pack_server_owned.sql');
  const rollback = read('supabase/manual/20261123_debug_pack_server_owned_rollback.sql');
  const probe = read('supabase/manual/20261123_debug_pack_server_owned_probe.sql');
  const replica = read('supabase/manual/debug-pack-replica-test.sql');
  const fnOf = (src, name = 'sq_save_user') => {
    const at = src.indexOf(`create or replace function public.${name}(`);
    expect(at, name).toBeGreaterThan(-1);
    const quote = src.slice(at).match(/\nas (\$\w*\$)/)[1];
    return src.slice(at, src.indexOf(quote + ';', at));
  };
  const arr = (fn, name) => fn.slice(fn.indexOf(`${name} constant text[] := array[`), fn.indexOf('];', fn.indexOf(`${name} constant text[] := array[`)));
  const MARK_KEYS = "'billingIssue', -- M-01 (2026-11-22): written by stripe-webhook only\n    'debugPackOwned' -- the Debug pack (2026-11-23): written by stripe-webhook only\n  ];";
  const BEFORE_KEYS = "'billingIssue' -- M-01 (2026-11-22): written by stripe-webhook only\n  ];";
  const CARRY = /\n {6}-- ── the Debug pack \(2026-11-23\): a guest's pack follows the guest into its new account ──\n[\s\S]*? {6}-- ── end the Debug pack ──/;

  it('sq_save_user is the 20261122130000 body, byte for byte, plus the two marked changes', () => {
    const after = fnOf(mig);
    expect(after).toContain(MARK_KEYS);
    expect(after).toMatch(CARRY);
    const stripped = after.replace(MARK_KEYS, BEFORE_KEYS).replace(CARRY, '');
    expect(stripped).toBe(fnOf(bill));
  });

  it('a client save cannot set or clear it: a server key, not a plan key', () => {
    const fn = fnOf(mig);
    expect(arr(fn, 'server_keys')).toMatch(/\n {4}'debugPackOwned' -- /);
    expect(arr(fn, 'plan_keys')).not.toContain('debugPackOwned');
    expect(fn).toMatch(/foreach k in array server_keys loop\n\s+v_data := v_data - k;\n\s+v_keep := case when jsonb_typeof\(o\.data\) = 'object' then o\.data->k end;/);
    expect(fn).toMatch(/foreach k in array server_keys loop\n\s+v_data := v_data - k;\n\s+end loop;/);
  });

  it('the guest carry needs the guest\'s own secret', () => {
    const block = fnOf(mig).match(CARRY)[0];
    expect(block).toContain("and public.sq_session_token_check(p_carry_pro_from, p_carry_token, false) = 'ok' then");
    expect(block).toContain("v_data := v_data || jsonb_build_object('debugPackOwned', g.data -> 'debugPackOwned');");
  });

  it('refuses to run over the cut or before billingIssue; one transaction; schema reloaded; never applied by the agent', () => {
    const guard = mig.slice(mig.indexOf('do $$'), mig.indexOf('end $$;'));
    expect(guard).toContain("if def like '%session token required%' then");
    expect(guard).toContain("if def not like '%''billingIssue''%' then");
    expect(mig.indexOf('end $$;')).toBeLessThan(mig.indexOf('create or replace function public.sq_save_user('));
    expect(mig).not.toMatch(/drop function/);
    expect(mig).toMatch(/grant execute on function public\.sq_save_user\(text, jsonb, text, text, text, text, text, text\) to anon, authenticated, service_role;/);
    expect(mig).toMatch(/^begin;$/m);
    expect(mig).toMatch(/^commit;$/m);
    expect(mig.trim().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });

  it('the rollback restores 20261122130000; the probe is rolled back; the replica is local-only and checks r1-r8', () => {
    expect(fnOf(rollback)).toBe(fnOf(bill));
    expect(probe).toMatch(/^begin;$/m);
    expect(probe.trim().endsWith('rollback;')).toBe(true);
    expect(probe).not.toMatch(/^commit;$/m);
    for (const k of ['check 1 FAILED', 'check 2 FAILED', 'check 3 FAILED', 'check 4 FAILED']) expect(probe, k).toContain(k);
    expect(replica).toMatch(/^-- LOCAL SCRATCH DATABASE ONLY — never run against production\./);
    expect(replica).toContain('\\ir ../migrations/20261123150000_debug_pack_server_owned.sql');
    expect(replica).toContain('\\ir 20261123_debug_pack_server_owned_rollback.sql');
    for (const k of ['r1 FAILED', 'r2 FAILED', 'r3 FAILED', 'r4 FAILED', 'r5 FAILED', 'r6 FAILED', 'r7 FAILED', 'r8 FAILED', 'ALL CHECKS PASSED']) expect(replica, k).toContain(k);
  });

  it('the session-token cut and its rollback keep debugPackOwned too', () => {
    for (const f of ['supabase/manual/20260925b_session_token_cut.sql', 'supabase/manual/20260925b_session_token_cut_rollback.sql']) {
      const fn = fnOf(read(f));
      expect(arr(fn, 'server_keys'), f).toContain("'debugPackOwned'");
      expect(fn, f).toMatch(CARRY);
    }
    expect(fnOf(read('supabase/manual/20260925b_session_token_cut_rollback.sql'))).toBe(fnOf(mig));
  });
});

// ── 6. flag off ──
describe('flag off: today\'s modal, walls and events', () => {
  const app = read('src/app.jsx');

  it('a locked Debug item meets its own wall unless the offer is on', () => {
    const at = app.indexOf('const openDebugLockInstead = (challenge, wallReason) => {');
    const fn = app.slice(at, app.indexOf('\n  };\n', at));
    expect(fn).toContain('if (!DEBUG_PACK_OFFER_ON || !isDebugChallenge(challenge)) return false;');
    expect(fn).toContain('setProModalReason(withDebugLock(wallReason, challenge));');
    // two calls (Hard, quota), each after the wall's cold-start diversion
    expect(app.match(/if \(openDebugLockInstead\(challenge, \{ type: '(hard_challenge|free_quota)'/g).length).toBe(2);
    for (const wall of ['hard_challenge', 'free_quota']) {
      const call = app.indexOf(`if (openDebugLockInstead(challenge, { type: '${wall}'`);
      const before = app.slice(call - 300, call);
      expect(before, wall).toContain('if (openColdStartInstead(challenge.id)) return;');
    }
  });

  it('every new modal element and event field is behind the offer or a Debug lock', () => {
    // the card: one render site, behind debugPackOfferNow
    expect(app.match(/debugPackOfferNow && /g).length).toBe(1);
    // the one new event field spreads only on a Debug lock
    expect(app.match(/\.\.\.\(isDebugLockReason\(proModalReason\) \? \{ debugPackOffered: debugPackOfferNow \} : \{\}\)/g).length).toBe(1);
    expect(app).not.toMatch(/debugLock: isDebugLockReason/);
  });
});
