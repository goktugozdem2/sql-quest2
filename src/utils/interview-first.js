// Interview-first — who sees the plan first and the game not at all.
//
// THE FRAME (docs/plans/interview-first-2026-09-17.md): every real purchase in
// the product's history was made by someone preparing for an interview —
// 3 of 3 — and the modal-to-plan click rate was 9.3% for declared interview
// intent against 0 of 81 for people with no intent at all. SQL Quest is
// interview preparation for people who are job-hunting; the person we build
// for has a date (or will have one), a company (or a role), and a gap.
//
// This module answers ONE question: is this an interview person? When it says
// yes and `FEATURE_FLAGS.features.interviewFirst` is on, app.jsx (through a
// single helper, `interviewFirstOn(surface)`) does four things:
//   (a) the daily-reward / login-reward calendar never opens;
//   (b) achievement unlock toasts do not render — the achievement is still
//       awarded and saved. Hide, never withhold;
//   (c) the header's coins and lives cluster is not rendered;
//   (d) the Coach tab renders the InterviewPrepCard ABOVE the next-step card.
// Everyone else sees exactly today's product. Nothing is deleted.
//
// THE POPULATION IS THE INTERVIEW NAV'S, DELIBERATELY. `interviewNavReason`
// (src/utils/interview-nav.js) already names the four signals that a person
// is here for hiring — history, declared intent, the interview-prep goal, a
// company-page arrival — and it is what decides who sees the Interview tab.
// Two definitions of "interview person" would drift apart within a month, so
// this module reuses that helper and adds only what the nav could not see:
// a countdown target (`prepTarget.date` / `prepTarget.company`), which did not
// exist as a concept when the nav was written. tests/interview-first.test.js
// asserts the two agree on every input the nav understands.
//
// Pure. No React, no DOM, no storage, no clock. Fails closed: malformed input
// is "not an interview person", never the other way round.

import { interviewNavReason } from './interview-nav.js';

/** The reasons, strongest first. `interview_first_applied {reason}` carries one. */
export const INTERVIEW_FIRST_REASONS = Object.freeze([
  'history',   // any interview history — they have sat a mock
  'intent',    // declared intent interview / job_ready
  'goal',      // the interview-prep Coach goal
  'company',   // arrived on a company page (`company:` arrival stamp)
  'date',      // named an interview date on the countdown card
  'target',    // named a company on the countdown card
]);

const nonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Why this person is an interview person, or null.
 *
 * @param {Object} args
 * @param {string|null} [args.intent]           getUserIntent() — 'interview' | 'job_ready' | …
 * @param {{company?:string|null,date?:string|null}|null} [args.prepTarget]
 * @param {string|null} [args.coachGoalId]      coachState.goalId
 * @param {string|null} [args.arrivalSrc]       localStorage sqlquest_arrival_src
 * @param {Array|boolean|null} [args.interviewHistory] the history array, or a boolean
 * @returns {string|null} one of INTERVIEW_FIRST_REASONS, or null
 */
export function interviewFirstReason(args) {
  const {
    intent = null,
    prepTarget = null,
    coachGoalId = null,
    arrivalSrc = null,
    interviewHistory = null,
  } = (args && typeof args === 'object') ? args : {};
  const hasInterviewHistory = Array.isArray(interviewHistory)
    ? interviewHistory.length > 0
    : interviewHistory === true;
  const navReason = interviewNavReason({
    intent: typeof intent === 'string' ? intent : null,
    hasInterviewHistory,
    goalId: typeof coachGoalId === 'string' ? coachGoalId : null,
    arrivalSrc: typeof arrivalSrc === 'string' ? arrivalSrc : null,
  });
  if (navReason) return navReason;
  const target = (prepTarget && typeof prepTarget === 'object') ? prepTarget : {};
  if (nonEmptyString(target.date)) return 'date';
  if (nonEmptyString(target.company)) return 'target';
  return null;
}

/** True for the population interview-first applies to. Same inputs as above. */
export function isInterviewPerson(args) {
  return interviewFirstReason(args) !== null;
}

// ─────────────────────────── the status strip ────────────────────────────────
//
// The founder's model, verbatim (2026-09-18): "mülakat amaçlı kişilere hizmet
// edeceğiz — kime mülakat olacak, ne zaman olacak, şu anki durum ne, hedefe ne
// kadar var". Four fields, always visible, for an interview person:
//   WHO       prepTarget.company
//   WHEN      days to prepTarget.date
//   WHERE I AM the honest number we have — never a pass probability
//   HOW FAR   what the plan puts between them and the date
//
// This function turns what app.jsx already computes for the countdown card
// (the target, the readiness, the plan) into the four cells. It adds no new
// number: every value here is one the card would also show, or a count over
// the plan the card would also render. Pure, no clock of its own.

export const STATUS_WHERE_KIND = Object.freeze({ READINESS: 'readiness', CHECK: 'check', COVERAGE: 'coverage' });

/** ≤ this many days out, the WHEN cell may carry the accent — an urgency signal. */
export const STATUS_URGENT_DAYS = 7;

/** The stored goal-check result is shown back for this long. */
export const STATUS_CHECK_FRESH_DAYS = 30;

/**
 * The lock rule the card's doors apply, restated for a plan item: a Pro-only
 * mock, or a Hard challenge without a free preview. app.jsx passes its own
 * `isContentLocked` through `isItemLocked`; this default exists so the pure
 * helper answers on its own and the test can pin the rule.
 */
