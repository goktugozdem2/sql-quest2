// A challenge's tables come from its own dataset PLUS any dataset that
// provides a table it lists but its own lacks (2026-11-22).
//
// Found by C1: challenge 27 "UNION ALL Dedup: Cross-Dataset Search" lists
// `employees` + `customers` on `dataset: "ecommerce"`, which has no
// employees table. The app loaded one dataset per challenge, so on a fresh
// session the reference solution failed ("no such table: employees"), the
// Expected Output never rendered and every learner query errored — 24
// openers, 3 runs in 60 days. scripts/lint-content.mjs had it baselined as
// BROKEN since July; nothing failed on it.
//
// This file pins:
//   1. the pure plan (src/utils/challenge-datasets.js): own dataset first and
//      whole, extras carry only the missing tables, never a same-name clobber;
//   2. the audit: every table every challenge source lists exists in its plan,
//      and a borrowed table has exactly one provider (no silent pick);
//   3. the runner: every reference solution — core bank, sector, daily, mock —
//      runs on EXACTLY the tables the app would load, with the app's own
//      column-type rule (app.jsx loadDataset);
//   4. source guards: every challenge-load site in app.jsx goes through
//      loadChallengeDatasets, and the schema panels read the same plan.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import {
  challengeTablePlan,
  datasetsForChallenge,
  datasetForTable,
  challengeTableData,
  missingChallengeTables,
} from '../src/utils/challenge-datasets.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const sb = { window: { challengesData: [] }, console: { log() {}, warn() {} } };
vm.createContext(sb);
for (const f of [
  'datasets.js', 'challenges.js', 'finans-data.js', 'finans-fraud-data.js', 'neobank-data.js',
  'gayrimenkul-data.js', 'uretim-data.js', 'sector-challenges.js', 'daily-challenges-new.js', 'mock-interviews.js',
]) vm.runInContext(readFileSync(here(`../src/data/${f}`), 'utf8'), sb);
const { publicDatasetsData: datasets, challengesData: bank, dailyChallengesData: daily, mockInterviewsData: mocks } = sb.window;

// Every challenge-shaped thing the app loads tables for, with a label.
const SOURCES = [
  ...bank.map(c => [`challenge #${c.id}`, c]),
  ...daily.map(d => [`daily ${d.id}`, d.core]),
  ...mocks.flatMap(m => (m.questions || []).filter(q => q.dataset).map((q, i) => [`mock ${m.id} q${i + 1}`, q])),
];

describe('the plan (pure helper)', () => {
  const reg = {
    shop: { tables: { orders: { columns: ['id'], data: [[1]] }, people: { columns: ['shop_col'], data: [['shop']] } } },
    staff: { tables: { staff: { columns: ['id'], data: [[1]] }, people: { columns: ['staff_col'], data: [['staff']] } } },
    other: { tables: { staff: { columns: ['x'], data: [[9]] } } },
  };

  it('is just the own dataset, whole, when it has every listed table', () => {
    expect(challengeTablePlan({ dataset: 'shop', tables: ['orders', 'people'] }, reg)).toEqual([{ dataset: 'shop', tables: null }]);
    expect(datasetsForChallenge({ dataset: 'shop', tables: ['orders'] }, reg)).toEqual(['shop']);
    expect(datasetsForChallenge({ dataset: 'shop' }, reg)).toEqual(['shop']);
  });

  it('adds the first other dataset with a missing table, carrying only that table, own first', () => {
    const plan = challengeTablePlan({ dataset: 'shop', tables: ['staff', 'orders'] }, reg);
    expect(plan).toEqual([{ dataset: 'shop', tables: null }, { dataset: 'staff', tables: ['staff'] }]);
    expect(datasetsForChallenge({ dataset: 'shop', tables: ['staff'] }, reg)).toEqual(['shop', 'staff']);
  });

  it('never borrows a table the own dataset already has (no same-name clobber)', () => {
    // `people` is in both shop and staff: the plan must not load staff.people.
    const plan = challengeTablePlan({ dataset: 'shop', tables: ['people', 'staff'] }, reg);
    expect(plan[1]).toEqual({ dataset: 'staff', tables: ['staff'] });
    expect(challengeTableData({ dataset: 'shop', tables: ['people'] }, 'people', reg).columns).toEqual(['shop_col']);
    expect(datasetForTable({ dataset: 'staff' }, 'people', reg)).toBe('staff');
  });

  it('leaves an unknown table out of the plan and reports it as missing', () => {
    const c = { dataset: 'shop', tables: ['orders', 'nowhere'] };
    expect(challengeTablePlan(c, reg)).toEqual([{ dataset: 'shop', tables: null }]);
    expect(missingChallengeTables(c, reg)).toEqual(['nowhere']);
    expect(challengeTableData(c, 'nowhere', reg)).toBeNull();
  });

  it('is empty for an unknown or absent dataset, and the dataset field stays a string', () => {
    expect(challengeTablePlan({ dataset: 'nope', tables: ['orders'] }, reg)).toEqual([]);
    expect(challengeTablePlan(null, reg)).toEqual([]);
    for (const c of bank) expect(typeof c.dataset, `#${c.id}`).toBe('string');
  });
});

