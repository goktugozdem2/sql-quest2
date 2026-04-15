import { describe, it, expect } from 'vitest';
import {
  CANONICAL_SKILLS,
  HALF_LIVES,
  mapTopicToSkill,
  calculateSkillLevels
} from '../src/utils/skill-calc.js';

// Fixed clock so time-decay tests are deterministic.
const NOW = new Date('2026-04-15T12:00:00Z').getTime();
const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();

describe('CANONICAL_SKILLS', () => {
  it('has exactly 10 skills', () => {
    expect(CANONICAL_SKILLS).toHaveLength(10);
  });

  it('includes all radar chart skills', () => {
    expect(CANONICAL_SKILLS).toContain('SELECT Basics');
    expect(CANONICAL_SKILLS).toContain('JOIN Tables');
    expect(CANONICAL_SKILLS).toContain('Window Functions');
  });
});

describe('HALF_LIVES', () => {
  it('reviews decay fastest', () => {
    expect(HALF_LIVES.review).toBeLessThan(HALF_LIVES.challengeAttempt);
    expect(HALF_LIVES.review).toBeLessThan(HALF_LIVES.boss);
  });

  it('completion decays slowest', () => {
    expect(HALF_LIVES.completion).toBeGreaterThan(HALF_LIVES.challengeAttempt);
    expect(HALF_LIVES.completion).toBeGreaterThan(HALF_LIVES.boss);
  });

  it('boss wins stay fresher than regular attempts', () => {
    expect(HALF_LIVES.boss).toBeGreaterThan(HALF_LIVES.challengeAttempt);
  });
});

describe('mapTopicToSkill', () => {
  it('maps exact matches', () => {
    expect(mapTopicToSkill('GROUP BY')).toBe('GROUP BY');
    expect(mapTopicToSkill('JOIN Tables')).toBe('JOIN Tables');
  });

  it('maps variants to canonical', () => {
    expect(mapTopicToSkill('INNER JOIN')).toBe('JOIN Tables');
    expect(mapTopicToSkill('HAVING')).toBe('GROUP BY');
    expect(mapTopicToSkill('Subquery')).toBe('Subqueries');
  });

  it('falls back to partial match', () => {
    expect(mapTopicToSkill('Window Aggregates')).toBe('Window Functions');
  });

  it('returns null for unknown topic', () => {
    expect(mapTopicToSkill('Quantum Flux')).toBe(null);
    expect(mapTopicToSkill('')).toBe(null);
    expect(mapTopicToSkill(null)).toBe(null);
  });
});

describe('calculateSkillLevels — empty inputs', () => {
  it('returns all zeros for empty user', () => {
    const skills = calculateSkillLevels({}, { now: NOW });
    expect(Object.keys(skills)).toHaveLength(10);
    CANONICAL_SKILLS.forEach(s => {
      expect(skills[s]).toBe(0);
    });
  });

  it('never returns NaN or undefined', () => {
    const skills = calculateSkillLevels({}, { now: NOW });
    Object.values(skills).forEach(v => {
      expect(typeof v).toBe('number');
      expect(Number.isFinite(v)).toBe(true);
    });
  });
});

describe('calculateSkillLevels — confidence dampener', () => {
  it('dampens score when data is thin', () => {
    // One perfect challenge attempt — should NOT give 100.
    const skills = calculateSkillLevels({
      challengeAttempts: [
        { topic: 'GROUP BY', success: true, timestamp: daysAgo(1) }
      ]
    }, { now: NOW });
    expect(skills['GROUP BY']).toBeGreaterThan(0);
    expect(skills['GROUP BY']).toBeLessThan(50);
  });

  it('reaches full confidence at 4 data points', () => {
    // Four perfect attempts should push confidence to 1.0.
    const attempts = [0, 1, 2, 3].map(d => ({
      topic: 'GROUP BY', success: true, timestamp: daysAgo(d)
    }));
    const skills = calculateSkillLevels({
      challengeAttempts: attempts
    }, { now: NOW });
    // Confidence * (success 55% + difficulty 0% + completion 0%) — but we have
    // no difficulty signal and no completion, so the score should be mostly
    // driven by success rate × confidence.
    expect(skills['GROUP BY']).toBeGreaterThan(40);
  });
});

