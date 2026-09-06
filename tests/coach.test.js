import { describe, it, expect } from 'vitest';
import {
  computeNextStep, isStepComplete, matchesSkipIf, isGoalGraduated,
  pickHardPreviewStep, hasAdvancedSkillAtOrAbove,
  HARD_PREVIEW_MIN_ADVANCED, HARD_PREVIEW_STEP_ID, HARD_PREVIEW_MARKER, HARD_PREVIEW_REASON,
  HARD_PREVIEW_ADVANCED_SKILLS,
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
