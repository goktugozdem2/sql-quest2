// The eleven challenges that joined the PostgreSQL-mode allow-list on
// 2026-11-25 (content/pg-parity-11; the readiness run is PR #371,
// docs/plans/postgres-mode-flip-2026-11-25.md, "Not done, on purpose").
//
// They were off the list for three reasons, all bank findings rather than
// dialect ones:
//   - a tie under LIMIT, or inside a ROW_NUMBER, that the reference left to
//     the engine's row order (67, 71, 230, 239, 247, 250, 262);
//     (69 too: its CASE in ORDER BY keeps the grader strict, so the tie
//     rule, emp_id, is now in the reference and in the description);
//   - an ORDER BY the grader could not read (150: e1.name for the output
//     column emp_a), so Postgres's other tie order was graded wrong;
//   - HAVING on a column alias, which Postgres refuses (20, 263); 20 also
//     compared two float SUMs for equality (Postgres adds them in another
//     order and dropped Australia), so it compares them to the cent; 263
//     used SUBSTR(x, -4), which Postgres reads differently.
//
// What this file pins, on sql.js 1.8.0 (the app's engine) with the app's
// table rules (a column's type comes from its first row):
//   1. seven expected results did NOT move — their fingerprints are the ones
//      the old references produced, so nobody's past verdict changes;
//   2. four did move (71, 247, 250, 262), and each says its tie rule in the
//      description (and in Turkish where the card has Turkish);
//   3. every reference decides its own answer: the rows loaded reversed or
//      shuffled grade the same (resultsMatch, the app's comparator);
//   4. the grader can read every reference's ORDER BY keys as output columns,
//      so ties the description does not order are graded tie-tolerant (69
//      excepted: strict, and its description states the full order);
//   5. no reference filters an aggregate through its alias in HAVING.
// The Postgres half (same rows on PGlite) is tests/postgres-mode.test.js's
// "equals a fresh run" test over the regenerated allow-list.
import { describe, it, expect, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import initSqlJs from 'sql.js';
import { loadBank } from '../scripts/pg/run-bank.mjs';
import { challengeTablePlan } from '../src/utils/challenge-datasets.js';
import { resultsMatch, parseOrderByKeys, stripSqlLiteralsAndComments } from '../src/utils/grade.js';
import allow from '../src/data/postgres-allowlist.json';

const { datasets, bank } = loadBank();
const byId = id => bank.find(c => c.id === id);
const IDS = [20, 67, 69, 71, 150, 230, 239, 247, 250, 262, 263];

let SQL;
beforeAll(async () => { SQL = await initSqlJs(); });

function shuffled(arr) {
  const a = [...arr];
  let seed = 20261125;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function run(id, order = 'as-is') {
  const c = byId(id);
  const db = new SQL.Database();
  try {
    for (const step of challengeTablePlan(c, datasets)) {
      for (const [name, t] of Object.entries(datasets[step.dataset].tables)) {
        if (step.tables && !step.tables.includes(name)) continue;
        const types = t.columns.map((_, i) => {
          const s = t.data[0]?.[i];
          return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
        });
        db.run(`DROP TABLE IF EXISTS ${name}`);
        db.run(`CREATE TABLE ${name} (${t.columns.map((col, i) => `${col} ${types[i]}`).join(', ')})`);
        const rows = order === 'reverse' ? [...t.data].reverse() : order === 'shuffle' ? shuffled(t.data) : t.data;
        const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
        db.run('BEGIN');
        for (const r of rows) ins.run(r.map(v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v)));
        db.run('COMMIT');
        ins.free();
      }
    }
    const [res] = db.exec(c.solution);
    return res || { columns: [], values: [] };
  } finally { db.close(); }
}

// Numbers to 12 significant digits, as scripts/pg/run-bank.mjs compares them:
// a float SUM depends on the order it adds rows in (Australia's 329.94 is
// 329.93999999999994 on sql.js in the dataset's order), which is not a tie.
const approx = rows => rows.map(r => r.map(v => (typeof v === 'number' && !Number.isInteger(v) ? Number(v.toPrecision(12)) : v)));
const fingerprint = values => createHash('sha256').update(JSON.stringify(values)).digest('hex').slice(0, 16);

describe('the eleven are on the PostgreSQL-mode allow-list', () => {
  it('each one, and the list is 313 of 323', () => {
    for (const id of IDS) expect(allow.challenges[id], `#${id}`).toMatch(/^(asis|rewrite)$/);
    expect(Object.keys(allow.challenges)).toHaveLength(313);
    expect(allow.bankSize).toBe(323);
  });
});

describe('seven expected results did not move', () => {
  // Fingerprints of the OLD references' rows on main at e9a9e621, in order,
  // on sql.js 1.8.0 (exact floats).
  const OLD = {
    20: ['bc0a68d973941b16', 7],
    67: ['0fabfc47e7782854', 97],
    69: ['32c335ddb79e6e42', 50],
    150: ['ab7babdfd89fe345', 64],
    230: ['e285f5b4e991ba92', 15],
    239: ['092ddbbc9bee670d', 40],
    263: ['a624d269fe3b6282', 10],
  };
  for (const [id, [hash, n]] of Object.entries(OLD)) {
    it(`#${id} returns the same ${n} rows in the same order as before`, () => {
      const { values } = run(Number(id));
      expect(values).toHaveLength(n);
      expect(fingerprint(values)).toBe(hash);
    });
  }
});

describe('four expected results moved, and each card says its tie rule', () => {
  it('#71: a tie on total quantity goes to the name first alphabetically', () => {
    const { values } = run(71);
    expect(values).toEqual([
      ['Electronics', 'USB Drive 64GB', 5, 1],
      ['Electronics', 'Bluetooth Speaker', 2, 2], // five products sell 2; was Wireless Mouse
      ['Furniture', 'Desk Organizer', 3, 1], // ties Throw Pillow at 3; was ranked 2
      ['Furniture', 'Throw Pillow', 3, 2],
    ]);
    const c = byId(71);
    expect(c.description).toMatch(/tie on total quantity, the one whose name comes first alphabetically ranks higher/);
    expect(c.description_tr).toMatch(/toplam miktarı eşitse, adı alfabetik olarak önce gelen daha üst sırada/);
    expect(c.hint).toMatch(/ORDER BY total_qty DESC, product\)/);
    expect(c.hint_tr).toMatch(/ORDER BY total_qty DESC, product\)/);
  });
  it('#247: tool_wear_min, then product_id', () => {
    const { values } = run(247);
    expect(values.slice(-2).map(r => [r[0], r[2]])).toEqual([['H32083', 214], ['L47427', 214]]);
    expect(byId(247).description).toMatch(/Order by tool_wear_min descending, then product_id ascending\. Top 30\./);
  });
  it('#250: torque_nm, then udi', () => {
    expect(byId(250).description).toMatch(/Order by torque_nm descending, then udi ascending\. Top 20\./);
    const { values } = run(250);
    for (let i = 1; i < values.length; i++) {
      const [a, b] = [values[i - 1], values[i]];
      expect(a[4] > b[4] || (a[4] === b[4] && a[0] < b[0]), `rows ${i - 1}/${i}`).toBe(true);
    }
  });
  it('#262: ratio, then the most recent quarter, then name', () => {
    expect(byId(262).description).toMatch(/Order by tier1_capital_ratio ascending, then period_end descending \(most recent quarter first\), then name\. Top 20\./);
    const { values } = run(262);
    expect(values[0].slice(0, 3)).toEqual(['Bank Hapoalim B.M.', 'NY', '20251231']);
    expect(values[19].slice(0, 3)).toEqual(['Bank Hapoalim B.M.', 'NY', '20250331']);
  });
});

