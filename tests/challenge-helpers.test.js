import { describe, it, expect } from 'vitest';
import { calculateRecommendedDifficulty, checkIfStruggling, getTopicStats, getPasswordStrength, simpleHash, pickNextChallenge, backfillLegacyAttempts } from '../src/utils/challenge-helpers.js';

describe('calculateRecommendedDifficulty', () => {
  it('returns Easy for empty challenges', () => {
    expect(calculateRecommendedDifficulty(new Set(), [])).toBe('Easy');
    expect(calculateRecommendedDifficulty(new Set(), null)).toBe('Easy');
  });

  it('returns Easy when few are solved', () => {
    const challenges = [
      { id: 1, difficulty: 'Easy' },
      { id: 2, difficulty: 'Easy' },
      { id: 3, difficulty: 'Medium' },
    ];
    expect(calculateRecommendedDifficulty(new Set([1]), challenges)).toBe('Easy');
  });

  it('returns Medium when enough Easy solved', () => {
    const challenges = [
      { id: 1, difficulty: 'Easy' },
      { id: 2, difficulty: 'Easy' },
      { id: 3, difficulty: 'Easy' },
      { id: 4, difficulty: 'Easy' },
      { id: 5, difficulty: 'Medium' },
    ];
    // 3 of 4 easy solved = 75% > 60%
    expect(calculateRecommendedDifficulty(new Set([1, 2, 3]), challenges)).toBe('Medium');
  });

  it('returns Hard when enough Medium solved', () => {
    const challenges = [
      { id: 1, difficulty: 'Easy' },
      { id: 2, difficulty: 'Medium' },
      { id: 3, difficulty: 'Medium' },
      { id: 4, difficulty: 'Medium' },
      { id: 5, difficulty: 'Medium' },
      { id: 6, difficulty: 'Medium' },
    ];
    // 3 of 5 medium = 60% > 50%
    expect(calculateRecommendedDifficulty(new Set([2, 3, 4]), challenges)).toBe('Hard');
  });

  it('returns Hard when enough Hard solved', () => {
    const challenges = [
      { id: 1, difficulty: 'Hard' },
      { id: 2, difficulty: 'Hard' },
      { id: 3, difficulty: 'Hard' },
      { id: 4, difficulty: 'Hard' },
    ];
    // 2 of 4 = 50% >= 40%
    expect(calculateRecommendedDifficulty(new Set([1, 2]), challenges)).toBe('Hard');
  });
});

describe('checkIfStruggling', () => {
  it('returns not struggling for short history', () => {
    expect(checkIfStruggling(null)).toEqual({ struggling: false });
    expect(checkIfStruggling([])).toEqual({ struggling: false });
    expect(checkIfStruggling([{ success: false }])).toEqual({ struggling: false });
  });

  it('returns not struggling when mostly successful', () => {
    const history = [
      { success: true, topic: 'JOIN' },
      { success: true, topic: 'WHERE' },
      { success: true, topic: 'GROUP BY' },
      { success: false, topic: 'JOIN' },
      { success: true, topic: 'SELECT' },
    ];
    expect(checkIfStruggling(history).struggling).toBe(false);
  });

  it('detects struggling with 3+ fails', () => {
    const history = [
      { success: false, topic: 'JOIN' },
      { success: false, topic: 'JOIN' },
      { success: false, topic: 'WHERE' },
      { success: true, topic: 'SELECT' },
      { success: false, topic: 'JOIN' },
    ];
    const result = checkIfStruggling(history);
    expect(result.struggling).toBe(true);
    expect(result.topic).toBe('JOIN');
    expect(result.failCount).toBeGreaterThanOrEqual(3);
  });

  it('uses only last 5 entries', () => {
    const history = [
      { success: false, topic: 'JOIN' },
      { success: false, topic: 'JOIN' },
      { success: false, topic: 'JOIN' },
      // last 5 below
      { success: true, topic: 'SELECT' },
      { success: true, topic: 'SELECT' },
      { success: true, topic: 'SELECT' },
      { success: true, topic: 'SELECT' },
      { success: false, topic: 'JOIN' },
    ];
    expect(checkIfStruggling(history).struggling).toBe(false);
  });
});

describe('getPasswordStrength', () => {
  it('returns empty for no password', () => {
    const result = getPasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.label).toBe('');
  });

  it('rates short lowercase as Weak', () => {
    const result = getPasswordStrength('abc');
    expect(result.label).toBe('Weak');
    expect(result.color).toBe('red');
    expect(result.feedback).toContain('Use at least 8 characters');
  });

  it('rates complex password as Strong', () => {
    const result = getPasswordStrength('MyP@ssw0rd123!');
    expect(result.label).toBe('Strong');
    expect(result.color).toBe('green');
    expect(result.feedback).toEqual([]);
  });

  it('provides feedback for missing character types', () => {
    const result = getPasswordStrength('abcdefgh');
    expect(result.feedback).toContain('Add uppercase letters');
    expect(result.feedback).toContain('Add numbers');
    expect(result.feedback).toContain('Add special characters (!@#$%)');
  });

  it('returns percent between 0 and 100', () => {
    expect(getPasswordStrength('a').percent).toBeGreaterThan(0);
    expect(getPasswordStrength('a').percent).toBeLessThanOrEqual(100);
    expect(getPasswordStrength('MyP@ssw0rd123!').percent).toBeLessThanOrEqual(100);
  });
});

