// The second state-graded set, ids 355-359 (C6, 2026-11-24): an index,
// a DELETE over a NULL-bearing list, ALTER TABLE + backfill, a two-table
// move inside a transaction, and an upsert that only takes newer prices.
// Same harness as tests/state-grade.test.js: sql.js 1.8.0 (the CDN's engine),
// the app's table loader and the app's comparator (resultsMatch).
//
// Per challenge (Q1's checks, the #328 BETWEEN trap is the precedent):
//   - the reference passes and its resulting state is pinned;
//   - at least two alternative correct answers pass;
//   - at least three wrong answers fail, each with a state diagnosis;
//   - the gate refuses what the challenge does not allow.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import initSqlJs from 'sql.js';
import { checkStatements, gradeStateChallenge, runStateAttempt, isStateGraded, splitStatements } from '../src/utils/state-grade.js';
import { resultsMatch } from '../src/utils/grade.js';
import { challengeTablePlan, missingChallengeTables } from '../src/utils/challenge-datasets.js';
import { SKILL_TO_RADAR } from '../src/utils/skill-calc.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const sb = { window: { challengesData: [] }, console: { log() {} } };
vm.createContext(sb);
for (const f of ['../src/data/datasets.js', '../src/data/challenges.js']) vm.runInContext(readFileSync(here(f), 'utf8'), sb);
const { publicDatasetsData: datasets, challengesData: bank } = sb.window;
const IDS = [355, 356, 357, 358, 359];
const byId = id => bank.find(c => c.id === id);

let SQL;
beforeAll(async () => { SQL = await initSqlJs(); });

// app.jsx loadDataset, line for line in behaviour (a column's type comes from the first row).
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
const makeDbFor = c => () => { const db = new SQL.Database(); challengeTablePlan(c, datasets).forEach(s => loadDataset(db, s.dataset, s.tables)); return db; };
const loadedTablesFor = c => challengeTablePlan(c, datasets).flatMap(s => s.tables || Object.keys(datasets[s.dataset].tables));
const grade = (id, sql) => {
  const c = byId(id);
  return gradeStateChallenge({ makeDb: makeDbFor(c), challenge: c, sql, compare: resultsMatch, loadedTables: loadedTablesFor(c) });
};
const gate = (id, sql) => checkStatements(sql, byId(id), loadedTablesFor(byId(id)));

const FEB = "status = 'completed' AND order_date >= '2024-02-01' AND order_date < '2024-03-01'";

