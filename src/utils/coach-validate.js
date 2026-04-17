// SQL Quest — Coach goal registry validator
//
// Loaded at module init. Checks every goal in the registry against the
// referenced data (lessons, challenges, canonical skills). Fail-loud in
// dev; fail-soft in prod — invalid steps are marked `broken: true` and
// the engine skips them rather than crashing.
//
// Spec: docs/superpowers/specs/2026-04-16-ai-tutor-coach-design.md
//
// Phase 1 validators:
//   - lesson.lessonId resolves in aiLessonsData
//   - challenge.challengeId resolves in challengesData
//   - drill.skill is a canonical radar skill
//   - skipIf.skill is canonical; skipIf.gte is 0-100
//   - exit criteria skill thresholds use canonical skill names
//   - every id in the goal's curriculum is unique
//
// Phase 2 will add: novelty-pool sufficiency (for mastery_check),
// retrieval_check sourceLessonId coverage.

const CANONICAL_SKILLS = new Set([
  'SELECT Basics', 'Filter & Sort', 'Aggregation', 'GROUP BY',
  'JOIN Tables', 'Subqueries', 'String Functions', 'Date Functions',
  'CASE Statements', 'Window Functions',
]);

export function validateGoalRegistry({
  goals = [],
  aiLessonsData = [],
  challengesData = [],
} = {}) {
  const lessonIds = new Set((aiLessonsData || []).map(l => l.id));
  const challengeIds = new Set((challengesData || []).map(c => c.id));

  const issues = [];

  for (const goal of goals) {
    if (!goal || !goal.id) {
      issues.push({ goalId: '?', severity: 'error', message: 'Goal missing id' });
      continue;
    }
    if (!Array.isArray(goal.curriculum)) {
      issues.push({ goalId: goal.id, severity: 'error', message: 'curriculum is not an array' });
      continue;
    }

    const seenStepIds = new Set();
    for (const step of goal.curriculum) {
      if (!step || !step.id) {
        issues.push({ goalId: goal.id, severity: 'error', message: 'step missing id' });
        continue;
      }
      if (seenStepIds.has(step.id)) {
        issues.push({ goalId: goal.id, stepId: step.id, severity: 'error', message: `duplicate step id "${step.id}"` });
      }
      seenStepIds.add(step.id);

      // Per-type checks
      switch (step.type) {
        case 'lesson':
          if (!lessonIds.has(step.lessonId)) {
            issues.push({ goalId: goal.id, stepId: step.id, severity: 'error', message: `lesson.lessonId ${JSON.stringify(step.lessonId)} does not resolve` });
            step.broken = true;
          }
          break;
        case 'challenge':
          if (!challengeIds.has(step.challengeId)) {
            issues.push({ goalId: goal.id, stepId: step.id, severity: 'error', message: `challenge.challengeId ${step.challengeId} does not resolve` });
            step.broken = true;
          }
          break;
        case 'drill':
          if (!CANONICAL_SKILLS.has(step.skill)) {
            issues.push({ goalId: goal.id, stepId: step.id, severity: 'error', message: `drill.skill "${step.skill}" is not canonical` });
            step.broken = true;
          }
          break;
        default:
          issues.push({ goalId: goal.id, stepId: step.id, severity: 'error', message: `unknown step type "${step.type}"` });
          step.broken = true;
      }

      // skipIf validation
      if (step.skipIf) {
        if (!CANONICAL_SKILLS.has(step.skipIf.skill)) {
          issues.push({ goalId: goal.id, stepId: step.id, severity: 'error', message: `skipIf.skill "${step.skipIf.skill}" is not canonical` });
        }
        if (step.skipIf.gte != null && (step.skipIf.gte < 0 || step.skipIf.gte > 100)) {
          issues.push({ goalId: goal.id, stepId: step.id, severity: 'error', message: `skipIf.gte ${step.skipIf.gte} is out of range 0-100` });
        }
      }
    }

    // Exit criteria skill threshold keys
    if (goal.exitCriteria?.skillThresholds) {
      for (const skill of Object.keys(goal.exitCriteria.skillThresholds)) {
        if (!CANONICAL_SKILLS.has(skill)) {
          issues.push({ goalId: goal.id, severity: 'error', message: `exitCriteria skill "${skill}" is not canonical` });
        }
      }
    }

    // Curriculum reachability: every targeted exit skill should be touched
    // by at least one step (drill/lesson) so the user has a chance to train
    // it. Warning, not an error — lessons/drills aren't strictly required
    // for exit criteria that depend on prior mastery.
    if (goal.exitCriteria?.skillThresholds) {
      const touched = new Set();
      for (const step of goal.curriculum) {
        if (step.type === 'drill') touched.add(step.skill);
        if (step.skipIf?.skill) touched.add(step.skipIf.skill);
      }
      for (const skill of Object.keys(goal.exitCriteria.skillThresholds)) {
        if (!touched.has(skill)) {
          issues.push({ goalId: goal.id, severity: 'warning', message: `exit skill "${skill}" is not directly trained by any step` });
        }
      }
    }
  }

  return issues;
}

// Thin wrapper that's safe to call at runtime in the app. Pulls data from
// window.* globals and logs issues without throwing.
export function runRegistryValidation() {
  if (typeof window === 'undefined') return [];
  const issues = validateGoalRegistry({
    goals: window.coachGoals || [],
    aiLessonsData: window.aiLessonsData || [],
    challengesData: window.challengesData || [],
  });
  if (issues.length === 0) return issues;
  for (const issue of issues) {
    const prefix = `[coach-validate] ${issue.severity} [${issue.goalId}${issue.stepId ? '/' + issue.stepId : ''}]`;
    if (issue.severity === 'error') {
      // eslint-disable-next-line no-console
      console.error(prefix, issue.message);
    } else {
      // eslint-disable-next-line no-console
      console.warn(prefix, issue.message);
    }
  }
  return issues;
}
