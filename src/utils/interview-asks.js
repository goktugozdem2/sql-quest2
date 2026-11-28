// The in-app interview asks (2026-11-25). Two flows, two dark flags:
//
//   leastReadyAsk      "Which part of the real interview do you feel least
//                      ready for?" — feedback kind `least_ready`, triggers
//                      `mock_results` (a mock's results screen, first full
//                      sitting) and `interview_tab` (an interview person
//                      with 3+ solves who has never finished a mock).
//                      Once per browser across both (FBP_LEAST_READY_KEY).
//
//   outcomeDebriefAsk  ONE outcome flow: PR #369's F1 ("Did your interview
//                      happen?" in the app) merged with PR #367's
//                      `outcome_debrief`. Orchestrator decision 2026-11-25:
//                      the outcome is asked inside the app, no email.
//                        1. Who: a person whose prepTarget date passed 1–14
//                           days ago (trigger `date_passed`), or who declared
//                           interview / job_ready 21+ days ago and holds no
//                           future date (trigger `return_21d`). Never a
//                           hired person. Once per 30 days.
//                        2. Where: one inline card on the Coach and on the
//                           Interview tab (`outcome_ask_shown {surface,
//                           trigger}` — the denominator F1 lacked).
//                        3. The answer is the existing `interview_outcome`,
//                           `source: 'in_app'`; "Not yet" is `moved`.
//                        4. passed → the existing offer ask (unchanged).
//                           failed → "What do you wish you had practised
//                           more?" (feedback kind `outcome_debrief`), in the
//                           same card. moved → nothing; the Interview tab
//                           already asks for the next date.
//                      The `?outcome=failed` door (the unscheduled email's
//                      link) gets the same follow-up, trigger `outcome_link`.
//
// Plans: docs/plans/interview-prep-feedback-2026-11-25.md (#367),
// docs/plans/first-90-days-2026-11-25.md §F1 (#369). Metrics:
// `interview_prep_voice`, `outcome_ask_answer` (docs/agent/metrics.md).
//
// Pure: no React, no storage, no clock of its own. Fails closed.

import { commonGate, sessionHasRoom } from './feedback-prompts.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const LEAST_READY_TRIGGERS = Object.freeze(['mock_results', 'interview_tab']);
export const LEAST_READY_TAB_MIN_SOLVES = 3;

export const OUTCOME_ASK_KEY = 'sqlquest_outcome_ask_v1';   // { shownAt, answeredAt } ISO
export const OUTCOME_ASK_SURFACES = Object.freeze(['coach', 'interview_tab']);
export const OUTCOME_ASK_TRIGGERS = Object.freeze(['date_passed', 'return_21d']);
export const OUTCOME_VALUES = Object.freeze(['passed', 'failed', 'moved']);
export const OUTCOME_ASK_INTENTS = Object.freeze(['interview', 'job_ready']);
export const DATE_PASSED_MAX_DAYS = 14;
export const RETURN_DAYS = 21;
export const OUTCOME_ASK_REPEAT_DAYS = 30;
export const DEBRIEF_TRIGGERS = Object.freeze(['outcome_coach', 'outcome_tab', 'outcome_link']);

// Days from a 'YYYY-MM-DD' date to `now`, in the UTC frame interview-prep's
// daysUntil uses (positive = the date is in the past). null on garbage.
export function daysSinceDate(isoDate, now) {
  if (typeof isoDate !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m || !Number.isFinite(now)) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const back = new Date(t);
  if (back.getUTCMonth() !== Number(m[2]) - 1 || back.getUTCDate() !== Number(m[3])) return null;
  const nd = new Date(now);
  const today = Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth(), nd.getUTCDate());
  return Math.round((today - t) / DAY_MS);
}