export function defaultItemLocked(item, { mocks = null } = {}) {
  if (!item || typeof item !== 'object') return false;
  if (item.kind === 'mock') {
    const mock = Array.isArray(mocks) ? mocks.find(m => m && m.id === item.interviewId) : null;
    return mock ? !mock.isFree : true;
  }
  return item.difficulty === 'Hard' && !item.freePreview;
}

const toIdSet = (ids) => {
  if (ids instanceof Set) return ids;
  if (Array.isArray(ids)) return new Set(ids);
  return new Set();
};

/**
 * @param {Object} args
 * @param {{company?:string|null,date?:string|null}|null} args.prepTarget
 * @param {Object|null} args.target          findPlanTarget() output (kind, challengeIds)
 * @param {Object|null} args.readiness       companyReadiness() output, archetype only
 * @param {{overall:number,ageDays?:number}|null} args.readinessRecord
 *        readReadinessRecord(storage, { maxAgeDays: STATUS_CHECK_FRESH_DAYS }),
 *        re-weighted to the company by the caller; null when stale or absent
 * @param {Object|null} args.plan            planToDate() output, or null without a date
 * @param {Set|Array} args.solvedIds
 * @param {boolean} args.isPro
 * @param {number|null} args.days            daysUntil(prepTarget.date, now) — null without a date
 * @param {number|null} [args.bankSize]      the bank's size, for the no-target coverage
 * @param {Function} [args.isItemLocked]     (item) => boolean; defaults to defaultItemLocked
 * @param {Array} [args.mocks]               for the default lock rule only
 */
export function interviewStatusModel(args) {
  const {
    prepTarget = null, target = null, readiness = null, readinessRecord = null,
    plan = null, solvedIds = null, isPro = false, days = null, bankSize = null,
    isItemLocked = null, mocks = null,
  } = (args && typeof args === 'object') ? args : {};
  const pt = (prepTarget && typeof prepTarget === 'object') ? prepTarget : {};
  const company = nonEmptyString(pt.company) ? pt.company.trim() : null;
  const hasDate = nonEmptyString(pt.date);
  const solved = toIdSet(solvedIds);

  // WHEN — null means no usable date. Urgent only inside the window and
  // never for a date behind us.
  const daysOut = (typeof days === 'number' && Number.isFinite(days)) ? days : null;
  const when = {
    hasDate,
    days: daysOut,
    urgent: daysOut !== null && daysOut >= 0 && daysOut <= STATUS_URGENT_DAYS,
    past: daysOut !== null && daysOut < 0,
  };

  // WHERE I AM — three branches, first that answers wins.
  let where;
  const readinessScore = (target && target.kind === 'archetype' && readiness && Number.isFinite(Number(readiness.score)))
    ? Math.round(Number(readiness.score)) : null;
  const checkScore = (readinessRecord && Number.isFinite(Number(readinessRecord.overall)))
    ? Math.round(Number(readinessRecord.overall)) : null;
  if (readinessScore !== null) {
    where = { kind: STATUS_WHERE_KIND.READINESS, score: readinessScore, total: 100 };
  } else if (checkScore !== null) {
    where = { kind: STATUS_WHERE_KIND.CHECK, score: checkScore, total: 100, ageDays: readinessRecord.ageDays ?? null };
  } else if (target && Array.isArray(target.challengeIds)) {
    const ids = [...new Set(target.challengeIds)];
    where = {
      kind: STATUS_WHERE_KIND.COVERAGE, scoped: true,
      solved: ids.filter(id => solved.has(id)).length, total: ids.length,
    };
  } else {
    where = {
      kind: STATUS_WHERE_KIND.COVERAGE, scoped: false,
      solved: solved.size,
      total: (typeof bankSize === 'number' && Number.isFinite(bankSize) && bankSize > 0) ? bankSize : null,
    };
  }

  // HOW FAR — the plan's scheduled items. `left` is what follows today;
  // `deferred` (what did not fit before the date) is carried, not shown.
  // The Pro count is the plan items the free tier would stop at, under the
  // same rule the card's doors apply; a Pro user has none.
  let howFar = null;
  if (plan && typeof plan === 'object' && Array.isArray(plan.days) && plan.status !== 'unavailable' && plan.status !== 'past') {
    const scheduled = plan.days.flatMap(d => (d && Array.isArray(d.items)) ? d.items : []);
    const today = Array.isArray(plan.today) ? plan.today.length : 0;
    const locked = typeof isItemLocked === 'function' ? isItemLocked : (item) => defaultItemLocked(item, { mocks });
    const pro = isPro ? 0 : scheduled.filter(item => { try { return !!locked(item); } catch (_) { return false; } }).length;
    howFar = {
      status: plan.status,
      today,
      left: Math.max(0, scheduled.length - today),
      pro,
      deferred: Number.isFinite(Number(plan.totals?.deferred)) ? Number(plan.totals.deferred) : 0,
    };
  }

  return {
    who: { company, hasCompany: company !== null },
    when,
    where,
    howFar,
    // The event's payload, in one place so the strip and the test agree.
    event: {
      hasCompany: company !== null,
      hasDate,
      whereKind: where.kind,
      proLeft: howFar ? howFar.pro : 0,
    },
  };
}
