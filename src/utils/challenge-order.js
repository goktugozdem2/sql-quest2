// Curriculum ordering for every "what should I do next" recommendation.
//
// WHY THIS FILE EXISTS
//
// The raw `challenges` array is FAANG-interview ordered: ids 1-90 are the hard
// interview bank, 91-105 the easy beginner ladder, 106-115 the medium bridge.
// So ANY `.find()` or `[0]` over the raw array returns **id 1** — which is a
// Medium, and the worst-performing challenge in the bank: 138 openers, 33
// finishers, 24% solve-through (measured 2026-08-05, `funnel-report.sql` §9c).
//
// That is how challenge 1 became the default "next up" for everyone who solved
// any Medium, while never once appearing first in a curriculum path. The
// first-run ladder (`FIRST_RUN_LEVELS`), the roadmap list ordering and the
// coach placement array all correctly start at 91; four separate recommendation
// sites in app.jsx quietly overrode them by reading raw id order:
//
//   - the post-solve `nextChallengeRec` card
//   - the warm-up card's `nextUp`
//   - the "What's next" strip's `nextSameDiff` and `nextHarder`
//
// The identical bug was found and fixed once before, in the onboarding handoff,
// with a local `getFilteredChallenges()` call. That fix was never generalised,
// so the bug grew back in four other places. Hence: one exported comparator,
// one exported picker, and a test that fails if a raw-order regression returns.

export const CHALLENGE_DIFFICULTY_ORDER = { Easy: 0, Medium: 1, Hard: 2 };

/**
 * Build the id → curriculum-position map from the roadmap stage list.
 * Position is `(stageIndex * 1000) + indexWithinStage`, so stage order
 * dominates and within-stage authoring order is preserved.
 *
 * @param {Array<{challengeIds?: number[]}>} stages
 * @returns {Map<number, number>}
 */
export function buildCurriculumOrder(stages) {
  const order = new Map();
  (stages || []).forEach((stage, stageIndex) => {
    (stage?.challengeIds || []).forEach((challengeId, challengeIndex) => {
      // First stage wins if an id is listed twice — a later stage repeating a
      // challenge is a review, not a re-sequencing.
      if (!order.has(challengeId)) order.set(challengeId, (stageIndex * 1000) + challengeIndex);
    });
  });
  return order;
}

/**
 * Comparator: curriculum position first, then difficulty, then id.
 *
 * Challenges outside the roadmap sort after every roadmap challenge (999999),
 * which is the point — the interview bank should never outrank the ladder in a
 * recommendation.
 *
 * @param {Map<number, number>} order from buildCurriculumOrder
 */
export function makeChallengeComparator(order) {
  return (a, b) => {
    const pathA = order.has(a.id) ? order.get(a.id) : 999999;
    const pathB = order.has(b.id) ? order.get(b.id) : 999999;
    if (pathA !== pathB) return pathA - pathB;
    const diffA = CHALLENGE_DIFFICULTY_ORDER[a.difficulty] ?? 99;
    const diffB = CHALLENGE_DIFFICULTY_ORDER[b.difficulty] ?? 99;
    if (diffA !== diffB) return diffA - diffB;
    return a.id - b.id;
  };
}

/**
 * Pick the next challenge matching `predicate`, in curriculum order.
 * Returns null (not undefined) so callers can chain fallbacks with `||`.
 *
 * Does not mutate `pool` — callers pass the shared `challenges` array and
 * Array.prototype.sort sorts in place.
 */
export function pickNextChallengeWith(order, pool, predicate) {
  const matches = (pool || []).filter(predicate);
  if (matches.length === 0) return null;
  return matches.slice().sort(makeChallengeComparator(order))[0] || null;
}
