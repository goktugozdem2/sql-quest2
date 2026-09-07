// SQL Quest — the interview countdown
//
// WHY THESE TESTS EXIST
//
// Two of the three people who have ever paid were preparing for one named
// company. The content for it shipped on 2026-09-07 — a page, ten Capital
// One-tagged challenges on the card ledger, a 70-minute mock — and there was
// no way to say "I am interviewing there, on this date" and be given a plan.
//
// The feature is easy. Two things about it can end badly, and those are what
// these tests hold:
//
//   * A NUMBER NEXT TO A COMPANY'S NAME READS AS A PREDICTION. It is not one:
//     nobody has ever told this product whether they got a job, so there is no
//     data from which a pass probability could be built, and building one
//     anyway would be a lie with a progress bar on it. The copy guard at the
//     bottom of this file fails the build if a prediction word reaches the
//     copy in either language, and the card is required to render what the
//     score is measured from next to the score itself.
//
//   * OFFERING A TARGET WE HAVE NO CONTENT FOR. 23 companies carry tags; 22 of
//     them are tag filters over the same generic bank. A "Stripe readiness"
//     computed over ecommerce challenges claims a specificity we do not have.
//     The eligibility bar is computed from the data on every call — there is
//     no allow-list in the module — and the tests below bind it to the LIVE
//     bank so content drift moves the bar rather than silently invalidating it.
//
// Everything ships behind FEATURE_FLAGS.features.interviewCountdown = false
// until the paywall-surfaces read lands on 2026-09-20.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  eligibleTargets,
  findTarget,
  targetDemandedSkills,
  companyReadiness,
  readinessBucket,
  daysUntil,
  planToDate,
  MIN_TARGET_CHALLENGES,
  MIN_DATASET_EXCLUSIVITY,
  MIN_EVIDENCE_SOLVES,
  MAX_PLAN_DAYS,
  READINESS_WEIGHTS,
  PREP_PLAN_STATUS,
} from '../src/utils/interview-prep.js';
import { buildCurriculumOrder } from '../src/utils/challenge-order.js';

const p = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const appSource = readFileSync(p('../src/app.jsx'), 'utf8');
const i18nSource = readFileSync(p('../src/utils/i18n.js'), 'utf8');
const moduleSource = readFileSync(p('../src/utils/interview-prep.js'), 'utf8');

// 2026-09-08T12:00:00Z, fixed. Every clock in this file is an argument.
const NOW = Date.UTC(2026, 8, 8, 12, 0, 0);

let bank;          // window.challengesData, sector challenges appended
let companyMap;    // window.challengeCompanies
let mocks;         // window.mockInterviewsData

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import('../src/data/challenges.js');
  await import('../src/data/sector-challenges.js');   // appends 275-284 into challengesData
  await import('../src/data/challenge-companies.js');
  await import('../src/data/mock-interviews.js');
  bank = globalThis.window.challengesData;
  companyMap = globalThis.window.challengeCompanies;
  mocks = globalThis.window.mockInterviewsData;
});

/** A bank + map + mocks trio built from scratch, for the boundary cases. */
const synth = ({ challenges, tags, mockQuestions, company = 'Acme' }) => ({
  bank: challenges,
  companyMap: tags,
  mocks: [{ id: 'acme-mock', company, questions: mockQuestions }],
});

/** n challenges on `dataset`, ids starting at `from`. */
const rows = (n, dataset, from = 1000, difficulty = 'Easy') =>
  Array.from({ length: n }, (_, i) => ({
    id: from + i,
    dataset,
    difficulty,
    title: `c${from + i}`,
    skills: ['SELECT'],
    category: 'SELECT',
  }));

const tagAll = (challenges, company) =>
  Object.fromEntries(challenges.map(c => [String(c.id), [company]]));

const questionsOn = (dataset, n = 3) =>
  Array.from({ length: n }, () => ({ dataset }));

// ───────────────────────────── eligibility ──────────────────────────────────

describe('eligibleTargets — who the live data lets us offer', () => {
  it('offers exactly one company today, and it is the one with its own dataset', () => {
    // If this ever returns two, a second target genuinely cleared the data bar
    // — check WHY before celebrating: a co-tag or a generic mock can move it.
    expect(eligibleTargets(bank, companyMap, mocks).map(t => t.company)).toEqual(['Capital One']);
  });

  it('describes the target from the data, not from a literal', () => {
    const [t] = eligibleTargets(bank, companyMap, mocks);
    expect(t.mockId).toBe('capital-one-codesignal');
    expect(t.dataset).toBe('finans_fraud');
    expect(t.challengeIds).toEqual([275, 276, 277, 278, 279, 280, 281, 282, 283, 284]);
    expect(t.challengeCount).toBeGreaterThanOrEqual(MIN_TARGET_CHALLENGES);
    expect(t.exclusivity).toBe(1);
  });

  it('never offers a generic mock as a company — General, FAANG, Big Tech and friends', () => {
    // Seven of the eight mocks in the bank are keyed to a category, not a
    // company ('General', 'Tech Startup', 'SaaS Company', 'Big Tech',
    // 'E-commerce Corp', 'Fintech', 'FAANG'). None of those strings is a key
    // in the company map, so none can ever pick up challenges.
    const offered = new Set(eligibleTargets(bank, companyMap, mocks).map(t => t.company));
    for (const m of mocks) {
      if (m.company === 'Capital One') continue;
      expect(offered.has(m.company), `${m.company} must not be offerable`).toBe(false);
    }
  });

  it('the other 22 tagged companies are NOT offered — a tag is not a target', () => {
    const tagged = new Set(Object.values(companyMap).flat());
    const offered = new Set(eligibleTargets(bank, companyMap, mocks).map(t => t.company));
    expect(tagged.size).toBeGreaterThan(20);
    for (const c of tagged) {
      if (c === 'Capital One') continue;
      expect(offered.has(c), `${c} is a tag filter over the generic bank, not a target`).toBe(false);
    }
  });

  it('findTarget resolves case-insensitively and refuses an unoffered company', () => {
    expect(findTarget('capital one', bank, companyMap, mocks)?.company).toBe('Capital One');
    expect(findTarget('Stripe', bank, companyMap, mocks)).toBeNull();
    expect(findTarget('', bank, companyMap, mocks)).toBeNull();
    expect(findTarget(null, bank, companyMap, mocks)).toBeNull();
  });
});

