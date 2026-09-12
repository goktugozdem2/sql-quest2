// The free-tier boundary — five flag-gated moves, one pure module.
//
// docs/plans/free-tier-boundary-2026-09-12.md, in one line: the free tier is
// not too big, it is in front of the paid good. Measured 2026-09-12: the
// locked Hard set is opened by 9% of people who open anything, the mocks by
// 3 people a month and by none of the 79 interview-intent people; company
// sets are mostly free except Amazon, the one set that produced a payer; the
// interview-prep goal puts its first locked step at 11 and holds no mock.
//
// Every purchase in the product's history was a first-session decision at
// six to ten solves (docs/reads/purchase-timing-2026-09-09.md), so the moves
// below put the paid good on the path of a person with a deadline INSIDE the
// first session, and stop asking the people who have never bought. None of
// them cuts Easy/Medium — that is the denominator the only working ask has.
//
// This module decides WHAT; app.jsx decides WHEN and renders. Each function
// takes `flagOn` explicitly so a caller that forgets the flag gets today's
// behaviour, never the new one. Flags: src/data/feature-flags.js.
//
//   M1 companySetGate  — companySetGate / companySetFreeIds / companySetProgress
//   M2 goalWallEarly   — earlyWallCurriculum / withEarlyWall
//   M3 deadlineOffer   — deadlineOfferFor / deadlineEventMeta
//   M4 quietEarlyAsks  — quietAskDecision
//   M5 mockDoor        — the mock steps earlyWallCurriculum inserts, pickProMockId
//
// Nothing here reads a clock, storage, or the window.

/** M1: how many of a company's set are free to try in the company view. */
export const COMPANY_SET_FREE_COUNT = 3;
/** M3: a date this far out or nearer is a deadline the offer may speak to. */
export const DEADLINE_OFFER_MAX_DAYS = 45;
/** M4: an automatic ask at this many solves or fewer is replaced by a nudge. */
export const QUIET_ASK_MAX_SOLVES = 3;
/** M4: the streak modal — 13 people asked in 30 days, 0 clicks ever. Silent. */
export const QUIET_ASK_SILENT_REASONS = ['milestone_streak'];
/** M4: the reasons whose early firings become a nudge instead of a price. */
export const QUIET_ASK_NUDGE_REASONS = ['company_hard', 'interview_locked'];
/** M5: the mock a free user is sent to instead of a locked one. */
export const FREE_MOCK_ID = 'sql-fundamentals-free';
/** M5: the generic interview mock when nobody named a company. */
export const DEFAULT_PRO_MOCK_ID = 'top-10-most-asked';
/** M2: the two steps the reorder moves, by their registry ids (goals.js). */
export const EARLY_WALL_PREVIEW_STEP_ID = 'iv-5';   // challenge 23, a free Hard preview
export const EARLY_WALL_LOCKED_STEP_ID = 'iv-7';    // challenge 71, Top-N per Category — locked Hard
export const EARLY_WALL_FREE_MOCK_STEP_ID = 'iv-mock-free';
export const EARLY_WALL_PRO_MOCK_STEP_ID = 'iv-mock-pro';
export const EARLY_WALL_GOAL_ID = 'interview-prep';
/** M2: the reordered goal's first four positions (1-based): preview at 3, lock at 4. */
export const EARLY_WALL_PREVIEW_POSITION = 3;
export const EARLY_WALL_LOCKED_POSITION = 4;
export const MOCK_STEP_TYPE = 'mock_interview';

const DIFF = { Easy: 0, Medium: 1, Hard: 2 };

// ── M1 · company set gate ─────────────────────────────────────────────────

/**
 * The order a company view lists its set in: difficulty first, then id —
 * the same comparator the Practice tab uses under a company filter, so the
 * "first three" the gate frees are the first three the person sees.
 */