const msOf = (iso) => {
  if (typeof iso !== 'string' || !iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
};

// ── least_ready ────────────────────────────────────────────────────────────

/**
 * May the least_ready card show? The common gate (flag, one ask a session,
 * never in a timed mock, 1+ solve) plus, per trigger:
 *   mock_results  never in retry mode (a first full sitting only);
 *   interview_tab an interview person, no finished mock, 3+ solves, and no
 *                 other ask on the tab (the outcome card, the date ask).
 * `doneAt` is FBP_LEAST_READY_KEY: answered or skipped once, never again.
 */
export function canShowLeastReady({
  flagOn, trigger, sessionRec, inTimedMock, solvedCount, doneAt = null,
  retry = false, interviewPerson = false, completedMocks = 0, otherAskOnTab = false,
}) {
  if (!LEAST_READY_TRIGGERS.includes(trigger)) return false;
  if (!commonGate({ kind: 'least_ready', flagOn, sessionRec, inTimedMock, solvedCount })) return false;
  if (doneAt) return false;
  if (trigger === 'mock_results') return retry !== true;
  if (interviewPerson !== true) return false;
  if (!(Number(completedMocks) === 0)) return false;
  if (!(solvedCount >= LEAST_READY_TAB_MIN_SOLVES)) return false;
  if (otherAskOnTab) return false;
  return true;
}

// The row's context for least_ready: what the plan lists, nothing else.
export function leastReadyExtra({ results = null, company = null, daysOut = null } = {}) {
  const r = results && typeof results === 'object' ? results : {};
  return {
    interviewId: typeof r.interviewId === 'string' ? r.interviewId : null,
    passed: typeof r.passed === 'boolean' ? r.passed : null,
    percentage: Number.isFinite(r.percentage) ? r.percentage : null,
    company: typeof company === 'string' && company.trim() ? company.trim() : null,
    daysOut: Number.isFinite(daysOut) ? daysOut : null,
  };
}

// ── the outcome ask (F1 + outcome_debrief) ──────────────────────────────────

/**
 * Why this person is asked "Did your interview happen?", or null.
 *   date_passed  prepTarget.date fell 1–14 days ago (the email's window).
 *   return_21d   intent interview / job_ready declared 21+ days ago, no date
 *                still ahead, and no outcome recorded since the intent.
 * A date in the future always wins: the interview has not happened yet.
 */
export function outcomeAskTrigger({ prepDate = null, prepOutcomeAt = null, intent = null, intentAt = null, now }) {
  if (!Number.isFinite(now)) return null;
  const since = daysSinceDate(prepDate, now);
  if (since !== null) {
    if (since < 1) return null;                         // today or ahead
    if (since <= DATE_PASSED_MAX_DAYS) return 'date_passed';
  }
  if (!OUTCOME_ASK_INTENTS.includes(intent)) return null;
  const at = msOf(intentAt);
  if (at === null || now - at < RETURN_DAYS * DAY_MS) return null;
  const answered = msOf(prepOutcomeAt);
  if (answered !== null && answered >= at) return null;
  return 'return_21d';
}

/**
 * May the outcome card show now? Flag on, a trigger, not hired, not in a
 * timed mock, a session with room (it is the session's one ask), and not
 * shown in the last 30 days (`lastShownAt` from OUTCOME_ASK_KEY).
 */
export function canShowOutcomeAsk({ flagOn, trigger, hired = false, inTimedMock = false, sessionRec, lastShownAt = null, now }) {
  if (flagOn !== true) return false;
  if (!OUTCOME_ASK_TRIGGERS.includes(trigger)) return false;
  if (hired) return false;
  if (inTimedMock) return false;
  if (!sessionHasRoom(sessionRec)) return false;
  const last = msOf(lastShownAt);
  if (last !== null && Number.isFinite(now) && now - last < OUTCOME_ASK_REPEAT_DAYS * DAY_MS) return false;
  return true;
}

/** The `interview_outcome` payload for an in-app answer. No date, ever. */
export function outcomeAnswerEvent({ outcome, surface, trigger, company = null, prepDate = null, now }) {
  if (!OUTCOME_VALUES.includes(outcome)) return null;
  const since = daysSinceDate(prepDate, now);
  return {
    outcome,
    source: 'in_app',
    surface: OUTCOME_ASK_SURFACES.includes(surface) ? surface : null,
    trigger: OUTCOME_ASK_TRIGGERS.includes(trigger) ? trigger : null,
    company: typeof company === 'string' && company.trim() ? company.trim() : null,
    daysSince: since,
  };
}

/**
 * What follows an answer, in the one flow:
 *   passed → 'offer'   (the existing offer ask; unchanged, once per browser)
 *   failed → 'debrief' (only with the flag; never stacked on the offer ask)
 *   moved  → 'none'    (the Interview tab asks for the next date already)
 */
export function afterOutcome({ outcome, debriefOn = false, hired = false, offerAsked = false }) {
  if (outcome === 'passed') return (!hired && !offerAsked) ? 'offer' : 'none';
  if (outcome === 'failed') return debriefOn === true ? 'debrief' : 'none';
  return 'none';
}

/**
 * May the debrief question show? Through the feedback common gate (flag,
 * never in a timed mock, no solve needed) — except that when it CONTINUES
 * the in-app outcome card (`continuesAsk`), that card already spent this
 * session's one ask, and the follow-up is part of the same ask, not a second.
 */
export function canShowDebrief({ flagOn, trigger, sessionRec, inTimedMock, continuesAsk = false }) {
  if (!DEBRIEF_TRIGGERS.includes(trigger)) return false;
  if (flagOn !== true || inTimedMock) return false;
  if (continuesAsk) return trigger !== 'outcome_link';
  return commonGate({ kind: 'outcome_debrief', flagOn, sessionRec, inTimedMock, solvedCount: 0 });
}

export function debriefTriggerFor(surface) {
  if (surface === 'coach') return 'outcome_coach';
  if (surface === 'interview_tab') return 'outcome_tab';
  return null;
}
