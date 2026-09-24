// The company ask — one question after the first solve (founder's plan,
// 2026-09-25, P0 items 1–3 and 9).
//
// After a person's FIRST correct solve, one inline line under the result:
// "Which company are you preparing for?" — a search box over the 30
// companies (INTAKE_COMPANIES, the app's ?company= list), a "Not sure yet"
// choice, and Skip. Not a modal. Asked once; if it goes unanswered, asked
// again at the THIRD solve; then never again. "Not sure yet" is an answer.
// A company already on record (prepTarget.company — a company page, the
// readiness test, the intake) is never asked for.
//
// Why here and not at the door: the required goal screen at session start
// (the goal gate) was switched off the same night it shipped, because a
// question before the first solve is what puts `first_solve_10m` (12.4%) at
// risk. After the first solve the question cannot move that number.
//
// Behind `intakeAfterFirstSolve` (off by default) and an A/B: when the flag
// is on, a person is assigned an arm by a hash of their aid at their first
// solve — `ask` sees the line, `control` does not — written once as
// `company_ask_assigned` so both arms have a denominator. One week, then the
// founder decides. Read: `company_ask_split` in docs/agent/metrics.md.
//
// The answer goes to prepTarget.company, which the product already reads:
// the Coach's "Your {company} plan" card and the Interview tab's pinned
// company mock (Capital One, Revolut) or its tagged-challenge door. The
// confirmation links straight to both — an answer with no visible effect
// would teach people not to answer the next question.

import { INTAKE_COMPANIES, isIntakeCompany } from './onboarding-intake.js';

export const COMPANY_ASK_TEST_ID = 'company_ask_v1';
export const COMPANY_ASK_ARMS = ['ask', 'control'];
export const COMPANY_ASK_KEY = 'sqlquest_company_ask_v1';
export const COMPANY_ASK_SOLVES = [1, 3];   // the first ask, the one repeat
export const COMPANY_ASK_UNDECIDED = 'undecided';
export const COMPANY_ASK_MAX_MATCHES = 6;

// The FNV-style hash the first-screen and homepage CTA tests use, PLUS a
// murmur3 finalizer. Without the finalizer the salt does not make two-arm
// tests independent: the multiplier is odd, so the hash's low bit is just the
// parity of the characters' sum, and `h % 2` for this test would be the
// first-screen test's arm flipped, for every aid (measured 2026-09-25: 0
// agreements in 2,000). The finalizer mixes the high bits into the low one.
export function companyAskArm(aid) {
  let h = 2166136261;
  const s = `${String(aid)}:${COMPANY_ASK_TEST_ID}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return COMPANY_ASK_ARMS[(h >>> 0) % COMPANY_ASK_ARMS.length];
}

/** An empty record: no arm, never asked, no answer. */
export function emptyCompanyAskRecord() {
  return { arm: null, asks: 0, answer: null, answeredAt: null };
}

export function normalizeCompanyAskRecord(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    arm: COMPANY_ASK_ARMS.includes(r.arm) ? r.arm : null,
    asks: Number.isInteger(r.asks) && r.asks >= 0 ? r.asks : 0,
    answer: typeof r.answer === 'string' ? r.answer : null,
    answeredAt: typeof r.answeredAt === 'string' ? r.answeredAt : null,
  };
}

/**
 * What to do at a solve. `solves` is the lifetime count INCLUDING the solve
 * that just happened, so the first correct solve is `solves === 1`.
 *
 * Returns { assign, arm, ask, askNumber }:
 *   assign     — write `company_ask_assigned` now (first solve, flag on, no arm yet)
 *   arm        — the person's arm (stored, or assigned now), or null
 *   ask        — show the line on this solve
 *   askNumber  — 1 or 2
 *
 * Only a person whose first solve happens while the flag is on is ever in
 * the test: someone with 40 solves before the flip is never assigned, so the
 * two arms are the same population.
 */
export function companyAskDecision({ flagOn = false, solves = 0, record = null, aid = null, knownCompany = null } = {}) {
  const none = { assign: false, arm: null, ask: false, askNumber: 0 };
  if (!flagOn) return none;
  const r = normalizeCompanyAskRecord(record);
  let arm = r.arm;
  let assign = false;
  if (!arm) {
    if (solves !== 1 || !aid) return none;
    arm = companyAskArm(aid);
    assign = true;
  }
  const base = { assign, arm, ask: false, askNumber: 0 };
  if (arm !== 'ask') return base;
  if (r.answer) return base;
  if (knownCompany) return base;
  if (solves === COMPANY_ASK_SOLVES[0] && r.asks === 0) return { ...base, ask: true, askNumber: 1 };
  if (solves === COMPANY_ASK_SOLVES[1] && r.asks === 1) return { ...base, ask: true, askNumber: 2 };
  return base;
}

/** Companies matching what is typed: prefix matches first, then contains; case-insensitive. */
export function matchCompanies(query, list = INTAKE_COMPANIES, max = COMPANY_ASK_MAX_MATCHES) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return list.slice(0, max);
  const starts = list.filter(c => c.toLowerCase().startsWith(q));
  const words = list.filter(c => !starts.includes(c) && c.toLowerCase().split(/\s+/).some(w => w.startsWith(q)));
  const contains = list.filter(c => !starts.includes(c) && !words.includes(c) && c.toLowerCase().includes(q));
  return [...starts, ...words, ...contains].slice(0, max);
}

/** An answer the ask accepts: one of the 30 companies, or "not sure yet". */
export function isCompanyAskAnswer(value) {
  return value === COMPANY_ASK_UNDECIDED || isIntakeCompany(value);
}