describe('eligibleTargets — adding a tag alone does not qualify a company', () => {
  it('tagging 20 challenges for a company with no mock qualifies nobody', () => {
    // The whole generic bank, tagged for one company, still fails: without a
    // mock keyed to that name there is no screen shape to be ready for.
    const cs = rows(20, 'someset');
    const targets = eligibleTargets(cs, tagAll(cs, 'Bigco'), []);
    expect(targets).toEqual([]);
  });

  it('tagging challenges on a dataset the mock does not use qualifies nobody', () => {
    const cs = rows(20, 'other_dataset');
    const { mocks: m } = synth({ challenges: cs, tags: {}, mockQuestions: questionsOn('acme_set') });
    expect(eligibleTargets(cs, tagAll(cs, 'Acme'), m)).toEqual([]);
  });

  it('a Capital One tag pasted onto the generic bank does not create a second target', () => {
    // The realistic version of the mistake: someone runs augment-companies and
    // Capital One picks up ecommerce challenges. Its own dataset is unaffected,
    // so it stays offerable — and no NEW company appears.
    const extra = { ...companyMap };
    for (const c of bank.filter(x => x.dataset === 'ecommerce').slice(0, 30)) {
      extra[String(c.id)] = [...(extra[String(c.id)] || []), 'Capital One'];
    }
    expect(eligibleTargets(bank, extra, mocks).map(t => t.company)).toEqual(['Capital One']);
  });
});

describe('eligibleTargets — a mock alone does not qualify a company either', () => {
  it('a company with a mock but too few challenges on its dataset is refused', () => {
    const cs = rows(MIN_TARGET_CHALLENGES - 1, 'acme_set');
    const { mocks: m } = synth({ challenges: cs, tags: {}, mockQuestions: questionsOn('acme_set') });
    expect(eligibleTargets(cs, tagAll(cs, 'Acme'), m)).toEqual([]);
  });

  it('accepts at exactly MIN_TARGET_CHALLENGES, not one above it', () => {
    const cs = rows(MIN_TARGET_CHALLENGES, 'acme_set');
    const { mocks: m } = synth({ challenges: cs, tags: {}, mockQuestions: questionsOn('acme_set') });
    expect(eligibleTargets(cs, tagAll(cs, 'Acme'), m).map(t => t.company)).toEqual(['Acme']);
  });

  it('refuses a mock that runs on more than one dataset', () => {
    // A mock hopping datasets is a general interview with a label on it.
    const cs = rows(10, 'acme_set');
    const m = [{ id: 'x', company: 'Acme', questions: [{ dataset: 'acme_set' }, { dataset: 'ecommerce' }] }];
    expect(eligibleTargets(cs, tagAll(cs, 'Acme'), m)).toEqual([]);
  });

  it('refuses a mock whose questions declare no dataset at all', () => {
    const cs = rows(10, 'acme_set');
    const m = [{ id: 'x', company: 'Acme', questions: [{}, {}] }];
    expect(eligibleTargets(cs, tagAll(cs, 'Acme'), m)).toEqual([]);
  });

  it('refuses a mock with no questions', () => {
    const cs = rows(10, 'acme_set');
    expect(eligibleTargets(cs, tagAll(cs, 'Acme'), [{ id: 'x', company: 'Acme', questions: [] }])).toEqual([]);
  });
});

describe('eligibleTargets — the exclusivity bar keeps the generic bank out', () => {
  const csFor = (mine, theirs) => {
    const a = rows(mine, 'shared_set', 1000);
    const b = rows(theirs, 'shared_set', 2000);
    return {
      bank: [...a, ...b],
      map: { ...tagAll(a, 'Acme'), ...tagAll(b, 'Rival') },
      mocks: [{ id: 'x', company: 'Acme', questions: questionsOn('shared_set') }],
    };
  };

  it('refuses a company that shares its dataset with another company', () => {
    // 10 mine / 10 theirs → 50%, the shape of every generic dataset.
    const { bank: b, map, mocks: m } = csFor(10, 10);
    expect(eligibleTargets(b, map, m)).toEqual([]);
  });

  it('accepts exactly at the exclusivity bar and refuses just below it', () => {
    // 9 of 10 pairs = 0.9 exactly.
    const at = csFor(9, 1);
    expect(eligibleTargets(at.bank, at.map, at.mocks).map(t => t.company)).toEqual(['Acme']);
    // 8 of 10 = 0.8.
    const below = csFor(8, 2);
    expect(eligibleTargets(below.bank, below.map, below.mocks)).toEqual([]);
  });

  it('the bar is 8 challenges and 0.9 exclusivity — changing either changes who is offered', () => {
    // Both numbers are argued in the module against the measured distribution
    // of company tags per dataset. A change here is a change to who gets a
    // readiness score and belongs in a commit message, not in a refactor.
    expect(MIN_TARGET_CHALLENGES).toBe(8);
    expect(MIN_DATASET_EXCLUSIVITY).toBe(0.9);
  });

  it('co-tagging the target set with a second company removes it, loudly', () => {
    // Documented property, asserted so it is a decision rather than a surprise:
    // a set shared with a second company is no longer written for one screen.
    const extra = { ...companyMap };
    for (const id of [275, 276, 277, 278, 279, 280, 281, 282, 283, 284]) {
      extra[String(id)] = ['Capital One', 'Rival Bank'];
    }
    expect(eligibleTargets(bank, extra, mocks)).toEqual([]);
  });
});

describe('eligibleTargets — fails closed', () => {
  it('returns [] rather than throwing on every malformed input', () => {
    expect(eligibleTargets(null, companyMap, mocks)).toEqual([]);
    expect(eligibleTargets(bank, null, mocks)).toEqual([]);
    expect(eligibleTargets(bank, companyMap, null)).toEqual([]);
    expect(eligibleTargets([], {}, [])).toEqual([]);
    expect(eligibleTargets(bank, companyMap, [null, undefined, {}])).toEqual([]);
    expect(eligibleTargets([null, { id: 'x' }, { dataset: 5 }], companyMap, mocks)).toEqual([]);
  });

  it('survives a duplicated id in the bank (an HMR reload appends twice)', () => {
    const doubled = [...bank, ...bank.filter(c => c.dataset === 'finans_fraud')];
    const [t] = eligibleTargets(doubled, companyMap, mocks);
    expect(t.challengeCount).toBe(10);
  });
});

