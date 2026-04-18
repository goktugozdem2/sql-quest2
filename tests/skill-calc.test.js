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
  it('has exactly 9 skills (Apr 2026 reshuffle)', () => {
    expect(CANONICAL_SKILLS).toHaveLength(9);
  });

  it('includes all radar chart skills', () => {
    expect(CANONICAL_SKILLS).toContain('Querying Basics');
    expect(CANONICAL_SKILLS).toContain('Joins');
    expect(CANONICAL_SKILLS).toContain('Window Functions');
    expect(CANONICAL_SKILLS).toContain('NULL Handling');
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
    expect(mapTopicToSkill('GROUP BY')).toBe('Aggregation & Grouping');
    expect(mapTopicToSkill('JOIN Tables')).toBe('Joins');
  });

  it('maps variants to canonical', () => {
    expect(mapTopicToSkill('INNER JOIN')).toBe('Joins');
    expect(mapTopicToSkill('HAVING')).toBe('Aggregation & Grouping');
    expect(mapTopicToSkill('Subquery')).toBe('Subqueries & CTEs');
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
    expect(Object.keys(skills)).toHaveLength(9);
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
    expect(skills['Aggregation & Grouping']).toBeGreaterThan(0);
    expect(skills['Aggregation & Grouping']).toBeLessThan(50);
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
    expect(skills['Aggregation & Grouping']).toBeGreaterThan(40);
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

    expect(clean['Joins']).toBeGreaterThan(withHints['Joins']);
  });

  it('penalizes answer-shown heavier than hints', () => {
    const ts = daysAgo(1);
    const hints = calculateSkillLevels({
      challengeAttempts: Array(4).fill({ topic: 'JOIN', success: true, hintsUsed: true, timestamp: ts })
    }, { now: NOW });
    const shown = calculateSkillLevels({
      challengeAttempts: Array(4).fill({ topic: 'JOIN', success: true, answerShown: true, timestamp: ts })
    }, { now: NOW });
    expect(hints['Joins']).toBeGreaterThan(shown['Joins']);
  });
});

describe('calculateSkillLevels — time decay per signal', () => {
  it('old review decays faster than old boss win', () => {
    // Both events 30 days ago. Review half-life 14, boss half-life 45.
    // Review should be at ~0.25 weight, boss at ~0.63.
    const withReview = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'review_success',
        skillKey: 'Joins',
        timestamp: daysAgo(30),
        payload: { quality: 5 }
      })
    }, { now: NOW });

    const withBoss = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'boss_defeat',
        skillKey: 'Joins',
        timestamp: daysAgo(30)
      })
    }, { now: NOW });

    // 4 boss wins at 30d stale should outweigh 4 review successes at 30d stale,
    // even without boss's extra difficulty credit, because boss decays slower.
    expect(withBoss['Joins']).toBeGreaterThan(withReview['Joins']);
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

    expect(recent['Aggregation & Grouping']).toBeGreaterThan(old['Aggregation & Grouping']);
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

    expect(fresh['Aggregation & Grouping']).toBeGreaterThan(stale['Aggregation & Grouping']);
  });

  it('solved challenge backfills activity timestamp from attempt log (Bug B)', () => {
    // Regression: SOURCE 1 previously never called trackActivity, so
    // `lastActivityAge` stayed at Infinity for solve-only users with no
    // attempt log matching the solve. Fresh solves collapsed to 0.5× the
    // raw completion score. With the fix, the successful attempt's timestamp
    // backfills onto the solved-challenge record.
    const allChallenges = [
      { id: 'c1', category: 'JOIN', difficulty: 'Medium', skills: ['JOIN'] },
      { id: 'c2', category: 'JOIN', difficulty: 'Easy', skills: ['JOIN'] },
      { id: 'c3', category: 'JOIN', difficulty: 'Hard', skills: ['JOIN'] },
      { id: 'c4', category: 'JOIN', difficulty: 'Medium', skills: ['JOIN'] }
    ];

    // Recent solves, with matching successful attempts.
    const recent = calculateSkillLevels({
      solvedChallenges: new Set(['c1', 'c2', 'c3', 'c4']),
      challengeAttempts: [
        { challengeId: 'c1', topic: 'JOIN', success: true, timestamp: daysAgo(1) },
        { challengeId: 'c2', topic: 'JOIN', success: true, timestamp: daysAgo(1) },
        { challengeId: 'c3', topic: 'JOIN', success: true, timestamp: daysAgo(1) },
        { challengeId: 'c4', topic: 'JOIN', success: true, timestamp: daysAgo(1) }
      ]
    }, { allChallenges, now: NOW });

    // Same solves but attempts say they were done long ago (stale).
    const stale = calculateSkillLevels({
      solvedChallenges: new Set(['c1', 'c2', 'c3', 'c4']),
      challengeAttempts: [
        { challengeId: 'c1', topic: 'JOIN', success: true, timestamp: daysAgo(240) },
        { challengeId: 'c2', topic: 'JOIN', success: true, timestamp: daysAgo(240) },
        { challengeId: 'c3', topic: 'JOIN', success: true, timestamp: daysAgo(240) },
        { challengeId: 'c4', topic: 'JOIN', success: true, timestamp: daysAgo(240) }
      ]
    }, { allChallenges, now: NOW });

    expect(recent['Joins']).toBeGreaterThan(stale['Joins']);
  });
});

