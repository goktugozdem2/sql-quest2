// SQL Quest — Coach progress engine (Phase 2)
//
// Deterministic next-step computation. Given a user's coachState and their
// activity history, figures out what to surface next. No AI orchestration —
// the curriculum in src/data/goals.js is the source of truth. The engine
// walks it, skips completed + skipIf-matched steps, and returns the first
// actionable step.
//
// Spec: docs/superpowers/specs/2026-04-16-ai-tutor-coach-design.md
//
// Phase 1 step types: lesson, challenge, drill.
// Phase 2 step types: + mastery_check, retrieval_check.
// Phase 3 step types: + placement_check (goal-start cold calibration).
//
// Completion detection:
//   - lesson:           aiLessonCompletions[lessonId] exists OR (legacy)
//                       completedAiLessons Set contains the numeric lessonId.
//   - challenge:        challengeAttempts has a successful entry for
//                       challengeId AND the attempt timestamp is after
//                       coachState.startedAt.
//   - drill:            stepsCompleted contains the step id OR a
//                       completedDrills entry matches skill + completedAt
//                       after coachState.startedAt.
//   - mastery_check:    user has ≥ minSolves successful post-start challenge
//                       attempts that credit `skill` AND difficulty ≥ minDifficulty
//                       (Easy < Medium < Hard). Each challengeId counted once.
//   - retrieval_check:  the source lesson (sourceLessonId) was completed at
//                       least minDaysSince days ago AND, since that lesson
//                       completion, a successful challenge attempt exists on
//                       the named skill (or, if challengeId is set, on that
//                       specific challenge).
//   - placement_check:  user has attempted (success or fail) at least
//                       minAnswered of the listed challengeIds since the
//                       goal started. Injected at position 0 by
//                       computeNextStep when the user is cold and hasn't
//                       already skipped it — authors don't author it.
//                       Success doesn't matter; we want skill signal, not
//                       gatekeeping.
//
// Hard-preview offer (2026-09-06, docs/plans/paywall-surfaces-plan.md D-3):
//   Not a curriculum step type — a synthetic `challenge` step the engine MAY
//   substitute for the curriculum's next step, once per session, for a
//   non-Pro user whose radar shows an ADVANCED skill ≥ 65 and who still has
//   an unsolved free Hard preview. See pickHardPreviewStep below.
//
// Mock-interview offer (2026-09-08): step type `mock_interview`. Also
//   synthetic — never authored in goals.js — and OFF unless the caller opts
//   in. See pickMockInterviewStep below for the five conditions and why each
//   one is there.

import { CANONICAL_SKILLS, SKILL_TO_RADAR, mapTopicToSkill } from './skill-calc.js';
import { unsolvedFreePreviews } from './challenge-order.js';

const DIFFICULTY_ORDER = { Easy: 1, Medium: 2, Hard: 3 };
const DAY_MS = 24 * 60 * 60 * 1000;

// Attempts carry RAW challenge tags in `topics` (challenge.skills + category,
// e.g. "LEFT JOIN", "ROW_NUMBER", "Window Functions + CTE"), while goals name
// skills in the canonical radar vocabulary ("Joins", "Window Functions").
// Resolve before comparing so every step type speaks one language — comparing
// raw tags against canonical names is what silently broke mastery_check on
// "JOIN Tables" and retrieval_check on "CASE Statements": no challenge has ever
// carried those literal tags, so those steps could never complete.
//
// Raw equality stays as a fallback so a goal that names a literal tag (or an
// in-flight user mid-step on a pre-migration goal) keeps working.
function topicMatchesSkill(topic, wantedSkill) {
  if (!topic || !wantedSkill) return false;
  if (topic === wantedSkill) return true;
  return resolveToCanonical(topic) === wantedSkill;
}

function resolveToCanonical(raw) {
  if (!raw) return null;
  return SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw)] || null;
}

