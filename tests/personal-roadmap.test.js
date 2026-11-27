// The personal roadmap engine (src/utils/personal-roadmap.js), against the
// LIVE bank. Spec: docs/plans/personalized-roadmap-2026-11-26.md.
//
// Two kinds of test:
//   1. The six worked personas of the plan doc, pinned id for id. A bank or
//      tag change that moves a plan fails here by name; update the doc's
//      table in the same commit (the doc and this file must agree).
//   2. Invariants over a grid of profiles: the quota stays the first wall,
//      curriculum order within a difficulty, the company's share, no date
//      written anywhere, determinism (including against a reversed bank —
//      the raw-order trap, fragile area 4).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  buildRoadmap,
  resolveProfile,
  apportion,
  weightedSequence,
  MIN_ROADMAP_STEPS,
  DEFAULT_SPRINT_DAYS_BY_LEVEL,
  DIFFICULTY_MIX_BY_LEVEL,
  DAILY_CAP_BY_DEVICE,
} from '../src/utils/personal-roadmap.js';
import { makeChallengeComparator, isFreePreview } from '../src/utils/challenge-order.js';
import { SQL_ROADMAP_CHALLENGE_ORDER } from '../src/data/roadmap-stages.js';
import { FREE_SOLVE_QUOTA, FREE_MOCK_ID, companySetFreeIds } from '../src/utils/free-tier-boundary.js';
import { findPlanTarget } from '../src/utils/interview-prep.js';

const p = rel => fileURLToPath(new URL(rel, import.meta.url));
const moduleSource = readFileSync(p('../src/utils/personal-roadmap.js'), 'utf8');
const appSource = readFileSync(p('../src/app.jsx'), 'utf8');

let bank;
let opts;
const cmp = makeChallengeComparator(SQL_ROADMAP_CHALLENGE_ORDER);
const RANK = { Easy: 0, Medium: 1, Hard: 2 };

beforeAll(async () => {
  // The bundle's order (scripts/data-files.js): flags first, Debug last.
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
  opts = {
    companyMap: globalThis.window.challengeCompanies,
    mocks: globalThis.window.mockInterviewsData,
    goals: globalThis.window.coachGoals,
  };
});

const ids = r => r.steps.map(s => (s.kind === 'mock' ? s.mockId : s.challengeId));
const byId = () => new Map(bank.map(c => [c.id, c]));

// ───────────────────────────── the six personas ─────────────────────────────

export const PERSONAS = {
  capitalOne: {
    profile: { company: 'Capital One', level: 'working', deadlineDays: 10, skillScores: { 'Window Functions': 20, Joins: 70, 'Aggregation & Grouping': 75 } },
    ids: [98, 105, 168, 275, 276, 277, 107, 110, 57, 169, 'sql-fundamentals-free', 112, 285, 278, 279, 280, 281, 282, 290, 291, 292, 283, 284, 23, 296, 297, 298, 299, 'capital-one-codesignal'],
    length: 29, daily: 3, planDays: 9, wallAt: 10,
  },
  revolut: {
    profile: { company: 'Revolut', level: 'basics' },
    ids: [98, 99, 105, 103, 104, 174, 177, 300, 301, 303, 'sql-fundamentals-free', 304, 306, 309, 311, 31, 302, 305, 307, 308, 310, 'revolut-analytics-screen'],
    length: 22, daily: 2, planDays: 10, wallAt: 10,
  },
  learner: {
    profile: { goal: 'learning' },
    ids: [91, 92, 98, 99, 105, 104, 127, 174, 177, 178, 93, 107, 106, 34, 57],
    length: 15, daily: 2, planDays: 8, wallAt: 10,
  },
  metaTagged: {
    profile: { company: 'Meta', level: 'working', goal: 'interview' },
    ids: [98, 168, 177, 34, 35, 46, 53, 56, 66, 121, 'sql-fundamentals-free', 2, 9, 11, 26, 54, 55, 59, 60, 61, 72, 77, 83, 85, 87, 88, 'top-10-most-asked'],
    length: 27, daily: 3, planDays: 9, wallAt: 10,
  },
  untaggedToSector: {
    profile: { company: 'American Express', sector: 'finans', level: 'basics' },
    ids: [168, 177, 200, 201, 202, 203, 207, 208, 276, 277, 'sql-fundamentals-free', 210, 211, 212, 213, 214, 218, 278, 279, 216, 260, 'top-10-most-asked'],
    length: 22, daily: 2, planDays: 10, wallAt: 10,
  },
  indiaPhoneBeginner: {
    profile: { level: 'brand-new', device: 'mobile', goal: 'job_ready' },
    ids: [91, 92, 98, 99, 105, 104, 174, 177, 34, 57, 107, 184],
    length: 12, daily: 2, planDays: 6, wallAt: 10,
  },
};