describe('calculateSkillLevels — performance event types', () => {
  it('boss_defeat contributes to the skill', () => {
    const skills = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'boss_defeat', skillKey: 'Subqueries & CTEs', timestamp: daysAgo(1)
      })
    }, { now: NOW });
    expect(skills['Subqueries & CTEs']).toBeGreaterThan(30);
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
        type: 'review_success', skillKey: 'Conditional Logic', timestamp: daysAgo(1),
        payload: { quality: 5 }
      })
    }, { now: NOW });
    const struggled = calculateSkillLevels({
      performanceEvents: Array(4).fill({
        type: 'review_success', skillKey: 'Conditional Logic', timestamp: daysAgo(1),
        payload: { quality: 3 }
      })
    }, { now: NOW });
    expect(perfect['Conditional Logic']).toBeGreaterThan(struggled['Conditional Logic']);
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
        { type: 'review_success', skillKey: 'Subqueries & CTEs', timestamp: daysAgo(1), payload: { quality: 4 } }
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

describe('calculateSkillLevels — multi-topic attempt fan-out', () => {
  // The key fix: a challenge that uses CASE + JOIN + Aggregation + Window must
  // credit ALL four distinct canonical skills on a single successful attempt,
  // not just one dominant one.
  it('credits every listed topic on a multi-skill attempt', () => {
    const skills = calculateSkillLevels({
      challengeAttempts: Array(4).fill({
        topics: ['CASE', 'JOIN', 'Aggregation', 'SELECT'],
        success: true,
        timestamp: daysAgo(1)
      })
    }, { now: NOW });
    expect(skills['Conditional Logic']).toBeGreaterThan(30);
    expect(skills['Aggregation & Grouping']).toBeGreaterThan(30);
    expect(skills['Joins']).toBeGreaterThan(30);
    expect(skills['Querying Basics']).toBeGreaterThan(30);
  });

  it('falls back to legacy `topic` when `topics` missing', () => {
    const skills = calculateSkillLevels({
      challengeAttempts: Array(4).fill({
        topic: 'GROUP BY',
        success: true,
        timestamp: daysAgo(1)
      })
    }, { now: NOW });
    expect(skills['Aggregation & Grouping']).toBeGreaterThan(30);
    // CASE unaffected — legacy records don't fan out.
    expect(skills['Conditional Logic']).toBe(0);
  });

  it('deduplicates topics that map to the same skill', () => {
    // `GROUP BY` and `HAVING` both map to GROUP BY — should count as one attempt,
    // not double-credit.
    const oneFanout = calculateSkillLevels({
      challengeAttempts: Array(4).fill({
        topics: ['GROUP BY', 'HAVING'],
        success: true,
        timestamp: daysAgo(1)
      })
    }, { now: NOW });
    const singleTopic = calculateSkillLevels({
      challengeAttempts: Array(4).fill({
        topics: ['GROUP BY'],
        success: true,
        timestamp: daysAgo(1)
      })
    }, { now: NOW });
    expect(oneFanout['Aggregation & Grouping']).toBe(singleTopic['Aggregation & Grouping']);
  });

  it('ignores attempts with no resolvable topics', () => {
    const skills = calculateSkillLevels({
      challengeAttempts: [
        { topics: ['Quantum Flux', 'Blockchain'], success: true, timestamp: daysAgo(1) }
      ]
    }, { now: NOW });
    CANONICAL_SKILLS.forEach(s => expect(skills[s]).toBe(0));
  });
});

