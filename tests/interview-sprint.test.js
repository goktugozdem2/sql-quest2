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
  SINGLE_PATH_ARM, SPRINT_PROBE_STEPS, sprintLevelSource, sprintPlanMarks, sprintProbeRecord, pathWhyLines, planProgress, LADDER_FAST_SECS,
  fitPlanToLength,
} from '../src/utils/single-path.js';
import { buildRoadmap } from '../src/utils/personal-roadmap.js';
import { buildVisitorProfile, tournamentBehaviour } from '../src/utils/tournament.js';
import { tournamentArmById } from '../src/data/tournament-arms.js';
import { INTAKE_COMPANIES } from '../src/utils/onboarding-intake.js';
import { FREE_SOLVE_QUOTA } from '../src/utils/free-tier-boundary.js';
import { t, _resetLangCache } from '../src/utils/i18n.js';
import { levelForLadder } from '../src/utils/placement.js';

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
const planFor = (state, visitor = { device: 'desktop' }, { lead = [], solved = new Set() } = {}) => {
  const roadmap = buildRoadmap(roadmapProfileFor({ arm: SPRINT_ARM, visitor, state, solvedIds: solved, companies: INTAKE_COMPANIES }), bank, opts);
  return { roadmap, plan: composePathPlan({ roadmap, ladder: null, lead, solved, solvedCount: solved.size, now: 1 }) };
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
      .toEqual({ company: 'Stripe', companySource: 'door', goal: 'interview', days: 7, daysSource: 'tap', startDay: TODAY, setAt: 5, probe: [], levelId: null });
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
    expect(APP).toContain('return !!c && companySetGate({ flagOn: ftbFlag(\'companySetGate\'), isPro, companyFilter, authored: companyHasAuthoredSet(companyFilter), challenge: c, scoped: companyScopedChallenges(), solved: solvedChallenges }).gated;');
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
      "if (!pathUi.active || pathUi.ladderActive || !pathUi.hideTabs || !pathState.plan || isSessionLoading || !currentUser || !dbReady || currentChallenge) return;"]) {
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

// ── Walk fixes, 2026-11-26 (the orchestrator's walk of #418, phone, Capital One link) ──
const coSprint = () => sprintState(startSprint({ company: 'Capital One', companySource: 'door', days: 7, today: TODAY, now: 1 }));
const byId = (id) => bank.find(c => c.id === id);

describe('D2 — a company link\'s opened question is the plan\'s step 1', () => {
  it('the link question leads (moved, never duplicated); the header\'s k/N counts it', () => {
    const { plan: before } = planFor(coSprint());
    expect(before.steps[0].challengeId).not.toBe(275); // the walk: step 1 was another question
    const { plan } = planFor(coSprint(), { device: 'desktop' }, { lead: [275] });
    expect(plan.steps[0]).toMatchObject({ kind: 'challenge', challengeId: 275, part: 'lead' });
    expect(plan.steps.filter(st => st.challengeId === 275)).toHaveLength(1);
    expect(plan.length).toBe(before.steps.some(st => st.challengeId === 275) ? before.length : before.length + 1);
    expect(nextPlanStep(plan, { solved: new Set() }).index).toBe(0);
    expect(planProgress(plan, { solved: new Set([275]) }).k).toBe(1);
  });
  it('app.jsx builds the sprint\'s plan with the link question in front, and opens that same question', () => {
    const f = APP.slice(APP.indexOf('const pathFinishSprint = ('), APP.indexOf('const pathSprintShownRef'));
    expect(f).toContain('const plan = pathBuildPlan(base, solvedChallenges, { lead: co ? [co.id] : [] });');
    expect(f.indexOf('const co = ')).toBeLessThan(f.indexOf('const plan = pathBuildPlan('));
    expect(f).toContain('if (co) pathOpenChallenge(co);');
  });
});

describe('D1 — the level is measured, or said to be assumed', () => {
  it('no readiness band: the level is assumed and the why-line says so, EN and TR', () => {
    const st = coSprint();
    expect(sprintLevelSource({ visitor: { device: 'phone' }, state: st })).toBe('assumed');
    const { plan } = planFor(st);
    const marked = sprintPlanMarks(plan, { visitor: { device: 'phone' }, state: st });
    expect(marked.assumedLevel).toBe(true);
    const en = pathWhyLines(marked, 'en');
    expect(en[en.length - 1]).toBe(`7 days, ${plan.dailyCount} a day. We assumed Intermediate; your first two answers will adjust it.`);
    expect(en.join(' ')).not.toMatch(/for your Intermediate level/);
    const tr = pathWhyLines(marked, 'tr');
    expect(tr[tr.length - 1]).toBe(`7 gün, günde ${plan.dailyCount}. Seviyeni Orta varsaydık; ilk iki cevabın bunu düzeltecek.`);
    expect(en.length).toBeLessThanOrEqual(3);
  });
  it('a readiness band sets the level: nothing assumed, no probe', () => {
    const v = { device: 'phone', readinessBand: 'high' };
    const st = coSprint();
    expect(sprintLevelSource({ visitor: v, state: st })).toBe('readiness');
    const { plan } = planFor(st, v);
    const marked = sprintPlanMarks(plan, { visitor: v, state: st });
    expect(marked.assumedLevel).toBe(false);
    expect(marked.profile).toMatchObject({ level: 'working', levelSource: 'readiness' });
    expect(pathWhyLines(marked, 'en').join(' ')).not.toMatch(/assumed/);
    expect(sprintProbeRecord(st, { visitor: v, challenge: byId(275), secs: 10 }).state.sprint.probe).toHaveLength(0);
  });
  it('the first two plan steps solved are read with the ladder\'s thresholds; the second sets the level', () => {
    expect(SPRINT_PROBE_STEPS).toBe(2);
    const v = { device: 'phone' };
    let r = sprintProbeRecord(coSprint(), { visitor: v, challenge: byId(275), wrongs: 0, hint: false, secs: 30 });
    expect(r.levelId).toBeNull();
    expect(r.state.sprint.probe).toHaveLength(1);
    // the same step again is not read twice
    expect(sprintProbeRecord(r.state, { visitor: v, challenge: byId(275), secs: 30 }).state.sprint.probe).toHaveLength(1);
    const second = sprintProbeRecord(r.state, { visitor: v, challenge: byId(276), wrongs: 0, hint: false, secs: 30 });
    expect(second.levelId).toBe(levelForLadder(second.state.sprint.probe));
    expect(second.state.sprint.levelId).toBe(second.levelId);
    // both fast at their rungs — not "assumed Intermediate" by default any more
    expect(second.state.sprint.probe.map(o => o.outcome)).toEqual(['fast', 'fast']);
    // slow, hinted solves on two Easy basics read as Foundations
    let slow = sprintProbeRecord(coSprint(), { visitor: v, challenge: byId(91), hint: true, secs: LADDER_FAST_SECS[0] + 60 }).state;
    slow = sprintProbeRecord(slow, { visitor: v, challenge: byId(93), wrongs: 3, secs: null });
    expect(slow.levelId).toBe('brand-new');
    // a third solve changes nothing
    const third = sprintProbeRecord(second.state, { visitor: v, challenge: byId(277), secs: 1 });
    expect(third.levelId).toBeNull();
    expect(third.state.sprint.probe).toHaveLength(2);
    // stored and read back
    expect(normalizePathState(JSON.parse(JSON.stringify(second.state))).sprint).toMatchObject({ levelId: second.levelId, probe: second.state.sprint.probe });
  });
  it('the re-plan: the measured level reaches the roadmap, the two done steps lead, the source is the probe', () => {
    const v = { device: 'phone' };
    let st = sprintProbeRecord(coSprint(), { visitor: v, challenge: byId(91), hint: true, secs: 900 }).state;
    st = sprintProbeRecord(st, { visitor: v, challenge: byId(93), hint: true, secs: 900 }).state;
    expect(st.sprint.levelId).toBe('brand-new');
    expect(roadmapProfileFor({ arm: SPRINT_ARM, visitor: v, state: st }).level).toBe('brand-new');
    const solved = new Set([91, 93]);
    const { plan } = planFor(st, v, { lead: [91, 93], solved });
    const marked = sprintPlanMarks(plan, { visitor: v, state: st });
    expect(marked.steps.slice(0, 2).map(x => x.challengeId)).toEqual([91, 93]);
    expect(marked.profile).toMatchObject({ level: 'brand-new', levelSource: 'sprint_probe' });
    expect(marked.assumedLevel).toBe(false);
    expect(planProgress(marked, { solved }).k).toBe(2);
  });
  it('app.jsx: the probe runs on D\'s plan-step solves and re-plans at the second', () => {
    expect(APP).toContain('const probed = sprintProbeRecord(next, { visitor, challenge, wrongs, hint, secs });');
    expect(APP).toContain('replanned = pathBuildPlan(next, newSolved, { lead: next.sprint.probe.map(o => o.challengeId) });');
    expect(APP).toContain('if (replanned) next = { ...next, plan: replanned };');
    // …and the state that carries the new plan is the one saved.
    const solve = APP.slice(APP.indexOf('const pathOnSolve = ('), APP.indexOf('const pathSeePro = ('));
    const at = solve.indexOf('if (replanned) next = { ...next, plan: replanned };');
    expect(at).toBeGreaterThan(0);
    expect(solve.indexOf('pathSave(next);', at)).toBeGreaterThan(at);
    expect(solve.indexOf('pathSave(next);', at) - at).toBeLessThan(400);
    expect(APP).toContain("pathEvent('tournament_sprint_level', { levelId: probed.levelId, outcomes: next.sprint.probe });");
    expect(APP).toContain("if (replanned) pathEvent('tournament_plan_shown', { ...planShownPayload(replanned, { arm: pathUi.arm, k, recompute: true }) });");
    expect(APP).toContain('return pathUi.sprint ? sprintPlanMarks(plan, { visitor, state }) : plan;');
    expect(APP).toContain('if (pathUi.sprint && !solvedChallenges.has(challenge.id)) pathOpenedRef.current = { id: challenge.id, at: Date.now() };');
  });
});

describe('D3 — one plan on screen', () => {
  it('the Coach\'s company-plan card hides while D\'s sprint line shows; never in B or control', () => {
    const { plan } = planFor(coSprint());
    const set = normalizePathState({ ...coSprint(), plan });
    expect(pathUiFlags({ behaviour: SPRINT_ARM, state: set }).hideCoachPlan).toBe(true);
    expect(pathUiFlags({ behaviour: SPRINT_ARM, state: emptyPathState() }).hideCoachPlan).toBe(false);
    expect(pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: set }).hideCoachPlan).toBe(false);
    expect(pathUiFlags({ behaviour: null, state: set }).hideCoachPlan).toBe(false);
    const card = APP.indexOf('const plan = buildPracticePlan({', APP.indexOf('Your plan (founder\'s list, 2026-09-14)'));
    expect(APP.slice(card - 300, card)).toContain('if (pathUi.hideCoachPlan) return null;');
  });
});


