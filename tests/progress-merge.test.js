import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mergeProgress, hasProgress, isResumableGuest, xpForChallenge, GUEST_USER_KEY, GUEST_MAX_IDLE_DAYS } from '../src/utils/progress-merge.js';

const CHALLENGES = [
  { id: 91, difficulty: 'Easy', xpReward: 10 },
  { id: 105, difficulty: 'Easy', xpReward: 15 },
  { id: 1, difficulty: 'Medium', xpReward: 25 },
  { id: 23, difficulty: 'Hard', xpReward: 50 },
];
const account = () => ({
  username: 'ada', passwordHash: 'h', salt: 's', email: 'a@x.io', emailVerified: true,
  xp: 100, queryCount: 12, solvedChallenges: [91, 1], unlockedAchievements: ['first_query'],
  challengeAttempts: [{ challengeId: 91, timestamp: 1000, success: true }, { challengeId: 1, timestamp: 2000, success: true }],
  datasetsUsed: ['titanic'], dailyStreak: 2, maxDailyStreak: 5, lastStreakDay: '2026-09-01',
  coachState: { goalId: 'fundamentals' }, proStatus: true, proType: 'monthly', proExpiry: '2026-10-01',
  createdAt: 111, lives: 3, streakFreezes: 1,
});
const guest = () => ({
  username: 'guest_1', isGuest: true, deviceId: 'dev-9', sessionStartAt: 'x',
  xp: 40, queryCount: 5, solvedChallenges: [91, 105, 23], unlockedAchievements: ['first_query', 'challenge_5'],
  challengeAttempts: [{ challengeId: 91, timestamp: 1000, success: true }, { challengeId: 105, timestamp: 3000, success: true }, { challengeId: 23, timestamp: 4000, success: true }],
  datasetsUsed: ['titanic', 'movies'], dailyStreak: 4, maxDailyStreak: 4, lastStreakDay: '2026-09-11',
  goals: { role: 'analyst' }, proStatus: true, proType: 'lifetime', createdAt: 222, lastActive: Date.now(),
});

describe('mergeProgress — unions, and the account wins on identity and money', () => {
  const { merged, summary } = mergeProgress(account(), guest(), { challenges: CHALLENGES });

  it('adds only the solves the account did not have, and their XP at the challenge rate', () => {
    expect(merged.solvedChallenges).toEqual([91, 1, 105, 23]);
    expect(summary).toEqual({ newSolves: 2, newAttempts: 2, xpAdded: 65, guestSolves: 3 });
    expect(merged.xp).toBe(165);
  });

  it('dedupes attempts by (challengeId, timestamp) and keeps them in time order', () => {
    expect(merged.challengeAttempts.map(t => t.timestamp)).toEqual([1000, 2000, 3000, 4000]);
  });

  it('unions the collections and keeps the later streak day and the larger streak', () => {
    expect(merged.unlockedAchievements).toEqual(['first_query', 'challenge_5']);
    expect(merged.datasetsUsed).toEqual(['titanic', 'movies']);
    expect(merged.dailyStreak).toBe(4);
    expect(merged.maxDailyStreak).toBe(5);
    expect(merged.lastStreakDay).toBe('2026-09-11');
    expect(merged.queryCount).toBe(17);
  });

  it('never lets guest Pro, guest identity or guest-only session fields through', () => {
    expect(merged.proType).toBe('monthly');
    expect(merged.proExpiry).toBe('2026-10-01');
    expect(merged.username).toBe('ada');
    expect(merged.passwordHash).toBe('h');
    expect(merged.createdAt).toBe(111);
    expect(merged.isGuest).toBeUndefined();
    expect(merged.sessionStartAt).toBeUndefined();
    expect(merged.lives).toBe(3);
  });

  it('carries guest-only fields the account never had, and the device link', () => {
    expect(merged.goals).toEqual({ role: 'analyst' });
    expect(merged.coachState).toEqual({ goalId: 'fundamentals' });
    expect(merged.deviceId).toBe('dev-9');
  });

  it('is idempotent: merging the same guest again adds nothing', () => {
    const again = mergeProgress(merged, guest(), { challenges: CHALLENGES });
    expect(again.summary.newSolves).toBe(0);
    expect(again.summary.newAttempts).toBe(0);
    expect(again.summary.xpAdded).toBe(0);
    expect(again.merged.xp).toBe(165);
    expect(again.merged.solvedChallenges).toEqual(merged.solvedChallenges);
  });

  it('into a brand-new account (the register path) it is simply the guest progress with the new identity', () => {
    const fresh = { salt: 's2', passwordHash: 'h2', email: 'b@x.io', emailVerified: true, xp: 0, solvedChallenges: [], proStatus: false, proType: null, createdAt: 333 };
    const r = mergeProgress(fresh, guest(), { challenges: CHALLENGES });
    expect(r.merged.solvedChallenges).toEqual([91, 105, 23]);
    expect(r.merged.xp).toBe(75);
    expect(r.merged.proStatus).toBe(false);
    expect(r.merged.passwordHash).toBe('h2');
    expect(r.summary.newSolves).toBe(3);
  });

  it('tolerates garbage on either side', () => {
    expect(mergeProgress(null, null).summary).toEqual({ newSolves: 0, newAttempts: 0, xpAdded: 0, guestSolves: 0 });
    expect(mergeProgress({ solvedChallenges: 'nope' }, { challengeAttempts: 7 }).merged.solvedChallenges).toEqual([]);
  });
});

