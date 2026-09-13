// Onboarding intake (P0-1, 2026-09-12): three OPTIONAL questions in front of
// the placement quiz. The pure half is src/utils/onboarding-intake.js; the
// guards below pin what app.jsx must keep true: the intake sits before the
// quiz, behind its flag, shows once, never stores or sends the date, never
// mentions Pro, and never fires the events that give other funnels their
// meaning (goal_selected, prep_target_set, intent_captured).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  INTAKE_KEY, INTAKE_GOALS, INTAKE_ROLES, INTAKE_STEPS, INTAKE_MAX_DAYS_OUT,
  intakeGoalFor, isIntakeRole, nextIntakeStep, daysOut, isValidIntakeDate,
  buildIntakeRecord, isIntakeComplete, readIntakeRecord, intakeEventPayload,
  newCoachGoalState, shouldShowIntake,
} from '../src/utils/onboarding-intake.js';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const NOW = Date.UTC(2026, 8, 12, 12, 0, 0); // 2026-09-12 noon UTC

describe('intake — the three steps and what each answer maps to', () => {
  it('walks goal → date → role and then stops', () => {
    expect(INTAKE_STEPS).toEqual(['goal', 'date', 'role']);
    expect(nextIntakeStep('goal')).toBe('date');
    expect(nextIntakeStep('date')).toBe('role');
    expect(nextIntakeStep('role')).toBeNull();
    expect(nextIntakeStep('nonsense')).toBe('goal');
  });

  it('every goal maps to the intent the post-solve ask writes and to a live Coach goal', () => {
    const goals = read('../src/data/goals.js');
    const app = read('../src/app.jsx');
    const intents = new Set(['interview', 'job_ready', 'learning']);
    for (const g of INTAKE_GOALS) {
      expect(intents.has(g.intent), `${g.id}: intent ${g.intent}`).toBe(true);
      expect(goals, `${g.id}: coach goal ${g.coachGoalId} missing from goals.js`).toMatch(new RegExp(`id: '${g.coachGoalId}'`));
      // the modal's own value list, so the two doors cannot drift apart
      expect(app).toMatch(new RegExp(`\\['${g.intent}', '`));
    }
    expect(intakeGoalFor('interview').coachGoalId).toBe('interview-prep');
    expect(intakeGoalFor('job').coachGoalId).toBe('analyst-day-one');
    expect(intakeGoalFor('general').coachGoalId).toBe('fundamentals');
    expect(intakeGoalFor('pro')).toBeNull();
  });

  it('roles are a fixed list, not free text', () => {
    expect(INTAKE_ROLES).toEqual(['analyst', 'data_scientist', 'engineer', 'product', 'student', 'other']);
    expect(isIntakeRole('analyst')).toBe(true);
    expect(isIntakeRole('CEO')).toBe(false);
  });

  it('accepts a real day from today to two years out, and nothing else', () => {
    expect(daysOut('2026-09-12', NOW)).toBe(0);
    expect(daysOut('2026-10-01', NOW)).toBe(19);
    expect(daysOut('2026-02-31', NOW)).toBeNull();
    expect(daysOut('next week', NOW)).toBeNull();
    expect(isValidIntakeDate('2026-09-12', NOW)).toBe(true);
    expect(isValidIntakeDate('2026-09-11', NOW)).toBe(false);
    expect(isValidIntakeDate('2028-09-11', NOW)).toBe(true);
    expect(isValidIntakeDate('2028-09-13', NOW)).toBe(false);
    expect(INTAKE_MAX_DAYS_OUT).toBe(730);
  });
});

