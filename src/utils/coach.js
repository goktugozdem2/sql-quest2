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

import { CANONICAL_SKILLS, SKILL_TO_RADAR, mapTopicToSkill } from './skill-calc.js';
import { unsolvedFreePreviews } from './challenge-order.js';

const DIFFICULTY_ORDER = { Easy: 1, Medium: 2, Hard: 3 };

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
