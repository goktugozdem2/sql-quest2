// Skill Drill — pick a focused 5-challenge queue for a single canonical skill.
// Tested in tests/skill-drill.test.js. The shape mirrors Duolingo's old
// "Practice Weak Skills" loop: bounded session, ordered easy-to-hard,
// unsolved-first then replay previously-failed items.

import { mapTopicToSkill } from './skill-calc.js';

export const DRILL_SIZE = 5;
export const DRILL_TARGET = 60; // score considered "Competent"

// Same dictionary as skill-calc.js SKILL_TO_RADAR. Kept local to avoid
// importing a private constant. Keep in sync. 9-skill taxonomy (Apr 2026).
const SKILL_TO_RADAR_LOCAL = {
  // Querying Basics
  'SELECT': 'Querying Basics', 'SELECT Basics': 'Querying Basics', 'DISTINCT': 'Querying Basics',
  'WHERE': 'Querying Basics', 'Filter & Sort': 'Querying Basics',
  'Querying Basics': 'Querying Basics',
  'ORDER BY': 'Querying Basics', 'LIMIT': 'Querying Basics',
  'LIKE': 'Querying Basics', 'BETWEEN': 'Querying Basics',
  'IN': 'Querying Basics', 'NOT IN': 'Querying Basics',
  'AND': 'Querying Basics', 'OR': 'Querying Basics',
  // NULL Handling
  'NULL Handling': 'NULL Handling',
  'IS NULL': 'NULL Handling', 'IS NOT NULL': 'NULL Handling',
  'COALESCE': 'NULL Handling', 'NULLIF': 'NULL Handling', 'IFNULL': 'NULL Handling',
  // Aggregation & Grouping
  'Aggregation': 'Aggregation & Grouping', 'Aggregates': 'Aggregation & Grouping',
  'Aggregation & Grouping': 'Aggregation & Grouping',
  'COUNT': 'Aggregation & Grouping', 'COUNT DISTINCT': 'Aggregation & Grouping',
  'SUM': 'Aggregation & Grouping', 'AVG': 'Aggregation & Grouping',
  'MIN': 'Aggregation & Grouping', 'MAX': 'Aggregation & Grouping',
  'GROUP BY': 'Aggregation & Grouping', 'HAVING': 'Aggregation & Grouping',
  // Joins
  'JOIN': 'Joins', 'JOIN Tables': 'Joins', 'JOINs': 'Joins', 'Joins': 'Joins',
  'LEFT JOIN': 'Joins', 'RIGHT JOIN': 'Joins',
  'INNER JOIN': 'Joins', 'FULL JOIN': 'Joins', 'CROSS JOIN': 'Joins',
  'Self-Join': 'Joins', 'Self Join': 'Joins', 'Non-Equi Join': 'Joins',
  // Subqueries & CTEs
  'Subquery': 'Subqueries & CTEs', 'Subqueries': 'Subqueries & CTEs',
  'Subqueries & CTEs': 'Subqueries & CTEs',
  'Correlated Subquery': 'Subqueries & CTEs',
  'CTE': 'Subqueries & CTEs', 'Recursive CTE': 'Subqueries & CTEs',
  'Derived Table': 'Subqueries & CTEs',
  'EXISTS': 'Subqueries & CTEs', 'NOT EXISTS': 'Subqueries & CTEs',
  'UNION': 'Subqueries & CTEs', 'UNION ALL': 'Subqueries & CTEs',
  'INTERSECT': 'Subqueries & CTEs', 'EXCEPT': 'Subqueries & CTEs',
  'Set Operations': 'Subqueries & CTEs',
  // String / Date
  'String Functions': 'String Functions', 'Strings': 'String Functions',
  'GROUP_CONCAT': 'String Functions',
  'Date Functions': 'Date Functions', 'Dates': 'Date Functions',
  // Conditional Logic
  'CASE': 'Conditional Logic', 'CASE Statements': 'Conditional Logic',
  'Conditional Logic': 'Conditional Logic',
  'Expressions': 'Conditional Logic',
  // Window Functions
  'Window Functions': 'Window Functions', 'Window Function': 'Window Functions', 'Windows': 'Window Functions',
  'ROW_NUMBER': 'Window Functions', 'RANK': 'Window Functions',
  'DENSE_RANK': 'Window Functions', 'PERCENT_RANK': 'Window Functions',
  'NTILE': 'Window Functions', 'LAG': 'Window Functions', 'LEAD': 'Window Functions',
  'FIRST_VALUE': 'Window Functions', 'LAST_VALUE': 'Window Functions',
  'PARTITION BY': 'Window Functions', 'Frame Clause': 'Window Functions', 'ROWS BETWEEN': 'Window Functions',
};

const resolveToCanonical = (raw) =>
  SKILL_TO_RADAR_LOCAL[raw] || SKILL_TO_RADAR_LOCAL[mapTopicToSkill(raw || '')] || null;

// True when any of challenge.skills or challenge.category resolves to the
// requested canonical skill.
export const challengeMatchesSkill = (challenge, canonicalSkill) => {
  if (!challenge || !canonicalSkill) return false;
  const tags = [...(challenge.skills || []), challenge.category].filter(Boolean);
  return tags.some(t => resolveToCanonical(t) === canonicalSkill);
};

const DIFF_ORDER = { 'Easy': 0, 'Medium': 1, 'Hard': 2 };