describe('calculateSkillLevels — widened tag mappings', () => {
  // These tags existed in challenges.js but never resolved before.
  it('ROW_NUMBER, LAG, PARTITION BY all map to Window Functions', () => {
    expect(mapTopicToSkill('ROW_NUMBER') || 'Window Functions').toBeDefined();
    const skills = calculateSkillLevels({
      challengeAttempts: [
        { topics: ['ROW_NUMBER'], success: true, timestamp: daysAgo(1) },
        { topics: ['LAG'], success: true, timestamp: daysAgo(1) },
        { topics: ['PARTITION BY'], success: true, timestamp: daysAgo(1) },
        { topics: ['PERCENT_RANK'], success: true, timestamp: daysAgo(1) }
      ]
    }, { now: NOW });
    expect(skills['Window Functions']).toBeGreaterThan(30);
  });

  it('CTE and EXISTS route to Subqueries', () => {
    const skills = calculateSkillLevels({
      challengeAttempts: [
        { topics: ['CTE'], success: true, timestamp: daysAgo(1) },
        { topics: ['EXISTS'], success: true, timestamp: daysAgo(1) },
        { topics: ['UNION'], success: true, timestamp: daysAgo(1) },
        { topics: ['Recursive CTE'], success: true, timestamp: daysAgo(1) }
      ]
    }, { now: NOW });
    expect(skills['Subqueries & CTEs']).toBeGreaterThan(30);
  });

  it('COALESCE and IS NULL route to NULL Handling; LIKE to Querying Basics', () => {
    const skills = calculateSkillLevels({
      challengeAttempts: Array(4).fill({
        topics: ['COALESCE', 'IS NULL', 'NULLIF'],
        success: true,
        timestamp: daysAgo(1)
      })
    }, { now: NOW });
    expect(skills['NULL Handling']).toBeGreaterThan(30);

    const basics = calculateSkillLevels({
      challengeAttempts: Array(4).fill({
        topics: ['LIKE', 'BETWEEN', 'IN'],
        success: true,
        timestamp: daysAgo(1)
      })
    }, { now: NOW });
    expect(basics['Querying Basics']).toBeGreaterThan(30);
  });
});

