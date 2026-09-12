// Adaptive placement (P0-2, 2026-09-12). The pure half is src/utils/placement.js;
// the guards pin what app.jsx must keep true: with the flag off the quiz
// returns exactly what the 2026-08-14 cap returned; 'advanced' is reachable
// from the quiz only through a pass on the second round; the four round-2
// questions are the four an interview asks; scores travel, answers never do.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  PLACEMENT_TIERS, ROUND1_FULL_SCORE, ROUND2_PASS_SCORE,
  scoreRound, levelForRound1, levelForScores, placementResult, placementEventPayload,
} from '../src/utils/placement.js';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const app = read('../src/app.jsx');
const flags = read('../src/data/feature-flags.js');

// Parse the two question lists out of app.jsx so the tests bind to the live bank.
const parseList = (name) => {
  const start = app.indexOf(`const ${name} = [`);
  expect(start, `${name} in app.jsx`).toBeGreaterThan(-1);
  const end = app.indexOf('\n];', start);
  // eslint-disable-next-line no-new-func
  return new Function(`return ${app.slice(start + `const ${name} = `.length, end + 3)}`)();
};
const ROUND1 = parseList('FIRST_RUN_PLACEMENT_QUESTIONS');
const ROUND2 = parseList('FIRST_RUN_PLACEMENT_ROUND2');
const correct = (qs) => Object.fromEntries(qs.map(q => [q.id, q.options.find(o => o.points === 1).id]));
const unsure = (qs) => Object.fromEntries(qs.map(q => [q.id, 'unsure']));