const RIGHT = {
  355: [
    'CREATE INDEX IF NOT EXISTS "orders by customer, date" ON orders (customer_id, order_date DESC)',
    'CREATE INDEX ix ON orders (customer_id, order_date, total)',
    "EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 3 AND order_date >= '2024-02-01'; CREATE INDEX a ON orders (customer_id, order_date); EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 3 AND order_date >= '2024-02-01'",
  ],
  356: [
    'DELETE FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL)',
    'DELETE FROM customers WHERE customer_id IN (SELECT c.customer_id FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL)',
    'DELETE FROM customers WHERE customer_id IN (SELECT customer_id FROM customers EXCEPT SELECT customer_id FROM orders)',
  ],
  357: [
    "ALTER TABLE customers ADD COLUMN lifetime_spend REAL NOT NULL DEFAULT 0; UPDATE customers SET lifetime_spend = s.spend FROM (SELECT customer_id, SUM(total) AS spend FROM orders WHERE status = 'completed' GROUP BY customer_id) s WHERE s.customer_id = customers.customer_id",
    "ALTER TABLE customers ADD lifetime_spend NUMERIC; UPDATE customers SET lifetime_spend = (SELECT TOTAL(total) FROM orders WHERE orders.customer_id = customers.customer_id AND status = 'completed')",
    "ALTER TABLE customers ADD COLUMN lifetime_spend REAL; UPDATE customers SET lifetime_spend = 0; UPDATE customers SET lifetime_spend = (SELECT SUM(total) FROM orders o WHERE o.customer_id = customers.customer_id AND o.status = 'completed') WHERE customer_id IN (SELECT customer_id FROM orders WHERE status = 'completed')",
  ],
  358: [
    `INSERT INTO orders_archive SELECT * FROM orders WHERE ${FEB}; DELETE FROM orders WHERE ${FEB}`,
    "BEGIN TRANSACTION; INSERT INTO orders_archive SELECT * FROM orders WHERE status = 'completed' AND order_date LIKE '2024-02%'; DELETE FROM orders WHERE order_id IN (SELECT order_id FROM orders_archive); END",
    "SAVEPOINT close_feb; INSERT INTO orders_archive SELECT * FROM orders WHERE status = 'completed' AND strftime('%Y-%m', order_date) = '2024-02'; DELETE FROM orders WHERE EXISTS (SELECT 1 FROM orders_archive a WHERE a.order_id = orders.order_id); RELEASE close_feb",
  ],
  359: [
    // latest row per product first, then the conditional upsert
    'INSERT INTO product_prices (product, price, updated_at) SELECT product, price, updated_at FROM (SELECT product, price, updated_at, ROW_NUMBER() OVER (PARTITION BY product ORDER BY updated_at DESC) AS rn FROM price_feed) WHERE rn = 1 ON CONFLICT (product) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at WHERE excluded.updated_at > product_prices.updated_at',
    // two steps: update the newer ones, then insert the new products
    `UPDATE product_prices SET price = f.price, updated_at = f.updated_at FROM (SELECT product, price, MAX(updated_at) AS updated_at FROM price_feed GROUP BY product) f WHERE f.product = product_prices.product AND f.updated_at > product_prices.updated_at;
INSERT INTO product_prices (product, price, updated_at) SELECT product, price, MAX(updated_at) FROM price_feed WHERE product NOT IN (SELECT product FROM product_prices) GROUP BY product`,
    // feed in time order, every row upserted with the guard
    'INSERT INTO product_prices SELECT product, price, updated_at FROM price_feed WHERE 1 ORDER BY updated_at ON CONFLICT DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at WHERE excluded.updated_at > updated_at',
  ],
};

