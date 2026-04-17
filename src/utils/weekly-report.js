// Weekly progress report — pure computation.
//
// Given raw activity (dailyChallengeHistory, challengeAttempts, interviewHistory) and
// a reference date, builds a structured report for the ISO week (Monday 00:00 local
// through the following Monday 00:00 exclusive) that contains the reference date.
//
// Consumers: the in-app modal renders it; persistence layer writes completed weeks
// into userData.weeklyReports; potential future consumers are email digests and the
// Coach's weekly check-in.
//
// The twin copy of this logic lives inline in src/app.jsx because the app is built
// with Babel --source-type script and can't import at runtime. Keep them in sync.

import { CANONICAL_SKILLS, SKILL_TO_RADAR, mapTopicToSkill } from './skill-calc.js';

// --- Week boundaries ---

// Monday 00:00:00 local time of the week containing `date`.
export function getIsoWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // Sun=0, Mon=1, ... Sat=6
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  return d;
}

// Monday 00:00 of the NEXT week (exclusive upper bound for the current week).
export function getIsoWeekEnd(date) {
  const start = getIsoWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

// 'YYYY-MM-DD' in local time.
export function formatDate(d) {
  const dd = new Date(d);
  const y = dd.getFullYear();
  const m = String(dd.getMonth() + 1).padStart(2, '0');
  const day = String(dd.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --- Topic normalization ---

// Map a freeform topic or skill string to one of the 10 canonical radar skills, or null.
export function toCanonicalSkill(raw) {
  if (!raw) return null;
  return SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw)] || null;
}

// --- Timestamp extraction ---

// Activity entries carry either a numeric `.timestamp` (ms) or an ISO/plain-date `.date`.
// Returns ms since epoch, or 0 if neither field is present.
function entryTs(entry) {
  if (!entry) return 0;
  if (entry.timestamp) {
    return typeof entry.timestamp === 'number' ? entry.timestamp : new Date(entry.timestamp).getTime();
  }
  if (entry.date) {
    const d = new Date(entry.date);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

// --- Main computation ---

export function buildWeeklyReport({
  referenceDate,                    // any Date inside the target week; defaults to now
  dailyChallengeHistory = [],
  challengeAttempts = [],
  interviewHistory = [],
  previousReport = null,            // optional: previous week's report for deltas
} = {}) {
  const start = getIsoWeekStart(referenceDate || new Date());
  const end = getIsoWeekEnd(start);
  const startMs = start.getTime();
  const endMs = end.getTime();
  const inWeek = (ts) => ts >= startMs && ts < endMs;

  const daily = dailyChallengeHistory.filter(d => inWeek(entryTs(d)));
  const attempts = challengeAttempts.filter(a => inWeek(entryTs(a)));

  // --- Summary stats ---
  const xpEarned = daily.reduce((sum, d) => sum + (d.xpEarned || 0), 0);
  const challengesSolved = attempts.filter(a => a.success).length;
  const totalSolveTime = daily.reduce((sum, d) => sum + (d.solveTime || 0), 0);
  const avgSolveTime = daily.length > 0 ? Math.round(totalSolveTime / daily.length) : 0;
  const hintsUsed = daily.filter(d => d.hintUsed).length + attempts.filter(a => a.hintsUsed).length;
  const noHelpChallenges = daily.filter(d => !d.hintUsed && !d.answerShown).length;

  // --- Personal bests by difficulty ---
  const personalBests = {};
  daily.forEach(d => {
    const diff = d.difficulty || 'Unknown';
    const t = d.solveTime || 0;
    if (t > 0 && (personalBests[diff] == null || t < personalBests[diff])) {
      personalBests[diff] = t;
    }
  });

  // --- Canonical-skill performance ---
  const skillPerf = {};
  CANONICAL_SKILLS.forEach(s => { skillPerf[s] = { attempts: 0, successes: 0 }; });

  const creditSkill = (rawTopic, success) => {
    const skill = toCanonicalSkill(rawTopic);
    if (!skill) return;
    skillPerf[skill].attempts++;
    if (success) skillPerf[skill].successes++;
  };

  daily.forEach(d => {
    if (d.topic) creditSkill(d.topic, !!d.coreCorrect);
    if (Array.isArray(d.concepts)) {
      d.concepts.forEach(c => creditSkill(c, !!d.coreCorrect));
    }
  });
  attempts.forEach(a => {
    if (a.topic) creditSkill(a.topic, !!a.success);
    if (Array.isArray(a.skills)) a.skills.forEach(s => creditSkill(s, !!a.success));
  });

  const skillStats = CANONICAL_SKILLS
    .map(skill => {
      const { attempts: n, successes } = skillPerf[skill];
      return {
        skill,
        attempts: n,
        successes,
        rate: n > 0 ? Math.round((successes / n) * 100) : null,
      };
    })
    .filter(s => s.attempts > 0)
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));

  const strongSkills = skillStats.filter(s => (s.rate ?? 0) >= 70);
  const weakSkills = skillStats.filter(s => (s.rate ?? 0) < 70);

  // --- Interview mistakes inside the week ---
  const interviewMistakes = interviewHistory
    .filter(r => inWeek(entryTs(r)) && Array.isArray(r.mistakes) && r.mistakes.length > 0)
    .flatMap(r => r.mistakes.map(m => ({ interviewId: r.interviewId, ...m })));

  // --- Deltas vs previous report ---
  const pSum = previousReport?.summary || {};
  const deltas = previousReport ? {
    dailyChallenges: daily.length - (pSum.dailyChallenges ?? 0),
    xpEarned: xpEarned - (pSum.xpEarned ?? 0),
    challengesSolved: challengesSolved - (pSum.challengesSolved ?? 0),
    avgSolveTime: avgSolveTime - (pSum.avgSolveTime ?? 0),
  } : null;

  return {
    weekStart: formatDate(start),
    weekEnd: formatDate(new Date(end.getTime() - 1)),       // Sunday date
    generatedAt: new Date().toISOString(),
    summary: {
      dailyChallenges: daily.length,
      xpEarned,
      challengesSolved,
      avgSolveTime,
      hintsUsed,
      noHelpChallenges,
    },
    personalBests,
    skillStats,
    strongSkills,
    weakSkills,
    interviewMistakes,
    deltas,
  };
}

// --- Persistence helper ---

// Given the current weeklyReports array + fresh user activity, returns a new array
// with any completed weeks (that aren't already stored) appended. Does NOT append the
// current in-progress week. Idempotent.
export function backfillCompletedWeeks({
  weeklyReports = [],
  dailyChallengeHistory = [],
  challengeAttempts = [],
  interviewHistory = [],
  now = new Date(),
} = {}) {
  // Collect all activity timestamps to find the earliest week with activity.
  const allTs = [
    ...dailyChallengeHistory.map(entryTs),
    ...challengeAttempts.map(entryTs),
    ...interviewHistory.map(entryTs),
  ].filter(t => t > 0);
  if (allTs.length === 0) return weeklyReports;

  const firstActivity = Math.min(...allTs);
  const currentWeekStart = getIsoWeekStart(now);

  const stored = new Set(weeklyReports.map(r => r.weekStart));
  const updated = [...weeklyReports];

  // Walk each Monday from the first activity week up to (but not including) the current week.
  let cursor = getIsoWeekStart(new Date(firstActivity));
  while (cursor.getTime() < currentWeekStart.getTime()) {
    const weekStartStr = formatDate(cursor);
    if (!stored.has(weekStartStr)) {
      // Find the prior stored report (chronological) for deltas.
      const prior = updated
        .slice()
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .filter(r => r.weekStart < weekStartStr)
        .pop() || null;
      const report = buildWeeklyReport({
        referenceDate: cursor,
        dailyChallengeHistory,
        challengeAttempts,
        interviewHistory,
        previousReport: prior,
      });
      // Only store weeks where something happened — skip empty weeks to avoid noise.
      if (report.summary.dailyChallenges > 0 || report.summary.challengesSolved > 0) {
        updated.push(report);
      }
    }
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  // Keep chronological order in the stored array.
  updated.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return updated;
}
