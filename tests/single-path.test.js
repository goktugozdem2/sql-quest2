// Tournament arm B — the single path ("Tek Yol"), 2026-11-26.
// Pure half src/utils/single-path.js (+ levelForLadder in placement.js);
// wiring src/app.jsx; plan docs/plans/first-session-tournament-2026-11-26.md
// §3; the roadmap is src/utils/personal-roadmap.js. Against the LIVE bank.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  SINGLE_PATH_ARM, SINGLE_PATH_KEY, LADDER_RUNGS, LADDER_LENGTH, LADDER_FAST_SECS, LADDER_STUCK_SECS, LADDER_STUCK_WRONGS,
  emptyPathState, normalizePathState, pathUiFlags, rungForChallenge, ladderOutcome, nextRung, ladderStuck,
  ladderOpen, ladderResolve, pickLadderQuestion, roadmapProfileFor, composePathPlan, planProgress,
  nextPlanStep, planEnded, planShownPayload, planIdList, logStepDone, pathWhyLines, companyFromSlug,
  pathTabsOpen, PLAN_FOCUS_STEPS,
  PATH_LAYER_TIERS, PATH_LAYER_ORDER, PATH_LAYER_HELD_ON_LADDER, PATH_LAYER_SETTLE_MS, PATH_SESSION_GAP_MS, PATH_USER_SIGNUP_REASONS,
  pathLayerSlot, pathLayerDecide, pathSessionTouch, pathInFirstSession,
  pathProAskAllowed, PATH_PRO_ASK_GAP, PATH_PRO_ASKS_SPACED,
} from '../src/utils/single-path.js';
import { levelForLadder, FIRST_RUN_PLACEMENT_SOURCES } from '../src/utils/placement.js';
import { buildRoadmap } from '../src/utils/personal-roadmap.js';
import { tournamentArmById, TOURNAMENT_CONTROL_ID, TOURNAMENT_ARMS } from '../src/data/tournament-arms.js';
import { tournamentBehaviour } from '../src/utils/tournament.js';
import { FREE_SOLVE_QUOTA, FREE_MOCK_ID } from '../src/utils/free-tier-boundary.js';
import { INTAKE_COMPANIES } from '../src/utils/onboarding-intake.js';
import { t, _resetLangCache } from '../src/utils/i18n.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const APP = read('src/app.jsx');
const MOD = read('src/utils/single-path.js');
// The module's code without its comments (the comments explain why prepTarget.date is never written).
const MOD_CODE = MOD.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

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
const byId = (id) => bank.find(c => c.id === id);
const o = (rung, outcome, extra = {}) => ({ rung, outcome, wrongs: 0, hint: false, ...extra });

// ───────────────────────────── the arm ──────────────────────────────────────

describe('arm B is built; nothing else changes', () => {
  it('the registry marks B built and the arm runs itself', () => {
    expect(tournamentArmById(SINGLE_PATH_ARM).built).toBe(true);
    expect(tournamentBehaviour(SINGLE_PATH_ARM)).toBe(SINGLE_PATH_ARM);
  });
  it('control, an unbuilt arm and no arm get every switch OFF (today\'s product)', () => {
    const dUnbuilt = TOURNAMENT_ARMS.map(a => (a.id === 'D_interview_sprint' ? { ...a, built: false } : a));
    for (const behaviour of [null, undefined, TOURNAMENT_CONTROL_ID, tournamentBehaviour('D_interview_sprint', dUnbuilt), tournamentBehaviour('C_proof_first')]) {
      const f = pathUiFlags({ behaviour, state: emptyPathState(), hasChallenge: true });
      for (const [k, v] of Object.entries(f)) expect([k, v]).toEqual([k, k === 'arm' ? null : false]);
    }
  });
  it('B: tabs hidden and the shell extended while the ladder runs; the plan line once it ends', () => {
    const s = emptyPathState();
    const on = pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: s });
    expect(on).toMatchObject({ active: true, ladderActive: true, hideTabs: true, hideGuestBanner: true, extendShell: true, showPlanLine: false, suppressAsks: true, holdLayers: true, fixedRunBar: true, holdSignupAsks: true, suppressTour: true });
    const done = { ...s, ladder: { ...s.ladder, done: true, levelId: 'basics' }, plan: { steps: [{ kind: 'challenge', challengeId: 92 }] } };
    const after = pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: normalizePathState(done) });
    expect(after).toMatchObject({ active: true, ladderActive: false, showPlanLine: true, suppressAsks: false, suppressNextStrip: true, holdSignupAsks: false, suppressTour: true });
  });
  // Walk fix B3 (2026-11-26, plan §3.5): the tab row and the guest banner
  // stay hidden after the ladder until PLAN_FOCUS_STEPS plan steps are done,
  // or the reveal is recorded ("All steps", the plan's free steps ran out).
  it('B3: after the ladder, tabs and the guest banner stay hidden until 3 plan steps (or a recorded reveal)', () => {
    expect(PLAN_FOCUS_STEPS).toBe(3);
    const s = emptyPathState();
    const ended = normalizePathState({ ...s, ladder: { ...s.ladder, done: true, levelId: 'basics' }, plan: { steps: [92, 93, 95, 97].map(id => ({ kind: 'challenge', challengeId: id })) } });
    const flags = (st) => pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: normalizePathState(st) });
    expect(flags(ended)).toMatchObject({ showPlanLine: true, hideTabs: true, hideGuestBanner: true, extendShell: true });
    expect(pathTabsOpen(ended)).toBe(false);
    let st = ended;
    for (const [i, id] of [92, 93].entries()) {
      st = logStepDone(st, { id, day: '2026-11-26' });
      expect(flags(st).hideTabs, `after ${i + 1} plan steps`).toBe(true);
    }
    st = logStepDone(st, { id: 95, day: '2026-11-26' });
    expect(flags(st)).toMatchObject({ hideTabs: false, hideGuestBanner: false, extendShell: false, showPlanLine: true });
    // "All steps" / plan end record the reveal: open at once, plan steps or not.
    expect(flags({ ...ended, tabsOpenedAt: 1 })).toMatchObject({ hideTabs: false, hideGuestBanner: false });
    // Never on the ladder, whatever is recorded.
    expect(pathTabsOpen({ ...s, tabsOpenedAt: 1, doneLog: [1, 2, 3].map(id => ({ id, day: '2026-11-26' })) })).toBe(false);
  });
  it('the ladder is a first-run placement the Coach honours', () => {
    expect(FIRST_RUN_PLACEMENT_SOURCES).toContain('first_run_ladder');
  });
});

