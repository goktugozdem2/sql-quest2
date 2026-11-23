import { SKILL_TO_RADAR, mapTopicToSkill } from './skill-calc.js';

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

/**
 * Mock-interview questions this person has answered correctly, counted once
 * each (founder, 2026-09-25): a correct mock answer IS delivered value. Before
 * this, a free user who passed the SQL Fundamentals mock 4/4 with no challenge
 * solved met the cold-start gate — "you haven't solved anything here yet" —
 * and the profile read "Solved: 0 challenges". One question counts once
 * however many sittings got it right. A sitting saved before per-question
 * results were kept (no `questionResults` ids) contributes its
 * `questionsCorrect`, the best of its interview's sittings.
 *
 * @param {Array<object>|null|undefined} history `interviewHistory`
 * @returns {number}
 */
export function mockQuestionsSolved(history) {
  if (!Array.isArray(history)) return 0;
  const byId = new Set();
  const legacyBest = new Map();
  for (const h of history) {
    if (!h || typeof h !== 'object') continue;
    const iid = String(h.interviewId || h.interviewTitle || 'unknown').replace(' (Retry)', '');
    const rows = Array.isArray(h.questionResults) ? h.questionResults : null;
    if (rows && rows.some(r => r && r.questionId)) {
      for (const r of rows) if (r && r.correct && r.questionId) byId.add(`${iid}::${r.questionId}`);
    } else {
      const n = Number(h.questionsCorrect);
      if (Number.isFinite(n) && n > 0) legacyBest.set(iid, Math.max(legacyBest.get(iid) || 0, n));
    }
  }
  let legacy = 0;
  for (const [iid, n] of legacyBest) {
    const known = [...byId].filter(k => k.startsWith(`${iid}::`)).length;
    legacy += Math.max(0, n - known);
  }
  return byId.size + legacy;
}

/**
 * The one "how much has this person solved" count: challenges solved plus
 * mock questions answered correctly. The cold-start gate, the wall label and
 * the profile's Solved row all read this, so they cannot disagree.
 *
 * @param {{solved?: any, interviewHistory?: Array<object>}} ctx
 * @returns {number|null} null when the challenge count is unreadable
 */
export function practiceSolves({ solved = null, interviewHistory = null } = {}) {
  const n = countOf(solved);
  if (n === null) return null;
  return n + mockQuestionsSolved(interviewHistory);
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

// ── A deep link to a locked Hard, from someone who has solved nothing ──────
// (2026-11-22). Topic pages link every Hard in the bank; /challenges/advanced/
// is nothing but Hard. A zero-solve visitor who clicks a locked one met the
// cold-start dialog, which offers an EASY starter — the opposite of what the
// link asked for. 30 days to 11-22: ~75 such arrivals from the topic pages,
// 3 opened anything afterwards, 1 solved. When the open came from a link, the
// visitor gets a free Hard preview of the same kind instead, in the editor —
// free, so nothing is sold to someone who has solved nothing.
//
// Pick (rewritten 2026-11-23, new-content QA D2): a "same kind" match needs
// a DEFINING tag in common, not a broad one. Before, the score counted every
// tag and the category, so a gaps-and-islands login question (318, 319) was
// matched to #86 "Multi-CTE Revenue Pipeline" on SELECT, CTE, JOIN, GROUP BY
// and Window Functions — tags every free Hard carries — and the note called
// a customer-spend DENSE_RANK question "a free Hard question of the same
// kind". Now:
//   - SWAP_GENERIC_TAGS (SELECT, JOIN, CTE, GROUP BY, …) never count, and a
//     combined tag or category is split into its parts first ("Window
//     Function / LAG" is "Window Function" and "LAG");
//   - each remaining tag counts as itself (LAG) and as its canonical skill
//     (Window Functions), Querying Basics never;
//   - a tag that EVERY free Hard preview carries is dropped too: it cannot
//     tell one preview from another (Window Functions, today).
// The best preview by shared defining tags wins, the old all-tag overlap
// breaks ties, then the bank's order. When nothing defining is shared the
// swap still happens, but `sameKind` is false and the note says plainly that
// it is a different question. null when no unsolved free Hard is left.
export const SWAP_GENERIC_TAGS = new Set([
  'select', 'from', 'where', 'join', 'inner join', 'cte', 'with', 'subquery',
  'subqueries', 'group by', 'order by', 'having', 'distinct', 'aggregation',
  'limit', 'alias', 'count', 'sum', 'avg',
]);

const canonicalOf = raw => SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;

// tag key (lower case) -> display name, broad tags removed.
function definingTags(c) {
  const out = new Map();
  for (const raw of [...(c.skills || []), c.category].filter(Boolean)) {
    for (const part of String(raw).split(/[/+,]/)) {
      const tok = part.trim();
      if (!tok) continue;
      const key = tok.toLowerCase();
      if (SWAP_GENERIC_TAGS.has(key)) continue;
      if (!out.has(key)) out.set(key, tok);
      const canon = canonicalOf(tok);
      if (canon && canon !== 'Querying Basics' && !out.has(canon.toLowerCase())) out.set(canon.toLowerCase(), canon);
    }
  }
  return out;
}

const isFreeHard = c => c && c.freePreview && c.difficulty === 'Hard';

export function previewSwapMatch(target, challenges, solvedIds) {
  if (!target || !Array.isArray(challenges)) return null;
  const solved = solvedIds instanceof Set ? solvedIds : new Set(solvedIds || []);
  const allTags = c => new Set([...(c.skills || []), c.category].filter(Boolean).map(t => String(t).toLowerCase()));
  const previews = challenges.filter(c => isFreeHard(c) && c.id !== target.id);
  const pool = previews.filter(c => !solved.has(c.id));
  if (!pool.length) return null;
  // Tags every free Hard preview carries say nothing about kind.
  const universal = new Set();
  if (previews.length >= 2) {
    const sets = previews.map(c => definingTags(c));
    for (const key of sets[0].keys()) if (sets.every(m => m.has(key))) universal.add(key);
  }
  const want = definingTags(target);
  for (const key of universal) want.delete(key);
  const wantAll = allTags(target);
  let best = null, bestShared = [], bestPrimary = -1, bestSecondary = -1;
  for (const c of pool) {
    const shared = [];
    for (const key of definingTags(c).keys()) if (want.has(key)) shared.push(want.get(key));
    let secondary = 0;
    for (const t of allTags(c)) if (wantAll.has(t)) secondary++;
    if (shared.length > bestPrimary || (shared.length === bestPrimary && secondary > bestSecondary)) {
      best = c; bestShared = shared; bestPrimary = shared.length; bestSecondary = secondary;
    }
  }
  return { swap: best, sameKind: bestShared.length > 0, shared: bestShared };
}

export function previewSwapFor(target, challenges, solvedIds) {
  const m = previewSwapMatch(target, challenges, solvedIds);
  return m ? m.swap : null;
}
