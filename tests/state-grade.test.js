// The state-graded challenge type and its first set, ids 325-329 (C6,
// 2026-11-22). Run on sql.js 1.8.0, the engine the app loads from the CDN,
// with the app's own table rules (loadDataset: a column's type comes from the
// first row's value) and the app's own comparator (resultsMatch).
//
// What is pinned:
//   - the parser and the gate: forbidden statements and foreign tables are
//     refused before anything runs;
//   - every reference passes and its resulting state is pinned;
//   - one common wrong answer per challenge fails, with the state diagnosis;
//   - an attempt never touches the shared db: a runtime test on a "shared"
//     database, and a source guard over app.jsx's state path.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import initSqlJs from 'sql.js';
import {
  splitStatements, statementKind, referencedTables, checkStatements,
  gradeStateChallenge, runStateAttempt, isStateGraded, execGated,
} from '../src/utils/state-grade.js';
import { resultsMatch } from '../src/utils/grade.js';
import { challengeTablePlan } from '../src/utils/challenge-datasets.js';
import { SKILL_TO_RADAR, mapTopicToSkill } from '../src/utils/skill-calc.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const sb = { window: { challengesData: [] }, console: { log() {} } };
vm.createContext(sb);
for (const f of ['../src/data/datasets.js', '../src/data/challenges.js']) vm.runInContext(readFileSync(here(f), 'utf8'), sb);
const { publicDatasetsData: datasets, challengesData: bank } = sb.window;
const IDS = [325, 326, 327, 328, 329];
const byId = id => bank.find(c => c.id === id);

let SQL;
beforeAll(async () => { SQL = await initSqlJs(); });

