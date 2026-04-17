import { describe, it, expect } from 'vitest';
import { computeNextStep, isStepComplete, matchesSkipIf, isGoalGraduated } from '../src/utils/coach.js';
import { validateGoalRegistry } from '../src/utils/coach-validate.js';

const mkGoal = (overrides = {}) => ({
  id: 'test',
  name: 'Test Goal',
  curriculum: [
    { id: 's1', type: 'lesson',    lessonId: 2 },
    { id: 's2', type: 'challenge', challengeId: 91 },
    { id: 's3', type: 'drill',     skill: 'GROUP BY' },
  ],
  exitCriteria: { skillThresholds: { 'GROUP BY': 70 } },
  ...overrides,
});

const mkUserData = (overrides = {}) => ({
  coachState: { goalId: 'test', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
  completedAiLessons: new Set(),
  challengeAttempts: [],
  completedDrills: [],
  ...overrides,
});

describe('computeNextStep — no goal', () => {
  it('returns null step when goal missing', () => {
    const r = computeNextStep(null, mkUserData());
    expect(r.step).toBeNull();
    expect(r.graduated).toBe(false);
  });
});

describe('computeNextStep — happy path', () => {
  it('returns the first step when nothing is complete', () => {
    const r = computeNextStep(mkGoal(), mkUserData());
    expect(r.step.id).toBe('s1');
    expect(r.progressPct).toBe(0);
  });

  it('skips steps in stepsCompleted', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      coachState: { goalId: 'test', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: ['s1'] },
    }));
    expect(r.step.id).toBe('s2');
  });

  it('detects lesson completion from completedAiLessons Set', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      completedAiLessons: new Set([2]),
    }));
    expect(r.step.id).toBe('s2');
  });

  it('accepts completedAiLessons as array too', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      completedAiLessons: [2],
    }));
    expect(r.step.id).toBe('s2');
  });

  it('detects challenge completion via post-start success', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      completedAiLessons: new Set([2]),
      challengeAttempts: [{ challengeId: 91, success: true, timestamp: new Date('2026-04-10').getTime() }],
    }));
    expect(r.step.id).toBe('s3');
  });

  it('ignores pre-start challenge successes', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      completedAiLessons: new Set([2]),
      challengeAttempts: [{ challengeId: 91, success: true, timestamp: new Date('2025-01-01').getTime() }],
    }));
    expect(r.step.id).toBe('s2');                              // not completed; startedAt is 2026-04-01
  });

  it('detects drill completion from completedDrills entries', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      completedAiLessons: new Set([2]),
      challengeAttempts: [{ challengeId: 91, success: true, timestamp: new Date('2026-04-10').getTime() }],
      completedDrills: [{ skill: 'GROUP BY', completedAt: '2026-04-12T00:00:00Z' }],
      coachState: { goalId: 'test', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
    }));
    expect(r.step).toBeNull();                                  // curriculum exhausted (but not graduated until exit criteria met)
  });
});

describe('computeNextStep — skipIf', () => {
  it('auto-completes a step whose skipIf matches the radar', () => {
    const goal = {
      id: 't',
      name: 't',
      curriculum: [
        { id: 's1', type: 'lesson', lessonId: 2, skipIf: { skill: 'SELECT Basics', gte: 70 } },
        { id: 's2', type: 'challenge', challengeId: 91 },
      ],
    };
    const r = computeNextStep(goal, mkUserData(), { skillLevels: { 'SELECT Basics': 75 } });
    expect(r.step.id).toBe('s2');                              // s1 was skipped via skipIf
  });

  it('does not skip when radar is below the threshold', () => {
    const goal = {
      id: 't',
      name: 't',
      curriculum: [
        { id: 's1', type: 'lesson', lessonId: 2, skipIf: { skill: 'SELECT Basics', gte: 70 } },
      ],
    };
    const r = computeNextStep(goal, mkUserData(), { skillLevels: { 'SELECT Basics': 65 } });
    expect(r.step.id).toBe('s1');
  });
});

