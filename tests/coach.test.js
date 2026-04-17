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

describe('computeNextStep — lesson timestamps (Phase 2)', () => {
  it('treats aiLessonCompletions object as lesson-complete signal', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      completedAiLessons: new Set(),
      aiLessonCompletions: { 2: '2026-04-10T00:00:00Z' },
    }));
    expect(r.step.id).toBe('s2');
  });

  it('prefers aiLessonCompletions over legacy Set when both present', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      completedAiLessons: new Set(),
      aiLessonCompletions: { 2: '2026-04-10T00:00:00Z' },
    }));
    expect(r.step.id).toBe('s2');
  });

  it('legacy-only Set still marks lesson complete (back-compat)', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      completedAiLessons: new Set([2]),
    }));
    expect(r.step.id).toBe('s2');
  });
});

describe('computeNextStep — mastery_check', () => {
  const goalWithMastery = () => ({
    id: 'm', name: 'm',
    curriculum: [
      { id: 'mk', type: 'mastery_check', skill: 'GROUP BY', minSolves: 2, minDifficulty: 'Medium' },
    ],
  });
  const startedAt = new Date('2026-04-01T00:00:00Z').getTime();

  it('incomplete when no matching solves', () => {
    const r = computeNextStep(goalWithMastery(), mkUserData({
      coachState: { goalId: 'm', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
    }));
    expect(r.step.id).toBe('mk');
  });

  it('completes after enough post-start solves on matching skill+difficulty', () => {
    const r = computeNextStep(goalWithMastery(), mkUserData({
      coachState: { goalId: 'm', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
      challengeAttempts: [
        { challengeId: 1, success: true, difficulty: 'Medium', topics: ['GROUP BY'], timestamp: startedAt + 1000 },
        { challengeId: 2, success: true, difficulty: 'Hard',   topics: ['GROUP BY'], timestamp: startedAt + 2000 },
      ],
    }));
    expect(r.step).toBeNull();
  });

  it('ignores easy solves when minDifficulty is Medium', () => {
    const r = computeNextStep(goalWithMastery(), mkUserData({
      coachState: { goalId: 'm', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
      challengeAttempts: [
        { challengeId: 1, success: true, difficulty: 'Easy', topics: ['GROUP BY'], timestamp: startedAt + 1000 },
        { challengeId: 2, success: true, difficulty: 'Easy', topics: ['GROUP BY'], timestamp: startedAt + 2000 },
      ],
    }));
    expect(r.step.id).toBe('mk');
  });

  it('dedupes multiple solves of the same challengeId', () => {
    const r = computeNextStep(goalWithMastery(), mkUserData({
      coachState: { goalId: 'm', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
      challengeAttempts: [
        { challengeId: 1, success: true, difficulty: 'Medium', topics: ['GROUP BY'], timestamp: startedAt + 1000 },
        { challengeId: 1, success: true, difficulty: 'Medium', topics: ['GROUP BY'], timestamp: startedAt + 2000 },
      ],
    }));
    expect(r.step.id).toBe('mk');
  });
});

describe('computeNextStep — retrieval_check', () => {
  const goalWithRetrieval = () => ({
    id: 'r', name: 'r',
    curriculum: [
      { id: 'rc', type: 'retrieval_check', sourceLessonId: 2, skill: 'GROUP BY', minDaysSince: 1 },
    ],
  });

  it('not complete when lesson never done', () => {
    const r = computeNextStep(goalWithRetrieval(), mkUserData());
    expect(r.step.id).toBe('rc');
  });

  it('not complete when lesson was done but retrieval-window has not arrived', () => {
    const now = Date.now();
    const r = computeNextStep(goalWithRetrieval(), mkUserData({
      aiLessonCompletions: { 2: new Date(now - 10 * 60 * 1000).toISOString() }, // 10 min ago
    }));
    expect(r.step.id).toBe('rc');
  });

  it('completes when lesson was done >= minDaysSince AND a qualifying success exists', () => {
    const now = Date.now();
    const lessonTs = now - 2 * 24 * 60 * 60 * 1000; // 2 days ago
    const retrievalTs = now - 1 * 60 * 60 * 1000;   // 1h ago
    const r = computeNextStep(goalWithRetrieval(), mkUserData({
      aiLessonCompletions: { 2: new Date(lessonTs).toISOString() },
      challengeAttempts: [
        { challengeId: 42, success: true, topics: ['GROUP BY'], timestamp: retrievalTs },
      ],
    }));
    expect(r.step).toBeNull();
  });

  it('not complete when lesson timestamp is unknown (legacy only)', () => {
    const now = Date.now();
    const r = computeNextStep(goalWithRetrieval(), mkUserData({
      completedAiLessons: new Set([2]),
      challengeAttempts: [
        { challengeId: 42, success: true, topics: ['GROUP BY'], timestamp: now },
      ],
    }));
    expect(r.step.id).toBe('rc');
  });
});

describe('validateGoalRegistry — Phase 2 step types', () => {
  it('accepts a valid mastery_check', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 's1', type: 'mastery_check', skill: 'GROUP BY', minSolves: 3, minDifficulty: 'Medium' }] })],
      aiLessonsData: [],
      challengesData: [],
    });
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('flags non-canonical mastery_check skill', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 's1', type: 'mastery_check', skill: 'MadeUp', minSolves: 3 }] })],
      aiLessonsData: [],
      challengesData: [],
    });
    expect(issues.some(i => /mastery_check.skill "MadeUp"/.test(i.message))).toBe(true);
  });

  it('flags bad mastery_check.minDifficulty', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 's1', type: 'mastery_check', skill: 'GROUP BY', minSolves: 3, minDifficulty: 'Impossible' }] })],
      aiLessonsData: [],
      challengesData: [],
    });
    expect(issues.some(i => /minDifficulty "Impossible"/.test(i.message))).toBe(true);
  });

  it('flags retrieval_check.sourceLessonId that does not resolve', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 's1', type: 'retrieval_check', sourceLessonId: 9999 }] })],
      aiLessonsData: [{ id: 2 }],
      challengesData: [],
    });
    expect(issues.some(i => /sourceLessonId 9999/.test(i.message))).toBe(true);
  });
});

