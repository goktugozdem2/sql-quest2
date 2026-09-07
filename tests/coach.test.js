import { describe, it, expect, beforeAll } from 'vitest';
import {
  computeNextStep, isStepComplete, matchesSkipIf, isGoalGraduated,
  pickHardPreviewStep, hasAdvancedSkillAtOrAbove,
  HARD_PREVIEW_MIN_ADVANCED, HARD_PREVIEW_STEP_ID, HARD_PREVIEW_MARKER, HARD_PREVIEW_REASON,
  HARD_PREVIEW_ADVANCED_SKILLS,
  pickMockInterviewStep, exitCriteriaWithinReach, scaleExitCriteria,
  MOCK_OFFER_STEP_ID, MOCK_OFFER_GOAL_ID, MOCK_OFFER_REACH,
  MOCK_OFFER_COOLDOWN_DAYS, MOCK_OFFER_REASON,
} from '../src/utils/coach.js';
import { validateGoalRegistry } from '../src/utils/coach-validate.js';
import { buildCurriculumOrder } from '../src/utils/challenge-order.js';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';

const mkGoal = (overrides = {}) => ({
  id: 'test',
  name: 'Test Goal',
  curriculum: [
    { id: 's1', type: 'lesson',    lessonId: 2 },
    { id: 's2', type: 'challenge', challengeId: 91 },
    { id: 's3', type: 'drill',     skill: 'Aggregation & Grouping' },
  ],
  exitCriteria: { skillThresholds: { 'Aggregation & Grouping': 70 } },
  ...overrides,
});

