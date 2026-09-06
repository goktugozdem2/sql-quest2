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
 * A "free preview" is a HARD challenge flagged `freePreview: true` — the
 * sampler a non-Pro user may open behind the Hard wall. Same predicate as the
 * `freeHardPreviewsUnsolved` stamp on `content_lock_reached`, kept in one
 * place so the list, the catcher, the Coach and the metric all agree on what
 * a preview is. A `freePreview` flag on a non-Hard row is not a preview.
 * (2026-09-06, paywall-surfaces T7)
 */
export function isFreePreview(challenge) {
  return !!challenge && challenge.freePreview === true && challenge.difficulty === 'Hard';
}

/**
 * Comparator: curriculum position first, then difficulty, then id.
 *
 * Challenges outside the roadmap sort after every roadmap challenge (999999),
 * which is the point — the interview bank should never outrank the ladder in a
 * recommendation.
 *
 * `options.previewsFirst` (default false) pins free previews ahead of locked
 * challenges, curriculum order preserved inside each group. It exists for the
 * Hard list (plan D-1: "the unlocked rows on top"), where the pool is already
 * Hard-only. Do NOT use it for a recommendation pick over a mixed pool — it
 * would rank a Hard preview above the beginner ladder, which is the raw-array
 * bug in a new coat. With the option off, the returned closure is the same
 * base comparator as before. (2026-09-06, paywall-surfaces T7)
 *
 * @param {Map<number, number>} order from buildCurriculumOrder
 * @param {{ previewsFirst?: boolean }} [options]
 */
export function makeChallengeComparator(order, options) {
  const base = (a, b) => {
    const pathA = order.has(a.id) ? order.get(a.id) : 999999;
    const pathB = order.has(b.id) ? order.get(b.id) : 999999;
    if (pathA !== pathB) return pathA - pathB;
    const diffA = CHALLENGE_DIFFICULTY_ORDER[a.difficulty] ?? 99;
    const diffB = CHALLENGE_DIFFICULTY_ORDER[b.difficulty] ?? 99;
    if (diffA !== diffB) return diffA - diffB;
    return a.id - b.id;
  };
  if (options?.previewsFirst !== true) return base;
  return (a, b) => {
    const groupA = isFreePreview(a) ? 0 : 1;
    const groupB = isFreePreview(b) ? 0 : 1;
    if (groupA !== groupB) return groupA - groupB;
    return base(a, b);
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

// ---------------------------------------------------------------------------
// Paywall-surface helpers (2026-09-06, docs/plans/paywall-surfaces-plan.md T7)
//
// The 2026-08-21 lock read: 15 of 16 people who hit the Hard wall had every
// free preview untouched. Three surfaces now lead people to the previews (the
// Hard list, the collision catcher, a Coach step), and all three need the same
// two things: the unsolved previews in CURRICULUM order — "nearest" means
// curriculum-next, never lowest id (see the incident note at the top of this
// file) — and counts computed from the bank at render. The plan's first draft
// carried "32 Hard" from a stale table; the bank had 54. No literal survives
// here: every number below is derived from the `challenges` array passed in.
// ---------------------------------------------------------------------------

/**
 * Accept the solved set in whatever shape the caller holds it — the app keeps
 * `solvedChallenges` as a Set, tests and stored data pass arrays of ids.
 */
function toSolvedSet(solved) {
  if (solved && typeof solved.has === 'function') return solved;
  return new Set(Array.isArray(solved) ? solved : []);
}

/**
 * Up to `n` challenges from `pool` matching `predicate`, in curriculum order —
 * the multi-pick sibling of pickNextChallengeWith, same ordering semantics.
 * `n <= 0` (or a non-number) returns []. Never mutates `pool`.
 */
export function pickTopNWith(order, pool, predicate, n) {
  const limit = Math.floor(Number(n));
  if (!(limit > 0)) return [];
  const matches = (pool || []).filter(predicate);
  if (matches.length === 0) return [];
  return matches.slice().sort(makeChallengeComparator(order)).slice(0, limit);
}

/**
 * The free Hard previews this user has not solved yet, in curriculum order.
 * The catcher shows the first three; the Coach step offers the first one.
 *
 * @param {Array} challenges the bank
 * @param {Set<number>|number[]} solvedSet solved challenge ids
 * @param {Map<number, number>} order from buildCurriculumOrder
 */
export function unsolvedFreePreviews(challenges, solvedSet, order) {
  const solved = toSolvedSet(solvedSet);
  return (challenges || [])
    .filter(c => isFreePreview(c) && !solved.has(c.id))
    .sort(makeChallengeComparator(order));
}

/**
 * Every count the paywall surfaces put in copy, computed from the bank.
 *
 *   hardTotal        all Hard challenges
 *   previewTotal     Hard challenges flagged freePreview
 *   previewSolved    previews in solvedSet
 *   previewUnsolved  previews not in solvedSet
 *   lockedHardCount  Hard challenges that are NOT previews (Pro-only)
 *
 * Invariants: hardTotal === previewTotal + lockedHardCount and
 * previewTotal === previewSolved + previewUnsolved.
 */
export function hardPreviewCounts(challenges, solvedSet) {
  const solved = toSolvedSet(solvedSet);
  let hardTotal = 0;
  let previewTotal = 0;
  let previewSolved = 0;
  for (const c of challenges || []) {
    if (!c || c.difficulty !== 'Hard') continue;
    hardTotal += 1;
    if (!isFreePreview(c)) continue;
    previewTotal += 1;
    if (solved.has(c.id)) previewSolved += 1;
  }
  return {
    hardTotal,
    previewTotal,
    previewSolved,
    previewUnsolved: previewTotal - previewSolved,
    lockedHardCount: hardTotal - previewTotal,
  };
}
