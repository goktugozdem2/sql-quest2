// The goal gate (founder, 2026-09-25): every person states a goal, a
// deadline, a target level and an industry before using the app — required,
// asked at every session start and on a ten-minute tick until answered.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  GOAL_GATE_RECHECK_MS, GOAL_GATE_GOALS, TARGET_LEVELS, INDUSTRIES, DEADLINE_PRESETS,
  isoDateInDays, isValidDeadline, missingFields, buildGoalProfile, goalProfileStatus,
  shouldShowGoalGate, prefillDraft, goalGateEventPayload, GOAL_PROFILE_VERSION,
} from '../src/utils/goal-gate.js';
import { INTAKE_GOAL_SOURCES } from '../src/utils/onboarding-intake.js';

const NOW = Date.parse('2026-09-25T10:00:00Z');
const inDays = (n) => isoDateInDays(n, NOW);
const full = { goal: 'interview', deadline: inDays(30), targetLevel: 'interview_ready', industry: 'finance', company: 'Capital One' };

describe('what is required', () => {
  it('all four answers, nothing less', () => {
    expect(missingFields({}, NOW)).toEqual(['goal', 'deadline', 'targetLevel', 'industry']);
    for (const k of ['goal', 'deadline', 'targetLevel', 'industry']) {
      const d = { ...full, [k]: null };
      expect(missingFields(d, NOW)).toEqual([k]);
      expect(buildGoalProfile(d, NOW)).toBeNull();
    }
    expect(missingFields(full, NOW)).toEqual([]);
  });

  it('a deadline is today .. two years out, and a real day', () => {
    expect(isValidDeadline(inDays(0), NOW)).toBe(true);
    expect(isValidDeadline(inDays(-1), NOW)).toBe(false);
    expect(isValidDeadline(inDays(731), NOW)).toBe(false);
    expect(isValidDeadline('2026-02-31', NOW)).toBe(false);
    expect(isValidDeadline('next month', NOW)).toBe(false);
  });

  it('the company is optional, and only for an interview', () => {
    expect(buildGoalProfile({ ...full, company: null }, NOW).company).toBeNull();
    expect(buildGoalProfile(full, NOW).company).toBe('Capital One');
    expect(buildGoalProfile({ ...full, goal: 'job' }, NOW).company).toBeNull();
    expect(buildGoalProfile({ ...full, company: 'Not A Company' }, NOW).company).toBeNull();
  });

  it('the presets are real deadlines', () => {
    for (const n of DEADLINE_PRESETS) expect(isValidDeadline(inDays(n), NOW)).toBe(true);
  });
});

describe('when it shows', () => {
  const session = { hasUser: true, dbReady: true, sessionLoading: false, now: NOW };
  const profile = buildGoalProfile(full, NOW);

  it('missing → shows; complete → does not; a past deadline → shows again', () => {
    expect(goalProfileStatus(null, NOW)).toBe('missing');
    expect(goalProfileStatus(profile, NOW)).toBe('complete');
    const later = NOW + 40 * 86400000;
    expect(goalProfileStatus(profile, later)).toBe('expired');
    expect(shouldShowGoalGate({ ...session, profile: null })).toBe(true);
    expect(shouldShowGoalGate({ ...session, profile })).toBe(false);
    expect(shouldShowGoalGate({ ...session, profile, now: later })).toBe(true);
  });

  it('a profile of another version, or with a bad field, is missing', () => {
    expect(goalProfileStatus({ ...profile, version: GOAL_PROFILE_VERSION + 1 }, NOW)).toBe('missing');
    expect(goalProfileStatus({ ...profile, industry: 'space' }, NOW)).toBe('missing');
  });

  it('never before a session, never over a running timed mock', () => {
    expect(shouldShowGoalGate({ ...session, hasUser: false, profile: null })).toBe(false);
    expect(shouldShowGoalGate({ ...session, dbReady: false, profile: null })).toBe(false);
    expect(shouldShowGoalGate({ ...session, sessionLoading: true, profile: null })).toBe(false);
    expect(shouldShowGoalGate({ ...session, inTimedMock: true, profile: null })).toBe(false);
    expect(shouldShowGoalGate({ ...session, flagOn: false, profile: null })).toBe(false);
  });

  it('re-checks every ten minutes', () => {
    expect(GOAL_GATE_RECHECK_MS).toBe(10 * 60 * 1000);
  });
});

