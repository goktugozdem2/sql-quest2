import { describe, it, expect } from 'vitest';
import {
  getIsoWeekStart,
  getIsoWeekEnd,
  formatDate,
  toCanonicalSkill,
  buildWeeklyReport,
  backfillCompletedWeeks,
  detectMilestones,
  mergeEarnedMilestones,
} from '../src/utils/weekly-report.js';

// Helper: make a Date at local midnight on a specific YYYY-MM-DD.
const d = (iso) => new Date(`${iso}T12:00:00`);

describe('getIsoWeekStart', () => {
  it('returns the Monday of the same week for a Wednesday', () => {
    // Apr 16 2026 is a Thursday
    const result = getIsoWeekStart(d('2026-04-16'));
    expect(result.getDay()).toBe(1);                     // Monday
    expect(formatDate(result)).toBe('2026-04-13');
  });
  it('returns the previous Monday for a Sunday (Sunday is end of ISO week)', () => {
    const result = getIsoWeekStart(d('2026-04-19'));     // Sunday
    expect(formatDate(result)).toBe('2026-04-13');
  });
  it('returns the same day for a Monday', () => {
    const result = getIsoWeekStart(d('2026-04-13'));
    expect(formatDate(result)).toBe('2026-04-13');
  });
  it('sets time to midnight local', () => {
    const result = getIsoWeekStart(d('2026-04-16'));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});

describe('getIsoWeekEnd', () => {
  it('returns the next Monday (exclusive upper bound)', () => {
    const result = getIsoWeekEnd(d('2026-04-16'));
    expect(formatDate(result)).toBe('2026-04-20');
    expect(result.getDay()).toBe(1);
  });
});

describe('toCanonicalSkill', () => {
  it('maps a raw topic to its canonical skill', () => {
    expect(toCanonicalSkill('JOIN')).toBe('JOIN Tables');
    expect(toCanonicalSkill('GROUP BY')).toBe('GROUP BY');
    expect(toCanonicalSkill('HAVING')).toBe('GROUP BY');
  });
  it('returns null for empty or unknown', () => {
    expect(toCanonicalSkill('')).toBeNull();
    expect(toCanonicalSkill(null)).toBeNull();
    expect(toCanonicalSkill(undefined)).toBeNull();
  });
  it('handles mixed-case via mapTopicToSkill fallback', () => {
    expect(toCanonicalSkill('select')).toBeTruthy();
  });
});

describe('buildWeeklyReport — empty case', () => {
  it('returns zeroed summary when no activity', () => {
    const r = buildWeeklyReport({ referenceDate: d('2026-04-16') });
    expect(r.summary.dailyChallenges).toBe(0);
    expect(r.summary.xpEarned).toBe(0);
    expect(r.summary.challengesSolved).toBe(0);
    expect(r.summary.avgSolveTime).toBe(0);
    expect(r.skillStats).toEqual([]);
    expect(r.strongSkills).toEqual([]);
    expect(r.weakSkills).toEqual([]);
    expect(r.personalBests).toEqual({});
    expect(r.interviewMistakes).toEqual([]);
  });
  it('reports week boundaries', () => {
    const r = buildWeeklyReport({ referenceDate: d('2026-04-16') });
    expect(r.weekStart).toBe('2026-04-13');
    expect(r.weekEnd).toBe('2026-04-19');
  });
});

describe('buildWeeklyReport — activity filtering', () => {
  const thisWeek = d('2026-04-16').getTime();        // Thursday in this week
  const lastWeek = d('2026-04-09').getTime();        // previous Thursday

  it('includes only activity inside the target week', () => {
    const r = buildWeeklyReport({
      referenceDate: d('2026-04-16'),
      challengeAttempts: [
        { challengeId: 1, success: true, topic: 'GROUP BY', timestamp: thisWeek },
        { challengeId: 2, success: true, topic: 'JOIN', timestamp: lastWeek },  // outside
      ],
    });
    expect(r.summary.challengesSolved).toBe(1);
  });

  it('maps topics to canonical skills and aggregates per-skill attempts', () => {
    const r = buildWeeklyReport({
      referenceDate: d('2026-04-16'),
      challengeAttempts: [
        { challengeId: 1, success: true, topic: 'GROUP BY', timestamp: thisWeek },
        { challengeId: 2, success: false, topic: 'HAVING', timestamp: thisWeek },   // also GROUP BY canonical
        { challengeId: 3, success: true, topic: 'INNER JOIN', timestamp: thisWeek }, // JOIN Tables
      ],
    });
    const gbp = r.skillStats.find(s => s.skill === 'GROUP BY');
    expect(gbp.attempts).toBe(2);
    expect(gbp.successes).toBe(1);
    expect(gbp.rate).toBe(50);
    const join = r.skillStats.find(s => s.skill === 'JOIN Tables');
    expect(join.attempts).toBe(1);
    expect(join.rate).toBe(100);
  });

  it('splits strong and weak at 70', () => {
    const attempts = [];
    for (let i = 0; i < 10; i++) {
      attempts.push({ challengeId: i, success: i < 7, topic: 'GROUP BY', timestamp: thisWeek });   // 70%
      attempts.push({ challengeId: 100 + i, success: i < 6, topic: 'JOIN', timestamp: thisWeek }); // 60%
    }
    const r = buildWeeklyReport({ referenceDate: d('2026-04-16'), challengeAttempts: attempts });
    expect(r.strongSkills.map(s => s.skill)).toContain('GROUP BY');
    expect(r.weakSkills.map(s => s.skill)).toContain('JOIN Tables');
  });
});

describe('buildWeeklyReport — personal bests', () => {
  const thisWeek = d('2026-04-16').getTime();
  it('picks the minimum solve time per difficulty', () => {
    const r = buildWeeklyReport({
      referenceDate: d('2026-04-16'),
      dailyChallengeHistory: [
        { date: '2026-04-15', difficulty: 'Easy', solveTime: 120 },
        { date: '2026-04-16', difficulty: 'Easy', solveTime: 85 },     // new best
        { date: '2026-04-16', difficulty: 'Medium', solveTime: 300 },
      ],
    });
    expect(r.personalBests.Easy).toBe(85);
    expect(r.personalBests.Medium).toBe(300);
  });
  it('ignores zero/missing solve times', () => {
    const r = buildWeeklyReport({
      referenceDate: d('2026-04-16'),
      dailyChallengeHistory: [
        { date: '2026-04-15', difficulty: 'Hard', solveTime: 0 },
        { date: '2026-04-16', difficulty: 'Hard' /* no solveTime */ },
      ],
    });
    expect(r.personalBests.Hard).toBeUndefined();
  });
});

describe('buildWeeklyReport — deltas vs previous', () => {
  const thisWeek = d('2026-04-16').getTime();
  it('computes deltas when a previous report is provided', () => {
    const previousReport = {
      summary: { dailyChallenges: 3, xpEarned: 50, challengesSolved: 2, avgSolveTime: 200 },
    };
    const r = buildWeeklyReport({
      referenceDate: d('2026-04-16'),
      dailyChallengeHistory: [
        { date: '2026-04-13', difficulty: 'Easy', solveTime: 100, xpEarned: 20 },
        { date: '2026-04-14', difficulty: 'Easy', solveTime: 120, xpEarned: 20 },
      ],
      challengeAttempts: [
        { challengeId: 1, success: true, topic: 'GROUP BY', timestamp: thisWeek },
      ],
      previousReport,
    });
    expect(r.deltas.dailyChallenges).toBe(-1);
    expect(r.deltas.xpEarned).toBe(-10);
    expect(r.deltas.challengesSolved).toBe(-1);
  });
  it('returns null deltas when no previous report', () => {
    const r = buildWeeklyReport({ referenceDate: d('2026-04-16') });
    expect(r.deltas).toBeNull();
  });
});

describe('backfillCompletedWeeks', () => {
  it('returns unchanged array when no activity', () => {
    const r = backfillCompletedWeeks({ weeklyReports: [] });
    expect(r).toEqual([]);
  });
  it('appends reports for completed weeks with activity', () => {
    const r = backfillCompletedWeeks({
      weeklyReports: [],
      dailyChallengeHistory: [
        { date: '2026-04-03', difficulty: 'Easy', solveTime: 100, xpEarned: 20, topic: 'GROUP BY', coreCorrect: true },
        { date: '2026-04-10', difficulty: 'Easy', solveTime: 90, xpEarned: 25, topic: 'GROUP BY', coreCorrect: true },
      ],
      now: d('2026-04-16'),
    });
    // Week of Mar 30 (contains Apr 3) and week of Apr 6 (contains Apr 10) should be present.
    // Current week of Apr 13 is NOT included (still in progress).
    const weekStarts = r.map(rr => rr.weekStart);
    expect(weekStarts).toContain('2026-03-30');
    expect(weekStarts).toContain('2026-04-06');
    expect(weekStarts).not.toContain('2026-04-13');
  });
  it('is idempotent — already-stored weeks are not duplicated', () => {
    const existing = [{
      weekStart: '2026-04-06',
      weekEnd: '2026-04-12',
      summary: { dailyChallenges: 1 },
    }];
    const r = backfillCompletedWeeks({
      weeklyReports: existing,
      dailyChallengeHistory: [
        { date: '2026-04-10', difficulty: 'Easy', solveTime: 100, xpEarned: 20 },
      ],
      now: d('2026-04-16'),
    });
    const aprSix = r.filter(rr => rr.weekStart === '2026-04-06');
    expect(aprSix.length).toBe(1);
  });
  it('skips empty weeks', () => {
    const r = backfillCompletedWeeks({
      weeklyReports: [],
      dailyChallengeHistory: [
        { date: '2026-03-30', difficulty: 'Easy', solveTime: 100, xpEarned: 20 },
        // gap: nothing for Apr 6 week
        { date: '2026-04-13', difficulty: 'Easy', solveTime: 100, xpEarned: 20 },  // current week
      ],
      now: d('2026-04-16'),
    });
    const weekStarts = r.map(rr => rr.weekStart);
    expect(weekStarts).toContain('2026-03-30');
    expect(weekStarts).not.toContain('2026-04-06');   // empty, skipped
  });
});

describe('detectMilestones', () => {
  const thisWeek = d('2026-04-16').getTime();
  const lastMonth = d('2026-03-15').getTime();

  const mockReport = (overrides = {}) => ({
    weekStart: '2026-04-13',
    weekEnd: '2026-04-19',
    summary: { challengesSolved: 0, ...overrides.summary },
    ...overrides,
  });

  it('returns empty array when nothing notable happened', () => {
    const m = detectMilestones({
      report: mockReport(),
      allChallengeAttempts: [],
      skillLevelsBefore: { 'GROUP BY': 50 },
      skillLevelsAfter: { 'GROUP BY': 52 },
    });
    expect(m).toEqual([]);
  });

  it('flags first-ever Hard challenge solved', () => {
    const m = detectMilestones({
      report: mockReport(),
      allChallengeAttempts: [
        { challengeId: 1, success: true, difficulty: 'Hard', timestamp: thisWeek },
      ],
    });
    expect(m.some(x => x.kind === 'first_hard')).toBe(true);
  });

  it('does not flag first Hard when there was a prior Hard solve', () => {
    const m = detectMilestones({
      report: mockReport(),
      allChallengeAttempts: [
        { challengeId: 1, success: true, difficulty: 'Hard', timestamp: lastMonth },
        { challengeId: 2, success: true, difficulty: 'Hard', timestamp: thisWeek },
      ],
    });
    expect(m.some(x => x.kind === 'first_hard')).toBe(false);
  });

  it('flags streak-record broken', () => {
    const m = detectMilestones({
      report: mockReport(),
      previousDailyStreakRecord: 5,
      currentDailyStreak: 7,
    });
    expect(m.some(x => x.kind === 'streak_record' && x.value === 7)).toBe(true);
  });

  it('does not flag streak when still at or below prior record', () => {
    const m = detectMilestones({
      report: mockReport(),
      previousDailyStreakRecord: 10,
      currentDailyStreak: 10,
    });
    expect(m.some(x => x.kind === 'streak_record')).toBe(false);
  });

  it('flags skill-threshold crossings on the highest tier reached', () => {
    const m = detectMilestones({
      report: mockReport(),
      skillLevelsBefore: { 'GROUP BY': 48, 'Aggregation': 28 },
      skillLevelsAfter:  { 'GROUP BY': 72, 'Aggregation': 55 },   // GROUP BY crosses 50 and 70; Aggregation crosses 30 and 50
    });
    const gb = m.find(x => x.kind === 'skill_threshold' && x.skill === 'GROUP BY');
    const ag = m.find(x => x.kind === 'skill_threshold' && x.skill === 'Aggregation');
    expect(gb).toBeDefined();
    expect(gb.description).toContain('Advanced');                 // highest crossed is 70
    expect(ag).toBeDefined();
    expect(ag.description).toContain('Intermediate');             // highest crossed is 50
  });

  it('does not flag skill threshold when skill did not cross a band', () => {
    const m = detectMilestones({
      report: mockReport(),
      skillLevelsBefore: { 'GROUP BY': 72 },
      skillLevelsAfter:  { 'GROUP BY': 78 },                      // still Advanced, no new tier
    });
    expect(m.some(x => x.kind === 'skill_threshold')).toBe(false);
  });

  it('flags volume milestone at 10+ solves', () => {
    const m = detectMilestones({
      report: mockReport({ summary: { challengesSolved: 12 } }),
    });
    expect(m.some(x => x.kind === 'volume')).toBe(true);
  });

  it('flags hard-week at 3+ Hard solves', () => {
    const m = detectMilestones({
      report: mockReport(),
      allChallengeAttempts: [
        { challengeId: 1, success: true, difficulty: 'Hard', timestamp: thisWeek },
        { challengeId: 2, success: true, difficulty: 'Hard', timestamp: thisWeek + 1 },
        { challengeId: 3, success: true, difficulty: 'Hard', timestamp: thisWeek + 2 },
      ],
    });
    expect(m.some(x => x.kind === 'hard_week' && x.value === 3)).toBe(true);
  });

  it('flags first no-hint success only when all previous successes used hints', () => {
    const m = detectMilestones({
      report: mockReport(),
      allChallengeAttempts: [
        { challengeId: 1, success: true, hintsUsed: 1, timestamp: lastMonth },
        { challengeId: 2, success: true, hintsUsed: 0, timestamp: thisWeek },
      ],
    });
    expect(m.some(x => x.kind === 'first_no_hint')).toBe(true);
  });
});

describe('detectMilestones — stable IDs', () => {
  const thisWeek = d('2026-04-16').getTime();
  const report = {
    weekStart: '2026-04-13',
    weekEnd: '2026-04-19',
    summary: { challengesSolved: 10 },
  };

  it('assigns one-time id for first_hard (no weekStart)', () => {
    const m = detectMilestones({
      report,
      allChallengeAttempts: [
        { challengeId: 1, success: true, difficulty: 'Hard', timestamp: thisWeek },
      ],
    });
    const first = m.find(x => x.kind === 'first_hard');
    expect(first.id).toBe('first_hard');
  });

  it('scopes streak_record id by value so distinct records stack', () => {
    const m = detectMilestones({
      report,
      previousDailyStreakRecord: 5,
      currentDailyStreak: 12,
    });
    expect(m.find(x => x.kind === 'streak_record').id).toBe('streak_record:12');
  });

  it('scopes skill_threshold id by skill + crossed tier', () => {
    const m = detectMilestones({
      report,
      skillLevelsBefore: { 'GROUP BY': 48 },
      skillLevelsAfter: { 'GROUP BY': 72 },
    });
    expect(m.find(x => x.kind === 'skill_threshold').id).toBe('skill_threshold:GROUP BY:70');
  });

  it('scopes volume + hard_week ids by weekStart', () => {
    const m = detectMilestones({
      report,
      allChallengeAttempts: [
        { success: true, difficulty: 'Hard', timestamp: thisWeek },
        { success: true, difficulty: 'Hard', timestamp: thisWeek + 1 },
        { success: true, difficulty: 'Hard', timestamp: thisWeek + 2 },
      ],
    });
    expect(m.find(x => x.kind === 'volume').id).toBe('volume:2026-04-13');
    expect(m.find(x => x.kind === 'hard_week').id).toBe('hard_week:2026-04-13');
  });
});

describe('mergeEarnedMilestones', () => {
  const now = new Date('2026-04-16T12:00:00Z');

  it('appends new ids and stamps earnedAt', () => {
    const merged = mergeEarnedMilestones(
      [],
      [{ id: 'first_hard', kind: 'first_hard', description: 'x', emoji: '🔥' }],
      now,
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].earnedAt).toBe(now.toISOString());
  });

  it('skips milestones whose id is already in the log', () => {
    const existing = [{ id: 'first_hard', earnedAt: '2026-04-10T00:00:00Z' }];
    const merged = mergeEarnedMilestones(
      existing,
      [{ id: 'first_hard' }, { id: 'first_medium' }],
      now,
    );
    expect(merged).toHaveLength(2);
    const first = merged.find(m => m.id === 'first_hard');
    expect(first.earnedAt).toBe('2026-04-10T00:00:00Z');  // original timestamp preserved
  });

  it('returns the same array reference when nothing new', () => {
    const existing = [{ id: 'a' }];
    const merged = mergeEarnedMilestones(existing, [{ id: 'a' }], now);
    expect(merged).toBe(existing);
  });

  it('ignores milestone entries with no id', () => {
    const merged = mergeEarnedMilestones([], [{ kind: 'broken' }, { id: 'ok' }], now);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('ok');
  });
});

describe('buildWeeklyReport — interview mistakes', () => {
  const thisWeek = d('2026-04-16').getTime();
  it('extracts mistakes from interviews that happened this week', () => {
    const r = buildWeeklyReport({
      referenceDate: d('2026-04-16'),
      interviewHistory: [
        {
          interviewId: 'meta-001',
          passed: false,
          timestamp: thisWeek,
          mistakes: [
            { questionTitle: 'Window Functions Q1' },
            { questionTitle: 'Subquery Q2' },
          ],
        },
        {
          interviewId: 'old-interview',
          passed: true,
          timestamp: d('2026-04-01').getTime(),      // outside window
          mistakes: [{ questionTitle: 'ignored' }],
        },
      ],
    });
    expect(r.interviewMistakes).toHaveLength(2);
    expect(r.interviewMistakes[0].interviewId).toBe('meta-001');
  });
});
