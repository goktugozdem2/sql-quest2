// Spaced retrieval — weak skills come back at 3, 7 and 14 days.
//
// The founder's P2 (2026-09-12): "ask the weak tags again after 3-7-14 days.
// The landing says 'Tomorrow · spaced retrieval'; nothing is behind it."
// What existed: the Coach's retrieval_check steps inside a goal, and the
// lesson-1 spaced review. Nothing looked at the skill rows and said "it has
// been a week since you touched Joins and Joins is weak — do one".
//
// This module is the schedule and the pick; app.jsx renders the card and
// records the review. Everything comes from the user_skill rows
// (src/utils/user-skill.js): a skill is a candidate when it has been
// practised at all and its mastery is below WEAK_BELOW; it is DUE when the
// days since it was last practised reach the interval for its next review
// (the k-th review waits INTERVALS[min(k, last)] days). A review is a solve
// on that skill after the due moment; app.jsx increments the log.
//
// Pure. `now` is a parameter; the log is data.

import { CANONICAL_SKILLS } from './skill-calc.js';
import { challengeMatchesSkill } from './skill-drill.js';
import { nextDifficultyFor, highestSolvedDifficulty } from './user-skill.js';

export const INTERVALS_DAYS = [3, 7, 14];
export const WEAK_BELOW = 70;
export const MAX_DUE_SHOWN = 2;
const DAY_MS = 86400000;

/** Days the k-th review waits after the last practice. */
export function intervalForReview(k) {
  const i = Math.max(0, Number(k) || 0);
  return INTERVALS_DAYS[Math.min(i, INTERVALS_DAYS.length - 1)];
}

/**
 * Which weak skills are due, most overdue first.
 * @param {{ userSkill: object, retrievalLog?: object, now?: number }} p
 * @returns {Array<{ skill, mastery, daysSince, interval, reviewsDone, overdueDays }>}
 */
export function dueRetrievals({ userSkill = {}, retrievalLog = {}, now = Date.now() } = {}) {
  const out = [];
  for (const skill of CANONICAL_SKILLS) {
    const row = userSkill && userSkill[skill];
    if (!row || !(Number(row.totalAttempts) > 0) || !row.lastPracticed) continue;
    const mastery = Number(row.mastery) || 0;
    if (mastery >= WEAK_BELOW) continue;
    const last = new Date(row.lastPracticed).getTime();
    if (!Number.isFinite(last)) continue;
    const log = (retrievalLog && retrievalLog[skill]) || {};
    const reviewsDone = Number(log.done) || 0;
    const interval = intervalForReview(reviewsDone);
    const daysSince = Math.floor((Number(now) - last) / DAY_MS);
    if (daysSince < interval) continue;
    out.push({ skill, mastery, daysSince, interval, reviewsDone, overdueDays: daysSince - interval });
  }
  return out.sort((a, b) => b.overdueDays - a.overdueDays || a.mastery - b.mastery);
}

/**
 * The challenge to retrieve with: unsolved, on the skill, at the tier the
 * person has shown on it (never above — retrieval is recall, not a stretch),
 * in the caller's comparator order. Null when the skill has nothing left.
 */
export function pickRetrievalChallenge({ skill, userSkill = {}, allChallenges = [], attempts = [], solved = new Set(), comparator = null, isLocked = null } = {}) {
  const solvedSet = solved instanceof Set ? solved : new Set(solved || []);
  const mastery = Number(userSkill && userSkill[skill] && userSkill[skill].mastery) || 0;
  const highest = highestSolvedDifficulty(skill, attempts, allChallenges);
  // recall at the level they have shown; one up only if they have shown nothing
  const tier = highest || nextDifficultyFor({ highestSolved: null, mastery });
  const open = (allChallenges || []).filter(c => c && !solvedSet.has(c.id) && challengeMatchesSkill(c, skill)
    && !(typeof isLocked === 'function' && isLocked(c)));
  if (open.length === 0) return null;
  const sorter = typeof comparator === 'function' ? comparator : ((a, b) => a.id - b.id);
  const pool = open.filter(c => c.difficulty === tier);
  const pick = (pool.length > 0 ? pool : open).slice().sort(sorter)[0];
  return pick || null;
}

/** A new log with one more review recorded on the skill. Never mutates. */
export function recordRetrieval(retrievalLog, skill, now = Date.now()) {
  const base = retrievalLog && typeof retrievalLog === 'object' ? retrievalLog : {};
  const cur = base[skill] || { done: 0, lastDoneAt: null };
  return { ...base, [skill]: { done: (Number(cur.done) || 0) + 1, lastDoneAt: new Date(Number(now)).toISOString() } };
}

/** The next due date for a skill, for "next review in N days" copy. Null when never practised. */
export function nextReviewInDays({ userSkill = {}, retrievalLog = {}, skill, now = Date.now() } = {}) {
  const row = userSkill && userSkill[skill];
  if (!row || !row.lastPracticed) return null;
  const last = new Date(row.lastPracticed).getTime();
  if (!Number.isFinite(last)) return null;
  const interval = intervalForReview(((retrievalLog || {})[skill] || {}).done || 0);
  return Math.max(0, Math.ceil((last + interval * DAY_MS - Number(now)) / DAY_MS));
}

// ── Daily quota by target date (P2) ───────────────────────────────────────

/**
 * "12 days, 6 questions a day": what is left divided by the days left.
 * `remaining` is the count the caller owns (unsolved challenge steps on the
 * active goal, or a reference plan). Null without a date or with nothing
 * left; a past-due date reads as one day (today).
 */
export function dailyQuota({ daysOut = null, remaining = 0 } = {}) {
  if (daysOut == null || typeof daysOut !== 'number' || !Number.isFinite(daysOut)) return null;
  const left = Math.max(0, Math.round(Number(remaining) || 0));
  if (left <= 0) return null;
  const days = Math.max(1, Math.round(daysOut));
  return { daysOut: Math.max(0, Math.round(daysOut)), remaining: left, perDay: Math.ceil(left / days) };
}
