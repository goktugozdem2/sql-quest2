import { detectSqlTopic } from './sql-analysis.js';

// Calculate recommended difficulty based on challenge performance
const calculateRecommendedDifficulty = (solvedChallenges, allChallenges, _challengeAttempts = []) => {
  if (!allChallenges || allChallenges.length === 0) return 'Easy';

  const stats = {
    'Easy': { solved: 0, total: 0 },
    'Medium': { solved: 0, total: 0 },
    'Hard': { solved: 0, total: 0 }
  };

  allChallenges.forEach(c => {
    if (stats[c.difficulty]) {
      stats[c.difficulty].total++;
      if (solvedChallenges.has(c.id)) {
        stats[c.difficulty].solved++;
      }
    }
  });

  const easyRate = stats.Easy.total > 0 ? stats.Easy.solved / stats.Easy.total : 0;
  const mediumRate = stats.Medium.total > 0 ? stats.Medium.solved / stats.Medium.total : 0;
  const hardRate = stats.Hard.total > 0 ? stats.Hard.solved / stats.Hard.total : 0;

  if (stats.Hard.solved >= 2 && hardRate >= 0.4) {
    return 'Hard';
  } else if (stats.Medium.solved >= 3 && mediumRate >= 0.5) {
    return 'Hard';
  } else if (stats.Easy.solved >= 3 && easyRate >= 0.6) {
    return 'Medium';
  }
  return 'Easy';
};

// Check if user is struggling (3+ fails in last 5 daily challenges)
const checkIfStruggling = (dailyHistory) => {
  if (!dailyHistory || dailyHistory.length < 3) return { struggling: false };

  const recent = dailyHistory.slice(-5);
  const fails = recent.filter(d => !d.success).length;

  if (fails >= 3) {
    const failedTopics = recent.filter(d => !d.success).map(d => d.topic);
    const topicCounts = {};
    failedTopics.forEach(t => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
    const struggleTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    return { struggling: true, topic: struggleTopic, failCount: fails };
  }

  return { struggling: false };
};

// Get topic performance stats
const getTopicStats = (challengeAttempts, solvedChallenges, allChallenges) => {
  if (!allChallenges || !solvedChallenges || !challengeAttempts) return [];
  const topicStats = {};

  allChallenges.forEach(c => {
    const topic = c.topic || detectSqlTopic(c.solution);
    if (!topicStats[topic]) {
      topicStats[topic] = { attempts: 0, successes: 0, challenges: [], solved: 0, total: 0 };
    }
    topicStats[topic].total++;
    if (solvedChallenges.has(c.id)) {
      topicStats[topic].solved++;
    }
  });

  challengeAttempts.forEach(a => {
    const topic = a.topic;
    if (!topicStats[topic]) {
      topicStats[topic] = { attempts: 0, successes: 0, challenges: [], solved: 0, total: 0 };
    }
    topicStats[topic].attempts++;
    if (a.success) topicStats[topic].successes++;
  });

  return Object.entries(topicStats)
    .map(([topic, stats]) => ({
      topic,
      ...stats,
      successRate: stats.attempts > 0 ? Math.round((stats.successes / stats.attempts) * 100) : (stats.solved > 0 ? 100 : 0),
      coverage: stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0
    }))
    .sort((a, b) => b.successRate - a.successRate);
};

// Password strength checker
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '', feedback: [] };

  let score = 0;
  const feedback = [];

  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (password.length < 8) feedback.push('Use at least 8 characters');
  if (!/[a-z]/.test(password)) feedback.push('Add lowercase letters');
  if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
  if (!/[0-9]/.test(password)) feedback.push('Add numbers');
  if (!/[^a-zA-Z0-9]/.test(password)) feedback.push('Add special characters (!@#$%)');

  let label, color;
  if (score <= 2) { label = 'Weak'; color = 'red'; }
  else if (score <= 4) { label = 'Fair'; color = 'orange'; }
  else if (score <= 5) { label = 'Good'; color = 'yellow'; }
  else { label = 'Strong'; color = 'green'; }

  return { score, label, color, feedback, percent: Math.min((score / 7) * 100, 100) };
};