describe('computeNextStep — graduation', () => {
  it('graduates when all skill thresholds met and no challenge target', () => {
    const goal = { id: 't', name: 't', curriculum: [{ id: 's1', type: 'drill', skill: 'GROUP BY' }],
                   exitCriteria: { skillThresholds: { 'GROUP BY': 70 } } };
    const r = computeNextStep(goal, mkUserData(), { skillLevels: { 'GROUP BY': 75 } });
    expect(r.graduated).toBe(true);
    expect(r.progressPct).toBe(100);
  });

  it('does not graduate when skill threshold missed', () => {
    const goal = { id: 't', name: 't', curriculum: [{ id: 's1', type: 'drill', skill: 'GROUP BY' }],
                   exitCriteria: { skillThresholds: { 'GROUP BY': 70 } } };
    const r = computeNextStep(goal, mkUserData(), { skillLevels: { 'GROUP BY': 50 } });
    expect(r.graduated).toBe(false);
  });

  it('requires challenges-solved counts post-start', () => {
    const startedAt = new Date('2026-04-01T00:00:00Z').getTime();
    const goal = {
      id: 't', name: 't',
      curriculum: [{ id: 's1', type: 'drill', skill: 'GROUP BY' }],
      exitCriteria: {
        skillThresholds: { 'GROUP BY': 70 },
        challengesSolved: { Easy: 2 },
      },
    };
    const attempts = [
      { challengeId: 1, difficulty: 'Easy', success: true, timestamp: startedAt + 1000 },
      { challengeId: 2, difficulty: 'Easy', success: true, timestamp: startedAt + 2000 },
    ];
    const r = computeNextStep(goal, mkUserData({
      coachState: { goalId: 't', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
      challengeAttempts: attempts,
    }), { skillLevels: { 'GROUP BY': 80 } });
    expect(r.graduated).toBe(true);
  });
});

describe('matchesSkipIf', () => {
  it('returns false when skipIf missing', () => {
    expect(matchesSkipIf(null, {})).toBe(false);
    expect(matchesSkipIf({}, {})).toBe(false);
  });
  it('requires gte', () => {
    expect(matchesSkipIf({ skill: 'X', gte: 50 }, { X: 49 })).toBe(false);
    expect(matchesSkipIf({ skill: 'X', gte: 50 }, { X: 50 })).toBe(true);
    expect(matchesSkipIf({ skill: 'X', gte: 50 }, { X: 51 })).toBe(true);
  });
});

describe('validateGoalRegistry', () => {
  it('passes a clean registry', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal()],
      aiLessonsData: [{ id: 2, title: 'SELECT' }],
      challengesData: [{ id: 91, title: 'First' }],
    });
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('flags an unknown lessonId', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 's1', type: 'lesson', lessonId: 999 }] })],
      aiLessonsData: [{ id: 2 }],
      challengesData: [],
    });
    expect(issues.some(i => /lessonId 999/.test(i.message))).toBe(true);
  });

  it('flags an unknown challengeId', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 's1', type: 'challenge', challengeId: 9999 }] })],
      aiLessonsData: [],
      challengesData: [{ id: 91 }],
    });
    expect(issues.some(i => /challengeId 9999/.test(i.message))).toBe(true);
  });

  it('flags a non-canonical drill skill', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 's1', type: 'drill', skill: 'MadeUp' }] })],
      aiLessonsData: [],
      challengesData: [],
    });
    expect(issues.some(i => /"MadeUp"/.test(i.message))).toBe(true);
  });

  it('flags duplicate step ids', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [
        { id: 'x', type: 'drill', skill: 'GROUP BY' },
        { id: 'x', type: 'drill', skill: 'JOIN Tables' },
      ] })],
      aiLessonsData: [],
      challengesData: [],
    });
    expect(issues.some(i => /duplicate step id/.test(i.message))).toBe(true);
  });

  it('warns (not errors) on exit skills not touched by any step', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({
        curriculum: [{ id: 's1', type: 'drill', skill: 'GROUP BY' }],
        exitCriteria: { skillThresholds: { 'GROUP BY': 70, 'JOIN Tables': 50 } },
      })],
      aiLessonsData: [],
      challengesData: [],
    });
    const warns = issues.filter(i => i.severity === 'warning');
    expect(warns.some(w => /JOIN Tables/.test(w.message))).toBe(true);
  });
});