// ───────────────────────────── demanded skills ──────────────────────────────

describe('targetDemandedSkills — raw tags resolve to canonical names', () => {
  it('reports the 9-name canonical skills, never the raw challenge tags', () => {
    const [t] = eligibleTargets(bank, companyMap, mocks);
    const skills = targetDemandedSkills(t, bank).map(d => d.skill);
    // The set carries raw tags ROW_NUMBER / LAG / LEAD / PARTITION BY; the
    // radar name is the only thing that may come out of here. Comparing raw
    // tags to canonical names is what silently broke mastery_check on
    // "JOIN Tables" (CLAUDE.md, Skill radar).
    expect(skills).toContain('Window Functions');
    expect(skills).toContain('Joins');
    expect(skills).toContain('Subqueries & CTEs');
    for (const raw of ['ROW_NUMBER', 'LAG', 'LEFT JOIN', 'CTE', 'PARTITION BY', 'strftime']) {
      expect(skills, `${raw} is a raw tag and must not appear`).not.toContain(raw);
    }
  });

  it('weights by challenges, deduped per challenge', () => {
    const [t] = eligibleTargets(bank, companyMap, mocks);
    const d = targetDemandedSkills(t, bank);
    for (const row of d) {
      expect(row.challenges).toBeGreaterThan(0);
      // A challenge tagged Window Functions + ROW_NUMBER + PARTITION BY counts
      // once, so no skill can exceed the size of the set.
      expect(row.challenges).toBeLessThanOrEqual(t.challengeIds.length);
      expect(row.share).toBeCloseTo(row.challenges / t.challengeIds.length, 10);
    }
    expect(d[0].challenges).toBeGreaterThanOrEqual(d[d.length - 1].challenges);
  });

  it('returns [] on a target whose ids are not in the bank we were handed', () => {
    expect(targetDemandedSkills({ challengeIds: [999999] }, bank)).toEqual([]);
    expect(targetDemandedSkills(null, bank)).toEqual([]);
    expect(targetDemandedSkills({ challengeIds: [275] }, null)).toEqual([]);
  });
});

// ───────────────────────────── readiness ────────────────────────────────────

const FULL_RADAR = {
  'Querying Basics': 70, 'Aggregation & Grouping': 62, 'Joins': 55,
  'Subqueries & CTEs': 40, 'Conditional Logic': 45, 'Window Functions': 22,
  'String Functions': 10, 'Date Functions': 30, 'NULL Handling': 35,
};
const filler = (n) => Array.from({ length: n }, (_, i) => 91 + i);

describe('companyReadiness — null rather than a flattering number', () => {
  let target;
  beforeAll(() => { [target] = eligibleTargets(bank, companyMap, mocks); });

  it('returns null with no solves at all', () => {
    expect(companyReadiness({ skillLevels: FULL_RADAR, solvedIds: [], target, bank })).toBeNull();
  });

  it('returns null below the engaged mark, and a number at it', () => {
    const below = companyReadiness({
      skillLevels: FULL_RADAR, solvedIds: filler(MIN_EVIDENCE_SOLVES - 1), target, bank,
    });
    expect(below).toBeNull();
    const at = companyReadiness({
      skillLevels: FULL_RADAR, solvedIds: filler(MIN_EVIDENCE_SOLVES), target, bank,
    });
    expect(at).not.toBeNull();
    expect(at.evidence.solves).toBe(MIN_EVIDENCE_SOLVES);
  });

  it('the evidence bar is the canonical engaged mark, 5', () => {
    expect(MIN_EVIDENCE_SOLVES).toBe(5);
  });

  it('returns null for a target that is not eligible or not in this bank', () => {
    const base = { skillLevels: FULL_RADAR, solvedIds: filler(20), bank };
    expect(companyReadiness({ ...base, target: null })).toBeNull();
    expect(companyReadiness({ ...base, target: {} })).toBeNull();
    expect(companyReadiness({ ...base, target: { challengeIds: [] } })).toBeNull();
    expect(companyReadiness({ ...base, target: { challengeIds: [999999] } })).toBeNull();
    expect(companyReadiness({ ...base, target, bank: [] })).toBeNull();
    expect(companyReadiness()).toBeNull();
  });

  it('a big radar over zero evidence is still null — the radar cannot carry it alone', () => {
    const perfect = Object.fromEntries(Object.keys(FULL_RADAR).map(k => [k, 100]));
    expect(companyReadiness({ skillLevels: perfect, solvedIds: [], target, bank })).toBeNull();
  });
});