const WRONG = {
  355: [
    ['the columns in the wrong order', 'CREATE INDEX ix ON orders (order_date, customer_id)'],
    ['customer_id alone', 'CREATE INDEX ix ON orders (customer_id)'],
    ['two single-column indexes', 'CREATE INDEX a ON orders (customer_id); CREATE INDEX b ON orders (order_date)'],
    ['a partial index', "CREATE INDEX ix ON orders (customer_id, order_date) WHERE status = 'completed'"],
    // Q1 on #298: these two passed a text check (NOT LIKE '% WHERE %')
    ['a partial index, WHERE on its own line', "CREATE INDEX ix ON orders (customer_id, order_date)\nWHERE status = 'completed'"],
    ['a partial index written WHERE(', "CREATE INDEX ix ON orders (customer_id, order_date) WHERE(status = 'completed')"],
  ],
  356: [
    ['NOT IN over a list that holds NULL', 'DELETE FROM customers WHERE customer_id NOT IN (SELECT customer_id FROM orders)'],
    ['trusting the stale counter', 'DELETE FROM customers WHERE total_orders = 0'],
    ['a cancelled order counted as never placed', "DELETE FROM customers WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = customers.customer_id AND o.status = 'completed')"],
  ],
  357: [
    ['NULL, not 0, for no completed orders', "ALTER TABLE customers ADD COLUMN lifetime_spend REAL; UPDATE customers SET lifetime_spend = (SELECT SUM(total) FROM orders o WHERE o.customer_id = customers.customer_id AND o.status = 'completed')"],
    ['every status counted', 'ALTER TABLE customers ADD COLUMN lifetime_spend REAL; UPDATE customers SET lifetime_spend = (SELECT COALESCE(SUM(total), 0) FROM orders o WHERE o.customer_id = customers.customer_id)'],
    ['an UPDATE … FROM leaves the no-order customers NULL', "ALTER TABLE customers ADD COLUMN lifetime_spend REAL; UPDATE customers SET lifetime_spend = s.spend FROM (SELECT customer_id, SUM(total) AS spend FROM orders WHERE status = 'completed' GROUP BY customer_id) s WHERE s.customer_id = customers.customer_id"],
  ],
  358: [
    ["BETWEEN … '2024-02-28' misses the leap day", `INSERT INTO orders_archive SELECT * FROM orders WHERE status = 'completed' AND order_date BETWEEN '2024-02-01' AND '2024-02-28'; DELETE FROM orders WHERE order_id IN (SELECT order_id FROM orders_archive)`],
    ['no upper bound takes March 1', "INSERT INTO orders_archive SELECT * FROM orders WHERE status = 'completed' AND order_date >= '2024-02-01'; DELETE FROM orders WHERE order_id IN (SELECT order_id FROM orders_archive)"],
    ['the DELETE drops the status filter', `INSERT INTO orders_archive SELECT * FROM orders WHERE ${FEB}; DELETE FROM orders WHERE order_date >= '2024-02-01' AND order_date < '2024-03-01'`],
    ['copied, never removed', `INSERT INTO orders_archive SELECT * FROM orders WHERE ${FEB}`],
    ['rolled back', `BEGIN; INSERT INTO orders_archive SELECT * FROM orders WHERE ${FEB}; DELETE FROM orders WHERE ${FEB}; ROLLBACK`],
  ],
  359: [
    ['replace everything', 'INSERT OR REPLACE INTO product_prices (product, price, updated_at) SELECT product, price, updated_at FROM price_feed ORDER BY feed_id'],
    ['an upsert with no newer-only condition', 'INSERT INTO product_prices (product, price, updated_at) SELECT product, price, updated_at FROM price_feed WHERE true ON CONFLICT (product) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at'],
    ['a same-time row overwrites (>=)', 'INSERT INTO product_prices (product, price, updated_at) SELECT product, price, updated_at FROM price_feed WHERE true ON CONFLICT (product) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at WHERE excluded.updated_at >= product_prices.updated_at'],
    ['the stored timestamp is left stale', 'INSERT INTO product_prices (product, price, updated_at) SELECT product, price, updated_at FROM price_feed WHERE true ON CONFLICT (product) DO UPDATE SET price = excluded.price WHERE excluded.updated_at > product_prices.updated_at'],
    ['existing products only, the new one never lands', 'UPDATE product_prices SET price = f.price, updated_at = f.updated_at FROM (SELECT product, price, MAX(updated_at) AS updated_at FROM price_feed GROUP BY product) f WHERE f.product = product_prices.product AND f.updated_at > product_prices.updated_at'],
    ['the newest feed row per product, applied without comparing to the stored one', 'INSERT INTO product_prices (product, price, updated_at) SELECT product, price, MAX(updated_at) FROM price_feed GROUP BY product ON CONFLICT (product) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at'],
  ],
};

