// Tournament arm D — the interview sprint, 2026-11-26. Pure half
// src/utils/single-path.js (the sprint section); wiring src/app.jsx; plan
// docs/plans/first-session-tournament-2026-11-26.md §4; the roadmap is
// src/utils/personal-roadmap.js. Against the LIVE bank.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  SPRINT_ARM, SPRINT_LENGTHS, emptyPathState, normalizePathState, pathUiFlags, normalizeSprint, startSprint,
  sprintDay, sprintDayModel, sprintTabsOpen, roadmapProfileFor, composePathPlan, logStepDone, companyFromSlug, nextPlanStep,
} from '../src/utils/single-path.js';
import { buildRoadmap } from '../src/utils/personal-roadmap.js';
import { buildVisitorProfile, tournamentBehaviour } from '../src/utils/tournament.js';
import { tournamentArmById } from '../src/data/tournament-arms.js';
import { INTAKE_COMPANIES } from '../src/utils/onboarding-intake.js';
import { FREE_SOLVE_QUOTA } from '../src/utils/free-tier-boundary.js';
import { t, _resetLangCache } from '../src/utils/i18n.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APP = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');

let bank;
let opts;
beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  globalThis.window.location = globalThis.window.location || { search: '' };
  await import('../src/data/feature-flags.js');
  await import('../src/data/challenges.js');
  await import('../src/data/sector-challenges.js');
  await import('../src/data/challenge-companies.js');
  await import('../src/data/mock-interviews.js');
  await import('../src/data/goals.js');
  await import('../src/data/debug-challenges.js');
  bank = globalThis.window.challengesData;
  opts = { companyMap: globalThis.window.challengeCompanies, mocks: globalThis.window.mockInterviewsData, goals: globalThis.window.coachGoals };
});

const TODAY = '2026-12-10';
const sprintState = (sprint) => normalizePathState({ ...emptyPathState(), sprint });
const planFor = (state, visitor = { device: 'desktop' }) => {
  const roadmap = buildRoadmap(roadmapProfileFor({ arm: SPRINT_ARM, visitor, state, solvedIds: new Set(), companies: INTAKE_COMPANIES }), bank, opts);
  return { roadmap, plan: composePathPlan({ roadmap, ladder: null, solved: new Set(), solvedCount: 0, now: 1 }) };
};

describe('arm D is built', () => {
  it('the registry marks D built and the arm runs itself', () => {
    expect(tournamentArmById(SPRINT_ARM).built).toBe(true);
    expect(tournamentBehaviour(SPRINT_ARM)).toBe(SPRINT_ARM);
  });
  it('the sprint screen comes first — unless a link\'s challenge is open; tabs and asks wait', () => {
    const s = emptyPathState();
    expect(pathUiFlags({ behaviour: SPRINT_ARM, state: s, hasChallenge: false, today: TODAY }))
      .toMatchObject({ active: true, sprint: true, sprintSetup: true, hideTabs: true, suppressAsks: true, ladderActive: false, companyDirect: false, fixedRunBar: true });
    expect(pathUiFlags({ behaviour: SPRINT_ARM, state: s, hasChallenge: true, today: TODAY }).sprintSetup).toBe(false);
  });
});