describe('calculateSkillLevels — hint penalty', () => {
  it('penalizes hint-assisted success vs clean success', () => {
    const ts = daysAgo(1);
    const clean = calculateSkillLevels({
      challengeAttempts: [
        { topic: 'JOIN', success: true, timestamp: ts },
        { topic: 'JOIN', success: true, timestamp: ts },
        { topic: 'JOIN', success: true, timestamp: ts },
        { topic: 'JOIN', success: true, timestamp: ts }
      ]
    }, { now: NOW });

    const withHints = calculateSkillLevels({
      challengeAttempts: [
        { topic: 'JOIN', success: true, hintsUsed: true, timestamp: ts },
        { topic: 'JOIN', success: true, hintsUsed: true, timestamp: ts },
        { topic: 'JOIN', success: true, hintsUsed: true, timestamp: ts },
        { topic: 'JOIN', success: true, hintsUsed: true, timestamp: ts }
      ]
    }, { now: NOW });

    expect(clean['JOIN Tables']).toBeGreaterThan(withHints['JOIN Tables']);
  });

  it('penalizes answer-shown heavier than hints', () => {
    const ts = daysAgo(1);
    const hints = calculateSkillLevels({
      challengeAttempts: Array(4).fill({ topic: 'JOIN', success: true, hintsUsed: true, timestamp: ts })
    }, { now: NOW });
    const shown = calculateSkillLevels({
      challengeAttempts: Array(4).fill({ topic: 'JOIN', success: true, answerShown: true, timestamp: ts })
    }, { now: NOW });
    expect(hints['JOIN Tables']).toBeGreaterThan(shown['JOIN Tables']);
  });
});

describe('calculateSkillLevels — time decay per signal', () => {
  it('old review decays faster than old boss win', () => {
    // Both events 30 days ago. Review half-life 14, boss half-life 45.
    // Review should be at ~0.25 weight, boss at ~0.63.
    const withReview = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'review_success',
        skillKey: 'JOIN Tables',
        timestamp: daysAgo(30),
        payload: { quality: 5 }
      })
    }, { now: NOW });

    const withBoss = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'boss_defeat',
        skillKey: 'JOIN Tables',
        timestamp: daysAgo(30)
      })
    }, { now: NOW });

    // 4 boss wins at 30d stale should outweigh 4 review successes at 30d stale,
    // even without boss's extra difficulty credit, because boss decays slower.
    expect(withBoss['JOIN Tables']).toBeGreaterThan(withReview['JOIN Tables']);
  });

  it('recent event scores higher than old event', () => {
    const recent = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'boss_defeat', skillKey: 'GROUP BY', timestamp: daysAgo(1)
      })
    }, { now: NOW });

    const old = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'boss_defeat', skillKey: 'GROUP BY', timestamp: daysAgo(90)
      })
    }, { now: NOW });

    expect(recent['GROUP BY']).toBeGreaterThan(old['GROUP BY']);
  });
});

describe('calculateSkillLevels — completion staleness', () => {
  it('recently solved challenge scores higher than stale solve', () => {
    const allChallenges = [
      { id: 'c1', category: 'GROUP BY', difficulty: 'Medium', skills: ['GROUP BY'] }
    ];

    const fresh = calculateSkillLevels({
      solvedChallenges: new Set(['c1']),
      challengeAttempts: [
        { topic: 'GROUP BY', success: true, timestamp: daysAgo(2) }
      ]
    }, { allChallenges, now: NOW });

    const stale = calculateSkillLevels({
      solvedChallenges: new Set(['c1']),
      challengeAttempts: [
        { topic: 'GROUP BY', success: true, timestamp: daysAgo(180) }
      ]
    }, { allChallenges, now: NOW });

    expect(fresh['GROUP BY']).toBeGreaterThan(stale['GROUP BY']);
  });
});

