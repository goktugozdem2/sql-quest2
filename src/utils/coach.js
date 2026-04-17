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

const DIFFICULTY_ORDER = { Easy: 1, Medium: 2, Hard: 3 };

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

  // --- Walk the curriculum ---
  let completedCount = 0;
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

    return {
      step,
      reason: buildReason(step, skillLevels),
      progressPct: pctFromCounts(completedCount, goal.curriculum.length),
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
        const hits = wantedSkill ? topics.some(t => t === wantedSkill) : true;
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

    case 'retrieval_check': {
      const srcMs = lessonCompletedAtMs(step.sourceLessonId, aiLessonCompletions, completedAiLessons);
      if (srcMs === null) return false; // lesson never completed
      // If we don't know the lesson's completion timestamp (legacy), we can't
      // compute "days since" — treat as incomplete rather than falsely passing.
      if (srcMs === 0) return false;
      const minDays = step.minDaysSince != null ? step.minDaysSince : 1;
      const earliestRetrievalMs = srcMs + minDays * 24 * 60 * 60 * 1000;
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
          return topics.some(t => t === step.skill);
        }
        return true;
      });
    }

    default:
      return false;
  }
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
