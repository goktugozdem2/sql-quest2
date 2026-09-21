// The streak card (founder QA 2026-09-21): the Daily Reward modal rewarded
// opening the app, showed two contradictory counts of the same visits, and
// blocked the Learning Path. These pin the replacement — one practice number,
// a reward only for a solved question, a card that never blocks.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { appDayOf, dayBefore, practiceDays, weekDots, streakCardModel, DAILY_REWARD_XP } from '../src/utils/streak-card.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(resolve(root, 'src/app.jsx'), 'utf8');

describe('the app day', () => {
  it('rolls over at 11:00 GMT+3, like the daily challenge and the streak', () => {
    // 07:59 UTC = 10:59 GMT+3 → still the previous day
    expect(appDayOf(Date.UTC(2026, 8, 21, 7, 59))).toBe('2026-09-20');
    // 08:00 UTC = 11:00 GMT+3 → the new day
    expect(appDayOf(Date.UTC(2026, 8, 21, 8, 0))).toBe('2026-09-21');
    // 22:00 UTC = 01:00 GMT+3 next calendar day, still before 11:00 → same app day
    expect(appDayOf(Date.UTC(2026, 8, 21, 22, 0))).toBe('2026-09-21');
  });

  it('agrees with the rule in app.jsx', () => {
    const src = app.slice(app.indexOf('const getDailyChallengeDate'), app.indexOf('const getDailyChallengeDate') + 400);
    expect(src).toContain('3 * 60 * 60 * 1000');
    expect(src).toContain('hours < 11');
  });

  it('steps back across a month boundary', () => {
    expect(dayBefore('2026-10-01')).toBe('2026-09-30');
    expect(dayBefore('2026-09-21', 6)).toBe('2026-09-15');
  });
});

describe('practice days come from solved attempts, not visits', () => {
  it('counts only successful attempts', () => {
    const days = practiceDays([
      { success: true, timestamp: Date.UTC(2026, 8, 20, 12) },
      { success: false, timestamp: Date.UTC(2026, 8, 19, 12) },
      { success: true, timestamp: Date.UTC(2026, 8, 21, 9) },
    ]);
    expect([...days].sort()).toEqual(['2026-09-20', '2026-09-21']);
  });

  it('survives junk', () => {
    expect(practiceDays(null).size).toBe(0);
    expect(practiceDays([null, { success: true }]).size).toBe(0);
  });
});

describe('the week row', () => {
  it('seven dots, oldest first, ending today', () => {
    const dots = weekDots({ today: '2026-09-21', practiced: new Set(['2026-09-20', '2026-09-19']), frozen: new Set(['2026-09-18']) });
    expect(dots).toHaveLength(7);
    expect(dots[0].day).toBe('2026-09-15');
    expect(dots[6]).toMatchObject({ day: '2026-09-21', state: 'today', letter: 'M' });
    expect(dots[5].state).toBe('done');
    expect(dots[3].state).toBe('frozen');
    expect(dots[0].state).toBe('miss');
  });

  it('today is done once solved', () => {
    const dots = weekDots({ today: '2026-09-21', practiced: new Set(['2026-09-21']) });
    expect(dots[6].state).toBe('done');
  });
});

