// The Coach's Debug door (orchestrator 2026-11-25, flag `coachDebugDoor`).
//
// Pins: the pure half over the LIVE bank and the LIVE roadmap order (the pick
// is curriculum-ordered, never raw order; it prefers an item the person may
// open; locked-only falls back to the first unsolved, marked locked; the
// hide rules), the flag (shipped ON, literal-true reader), and the app wiring
// (the click goes through openChallenge, the lock test is the app's own,
// the two events, the card sits under the next-step card, the See-all link
// turns the Debug chip on, no yellow on the card, no hook in the render).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { coachDebugDoorOn, coachDebugDoorModel } from '../src/utils/coach-debug-door.js';
import { SQL_ROADMAP_CHALLENGE_ORDER } from '../src/data/roadmap-stages.js';
import { t } from '../src/utils/i18n.js';

const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

function loadBank() {
  const sb = { window: { location: { search: '' } }, URLSearchParams: globalThis.URLSearchParams, console: { log() {} } };
  vm.createContext(sb);
  for (const f of ['feature-flags.js', 'datasets.js', 'challenges.js', 'challenge-companies.js', 'sector-challenges.js']) {
    vm.runInContext(read(`src/data/${f}`), sb);
  }
  sb.window.FEATURE_FLAGS.features.debugQuestions = true;
  vm.runInContext(read('src/data/debug-challenges.js'), sb);
  return sb.window;
}

const W = loadBank();
const bank = W.challengesData;
const DEBUG = bank.filter(c => c.type === 'debug');
const isHard = c => c.difficulty === 'Hard' && !c.freePreview;
const base = {
  doorOn: true, debugOn: true, challenges: bank, solved: new Set([91]), solveCount: 1,
  order: SQL_ROADMAP_CHALLENGE_ORDER, isLocked: isHard, hired: false,
};

describe('the pure half over the live bank', () => {
  it('the bank carries the twelve Debug items the card counts', () => {
    expect(DEBUG.length).toBe(12);
    expect(coachDebugDoorModel(base).total).toBe(DEBUG.length);
  });

  it('opens the first Easy Debug item in curriculum order, never the raw-array first', () => {
    // Put a Hard Debug item FIRST in the raw array: a raw .find() would pick it.
    const hard = DEBUG.find(c => c.difficulty === 'Hard');
    const shuffled = [hard, ...bank.filter(c => c !== hard)];
    const m = coachDebugDoorModel({ ...base, challenges: shuffled, isLocked: () => false });
    expect(m.challenge.difficulty).toBe('Easy');
    expect(m.challenge.id).toBe(Math.min(...DEBUG.filter(c => c.difficulty === 'Easy').map(c => c.id)));
    expect(m.locked).toBe(false);
  });

  it('skips solved items and moves to the next one', () => {
    const easy = DEBUG.filter(c => c.difficulty === 'Easy').map(c => c.id).sort((a, b) => a - b);
    const m = coachDebugDoorModel({ ...base, solved: new Set([91, easy[0]]), solveCount: 2 });
    expect(m.challenge.id).toBe(easy[1]);
    expect(m.solved).toBe(1);
  });

  it('prefers an item the person may open over a locked one', () => {
    // Every Easy and Medium solved: only Hard remain, and Hard is locked.
    const solved = new Set(DEBUG.filter(c => c.difficulty !== 'Hard').map(c => c.id));
    const m = coachDebugDoorModel({ ...base, solved, solveCount: solved.size });
    expect(m.challenge.difficulty).toBe('Hard');
    expect(m.locked).toBe(true);
    // A Pro person (nothing locked) gets the same Hard, unlocked.
    const pro = coachDebugDoorModel({ ...base, solved, solveCount: solved.size, isLocked: () => false });
    expect(pro.challenge.id).toBe(m.challenge.id);
    expect(pro.locked).toBe(false);
  });

  it('a spent free quota locks every unsolved item: the card points at the first one, marked locked', () => {
    const m = coachDebugDoorModel({ ...base, solveCount: 10, isLocked: () => true });
    expect(m.locked).toBe(true);
    expect(m.challenge.difficulty).toBe('Easy');
  });

  it('a locked Easy is passed over for an open Medium', () => {
    const easyIds = new Set(DEBUG.filter(c => c.difficulty === 'Easy').map(c => c.id));
    const m = coachDebugDoorModel({ ...base, isLocked: c => easyIds.has(c.id) });
    expect(m.challenge.difficulty).toBe('Medium');
    expect(m.locked).toBe(false);
  });

  it('accepts the solved ids as an array too', () => {
    const easy = DEBUG.filter(c => c.difficulty === 'Easy').map(c => c.id).sort((a, b) => a - b);
    expect(coachDebugDoorModel({ ...base, solved: [91, easy[0]] }).challenge.id).toBe(easy[1]);
  });
});

