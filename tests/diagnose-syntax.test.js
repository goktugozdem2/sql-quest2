// syntaxNearHint (2026-11-22): one specific line for a syntax error, checked
// against the error REAL SQLite gives for each broken query (better-sqlite3),
// not a hand-typed message. Syntax errors were the most common wrong submit
// (341 person-challenges, 09-30 → 11-21) and the slowest to recover (75%
// solved within the hour vs 83–95% for every other kind).
import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { syntaxNearHint, diagnoseResult, primaryHint } from '../src/utils/diagnose.js';

const db = new Database(':memory:');
db.exec('create table t (a, b, name, price)');
const errorOf = q => { try { db.prepare(q).all(); return null; } catch (e) { return e.message; } };

const CASES = [
  ['select top 5 a from t', /no TOP .* LIMIT 5/],
  ['select a, from t', /comma right before FROM/],
  ['select a, b, where a > 1', /comma right before WHERE/],
  ['select a,, b from t', /Two commas in a row/],
  ['select (a from t', /'\(' is never closed/],
  ['select a from t where a > ', /stops in the middle/],
  ["select a from t where name = 'x", /closing quote is missing/],
  ['select count(*) from t where a in select a from t', /IN \(SELECT/],
  ['select a from where a > 1', /FROM needs a table name before WHERE/],
  ['select a from t order a', /ORDER needs BY/],
  ['select a from t group a', /GROUP needs BY/],
  ['select a from t order by a limit 5 desc', /DESC \/ ASC belong to ORDER BY/],
  ['select a from t group by a where a > 1', /WHERE goes before GROUP BY .* HAVING/],
  ['select a from t order by a where a > 1', /WHERE goes before ORDER BY/],
  ['select a from t having count(*) > 1 group by a', /GROUP BY goes before HAVING/],
  ['select a from t limit 5 order by a', /ORDER BY goes before LIMIT/],
  ['select a b c from t', /Two names in a row in SELECT/],
  ['SELECT name FROM t LİMİT 5', /Turkish İ or ı/],
];

describe('syntaxNearHint — on the error SQLite really raises', () => {
  for (const [query, want] of CASES) {
    it(query, () => {
      const err = errorOf(query);
      expect(err, 'the query must fail in SQLite').toBeTruthy();
      expect(syntaxNearHint(err, query)).toMatch(want);
    });
  }

  it('says nothing it cannot back: a valid subquery ORDER BY is not "out of order", other errors get null', () => {
    // A real near-"x" error AFTER a subquery that has its own ORDER BY.
    const q = 'select x from (select a as x from t order by a) where x > 1 group by x x';
    const err = errorOf(q);
    expect(err).toMatch(/near "x": syntax error/);
    expect(syntaxNearHint(err, q) || '').not.toMatch(/goes before/);
    expect(syntaxNearHint(err, q) || '', 'GROUP BY x x is not a SELECT-list problem').not.toMatch(/in SELECT/);
    expect(syntaxNearHint('no such table: orders', 'select * from orders')).toBeNull();
    expect(syntaxNearHint('near "x": syntax error', 'select x')).toBeNull();
  });

  it('a Turkish İ is caught when SQLite reads LİMİT as a column, too', () => {
    expect(syntaxNearHint('no such column: LİMİT', 'select name from t LİMİT')).toMatch(/Turkish/);
  });
});

describe('the student sees it: diagnoseResult → primaryHint', () => {
  it("a runtime error's first hint is the specific line, and primaryHint shows it", () => {
    const q = 'select top 5 a from t';
    const d = diagnoseResult(null, null, errorOf(q), { query: q });
    expect(d.kind).toBe('runtime_error');
    expect(d.hints[0]).toMatch(/no TOP/);
    expect(primaryHint(d, { query: q })).toMatch(/no TOP/);
  });

  it('without a specific match the generic syntax lines stand', () => {
    const d = diagnoseResult(null, null, 'near "x": syntax error', { query: 'select x' });
    expect(d.hints[0]).toMatch(/missing comma, unbalanced parenthesis/);
  });
});