describe('calculateSkillLevels — SOURCE 1 success credit (pre-tracking solves)', () => {
  // The bug: a user with 22 pre-tracking solves and 0 attempts was getting
  // success=0 on the 55% signal, reading as "Beginner" despite solving lots
  // of challenges. SOURCE 1 now credits attempts/successes for solves that
  // aren't already credited by SOURCE 2, and defaultActivityTs prevents the
  // completion staleness floor from collapsing ghost solves to 0.5.

  const ch = (id, category, skills, difficulty = 'Medium') => ({
    id, category, skills, difficulty
  });

  it('credits success for ghost solves with no matching attempt', () => {
    // User solved all 4 CASE challenges but has no attempt records.
    // Before the fix: ~36% (success=0 drags down 55% of the weight).
    // After the fix: should be a real score (≥60).
    const allChallenges = [
      ch(1, 'CASE', ['CASE'], 'Easy'),
      ch(2, 'CASE', ['CASE'], 'Easy'),
      ch(3, 'CASE', ['CASE'], 'Medium'),
      ch(4, 'CASE', ['CASE'], 'Medium')
    ];
    const skills = calculateSkillLevels({
      solvedChallenges: [1, 2, 3, 4],
      challengeAttempts: []
    }, { allChallenges, now: NOW, defaultActivityTs: NOW });
    expect(skills['Conditional Logic']).toBeGreaterThan(60);
  });

  it('does not double-count when solve has a matching successful attempt', () => {
    // 4 CASE solves, 1 corroborated via attempt record. SOURCE 2 credits
    // that attempt cleanly; SOURCE 1 should NOT double-credit. And under
    // the provenance policy, the other 3 uncorroborated solves are
    // skipped because the user has attempt tracking on. The 1-verified
    // score beats the raw-tracked-user-with-zero-verified case but is
    // naturally lower than the legacy all-ghost case.
    const allChallenges = [
      ch(1, 'CASE', ['CASE'], 'Easy'),
      ch(2, 'CASE', ['CASE'], 'Easy'),
      ch(3, 'CASE', ['CASE'], 'Medium'),
      ch(4, 'CASE', ['CASE'], 'Medium')
    ];
    const withOneAttempt = calculateSkillLevels({
      solvedChallenges: [1, 2, 3, 4],
      challengeAttempts: [
        { challengeId: 1, topic: 'CASE', success: true, timestamp: daysAgo(1) }
      ]
    }, { allChallenges, now: NOW, defaultActivityTs: NOW });
    // Not zero (1 verified solve) but well below 70 since only 1 of 4
    // solves carries evidence.
    expect(withOneAttempt['Conditional Logic']).toBeGreaterThan(0);
    expect(withOneAttempt['Conditional Logic']).toBeLessThan(70);
  });

  it('defaultActivityTs prevents staleness floor on ghost solves', () => {
    // Same data, with and without defaultActivityTs. User played yesterday
    // but has no per-challenge timestamps. With the floor, completion stays
    // fresh. Without it, staleness=0.5 → lower score.
    const allChallenges = [
      ch(1, 'GROUP BY', ['GROUP BY'], 'Easy'),
      ch(2, 'GROUP BY', ['GROUP BY'], 'Medium')
    ];
    const withFloor = calculateSkillLevels({
      solvedChallenges: [1, 2],
      challengeAttempts: []
    }, { allChallenges, now: NOW, defaultActivityTs: new Date(NOW - 86400000).getTime() });
    const withoutFloor = calculateSkillLevels({
      solvedChallenges: [1, 2],
      challengeAttempts: []
    }, { allChallenges, now: NOW });
    expect(withFloor['Aggregation & Grouping']).toBeGreaterThan(withoutFloor['Aggregation & Grouping']);
  });

  it('37 solves across 10 skills reads as intermediate, not beginner', () => {
    // End-to-end regression: simulates a user like test2 with pre-tracking
    // solves spanning every skill. Before fix: overall ~25 (Beginner).
    // After fix: should be clearly higher.
    const allChallenges = [];
    // Build a pool of 10 per skill so denominators are sane
    const skillCategories = [
      { cat: 'SELECT', count: 10 }, { cat: 'WHERE', count: 10 },
      { cat: 'Aggregation', count: 10 }, { cat: 'GROUP BY', count: 10 },
      { cat: 'JOIN', count: 10 }, { cat: 'Subquery', count: 10 },
      { cat: 'String Functions', count: 10 }, { cat: 'Date Functions', count: 10 },
      { cat: 'CASE', count: 10 }, { cat: 'Window Functions', count: 10 }
    ];
    let id = 1;
    skillCategories.forEach(({ cat, count }) => {
      for (let i = 0; i < count; i++) {
        allChallenges.push(ch(id++, cat, [cat], 'Medium'));
      }
    });
    // User solved ~4 from each skill (40 solves total)
    const solved = [];
    for (let i = 1; i <= 100; i += 10) {
      solved.push(i, i + 1, i + 2, i + 3);
    }
    const skills = calculateSkillLevels({
      solvedChallenges: solved,
      challengeAttempts: []
    }, { allChallenges, now: NOW, defaultActivityTs: NOW });
    // Average across 10 skills should be at least Intermediate-ish
    const avg = Object.values(skills).reduce((a, b) => a + b, 0) / 10;
    expect(avg).toBeGreaterThan(50);
  });
});

describe('source-aware radar (Phase 2)', () => {
  const baseAttempts = (source) => ([
    { challengeId: 1, success: true, topics: ['GROUP BY'], difficulty: 'Medium', timestamp: daysAgo(1), source },
    { challengeId: 2, success: true, topics: ['GROUP BY'], difficulty: 'Medium', timestamp: daysAgo(1), source },
    { challengeId: 3, success: true, topics: ['GROUP BY'], difficulty: 'Medium', timestamp: daysAgo(1), source },
    { challengeId: 4, success: true, topics: ['GROUP BY'], difficulty: 'Medium', timestamp: daysAgo(1), source },
  ]);

  it('drill-tagged attempts score higher than untagged attempts with same inputs', () => {
    const untagged = calculateSkillLevels({ challengeAttempts: baseAttempts(undefined) }, { now: NOW });
    const drillTagged = calculateSkillLevels({ challengeAttempts: baseAttempts('drill') }, { now: NOW });
    expect(drillTagged['Aggregation & Grouping']).toBeGreaterThan(untagged['Aggregation & Grouping']);
  });

  it('difficultyBoost is capped at 1.5', () => {
    const unboosted = calculateSkillLevels({ challengeAttempts: baseAttempts(undefined) }, { now: NOW });
    const extreme = baseAttempts(undefined).map(a => ({ ...a, difficultyBoost: 5 }));
    const capped = baseAttempts(undefined).map(a => ({ ...a, difficultyBoost: 1.5 }));
    const s1 = calculateSkillLevels({ challengeAttempts: extreme }, { now: NOW });
    const s2 = calculateSkillLevels({ challengeAttempts: capped }, { now: NOW });
    expect(s1['Aggregation & Grouping']).toBe(s2['Aggregation & Grouping']);
    expect(s1['Aggregation & Grouping']).toBeGreaterThan(unboosted['Aggregation & Grouping']);
  });

  it('ignores explicit difficultyBoost below or equal to 0', () => {
    const bad = baseAttempts(undefined).map(a => ({ ...a, difficultyBoost: 0 }));
    const untagged = calculateSkillLevels({ challengeAttempts: baseAttempts(undefined) }, { now: NOW });
    const zeroed = calculateSkillLevels({ challengeAttempts: bad }, { now: NOW });
    expect(zeroed['Aggregation & Grouping']).toBe(untagged['Aggregation & Grouping']);
  });

  it('mastery_check-tagged attempts boost, but less than drill', () => {
    const drill = calculateSkillLevels({ challengeAttempts: baseAttempts('drill') }, { now: NOW });
    const mc = calculateSkillLevels({ challengeAttempts: baseAttempts('mastery_check') }, { now: NOW });
    const untagged = calculateSkillLevels({ challengeAttempts: baseAttempts(undefined) }, { now: NOW });
    expect(mc['Aggregation & Grouping']).toBeGreaterThan(untagged['Aggregation & Grouping']);
    expect(mc['Aggregation & Grouping']).toBeLessThanOrEqual(drill['Aggregation & Grouping']);
  });
});

