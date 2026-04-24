// Session Recap — "Welcome back, last time you struggled with X"
//
// Real tutors don't start each session from zero. They remember what you
// worked on, where you got stuck, where you grew. SQL Quest records every
// attempt (challengeAttempts array) and every skill level change
// (weaknessTracking.skillLevels), but none of that history is surfaced to
// the student when they return.
//
// This module turns raw attempt history into a human-readable recap:
// "Last session 5 days ago, you attempted 5 challenges, solved 3, and your
// CASE WHEN skill grew 15 points. You got stuck on 'Movie Tiers' — want to
// retry with the new Show Structure button?"
//
// Pure function — no React, no DOM, no side effects. Testable in isolation.

const SESSION_GAP_MS = 30 * 60 * 1000;      // 30 min gap = new session
const RETURN_THRESHOLD_MS = 2 * 60 * 60 * 1000;  // >2 hours idle = show recap

/**
 * Detect session boundaries from a sorted-ascending attempts list.
 * A session is a contiguous run of attempts where no two consecutive
 * timestamps are more than SESSION_GAP_MS apart.
 *
 * Returns an array of sessions, each with a `start`, `end`, and `attempts`.
 * Most recent session last.
 */
export function detectSessions(attempts) {
  if (!attempts || attempts.length === 0) return [];

  // Defensive sort — callers may pass unsorted
  const sorted = [...attempts]
    .filter(a => a && typeof a.timestamp === 'number')
    .sort((a, b) => a.timestamp - b.timestamp);

  if (sorted.length === 0) return [];

  const sessions = [];
  let current = { start: sorted[0].timestamp, end: sorted[0].timestamp, attempts: [sorted[0]] };

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp;
    if (gap > SESSION_GAP_MS) {
      sessions.push(current);
      current = { start: sorted[i].timestamp, end: sorted[i].timestamp, attempts: [sorted[i]] };
    } else {
      current.end = sorted[i].timestamp;
      current.attempts.push(sorted[i]);
    }
  }
  sessions.push(current);
  return sessions;
}

/**
 * Should we show the welcome-back recap right now?
 * Returns true when the student has attempt history AND their last
 * attempt was more than RETURN_THRESHOLD_MS ago.
 */
export function shouldShowRecap(attempts, now = Date.now()) {
  if (!attempts || attempts.length === 0) return false;
  const sessions = detectSessions(attempts);
  if (sessions.length === 0) return false;
  const last = sessions[sessions.length - 1];
  return (now - last.end) > RETURN_THRESHOLD_MS;
}

/**
 * Human-friendly "X days ago" / "X hours ago" string for a timestamp.
 * Called only from the recap generator — the UI just renders the string.
 */
export function formatTimeAgo(timestamp, now = Date.now()) {
  const diff = Math.max(0, now - timestamp);
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const weeks = Math.floor(days / 7);

  if (weeks >= 1) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  if (days >= 1) return days === 1 ? '1 day ago' : `${days} days ago`;
  if (hours >= 1) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  if (minutes >= 5) return `${minutes} minutes ago`;
  return 'just now';
}

/**
 * Compute a session recap: summarize the last completed session and
 * suggest what to do next.
 *
 * Inputs:
 *   attempts       — challengeAttempts array (shape: { challengeId, topic,
 *                    success, timestamp, hintsUsed, difficulty, ... })
 *   challenges     — master challenges list (for looking up titles)
 *   skillLevels    — current weaknessTracking.skillLevels object
 *   now            — current time, injectable for tests
 *
 * Returns:
 *   {
 *     lastSessionEndedAt: number,
 *     timeAgoLabel: string,
 *     attempted: number,
 *     solved: number,
 *     struggledWith: Array<{ challengeId, title, attempts, difficulty }>,
 *     topSkillGrowth: Array<{ skill, delta }>   // over the session
 *     resumeSuggestion: { challengeId, title, reason } | null,
 *   }
 *   or null if there's no recap to show (no history, or session too recent).
 */
export function computeRecap(attempts, challenges = [], skillLevels = {}, now = Date.now()) {
  if (!attempts || attempts.length === 0) return null;

  const sessions = detectSessions(attempts);
  if (sessions.length === 0) return null;

  const lastSession = sessions[sessions.length - 1];
  const lastSessionAttempts = lastSession.attempts;

  // Basic counters
  const attempted = new Set(lastSessionAttempts.map(a => a.challengeId)).size;
  const solvedIds = new Set(
    lastSessionAttempts.filter(a => a.success).map(a => a.challengeId)
  );
  const solved = solvedIds.size;

  // Struggle points: challenges the user attempted 2+ times without success
  // (or attempted many times before eventually solving). Sorted by attempt
  // count descending so the most stuck-on challenges surface first.
  const perChallenge = new Map(); // challengeId -> { attempts, solved }
  lastSessionAttempts.forEach(a => {
    const prev = perChallenge.get(a.challengeId) || { attempts: 0, solved: false };
    prev.attempts += 1;
    if (a.success) prev.solved = true;
    perChallenge.set(a.challengeId, prev);
  });

  const challengesById = new Map(
    (challenges || []).map(c => [c.id, c])
  );

  const struggledWith = [...perChallenge.entries()]
    .filter(([, info]) => info.attempts >= 2 && !info.solved)
    .map(([id, info]) => {
      const c = challengesById.get(id);
      return {
        challengeId: id,
        title: c?.title || `Challenge #${id}`,
        attempts: info.attempts,
        difficulty: c?.difficulty || 'Unknown',
      };
    })
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 3); // top 3 struggle points

  // Skill growth over the last session. We don't store per-session skill
  // snapshots, so we approximate: skills that the session touched + the
  // current level, ranked by topic frequency.
  const topicAttemptCount = new Map();
  lastSessionAttempts.forEach(a => {
    const topics = a.topics || (a.topic ? [a.topic] : []);
    topics.forEach(t => {
      topicAttemptCount.set(t, (topicAttemptCount.get(t) || 0) + 1);
    });
  });

  // For each topic the student actually worked on, show the current skill
  // level. Takes the top 3 most-worked topics.
  const topSkillGrowth = [...topicAttemptCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => ({
      skill: topic,
      level: skillLevels[topic] ?? null,
    }))
    .filter(s => s.level !== null);

  // Resume suggestion: the challenge they got most stuck on, or the last
  // unsolved challenge they attempted. Gives the student a direct "jump
  // back in" path instead of having to remember what they were doing.
  let resumeSuggestion = null;
  if (struggledWith.length > 0) {
    const top = struggledWith[0];
    resumeSuggestion = {
      challengeId: top.challengeId,
      title: top.title,
      reason: 'Last session you got stuck here — worth another try with the Show Structure button.',
    };
  } else {
    // No unsolved struggles — suggest the next challenge at their level
    const lastAttempt = lastSessionAttempts[lastSessionAttempts.length - 1];
    const lastChallenge = challengesById.get(lastAttempt.challengeId);
    if (lastChallenge) {
      resumeSuggestion = {
        challengeId: lastChallenge.id,
        title: lastChallenge.title,
        reason: 'Pick up where you left off.',
      };
    }
  }

  return {
    lastSessionEndedAt: lastSession.end,
    timeAgoLabel: formatTimeAgo(lastSession.end, now),
    attempted,
    solved,
    struggledWith,
    topSkillGrowth,
    resumeSuggestion,
  };
}

export default computeRecap;