// ---------------------------------------------------------------------------
// Hard-preview offer (2026-09-06, paywall-surfaces plan D-3)
//
// The 2026-08-21 lock read: 15 of 16 people who hit the Hard wall had every
// free preview untouched. The Coach is one of three surfaces that now lead
// people to them. The rule is deliberately NOT skill-matched: skill-calc's
// foundational floor pins Querying Basics to MAX(advanced skills) for every
// user, so "strongest skill" is Querying Basics for everyone and would have
// fired the offer for a user who has never written a JOIN (caught in review).
// Only the ADVANCED canonical skills are a signal. The legacy pre-reshuffle
// keys for the floored pair are excluded by name too, so a stale skillLevels
// blob cannot sneak them back in.
//
// Purity: the once-per-session guard is `options.sessionPreviewOffered`,
// owned and passed in by app.jsx — this file never reads a clock or a store.
// ---------------------------------------------------------------------------

export const HARD_PREVIEW_MIN_ADVANCED = 65;
export const HARD_PREVIEW_STEP_ID = '__hard_preview';
export const HARD_PREVIEW_MARKER = 'hard_preview';
// The engine's reason string, English like every other reason this file
// produces. It is for non-display callers and tests; the Coach card resolves
// the DISPLAY text through i18n_t('paywall', 'coachReason') keyed off
// HARD_PREVIEW_MARKER, so app.jsx must not import this constant (2026-09-06).
export const HARD_PREVIEW_REASON = "You're ready for a hard one — this one's free.";

const FLOORED_SKILLS = new Set(['Querying Basics', 'Filter & Sort', 'SELECT Basics']);
export const HARD_PREVIEW_ADVANCED_SKILLS = CANONICAL_SKILLS.filter(s => !FLOORED_SKILLS.has(s));

/** True when any ADVANCED canonical skill (never the floored pair) is ≥ threshold. */
export function hasAdvancedSkillAtOrAbove(skillLevels = {}, threshold = HARD_PREVIEW_MIN_ADVANCED) {
  return HARD_PREVIEW_ADVANCED_SKILLS.some(s => (Number(skillLevels?.[s]) || 0) >= threshold);
}

// solvedChallenges arrives as the app's Set or a stored array; successful
// attempts are unioned in so a preview the user has demonstrably beaten is
// never offered again even if the solved set lagged (cheap, and the two only
// disagree on stale blobs).
function solvedIdSet(solvedChallenges, challengeAttempts) {
  const out = new Set();
  if (solvedChallenges && typeof solvedChallenges.forEach === 'function') {
    solvedChallenges.forEach(id => out.add(id));
  }
  for (const a of challengeAttempts || []) {
    if (a && a.success && a.challengeId != null) out.add(a.challengeId);
  }
  return out;
}

/**
 * The synthetic step, or null when the rule does not apply.
 *
 * Options read: isPro, sessionPreviewOffered, skillLevels (canonical names),
 * previewChallenges (the bank, for THIS rule only — see below),
 * solvedChallenges (Set | array of ids), curriculumOrder (Map from
 * buildCurriculumOrder — without it the pick falls back to difficulty/id
 * order, never a crash).
 *
 * `previewChallenges`, not `allChallenges` (2026-09-06, review): the engine's
 * `options.allChallenges` also feeds mastery_check, where it resolves a
 * difficulty for attempt rows that never recorded one (pre-stamp rows fell
 * back to Easy). app.jsx had never passed it before this feature, so wiring
 * the bank in under that name would have let legacy attempts start counting
 * toward Medium/Hard mastery gates on deploy — a Coach-progress change the
 * plan never asked for. The preview rule reads its own key; `allChallenges`
 * is accepted as a fallback for callers that already plumb the bank.
 *
 * Step shape: { id: '__hard_preview', type: 'challenge', challengeId, reason: 'hard_preview' }
 * — `type: 'challenge'` so the existing Start handler opens it unchanged;
 * `reason` (=== HARD_PREVIEW_MARKER) is how the UI tells it apart from a
 * curriculum challenge, stamps openedFrom='preview_coach', and swaps the copy.
 */
export function pickHardPreviewStep(options = {}, userData = {}) {
  if (!options || options.isPro) return null;                 // previews mean nothing when everything is open
  if (options.sessionPreviewOffered) return null;             // once per session, app.jsx owns the flag
  if (!hasAdvancedSkillAtOrAbove(options.skillLevels)) return null;
  const order = options.curriculumOrder && typeof options.curriculumOrder.has === 'function'
    ? options.curriculumOrder
    : new Map();
  const solved = solvedIdSet(options.solvedChallenges, userData?.challengeAttempts);
  const bank = options.previewChallenges || options.allChallenges || [];
  const first = unsolvedFreePreviews(bank, solved, order)[0];
  if (!first) return null;
  return { id: HARD_PREVIEW_STEP_ID, type: 'challenge', challengeId: first.id, reason: HARD_PREVIEW_MARKER };
}