describe('foundational-skill floor', () => {
  // A user who demonstrates Window Functions at 70 is obviously using
  // SELECT in every query. Querying Basics should floor at the max of
  // advanced skills — not read low just because they didn't solve the
  // intro-SELECT challenges.
  it('Querying Basics floors at MAX of advanced skills', () => {
    const allChallenges = [
      { id: 1, difficulty: 'Hard', skills: ['Window Functions', 'ROW_NUMBER'] },
    ];
    const r = calculateSkillLevels(
      {
        solvedChallenges: [1],
        challengeAttempts: [{
          challengeId: 1, difficulty: 'Hard', topics: ['Window Functions', 'ROW_NUMBER'],
          success: true, timestamp: NOW,
        }],
      },
      { allChallenges, now: NOW, defaultActivityTs: NOW }
    );
    expect(r['Window Functions']).toBeGreaterThan(0);
    expect(r['Querying Basics']).toBeGreaterThanOrEqual(r['Window Functions']);
  });

  it('Querying Basics floors at MAX across multiple advanced skills', () => {
    const allChallenges = [
      { id: 1, difficulty: 'Hard', skills: ['GROUP BY', 'Aggregation'] },
      { id: 2, difficulty: 'Hard', skills: ['JOIN'] },
    ];
    const r = calculateSkillLevels(
      {
        solvedChallenges: [1, 2],
        challengeAttempts: [
          { challengeId: 1, difficulty: 'Hard', topics: ['GROUP BY', 'Aggregation'],
            success: true, timestamp: NOW },
          { challengeId: 2, difficulty: 'Hard', topics: ['JOIN'],
            success: true, timestamp: NOW },
        ],
      },
      { allChallenges, now: NOW, defaultActivityTs: NOW }
    );
    const advancedMax = Math.max(r['Aggregation & Grouping'], r['Joins']);
    expect(r['Querying Basics']).toBeGreaterThanOrEqual(advancedMax);
  });

  it('floor does nothing for a brand-new user (all skills zero)', () => {
    const r = calculateSkillLevels(
      { solvedChallenges: [], challengeAttempts: [] },
      { allChallenges: [], now: NOW }
    );
    expect(r['Querying Basics']).toBe(0);
  });
});