describe('simpleHash', () => {
  it('returns consistent results for same input', () => {
    expect(simpleHash('test')).toBe(simpleHash('test'));
  });

  it('returns different results for different inputs', () => {
    expect(simpleHash('hello')).not.toBe(simpleHash('world'));
  });

  it('returns a 16-character hex string', () => {
    const result = simpleHash('test');
    expect(result.length).toBe(16);
    expect(/^[0-9a-f]+$/.test(result)).toBe(true);
  });
});

describe('getTopicStats', () => {
  it('computes topic stats correctly', () => {
    const challenges = [
      { id: 1, difficulty: 'Easy', topic: 'JOIN', solution: 'SELECT * FROM a JOIN b' },
      { id: 2, difficulty: 'Easy', topic: 'WHERE', solution: 'SELECT * FROM a WHERE x=1' },
      { id: 3, difficulty: 'Medium', topic: 'JOIN', solution: 'SELECT * FROM a JOIN b' },
    ];
    const solved = new Set([1]);
    const attempts = [
      { topic: 'JOIN', success: true },
      { topic: 'JOIN', success: false },
      { topic: 'WHERE', success: true },
    ];

    const stats = getTopicStats(attempts, solved, challenges);
    const joinStats = stats.find(s => s.topic === 'JOIN');
    expect(joinStats.total).toBe(2);
    expect(joinStats.solved).toBe(1);
    expect(joinStats.attempts).toBe(2);
    expect(joinStats.successes).toBe(1);
    expect(joinStats.successRate).toBe(50);
  });

  it('returns empty array for null inputs', () => {
    expect(getTopicStats(null, null, null)).toEqual([]);
    expect(getTopicStats([], new Set(), null)).toEqual([]);
  });
});

describe('simpleHash null safety', () => {
  it('returns zero hash for null input', () => {
    expect(simpleHash(null)).toBe('0000000000000000');
  });

  it('returns zero hash for undefined input', () => {
    expect(simpleHash(undefined)).toBe('0000000000000000');
  });

  it('returns zero hash for non-string input', () => {
    expect(simpleHash(123)).toBe('0000000000000000');
  });
});

describe('pickNextChallenge (guest paywall regression)', () => {
  // Mirrors the shape of the real challenges.js ordering: ID order happens
  // to put a Hard challenge at position 2, which is exactly what blew up
  // Murat's trial before the fix. The sorted list puts Easy first.
  const sorted = [
    { id: 1, difficulty: 'Easy', title: 'Class Survival Breakdown' },
    { id: 3, difficulty: 'Easy', title: 'Wealthy Survivor Profile' },
    { id: 5, difficulty: 'Easy', title: 'Movie Rating Tier Breakdown' },
    { id: 4, difficulty: 'Medium', title: 'Department Roster' },
    { id: 6, difficulty: 'Medium', title: 'Full Survival Dashboard' },
    { id: 2, difficulty: 'Hard', title: 'Salary Percentile Ranking' },
    { id: 9, difficulty: 'Hard', title: 'Order Sessionization' },
  ];

  it('returns null for empty or invalid list', () => {
    expect(pickNextChallenge([], 1, false)).toBeNull();
    expect(pickNextChallenge(null, 1, false)).toBeNull();
    expect(pickNextChallenge(undefined, 1, false)).toBeNull();
  });

  it('guest on Q1 (Easy id=1) advances to next Easy, NOT Hard id=2', () => {
    const next = pickNextChallenge(sorted, 1, false);
    expect(next.id).toBe(3);
    expect(next.difficulty).toBe('Easy');
  });

  it('guest never encounters a Hard challenge via Next', () => {
    // Walk the whole accessible list from id=1 and verify no Hard shows up.
    let currentId = 1;
    const visited = new Set();
    for (let i = 0; i < 20; i++) {
      const next = pickNextChallenge(sorted, currentId, false);
      expect(next).not.toBeNull();
      expect(next.difficulty).not.toBe('Hard');
      if (visited.has(next.id)) break; // cycled through all accessible
      visited.add(next.id);
      currentId = next.id;
    }
    // Should have visited exactly the Easy + Medium challenges (5 of them)
    expect(visited.size).toBe(5);
  });

  it('Pro user advances through Hard challenges normally', () => {
    const next = pickNextChallenge(sorted, 6, true); // last Medium
    expect(next.id).toBe(2);
    expect(next.difficulty).toBe('Hard');
  });

  it('guest on last Medium wraps back to first Easy (no Hard)', () => {
    const next = pickNextChallenge(sorted, 6, false);
    expect(next.id).toBe(1);
    expect(next.difficulty).toBe('Easy');
  });

  it('returns first accessible challenge if current not found', () => {
    const next = pickNextChallenge(sorted, 999, false);
    expect(next.id).toBe(1);
  });
});