// ---------------------------------------------------------------------------
// Mock-interview offer (2026-09-08) — step type `mock_interview`
//
// WHY IT IS HERE AND NOT IN A CURRICULUM
//
// The Interview Prep tab has no navigation entry (`showLegacyPrimaryNav` is
// hard-coded false in src/app.jsx since the 2026-05-19 nav simplification), so
// the eight mocks were behind a door with no handle: 22 accounts lifetime carry
// any interview history against 1,179 people who have viewed the Coach. The
// Coach is where the traffic and the intent already are. And `interview-prep`
// in src/data/goals.js — 28 steps of Hard window/join/CTE work — ends on a
// retrieval_check and never reaches a rehearsal at all.
//
// It is synthetic rather than an authored step for the same reason the
// hard-preview offer is: whether to offer it depends on runtime state a static
// curriculum cannot express (a feature flag, a self-declared target company, a
// date, when the mock was last sat). Authoring it into goals.js would also
// break graduation — a step nobody can complete without paying sits forever in
// front of the exit criteria.
//
// THE FIVE CONDITIONS, and why each is there:
//
//   1. `options.mockOfferEnabled === true` — FEATURE_FLAGS.features
//      .interviewCountdown, read by app.jsx and passed in. Default-OFF (`===
//      true`): an unset option is not consent. This is also the inertness
//      switch — for every caller that does not pass it, this function returns
//      null on its first line and `computeNextStep` is byte-identical to what
//      it was. tests/coach.test.js proves that against a matrix of states.
//
//   2. `options.isPro === true` — see THE FREE USER, below.
//
//   3. On the `interview-prep` goal OR a named prep target. Both arms are the
//      user telling us they are preparing for an interview; nothing here
//      infers it from behaviour.
//
//   4. The exit criteria are WITHIN REACH — see MOCK_OFFER_REACH.
//
//   5. The mock has not been sat inside MOCK_OFFER_COOLDOWN_DAYS.
//
// THE FREE USER (condition 2). Every mock except `sql-fundamentals-free` is
// `isFree: false`. The Coach's next-step card is not a list — it is the single
// thing the Coach says to do next — so making it a Pro wall would not sit
// beside free work the way the prep card's plan rows do, it would DISPLACE a
// real curriculum step the user could actually do. That is a dead end with a
// yellow button on it, and it would add a second `content_lock_reached` source
// on the surface the open paywall-surfaces claim is reading until 2026-09-20.
// It would also contradict a decision src/utils/interview-prep.js already made
// one level down: `companyReadiness` reallocates the mock's weight rather than
// scoring an untaken Pro mock as zero, explicitly so the readiness number is
// not a paywall lever. The offer follows the number.
//
// Free users keep every path to the mock they have today: the prep card's plan
// places it on the last planned day, and starting it there goes through
// `startInterview`, which owns the Pro gate and the lock event. One gate.
//
// Purity: no clock of its own — `options.now` with a Date.now() fallback, the
// same shape the retrieval_check spacing already uses. The once-per-session
// guard is `options.sessionMockOffered`, owned by app.jsx.
// ---------------------------------------------------------------------------

export const MOCK_OFFER_STEP_ID = '__mock_interview';
export const MOCK_OFFER_STEP_TYPE = 'mock_interview';
/** The goal whose curriculum is interview preparation. Arm one of condition 3. */
export const MOCK_OFFER_GOAL_ID = 'interview-prep';