describe('calculateSkillLevels — performance event types', () => {
  it('boss_defeat contributes to the skill', () => {
    const skills = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'boss_defeat', skillKey: 'Subqueries', timestamp: daysAgo(1)
      })
    }, { now: NOW });
    expect(skills['Subqueries']).toBeGreaterThan(30);
  });

  it('weakness_failed does not boost score', () => {
    const failed = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'weakness_failed', skillKey: 'Window Functions', timestamp: daysAgo(1),
        payload: { level: 2, difficultyWeight: 2 }
      })
    }, { now: NOW });
    expect(failed['Window Functions']).toBeLessThanOrEqual(5);
  });

  it('review_success with quality=5 > quality=3', () => {
    const perfect = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'review_success', skillKey: 'CASE Statements', timestamp: daysAgo(1),
        payload: { quality: 5 }
      })
    }, { now: NOW });
    const struggled = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'review_success', skillKey: 'CASE Statements', timestamp: daysAgo(1),
        payload: { quality: 3 }
      })
    }, { now: NOW });
    expect(perfect['CASE Statements']).toBeGreaterThan(struggled['CASE Statements']);
  });

  it('ignores events with unknown skillKey', () => {
    const skills = calculateSkillLevels({
      performanceEvents: [
        { type: 'boss_defeat', skillKey: 'NonExistent', timestamp: daysAgo(1) }
      ]
    }, { now: NOW });
    // All skills should still be 0 since the event matched nothing.
    CANONICAL_SKILLS.forEach(s => expect(skills[s]).toBe(0));
  });
});

describe('calculateSkillLevels — score bounds', () => {
  it('never exceeds 100', () => {
    // Throw a huge volume of perfect events at one skill.
    const events = Array(100).fill(null).map((_, i) => ({
      type: 'boss_defeat',
      skillKey: 'SELECT',
      timestamp: daysAgo(0)
    }));
    const skills = calculateSkillLevels({ performanceEvents: events }, { now: NOW });
    Object.values(skills).forEach(v => {
      expect(v).toBeLessThanOrEqual(100);
      expect(v).toBeGreaterThanOrEqual(0);
    });
  });

  it('returns integer values', () => {
    const skills = calculateSkillLevels({
      performanceEvents: [
        { type: 'boss_defeat', skillKey: 'GROUP BY', timestamp: daysAgo(3) }
      ]
    }, { now: NOW });
    Object.values(skills).forEach(v => {
      expect(Number.isInteger(v)).toBe(true);
    });
  });
});

describe('calculateSkillLevels — regression guard for dual-state bug', () => {
  it('is deterministic: same inputs produce same outputs', () => {
    const inputs = {
      performanceEvents: [
        { type: 'boss_defeat', skillKey: 'JOIN', timestamp: daysAgo(5) },
        { type: 'weakness_passed', skillKey: 'GROUP BY', timestamp: daysAgo(2), payload: { difficultyWeight: 2, timeTaken: 60 } },
        { type: 'review_success', skillKey: 'Subqueries', timestamp: daysAgo(1), payload: { quality: 4 } }
      ],
      challengeAttempts: [
        { topic: 'JOIN', success: true, timestamp: daysAgo(3) }
      ]
    };
    const a = calculateSkillLevels(inputs, { now: NOW });
    const b = calculateSkillLevels(inputs, { now: NOW });
    expect(a).toEqual(b);
  });

  it('new user with no default 30 seeding returns 0 everywhere', () => {
    // Regression: default was 30 for all skills, causing phantom mastery.
    // The pure function should never introduce such a default.
    const skills = calculateSkillLevels({}, { now: NOW });
    CANONICAL_SKILLS.forEach(s => {
      expect(skills[s]).toBe(0);
    });
  });
});