describe('intake record — what is kept, and what never is', () => {
  it('records the answers and lists the skipped steps', () => {
    const r = buildIntakeRecord({ goal: 'interview', date: '2026-10-01', role: 'analyst' }, NOW);
    expect(r).toEqual({ version: 1, goal: 'interview', hasDate: true, role: 'analyst', company: null, level: null, skipped: ['company', 'level'], completedAt: '2026-09-12T12:00:00.000Z' });
    expect(isIntakeComplete(r)).toBe(true);
  });

  it('skipping all three is a completed intake — nobody is asked twice', () => {
    const r = buildIntakeRecord({ goal: null, date: null, role: null }, NOW);
    expect(r.skipped).toEqual(['goal', 'date', 'role']);
    expect(isIntakeComplete(r)).toBe(true);
    expect(shouldShowIntake({ flagOn: true, onStartScreen: true, record: r })).toBe(false);
  });

  it('never holds the date, only that one was given', () => {
    const r = buildIntakeRecord({ goal: 'job', date: '2026-10-01', role: null }, NOW);
    expect(JSON.stringify(r)).not.toContain('2026-10-01');
    expect(r.hasDate).toBe(true);
    const bad = buildIntakeRecord({ goal: 'job', date: '2026-01-01', role: null }, NOW);
    expect(bad.hasDate).toBe(false);
    expect(bad.skipped).toEqual(['date', 'role']);
  });

  it('rejects garbage answers instead of storing them', () => {
    const r = buildIntakeRecord({ goal: 'pro', date: 7, role: 'CEO' }, NOW);
    expect(r.goal).toBeNull();
    expect(r.role).toBeNull();
    expect(r.skipped).toEqual(['goal', 'date', 'role']);
    expect(buildIntakeRecord(null, NOW).skipped.length).toBe(3);
  });

  it('reads only a complete record back from storage', () => {
    const store = new Map();
    const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null) };
    expect(readIntakeRecord(storage)).toBeNull();
    store.set(INTAKE_KEY, '{"version":1}');
    expect(readIntakeRecord(storage)).toBeNull();
    store.set(INTAKE_KEY, 'not json');
    expect(readIntakeRecord(storage)).toBeNull();
    store.set(INTAKE_KEY, JSON.stringify(buildIntakeRecord({ goal: 'general' }, NOW)));
    expect(readIntakeRecord(storage).goal).toBe('general');
    expect(INTAKE_KEY).toBe('sqlquest_intake_v1');
  });

  it('the completion event carries daysOut, the skipped count and the seconds — never the date', () => {
    const r = buildIntakeRecord({ goal: 'interview', date: '2026-10-01', role: null }, NOW);
    const payload = intakeEventPayload(r, { draftDate: '2026-10-01', now: NOW, startedAt: NOW - 42_000 });
    expect(payload).toEqual({ goal: 'interview', hasDate: true, daysOut: 19, role: null, company: null, level: null, skippedCount: 3, seconds: 42 });
    expect(JSON.stringify(payload)).not.toContain('2026-10-01');
    expect(intakeEventPayload(buildIntakeRecord({}, NOW), { now: NOW }).seconds).toBeNull();
  });
});

describe('the Coach goal an intake choice produces', () => {
  it('is the picker\'s shape plus a source, with the Coach placement for a cold user', () => {
    const s = newCoachGoalState('interview-prep', { source: 'intake', cold: true, placementIds: [91, 92], now: NOW });
    expect(s).toEqual({
      goalId: 'interview-prep', startedAt: '2026-09-12T12:00:00.000Z', stepsCompleted: [], graduatedAt: null,
      source: 'intake', placement: { challengeIds: [91, 92], minAnswered: 5, skipped: false },
    });
    const warm = newCoachGoalState('fundamentals', { now: NOW });
    expect(warm.source).toBe('picker');
    expect(warm.placement).toBeUndefined();
  });

  it('shows only on the start screen, only with the flag, only once', () => {
    expect(shouldShowIntake({ flagOn: true, onStartScreen: true, record: null })).toBe(true);
    expect(shouldShowIntake({ flagOn: false, onStartScreen: true, record: null })).toBe(false);
    expect(shouldShowIntake({ flagOn: true, onStartScreen: false, record: null })).toBe(false);
    expect(shouldShowIntake({ flagOn: true, onStartScreen: true, record: { version: 1, completedAt: 'x' } })).toBe(false);
  });
});