/**
 * "Within reach" of the exit criteria, as a fraction of them.
 *
 * 0.8. Two things fix it:
 *
 *   It MUST be strictly below 1. At 1 the user has met the exit criteria, and
 *   `computeNextStep` returns `graduated` before it ever gets here — a reach of
 *   1 would make this rule unreachable code. `exitCriteriaWithinReach` refuses
 *   any reach ≥ 1 rather than quietly computing a rule that can never fire.
 *
 *   It must be high enough that the rehearsal lands on someone who can hold a
 *   pen. Against `interview-prep`'s criteria (Window Functions 70, Joins 65,
 *   Subqueries & CTEs 60, Medium 3, Hard 8) 0.8 asks for Window Functions 56,
 *   Joins 52, Subqueries & CTEs 48, and — counts are rounded UP, never down —
 *   3 Medium and 7 Hard solves since the goal started. That is a person who
 *   has done real Hard work and has a fortnight of polish left, which is
 *   exactly when a timed sitting is worth 70 minutes. At 0.7 it would be 6
 *   Hard and a 49 radar, which is the middle of the path, not the end of it.
 */
export const MOCK_OFFER_REACH = 0.8;

/**
 * Days after a sitting before the same mock is offered again.
 *
 * 14. The mock is a FIXED question set (the Capital One one is 14 questions,
 * 8 multiple-choice + 6 written). Re-sitting it inside two weeks measures
 * recall of those 14 questions rather than readiness, and because
 * `companyReadiness` takes the BEST sitting, a fresh one can only move the
 * number up — so a short cooldown would inflate the score for the wrong
 * reason. 14 also sits inside `MAX_PLAN_DAYS = 21` (src/utils/interview-prep.js),
 * so a user with the longest plan the product will draw can be offered the
 * rehearsal at most twice before the date, and a user inside two weeks of
 * their interview gets it exactly once.
 *
 * A cooldown is not a limit (CLAUDE.md, skill-decay). It does not need to be
 * one here: the offer is also capped at once per session by
 * `sessionMockOffered`, and it disappears the moment the criteria stop being
 * within reach — which they do the instant the user graduates.
 */
export const MOCK_OFFER_COOLDOWN_DAYS = 14;

// English, like every other reason this file produces, for non-display callers
// and tests. The Coach card resolves the DISPLAY text through
// i18n_t('interviewPrep', 'coachMockReason') off the step TYPE, so app.jsx does
// not import this constant (same posture as HARD_PREVIEW_REASON).
export const MOCK_OFFER_REASON =
  "You're close to the bar this path sets. The mock is one timed sitting — do it now, while there is still time to work on what it shows you.";

/** Every threshold in `exitCriteria`, multiplied by `reach`. Counts round UP. */
export function scaleExitCriteria(exitCriteria, reach = MOCK_OFFER_REACH) {
  if (!exitCriteria || typeof exitCriteria !== 'object') return null;
  const out = {};
  if (exitCriteria.skillThresholds && typeof exitCriteria.skillThresholds === 'object') {
    out.skillThresholds = {};
    for (const [skill, v] of Object.entries(exitCriteria.skillThresholds)) {
      out.skillThresholds[skill] = (Number(v) || 0) * reach;
    }
  }
  if (exitCriteria.challengesSolved && typeof exitCriteria.challengesSolved === 'object') {
    out.challengesSolved = {};
    for (const [diff, v] of Object.entries(exitCriteria.challengesSolved)) {
      // Ceil, not round: a scaled bar is a softer bar already, and rounding a
      // count down softens it twice (8 Hard → 6.4 → 6 is 75%, not 80%).
      out.challengesSolved[diff] = Math.ceil((Number(v) || 0) * reach);
    }
  }
  return out;
}

/**
 * Would this user graduate if every exit threshold were `reach` of itself?
 *
 * Deliberately the SAME predicate as graduation, run against scaled criteria,
 * so "within reach" can never drift away from what graduating means.
 */
export function exitCriteriaWithinReach({
  exitCriteria, skillLevels, challengeAttempts, startedAtMs, reach = MOCK_OFFER_REACH,
} = {}) {
  if (!exitCriteria) return false;
  if (!(exitCriteria.skillThresholds || exitCriteria.challengesSolved)) return false;
  // A reach of 1 or more asks "has this user graduated", which is a question
  // computeNextStep has already answered above. Fail closed rather than ship a
  // rule that can never fire.
  if (!(Number(reach) > 0) || Number(reach) >= 1) return false;
  return isGoalGraduated({
    exitCriteria: scaleExitCriteria(exitCriteria, Number(reach)),
    skillLevels: skillLevels || {},
    challengeAttempts: challengeAttempts || [],
    startedAtMs: startedAtMs || 0,
  });
}

