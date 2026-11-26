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
} from '../src/utils/single-path.js';
import { levelForLadder, FIRST_RUN_PLACEMENT_SOURCES } from '../src/utils/placement.js';
import { buildRoadmap } from '../src/utils/personal-roadmap.js';
import { tournamentArmById, TOURNAMENT_CONTROL_ID } from '../src/data/tournament-arms.js';
import { tournamentBehaviour } from '../src/utils/tournament.js';
import { FREE_SOLVE_QUOTA, FREE_MOCK_ID } from '../src/utils/free-tier-boundary.js';
import { INTAKE_COMPANIES } from '../src/utils/onboarding-intake.js';
import { t, _resetLangCache } from '../src/utils/i18n.js';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const APP = read('src/app.jsx');
const MOD = read('src/utils/single-path.js');

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
    for (const behaviour of [null, undefined, TOURNAMENT_CONTROL_ID, tournamentBehaviour('D_interview_sprint'), 'C_proof_first']) {
      const f = pathUiFlags({ behaviour, state: emptyPathState(), hasChallenge: true });
      for (const [k, v] of Object.entries(f)) expect([k, v]).toEqual([k, k === 'arm' ? null : false]);
    }
  });
  it('B: tabs hidden and the shell extended while the ladder runs; the plan line once it ends', () => {
    const s = emptyPathState();
    const on = pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: s });
    expect(on).toMatchObject({ active: true, ladderActive: true, hideTabs: true, extendShell: true, showPlanLine: false, suppressAsks: true, holdLayers: true, fixedRunBar: true });
    const done = { ...s, ladder: { ...s.ladder, done: true, levelId: 'basics' }, plan: { steps: [{ kind: 'challenge', challengeId: 92 }] } };
    const after = pathUiFlags({ behaviour: SINGLE_PATH_ARM, state: normalizePathState(done) });
    expect(after).toMatchObject({ active: true, ladderActive: false, hideTabs: false, extendShell: false, showPlanLine: true, suppressAsks: false, suppressNextStrip: true });
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
  it('the roadmap never names a date: B writes no prepTarget anywhere', () => {
    expect(MOD).not.toMatch(/prepTarget/);
    expect(MOD).not.toMatch(/localStorage|Date\.now\(|Math\.random/);
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