// ───────────────────────────── the ladder ───────────────────────────────────

describe('the ladder — ids, rungs, outcomes', () => {
  it('every ladder id is in the live bank, core (no sector), not Debug, never a locked Hard', () => {
    for (const rung of LADDER_RUNGS) for (const id of rung) {
      const c = byId(id);
      expect(c, `#${id}`).toBeTruthy();
      expect(c.difficulty).not.toBe('Hard');
      expect(c.type).not.toBe('debug');
      expect(String(c.dataset || '')).not.toMatch(/^(finans_|gayrimenkul_|uretim_)/);
    }
    expect(LADDER_RUNGS[0][0]).toBe(91);
  });
  it('fast = solved, ≤ 1 wrong, no hint, inside T(rung); else solved; unsolved is stuck', () => {
    expect(ladderOutcome({ solved: true, secs: LADDER_FAST_SECS[0], rung: 0 })).toBe('fast');
    expect(ladderOutcome({ solved: true, secs: LADDER_FAST_SECS[0] + 1, rung: 0 })).toBe('solved');
    expect(ladderOutcome({ solved: true, secs: 200, rung: 1 })).toBe('fast');
    expect(ladderOutcome({ solved: true, secs: 10, wrongs: 2, rung: 0 })).toBe('solved');
    expect(ladderOutcome({ solved: true, secs: 10, wrongs: 1, rung: 0 })).toBe('fast');
    expect(ladderOutcome({ solved: true, secs: 10, hint: true, rung: 2 })).toBe('solved');
    expect(ladderOutcome({ solved: false, secs: 10, rung: 2 })).toBe('stuck');
  });
  it('fast steps up, solved stays, stuck steps down; 0 is the floor and 2 the top', () => {
    expect(nextRung(0, 'fast')).toBe(1);
    expect(nextRung(1, 'fast')).toBe(2);
    expect(nextRung(2, 'fast')).toBe(2);
    expect(nextRung(1, 'solved')).toBe(1);
    expect(nextRung(2, 'stuck')).toBe(1);
    expect(nextRung(0, 'stuck')).toBe(0);
  });
  it('B3 fires on 3 wrong submits or the rung\'s timer', () => {
    expect(ladderStuck({ wrongs: LADDER_STUCK_WRONGS, secs: 0, rung: 0 })).toBe(true);
    expect(ladderStuck({ wrongs: 2, secs: LADDER_STUCK_SECS[0] - 1, rung: 0 })).toBe(false);
    expect(ladderStuck({ wrongs: 0, secs: LADDER_STUCK_SECS[1], rung: 1 })).toBe(true);
  });
  it('the tier rules (plan §3.2 table, its typical sequences)', () => {
    expect(levelForLadder([o(0, 'fast'), o(1, 'fast'), o(2, 'fast'), o(2, 'solved', { wrongs: 1 })])).toBe('advanced');
    expect(levelForLadder([o(0, 'fast'), o(1, 'fast'), o(2, 'fast'), o(2, 'solved', { wrongs: 2 })])).toBe('working');
    expect(levelForLadder([o(0, 'fast'), o(1, 'fast'), o(2, 'stuck'), o(1, 'solved')])).toBe('working');
    expect(levelForLadder([o(0, 'fast'), o(1, 'solved'), o(1, 'stuck'), o(0, 'fast')])).toBe('basics');
    expect(levelForLadder([o(0, 'fast'), o(0, 'fast'), o(0, 'solved'), o(0, 'solved')])).toBe('basics');
    expect(levelForLadder([o(0, 'solved'), o(0, 'solved'), o(0, 'stuck'), o(0, 'solved')])).toBe('brand-new');
    expect(levelForLadder([])).toBe('brand-new');
  });
  it('a full walk: q1 #91 fast → rung 1, stuck → rung 0, set aside; four resolutions end it with a tier', () => {
    let s = ladderOpen(emptyPathState(), byId(91), 1000);
    expect(s.ladder.current).toMatchObject({ challengeId: 91, rung: 0 });
    let r = ladderResolve(s, { challengeId: 91, outcome: 'fast', secs: 40, now: 2000 });
    expect(r.step).toMatchObject({ q: 1, rung: 0, outcome: 'fast', nextRung: 1 });
    s = r.state;
    const q2 = pickLadderQuestion(s, bank, { solved: new Set([91]) });
    expect(q2.id).toBe(100);
    s = ladderOpen(s, q2, 3000);
    s = ladderResolve(s, { challengeId: 100, outcome: 'stuck', secs: 700, wrongs: 3 }).state;
    expect(s.ladder.rung).toBe(0);
    expect(s.ladder.setAside).toEqual([100]);
    const q3 = pickLadderQuestion(s, bank, { solved: new Set([91]) });
    expect(q3.id).toBe(93);
    s = ladderResolve(ladderOpen(s, q3, 4000), { challengeId: 93, outcome: 'fast' }).state;
    const q4 = pickLadderQuestion(s, bank, { solved: new Set([91, 93]) });
    expect(q4.id).toBe(105); // 100 is set aside, never re-asked on the ladder
    const end = ladderResolve(ladderOpen(s, q4, 5000), { challengeId: 105, outcome: 'fast', now: 6000 });
    expect(end.step).toMatchObject({ q: LADDER_LENGTH, done: true, levelId: 'basics' });
    expect(end.state.ladder).toMatchObject({ done: true, levelId: 'basics', current: null, endedAt: 6000 });
  });
  it('after a fast at rung 2 the next item is the next Medium of rung 2', () => {
    let s = ladderOpen(emptyPathState(), byId(168), 1);
    expect(s.ladder.rung).toBe(2);
    s = ladderResolve(s, { challengeId: 168, outcome: 'fast' }).state;
    const next = pickLadderQuestion(s, bank, { solved: new Set([168]) });
    expect(next.difficulty).toBe('Medium');
    expect(next.id).toBe(171);
  });
  it('picks in the ladder\'s own order — a reversed bank picks the same (never raw order)', () => {
    const s = ladderResolve(ladderOpen(emptyPathState(), byId(91), 1), { challengeId: 91, outcome: 'solved' }).state;
    const a = pickLadderQuestion(s, bank, { solved: new Set([91]) });
    const b = pickLadderQuestion(s, bank.slice().reverse(), { solved: new Set([91]) });
    expect(a.id).toBe(93);
    expect(b.id).toBe(a.id);
    expect(MOD).not.toMatch(/(bank|challenges|pool)\s*\.\s*find\s*\(/);
    expect(MOD).toMatch(/pickNextChallengeWith\(LADDER_ORDER/);
  });
  it('a locked question is never picked', () => {
    const s = normalizePathState({ ladder: { rung: 2 } });
    const pick = pickLadderQuestion(s, bank, { isLocked: c => c.id === 168 });
    expect(pick.id).not.toBe(168);
  });
});

describe('deep links (plan §3.4): question 1 is the link, the ladder starts at its rung', () => {
  it('?challenge= — a basics, a JOIN and a window question start at rungs 0, 1, 2', () => {
    expect(ladderOpen(emptyPathState(), byId(94), 1).ladder.rung).toBe(0);
    const join = bank.find(c => c.id === 106);
    expect(ladderOpen(emptyPathState(), join, 1).ladder.rung).toBe(1);
    expect(ladderOpen(emptyPathState(), byId(23), 1).ladder.rung).toBe(2); // a Hard preview → 2
    expect(rungForChallenge(byId(176))).toBe(1);
    expect(rungForChallenge(byId(179))).toBe(2);
  });
  it('?company= — arm B runs the `direct` arm\'s resolver; ?challenge= keeps the start-guest-and-return resolver', () => {
    expect(pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: emptyPathState() }).companyDirect).toBe(true);
    expect(APP).toContain("if ((decision.open || (pathUi.companyDirect && solvedChallenges.size === 0)) && next) {");
    // The ?challenge= resolver is untouched: guest mode first, return, open on the next run.
    expect(APP).toMatch(/challengeGuestStartedRef\.current = true;\n\s+startGuestMode\(\);\n\s+\}\n\s+return;/);
    // The ladder's own auto-open waits for a content link's resolver.
    expect(APP).toContain('if (hasContentDeepLink && !st.ladder.current && !st.ladder.outcomes.length) return;');
  });
  it('?interview= never reaches the arm (excluded at enrolment, PR 1)', () => {
    expect(read('src/utils/tournament.js')).toMatch(/if \(has\('interview'\)\) return 'excluded_interview_link';/);
  });
});