/**
 * The synthetic mock step, or null when any of the five conditions fails.
 *
 * Options read: mockOfferEnabled, isPro, sessionMockOffered, mockTarget
 * (`{ company, mockId }` — the CALLER decides which mock; this file never
 * names one), prepTargetCompany, mockCriteria (the exit criteria to measure
 * reach against — falls back to the active goal's, see below), skillLevels,
 * lastMockAtMs, mockCooldownDays, now.
 *
 * `mockCriteria` exists because arm two of condition 3 lets a user with a
 * named target be on ANY goal. Measuring their reach against, say, SQL
 * Fundamentals' exit criteria (Querying Basics 50 × 0.8 = 40) would offer a
 * 70-minute interview rehearsal to a near-beginner. app.jsx always passes the
 * `interview-prep` goal's criteria, so the bar is one bar.
 *
 * Step shape: { id, type: 'mock_interview', interviewId, company }.
 */
export function pickMockInterviewStep(goal, userData = {}, options = {}) {
  if (!options || options.mockOfferEnabled !== true) return null;   // (1) the flag, default-OFF
  if (options.isPro !== true) return null;                          // (2) never a Pro wall as the one next step
  if (options.sessionMockOffered) return null;                      // once per session, app.jsx owns the flag

  const target = options.mockTarget;
  const mockId = (target && typeof target.mockId === 'string' && target.mockId.length > 0)
    ? target.mockId
    : null;
  if (!mockId) return null;                                         // nothing to offer

  // (3) they said so — the goal, or a named company. Never inferred.
  const onInterviewGoal = !!goal && goal.id === MOCK_OFFER_GOAL_ID;
  const named = typeof options.prepTargetCompany === 'string' ? options.prepTargetCompany.trim() : '';
  if (!onInterviewGoal && named.length === 0) return null;

  // (4) within reach of the interview bar
  const criteria = options.mockCriteria || goal?.exitCriteria || null;
  const coachState = userData?.coachState || {};
  const startedAtMs = coachState.startedAt ? new Date(coachState.startedAt).getTime() : 0;
  const withinReach = exitCriteriaWithinReach({
    exitCriteria: criteria,
    skillLevels: options.skillLevels || {},
    challengeAttempts: userData?.challengeAttempts || [],
    startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : 0,
    reach: options.mockReach != null ? options.mockReach : MOCK_OFFER_REACH,
  });
  if (!withinReach) return null;

  // (5) not sat recently
  const last = Number(options.lastMockAtMs);
  if (Number.isFinite(last) && last > 0) {
    const nowMs = Number.isFinite(options.now) ? options.now : Date.now();
    const days = options.mockCooldownDays != null ? Number(options.mockCooldownDays) : MOCK_OFFER_COOLDOWN_DAYS;
    if (nowMs - last < (Number.isFinite(days) ? days : MOCK_OFFER_COOLDOWN_DAYS) * DAY_MS) return null;
  }

  return {
    id: MOCK_OFFER_STEP_ID,
    type: MOCK_OFFER_STEP_TYPE,
    interviewId: mockId,
    company: (target && typeof target.company === 'string' && target.company) || null,
  };
}