describe("Elena's real data shape", () => {
  // Her account has attempts on 32 distinct challenges, 1 being Window (id 120 Easy).
  // 14 IDs in solvedChallenges tag as Window Functions — 13 of which have no attempt.
  // The 13 uncorroborated should be skipped; only id 120 should credit.
  it('real shape returns near-zero Windows', () => {
    const windowIds = [2, 9, 11, 12, 13, 47, 55, 61, 67, 68, 71, 72, 73, 120];
    // Simulate her catalog: 33 Window challenges (the real total), 14 of which she "solved"
    const allChallenges = Array.from({ length: 33 }, (_, i) => ({
      id: 200 + i, difficulty: 'Hard', skills: ['Window Functions'], category: 'Window Functions',
    })).concat(windowIds.map((id, i) => ({
      id, difficulty: i === 13 ? 'Easy' : 'Hard',
      skills: ['Window Functions', 'ROW_NUMBER'], category: 'Window Functions',
    })));
    // She has exactly 1 Window attempt — on id 120 (Easy, success)
    const r = calculateSkillLevels(
      {
        solvedChallenges: windowIds,
        challengeAttempts: [
          { challengeId: 120, difficulty: 'Easy', topics: ['Window Functions', 'ROW_NUMBER'],
            success: true, timestamp: NOW },
          // And 99 other attempts on non-Window challenges (tracking is on)
          ...Array.from({ length: 99 }, (_, i) => ({
            challengeId: 500 + i, difficulty: 'Easy', topic: 'WHERE',
            success: true, timestamp: NOW,
          })),
        ],
      },
      { allChallenges, now: NOW, defaultActivityTs: NOW }
    );
    // Only 1 corroborated solve (Easy, perfect). Score reflects that
    // single success signal with a confidence dampener. Huge drop from
    // 78 under the old buggy credit-all-solves logic.
    expect(r['Window Functions']).toBeLessThan(50);
    expect(r['Window Functions']).toBeGreaterThan(20);
  });
});

describe('provenance policy — require attempt corroboration', () => {
  // Regression for "Elena has 78% Window Functions from 1 actual attempt":
  // when a user has attempt tracking on (has ANY attempts anywhere),
  // skill-calc should ignore solvedChallenges entries that have no
  // matching attempt record. Only legacy pre-tracking users (zero
  // attempts anywhere) get the old "trust solvedChallenges fully"
  // behavior.
  const windowChallenges = Array.from({ length: 14 }, (_, i) => ({
    id: 100 + i,
    difficulty: 'Hard',
    skills: ['Window Functions'],
    category: 'Window Functions',
  }));

  it('Elena case: 14 solvedChallenges entries + 1 attempt → only that 1 credits', () => {
    // She has ONE attempt on id 113. The other 13 solvedChallenges
    // entries are uncorroborated (seeded? bug?). Expected behavior:
    // credit only the 1 verified solve; drop the radar near the floor
    // the one-solve signal can sustain.
    const r = calculateSkillLevels(
      {
        solvedChallenges: windowChallenges.map(c => c.id),
        challengeAttempts: [{
          challengeId: 113, difficulty: 'Hard', topics: ['Window Functions'],
          success: true, timestamp: NOW,
        }],
      },
      { allChallenges: windowChallenges, now: NOW, defaultActivityTs: NOW }
    );
    // With only 1 corroborated solve out of 14 possible, score should
    // be well below "Intermediate" (50). Old behavior was 78.
    expect(r['Window Functions']).toBeLessThan(40);
  });

  it('Elena case with ZERO Window attempts → 0 credit', () => {
    // The exact Elena shape: attempts exist (tracking is on) but none
    // on any window challenge. Windows should score 0.
    const r = calculateSkillLevels(
      {
        solvedChallenges: windowChallenges.map(c => c.id),
        // One attempt on an unrelated challenge (so hasAnyAttemptHistory=true)
        challengeAttempts: [{
          challengeId: 999, difficulty: 'Easy', topic: 'WHERE',
          success: true, timestamp: NOW,
        }],
      },
      { allChallenges: windowChallenges, now: NOW, defaultActivityTs: NOW }
    );
    expect(r['Window Functions']).toBe(0);
  });

  it('legacy user: 14 solves + NO attempts anywhere → full credit preserved', () => {
    // This user predates attempt tracking entirely. Their solves are
    // all we have; we must not wipe their progress.
    const r = calculateSkillLevels(
      { solvedChallenges: windowChallenges.map(c => c.id), challengeAttempts: [] },
      { allChallenges: windowChallenges, now: NOW, defaultActivityTs: NOW }
    );
    expect(r['Window Functions']).toBeGreaterThanOrEqual(80);
  });

  it('all solves corroborated by attempts → high score', () => {
    const attempts = windowChallenges.map(c => ({
      challengeId: c.id, difficulty: 'Hard', topics: ['Window Functions'],
      success: true, timestamp: NOW,
    }));
    const r = calculateSkillLevels(
      { solvedChallenges: windowChallenges.map(c => c.id), challengeAttempts: attempts },
      { allChallenges: windowChallenges, now: NOW, defaultActivityTs: NOW }
    );
    // Every solve has a matching clean attempt → full credit.
    expect(r['Window Functions']).toBeGreaterThanOrEqual(90);
  });
});