describe('never asks what we already know', () => {
  it('prefills from the intent, the countdown target and userGoals', () => {
    const d = prefillDraft({ intent: 'job_ready', prepTarget: { date: inDays(20), company: 'Revolut' }, userGoals: { sector: 'finans' }, now: NOW });
    expect(d).toMatchObject({ goal: 'job', deadline: inDays(20), industry: 'finance', company: 'Revolut', targetLevel: null });
  });

  it('does not carry a past deadline, and an expired profile keeps everything else', () => {
    const old = buildGoalProfile({ ...full, deadline: inDays(5) }, NOW);
    const later = NOW + 10 * 86400000;
    const d = prefillDraft({ profile: old, now: later });
    expect(d.deadline).toBeNull();
    expect(d).toMatchObject({ goal: 'interview', targetLevel: 'interview_ready', industry: 'finance', company: 'Capital One' });
  });
});

describe('what an event carries', () => {
  it('days out, never the date', () => {
    const profile = buildGoalProfile(full, NOW);
    const payload = goalGateEventPayload(profile, { now: NOW, startedAt: NOW - 20000, status: 'missing', prefilled: 1 });
    expect(payload).toMatchObject({ goal: 'interview', intent: 'interview', daysOut: 30, targetLevel: 'interview_ready', industry: 'finance', hasCompany: true, seconds: 20 });
    expect(JSON.stringify(payload)).not.toContain(profile.deadline);
  });
});

describe('the app wiring (source guards)', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  const start = app.indexOf('const renderGoalGate = () => {');
  const end = app.indexOf('// ── Onboarding intake (P0-1', start);
  const gate = app.slice(start, end);

  it('renders, and is required: no close, no skip, no Escape, no backdrop dismissal', () => {
    expect(start).toBeGreaterThan(0);
    expect(app).toContain('{renderGoalGate()}');
    expect(gate).not.toMatch(/onClose|'skip'|Escape|setGoalGateDraft\(null\)/);
    expect(gate).not.toMatch(/data-goal-gate="true"[^>]*onClick/);
  });

  it('sits above every other overlay but a feedback box the person opened', () => {
    expect(gate).toContain('zIndex: 10000');
    expect(app).toContain('z-[10001]');
  });

  it('re-checks on the ten-minute tick and at every login', () => {
    expect(app).toMatch(/setInterval\(\(\) => setGoalGateNow\(Date\.now\(\)\), GOAL_GATE_RECHECK_MS\)/);
    expect(app).toMatch(/useEffect\(\(\) => \{ setGoalGateNow\(Date\.now\(\)\); \}, \[currentUser\]\)/);
  });

  it('the answers ride the autosave and the session restore', () => {
    expect(app).toMatch(/goalProfile \? \{ goalProfile \} : \{\}/);
    expect(app).toMatch(/intakeRecord, goalProfile, prepTarget/);
    expect(app).toContain('userData.goalProfile && typeof userData.goalProfile');
  });

  it('writes through the intake path with its own source', () => {
    expect(INTAKE_GOAL_SOURCES).toContain('gate');
    expect(app).toContain("goalSource: 'gate'");
    expect(app).toContain("record.goalSource === 'gate' ? 'goal_gate' : 'intake'");
  });

  it('is on', () => {
    const flags = fs.readFileSync(new URL('../src/data/feature-flags.js', import.meta.url), 'utf8');
    expect(flags).toMatch(/\n\s*goalGate: true,/);
  });
});

describe('every label exists in both languages', () => {
  const keys = [
    'eyebrow', 'title', 'titleExpired', 'sub', 'goalQ', 'deadlineQ', 'deadlineQInterview', 'pickDate', 'daysOut',
    'levelQ', 'industryQ', 'companyQ', 'companyOptional', 'companyNone', 'submit', 'stillNeeded', 'required', 'login', 'edit',
    ...DEADLINE_PRESETS.map(n => `in${n}`),
    ...TARGET_LEVELS.flatMap(l => [`level_${l}`, `level_${l}Sub`]),
    ...INDUSTRIES.map(i => `ind_${i.id}`),
    ...['goal', 'deadline', 'targetLevel', 'industry'].map(f => `f_${f}`),
  ];
  // Read the source blocks, not t(): t() falls back to English, which would
  // pass a missing Turkish key.
  const i18n = fs.readFileSync(new URL('../src/utils/i18n.js', import.meta.url), 'utf8');
  const blocks = i18n.split('    goalGate: {').slice(1).map(b => b.slice(0, b.indexOf('\n    },')));
  it('en and tr each carry one goalGate block', () => {
    expect(blocks).toHaveLength(2);
  });
  blocks.forEach((block, i) => {
    it(['en', 'tr'][i], () => {
      for (const k of keys) expect(block, `${['en', 'tr'][i]}.goalGate.${k}`).toMatch(new RegExp(`\\n\\s+${k}: '`));
      for (const g of GOAL_GATE_GOALS) expect(g).toMatch(/^(interview|job|general)$/);
    });
  });
});