export function computeNextStep(goal, userData = {}, options = {}) {
  if (!goal || !Array.isArray(goal.curriculum)) {
    return { step: null, reason: 'No goal selected.', progressPct: 0, graduated: false };
  }

  const coachState = userData.coachState || {};
  const stepsCompleted = new Set(coachState.stepsCompleted || []);
  const startedAtMs = coachState.startedAt ? new Date(coachState.startedAt).getTime() : 0;

  const skillLevels = options.skillLevels || {};
  const aiLessonCompletions = normalizeLessonCompletions(userData);
  const completedAiLessons = legacyLessonSet(userData);
  const challengeAttempts = userData.challengeAttempts || [];
  const completedDrills = userData.completedDrills || [];
  const allChallenges = options.allChallenges || [];

  const ctx = {
    aiLessonCompletions,
    completedAiLessons,
    challengeAttempts,
    completedDrills,
    allChallenges,
    startedAtMs,
    // retrieval_check needs these to tell "never learned it" apart from
    // "we told them to skip the lesson because their radar was already high".
    curriculum: goal.curriculum,
    skillLevels,
  };

  // --- Check graduation first ---
  const exitCriteria = goal.exitCriteria || {};
  if (isGoalGraduated({ exitCriteria, skillLevels, challengeAttempts, startedAtMs })) {
    return {
      step: null,
      reason: `You've reached the exit criteria for ${goal.name}!`,
      progressPct: 100,
      graduated: true,
    };
  }

  // --- Placement check injection ---
  // Cold users get a 5-question calibration quiz before the curriculum so
  // skipIf clauses have real radar data. Injected at position 0 unless the
  // user has opted to skip. Drops out once complete or skipped.
  const placement = coachState.placement;
  if (placement && !placement.skipped && !stepsCompleted.has('__placement')) {
    const placementStep = {
      id: '__placement',
      type: 'placement_check',
      challengeIds: placement.challengeIds || [],
      minAnswered: placement.minAnswered || 5,
      retakenAtMs: placement.retakenAt ? new Date(placement.retakenAt).getTime() : 0,
    };
    if (!isStepComplete(placementStep, ctx)) {
      return {
        step: placementStep,
        reason: `First: a ${placementStep.minAnswered}-question placement check to calibrate your radar. Takes ~10 minutes — we'll skip anything you're already strong on.`,
        progressPct: 0,
        graduated: false,
      };
    }
  }

  // --- Walk the curriculum ---
  let completedCount = 0;
  let nextStep = null;
  for (const step of goal.curriculum) {
    if (!step || !step.id) continue;

    // Explicitly completed via coachState.stepsCompleted (e.g., user clicked Start)
    if (stepsCompleted.has(step.id)) {
      completedCount++;
      continue;
    }

    // Activity-based completion detection
    if (isStepComplete(step, ctx)) {
      completedCount++;
      continue;
    }

    // skipIf: user's radar already shows mastery for this skill
    if (step.skipIf && matchesSkipIf(step.skipIf, skillLevels)) {
      completedCount++;
      continue;
    }

    nextStep = step;
    break;
  }
  const progressPct = nextStep ? pctFromCounts(completedCount, goal.curriculum.length) : 100;

  // --- Hard-preview offer (2026-09-06, paywall-surfaces D-3) ---
  // May stand in for the curriculum's next step (or for "curriculum
  // complete"), but never for a retrieval_check — spacing is the point of
  // that step and a pending one keeps priority, due or not (conservative
  // reading of D-3). placement_check already returned above.
  if (!nextStep || nextStep.type !== 'retrieval_check') {
    const previewStep = pickHardPreviewStep(options, userData);
    if (previewStep) {
      return { step: previewStep, reason: HARD_PREVIEW_REASON, progressPct, graduated: false };
    }

    // --- Mock-interview offer (2026-09-08) ---
    // AFTER the hard preview on purpose, and the two can never both fire
    // anyway: the preview rule is non-Pro only and this one is Pro only. The
    // ordering is what keeps that true if either gate is ever relaxed — the
    // free Hard preview is the thing to put in front of a free user, and the
    // open paywall-surfaces claim is reading that surface until 2026-09-20.
    // Same retrieval_check exemption, same reason: spacing is the point of
    // that step, and a pending one keeps priority.
    const mockStep = pickMockInterviewStep(goal, userData, options);
    if (mockStep) {
      return { step: mockStep, reason: MOCK_OFFER_REASON, progressPct, graduated: false };
    }
  }

  if (nextStep) {
    return {
      step: nextStep,
      reason: buildReason(nextStep, skillLevels),
      progressPct,
      graduated: false,
    };
  }

  return {
    step: null,
    reason: 'Curriculum complete. Keep practicing to hit skill targets.',
    progressPct: 100,
    graduated: false,
  };
}

// --- Helpers ---

