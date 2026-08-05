// SQL Quest — challenge recommendation ordering
//
// THE INCIDENT (2026-08-05)
//
// Challenge 1 "Class Survival Breakdown" was the single worst challenge in the
// bank: 138 openers, 33 finishers, 24% solve-through, and every one of the 30
// `challenge_errored` rows on the beginner list. Challenge 91 "Your First
// Query", the one actually written to be first, converts at 73% on an
// identical definition.
//
// Every curriculum path was correct. FIRST_RUN_LEVELS starts brand-new users
// at 91. SQL_ROADMAP_STAGES[0] is [91, 92]. COACH_PLACEMENT_CHALLENGE_IDS
// starts at 91. Challenge 1 was first in exactly one place — the 'advanced'
// first-run track, where a Medium diagnostic is the point.
//
// The leak was elsewhere: four recommendation sites read the RAW `challenges`
// array with `.find()` / `[0]`. That array is FAANG-interview ordered (1-90
// hard bank, 91-105 beginner ladder), so the first Medium by id is challenge 1
// — handed to every single user who solved any Medium, as "what's next".
//
// The same bug had already been found and fixed once, locally, in the
// onboarding handoff. It was never generalised, so it grew back four times.
// These tests bind the picker to the LIVE challenge bank so it cannot again.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  buildCurriculumOrder,
  makeChallengeComparator,
  pickNextChallengeWith,
  CHALLENGE_DIFFICULTY_ORDER,
} from '../src/utils/challenge-order.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JSX = join(HERE, '..', 'src', 'app.jsx');

let challenges;
let liveStages;
let liveOrder;
let appSource;

// SQL_ROADMAP_STAGES lives inside app.jsx (a 32k-line React module we will not
// import from a unit test). Reading the stage ids out of the source keeps this
// bound to the LIVE sequence: re-order the roadmap and this test re-orders with
// it, which is the whole point — a fixture copy would drift and certify itself.
function extractRoadmapStageChallengeIds(source) {
  const start = source.indexOf('const SQL_ROADMAP_STAGES');
  if (start < 0) throw new Error('SQL_ROADMAP_STAGES not found in app.jsx');
  const end = source.indexOf('const SQL_ROADMAP_CHALLENGE_ORDER', start);
  if (end < 0) throw new Error('SQL_ROADMAP_CHALLENGE_ORDER not found after stages');
  const block = source.slice(start, end);
  const stages = [];
  const re = /challengeIds:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const ids = m[1].split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n));
    stages.push({ challengeIds: ids });
  }
  return stages;
}

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import('../src/data/challenges.js');
  challenges = globalThis.window.challengesData;

  appSource = readFileSync(APP_JSX, 'utf8');
  liveStages = extractRoadmapStageChallengeIds(appSource);
  liveOrder = buildCurriculumOrder(liveStages);
});

describe('curriculum order map', () => {
  it('reads a non-trivial live roadmap', () => {
    expect(liveStages.length).toBeGreaterThanOrEqual(5);
    expect(liveOrder.size).toBeGreaterThanOrEqual(20);
  });

  it('ranks stage order above within-stage order', () => {
    const order = buildCurriculumOrder([
      { challengeIds: [91, 92] },
      { challengeIds: [93] },
    ]);
    expect(order.get(91)).toBe(0);
    expect(order.get(92)).toBe(1);
    expect(order.get(93)).toBe(1000);
  });

  it('keeps the first stage that lists an id — a later repeat is review', () => {
    const order = buildCurriculumOrder([
      { challengeIds: [50] },
      { challengeIds: [50] },
    ]);
    expect(order.get(50)).toBe(0);
  });

  it('tolerates stages with no challenges', () => {
    const order = buildCurriculumOrder([{ challengeIds: [] }, {}, null, { challengeIds: [7] }]);
    expect(order.get(7)).toBe(3000);
    expect(order.size).toBe(1);
  });
});

