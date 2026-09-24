// The goal gate — every person states a goal before they use the app
// (founder, 2026-09-25: "herkese hedef belirttirelim hedefsiz olmasın … eğer
// yoksa her kullanıcıdan alana kadar her loginde veya her 10 dakikada bir
// alana kadar isteyelim zorunlu olsun"). Four answers, all required:
//
//   goal         what for — an interview, getting job-ready, SQL in general
//   deadline     by when (a date, today .. two years out)
//   targetLevel  what level they want to reach (the placement tiers' names)
//   industry     which industry they work in or want to
//
// plus the company, optional, when the goal is an interview.
//
// Why this exists beside the onboarding intake (src/utils/onboarding-intake.js):
// the intake is a first-run card on one tab, with everything but the goal
// skippable, behind a flag that never flipped. By 2026-09-24 two accounts in
// the product's history had ever given a date, so every deadline-shaped
// feature (the countdown, `deadlineOffer`, the outcome note) had an audience
// of about zero (docs/plans/monetization-2026-09-24.md, finding 3). The gate
// is the founder's answer: nobody is goalless, and there is no skip.
//
// When: at session start (every login, every app load) and on a ten-minute
// tick, until the profile is complete. A complete profile whose deadline has
// passed asks again, prefilled — a goal with a past date is not a goal.
// The one thing it never does is appear over a running timed mock interview;
// the next tick after the mock picks it up.
//
// This module is the pure half: what is required, what is valid, when the
// gate is due, what an event carries. app.jsx renders it and writes the
// answers into the stores that already own them (intent, prepTarget,
// userGoals, the Coach goal) — the profile record says what was answered.
// Events never carry the date, only `daysOut` (same rule as prep_target_set).

import { daysUntil } from './interview-prep.js';
import { INTAKE_GOALS, intakeGoalFor, intakeGoalForIntent, isIntakeCompany } from './onboarding-intake.js';

export const GOAL_PROFILE_KEY = 'sqlquest_goal_profile_v1';
export const GOAL_PROFILE_VERSION = 1;
export const GOAL_GATE_RECHECK_MS = 10 * 60 * 1000;
export const GOAL_GATE_MAX_DAYS_OUT = 730;

export const GOAL_GATE_GOALS = INTAKE_GOALS.map(g => g.id);   // interview | job | general

// The level they want to reach, named as the placement tiers are
// (src/utils/placement.js PLACEMENT_TIERS: Foundations / Intermediate /
// Advanced / Interview-ready), so "where you are" and "where you want to be"
// speak one language.
export const TARGET_LEVELS = ['foundations', 'intermediate', 'advanced', 'interview_ready'];

// Industries. `sector` is the app's canonical sector id where one exists
// (src/data/sectors.js: finans, e-ticaret, gayrimenkul, uretim) — the
// Practice filter, the Coach badge and the tutor's sector context read
// userGoals.sector, so an answer here personalises those at once.
export const INDUSTRIES = [
  { id: 'finance', sector: 'finans' },         // banking, fintech, insurance
  { id: 'tech', sector: null },                // software, SaaS, internet
  { id: 'ecommerce', sector: 'e-ticaret' },    // e-commerce, retail
  { id: 'healthcare', sector: null },
  { id: 'consulting', sector: null },
  { id: 'marketing', sector: null },           // marketing, media, advertising
  { id: 'real_estate', sector: 'gayrimenkul' },
  { id: 'manufacturing', sector: 'uretim' },   // manufacturing, logistics, energy
  { id: 'public', sector: null },              // public sector, education, research
  { id: 'other', sector: null },
];

// Quick deadline choices, in days from today. "Pick a date" is the fifth.
export const DEADLINE_PRESETS = [14, 30, 90, 180];

export function isGoalGateGoal(id) { return GOAL_GATE_GOALS.includes(id); }
export function isTargetLevel(id) { return TARGET_LEVELS.includes(id); }
export function industryFor(id) { return INDUSTRIES.find(i => i.id === id) || null; }
export function isIndustry(id) { return !!industryFor(id); }

/** YYYY-MM-DD for `days` from `now`, in the browser's local calendar. */
export function isoDateInDays(days, now = Date.now()) {
  const d = new Date(Number(now));
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + Number(days));
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** A deadline the gate accepts: a real day, today or later, within two years. */
export function isValidDeadline(isoDate, now = Date.now()) {
  const d = daysUntil(isoDate, now);
  return d !== null && d >= 0 && d <= GOAL_GATE_MAX_DAYS_OUT;
}