describe('computeNextStep — placement_check injection (Phase 3)', () => {
  const startedAt = new Date('2026-04-01T00:00:00Z').getTime();
  const withPlacement = (extra = {}) => mkUserData({
    coachState: {
      goalId: 'test',
      startedAt: '2026-04-01T00:00:00Z',
      stepsCompleted: [],
      placement: { challengeIds: [10, 20, 30, 40, 50], minAnswered: 5, skipped: false },
    },
    ...extra,
  });

  it('surfaces the placement step before the curriculum', () => {
    const r = computeNextStep(mkGoal(), withPlacement());
    expect(r.step.id).toBe('__placement');
    expect(r.step.type).toBe('placement_check');
  });

  it('falls through to curriculum when placement is skipped', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      coachState: {
        goalId: 'test',
        startedAt: '2026-04-01T00:00:00Z',
        stepsCompleted: [],
        placement: { challengeIds: [10, 20, 30, 40, 50], minAnswered: 5, skipped: true },
      },
    }));
    expect(r.step.id).toBe('s1');
  });

  it('completes after N post-start attempts (success or fail)', () => {
    const r = computeNextStep(mkGoal(), withPlacement({
      challengeAttempts: [
        { challengeId: 10, success: true,  timestamp: startedAt + 1000 },
        { challengeId: 20, success: false, timestamp: startedAt + 2000 },
        { challengeId: 30, success: true,  timestamp: startedAt + 3000 },
        { challengeId: 40, success: true,  timestamp: startedAt + 4000 },
        { challengeId: 50, success: false, timestamp: startedAt + 5000 },
      ],
    }));
    expect(r.step.id).toBe('s1'); // placement done, curriculum starts
  });

  it('ignores pre-start attempts', () => {
    const r = computeNextStep(mkGoal(), withPlacement({
      challengeAttempts: [
        { challengeId: 10, success: true, timestamp: new Date('2025-01-01').getTime() },
        { challengeId: 20, success: true, timestamp: new Date('2025-01-02').getTime() },
        { challengeId: 30, success: true, timestamp: new Date('2025-01-03').getTime() },
        { challengeId: 40, success: true, timestamp: new Date('2025-01-04').getTime() },
        { challengeId: 50, success: true, timestamp: new Date('2025-01-05').getTime() },
      ],
    }));
    expect(r.step.id).toBe('__placement'); // pre-start doesn't count
  });

  it('dedupes by challengeId — 5 attempts of same id do not complete', () => {
    const attempts = Array.from({ length: 5 }, (_, i) => ({
      challengeId: 10, success: true, timestamp: startedAt + 1000 * (i + 1),
    }));
    const r = computeNextStep(mkGoal(), withPlacement({ challengeAttempts: attempts }));
    expect(r.step.id).toBe('__placement');
  });

  it('only counts listed challenge ids', () => {
    const r = computeNextStep(mkGoal(), withPlacement({
      challengeAttempts: [
        { challengeId: 999, success: true, timestamp: startedAt + 1000 },
        { challengeId: 998, success: true, timestamp: startedAt + 2000 },
        { challengeId: 997, success: true, timestamp: startedAt + 3000 },
        { challengeId: 996, success: true, timestamp: startedAt + 4000 },
        { challengeId: 995, success: true, timestamp: startedAt + 5000 },
      ],
    }));
    expect(r.step.id).toBe('__placement');
  });

  it('retake: attempts before retakenAt do not count toward new placement', () => {
    const retakeMs = startedAt + 60 * 60 * 1000; // 1h after goal start
    const r = computeNextStep(mkGoal(), mkUserData({
      coachState: {
        goalId: 'test',
        startedAt: '2026-04-01T00:00:00Z',
        stepsCompleted: [],
        placement: {
          challengeIds: [10, 20, 30, 40, 50],
          minAnswered: 5,
          skipped: false,
          retakenAt: new Date(retakeMs).toISOString(),
        },
      },
      challengeAttempts: [
        // 5 attempts BEFORE retake — shouldn't count
        { challengeId: 10, success: true, timestamp: startedAt + 1000 },
        { challengeId: 20, success: true, timestamp: startedAt + 2000 },
        { challengeId: 30, success: true, timestamp: startedAt + 3000 },
        { challengeId: 40, success: true, timestamp: startedAt + 4000 },
        { challengeId: 50, success: true, timestamp: startedAt + 5000 },
      ],
    }));
    expect(r.step.id).toBe('__placement');
  });

  it('retake: attempts after retakenAt do count', () => {
    const retakeMs = startedAt + 60 * 60 * 1000;
    const r = computeNextStep(mkGoal(), mkUserData({
      coachState: {
        goalId: 'test',
        startedAt: '2026-04-01T00:00:00Z',
        stepsCompleted: [],
        placement: {
          challengeIds: [10, 20, 30, 40, 50],
          minAnswered: 5,
          skipped: false,
          retakenAt: new Date(retakeMs).toISOString(),
        },
      },
      challengeAttempts: [
        { challengeId: 10, success: true, timestamp: retakeMs + 1000 },
        { challengeId: 20, success: true, timestamp: retakeMs + 2000 },
        { challengeId: 30, success: true, timestamp: retakeMs + 3000 },
        { challengeId: 40, success: true, timestamp: retakeMs + 4000 },
        { challengeId: 50, success: true, timestamp: retakeMs + 5000 },
      ],
    }));
    expect(r.step.id).toBe('s1'); // placement done via retake, curriculum starts
  });
});

describe('validateGoalRegistry — placement_check', () => {
  it('accepts a valid placement_check curriculum step', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 'p', type: 'placement_check', challengeIds: [91, 93], minAnswered: 2 }] })],
      aiLessonsData: [],
      challengesData: [{ id: 91 }, { id: 93 }],
    });
    expect(issues.filter(i => i.severity === 'error')).toEqual([]);
  });

  it('flags empty challengeIds', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 'p', type: 'placement_check', challengeIds: [] }] })],
      aiLessonsData: [], challengesData: [],
    });
    expect(issues.some(i => /non-empty array/.test(i.message))).toBe(true);
  });

  it('flags unresolved challenge ids in the set', () => {
    const issues = validateGoalRegistry({
      goals: [mkGoal({ curriculum: [{ id: 'p', type: 'placement_check', challengeIds: [91, 9999] }] })],
      aiLessonsData: [], challengesData: [{ id: 91 }],
    });
    expect(issues.some(i => /unresolved id 9999/.test(i.message))).toBe(true);
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