describe('when the card is hidden', () => {
  it('either flag off', () => {
    expect(coachDebugDoorModel({ ...base, doorOn: false })).toBeNull();
    expect(coachDebugDoorModel({ ...base, debugOn: false })).toBeNull();
  });
  it('no solve yet', () => {
    expect(coachDebugDoorModel({ ...base, solved: new Set(), solveCount: 0 })).toBeNull();
  });
  it('a hired person (First 90 Days owns the Coach)', () => {
    expect(coachDebugDoorModel({ ...base, hired: true })).toBeNull();
  });
  it('every Debug item solved', () => {
    const all = new Set(DEBUG.map(c => c.id));
    expect(coachDebugDoorModel({ ...base, solved: all, solveCount: all.size })).toBeNull();
  });
  it('no Debug item in the bank (debugQuestions off upstream)', () => {
    expect(coachDebugDoorModel({ ...base, challenges: bank.filter(c => c.type !== 'debug') })).toBeNull();
  });
});

describe('the flag', () => {
  it('reads literal true only', () => {
    expect(coachDebugDoorOn({ features: { coachDebugDoor: true } })).toBe(true);
    expect(coachDebugDoorOn({ features: { coachDebugDoor: 'true' } })).toBe(false);
    expect(coachDebugDoorOn({ features: {} })).toBe(false);
    expect(coachDebugDoorOn(undefined)).toBe(false);
  });
  it('ships ON (a door, not an A/B; decision row in PR #372)', () => {
    expect(coachDebugDoorOn(W.FEATURE_FLAGS)).toBe(true);
  });
});

describe('the app wiring', () => {
  const app = read('src/app.jsx');
  const start = app.indexOf('data-testid="coach-debug-door"');
  const cardStart = app.lastIndexOf('{/* ── The Debug door (coachDebugDoor', start);
  const cardEnd = app.indexOf('{renderSqlRoadmap()}', start);
  const card = app.slice(cardStart, cardEnd);

  it('the card sits near the top of the Coach: after "Your plan", right above the roadmap', () => {
    // Under the goal's next-step card it measured 2,369-2,752 px down at
    // 1024x900 — deeper than the Practice chip that got 0 clicks at ~940 px.
    expect(start).toBeGreaterThan(0);
    expect(cardStart).toBeGreaterThan(0);
    expect(cardEnd).toBeGreaterThan(start);
    expect(cardEnd - cardStart).toBeLessThan(6000);
    const plan = app.lastIndexOf('data-testid="practice-plan"', cardStart);
    expect(plan).toBeGreaterThan(0);
    expect(cardStart - plan).toBeLessThan(4000);
    // and above the goal picker, Quick Drill, Focus Tracks and the next-step card
    expect(app.indexOf('Pick a goal to get started', cardStart)).toBeGreaterThan(cardEnd);
  });

  it('the pick comes from the pure half, ordered by the roadmap, locked by the app\'s own tests', () => {
    expect(card).toContain('coachDebugDoorModel({');
    expect(card).toContain('order: SQL_ROADMAP_CHALLENGE_ORDER');
    expect(card).toContain("isLocked: c => isContentLocked('challenge', c) || freeQuotaSpent()");
    expect(card).toContain('hired,');
    expect(card).not.toMatch(/challenges\.find\(/);
  });

  it('the button goes through openChallenge, so every wall applies', () => {
    expect(card).toContain("openChallenge(doorCh, { openedFrom: 'coach_debug_door' })");
    expect(card).not.toContain('setCurrentChallenge(');
  });

  it('records shown once a day per session, and every click with its challengeId', () => {
    expect(card).toMatch(/trackActivationEvent\('coach_debug_door_shown', \{ challengeId: doorCh\.id/);
    expect(card).toMatch(/trackActivationEvent\('coach_debug_door_clicked', \{ challengeId: doorCh\.id, target: 'item'/);
    expect(card).toMatch(/trackActivationEvent\('coach_debug_door_clicked', \{ challengeId: null, target: 'see_all' \}\)/);
    expect(card).toContain("'sqlquest_debug_door_shown_'");
  });

  it('See all turns the Debug chip on and opens Practice', () => {
    expect(card).toMatch(/setDebugFilter\(true\);\s*setActiveTab\('quests'\);\s*setPracticeSubTab\('challenges'\);/);
    expect(card).toContain("i18n_t('coach', 'debugDoorSeeAll', { n: door.total })");
  });

  it('no yellow on the card (DESIGN.md: the next-step card holds the one CTA) and no hook in the render', () => {
    expect(card).not.toMatch(/yellow|#FFE34D|#F5C518/i);
    expect(card).not.toMatch(/\buse(State|Effect|Memo|Ref|Callback)\(/);
  });

  it('the copy exists in English and Turkish, with the count', () => {
    for (const k of ['debugDoorEyebrow', 'debugDoorTitle', 'debugDoorWhy', 'debugDoorCTA', 'debugDoorSeeAll', 'debugDoorLocked']) {
      expect(t('coach', k)).not.toBe(k);
    }
    expect(t('coach', 'debugDoorSeeAll', { n: 12 })).toBe('See all 12');
    const i18n = read('src/utils/i18n.js');
    expect(i18n.match(/debugDoorTitle:/g).length).toBeGreaterThanOrEqual(2);
  });
});