describe('companyReadiness — the parts, and the weights they carry', () => {
  let target;
  beforeAll(() => { [target] = eligibleTargets(bank, companyMap, mocks); });

  it('the declared weights are 45 / 30 / 25 and sum to 1', () => {
    expect(READINESS_WEIGHTS).toEqual({ coverage: 0.45, skills: 0.30, mock: 0.25 });
    const sum = READINESS_WEIGHTS.coverage + READINESS_WEIGHTS.skills + READINESS_WEIGHTS.mock;
    expect(sum).toBeCloseTo(1, 10);
  });

  it('counts coverage over the target set only, never over lifetime solves', () => {
    const r = companyReadiness({
      skillLevels: FULL_RADAR,
      solvedIds: [...filler(30), 275, 276, 277],
      target, bank,
    });
    expect(r.parts.coverage).toMatchObject({ solved: 3, total: 10, score: 30, counted: true });
    expect(r.evidence).toEqual({ solves: 33, targetSolves: 3 });
  });

  it('an untaken mock is left OUT of the number, not scored as a zero', () => {
    const r = companyReadiness({ skillLevels: FULL_RADAR, solvedIds: filler(20), target, bank });
    expect(r.parts.mock).toMatchObject({ taken: false, score: null, weight: 0, counted: false });
    // The other two absorb it, in proportion: 0.45/0.75 and 0.30/0.75.
    expect(r.weightsUsed).toEqual({ coverage: 0.6, skills: 0.4, mock: 0 });
    expect(r.parts.coverage.weight + r.parts.skills.weight).toBeCloseTo(1, 10);
  });

  it('a free user who never sat the Pro mock is not capped at 75', () => {
    // The reason the weight is reallocated rather than zeroed: the mock is
    // isFree:false, so scoring it 0 would cap every non-Pro user at 75 for a
    // payment reason, turning a progress number into a paywall lever.
    const perfect = Object.fromEntries(Object.keys(FULL_RADAR).map(k => [k, 100]));
    const r = companyReadiness({
      skillLevels: perfect,
      solvedIds: [...filler(20), ...target.challengeIds],
      target, bank, mockResult: null,
    });
    expect(r.score).toBe(100);
  });

  it('a taken mock restores the declared weights and is reported with its score', () => {
    const r = companyReadiness({
      skillLevels: FULL_RADAR, solvedIds: filler(20), target, bank,
      mockResult: { taken: true, scorePercent: 82 },
    });
    expect(r.weightsUsed).toEqual({ coverage: 0.45, skills: 0.30, mock: 0.25 });
    expect(r.parts.mock).toMatchObject({ taken: true, score: 82, counted: true, mockId: 'capital-one-codesignal' });
  });

  it('a claimed-but-scoreless mock result is treated as not taken', () => {
    const r = companyReadiness({
      skillLevels: FULL_RADAR, solvedIds: filler(20), target, bank,
      mockResult: { taken: true, scorePercent: null },
    });
    expect(r.parts.mock.taken).toBe(false);
  });

  it('scores the radar against what the SET demands, resolved to canonical names', () => {
    // Levels keyed by RAW tags credit nothing. This is the three-namespace
    // rule from CLAUDE.md, asserted rather than assumed.
    const rawKeyed = companyReadiness({
      skillLevels: { ROW_NUMBER: 100, 'LEFT JOIN': 100, CTE: 100, SELECT: 100 },
      solvedIds: filler(20), target, bank,
    });
    expect(rawKeyed.parts.skills.score).toBe(0);

    const canonical = companyReadiness({
      skillLevels: { 'Window Functions': 100, Joins: 100, 'Subqueries & CTEs': 100, 'Querying Basics': 100 },
      solvedIds: filler(20), target, bank,
    });
    expect(canonical.parts.skills.score).toBeGreaterThan(60);
  });

  it('solving more of the target set can only raise the number', () => {
    const at = (n) => companyReadiness({
      skillLevels: FULL_RADAR,
      solvedIds: [...filler(20), ...target.challengeIds.slice(0, n)],
      target, bank,
    }).score;
    const series = [0, 2, 5, 8, 10].map(at);
    for (let i = 1; i < series.length; i++) expect(series[i]).toBeGreaterThan(series[i - 1]);
  });

  it('clamps a nonsense level and a nonsense mock score instead of leaking it', () => {
    const r = companyReadiness({
      skillLevels: { 'Window Functions': 5000, Joins: -400, 'Querying Basics': 'x' },
      solvedIds: filler(20), target, bank,
      mockResult: { taken: true, scorePercent: 900 },
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.parts.mock.score).toBe(100);
  });

  it('accepts a Set or an array for the solved ids', () => {
    const args = { skillLevels: FULL_RADAR, target, bank };
    const asSet = companyReadiness({ ...args, solvedIds: new Set([...filler(20), 275]) });
    const asArray = companyReadiness({ ...args, solvedIds: [...filler(20), 275] });
    expect(asSet.score).toBe(asArray.score);
  });
});

describe('readinessBucket — a coarse bucket is what the funnel gets', () => {
  it('buckets by boundary, and calls a missing score "none"', () => {
    expect(readinessBucket(null)).toBe('none');
    expect(readinessBucket(undefined)).toBe('none');
    expect(readinessBucket(0)).toBe('0-24');
    expect(readinessBucket(24)).toBe('0-24');
    expect(readinessBucket(25)).toBe('25-49');
    expect(readinessBucket(49)).toBe('25-49');
    expect(readinessBucket(50)).toBe('50-74');
    expect(readinessBucket(74)).toBe('50-74');
    expect(readinessBucket(75)).toBe('75-100');
    expect(readinessBucket(100)).toBe('75-100');
  });
});

// ───────────────────────────── the date ─────────────────────────────────────

describe('daysUntil — the product learns what a date is', () => {
  it('counts calendar days, not 24-hour periods', () => {
    expect(daysUntil('2026-09-08', NOW)).toBe(0);
    expect(daysUntil('2026-09-09', NOW)).toBe(1);
    expect(daysUntil('2026-09-07', NOW)).toBe(-1);
    expect(daysUntil('2026-12-07', NOW)).toBe(90);
  });

  it('gives the same answer at one minute to midnight as at noon', () => {
    const late = Date.UTC(2026, 8, 8, 23, 59, 59);
    const early = Date.UTC(2026, 8, 8, 0, 0, 1);
    expect(daysUntil('2026-09-09', late)).toBe(1);
    expect(daysUntil('2026-09-09', early)).toBe(1);
  });

  it('returns null — never today — on a malformed date', () => {
    for (const bad of ['', 'tomorrow', '2026-9-8', '08/09/2026', '2026-13-01', '2026-02-31', null, 5, {}]) {
      expect(daysUntil(bad, NOW), `${String(bad)} must be null`).toBeNull();
    }
  });

  it('returns null on an unusable clock', () => {
    for (const bad of [null, undefined, NaN, 'now', Infinity]) {
      expect(daysUntil('2026-09-09', bad)).toBeNull();
    }
  });
});

// ───────────────────────────── the plan ─────────────────────────────────────

describe('planToDate — the edges, by name', () => {
  let target; let readiness; let solved;
  beforeAll(() => {
    [target] = eligibleTargets(bank, companyMap, mocks);
    solved = new Set([...filler(20), 275, 276, 277]);
    readiness = companyReadiness({ skillLevels: FULL_RADAR, solvedIds: solved, target, bank });
  });
  const plan = (daysRemaining, over = {}) => planToDate({
    target, readiness, solvedIds: solved, bank, daysRemaining, now: NOW, ...over,
  });

  it('a date behind us is PAST and produces no plan — a passed date is never rolled forward', () => {
    const r = plan(-1);
    expect(r.status).toBe(PREP_PLAN_STATUS.PAST);
    expect(r.today).toEqual([]);
    expect(r.days).toEqual([]);
    expect(plan(-400).status).toBe(PREP_PLAN_STATUS.PAST);
  });

  it('the interview today is TODAY: the target set only, no drills and no mock', () => {
    const r = plan(0);
    expect(r.status).toBe(PREP_PLAN_STATUS.TODAY);
    expect(r.planDays).toBe(1);
    expect(r.totals).toMatchObject({ drills: 0, mock: 0 });
    expect(r.today.every(i => i.kind === 'target')).toBe(true);
    // Telling somebody to sit a 70-minute timed rehearsal on the morning of
    // their interview is bad advice with a progress bar on it.
    expect(r.days[0].items.some(i => i.kind === 'mock')).toBe(false);
  });

  it('the interview tomorrow is one working day, with the rehearsal on it', () => {
    const r = plan(1);
    expect(r.status).toBe(PREP_PLAN_STATUS.OK);
    expect(r.planDays).toBe(1);
    expect(r.days).toHaveLength(1);
    expect(r.today[r.today.length - 1].kind).toBe('mock');
  });

  it('spreads across the days there are, in order, and stamps each date', () => {
    const r = plan(5);
    expect(r.planDays).toBe(5);
    expect(r.days.map(d => d.date)).toEqual([
      '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12',
    ]);
    expect(r.today).toEqual(r.days[0].items);
    const placed = r.days.flatMap(d => d.items).filter(i => i.kind !== 'mock');
    expect(placed).toHaveLength(r.totals.targetRemaining + r.totals.drills);
    // The mock is the dress rehearsal: last day, last item.
    const last = r.days[r.days.length - 1].items;
    expect(last[last.length - 1].kind).toBe('mock');
  });

  it('does not pad a calendar: 90 days out plans only the days there is work for', () => {
    const r = plan(90);
    expect(r.planDays).toBeLessThanOrEqual(MAX_PLAN_DAYS);
    expect(r.beyondPlanDays).toBe(90 - r.planDays);
    expect(r.days.every(d => d.items.length > 0), 'no empty days in the plan').toBe(true);
  });

  it('caps at MAX_PLAN_DAYS when there is more work than that many days', () => {
    // 60 unsolved target challenges, 40 days out → 21 days, 3 a day.
    const many = rows(60, 'acme_set', 5000);
    const t2 = { company: 'Acme', mockId: null, dataset: 'acme_set', challengeIds: many.map(c => c.id) };
    const r = planToDate({ target: t2, readiness: null, solvedIds: [], bank: many, daysRemaining: 40, now: NOW });
    expect(r.planDays).toBe(MAX_PLAN_DAYS);
    expect(r.beyondPlanDays).toBe(40 - MAX_PLAN_DAYS);
  });

  it('everything target-side done is NOTHING_LEFT, and says so rather than looking broken', () => {
    const all = new Set([...filler(20), ...target.challengeIds]);
    const strong = Object.fromEntries(Object.keys(FULL_RADAR).map(k => [k, 90]));
    const r2 = companyReadiness({
      skillLevels: strong, solvedIds: all, target, bank, mockResult: { taken: true, scorePercent: 80 },
    });
    const r = planToDate({ target, readiness: r2, solvedIds: all, bank, daysRemaining: 3, now: NOW });
    expect(r.status).toBe(PREP_PLAN_STATUS.NOTHING_LEFT);
    expect(r.totals).toMatchObject({ targetRemaining: 0, mock: 0 });
  });

  it('is UNAVAILABLE, never a plan, on malformed input or an unusable clock', () => {
    expect(planToDate().status).toBe(PREP_PLAN_STATUS.UNAVAILABLE);
    expect(plan(5, { now: NaN }).status).toBe(PREP_PLAN_STATUS.UNAVAILABLE);
    expect(plan(null).status).toBe(PREP_PLAN_STATUS.UNAVAILABLE);
    expect(plan('5').status).toBe(PREP_PLAN_STATUS.UNAVAILABLE);
    expect(plan(5, { bank: [] }).status).toBe(PREP_PLAN_STATUS.UNAVAILABLE);
    expect(plan(5, { target: null }).status).toBe(PREP_PLAN_STATUS.UNAVAILABLE);
  });

  it('never re-offers a solved challenge, and never uses the target set as a drill', () => {
    const r = plan(7);
    const items = r.days.flatMap(d => d.items);
    const targetIds = new Set(target.challengeIds);
    for (const i of items) {
      if (i.challengeId == null) continue;
      expect(solved.has(i.challengeId), `${i.challengeId} is already solved`).toBe(false);
      if (i.kind === 'drill') {
        expect(targetIds.has(i.challengeId), 'the target set is the plan, not a drill').toBe(false);
      }
    }
  });

  it('drills the weakest DEMANDED skills, not the weakest skill overall', () => {
    // String Functions is 10 in FULL_RADAR — the weakest of all nine — and the
    // Capital One set does not ask for it, so it must not be drilled.
    const demanded = new Set(targetDemandedSkills(target, bank).map(d => d.skill));
    expect(demanded.has('String Functions')).toBe(false);
    const drills = plan(7).days.flatMap(d => d.items).filter(i => i.kind === 'drill');
    expect(drills.length).toBeGreaterThan(0);
    for (const d of drills) expect(demanded.has(d.skill)).toBe(true);
  });
});

describe('planToDate — curriculum order, never raw id order', () => {
  it('orders through the comparator: a later id can come first', () => {
    // The live Capital One set happens to run easy→hard in id order, so it
    // cannot prove this on its own. A bank where the roadmap inverts id order
    // can, and a revert of the picker to `a.id - b.id` fails here by name.
    const cs = [
      { id: 900, dataset: 'acme_set', difficulty: 'Hard', title: 'ninehundred', skills: ['SELECT'], category: 'SELECT' },
      { id: 901, dataset: 'acme_set', difficulty: 'Easy', title: 'nineohone', skills: ['SELECT'], category: 'SELECT' },
    ];
    const t = { company: 'Acme', mockId: null, dataset: 'acme_set', challengeIds: [900, 901] };
    const order = buildCurriculumOrder([{ challengeIds: [901, 900] }]);
    const r = planToDate({ target: t, readiness: null, solvedIds: [], bank: cs, daysRemaining: 5, now: NOW, curriculumOrder: order });
    expect(r.days.flatMap(d => d.items).map(i => i.challengeId)).toEqual([901, 900]);
  });

  it('falls back to difficulty before id when a challenge is off the roadmap', () => {
    const cs = [
      { id: 900, dataset: 'acme_set', difficulty: 'Hard', title: 'h', skills: ['SELECT'], category: 'SELECT' },
      { id: 901, dataset: 'acme_set', difficulty: 'Easy', title: 'e', skills: ['SELECT'], category: 'SELECT' },
    ];
    const t = { company: 'Acme', mockId: null, dataset: 'acme_set', challengeIds: [900, 901] };
    const r = planToDate({ target: t, readiness: null, solvedIds: [], bank: cs, daysRemaining: 5, now: NOW });
    expect(r.days.flatMap(d => d.items).map(i => i.challengeId)).toEqual([901, 900]);
  });

  it('picks drills off the LIVE roadmap, so challenge 1 is never the first drill', () => {
    // The 2026-08-05 incident: the raw bank is FAANG-ordered, so the first
    // Medium by id is challenge 1 — 24% solve-through, and it became "what's
    // next" for every Medium solver in four separate places. A revert of the
    // drill picker to raw order surfaces id 1 or 2 here.
    const [target] = eligibleTargets(bank, companyMap, mocks);
    const order = buildCurriculumOrder(extractRoadmapStages(appSource));
    const solved = new Set(filler(20));
    const readiness = companyReadiness({ skillLevels: FULL_RADAR, solvedIds: solved, target, bank });
    const r = planToDate({
      target, readiness, solvedIds: solved, bank, daysRemaining: 10, now: NOW, curriculumOrder: order,
    });
    const drills = r.days.flatMap(d => d.items).filter(i => i.kind === 'drill');
    expect(drills.length).toBeGreaterThan(0);
    expect(drills.map(d => d.challengeId)).not.toContain(1);
    expect(drills.map(d => d.challengeId)).not.toContain(2);
  });
});

/**
 * SQL_ROADMAP_STAGES lives inside app.jsx. Read the ids out of the source so
 * this test binds to the LIVE sequence — the same trick tests/challenge-order
 * uses, and for the same reason: a fixture copy drifts and then certifies
 * itself.
 */
function extractRoadmapStages(source) {
  const start = source.indexOf('const SQL_ROADMAP_STAGES');
  if (start < 0) throw new Error('SQL_ROADMAP_STAGES not found in app.jsx');
  const end = source.indexOf('const SQL_ROADMAP_CHALLENGE_ORDER', start);
  const block = source.slice(start, end);
  const stages = [];
  const re = /challengeIds:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    stages.push({ challengeIds: m[1].split(',').map(s => Number(s.trim())).filter(Number.isInteger) });
  }
  return stages;
}