describe('the audit: every listed table exists in the plan', () => {
  it('covers the whole bank and the other sources', () => {
    expect(bank.length).toBeGreaterThan(300);
    expect(daily.length).toBeGreaterThan(0);
    expect(SOURCES.length).toBeGreaterThan(bank.length + daily.length);
  });

  it('every source names a known dataset and every listed table resolves', () => {
    const bad = [];
    for (const [label, c] of SOURCES) {
      if (!datasets[c.dataset]) { bad.push(`${label}: unknown dataset ${c.dataset}`); continue; }
      for (const t of missingChallengeTables(c, datasets)) bad.push(`${label}: ${t}`);
    }
    expect(bad).toEqual([]);
  });

  it('a borrowed table has exactly one provider (the plan never picks silently)', () => {
    const bad = [];
    for (const [label, c] of SOURCES) {
      for (const t of c.tables || []) {
        if (datasets[c.dataset]?.tables?.[t]) continue;
        const providers = Object.keys(datasets).filter(k => datasets[k].tables[t]);
        if (providers.length !== 1) bad.push(`${label}: ${t} in [${providers.join(', ')}]`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('challenge 27 borrows employees from the employees dataset, and only that', () => {
    const c27 = bank.find(c => c.id === 27);
    expect(challengeTablePlan(c27, datasets)).toEqual([
      { dataset: 'ecommerce', tables: null },
      { dataset: 'employees', tables: ['employees'] },
    ]);
  });
});

// ── the runner ──────────────────────────────────────────────────────
// Build a database from a plan the way app.jsx loadDataset does: a column's
// type comes from the first row's value; extras load only their tables.
const planDbs = new Map();
function dbForPlan(plan) {
  const key = JSON.stringify(plan);
  if (planDbs.has(key)) return planDbs.get(key);
  const db = new Database(':memory:');
  for (const step of plan) {
    for (const [name, t] of Object.entries(datasets[step.dataset].tables)) {
      if (step.tables && !step.tables.includes(name)) continue;
      const types = t.columns.map((_, i) => {
        const s = t.data[0]?.[i];
        return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
      });
      db.exec(`DROP TABLE IF EXISTS ${name}`);
      db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
      const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
      db.transaction(rows => rows.forEach(r => ins.run(r.map(v => (v === undefined ? null : v)))))(t.data);
    }
  }
  planDbs.set(key, db);
  return db;
}

// Split on semicolons outside string literals (the DML challenges mutate,
// then SELECT); run every statement, return the last result set. Mutations
// are rolled back so the cached database stays clean for the next challenge.
function splitStatements(sql) {
  const out = [];
  let cur = '', qs = null;
  for (const ch of sql) {
    if (qs) { cur += ch; if (ch === qs) qs = null; continue; }
    if (ch === "'" || ch === '"') { qs = ch; cur += ch; continue; }
    if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function runOnPlan(c) {
  const db = dbForPlan(challengeTablePlan(c, datasets));
  db.exec('SAVEPOINT run');
  try {
    let rows = [];
    // A state-graded challenge (grade:'state') runs its setup first and is
    // read through its check, the way src/utils/state-grade.js grades it.
    const script = c.grade === 'state' ? [c.setup || '', c.solution, c.check].join(';\n') : c.solution;
    for (const s of splitStatements(script)) {
      const st = db.prepare(s);
      rows = st.reader ? st.all() : (st.run(), []);
    }
    return rows;
  } finally {
    db.exec('ROLLBACK TO run; RELEASE run');
  }
}

describe('the runner: every reference solution on exactly the tables the app loads', () => {
  it('runs without an error', () => {
    const bad = [];
    let ran = 0;
    for (const [label, c] of SOURCES) {
      if (!c.solution || !datasets[c.dataset]) continue;
      try { runOnPlan(c); ran++; } catch (e) { bad.push(`${label}: ${e.message}`); }
    }
    expect(bad).toEqual([]);
    expect(ran).toBeGreaterThan(bank.length);
  });

  it('challenge 27 gives the contact counts its example states (50 employees + 16 customers = 66)', () => {
    const rows = runOnPlan(bank.find(c => c.id === 27));
    expect(rows).toEqual([
      { source: 'customer', contact_count: 16 },
      { source: 'employee', contact_count: 50 },
      { source: 'total', contact_count: 66 },
    ]);
  });
});

// ── source guards over app.jsx ──────────────────────────────────────
const app = readFileSync(here('../src/app.jsx'), 'utf8');

describe('app.jsx loads a challenge through the plan', () => {
  it('no challenge-load site calls a bare loadDataset(db, <challenge>.dataset)', () => {
    // The study sandbox (mctx — one mock mistake's own dataset) is the only
    // `.dataset` load left on purpose; it carries no tables list.
    const bare = [...app.matchAll(/loadDataset\(\s*\w+\s*,\s*([\w?.[\]]+)\.dataset\s*\)/g)]
      .map(m => m[1]).filter(x => x !== 'mctx');
    expect(bare).toEqual([]);
  });

  it('every known challenge-load site uses loadChallengeDatasets', () => {
    for (const site of [
      'loadChallengeDatasets(db, challenge);',
      'loadChallengeDatasets(db, currentChallenge);',
      'if (mutates) loadChallengeDatasets(db, currentChallenge);',
      'loadChallengeDatasets(db, challenge.core);',
      'loadChallengeDatasets(db, newChallenge.core);',
      'loadChallengeDatasets(db, currentQ);',
      'loadChallengeDatasets(db, nextQ);',
    ]) expect(app, site).toContain(site);
    expect((app.match(/loadChallengeDatasets\(db, /g) || []).length).toBeGreaterThanOrEqual(14);
  });

  it('the wrapper walks the plan and loadDataset honours a table subset', () => {
    const wrapper = app.match(/const loadChallengeDatasets = \(database, challenge\) => \{([\s\S]*?)\n {2}\};/);
    expect(wrapper, 'loadChallengeDatasets').toBeTruthy();
    expect(wrapper[1]).toMatch(/challengeTablePlan\(challenge, publicDatasets\)\.forEach\(step => loadDataset\(database, step\.dataset, step\.tables\)\)/);
    const loader = app.match(/const loadDataset = \(database, key, onlyTables = null\) => \{([\s\S]*?)\n {2}\};/);
    expect(loader, 'loadDataset(database, key, onlyTables)').toBeTruthy();
    expect(loader[1]).toContain('if (onlyTables && !onlyTables.includes(tableName)) return;');
  });

  it('the schema and sample panels read the table from the plan, not only the own dataset', () => {
    expect(app).not.toMatch(/publicDatasets\[currentChallenge\.dataset\]/);
    expect((app.match(/challengeTableData\(currentChallenge, /g) || []).length).toBe(3);
  });
});
