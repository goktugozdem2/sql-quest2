// SQL Quest — live Coach registry integrity
//
// Every other coach test uses hand-built fixture goals. This one runs the
// REAL registry against the REAL content and the REAL radar, because that
// gap is where the bug lived: goals.js named skills in the retired 10-skill
// vocabulary while the radar had already shipped the 9-skill one. Nothing
// crashed. 46 references were dead — every skipIf silently never fired, no
// goal could ever graduate, and three steps could never complete, so users
// hit a permanent dead end at the end of both curricula.
//
// A fixture can't catch that: it asserts the engine against names the test
// itself supplies. The only guard is binding the registry to what the radar
// actually emits at runtime, which is what these tests do.

import { describe, it, expect, beforeAll } from 'vitest';
import { validateGoalRegistry } from '../src/utils/coach-validate.js';
import { calculateSkillLevels } from '../src/utils/skill-calc.js';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';

let goals, challenges, lessons, radarSkills;

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import('../src/data/challenges.js');
  await import('../src/data/exercises.js');
  await import('../src/data/goals.js');
  goals = globalThis.window.coachGoals;
  challenges = globalThis.window.challengesData;
  lessons = globalThis.window.aiLessonsData;

  // The authoritative keyspace: whatever calculateSkillLevels returns is
  // exactly what lands in weaknessTracking.skillLevels, which is what the
  // engine reads for skipIf and exit criteria.
  radarSkills = new Set(Object.keys(calculateSkillLevels(
    {
      performanceEvents: [], solvedChallenges: [], challengeAttempts: [],
      dailyChallengeHistory: [], warmUpAnswered: [],
      completedExercises: new Set(), interviewHistory: [],
    },
    { allChallenges: challenges, warmUpQuestions: [] },
  )));
});

describe('live goal registry', () => {
  it('loads every goal with a non-empty curriculum', () => {
    expect(Array.isArray(goals)).toBe(true);
    expect(goals.length).toBeGreaterThan(0);
    for (const g of goals) {
      expect(g.id, 'goal missing id').toBeTruthy();
      expect(Array.isArray(g.curriculum), `${g.id} curriculum`).toBe(true);
      expect(g.curriculum.length, `${g.id} has no steps`).toBeGreaterThan(0);
    }
  });

  it('passes validateGoalRegistry with zero errors against real content', () => {
    const errors = validateGoalRegistry({
      goals, aiLessonsData: lessons, challengesData: challenges,
    }).filter(i => i.severity === 'error');
    expect(errors.map(e => `${e.goalId}/${e.stepId || '-'}: ${e.message}`)).toEqual([]);
  });

  it('names only skills the radar actually emits in skipIf', () => {
    const dead = [];
    for (const g of goals) {
      for (const s of g.curriculum) {
        if (s.skipIf?.skill && !radarSkills.has(s.skipIf.skill)) {
          dead.push(`${g.id}/${s.id}: skipIf "${s.skipIf.skill}"`);
        }
      }
    }
    // A skipIf on a key the radar never emits reads as 0 forever, so the step
    // is never skipped and the goal loses all of its adaptivity.
    expect(dead).toEqual([]);
  });

  it('names only skills the radar actually emits in exitCriteria', () => {
    const dead = [];
    for (const g of goals) {
      for (const skill of Object.keys(g.exitCriteria?.skillThresholds || {})) {
        if (!radarSkills.has(skill)) dead.push(`${g.id}: exitCriteria "${skill}"`);
      }
    }
    // An exit threshold on a key the radar never emits can never be met, so
    // the goal can never be graduated.
    expect(dead).toEqual([]);
  });

  it('targets drills at skills with real challenges behind them', () => {
    const empty = [];
    for (const g of goals) {
      for (const s of g.curriculum) {
        if (s.type !== 'drill') continue;
        const pool = challenges.filter(c => challengeMatchesSkill(c, s.skill)).length;
        if (pool === 0) empty.push(`${g.id}/${s.id}: drill "${s.skill}"`);
      }
    }
    expect(empty).toEqual([]);
  });

  it('sets mastery checks that enough content can actually satisfy', () => {
    const order = { Easy: 1, Medium: 2, Hard: 3 };
    const unsatisfiable = [];
    for (const g of goals) {
      for (const s of g.curriculum) {
        if (s.type !== 'mastery_check') continue;
        const floor = order[s.minDifficulty] || 1;
        const pool = challenges.filter(c =>
          (order[c.difficulty] || 1) >= floor && challengeMatchesSkill(c, s.skill)
        ).length;
        const need = s.minSolves || 3;
        if (pool < need) {
          unsatisfiable.push(`${g.id}/${s.id}: needs ${need} on "${s.skill}" at ${s.minDifficulty || 'Easy'}+, only ${pool} exist`);
        }
      }
    }
    expect(unsatisfiable).toEqual([]);
  });

  it('resolves every referenced challenge and lesson id', () => {
    const challengeIds = new Set(challenges.map(c => c.id));
    const lessonIds = new Set(lessons.map(l => l.id));
    const missing = [];
    for (const g of goals) {
      for (const s of g.curriculum) {
        if (s.type === 'challenge' && !challengeIds.has(s.challengeId)) {
          missing.push(`${g.id}/${s.id}: challenge ${s.challengeId}`);
        }
        if (s.type === 'lesson' && !lessonIds.has(s.lessonId)) {
          missing.push(`${g.id}/${s.id}: lesson ${s.lessonId}`);
        }
        if (s.type === 'retrieval_check' && !lessonIds.has(s.sourceLessonId)) {
          missing.push(`${g.id}/${s.id}: sourceLessonId ${s.sourceLessonId}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('keeps step ids unique within each goal', () => {
    for (const g of goals) {
      const ids = g.curriculum.map(s => s.id);
      expect(new Set(ids).size, `${g.id} has duplicate step ids`).toBe(ids.length);
    }
  });
});