// ───────────────────────── the honesty guards ───────────────────────────────

/**
 * Words that turn a progress measure into a claim about an interview.
 *
 * `pass` is banned as a whole word AND in its inflections, rather than trying
 * to tell an innocent "that date has passed" from "you will pass": the innocent
 * sentence is easy to reword and a clever guard is not a guard. The EN copy
 * says "that date is behind us now" for exactly this reason.
 */
const PREDICTION_WORDS = [
  // English
  'pass', 'passes', 'passed', 'passing',
  'guarantee', 'guaranteed', 'guarantees',
  'succeed', 'success', 'successful',
  'hired', 'get the job', 'land the job', 'offer letter',
  'probability', 'odds', 'chance', 'chances', 'likely',
  'will do well', 'ready to pass', 'you will',
  // Türkçe
  'garanti', 'garantili',
  'geçersin', 'geçeceksin', 'geçersiniz',
  'kazanırsın', 'başarırsın', 'başaracaksın',
  'işe alınırsın', 'olasılık', 'ihtimal', 'şans',
];

const predictionHits = (text) => {
  const hay = String(text).toLowerCase();
  return PREDICTION_WORDS.filter(w => {
    // \b is unreliable on Turkish letters; use explicit non-letter boundaries.
    const re = new RegExp(`(^|[^\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\p{L}]|$)`, 'iu');
    return re.test(hay);
  });
};

