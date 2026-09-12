// The free-tier boundary (2026-09-12) — five flag-gated moves, one module.
// docs/plans/free-tier-boundary-2026-09-12.md. Pure logic here, wiring guards
// on app.jsx below, and the engine's two additions (stepsSkipped, a curriculum
// mock step) against the real Coach engine.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  COMPANY_SET_FREE_COUNT, DEADLINE_OFFER_MAX_DAYS, QUIET_ASK_MAX_SOLVES,
  FREE_MOCK_ID, DEFAULT_PRO_MOCK_ID, MOCK_STEP_TYPE,
  EARLY_WALL_PREVIEW_STEP_ID, EARLY_WALL_LOCKED_STEP_ID, EARLY_WALL_FREE_MOCK_STEP_ID, EARLY_WALL_PRO_MOCK_STEP_ID,
  companySetOrder, companySetFreeIds, companySetGate, companySetProgress,
  quietAskDecision, deadlineOfferFor, deadlineEventMeta,
  pickProMockId, earlyWallCurriculum, withEarlyWall,
  quotaGate, FREE_SOLVE_QUOTA,
} from '../src/utils/free-tier-boundary.js';
import { computeNextStep, isStepComplete, MOCK_OFFER_STEP_TYPE } from '../src/utils/coach.js';

const read = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

// A small company set: two Easy, two Medium, three Hard (one a free preview).
const SET = [
  { id: 50, difficulty: 'Hard', freePreview: true },
  { id: 7, difficulty: 'Medium' },
  { id: 91, difficulty: 'Easy' },
  { id: 20, difficulty: 'Hard' },
  { id: 6, difficulty: 'Medium' },
  { id: 105, difficulty: 'Easy' },
  { id: 47, difficulty: 'Hard' },
];
const ON = { flagOn: true, isPro: false, companyFilter: 'Stripe', scoped: SET, solved: new Set() };

describe('M1 · the company set — first three free, then the wall', () => {
  it('orders the set the way the company view lists it: difficulty, then id', () => {
    expect(companySetOrder(SET).map(c => c.id)).toEqual([91, 105, 6, 7, 20, 47, 50]);
    expect(companySetFreeIds(SET)).toEqual(new Set([91, 105, 6]));
    expect(COMPANY_SET_FREE_COUNT).toBe(3);
  });

  it('gates the fourth and beyond, never the first three, never a solved one', () => {
    expect(companySetGate({ ...ON, challenge: { id: 91 } }).gated).toBe(false);
    expect(companySetGate({ ...ON, challenge: { id: 6 } }).gated).toBe(false);
    const fourth = companySetGate({ ...ON, challenge: { id: 7 } });
    expect(fourth).toMatchObject({ gated: true, position: 4, freeCount: 3, setSize: 7, solvedInSet: 0 });
    // a Hard preview past position three is gated INSIDE the company view
    expect(companySetGate({ ...ON, challenge: { id: 50, difficulty: 'Hard', freePreview: true } }).gated).toBe(true);
    // solved is theirs
    expect(companySetGate({ ...ON, challenge: { id: 7 }, solved: new Set([7]) }).gated).toBe(false);
    expect(companySetGate({ ...ON, challenge: { id: 20 }, solved: [91, 105, 6] }).solvedInSet).toBe(3);
  });

  it('never gates with the flag off, for Pro, without a company filter, or outside the set', () => {
    expect(companySetGate({ ...ON, flagOn: false, challenge: { id: 7 } }).gated).toBe(false);
    expect(companySetGate({ ...ON, isPro: true, challenge: { id: 7 } }).gated).toBe(false);
    expect(companySetGate({ ...ON, companyFilter: null, challenge: { id: 7 } }).gated).toBe(false);
    expect(companySetGate({ ...ON, challenge: { id: 999 } }).gated).toBe(false);
    expect(companySetGate()).toEqual({ gated: false });
  });

  it('reports progress against the gate\'s free three, or the caller\'s free set', () => {
    const p = companySetProgress({ scoped: SET, solved: new Set([91, 6]), freeIds: companySetFreeIds(SET) });
    expect(p).toEqual({ setSize: 7, freeCount: 3, freeSolved: 2, proCount: 4, allFreeSolved: false });
    expect(companySetProgress({ scoped: SET, solved: [91, 105, 6], freeIds: companySetFreeIds(SET) }).allFreeSolved).toBe(true);
    expect(companySetProgress({ scoped: SET, solved: [] }).freeCount).toBe(7);
  });
});

