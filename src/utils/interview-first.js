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