describe('comparator', () => {
  const order = buildCurriculumOrder([{ challengeIds: [91, 92] }, { challengeIds: [93] }]);
  const cmp = makeChallengeComparator(order);

  it('puts roadmap challenges ahead of off-roadmap ones regardless of id', () => {
    const roadmap = { id: 93, difficulty: 'Easy' };
    const offRoadmap = { id: 1, difficulty: 'Easy' };
    expect([offRoadmap, roadmap].sort(cmp)[0]).toBe(roadmap);
  });

  it('breaks off-roadmap ties by difficulty, then id', () => {
    const hardLowId = { id: 2, difficulty: 'Hard' };
    const easyHighId = { id: 400, difficulty: 'Easy' };
    expect([hardLowId, easyHighId].sort(cmp)[0]).toBe(easyHighId);
    const a = { id: 30, difficulty: 'Medium' };
    const b = { id: 12, difficulty: 'Medium' };
    expect([a, b].sort(cmp)[0]).toBe(b);
  });

  it('sorts an unknown difficulty last rather than throwing', () => {
    const weird = { id: 500, difficulty: 'Impossible' };
    const hard = { id: 501, difficulty: 'Hard' };
    expect([weird, hard].sort(cmp)[0]).toBe(hard);
    expect(CHALLENGE_DIFFICULTY_ORDER.Impossible).toBeUndefined();
  });
});

describe('pickNextChallengeWith', () => {
  it('returns null, not undefined, when nothing matches', () => {
    expect(pickNextChallengeWith(liveOrder, challenges, () => false)).toBeNull();
  });

  it('does not mutate the pool it is given', () => {
    const before = challenges.map(c => c.id);
    pickNextChallengeWith(liveOrder, challenges, c => c.difficulty === 'Medium');
    expect(challenges.map(c => c.id)).toEqual(before);
  });

  it('handles a null pool', () => {
    expect(pickNextChallengeWith(liveOrder, null, () => true)).toBeNull();
  });
});

describe('the regression itself, against the live bank', () => {
  it('never recommends challenge 1 to a user who just solved a Medium', () => {
    // The exact predicate the post-solve card uses: same difficulty, unsolved,
    // not the one just finished. Before the fix this returned id 1 for EVERY
    // Medium in the bank, because 1 is the lowest-id Medium and the array is
    // read in id order.
    const mediums = challenges.filter(c => c.difficulty === 'Medium' && c.id !== 1);
    expect(mediums.length).toBeGreaterThan(5);

    for (const justSolved of mediums) {
      const rec = pickNextChallengeWith(
        liveOrder,
        challenges,
        c => c.difficulty === 'Medium' && c.id !== justSolved.id,
      );
      expect(rec, `no recommendation after #${justSolved.id}`).not.toBeNull();
      expect(rec.id, `recommended challenge 1 after solving #${justSolved.id}`).not.toBe(1);
      expect(liveOrder.has(rec.id), `recommended off-roadmap #${rec.id} after #${justSolved.id}`).toBe(true);
    }
  });

  it('recommends a roadmap Medium, not the lowest-id Medium', () => {
    const solved = new Set();
    const rec = pickNextChallengeWith(
      liveOrder,
      challenges,
      c => c.difficulty === 'Medium' && !solved.has(c.id),
    );
    expect(rec).not.toBeNull();
    expect(liveOrder.has(rec.id)).toBe(true);

    const lowestIdMedium = challenges
      .filter(c => c.difficulty === 'Medium')
      .reduce((min, c) => (c.id < min.id ? c : min));
    // The guard: raw-id order and curriculum order must disagree here, or this
    // test proves nothing. If the bank is ever re-numbered so they agree, this
    // assertion fails loudly and asks to be re-thought rather than silently
    // passing forever.
    expect(rec.id, 'curriculum pick equals raw-id pick — test no longer discriminates')
      .not.toBe(lowestIdMedium.id);
  });

  it('starts a cold user on 91, not 1', () => {
    const rec = pickNextChallengeWith(liveOrder, challenges, () => true);
    expect(rec.id).toBe(91);
  });
});

describe('source guard: no recommendation reads raw id order', () => {
  // The bug class, not the instance. Any `challenges.find(c => ... difficulty`
  // in app.jsx is picking by id order again.
  it('app.jsx has no raw challenges.find() difficulty picks left', () => {
    const offenders = appSource
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /challenges\.find\(\s*c\s*=>[^)]*difficulty/.test(line));
    expect(offenders, `use pickNextChallenge() instead:\n${offenders.map(o => `  app.jsx:${o.n}  ${o.line}`).join('\n')}`)
      .toEqual([]);
  });

  it('app.jsx routes recommendations through pickNextChallenge', () => {
    expect(appSource).toContain('pickNextChallengeWith');
    const uses = appSource.match(/pickNextChallenge\(/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(5);
  });
});
