import { describe, it, expect } from 'vitest';
import {
  REF_CODE_RE,
  normalizeRefCode,
  isReferrerFresh,
  REFERRER_FRESHNESS_MS,
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
