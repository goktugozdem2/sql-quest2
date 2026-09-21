// The streak card — what replaced the Daily Reward modal (founder QA,
// 2026-09-21).
//
// ── What was wrong ──────────────────────────────────────────────────────────
// The modal opened over the Learning Path on the first visit of the day and
// rewarded the VISIT. It read `loginStreak`, a count of consecutive days the
// app was opened, and beside it "N days logged", the month's total of the same
// visits — so one card said "1 day streak" and "5 days logged" at once. The
// header, meanwhile, already showed a different and better number:
// `dailyStreak`, which `recordDailyActivity` moves only on a correct submit.
// Two streaks, one of them measuring the wrong thing, and the wrong one was
// the one we celebrated.
//
// ── What this encodes ───────────────────────────────────────────────────────
// One number: `dailyStreak`, days in a row with at least one solved question.
// The reward (+10 XP) is claimable once today's question is solved, never for
// opening the app. The card is not a modal: a chip in the header opens it, and
// it slides in once on the day's first solve. Nothing here writes; the app
// owns the state and this file only decides what the card says.

export const DAILY_REWARD_XP = 10;

// The app's day: GMT+3, rolling over at 11:00 (getDailyChallengeDate in
// app.jsx). A solve at 09:00 Istanbul time belongs to the previous day, the
// same as the daily challenge and the streak itself. Anything else would put a
// dot on a day the streak does not count.
export function appDayOf(ts) {
  const d = new Date(Number(ts) + 3 * 60 * 60 * 1000);
  if (d.getUTCHours() < 11) d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function dayBefore(day, n = 1) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** The set of app-days on which at least one attempt succeeded. */
export function practiceDays(attempts) {
  const out = new Set();
  for (const a of Array.isArray(attempts) ? attempts : []) {
    // backfilled attempts are synthetic (dated ~30 days back) — never a practice day
    if (a && a.success && !a.backfilled && Number.isFinite(Number(a.timestamp))) out.add(appDayOf(a.timestamp));
  }
  return out;
}

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Seven dots, oldest first, ending today.
 *   done    a question was solved that day
 *   frozen  a streak freeze covered it (completedDailyChallenges[day] === 'freeze')
 *   today   today, not solved yet — the one dot still open
 *   miss    nothing
 */
export function weekDots({ today, practiced = new Set(), frozen = new Set() }) {
  const dots = [];
  for (let i = 6; i >= 0; i--) {
    const day = dayBefore(today, i);
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    let state = 'miss';
    if (practiced.has(day)) state = 'done';
    else if (frozen.has(day)) state = 'frozen';
    else if (day === today) state = 'today';
    dots.push({ day, letter: LETTERS[weekday], state });
  }
  return dots;
}

/**
 * What the card says.
 *
 * @param streak       dailyStreak as the app holds it (already 0 after a break)
 * @param best         maxDailyStreak
 * @param solvedToday  lastStreakDay === today
 * @param claimedToday the day's +10 has been taken
 * @param rewardOn     false for an interview person: the streak is a plan and
 *                     stays, the XP handout is a game element and does not
 */
// The card's words. The app passes its own translator (i18n `streakCard`);
// these are the English fallback, and the keys the translator is asked for.
export const STREAK_CARD_EN = {
  headline: 'Day {n}. Keep it going.',
  headlineStart: 'Day 1 starts with one question.',
  bodyKeep: 'Solve one question today to keep your streak.',
  bodyStart: 'Solve one question to start a streak.',
  best: 'Best: {best}. {gap} to beat.',
  claimed: '+{xp} XP claimed today.',
  claimCta: 'Claim +{xp} XP',
  solveCta: 'Solve one now',
  chipTitle: 'Your practice streak',
  close: 'Close',
};

const fill = (s, p = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (p[k] !== undefined ? p[k] : `{${k}}`));
const enT = (key, params) => fill(STREAK_CARD_EN[key] || key, params);

export function streakCardModel({ streak = 0, best = 0, solvedToday = false, claimedToday = false, rewardOn = true, t = enT } = {}) {
  const n = Math.max(0, Number(streak) || 0);
  const b = Math.max(n, Number(best) || 0);

  const headline = n > 0 ? t('headline', { n }) : t('headlineStart');

  let body = null;
  if (!solvedToday) {
    body = n > 0 ? t('bodyKeep') : t('bodyStart');
  }

  // "Best: 16. 13 to beat." — only while there is a gap to close, and never
  // on the day a streak resets (n ≤ 1), when the gap is a reproach.
  const bestLine = n > 1 && b > n ? t('best', { best: b, gap: b - n }) : null;

  let cta = null;
  if (!solvedToday) cta = 'solve';
  else if (rewardOn && !claimedToday) cta = 'claim';

  const claimedLine = solvedToday && rewardOn && claimedToday ? t('claimed', { xp: DAILY_REWARD_XP }) : null;

  // The chip pulses when there is something to do that the person would want
  // to know about: a reward waiting, or a live streak with today still open.
  const pulse = cta === 'claim' || (cta === 'solve' && n > 0);

  const ctaLabel = cta === 'claim' ? t('claimCta', { xp: DAILY_REWARD_XP }) : cta === 'solve' ? t('solveCta') : null;

  return { streak: n, best: b, headline, body, bestLine, cta, ctaLabel, claimedLine, pulse };
}

