import { describe, it, expect } from 'vitest';
import {
  FREEZES_PER_MONTH,
  daysBetweenDateStrings,
  dateNDaysBefore,
  computeStreakFreezeUpdate
} from '../src/utils/streak-freeze.js';

describe('daysBetweenDateStrings', () => {
  it('returns 0 for same day', () => {
    expect(daysBetweenDateStrings('2026-04-15', '2026-04-15')).toBe(0);
  });

  it('returns 1 for next day', () => {
    expect(daysBetweenDateStrings('2026-04-14', '2026-04-15')).toBe(1);
  });

  it('handles month boundary', () => {
    expect(daysBetweenDateStrings('2026-03-31', '2026-04-01')).toBe(1);
  });

  it('handles year boundary', () => {
    expect(daysBetweenDateStrings('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('handles leap day', () => {
    expect(daysBetweenDateStrings('2024-02-28', '2024-03-01')).toBe(2);
    expect(daysBetweenDateStrings('2025-02-28', '2025-03-01')).toBe(1); // non-leap
  });

  it('returns negative if b is before a', () => {
    expect(daysBetweenDateStrings('2026-04-15', '2026-04-14')).toBe(-1);
  });
});

describe('dateNDaysBefore', () => {
  it('returns same day when n=0', () => {
    expect(dateNDaysBefore('2026-04-15', 0)).toBe('2026-04-15');
  });

  it('returns previous day', () => {
    expect(dateNDaysBefore('2026-04-15', 1)).toBe('2026-04-14');
  });

  it('crosses month boundary', () => {
    expect(dateNDaysBefore('2026-04-01', 1)).toBe('2026-03-31');
  });

  it('crosses year boundary', () => {
    expect(dateNDaysBefore('2026-01-01', 1)).toBe('2025-12-31');
  });

  it('handles large n', () => {
    expect(dateNDaysBefore('2026-04-15', 30)).toBe('2026-03-16');
  });
});

describe('computeStreakFreezeUpdate', () => {
  const base = {
    today: '2026-04-15',
    currentMonth: '2026-04',
    lastRefillMonth: '2026-04',
    freezes: 2,
    currentStreak: 5,
    lastDailyChallenge: '2026-04-14'
  };

  it('no-op for new user (no lastDailyChallenge)', () => {
    const r = computeStreakFreezeUpdate({ ...base, lastDailyChallenge: null, currentStreak: 0 });
    expect(r.newStreak).toBe(0);
    expect(r.newFreezes).toBe(2);
    expect(r.toast).toBe(null);
    expect(r.freezeDates).toEqual([]);
  });

  it('no-op when user already completed today', () => {
    const r = computeStreakFreezeUpdate({ ...base, lastDailyChallenge: '2026-04-15' });
    expect(r.newStreak).toBe(5);
    expect(r.newFreezes).toBe(2);
    expect(r.toast).toBe(null);
  });

  it('no-op when user did yesterday (streak intact)', () => {
    const r = computeStreakFreezeUpdate({ ...base, lastDailyChallenge: '2026-04-14' });
    expect(r.newStreak).toBe(5);
    expect(r.newFreezes).toBe(2);
    expect(r.toast).toBe(null);
  });

  it('applies 1 freeze when user missed one day', () => {
    // Last: Apr 13, today: Apr 15 → missed Apr 14 (1 day)
    const r = computeStreakFreezeUpdate({ ...base, lastDailyChallenge: '2026-04-13', freezes: 2 });
    expect(r.newStreak).toBe(5);
    expect(r.newFreezes).toBe(1);
    expect(r.toast).toEqual({ daysFrozen: 1, remaining: 1, streak: 5 });
    expect(r.freezeDates).toEqual(['2026-04-14']);
  });

  it('applies 2 freezes when user missed two days', () => {
    // Last: Apr 12, today: Apr 15 → missed Apr 13 + Apr 14
    const r = computeStreakFreezeUpdate({ ...base, lastDailyChallenge: '2026-04-12', freezes: 2 });
    expect(r.newStreak).toBe(5);
    expect(r.newFreezes).toBe(0);
    expect(r.toast.daysFrozen).toBe(2);
    expect(r.freezeDates).toEqual(['2026-04-14', '2026-04-13']);
  });

  it('breaks streak when not enough freezes', () => {
    // Missed 3 days, only 2 freezes → streak breaks
    const r = computeStreakFreezeUpdate({ ...base, lastDailyChallenge: '2026-04-11', freezes: 2 });
    expect(r.newStreak).toBe(0);
    expect(r.newFreezes).toBe(2); // freezes not consumed when they can't save
    expect(r.toast).toBe(null);
    expect(r.freezeDates).toEqual([]);
  });

  it('breaks streak when no freezes available and missed', () => {
    const r = computeStreakFreezeUpdate({ ...base, lastDailyChallenge: '2026-04-13', freezes: 0 });
    expect(r.newStreak).toBe(0);
    expect(r.newFreezes).toBe(0);
    expect(r.toast).toBe(null);
  });

  it('refills freezes at start of new month', () => {
    // lastRefillMonth was March, now April → refill to 2 before any consumption
    const r = computeStreakFreezeUpdate({
      ...base,
      freezes: 0,
      lastRefillMonth: '2026-03',
      currentMonth: '2026-04',
      lastDailyChallenge: '2026-04-14' // No gap → just check refill happens
    });
    expect(r.newFreezes).toBe(2);
  });

  it('refill + immediate consumption in same session', () => {
    // Crossed month boundary AND missed a day: refill then consume
    const r = computeStreakFreezeUpdate({
      ...base,
      freezes: 0,
      lastRefillMonth: '2026-03',
      currentMonth: '2026-04',
      lastDailyChallenge: '2026-04-13' // Missed Apr 14
    });
    expect(r.newFreezes).toBe(1);
    expect(r.newStreak).toBe(5);
    expect(r.toast.daysFrozen).toBe(1);
  });

  it('does not apply freezes when currentStreak is 0', () => {
    // No streak to save → skip freeze application
    const r = computeStreakFreezeUpdate({ ...base, currentStreak: 0, lastDailyChallenge: '2026-04-10' });
    expect(r.newStreak).toBe(0);
    expect(r.newFreezes).toBe(2);
    expect(r.toast).toBe(null);
  });

  it('never negative freezes', () => {
    const r = computeStreakFreezeUpdate({ ...base, freezes: 0, lastDailyChallenge: '2026-04-13' });
    expect(r.newFreezes).toBeGreaterThanOrEqual(0);
  });

  it('toast messages are correct for 1-day freeze', () => {
    const r = computeStreakFreezeUpdate({ ...base, lastDailyChallenge: '2026-04-13', freezes: 2, currentStreak: 7 });
    expect(r.toast.streak).toBe(7);
    expect(r.toast.daysFrozen).toBe(1);
    expect(r.toast.remaining).toBe(1);
  });

  it('FREEZES_PER_MONTH is 2', () => {
    expect(FREEZES_PER_MONTH).toBe(2);
  });
});
