// SQL Quest — roadmap stage expansion
//
// THE MEASUREMENT (2026-09-09)
//
// SQL_ROADMAP_STAGES hand-lists 38 challenge ids. The Practice tab's path
// filter defaults to 'recommended', which resolves to the user's CURRENT
// stage, so the default view of a 287-challenge bank shows 2-7 challenges.
// 66% of all 299 engaged users' solves land on those 38 ids; the average
// engaged user has solved 17 of 213 free challenges. No sector challenge
// (200-299) is in any stage.
//
// Expansion must not buy coverage by disturbing teaching order. The curated
// ids are a human decision and the 105-opener claim (ledger, reads
// 2026-09-13) depends on the first one staying first. So the load-bearing
// test here is the PREFIX test: every stage's output must begin with its
// authored ids, in the authored order, nothing inserted between them.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  expandStageChallenges,
  challengeFitsStage,
  isFreeChallenge,
  placementStartIndex,
  PLACEMENT_START_STAGE_ID,
  DEFAULT_STAGE_CAP,
} from '../src/utils/roadmap.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JSX = join(HERE, '..', 'src', 'app.jsx');

let challenges;
let liveStages;

// Read the stages out of app.jsx rather than keeping a fixture copy. A fixture
// would drift and then certify its own drift; parsing the live source means
// re-ordering the roadmap re-orders this test with it.
function extractStages(source) {
  const start = source.indexOf('const SQL_ROADMAP_STAGES');
  if (start < 0) throw new Error('SQL_ROADMAP_STAGES not found in app.jsx');
  const end = source.indexOf('const SQL_ROADMAP_CHALLENGE_ORDER', start);
  if (end < 0) throw new Error('SQL_ROADMAP_CHALLENGE_ORDER not found after stages');
  const block = source.slice(start, end);
  const stages = [];
  const re = /id: '([a-z]+)',[\s\S]*?challengeIds: \[([^\]]*)\],\s*\n\s*\/\/[\s\S]*?skills: \[([^\]]*)\],\s*\n\s*maxDifficulty: '([A-Za-z]+)'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    stages.push({
      id: m[1],
      challengeIds: m[2].split(',').map(s => s.trim()).filter(Boolean).map(Number).filter(Number.isInteger),
      skills: m[3].split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean),
      maxDifficulty: m[4],
    });
  }
  return stages;
}

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  // Both files, in this order. sector-challenges APPENDS to
  // window.challengesData — concatenating the two by hand double-counts every
  // sector challenge, which has produced two wrong measurements already.
  await import('../src/data/challenges.js');
  await import('../src/data/sector-challenges.js');
  challenges = globalThis.window.challengesData;
  liveStages = extractStages(readFileSync(APP_JSX, 'utf8'));
});

describe('the live roadmap is readable and annotated', () => {
  it('parses every stage with skills and a difficulty ceiling', () => {
    expect(liveStages.length).toBe(10);
    for (const s of liveStages) {
      expect(s.skills.length).toBeGreaterThan(0);
      expect(['Easy', 'Medium', 'Hard']).toContain(s.maxDifficulty);
    }
  });

  it('binds to a bank with no duplicate ids', () => {
    expect(challenges.length).toBeGreaterThan(250);
    expect(new Set(challenges.map(c => c.id)).size).toBe(challenges.length);
  });
});

describe('curated order is preserved — the load-bearing guarantee', () => {
  it('every stage output STARTS with its authored ids, in order', () => {
    const out = expandStageChallenges({ stages: liveStages, challenges });
    expect(out.length).toBe(liveStages.length);
    out.forEach((stage, i) => {
      const authored = liveStages[i].challengeIds;
      expect(stage.challengeIds.slice(0, authored.length)).toEqual(authored);
    });
  });

  it('keeps the first contact first', () => {
    const out = expandStageChallenges({ stages: liveStages, challenges });
    expect(out[0].challengeIds[0]).toBe(liveStages[0].challengeIds[0]);
    expect(out[0].challengeIds[0]).toBe(91);
  });

  it('mutation check: a reordered curated list fails the prefix test', () => {
    const tampered = liveStages.map((s, i) => (
      i === 1 ? { ...s, challengeIds: [...s.challengeIds].reverse() } : s
    ));
    const out = expandStageChallenges({ stages: tampered, challenges });
    expect(out[1].challengeIds.slice(0, 2)).not.toEqual(liveStages[1].challengeIds.slice(0, 2));
  });
});

describe('expansion actually widens coverage', () => {
  it('reaches far more of the bank than the authored 38', () => {
    const before = new Set(liveStages.flatMap(s => s.challengeIds));
    const out = expandStageChallenges({ stages: liveStages, challenges });
    const after = new Set(out.flatMap(s => s.challengeIds));
    expect(before.size).toBe(38);
    expect(out.length).toBe(10);
    expect(after.size).toBeGreaterThan(before.size * 2);
  });

  it('never lists the same challenge in two stages', () => {
    const out = expandStageChallenges({ stages: liveStages, challenges });
    const all = out.flatMap(s => s.challengeIds);
    expect(new Set(all).size).toBe(all.length);
  });

  it('respects the per-stage cap', () => {
    const out = expandStageChallenges({ stages: liveStages, challenges, cap: 10 });
    for (const s of out) {
      // Curated lists are never truncated, so a stage can exceed the cap only
      // if its authored list already does.
      const authored = liveStages.find(x => x.id === s.id).challengeIds.length;
      expect(s.challengeIds.length).toBeLessThanOrEqual(Math.max(10, authored));
    }
  });
});

