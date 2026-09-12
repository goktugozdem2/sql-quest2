// Anonymous progress: keep it, resume it, and merge it into the account.
//
// Until 2026-09-12 every page load minted `guest_<Date.now()>` and reset the
// state, so a guest who solved five challenges and came back the next day
// started from the placement quiz again; objectives.md counted 4,989 guest
// rows that were page loads, not people. And logging in REPLACED state
// wholesale, so guest solves held at the moment of login were discarded.
//
// This module is the pure half. app.jsx decides WHEN (a resumable guest at
// mount, a login, a register); this decides WHAT the merged record is.
//
// Rules, in one sentence each:
//   - the account wins on identity, money and every scalar it already holds;
//   - collections are unions (solves, achievements, datasets, lessons,
//     milestones), attempts are deduped by (challengeId, timestamp);
//   - XP is added only for solves the account did not have, at the
//     challenge's own xpReward, so merging twice adds nothing twice;
//   - nothing guest-only about identity survives (isGuest, sessionStartAt),
//     except deviceId, which is what links a device to its account.

export const GUEST_USER_KEY = 'sqlquest_guest_user';
export const GUEST_MAX_IDLE_DAYS = 90;

const asArray = (v) => (Array.isArray(v) ? v : []);
const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const uniq = (arr) => [...new Set(arr)];
const dedupeBy = (arr, keyOf) => {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyOf(item);
    if (k === undefined || k === null) { out.push(item); continue; }
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
};

/** True when a saved blob holds anything worth keeping. */
export function hasProgress(blob) {
  if (!blob || typeof blob !== 'object') return false;
  return asArray(blob.solvedChallenges).length > 0
    || asArray(blob.challengeAttempts).length > 0
    || num(blob.xp) > 0;
}

/**
 * Should this browser's guest identity be resumed rather than replaced?
 * A guest_* name whose blob has progress and was active in the last
 * `maxIdleDays`. A blob with no timestamp is resumed — discarding someone's
 * work for want of a stamp is the wrong default.
 */
export function isResumableGuest(name, blob, now = Date.now(), maxIdleDays = GUEST_MAX_IDLE_DAYS) {
  if (typeof name !== 'string' || !name.startsWith('guest_')) return false;
  if (!hasProgress(blob)) return false;
  const last = num(blob.lastActive) || num(blob.createdAt);
  if (!last) return true;
  return now - last <= maxIdleDays * 86400000;
}

/** The XP a solve is worth: the challenge's own xpReward, else by difficulty. */
export function xpForChallenge(id, challenges) {
  const c = asArray(challenges).find(x => x && x.id === id);
  if (c && Number.isFinite(Number(c.xpReward))) return Number(c.xpReward);
  const d = c && c.difficulty;
  return d === 'Hard' ? 30 : d === 'Medium' ? 20 : 10;
}

const pickTutor = (a, g) => {
  const ao = asObject(a), go = asObject(g);
  const al = asArray(ao.completedAiLessons).length, gl = asArray(go.completedAiLessons).length;
  if (!a && !g) return undefined;
  return gl > al ? g : (a || g);
};

/**
 * Merge a guest blob into an account record.
 * @returns {{ merged: object, summary: { newSolves: number, newAttempts: number, xpAdded: number, guestSolves: number } }}
 */
export function mergeProgress(account, guest, { challenges = [] } = {}) {
  const a = asObject(account);
  const g = asObject(guest);

  const aSolved = asArray(a.solvedChallenges);
  const gSolved = asArray(g.solvedChallenges);
  const aSet = new Set(aSolved);
  const newSolves = uniq(gSolved).filter(id => !aSet.has(id));
  const xpAdded = newSolves.reduce((s, id) => s + xpForChallenge(id, challenges), 0);

  const attemptKey = (t) => `${t && t.challengeId}|${t && t.timestamp}`;
  const seenAttempts = new Set(asArray(a.challengeAttempts).map(attemptKey));
  const newAttempts = asArray(g.challengeAttempts).filter(t => t && !seenAttempts.has(attemptKey(t)));
  const challengeAttempts = [...asArray(a.challengeAttempts), ...newAttempts]
    .sort((x, y) => num(x && x.timestamp) - num(y && y.timestamp))
    .slice(-500);

  const laterDay = (x, y) => {
    if (typeof x !== 'string') return typeof y === 'string' ? y : null;
    if (typeof y !== 'string') return x;
    return x >= y ? x : y;
  };

  const merged = {
    ...g,   // guest-only fields the account never had (goals, coachState, prepTarget…)
    ...a,   // …and the account wins on every field it holds
    solvedChallenges: [...aSolved, ...newSolves],
    xp: num(a.xp) + xpAdded,
    queryCount: num(a.queryCount) + num(g.queryCount),
    challengeAttempts,
    unlockedAchievements: uniq([...asArray(a.unlockedAchievements), ...asArray(g.unlockedAchievements)]),
    datasetsUsed: uniq([...asArray(a.datasetsUsed), ...asArray(g.datasetsUsed)]),
    roadmapLessonCompletions: uniq([...asArray(a.roadmapLessonCompletions), ...asArray(g.roadmapLessonCompletions)]),
    queryHistory: [...asArray(a.queryHistory), ...asArray(g.queryHistory)].slice(-50),
    challengeQueries: { ...asObject(g.challengeQueries), ...asObject(a.challengeQueries) },
    completedDailyChallenges: { ...asObject(g.completedDailyChallenges), ...asObject(a.completedDailyChallenges) },
    dailyChallengeHistory: dedupeBy([...asArray(a.dailyChallengeHistory), ...asArray(g.dailyChallengeHistory)], h => h && h.date).slice(-60),
    earnedMilestones: dedupeBy([...asArray(a.earnedMilestones), ...asArray(g.earnedMilestones)], m => m && m.id),
    interviewHistory: [...asArray(a.interviewHistory), ...asArray(g.interviewHistory)],
    dailyStreak: Math.max(num(a.dailyStreak), num(g.dailyStreak)),
    maxDailyStreak: Math.max(num(a.maxDailyStreak), num(g.maxDailyStreak), num(a.dailyStreak), num(g.dailyStreak)),
    lastStreakDay: laterDay(a.lastStreakDay, g.lastStreakDay),
    streak: Math.max(num(a.streak), num(g.streak)),
    coachState: a.coachState || g.coachState || null,
    goals: a.goals || g.goals || null,
    weaknessTracking: a.weaknessTracking || g.weaknessTracking,
    aiTutorProgress: pickTutor(a.aiTutorProgress, g.aiTutorProgress),
    // identity and money are the account's, never the guest's
    username: a.username,
    passwordHash: a.passwordHash,
    salt: a.salt,
    email: a.email,
    emailVerified: a.emailVerified,
    proStatus: a.proStatus,
    proType: a.proType,
    proExpiry: a.proExpiry,
    proAutoRenew: a.proAutoRenew,
    createdAt: a.createdAt,
    deviceId: a.deviceId || g.deviceId,
    isGuest: undefined,
    sessionStartAt: undefined,
  };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];

  return {
    merged,
    summary: { newSolves: newSolves.length, newAttempts: newAttempts.length, xpAdded, guestSolves: gSolved.length },
  };
}
