import { describe, it, expect } from 'vitest';
import {
  DRILL_SIZE,
  DRILL_TARGET,
  challengeMatchesSkill,
  buildDrillQueue,
  pickWeakestSkill
} from '../src/utils/skill-drill.js';

const NOW = new Date('2026-04-15T12:00:00Z').getTime();
const daysAgo = (d) => NOW - d * 86400000;

// Minimal challenge factory
const ch = (id, {
  difficulty = 'Medium',
  skills = [],
  category = null
} = {}) => ({ id, difficulty, skills, category });

describe('challengeMatchesSkill', () => {
  it('matches on challenge.skills tag that resolves to canonical', () => {
    const c = ch('c1', { skills: ['CASE'] });
    expect(challengeMatchesSkill(c, 'Conditional Logic')).toBe(true);
  });

  it('matches on challenge.category', () => {
    const c = ch('c2', { category: 'GROUP BY' });
    expect(challengeMatchesSkill(c, 'Aggregation & Grouping')).toBe(true);
  });

  it('matches a variant tag that maps to the canonical skill', () => {
    // ROW_NUMBER should resolve to Window Functions
    const c = ch('c3', { skills: ['ROW_NUMBER'] });
    expect(challengeMatchesSkill(c, 'Window Functions')).toBe(true);
  });

  it('returns false when no tag resolves to the skill', () => {
    const c = ch('c4', { skills: ['SELECT'] });
    expect(challengeMatchesSkill(c, 'Window Functions')).toBe(false);
  });

  it('returns false for null/empty inputs', () => {
    expect(challengeMatchesSkill(null, 'Conditional Logic')).toBe(false);
    expect(challengeMatchesSkill(ch('c5'), null)).toBe(false);
    expect(challengeMatchesSkill(ch('c5'), 'Conditional Logic')).toBe(false);
  });
});

describe('buildDrillQueue — empty / no matches', () => {
  it('returns empty array when no challenges match', () => {
    const pool = [ch('c1', { skills: ['SELECT'] })];
    expect(buildDrillQueue('Window Functions', pool, new Set(), [])).toEqual([]);
  });

  it('returns empty array for empty pool', () => {
    expect(buildDrillQueue('Conditional Logic', [], new Set(), [])).toEqual([]);
  });
});

describe('buildDrillQueue — ordering', () => {
  it('puts unsolved challenges first, easy → hard', () => {
    const pool = [
      ch('hard', { skills: ['CASE'], difficulty: 'Hard' }),
      ch('easy', { skills: ['CASE'], difficulty: 'Easy' }),
      ch('med', { skills: ['CASE'], difficulty: 'Medium' })
    ];
    const queue = buildDrillQueue('Conditional Logic', pool, new Set(), []);
    expect(queue.map(c => c.id)).toEqual(['easy', 'med', 'hard']);
  });

  it('puts previously-failed-then-solved challenges after unsolved', () => {
    const pool = [
      ch('unsolved', { skills: ['CASE'], difficulty: 'Easy' }),
      ch('replay', { skills: ['CASE'], difficulty: 'Easy' }),
      ch('clean', { skills: ['CASE'], difficulty: 'Easy' })
    ];
    const solved = new Set(['replay', 'clean']);
    const attempts = [
      { challengeId: 'replay', success: false, timestamp: daysAgo(10) },
      { challengeId: 'replay', success: true, timestamp: daysAgo(5) },
      { challengeId: 'clean', success: true, timestamp: daysAgo(2) }
    ];
    const queue = buildDrillQueue('Conditional Logic', pool, solved, attempts);
    // unsolved first, then replay (had a failure), then clean
    expect(queue.map(c => c.id)).toEqual(['unsolved', 'replay', 'clean']);
  });

  it('caps queue at DRILL_SIZE by default', () => {
    const pool = Array.from({ length: 10 }, (_, i) =>
      ch(`c${i}`, { skills: ['CASE'], difficulty: 'Easy' })
    );
    const queue = buildDrillQueue('Conditional Logic', pool, new Set(), []);
    expect(queue).toHaveLength(DRILL_SIZE);
  });

  it('respects custom size option', () => {
    const pool = Array.from({ length: 10 }, (_, i) =>
      ch(`c${i}`, { skills: ['CASE'] })
    );
    const queue = buildDrillQueue('Conditional Logic', pool, new Set(), [], { size: 3 });
    expect(queue).toHaveLength(3);
  });

  it('returns unique challenges (no duplicates)', () => {
    const pool = [
      ch('c1', { skills: ['CASE', 'Expressions'] }), // multiple tags, same skill
      ch('c2', { skills: ['CASE'] })
    ];
    const queue = buildDrillQueue('Conditional Logic', pool, new Set(), []);
    const ids = queue.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts replay-failed by oldest attempt first within same difficulty', () => {
    const pool = [
      ch('recent', { skills: ['CASE'], difficulty: 'Easy' }),
      ch('older', { skills: ['CASE'], difficulty: 'Easy' })
    ];
    const solved = new Set(['recent', 'older']);
    const attempts = [
      { challengeId: 'recent', success: false, timestamp: daysAgo(1) },
      { challengeId: 'recent', success: true, timestamp: daysAgo(1) },
      { challengeId: 'older', success: false, timestamp: daysAgo(30) },
      { challengeId: 'older', success: true, timestamp: daysAgo(30) }
    ];
    const queue = buildDrillQueue('Conditional Logic', pool, solved, attempts);
    expect(queue.map(c => c.id)).toEqual(['older', 'recent']);
  });

  it('accepts solvedChallenges as an array too', () => {
    const pool = [ch('c1', { skills: ['CASE'] })];
    const queue = buildDrillQueue('Conditional Logic', pool, ['c1'], []);
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('c1');
  });
});