describe('the cards whose rows did not move say their tie rule too', () => {
  it('#67 row_num: the lower id first (EN + TR, and the hint)', () => {
    const c = byId(67);
    expect(c.description).toMatch(/share a rating, \*\*row_num\*\* goes to the one with the lower \*\*id\*\* first/);
    expect(c.description_tr).toMatch(/rating'i eşitse \*\*row_num\*\* önce \*\*id\*\*'si küçük olana/);
    expect(c.hint).toMatch(/ROW_NUMBER also needs id as a tiebreaker/);
    expect(c.hint_tr).toMatch(/ROW_NUMBER eşitlik bozucu olarak id'ye de/);
  });
  it('#69 is graded strictly (a CASE in ORDER BY), so it states emp_id (EN + TR)', () => {
    const c = byId(69);
    expect(parseOrderByKeys(c.solution)).toBeNull();
    expect(c.solution).toMatch(/pct_of_manager DESC, e\.emp_id$/);
    expect(c.description).toMatch(/employees with the same percentage are listed by emp_id/);
    expect(c.description_tr).toMatch(/aynı yüzdeye sahip çalışanlar emp_id sırasıyla listelenir/);
  });
  it('#230 bbl, #239 the larger amount', () => {
    expect(byId(230).description).toMatch(/Order by document_amt descending, then bbl ascending/);
    expect(byId(239).description).toMatch(/Among sales on the same date, the larger amount comes first/);
  });
});

describe('every reference decides its own answer', () => {
  for (const id of IDS) {
    it(`#${id}: rows loaded reversed or shuffled grade the same`, () => {
      const base = run(id);
      expect(base.values.length, `#${id} empty`).toBeGreaterThan(0);
      for (const order of ['reverse', 'shuffle']) {
        const other = run(id, order);
        expect(resultsMatch(approx(other.values), approx(base.values), byId(id).solution, base.columns), `#${id} ${order}`).toBe(true);
      }
    });
  }
});

describe('the grader can read every ORDER BY but #69\'s', () => {
  for (const id of IDS.filter(i => i !== 69)) {
    it(`#${id}: each top-level ORDER BY key is an output column`, () => {
      const keys = parseOrderByKeys(byId(id).solution);
      expect(keys, `#${id} unreadable ORDER BY`).not.toBeNull();
      const cols = run(id).columns.map(c => c.toLowerCase());
      for (const k of keys) expect(cols, `#${id} key ${k.key}`).toContain(k.key);
    });
  }
});

describe('no HAVING through an output alias', () => {
  for (const id of IDS) {
    it(`#${id}`, () => {
      const sql = stripSqlLiteralsAndComments(byId(id).solution);
      const aliases = [...sql.matchAll(/\bAS\s+([A-Za-z_][A-Za-z0-9_]*)/gi)].map(m => m[1].toLowerCase());
      for (const m of sql.matchAll(/\bHAVING\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:[=<>!]|$)/gi)) {
        expect(aliases, `#${id} HAVING ${m[1]}`).not.toContain(m[1].toLowerCase());
      }
    });
  }
});