// #420 (fix/company-gate-signed-only, founder's go): companySetGate walls only
// a set authored for the company, and every call passes `authored:`. D's live
// gate check on sprint steps is the call #420 could not see.
describe('the sprint steps\' company-set gate passes `authored` (#420)', () => {
  it('pathStepProOnly hands companySetGate the authored flag of the company view', () => {
    const fn = APP.slice(APP.indexOf('const pathStepProOnly = (st) => {'), APP.indexOf('const pathCtx = () =>'));
    expect(fn).toContain('companySetGate({');
    expect(fn).toMatch(/\bauthored:\s*companyHasAuthoredSet\(companyFilter\)/);
  });
});

// Walk fix round 2 (2026-11-26): the re-plan after step 2 changed the plan's
// length — the header jumped 2/14 → 2/16 on a phone Capital One link.
describe('the re-plan keeps N', () => {
  const ch = (id, extra = {}) => ({ kind: 'challenge', challengeId: id, proOnly: false, part: 'free', day: 1, difficulty: null, ...extra });
  it('the walk\'s case: phone, Capital One link, two fast steps — the re-laid plan grows, the fitted one keeps N', () => {
    const v = { device: 'phone' };
    const { plan } = planFor(coSprint(), v, { lead: [275] });
    const second = plan.steps[1].challengeId;
    let st = sprintProbeRecord(coSprint(), { visitor: v, challenge: byId(275), secs: 30 }).state;
    st = sprintProbeRecord(st, { visitor: v, challenge: byId(second), secs: 30 }).state;
    expect(st.sprint.levelId).toBeTruthy();
    const solved = new Set([275, second]);
    const re = sprintPlanMarks(planFor(st, v, { lead: [275, second], solved }).plan, { visitor: v, state: st });
    expect(re.length).not.toBe(plan.length); // what the walk saw (14 → 16)
    const fit = fitPlanToLength(re, plan.length, { previous: plan, solved, solvedCount: 2 });
    expect(fit.length).toBe(plan.length);
    expect(fit.steps).toHaveLength(plan.length);
    expect(fit.resizedFrom).toBeNull();
    expect(fit.steps.slice(0, 2).map(x => x.challengeId)).toEqual([275, second]);
    expect(fit.profile).toMatchObject({ levelSource: 'sprint_probe' });
    expect(planProgress(fit, { solved }).k).toBe(2);
    // No step twice; the Pro mock (if any) survives.
    const keys = fit.steps.map(x => (x.kind === 'mock' ? `m:${x.mockId}` : `c:${x.challengeId}`));
    expect(new Set(keys).size).toBe(keys.length);
    expect(fit.steps.filter(x => x.kind === 'mock').length).toBe(re.steps.filter(x => x.kind === 'mock').length);
    expect(pathWhyLines(fit, 'en').join(' ')).not.toMatch(/Plan updated/);
  });
  it('longer: the tail goes — never a lead step, a solved one or the mock', () => {
    const re = { steps: [ch(1, { part: 'lead' }), ch(2, { part: 'lead' }), ch(3), ch(4), { kind: 'mock', mockId: 'm', proOnly: true, part: 'mock', day: 2 }, ch(5, { part: 'after_wall', proOnly: true }), ch(6, { part: 'after_wall', proOnly: true })], length: 7, why: [] };
    const fit = fitPlanToLength(re, 4, { solved: [1, 2] });
    expect(fit.steps.map(x => x.challengeId || x.mockId)).toEqual([1, 2, 3, 'm']);
    expect(fit.length).toBe(4);
    // An unsolved lead step (the link's question before it is answered) stays even when N cannot be reached.
    const tight = fitPlanToLength(re, 2, { solved: [1] });
    expect(tight.steps.map(x => x.challengeId || x.mockId)).toEqual([1, 2, 'm']);
    expect(tight.resizedFrom).toBe(2);
  });
  it('shorter: the previous plan\'s unsolved steps fill it, before the part past the wall', () => {
    const prev = { steps: [ch(1, { part: 'lead' }), ch(7), ch(8), ch(9)], length: 4 };
    const re = { steps: [ch(1, { part: 'lead' }), ch(2, { part: 'lead' }), ch(3, { part: 'after_wall', proOnly: true })], length: 3, why: [] };
    const fit = fitPlanToLength(re, 5, { previous: prev, solved: [1, 2] });
    expect(fit.steps.map(x => x.challengeId)).toEqual([1, 2, 7, 8, 3]);
    expect(fit.resizedFrom).toBeNull();
  });
  it('when it cannot keep N it says so: "Plan updated for your level: N steps" (EN and TR)', () => {
    const re = { steps: [ch(1, { part: 'lead' }), ch(2, { part: 'lead' })], length: 2, why: ['Built for you.'], profile: { level: 'working' }, dailyCount: 2, planDays: 1 };
    const fit = fitPlanToLength(re, 5, { previous: { steps: [ch(1), ch(2)] }, solved: [1, 2] });
    expect(fit).toMatchObject({ length: 2, resizedFrom: 5 });
    expect(pathWhyLines(fit, 'en')).toContain('Plan updated for your level: 2 steps.');
    expect(pathWhyLines(fit, 'tr')).toContain('Plan seviyene göre güncellendi: 2 adım.');
    expect(normalizePathState({ ...emptyPathState(), plan: fit }).plan.resizedFrom).toBe(5);
  });
  it('app.jsx: the level re-plan is fitted to the old N before it is saved', () => {
    const solve = APP.slice(APP.indexOf('const pathOnSolve = ('), APP.indexOf('const pathSeePro = ('));
    const fit = solve.indexOf('if (replanned) replanned = fitPlanToLength(replanned, plan.length, { previous: plan, solved: newSolved, solvedCount: newSolved.size, quotaOn: freeQuotaOn() && !isPro });');
    expect(fit).toBeGreaterThan(0);
    expect(fit).toBeLessThan(solve.indexOf('if (replanned) next = { ...next, plan: replanned };'));
  });
});