/** Drop whole-line comments; leave code and string literals. */
const stripCommentLines = (block) => block
  .split('\n')
  .filter(line => {
    const t = line.trim();
    return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/'));
  })
  .join('\n');

/** The `interviewPrep: { … }` namespace out of each language block. */
const i18nPrepBlocks = () => {
  const blocks = [];
  const re = /\n {4}interviewPrep: \{\n([\s\S]*?)\n {4}\},/g;
  let m;
  while ((m = re.exec(i18nSource))) blocks.push(m[1]);
  return blocks;
};

/** The InterviewPrepCard function body out of app.jsx. */
const prepCardBody = () => {
  const start = appSource.indexOf('function InterviewPrepCard(');
  expect(start, 'InterviewPrepCard not found in app.jsx').toBeGreaterThan(-1);
  const rest = appSource.slice(start);
  return rest.slice(0, rest.indexOf('\n}\n'));
};

describe('source guard: the score is never presented as a prediction', () => {
  it('the detector actually detects — a synthetic violation is caught', () => {
    // Without this, a broken regex would make every test below pass silently.
    expect(predictionHits('You are ready to pass this interview')).toContain('pass');
    expect(predictionHits('Bu skorla mülakatı geçersin')).toContain('geçersin');
    expect(predictionHits('%92 garanti')).toContain('garanti');
    expect(predictionHits('Where you are · 62 of 100')).toEqual([]);
  });

  it('finds the copy in both languages before asserting on it', () => {
    const blocks = i18nPrepBlocks();
    expect(blocks.length, 'expected an EN and a TR interviewPrep namespace').toBe(2);
    expect(blocks[0]).toContain('Interviewing somewhere specific?');
    expect(blocks[1]).toContain('mülakat');
  });

  it('names no prediction word in either language', () => {
    for (const block of i18nPrepBlocks()) {
      const hits = predictionHits(stripCommentLines(block));
      expect(hits, `prediction word in interviewPrep copy: ${hits.join(', ')}`).toEqual([]);
    }
  });

  it('the card component renders no prediction word either', () => {
    const hits = predictionHits(stripCommentLines(prepCardBody()));
    expect(hits, `prediction word inside InterviewPrepCard: ${hits.join(', ')}`).toEqual([]);
  });

  it('says in BOTH languages what the number is measured from', () => {
    const [en, tr] = i18nPrepBlocks();
    // EN: our own material, our own challenges, our own mock — and "not an
    // interview" said out loud.
    expect(en).toMatch(/whatItIs:.*our own \{company\} material/);
    expect(en).toMatch(/whatItIs:.*It measures our material, not an interview\./);
    expect(en).toMatch(/notAffiliated:.*not affiliated with \{company\}/);
    // TR: the same two facts, not a shortened version of them.
    expect(tr).toMatch(/whatItIs:.*kendi \{company\} materyalimizin/);
    expect(tr).toMatch(/whatItIs:.*Kendi materyalimizi ölçer, bir mülakatı değil\./);
    expect(tr).toMatch(/notAffiliated:.*\{company\} ile bağlantılı değildir/);
  });

  it('the card renders both honesty lines next to the score, not behind a tooltip', () => {
    const body = prepCardBody();
    expect(body).toContain("i18n_t('interviewPrep', 'whatItIs'");
    expect(body).toContain("i18n_t('interviewPrep', 'notAffiliated'");
    expect(body).toContain('data-testid="interview-prep-score"');
    // Both must sit inside the same branch as the score, so a score can never
    // render without them.
    const scoreAt = body.indexOf('data-testid="interview-prep-score"');
    const whatAt = body.indexOf("'whatItIs'");
    const affilAt = body.indexOf("'notAffiliated'");
    expect(whatAt).toBeGreaterThan(scoreAt);
    expect(affilAt).toBeGreaterThan(scoreAt);
    expect(body.slice(scoreAt, affilAt)).not.toContain('title=');
  });

  it('describes no company real process anywhere in the feature', () => {
    const region = stripCommentLines(i18nPrepBlocks().join('\n') + prepCardBody());
    for (const bad of ['their real process', 'actual assessment', "the company's process", 'gerçek süreci']) {
      expect(region.toLowerCase().includes(bad.toLowerCase()), `"${bad}" must not appear`).toBe(false);
    }
  });
});

