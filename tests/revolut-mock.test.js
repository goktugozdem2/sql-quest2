// Revolut membership — everything but the signature (2026-09-12).
//
// The mock keyed to the exact name runs on the neobank ledger and nothing
// else; every MCQ's correct option is what the DATA says (its verify.sql),
// never a hand-asserted letter; both written solutions run and return the
// rows the descriptions promise. Then the pending registry block is
// validated against the live bank with a placeholder signature, so that when
// the founder signs, the only diff is the name and the date.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { isMcqQuestion, validateMcqQuestion } from '../src/utils/mock-interview.js';
import { INTERVIEW_ARCHETYPES, PENDING_INTERVIEW_ARCHETYPES } from '../src/data/interview-archetypes.js';
import { archetypeProblems, eligibleTargets, findTarget, MIN_TARGET_CHALLENGES } from '../src/utils/interview-prep.js';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const MOCK_ID = 'revolut-analytics-screen';
const DATASET = 'finans_neobank';

function loadWindow(files) {
  const sb = { window: { challengesData: [] }, console: { log() {} } };
  vm.createContext(sb);
  for (const f of files) vm.runInContext(readFileSync(here(f), 'utf8'), sb);
  return sb.window;
}

// One row → one comparable string, the same flattening the Capital One
// validator uses (scripts/validate-capital-one-mock.mjs).
const flatten = (row) => Object.values(row).map(v => (typeof v === 'number' ? String(Number(v)) : String(v))).join('|');

let win, mock, db;
beforeAll(() => {
  win = loadWindow([
    '../src/data/neobank-data.js',
    '../src/data/challenges.js',
    '../src/data/sector-challenges.js',
    '../src/data/challenge-companies.js',
    '../src/data/mock-interviews.js',
  ]);
  mock = win.mockInterviewsData.find(i => i.id === MOCK_ID);
  const ds = win.publicDatasetsData[DATASET];
  db = new Database(':memory:');
  for (const [name, t] of Object.entries(ds.tables)) {
    const types = t.columns.map((_, i) => { const s = t.data[0]?.[i]; return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT'; });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
});

describe('the mock — keyed to the exact name, on the ledger, 60 minutes', () => {
  it('exists, is Pro, names the company exactly, and every question runs on finans_neobank', () => {
    expect(mock).toBeTruthy();
    expect(mock.company).toBe('Revolut');
    expect(mock.isFree).toBe(false);
    expect(mock.questions.length).toBe(mock.questionsCount);
    for (const q of mock.questions) expect(q.dataset, q.id).toBe(DATASET);
  });

  it('is the sourced shape: 6 multiple choice + 2 written SQL inside 60 minutes, 100 points', () => {
    const mcq = mock.questions.filter(isMcqQuestion);
    expect(mcq).toHaveLength(6);
    expect(mock.questions.length - mcq.length).toBe(2);
    expect(mock.totalTime).toBe(60 * 60);
    expect(mock.questions.reduce((s, q) => s + q.timeLimit, 0)).toBeLessThanOrEqual(mock.totalTime);
    expect(mock.questions.reduce((s, q) => s + q.points, 0)).toBe(100);
    expect(mock.questions.map(q => q.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('every MCQ is well-formed in both languages, and the DATA picks exactly the stated option', () => {
    for (const q of mock.questions.filter(isMcqQuestion)) {
      expect(validateMcqQuestion(q), q.id).toEqual([]);
      expect(q.verify?.sql, `${q.id} has no verify.sql`).toBeTruthy();
      const rows = db.prepare(q.verify.sql).all();
      expect(rows, `${q.id}: verify.sql must return exactly one row`).toHaveLength(1);
      const computed = flatten(rows[0]);
      const matches = q.options.filter(o => String(o.value) === computed);
      expect(matches.map(o => o.id), `${q.id}: data says "${computed}"`).toEqual([q.correctOptionId]);
      expect(q.hints).toHaveLength(2);
      expect(q.hints_tr).toHaveLength(2);
    }
  });

  it('the two written solutions run and return what the descriptions promise', () => {
    const q1 = mock.questions.find(q => q.id === 'rv-q1');
    const r1 = db.prepare(q1.solution).all();
    expect(r1.map(r => r.month)).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(r1.every(r => Number.isInteger(r.active_users) && r.active_users > 0)).toBe(true);
    const q2 = mock.questions.find(q => q.id === 'rv-q2');
    const r2 = db.prepare(q2.solution).all();
    expect(r2.length).toBeGreaterThanOrEqual(18);
    expect(r2.length).toBeLessThanOrEqual(24);
    expect(Object.keys(r2[0])).toEqual(['user_id', 'volume_gbp']);
    expect(r2[r2.length - 1].volume_gbp).toBeGreaterThan(3400);
    for (let i = 1; i < r2.length; i++) expect(r2[i].volume_gbp).toBeLessThanOrEqual(r2[i - 1].volume_gbp);
    for (const q of [q1, q2]) {
      expect(q.title_tr && q.description_tr && q.hints_tr?.length === 2, `${q.id} bilingual`).toBeTruthy();
    }
  });
});

describe('the pending registry block — backed by the bank, missing only the signature', () => {
  const bank = () => win.challengesData;
  const companyMap = () => win.challengeCompanies;
  const signed = () => PENDING_INTERVIEW_ARCHETYPES.map(a => ({
    ...a, members: a.members.map(m => ({ ...m, declaredOn: '2026-09-13', declaredBy: 'placeholder' })),
  }));

  it('is unsigned today, on purpose', () => {
    expect(PENDING_INTERVIEW_ARCHETYPES).toHaveLength(1);
    expect(PENDING_INTERVIEW_ARCHETYPES[0].members[0].declaredBy).toBeNull();
    expect(archetypeProblems(bank(), companyMap(), win.mockInterviewsData, PENDING_INTERVIEW_ARCHETYPES).join(' '))
      .toMatch(/declaredBy is missing/);
  });

  it('with a signature, every other check passes: dataset in the bank, ≥ 8 tagged, a sittable mock, one archetype per company', () => {
    expect(archetypeProblems(bank(), companyMap(), win.mockInterviewsData, signed())).toEqual([]);
    const both = [...INTERVIEW_ARCHETYPES, ...signed()];
    expect(archetypeProblems(bank(), companyMap(), win.mockInterviewsData, both)).toEqual([]);
    const targets = eligibleTargets(bank(), companyMap(), win.mockInterviewsData, both);
    expect(targets.map(t => t.company)).toEqual(['Capital One', 'Revolut']);
    const rv = findTarget('Revolut', bank(), companyMap(), win.mockInterviewsData, both);
    expect(rv.mockId).toBe(MOCK_ID);
    expect(rv.dataset).toBe(DATASET);
    expect(rv.challengeCount).toBeGreaterThanOrEqual(MIN_TARGET_CHALLENGES);
    expect(rv.challengeIds).toEqual([300, 301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311]);
  });

  it('the page carries the dated sources and the mock link', () => {
    const html = readFileSync(here('../src/revolut-sql-interview.html'), 'utf8');
    expect(html).toMatch(/Sources:/);
    expect(html).toMatch(/As described publicly in September 2026/);
    expect(html).toMatch(/Revolut does not publish/);
    expect(html).toMatch(/interview=revolut-analytics-screen/);
    expect(html).toContain('Revolut');
  });
});