/** Which required answers a draft is still missing, in the order the form asks them. */
export function missingFields(draft, now = Date.now()) {
  const d = draft && typeof draft === 'object' ? draft : {};
  const out = [];
  if (!isGoalGateGoal(d.goal)) out.push('goal');
  if (!isValidDeadline(d.deadline, now)) out.push('deadline');
  if (!isTargetLevel(d.targetLevel)) out.push('targetLevel');
  if (!isIndustry(d.industry)) out.push('industry');
  return out;
}

/** The profile written on submit — or null while anything required is missing. */
export function buildGoalProfile(draft, now = Date.now()) {
  if (missingFields(draft, now).length) return null;
  const d = draft;
  const company = d.goal === 'interview' && isIntakeCompany(d.company) ? d.company : null;
  return {
    version: GOAL_PROFILE_VERSION,
    goal: d.goal,
    deadline: d.deadline,
    targetLevel: d.targetLevel,
    industry: d.industry,
    company,
    completedAt: new Date(Number(now)).toISOString(),
  };
}

/** 'missing' (no usable profile), 'expired' (its deadline has passed) or 'complete'. */
export function goalProfileStatus(profile, now = Date.now()) {
  const p = profile && typeof profile === 'object' ? profile : null;
  if (!p || p.version !== GOAL_PROFILE_VERSION) return 'missing';
  if (!isGoalGateGoal(p.goal) || !isTargetLevel(p.targetLevel) || !isIndustry(p.industry)) return 'missing';
  const days = daysUntil(p.deadline, now);
  if (days === null) return 'missing';
  if (days < 0) return 'expired';
  return 'complete';
}

/**
 * Whether the gate shows right now. It needs a session (a user, the database
 * ready, the session loaded); it never covers a running timed mock; otherwise
 * it shows whenever the profile is not complete. There is no dismissal state
 * on purpose — the founder's rule is that it is required.
 */
export function shouldShowGoalGate({ flagOn = true, hasUser, dbReady, sessionLoading, inTimedMock = false, profile, now = Date.now() } = {}) {
  if (!flagOn || !hasUser || !dbReady || sessionLoading) return false;
  if (inTimedMock) return false;
  return goalProfileStatus(profile, now) !== 'complete';
}

/**
 * A draft prefilled from what the person already told us elsewhere — the
 * intent, the countdown target, userGoals, an expired profile — so nobody is
 * asked for something we know. A past deadline is not carried.
 */
export function prefillDraft({ profile = null, intent = null, prepTarget = null, userGoals = null, now = Date.now() } = {}) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const pt = prepTarget && typeof prepTarget === 'object' ? prepTarget : {};
  const ug = userGoals && typeof userGoals === 'object' ? userGoals : {};
  const goal = isGoalGateGoal(p.goal) ? p.goal : (intent ? intakeGoalForIntent(intent) : null);
  const deadlineCandidate = isValidDeadline(p.deadline, now) ? p.deadline : (isValidDeadline(pt.date, now) ? pt.date : null);
  const industryFromSector = ug.sector ? (INDUSTRIES.find(i => i.sector && i.sector === ug.sector) || {}).id || null : null;
  return {
    goal: goal || null,
    deadline: deadlineCandidate,
    targetLevel: isTargetLevel(p.targetLevel) ? p.targetLevel : (isTargetLevel(ug.targetLevel) ? ug.targetLevel : null),
    industry: isIndustry(p.industry) ? p.industry : (isIndustry(ug.industry) ? ug.industry : industryFromSector),
    company: isIntakeCompany(p.company) ? p.company : (isIntakeCompany(pt.company) ? pt.company : null),
  };
}

/** What `goal_gate_completed` carries. The date never leaves the browser as a date. */
export function goalGateEventPayload(profile, { now = Date.now(), startedAt = null, status = 'missing', prefilled = 0 } = {}) {
  const p = profile || {};
  return {
    goal: p.goal || null,
    intent: intakeGoalFor(p.goal)?.intent || null,
    daysOut: daysUntil(p.deadline, now),
    targetLevel: p.targetLevel || null,
    industry: p.industry || null,
    hasCompany: !!p.company,
    company: p.company || null,
    status,
    prefilled,
    seconds: startedAt ? Math.max(0, Math.round((Number(now) - Number(startedAt)) / 1000)) : null,
  };
}

export function readGoalProfile(storage) {
  try {
    const raw = storage && storage.getItem(GOAL_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
