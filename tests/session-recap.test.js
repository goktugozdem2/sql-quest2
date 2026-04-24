import { describe, it, expect } from 'vitest';
import {
  detectSessions,
  shouldShowRecap,
  formatTimeAgo,
  computeRecap,
} from '../src/utils/session-recap.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MIN = 60 * 1000;

const mkAttempt = (id, timestamp, success = true, topics = ['SELECT']) => ({
  challengeId: id,
  difficulty: 'Easy',
  topic: topics[0],
  topics,
  success,
  timestamp,
  firstTry: success,
  hintsUsed: 0,
});

describe('detectSessions', () => {
  it('returns [] for empty input', () => {
    expect(detectSessions([])).toEqual([]);
    expect(detectSessions(null)).toEqual([]);
    expect(detectSessions(undefined)).toEqual([]);
  });

  it('groups one continuous block as a single session', () => {
    const now = Date.now();
    const attempts = [
      mkAttempt(1, now - 20 * MIN),
      mkAttempt(2, now - 10 * MIN),
      mkAttempt(3, now - 5 * MIN),
    ];
    const sessions = detectSessions(attempts);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].attempts).toHaveLength(3);
  });

  it('splits at 30+ min gaps', () => {
    const now = Date.now();
    const attempts = [
      mkAttempt(1, now - 3 * HOUR),
      mkAttempt(2, now - 3 * HOUR + 10 * MIN),
      // 40 min gap
      mkAttempt(3, now - 2 * HOUR + 10 * MIN),
      mkAttempt(4, now - 2 * HOUR + 20 * MIN),
    ];
    const sessions = detectSessions(attempts);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].attempts).toHaveLength(2);
    expect(sessions[1].attempts).toHaveLength(2);
  });

  it('sorts unsorted input defensively', () => {
    const now = Date.now();
    const attempts = [
      mkAttempt(3, now - 5 * MIN),
      mkAttempt(1, now - 20 * MIN),
      mkAttempt(2, now - 10 * MIN),
    ];
    const sessions = detectSessions(attempts);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].attempts.map(a => a.challengeId)).toEqual([1, 2, 3]);
  });

  it('filters out attempts without valid timestamps', () => {
    const attempts = [
      mkAttempt(1, Date.now()),
      { challengeId: 2 }, // no timestamp
      null,
    ];
    const sessions = detectSessions(attempts);
    expect(sessions[0].attempts).toHaveLength(1);
  });
});

describe('shouldShowRecap', () => {
  it('returns false when there is no attempt history', () => {
    expect(shouldShowRecap([])).toBe(false);
    expect(shouldShowRecap(null)).toBe(false);
  });

  it('returns false when last activity is within 2 hours', () => {
    const now = Date.now();
    const attempts = [mkAttempt(1, now - 30 * MIN)];
    expect(shouldShowRecap(attempts, now)).toBe(false);
  });

  it('returns true when last activity is more than 2 hours ago', () => {
    const now = Date.now();
    const attempts = [mkAttempt(1, now - 3 * HOUR)];
    expect(shouldShowRecap(attempts, now)).toBe(true);
  });

  it('returns true when last activity was yesterday', () => {
    const now = Date.now();
    const attempts = [mkAttempt(1, now - 1 * DAY)];
    expect(shouldShowRecap(attempts, now)).toBe(true);
  });
});

describe('formatTimeAgo', () => {
  it('returns "just now" for <5 min ago', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 2 * MIN, now)).toBe('just now');
  });

  it('returns minutes for 5-59 min ago', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 15 * MIN, now)).toBe('15 minutes ago');
  });

  it('returns hours for 1-23 hours ago', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 1 * HOUR, now)).toBe('1 hour ago');
    expect(formatTimeAgo(now - 5 * HOUR, now)).toBe('5 hours ago');
  });

  it('returns days for 1-6 days ago', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 1 * DAY, now)).toBe('1 day ago');
    expect(formatTimeAgo(now - 3 * DAY, now)).toBe('3 days ago');
  });

  it('returns weeks for 7+ days ago', () => {
    const now = Date.now();
    expect(formatTimeAgo(now - 7 * DAY, now)).toBe('1 week ago');
    expect(formatTimeAgo(now - 14 * DAY, now)).toBe('2 weeks ago');
  });
});