// ───────────────────────────── the plan ─────────────────────────────────────

describe('the plan — the roadmap engine, frozen, k/N, Next', () => {
  const ladderEnd = () => {
    let s = emptyPathState();
    for (const [id, out] of [[91, 'fast'], [100, 'stuck'], [93, 'fast'], [105, 'fast']]) {
      s = ladderResolve(ladderOpen(s, byId(id), 1), { challengeId: id, outcome: out }).state;
    }
    return s;
  };
  const build = (state, solved, visitor = null, quotaOn = true) => {
    const roadmap = buildRoadmap(roadmapProfileFor({ visitor, state, solvedIds: solved, companies: INTAKE_COMPANIES }), bank, { ...opts, quotaOn });
    return composePathPlan({ roadmap, ladder: state.ladder, solved, solvedCount: solved.size, quotaOn, now: 1 });
  };

  it('the ladder\'s solved questions lead; the set-aside one returns before the part past the wall', () => {
    const s = ladderEnd();
    const solved = new Set([91, 93, 105]);
    const plan = build(s, solved);
    expect(plan.steps.slice(0, 3).map(x => x.challengeId)).toEqual([91, 93, 105]);
    const back = plan.steps.findIndex(x => x.challengeId === 100);
    const firstAfter = plan.steps.findIndex(x => x.part === 'after_wall');
    expect(back).toBeGreaterThan(2);
    expect(back).toBeLessThan(firstAfter);
    expect(new Set(planIdList(plan)).size).toBe(plan.length);
    expect(planProgress(plan, { solved })).toEqual({ k: 3, n: plan.length });
  });
  it('the wall is the 10th solve; nothing Pro-only stands before it', () => {
    const s = ladderEnd();
    const solved = new Set([91, 93, 105]);
    const plan = build(s, solved);
    expect(plan.wallAt).toBe(FREE_SOLVE_QUOTA);
    expect(plan.steps.slice(0, plan.wallAt).some(x => x.proOnly)).toBe(false);
  });
  it('Next follows the plan\'s order, passes over Pro-only steps, never over a quota-gated one', () => {
    const s = ladderEnd();
    let solved = new Set([91, 93, 105]);
    const plan = build(s, solved);
    const order = [];
    for (let i = 0; i < plan.length; i++) {
      const hit = nextPlanStep(plan, { solved });
      if (!hit) break;
      expect(hit.step.proOnly).toBe(false);
      order.push(hit.index);
      if (hit.step.kind === 'challenge') solved = new Set([...solved, hit.step.challengeId]);
      else break;
    }
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const openable = plan.steps.map((x, i) => i).filter(i => !plan.steps[i].proOnly && plan.steps[i].kind === 'challenge' && ![91, 93, 105].includes(plan.steps[i].challengeId));
    // Every step that is not Pro-only, the quota-gated ones past the wall included.
    expect(order).toEqual(openable);
    expect(plan.steps.slice(plan.wallAt).some(x => !x.proOnly)).toBe(true);
  });
  it('an interview door gets its company, the free mock right after the wall and the Pro mock last', () => {
    const visitor = { door: 'company_link', company: 'capital-one', interviewTarget: true, device: 'desktop' };
    expect(companyFromSlug('capital-one', INTAKE_COMPANIES)).toBe('Capital One');
    let s = emptyPathState();
    for (const [id, out] of [[275, 'fast'], [100, 'fast'], [168, 'solved'], [171, 'stuck']]) {
      s = ladderResolve(ladderOpen(s, byId(id), 1), { challengeId: id, outcome: out }).state;
    }
    const solved = new Set([275, 100, 168]);
    const plan = build(s, solved, visitor);
    expect(plan.profile.company).toBe('Capital One');
    expect(plan.profile.goal).toBe('interview');
    const free = plan.steps.findIndex(x => x.kind === 'mock' && x.mockId === FREE_MOCK_ID);
    expect(free).toBe(plan.wallAt);
    expect(plan.steps[plan.length - 1]).toMatchObject({ kind: 'mock', mockId: 'capital-one-codesignal', proOnly: true });
  });
  it('plan end: steps remain and every one left is Pro-only (the holdout, or a Pro set)', () => {
    const plan = { steps: [{ kind: 'challenge', challengeId: 91, proOnly: false }, { kind: 'challenge', challengeId: 2, proOnly: true }, { kind: 'mock', mockId: 'x', proOnly: true }] };
    expect(planEnded(plan, { solved: new Set() })).toBe(false);
    expect(planEnded(plan, { solved: new Set([91]) })).toBe(true);
    expect(planEnded(plan, { solved: new Set([91]), isProOnly: () => false })).toBe(false);
    expect(nextPlanStep(plan, { solved: new Set([91]) })).toBe(null);
  });
  it('tournament_plan_shown carries length, dailyCount, wallAt and the ids as strings (metrics.md reads `?`)', () => {
    const s = ladderEnd();
    const plan = build(s, new Set([91, 93, 105]));
    const p = planShownPayload(plan, { arm: SINGLE_PATH_ARM, k: 3 });
    expect(p).toMatchObject({ arm: SINGLE_PATH_ARM, length: plan.length, dailyCount: plan.dailyCount, wallAt: plan.wallAt, k: 3 });
    expect(p.planIds.every(x => typeof x === 'string')).toBe(true);
    expect(p.profile).toMatchObject({ level: 'basics', levelSource: 'stated' });
  });
  it('a plan step is logged done once', () => {
    const s1 = logStepDone(emptyPathState(), { id: 92, day: '2026-11-26' });
    const s2 = logStepDone(s1, { id: 92, day: '2026-11-27' });
    expect(s2.doneLog).toEqual([{ id: 92, day: '2026-11-26' }]);
  });
  it('the roadmap never names a date: the module writes no prepTarget anywhere', () => {
    expect(MOD_CODE).not.toMatch(/prepTarget/);
    expect(MOD_CODE).not.toMatch(/localStorage|Date\.now\(|Math\.random/);
  });
});

// ───────────────────────────── the words ────────────────────────────────────

describe('the copy (founder\'s go, 2026-11-26)', () => {
  it('the wall line and its Turkish, word for word', () => {
    _resetLangCache();
    globalThis.localStorage = { getItem: () => 'en', setItem() {}, removeItem() {} };
    expect(t('tournamentPath', 'wall', { k: 10, n: 24 })).toBe('10 of 24 done — the rest of your plan is Pro.');
    globalThis.localStorage = { getItem: () => 'tr', setItem() {}, removeItem() {} };
    _resetLangCache();
    expect(t('tournamentPath', 'wall', { k: 10, n: 24 })).toBe("24 sorunun 10 tanesi tamam — planının geri kalanı Pro'da.");
    expect(t('tournamentPath', 'seePro')).toBe("Pro'yu gör");
    delete globalThis.localStorage;
    _resetLangCache();
  });
  it('why-this-plan: 2–3 lines, never Pro, in both languages', () => {
    const plan = { dailyCount: 2, why: ['a', 'b'], profile: { scope: 'goal', goal: 'learning', level: 'basics', deadlineDays: 14, deadlineSource: 'default_by_level' } };
    expect(pathWhyLines(plan, 'en')).toEqual(['a', 'b']);
    const tr = pathWhyLines(plan, 'tr');
    expect(tr.length).toBeGreaterThanOrEqual(2);
    expect(tr.join(' ')).not.toMatch(/Pro/);
  });
});

// ───────────────────────────── the app ──────────────────────────────────────

describe('app.jsx — every change sits behind a pathUi switch', () => {
  it('the hooks and helpers sit above the `showAuth` / `dbReady` early returns', () => {
    const early = Math.min(APP.indexOf('  if (showAuth) {'), APP.indexOf('  if (!dbReady) return ('));
    for (const h of ['const [pathState, setPathState] = useState(', 'const pathUi = pathUiFlags(', 'const [pathTick, setPathTick] = useState(0);',
      'const [pathHeldRelease, setPathHeldRelease] = useState(false);', 'const pathSave = (next) =>', 'const pathOnSolve = (',
      'if (!pathUi.ladderActive || isSessionLoading || !currentUser || !dbReady || currentChallenge) return;']) {
      const i = APP.indexOf(h);
      expect(i, h).toBeGreaterThan(0);
      expect(i, h).toBeLessThan(early);
    }
  });
  it('tabs hide and the shell extends only through pathUi', () => {
    expect(APP).toContain('const showPrimaryLearningTabs = !pathUi.hideTabs;');
    expect(APP).toContain('const showFirstRunSimpleShell = isFirstRunUser || pathUi.extendShell;');
  });
  it('B3: the guest banner reads the switch; the ladder end does not reveal the tabs; the reveal fires once, by trigger', () => {
    expect(APP).toContain('{isGuest && !showSimpleLearningShell && !pathUi.hideGuestBanner && (');
    const finish = APP.slice(APP.indexOf('const pathFinishLadder = ('), APP.indexOf('const pathRevealTabs = ('));
    expect(finish).not.toContain('tabsOpenedAt');
    expect(finish).not.toContain('tournament_tabs_revealed');
    expect(APP).toContain("if (!next.tabsOpenedAt && pathTabsOpen(next, { arm: pathUi.arm })) pathRevealTabs(pathUi.sprint ? 'sprint_day' : 'plan_steps', next, newSolved.size);");
    expect(APP).toContain("pathRevealTabs('all_steps');");
    expect(APP).toContain("if (!hit) { pathRevealTabs('plan_end'); return; }");
    // While the tabs are hidden after the ladder, the plan's next step opens by itself.
    expect(APP).toContain("if (!pathUi.active || pathUi.ladderActive || !pathUi.hideTabs || !pathState.plan || isSessionLoading || !currentUser || !dbReady || currentChallenge) return;");
  });
  // Walk fix B1 (2026-11-26): the guest's sign-up / save prompt interrupted
  // the ladder at the 3rd solve. Every one is held on the ladder; its end
  // asks at most one.
  it('B1: sign-up / save prompts are held on the ladder and at most one is asked when it ends', () => {
    // The solve path asks only through guestSaveAskAfterSolve, behind the hold.
    expect(APP).toContain('if (!pathUi.holdSignupAsks) guestSaveAskAfterSolve(solvedTotal);');
    const helper = APP.slice(APP.indexOf('const guestSaveAskAfterSolve = ('), APP.indexOf('const guestSaveAskAfterSolve = (') + 2000);
    // Every automatic sign-up / email ask lives in the helper (or the ladder's release).
    const asks = [...APP.matchAll(/triggerSignupPrompt\(|setShowSoftEmailCapture\(true\)/g)].map(m => m.index);
    const helperStart = APP.indexOf('const guestSaveAskAfterSolve = (');
    const helperEnd = helperStart + helper.indexOf('\n  };') + 4;
    const release = APP.indexOf('if (!guestSaveAskAfterSolve(solvedSet.size) && held) setTimeout(() => triggerSignupPrompt(held), 1500);');
    expect(release).toBeGreaterThan(0);
    const definition = APP.indexOf('const triggerSignupPrompt = (');
    for (const i of asks) {
      const inHelper = i > helperStart && i < helperEnd;
      const inRelease = i > release && i < release + 120;
      const isDef = i === definition + 'const '.length;
      expect(inHelper || inRelease || isDef, APP.slice(i - 120, i + 40)).toBe(true);
    }
    // The tutor's guest-limit prompt is held too.
    expect(APP).toContain("if (pathUi.holdSignupAsks) pathHeldSignupRef.current = 'ai_limit';");
  });
  it('B2: no "Take tour" prompt in arm B', () => {
    expect(APP).toContain('    // Tournament arm B: no tour prompt in the first session (walk fix B2).\n    if (pathUi.suppressTour) return;');
    expect(APP).toContain('{showAppTourBadge && !pathUi.suppressTour && (');
  });
  it('every arm-B render call is guarded by a pathUi switch', () => {
    const calls = [...APP.matchAll(/\{([^{}\n]*?)renderPath(LadderLine|PlanLine|StepDown|VerdictNext)\(\)/g)];
    expect(calls.length).toBe(4);
    for (const m of calls) expect(m[1]).toMatch(/pathUi\.(ladderActive|showPlanLine|active)[^|]*&&/);
  });
  it('the post-solve strips, the asks and the starter all read the switch, not the arm', () => {
    expect(APP).toContain("{!nextChallengeRec && !pathUi.suppressNextStrip && (");
    expect(APP).toContain("{challengeStatus === 'success' && nextChallengeRec && !pathUi.suppressNextStrip && (");
    expect(APP).toContain('{!pathUi.suppressAsks && renderCompanyAsk()}');
    expect(APP).toContain("if (pathUi.suppressAsks) {\n                // Arm B asks nothing until its ladder ends");
    expect(APP).toContain("trackActivationEvent('intent_ask_suppressed', { by: 'single_path' });");
    expect(APP).toContain('if (rs.prefill || pathUi.starterPrefill) {');
    expect(APP).toContain('setMobileRunBarShown(decision.show || (pathUi.fixedRunBar && narrowTouch && !runBarShortViewport));');
    expect(APP).toContain('if (pathUi.active) pathOnSolve(currentChallenge, newSolved,');
    expect(APP).toContain('    // Tournament arm B: four questions in, the plan line says what to do next.\n    if (pathUi.active) return;');
    // The single-path module is the only arm-B logic; app.jsx never names the arm id.
    expect(APP).not.toMatch(/'B_single_path'/);
  });
  it('the wall: the quota modal\'s line slot under pathUi.active, and the plan-end card opens `plan_end`', () => {
    expect(APP).toContain("if (pathUi.active && pathStateRef.current.plan) return { company: null, kind: 'plan', line: pathWallLine() };");
    expect(APP).toContain("setProModalReason({ type: 'plan_end', k, n, solvedCount: solvedChallenges.size, arm: pathUi.arm });");
    expect(APP).toContain("return i18n_t('tournamentPath', 'wall', { k, n });");
  });
  it('the events the reads use', () => {
    for (const ev of ['tournament_ladder_step', 'tournament_plan_shown', 'tournament_plan_step_done', 'tournament_tabs_revealed']) {
      expect(APP).toContain(`pathEvent('${ev}'`);
    }
    expect(APP).toContain("pathEvent('placement_completed', { source: 'ladder'");
  });
  it('the state rides the account only for people in the arm', () => {
    expect(APP).toContain('...(pathUi.active ? { singlePath: pathState } : {}),');
    expect(SINGLE_PATH_KEY).toBe('sqlquest_single_path_v1');
  });
});

// ─────────────── one layer at a time, the first session (round 2) ─────────────
// Walk fix round 2 (2026-11-26): at B's 7th solve the 6-solve Pro modal, an
// achievement toast with its share card and the exit survey opened at once,
// and from the first plan step on the archetype card and an achievement toast
// showed together. One queue for the whole first session.

describe('the one-layer queue (arms B and D, first session)', () => {
  const settle = () => pathLayerSlot('settle');
  const pick = () => ({ ...pathLayerSlot('settle'), phase: 'pick' });
  it('priority: Pro / plan_end ask > save / sign-up > achievement > archetype > survey', () => {
    expect(PATH_LAYER_TIERS.map(t => [...t])).toEqual([
      ['pro_modal', 'user_modal'],
      ['signup_prompt', 'soft_email', 'intent_ask'],
      ['achievement', 'level_up', 'milestone_toast', 'milestone_share', 'streak_card'],
      ['radar_pop'],
      ['feedback_prompt'],
    ]);
    const all = [...PATH_LAYER_TIERS.flat()].reverse();
    const d = pathLayerDecide({ active: all, slot: pick() });
    expect(d.show).toBe('pro_modal');
    expect(d.drop.sort()).toEqual(all.filter(id => !['pro_modal', 'user_modal'].includes(id)).sort());
  });
  it('the walk\'s 7th solve: the Pro ask alone — the achievement, its share card and the survey are dropped', () => {
    let d = pathLayerDecide({ active: ['achievement', 'milestone_share', 'milestone_toast'], slot: settle() });
    expect(d).toMatchObject({ show: null, drop: [] });
    d = pathLayerDecide({ active: ['achievement', 'milestone_share', 'milestone_toast', 'pro_modal'], slot: d.slot });
    expect(d.show).toBe('pro_modal');
    expect(d.drop.sort()).toEqual(['achievement', 'milestone_share', 'milestone_toast']);
    // The modal closes; the survey it would raise and any later toast are dropped.
    d = pathLayerDecide({ active: ['feedback_prompt', 'radar_pop'], slot: { ...d.slot, phase: 'pick' } });
    expect(d.show).toBe(null);
    expect(d.drop.sort()).toEqual(['feedback_prompt', 'radar_pop']);
  });
  it('a plan step: the archetype card and an achievement never show together — the first by priority, the other dropped', () => {
    const d = pathLayerDecide({ active: ['radar_pop', 'achievement'], slot: pick() });
    expect(d.show).toBe('achievement');
    expect(d.drop).toEqual(['radar_pop']);
  });
  it('at most one per solve: once the granted layer closes, the rest of that solve is dropped', () => {
    let d = pathLayerDecide({ active: ['signup_prompt', 'achievement'], slot: pick() });
    expect(d).toMatchObject({ show: 'signup_prompt', drop: ['achievement'] });
    d = pathLayerDecide({ active: [], slot: d.slot });
    expect(d.slot.consumed).toBe(true);
    d = pathLayerDecide({ active: ['level_up'], slot: d.slot });
    expect(d).toMatchObject({ show: null, drop: ['level_up'] });
    // The next challenge open is a fresh slot.
    d = pathLayerDecide({ active: ['level_up'], slot: pathLayerSlot('open') });
    expect(d.show).toBe('level_up');
  });
  it('a toast never sits on a modal: the solve waits for its asks, and a later Pro ask takes the slot', () => {
    // In the settle window only the Pro ask (or the person's own modal) shows.
    expect(pathLayerDecide({ active: ['achievement', 'signup_prompt'], slot: settle() }).show).toBe(null);
    expect(pathLayerDecide({ active: ['achievement', 'user_modal'], slot: settle() })).toMatchObject({ show: 'user_modal', drop: ['achievement'] });
    // A toast granted first gives way to the Pro ask, which is never dropped.
    const d = pathLayerDecide({ active: ['achievement'], slot: pick() });
    const d2 = pathLayerDecide({ active: ['achievement', 'pro_modal'], slot: d.slot });
    expect(d2).toMatchObject({ show: 'pro_modal', drop: ['achievement'] });
    expect(PATH_LAYER_SETTLE_MS).toBeGreaterThan(1800); // the milestone / set-complete asks land at 1.8 s
  });
  it('never two at once, whatever is up (every subset of the layers)', () => {
    const ids = PATH_LAYER_TIERS.flat();
    for (let mask = 1; mask < (1 << ids.length); mask += 7) {
      const active = ids.filter((_, i) => mask & (1 << i));
      for (const slot of [pathLayerSlot('open'), settle(), pick()]) {
        for (const holdExtras of [false, true]) {
          const d = pathLayerDecide({ active, slot, holdExtras });
          expect(d.drop).not.toContain(d.show);
          expect(d.drop).not.toContain('pro_modal');
          expect(d.drop).not.toContain('user_modal');
          if (active.includes('feedback_prompt')) expect(d.drop).toContain('feedback_prompt');
          const held = holdExtras ? active.filter(id => PATH_LAYER_HELD_ON_LADDER.includes(id)) : [];
          // A second never-dropped modal (the Pro ask and the person's own) waits its turn.
          const waits = active.filter(id => ['pro_modal', 'user_modal'].includes(id) && id !== d.show);
          const accounted = new Set([...d.drop, ...held, ...waits, ...(d.show ? [d.show] : [])]);
          // Everything up is shown, dropped, held on the ladder, or waits out the settle window.
          if (slot.phase !== 'settle' || active.some(id => ['pro_modal', 'user_modal'].includes(id))) {
            expect([...accounted].sort()).toEqual([...new Set(active)].sort());
          }
        }
      }
    }
  });
  it('B\'s ladder holds the achievement / archetype layers (neither shown nor dropped); the asks keep the queue', () => {
    const d = pathLayerDecide({ active: ['achievement', 'radar_pop', 'signup_prompt'], slot: pick(), holdExtras: true });
    expect(d).toMatchObject({ show: 'signup_prompt', drop: [] });
    // At the ladder's end they compete: one shows, the rest go.
    const e = pathLayerDecide({ active: ['achievement', 'radar_pop', 'signup_prompt'], slot: pick(), holdExtras: false });
    expect(e).toMatchObject({ show: 'signup_prompt' });
    expect(e.drop.sort()).toEqual(['achievement', 'radar_pop']);
  });
  it('the person\'s own sign-up opens are never queued away', () => {
    expect([...PATH_USER_SIGNUP_REASONS].sort()).toEqual(['ai_limit', 'banner', 'pro_purchase', 'profile']);
    for (const auto of ['third_solve', 'first_challenge', 'progress']) expect(PATH_USER_SIGNUP_REASONS).not.toContain(auto);
  });
  it('the first session ends at the first hour away, for good — and the queue with it', () => {
    const H = PATH_SESSION_GAP_MS;
    expect(H).toBe(60 * 60 * 1000);
    let s = pathSessionTouch(emptyPathState(), 1000);
    expect(s).toMatchObject({ sessionLastAt: 1000, firstSessionEndedAt: null });
    s = pathSessionTouch(s, 1000 + H - 1);
    expect(pathInFirstSession(s)).toBe(true);
    const ended = pathSessionTouch(s, 1000 + 2 * H);
    expect(ended.firstSessionEndedAt).toBe(1000 + H - 1);
    expect(pathInFirstSession(ended)).toBe(false);
    expect(pathSessionTouch(ended, 1000 + 2 * H + 5)).toEqual(ended);
    // It survives the store.
    expect(normalizePathState(JSON.parse(JSON.stringify(ended)))).toMatchObject({ sessionLastAt: ended.sessionLastAt, firstSessionEndedAt: ended.firstSessionEndedAt });
    expect(pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: s }).layerQueue).toBe(true);
    expect(pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: ended }).layerQueue).toBe(false);
  });
  it('app.jsx: every layer renders through the queue; the solve opens a slot; the survey never asks', () => {
    for (const g of [
      "!interviewFirstOn('achievement_toast') && oneLayerOk('achievement') && <AchievementPopup",
      "{showLevelUp && oneLayerOk('level_up') && <LevelUpBanner",
      "{radarPop && oneLayerOk('radar_pop') && <RadarPopToast",
      "{milestoneShare && oneLayerOk('milestone_share') && (() => {",
      "{showIntentAsk && !showSoftEmailCapture && oneLayerOk('intent_ask') && (",
      "{showSoftEmailCapture && oneLayerOk('soft_email') && (",
      '{showSignupPrompt && pathLayerOk(pathSignupLayer) && (',
      "{milestonePopup && pathLayerOk('milestone_toast') && (",
      "{streakCardOpen && currentUser && !isGuest && (streakCardOpen !== 'auto' || pathLayerOk('streak_card')) && (",
      "{fbPrompt && fbPrompt.kind !== 'stuck' && !showProModal && pathLayerOk('feedback_prompt') && (",
    ]) expect(APP, g).toContain(g);
    expect(APP).toContain('const oneLayerOk = (id) => (pathUi.layerQueue ? pathLayerOk(id) :');
    expect(APP).toContain('const pathLayer = pathUi.layerQueue ? pathLayerDecide({ active: pathLayerActive, slot: pathLayerSlotNow, holdExtras: pathUi.holdLayers }) : null;');
    expect(APP).toContain('        armOneLayerAtSolve(currentChallenge.id);\n        pathLayerAtSolve();\n');
    expect(APP).toContain('    // Tournament arms B / D: never in the first session (walk fix round 2).\n    if (pathUi.layerQueue) return;');
    // Each droppable layer has its clear; the Pro modal has none.
    const eff = APP.slice(APP.indexOf('const pathLayerKey = '), APP.indexOf("trackActivationEvent('tournament_layer_dropped'"));
    for (const id of PATH_LAYER_ORDER.filter(x => !['pro_modal', 'user_modal'].includes(x))) expect(eff, id).toContain(`d.includes('${id}')`);
    expect(eff).not.toContain('setShowProModal');
    // Hooks above the early returns (fragile area 1).
    const early = Math.min(APP.indexOf('  if (showAuth) {'), APP.indexOf('  if (!dbReady) return ('));
    for (const h of ['const [pathLayerSlotNow, setPathLayerSlotNow] = useState(', 'const pathLayerKey = ', 'const next = pathSessionTouch(cur, Date.now());']) {
      const i = APP.indexOf(h);
      expect(i, h).toBeGreaterThan(0);
      expect(i, h).toBeLessThan(early);
    }
  });
});

