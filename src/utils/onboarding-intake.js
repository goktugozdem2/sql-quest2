// Onboarding intake — three optional questions before the placement quiz
// (P0-1 on the founder's 2026-09-12 list): what brings you here, by when,
// and what you do. Every step can be skipped; skipping all three is a
// completed intake, not an abandoned one, and nobody is asked twice.
//
// This module is the pure half. app.jsx decides WHEN (a first-run user on
// the Learning Path tab, before the quiz, behind `onboardingIntake`); this
// decides WHAT each answer means and what is recorded.
//
// Where the answers go — three stores that already exist, no fourth:
//   goal → `sqlquest_user_intent` (the intent the post-solve ask collects)
//          and the Coach goal it maps to, stamped `source: 'intake'` so the
//          09-26 Coach read and the 11-24 goal split can tell an intake goal
//          from one chosen on the picker;
//   date → `prepTarget.date`, the countdown card's own store;
//   role → `userGoals.role`, the mentor's field, as a fixed key.
// The record itself (`sqlquest_intake_v1`, mirrored to userData.intake)
// holds what was asked and what was skipped — never the date. Events carry
// `daysOut`, an integer, the way `prep_target_set` does.
//
// The goal is optional by design and is never a step toward checkout
// (ledger: "goal-setting: a marker of a deadline, or something we can
// manufacture?"). Nothing here reads or writes anything about Pro.

import { daysUntil } from './interview-prep.js';
import { coachPlacementFor } from './placement.js';

export const INTAKE_KEY = 'sqlquest_intake_v1';
export const INTAKE_VERSION = 1;
export const INTAKE_STEPS = ['goal', 'date', 'role'];
export const INTAKE_MAX_DAYS_OUT = 730;

export const INTAKE_GOALS = [
  // id is what the record and events carry; intent is the value the
  // post-solve ask writes (`interview` / `job_ready` / `learning`), so the
  // two doors agree; coachGoalId is a live id in src/data/goals.js.
  { id: 'interview', intent: 'interview', coachGoalId: 'interview-prep', emoji: '🎯' },
  { id: 'job', intent: 'job_ready', coachGoalId: 'analyst-day-one', emoji: '💼' },
  { id: 'general', intent: 'learning', coachGoalId: 'fundamentals', emoji: '📚' },
];

export const INTAKE_ROLES = ['analyst', 'data_scientist', 'engineer', 'product', 'student', 'other'];

// Interview goal only (SEO plan P3.20, 2026-09-13): which company and what
// level. The company list is the app's ?company= VALID list — the names
// prepTarget.company accepts — and tests/onboarding-intake.test.js binds the
// two so a company page added there is offered here. The company goes to
// prepTarget.company (the countdown card and the readiness hook's own store);
// the level to userGoals.level, a fixed key like role.
export const INTAKE_COMPANIES = [
  'Airbnb', 'Amazon', 'Anthropic', 'Apple', 'Bloomberg', 'Capital One', 'Databricks', 'DoorDash',
  'Goldman Sachs', 'Google', 'JPMorgan', 'LinkedIn', 'Meta', 'Microsoft', 'Morgan Stanley', 'Netflix',
  'NVIDIA', 'OpenAI', 'Plaid', 'Ramp', 'Revolut', 'Shopify', 'Snowflake', 'Spotify', 'Stripe', 'Tesla',
  'TikTok', 'Uber', 'Walmart', 'Wise',
];
export const INTAKE_LEVELS = ['entry', 'mid', 'senior'];

export function isIntakeCompany(name) {
  return INTAKE_COMPANIES.includes(name);
}

export function isIntakeLevel(id) {
  return INTAKE_LEVELS.includes(id);
}

/** The steps a goal asks. An interview adds company (after goal) and level (after date). */
export function intakeStepsFor(goal) {
  return goal === 'interview' ? ['goal', 'company', 'date', 'level', 'role'] : INTAKE_STEPS;
}

export function intakeGoalFor(id) {
  return INTAKE_GOALS.find(g => g.id === id) || null;
}

