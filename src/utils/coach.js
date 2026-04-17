// SQL Quest — Coach progress engine (Phase 1)
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
// Phase 2 will add: mastery_check, retrieval_check.
//
// Phase 1 completion detection:
//   - lesson:    completedAiLessons Set contains the numeric lessonId.
//   - challenge: challengeAttempts has a successful entry for challengeId,
//                AND the attempt timestamp is after coachState.startedAt.
//   - drill:     coachState.stepsCompleted contains the step id OR a
//                completedDrills entry matches skill + completedAt after
//                coachState.startedAt.
//
// The second OR branch on drill lets us mark it done from the Coach UI
// (phase 1 hack — clicking Start adds to stepsCompleted). Phase 2 will
// wire the proper drill-completion write path and drop the hack.

export function computeNextStep(goal, userData = {}, options = {}) {
  if (!goal || !Array.isArray(goal.curriculum)) {
    return { step: null, reason: 'No goal selected.', progressPct: 0, graduated: false };
  }

  const coachState = userData.coachState || {};
  const stepsCompleted = new Set(coachState.stepsCompleted || []);
  const startedAtMs = coachState.startedAt ? new Date(coachState.startedAt).getTime() : 0;

  const skillLevels = options.skillLevels || {};
  const completedAiLessons = userData.completedAiLessons instanceof Set
    ? userData.completedAiLessons
    : new Set(userData.completedAiLessons || []);
  const challengeAttempts = userData.challengeAttempts || [];
  const completedDrills = userData.completedDrills || [];

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
    if (isStepComplete(step, { completedAiLessons, challengeAttempts, completedDrills, startedAtMs })) {
      completedCount++;
      continue;
    }

    // skipIf: user's radar already shows mastery for this skill
    if (step.skipIf && matchesSkipIf(step.skipIf, skillLevels)) {
      completedCount++;
      continue;
    }

    // Found the next step. Build a human-readable reason string.
    return {
      step,
      reason: buildReason(step, skillLevels),
      progressPct: pctFromCounts(completedCount, goal.curriculum.length),
      graduated: false,
    };
  }

  // If we exhaust the curriculum but exit criteria aren't met, the user has
  // done everything prescribed. Graduation check at the top handles the
  // success case; if we're here, the curriculum was too short for the exit
  // criteria. Phase 1 just returns "finished curriculum, waiting on skills."
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
  // A goal without any criteria defined never auto-graduates — otherwise
  // every skipIf test would fall through to "graduated".
  const hasAny = exitCriteria.skillThresholds || exitCriteria.challengesSolved;
  if (!hasAny) return false;

  // Skill thresholds (all must be met)
  if (exitCriteria.skillThresholds) {
    for (const [skill, threshold] of Object.entries(exitCriteria.skillThresholds)) {
      const score = skillLevels[skill] ?? 0;
      if (score < threshold) return false;
    }
  }

  // Challenge-solve counts (post-start)
  if (exitCriteria.challengesSolved) {
    const solvedSinceStart = challengeAttempts.filter(a => {
      if (!a || !a.success) return false;
      const ts = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
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

export function isStepComplete(step, { completedAiLessons, challengeAttempts, completedDrills, startedAtMs }) {
  if (!step) return false;
  switch (step.type) {
    case 'lesson':
      return completedAiLessons.has(step.lessonId);
    case 'challenge':
      return (challengeAttempts || []).some(a => {
        if (!a || !a.success) return false;
        if (a.challengeId !== step.challengeId) return false;
        const ts = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
        return ts >= startedAtMs;
      });
    case 'drill':
      return (completedDrills || []).some(d => {
        if (!d || d.skill !== step.skill) return false;
        const ts = d.completedAt ? new Date(d.completedAt).getTime() : 0;
        return ts >= startedAtMs;
      });
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

function buildReason(step, skillLevels) {
  switch (step.type) {
    case 'lesson':
      return `Learn this concept first — it unlocks the next challenges.`;
    case 'challenge': {
      return `Apply what you've learned on a real challenge.`;
    }
    case 'drill': {
      const cur = skillLevels[step.skill];
      if (cur != null) {
        return `Drill ${step.skill} — your radar shows ${cur}/100.`;
      }
      return `Drill ${step.skill} with 5 focused challenges.`;
    }
    default:
      return 'Next step.';
  }
}

function pctFromCounts(done, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}
