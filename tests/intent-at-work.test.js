// "I use SQL at work" — the `at_work` intent answer (Moving up U2,
// 2026-11-25), behind `intentAtWork`. Pins: flag off is today's ask and
// today's event byte for byte; flag on adds `at_work` last and stamps
// `atWorkOffered`; it is stored through setUserIntent like the others; it is
// not a hiring intent and is not routed (routes like `learning`); the intake /
// returning-ask goal choices offer it only with the flag; the `?goal=` link
// door and the goal gate keep their three; both languages carry the label;
// the flag ships off.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  INTENT_AT_WORK_FLAG, AT_WORK_INTENT, AT_WORK_LABEL, INTENT_ASK_CHOICES, AT_WORK_ASK_CHOICE,
  intentAskChoices, intentCapturedPayload,
} from '../src/utils/intent-at-work.js';
import {
  INTAKE_GOALS, INTAKE_AT_WORK_GOAL, intakeGoalChoices, intakeGoalFor, intakeGoalForIntent, buildIntakeRecord,
} from '../src/utils/onboarding-intake.js';
import { GOAL_GATE_GOALS } from '../src/utils/goal-gate.js';
import { HIRING_INTENTS, interviewNavReason } from '../src/utils/interview-nav.js';
import { isInterviewPerson } from '../src/utils/interview-first.js';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

describe('the post-solve ask', () => {
  it('flag off: the three answers as they were, in order', () => {
    expect(intentAskChoices({ atWork: false })).toEqual([
      ['interview', '🎯', "I'm preparing for an interview at a specific company"],
      ['job_ready', '💼', 'Getting job-ready or switching careers'],
      ['learning', '📚', 'Learning SQL for my job or school'],
    ]);
    expect(intentAskChoices()).toBe(INTENT_ASK_CHOICES);
  });

  it('flag on: at_work is a fifth answer, last, with the plan’s label', () => {
    const on = intentAskChoices({ atWork: true });
    expect(on.length).toBe(4);
    expect(on.slice(0, 3)).toEqual(INTENT_ASK_CHOICES);
    expect(on[3]).toEqual(AT_WORK_ASK_CHOICE);
    expect(AT_WORK_INTENT).toBe('at_work');
    expect(AT_WORK_LABEL).toBe('I use SQL at work and want to move up');
  });

  it('intent_captured: today’s payload with the flag off; atWorkOffered with it on', () => {
    expect(intentCapturedPayload('learning', 'ask')).toEqual({ intent: 'learning', source: 'ask' });
    expect(intentCapturedPayload('exploring', 'ask', { atWork: false })).toEqual({ intent: 'exploring', source: 'ask' });
    expect(intentCapturedPayload('at_work', 'ask', { atWork: true })).toEqual({ intent: 'at_work', source: 'ask', atWorkOffered: true });
    expect(intentCapturedPayload('interview', 'ask', { atWork: true })).toEqual({ intent: 'interview', source: 'ask', atWorkOffered: true });
  });
});

describe('what at_work is not', () => {
  it('not a hiring intent: no Interview tab, not an interview person', () => {
    expect(HIRING_INTENTS.has(AT_WORK_INTENT)).toBe(false);
    expect(interviewNavReason({ intent: AT_WORK_INTENT })).toBeNull();
    expect(isInterviewPerson({ intent: AT_WORK_INTENT })).toBe(false);
  });
});

describe('the intake and the returning ask', () => {
  it('offer `work` only with the flag, last; the three are unchanged', () => {
    expect(intakeGoalChoices({ atWork: false })).toBe(INTAKE_GOALS);
    expect(INTAKE_GOALS.map(g => g.id)).toEqual(['interview', 'job', 'general']);
    const on = intakeGoalChoices({ atWork: true });
    expect(on.map(g => g.id)).toEqual(['interview', 'job', 'general', 'work']);
  });

  it('`work` writes the at_work intent and routes like learning (Fundamentals, a live goal)', () => {
    expect(intakeGoalFor('work')).toBe(INTAKE_AT_WORK_GOAL);
    expect(INTAKE_AT_WORK_GOAL.intent).toBe(AT_WORK_INTENT);
    expect(INTAKE_AT_WORK_GOAL.coachGoalId).toBe(intakeGoalFor('general').coachGoalId);
    expect(read('src/data/goals.js')).toMatch(new RegExp(`id: '${INTAKE_AT_WORK_GOAL.coachGoalId}'`));
    const rec = buildIntakeRecord({ goal: 'work' }, Date.parse('2026-11-25T12:00:00Z'));
    expect(rec.goal).toBe('work');
    expect(rec.skipped).toEqual(['date', 'role']);
  });

  it('the ?goal= link door and the goal gate keep their three', () => {
    expect(intakeGoalForIntent(AT_WORK_INTENT)).toBeNull();
    expect(GOAL_GATE_GOALS).toEqual(['interview', 'job', 'general']);
  });

  it('both languages carry the label', () => {
    const i18n = read('src/utils/i18n.js');
    expect(i18n.match(/^\s+goalWork: /gm) || []).toHaveLength(2);
    expect(i18n.match(/^\s+goalWorkSub: /gm) || []).toHaveLength(2);
  });
});

describe('the flag', () => {
  it('intentAtWork ships false (a missing flag would read true)', () => {
    const sb = { window: { location: { search: '' } }, URLSearchParams: globalThis.URLSearchParams, console: { log() {} } };
    vm.createContext(sb);
    vm.runInContext(read('src/data/feature-flags.js'), sb);
    expect(INTENT_AT_WORK_FLAG).toBe('intentAtWork');
    expect(sb.window.FEATURE_FLAGS.features.intentAtWork).toBe(false);
  });
});

describe('app.jsx wiring', () => {
  const app = read('src/app.jsx');
  const ask = app.slice(app.indexOf('{showIntentAsk && !showSoftEmailCapture'), app.indexOf('{showSoftEmailCapture && oneLayerOk('));

  it('the ask renders the choices through ftbFlag and stores each answer through setUserIntent', () => {
    expect(ask.length).toBeGreaterThan(500);
    expect(ask).toContain('intentAskChoices({ atWork: ftbFlag(INTENT_AT_WORK_FLAG) }).map(([key, emoji, label]) => (');
    expect(ask).toContain("setUserIntent(key, 'ask');");
    expect(ask).toContain("trackActivationEvent('intent_captured', intentCapturedPayload(key, 'ask', { atWork: ftbFlag(INTENT_AT_WORK_FLAG) }));");
    expect(ask).toContain("trackActivationEvent('intent_captured', intentCapturedPayload('exploring', 'ask', { atWork: ftbFlag(INTENT_AT_WORK_FLAG) }));");
    expect(ask).not.toMatch(/localStorage\.setItem\('sqlquest_user_intent'/);
    // no new screen: still exactly one intent ask
    expect(app.split('{showIntentAsk && !showSoftEmailCapture').length - 1).toBe(1);
  });

  it('routing acts on interview / job_ready only, so at_work routes like learning', () => {
    const body = app.slice(app.indexOf('const applyIntentRouting = (intent, source = \'ask\') => {'), app.indexOf('const QUIZ_ANSWERS = {'));
    expect(body).toContain("if (intent !== 'interview' && intent !== 'job_ready') return;");
  });

  it('the intake and the returning ask share one goal render, with the work label', () => {
    expect(app).toContain("const goalKey = { interview: 'goalInterview', job: 'goalJob', general: 'goalGeneral', work: 'goalWork' };");
    expect(app).toContain('return intakeGoalChoices({ atWork: ftbFlag(INTENT_AT_WORK_FLAG) }).map(g => (');
  });
});