describe('the second state-graded set (355-359)', () => {
  it('is state-graded, tagged DDL/DML only, on tables a dataset provides, and moves no Skillmap axis', () => {
    for (const id of IDS) {
      const c = byId(id);
      expect(bank.filter(x => x.id === id), `#${id}`).toHaveLength(1);
      expect(isStateGraded(c), `#${id}`).toBe(true);
      expect(c.category).toBe('DDL/DML');
      expect(c.skills).toEqual(['DDL/DML']);
      expect(c.mutates).toBeUndefined();
      expect(missingChallengeTables(c, datasets), `#${id}`).toEqual([]);
      for (const k of ['title', 'description', 'hint', 'solution', 'check', 'title_tr', 'description_tr', 'hint_tr', 'slug']) expect(typeof c[k], `#${id}.${k}`).toBe('string');
    }
    expect(SKILL_TO_RADAR['DDL/DML']).toBeUndefined();
  });

  it('prompts never name the method', () => {
    const METHOD = /\b(INSERT|UPDATE|DELETE|SELECT|ALTER|ADD COLUMN|INDEX|ON CONFLICT|UPSERT|MERGE|REPLACE|NOT IN|NOT EXISTS|COALESCE|IFNULL|BEGIN|COMMIT|TRANSACTION|ROLLBACK|BETWEEN)\b/i;
    for (const id of IDS) {
      const c = byId(id);
      expect(c.title, `#${id} title`).not.toMatch(METHOD);
      expect(c.description, `#${id} description`).not.toMatch(METHOD);
    }
  });

  const PINNED = {
    355: [[40, 1]],
    356: [[1, 'John Smith'], [2, 'Emma Wilson'], [3, 'Michael Brown'], [4, 'Sarah Davis'], [5, 'James Johnson'], [6, 'Emily Taylor'], [7, 'Daniel Martinez'], [8, 'Olivia Anderson'], [9, 'William Thomas'], [10, 'Sophia Lee'], [14, 'John Smith Jr']],
    357: [[1, 2039.92], [2, 1079.94], [3, 809.94], [4, 689.97], [5, 1209.96], [6, 216.93], [7, 739.97], [8, 214.98], [9, 329.94], [10, 639.96], [11, 0], [12, 0], [13, 0], [14, 0], [15, 0], [16, 0]],
    359: [['Desk Lamp', 44.99, '2024-03-02 08:00'], ['Laptop Pro', 1249.99, '2024-03-02 08:00'], ['Office Chair', 349.99, '2024-03-03 14:00'], ['Standing Desk', 599.99, '2024-03-01 09:00'], ['Webcam HD', 89.99, '2024-03-02 12:00'], ['Wireless Mouse', 47.99, '2024-03-02 18:00']],
  };

  it.each(IDS)('#%i: the reference passes and its state is pinned', id => {
    const g = grade(id, byId(id).solution);
    expect(g.passed, JSON.stringify(g.diagnosis)).toBe(true);
    const rows = g.expected.check.rows;
    if (id === 358) {
      const archived = rows.filter(r => r[0] === 'orders_archive').map(r => r[1]);
      const live = rows.filter(r => r[0] === 'orders').map(r => r[1]);
      expect(archived).toEqual([17, 18, 19, 20, 21, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 41]);
      expect(live).toEqual([...Array.from({ length: 16 }, (_, i) => i + 1), 22, 29, 37, 42]);
      // every column came across as it was
      expect(rows.find(r => r[0] === 'orders_archive' && r[1] === 41)).toEqual(['orders_archive', 41, 2, 60, '2024-02-29', 'completed']);
    } else {
      expect(rows).toEqual(PINNED[id]);
    }
  });

  it.each(IDS)('#%i: alternative correct answers pass', id => {
    expect(RIGHT[id].length).toBeGreaterThanOrEqual(2);
    for (const sql of RIGHT[id]) {
      const g = grade(id, sql);
      expect(g.passed, `${sql.slice(0, 90)} → ${JSON.stringify(g.diagnosis || g.error)}`).toBe(true);
    }
  });

  const wrongCases = IDS.flatMap(id => WRONG[id].map(([label, sql]) => [id, label, sql]));
  it.each(wrongCases)('#%i: %s fails with a state diagnosis', (id, _label, sql) => {
    const g = grade(id, sql);
    expect(g.error, g.error).toBeFalsy();
    expect(g.passed).toBe(false);
    expect(g.diagnosis.kind).toMatch(/^state_/);
  });

  it('every challenge has at least three wrong answers that must fail', () => {
    for (const id of IDS) expect(WRONG[id].length, `#${id}`).toBeGreaterThanOrEqual(3);
  });

  it('#356: the NOT IN answer removes nobody, and says so in rows', () => {
    expect(grade(356, WRONG[356][0][1]).diagnosis.headline).toBe('Your table ended up with 16 rows, expected 11');
  });

  it('#357: without the column, the table cannot be read', () => {
    const g = grade(357, "UPDATE customers SET total_orders = 0 WHERE customer_id > 100");
    expect(g.passed).toBe(false);
    expect(g.diagnosis.kind).toBe('state_missing');
  });
});