describe('M4 · quiet the asks that have never sold', () => {
  it('flag off is today: everything shows', () => {
    expect(quietAskDecision({ flagOn: false, reason: 'milestone_streak', solvedCount: 0 })).toBe('show');
    expect(quietAskDecision()).toBe('show');
  });

  it('the streak modal goes silent; early company and mock walls become a nudge', () => {
    expect(quietAskDecision({ flagOn: true, reason: 'milestone_streak', solvedCount: 40 })).toBe('silent');
    expect(quietAskDecision({ flagOn: true, reason: 'company_hard', solvedCount: QUIET_ASK_MAX_SOLVES })).toBe('nudge');
    expect(quietAskDecision({ flagOn: true, reason: 'company_hard', solvedCount: QUIET_ASK_MAX_SOLVES + 1 })).toBe('show');
    expect(quietAskDecision({ flagOn: true, reason: 'interview_locked', solvedCount: 1 })).toBe('nudge');
    expect(quietAskDecision({ flagOn: true, reason: 'interview_locked', solvedCount: 12 })).toBe('show');
  });

  it('never touches the one ask that has sold, and fails towards showing', () => {
    expect(quietAskDecision({ flagOn: true, reason: 'milestone_solves', solvedCount: 6 })).toBe('show');
    expect(quietAskDecision({ flagOn: true, reason: 'company_hard', solvedCount: null })).toBe('show');
    expect(quietAskDecision({ flagOn: true, reason: 'company_hard', solvedCount: 'x' })).toBe('show');
  });
});

describe('M3 · the milestone modal speaks to the deadline', () => {
  it('offers only with the flag on and a date inside the window', () => {
    expect(deadlineOfferFor({ flagOn: false, daysOut: 10 })).toBeNull();
    expect(deadlineOfferFor({ flagOn: true, daysOut: null })).toBeNull();
    expect(deadlineOfferFor({ flagOn: true, daysOut: DEADLINE_OFFER_MAX_DAYS + 1 })).toBeNull();
    expect(deadlineOfferFor({ flagOn: true, daysOut: -1 })).toBeNull();
    expect(deadlineOfferFor({ flagOn: true, daysOut: 0 })).toMatchObject({ daysOut: 0 });
    expect(deadlineOfferFor({ flagOn: true, daysOut: 12.4, company: ' Stripe ', hardCount: 73, mockTitle: 'Stripe Analytics Screen' }))
      .toEqual({ daysOut: 12, company: 'Stripe', hardCount: 73, mockTitle: 'Stripe Analytics Screen' });
    expect(deadlineOfferFor({ flagOn: true, daysOut: 5, company: '', mockTitle: '' })).toMatchObject({ company: null, mockTitle: null, hardCount: 0 });
  });

  it('stamps the event with the integer, never a date', () => {
    expect(deadlineEventMeta({ type: 'milestone_solves' })).toEqual({ deadline: false, daysOut: null });
    expect(deadlineEventMeta({ type: 'milestone_solves', deadline: { daysOut: 9 } })).toEqual({ deadline: true, daysOut: 9 });
    expect(deadlineEventMeta(null)).toEqual({ deadline: false, daysOut: null });
  });
});