export function isGoalGraduated({ exitCriteria, skillLevels, challengeAttempts, startedAtMs }) {
  if (!exitCriteria) return false;
  const hasAny = exitCriteria.skillThresholds || exitCriteria.challengesSolved;
  if (!hasAny) return false;

  if (exitCriteria.skillThresholds) {
    for (const [skill, threshold] of Object.entries(exitCriteria.skillThresholds)) {
      const score = skillLevels[skill] ?? 0;
      if (score < threshold) return false;
    }
  }

  if (exitCriteria.challengesSolved) {
    const solvedSinceStart = (challengeAttempts || []).filter(a => {
      if (!a || !a.success) return false;
      const ts = attemptTsMs(a);
      return ts >= startedAtMs;
    });
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    const seen = new Set();
    for (const a of solvedSinceStart) {
      if (seen.has(a.challengeId)) continue;
      seen.add(a.challengeId);
      if (a.difficulty && counts[a.difficulty] != null) counts[a.difficulty]++;
    }
    for (const [diff, needed] of Object.entries(exitCriteria.challengesSolved)) {
      if ((counts[diff] || 0) < needed) return false;
    }
  }

  return true;
}

export function isStepComplete(step, ctx = {}) {
  if (!step) return false;
  const {
    aiLessonCompletions = {},
    completedAiLessons = new Set(),
    challengeAttempts = [],
    completedDrills = [],
    allChallenges = [],
    startedAtMs = 0,
    curriculum = [],
    skillLevels = {},
  } = ctx;

  switch (step.type) {
    case 'lesson':
      return lessonCompletedAtMs(step.lessonId, aiLessonCompletions, completedAiLessons) !== null;

    case 'challenge':
      return (challengeAttempts || []).some(a => {
        if (!a || !a.success) return false;
        if (a.challengeId !== step.challengeId) return false;
        return attemptTsMs(a) >= startedAtMs;
      });

    case 'drill':
      return (completedDrills || []).some(d => {
        if (!d || d.skill !== step.skill) return false;
        const ts = d.completedAt ? new Date(d.completedAt).getTime() : 0;
        return ts >= startedAtMs;
      });

    case 'mastery_check': {
      const minSolves = step.minSolves || 3;
      const minDiff = DIFFICULTY_ORDER[step.minDifficulty] || 1;
      const wantedSkill = step.skill;
      const seen = new Set();
      let solved = 0;
      for (const a of challengeAttempts || []) {
        if (!a || !a.success) continue;
        if (attemptTsMs(a) < startedAtMs) continue;
        if (seen.has(a.challengeId)) continue;
        const topics = Array.isArray(a.topics) && a.topics.length
          ? a.topics
          : (a.topic ? [a.topic] : []);
        const hits = wantedSkill ? topics.some(t => topicMatchesSkill(t, wantedSkill)) : true;
        if (!hits) continue;
        const diff = DIFFICULTY_ORDER[a.difficulty] || (() => {
          const ch = allChallenges.find(c => c && c.id === a.challengeId);
          return DIFFICULTY_ORDER[ch?.difficulty] || 1;
        })();
        if (diff < minDiff) continue;
        seen.add(a.challengeId);
        solved++;
        if (solved >= minSolves) return true;
      }
      return false;
    }

    case 'placement_check': {
      const wanted = Array.isArray(step.challengeIds) ? step.challengeIds : [];
      const need = step.minAnswered || wanted.length || 5;
      if (wanted.length === 0) return true; // empty set — treat as satisfied
      // If the user retook placement, only attempts after retakenAt count.
      // Lets us reset placement without nuking curriculum progress.
      const floorMs = Math.max(startedAtMs, step.retakenAtMs || 0);
      const seen = new Set();
      for (const a of challengeAttempts || []) {
        if (!a) continue;
        if (attemptTsMs(a) < floorMs) continue;
        if (!wanted.includes(a.challengeId)) continue;
        seen.add(a.challengeId);
        if (seen.size >= need) return true;
      }
      return false;
    }

    case 'retrieval_check': {
      const srcMs = lessonCompletedAtMs(step.sourceLessonId, aiLessonCompletions, completedAiLessons);
      let anchorMs = srcMs;
      if (srcMs === null) {
        // Lesson never completed. If the curriculum offered it behind a skipIf
        // the user's radar satisfies, we TOLD them to skip it — blocking them
        // on a retrieval check for that same lesson is a permanent dead end
        // (they'd be told "come back tomorrow" forever). Treat prior knowledge
        // as the learning event and anchor the spacing to the goal start.
        if (!sourceLessonSkippedByRadar(step.sourceLessonId, curriculum, skillLevels)) return false;
        anchorMs = startedAtMs;
      }
      // If we don't know the lesson's completion timestamp (legacy), we can't
      // compute "days since" — treat as incomplete rather than falsely passing.
      if (anchorMs === 0) return false;
      const minDays = step.minDaysSince != null ? step.minDaysSince : 1;
      const earliestRetrievalMs = anchorMs + minDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (now < earliestRetrievalMs) return false;

      return (challengeAttempts || []).some(a => {
        if (!a || !a.success) return false;
        const ts = attemptTsMs(a);
        if (ts < earliestRetrievalMs) return false;
        if (step.challengeId != null) return a.challengeId === step.challengeId;
        if (step.skill) {
          const topics = Array.isArray(a.topics) && a.topics.length
            ? a.topics
            : (a.topic ? [a.topic] : []);
          return topics.some(t => topicMatchesSkill(t, step.skill));
        }
        return true;
      });
    }

    default:
      return false;
  }
}

