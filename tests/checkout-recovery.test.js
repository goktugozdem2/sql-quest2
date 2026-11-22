// An expired Stripe session gets its recovery link (M-11, 2026-11-22;
// supabase/functions/_shared/checkout-recovery.ts). The pure half is run, not
// read — it is import-free, so vitest runs what Deno runs; the three functions
// that use it are pinned by source guards.
// Pins: every session asks Stripe for after_expiration.recovery, with no promo
// field on the copy of a discounted session and no consent_collection; the
// webhook keeps the URL only on https checkout.stripe.com / buy.stripe.com and
// never writes an address; checkout-abandon's dry run lists recovery per
// candidate and sends and writes nothing; the button's URL is Stripe's own copy
// read back at send time; mailing an address only Stripe holds is OFF.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  RECOVERY_HOSTS, stripeRecoveryUrl, recoveryParams, expiredSessionMeta,
  latestExpiredForClick, recoveryDecision, MAIL_STRIPE_ONLY_ADDRESSES, SESSION_ID_RE,
} from '../supabase/functions/_shared/checkout-recovery.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const create = read('supabase/functions/create-checkout-session/index.ts');
const webhook = read('supabase/functions/stripe-webhook/index.ts');
const abandon = read('supabase/functions/checkout-abandon/index.ts');

const URL_CHECKOUT = 'https://checkout.stripe.com/c/pay/cs_live_a1B2c3D4e5F6g7H8#fid';
const URL_BUY = 'https://buy.stripe.com/r/live_asAb1724';
const SID = 'cs_live_a1B2c3D4e5F6g7H8';
const NOW = Date.parse('2026-11-23T15:00:00Z');
const in30d = Math.floor(NOW / 1000) + 29 * 86400;

describe('create-checkout-session asks for the recovery link', () => {
  it('sets after_expiration from recoveryParams, after the discount decision', () => {
    const at = create.indexOf('params.after_expiration = recoveryParams(!!params.discounts);');
    expect(at, 'after_expiration is set').toBeGreaterThan(-1);
    const promo = create.indexOf('if (!params.discounts) params.allow_promotion_codes = true;');
    expect(promo).toBeGreaterThan(-1);
    expect(at, 'set after discounts are decided').toBeGreaterThan(promo);
    expect(at, 'set before the session is created').toBeLessThan(create.indexOf('stripe.checkout.sessions.create('));
    expect(create).toContain('import { recoveryParams } from "../_shared/checkout-recovery.ts";');
  });
  it('enables recovery with promotion codes, and none on the copy of a discounted session', () => {
    expect(recoveryParams(false)).toEqual({ recovery: { enabled: true, allow_promotion_codes: true } });
    expect(recoveryParams(true)).toEqual({ recovery: { enabled: true, allow_promotion_codes: false } });
  });
  it('does not turn on consent_collection — that is the founder\'s decision', () => {
    expect(create).not.toMatch(/consent_collection\s*[:=]/);
    expect(create).not.toMatch(/params\.consent_collection/);
  });
});