describe('the sprint — one tap each, its own field, never a date', () => {
  it('7 / 14 / no date; the company or null; a learner\'s goal is learning', () => {
    expect(SPRINT_LENGTHS).toEqual([7, 14]);
    expect(startSprint({ company: 'Stripe', companySource: 'door', days: 7, daysSource: 'tap', today: TODAY, now: 5 }))
      .toEqual({ company: 'Stripe', companySource: 'door', goal: 'interview', days: 7, daysSource: 'tap', startDay: TODAY, setAt: 5 });
    expect(startSprint({ companySource: 'learning', goal: 'learning', daysSource: 'no_date', today: TODAY, now: 5 }))
      .toMatchObject({ company: null, goal: 'learning', days: null });
    expect(normalizeSprint({ days: 30, startDay: TODAY, setAt: 1 }).days).toBe(null);
    expect(normalizeSprint({ startDay: TODAY })).toBe(null);
  });
  it('the sprint\'s length reaches the roadmap as days, never as a date', () => {
    const p = roadmapProfileFor({ arm: SPRINT_ARM, state: sprintState(startSprint({ company: 'Capital One', days: 7, today: TODAY, now: 1 })), companies: INTAKE_COMPANIES });
    expect(p).toMatchObject({ company: 'Capital One', goal: 'interview', deadlineDays: 7 });
    expect(JSON.stringify(p)).not.toMatch(/date|prepTarget/i);
    const none = roadmapProfileFor({ arm: SPRINT_ARM, state: sprintState(startSprint({ company: 'Capital One', today: TODAY, now: 1 })) });
    expect(none.deadlineDays).toBeUndefined();
  });
  it('app.jsx: the sprint writes prepTarget.company only — never prepTarget.date', () => {
    const a = APP.indexOf('const pathFinishSprint = (');
    const body = APP.slice(a, APP.indexOf('\n  };\n', a));
    expect(body).toContain('if (company) setPrepPreference({ company });');
    expect(body.match(/setPrepPreference\(/g)).toHaveLength(1);
    expect(body).not.toMatch(/date\s*:/);
    expect(body).not.toMatch(/PREP_TARGET_KEY|prepTarget\.date/);
  });
});

describe('the plan — a company sprint, a learner\'s sprint, the day count', () => {
  it('Capital One, 7 days: the company\'s set, three a day, the wall at the 10th solve', () => {
    const { plan } = planFor(sprintState(startSprint({ company: 'Capital One', companySource: 'tap', days: 7, today: TODAY, now: 1 })));
    expect(plan.profile).toMatchObject({ company: 'Capital One', scope: 'company', deadlineDays: 7, deadlineSource: 'stated', goal: 'interview' });
    expect(plan.dailyCount).toBe(3);
    expect(plan.wallAt).toBe(FREE_SOLVE_QUOTA);
    expect(plan.steps[plan.length - 1]).toMatchObject({ kind: 'mock', mockId: 'capital-one-codesignal' });
  });
  it('a learner ("Just learning", or "Not sure yet" with no interview signal) gets a fundamentals sprint — never empty, never company-only', () => {
    for (const companySource of ['learning', 'undecided', 'skipped']) {
      const { plan } = planFor(sprintState(startSprint({ companySource, goal: 'learning', today: TODAY, now: 1 })), { device: 'desktop', interviewTarget: false });
      expect(plan.profile).toMatchObject({ goal: 'learning', scope: 'goal', company: null, level: 'brand-new' });
      expect(plan.length).toBeGreaterThanOrEqual(12);
      expect(plan.steps.some(s => s.kind === 'mock')).toBe(false);
      expect(plan.steps[0].challengeId).toBe(91);
      expect(plan.wallAt).toBe(FREE_SOLVE_QUOTA);
      expect(nextPlanStep(plan, { solved: new Set() }).step.challengeId).toBe(91);
    }
  });
  it('"Not sure yet" from an interview door keeps the interview goal without a company', () => {
    const p = roadmapProfileFor({ arm: SPRINT_ARM, visitor: { interviewTarget: true }, state: sprintState(startSprint({ companySource: 'undecided', goal: 'interview', today: TODAY, now: 1 })) });
    expect(p.goal).toBe('interview');
    expect(p.company).toBeUndefined();
  });
  it('Day d of D · n today, and the strip', () => {
    const { plan } = planFor(sprintState(startSprint({ company: 'Capital One', days: 7, today: TODAY, now: 1 })));
    let s = normalizePathState({ ...sprintState(startSprint({ company: 'Capital One', days: 7, today: TODAY, now: 1 })), plan });
    expect(sprintDay(s.sprint, '2026-12-12')).toBe(3);
    let m = sprintDayModel(s, { today: TODAY });
    expect(m).toMatchObject({ day: 1, total: 7, daily: 3, leftToday: 3 });
    expect(m.days).toHaveLength(7);
    s = logStepDone(s, { id: 98, day: TODAY });
    expect(sprintDayModel(s, { today: TODAY }).leftToday).toBe(2);
    m = sprintDayModel(s, { today: '2026-12-11' });
    expect(m.day).toBe(2);
    expect(m.days[0]).toMatchObject({ done: 1, met: false, past: true });
  });
  it('tabs come back after the first day\'s count, or at the first solve of day 2', () => {
    const { plan } = planFor(sprintState(startSprint({ company: 'Capital One', days: 7, today: TODAY, now: 1 })));
    let s = normalizePathState({ ...sprintState(startSprint({ company: 'Capital One', days: 7, today: TODAY, now: 1 })), plan });
    s = logStepDone(logStepDone(s, { id: 1001, day: TODAY }), { id: 1002, day: TODAY });
    expect(sprintTabsOpen(s, { today: TODAY })).toBe(false);
    expect(pathUiFlags({ behaviour: SPRINT_ARM, state: s, today: TODAY }).hideTabs).toBe(true);
    expect(sprintTabsOpen(logStepDone(s, { id: 1003, day: TODAY }), { today: TODAY })).toBe(true);
    expect(sprintTabsOpen(logStepDone(s, { id: 1004, day: '2026-12-11' }), { today: '2026-12-11' })).toBe(true);
    expect(pathUiFlags({ behaviour: SPRINT_ARM, state: logStepDone(s, { id: 1003, day: TODAY }), today: TODAY }).hideTabs).toBe(false);
  });
});

describe('doors (plan §3.4 / orchestrator notes 2026-11-26)', () => {
  it('a readiness arrival with ?company=Stripe prefills Stripe', () => {
    const v = buildVisitorProfile({ search: '?src=readiness&company=Stripe', viewportWidth: 1366 });
    expect(v.company).toBe('stripe');
    expect(companyFromSlug(v.company, INTAKE_COMPANIES)).toBe('Stripe');
    expect(APP).toContain("const door = companyFromSlug(visitor && visitor.company, INTAKE_COMPANIES)");
  });
  it('?company= opens the company\'s question 1 after the sprint (the direct resolver); ?challenge= opens first, the sprint after its solve', () => {
    expect(APP).toContain('const co = companyFilter && company === companyFilter && solvedChallenges.size === 0 ? companyBannerNext() : null;');
    expect(APP).toContain("if (pathUi.sprint && !st.sprint) {");
    // Next never opens a step the company view walls (the set gate, live).
    const g = APP.indexOf('const pathStepProOnly = (st) => {');
    const gate = APP.slice(g, APP.indexOf('\n  };\n', g));
    expect(gate).toMatch(/if \(st\.proOnly\) return true;\n\s+if \(st\.kind !== 'challenge' \|\| !companyFilter\) return false;\n\s+const c = /);
    expect(APP).toContain('return !!c && companySetGate({ flagOn: ftbFlag(\'companySetGate\'), isPro, companyFilter, challenge: c, scoped: companyScopedChallenges(), solved: solvedChallenges }).gated;');
    expect(APP).toMatch(/challengeGuestStartedRef\.current = true;\n\s+startGuestMode\(\);\n\s+\}\n\s+return;/);
  });
});

