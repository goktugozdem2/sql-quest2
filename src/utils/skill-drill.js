// Skill Drill — pick a focused 5-challenge queue for a single canonical skill.
// Tested in tests/skill-drill.test.js. The shape mirrors Duolingo's old
// "Practice Weak Skills" loop: bounded session, ordered easy-to-hard,
// unsolved-first then replay previously-failed items.

import { mapTopicToSkill, SKILL_TO_RADAR } from './skill-calc.js';

export const DRILL_SIZE = 5;
export const DRILL_TARGET = 60; // score considered "Competent"

// The canonical tag->skill dictionary is imported, not copied. It used to
// be duplicated here with a 'keep in sync' comment, and it drifted: adding
// DML tags to skill-calc left this copy behind, so an INSERT challenge
// matched no skill at all and UPDATE still fuzzy-matched 'DATE' (the
// substring in upDATE) straight into Date Functions. The comment claimed
// the constant was private; skill-calc has exported it for some time.

const resolveToCanonical = (raw) =>
  SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;

// True when any of challenge.skills or challenge.category resolves to the
// requested canonical skill.
export const challengeMatchesSkill = (challenge, canonicalSkill) => {
  if (!challenge || !canonicalSkill) return false;
  const tags = [...(challenge.skills || []), challenge.category].filter(Boolean);
  return tags.some(t => resolveToCanonical(t) === canonicalSkill);
};

/**
 * Stable re-rank that puts items whose sectorTags include the user's sector
 * FIRST while preserving relative order within each group. Used to nudge
 * sector-flavored challenges to the front of skill-drill queues etc.
 *
 * Looks up tags in two places:
 *   1. challenge.sectorTags (if challenge already has them attached)
 *   2. window.SECTOR_TAGS[challenge.id] (the global lookup table written
 *      by scripts/tag-challenges-by-sector.js)
 *
 * Pure — safe to call with null sector / empty list / unknown ids.
 *
 * @param {Array} list - challenges in their current preferred order
 * @param {string|null} sector - user's sector preference, or null/'generic'
 * @returns {Array} re-ranked list (same items, same length)
 */
export const prioritizeBySector = (list, sector) => {
  if (!sector) return list;
  if (typeof window !== 'undefined' && sector === window.GENERIC_SECTOR_ID) return list;
  const tagsFor = (c) => {
    if (Array.isArray(c?.sectorTags) && c.sectorTags.length > 0) return c.sectorTags;
    if (typeof window !== 'undefined' && window.SECTOR_TAGS) {
      const t = window.SECTOR_TAGS[String(c?.id)];
      if (Array.isArray(t)) return t;
    }
    return [];
  };
  const matches = [];
  const others = [];
  for (const c of list) {
    if (tagsFor(c).includes(sector)) matches.push(c);
    else others.push(c);
  }
  return [...matches, ...others];
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
  const sectorPref = opts.sector ?? null;
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

  // Each bucket is sector-prioritized AFTER its primary sort. The bucket's
  // primary order (difficulty progression) is preserved WITHIN the matching
  // and non-matching halves — so a finans user gets all finans hits first
  // (in their original easy→hard order) followed by all non-finans hits
  // (also in easy→hard order). A user with no sector match falls back to
  // the unchanged primary ordering.
  const unsolved = prioritizeBySector(
    matching.filter(c => !solvedSet.has(c.id)).sort(byDiff),
    sectorPref
  );

  const reviewFailed = prioritizeBySector(
    matching
      .filter(c => solvedSet.has(c.id) && failedIds.has(c.id))
      .sort((a, b) => {
        const d = byDiff(a, b);
        if (d !== 0) return d;
        return (latestAttemptTs[a.id] || 0) - (latestAttemptTs[b.id] || 0);
      }),
    sectorPref
  );

  const otherSolved = prioritizeBySector(
    matching
      .filter(c => solvedSet.has(c.id) && !failedIds.has(c.id))
      .sort((a, b) => {
        // At high levels, still prefer harder repeats over easier ones —
        // the drill-end score moves more on harder content via the drill
        // source boost raising the difficulty ratio.
        const d = byDiff(a, b);
        if (d !== 0) return d;
        return (latestAttemptTs[a.id] || 0) - (latestAttemptTs[b.id] || 0);
      }),
    sectorPref
  );

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
