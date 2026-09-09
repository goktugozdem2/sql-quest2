// SQL Quest — roadmap stage expansion
//
// WHY THIS EXISTS (measured 2026-09-09)
//
// `SQL_ROADMAP_STAGES` hand-lists 38 challenge ids across 8 stages. The
// Practice tab's path filter defaults to 'recommended', which resolves to the
// user's CURRENT stage — so the default view of a 287-challenge bank shows
// between 2 and 7 challenges, and 66% of every engaged user's solves land on
// those same 38 ids. No sector challenge (200-299) appears in any stage, and
// neither do 121 or 157-199.
//
// The curated ids are not the problem. They are a deliberate teaching order,
// and the 105-opener claim (ledger, reads 2026-09-13) depends on the first
// one staying first. The problem is that the list STOPS there.
//
// So this module keeps every curated id exactly where its author put it and
// APPENDS more of the bank behind it, chosen by the stage's own skills and
// difficulty ceiling. A stage goes from "6 challenges" to "6 challenges then
// as many more of the same kind as you want", without reordering anything a
// human decided.
//
// Ordering guarantee, enforced by tests: for every stage, the returned
// `challengeIds` begins with the stage's authored `challengeIds`, in the
// authored order, with nothing inserted between them. Callers may rely on
// index 0 of stage 0 being the first contact.

import { challengeMatchesSkill, prioritizeBySector } from './skill-drill.js';

const DIFFICULTY_RANK = { Easy: 0, Medium: 1, Hard: 2 };

/** Default ceiling on how many challenges one stage may show. */
export const DEFAULT_STAGE_CAP = 14;

/**
 * Free to a non-Pro user. Hard is Pro-gated except the freePreview samplers.
 * Mirrors `isContentLocked('challenge', c)` in app.jsx; kept as its own
 * function here so this module has no app dependency.
 */
export const isFreeChallenge = (challenge) => (
  challenge?.difficulty !== 'Hard' || !!challenge?.freePreview
);

const rankOf = (difficulty) => (
  Object.prototype.hasOwnProperty.call(DIFFICULTY_RANK, difficulty)
    ? DIFFICULTY_RANK[difficulty]
    : DIFFICULTY_RANK.Hard
);

/**
 * True when a challenge belongs to any of a stage's canonical skills.
 * A stage with no declared skills accepts nothing extra — that is deliberate:
 * an unannotated stage keeps exactly its curated list rather than guessing.
 */
export const challengeFitsStage = (challenge, stage) => {
  const skills = stage?.skills || [];
  if (skills.length === 0) return false;
  if (rankOf(challenge?.difficulty) > rankOf(stage?.maxDifficulty || 'Medium')) return false;
  return skills.some(skill => challengeMatchesSkill(challenge, skill));
};

/**
 * Expand each stage's challenge list with more of the same kind of work.
 *
 * @param {object[]} stages      SQL_ROADMAP_STAGES (authored order preserved)
 * @param {object[]} challenges  the live bank
 * @param {object|null} goal     a coachGoals entry; its `skillsTargeted` float
 *                               to the front of every stage's appended pool
 * @param {string|null} sector   user's sector, for prioritizeBySector
 * @param {boolean} includeLocked  keep Pro-only Hard challenges in the pool
 * @param {number} cap           max challenges per stage, curated included
 * @returns {object[]} stages with a widened `challengeIds`
 */
export function expandStageChallenges({
  stages = [],
  challenges = [],
  goal = null,
  sector = null,
  includeLocked = false,
  cap = DEFAULT_STAGE_CAP,
} = {}) {
  if (!Array.isArray(stages) || stages.length === 0) return [];
  if (!Array.isArray(challenges) || challenges.length === 0) return stages.map(s => ({ ...s }));

  // Every curated id anywhere in the roadmap is spoken for. Claiming them all
  // up front stops stage 7 from appending a challenge that stage 2 teaches.
  const claimed = new Set();
  for (const stage of stages) {
    for (const id of (stage.challengeIds || [])) claimed.add(id);
  }

  const goalSkills = new Set(goal?.skillsTargeted || []);
  const isGoalRelevant = (challenge) => (
    goalSkills.size > 0 && [...goalSkills].some(s => challengeMatchesSkill(challenge, s))
  );

  return stages.map((stage) => {
    const curated = (stage.challengeIds || []).slice();
    const room = Math.max(0, cap - curated.length);
    if (room === 0) return { ...stage, challengeIds: curated, addedChallengeIds: [] };

    let pool = challenges.filter(c => (
      !claimed.has(c.id)
      && (includeLocked || isFreeChallenge(c))
      && challengeFitsStage(c, stage)
    ));

    // Goal first, then easiest first, then authored id order. Sorting by
    // difficulty inside a stage matters more than it looks: a stage that
    // opens with its hardest extra is a stage people bounce off.
    pool.sort((a, b) => {
      const g = Number(isGoalRelevant(b)) - Number(isGoalRelevant(a));
      if (g !== 0) return g;
      const d = rankOf(a.difficulty) - rankOf(b.difficulty);
      if (d !== 0) return d;
      return a.id - b.id;
    });

    // Sector preference is a stable re-rank, so it cannot disturb the
    // difficulty ladder within a sector group.
    pool = prioritizeBySector(pool, sector);

    const added = pool.slice(0, room).map(c => c.id);
    for (const id of added) claimed.add(id);

    return { ...stage, challengeIds: [...curated, ...added], addedChallengeIds: added };
  });
}

/**
 * Which stage a placement level starts a user on, BY ID rather than by array
 * index. The app used to carry `basics -> 1, working -> 3, advanced -> 6` as
 * bare numbers, which silently mean a different stage the moment anybody
 * inserts one. Two of the nine canonical skills (String Functions, Date
 * Functions) have no stage at all, so an insertion is coming.
 */
export const PLACEMENT_START_STAGE_ID = {
  basics: 'filtering',
  working: 'joins',
  advanced: 'ctes',
};

/**
 * @returns {number} index of the stage a level starts on, or 0 when the level
 * is unknown or its stage has been removed. Never returns -1.
 */
export function placementStartIndex(stages = [], levelId = '') {
  const wantedId = PLACEMENT_START_STAGE_ID[levelId];
  if (!wantedId) return 0;
  const i = stages.findIndex(stage => stage.id === wantedId);
  return i >= 0 ? i : 0;
}
