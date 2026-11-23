// Challenges 320-324 (2026-11-22, fleet B3): Easy on-ramps for the three
// thinnest Easy cells in the core bank.
//
// Measured that day through challengeMatchesSkill over the 198 cards in
// challenges.js: Date Functions 2 Easy, Window Functions 3 Easy, NULL
// Handling 3 Easy (against 8 / 35 / 3 Hard). The Easy cells are where a first
// solve happens, so the batch is two Window, two Date and one NULL card, all
// on datasets the bank already ships.
//
// Every reference solution runs here on the app's table rules (app.jsx
// loadDataset: a column's type comes from the first row's value) and its
// result is pinned. Each card also has the wrong answer a learner most often
// writes for it; that query is graded with the app's own resultsMatch and
// must FAIL, or the card is not testing the idea it was written for.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';
import { resultsMatch } from '../src/utils/grade.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const sb = { window: { challengesData: [] }, console: { log() {} } };
vm.createContext(sb);
for (const f of ['../src/data/datasets.js', '../src/data/challenges.js']) vm.runInContext(readFileSync(here(f), 'utf8'), sb);
const { publicDatasetsData: datasets, challengesData: bank } = sb.window;
const IDS = [320, 321, 322, 323, 324];
const byId = id => bank.find(c => c.id === id);

const dbs = {};
function dbFor(key) {
  if (dbs[key]) return dbs[key];
  const db = new Database(':memory:');
  for (const [name, t] of Object.entries(datasets[key].tables)) {
    const types = t.columns.map((_, i) => {
      const s = t.data[0]?.[i];
      return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r.map(v => (v === undefined ? null : v)))))(t.data);
  }
  return (dbs[key] = db);
}
const run = (id, sql) => dbFor(byId(id).dataset).prepare(sql ?? byId(id).solution).all();

// Grade a learner query the way the app does: sql.js-style value arrays,
// the reference's columns, the reference's ORDER BY.
function grades(id, sql) {
  const c = byId(id);
  const db = dbFor(c.dataset);
  const ref = db.prepare(c.solution);
  const expected = ref.raw().all();
  const columns = ref.columns().map(col => col.name);
  const got = db.prepare(sql).raw().all();
  return resultsMatch(got, expected, c.solution, columns);
}

// Words that would hand the learner the method. A card names the outcome.
const METHOD_WORDS = /\bOVER\b|PARTITION|ROW_NUMBER|\bRANK\b|strftime|COUNT\s*\(|IS NULL|COALESCE|GROUP BY|\bwindow\b/i;

describe('the five cards', () => {
  it('exist once each, on shipped datasets, with every field the app reads', () => {
    for (const id of IDS) {
      expect(bank.filter(c => c.id === id), `#${id}`).toHaveLength(1);
      const c = byId(id);
      for (const k of ['title', 'description', 'hint', 'solution', 'title_tr', 'description_tr', 'hint_tr', 'slug', 'category']) {
        expect(typeof c[k], `#${id}.${k}`).toBe('string');
      }
      expect(c.example?.output && c.example_tr?.output, `#${id} examples`).toBeTruthy();
      expect(Object.keys(datasets)).toContain(c.dataset);
      for (const t of c.tables) expect(Object.keys(datasets[c.dataset].tables), `#${id} ${t}`).toContain(t);
      expect(c.xpReward).toBeGreaterThan(0);
      expect(c.difficulty, `#${id}`).toBe('Easy');
    }
    expect(new Set(IDS.map(id => byId(id).slug)).size).toBe(5);
    expect(bank.filter(c => IDS.map(byId).some(n => n.slug === c.slug))).toHaveLength(5);
  });

  it('were appended after the old top id, never re-numbering', () => {
    // ids after 324 are later batches (325-329, the state-graded set, 2026-11-22; 343-354, the niche sector set, 2026-11-23)
    const before = bank.filter(c => !IDS.includes(c.id) && c.id < IDS[0]);
    expect(Math.max(...before.map(c => c.id))).toBe(319);
    const at = bank.findIndex(c => c.id === IDS[0]);
    expect(bank.slice(at, at + 5).map(c => c.id)).toEqual(IDS);
  });

  it('aim at the measured cells: 2 Window Functions, 2 Date Functions, 1 NULL Handling', () => {
    const skillOf = { 320: 'Window Functions', 321: 'Window Functions', 322: 'Date Functions', 323: 'Date Functions', 324: 'NULL Handling' };
    for (const id of IDS) expect(challengeMatchesSkill(byId(id), skillOf[id]), `#${id}`).toBe(true);
  });

  it('never name the method in the prompt, in either language', () => {
    for (const id of IDS) {
      const c = byId(id);
      for (const d of [c.description, c.description_tr]) expect(d, `#${id}`).not.toMatch(METHOD_WORDS);
    }
  });

  it('never put the query in the hint (question pages show a free card\'s hint)', () => {
    for (const id of IDS) {
      const c = byId(id);
      for (const h of [c.hint, c.hint_tr]) {
        expect(h, `#${id}`).not.toMatch(/\bSELECT\b|\bFROM\b/);
        expect(h, `#${id}`).not.toContain(c.solution.slice(0, 30));
      }
    }
  });

  it('every solution orders its result at the top level, so rows compare in sequence', () => {
    for (const id of IDS) expect(/ORDER BY [^)]*$/i.test(byId(id).solution), `#${id}`).toBe(true);
  });
});