describe('hasProgress / isResumableGuest / xpForChallenge', () => {
  it('a bouncer has no progress; a solver or an XP holder does', () => {
    expect(hasProgress({ username: 'guest_1', isGuest: true })).toBe(false);
    expect(hasProgress({ solvedChallenges: [91] })).toBe(true);
    expect(hasProgress({ xp: 5 })).toBe(true);
    expect(hasProgress(null)).toBe(false);
    // a completed onboarding intake is worth keeping; a half-written one is not
    expect(hasProgress({ intake: { version: 1, goal: 'interview', completedAt: '2026-09-12T00:00:00Z' } })).toBe(true);
    expect(hasProgress({ intake: { version: 1 } })).toBe(false);
  });

  it('resumes a guest with progress inside the idle window, and only a guest', () => {
    const now = Date.now();
    expect(isResumableGuest('guest_1', { solvedChallenges: [91], lastActive: now - 5 * 86400000 }, now)).toBe(true);
    expect(isResumableGuest('guest_1', { solvedChallenges: [91], lastActive: now - (GUEST_MAX_IDLE_DAYS + 1) * 86400000 }, now)).toBe(false);
    expect(isResumableGuest('guest_1', { solvedChallenges: [91] }, now)).toBe(true); // no stamp → keep the work
    expect(isResumableGuest('guest_1', { isGuest: true }, now)).toBe(false);
    expect(isResumableGuest('ada', { solvedChallenges: [91] }, now)).toBe(false);
    expect(GUEST_USER_KEY).toBe('sqlquest_guest_user');
  });

  it('XP falls back by difficulty when the challenge is unknown', () => {
    expect(xpForChallenge(23, CHALLENGES)).toBe(50);
    expect(xpForChallenge(999, CHALLENGES)).toBe(10);
    expect(xpForChallenge(5, [{ id: 5, difficulty: 'Hard' }])).toBe(30);
  });
});

describe('source guards — app.jsx keeps the guest, resumes it, and merges it', () => {
  const app = readFileSync(fileURLToPath(new URL('../src/app.jsx', import.meta.url)), 'utf8');

  it('a fresh guest identity is remembered under GUEST_USER_KEY, and an old one is cleaned up', () => {
    expect(app).toMatch(/localStorage\.setItem\(GUEST_USER_KEY, sessionUsername\)/);
    expect(app).toMatch(/const readResumableGuest = \(\) =>/);
  });

  it('startGuestMode resumes from the LOCAL blob only, never cloud-first', () => {
    expect(app).toMatch(/await loadUserSession\(resumeGuest, \{ localOnly: true \}\)/);
    expect(app).toMatch(/if \(options\.localOnly\) \{/);
    // a resumed guest must not be persisted as sqlquest_user, or the legacy guard deletes the blob on the next load
    expect(app).toMatch(/if \(!options\.localOnly\) localStorage\.setItem\('sqlquest_user', username\);/);
  });

  it('login merges before the session loads, register carries the guest blob, and both forget the guest afterwards', () => {
    expect(app).toMatch(/await mergeGuestIntoAccount\(username\)/);
    expect(app).toMatch(/mergeProgress\(newUserData, guestBlob/);
    expect(app).toMatch(/await saveUserData\(regUsername, registerData, \{ force: true \}\)/);
    expect((app.match(/forgetGuest\(/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(app).toMatch(/trackActivationEvent\('guest_progress_merged'/);
    expect(app).toMatch(/trackActivationEvent\('guest_resumed'/);
  });
});

describe('source guard — restoring a session never celebrates a level-up', () => {
  const app = readFileSync(fileURLToPath(new URL('../src/app.jsx', import.meta.url)), 'utf8');

  it('loadUserSession marks the restore and both XP effects honour it', () => {
    expect(app).toMatch(/xpRestoreRef\.current = true; \/\/ restoring saved XP is not a level-up/);
    expect(app).toMatch(/if \(xpDiff > 0 && prevXPRef\.current > 0 && !xpRestoreRef\.current\)/);
    expect(app).toMatch(/if \(prevLevelRef\.current && xp > 0 && !xpRestoreRef\.current\)/);
    // consumed on the first commit after the load, which isSessionLoading guarantees
    expect(app).toMatch(/xpRestoreRef\.current = false;\n  \}, \[currentLevel\.name, xp, isSessionLoading\]\);/);
  });
});
