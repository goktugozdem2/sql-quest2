// P2 (2026-09-12): spaced retrieval at 3/7/14 days on weak skills, and the
// daily quota by target date. Pure logic plus source guards on the Coach card.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  INTERVALS_DAYS, WEAK_BELOW, MAX_DUE_SHOWN, intervalForReview, dueRetrievals, pickRetrievalChallenge,
  recordRetrieval, nextReviewInDays, dailyQuota,
} from '../src/utils/spaced-retrieval.js';
import { buildUserSkill } from '../src/utils/user-skill.js';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const DAY = 86400000;
const NOW = Date.parse('2026-09-12T12:00:00Z');
const BANK = [
  { id: 174, difficulty: 'Easy', skills: ['JOIN'], category: 'Joins' },
  { id: 6, difficulty: 'Medium', skills: ['INNER JOIN'], category: 'Joins' },
  { id: 19, difficulty: 'Medium', skills: ['LEFT JOIN'], category: 'Joins' },
  { id: 47, difficulty: 'Hard', skills: ['Window Functions'], category: 'Window Functions' },
];
const rows = (daysAgo, mastery, skill = 'Joins') => buildUserSkill({
  attempts: [{ challengeId: 174, success: true, timestamp: NOW - daysAgo * DAY, topics: [skill === 'Joins' ? 'JOIN' : skill] }],
  skillLevels: { [skill]: mastery },
  allChallenges: BANK,
});

describe('the schedule — 3, 7, 14 days after the last practice, weak skills only', () => {
  it('intervals step with reviews done and hold at the last one', () => {
    expect(INTERVALS_DAYS).toEqual([3, 7, 14]);
    expect([0, 1, 2, 3, 9].map(intervalForReview)).toEqual([3, 7, 14, 14, 14]);
  });

  it('is due once the interval has passed, and never for a strong or untouched skill', () => {
    expect(dueRetrievals({ userSkill: rows(2, 40), now: NOW })).toEqual([]);
    const due = dueRetrievals({ userSkill: rows(3, 40), now: NOW });
    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({ skill: 'Joins', mastery: 40, daysSince: 3, interval: 3, reviewsDone: 0, overdueDays: 0 });
    expect(dueRetrievals({ userSkill: rows(30, WEAK_BELOW), now: NOW })).toEqual([]);
    expect(dueRetrievals({ userSkill: buildUserSkill({ skillLevels: { Joins: 10 } }), now: NOW })).toEqual([]);
  });

  it('after a review the next interval applies; most overdue first', () => {
    const log = recordRetrieval({}, 'Joins', NOW - 10 * DAY);
    expect(log.Joins.done).toBe(1);
    expect(dueRetrievals({ userSkill: rows(5, 40), retrievalLog: log, now: NOW })).toEqual([]);      // waits 7 now
    expect(dueRetrievals({ userSkill: rows(8, 40), retrievalLog: log, now: NOW })[0].interval).toBe(7);
    const two = buildUserSkill({
      attempts: [
        { challengeId: 174, success: true, timestamp: NOW - 20 * DAY, topics: ['JOIN'] },
        { challengeId: 47, success: false, timestamp: NOW - 4 * DAY, topics: ['Window Functions'] },
      ],
      skillLevels: { Joins: 30, 'Window Functions': 20 },
      allChallenges: BANK,
    });
    expect(dueRetrievals({ userSkill: two, now: NOW }).map(d => d.skill)).toEqual(['Joins', 'Window Functions']);
    expect(nextReviewInDays({ userSkill: rows(1, 40), skill: 'Joins', now: NOW })).toBe(2);
    expect(nextReviewInDays({ userSkill: rows(1, 40), skill: 'NULL Handling', now: NOW })).toBeNull();
    expect(MAX_DUE_SHOWN).toBe(2);
  });

  it('picks recall at the level shown, unsolved and unlocked, in the caller\'s order', () => {
    const userSkill = rows(3, 40);
    const attempts = [{ challengeId: 174, success: true, timestamp: NOW - 3 * DAY, topics: ['JOIN'] }];
    const pick = pickRetrievalChallenge({ skill: 'Joins', userSkill, allChallenges: BANK, attempts, solved: new Set([174]) });
    // Easy is the level shown; 174 is solved; no other Easy → falls to any open, lowest id
    expect(pick.id).toBe(6);
    expect(pickRetrievalChallenge({ skill: 'Joins', userSkill, allChallenges: BANK, attempts, solved: new Set([174, 6, 19]) })).toBeNull();
    expect(pickRetrievalChallenge({ skill: 'Joins', userSkill, allChallenges: BANK, attempts, solved: new Set([174]), isLocked: c => c.id === 6 }).id).toBe(19);
    expect(pickRetrievalChallenge({ skill: 'Joins', userSkill, allChallenges: BANK, attempts, solved: new Set([174]), comparator: (a, b) => b.id - a.id }).id).toBe(19);
  });
});

describe('daily quota — what is left over the days left', () => {
  it('12 days, 68 left → 6 a day; past due → today; nothing without a date or nothing left', () => {
    expect(dailyQuota({ daysOut: 12, remaining: 68 })).toEqual({ daysOut: 12, remaining: 68, perDay: 6 });
    expect(dailyQuota({ daysOut: 0, remaining: 5 })).toEqual({ daysOut: 0, remaining: 5, perDay: 5 });
    expect(dailyQuota({ daysOut: null, remaining: 5 })).toBeNull();
    expect(dailyQuota({ daysOut: 3, remaining: 0 })).toBeNull();
    expect(dailyQuota({ daysOut: 45, remaining: 27 })).toEqual({ daysOut: 45, remaining: 27, perDay: 1 });
  });
});

describe('source guards — the Coach card and the chip are flagged and off', () => {
  const app = read('../src/app.jsx');
  const flags = read('../src/data/feature-flags.js');
  it('flags exist and are off; the card sits between the radar and the countdown; a review is credited on the solve', () => {
    expect(flags).toMatch(/^\s+spacedRetrievalCard: false,/m);
    expect(flags).toMatch(/^\s+dailyQuota: false,/m);
    const radarAt = app.indexOf('data-testid="coach-radar-panel"');
    const cardAt = app.indexOf('data-testid="coach-retrieval-card"');
    const countdownAt = app.indexOf("window.FF?.feature?.('interviewCountdown') === true && (() => {");
    expect(cardAt).toBeGreaterThan(radarAt);
    expect(cardAt).toBeLessThan(countdownAt);
    expect(app).toMatch(/ftbFlag\('spacedRetrievalCard'\)/);
    expect(app).toMatch(/setRetrievalLog\(prev => recordRetrieval\(prev, pending\.skill\)\)/);
    expect(app).toMatch(/trackActivationEvent\('retrieval_completed'/);
    expect(app).toMatch(/retrievalLog: retrievalLog,/);
    expect(app).toMatch(/data-testid="coach-daily-quota"/);
  });
});