describe('M2 + M5 · the interview-prep goal meets the wall at step 4', () => {
  let goals, challenges, mocks;
  beforeAll(async () => {
    globalThis.window = globalThis.window || {};
    await import('../src/data/challenges.js');
    await import('../src/data/exercises.js');
    await import('../src/data/goals.js');
    await import('../src/data/mock-interviews.js');
    goals = globalThis.window.coachGoals;
    challenges = globalThis.window.challengesData;
    mocks = globalThis.window.mockInterviewsData;
  });

  const live = () => goals.find(g => g.id === 'interview-prep');
  const byId = (id) => challenges.find(c => c.id === id);

  it('the live goal still holds the two steps the reorder moves, with the difficulties it assumes', () => {
    const cur = live().curriculum;
    const preview = cur.find(s => s.id === EARLY_WALL_PREVIEW_STEP_ID);
    const locked = cur.find(s => s.id === EARLY_WALL_LOCKED_STEP_ID);
    expect(byId(preview.challengeId)).toMatchObject({ difficulty: 'Hard', freePreview: true });
    expect(byId(locked.challengeId).difficulty).toBe('Hard');
    expect(byId(locked.challengeId).freePreview).toBeFalsy();
    // the premise: today the first locked Hard is deep in the path
    const firstLocked = cur.findIndex(s => s.type === 'challenge' && byId(s.challengeId)?.difficulty === 'Hard' && !byId(s.challengeId)?.freePreview);
    expect(firstLocked + 1).toBeGreaterThanOrEqual(10);
  });

  it('moves the preview to 3 and the locked Hard to 4, keeps everything else in order, mutates nothing', () => {
    const before = live().curriculum.map(s => s.id);
    const out = earlyWallCurriculum(live().curriculum);
    expect(out.map(s => s.id).slice(0, 4)).toEqual([before[0], before[1], EARLY_WALL_PREVIEW_STEP_ID, EARLY_WALL_LOCKED_STEP_ID]);
    expect(out.length).toBe(before.length);
    expect(out.map(s => s.id).filter(id => id !== EARLY_WALL_PREVIEW_STEP_ID && id !== EARLY_WALL_LOCKED_STEP_ID))
      .toEqual(before.filter(id => id !== EARLY_WALL_PREVIEW_STEP_ID && id !== EARLY_WALL_LOCKED_STEP_ID));
    expect(live().curriculum.map(s => s.id)).toEqual(before);
    // idempotent
    expect(earlyWallCurriculum(out).map(s => s.id)).toEqual(out.map(s => s.id));
  });

  it('with the mock door, the free mock is step 5 and a Pro mock step 6', () => {
    const out = earlyWallCurriculum(live().curriculum, { mockDoor: true, proMockId: 'faang-sql-interview' });
    expect(out[4]).toEqual({ id: EARLY_WALL_FREE_MOCK_STEP_ID, type: MOCK_STEP_TYPE, interviewId: FREE_MOCK_ID });
    expect(out[5]).toEqual({ id: EARLY_WALL_PRO_MOCK_STEP_ID, type: MOCK_STEP_TYPE, interviewId: 'faang-sql-interview' });
    expect(out.length).toBe(live().curriculum.length + 2);
    expect(MOCK_STEP_TYPE).toBe(MOCK_OFFER_STEP_TYPE);
    // no Pro mock id → only the free one; idempotent across the flag flipping back
    expect(earlyWallCurriculum(live().curriculum, { mockDoor: true }).filter(s => s.type === MOCK_STEP_TYPE)).toHaveLength(1);
    expect(earlyWallCurriculum(out, { mockDoor: false }).some(s => s.type === MOCK_STEP_TYPE)).toBe(false);
  });

  it('leaves every other goal, and the flag-off case, as the same object', () => {
    const fundamentals = goals.find(g => g.id === 'fundamentals');
    expect(withEarlyWall(fundamentals, { flagOn: true })).toBe(fundamentals);
    expect(withEarlyWall(live(), { flagOn: false })).toBe(live());
    expect(withEarlyWall(null, { flagOn: true })).toBeNull();
    expect(withEarlyWall(live(), { flagOn: true }).curriculum[3].id).toBe(EARLY_WALL_LOCKED_STEP_ID);
    expect(earlyWallCurriculum([{ id: 'x', type: 'lesson', lessonId: 1 }])).toEqual([{ id: 'x', type: 'lesson', lessonId: 1 }]);
  });

  it('names the company\'s own Pro mock when one exists, else the generic interview mock, never a free one', () => {
    expect(pickProMockId(mocks, 'Capital One')).toBe('capital-one-codesignal');
    expect(pickProMockId(mocks, 'capital one ')).toBe('capital-one-codesignal');
    expect(pickProMockId(mocks, 'Stripe')).toBe(DEFAULT_PRO_MOCK_ID);
    expect(pickProMockId(mocks, null)).toBe(DEFAULT_PRO_MOCK_ID);
    expect(mocks.find(m => m.id === DEFAULT_PRO_MOCK_ID).isFree).toBe(false);
    expect(pickProMockId([{ id: FREE_MOCK_ID, isFree: true }], 'General')).toBeNull();
  });
});