describe('a non-Pro user is never shown a locked challenge', () => {
  it('appends no Pro-only Hard challenge', () => {
    const out = expandStageChallenges({ stages: liveStages, challenges });
    const byId = new Map(challenges.map(c => [c.id, c]));
    for (const stage of out) {
      for (const id of stage.addedChallengeIds) {
        expect(isFreeChallenge(byId.get(id))).toBe(true);
      }
    }
  });

  it('includeLocked opens the pool for Pro', () => {
    const free = expandStageChallenges({ stages: liveStages, challenges });
    const pro = expandStageChallenges({ stages: liveStages, challenges, includeLocked: true });
    const freeN = new Set(free.flatMap(s => s.challengeIds)).size;
    const proN = new Set(pro.flatMap(s => s.challengeIds)).size;
    expect(proN).toBeGreaterThanOrEqual(freeN);
  });
});

describe('appended work matches the stage that appends it', () => {
  it('every added challenge fits its stage skills and ceiling', () => {
    const out = expandStageChallenges({ stages: liveStages, challenges });
    const byId = new Map(challenges.map(c => [c.id, c]));
    for (const stage of out) {
      const spec = liveStages.find(x => x.id === stage.id);
      for (const id of stage.addedChallengeIds) {
        expect(challengeFitsStage(byId.get(id), spec)).toBe(true);
      }
    }
  });

  it('a stage with no declared skills stays exactly as authored', () => {
    const bare = [{ id: 'bare', challengeIds: [91, 92] }];
    const out = expandStageChallenges({ stages: bare, challenges });
    expect(out[0].challengeIds).toEqual([91, 92]);
    expect(out[0].addedChallengeIds).toEqual([]);
  });
});

describe('the goal steers what gets appended', () => {
  it('floats goal-relevant challenges ahead of the rest', () => {
    const goal = { id: 'g', skillsTargeted: ['Window Functions'] };
    const stage = {
      id: 'mixed',
      challengeIds: [],
      skills: ['Window Functions', 'Joins'],
      maxDifficulty: 'Medium',
    };
    const withGoal = expandStageChallenges({ stages: [stage], challenges, goal, cap: 6 });
    const byId = new Map(challenges.map(c => [c.id, c]));
    const firstIsWindow = withGoal[0].challengeIds
      .slice(0, 3)
      .every(id => (byId.get(id).skills || []).concat(byId.get(id).category || [])
        .some(t => /window|rank|row_number|lag|lead|over/i.test(String(t))));
    expect(firstIsWindow).toBe(true);
  });

  it('is deterministic — same inputs, same output', () => {
    const a = expandStageChallenges({ stages: liveStages, challenges });
    const b = expandStageChallenges({ stages: liveStages, challenges });
    expect(a.map(s => s.challengeIds)).toEqual(b.map(s => s.challengeIds));
  });
});

describe('placement start is bound to stage ids, not array positions', () => {
  // app.jsx carried `basics -> 1, working -> 3, advanced -> 6` as bare numbers.
  // Two of the nine canonical skills (String Functions, Date Functions) have no
  // stage yet, so an insertion is coming and those numbers would silently mean
  // a different stage. These assert the id map reproduces today's behaviour.
  it('reproduces the old numeric mapping on the pre-insertion stage list', () => {
    // The eight stages as they stood before 'strings' and 'dates' were added.
    // Against that list the id map must still give 1 / 3 / 6, which is the
    // proof that converting from bare numbers changed nobody's placement.
    const before = liveStages.filter(s => s.id !== 'strings' && s.id !== 'dates');
    expect(before.length).toBe(8);
    expect(placementStartIndex(before, 'basics')).toBe(1);
    expect(placementStartIndex(before, 'working')).toBe(3);
    expect(placementStartIndex(before, 'advanced')).toBe(6);
  });

  it('resolves to the intended stage on the CURRENT list, whatever its length', () => {
    for (const [level, stageId] of Object.entries(PLACEMENT_START_STAGE_ID)) {
      expect(liveStages[placementStartIndex(liveStages, level)].id).toBe(stageId);
    }
  });

  it('falls back to 0 for an unknown level', () => {
    expect(placementStartIndex(liveStages, '')).toBe(0);
    expect(placementStartIndex(liveStages, 'nonsense')).toBe(0);
  });

  it('survives an inserted stage, which a bare index would not', () => {
    const inserted = [
      liveStages[0],
      { id: 'strings', challengeIds: [], skills: ['String Functions'], maxDifficulty: 'Medium' },
      ...liveStages.slice(1),
    ];
    // 'working' still means the joins stage, now at index 4 rather than 3.
    expect(placementStartIndex(inserted, 'working')).toBe(4);
    expect(inserted[placementStartIndex(inserted, 'working')].id).toBe('joins');
  });

  it('every mapped stage id exists in the live roadmap', () => {
    for (const id of Object.values(PLACEMENT_START_STAGE_ID)) {
      expect(liveStages.some(s => s.id === id)).toBe(true);
    }
  });
});

describe('module constants', () => {
  it('has a sane default cap', () => {
    expect(DEFAULT_STAGE_CAP).toBeGreaterThan(6);
    expect(DEFAULT_STAGE_CAP).toBeLessThan(40);
  });
});
