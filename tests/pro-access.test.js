import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveProAccess, mayBeOffered, hasStaleProFlag, GRACE_DAYS } from '../src/utils/pro-access.js';

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