describe('engine · a step set aside is passed over, never counted; a mock step completes on a sitting', () => {
  const goal = {
    id: 'interview-prep',
    name: 'IV',
    curriculum: [
      { id: 'a', type: 'challenge', challengeId: 175 },
      { id: 'b', type: 'challenge', challengeId: 71 },
      { id: 'm', type: MOCK_OFFER_STEP_TYPE, interviewId: FREE_MOCK_ID },
      { id: 'c', type: 'challenge', challengeId: 114 },
    ],
    exitCriteria: { skillThresholds: { 'Window Functions': 99 } },
  };
  const started = '2026-09-01T00:00:00Z';
  const solvedA = { challengeId: 175, success: true, timestamp: Date.parse('2026-09-02T00:00:00Z') };

  it('skips a skipped step without crediting it', () => {
    const r = computeNextStep(goal, { coachState: { goalId: 'interview-prep', startedAt: started, stepsCompleted: [], stepsSkipped: ['b'] }, challengeAttempts: [solvedA] });
    expect(r.step.id).toBe('m');
    expect(r.progressPct).toBe(25); // one of four done; the skip is not progress
    const back = computeNextStep(goal, { coachState: { goalId: 'interview-prep', startedAt: started, stepsCompleted: [], stepsSkipped: [] }, challengeAttempts: [solvedA] });
    expect(back.step.id).toBe('b');
  });

  it('a mock step is complete only once that mock was sat after the goal started', () => {
    const ctx = { startedAtMs: Date.parse(started) };
    expect(isStepComplete(goal.curriculum[2], { ...ctx, interviewHistory: [] })).toBe(false);
    expect(isStepComplete(goal.curriculum[2], { ...ctx, interviewHistory: [{ interviewId: FREE_MOCK_ID, timestamp: '2026-08-01T00:00:00Z' }] })).toBe(false);
    expect(isStepComplete(goal.curriculum[2], { ...ctx, interviewHistory: [{ interviewId: 'other', timestamp: '2026-09-03T00:00:00Z' }] })).toBe(false);
    expect(isStepComplete(goal.curriculum[2], { ...ctx, interviewHistory: [{ interviewId: FREE_MOCK_ID, timestamp: '2026-09-03T00:00:00Z' }] })).toBe(true);
    expect(isStepComplete(goal.curriculum[2], { ...ctx, interviewHistory: [{ interviewId: FREE_MOCK_ID, date: '2026-09-03' }] })).toBe(true);
    const r = computeNextStep(goal, {
      coachState: { goalId: 'interview-prep', startedAt: started, stepsCompleted: [], stepsSkipped: ['b'] },
      challengeAttempts: [solvedA],
      interviewHistory: [{ interviewId: FREE_MOCK_ID, timestamp: '2026-09-03T00:00:00Z' }],
    });
    expect(r.step.id).toBe('c');
    expect(r.reason).toBe(`Apply what you've learned on a real challenge.`);
  });
});