describe('what the card says', () => {
  it('one number, from the practice streak', () => {
    const m = streakCardModel({ streak: 3, best: 16, solvedToday: true, claimedToday: false });
    expect(m.headline).toBe('Day 3. Keep it going.');
    expect(m.headline).not.toMatch(/!/);
  });

  it('the reward waits for a solve — opening the app earns nothing', () => {
    const m = streakCardModel({ streak: 3, solvedToday: false });
    expect(m.cta).toBe('solve');
    expect(m.body).toBe('Solve one question today to keep your streak.');
    expect(streakCardModel({ streak: 3, solvedToday: true }).cta).toBe('claim');
  });

  it('once claimed, there is nothing to press', () => {
    const m = streakCardModel({ streak: 3, solvedToday: true, claimedToday: true });
    expect(m.cta).toBeNull();
    expect(m.claimedLine).toBe(`+${DAILY_REWARD_XP} XP claimed today.`);
    expect(m.pulse).toBe(false);
  });

  it('best: the gap to beat, hidden on the day a streak resets', () => {
    expect(streakCardModel({ streak: 3, best: 16, solvedToday: true }).bestLine).toBe('Best: 16. 13 to beat.');
    expect(streakCardModel({ streak: 1, best: 16, solvedToday: true }).bestLine).toBeNull();
    expect(streakCardModel({ streak: 0, best: 16 }).bestLine).toBeNull();
    expect(streakCardModel({ streak: 16, best: 16, solvedToday: true }).bestLine).toBeNull();
  });

  it('an interview person keeps the streak and gets no XP handout', () => {
    const m = streakCardModel({ streak: 3, solvedToday: true, rewardOn: false });
    expect(m.cta).toBeNull();
    expect(m.claimedLine).toBeNull();
    expect(m.headline).toBe('Day 3. Keep it going.');
  });

  it('a new streak reads as a start, not a zero', () => {
    const m = streakCardModel({ streak: 0 });
    expect(m.headline).toBe('Day 1 starts with one question.');
    expect(m.pulse).toBe(false);
  });

  it('pulses for a waiting reward or a live streak with today open', () => {
    expect(streakCardModel({ streak: 3, solvedToday: true }).pulse).toBe(true);
    expect(streakCardModel({ streak: 3, solvedToday: false }).pulse).toBe(true);
  });
});

describe('source guards: the modal is gone', () => {
  it('no blocking daily-reward modal, no login streak on screen', () => {
    expect(app).not.toContain('showLoginReward &&');
    expect(app).not.toContain("i18n_t('streakModal', 'daysLogged'");
    expect(app).not.toContain("i18n_t('streakModal', 'claimReward')");
  });

  it('the card is not a modal: no backdrop, no fixed inset-0', () => {
    const at = app.indexOf('data-testid="streak-card"');
    expect(at).toBeGreaterThan(-1);
    const open = app.lastIndexOf('<div', at);
    expect(app.slice(open, at)).not.toMatch(/inset-0/);
  });

  it('the claim only exists after a solve', () => {
    const fn = app.slice(app.indexOf('const claimDailyReward'), app.indexOf('const claimDailyReward') + 900);
    expect(fn).toContain('lastStreakDay !== today');
    expect(fn).toContain('DAILY_REWARD_XP');
  });

  it('only 🔥 survives as emoji on the card', () => {
    const at = app.indexOf('data-testid="streak-card"');
    const card = app.slice(at, app.indexOf('{/* /streak-card */}', at));
    for (const e of ['🎁', '🏆', '🎉', '⭐', '🥇', '👑']) expect(card).not.toContain(e);
  });
});

describe('founder QA round 2 (2026-09-21)', () => {
  it('backfilled attempts are never a practice day', () => {
    const days = practiceDays([
      { success: true, backfilled: true, timestamp: Date.UTC(2026, 8, 20, 12) },
      { success: true, timestamp: Date.UTC(2026, 8, 21, 12) },
    ]);
    expect([...days]).toEqual(['2026-09-21']);
  });

  it('"Solve one now" opens one question — the plan\'s first — not the list', () => {
    const fn = app.slice(app.indexOf('const openStreakQuestion = () => {'), app.indexOf('const openStreakQuestion = () => {') + 1600);
    expect(fn).toContain('buildPracticePlan(');
    expect(fn).toContain('plan.today[0]');
    expect(fn).toContain('pickNextChallenge(');       // fallback: curriculum order, never raw
    expect(fn).toContain('openChallenge(ch)');
    const card = app.slice(app.indexOf('data-testid="streak-solve"'), app.indexOf('data-testid="streak-solve"') + 200);
    expect(card).toContain('onClick={openStreakQuestion}');
  });

  it('at 0 the header shows an outlined flame and a dot on an unpractised day', () => {
    expect(app).toContain('data-testid="streak-flame-empty"');
    expect(app).toContain('data-testid="streak-dot"');
  });
});