describe('backfillLegacyAttempts (Elena radar fix)', () => {
  const challenges = [
    { id: 1, difficulty: 'Easy', category: 'SELECT', skills: ['SELECT'] },
    { id: 2, difficulty: 'Medium', category: 'JOIN', skills: ['JOIN', 'SELECT'] },
    { id: 3, difficulty: 'Hard', category: 'Window Functions', skills: ['Window Functions', 'PARTITION BY'] },
  ];

  it('no-ops when solvedChallenges is empty', () => {
    const out = backfillLegacyAttempts([], [], challenges);
    expect(out).toEqual([]);
  });

  it('no-ops when all solves are already corroborated', () => {
    const existing = [
      { challengeId: 1, success: true, timestamp: 1000 },
      { challengeId: 2, success: true, timestamp: 2000 },
    ];
    const out = backfillLegacyAttempts([1, 2], existing, challenges);
    expect(out).toBe(existing); // same reference, untouched
  });

  it('creates synthetic attempts for uncorroborated solves', () => {
    const existing = [{ challengeId: 1, success: true, timestamp: 1000 }];
    const out = backfillLegacyAttempts([1, 2, 3], existing, challenges);
    expect(out.length).toBe(3); // 2 synthetic + 1 real
    const synthetic = out.filter(a => a.backfilled);
    expect(synthetic.length).toBe(2);
    expect(synthetic.map(a => a.challengeId).sort()).toEqual([2, 3]);
  });

  it('synthetic attempts have correct skill/topic/difficulty from challenge data', () => {
    const out = backfillLegacyAttempts([2, 3], [], challenges);
    // With no existing attempts, zero corroboration, so all should still backfill
    // But wait — the provenance policy only kicks in WHEN user has attempt history.
    // backfillLegacyAttempts still works; it just checks what's attempted
    const ch2Attempt = out.find(a => a.challengeId === 2);
    expect(ch2Attempt.success).toBe(true);
    expect(ch2Attempt.difficulty).toBe('Medium');
    expect(ch2Attempt.topics).toContain('JOIN');
    expect(ch2Attempt.backfilled).toBe(true);
  });

  it('synthetic attempts use conservative defaults (not firstTry, 0 hints)', () => {
    const out = backfillLegacyAttempts([1], [], challenges);
    const synth = out.find(a => a.backfilled);
    expect(synth.firstTry).toBe(false);
    expect(synth.hintsUsed).toBe(0);
    expect(synth.success).toBe(true);
  });

  it('synthetic timestamps are in the past (~30 days ago)', () => {
    const out = backfillLegacyAttempts([1, 2, 3], [], challenges);
    const now = Date.now();
    out.forEach(a => {
      if (a.backfilled) {
        const ageDays = (now - a.timestamp) / (1000 * 60 * 60 * 24);
        expect(ageDays).toBeGreaterThan(20);
        expect(ageDays).toBeLessThan(35);
      }
    });
  });

  it('accepts Set input for solvedChallenges', () => {
    const solved = new Set([1, 2]);
    const out = backfillLegacyAttempts(solved, [], challenges);
    expect(out.length).toBe(2);
  });

  it('handles missing challenge gracefully (no crash on unknown id)', () => {
    const out = backfillLegacyAttempts([999], [], challenges);
    expect(out.length).toBe(1);
    expect(out[0].difficulty).toBe('Easy'); // fallback
    expect(out[0].topic).toBe('SELECT'); // fallback
  });

  it('returns empty array if no challenges provided', () => {
    const out = backfillLegacyAttempts([1, 2], [], []);
    expect(out).toEqual([]);
  });

  it('real Elena shape: 88 solves, 45 corroborated, creates 43 synthetics', () => {
    const solved = Array.from({ length: 88 }, (_, i) => i + 1);
    const attempts = Array.from({ length: 45 }, (_, i) => ({ challengeId: i + 1, success: true, timestamp: 1000 }));
    const manyChallenges = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1, difficulty: 'Medium', category: 'JOIN', skills: ['JOIN']
    }));
    const out = backfillLegacyAttempts(solved, attempts, manyChallenges);
    expect(out.length).toBe(88);
    expect(out.filter(a => a.backfilled).length).toBe(43);
  });
});