// Simple hash function
const simpleHash = (str) => {
  if (!str || typeof str !== 'string') return '0000000000000000';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16);
  return hex.padStart(8, '0') + hex.split('').reverse().join('').padStart(8, '0');
};

// Pick the next challenge after the current one, respecting Pro status so
// non-Pro users never get dumped into a Hard question (which fires the paywall).
// `sortedList` should already be ordered Easy→Medium→Hard (what the main
// challenge list renders). Returns null if list is empty.
const pickNextChallenge = (sortedList, currentChallengeId, isPro) => {
  if (!Array.isArray(sortedList) || sortedList.length === 0) return null;
  const accessible = isPro
    ? sortedList
    : sortedList.filter(c => c && c.difficulty !== 'Hard');
  if (accessible.length === 0) return null;
  const currentIdx = accessible.findIndex(c => c && c.id === currentChallengeId);
  if (currentIdx < 0) return accessible[0];
  return accessible[(currentIdx + 1) % accessible.length];
};

// Backfill synthetic attempt records for solves that have no corresponding
// entry in challengeAttempts. The skill-calc provenance policy (see
// src/utils/skill-calc.js) skips credit for uncorroborated solves when a
// user has any attempt history. That policy is correct for preventing
// seeded/corrupted solves from inflating the radar, but it punishes early
// users whose solves predate attempt tracking.
//
// Elena's case: 88 solves but only 45 corroborated. Her radar averaged
// 40 despite her having done 70% of all content. Solution: create
// synthetic attempts for the 43 uncorroborated solves so they count.
//
// Conservative defaults: firstTry=false + hintsUsed=0. We know the user
// solved it (they must have submitted a correct query once). We don't
// know whether it was first try or with hints, so we pick the middle —
// full success credit, no firstTry bonus, no hint penalty.
//
// The synthetic attempts are flagged with `backfilled: true` so they can
// be identified, audited, or migrated later.
const backfillLegacyAttempts = (solvedChallenges, existingAttempts, allChallenges) => {
  const solvedArr = solvedChallenges instanceof Set
    ? Array.from(solvedChallenges)
    : Array.isArray(solvedChallenges) ? solvedChallenges : [];
  const attempts = Array.isArray(existingAttempts) ? existingAttempts : [];
  const challenges = Array.isArray(allChallenges) ? allChallenges : [];
  if (solvedArr.length === 0 || challenges.length === 0) return attempts;

  const attemptedIds = new Set(
    attempts.map(a => a && a.challengeId).filter(id => id !== undefined && id !== null)
  );
  const uncorroborated = solvedArr.filter(id => !attemptedIds.has(id));
  if (uncorroborated.length === 0) return attempts;

  // Place synthetic attempts ~30 days in the past so they don't contaminate
  // recent activity signals (Coach, weekly reports) while still counting
  // toward skill scoring. Spread across a 7-day window so they don't all
  // share a timestamp that would trip deduplication logic.
  const baseTs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const SPREAD = 7 * 24 * 60 * 60 * 1000;

  const synthetic = uncorroborated.map((cid, idx) => {
    const ch = challenges.find(c => c && c.id === cid);
    const skills = (ch && ch.skills) || (ch && ch.category ? [ch.category] : ['SELECT']);
    return {
      challengeId: cid,
      topic: skills[0] || 'SELECT',
      topics: Array.isArray(skills) ? skills : [skills],
      difficulty: (ch && ch.difficulty) || 'Easy',
      success: true,
      firstTry: false,
      hintsUsed: 0,
      timestamp: baseTs + (idx / Math.max(uncorroborated.length, 1)) * SPREAD,
      backfilled: true,
    };
  });

  // Return a new array with synthetic records first (older timestamps),
  // then the user's real attempts. This preserves chronological order
  // when other code iterates.
  return [...synthetic, ...attempts];
};

export {
  calculateRecommendedDifficulty,
  checkIfStruggling,
  getTopicStats,
  getPasswordStrength,
  simpleHash,
  pickNextChallenge,
  backfillLegacyAttempts,
};