/**
 * Build a focused drill queue for a single skill.
 *
 * Ordering (default, for learners still below Competent):
 *   1. Unsolved challenges, easy → hard
 *   2. Previously-failed-but-later-solved (replay for reinforcement)
 *   3. Any remaining solved challenges (least recently attempted first)
 *
 * When `currentLevel` is ≥ 60 (user already Competent-ish), flip the sort:
 * prefer HARDER unsolved first so "Do 5 more" actually pushes the radar.
 * When `currentLevel` is ≥ 80, skip Easy difficulty entirely — the user
 * has nothing to prove on those and the math won't reward them.
 *
 * @param {string} canonicalSkill - e.g. 'Joins'
 * @param {Array} allChallenges - full challenge pool
 * @param {Set|Array} solvedChallenges - IDs already solved
 * @param {Array} challengeAttempts - attempt log (latest last)
 * @param {Object} [opts]
 * @param {number} [opts.size] - how many to return (default DRILL_SIZE)
 * @param {number} [opts.currentLevel] - user's current score on the skill
 *   (0-100). Used to pick harder challenges when they've already
 *   ceiling'd on easier ones. Optional; defaults to 0 (easy-first).
 * @returns {Array} ordered challenge objects, up to `size`
 */
export const buildDrillQueue = (
  canonicalSkill,
  allChallenges = [],
  solvedChallenges = new Set(),
  challengeAttempts = [],
  opts = {}
) => {
  const size = opts.size ?? DRILL_SIZE;
  const currentLevel = typeof opts.currentLevel === 'number' ? opts.currentLevel : 0;
  const solvedSet = solvedChallenges instanceof Set ? solvedChallenges : new Set(solvedChallenges);

  let matching = allChallenges.filter(c => challengeMatchesSkill(c, canonicalSkill));
  if (matching.length === 0) return [];

  // Advanced users at 80+ get Easy stripped out. They've demonstrated
  // mastery there; Easy repeats just waste the session and don't move
  // the radar (their difficultyPoints/max ratio is ceiling'd). But only
  // strip if there's anything left — better to serve Easy than nothing.
  if (currentLevel >= 80) {
    const harder = matching.filter(c => c.difficulty !== 'Easy');
    if (harder.length > 0) matching = harder;
  }

  const failedIds = new Set(
    challengeAttempts.filter(a => a && a.success === false).map(a => a.challengeId)
  );
  const latestAttemptTs = {};
  challengeAttempts.forEach(a => {
    if (!a) return;
    const ts = a.timestamp || 0;
    if (!latestAttemptTs[a.challengeId] || ts > latestAttemptTs[a.challengeId]) {
      latestAttemptTs[a.challengeId] = ts;
    }
  });

  // Competent-ish users (≥60) want harder content first; beginners want
  // the ramp. The sort direction is what changes.
  const preferHarder = currentLevel >= 60;
  const byDiffAsc = (a, b) => (DIFF_ORDER[a.difficulty] ?? 1) - (DIFF_ORDER[b.difficulty] ?? 1);
  const byDiffDesc = (a, b) => (DIFF_ORDER[b.difficulty] ?? 1) - (DIFF_ORDER[a.difficulty] ?? 1);
  const byDiff = preferHarder ? byDiffDesc : byDiffAsc;

  const unsolved = matching
    .filter(c => !solvedSet.has(c.id))
    .sort(byDiff);

  const reviewFailed = matching
    .filter(c => solvedSet.has(c.id) && failedIds.has(c.id))
    .sort((a, b) => {
      const d = byDiff(a, b);
      if (d !== 0) return d;
      return (latestAttemptTs[a.id] || 0) - (latestAttemptTs[b.id] || 0);
    });

  const otherSolved = matching
    .filter(c => solvedSet.has(c.id) && !failedIds.has(c.id))
    .sort((a, b) => {
      // At high levels, still prefer harder repeats over easier ones —
      // the drill-end score moves more on harder content via the drill
      // source boost raising the difficulty ratio.
      const d = byDiff(a, b);
      if (d !== 0) return d;
      return (latestAttemptTs[a.id] || 0) - (latestAttemptTs[b.id] || 0);
    });

  const queue = [...unsolved, ...reviewFailed, ...otherSolved];
  // Dedup by id (in case a challenge falls in multiple buckets somehow).
  const seen = new Set();
  const deduped = [];
  for (const c of queue) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    deduped.push(c);
    if (deduped.length >= size) break;
  }
  return deduped;
};

/**
 * Pick the canonical skill for an "auto" drill: the weakest non-zero skill.
 * Skills at 0 are treated as "not yet started" rather than "weak" — we want
 * to repair things the user has touched, not push them into brand new territory.
 *
 * Falls back to the lowest-scoring skill if all skills are 0 or all are strong.
 */
export const pickWeakestSkill = (skillLevels = {}, opts = {}) => {
  const threshold = opts.target ?? DRILL_TARGET;
  const entries = Object.entries(skillLevels).filter(([, v]) => typeof v === 'number');
  if (entries.length === 0) return null;

  const belowTarget = entries.filter(([, v]) => v > 0 && v < threshold);
  if (belowTarget.length > 0) {
    belowTarget.sort((a, b) => a[1] - b[1]);
    return belowTarget[0][0];
  }
  // Everything is strong or untouched — just return the lowest number.
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
};