// True when the curriculum teaches `lessonId` only through a lesson step whose
// skipIf the user's radar already satisfies — i.e. the goal deliberately let
// them past it. Used so a retrieval_check on that lesson doesn't become a
// dead end for exactly the strong users the skipIf was written for.
function sourceLessonSkippedByRadar(lessonId, curriculum = [], skillLevels = {}) {
  if (lessonId == null) return false;
  const steps = (curriculum || []).filter(s => s && s.type === 'lesson' && s.lessonId === lessonId);
  if (steps.length === 0) return false;
  return steps.every(s => s.skipIf && matchesSkipIf(s.skipIf, skillLevels));
}

export function matchesSkipIf(skipIf, skillLevels = {}) {
  if (!skipIf || !skipIf.skill) return false;
  const score = skillLevels[skipIf.skill] ?? 0;
  if (skipIf.gte != null && score < skipIf.gte) return false;
  return true;
}

// --- Lesson-completion shim: support both new timestamped object and the
//     legacy Set<lessonId> form. Returns timestamp in ms, 0 if known-complete
//     but time unknown, or null if not complete.
function lessonCompletedAtMs(lessonId, completions, legacySet) {
  if (completions && lessonId != null) {
    const v = completions[lessonId];
    if (v !== undefined && v !== null) {
      const ms = typeof v === 'number' ? v : new Date(v).getTime();
      return Number.isFinite(ms) ? ms : 0;
    }
  }
  if (legacySet && legacySet.has && legacySet.has(lessonId)) return 0;
  return null;
}

function normalizeLessonCompletions(userData) {
  const raw = userData?.aiLessonCompletions;
  if (!raw) return {};
  // Already an object (preferred form)
  if (!Array.isArray(raw) && typeof raw === 'object') return raw;
  // Array of {lessonId, completedAt}
  if (Array.isArray(raw)) {
    const out = {};
    for (const r of raw) {
      if (!r || r.lessonId == null) continue;
      out[r.lessonId] = r.completedAt || null;
    }
    return out;
  }
  return {};
}

function legacyLessonSet(userData) {
  const raw = userData?.completedAiLessons;
  if (!raw) return new Set();
  return raw instanceof Set ? raw : new Set(raw || []);
}

function attemptTsMs(a) {
  if (!a) return 0;
  if (typeof a.timestamp === 'number') return a.timestamp;
  if (a.timestamp) return new Date(a.timestamp).getTime() || 0;
  if (a.date) return new Date(a.date).getTime() || 0;
  return 0;
}

function buildReason(step, skillLevels) {
  switch (step.type) {
    case 'lesson':
      return `Learn this concept first — it unlocks the next challenges.`;
    case 'challenge':
      return `Apply what you've learned on a real challenge.`;
    case 'drill': {
      const cur = skillLevels[step.skill];
      if (cur != null) {
        return `Drill ${step.skill} — your radar shows ${cur}/100.`;
      }
      return `Drill ${step.skill} with 5 focused challenges.`;
    }
    case 'mastery_check':
      return `Prove mastery of ${step.skill || 'this skill'} — solve ${step.minSolves || 3} fresh challenges${step.minDifficulty ? ` at ${step.minDifficulty}+` : ''}.`;
    case 'retrieval_check':
      return `Come back tomorrow and solve a challenge on this skill — retrieval beats re-reading.`;
    default:
      return 'Next step.';
  }
}

function pctFromCounts(done, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}
