// Streak freeze: pure functions for auto-applying freezes on missed daily challenges.
// Tested in tests/streak-freeze.test.js. Keep in sync with inline copy in app.jsx.

export const FREEZES_PER_MONTH = 2;

// Days between two YYYY-MM-DD strings (b - a). Positive if b > a.
export const daysBetweenDateStrings = (a, b) => {
  const pa = new Date(a + 'T00:00:00Z').getTime();
  const pb = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((pb - pa) / 86400000);
};

// YYYY-MM-DD that is N days before the given YYYY-MM-DD string.
export const dateNDaysBefore = (dateStr, n) => {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

/**
 * Compute how a missed-day gap should affect streak and freeze budget.
 *
 * @param {Object} input
 * @param {string|null} input.lastDailyChallenge - YYYY-MM-DD of last completed daily (null for new user)
 * @param {string} input.today - YYYY-MM-DD of current day
 * @param {number} input.currentStreak - dailyStreak from userData
 * @param {number} input.freezes - current freeze budget (0 to FREEZES_PER_MONTH)
 * @param {string} input.lastRefillMonth - YYYY-MM when freezes were last refilled
 * @param {string} input.currentMonth - YYYY-MM of current day
 * @returns {{ newStreak: number, newFreezes: number, toast: Object|null, freezeDates: string[] }}
 */
export const computeStreakFreezeUpdate = ({
  lastDailyChallenge,
  today,
  currentStreak,
  freezes,
  lastRefillMonth,
  currentMonth
}) => {
  // Monthly refill — applies before any consumption.
  let nextFreezes = lastRefillMonth !== currentMonth ? FREEZES_PER_MONTH : freezes;
  let nextStreak = currentStreak;
  let toast = null;
  const freezeDates = [];

  // No streak to protect, or no previous daily, or already done today → no-op.
  if (!lastDailyChallenge || currentStreak <= 0 || lastDailyChallenge === today) {
    return { newStreak: nextStreak, newFreezes: nextFreezes, toast, freezeDates };
  }

  const gap = daysBetweenDateStrings(lastDailyChallenge, today);
  if (gap <= 1) {
    // Did yesterday (gap=1) or somehow same day (gap=0, guarded above) → streak intact.
    return { newStreak: nextStreak, newFreezes: nextFreezes, toast, freezeDates };
  }

  const missed = gap - 1;
  if (nextFreezes >= missed) {
    nextFreezes -= missed;
    toast = { daysFrozen: missed, remaining: nextFreezes, streak: nextStreak };
    for (let i = 1; i <= missed; i++) {
      freezeDates.push(dateNDaysBefore(today, i));
    }
  } else {
    // Not enough freezes — streak breaks.
    nextStreak = 0;
  }

  return { newStreak: nextStreak, newFreezes: nextFreezes, toast, freezeDates };
};