export function isIntakeRole(id) {
  return INTAKE_ROLES.includes(id);
}

export function nextIntakeStep(step, goal = null) {
  const steps = intakeStepsFor(goal);
  const i = steps.indexOf(step);
  if (i < 0) return steps[0];
  return steps[i + 1] || null;
}

/** Whole days from `now` to an ISO date — the countdown card's own arithmetic. */
export const daysOut = daysUntil;

/** A date the intake accepts: a real calendar day, today or later, within two years. */
export function isValidIntakeDate(isoDate, now = Date.now()) {
  const d = daysOut(isoDate, now);
  return d !== null && d >= 0 && d <= INTAKE_MAX_DAYS_OUT;
}

/**
 * The record written when the last step is answered or skipped.
 * `skipped` lists the steps with no answer; `hasDate` stands in for the date,
 * which lives in prepTarget and is not repeated here.
 */
export function buildIntakeRecord(draft, now = Date.now()) {
  const d = draft && typeof draft === 'object' ? draft : {};
  const goal = intakeGoalFor(d.goal) ? d.goal : null;
  const role = isIntakeRole(d.role) ? d.role : null;
  const hasDate = isValidIntakeDate(d.date, now);
  const skipped = [];
  if (!goal) skipped.push('goal');
  if (!hasDate) skipped.push('date');
  if (!role) skipped.push('role');
  const interview = goal === 'interview';
  const company = interview && isIntakeCompany(d.company) ? d.company : null;
  const level = interview && isIntakeLevel(d.level) ? d.level : null;
  if (interview && !company) skipped.push('company');
  if (interview && !level) skipped.push('level');
  return {
    version: INTAKE_VERSION,
    goal,
    hasDate,
    role,
    ...(interview ? { company, level } : {}),
    skipped,
    completedAt: new Date(Number(now)).toISOString(),
  };
}

export function isIntakeComplete(record) {
  return !!(record && typeof record === 'object' && record.version >= 1 && typeof record.completedAt === 'string');
}

export function readIntakeRecord(storage) {
  try {
    const raw = storage && storage.getItem(INTAKE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isIntakeComplete(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/** What `intake_completed` carries. The date never leaves the browser as a date. */
export function intakeEventPayload(record, { draftDate = null, now = Date.now(), startedAt = null } = {}) {
  const r = record || {};
  return {
    goal: r.goal || null,
    hasDate: !!r.hasDate,
    daysOut: r.hasDate ? daysOut(draftDate, now) : null,
    role: r.role || null,
    company: r.company || null,
    level: r.level || null,
    skippedCount: Array.isArray(r.skipped) ? r.skipped.length : 0,
    seconds: startedAt ? Math.max(0, Math.round((Number(now) - Number(startedAt)) / 1000)) : null,
  };
}

/**
 * The coachState a goal choice produces — the same shape `startCoachGoal`
 * writes, plus `source`. A cold user gets the Coach's own placement, as on
 * the picker; `placementIds` is COACH_PLACEMENT_CHALLENGE_IDS from app.jsx.
 */
export function newCoachGoalState(goalId, { source = 'picker', cold = false, placementIds = [], now = Date.now(), firstRun = null, trustFirstRun = false } = {}) {
  // A trusted first-run placement replaces the Coach's own (2026-09-12):
  // src/utils/placement.js coachPlacementFor.
  const decided = coachPlacementFor({ trust: trustFirstRun, firstRun, cold, placementIds, now });
  return {
    goalId,
    startedAt: new Date(Number(now)).toISOString(),
    stepsCompleted: [],
    graduatedAt: null,
    source,
    ...(decided.placement ? { placement: decided.placement } : {}),
    ...(decided.seedFloors ? { seedFloors: decided.seedFloors } : {}),
  };
}

/**
 * Show the intake? Only on the first-run start screen, only once, only with
 * the flag on. `onStartScreen` is app.jsx's showFirstRunStart && !showZeroSqlLesson.
 */
export function shouldShowIntake({ flagOn, onStartScreen, record }) {
  return !!flagOn && !!onStartScreen && !isIntakeComplete(record);
}