export function companySetOrder(scoped) {
  return (Array.isArray(scoped) ? scoped.filter(Boolean) : []).slice().sort((a, b) => {
    const da = DIFF[a.difficulty] ?? 99;
    const db = DIFF[b.difficulty] ?? 99;
    if (da !== db) return da - db;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

/** The ids of the first `n` challenges of the set, in the set's order. */
export function companySetFreeIds(scoped, n = COMPANY_SET_FREE_COUNT) {
  return new Set(companySetOrder(scoped).slice(0, Math.max(0, n)).map(c => c.id));
}

function idSet(solved) {
  if (solved instanceof Set) return solved;
  if (Array.isArray(solved)) return new Set(solved);
  return new Set();
}

/**
 * Should THIS click, in THIS company view, meet the set wall?
 *
 * Gated only when every one of these holds: the flag is on, the person is not
 * Pro, a company filter is active, the challenge is in that company's set, it
 * is not one of the free three, and they have not already solved it (a solved
 * challenge is theirs; the gate never takes work back). A Hard preview past
 * position three is gated INSIDE the company view — it stays free from the
 * general list, which is the point: the curated set is what Pro buys.
 */
export function companySetGate({ flagOn = false, isPro = false, companyFilter = null, challenge = null, scoped = [], solved = null } = {}) {
  const none = { gated: false };
  if (!flagOn || isPro || !companyFilter || !challenge) return none;
  const ordered = companySetOrder(scoped);
  const position = ordered.findIndex(c => c.id === challenge.id);
  if (position < 0) return none;
  if (position < COMPANY_SET_FREE_COUNT) return none;
  if (idSet(solved).has(challenge.id)) return none;
  const freeIds = new Set(ordered.slice(0, COMPANY_SET_FREE_COUNT).map(c => c.id));
  return {
    gated: true,
    position: position + 1,
    freeCount: freeIds.size,
    setSize: ordered.length,
    solvedInSet: ordered.filter(c => idSet(solved).has(c.id)).length,
    freeIds,
  };
}

/**
 * What the company banner and the set-complete ask say. `freeIds` is the
 * gate's free three when the flag is on, else the caller's own notion of
 * free (everything not Hard-locked) — the same shape either way.
 */
export function companySetProgress({ scoped = [], solved = null, freeIds = null } = {}) {
  const ordered = companySetOrder(scoped);
  const s = idSet(solved);
  const free = freeIds instanceof Set ? ordered.filter(c => freeIds.has(c.id)) : ordered;
  const freeSolved = free.filter(c => s.has(c.id)).length;
  return {
    setSize: ordered.length,
    freeCount: free.length,
    freeSolved,
    proCount: ordered.length - free.length,
    allFreeSolved: free.length > 0 && freeSolved >= free.length,
  };
}

// ── M4 · quiet the asks that have never sold ─────────────────────────────

/**
 * 'show'   — today's behaviour.
 * 'silent' — no modal at all (the streak modal).
 * 'nudge'  — the free-preview catcher (a Hard wall in a company view) or the
 *            free mock (a locked mock), instead of a price, at three solves
 *            or fewer. Measured 2026-09-12: company_hard fired at an average
 *            of 1.8 solves, generic at ≤3 for 25 of 45 people, streak for 13;
 *            50 people a month, no sale in the product's history from any.
 */
export function quietAskDecision({ flagOn = false, reason = null, solvedCount = null } = {}) {
  if (!flagOn) return 'show';
  if (QUIET_ASK_SILENT_REASONS.includes(reason)) return 'silent';
  // An unreadable count fails towards today's behaviour — a suppressed ask
  // is a revenue decision, and null is not zero.
  const readable = typeof solvedCount === 'number' && Number.isFinite(solvedCount);
  if (QUIET_ASK_NUDGE_REASONS.includes(reason) && readable && solvedCount <= QUIET_ASK_MAX_SOLVES) return 'nudge';
  return 'show';
}

// ── M3 · the milestone modal speaks to the deadline ───────────────────────

/**
 * Null, or what the milestone modal leads with for a person whose date is
 * inside DEADLINE_OFFER_MAX_DAYS: the days, the company they named (or null),
 * the count of locked Hard challenges, and the mock they would sit. `daysOut`
 * is the integer the countdown card already computes — the date itself never
 * comes here. Today or past-due (0) still counts: the interview is now.
 */
export function deadlineOfferFor({ flagOn = false, daysOut = null, company = null, hardCount = 0, mockTitle = null } = {}) {
  if (!flagOn) return null;
  if (daysOut == null || typeof daysOut !== 'number') return null; // no date is no deadline — null is not "today"
  const d = Number(daysOut);
  if (!Number.isFinite(d) || d < 0 || d > DEADLINE_OFFER_MAX_DAYS) return null;
  return {
    daysOut: Math.round(d),
    company: typeof company === 'string' && company.trim() ? company.trim() : null,
    hardCount: Number.isFinite(Number(hardCount)) ? Number(hardCount) : 0,
    mockTitle: typeof mockTitle === 'string' && mockTitle.trim() ? mockTitle.trim() : null,
  };
}

/** What `pro_modal_shown` carries so the read can split on the deadline. */
export function deadlineEventMeta(reason) {
  const d = reason && reason.deadline;
  return {
    deadline: !!d,
    daysOut: d && Number.isFinite(Number(d.daysOut)) ? Number(d.daysOut) : null,
  };
}

// ── M2 + M5 · the interview-prep goal meets the wall at step 4 ───────────

/**
 * The Pro mock a goal step names. A company the person typed wins (its own
 * mock, if one exists, matched on `company` case-insensitively); otherwise
 * the generic interview mock. Never a free mock, never a company nobody named.
 */
export function pickProMockId(mocks, company = null) {
  const list = Array.isArray(mocks) ? mocks.filter(m => m && !m.isFree && typeof m.id === 'string') : [];
  const wanted = typeof company === 'string' ? company.trim().toLowerCase() : '';
  if (wanted) {
    const own = list.find(m => typeof m.company === 'string' && m.company.trim().toLowerCase() === wanted);
    if (own) return own.id;
  }
  const generic = list.find(m => m.id === DEFAULT_PRO_MOCK_ID);
  return generic ? generic.id : (list[0] ? list[0].id : null);
}

/**
 * The interview-prep curriculum with the paid good inside the first session:
 * positions 1–2 unchanged, 3 = the free Hard preview (iv-5, challenge 23),
 * 4 = a locked Hard (iv-7, challenge 71), then — with the mock door — 5 = the
 * free mock, 6 = a Pro mock, then the rest in its original order. Returns a
 * new array; the registry is never mutated. Idempotent: an already reordered
 * curriculum comes back as it is. A curriculum missing either moved step is
 * returned unchanged — the reorder has nothing to say about a goal that is
 * not this one.
 */
export function earlyWallCurriculum(curriculum, { mockDoor = false, proMockId = null } = {}) {
  if (!Array.isArray(curriculum)) return curriculum;
  const steps = curriculum.filter(Boolean);
  const preview = steps.find(s => s.id === EARLY_WALL_PREVIEW_STEP_ID);
  const locked = steps.find(s => s.id === EARLY_WALL_LOCKED_STEP_ID);
  if (!preview || !locked) return curriculum;
  const already = steps[EARLY_WALL_PREVIEW_POSITION - 1]?.id === EARLY_WALL_PREVIEW_STEP_ID
    && steps[EARLY_WALL_LOCKED_POSITION - 1]?.id === EARLY_WALL_LOCKED_STEP_ID;
  const base = already
    ? steps
    : (() => {
        const rest = steps.filter(s => s.id !== EARLY_WALL_PREVIEW_STEP_ID && s.id !== EARLY_WALL_LOCKED_STEP_ID);
        const head = rest.slice(0, EARLY_WALL_PREVIEW_POSITION - 1);
        const tail = rest.slice(EARLY_WALL_PREVIEW_POSITION - 1);
        return [...head, preview, locked, ...tail];
      })();
  const withoutMocks = base.filter(s => s.id !== EARLY_WALL_FREE_MOCK_STEP_ID && s.id !== EARLY_WALL_PRO_MOCK_STEP_ID);
  if (!mockDoor) return withoutMocks;
  const mocks = [{ id: EARLY_WALL_FREE_MOCK_STEP_ID, type: MOCK_STEP_TYPE, interviewId: FREE_MOCK_ID }];
  if (typeof proMockId === 'string' && proMockId) {
    mocks.push({ id: EARLY_WALL_PRO_MOCK_STEP_ID, type: MOCK_STEP_TYPE, interviewId: proMockId });
  }
  const at = EARLY_WALL_LOCKED_POSITION; // insert after the locked Hard
  return [...withoutMocks.slice(0, at), ...mocks, ...withoutMocks.slice(at)];
}

/**
 * The goal object the engine and the Coach card should read. Only the
 * interview-prep goal changes, only with the flag on; every other goal, and
 * a null, comes back untouched (same reference).
 */
export function withEarlyWall(goal, { flagOn = false, mockDoor = false, proMockId = null } = {}) {
  if (!flagOn || !goal || goal.id !== EARLY_WALL_GOAL_ID || !Array.isArray(goal.curriculum)) return goal;
  return { ...goal, curriculum: earlyWallCurriculum(goal.curriculum, { mockDoor, proMockId }) };
}