describe('the webhook keeps the recovery URL only on Stripe\'s own https host', () => {
  const session = (url, extra = {}) => ({
    id: SID, after_expiration: { recovery: { enabled: true, url, expires_at: in30d } }, ...extra,
  });
  it('keeps https://checkout.stripe.com/ and https://buy.stripe.com/ (the docs\' example host)', () => {
    expect(RECOVERY_HOSTS).toEqual(['checkout.stripe.com', 'buy.stripe.com']);
    for (const u of [URL_CHECKOUT, URL_BUY]) {
      const m = expiredSessionMeta(session(u));
      expect(m.recovery_url, u).toBe(u);
      expect(m.recovery_expires_at).toBe(new Date(in30d * 1000).toISOString());
    }
  });
  it('drops anything else', () => {
    for (const bad of [
      null, undefined, '', 42, { href: URL_CHECKOUT },
      'http://checkout.stripe.com/c/pay/cs_x',
      'https://checkout.stripe.com.evil.example/c/pay/cs_x',
      'https://evilcheckout.stripe.com/c/pay/cs_x',
      'https://stripe.com/c/pay/cs_x',
      'https://checkout.stripe.com:8443/c/pay/cs_x',
      'https://user:pw@checkout.stripe.com/c/pay/cs_x',
      'javascript:alert(1)',
      'https://invoice.stripe.com/i/x',
    ]) {
      const m = expiredSessionMeta(session(bad));
      expect(m.recovery_url, String(bad)).toBeNull();
      expect(m.recovery_expires_at, String(bad)).toBeNull();
      expect(stripeRecoveryUrl(bad), String(bad)).toBeNull();
    }
  });
  it('a session without after_expiration stores nulls', () => {
    expect(expiredSessionMeta({ id: SID })).toMatchObject({ recovery_url: null, recovery_expires_at: null });
  });
  it('stores booleans about the address, never the address', () => {
    const typed = expiredSessionMeta(session(URL_CHECKOUT, {
      customer_details: { email: 'buyer@mail.example' }, consent: { promotions: 'opt_in' },
    }));
    expect(typed).toMatchObject({ stripe_email_present: true, prefilled_email: false, promotions_consent: true });
    expect(JSON.stringify(typed)).not.toContain('@');
    const ours = expiredSessionMeta(session(URL_CHECKOUT, {
      customer_email: 'buyer@mail.example', customer_details: { email: 'buyer@mail.example' },
    }));
    expect(ours).toMatchObject({ stripe_email_present: false, prefilled_email: true, promotions_consent: false });
    expect(JSON.stringify(ours)).not.toContain('@');
  });
  it('the expired branch spreads expiredSessionMeta and writes no address', () => {
    const at = webhook.indexOf('if (event.type === "checkout.session.expired")');
    const b = webhook.slice(at, webhook.indexOf('return new Response("Checkout expiry recorded"', at));
    expect(b).toContain('...expiredSessionMeta(session),');
    expect(webhook).toContain('import { expiredSessionMeta } from "../_shared/checkout-recovery.ts";');
    // every mention of an address in the row is a boolean
    for (const m of b.matchAll(/customer_details\?\.email|customer_email/g)) {
      const line = b.slice(b.lastIndexOf('\n', m.index), b.indexOf('\n', m.index));
      expect(line, line).toMatch(/!!\(/);
    }
  });
  it('a completed session records which expired session it was recovered from', () => {
    const at = webhook.indexOf('if (event.type === "checkout.session.completed")');
    const b = webhook.slice(at, webhook.indexOf('return new Response("Pro activated"', at));
    expect(b).toContain('const recoveredFrom = session.recovered_from || null;');
    expect(b.match(/recovered_from: recoveredFrom,/g)).toHaveLength(4);
  });
});

describe('checkout-abandon: which link the button opens', () => {
  const row = (over = {}) => ({
    stripe_session_id: SID, recovery_url: URL_CHECKOUT,
    recovery_expires_at: new Date(in30d * 1000).toISOString(), opened_at: '2026-11-21T14:00:05Z', ...over,
  });
  const stripeSession = (over = {}) => ({
    id: SID, status: 'expired', client_reference_id: 'learner',
    after_expiration: { recovery: { enabled: true, url: URL_CHECKOUT, expires_at: in30d } }, ...over,
  });
  const decide = (over = {}) => recoveryDecision({
    username: 'learner', row: row(), session: stripeSession(), now: NOW, trialOrPaidBefore: false, ...over,
  });

  it('uses the recovery URL when the session read back from Stripe is this person\'s, expired, and the link is live', () => {
    expect(decide()).toEqual({ use: true, url: URL_CHECKOUT, expiresAt: new Date(in30d * 1000).toISOString(), why: 'recovery' });
  });
  it('the URL is Stripe\'s copy, never the stored one', () => {
    const d = decide({ row: row({ recovery_url: 'https://buy.stripe.com/r/forged' }) });
    expect(d.url).toBe(URL_CHECKOUT);
  });
  it('keeps today\'s link, and says why, on every miss', () => {
    const cases = [
      [{ row: null }, 'no_expired_session'],
      [{ row: row({ recovery_url: null }) }, 'no_recovery_url'],
      [{ row: row({ recovery_url: 'https://evil.example/x' }) }, 'no_recovery_url'],
      [{ trialOrPaidBefore: true }, 'trial_or_paid_before'],
      [{ session: null }, 'stripe_read_failed'],
      [{ session: stripeSession({ id: 'cs_live_other0000000' }) }, 'session_mismatch'],
      [{ session: stripeSession({ client_reference_id: 'someone_else' }) }, 'username_mismatch'],
      [{ session: stripeSession({ status: 'complete' }) }, 'not_expired'],
      [{ session: stripeSession({ after_expiration: { recovery: { url: 'http://checkout.stripe.com/x', expires_at: in30d } } }) }, 'no_recovery_url'],
      [{ session: stripeSession({ after_expiration: { recovery: { url: URL_CHECKOUT, expires_at: Math.floor(NOW / 1000) - 1 } } }) }, 'recovery_expired'],
      [{ session: stripeSession({ after_expiration: null }) }, 'no_recovery_url'],
    ];
    for (const [over, why] of cases) {
      const d = decide(over);
      expect(d, why).toEqual({ use: false, url: null, expiresAt: null, why });
    }
  });
  it('picks the latest expired session opened from this click, not an older visit', () => {
    const click = '2026-11-21T14:00:00Z';
    const rows = [
      { created_at: '2026-11-20T10:00:00Z', metadata: JSON.stringify({ stripe_session_id: 'cs_live_old000000000', opened_at: '2026-11-19T10:00:00Z' }) },
      { created_at: '2026-11-22T14:00:06Z', metadata: JSON.stringify({ stripe_session_id: SID, opened_at: '2026-11-21T14:00:05Z' }) },
    ];
    expect(latestExpiredForClick(rows, click)?.stripe_session_id).toBe(SID);
    expect(latestExpiredForClick([rows[0]], click)).toBeNull();
    expect(latestExpiredForClick([{ ...rows[1], metadata: JSON.parse(rows[1].metadata) }], click)?.stripe_session_id).toBe(SID);
  });
  it('reads Stripe only for a real session id', () => {
    expect(SESSION_ID_RE.test(SID)).toBe(true);
    for (const bad of ['cs_live_../../v1/customers', 'pi_123', '', 'cs_live_a/b']) expect(SESSION_ID_RE.test(bad), bad).toBe(false);
    expect(abandon).toMatch(/!SESSION_ID_RE\.test\(id\)\) return null/);
  });
  it('the button is rec.url when the decision says so, else today\'s app link', () => {
    const ctas = abandon.match(/const cta = rec\.use && rec\.url \? rec\.url : utm\('\/app\.html', 'checkout_abandon'\)/g);
    expect(ctas).toHaveLength(2); // guest and registered
  });
});