describe('source guard: the module derives its target list, never lists it', () => {
  it('names no company and no dataset in code — only in comments', () => {
    const code = stripCommentLines(moduleSource);
    expect(code).not.toContain('Capital One');
    expect(code).not.toContain('finans_fraud');
    expect(code).not.toContain('capital-one');
  });

  it('never orders a challenge pool by raw id', () => {
    // The 2026-08-05 raw-array trap. Same guard shape as
    // tests/challenge-order.test.js: it fails if the ordering grows back here.
    const code = stripCommentLines(moduleSource);
    expect(code).not.toMatch(/\.sort\(\s*\(\s*a\s*,\s*b\s*\)\s*=>\s*a\.id\s*-\s*b\.id\s*\)\s*\.\s*(map|slice|filter)/);
    expect(code).not.toMatch(/challenges\.find\(.*difficulty/);
    // The ordering must come from the shared comparator, not a local one.
    expect(moduleSource).toContain("from './challenge-order.js'");
    expect(code).toContain('makeChallengeComparator');
    expect(code).toContain('pickTopNWith');
  });

  it('resolves raw tags through the shared map rather than a private copy', () => {
    expect(moduleSource).toContain("import { SKILL_TO_RADAR, mapTopicToSkill } from './skill-calc.js'");
    const code = stripCommentLines(moduleSource);
    expect(code).not.toContain('JOIN Tables');
    expect(code).not.toContain('CASE Statements');
    expect(code).not.toContain('SELECT Basics');
  });
});

describe('source guard: shipped off, as a card, and the date stays put', () => {
  it('feature-flags.js has interviewCountdown false', () => {
    const flags = readFileSync(p('../src/data/feature-flags.js'), 'utf8');
    expect(flags).toMatch(/interviewCountdown:\s*false/);
  });

  it('the render is gated default-OFF — an unset flag is not consent to ship', () => {
    expect(appSource).toMatch(/window\.FF\?\.feature\?\.\('interviewCountdown'\)\s*===\s*true/);
  });

  it('the card is a card: no dialog role, no fixed overlay', () => {
    const body = prepCardBody();
    expect(body).not.toMatch(/role="dialog"/);
    expect(body).not.toMatch(/aria-modal/);
    expect(body).not.toMatch(/fixed inset-0/);
    expect(body).toContain('data-testid="interview-prep-card"');
  });

  it('all four prep events are wired', () => {
    for (const ev of ['prep_target_set', 'prep_plan_viewed', 'prep_plan_item_opened', 'prep_readiness_shown']) {
      expect(appSource.includes(`'${ev}'`), `${ev} is not emitted anywhere`).toBe(true);
    }
  });

  it('sends daysOut, never the date the user typed', () => {
    // The date is a preference, not a funnel field. Every prep_target_set
    // payload carries the integer.
    const lines = appSource.split('\n');
    const anchors = [];
    lines.forEach((line, i) => { if (line.includes("'prep_target_set'")) anchors.push(i); });
    expect(anchors.length).toBeGreaterThanOrEqual(2);
    for (const a of anchors) {
      const region = lines.slice(a, a + 6).join('\n');
      expect(region).toMatch(/daysOut: daysUntil\(/);
      expect(region).not.toMatch(/date: prepTarget\.date/);
      expect(region).not.toMatch(/prepDate:/);
    }
  });

  it('sends a bucket, never the raw readiness score', () => {
    const at = appSource.indexOf("'prep_readiness_shown'");
    expect(at).toBeGreaterThan(-1);
    const region = appSource.slice(at, at + 900);
    expect(region).toMatch(/bucket: readinessBucket\(/);
    expect(region).not.toMatch(/score: readiness\.score/);
  });

  it('opens plan items through the existing doors, so the paywall keeps one gate', () => {
    const at = appSource.indexOf('const openPrepItem');
    expect(at).toBeGreaterThan(-1);
    const body = appSource.slice(at, at + 1200);
    expect(body).toContain('startInterview(');
    expect(body).toContain('openChallenge(');
    // Never a second door into locked content.
    expect(body).not.toContain('setCurrentChallenge(');
    expect(body).not.toContain('setActiveInterview(');
  });
});

// ---------------------------------------------------------------------------
// The move to the Coach (2026-09-08)
//
// The card shipped 2026-09-07 at the top of the Interview Prep tab. That tab
// has no navigation entry, so 22 accounts lifetime have any interview history
// against 1,179 people who have viewed the Coach. These guards pin the move:
// the card is on the Coach, both existing doors into the trials tab still
// work, and no third nav tab came back to "fix" discovery.
// ---------------------------------------------------------------------------

/** The Coach-tab render block, from `activeTab === 'guide' && currentUser`. */
const coachTabBody = () => {
  const start = appSource.indexOf("{activeTab === 'guide' && currentUser && !showSimpleLearningShell");
  expect(start, 'the Coach tab render block moved — this guard needs re-anchoring').toBeGreaterThan(-1);
  const end = appSource.indexOf("{/* Interviews Tab */}", start);
  expect(end).toBeGreaterThan(start);
  return appSource.slice(start, end);
};

/** The trials-tab render block. */
const trialsTabBody = () => {
  const start = appSource.indexOf("{/* Interviews Tab */}");
  expect(start).toBeGreaterThan(-1);
  return appSource.slice(start, start + 40000);
};

/** The Coach's mock-offer step card. */
const coachMockCardBody = () => {
  const start = appSource.indexOf('data-testid="coach-mock-step"');
  expect(start, 'the Coach mock step card is missing').toBeGreaterThan(-1);
  return appSource.slice(start - 2500, start + 3000);
};

describe('source guard: the countdown card lives on the Coach now', () => {
  it('the flagged render sits inside the Coach tab, not the Interview Prep tab', () => {
    const coach = coachTabBody();
    expect(coach).toContain("window.FF?.feature?.('interviewCountdown') === true");
    expect(coach).toContain('<InterviewPrepCard');
    // …and nowhere in the Interview Prep tab any more.
    expect(trialsTabBody()).not.toContain('<InterviewPrepCard');
  });

  it('exactly one InterviewPrepCard render site exists', () => {
    const hits = appSource.split('<InterviewPrepCard').length - 1;
    expect(hits, 'the card must have one home, not two').toBe(1);
  });

  it('it sits BELOW the Coach next-step card, not above it', () => {
    // The Coach's contract is one answer to "what do I do next"; this card
    // asks a question. Answers before questions. If this ever flips it should
    // be a decision, not a merge accident.
    const coach = coachTabBody();
    const nextStepAt = coach.indexOf("i18n_t('coachNext', 'label')");
    const cardAt = coach.indexOf('<InterviewPrepCard');
    expect(nextStepAt).toBeGreaterThan(-1);
    expect(cardAt).toBeGreaterThan(nextStepAt);
  });

  it('both existing doors into the Interview Prep tab are untouched', () => {
    // The ?interview= deep link still resolves to the trials tab and hands the
    // mock to startInterview.
    expect(appSource).toContain("const interviewParam = urlParams.get('interview');");
    expect(appSource).toMatch(/setActiveTab\('trials'\);[\s\S]{0,400}startInterview\(target\)/);
    // The onboarding interview branch still routes there.
    expect(appSource).toMatch(/onboardingData\.goal === 'interview'\)\s*\{\s*\n\s*setActiveTab\('trials'\);/);
  });

  it('no third primary nav tab was restored', () => {
    // Reversing the 2026-05-19 nav simplification is a different decision and
    // was explicitly not this change.
    expect(appSource).toMatch(/const showLegacyPrimaryNav = false;/);
  });
});

describe('source guard: the Coach rehearsal offer keeps one paywall gate', () => {
  it('the offer is wired behind the same flag, computed only when it is on', () => {
    const at = appSource.indexOf('const coachMockOfferOptions');
    expect(at, 'coachMockOfferOptions is missing').toBeGreaterThan(-1);
    // The spread into computeNextStep is guarded, so with the flag off the
    // options bag is unchanged and the engine is byte-identical.
    expect(appSource).toMatch(/window\.FF\?\.feature\?\.\('interviewCountdown'\) === true\s*\n\s*\?\s*coachMockOfferOptions\(\)\s*\n\s*:\s*\{\}/);
  });

  it('starting the mock goes through openPrepItem — never a second door', () => {
    const at = appSource.indexOf('case COACH_MOCK_STEP_TYPE:');
    expect(at, 'the mock_interview case is missing from handleCoachStepStart').toBeGreaterThan(-1);
    const body = appSource.slice(at, at + 1400);
    expect(body).toContain("openPrepItem({ kind: 'mock'");
    expect(body).not.toContain('setActiveInterview(');
    expect(body).not.toContain('startInterview(');       // openPrepItem owns that call
    expect(body).not.toContain('setShowProModal(');
  });

  it('the engine, not the card, is what keeps a free user out of the offer', () => {
    const coach = readFileSync(p('../src/utils/coach.js'), 'utf8');
    const at = coach.indexOf('export function pickMockInterviewStep');
    expect(at).toBeGreaterThan(-1);
    const body = coach.slice(at, at + 1200);
    expect(body).toMatch(/options\.isPro !== true\) return null/);
  });

  it('the offer event carries daysOut and the company, never the date', () => {
    const at = appSource.indexOf("'coach_step_mock_offered'");
    expect(at, 'coach_step_mock_offered is not emitted anywhere').toBeGreaterThan(-1);
    const region = appSource.slice(at, at + 500);
    expect(region).toMatch(/daysOut: daysUntil\(/);
    expect(region).not.toMatch(/date: prepTarget\.date/);
    expect(region).toMatch(/company,/);
  });

  it('the Coach offer card names no prediction word either', () => {
    const hits = predictionHits(stripCommentLines(coachMockCardBody()));
    expect(hits, `prediction word in the Coach mock card: ${hits.join(', ')}`).toEqual([]);
  });

  it('the offer copy exists in BOTH languages and says what it is not', () => {
    const [en, tr] = i18nPrepBlocks();
    for (const key of ['coachMockTitle', 'coachMockReason', 'coachMockWhat', 'coachMockCTA']) {
      expect(en, `EN is missing ${key}`).toContain(`${key}:`);
      expect(tr, `TR is missing ${key}`).toContain(`${key}:`);
    }
    expect(en).toMatch(/coachMockWhat:.*not affiliated with \{company\}/);
    expect(tr).toMatch(/coachMockWhat:.*\{company\} ile bağlantılı değildir/);
    // The offer card must render the honesty line, not just define it.
    expect(coachMockCardBody()).toContain("i18n_t('interviewPrep', 'coachMockWhat'");
  });
});