describe('the free quota — ten solves, then Pro (founder, 2026-09-12, item 2)', () => {
  it('gates the (quota+1)th NEW solve only; solved, Pro, and flag-off never', () => {
    expect(FREE_SOLVE_QUOTA).toBe(10);
    expect(quotaGate({ flagOn: true, solvedCount: 9 })).toEqual({ gated: false, used: 9, quota: 10, remaining: 1 });
    expect(quotaGate({ flagOn: true, solvedCount: 10 })).toEqual({ gated: true, used: 10, quota: 10, remaining: 0 });
    expect(quotaGate({ flagOn: true, solvedCount: 37 }).gated).toBe(true);
    expect(quotaGate({ flagOn: true, solvedCount: 37, alreadySolved: true }).gated).toBe(false);
    expect(quotaGate({ flagOn: true, solvedCount: 37, isPro: true }).gated).toBe(false);
    expect(quotaGate({ flagOn: false, solvedCount: 37 }).gated).toBe(false);
    expect(quotaGate({ flagOn: true, solvedCount: 3, quota: 3 }).gated).toBe(true);
    expect(quotaGate().gated).toBe(false);
  });

  it('is wired: its own wall value, cold-start diversion before the ask, row locks, the counter, the modal — and off', () => {
    const app = read('../src/app.jsx');
    const flags = read('../src/data/feature-flags.js');
    expect(flags).toMatch(/^\s+freeQuota: false,/m);
    const at = app.indexOf("trackLockReached('challenge_quota'");
    expect(at).toBeGreaterThan(-1);
    const block = app.slice(at, at + 900);
    expect(block).toMatch(/wall: 'free_quota'/);
    expect(block.indexOf('openColdStartInstead(challenge.id)')).toBeLessThan(block.indexOf('setShowProModal(true)'));
    expect(block).toMatch(/type: 'free_quota'/);
    expect(app).toMatch(/const isQuotaLocked = quotaGate\(\{ flagOn: ftbFlag\('freeQuota'\)/);
    expect(app).toMatch(/data-testid="free-quota-counter"/);
    expect(app).toMatch(/data-testid="pro-modal-free-quota"/);
    // the quota sits AFTER the Hard gate and the company-set gate in openChallenge
    const hard = app.indexOf("trackLockReached('challenge_hard'");
    const set = app.indexOf("trackLockReached('challenge_set'");
    expect(hard).toBeLessThan(set);
    expect(set).toBeLessThan(at);
  });

  it('item 1 (live): the sixth-solve ask waits for the celebration, once-keys written at once', () => {
    const app = read('../src/app.jsx');
    const at = app.indexOf('const milestoneReason = {');
    expect(at).toBeGreaterThan(-1);
    const block = app.slice(at, at + 1400);
    expect(block).toMatch(/setTimeout\(\(\) => \{\n\s+setProModalReason\(milestoneReason\);\n\s+setShowProModal\(true\);\n\s+\}, 1800\);/);
    expect(block).toMatch(/localStorage\.setItem\(guestKey, '1'\)/);
  });
});

describe('source guards — the five flags are wired, and off', () => {
  const app = read('../src/app.jsx');
  const flags = read('../src/data/feature-flags.js');

  it('all five flags exist and ship OFF', () => {
    for (const f of ['companySetGate', 'goalWallEarly', 'deadlineOffer', 'quietEarlyAsks', 'mockDoor']) {
      expect(flags, f).toMatch(new RegExp(`^\\s+${f}: false,`, 'm'));
    }
  });

  it('M1: the set wall sits after the Hard gate, writes its own wall value, diverts the cold, then asks', () => {
    const at = app.indexOf("trackLockReached('challenge_set'");
    expect(at).toBeGreaterThan(-1);
    const block = app.slice(at, at + 1200);
    expect(block).toMatch(/wall: 'company_set'/);
    expect(block.indexOf('openColdStartInstead(challenge.id)')).toBeLessThan(block.indexOf('setShowProModal(true)'));
    expect(block).toMatch(/type: 'company_set'/);
    // the banner, the set-complete ask and the row lock all read the same free three
    expect((app.match(/companyGateFreeIds\(\)/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(app).toMatch(/\|\| companySetGate\(\{ flagOn: ftbFlag\('companySetGate'\)/);
  });

  it('M2 + M5: one goal resolver for the engine and the card; the skip is offered on locked steps only', () => {
    expect(app).toMatch(/const goal = resolveCoachGoal\(goals\.find\(g => g\.id === coachState\.goalId\)\);/);
    expect(app).toMatch(/const activeGoal = coachState\?\.goalId \? resolveCoachGoal\(goals\.find/);
    expect(app).toMatch(/stepsSkipped: Array\.from\(new Set\(\[\.\.\.\(coachState\.stepsSkipped \|\| \[\]\), step\.id\]\)\)/);
    expect((app.match(/data-testid="coach-step-skip"/g) || []).length).toBe(2);
    expect(app).toMatch(/interviewHistory,\n {4}\}, \{/);
    // a curriculum mock step starts through startInterview (the one gate), before
    // the switch, so the synthetic offer keeps its own door and session flag
    expect(app).toMatch(/if \(step\.type === COACH_MOCK_STEP_TYPE && step\.id !== COACH_MOCK_STEP_ID\) \{\n\s+const mock = mockInterviews\.find\(i => i\.id === step\.interviewId\);\n\s+if \(mock\) startInterview\(mock\);\n\s+return;/);
  });

  it('M3: the milestone ask carries the deadline into the reason and onto the event', () => {
    expect(app).toMatch(/deadlineOfferFor\(\{\n\s+flagOn: ftbFlag\('deadlineOffer'\),\n\s+daysOut: daysUntil\(prepTarget\.date, Date\.now\(\)\),/);
    expect(app).toMatch(/\.\.\.\(deadline \? \{ deadline \} : \{\}\),/);
    expect(app).toMatch(/\.\.\.deadlineEventMeta\(proModalReason\),/);
    expect(app).toMatch(/data-testid="pro-modal-deadline"/);
  });

  it('M4: the streak modal, the early company wall and the locked mock all consult the decision', () => {
    expect(app).toMatch(/quietAskDecision\(\{ flagOn: ftbFlag\('quietEarlyAsks'\), reason: 'milestone_streak'/);
    expect(app).toMatch(/if \(companyFilter && quietAskDecision\(\{ flagOn: ftbFlag\('quietEarlyAsks'\), reason: 'company_hard'/);
    expect((app.match(/nudgeToFreeMock\(\(m\) => start/g) || []).length).toBe(2);
    // the locked-mock ask is named, so the read can tell it from a header click
    expect((app.match(/setProModalReason\(\{ type: 'interview_locked'/g) || []).length).toBe(2);
    // the nudge still writes the lock row first: lock → cold-start → nudge → ask, in that order
    const at = app.indexOf('const startInterview = (interview, forceNew = false) => {');
    const block = app.slice(at, at + 1500);
    expect(block.indexOf("trackLockReached('interview'")).toBeLessThan(block.indexOf('openColdStartInstead()'));
    expect(block.indexOf('openColdStartInstead()')).toBeLessThan(block.indexOf('nudgeToFreeMock('));
    expect(block.indexOf('nudgeToFreeMock(')).toBeLessThan(block.indexOf('setShowProModal(true)'));
  });

  it('nothing here touches the Easy/Medium bank or the six-solve rung', () => {
    expect(app).toMatch(/const tier = n >= 50 \? 50 : n >= 25 \? 25 : n >= 10 \? 10 : n >= 6 \? 6 : 0;/);
    expect(app).toMatch(/case 'challenge': return item\?\.difficulty === 'Hard' && !item\?\.freePreview;/);
  });
});