describe('the solutions, run and pinned', () => {
  it('320 — 50 rows, each department\'s own top salary, the top earner at gap 0', () => {
    const rows = run(320);
    expect(rows).toHaveLength(50);
    const top = {};
    for (const r of rows) top[r.department] = r.dept_top_salary;
    expect(top).toEqual({ Engineering: 115000, Finance: 98000, HR: 80000, Marketing: 85000, Sales: 100000 });
    expect(rows[0]).toEqual({ name: 'Ulysses Cook', department: 'Engineering', salary: 115000, dept_top_salary: 115000, gap: 0 });
    expect(rows.every(r => r.gap === r.dept_top_salary - r.salary && r.gap >= 0)).toBe(true);
    expect(grades(320, byId(320).solution)).toBe(true);
    // The wrong answer: the company's top salary on every row.
    expect(grades(320, 'SELECT name, department, salary, MAX(salary) OVER () AS dept_top_salary, MAX(salary) OVER () - salary AS gap FROM employees ORDER BY department, salary DESC, name')).toBe(false);
  });

  it('321 — 40 orders, numbered from 1 again for each of the 10 customers', () => {
    const rows = run(321);
    expect(rows).toHaveLength(40);
    const last = {};
    for (const r of rows) last[r.customer_id] = r.order_number;
    expect(last).toEqual({ 1: 6, 2: 5, 3: 5, 4: 4, 5: 4, 6: 4, 7: 3, 8: 3, 9: 3, 10: 3 });
    expect(rows.slice(0, 2)).toEqual([
      { order_id: 1, customer_id: 1, order_date: '2024-01-15', order_number: 1 },
      { order_id: 4, customer_id: 1, order_date: '2024-01-18', order_number: 2 },
    ]);
    expect(grades(321, byId(321).solution)).toBe(true);
    // The wrong answer: one numbering across the whole table.
    expect(grades(321, 'SELECT order_id, customer_id, order_date, ROW_NUMBER() OVER (ORDER BY order_date) AS order_number FROM orders ORDER BY customer_id, order_number')).toBe(false);
  });

  it('322 — 7 years, 50 hires, the year as text', () => {
    const rows = run(322);
    expect(rows.map(r => [r.hire_year, r.hires])).toEqual([
      ['2016', 1], ['2017', 4], ['2018', 5], ['2019', 10], ['2020', 12], ['2021', 11], ['2022', 7],
    ]);
    // Another way to take the year must pass too: the card does not insist on one function.
    expect(grades(322, 'SELECT SUBSTR(hire_date, 1, 4) AS hire_year, COUNT(*) AS hires FROM employees GROUP BY hire_year ORDER BY hire_year')).toBe(true);
    // The wrong answer: grouping on the full date — 48 rows, not 7.
    expect(run(322, 'SELECT hire_date AS hire_year, COUNT(*) AS hires FROM employees GROUP BY hire_date ORDER BY hire_year')).toHaveLength(48);
    expect(grades(322, 'SELECT hire_date AS hire_year, COUNT(*) AS hires FROM employees GROUP BY hire_date ORDER BY hire_year')).toBe(false);
  });

  it('323 — 13 weekend logins, 7 on Saturdays and 6 on Sundays', () => {
    const rows = run(323);
    expect(rows).toHaveLength(13);
    expect(rows.map(r => r.login_id)).toEqual(run(323, "SELECT login_id FROM logins WHERE strftime('%w', login_at) IN ('0', '6') ORDER BY login_at, login_id").map(r => r.login_id));
    const days = rows.map(r => new Date(r.login_at.replace(' ', 'T') + 'Z').getUTCDay());
    expect(days.filter(d => d === 6)).toHaveLength(7);
    expect(days.filter(d => d === 0)).toHaveLength(6);
    expect(rows[0]).toEqual({ login_id: 2, customer_id: 1, login_at: '2024-03-02 09:40:00' });
    expect(grades(323, byId(323).solution)).toBe(true);
    // The wrong answer: Sunday counted as 7 — only the Saturdays come back.
    expect(run(323, "SELECT login_id, customer_id, login_at FROM logins WHERE strftime('%w', login_at) IN ('6', '7') ORDER BY login_at, login_id")).toHaveLength(7);
    expect(grades(323, "SELECT login_id, customer_id, login_at FROM logins WHERE strftime('%w', login_at) IN ('6', '7') ORDER BY login_at, login_id")).toBe(false);
  });

  // Q1 content QA, 2026-11-22: the card's example said "37 logins between
  // 2024-03-01 and 2024-03-31" while one of the 37 is 2024-04-01 21:37. The
  // example line is shown on the challenge page and the question page, so a
  // range it states must be the table's own.
  it('323 — the example states the logins table\'s real count and date range, in both languages', () => {
    const [{ n, first, last }] = run(323, 'SELECT COUNT(*) AS n, MIN(date(login_at)) AS first, MAX(date(login_at)) AS last FROM logins');
    for (const input of [byId(323).example.input, byId(323).example_tr.input]) {
      const dates = input.match(/\d{4}-\d{2}-\d{2}/g);
      const count = Number(input.replace(/\d{4}-\d{2}-\d{2}/g, '').match(/\d+/)[0]);
      expect([count, dates], input).toEqual([n, [first, last]]);
    }
  });

  it('324 — 891 passengers, 714 ages on record, 177 missing', () => {
    const rows = run(324);
    expect(rows).toEqual([
      { pclass: 1, passengers: 216, age_recorded: 174, age_missing: 42 },
      { pclass: 2, passengers: 184, age_recorded: 147, age_missing: 37 },
      { pclass: 3, passengers: 491, age_recorded: 393, age_missing: 98 },
    ]);
    expect(rows.every(r => r.age_recorded + r.age_missing === r.passengers)).toBe(true);
    expect(grades(324, 'SELECT pclass, COUNT(*) AS passengers, SUM(age IS NOT NULL) AS age_recorded, SUM(age IS NULL) AS age_missing FROM passengers GROUP BY pclass ORDER BY pclass')).toBe(true);
    // The wrong answer: counting the age column for "passengers" drops everyone without one.
    expect(grades(324, 'SELECT pclass, COUNT(age) AS passengers, COUNT(age) AS age_recorded, COUNT(*) - COUNT(age) AS age_missing FROM passengers GROUP BY pclass ORDER BY pclass')).toBe(false);
  });
});