describe('the six worked personas (plan doc §5) against the live bank', () => {
  for (const [name, want] of Object.entries(PERSONAS)) {
    it(`${name}: ${want.length} steps, ${want.daily} a day, wall after step ${want.wallAt}`, () => {
      const r = buildRoadmap(want.profile, bank, opts);
      expect(ids(r)).toEqual(want.ids);
      expect(r.length).toBe(want.length);
      expect(r.dailyCount).toBe(want.daily);
      expect(r.planDays).toBe(want.planDays);
      expect(r.wallAt).toBe(want.wallAt);
      expect(r.why.length).toBeGreaterThanOrEqual(2);
      expect(r.why.length).toBeLessThanOrEqual(3);
      expect(r.summary).not.toMatch(/\bPro\b/);
      for (const line of r.why) expect(line).not.toMatch(/\bPro\b/);
    });
  }

  it('the Capital One persona: focus is the weakest skill, reviews come back 3 and 7 days after it starts, the 3 free set items sit inside the free ten', () => {
    const r = buildRoadmap(PERSONAS.capitalOne.profile, bank, opts);
    expect(r.profile.focus).toBe('Window Functions');
    expect(r.profile.focusSource).toBe('weakest');
    const review = r.steps.filter(s => s.kind === 'review');
    expect(review.map(s => [s.challengeId, s.difficulty, s.day])).toEqual([[169, 'Easy', 4], [23, 'Hard', 8]]);
    expect(r.steps.find(s => s.skill === 'Window Functions').day).toBe(1);
    expect(r.steps.slice(0, r.wallAt).filter(s => [275, 276, 277].includes(s.challengeId))).toHaveLength(3);
    expect(r.why[0]).toBe('Built on our 25-question Capital One set and its timed mock.');
  });

  it('Meta is a tagged target: the why carries the honest tagged note, never a number', () => {
    const r = buildRoadmap(PERSONAS.metaTagged.profile, bank, opts);
    expect(r.profile.targetKind).toBe('tagged');
    expect(r.why[0]).toMatch(/tagged Meta .*not Meta's process/);
    expect(r.why.join(' ')).not.toMatch(/readiness|\d+%/i);
  });

  it('American Express has < 5 tagged, so the plan falls back to the finance datasets', () => {
    expect(findPlanTarget('American Express', bank, opts.companyMap, opts.mocks)).toBeNull();
    const r = buildRoadmap(PERSONAS.untaggedToSector.profile, bank, opts);
    expect(r.profile.scope).toBe('sector');
    expect(r.scopeShare).toBeGreaterThanOrEqual(0.5);
    expect(r.why[0]).toMatch(/fewer than 5 questions tagged American Express/);
  });

  it('the phone plan is the shortest plan, two a day', () => {
    const r = buildRoadmap(PERSONAS.indiaPhoneBeginner.profile, bank, opts);
    expect(r.steps.filter(s => s.kind !== 'mock')).toHaveLength(MIN_ROADMAP_STEPS);
    expect(r.dailyCount).toBe(DAILY_CAP_BY_DEVICE.mobile);
  });
});

// ───────────────────────────── the grid ─────────────────────────────────────

const COMPANIES = [null, 'Capital One', 'Revolut', 'Meta', 'Amazon', 'Snowflake', 'Morgan Stanley', 'Acme Analytics'];
const LEVELS = [null, 'brand-new', 'basics', 'working', 'advanced'];
const DEVICES = ['desktop', 'mobile'];
const DEADLINES = [null, 3, 14];
const FOCUS = [null, 'Window Functions', 'NULL Handling'];

function grid() {
  const out = [];
  for (const company of COMPANIES) for (const level of LEVELS) for (const device of DEVICES) {
    for (const deadlineDays of DEADLINES) for (const focus of FOCUS) {
      // Every fourth cell only — the grid stays a few hundred plans, still every value of every axis.
      if ((out.length + COMPANIES.indexOf(company) + LEVELS.indexOf(level)) % 4 !== 0) { out.push(null); continue; }
      out.push({ company, level, device, deadlineDays, focus, ...(company === null && level === null ? { goal: 'learning' } : {}) });
    }
  }
  return out.filter(Boolean);
}

describe('invariants over the profile grid', () => {
  let plans;
  beforeAll(() => {
    plans = grid().map(profile => ({ profile, r: buildRoadmap(profile, bank, opts) }));
  });

  it('builds a plan for every profile in the grid', () => {
    expect(plans.length).toBeGreaterThan(100);
    for (const { r } of plans) expect(r.steps.filter(s => s.kind !== 'mock').length).toBeGreaterThanOrEqual(MIN_ROADMAP_STEPS);
  });

  it('no Pro-only step before the wall, and the wall is the 10th free solve', () => {
    for (const { profile, r } of plans) {
      expect(r.wallAt, JSON.stringify(profile)).toBeGreaterThan(0);
      const before = r.steps.slice(0, r.wallAt);
      expect(before.filter(s => s.proOnly), JSON.stringify(profile)).toEqual([]);
      const freeSolves = before.filter(s => s.kind !== 'mock' && !s.proOnly).length;
      expect(freeSolves, JSON.stringify(profile)).toBe(FREE_SOLVE_QUOTA);
      expect(r.steps[r.wallAt - 1].kind).not.toBe('mock');
    }
  });

  it('every step marked free is free to a free account (not a locked Hard)', () => {
    const map = byId();
    for (const { r } of plans) {
      for (const s of r.steps.filter(x => x.kind !== 'mock' && x.free)) {
        const c = map.get(s.challengeId);
        expect(c.difficulty !== 'Hard' || isFreePreview(c)).toBe(true);
      }
    }
  });

  it('curriculum order within a difficulty, and the difficulty ramp, inside each part of the plan', () => {
    const map = byId();
    for (const { profile, r } of plans) {
      for (const part of ['free', 'after_wall']) {
        const seq = r.steps.filter(s => s.kind === 'challenge' && s.part === part).map(s => map.get(s.challengeId));
        for (let i = 1; i < seq.length; i++) {
          const a = seq[i - 1]; const b = seq[i];
          expect(RANK[a.difficulty] <= RANK[b.difficulty], `${part} ramp ${a.id}→${b.id} ${JSON.stringify(profile)}`).toBe(true);
          if (a.difficulty === b.difficulty) expect(cmp(a, b) < 0, `${part} order ${a.id}→${b.id} ${JSON.stringify(profile)}`).toBe(true);
        }
      }
    }
  });

  // X = 50%. The only thing allowed to hold it lower is what the rules let
  // the set fill: at least 3 of the free ten (on a signed set the gate frees
  // exactly 3), then every step after the wall, at the level's difficulties.
  it('a company with ≥ 5 tagged: its share is at least half, or every slot the set can legally fill', () => {
    let atHalf = 0;
    for (const { profile, r } of plans) {
      if (!profile.company) continue;
      const target = findPlanTarget(profile.company, bank, opts.companyMap, opts.mocks);
      if (!target) continue;
      const allowed = Object.entries(DIFFICULTY_MIX_BY_LEVEL[r.profile.level]).filter(([, v]) => v > 0).map(([d]) => d);
      const set = bank.filter(c => target.challengeIds.includes(c.id) && allowed.includes(c.difficulty));
      const gate = target.kind === 'archetype' ? companySetFreeIds(bank.filter(c => target.challengeIds.includes(c.id))) : null;
      const freeSet = gate ? [...gate] : set.filter(c => c.difficulty !== 'Hard' || isFreePreview(c));
      const n = r.steps.filter(s => s.kind === 'challenge').length;
      const inFree = Math.min(3, freeSet.length, FREE_SOLVE_QUOTA);
      const bound = inFree + Math.min(n - FREE_SOLVE_QUOTA, set.filter(c => !(gate && gate.has(c.id))).length - (gate ? 0 : inFree));
      expect(r.scopeShare, JSON.stringify(profile)).toBeGreaterThanOrEqual(Math.min(0.5, bound / (n + r.steps.filter(s => s.kind === 'review').length)) - 1e-9);
      if (r.scopeShare >= 0.5) atHalf += 1;
    }
    expect(atHalf).toBeGreaterThan(0);
  });

  it('only the level\'s difficulties appear (a beginner never meets a Hard); a signed set\'s free three are the one exception', () => {
    const map = byId();
    for (const { r } of plans) {
      const allowed = DIFFICULTY_MIX_BY_LEVEL[r.profile.level];
      for (const s of r.steps.filter(x => x.kind !== 'mock' && x.reason !== 'company_free')) expect(allowed[map.get(s.challengeId).difficulty]).toBeGreaterThan(0);
      for (const s of r.steps.filter(x => x.reason === 'company_free')) expect(map.get(s.challengeId).difficulty).not.toBe('Hard');
    }
  });

  it('pace: the device cap, at least 2 a day, and a default sprint by level when no date was given', () => {
    for (const { profile, r } of plans) {
      expect(r.dailyCount).toBeLessThanOrEqual(DAILY_CAP_BY_DEVICE[profile.device]);
      expect(r.dailyCount).toBeGreaterThanOrEqual(2);
      if (profile.deadlineDays == null) {
        expect(r.profile.deadlineSource).toBe('default_by_level');
        expect(r.profile.deadlineDays).toBe(DEFAULT_SPRINT_DAYS_BY_LEVEL[r.profile.level]);
      } else {
        expect(r.profile.deadlineSource).toBe('stated');
      }
      if (profile.deadlineDays === 3) expect(r.overrunsDeadline).toBe(true);
    }
  });

  it('mocks: the free mock right after the wall, the Pro mock last, only on an interview plan', () => {
    for (const { r } of plans) {
      const mocks = r.steps.filter(s => s.kind === 'mock');
      if (r.profile.goal !== 'interview') { expect(mocks).toEqual([]); continue; }
      expect(r.steps[r.wallAt].mockId).toBe(FREE_MOCK_ID);
      const last = r.steps[r.steps.length - 1];
      expect(last.kind).toBe('mock');
      expect(last.proOnly).toBe(true);
    }
  });

  it('no Debug items (hypothesis H2 owns them) and no duplicate challenge', () => {
    const map = byId();
    for (const { r } of plans) {
      const cids = r.steps.filter(s => s.kind !== 'mock').map(s => s.challengeId);
      expect(new Set(cids).size).toBe(cids.length);
      for (const id of cids) expect(map.get(id).type).not.toBe('debug');
    }
  });
});

// ───────────────────────────── no date, no state, no raw order ──────────────

describe('the engine writes nothing and depends on nothing but its inputs', () => {
  const deepFreeze = o => { Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v)); return Object.freeze(o); };

  it('never writes prepTarget (or any date): a frozen profile builds, and the result names no date', () => {
    const profile = deepFreeze({ company: 'Capital One', level: 'basics', prepTarget: { company: 'Capital One' }, solvedIds: [91] });
    const r = buildRoadmap(profile, bank, opts);
    expect(profile.prepTarget).toEqual({ company: 'Capital One' });
    const json = JSON.stringify(r);
    expect(json).not.toMatch(/prepTarget|"date"|\d{4}-\d{2}-\d{2}/);
    expect(r.profile.deadlineDays).toBe(DEFAULT_SPRINT_DAYS_BY_LEVEL.basics);
  });

  it('source guard: no storage, no clock, no random, no prepTarget in the module', () => {
    const code = moduleSource.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const banned of ['prepTarget', 'localStorage', 'sessionStorage', 'Date.now', 'new Date', 'Math.random', 'window.']) {
      expect(code.includes(banned), banned).toBe(false);
    }
  });

  it('deterministic: the same profile twice gives the same plan', () => {
    for (const want of Object.values(PERSONAS)) {
      expect(buildRoadmap(want.profile, bank, opts)).toEqual(buildRoadmap(want.profile, bank, opts));
    }
  });

  it('never raw bank order: a reversed bank gives the same plan (fragile area 4)', () => {
    const reversed = bank.slice().reverse();
    for (const want of Object.values(PERSONAS)) {
      expect(ids(buildRoadmap(want.profile, reversed, opts))).toEqual(want.ids);
    }
  });

  it('never plans a Debug item, even when the rest of the bank runs out', () => {
    const thin = bank.filter(c => c.type === 'debug' || (c.id >= 91 && c.id <= 104));
    expect(thin.filter(c => c.type === 'debug').length).toBeGreaterThan(0);
    const r = buildRoadmap({ goal: 'learning' }, thin, opts);
    const map = byId();
    expect(r.steps.filter(s => s.kind !== 'mock' && map.get(s.challengeId).type === 'debug')).toEqual([]);
  });

  it('solves already made move the wall forward and are never planned again', () => {
    const r = buildRoadmap({ goal: 'learning', solvedIds: [91, 92, 93, 94] }, bank, opts);
    expect(r.wallAt).toBe(FREE_SOLVE_QUOTA - 4);
    expect(ids(r).some(id => [91, 92, 93, 94].includes(id))).toBe(false);
  });

  it('a Pro account has no wall and nothing Pro-only', () => {
    const r = buildRoadmap({ ...PERSONAS.capitalOne.profile, isPro: true }, bank, opts);
    expect(r.wallAt).toBeNull();
    expect(r.steps.filter(s => s.proOnly)).toEqual([]);
  });

  it('is not wired into the app in this PR (arms B and D call it)', () => {
    expect(appSource.includes('personal-roadmap')).toBe(false);
  });
});