describe('the copy and the app wiring', () => {
  it('the sprint wall line, word for word, EN and TR', () => {
    _resetLangCache();
    globalThis.localStorage = { getItem: () => 'en', setItem() {}, removeItem() {} };
    expect(t('tournamentPath', 'sprintWall', { d: 3, D: 14, company: 'Capital One' })).toBe('Day 3 of 14 — the rest of your Capital One sprint is Pro.');
    globalThis.localStorage = { getItem: () => 'tr', setItem() {}, removeItem() {} };
    _resetLangCache();
    expect(t('tournamentPath', 'sprintWall', { d: 3, D: 14, company: 'Capital One' })).toBe("14 günün 3. günü — Capital One sprint'inin geri kalanı Pro'da.");
    delete globalThis.localStorage;
    _resetLangCache();
    expect(APP).toContain("if (day) return i18n_t('tournamentPath', 'sprintWall', { d: day.day, D: day.total, company: st.sprint.company });");
  });
  it('the sprint screen renders only under pathUi.sprintSetup; its hooks sit above the early returns', () => {
    expect(APP).toContain('{pathUi.sprintSetup && renderPathSprintSetup()}');
    expect((APP.match(/renderPathSprintSetup\(\)/g) || []).length).toBe(1);
    const early = APP.indexOf('  if (showAuth) {');
    for (const h of ['const [pathSprintPick, setPathSprintPick] = useState(null);', 'const pathFinishSprint = (', 'const pathSprintShownRef = useRef(false);',
      "if (!pathUi.sprint || !pathUi.hideTabs || !pathState.plan || isSessionLoading || !currentUser || !dbReady || currentChallenge) return;"]) {
      const i = APP.indexOf(h);
      expect(i, h).toBeGreaterThan(0);
      expect(i, h).toBeLessThan(early);
    }
    expect(APP).not.toMatch(/'D_interview_sprint'/);
  });
  it('the events', () => {
    for (const ev of ['tournament_sprint_shown', 'tournament_sprint_set', 'tournament_plan_shown', 'tournament_tabs_revealed']) expect(APP).toContain(`pathEvent('${ev}'`);
  });
});