describe('buildDrillQueue — currentLevel-aware ordering', () => {
  it('defaults to easy-first when currentLevel is low / unspecified', () => {
    const pool = [
      ch('hard', { skills: ['CASE'], difficulty: 'Hard' }),
      ch('easy', { skills: ['CASE'], difficulty: 'Easy' }),
      ch('med', { skills: ['CASE'], difficulty: 'Medium' }),
    ];
    const q = buildDrillQueue('Conditional Logic', pool, new Set(), [], { currentLevel: 30 });
    expect(q.map(c => c.id)).toEqual(['easy', 'med', 'hard']);
  });

  it('flips to hard-first when currentLevel >= 60', () => {
    const pool = [
      ch('hard', { skills: ['CASE'], difficulty: 'Hard' }),
      ch('easy', { skills: ['CASE'], difficulty: 'Easy' }),
      ch('med', { skills: ['CASE'], difficulty: 'Medium' }),
    ];
    const q = buildDrillQueue('Conditional Logic', pool, new Set(), [], { currentLevel: 65 });
    expect(q.map(c => c.id)).toEqual(['hard', 'med', 'easy']);
  });

  it('strips Easy challenges when currentLevel >= 80 AND non-Easy exist', () => {
    const pool = [
      ch('hard', { skills: ['CASE'], difficulty: 'Hard' }),
      ch('easy', { skills: ['CASE'], difficulty: 'Easy' }),
      ch('med', { skills: ['CASE'], difficulty: 'Medium' }),
    ];
    const q = buildDrillQueue('Conditional Logic', pool, new Set(), [], { currentLevel: 85 });
    expect(q.map(c => c.id)).toEqual(['hard', 'med']);
    expect(q.map(c => c.difficulty)).not.toContain('Easy');
  });

  it('keeps Easy when it is the only option even at currentLevel 85', () => {
    // Edge case: user at 85 on a sparse skill where we only have Easy
    // challenges. Serve Easy rather than nothing.
    const pool = [
      ch('easy1', { skills: ['CASE'], difficulty: 'Easy' }),
      ch('easy2', { skills: ['CASE'], difficulty: 'Easy' }),
    ];
    const q = buildDrillQueue('Conditional Logic', pool, new Set(), [], { currentLevel: 85 });
    expect(q).toHaveLength(2);
  });

  it('uses hard-first for repeat/solved queue at high level', () => {
    const pool = [
      ch('h', { skills: ['CASE'], difficulty: 'Hard' }),
      ch('e', { skills: ['CASE'], difficulty: 'Easy' }),
      ch('m', { skills: ['CASE'], difficulty: 'Medium' }),
    ];
    // All solved, so we're in the re-solve bucket
    const solved = new Set(['h', 'e', 'm']);
    const q = buildDrillQueue('Conditional Logic', pool, solved, [], { currentLevel: 70 });
    // Hard first even for repeats, because the user's drill can't climb on Easy re-solves
    expect(q[0].id).toBe('h');
  });
});

describe('pickWeakestSkill', () => {
  it('picks the lowest non-zero skill below target', () => {
    const skills = {
      'SELECT Basics': 80,
      'Conditional Logic': 10,
      'Aggregation & Grouping': 35,
      'Window Functions': 0
    };
    // CASE=10 is the weakest non-zero
    expect(pickWeakestSkill(skills)).toBe('Conditional Logic');
  });

  it('ignores zero skills (untouched territory)', () => {
    const skills = {
      'SELECT Basics': 0,
      'Conditional Logic': 40
    };
    expect(pickWeakestSkill(skills)).toBe('Conditional Logic');
  });

  it('falls back to lowest overall when all are at 0', () => {
    const skills = {
      'SELECT Basics': 0,
      'Conditional Logic': 0
    };
    // Not null — pick the lowest entry
    const pick = pickWeakestSkill(skills);
    expect(pick === 'SELECT Basics' || pick === 'Conditional Logic').toBe(true);
  });

  it('falls back to lowest overall when all are at/above target', () => {
    const skills = {
      'SELECT Basics': 95,
      'Conditional Logic': 70,
      'Aggregation & Grouping': 80
    };
    expect(pickWeakestSkill(skills)).toBe('Conditional Logic');
  });

  it('respects custom target threshold', () => {
    const skills = {
      'SELECT Basics': 50,
      'Conditional Logic': 75
    };
    // Default 60 target: SELECT=50 is below, picks it
    expect(pickWeakestSkill(skills)).toBe('SELECT Basics');
    // Custom 80 target: both below, picks lower (SELECT)
    expect(pickWeakestSkill(skills, { target: 80 })).toBe('SELECT Basics');
    // Custom 40 target: both above — fallback to lowest
    expect(pickWeakestSkill(skills, { target: 40 })).toBe('SELECT Basics');
  });

  it('returns null for empty input', () => {
    expect(pickWeakestSkill({})).toBe(null);
  });
});

describe('constants', () => {
  it('DRILL_SIZE is 5', () => {
    expect(DRILL_SIZE).toBe(5);
  });

  it('DRILL_TARGET is 60', () => {
    expect(DRILL_TARGET).toBe(60);
  });
});
