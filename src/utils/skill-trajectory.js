// Skill trajectory — per-skill activity and cumulative growth over time.
//
// Powers the sparkline visualization on the skill radar. Shows students
// how their practice has progressed over the last 30 days, broken down
// by skill. Not a re-computation of skill-calc (which is expensive and
// would conflict with the displayed current level) — instead, a
// purpose-built activity trajectory that tells the student "here's
// where you practiced, and here's your cumulative growth."
//
// Pure function — no React, no DOM. Testable in isolation.

import { mapTopicToSkill } from './skill-calc.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Compute per-skill daily and cumulative activity over the last N days.
 *
 * Inputs:
 *   attempts   — challengeAttempts array. Each item shape:
 *                { challengeId, success, timestamp, topic, topics[] }
 *   options:
 *     days     — lookback window (default 30)
 *     skills   — optional filter array. If provided, only return
 *                trajectories for these skills.
 *     now      — current timestamp (injectable for tests)
 *
 * Returns:
 *   {
 *     days: number,                   // echo back the window for the caller
 *     firstDay: number,               // timestamp of the first bucket (oldest)
 *     lastDay: number,                // timestamp of the last bucket (today)
 *     daily: { [skill]: number[] },   // count of successful solves per day
 *     cumulative: { [skill]: number[] }, // running sum of solves over time
 *     totalSolves: { [skill]: number }, // total successful solves in the window
 *   }
 */
export function computeSkillTrajectory(attempts, { days = 30, skills = null, now = Date.now() } = {}) {
  // Snap "now" to the start of today so buckets are calendar-aligned
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();
  const firstDay = todayStartMs - (days - 1) * DAY_MS;

  // Initialize daily buckets per skill
  const daily = {};
  const resolvedSkills = skills || [
    'Querying Basics', 'Aggregation & Grouping', 'Joins', 'Subqueries & CTEs',
    'Conditional Logic', 'Window Functions', 'String Functions',
    'Date Functions', 'NULL Handling',
    // Legacy skills (pre-9-skill taxonomy migration). Keep until legacy
    // data is fully aged out so the sparkline doesn't drop historical
    // attempts tagged under old skill names.
    'SELECT Basics', 'Filter & Sort', 'Aggregation', 'GROUP BY',
    'JOIN Tables', 'Subqueries', 'CASE Statements',
  ];
  for (const skill of resolvedSkills) {
    daily[skill] = new Array(days).fill(0);
  }

  // Bucket every successful attempt into the appropriate day
  for (const attempt of attempts || []) {
    if (!attempt || !attempt.success || typeof attempt.timestamp !== 'number') continue;

    // Normalize the attempt's day-start
    const attemptDate = new Date(attempt.timestamp);
    attemptDate.setHours(0, 0, 0, 0);
    const attemptDayMs = attemptDate.getTime();

    const dayIdx = Math.round((attemptDayMs - firstDay) / DAY_MS);
    if (dayIdx < 0 || dayIdx >= days) continue;

    // Topics array fans credit across every skill the challenge exercises.
    // Fall back to single topic if topics[] is absent (legacy attempts).
    const topics = attempt.topics || (attempt.topic ? [attempt.topic] : []);
    const skillsHit = new Set();
    for (const topic of topics) {
      const skill = mapTopicToSkill(topic);
      if (skill && daily[skill]) skillsHit.add(skill);
    }

    // Count each skill-match once per attempt (not per topic). A challenge
    // tagged with both "SELECT" and "WHERE" both mapping to Querying Basics
    // should credit Querying Basics once, not twice.
    for (const skill of skillsHit) {
      daily[skill][dayIdx] += 1;
    }
  }

  // Derive cumulative + totals
  const cumulative = {};
  const totalSolves = {};
  for (const [skill, dailyCounts] of Object.entries(daily)) {
    let running = 0;
    cumulative[skill] = dailyCounts.map(d => {
      running += d;
      return running;
    });
    totalSolves[skill] = running;
  }

  return {
    days,
    firstDay,
    lastDay: todayStartMs,
    daily,
    cumulative,
    totalSolves,
  };
}

/**
 * Pick the top N most-active skills from a trajectory result. Useful for
 * the Welcome Back card or a compact dashboard where we only want to
 * highlight skills the student has actually touched recently.
 */
export function topActiveSkills(trajectory, n = 3) {
  if (!trajectory || !trajectory.totalSolves) return [];
  return Object.entries(trajectory.totalSolves)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([skill, count]) => ({ skill, count }));
}

export default computeSkillTrajectory;
