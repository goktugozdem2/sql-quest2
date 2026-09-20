// Who gets the Interview tab in the primary nav.
//
// The Interview Prep surface had no navigation entry from 2026-05-19 to
// 2026-09-13: `showLegacyPrimaryNav` was hard-coded false and the tab was
// reachable only through `?interview=<id>` deep links and the onboarding
// `goal === 'interview'` branch. Lifetime, 22 accounts carried any interview
// history against 1,179 people who had viewed the Coach
// (docs/designs/hiring-readiness-module.md). This is the handle on that door.
//
// Two reads must stay clean, so two rules are structural, not tunable:
//   1. (REMOVED 2026-09-20, founder QA round 7.) The tab used to require one
//      solve first, to keep the zero-solve stretch clean for the 105-opener
//      read (window closed 2026-09-20 13:42Z) and the cold-start read
//      (2026-09-29). Measured cost: a person arriving from a company page
//      for the Capital One mock saw a challenge list and NO interview
//      surface at all — no mock, no Pro, no price — until they solved
//      something. That is a conversion floor of zero for the arrivals the
//      whole interview-first frame is built on. The tab is a surface, not an
//      ask: the mocks on it are locked cards, and the price modal still only
//      opens on a click. `interview_tab_viewed.reason` carries 'open' for a
//      person with no hiring signal, so the 09-29 read can split the
//      population and see exactly who the change added.
//   2. Everyone gets it while the flag is on. The reason still records what
//      brought them: declared intent interview / job_ready, an existing
//      interview history, the interview-prep Coach goal, arrival on a
//      company page — or 'open' for nobody-in-particular.
//
// Gated by FEATURE_FLAGS.features.intentRouting at the call site.
export const HIRING_INTENTS = new Set(['interview', 'job_ready']);
export const INTERVIEW_GOAL_ID = 'interview-prep';

const isCompanyArrival = (arrivalSrc) =>
  typeof arrivalSrc === 'string' && arrivalSrc.startsWith('company:');

export function shouldShowInterviewNav({
  flagOn = false,
  solvedCount = 0,
  intent = null,
  hasInterviewHistory = false,
  goalId = null,
  arrivalSrc = null,
} = {}) {
  if (!flagOn) return false;
  return true;
}

// Why the tab is showing — one word, carried on interview_tab_viewed so the
// read can split the population. Order is the strength of the signal.
export function interviewNavReason({
  intent = null,
  hasInterviewHistory = false,
  goalId = null,
  arrivalSrc = null,
} = {}) {
  if (hasInterviewHistory) return 'history';
  if (intent && HIRING_INTENTS.has(intent)) return 'intent';
  if (goalId === INTERVIEW_GOAL_ID) return 'goal';
  if (isCompanyArrival(arrivalSrc)) return 'company';
  return null;
}

/**
 * The label for someone with no hiring signal at all, used ONLY on
 * `interview_tab_viewed` so the 09-29 read can see who the open tab added.
 * It is not a hiring signal: `interviewNavReason` still returns null for
 * them, and `isInterviewPerson` (interview-first.js) still says no — the
 * interview-first surfaces are for people who showed us something.
 */
export const NAV_REASON_OPEN = 'open';
export const navReasonForEvent = (inputs) => interviewNavReason(inputs) || NAV_REASON_OPEN;
