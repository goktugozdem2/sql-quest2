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
//   1. Never before the first solve. `first_contact_activation` (the 105
//      opener) and `cold_start_first_solve` (reads 2026-09-29) both live in
//      the zero-solve stretch; a tab that only exists after a solve cannot
//      touch either.
//   2. Only for people who said, or showed, that hiring is why they are here:
//      declared intent interview / job_ready, an existing interview history,
//      the interview-prep Coach goal, or arrival on a company page. Everyone
//      else keeps the two-tab nav. The 2026-11-24 paywall claim wants fewer
//      asks to people who came to learn, and 7 of the 8 mocks are Pro-locked.
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
  if (!(Number(solvedCount) >= 1)) return false;
  return interviewNavReason({ intent, hasInterviewHistory, goalId, arrivalSrc }) !== null;
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