describe('checkout-abandon: the dry run lists the recovery link and sends nothing', () => {
  const seg1 = abandon.slice(abandon.indexOf('let sent = 0, skipped = 0'), abandon.indexOf('// ── SEGMENT 2'));
  // Each path's block: from the audience push to the next send.
  it('every segment-1 path records path, recovery and why for each candidate', () => {
    const pushes = seg1.match(/audience1\.push\(\{ username[^}]*path: '(guest|registered|stripe_only)', recovery: [^}]*why: [^}]*\}\)/g) || [];
    const paths = new Set(pushes.map(p => p.match(/path: '([a-z_]+)'/)[1]));
    expect([...paths].sort()).toEqual(['guest', 'registered', 'stripe_only']);
    expect(abandon).toContain('recovery_links: audience1.filter(a => a.recovery).length,');
    expect(abandon).toContain('audience: audience1,');
  });
  it('a dry run returns before every send and every write in segment 1', () => {
    const writes = ['sendAndLog(', 'ensureUnsubToken(', 'captureToken(', ".update({ data: { ...userData, checkoutAbandonEmailAt"];
    for (const w of writes) {
      let i = seg1.indexOf(w);
      expect(i, w).toBeGreaterThan(-1);
      while (i > -1) {
        const before = seg1.slice(0, i);
        const lastDry = before.lastIndexOf('if (dry) { sent++; continue }');
        const lastLoop = Math.max(before.lastIndexOf('for (const [username, click] of latestByUser)'), before.lastIndexOf('for (const c of stripeOnly)'), before.lastIndexOf('if (isGuest) {'), before.lastIndexOf('const { data: userRow }'));
        expect(lastDry, `${w} at ${i} has no dry return before it in its path`).toBeGreaterThan(lastLoop);
        i = seg1.indexOf(w, i + 1);
      }
    }
  });
  it('the dry run output carries no address and no link', () => {
    const shape = abandon.match(/const audience1: \{([^}]*)\}\[\]/)[1];
    expect(shape).not.toMatch(/email|url/i);
  });
  it('the mail logs whether it carried the recovery link', () => {
    expect(seg1.match(/meta: \{ recovery_link: rec\.use \}/g)).toHaveLength(2);
    expect(abandon).toContain('meta: ok ? { ...(args.meta || {}) } : { ...(args.meta || {}), status },');
  });
  it('keeps the old rules: service-role gate, once per user, opt-out, internal accounts, resend_id', () => {
    expect(abandon).toContain("service role required");
    expect(seg1).toContain('if (userData.checkoutAbandonEmailAt) { skipped++; continue }');
    expect(seg1).toContain('if (userData.emailOptOut === true) { skipped++; continue }');
    expect(seg1).toContain('if (isInternalAccount(username, click.email)) { skipped++; continue }');
    expect(abandon).toContain(".eq('template', 'checkout_abandon').eq('event', 'sent').limit(1)");
    expect(abandon).toMatch(/event: ok \? 'sent' : 'send_failed', resend_id: resendId/);
  });
});

describe('mailing an address we only got from Stripe is OFF', () => {
  it('the constant is false', () => {
    expect(MAIL_STRIPE_ONLY_ADDRESSES).toBe(false);
  });
  it('checkout-abandon reads it from the shared module, not from an env var, and stops before any read or send', () => {
    expect(abandon).not.toMatch(/Deno\.env\.get\([^)]*STRIPE_ONLY/i);
    const loop = abandon.slice(abandon.indexOf('for (const c of stripeOnly)'), abandon.indexOf('// ── SEGMENT 2'));
    const gate = loop.indexOf('if (!MAIL_STRIPE_ONLY_ADDRESSES) {');
    expect(gate).toBeGreaterThan(-1);
    const off = loop.slice(gate, loop.indexOf('\n      }\n', gate));
    expect(off).toContain('continue');
    expect(off).not.toMatch(/recoveryFor|sendAndLog|captureToken|addressBlocked/);
    for (const w of ['recoveryFor(', 'sendAndLog(', 'captureToken(']) {
      expect(loop.indexOf(w), w).toBeGreaterThan(gate);
    }
  });
  it('the address read from Stripe is never returned by the dry run or stored', () => {
    expect(abandon).not.toMatch(/audience1\.push\([^)]*stripeEmail/);
    expect(webhook).not.toMatch(/customer_details\?\.email\s*,|customer_details\.email\s*,/);
  });
});