describe('computeRecap', () => {
  const challenges = [
    { id: 1, title: 'First SELECT', difficulty: 'Easy' },
    { id: 2, title: 'Movie Tiers', difficulty: 'Medium' },
    { id: 3, title: 'Employee Ranking', difficulty: 'Hard' },
  ];

  it('returns null for empty attempts', () => {
    expect(computeRecap([])).toBeNull();
    expect(computeRecap(null)).toBeNull();
  });

  it('returns structured recap for a simple last session', () => {
    const now = Date.now();
    const attempts = [
      mkAttempt(1, now - 5 * DAY - 5 * MIN, true, ['SELECT Basics']),
      mkAttempt(2, now - 5 * DAY - 2 * MIN, true, ['CASE Statements']),
      // Now — more than 2 hours later, so this last session is "the past"
    ];
    const recap = computeRecap(attempts, challenges, { 'SELECT Basics': 30, 'CASE Statements': 25 }, now);
    expect(recap).not.toBeNull();
    expect(recap.attempted).toBe(2);
    expect(recap.solved).toBe(2);
    expect(recap.timeAgoLabel).toMatch(/days ago/);
  });

  it('identifies challenges the user struggled with (2+ failed attempts)', () => {
    const now = Date.now();
    const t = now - 3 * DAY;
    const attempts = [
      mkAttempt(2, t, false, ['CASE Statements']),       // fail
      mkAttempt(2, t + 2 * MIN, false, ['CASE Statements']),  // fail again
      mkAttempt(2, t + 5 * MIN, false, ['CASE Statements']),  // still fail
      mkAttempt(1, t + 10 * MIN, true),                   // solve other challenge
    ];
    const recap = computeRecap(attempts, challenges, {}, now);
    expect(recap.struggledWith).toHaveLength(1);
    expect(recap.struggledWith[0].challengeId).toBe(2);
    expect(recap.struggledWith[0].attempts).toBe(3);
    expect(recap.struggledWith[0].title).toBe('Movie Tiers');
  });

  it('excludes eventually-solved challenges from struggledWith', () => {
    const now = Date.now();
    const t = now - 3 * DAY;
    const attempts = [
      mkAttempt(2, t, false, ['CASE Statements']),
      mkAttempt(2, t + 2 * MIN, true, ['CASE Statements']), // eventually solved
    ];
    const recap = computeRecap(attempts, challenges, {}, now);
    expect(recap.struggledWith).toHaveLength(0);
  });

  it('suggests struggled-on challenge as resume suggestion', () => {
    const now = Date.now();
    const t = now - 3 * DAY;
    const attempts = [
      mkAttempt(2, t, false, ['CASE Statements']),
      mkAttempt(2, t + 2 * MIN, false, ['CASE Statements']),
    ];
    const recap = computeRecap(attempts, challenges, {}, now);
    expect(recap.resumeSuggestion).not.toBeNull();
    expect(recap.resumeSuggestion.challengeId).toBe(2);
    expect(recap.resumeSuggestion.reason).toMatch(/stuck here/);
  });

  it('suggests last-attempted challenge when no struggles', () => {
    const now = Date.now();
    const t = now - 3 * DAY;
    const attempts = [
      mkAttempt(1, t, true, ['SELECT']),
      mkAttempt(2, t + 5 * MIN, true, ['CASE']),
    ];
    const recap = computeRecap(attempts, challenges, {}, now);
    expect(recap.resumeSuggestion).not.toBeNull();
    expect(recap.resumeSuggestion.challengeId).toBe(2);
    expect(recap.resumeSuggestion.reason).toMatch(/left off/);
  });

  it('returns top skill growth based on topic frequency', () => {
    const now = Date.now();
    const t = now - 3 * DAY;
    const attempts = [
      mkAttempt(1, t, true, ['SELECT Basics']),
      mkAttempt(2, t + 1 * MIN, true, ['CASE Statements']),
      mkAttempt(1, t + 2 * MIN, true, ['SELECT Basics']),
    ];
    const skillLevels = { 'SELECT Basics': 50, 'CASE Statements': 25, 'Window Functions': 10 };
    const recap = computeRecap(attempts, challenges, skillLevels, now);
    // SELECT Basics appears twice, CASE once — SELECT first
    expect(recap.topSkillGrowth[0].skill).toBe('SELECT Basics');
    expect(recap.topSkillGrowth[0].level).toBe(50);
  });
});