describe('source guards — app.jsx keeps the intake optional, early, and quiet', () => {
  const app = read('../src/app.jsx');
  const flags = read('../src/data/feature-flags.js');
  const i18n = read('../src/utils/i18n.js');
  const blockStart = app.indexOf('── Onboarding intake (P0-1, 2026-09-12)');
  const blockEnd = app.indexOf('// User clicked "Skip placement"', blockStart);
  const block = app.slice(blockStart, blockEnd);

  it('ships behind onboardingIntake, off, and renders in front of the placement quiz', () => {
    expect(flags).toMatch(/onboardingIntake: false,/);
    expect(app).toMatch(/flagOn: !!window\.FF\?\.feature\('onboardingIntake'\)/);
    expect(app).toMatch(/onStartScreen: showFirstRunStart && !showZeroSqlLesson/);
    const intakeAt = app.indexOf(') : showIntake ? (\n                  renderOnboardingIntake()');
    const quizAt = app.indexOf('data-onboarding="first-run-placement"', intakeAt);
    expect(intakeAt).toBeGreaterThan(-1);
    expect(quizAt).toBeGreaterThan(intakeAt);
    // the first-entry tour explains the quiz, so it waits for the quiz
    expect(app).toMatch(/showFirstEntryTour && showFirstRunStart && !showIntake && !currentChallenge/);
  });

  it('locates the intake block', () => {
    expect(blockStart).toBeGreaterThan(-1);
    expect(blockEnd).toBeGreaterThan(blockStart);
    // 16,000 since 2026-09-13: the interview goal's company and level steps (P3.20).
    expect(block.length).toBeLessThan(16000);
  });

  it('every step can be skipped, and the goal is one tap', () => {
    expect(block).toMatch(/data-intake-skip="true"/);
    expect(block).toMatch(/onClick=\{\(\) => answerIntake\(intakeStep, null\)\}/);
    expect(block).toMatch(/INTAKE_GOALS\.map\(g => \(/);
    expect(block).toMatch(/INTAKE_ROLES\.map\(r => \(/);
    expect(block).toMatch(/onClick=\{\(\) => answerIntake\('goal', g\.id\)\}/);
  });

  it('writes each answer to the store that already owns it', () => {
    expect(block).toMatch(/localStorage\.setItem\('sqlquest_user_intent', goal\.intent\)/);
    expect(block).toMatch(/localStorage\.setItem\('sqlquest_intent_asked', '1'\)/);
    expect(block).toMatch(/newCoachGoalState\(goal\.coachGoalId, \{\s*\n\s*source: 'intake'/);
    expect(block).toMatch(/\.\.\.\(record\.hasDate \? \{ date: draft\.date \} : \{\}\)/);
    expect(block).toMatch(/role: record\.role,/);
    expect(block).toMatch(/localStorage\.setItem\('sqlquest_user_goals', JSON\.stringify\(merged\)\)/);
    // and the picker writes the same shape, stamped
    expect(app).toMatch(/newCoachGoalState\(goalId, \{ source: 'picker', cold: shouldPlace, placementIds: COACH_PLACEMENT_CHALLENGE_IDS, firstRun, trustFirstRun \}\)/);
    expect(app).toMatch(/goalSource: coachState\?\.source \|\| null,/);
  });

  it('the date never leaves the browser as a date', () => {
    expect(block).toMatch(/value: step === 'date' \? null : \(skipped \? null : value\)/);
    expect(block).toMatch(/daysOut: step === 'date' && !skipped \? daysUntil\(value, Date\.now\(\)\) : null/);
    expect(block).not.toMatch(/date: intakeDateInput/);
    expect(block).not.toMatch(/date: draft\.date,/);
    expect(block).toMatch(/intakeEventPayload\(record, \{/);
  });

  it('never fires the events that give other funnels their meaning, and never mentions Pro', () => {
    for (const ev of ['goal_selected', 'prep_target_set', 'intent_captured', 'intent_routed']) {
      expect(block, `${ev} must not fire from the intake`).not.toContain(`'${ev}'`);
    }
    expect(block).not.toMatch(/\bPro\b|beginCheckout|pro_modal|price|\$\d/);
    expect(block).toMatch(/trackActivationEvent\('intake_shown', \{\}, \{ onceKey: 'intake_shown' \}\)/);
    expect(block).toMatch(/trackActivationEvent\('intake_answered', \{/);
    expect(block).toMatch(/trackActivationEvent\('intake_completed', /);
  });

  it('routing for an intake-captured intent happens after the first solve, through the same door', () => {
    expect(app).toMatch(/\} else if \(intakeRecord\?\.goal\) \{\s*\n(\s*\/\/.*\n){0,4}\s*applyIntentRouting\(getUserIntent\(\), 'intake'\);/);
    expect(app).toMatch(/const applyIntentRouting = \(intent, source = 'ask'\) =>/);
    expect(app).toMatch(/trackActivationEvent\('intent_routed', \{ intent, company: company \|\| null, source \}\)/);
    // the intake block itself must not route: routing before a solve would move first contact
    expect(block).not.toMatch(/applyIntentRouting\(/);
  });

  it('the record rides the save payload and comes back on sign-in', () => {
    expect(app).toMatch(/intake: intakeRecord,/);
    expect(app).toMatch(/setIntakeRecord\(userData\.intake\);/);
    // the date rides the autosave from state — the direct write alone was dropped by the next autosave
    expect(app).toMatch(/\.\.\.\(\(prepTarget\.company \|\| prepTarget\.date\) \? \{ prepTarget \} : \{\}\),/);
    expect(app).toMatch(/intakeRecord, prepTarget, goalsPromptDismissedAt,/);
  });

  it('shows the date back as days on the Coach radar panel, display only', () => {
    expect(app).toMatch(/data-testid="coach-days-left"/);
    const at = app.indexOf('data-testid="coach-days-left"');
    // 1,200 not 400: the P2 daily-quota block (2026-09-12) sits between the
    // call and the chip; the chip is still display only, still fed by daysUntil.
    expect(app.slice(at - 1200, at)).toMatch(/daysUntil\(prepTarget\.date, Date\.now\(\)\)/);
    expect(app.slice(at, at + 400)).not.toMatch(/setPrepPreference|onClick/);
  });

  it('copy exists in both languages', () => {
    for (const key of ['optional', 'progress', 'skip', 'goalTitle', 'goalSub', 'goalInterview', 'goalInterviewSub', 'goalJob', 'goalJobSub',
      'goalGeneral', 'goalGeneralSub', 'dateTitleInterview', 'dateTitleJob', 'dateTitleGeneral', 'dateSub', 'dateNone', 'dateContinue',
      'dateInvalid', 'roleTitle', 'roleSub', 'roleAnalyst', 'roleDataScientist', 'roleEngineer', 'roleProduct', 'roleStudent', 'roleOther', 'daysLeft']) {
      const intakeBlocks = i18n.split('    intake: {').slice(1).map(b => b.slice(0, b.indexOf('\n    },')));
      expect(intakeBlocks.length, 'intake namespace in EN and TR').toBe(2);
      for (const b of intakeBlocks) expect(b, `${key} present in both languages`).toMatch(new RegExp(`\\b${key}: '`));
    }
  });
});
