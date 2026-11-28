// Two measurement gaps from the 2026-11-27 retention read
// (docs/reads/retention-drivers-2026-11-27.md, papercuts):
// 1. app_opened.isGuest was false on 11,763 of 11,764 rows: a cold visitor's
//    first render is already settled (isSessionLoading false), so the event
//    fired before startGuestMode() set the isGuest state.
// 2. The daily challenge had no event of its own.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { isGuestSession } from '../src/utils/session-boot.js';

const app = fs.readFileSync(path.join(import.meta.dirname, '..', 'src/app.jsx'), 'utf8');
const body = (name, len = 2400) => { const i = app.indexOf(`const ${name} = () => {`); expect(i).toBeGreaterThan(0); return app.slice(i, i + len); };

describe('isGuestSession', () => {
  it('a pre-login visitor (no session yet) is a guest — the app_opened case', () => {
    expect(isGuestSession({ currentUser: null, isGuest: false })).toBe(true);
    expect(isGuestSession({ currentUser: '', isGuest: false })).toBe(true);
    expect(isGuestSession({ currentUser: undefined, isGuest: undefined })).toBe(true);
  });
  it('a guest_* session is a guest, whatever the state says', () => {
    expect(isGuestSession({ currentUser: 'guest_1790000000000', isGuest: false })).toBe(true);
    expect(isGuestSession({ currentUser: 'guest_1790000000000', isGuest: true })).toBe(true);
  });
  it('a signed-in account is not a guest', () => {
    expect(isGuestSession({ currentUser: 'ayse', isGuest: false })).toBe(false);
  });
  it('the isGuest state wins when it is true', () => {
    expect(isGuestSession({ currentUser: 'ayse', isGuest: true })).toBe(true);
  });
  it('always returns a real boolean', () => {
    for (const s of [{ currentUser: null, isGuest: false }, { currentUser: 'x', isGuest: false }, { currentUser: 'guest_1', isGuest: true }]) {
      expect(typeof isGuestSession(s)).toBe('boolean');
    }
  });
});

describe('app_opened stamps isGuest at the event, not from the stale state', () => {
  it('app_opened passes isGuestSession({ currentUser, isGuest })', () => {
    const at = app.indexOf("trackActivationEvent('app_opened', {");
    expect(at).toBeGreaterThan(0);
    expect(app.slice(at, at + 600)).toContain('isGuest: isGuestSession({ currentUser, isGuest }),');
  });
  it("trackActivationEvent keeps an event's own isGuest instead of overwriting it", () => {
    expect(app).toContain("isGuest: typeof metadata.isGuest === 'boolean' ? metadata.isGuest : !!isGuest,");
    expect(app).not.toMatch(/attemptCount: challengeAttempts\.length,\n\s*isGuest: !!isGuest,/);
  });
});

describe('the daily challenge has its own events', () => {
  it('daily_challenge_opened fires once the daily is actually shown, with date and difficulty', () => {
    const b = body('openDailyChallenge');
    const shown = b.indexOf('setShowDailyChallenge(true);');
    const ev = b.indexOf("trackActivationEvent('daily_challenge_opened', {");
    expect(b.indexOf('if (!challenge || !db) return;')).toBeLessThan(shown);
    expect(ev).toBeGreaterThan(shown);
    expect(b.slice(ev, ev + 300)).toMatch(/date: todayString,\s*difficulty: difficultyToUse \|\| null,/);
  });
  it('daily_challenge_solved fires only on a correct core query, with date and difficulty', () => {
    const b = body('submitDailyChallenge');
    const ok = b.indexOf('if (dailyCorrect) {');
    const wrong = b.indexOf("setDailyChallengeStatus('error');");
    const ev = b.indexOf("trackActivationEvent('daily_challenge_solved', {");
    expect(ok).toBeGreaterThan(0);
    expect(ev).toBeGreaterThan(ok);
    expect(ev).toBeLessThan(wrong);
    expect(b.slice(ev, ev + 300)).toMatch(/date: todayString,\s*difficulty: activeDailyDifficulty \|\| null,/);
  });
  it('both events are defined in docs/agent/metrics.md (rule 6b)', () => {
    const metrics = fs.readFileSync(path.join(import.meta.dirname, '..', 'docs/agent/metrics.md'), 'utf8');
    expect(metrics).toContain('## `daily_challenge_use`');
    expect(metrics).toContain('`daily_challenge_opened');
    expect(metrics).toContain('`daily_challenge_solved');
  });
});
