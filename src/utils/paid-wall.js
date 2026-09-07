// Who may be shown a paid wall at all — the ordering rule, not the pricing.
//
// ── The incident ────────────────────────────────────────────────────────────
// Measured 2026-09-07 (docs/agent/ledger.md, paywall-surfaces mid-window check
// of 2026-09-08): 8 people met a paid wall in the 34 hours after the surfaces
// deployed, and **two of them had solved nothing at all**.
//
//   aid 2eb0db72 — arrived on /snowflake-sql-interview/, clicked Hard
//                  challenge 89, solvedCount 0 → got `company_modal`, the
//                  buyable Pro modal.
//   aid e7914d44 — arrived on /challenges/window-functions/, clicked a locked
//                  mock interview, solvedCount 0 → got the Pro modal.
//
// Neither had run a single query. `docs/data-driven-product.md` states the
// order plainly — **satisfy first, then ask** — and both of these inverted it.
// This is not a pricing question and not a copy question: a wall shown before
// any value has been delivered is a sequencing bug, and the person leaves
// having learned only that the product wants money.
//
// ── The rule ────────────────────────────────────────────────────────────────
// A person with zero solves is never asked to pay. They still meet the gate —
// the content really is Pro, and pretending otherwise would be a lie the
// checkout would later contradict — but the gate answers with somewhere to
// START, not with a price. The collision is still recorded, under
// `wall: 'cold_start'`, so the diversion is measurable rather than invisible.
//
// The threshold is one constant on purpose. "Satisfy first" arguably means the
// engaged bar (5+ solves, docs/data-driven-product.md), not one solve; moving
// it is a one-line change plus a ledger claim, and should be made as its own
// measured decision rather than smuggled in here.

/** Fewer than this many solves and the person is never shown a Pro ask. */
export const COLD_START_SOLVE_THRESHOLD = 1;

/**
 * Has this person delivered-value-to-date of zero?
 *
 * Accepts the raw count, a Set (`solvedChallenges`), or anything with a
 * `.size` / `.length`, because the call sites hold all three shapes. Anything
 * unreadable is treated as NOT cold — failing towards the existing behaviour,
 * never towards silently suppressing a wall the product depends on.
 *
 * @param {number|Set|Array|{size?:number,length?:number}|null|undefined} solved
 * @returns {boolean}
 */
export function isColdStart(solved) {
  const n = countOf(solved);
  if (n === null) return false;
  return n < COLD_START_SOLVE_THRESHOLD;
}

function countOf(solved) {
  if (typeof solved === 'number') return Number.isFinite(solved) ? solved : null;
  if (solved == null) return null;
  if (typeof solved.size === 'number' && Number.isFinite(solved.size)) return solved.size;
  if (typeof solved.length === 'number' && Number.isFinite(solved.length)) return solved.length;
  return null;
}

/**
 * Which wall a locked interaction should raise.
 *
 * 'none'           — nothing is locked for this person (Pro).
 * 'cold_start'     — locked, but they have solved nothing: route, never sell.
 * 'company_modal'  — locked, on a company page: the buyable modal (highest
 *                    intent moment in the product, unchanged since 08-14).
 * 'preview_dialog' — locked, everyone else: the collision catcher.
 *
 * The cold-start branch is checked BEFORE the company branch on purpose. A
 * company-page arrival with zero solves is exactly aid 2eb0db72 above; that
 * door produces our highest intent AND our least-earned ask, and intent does
 * not license asking someone who has been given nothing.
 *
 * @param {{isPro?: boolean, solved?: any, companyFilter?: string|null}} ctx
 * @returns {'none'|'cold_start'|'company_modal'|'preview_dialog'}
 */
export function paidWallFor({ isPro = false, solved = null, companyFilter = null } = {}) {
  if (isPro) return 'none';
  if (isColdStart(solved)) return 'cold_start';
  if (companyFilter) return 'company_modal';
  return 'preview_dialog';
}
