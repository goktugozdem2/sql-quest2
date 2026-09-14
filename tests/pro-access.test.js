import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveProAccess, mayBeOffered, hasStaleProFlag, GRACE_DAYS, planLabel, lastLoginDay, planRenews } from '../src/utils/pro-access.js';

const ROOT = join(import.meta.dirname, '..');
const NOW = Date.parse('2026-09-07T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const iso = ms => new Date(ms).toISOString();

describe('resolveProAccess — the client reads Pro, it never grants it', () => {
  it('no flag is no Pro, whatever else the record says', () => {
    expect(resolveProAccess({ proType: 'monthly', proExpiry: iso(NOW + 30 * DAY) }, NOW).isPro).toBe(false);
    expect(resolveProAccess({ proStatus: false, proType: 'lifetime' }, NOW).isPro).toBe(false);
    expect(resolveProAccess(null, NOW).reason).toBe('none');
    expect(resolveProAccess(undefined, NOW).isPro).toBe(false);
  });

  it('lifetime is always live, with or without an expiry', () => {
    expect(resolveProAccess({ proStatus: true, proType: 'lifetime' }, NOW)).toMatchObject({ isPro: true, reason: 'lifetime' });
    expect(resolveProAccess({ proStatus: true, proType: 'lifetime', proExpiry: iso(NOW - 400 * DAY) }, NOW).isPro).toBe(true);
  });

  it('an unexpired subscription is live and keeps its own label', () => {
    const trial = resolveProAccess({ proStatus: true, proType: 'trial', proExpiry: iso(NOW + 2 * DAY) }, NOW);
    expect(trial).toMatchObject({ isPro: true, reason: 'active', proType: 'trial' });
    const monthly = resolveProAccess({ proStatus: true, proType: 'monthly', proExpiry: iso(NOW + 20 * DAY) }, NOW);
    expect(monthly).toMatchObject({ isPro: true, reason: 'active', proType: 'monthly' });
  });

  it('proStatus with no expiry and no lifetime is expired, not live', () => {
    expect(resolveProAccess({ proStatus: true, proType: 'monthly' }, NOW)).toMatchObject({ isPro: false, expired: true });
    expect(resolveProAccess({ proStatus: true, proType: 'monthly', proExpiry: 'not a date' }, NOW).isPro).toBe(false);
  });

  // The regression this file exists for. adinajoshi (2026-09-07): trial,
  // proAutoRenew true, relabelled `monthly`, expiry pushed 30 days on every
  // login, 112 solves, no stripe_webhook row, never once asked to buy.
  it('an expired plan is NOT renewed, however true proAutoRenew is', () => {
    const record = { proStatus: true, proType: 'monthly', proExpiry: iso(NOW - 10 * DAY), proAutoRenew: true };
    const access = resolveProAccess(record, NOW);
    expect(access.isPro).toBe(false);
    expect(access.reason).toBe('expired');
    // and the resolver did not touch the record
    expect(record.proExpiry).toBe(iso(NOW - 10 * DAY));
    expect(record.proType).toBe('monthly');
    expect(record.proStatus).toBe(true);
  });

  it('an expired trial gets no grace — nothing renews a trial', () => {
    const oneHourPast = { proStatus: true, proType: 'trial', proExpiry: iso(NOW - 3600 * 1000), proAutoRenew: true };
    expect(resolveProAccess(oneHourPast, NOW)).toMatchObject({ isPro: false, reason: 'expired' });
  });

  it('a paid plan gets exactly GRACE_DAYS of webhook-lag cover, then stops', () => {
    const at = ms => resolveProAccess({ proStatus: true, proType: 'monthly', proExpiry: iso(ms) }, NOW);
    expect(at(NOW - 60 * 1000)).toMatchObject({ isPro: true, reason: 'grace', inGrace: true, expired: true });
    expect(at(NOW - GRACE_DAYS * DAY + 1000).isPro).toBe(true);
    expect(at(NOW - GRACE_DAYS * DAY - 1000)).toMatchObject({ isPro: false, reason: 'expired' });
    // Grace cannot repeat: the stored expiry never moves, so the same record
    // one day later is one day closer to being denied, never further.
    const rec = { proStatus: true, proType: 'monthly', proExpiry: iso(NOW - DAY) };
    expect(resolveProAccess(rec, NOW).isPro).toBe(true);
    expect(resolveProAccess(rec, NOW + 3 * DAY).isPro).toBe(false);
  });

  it('preserves proType and proExpiry when it denies, for the trial-ended UX', () => {
    const access = resolveProAccess({ proStatus: true, proType: 'trial', proExpiry: iso(NOW - 40 * DAY) }, NOW);
    expect(access).toMatchObject({ isPro: false, proType: 'trial', proExpiry: iso(NOW - 40 * DAY) });
  });
});

describe('mayBeOffered — who may be asked to buy', () => {
  it('never asks someone with live access, including inside grace', () => {
    expect(mayBeOffered({ proStatus: true, proType: 'lifetime' }, NOW)).toBe(false);
    expect(mayBeOffered({ proStatus: true, proType: 'monthly', proExpiry: iso(NOW + DAY) }, NOW)).toBe(false);
    expect(mayBeOffered({ proStatus: true, proType: 'monthly', proExpiry: iso(NOW - DAY) }, NOW)).toBe(false);
  });

  it('asks everyone else — including the expired-trial population the raw flag used to exempt', () => {
    expect(mayBeOffered({}, NOW)).toBe(true);
    expect(mayBeOffered({ proStatus: true, proType: 'trial', proExpiry: iso(NOW - DAY) }, NOW)).toBe(true);
    expect(mayBeOffered({ proStatus: true, proType: 'monthly', proExpiry: iso(NOW - 30 * DAY) }, NOW)).toBe(true);
  });
});

describe('hasStaleProFlag — analytics only', () => {
  it('is true exactly when the record claims Pro and the resolver denies it', () => {
    expect(hasStaleProFlag({ proStatus: true, proType: 'trial', proExpiry: iso(NOW - DAY) }, NOW)).toBe(true);
    expect(hasStaleProFlag({ proStatus: true, proType: 'monthly', proExpiry: iso(NOW + DAY) }, NOW)).toBe(false);
    expect(hasStaleProFlag({ proStatus: false }, NOW)).toBe(false);
  });
});

describe('source guard — app.jsx must not mint Pro', () => {
  const app = readFileSync(join(ROOT, 'src', 'app.jsx'), 'utf8');

  it('no branch extends proExpiry from the client', () => {
    // The exact incident shape: computing a new expiry off the wall clock and
    // storing it. Stripe's webhook owns proExpiry; the client only reads it.
    const setsFutureExpiry = /userData\.proExpiry\s*=\s*newExpiry/i;
    expect(setsFutureExpiry.test(app), 'app.jsx writes a client-computed proExpiry (see src/utils/pro-access.js)').toBe(false);
    expect(/auto-renew is on - extend by 30 days/i.test(app), 'the auto-renew grant branch is back').toBe(false);
  });

  it('app.jsx uses the resolver rather than re-deriving the rule inline', () => {
    expect(app).toMatch(/from ['"]\.\/utils\/pro-access(\.js)?['"]/);
    expect(app).toMatch(/resolveProAccess\s*\(/);
  });
});

// The Interview Pass — bought once, 90 days, nothing renews it (2026-09-14).
//
// $29/month is the wrong unit for interview prep, so `pass3m` is a one-time
// $49 purchase. Every rule that exists because subscriptions renew has to be
// re-checked against a plan that does not.
describe('pass3m: a plan that is bought once', () => {
  const day = 86400000;
  const at = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString();

  it('is Pro while it runs', () => {
    const a = resolveProAccess({ proStatus: true, proType: 'quarterly', proExpiry: at(40) });
    expect(a.isPro).toBe(true);
    expect(a.reason).toBe('active');
    expect(a.proType).toBe('quarterly');
  });

  it('gets the webhook-lag window, because an invoice really is in flight', () => {
    // It bills every three months, so the day after expiry its renewal may
    // simply not have landed yet — the same reason monthly and annual get it.
    const q = resolveProAccess({ proStatus: true, proType: 'quarterly', proExpiry: at(-1) });
    expect(q.isPro).toBe(true);
    expect(q.reason).toBe('grace');
  });

  it('a trial still gets none, which is the case the window was written to exclude', () => {
    const t = resolveProAccess({ proStatus: true, proType: 'trial', proExpiry: at(-1) });
    expect(t.isPro).toBe(false);
    expect(t.reason).toBe('expired');
  });

  it('is never asked to buy while it is live or in grace', () => {
    expect(mayBeOffered({ proStatus: true, proType: 'quarterly', proExpiry: at(10) })).toBe(false);
    expect(mayBeOffered({ proStatus: true, proType: 'quarterly', proExpiry: at(-1) })).toBe(false);
    expect(mayBeOffered({ proStatus: true, proType: 'quarterly', proExpiry: at(-30) })).toBe(true);
  });

  it('keeps its type after expiry so a lapsed subscriber is not a stranger', () => {
    const a = resolveProAccess({ proStatus: true, proType: 'quarterly', proExpiry: at(-30) });
    expect(a.proType).toBe('quarterly');
    expect(a.expired).toBe(true);
  });
});

// What the header prints beside your name (2026-09-14).
describe('planLabel', () => {
  const day = 86400000;
  const at = d => new Date(Date.now() + d * day).toISOString();

  it('says Free, out loud, when someone is on the free tier', () => {
    // The header used to offer "✨ Pro" and never state the current plan.
    const p = planLabel({});
    expect(p.label).toBe('Free');
    expect(p.tone).toBe('free');
    expect(p.canUpgrade).toBe(true);
  });

  it('names the quarterly plan so it is not mistaken for the other two', () => {
    const p = planLabel({ proStatus: true, proType: 'quarterly', proExpiry: at(45) });
    expect(p.label).toBe('Pro · Quarterly');
    expect(p.detail).toBe('45 days left');
    expect(p.canUpgrade).toBe(false);
  });

  it('counts a subscription down too, and never offers an upgrade to a subscriber', () => {
    const p = planLabel({ proStatus: true, proType: 'annual', proExpiry: at(1) });
    expect(p.label).toBe('Pro');
    expect(p.detail).toBe('1 day left');
    expect(p.canUpgrade).toBe(false);
  });

  it('a trial is labelled a trial and may still be upgraded', () => {
    const p = planLabel({ proStatus: true, proType: 'trial', proExpiry: at(3) });
    expect(p.label).toBe('Pro trial');
    expect(p.canUpgrade).toBe(true);
  });

  it('tells a lapsed person WHICH thing ended', () => {
    // An expired trial and a stranger look identical on the raw flag.
    expect(planLabel({ proStatus: true, proType: 'trial', proExpiry: at(-9) }).detail).toBe('Trial ended');
    expect(planLabel({ proStatus: true, proType: 'quarterly', proExpiry: at(-40) }).detail).toBe('Pro ended');
    expect(planLabel({ proStatus: true, proType: 'annual', proExpiry: at(-9) }).detail).toBe('Pro ended');
    expect(planLabel({ proStatus: true, proType: 'quarterly', proExpiry: at(-40) }).label).toBe('Free');
  });

  it('lifetime never counts down and is never upsold', () => {
    const p = planLabel({ proStatus: true, proType: 'lifetime' });
    expect(p.label).toBe('Pro · Lifetime');
    expect(p.detail).toBeNull();
    expect(p.canUpgrade).toBe(false);
  });
});

describe('lastLoginDay', () => {
  it('reads the newest day out of the login calendar', () => {
    expect(lastLoginDay({ loginCalendar: { '2026-09-02': true, '2026-09-14': true, '2026-08-30': true } })).toBe('2026-09-14');
  });
  it('falls back to lastActive, which is epoch-ms on some rows and ISO on others', () => {
    expect(lastLoginDay({ lastActive: Date.UTC(2026, 8, 11) })).toBe('2026-09-11');
    expect(lastLoginDay({ lastActive: '2026-09-11T08:00:00.000Z' })).toBe('2026-09-11');
  });
  it('says nothing rather than guessing', () => {
    expect(lastLoginDay({})).toBeNull();
    expect(lastLoginDay({ lastActive: 'not a date' })).toBeNull();
  });
});

describe('planRenews', () => {
  it('is false for a plan that cannot renew, even when the flag says otherwise', () => {
    // proAutoRenew defaults to true in app state and is written by Stripe, so
    // the flag alone would promise a charge that never comes.
    expect(planRenews({ proType: 'lifetime', proAutoRenew: true })).toBe(false);
    expect(planRenews({ proType: 'trial', proAutoRenew: true })).toBe(false);
  });
  it('is true for the three subscriptions, and only when the flag is on', () => {
    expect(planRenews({ proType: 'monthly', proAutoRenew: true })).toBe(true);
    expect(planRenews({ proType: 'quarterly', proAutoRenew: true })).toBe(true);
    expect(planRenews({ proType: 'annual', proAutoRenew: true })).toBe(true);
    expect(planRenews({ proType: 'annual', proAutoRenew: false })).toBe(false);
  });
});
