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

// --- Milestone detection ---
// Given the current week's report and the full activity history, detect
// identity-forming moments worth celebrating. Returns an array of milestone
// objects with { id, kind, description, emoji }, ordered by significance.
//
// Each milestone carries a stable `id` used for deduplication in the
// append-only earnedMilestones log:
//   - one-time milestones (first_hard, first_medium, first_no_hint) use a
//     kind-only id and fire at most once per user, ever.
//   - per-record milestones (streak_record) include the record value so each
//     distinct record earns its own entry.
//   - per-skill-tier (skill_threshold) use skill + crossed-tier so each
//     (skill, tier) pair earns exactly once.
//   - per-week milestones (volume, hard_week) include the weekStart so a user
//     earning the same milestone in multiple weeks gets one entry per week.
//
// Pure — no side effects, no state reads.
export function detectMilestones({
  report,                                    // output of buildWeeklyReport for the target week
  allDailyChallengeHistory = [],
  allChallengeAttempts = [],
  skillLevelsBefore = {},                    // radar at end of previous week (map of skill → 0-100)
  skillLevelsAfter = {},                     // current radar
  previousDailyStreakRecord = 0,
  currentDailyStreak = 0,
} = {}) {
  const milestones = [];
  if (!report) return milestones;

  const weekStartMs = new Date(report.weekStart).getTime();
  const weekEndMs = new Date(report.weekEnd).getTime() + 24 * 60 * 60 * 1000;

  // Were there earlier successful attempts matching a predicate?
  const priorSuccess = (pred) =>
    allChallengeAttempts.some(a => a.success && pred(a) && entryTs(a) < weekStartMs);

  // This-week successful attempts matching a predicate
  const thisWeekSuccess = (pred) =>
    allChallengeAttempts.some(a =>
      a.success && pred(a) && entryTs(a) >= weekStartMs && entryTs(a) < weekEndMs
    );

  const weekStart = report.weekStart;

  // First-ever Hard challenge solved this week
  if (thisWeekSuccess(a => a.difficulty === 'Hard') &&
      !priorSuccess(a => a.difficulty === 'Hard')) {
    milestones.push({
      id: 'first_hard',
      kind: 'first_hard',
      description: 'Solved your first Hard challenge!',
      emoji: '🔥',
      weekStart,
    });
  }

  // First-ever Medium challenge solved this week
  if (thisWeekSuccess(a => a.difficulty === 'Medium') &&
      !priorSuccess(a => a.difficulty === 'Medium')) {
    milestones.push({
      id: 'first_medium',
      kind: 'first_medium',
      description: 'Solved your first Medium challenge!',
      emoji: '⚔️',
      weekStart,
    });
  }

  // First-ever no-hint success
  if (thisWeekSuccess(a => !a.hintsUsed) &&
      !priorSuccess(a => !a.hintsUsed)) {
    milestones.push({
      id: 'first_no_hint',
      kind: 'first_no_hint',
      description: 'First challenge solved without any hints!',
      emoji: '🎯',
      weekStart,
    });
  }

  // Daily-streak record broken
  if (currentDailyStreak > previousDailyStreakRecord && previousDailyStreakRecord > 0) {
    milestones.push({
      id: `streak_record:${currentDailyStreak}`,
      kind: 'streak_record',
      description: `New streak record: ${currentDailyStreak} days (previous best: ${previousDailyStreakRecord})`,
      emoji: '⚡',
      value: currentDailyStreak,
      weekStart,
    });
  }

  // Skill threshold crossings (only one per skill, the highest crossed)
  const tierNames = { 30: 'Beginner', 50: 'Intermediate', 70: 'Advanced', 85: 'Expert' };
  Object.keys(skillLevelsAfter).forEach(skill => {
    const before = skillLevelsBefore[skill] ?? 0;
    const after = skillLevelsAfter[skill] ?? 0;
    if (after <= before) return;
    let crossedMax = null;
    [30, 50, 70, 85].forEach(t => {
      if (before < t && after >= t) crossedMax = t;
    });
    if (crossedMax != null) {
      milestones.push({
        id: `skill_threshold:${skill}:${crossedMax}`,
        kind: 'skill_threshold',
        description: `${skill} reached ${tierNames[crossedMax]} (${after}/100)`,
        emoji: '📈',
        skill,
        value: after,
        weekStart,
      });
    }
  });

  // Volume milestone — 10+ challenges in a week
  if (report.summary.challengesSolved >= 10) {
    milestones.push({
      id: `volume:${weekStart}`,
      kind: 'volume',
      description: `${report.summary.challengesSolved} challenges solved this week`,
      emoji: '💪',
      value: report.summary.challengesSolved,
      weekStart,
    });
  }

  // Hard-week milestone — 3+ Hard solves
  const hardSolvesThisWeek = allChallengeAttempts.filter(a =>
    a.success && a.difficulty === 'Hard' && entryTs(a) >= weekStartMs && entryTs(a) < weekEndMs
  ).length;
  if (hardSolvesThisWeek >= 3) {
    milestones.push({
      id: `hard_week:${weekStart}`,
      kind: 'hard_week',
      description: `${hardSolvesThisWeek} Hard challenges conquered this week`,
      emoji: '🏆',
      value: hardSolvesThisWeek,
      weekStart,
    });
  }

  return milestones;
}

// Merges newly-detected milestones into an existing earnedMilestones log,
// deduplicating by stable id. Returns a new array in insertion order.
// Used by the backfill persistence hook and the in-modal "recognize now"
// path. Each entry gains an `earnedAt` ISO timestamp the first time it's
// added; re-detection is a no-op.
export function mergeEarnedMilestones(existing = [], newMilestones = [], now = new Date()) {
  const seen = new Set(existing.map(m => m.id).filter(Boolean));
  const nowIso = now.toISOString();
  const additions = [];
  for (const m of newMilestones) {
    if (!m || !m.id) continue;
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    additions.push({ ...m, earnedAt: nowIso });
  }
  if (additions.length === 0) return existing;
  return [...existing, ...additions];
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
