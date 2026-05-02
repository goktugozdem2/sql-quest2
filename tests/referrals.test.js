import { describe, it, expect } from 'vitest';
import {
  REF_CODE_RE,
  normalizeRefCode,
  isReferrerFresh,
  REFERRER_FRESHNESS_MS,
  generatePersonalRefCode,
  calculateProDaysEarned,
  nextReferralMilestone,
  REFERRAL_TIERS,
  REFERRAL_PRO_CONVERSION_BONUS_DAYS,
} from '../src/utils/referrals.js';

describe('normalizeRefCode', () => {
  it('returns null for nullish/non-string', () => {
    expect(normalizeRefCode(null)).toBe(null);
    expect(normalizeRefCode(undefined)).toBe(null);
    expect(normalizeRefCode(123)).toBe(null);
    expect(normalizeRefCode({})).toBe(null);
    expect(normalizeRefCode('')).toBe(null);
  });

  it('lowercases and trims valid codes', () => {
    expect(normalizeRefCode('TinaHuang')).toBe('tinahuang');
    expect(normalizeRefCode('  alex  ')).toBe('alex');
    expect(normalizeRefCode('Data_Career-2025')).toBe('data_career-2025');
  });

  it('accepts the boundary lengths (2 and 60)', () => {
    expect(normalizeRefCode('ab')).toBe('ab');
    const sixty = 'a'.repeat(60);
    expect(normalizeRefCode(sixty)).toBe(sixty);
  });

  it('rejects too short / too long', () => {
    expect(normalizeRefCode('a')).toBe(null);
    expect(normalizeRefCode('a'.repeat(61))).toBe(null);
  });

  it('rejects forbidden characters (spaces, punctuation, unicode)', () => {
    expect(normalizeRefCode('tina huang')).toBe(null);
    expect(normalizeRefCode('tina.huang')).toBe(null);
    expect(normalizeRefCode("tina'huang")).toBe(null);
    expect(normalizeRefCode('tina/huang')).toBe(null);
    expect(normalizeRefCode('tina<script>')).toBe(null);
    expect(normalizeRefCode('türk')).toBe(null); // unicode not allowed in slugs
  });

  it('rejects SQL-injection-shaped strings', () => {
    expect(normalizeRefCode("' OR 1=1 --")).toBe(null);
    expect(normalizeRefCode('; DROP TABLE referrals; --')).toBe(null);
  });
});

describe('REF_CODE_RE', () => {
  it('is the same regex normalizeRefCode uses (sanity)', () => {
    expect(REF_CODE_RE.test('tina')).toBe(true);
    expect(REF_CODE_RE.test('tina huang')).toBe(false);
  });
});

describe('isReferrerFresh', () => {
  const NOW = 1_700_000_000_000;

  it('treats null/undefined timestamps as fresh', () => {
    expect(isReferrerFresh(null, NOW)).toBe(true);
    expect(isReferrerFresh(undefined, NOW)).toBe(true);
  });

  it('treats invalid timestamps as fresh (don\'t penalize bad data)', () => {
    expect(isReferrerFresh(0, NOW)).toBe(true);
    expect(isReferrerFresh(-1, NOW)).toBe(true);
    expect(isReferrerFresh('not a date', NOW)).toBe(true);
  });

  it('returns true within 30 days', () => {
    expect(isReferrerFresh(NOW, NOW)).toBe(true);
    expect(isReferrerFresh(NOW - 1000, NOW)).toBe(true);
    expect(isReferrerFresh(NOW - REFERRER_FRESHNESS_MS, NOW)).toBe(true);
  });

  it('returns false past 30 days', () => {
    expect(isReferrerFresh(NOW - REFERRER_FRESHNESS_MS - 1, NOW)).toBe(false);
    expect(isReferrerFresh(NOW - 31 * 24 * 60 * 60 * 1000, NOW)).toBe(false);
  });

  it('parses ISO date strings', () => {
    const isoFresh = new Date(NOW - 1000).toISOString();
    expect(isReferrerFresh(isoFresh, NOW)).toBe(true);
    const isoStale = new Date(NOW - 60 * 24 * 60 * 60 * 1000).toISOString();
    expect(isReferrerFresh(isoStale, NOW)).toBe(false);
  });
});

// ================================================================
// Peer-to-peer referrals — code generation + reward formula
// ================================================================