describe('profile fallbacks (plan doc §2)', () => {
  it('a company with no date → interview goal, basics level, the default sprint', () => {
    const r = resolveProfile({ company: 'Revolut' }, bank, opts);
    expect([r.goal, r.goalSource, r.level, r.levelSource, r.deadlineSource]).toEqual(['interview', 'inferred_company_or_date', 'basics', 'default', 'default_by_level']);
  });

  it('nothing known → learning, Foundations, 14 days, no focus', () => {
    const r = resolveProfile({}, bank, opts);
    expect([r.goal, r.level, r.deadlineDays, r.focus, r.scope]).toEqual(['learning', 'brand-new', 14, null, 'goal']);
  });

  it('a readiness result sets level and focus (arm C)', () => {
    const r = resolveProfile({ readiness: { overall: 70, scores: { Joins: 100, 'Window Functions': 0, 'Subqueries & CTEs': 50 } } }, bank, opts);
    expect([r.level, r.levelSource, r.focus, r.focusSource]).toEqual(['working', 'readiness', 'Window Functions', 'weakest']);
  });

  it('a stated focus wins over the weakest skill; nothing weak means no focus', () => {
    expect(resolveProfile({ focus: 'NULL Handling', skillScores: { Joins: 10 } }, bank, opts).focus).toBe('NULL Handling');
    expect(resolveProfile({ skillScores: { Joins: 90, 'Window Functions': 80 } }, bank, opts).focus).toBeNull();
  });

  it('an unknown company with no sector falls back to the goal\'s skills and says so', () => {
    const r = buildRoadmap({ company: 'Acme Analytics' }, bank, opts);
    expect(r.profile.scope).toBe('goal');
    expect(r.why[0]).toMatch(/fewer than 5 questions tagged Acme Analytics/);
  });
});

describe('the two arithmetic helpers', () => {
  it('apportion splits exactly n by largest remainder', () => {
    expect(apportion(25, DIFFICULTY_MIX_BY_LEVEL.working)).toEqual({ Easy: 4, Medium: 14, Hard: 7 });
    expect(apportion(0, { a: 1 })).toEqual({ a: 0 });
  });
  it('weightedSequence spreads by weight', () => {
    const seq = weightedSequence(10, { a: 3, b: 1 });
    expect(seq.filter(x => x === 'a')).toHaveLength(8);
    expect(seq.slice(0, 4)).toEqual(['a', 'a', 'b', 'a']);
  });
});