// Walk fix round 2 (2026-11-26): the re-walk reached B's Coach tab once the
// tabs were back and found "Your Capital One plan" beside the plan line.
describe('one plan on screen in B', () => {
  it('the Coach\'s company-plan card hides once B\'s plan line shows (never on the ladder, never outside the arm)', () => {
    const s = emptyPathState();
    expect(pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: s }).hideCoachPlan).toBe(false);
    const ended = normalizePathState({ ...s, ladder: { ...s.ladder, done: true, levelId: 'basics' }, plan: { steps: [{ kind: 'challenge', challengeId: 92 }] } });
    expect(pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: ended })).toMatchObject({ showPlanLine: true, hideCoachPlan: true });
    expect(pathUiFlags({ behaviour: null, state: ended }).hideCoachPlan).toBe(false);
  });
  it('app.jsx: the practice-plan card reads the switch', () => {
    const card = APP.indexOf('data-testid="practice-plan"');
    const gate = APP.lastIndexOf('if (pathUi.hideCoachPlan) return null;', card);
    expect(gate).toBeGreaterThan(0);
    expect(card - gate).toBeLessThan(2500);
  });
});

// Orchestrator decision (2026-11-27): in the first session, at most ONE
// automatic Pro ask in any 3 consecutive solves. The re-walk of D met the
// 6-solve ask and the "set complete" ask on solves 6 and 7.
describe('one Pro ask in any 3 consecutive solves (first session)', () => {
  it('the 6-solve ask showed: the set-complete ask on solves 6–8 is skipped; from 9 a different ask may come', () => {
    expect(PATH_PRO_ASK_GAP).toBe(3);
    for (const solves of [6, 7, 8]) expect(pathProAskAllowed({ reason: 'company_set_complete', solves, lastAt: 6 }), String(solves)).toBe(false);
    expect(pathProAskAllowed({ reason: 'company_set_complete', solves: 9, lastAt: 6 })).toBe(true);
    expect(pathProAskAllowed({ reason: 'milestone_solves', solves: 6, lastAt: null })).toBe(true);
  });
  it('a skipped ask waits for a later session — it does not come back in this one', () => {
    expect(pathProAskAllowed({ reason: 'company_set_complete', solves: 12, lastAt: 6, skipped: ['company_set_complete'] })).toBe(false);
    const st = normalizePathState({ ...emptyPathState(), proAskAt: 6, proAskSkipped: ['company_set_complete', 'nonsense'] });
    expect(st).toMatchObject({ proAskAt: 6, proAskSkipped: ['company_set_complete'] });
  });
  it('the quota wall, plan_end and the person\'s own Pro opens are never spaced', () => {
    expect([...PATH_PRO_ASKS_SPACED].sort()).toEqual(['company_set_complete', 'milestone_solves', 'milestone_streak']);
    for (const reason of ['free_quota', 'quota', 'plan_end', 'hard_challenge', 'interview_locked', 'pricing_link', 'rate_limit']) {
      expect(pathProAskAllowed({ reason, solves: 7, lastAt: 6, skipped: [reason] }), reason).toBe(true);
    }
  });
  it('app.jsx: the three automatic asks go through pathProAskOk before their once-keys; only in the arms\' first session', () => {
    expect(APP).toContain("if (!localStorage.getItem(guestKey) && !localStorage.getItem(userKey) && pathProAskOk('milestone_solves', n)) {");
    expect(APP).toContain("if (allFreeSolved && !localStorage.getItem(onceKey) && pathProAskOk('company_set_complete', solvedNow.size)) {");
    expect(APP).toContain("if (!localStorage.getItem(key) && pathProAskOk('milestone_streak', solvedChallenges.size)) {");
    const fn = APP.slice(APP.indexOf('const pathProAskOk = (reason, solves) => {'), APP.indexOf('const pathProAskOk = (reason, solves) => {') + 900);
    expect(fn).toContain('if (!pathUi.layerQueue) return true;');
    expect(fn).toContain('lastAt: cur.proAskAt, skipped: cur.proAskSkipped');
    const early = Math.min(APP.indexOf('  if (showAuth) {'), APP.indexOf('  if (!dbReady) return ('));
    expect(APP.indexOf('const pathProAskOk = (reason, solves) => {')).toBeLessThan(early);
  });
});

// Orchestrator decision (2026-11-27): single focus in B too — no goal picker
// and no Focus Tracks beside B's plan (the switch D uses).
describe('one goal on screen in B', () => {
  it('B hides the goal picker and Focus Tracks once the plan shows; never on the ladder or outside the arm', () => {
    const s = emptyPathState();
    expect(pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: s }).hideGoalPicker).toBe(false);
    const ended = normalizePathState({ ...s, ladder: { ...s.ladder, done: true, levelId: 'basics' }, plan: { steps: [{ kind: 'challenge', challengeId: 92 }] } });
    expect(pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: ended }).hideGoalPicker).toBe(true);
    expect(pathUiFlags({ behaviour: null, state: ended }).hideGoalPicker).toBe(false);
  });
  it('app.jsx: the picker and the Focus Tracks card read the switch', () => {
    expect(APP).toContain('{!coachState?.goalId && !pathUi.hideGoalPicker && (');
    const ft = APP.indexOf("i18n_t('coach', 'focusTracks')");
    const gate = APP.lastIndexOf('{!pathUi.hideGoalPicker && (', ft);
    expect(gate).toBeGreaterThan(0);
    expect(ft - gate).toBeLessThan(600);
  });
});