describe('the gate, per challenge', () => {
  it.each([
    [355, 'DELETE FROM orders WHERE order_id > 40', 'not_allowed'],
    [355, 'CREATE TABLE orders_by_customer AS SELECT * FROM orders ORDER BY customer_id', 'not_allowed'],
    [355, 'CREATE INDEX ix ON employees (emp_id)', 'unknown_table'],
    [356, 'UPDATE customers SET name = NULL', 'not_allowed'],
    [356, 'DELETE FROM employees', 'unknown_table'],
    [357, 'DROP TABLE customers', 'forbidden'],
    [357, 'INSERT INTO customers (customer_id) VALUES (99)', 'not_allowed'],
    [358, 'UPDATE orders SET status = \'archived\'', 'not_allowed'],
    [358, 'ALTER TABLE orders RENAME TO orders_archive', 'not_allowed'],
    [358, 'PRAGMA foreign_keys = OFF', 'forbidden'],
    [359, 'DELETE FROM product_prices', 'not_allowed'],
    [359, 'CREATE TABLE price_feed2 (x)', 'not_allowed'],
    [359, 'SELECT * FROM sqlite_master', 'unknown_table'],
  ])('#%i: %s → %s', (id, sql, reason) => {
    const g = gate(id, sql);
    expect(g.ok).toBe(false);
    expect(g.reason).toBe(reason);
  });

  it('every reference and every alternative gets through the gate', () => {
    for (const id of IDS) for (const sql of [byId(id).solution, ...RIGHT[id]]) expect(gate(id, sql).ok, `#${id}: ${sql.slice(0, 60)}`).toBe(true);
  });

  it('#355: the person can read the plan (EXPLAIN is allowed, and it runs)', () => {
    const c = byId(355);
    const out = runStateAttempt({ makeDb: makeDbFor(c), challenge: c, sql: "CREATE INDEX a ON orders (customer_id, order_date); EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 3 AND order_date >= '2024-02-01'", loadedTables: loadedTablesFor(c) });
    expect(out.refused).toBeUndefined();
    expect(out.error).toBeNull();
    expect(out.last.rows.map(r => r[r.length - 1]).join(' ')).toMatch(/USING INDEX a \(customer_id=\? AND order_date>\?\)/);
  });
});

describe('the shared db is never touched', () => {
  it('grading and running leave a separately opened "shared" database byte-identical', () => {
    for (const id of IDS) {
      const c = byId(id);
      const shared = makeDbFor(c)();
      const before = shared.export();
      const makeDb = makeDbFor(c);
      gradeStateChallenge({ makeDb, challenge: c, sql: c.solution, compare: resultsMatch, loadedTables: loadedTablesFor(c) });
      gradeStateChallenge({ makeDb, challenge: c, sql: WRONG[id][0][1], compare: resultsMatch, loadedTables: loadedTablesFor(c) });
      runStateAttempt({ makeDb, challenge: c, sql: c.solution, loadedTables: loadedTablesFor(c) });
      expect(Buffer.from(shared.export()).equals(Buffer.from(before)), `#${id}`).toBe(true);
      shared.close();
    }
  });
});

describe('the question pages publish the prompt only', () => {
  it.each(IDS)('#%i: the built page carries no solution, setup or check', async id => {
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