// The LIVE registry, for the one test that must not use a fixture: whether
// `interview-prep` still exists and still ends without a rehearsal is the
// premise of the mock-offer rule, and a fixture cannot check a premise.
let liveGoals = null;
const goalsRegistry = () => liveGoals;
beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import('../src/data/challenges.js');
  await import('../src/data/goals.js');
  liveGoals = globalThis.window.coachGoals;
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
      completedDrills: [{ skill: 'Aggregation & Grouping', completedAt: '2026-04-12T00:00:00Z' }],
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

  // A goal that gates its lesson behind skipIf and THEN demands a retrieval
  // check on that same lesson used to trap exactly the strong users the
  // skipIf was written for: they skip the lesson, so it is never "completed",
  // so the check can never pass. The Coach told them "come back tomorrow"
  // forever. analyst-day-one shipped with this shape (d1-9 / d1-24).
  const goalSkippableLesson = () => ({
    id: 'r2', name: 'r2',
    curriculum: [
      { id: 'l', type: 'lesson', lessonId: 2, skipIf: { skill: 'Conditional Logic', gte: 60 } },
      { id: 'rc', type: 'retrieval_check', sourceLessonId: 2, skill: 'Conditional Logic', minDaysSince: 1 },
    ],
  });

  it('clears a retrieval check whose source lesson the radar let the user skip', () => {
    const startedAt = '2026-04-01T00:00:00Z';
    const startMs = new Date(startedAt).getTime();
    const r = computeNextStep(goalSkippableLesson(), mkUserData({
      coachState: { goalId: 'r2', startedAt, stepsCompleted: [] },
      challengeAttempts: [{
        challengeId: 5, success: true, difficulty: 'Medium',
        topics: ['CASE'], timestamp: startMs + 3 * 24 * 60 * 60 * 1000,
      }],
    }), { skillLevels: { 'Conditional Logic': 80 } });
    expect(r.step).toBeNull();
  });

  it('still demands the lesson when the radar does not clear the skipIf', () => {
    const startedAt = '2026-04-01T00:00:00Z';
    const startMs = new Date(startedAt).getTime();
    const r = computeNextStep(goalSkippableLesson(), mkUserData({
      coachState: { goalId: 'r2', startedAt, stepsCompleted: [] },
      challengeAttempts: [{
        challengeId: 5, success: true, difficulty: 'Medium',
        topics: ['CASE'], timestamp: startMs + 3 * 24 * 60 * 60 * 1000,
      }],
    }), { skillLevels: { 'Conditional Logic': 10 } });
    expect(r.step.id).toBe('l'); // learn it first — retrieval semantics intact
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
      goals: [mkGoal({ curriculum: [{ id: 's1', type: 'mastery_check', skill: 'Aggregation & Grouping', minSolves: 3, minDifficulty: 'Medium' }] })],
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
      goals: [mkGoal({ curriculum: [{ id: 's1', type: 'mastery_check', skill: 'Aggregation & Grouping', minSolves: 3, minDifficulty: 'Impossible' }] })],
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
      // Needs a skills tag: the registry's drill step targets
      // "Aggregation & Grouping", and the validator now rejects a drill whose
      // skill matches nothing in the bank (an empty queue is a dead step).
      challengesData: [{ id: 91, title: 'First', difficulty: 'Easy', skills: ['GROUP BY'] }],
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

// ---------------------------------------------------------------------------
// Hard-preview offer — paywall-surfaces plan D-3 (2026-09-06)
//
// The rule that lets the Coach lead a strong free user to an unsolved free
// Hard preview. The review caught two ways to get it wrong, both pinned here:
// (1) skill-calc floors Querying Basics at MAX(advanced), so it must never be
// the trigger; (2) "first preview" means first in CURRICULUM order, never the
// lowest id (the raw-array trap, src/utils/challenge-order.js).
// ---------------------------------------------------------------------------
describe('computeNextStep — hard-preview offer (paywall-surfaces D-3)', () => {
  // A small bank: three real previews, one Easy row wrongly flagged (not a
  // preview — not Hard), one locked Hard, one Medium. Ids chosen so raw id
  // order (11 < 23 < 86) DISAGREES with curriculum order (23 before 11).
  const previewBank = [
    { id: 1,  difficulty: 'Medium' },
    { id: 91, difficulty: 'Easy', freePreview: true },
    { id: 11, difficulty: 'Hard', freePreview: true },
    { id: 23, difficulty: 'Hard', freePreview: true },
    { id: 86, difficulty: 'Hard', freePreview: true },
    { id: 47, difficulty: 'Hard' },
  ];
  const order = buildCurriculumOrder([
    { challengeIds: [91, 1] },
    { challengeIds: [23, 11] },
    { challengeIds: [86] },
  ]);
  const readyRadar = { 'Querying Basics': 90, 'Window Functions': 70 };
  const previewOpts = (overrides = {}) => ({
    skillLevels: readyRadar,
    previewChallenges: previewBank,
    solvedChallenges: new Set(),
    curriculumOrder: order,
    isPro: false,
    sessionPreviewOffered: false,
    ...overrides,
  });

  // (a) the floor case — the bug the review caught
  it('does NOT fire on Querying Basics alone: the floor pins it to MAX(advanced) for everyone', () => {
    const flooredOnly = {
      'Querying Basics': 90,
      'Aggregation & Grouping': 60, 'Joins': 64, 'Subqueries & CTEs': 50,
      'Conditional Logic': 30, 'Window Functions': 20, 'String Functions': 64,
      'Date Functions': 10, 'NULL Handling': 0,
    };
    const r = computeNextStep(mkGoal(), mkUserData(), previewOpts({ skillLevels: flooredOnly }));
    expect(r.step.id).toBe('s1');
    expect(hasAdvancedSkillAtOrAbove(flooredOnly)).toBe(false);
  });

  it('ignores the legacy floored keys too (Filter & Sort / SELECT Basics)', () => {
    const legacy = { 'SELECT Basics': 95, 'Filter & Sort': 95, 'Querying Basics': 95 };
    expect(hasAdvancedSkillAtOrAbove(legacy)).toBe(false);
    const r = computeNextStep(mkGoal(), mkUserData(), previewOpts({ skillLevels: legacy }));
    expect(r.step.id).toBe('s1');
  });

  it('advanced set is every canonical skill except Querying Basics, bound to the live radar', () => {
    expect(HARD_PREVIEW_ADVANCED_SKILLS).toEqual(CANONICAL_SKILLS.filter(s => s !== 'Querying Basics'));
    expect(HARD_PREVIEW_ADVANCED_SKILLS).not.toContain('Querying Basics');
    expect(HARD_PREVIEW_ADVANCED_SKILLS.length).toBe(CANONICAL_SKILLS.length - 1);
  });

  // (b) fires, with the first preview in CURRICULUM order
  it('fires for advanced ≥ 65 + an unsolved preview, picking the first in curriculum order (not lowest id)', () => {
    const r = computeNextStep(mkGoal(), mkUserData(), previewOpts());
    expect(r.step).toEqual({
      id: HARD_PREVIEW_STEP_ID,
      type: 'challenge',
      challengeId: 23,                 // curriculum-first; raw id order would say 11
      reason: HARD_PREVIEW_MARKER,
    });
    expect(r.step.id).toBe('__hard_preview');
    expect(r.step.reason).toBe('hard_preview');
    expect(r.reason).toBe(HARD_PREVIEW_REASON);
    expect(r.reason).toBe("You're ready for a hard one — this one's free.");
    expect(r.graduated).toBe(false);
  });

  it('keeps the curriculum progress % while standing in for a step', () => {
    const r = computeNextStep(mkGoal(), mkUserData({ completedAiLessons: new Set([2]) }), previewOpts());
    expect(r.step.id).toBe(HARD_PREVIEW_STEP_ID);
    expect(r.progressPct).toBe(33);   // s1 of 3 done — same number the curriculum step would carry
  });

  it('every advanced skill on its own can trigger it; the threshold is inclusive at 65', () => {
    expect(HARD_PREVIEW_MIN_ADVANCED).toBe(65);
    for (const skill of HARD_PREVIEW_ADVANCED_SKILLS) {
      const at = computeNextStep(mkGoal(), mkUserData(), previewOpts({ skillLevels: { [skill]: 65 } }));
      expect(at.step.id, `${skill} at 65 should fire`).toBe(HARD_PREVIEW_STEP_ID);
      const below = computeNextStep(mkGoal(), mkUserData(), previewOpts({ skillLevels: { [skill]: 64 } }));
      expect(below.step.id, `${skill} at 64 should not fire`).toBe('s1');
    }
  });

  it('walks the previews in curriculum order as they get solved; accepts a Set or an array', () => {
    const afterFirst = computeNextStep(mkGoal(), mkUserData(), previewOpts({ solvedChallenges: new Set([23]) }));
    expect(afterFirst.step.challengeId).toBe(11);
    const afterTwo = computeNextStep(mkGoal(), mkUserData(), previewOpts({ solvedChallenges: [23, 11] }));
    expect(afterTwo.step.challengeId).toBe(86);
  });

  it('counts a successful attempt as solved even when solvedChallenges lags behind it', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      challengeAttempts: [{ challengeId: 23, success: true, timestamp: new Date('2025-01-01').getTime() }],
    }), previewOpts());
    expect(r.step.challengeId).toBe(11);
  });

  it('never offers the flagged-but-not-Hard row or a locked Hard', () => {
    const r = computeNextStep(mkGoal(), mkUserData(), previewOpts({ solvedChallenges: [23, 11, 86] }));
    expect(r.step.id).toBe('s1');   // 91 (Easy, flagged) and 47 (locked) are not previews
  });

  // (c) all previews solved
  it('does not fire when every preview is solved', () => {
    const r = computeNextStep(mkGoal(), mkUserData(), previewOpts({ solvedChallenges: new Set([11, 23, 86]) }));
    expect(r.step.id).toBe('s1');
    expect(r.reason).not.toBe(HARD_PREVIEW_REASON);
  });

  // (d) once per session — app.jsx owns the flag, the engine only reads it
  it('does not fire when sessionPreviewOffered is true', () => {
    const r = computeNextStep(mkGoal(), mkUserData(), previewOpts({ sessionPreviewOffered: true }));
    expect(r.step.id).toBe('s1');
  });

  // (e) Pro users have nothing to preview
  it('does not fire for Pro users', () => {
    const r = computeNextStep(mkGoal(), mkUserData(), previewOpts({ isPro: true }));
    expect(r.step.id).toBe('s1');
  });

  // (f) never displaces a retrieval_check or a placement_check
  it('a pending retrieval_check keeps priority', () => {
    const goal = {
      id: 'r', name: 'r',
      curriculum: [{ id: 'rc', type: 'retrieval_check', sourceLessonId: 2, skill: 'GROUP BY', minDaysSince: 1 }],
    };
    const r = computeNextStep(goal, mkUserData(), previewOpts());
    expect(r.step.id).toBe('rc');
    expect(r.step.type).toBe('retrieval_check');
  });

  it('a pending placement_check keeps priority', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      coachState: {
        goalId: 'test', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [],
        placement: { challengeIds: [10, 20, 30, 40, 50], minAnswered: 5, skipped: false },
      },
    }), previewOpts());
    expect(r.step.id).toBe('__placement');
  });

  it('may stand in for a lesson, drill or mastery_check step', () => {
    const goal = {
      id: 'm', name: 'm',
      curriculum: [{ id: 'mk', type: 'mastery_check', skill: 'Joins', minSolves: 2, minDifficulty: 'Medium' }],
    };
    const r = computeNextStep(goal, mkUserData(), previewOpts());
    expect(r.step.id).toBe(HARD_PREVIEW_STEP_ID);
  });

  it('still offers a preview once the curriculum is exhausted (not graduated)', () => {
    const r = computeNextStep(mkGoal(), mkUserData({
      completedAiLessons: new Set([2]),
      challengeAttempts: [{ challengeId: 91, success: true, timestamp: new Date('2026-04-10').getTime() }],
      completedDrills: [{ skill: 'Aggregation & Grouping', completedAt: '2026-04-12T00:00:00Z' }],
    }), previewOpts());
    expect(r.step.id).toBe(HARD_PREVIEW_STEP_ID);
    expect(r.progressPct).toBe(100);
  });

  it('graduation still wins — no step at all once exit criteria are met', () => {
    const r = computeNextStep(mkGoal(), mkUserData(), previewOpts({
      skillLevels: { 'Aggregation & Grouping': 75 },   // exit threshold 70 → graduated
    }));
    expect(r.graduated).toBe(true);
    expect(r.step).toBeNull();
  });

  it('is inert without the bank, and survives a missing curriculumOrder', () => {
    const noBank = computeNextStep(mkGoal(), mkUserData(), previewOpts({ previewChallenges: undefined }));
    expect(noBank.step.id).toBe('s1');
    const noOrder = computeNextStep(mkGoal(), mkUserData(), previewOpts({ curriculumOrder: undefined }));
    expect(noOrder.step.id).toBe(HARD_PREVIEW_STEP_ID);
    expect([11, 23, 86]).toContain(noOrder.step.challengeId);
  });

  // (h) the bank the preview rule reads is NOT the bank mastery_check reads
  // (2026-09-06 review). `options.allChallenges` lets mastery_check resolve a
  // difficulty for attempt rows that never recorded one; app.jsx had never
  // passed it, so those rows fell back to Easy. Wiring the bank in under that
  // name for the preview rule would have silently started counting legacy
  // attempts toward Medium/Hard gates. The preview rule reads
  // `previewChallenges`; `allChallenges` stays a separate, still-unpassed key.
  it('previewChallenges does not feed mastery_check — an unstamped attempt still falls back to Easy', () => {
    const startedAt = new Date('2026-04-01T00:00:00Z').getTime();
    const goal = {
      id: 'm', name: 'm',
      curriculum: [{ id: 'mk', type: 'mastery_check', skill: 'GROUP BY', minSolves: 2, minDifficulty: 'Medium' }],
    };
    const bank = [
      { id: 1, difficulty: 'Medium' },
      { id: 2, difficulty: 'Hard' },
      { id: 23, difficulty: 'Hard', freePreview: true },
    ];
    const userData = mkUserData({
      coachState: { goalId: 'm', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
      challengeAttempts: [
        // No `difficulty` on either row — the pre-stamp shape.
        { challengeId: 1, success: true, topics: ['GROUP BY'], timestamp: startedAt + 1000 },
        { challengeId: 2, success: true, topics: ['GROUP BY'], timestamp: startedAt + 2000 },
      ],
    });
    // sessionPreviewOffered keeps the preview rule out of the way so the
    // step we read is the mastery_check itself.
    const viaPreviewKey = computeNextStep(goal, userData, previewOpts({ previewChallenges: bank, sessionPreviewOffered: true }));
    expect(viaPreviewKey.step.id).toBe('mk');          // not resolved → Easy → does not count
    const viaEngineKey = computeNextStep(goal, userData, previewOpts({ previewChallenges: undefined, allChallenges: bank, sessionPreviewOffered: true }));
    expect(viaEngineKey.step).toBeNull();               // the engine key DOES resolve — the behaviour app.jsx must not opt into by accident
  });

  it('accepts allChallenges as a fallback bank for callers that already plumb it', () => {
    expect(pickHardPreviewStep(previewOpts({ previewChallenges: undefined, allChallenges: previewBank }), {})).toEqual({
      id: HARD_PREVIEW_STEP_ID, type: 'challenge', challengeId: 23, reason: HARD_PREVIEW_MARKER,
    });
  });

  // (g) the rule is invisible to every caller that does not opt in
  it('existing callers (no preview options) see exactly the old behaviour', () => {
    const r = computeNextStep(mkGoal(), mkUserData(), { skillLevels: readyRadar });
    expect(r.step.id).toBe('s1');
  });

  it('pickHardPreviewStep is the same decision, callable on its own', () => {
    expect(pickHardPreviewStep(previewOpts(), {})).toEqual({
      id: HARD_PREVIEW_STEP_ID, type: 'challenge', challengeId: 23, reason: HARD_PREVIEW_MARKER,
    });
    expect(pickHardPreviewStep(previewOpts({ isPro: true }), {})).toBeNull();
    expect(pickHardPreviewStep(previewOpts({ sessionPreviewOffered: true }), {})).toBeNull();
    expect(pickHardPreviewStep(previewOpts({ skillLevels: { 'Querying Basics': 99 } }), {})).toBeNull();
    expect(pickHardPreviewStep(undefined, undefined)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mock-interview offer (2026-09-08)
//
// The Coach may offer a timed rehearsal — but the Coach is the one surface
// 1,179 people see, so the first and most important thing proved here is that
// it is INERT: for a caller that does not opt in, `computeNextStep` returns
// byte-identical output to what it returned before this rule existed.
// ---------------------------------------------------------------------------
describe('computeNextStep — mock-interview offer: INERTNESS (the invariant)', () => {
  const ivGoal = () => ({
    id: MOCK_OFFER_GOAL_ID,
    name: 'SQL Interview Prep',
    curriculum: [
      { id: 'iv-a', type: 'challenge', challengeId: 23 },
      { id: 'iv-b', type: 'drill', skill: 'Window Functions' },
    ],
    exitCriteria: {
      skillThresholds: { 'Window Functions': 70, 'Joins': 65, 'Subqueries & CTEs': 60 },
      challengesSolved: { Medium: 3, Hard: 8 },
    },
  });

  // A radar + attempt history that clears 80% of the interview bar, so every
  // state below is one that WOULD fire the rule if the caller opted in. That
  // is the only way the inertness assertion means anything.
  const reachRadar = { 'Window Functions': 60, 'Joins': 55, 'Subqueries & CTEs': 50 };
  const reachAttempts = () => {
    const t = new Date('2026-04-05T00:00:00Z').getTime();
    const rows = [];
    for (let i = 0; i < 7; i++) rows.push({ challengeId: 500 + i, success: true, difficulty: 'Hard', timestamp: t + i });
    for (let i = 0; i < 3; i++) rows.push({ challengeId: 600 + i, success: true, difficulty: 'Medium', timestamp: t + i });
    return rows;
  };

  // A representative set of states: cold, mid-curriculum, curriculum
  // exhausted, graduated, placement pending, retrieval pending, and the
  // would-fire state itself — each on a plain goal AND on the interview goal.
  const states = () => {
    const out = [];
    for (const [goalName, goal] of [['plain', mkGoal()], ['interview', ivGoal()]]) {
      out.push([`${goalName}/cold`, goal, mkUserData()]);
      out.push([`${goalName}/mid`, goal, mkUserData({ completedAiLessons: new Set([2]) })]);
      out.push([`${goalName}/exhausted`, goal, mkUserData({
        coachState: { goalId: goal.id, startedAt: '2026-04-01T00:00:00Z', stepsCompleted: ['s1', 's2', 's3', 'iv-a', 'iv-b'] },
      })]);
      out.push([`${goalName}/placement`, goal, mkUserData({
        coachState: {
          goalId: goal.id, startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [],
          placement: { challengeIds: [10, 20, 30, 40, 50], minAnswered: 5, skipped: false },
        },
      })]);
      out.push([`${goalName}/would-fire`, goal, mkUserData({ challengeAttempts: reachAttempts() })]);
    }
    out.push(['retrieval', {
      id: MOCK_OFFER_GOAL_ID, name: 'r',
      curriculum: [{ id: 'rc', type: 'retrieval_check', sourceLessonId: 2, skill: 'Joins', minDaysSince: 1 }],
      exitCriteria: ivGoal().exitCriteria,
    }, mkUserData({ challengeAttempts: reachAttempts() })]);
    out.push(['graduated', ivGoal(), mkUserData({ challengeAttempts: (() => {
      const t = new Date('2026-04-05T00:00:00Z').getTime();
      const rows = [];
      for (let i = 0; i < 8; i++) rows.push({ challengeId: 500 + i, success: true, difficulty: 'Hard', timestamp: t + i });
      for (let i = 0; i < 3; i++) rows.push({ challengeId: 600 + i, success: true, difficulty: 'Medium', timestamp: t + i });
      return rows;
    })() })]);
    return out;
  };

  // Everything the rule needs EXCEPT the opt-in switch. If the switch were
  // ever defaulted on, or read from anywhere but the options bag, these fail.
  const armedButNotEnabled = {
    skillLevels: reachRadar,
    isPro: true,
    mockTarget: { company: 'Test Co', mockId: 'test-mock' },
    prepTargetCompany: 'Test Co',
    mockCriteria: ivGoal().exitCriteria,
    lastMockAtMs: null,
    now: new Date('2026-05-01T00:00:00Z').getTime(),
  };

  it('a user with no target and no interview goal gets byte-identical output', () => {
    for (const [label, goal, userData] of states()) {
      const before = computeNextStep(goal, userData, { skillLevels: reachRadar });
      const withOptions = computeNextStep(goal, userData, { ...armedButNotEnabled, mockOfferEnabled: false });
      expect(JSON.stringify(withOptions), `${label}: opting out changed the output`)
        .toBe(JSON.stringify(before));
    }
  });

  it('every option in the bag except the flag leaves the output untouched', () => {
    for (const [label, goal, userData] of states()) {
      const before = computeNextStep(goal, userData, { skillLevels: reachRadar });
      // The flag omitted entirely — the shape every caller in the tree had
      // before 2026-09-08.
      const armed = computeNextStep(goal, userData, armedButNotEnabled);
      expect(JSON.stringify(armed), `${label}: an unset flag behaved as consent`)
        .toBe(JSON.stringify(before));
    }
  });

  it('no truthy-ish value other than true opens the gate', () => {
    const goal = ivGoal();
    const userData = mkUserData({ challengeAttempts: reachAttempts() });
    const base = computeNextStep(goal, userData, { skillLevels: reachRadar });
    for (const v of [1, 'true', 'yes', {}, [], undefined, null, 0, '']) {
      const r = computeNextStep(goal, userData, { ...armedButNotEnabled, mockOfferEnabled: v });
      expect(JSON.stringify(r), `mockOfferEnabled=${JSON.stringify(v)} must not fire`).toBe(JSON.stringify(base));
    }
    // …and the same value that IS true does fire, so the assertion above is
    // testing a live gate rather than a dead rule.
    const on = computeNextStep(goal, userData, { ...armedButNotEnabled, mockOfferEnabled: true });
    expect(on.step.type).toBe('mock_interview');
  });

  it('pickMockInterviewStep is null for the un-opted-in caller, on its own', () => {
    expect(pickMockInterviewStep(ivGoal(), mkUserData(), {})).toBeNull();
    expect(pickMockInterviewStep(ivGoal(), mkUserData(), armedButNotEnabled)).toBeNull();
    expect(pickMockInterviewStep(undefined, undefined, undefined)).toBeNull();
  });
});

describe('computeNextStep — mock-interview offer: the five conditions', () => {
  const IV_CRITERIA = {
    skillThresholds: { 'Window Functions': 70, 'Joins': 65, 'Subqueries & CTEs': 60 },
    challengesSolved: { Medium: 3, Hard: 8 },
  };
  const ivGoal = (overrides = {}) => ({
    id: MOCK_OFFER_GOAL_ID,
    name: 'SQL Interview Prep',
    curriculum: [
      { id: 'iv-a', type: 'challenge', challengeId: 23 },
      { id: 'iv-b', type: 'drill', skill: 'Window Functions' },
    ],
    exitCriteria: IV_CRITERIA,
    ...overrides,
  });
  const NOW = new Date('2026-05-01T00:00:00Z').getTime();
  // 80% of the bar: 56 / 52 / 48 on the radar, 3 Medium and ceil(6.4)=7 Hard.
  const reachRadar = { 'Window Functions': 56, 'Joins': 52, 'Subqueries & CTEs': 48 };
  const solves = (hard, medium) => {
    const t = new Date('2026-04-05T00:00:00Z').getTime();
    const rows = [];
    for (let i = 0; i < hard; i++) rows.push({ challengeId: 500 + i, success: true, difficulty: 'Hard', timestamp: t + i });
    for (let i = 0; i < medium; i++) rows.push({ challengeId: 600 + i, success: true, difficulty: 'Medium', timestamp: t + i });
    return rows;
  };
  const reachData = () => mkUserData({
    coachState: { goalId: MOCK_OFFER_GOAL_ID, startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
    challengeAttempts: solves(7, 3),
  });
  const opts = (overrides = {}) => ({
    mockOfferEnabled: true,
    isPro: true,
    sessionMockOffered: false,
    mockTarget: { company: 'Test Co', mockId: 'test-mock' },
    prepTargetCompany: 'Test Co',
    mockCriteria: IV_CRITERIA,
    skillLevels: reachRadar,
    lastMockAtMs: null,
    now: NOW,
    ...overrides,
  });

  it('fires, and the step names the mock and the company', () => {
    const r = computeNextStep(ivGoal(), reachData(), opts());
    expect(r.step).toEqual({
      id: MOCK_OFFER_STEP_ID,
      type: 'mock_interview',
      interviewId: 'test-mock',
      company: 'Test Co',
    });
    expect(r.step.id).toBe('__mock_interview');
    expect(r.reason).toBe(MOCK_OFFER_REASON);
    expect(r.graduated).toBe(false);
  });

  it('keeps the curriculum progress % while standing in for a step', () => {
    const r = computeNextStep(ivGoal(), mkUserData({
      coachState: { goalId: MOCK_OFFER_GOAL_ID, startedAt: '2026-04-01T00:00:00Z', stepsCompleted: ['iv-a'] },
      challengeAttempts: solves(7, 3),
    }), opts());
    expect(r.step.id).toBe(MOCK_OFFER_STEP_ID);
    expect(r.progressPct).toBe(50);
  });

  it('(2) is never offered to a free user — the Coach\'s one next step is not a Pro wall', () => {
    const r = computeNextStep(ivGoal(), reachData(), opts({ isPro: false }));
    expect(r.step.id).toBe('iv-a');
    expect(computeNextStep(ivGoal(), reachData(), opts({ isPro: undefined })).step.id).toBe('iv-a');
  });

  it('(3) fires on the interview goal with no company named', () => {
    const r = computeNextStep(ivGoal(), reachData(), opts({ prepTargetCompany: null }));
    expect(r.step.id).toBe(MOCK_OFFER_STEP_ID);
  });

  it('(3) fires on ANY goal once a company is named, measured against the criteria passed in', () => {
    const otherGoal = { id: 'fundamentals', name: 'F', curriculum: ivGoal().curriculum, exitCriteria: IV_CRITERIA };
    expect(computeNextStep(otherGoal, reachData(), opts()).step.id).toBe(MOCK_OFFER_STEP_ID);
    // …and not at all when neither arm holds.
    expect(computeNextStep(otherGoal, reachData(), opts({ prepTargetCompany: '   ' })).step.id).toBe('iv-a');
    expect(computeNextStep(otherGoal, reachData(), opts({ prepTargetCompany: null })).step.id).toBe('iv-a');
  });

  it('(3) mockCriteria overrides the active goal, so a soft goal cannot lower the interview bar', () => {
    // Fundamentals' own criteria at 0.8 are trivially met by this user; if the
    // rule read the ACTIVE goal instead of mockCriteria, the mock would be
    // offered to someone measured against Querying Basics 40.
    const soft = {
      id: 'fundamentals', name: 'F', curriculum: ivGoal().curriculum,
      // Easy 6 required against 5 solved: NOT graduated, but comfortably
      // inside 0.8 of its own bar (ceil(4.8) = 5).
      exitCriteria: { skillThresholds: { 'Querying Basics': 50 }, challengesSolved: { Easy: 6 } },
    };
    const weak = mkUserData({
      coachState: { goalId: 'fundamentals', startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
      challengeAttempts: solves(0, 0).concat((() => {
        const t = new Date('2026-04-05T00:00:00Z').getTime();
        return Array.from({ length: 5 }, (_, i) => ({ challengeId: 700 + i, success: true, difficulty: 'Easy', timestamp: t + i }));
      })()),
    });
    const soften = { skillLevels: { 'Querying Basics': 90 } };
    // Reading the goal's own criteria WOULD fire…
    expect(computeNextStep(soft, weak, opts({ ...soften, mockCriteria: null })).step.id).toBe(MOCK_OFFER_STEP_ID);
    // …but the interview bar, which is what app.jsx passes, does not.
    expect(computeNextStep(soft, weak, opts({ ...soften })).step.id).toBe('iv-a');
  });

  it('(4) one point under any single threshold and it does not fire', () => {
    for (const [skill, floor] of [['Window Functions', 56], ['Joins', 52], ['Subqueries & CTEs', 48]]) {
      const under = computeNextStep(ivGoal(), reachData(), opts({
        skillLevels: { ...reachRadar, [skill]: floor - 1 },
      }));
      expect(under.step.id, `${skill} at ${floor - 1} must not fire`).toBe('iv-a');
      const at = computeNextStep(ivGoal(), reachData(), opts({
        skillLevels: { ...reachRadar, [skill]: floor },
      }));
      expect(at.step.id, `${skill} at ${floor} must fire`).toBe(MOCK_OFFER_STEP_ID);
    }
  });

  it('(4) counts round UP: 6 Hard is not enough, 7 is — and 3 Medium, not 2', () => {
    const six = mkUserData({
      coachState: { goalId: MOCK_OFFER_GOAL_ID, startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
      challengeAttempts: solves(6, 3),
    });
    expect(computeNextStep(ivGoal(), six, opts()).step.id).toBe('iv-a');
    expect(computeNextStep(ivGoal(), reachData(), opts()).step.id).toBe(MOCK_OFFER_STEP_ID);
    const twoMedium = mkUserData({
      coachState: { goalId: MOCK_OFFER_GOAL_ID, startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
      challengeAttempts: solves(7, 2),
    });
    expect(computeNextStep(ivGoal(), twoMedium, opts()).step.id).toBe('iv-a');
  });

  it('(4) reach must be under 1 — at 1 the user has graduated and the rule is dead code', () => {
    expect(MOCK_OFFER_REACH).toBe(0.8);
    expect(MOCK_OFFER_REACH).toBeLessThan(1);
    const args = {
      exitCriteria: IV_CRITERIA,
      skillLevels: { 'Window Functions': 100, 'Joins': 100, 'Subqueries & CTEs': 100 },
      challengeAttempts: solves(20, 20),
      startedAtMs: 0,
    };
    expect(exitCriteriaWithinReach({ ...args, reach: 1 })).toBe(false);
    expect(exitCriteriaWithinReach({ ...args, reach: 1.5 })).toBe(false);
    expect(exitCriteriaWithinReach({ ...args, reach: 0 })).toBe(false);
    expect(exitCriteriaWithinReach({ ...args, reach: 0.8 })).toBe(true);
    // …and graduation still wins over the offer, which is why that matters.
    const gradData = mkUserData({
      coachState: { goalId: MOCK_OFFER_GOAL_ID, startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [] },
      challengeAttempts: solves(8, 3),
    });
    const r = computeNextStep(ivGoal(), gradData, opts({
      skillLevels: { 'Window Functions': 70, 'Joins': 65, 'Subqueries & CTEs': 60 },
    }));
    expect(r.graduated).toBe(true);
    expect(r.step).toBeNull();
  });

  it('(4) fails closed on a goal with no exit criteria at all', () => {
    const noCriteria = { id: MOCK_OFFER_GOAL_ID, name: 'x', curriculum: ivGoal().curriculum };
    expect(computeNextStep(noCriteria, reachData(), opts({ mockCriteria: null })).step.id).toBe('iv-a');
    expect(exitCriteriaWithinReach({})).toBe(false);
    expect(exitCriteriaWithinReach({ exitCriteria: {} })).toBe(false);
  });

  it('(4) scaleExitCriteria scales thresholds and ceils counts', () => {
    expect(scaleExitCriteria(IV_CRITERIA, 0.8)).toEqual({
      skillThresholds: { 'Window Functions': 56, 'Joins': 52, 'Subqueries & CTEs': 48 },
      challengesSolved: { Medium: 3, Hard: 7 },
    });
    expect(scaleExitCriteria(null)).toBeNull();
  });

  it('(5) the cooldown holds for 14 days after a sitting, then releases', () => {
    expect(MOCK_OFFER_COOLDOWN_DAYS).toBe(14);
    const day = 24 * 60 * 60 * 1000;
    const justSat = computeNextStep(ivGoal(), reachData(), opts({ lastMockAtMs: NOW - (13 * day) }));
    expect(justSat.step.id).toBe('iv-a');
    const boundary = computeNextStep(ivGoal(), reachData(), opts({ lastMockAtMs: NOW - (14 * day) }));
    expect(boundary.step.id).toBe(MOCK_OFFER_STEP_ID);
    const older = computeNextStep(ivGoal(), reachData(), opts({ lastMockAtMs: NOW - (40 * day) }));
    expect(older.step.id).toBe(MOCK_OFFER_STEP_ID);
    // Never sat at all is not a recent sitting.
    for (const v of [null, undefined, 0, NaN, 'yesterday']) {
      expect(computeNextStep(ivGoal(), reachData(), opts({ lastMockAtMs: v })).step.id).toBe(MOCK_OFFER_STEP_ID);
    }
  });

  it('is silent without a mock to offer', () => {
    expect(computeNextStep(ivGoal(), reachData(), opts({ mockTarget: null })).step.id).toBe('iv-a');
    expect(computeNextStep(ivGoal(), reachData(), opts({ mockTarget: { company: 'X' } })).step.id).toBe('iv-a');
    expect(computeNextStep(ivGoal(), reachData(), opts({ mockTarget: { mockId: '' } })).step.id).toBe('iv-a');
  });

  it('names no company or mock id of its own — the caller supplies both', () => {
    const r = computeNextStep(ivGoal(), reachData(), opts({
      mockTarget: { company: 'Somewhere Else', mockId: 'another-mock' },
    }));
    expect(r.step.interviewId).toBe('another-mock');
    expect(r.step.company).toBe('Somewhere Else');
  });

  it('is once per session — app.jsx owns the flag, the engine only reads it', () => {
    expect(computeNextStep(ivGoal(), reachData(), opts({ sessionMockOffered: true })).step.id).toBe('iv-a');
  });

  it('a pending retrieval_check and a pending placement_check both keep priority', () => {
    const retrieval = {
      id: MOCK_OFFER_GOAL_ID, name: 'r', exitCriteria: IV_CRITERIA,
      curriculum: [{ id: 'rc', type: 'retrieval_check', sourceLessonId: 2, skill: 'Joins', minDaysSince: 1 }],
    };
    expect(computeNextStep(retrieval, reachData(), opts()).step.id).toBe('rc');
    const placing = mkUserData({
      coachState: {
        goalId: MOCK_OFFER_GOAL_ID, startedAt: '2026-04-01T00:00:00Z', stepsCompleted: [],
        placement: { challengeIds: [10, 20, 30, 40, 50], minAnswered: 5, skipped: false },
      },
      challengeAttempts: solves(7, 3),
    });
    expect(computeNextStep(ivGoal(), placing, opts()).step.id).toBe('__placement');
  });

  it('may stand in for "curriculum complete" too', () => {
    const done = mkUserData({
      coachState: { goalId: MOCK_OFFER_GOAL_ID, startedAt: '2026-04-01T00:00:00Z', stepsCompleted: ['iv-a', 'iv-b'] },
      challengeAttempts: solves(7, 3),
    });
    const r = computeNextStep(ivGoal(), done, opts());
    expect(r.step.id).toBe(MOCK_OFFER_STEP_ID);
    expect(r.progressPct).toBe(100);
  });

  it('the hard preview wins when both could fire — the free Hard preview goes first', () => {
    // Contrived: isPro is read by both rules with opposite senses, so this can
    // only happen if one of those gates is ever relaxed. The ordering is the
    // guard, and this pins it.
    const previewBank = [{ id: 23, difficulty: 'Hard', freePreview: true }];
    const bothArmed = { ...opts(), isPro: false, previewChallenges: previewBank, solvedChallenges: new Set(), skillLevels: { ...reachRadar, 'Window Functions': 70 } };
    const r = computeNextStep(ivGoal(), reachData(), bothArmed);
    expect(r.step.id).toBe(HARD_PREVIEW_STEP_ID);
  });

  it('the mock step never enters the curriculum walk — isStepComplete says false', () => {
    // It is synthetic. If it were ever authored into goals.js, coach-validate
    // would reject it as an unknown type and this keeps it from silently
    // "completing" in the meantime.
    expect(isStepComplete({ id: MOCK_OFFER_STEP_ID, type: 'mock_interview', interviewId: 'test-mock' }, {})).toBe(false);
    const issues = validateGoalRegistry({
      goals: [{ id: 'g', curriculum: [{ id: 'm1', type: 'mock_interview', interviewId: 'test-mock' }] }],
    });
    expect(issues.some(i => /unknown step type "mock_interview"/.test(i.message))).toBe(true);
  });

  it('binds to the live registry: interview-prep exists, has exit criteria, and reaches no mock of its own', () => {
    const live = (goalsRegistry() || []).find(g => g.id === MOCK_OFFER_GOAL_ID);
    expect(live, 'the interview-prep goal is gone — MOCK_OFFER_GOAL_ID is stale').toBeTruthy();
    expect(live.exitCriteria?.skillThresholds).toBeTruthy();
    expect(live.exitCriteria?.challengesSolved).toBeTruthy();
    // The gap this rule exists to close: no curriculum step is a rehearsal.
    expect(live.curriculum.some(s => s.type === 'mock_interview')).toBe(false);
    // And the scaled bar against the LIVE criteria is the one documented.
    expect(scaleExitCriteria(live.exitCriteria, MOCK_OFFER_REACH)).toEqual({
      skillThresholds: { 'Window Functions': 56, 'Joins': 52, 'Subqueries & CTEs': 48 },
      challengesSolved: { Medium: 3, Hard: 7 },
    });
  });
});