describe('generatePersonalRefCode', () => {
  it('returns null for invalid input', () => {
    expect(generatePersonalRefCode(null)).toBe(null);
    expect(generatePersonalRefCode(undefined)).toBe(null);
    expect(generatePersonalRefCode('')).toBe(null);
    expect(generatePersonalRefCode('  ')).toBe(null);
    expect(generatePersonalRefCode(123)).toBe(null);
    expect(generatePersonalRefCode({})).toBe(null);
  });

  it('returns null for guest usernames', () => {
    expect(generatePersonalRefCode('guest_abc')).toBe(null);
    expect(generatePersonalRefCode('guest_12345')).toBe(null);
  });

  it('generates 8-char uppercase code from username', () => {
    const code = generatePersonalRefCode('goktug');
    expect(code).toMatch(/^[A-Z0-9]{1,8}$/);
    // btoa('goktug') = 'Z29rdHVn' — strip nothing, take first 8, upper
    expect(code).toBe('Z29RDHVN');
  });

  it('is deterministic — same input → same output', () => {
    const a = generatePersonalRefCode('alice');
    const b = generatePersonalRefCode('alice');
    expect(a).toBe(b);
  });

  it('strips URL-unfriendly chars (=+/) from base64', () => {
    // 'a' → btoa = 'YQ==' — should be 'YQ' after strip + truncate
    expect(generatePersonalRefCode('a')).toBe('YQ');
    // longer username produces longer base64 with possible /+
    const code = generatePersonalRefCode('?');
    // edge case — btoa('?') = 'Pw==' → 'PW' after upper
    expect(code).toBe('PW');
  });

  it('matches the legacy in-app generator format exactly', () => {
    // The legacy formula was inlined in src/app.jsx as:
    //   btoa(username).replace(/[=+/]/g, '').substring(0, 8).toUpperCase()
    // Existing localStorage codes use this exact format. The helper must
    // produce the same output so backward-compat lookups work.
    const legacy = (u) => btoa(u).replace(/[=+/]/g, '').substring(0, 8).toUpperCase();
    for (const u of ['tinahuang', 'alex', 'goktug', 'data_career-2025', 'X']) {
      expect(generatePersonalRefCode(u)).toBe(legacy(u));
    }
  });
});

describe('calculateProDaysEarned', () => {
  it('returns 0 for no signups and no conversions', () => {
    expect(calculateProDaysEarned(0, 0)).toBe(0);
  });

  it('hits each tier at the right signup count', () => {
    expect(calculateProDaysEarned(0, 0)).toBe(0);   // before tier 1
    expect(calculateProDaysEarned(1, 0)).toBe(3);   // tier 1
    expect(calculateProDaysEarned(2, 0)).toBe(3);   // still tier 1
    expect(calculateProDaysEarned(3, 0)).toBe(7);   // tier 2 replaces
    expect(calculateProDaysEarned(4, 0)).toBe(7);   // still tier 2
    expect(calculateProDaysEarned(5, 0)).toBe(14);  // tier 3
    expect(calculateProDaysEarned(10, 0)).toBe(14); // capped at tier 3
    expect(calculateProDaysEarned(100, 0)).toBe(14);
  });

  it('adds 30 days per Pro conversion on top of tier', () => {
    expect(calculateProDaysEarned(0, 1)).toBe(30);   // 0 tier + 1 conv
    expect(calculateProDaysEarned(1, 1)).toBe(33);   // 3 + 30
    expect(calculateProDaysEarned(5, 1)).toBe(44);   // 14 + 30
    expect(calculateProDaysEarned(5, 3)).toBe(104);  // 14 + 90
  });

  it('clamps negative and non-numeric input', () => {
    expect(calculateProDaysEarned(-5, 0)).toBe(0);
    expect(calculateProDaysEarned(0, -2)).toBe(0);
    expect(calculateProDaysEarned('abc', 0)).toBe(0);
    expect(calculateProDaysEarned(NaN, NaN)).toBe(0);
  });
});

describe('nextReferralMilestone', () => {
  it('points to first tier when no signups yet', () => {
    expect(nextReferralMilestone(0)).toEqual({ at: 1, reward: '+3 days Pro', remaining: 1 });
  });

  it('points to next tier when partway through', () => {
    expect(nextReferralMilestone(1)).toEqual({ at: 3, reward: '+7 days Pro', remaining: 2 });
    expect(nextReferralMilestone(2)).toEqual({ at: 3, reward: '+7 days Pro', remaining: 1 });
    expect(nextReferralMilestone(3)).toEqual({ at: 5, reward: '+14 days Pro', remaining: 2 });
    expect(nextReferralMilestone(4)).toEqual({ at: 5, reward: '+14 days Pro', remaining: 1 });
  });

  it('returns null past the highest tier', () => {
    expect(nextReferralMilestone(5)).toBe(null);
    expect(nextReferralMilestone(50)).toBe(null);
  });
});

describe('REFERRAL_TIERS / REFERRAL_PRO_CONVERSION_BONUS_DAYS — schema lock', () => {
  // These constants are duplicated server-side in get_my_referral_stats.
  // If you change them, also update referrals-peer-setup.sql + the
  // my-referral-stats Edge Function. This test fails loudly if the
  // numbers drift (catches stealthy schema mismatches in CI).
  it('has exactly three signup tiers: 1/3/5 → 3/7/14 days', () => {
    expect(REFERRAL_TIERS).toHaveLength(3);
    expect(REFERRAL_TIERS[0]).toMatchObject({ signups: 1, days: 3 });
    expect(REFERRAL_TIERS[1]).toMatchObject({ signups: 3, days: 7 });
    expect(REFERRAL_TIERS[2]).toMatchObject({ signups: 5, days: 14 });
  });

  it('per-conversion bonus is exactly 30 days', () => {
    expect(REFERRAL_PRO_CONVERSION_BONUS_DAYS).toBe(30);
  });
});
