import { describe, it, expect } from 'vitest';
import { computeSkillTrajectory, topActiveSkills } from '../src/utils/skill-trajectory.js';

const DAY = 24 * 60 * 60 * 1000;

// Fixed reference "now" so tests are deterministic regardless of clock.
// 2026-04-25 00:00:00 UTC baseline.
const NOW = new Date('2026-04-25T00:00:00Z').getTime();

const mkAttempt = (id, daysAgo, success = true, topics = ['SELECT']) => ({
  challengeId: id,
  difficulty: 'Easy',
  topic: topics[0],
  topics,
  success,
  timestamp: NOW - daysAgo * DAY,
  firstTry: success,
  hintsUsed: 0,
});

describe('computeSkillTrajectory', () => {
  it('returns empty arrays when no attempts', () => {
    const t = computeSkillTrajectory([], { days: 30, now: NOW });
    expect(t.days).toBe(30);
    expect(Object.values(t.daily).every(arr => arr.every(v => v === 0))).toBe(true);
    expect(Object.values(t.cumulative).every(arr => arr.every(v => v === 0))).toBe(true);
    expect(Object.values(t.totalSolves).every(v => v === 0)).toBe(true);
  });

  it('buckets a single solve into the correct day', () => {
    const attempts = [mkAttempt(1, 5, true, ['SELECT'])];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW });
    // 5 days ago → dayIdx = 30 - 1 - 5 = 24
    expect(t.daily['Querying Basics'][24]).toBe(1);
    expect(t.daily['Querying Basics'][23]).toBe(0);
  });

  it('cumulative is monotonically non-decreasing', () => {
    const attempts = [
      mkAttempt(1, 10, true, ['SELECT']),
      mkAttempt(2, 5, true, ['SELECT']),
      mkAttempt(3, 3, true, ['SELECT']),
    ];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW });
    const cum = t.cumulative['Querying Basics'];
    for (let i = 1; i < cum.length; i++) {
      expect(cum[i]).toBeGreaterThanOrEqual(cum[i - 1]);
    }
    // Final cumulative should be 3 (all three solves)
    expect(cum[cum.length - 1]).toBe(3);
  });

  it('ignores failed attempts', () => {
    const attempts = [
      mkAttempt(1, 5, false, ['SELECT']),
      mkAttempt(2, 3, true, ['SELECT']),
    ];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW });
    expect(t.totalSolves['Querying Basics']).toBe(1);
  });

  it('ignores attempts outside the window', () => {
    const attempts = [
      mkAttempt(1, 45, true, ['SELECT']),   // 45 days ago — outside 30-day window
      mkAttempt(2, 3, true, ['SELECT']),
    ];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW });
    expect(t.totalSolves['Querying Basics']).toBe(1);
  });

  it('fans credit across multiple topics in one attempt', () => {
    const attempts = [mkAttempt(1, 3, true, ['JOIN', 'GROUP BY'])];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW });
    expect(t.totalSolves['Joins']).toBe(1);
    expect(t.totalSolves['Aggregation & Grouping']).toBe(1);
  });

  it('dedupes multiple topics mapping to the same skill', () => {
    // SELECT and WHERE both map to 'Querying Basics' — should count once per attempt
    const attempts = [mkAttempt(1, 3, true, ['SELECT', 'WHERE'])];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW });
    expect(t.totalSolves['Querying Basics']).toBe(1);
  });

  it('handles missing topics gracefully (falls back to topic)', () => {
    const attempt = { challengeId: 1, success: true, timestamp: NOW - 3 * DAY, topic: 'SELECT' };
    const t = computeSkillTrajectory([attempt], { days: 30, now: NOW });
    expect(t.totalSolves['Querying Basics']).toBe(1);
  });

  it('filters by requested skills subset', () => {
    const attempts = [
      mkAttempt(1, 3, true, ['JOIN']),
      mkAttempt(2, 3, true, ['SELECT']),
    ];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW, skills: ['Joins'] });
    expect(t.totalSolves['Joins']).toBe(1);
    expect(t.totalSolves['Querying Basics']).toBeUndefined();
  });

  it('firstDay and lastDay are aligned to midnight', () => {
    const weirdNow = new Date('2026-04-25T14:37:42Z').getTime();
    const t = computeSkillTrajectory([], { days: 30, now: weirdNow });
    const lastDay = new Date(t.lastDay);
    expect(lastDay.getHours()).toBe(0);
    expect(lastDay.getMinutes()).toBe(0);
    expect(lastDay.getSeconds()).toBe(0);
  });

  it('buckets an attempt made today (daysAgo=0) into the last day', () => {
    const attempts = [mkAttempt(1, 0, true, ['SELECT'])];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW });
    const lastIdx = t.daily['Querying Basics'].length - 1;
    expect(t.daily['Querying Basics'][lastIdx]).toBe(1);
  });

  it('handles null/undefined attempts array', () => {
    expect(() => computeSkillTrajectory(null, { now: NOW })).not.toThrow();
    expect(() => computeSkillTrajectory(undefined, { now: NOW })).not.toThrow();
  });
});

describe('topActiveSkills', () => {
  it('returns empty array for null trajectory', () => {
    expect(topActiveSkills(null)).toEqual([]);
  });

  it('returns top N skills by total solves', () => {
    const attempts = [
      mkAttempt(1, 3, true, ['JOIN']),
      mkAttempt(2, 3, true, ['JOIN']),
      mkAttempt(3, 3, true, ['JOIN']),
      mkAttempt(4, 3, true, ['SELECT']),
      mkAttempt(5, 3, true, ['SELECT']),
      mkAttempt(6, 3, true, ['CASE']),
    ];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW });
    const top = topActiveSkills(t, 2);
    expect(top).toHaveLength(2);
    expect(top[0].skill).toBe('Joins');
    expect(top[0].count).toBe(3);
    expect(top[1].skill).toBe('Querying Basics');
    expect(top[1].count).toBe(2);
  });

  it('filters out skills with zero solves', () => {
    const attempts = [mkAttempt(1, 3, true, ['JOIN'])];
    const t = computeSkillTrajectory(attempts, { days: 30, now: NOW });
    const top = topActiveSkills(t, 10);
    expect(top).toHaveLength(1);
    expect(top[0].skill).toBe('Joins');
  });
});
