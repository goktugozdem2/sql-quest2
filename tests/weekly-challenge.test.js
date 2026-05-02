import { describe, it, expect } from 'vitest';
import {
  getISOWeek,
  formatWeekLabel,
  eligibleWeeklyChallenges,
  selectWeeklyChallenge,
  currentWeeklyChallenge,
  buildShareText,
} from '../src/utils/weekly-challenge.js';

const sampleChallenges = [
  { id: 1, title: 'Easy A',  difficulty: 'Easy' },
  { id: 2, title: 'Easy B',  difficulty: 'Easy' },
  { id: 3, title: 'Med A',   difficulty: 'Medium' },
  { id: 4, title: 'Med B',   difficulty: 'Medium' },
  { id: 5, title: 'Hard A',  difficulty: 'Hard' },                        // excluded — too hard
  { id: 6, title: 'Sector',  difficulty: 'Medium', sectorTags: ['finans'] }, // excluded — sector
  { id: 7, title: 'Skip',    difficulty: 'Medium', excludeFromWeekly: true }, // excluded — explicit
];

describe('getISOWeek', () => {
  it('returns the right ISO week for known dates', () => {
    // 2026-01-01 is a Thursday — ISO week 1 of 2026.
    expect(getISOWeek(new Date('2026-01-01T00:00:00Z'))).toEqual({ year: 2026, week: 1 });
    // 2025-12-29 is a Monday — first day of ISO week 1 of 2026 (year boundary trick).
    expect(getISOWeek(new Date('2025-12-29T00:00:00Z'))).toEqual({ year: 2026, week: 1 });
    // 2026-12-31 is a Thursday — ISO week 53 of 2026.
    expect(getISOWeek(new Date('2026-12-31T00:00:00Z'))).toEqual({ year: 2026, week: 53 });
  });

  it('handles year-boundary edge cases', () => {
    // 2025-01-01 is a Wednesday — ISO week 1 of 2025.
    expect(getISOWeek(new Date('2025-01-01T00:00:00Z'))).toEqual({ year: 2025, week: 1 });
    // 2024-12-30 is a Monday — start of ISO week 1 of 2025.
    expect(getISOWeek(new Date('2024-12-30T00:00:00Z'))).toEqual({ year: 2025, week: 1 });
  });
});

describe('formatWeekLabel', () => {
  it('zero-pads week numbers below 10', () => {
    expect(formatWeekLabel({ year: 2026, week: 5 })).toBe('2026-W05');
    expect(formatWeekLabel({ year: 2026, week: 19 })).toBe('2026-W19');
  });
});

describe('eligibleWeeklyChallenges', () => {
  it('returns only Easy + Medium, generic, non-excluded challenges', () => {
    const eligible = eligibleWeeklyChallenges(sampleChallenges);
    expect(eligible).toHaveLength(4);
    expect(eligible.map(c => c.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it('returns empty array on bad input', () => {
    expect(eligibleWeeklyChallenges(null)).toEqual([]);
    expect(eligibleWeeklyChallenges(undefined)).toEqual([]);
    expect(eligibleWeeklyChallenges([])).toEqual([]);
    expect(eligibleWeeklyChallenges([null, undefined, 'string'])).toEqual([]);
  });

  it('case-insensitive on difficulty', () => {
    const mixed = [
      { id: 1, title: 'lower', difficulty: 'easy' },
      { id: 2, title: 'upper', difficulty: 'MEDIUM' },
      { id: 3, title: 'mixed', difficulty: 'Hard' },
    ];
    expect(eligibleWeeklyChallenges(mixed)).toHaveLength(2);
  });
});

describe('selectWeeklyChallenge', () => {
  it('picks deterministically from the eligible pool', () => {
    const a = selectWeeklyChallenge({ year: 2026, week: 19 }, sampleChallenges);
    const b = selectWeeklyChallenge({ year: 2026, week: 19 }, sampleChallenges);
    expect(a).toBeDefined();
    expect(a.id).toBe(b.id);
  });

  it('picks different challenges across different weeks', () => {
    const w1 = selectWeeklyChallenge({ year: 2026, week: 1  }, sampleChallenges);
    const w2 = selectWeeklyChallenge({ year: 2026, week: 2  }, sampleChallenges);
    const w3 = selectWeeklyChallenge({ year: 2026, week: 3  }, sampleChallenges);
    // 4 eligible × different week numbers → different IDs at least 2/3 of the time
    const ids = new Set([w1.id, w2.id, w3.id]);
    expect(ids.size).toBeGreaterThanOrEqual(2);
  });

  it('returns null when the pool is empty', () => {
    const onlyHard = [{ id: 1, title: 'h', difficulty: 'Hard' }];
    expect(selectWeeklyChallenge({ year: 2026, week: 19 }, onlyHard)).toBe(null);
  });

  it('only ever returns from the eligible pool', () => {
    const eligibleIds = new Set(eligibleWeeklyChallenges(sampleChallenges).map(c => c.id));
    for (let week = 1; week <= 53; week++) {
      const picked = selectWeeklyChallenge({ year: 2026, week }, sampleChallenges);
      expect(eligibleIds.has(picked.id)).toBe(true);
    }
  });
});

describe('currentWeeklyChallenge', () => {
  it('returns weekLabel + challenge for a given date', () => {
    const result = currentWeeklyChallenge(sampleChallenges, new Date('2026-05-04T12:00:00Z'));
    expect(result.weekLabel).toMatch(/^2026-W\d{2}$/);
    expect(result.year).toBe(2026);
    expect(result.weekNumber).toBeGreaterThanOrEqual(1);
    expect(result.weekNumber).toBeLessThanOrEqual(53);
    expect(result.challenge).toBeDefined();
    expect(result.challenge.id).toBeTypeOf('number');
  });

  it('handles empty pool gracefully', () => {
    const result = currentWeeklyChallenge([], new Date('2026-05-04T12:00:00Z'));
    expect(result.challenge).toBe(null);
  });
});

describe('buildShareText', () => {
  const challenge = { id: 5, title: 'Class Survival Breakdown', difficulty: 'Medium' };

  it('twitter variant under 280 chars', () => {
    const text = buildShareText('2026-W19', challenge, 'twitter');
    expect(text.length).toBeLessThan(280);
    expect(text).toContain('19');
    expect(text).toContain('Class Survival Breakdown');
    expect(text).toContain('https://sqlquest.app/weekly/');
  });

  it('linkedin variant has fuller framing', () => {
    const text = buildShareText('2026-W19', challenge, 'linkedin');
    expect(text.length).toBeGreaterThan(150);
    expect(text).toContain('Class Survival Breakdown');
    expect(text).toContain('Medium');
  });

  it('generic variant is the default fallback', () => {
    expect(buildShareText('2026-W19', challenge).length).toBeLessThan(200);
    expect(buildShareText('2026-W19', challenge, 'generic')).toEqual(
      buildShareText('2026-W19', challenge, 'unknown_kind')
    );
  });

  it('falls back to safe default text when challenge is null', () => {
    const text = buildShareText('2026-W19', null, 'twitter');
    expect(text).toContain('this week\'s challenge');
    expect(text).toContain('Medium');
  });
});
