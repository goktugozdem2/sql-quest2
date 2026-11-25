// "I use SQL at work" — the `at_work` intent answer (Moving up U2,
// 2026-11-25, docs/plans/moving-up-current-stack-2026-11-25.md §4 U2;
// orchestrator decision 6 of 2026-11-25, PR #372).
//
// We do not know who among our people already works with SQL, because no
// question asks it: the intent answers are interview / job_ready / learning /
// exploring, and the intake's role field is on 12 rows. Every later step of
// the Moving-up plan (a "Moving up" Coach goal, U3) depends on that number,
// so U2 only asks. Behind `intentAtWork` the existing intent questions get a
// fifth answer, "I use SQL at work and want to move up", stored as the intent
// value `at_work` through the one writer, setUserIntent, like the others.
//
// What it is not:
//   - not a hiring intent: HIRING_INTENTS (interview-nav.js) is unchanged, so
//     no Interview tab and no interview-first surfaces for it;
//   - not routed: applyIntentRouting acts on interview / job_ready only, so
//     `at_work` routes exactly like `learning` until U3 exists;
//   - not a new screen: the answer is added to the questions that exist (the
//     post-solve ask, and the intake / returning-ask goal choices).
//
// This module is the pure half of the post-solve ask: the choices it shows
// and what `intent_captured` carries. The intake side lives in
// onboarding-intake.js (INTAKE_AT_WORK_GOAL). Metric: `at_work_share`
// (docs/agent/metrics.md). Guards: tests/intent-at-work.test.js.

export const INTENT_AT_WORK_FLAG = 'intentAtWork';
export const AT_WORK_INTENT = 'at_work';
export const AT_WORK_LABEL = 'I use SQL at work and want to move up';

// The post-solve ask's three answers as they were before this change, in
// order — [intent, emoji, label]. "Just exploring" is the ask's own link
// under the list and stays where it is.
export const INTENT_ASK_CHOICES = [
  ['interview', '🎯', "I'm preparing for an interview at a specific company"],
  ['job_ready', '💼', 'Getting job-ready or switching careers'],
  ['learning', '📚', 'Learning SQL for my job or school'],
];
export const AT_WORK_ASK_CHOICE = [AT_WORK_INTENT, '📈', AT_WORK_LABEL];

/** The ask's choices: today's three, plus `at_work` last when the flag is on. */
export function intentAskChoices({ atWork = false } = {}) {
  return atWork ? [...INTENT_ASK_CHOICES, AT_WORK_ASK_CHOICE] : INTENT_ASK_CHOICES;
}

/**
 * What `intent_captured` carries from the post-solve ask. Flag off: exactly
 * today's `{ intent, source }`. Flag on: `atWorkOffered: true` as well, so a
 * read can keep to answers given while the fifth answer was on screen
 * (`at_work_share`'s denominator), whatever the window says.
 */
export function intentCapturedPayload(intent, source, { atWork = false } = {}) {
  return atWork ? { intent, source, atWorkOffered: true } : { intent, source };
}