describe('the questions', () => {
  it('round 1 is the four the cap was measured on; round 2 is window, CTE, NULL, anti-join', () => {
    expect(ROUND1.map(q => q.id)).toEqual(['select', 'where', 'aggregate', 'join']);
    expect(ROUND2.map(q => q.id)).toEqual(['window', 'cte', 'null', 'antijoin']);
  });

  it('every question has exactly one right answer, one "Not sure yet", and four options', () => {
    for (const q of [...ROUND1, ...ROUND2]) {
      expect(q.options.length, q.id).toBe(4);
      expect(q.options.filter(o => o.points === 1).length, `${q.id}: one correct`).toBe(1);
      expect(q.options.some(o => o.id === 'unsure' && o.points === 0), `${q.id}: unsure`).toBe(true);
      expect(new Set(q.options.map(o => o.id)).size).toBe(4);
    }
    const ids = [...ROUND1, ...ROUND2].map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('placementResult — the flag off is the 08-14 cap, byte for byte', () => {
  const cases = [[0, 'brand-new'], [1, 'brand-new'], [2, 'basics'], [3, 'working'], [4, 'working']];
  for (const [score, level] of cases) {
    it(`${score}/4 → ${level}, total 4, no tier`, () => {
      const answers = {};
      ROUND1.forEach((q, i) => { answers[q.id] = i < score ? q.options.find(o => o.points === 1).id : 'unsure'; });
      const r = placementResult({ round1: ROUND1, round2: ROUND2, answers, adaptive: false });
      expect(r).toMatchObject({ total: 4, answeredCount: 4, score, score2: null, round2Active: false, complete: true, levelId: level, tier: null });
      expect(levelForRound1(score)).toBe(level);
    });
  }

  it('is incomplete until all four are answered, and round-2 answers are ignored', () => {
    const r = placementResult({ round1: ROUND1, round2: ROUND2, answers: { ...correct(ROUND1), select: undefined, ...correct(ROUND2) }, adaptive: false });
    expect(r.complete).toBe(false);
    expect(r.answeredCount).toBe(3);
    expect(r.total).toBe(4);
  });
});

describe('placementResult — adaptive: readiness is earned on round 2', () => {
  it('a full round 1 opens round 2 and the quiz is not complete until its four are answered', () => {
    const r = placementResult({ round1: ROUND1, round2: ROUND2, answers: correct(ROUND1), adaptive: true });
    expect(r).toMatchObject({ total: 8, answeredCount: 4, score: 4, score2: null, round2Active: true, round2Complete: false, complete: false, levelId: 'working', tier: 'Advanced' });
  });

  it('3/4 on round 1 stays Advanced with no second round', () => {
    const answers = { ...correct(ROUND1), join: 'unsure' };
    const r = placementResult({ round1: ROUND1, round2: ROUND2, answers, adaptive: true });
    expect(r).toMatchObject({ total: 4, round2Active: false, complete: true, levelId: 'working', tier: 'Advanced' });
  });

  it('a pass on round 2 (3 of 4) is Interview-ready; 2 of 4 is Advanced', () => {
    const pass = { ...correct(ROUND1), ...correct(ROUND2), antijoin: 'unsure' };
    expect(placementResult({ round1: ROUND1, round2: ROUND2, answers: pass, adaptive: true })).toMatchObject({ complete: true, score2: 3, levelId: 'advanced', tier: 'Interview-ready', total: 8, answeredCount: 8 });
    const fail = { ...correct(ROUND1), ...unsure(ROUND2), window: correct(ROUND2).window, cte: correct(ROUND2).cte };
    expect(placementResult({ round1: ROUND1, round2: ROUND2, answers: fail, adaptive: true })).toMatchObject({ complete: true, score2: 2, levelId: 'working', tier: 'Advanced' });
    expect(ROUND2_PASS_SCORE).toBe(3);
    expect(ROUND1_FULL_SCORE).toBe(4);
  });

  it("'advanced' is never reachable from round 1 alone", () => {
    expect(levelForScores(4, null, true)).toBe('working');
    expect(levelForScores(4, undefined, true)).toBe('working');
    expect(levelForScores(4, 4, true)).toBe('advanced');
    expect(levelForScores(3, 4, true)).toBe('working');
    expect(levelForScores(4, 4, false)).toBe('working');
  });

  it('changing a round-1 answer to wrong closes round 2 again', () => {
    const answers = { ...correct(ROUND1), ...correct(ROUND2), where: 'unsure' };
    const r = placementResult({ round1: ROUND1, round2: ROUND2, answers, adaptive: true });
    expect(r).toMatchObject({ total: 4, round2Active: false, complete: true, levelId: 'working' });
  });

  it('tiers name the four existing level ids', () => {
    expect(PLACEMENT_TIERS).toEqual({ 'brand-new': 'Foundations', basics: 'Intermediate', working: 'Advanced', advanced: 'Interview-ready' });
    for (const id of Object.keys(PLACEMENT_TIERS)) expect(app).toMatch(new RegExp(`id: '${id}',`));
  });

  it('scoreRound tolerates garbage', () => {
    expect(scoreRound(null, null)).toEqual({ answered: 0, score: 0, total: 0 });
    expect(scoreRound(ROUND1, { select: 'nonsense' })).toEqual({ answered: 1, score: 0, total: 4 });
  });

  it('the event carries scores and the tier, never the answers', () => {
    const r = placementResult({ round1: ROUND1, round2: ROUND2, answers: { ...correct(ROUND1), ...correct(ROUND2) }, adaptive: true });
    expect(placementEventPayload(r)).toEqual({ source: 'quiz', levelId: 'advanced', tier: 'Interview-ready', score1: 4, score2: 4, round2: true });
    expect(placementEventPayload({ levelId: 'basics', score: 2, score2: null, round2Active: false }, 'manual')).toEqual({ source: 'manual', levelId: 'basics', tier: 'Intermediate', score1: 2, score2: null, round2: false });
    expect(JSON.stringify(placementEventPayload(r))).not.toMatch(/correct|unsure|combine/);
  });
});

describe('source guards — app.jsx', () => {
  it('ships behind adaptivePlacement, off, and the quiz delegates to the pure module', () => {
    expect(flags).toMatch(/adaptivePlacement: false,/);
    expect(app).toMatch(/placementResult\(\{\s*\n\s*round1: FIRST_RUN_PLACEMENT_QUESTIONS,\s*\n\s*round2: FIRST_RUN_PLACEMENT_ROUND2,\s*\n\s*answers,\s*\n\s*adaptive: !!window\.FF\?\.feature\('adaptivePlacement'\),/);
    // the old inline mapping is gone — one place decides a level
    expect(app).not.toMatch(/score <= 1 \? 'brand-new' : score === 2 \? 'basics' : 'working'/);
  });

  it('round 2 renders after round 1, only when active, and the manual list still offers every level', () => {
    const r1 = app.indexOf('{FIRST_RUN_PLACEMENT_QUESTIONS.map((question, questionIndex) => renderPlacementQuestion(question, questionIndex + 1))}');
    const r2 = app.indexOf('data-placement-round="2"', r1);
    expect(r1).toBeGreaterThan(-1);
    expect(r2).toBeGreaterThan(r1);
    expect(app).toMatch(/\{quizResult\.round2Active && \(/);
    expect(app).toMatch(/FIRST_RUN_PLACEMENT_ROUND2\.map\(\(question, questionIndex\) => renderPlacementQuestion\(question, FIRST_RUN_PLACEMENT_QUESTIONS\.length \+ questionIndex \+ 1\)\)/);
    expect(app).toMatch(/\{FIRST_RUN_LEVELS\.map\(level => \{/);
  });

  it('records the placement the same way from both doors — scores and tier, never answers', () => {
    expect(app).toMatch(/trackActivationEvent\('placement_completed', placementEventPayload\(result, 'quiz'\)\)/);
    expect(app).toMatch(/trackActivationEvent\('placement_completed', placementEventPayload\(\{ levelId: level\.id \}, 'manual'\)\)/);
    expect(app).toMatch(/trackActivationEvent\('placement_round2_started', \{ score1: result\.score \}\)/);
    expect(app).not.toMatch(/answers: firstRunQuizAnswers/);
    expect(app).not.toMatch(/answers: nextAnswers/);
  });

  it('the interview-ready track is still the one the cap left in place', () => {
    // No third opener swap without a claim: the advanced track's ids are read
    // from the source, not asserted as a literal, so this only fails if the
    // track disappears — the seat's own claim owns its contents.
    expect(app).toMatch(/trackId: 'foundations-advanced'/);
  });
});

// ── The Coach stops asking twice (2026-09-12) ──────────────────────────────
import { FIRST_RUN_PLACEMENT_SOURCES, COACH_SEED_FLOORS, seedFloorsFor, readFirstRunPlacement, coachPlacementFor } from '../src/utils/placement.js';
import { newCoachGoalState } from '../src/utils/onboarding-intake.js';
import { computeNextStep, applySeedFloors, isGoalGraduated } from '../src/utils/coach.js';

describe('a first-run placement is a placement', () => {
  const NOW = Date.UTC(2026, 8, 12, 12, 0, 0);
  const storage = (rec) => ({ getItem: (k) => (k === 'sqlquest_onboarding_data' && rec ? JSON.stringify(rec) : null) });

  it('reads the record the quiz and the manual pick write, and nothing else', () => {
    expect(readFirstRunPlacement(storage({ source: 'first_run_placement_quiz', firstRunLevel: 'working', placedAt: '2026-09-12T10:00:00Z' })))
      .toEqual({ level: 'working', source: 'first_run_placement_quiz', placedAt: '2026-09-12T10:00:00Z' });
    expect(readFirstRunPlacement(storage({ source: 'first_run_manual_or_recommendation', firstRunLevel: 'advanced' })).level).toBe('advanced');
    expect(readFirstRunPlacement(storage({ source: 'legacy_modal', firstRunLevel: 'working' }))).toBeNull();
    expect(readFirstRunPlacement(storage({ source: 'first_run_placement_quiz', firstRunLevel: 'guru' }))).toBeNull();
    expect(readFirstRunPlacement(storage(null))).toBeNull();
    expect(readFirstRunPlacement({ getItem: () => 'not json' })).toBeNull();
    expect(FIRST_RUN_PLACEMENT_SOURCES).toEqual(['first_run_placement_quiz', 'first_run_manual_or_recommendation', 'first_run_completed']);
  });

  it('floors sit on the goals\' own skipIf thresholds and name only canonical skills', () => {
    const goals = read('../src/data/goals.js');
    const thresholds = new Set([...goals.matchAll(/gte: (\d+)/g)].map(m => Number(m[1])));
    for (const [level, floors] of Object.entries(COACH_SEED_FLOORS)) {
      for (const [skill, v] of Object.entries(floors)) {
        expect(thresholds.has(v), `${level}: ${skill} floor ${v} is not a skipIf threshold`).toBe(true);
        expect(goals.includes(`'${skill}'`), `${level}: ${skill} is not a skill the goals name`).toBe(true);
      }
    }
    expect(seedFloorsFor('brand-new')).toEqual({});
    expect(seedFloorsFor('basics')).toEqual({ 'Querying Basics': 70 });
    expect(seedFloorsFor('nonsense')).toEqual({});
    expect(Object.keys(seedFloorsFor('advanced')).length).toBe(6);
  });

  it('trusted: the Coach placement is skipped by the first run and floors are set; cold otherwise gets the Coach placement', () => {
    const fr = { level: 'working', source: 'first_run_placement_quiz', placedAt: null };
    const trusted = coachPlacementFor({ trust: true, firstRun: fr, cold: true, placementIds: [91, 98], now: NOW });
    expect(trusted.placement).toEqual({ challengeIds: [91, 98], minAnswered: 5, skipped: true, skippedBy: 'first_run_quiz', level: 'working', at: '2026-09-12T12:00:00.000Z' });
    expect(trusted.seedFloors).toEqual({ source: 'first_run_quiz', level: 'working', floors: { 'Querying Basics': 70, 'Aggregation & Grouping': 60, 'Joins': 60 }, at: '2026-09-12T12:00:00.000Z' });
    const cold = coachPlacementFor({ trust: false, firstRun: fr, cold: true, placementIds: [91, 98], now: NOW });
    expect(cold).toEqual({ placement: { challengeIds: [91, 98], minAnswered: 5, skipped: false }, seedFloors: null, skippedBy: null });
    expect(coachPlacementFor({ trust: true, firstRun: null, cold: false, now: NOW }).placement).toBeUndefined();
    // the goal state carries both
    const st = newCoachGoalState('fundamentals', { source: 'intake', cold: true, placementIds: [91], now: NOW, firstRun: fr, trustFirstRun: true });
    expect(st.placement.skippedBy).toBe('first_run_quiz');
    expect(st.seedFloors.level).toBe('working');
    // and without trust it is what it always was
    const old = newCoachGoalState('fundamentals', { source: 'intake', cold: true, placementIds: [91], now: NOW, firstRun: fr, trustFirstRun: false });
    expect(old.placement).toEqual({ challengeIds: [91], minAnswered: 5, skipped: false });
    expect(old.seedFloors).toBeUndefined();
  });

  it('the engine: floors let a person past a skipIf lesson, never past a goal, and never touch the radar', () => {
    const goal = {
      id: 'g', curriculum: [
        { id: 's1', type: 'lesson', lessonId: 1, skipIf: { skill: 'Querying Basics', gte: 70 } },
        { id: 's2', type: 'lesson', lessonId: 2, skipIf: { skill: 'Joins', gte: 70 } },
      ],
      exitCriteria: { skillThresholds: { 'Querying Basics': 70 } },
    };
    const user = { coachState: { goalId: 'g', startedAt: '2026-09-12T00:00:00Z', stepsCompleted: [] }, challengeAttempts: [] };
    const radar = { 'Querying Basics': 10 };
    const plain = computeNextStep(goal, user, { skillLevels: radar });
    expect(plain.step.id).toBe('s1');
    const floored = computeNextStep(goal, user, { skillLevels: radar, seedFloors: { floors: { 'Querying Basics': 70 } } });
    expect(floored.step.id).toBe('s2');
    expect(floored.graduated).toBe(false);
    expect(radar).toEqual({ 'Querying Basics': 10 });
    expect(isGoalGraduated({ exitCriteria: goal.exitCriteria, skillLevels: radar, challengeAttempts: [], startedAtMs: 0 })).toBe(false);
    expect(applySeedFloors({ Joins: 80 }, { floors: { Joins: 60, 'Querying Basics': 70 } })).toEqual({ Joins: 80, 'Querying Basics': 70 });
    const same = { Joins: 80 };
    expect(applySeedFloors(same, null)).toBe(same);
    expect(applySeedFloors(same, { floors: { Joins: 50 } })).toBe(same);
  });

  it('source guards: off by default, wired at both goal doors and at the quiz, floors reach skipIf only', () => {
    expect(flags).toMatch(/coachTrustQuizPlacement: false,/);
    expect(app).toMatch(/newCoachGoalState\(goalId, \{ source: 'picker', cold: shouldPlace, placementIds: COACH_PLACEMENT_CHALLENGE_IDS, firstRun, trustFirstRun \}\)/);
    expect(app).toMatch(/source: 'intake',\s*\n\s*cold: _coachUserIsCold\(\) && !_userIsSelfDeclaredAdvanced\(\),\s*\n\s*placementIds: COACH_PLACEMENT_CHALLENGE_IDS,\s*\n\s*now,\s*\n\s*firstRun,\s*\n\s*trustFirstRun: !!window\.FF\?\.feature\('coachTrustQuizPlacement'\),/);
    expect(app).toMatch(/applyFirstRunPlacementToCoach\(levelId, metadata\.source \|\| 'first_run_placement'\);\n  \};/);
    expect(app).toMatch(/seedFloors: coachState\?\.seedFloors \|\| null,/);
    expect((app.match(/trackActivationEvent\('coach_placement_skipped', \{ by: 'first_run_quiz'/g) || []).length).toBe(3);
    const coach = read('../src/utils/coach.js');
    expect(coach).toMatch(/matchesSkipIf\(step\.skipIf, skipLevels\)/);
    expect(coach).toMatch(/isGoalGraduated\(\{ exitCriteria, skillLevels, challengeAttempts, startedAtMs \}\)/);
    expect(coach).not.toMatch(/isGoalGraduated\(\{ exitCriteria, skillLevels: skipLevels/);
    // the radar is never written from a floor
    const block = app.slice(app.indexOf('const applyFirstRunPlacementToCoach'), app.indexOf('const applyFirstRunPlacementToCoach') + 2200);
    expect(block).not.toMatch(/setWeaknessTracking/);
  });
});
