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
  pickTopNWith,
  unsolvedFreePreviews,
  hardPreviewCounts,
  isFreePreview,
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

describe('source guard: paywall counts come from the bank, never a filtered view', () => {
  // 2026-09-06 review (P1): the Hard-list banner computed its counts from
  // `rows` — the filtered, on-screen subset — so statusFilter='solved' flipped
  // the D-5 "all beaten + Unlock Hard" state before the user had beaten the
  // previews, 'unsolved' froze the counter at "0 of n", and the default
  // path-stage view made lockedHardCount a stage subset. The catcher and the
  // win line read `challenges`; the three surfaces must agree for one user.
  // The plan's rule: "All counts compute from the bank at render."
  it('every hardPreviewCounts() call in app.jsx passes the bank as its first argument', () => {
    const calls = [];
    appSource.split('\n').forEach((line, i) => {
      const re = /hardPreviewCounts\(\s*([A-Za-z_$][\w$]*)/g;
      let m;
      while ((m = re.exec(line))) calls.push({ n: i + 1, arg: m[1], line: line.trim() });
    });
    // banner, catcher, win line — at least the three surfaces the plan names
    expect(calls.length).toBeGreaterThanOrEqual(3);
    const offenders = calls.filter(c => c.arg !== 'challenges');
    expect(offenders, `count from the bank (\`challenges\`), not a filtered view:\n${offenders.map(o => `  app.jsx:${o.n}  ${o.line}`).join('\n')}`)
      .toEqual([]);
  });

  it('the Hard-list banner state (D-5 flip, lockedHardCount) is gated on bank counts', () => {
    // The exact line, so a rewrite to `rows` / `filtered` fails by name.
    expect(appSource).toMatch(/const previewCounts = hardListMode \? hardPreviewCounts\(challenges, solvedChallenges\) : null;/);
    expect(appSource).not.toMatch(/hardPreviewCounts\((rows|filtered)\b/);
  });
});

// ---------------------------------------------------------------------------
// Paywall-surface helpers (2026-09-06, docs/plans/paywall-surfaces-plan.md T7)
//
// The 2026-08-21 lock read: 15 of 16 wall-hitters had all free previews
// untouched. The Hard list, the collision catcher and a Coach step now lead
// people to them, and every one of those surfaces must (a) order previews by
// CURRICULUM, not id — the incident above, in a new place — and (b) compute
// its counts from the bank. The plan's first draft said "32 Hard" from a stale
// table; the bank had 54. So: no live-bank count below is a literal.
// ---------------------------------------------------------------------------

// The comparator exactly as it shipped on 2026-08-05, frozen here so the
// "default options are byte-identical" test compares against the old
// behaviour rather than against itself.
function legacyComparator(order) {
  return (a, b) => {
    const pathA = order.has(a.id) ? order.get(a.id) : 999999;
    const pathB = order.has(b.id) ? order.get(b.id) : 999999;
    if (pathA !== pathB) return pathA - pathB;
    const diffA = CHALLENGE_DIFFICULTY_ORDER[a.difficulty] ?? 99;
    const diffB = CHALLENGE_DIFFICULTY_ORDER[b.difficulty] ?? 99;
    if (diffA !== diffB) return diffA - diffB;
    return a.id - b.id;
  };
}

const ids = list => list.map(c => c.id);

describe('isFreePreview', () => {
  it('is a Hard challenge flagged freePreview, nothing else', () => {
    expect(isFreePreview({ id: 1, difficulty: 'Hard', freePreview: true })).toBe(true);
    expect(isFreePreview({ id: 2, difficulty: 'Hard' })).toBe(false);
    expect(isFreePreview({ id: 3, difficulty: 'Hard', freePreview: false })).toBe(false);
    // A flag on a non-Hard row is not a preview — the wall is on Hard only.
    expect(isFreePreview({ id: 4, difficulty: 'Easy', freePreview: true })).toBe(false);
    expect(isFreePreview({ id: 5, difficulty: 'Medium', freePreview: true })).toBe(false);
    expect(isFreePreview(null)).toBe(false);
    expect(isFreePreview(undefined)).toBe(false);
  });

  it('agrees with the freeHardPreviewsUnsolved stamp on content_lock_reached', () => {
    // The exact predicate app.jsx stamps at lock time. If this diverges the
    // metric and the surfaces stop counting the same thing.
    const stampPredicate = c => c.freePreview && c.difficulty === 'Hard';
    expect(ids(challenges.filter(isFreePreview))).toEqual(ids(challenges.filter(stampPredicate)));
    expect(challenges.filter(isFreePreview).length).toBeGreaterThan(0);
  });
});

describe('makeChallengeComparator({ previewsFirst })', () => {
  // Hard-only pool, as the Hard list hands it over. Mixes on-roadmap and
  // off-roadmap rows in BOTH groups so each tie-break is exercised.
  const order = buildCurriculumOrder([
    { challengeIds: [23, 11] },
    { challengeIds: [86] },
    { challengeIds: [5] },
  ]);
  const hardPool = [
    { id: 2, difficulty: 'Hard' },                       // locked, off-roadmap
    { id: 11, difficulty: 'Hard', freePreview: true },   // preview, stage 0 pos 1
    { id: 40, difficulty: 'Hard' },                      // locked, off-roadmap
    { id: 50, difficulty: 'Hard', freePreview: true },   // preview, off-roadmap
    { id: 5, difficulty: 'Hard' },                       // locked, stage 2
    { id: 86, difficulty: 'Hard', freePreview: true },   // preview, stage 1
    { id: 23, difficulty: 'Hard', freePreview: true },   // preview, stage 0 pos 0
  ];

  it('default (no options) is byte-identical to the shipped comparator on the live bank', () => {
    const legacy = ids(challenges.slice().sort(legacyComparator(liveOrder)));
    expect(ids(challenges.slice().sort(makeChallengeComparator(liveOrder)))).toEqual(legacy);
    expect(ids(challenges.slice().sort(makeChallengeComparator(liveOrder, {})))).toEqual(legacy);
    expect(ids(challenges.slice().sort(makeChallengeComparator(liveOrder, undefined)))).toEqual(legacy);
    expect(ids(challenges.slice().sort(makeChallengeComparator(liveOrder, { previewsFirst: false })))).toEqual(legacy);
  });

  it('default keeps a preview in its curriculum slot — no pinning unless asked', () => {
    // Off-roadmap preview 50 sorts AFTER on-roadmap locked 5 in the base order.
    expect(ids(hardPool.slice().sort(makeChallengeComparator(order))))
      .toEqual([23, 11, 86, 5, 2, 40, 50]);
  });

  it('previewsFirst pins previews before locked, curriculum order inside each group', () => {
    const sorted = hardPool.slice().sort(makeChallengeComparator(order, { previewsFirst: true }));
    expect(ids(sorted)).toEqual([23, 11, 86, 50, 5, 2, 40]);

    // Group boundary: every preview precedes every locked row.
    const firstLocked = sorted.findIndex(c => !isFreePreview(c));
    expect(sorted.slice(0, firstLocked).every(isFreePreview)).toBe(true);
    expect(sorted.slice(firstLocked).some(isFreePreview)).toBe(false);

    // Inside each group the order is exactly the base comparator's order —
    // the pin adds one rule, it does not replace the curriculum.
    const base = makeChallengeComparator(order);
    expect(ids(sorted.filter(isFreePreview)))
      .toEqual(ids(hardPool.filter(isFreePreview).sort(base)));
    expect(ids(sorted.filter(c => !isFreePreview(c))))
      .toEqual(ids(hardPool.filter(c => !isFreePreview(c)).sort(base)));
  });

  it('previewsFirst orders previews by curriculum, not id (23 before 11)', () => {
    const sorted = hardPool.slice().sort(makeChallengeComparator(order, { previewsFirst: true }));
    const previewIds = ids(sorted.filter(isFreePreview));
    expect(previewIds[0]).toBe(23);
    expect(previewIds).not.toEqual(previewIds.slice().sort((a, b) => a - b));
  });

  it('previewsFirst does not pin a freePreview flag on a non-Hard row', () => {
    const cmp = makeChallengeComparator(buildCurriculumOrder([{ challengeIds: [91] }]), { previewsFirst: true });
    const easyFlagged = { id: 91, difficulty: 'Easy', freePreview: true };
    const hardPreview = { id: 400, difficulty: 'Hard', freePreview: true };
    const hardLocked = { id: 300, difficulty: 'Hard' };
    // Hard preview pins first; the Easy row is not a preview and falls back to
    // base order (roadmap before off-roadmap), ahead of the locked Hard.
    expect(ids([hardLocked, easyFlagged, hardPreview].sort(cmp))).toEqual([400, 91, 300]);
  });

  it('on the live Hard list, every preview precedes every locked row and groups keep base order', () => {
    const hard = challenges.filter(c => c.difficulty === 'Hard');
    const sorted = hard.slice().sort(makeChallengeComparator(liveOrder, { previewsFirst: true }));
    const { previewTotal } = hardPreviewCounts(challenges, []);
    expect(previewTotal).toBeGreaterThan(0);
    expect(sorted.slice(0, previewTotal).every(isFreePreview)).toBe(true);
    expect(sorted.slice(previewTotal).some(isFreePreview)).toBe(false);

    const base = makeChallengeComparator(liveOrder);
    expect(ids(sorted.slice(0, previewTotal))).toEqual(ids(hard.filter(isFreePreview).sort(base)));
    expect(ids(sorted.slice(previewTotal))).toEqual(ids(hard.filter(c => !isFreePreview(c)).sort(base)));
  });
});

describe('pickTopNWith', () => {
  it('returns [] for an empty or null pool', () => {
    expect(pickTopNWith(liveOrder, [], () => true, 3)).toEqual([]);
    expect(pickTopNWith(liveOrder, null, () => true, 3)).toEqual([]);
    expect(pickTopNWith(liveOrder, undefined, () => true, 3)).toEqual([]);
  });

  it('returns [] when nothing matches', () => {
    expect(pickTopNWith(liveOrder, challenges, () => false, 3)).toEqual([]);
  });

  it('returns [] for n <= 0 or a non-number n', () => {
    expect(pickTopNWith(liveOrder, challenges, () => true, 0)).toEqual([]);
    expect(pickTopNWith(liveOrder, challenges, () => true, -1)).toEqual([]);
    expect(pickTopNWith(liveOrder, challenges, () => true, NaN)).toEqual([]);
    expect(pickTopNWith(liveOrder, challenges, () => true, undefined)).toEqual([]);
    expect(pickTopNWith(liveOrder, challenges, () => true, 'three')).toEqual([]);
  });

  it('caps at n, and returns all matches when fewer than n exist', () => {
    const mediums = challenges.filter(c => c.difficulty === 'Medium');
    expect(pickTopNWith(liveOrder, challenges, c => c.difficulty === 'Medium', 3)).toHaveLength(3);
    expect(pickTopNWith(liveOrder, challenges, c => c.difficulty === 'Medium', mediums.length + 50))
      .toHaveLength(mediums.length);
    // Fractional n floors.
    expect(pickTopNWith(liveOrder, challenges, () => true, 2.9)).toHaveLength(2);
  });

  it('returns curriculum order, not id order (fixture)', () => {
    // Authoring order 93, 91, 92 — the raw array is id-ascending.
    const order = buildCurriculumOrder([{ challengeIds: [93, 91, 92] }]);
    const pool = [
      { id: 91, difficulty: 'Easy' },
      { id: 92, difficulty: 'Easy' },
      { id: 93, difficulty: 'Easy' },
    ];
    expect(ids(pickTopNWith(order, pool, () => true, 2))).toEqual([93, 91]);
  });

  it('returns curriculum order, not id order (live bank)', () => {
    const top = pickTopNWith(liveOrder, challenges, c => c.difficulty === 'Medium', 3);
    const fullSort = challenges.filter(c => c.difficulty === 'Medium').sort(makeChallengeComparator(liveOrder));
    expect(ids(top)).toEqual(ids(fullSort.slice(0, 3)));
    // Same head as the single picker — the two must never disagree.
    expect(top[0].id).toBe(pickNextChallengeWith(liveOrder, challenges, c => c.difficulty === 'Medium').id);
    expect(top.every(c => liveOrder.has(c.id))).toBe(true);
    // The guard: raw-id and curriculum picks must disagree or this proves nothing.
    const lowestThreeMediumIds = ids(challenges.filter(c => c.difficulty === 'Medium'))
      .sort((a, b) => a - b).slice(0, 3);
    expect(ids(top), 'curriculum top-3 equals raw-id top-3 — test no longer discriminates')
      .not.toEqual(lowestThreeMediumIds);
    expect(ids(top)).not.toContain(1);
  });

  it('does not mutate the pool it is given', () => {
    const before = ids(challenges);
    pickTopNWith(liveOrder, challenges, c => c.difficulty === 'Hard', 5);
    expect(ids(challenges)).toEqual(before);
  });
});

describe('unsolvedFreePreviews', () => {
  it('returns [] for an empty or null bank', () => {
    expect(unsolvedFreePreviews([], new Set(), liveOrder)).toEqual([]);
    expect(unsolvedFreePreviews(null, new Set(), liveOrder)).toEqual([]);
  });

  it('returns only Hard freePreview challenges, all of them when nothing is solved', () => {
    const result = unsolvedFreePreviews(challenges, new Set(), liveOrder);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every(isFreePreview)).toBe(true);
    expect(result).toHaveLength(challenges.filter(isFreePreview).length);
  });

  it('treats a missing solved set as nothing solved', () => {
    expect(ids(unsolvedFreePreviews(challenges, null, liveOrder)))
      .toEqual(ids(unsolvedFreePreviews(challenges, new Set(), liveOrder)));
    expect(ids(unsolvedFreePreviews(challenges, undefined, liveOrder)))
      .toEqual(ids(unsolvedFreePreviews(challenges, [], liveOrder)));
  });

  it('accepts the solved set as a Set or as an array of ids', () => {
    const all = unsolvedFreePreviews(challenges, [], liveOrder);
    const solvedIds = [all[0].id, all[all.length - 1].id];
    expect(ids(unsolvedFreePreviews(challenges, new Set(solvedIds), liveOrder)))
      .toEqual(ids(unsolvedFreePreviews(challenges, solvedIds, liveOrder)));
  });

  it('drops a solved preview and promotes the next one in curriculum order', () => {
    const all = unsolvedFreePreviews(challenges, [], liveOrder);
    const after = unsolvedFreePreviews(challenges, [all[0].id], liveOrder);
    expect(after).toHaveLength(all.length - 1);
    expect(ids(after)).not.toContain(all[0].id);
    expect(after[0].id).toBe(all[1].id);
  });

  it('returns [] once every preview is solved — the D-5 state', () => {
    const everyPreview = ids(challenges.filter(isFreePreview));
    expect(unsolvedFreePreviews(challenges, everyPreview, liveOrder)).toEqual([]);
    expect(unsolvedFreePreviews(challenges, new Set(everyPreview), liveOrder)).toEqual([]);
  });

  it('ignores solved ids that are not previews', () => {
    const lockedHardIds = ids(challenges.filter(c => c.difficulty === 'Hard' && !isFreePreview(c)));
    expect(lockedHardIds.length).toBeGreaterThan(0);
    expect(ids(unsolvedFreePreviews(challenges, lockedHardIds, liveOrder)))
      .toEqual(ids(unsolvedFreePreviews(challenges, [], liveOrder)));
  });

  it('is in curriculum order, not id order (live bank)', () => {
    const result = unsolvedFreePreviews(challenges, [], liveOrder);
    expect(ids(result)).toEqual(ids(result.slice().sort(makeChallengeComparator(liveOrder))));
    // The guard: some previews sit on the roadmap and some do not, so the
    // curriculum order must differ from id order — otherwise this test would
    // pass against a raw-id sort and prove nothing.
    expect(ids(result), 'preview curriculum order equals id order — test no longer discriminates')
      .not.toEqual(ids(result).slice().sort((a, b) => a - b));
    expect(liveOrder.has(result[0].id), 'first unsolved preview should be a roadmap challenge').toBe(true);
  });

  it('is in curriculum order, not id order (fixture)', () => {
    const order = buildCurriculumOrder([{ challengeIds: [30, 11] }]);
    const bank = [
      { id: 11, difficulty: 'Hard', freePreview: true },
      { id: 12, difficulty: 'Hard' },
      { id: 30, difficulty: 'Hard', freePreview: true },
      { id: 91, difficulty: 'Easy', freePreview: true }, // not Hard → not a preview
    ];
    expect(ids(unsolvedFreePreviews(bank, [], order))).toEqual([30, 11]);
    expect(ids(unsolvedFreePreviews(bank, [30], order))).toEqual([11]);
  });

  it('does not mutate the bank it is given', () => {
    const before = ids(challenges);
    unsolvedFreePreviews(challenges, [], liveOrder);
    expect(ids(challenges)).toEqual(before);
  });
});

describe('hardPreviewCounts', () => {
  // Two fixture banks of different size. Counts must track the bank, never a
  // literal from a plan or a doc.
  const bankOf10 = [
    { id: 1, difficulty: 'Hard', freePreview: true },
    { id: 2, difficulty: 'Hard', freePreview: true },
    { id: 3, difficulty: 'Hard' },
    { id: 4, difficulty: 'Hard' },
    { id: 5, difficulty: 'Hard' },
    { id: 6, difficulty: 'Hard' },
    { id: 7, difficulty: 'Easy', freePreview: true }, // flag on Easy: not a preview, not Hard
    { id: 8, difficulty: 'Easy' },
    { id: 9, difficulty: 'Medium' },
    { id: 10, difficulty: 'Medium' },
  ];
  const bankOf3 = [
    { id: 1, difficulty: 'Hard', freePreview: true },
    { id: 2, difficulty: 'Hard' },
    { id: 3, difficulty: 'Easy' },
  ];
  const expectInvariants = counts => {
    expect(counts.hardTotal).toBe(counts.previewTotal + counts.lockedHardCount);
    expect(counts.previewTotal).toBe(counts.previewSolved + counts.previewUnsolved);
    Object.values(counts).forEach(v => expect(v).toBeGreaterThanOrEqual(0));
  };

  it('returns all zeros for an empty or null bank', () => {
    const zeros = { hardTotal: 0, previewTotal: 0, previewSolved: 0, previewUnsolved: 0, lockedHardCount: 0 };
    expect(hardPreviewCounts([], [])).toEqual(zeros);
    expect(hardPreviewCounts(null, null)).toEqual(zeros);
  });

  it('counts a 10-row bank from the bank, with a solved preview and a solved non-preview', () => {
    const counts = hardPreviewCounts(bankOf10, [1, 7, 9]);
    expect(counts).toEqual({ hardTotal: 6, previewTotal: 2, previewSolved: 1, previewUnsolved: 1, lockedHardCount: 4 });
    expectInvariants(counts);
  });

  it('counts a 3-row bank from the bank', () => {
    const counts = hardPreviewCounts(bankOf3, []);
    expect(counts).toEqual({ hardTotal: 2, previewTotal: 1, previewSolved: 0, previewUnsolved: 1, lockedHardCount: 1 });
    expectInvariants(counts);
  });

  it('scales with bank size — the two fixtures differ by exactly their Hard/preview deltas', () => {
    const big = hardPreviewCounts(bankOf10, []);
    const small = hardPreviewCounts(bankOf3, []);
    expect(big.hardTotal - small.hardTotal).toBe(
      bankOf10.filter(c => c.difficulty === 'Hard').length - bankOf3.filter(c => c.difficulty === 'Hard').length,
    );
    expect(big.previewTotal - small.previewTotal).toBe(
      bankOf10.filter(isFreePreview).length - bankOf3.filter(isFreePreview).length,
    );
    expect(big.lockedHardCount).not.toBe(small.lockedHardCount);
    expect(big.previewUnsolved).not.toBe(small.previewUnsolved);
  });

  it('accepts the solved set as a Set, an array, or nothing', () => {
    expect(hardPreviewCounts(bankOf10, new Set([1, 2]))).toEqual(hardPreviewCounts(bankOf10, [1, 2]));
    expect(hardPreviewCounts(bankOf10, undefined)).toEqual(hardPreviewCounts(bankOf10, []));
    expect(hardPreviewCounts(bankOf10, new Set([1, 2])).previewSolved).toBe(2);
    expect(hardPreviewCounts(bankOf10, new Set([1, 2])).previewUnsolved).toBe(0);
  });

  it('does not count a solved locked Hard as a solved preview', () => {
    expect(hardPreviewCounts(bankOf10, [3, 4, 5, 6]).previewSolved).toBe(0);
  });

  it('matches the live bank, computed — never a literal', () => {
    const counts = hardPreviewCounts(challenges, []);
    expectInvariants(counts);
    expect(counts.hardTotal).toBe(challenges.filter(c => c.difficulty === 'Hard').length);
    expect(counts.previewTotal).toBe(challenges.filter(isFreePreview).length);
    expect(counts.lockedHardCount).toBe(challenges.filter(c => c.difficulty === 'Hard' && !isFreePreview(c)).length);
    expect(counts.previewSolved).toBe(0);
    expect(counts.previewUnsolved).toBe(unsolvedFreePreviews(challenges, [], liveOrder).length);
    // Both copy surfaces need both numbers to be non-zero to mean anything.
    expect(counts.previewTotal).toBeGreaterThan(0);
    expect(counts.lockedHardCount).toBeGreaterThan(0);
  });

  it('tracks solves on the live bank and reaches the D-5 completed state', () => {
    const previews = unsolvedFreePreviews(challenges, [], liveOrder);
    const partial = hardPreviewCounts(challenges, [previews[0].id]);
    expect(partial.previewSolved).toBe(1);
    expect(partial.previewUnsolved).toBe(previews.length - 1);
    expectInvariants(partial);

    const done = hardPreviewCounts(challenges, ids(previews));
    expect(done.previewSolved).toBe(done.previewTotal);
    expect(done.previewUnsolved).toBe(0);
    expect(done.lockedHardCount).toBe(hardPreviewCounts(challenges, []).lockedHardCount);
    expectInvariants(done);
  });
});