// app.jsx loadDataset + loadChallengeDatasets, line for line in behaviour.
function loadDataset(db, key, onlyTables = null) {
  for (const [name, t] of Object.entries(datasets[key].tables)) {
    if (onlyTables && !onlyTables.includes(name)) continue;
    db.run(`DROP TABLE IF EXISTS ${name}`);
    const types = t.columns.map((_, i) => {
      const s = t.data[0]?.[i];
      return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.run(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    for (const r of t.data) db.run(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(', ')})`, r);
  }
}
const loadChallenge = (db, c) => challengeTablePlan(c, datasets).forEach(s => loadDataset(db, s.dataset, s.tables));
const makeDbFor = c => () => { const db = new SQL.Database(); loadChallenge(db, c); return db; };
const loadedTablesFor = c => challengeTablePlan(c, datasets).flatMap(s => s.tables || Object.keys(datasets[s.dataset].tables));
const grade = (id, sql) => {
  const c = byId(id);
  return gradeStateChallenge({ makeDb: makeDbFor(c), challenge: c, sql, compare: resultsMatch, loadedTables: loadedTablesFor(c) });
};

const WRONG = {
  // whole table, not the filter
  325: ['INSERT INTO vip_list SELECT customer_id, name, email FROM customers', 'state_row_count'],
  // the best single employee's department is not the best department… the best employee alone
  326: ['UPDATE employees SET salary = salary + 3000 WHERE performance_rating = (SELECT MAX(performance_rating) FROM employees)', 'state_values'],
  // keeps the newest copy instead of the original
  327: ['DELETE FROM logins WHERE login_id NOT IN (SELECT MAX(login_id) FROM logins GROUP BY customer_id, login_at)', 'state_values'],
  // replace instead of add: January is thrown away
  328: ["INSERT OR REPLACE INTO country_units (country, units) SELECT country, SUM(quantity) FROM orders WHERE status = 'completed' AND order_date LIKE '2024-02%' GROUP BY country", 'state_values'],
  // no CHECK: the negative refund gets in
  329: ["CREATE TABLE refunds (refund_id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(order_id), amount REAL, reason TEXT); INSERT INTO refunds VALUES (1, 37, 29.99, 'Order cancelled')", 'state_constraint'],
};

describe('the parser', () => {
  it('splits statements and classifies them', () => {
    expect(splitStatements("INSERT INTO t VALUES ('a;b'); SELECT 1")).toHaveLength(2);
    expect(statementKind('with d as (select 1) delete from t')).toBe('DELETE');
    expect(statementKind('REPLACE INTO t VALUES (1)')).toBe('INSERT');
    expect(statementKind('drop table customers')).toBe('DROP');
    expect(statementKind('Attach database \'x\' as y')).toBe('ATTACH');
    expect(statementKind('pragma foreign_keys = off')).toBe('PRAGMA');
  });

  it('finds every table a statement names, and skips CTEs and DO UPDATE SET', () => {
    expect(referencedTables('SELECT * FROM a, b x JOIN c ON 1')).toEqual(['a', 'b', 'c']);
    expect(referencedTables('WITH d AS (SELECT * FROM a) DELETE FROM b WHERE id IN (SELECT * FROM d)')).toEqual(['a', 'b']);
    expect(referencedTables('INSERT INTO t SELECT * FROM s WHERE 1 ON CONFLICT (k) DO UPDATE SET v = excluded.v')).toEqual(['t', 's']);
    expect(referencedTables('SELECT * FROM pragma_table_info(\'orders\')')).toEqual(['pragma_table_info']);
  });
});

describe('the gate refuses before anything runs', () => {
  const c = () => byId(327);
  const L = () => loadedTablesFor(c());
  it.each([
    ['DROP TABLE logins', 'forbidden'],
    ['DELETE FROM logins; DROP TABLE logins', 'forbidden'],
    ["ATTACH DATABASE ':memory:' AS x", 'forbidden'],
    ['PRAGMA foreign_keys = OFF', 'forbidden'],
    ['UPDATE logins SET login_at = NULL', 'not_allowed'],
    ['CREATE TABLE logins2 AS SELECT * FROM logins', 'not_allowed'],
    ['DELETE FROM employees', 'unknown_table'],
    ['SELECT * FROM sqlite_master', 'unknown_table'],
    ['SELECT * FROM pragma_table_info(\'logins\')', 'unknown_table'],
    ['DELETE FROM temp.logins', 'unknown_table'],
  ])('%s → %s', (sql, reason) => {
    const g = checkStatements(sql, c(), L());
    expect(g.ok).toBe(false);
    expect(g.reason).toBe(reason);
  });

  // A1 on #172: a quote inside a double-quoted identifier opened a fake
  // string in stripSql and hid the DELETE after it from the gate.
  const SMUGGLE = `INSERT INTO vip_list SELECT customer_id, name, email FROM customers WHERE membership IN ('Gold', 'Platinum'); SELECT 1 AS "a'"; DELETE FROM vip_list WHERE customer_id = 1; SELECT '"'`;
  it('a quote inside a quoted identifier cannot hide a statement from the text gate', () => {
    expect(splitStatements(SMUGGLE)).toHaveLength(4);
    const g = checkStatements(SMUGGLE, byId(325), loadedTablesFor(byId(325)));
    expect(g.ok).toBe(false);
    expect(g.kind).toBe('DELETE');
    expect(grade(325, SMUGGLE).refused.kind).toBe('DELETE');
  });

  // Orchestrator's list on #172: the classic quote and comment shapes. Each
  // goes through the text gate AND the real grading path (run gate included).
  const c325 = () => byId(325);
  const gate325 = sql => checkStatements(sql, c325(), loadedTablesFor(c325()));
  it.each([
    ["a closed string, then DROP: INSERT … ('x'); DROP TABLE vip_list; --')", "INSERT INTO vip_list VALUES (99, 'x', 'y'); DROP TABLE vip_list; --')", 'DROP'],
    ["the bare injection string '; DROP TABLE x; --", "'; DROP TABLE x; --", 'OTHER'],
    ['a statement after a block comment', 'INSERT INTO vip_list VALUES (99, \'x\', \'y\'); /* harmless */ DELETE FROM vip_list', 'DELETE'],
    ['a statement on the line after a line comment', 'INSERT INTO vip_list VALUES (99, \'x\', \'y\'); -- trailing note\nDELETE FROM vip_list', 'DELETE'],
  ])('refused: %s', (_name, sql, kind) => {
    const g = gate325(sql);
    expect(g.ok).toBe(false);
    expect(g.kind).toBe(kind);
    expect(grade(325, sql).passed).toBe(false);
    expect(grade(325, sql).refused).toBeTruthy();
  });

  it.each([
    ['a double-quoted identifier named DROP', 'INSERT INTO vip_list (customer_id, name, email) SELECT customer_id AS "DROP", name, email FROM customers WHERE membership IN (\'Gold\', \'Platinum\')'],
    ['a semicolon inside a string', "INSERT INTO vip_list (customer_id, name, email) SELECT customer_id, name, email FROM customers WHERE membership IN ('Gold', 'Platinum') AND name <> 'a;b DROP TABLE x'"],
    ['a statement hidden in a comment', "-- DELETE FROM vip_list;\nINSERT INTO vip_list (customer_id, name, email) SELECT customer_id, name, email FROM customers WHERE membership IN ('Gold', 'Platinum') /* ; DROP TABLE vip_list */"],
  ])('allowed and graded right: %s', (_name, sql) => {
    expect(splitStatements(sql)).toHaveLength(1);
    expect(gate325(sql).ok).toBe(true);
    expect(grade(325, sql).passed).toBe(true);
  });

  it('the run gate sees every statement SQLite executes, whatever the text parser thought', () => {
    const db = makeDbFor(byId(325))();
    db.exec(byId(325).setup);
    const seen = [];
    const gate = text => { seen.push(text.trim().split(/\s+/)[0].toUpperCase()); return /^\s*DELETE/i.test(text) ? { reason: 'not_allowed', kind: 'DELETE', message: 'DELETE is not allowed' } : null; };
    let refused = null;
    try { execGated(db, SMUGGLE, gate); } catch (e) { refused = e.refused; }
    expect(seen).toEqual(['INSERT', 'SELECT', 'DELETE']);
    expect(refused && refused.kind).toBe('DELETE');
    expect(db.exec('SELECT COUNT(*) FROM vip_list')[0].values[0][0]).toBe(6); // the DELETE never ran
    db.close();
  });

  it('a refused attempt is graded wrong with a refusal diagnosis, and runs nothing', () => {
    const c329 = byId(329);
    let opened = 0;
    const makeDb = () => { opened++; return makeDbFor(c329)(); };
    const g = gradeStateChallenge({ makeDb, challenge: c329, sql: 'DROP TABLE orders', compare: resultsMatch, loadedTables: loadedTablesFor(c329) });
    expect(g.passed).toBe(false);
    expect(g.refused.reason).toBe('forbidden');
    expect(g.diagnosis.kind).toBe('state_refused');
    expect(opened).toBe(0);
  });

  it('lets the challenge\'s own tables, SELECT and the declared new table through', () => {
    expect(checkStatements('SELECT * FROM logins; DELETE FROM logins WHERE login_id > 100', byId(327), loadedTablesFor(byId(327))).ok).toBe(true);
    expect(checkStatements(byId(329).solution, byId(329), loadedTablesFor(byId(329))).ok).toBe(true);
  });
});

describe('the five challenges', () => {
  it('are state-graded, appended, tagged DDL/DML only, and the tag moves no Skillmap axis', () => {
    // Appended after 324, never renumbered: later batches (343-354,
    // 2026-11-23) may come after these five, so the rule is the ids below
    // them, not every other id in the bank.
    expect(Math.min(...IDS)).toBeGreaterThan(324);
    expect(Math.max(...bank.filter(c => !IDS.includes(c.id) && c.id < Math.min(...IDS)).map(c => c.id))).toBe(324);
    for (const id of IDS) {
      const c = byId(id);
      expect(bank.filter(x => x.id === id), `#${id}`).toHaveLength(1);
      expect(isStateGraded(c), `#${id}`).toBe(true);
      expect(c.category).toBe('DDL/DML');
      expect(c.skills).toEqual(['DDL/DML']);
      expect(c.mutates, `#${id} must not use the shared-db mutates path`).toBeUndefined();
      expect(['Easy', 'Medium']).toContain(c.difficulty);
      for (const k of ['title', 'description', 'hint', 'solution', 'check', 'title_tr', 'description_tr', 'hint_tr', 'slug']) expect(typeof c[k], `#${id}.${k}`).toBe('string');
      expect(c.allow.length).toBeGreaterThan(0);
    }
    expect(SKILL_TO_RADAR['DDL/DML']).toBeUndefined();
    expect(mapTopicToSkill('DDL/DML') ?? null).toBeNull();
  });

  it('prompts never name the method', () => {
    const METHOD = /\b(INSERT|UPDATE|DELETE|SELECT|ON CONFLICT|UPSERT|MERGE|PRIMARY KEY|FOREIGN KEY|REFERENCES|CHECK\s*\(|GROUP BY|subquery|MIN\(|DISTINCT)\b/i;
    for (const id of IDS) {
      const c = byId(id);
      expect(c.title, `#${id} title`).not.toMatch(METHOD);
      expect(c.description, `#${id} description`).not.toMatch(METHOD);
    }
  });

  const PINNED = {
    325: { rows: 6, first: [1, 'John Smith', 'john.smith@email.com'] },
    326: { rows: 50, changed: 8, by: 3000, dept: 'HR' },
    327: { rows: 41, ids: [...Array.from({ length: 37 }, (_, i) => i + 1), 141, 142, 143, 144] },
    328: { rows: [['Australia', 5], ['Canada', 8], ['France', 5], ['Germany', 4], ['Japan', 2], ['UK', 3], ['USA', 20]] },
    329: { rows: [[1, 37, 29.99, 'Order cancelled'], [5, 5, 10, 'valid']] },
  };

  it.each(IDS)('#%i: the reference passes and its state is pinned', id => {
    const g = grade(id, byId(id).solution);
    expect(g.passed, JSON.stringify(g.diagnosis)).toBe(true);
    const rows = g.expected.check.rows;
    const p = PINNED[id];
    if (id === 325) { expect(rows).toHaveLength(p.rows); expect(rows[0]).toEqual(p.first); expect(rows.map(r => r[0])).toEqual([1, 3, 5, 10, 12, 13]); }
    if (id === 326) {
      expect(rows).toHaveLength(p.rows);
      const before = Object.fromEntries(datasets.employees.tables.employees.data.map(r => [r[0], r[4]]));
      const diffs = rows.filter(([emp, sal]) => sal !== before[emp]);
      expect(diffs).toHaveLength(p.changed);
      const deptOf = Object.fromEntries(datasets.employees.tables.employees.data.map(r => [r[0], r[2]]));
      for (const [emp] of diffs) expect(deptOf[emp]).toBe(p.dept);
      for (const [emp, sal] of diffs) expect(sal - before[emp]).toBe(p.by);
    }
    if (id === 327) expect(rows.map(r => r[0])).toEqual(p.ids);
    if (id === 328 || id === 329) expect(rows).toEqual(p.rows);
    expect(g.expected.accepted).toEqual(id === 329 ? ['a valid refund of 10.00 for order 5'] : []);
  });

  it.each(IDS)('#%i: the common wrong answer fails with a state diagnosis', id => {
    const [sql, kind] = WRONG[id];
    const g = grade(id, sql);
    expect(g.passed).toBe(false);
    expect(g.diagnosis.kind).toBe(kind);
  });

  // Q1 / A1 on #172: three wrong answers used to pass. Each must fail now.
  it.each([
    [326, 'best single employee', "UPDATE employees SET salary = salary + 3000 WHERE department = (SELECT department FROM employees ORDER BY performance_rating DESC LIMIT 1)"],
    [326, 'SUM instead of AVG', "UPDATE employees SET salary = salary + 3000 WHERE department = (SELECT department FROM employees GROUP BY department ORDER BY SUM(performance_rating) DESC LIMIT 1)"],
    [326, 'biggest headcount', "UPDATE employees SET salary = salary + 3000 WHERE department = (SELECT department FROM employees GROUP BY department ORDER BY COUNT(*) DESC LIMIT 1)"],
    [327, 'deleting by id range', 'DELETE FROM logins WHERE login_id > 100'],
    [329, 'amount >= 0', "CREATE TABLE refunds (refund_id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(order_id), amount REAL CHECK (amount >= 0), reason TEXT); INSERT INTO refunds VALUES (1, 37, 29.99, 'Order cancelled')"],
    [327, 'dedupe on login_at alone', 'DELETE FROM logins WHERE login_id NOT IN (SELECT MIN(login_id) FROM logins GROUP BY login_at)'],
    [329, 'an extra required column', "CREATE TABLE refunds (refund_id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL REFERENCES orders(order_id), amount REAL CHECK (amount > 0), reason TEXT, approved_by TEXT NOT NULL); INSERT INTO refunds VALUES (1, 37, 29.99, 'Order cancelled', 'finance')"],
    [329, 'CHECK (refund_id = 1)', "CREATE TABLE refunds (refund_id INTEGER PRIMARY KEY CHECK (refund_id = 1), order_id INTEGER, amount REAL, reason TEXT); INSERT INTO refunds VALUES (1, 37, 29.99, 'Order cancelled')"],
  ])('#%i: %s fails', (id, _label, sql) => {
    const g = grade(id, sql);
    expect(g.passed).toBe(false);
    expect(g.diagnosis.kind).toMatch(/^state_/);
  });

  it('#329: a table that refuses the valid row says so', () => {
    const g = grade(329, "CREATE TABLE refunds (refund_id INTEGER PRIMARY KEY CHECK (refund_id = 1), order_id INTEGER, amount REAL, reason TEXT); INSERT INTO refunds VALUES (1, 37, 29.99, 'Order cancelled')");
    expect(g.diagnosis.kind).toBe('state_rejected_valid');
    expect(g.diagnosis.details).toMatch(/refund of 10.00 for order 5/);
  });

  it('#327 and #329: alternative correct answers still pass', () => {
    expect(grade(327, 'DELETE FROM logins WHERE EXISTS (SELECT 1 FROM logins o WHERE o.customer_id = logins.customer_id AND o.login_at = logins.login_at AND o.login_id < logins.login_id)').passed).toBe(true);
    expect(grade(327, 'DELETE FROM logins WHERE login_id IN (SELECT login_id FROM (SELECT login_id, ROW_NUMBER() OVER (PARTITION BY customer_id, login_at ORDER BY login_id) AS rn FROM logins) WHERE rn > 1)').passed).toBe(true);
    expect(grade(329, "CREATE TABLE refunds (refund_id INTEGER, order_id INTEGER NOT NULL, amount NUMERIC, reason TEXT, PRIMARY KEY (refund_id), FOREIGN KEY (order_id) REFERENCES orders(order_id), CHECK (amount > 0)); INSERT INTO refunds (refund_id, order_id, amount, reason) VALUES (1, 37, 29.99, 'Order cancelled')").passed).toBe(true);
  });

  it('the row-count sentence speaks about the table', () => {
    const g = grade(325, WRONG[325][0]);
    expect(g.diagnosis.headline).toBe('Your table ended up with 16 rows, expected 6');
  });

  it('#329: each missing constraint is caught on its own', () => {
    const base = "INSERT INTO refunds VALUES (1, 37, 29.99, 'Order cancelled')";
    const noPk = `CREATE TABLE refunds (refund_id INTEGER, order_id INTEGER NOT NULL REFERENCES orders(order_id), amount REAL CHECK (amount > 0), reason TEXT); ${base}`;
    const noFk = `CREATE TABLE refunds (refund_id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, amount REAL CHECK (amount > 0), reason TEXT); ${base}`;
    expect(grade(329, noPk).diagnosis.details).toMatch(/refund_id 1/);
    expect(grade(329, noFk).diagnosis.details).toMatch(/order 9999/);
  });

  it('#328: a two-step answer (update, then insert the new ones) passes too', () => {
    const feb = "SELECT country, SUM(quantity) AS u FROM orders WHERE status = 'completed' AND order_date LIKE '2024-02%' GROUP BY country";
    const sql = `UPDATE country_units SET units = units + (SELECT u FROM (${feb}) f WHERE f.country = country_units.country) WHERE country IN (SELECT country FROM (${feb}));
INSERT INTO country_units SELECT country, u FROM (${feb}) WHERE country NOT IN (SELECT country FROM country_units);`;
    expect(grade(328, sql).passed).toBe(true);
  });

  // Q1 2026-11-23: the setup carries a 02-29 (leap day) row and a 03-01 row, so a
  // February filter with no upper bound, or one that stops at 02-28, ends in a
  // different state from the reference.
  it('#328: a February filter with no upper bound fails', () => {
    const sql = "INSERT INTO country_units (country, units) SELECT country, SUM(quantity) FROM orders WHERE status = 'completed' AND order_date >= '2024-02-01' GROUP BY country ON CONFLICT (country) DO UPDATE SET units = units + excluded.units";
    const g = grade(328, sql);
    expect(g.passed).toBe(false);
    expect(g.diagnosis.kind).toBe('state_values');
  });

  it("#328: BETWEEN '2024-02-01' AND '2024-02-28' fails (2024 is a leap year)", () => {
    const sql = "INSERT INTO country_units (country, units) SELECT country, SUM(quantity) FROM orders WHERE status = 'completed' AND order_date BETWEEN '2024-02-01' AND '2024-02-28' GROUP BY country ON CONFLICT (country) DO UPDATE SET units = units + excluded.units";
    const g = grade(328, sql);
    expect(g.passed).toBe(false);
    expect(g.diagnosis.kind).toBe('state_values');
  });

  it("#328: LIKE '2024-02%' and BETWEEN … '2024-02-29' still pass", () => {
    for (const where of ["order_date LIKE '2024-02%'", "order_date BETWEEN '2024-02-01' AND '2024-02-29'", "strftime('%Y-%m', order_date) = '2024-02'"]) {
      const sql = `INSERT INTO country_units (country, units) SELECT country, SUM(quantity) FROM orders WHERE status = 'completed' AND ${where} GROUP BY country ON CONFLICT (country) DO UPDATE SET units = units + excluded.units`;
      expect(grade(328, sql).passed, where).toBe(true);
    }
  });

  it('a statement that errors is an error, not a wrong answer', () => {
    const g = grade(325, 'INSERT INTO vip_list (nope) VALUES (1)');
    expect(g.passed).toBe(false);
    expect(g.error).toMatch(/nope/);
  });
});

describe('the shared db is never touched', () => {
  it('runtime: grading and running leave a separately opened "shared" database byte-identical', () => {
    for (const id of IDS) {
      const c = byId(id);
      const shared = new SQL.Database();
      loadChallenge(shared, c);
      const before = shared.export();
      const makeDb = makeDbFor(c);
      gradeStateChallenge({ makeDb, challenge: c, sql: c.solution, compare: resultsMatch, loadedTables: loadedTablesFor(c) });
      gradeStateChallenge({ makeDb, challenge: c, sql: WRONG[id][0], compare: resultsMatch, loadedTables: loadedTablesFor(c) });
      runStateAttempt({ makeDb, challenge: c, sql: c.solution, loadedTables: loadedTablesFor(c) });
      expect(Buffer.from(shared.export()).equals(Buffer.from(before)), `#${id}`).toBe(true);
      shared.close();
    }
  });

  it('every database the grader opens, it closes', () => {
    const c = byId(328);
    const open = [];
    const makeDb = () => { const db = makeDbFor(c)(); const close = db.close.bind(db); db.close = () => { open.splice(open.indexOf(db), 1); close(); }; open.push(db); return db; };
    gradeStateChallenge({ makeDb, challenge: c, sql: c.solution, compare: resultsMatch, loadedTables: loadedTablesFor(c) });
    runStateAttempt({ makeDb, challenge: c, sql: c.solution, loadedTables: loadedTablesFor(c) });
    expect(open).toHaveLength(0);
  });

  it('source guard: app.jsx grades a state challenge on stateChallengeDb, never on the shared db', () => {
    const app = readFileSync(here('../src/app.jsx'), 'utf8');
    // the fresh-copy factory builds its own sql.js Database
    const factory = app.match(/const stateChallengeDb = \(challenge\) => \{[\s\S]*?\n {2}\};/);
    expect(factory, 'stateChallengeDb factory').toBeTruthy();
    expect(factory[0]).toMatch(/new SQL\.Database\(\)/);
    expect(factory[0]).not.toMatch(/\bdb\b(?!\s*=)/);
    // both state call sites hand the grader that factory
    const calls = app.match(/(gradeStateChallenge|runStateAttempt)\(\{[^}]*\}/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const c of calls) expect(c).toMatch(/makeDb: \(\) => stateChallengeDb\((challenge|currentChallenge)\)/);
    // every place the shared db runs a challenge's solution skips a state challenge first
    for (const site of ['const result = db.exec(challenge.solution);', 'const result = db.exec(currentChallenge.solution);', 'expectedResultData = db.exec(currentChallenge.solution);']) {
      const i = app.indexOf(site);
      expect(i, site).toBeGreaterThan(-1);
      expect(app.slice(Math.max(0, i - 2500), i), `guard before: ${site}`).toMatch(/isStateGraded\((challenge|currentChallenge)\)/);
    }
  });
});

describe('the question pages publish the prompt only', () => {
  it.each(IDS)('#%i: the built page says how it is graded and carries no solution, setup or check', async id => {
    const { loadQuestionBank, questionSlugs } = await import('../scripts/question-slugs.mjs');
    const slug = questionSlugs(loadQuestionBank().bank).get(id);
    const html = readFileSync(here(`../public/questions/${slug}/index.html`), 'utf8');
    const flat = s => String(s).replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').toLowerCase();
    const page = flat(html);
    const c = byId(id);
    expect(page).toContain('graded on what the table holds after your statements');
    for (const [k, v] of [['solution', c.solution], ['check', c.check], ['setup', c.setup]]) {
      if (!v) continue;
      for (const st of splitStatements(v)) expect(page, `#${id} ${k}: ${st.slice(0, 40)}`).not.toContain(flat(st).slice(0, 50));
    }
  });
});
