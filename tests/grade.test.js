// SQL Quest — order-aware result grading
//
// THE INCIDENT (2026-08-28): payer #2, in writing — "The grader is too strict
// sometimes on ordering. Some questions prompts don't specify the correct
// order." Every grading site compared rows with strict JSON.stringify
// equality, so row order always counted, even when neither the prompt nor the
// solution had an ORDER BY. Correct un-ordered queries were graded wrong.
//
// The rule now lives in src/utils/grade.js: a top-level ORDER BY in the
// reference solution means rows compare in sequence; no top-level ORDER BY
// means rows compare as a multiset. The source guard below fails if a raw
// strict comparison reappears at a grading site in app.jsx — the
// challenge-order incident showed a one-site fix grows back everywhere else.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  stripSqlLiteralsAndComments,
  solutionRequiresOrder,
  sortRowsCanonical,
  resultsMatch,
  parseOrderByKeys,
} from '../src/utils/grade.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_JSX = join(HERE, '..', 'src', 'app.jsx');

describe('solutionRequiresOrder — top-level ORDER BY detection', () => {
  it('detects a plain top-level ORDER BY', () => {
    expect(solutionRequiresOrder('SELECT * FROM t ORDER BY x')).toBe(true);
  });

  it('is case-insensitive and tolerates newlines between ORDER and BY', () => {
    expect(solutionRequiresOrder('select * from t\norder\n  BY x desc')).toBe(true);
  });

  it('ignores ORDER BY inside a window OVER (...)', () => {
    expect(solutionRequiresOrder(
      'SELECT name, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) FROM emp'
    )).toBe(false);
  });

  it('ignores ORDER BY inside a subquery', () => {
    expect(solutionRequiresOrder(
      'SELECT * FROM (SELECT * FROM t ORDER BY x LIMIT 3) sub'
    )).toBe(false);
  });

  it('ignores ORDER BY inside a CTE body', () => {
    expect(solutionRequiresOrder(
      'WITH top3 AS (SELECT * FROM t ORDER BY x LIMIT 3) SELECT * FROM top3'
    )).toBe(false);
  });

  it('detects the final ORDER BY of a WITH ... SELECT', () => {
    expect(solutionRequiresOrder(
      'WITH a AS (SELECT * FROM t) SELECT * FROM a ORDER BY y'
    )).toBe(true);
  });

  it('window ORDER BY plus a real final ORDER BY still counts', () => {
    expect(solutionRequiresOrder(
      'SELECT RANK() OVER (ORDER BY score) AS r FROM t ORDER BY r'
    )).toBe(true);
  });

  it("ignores 'order by' inside string literals and comments", () => {
    expect(solutionRequiresOrder("SELECT 'order by x' FROM t")).toBe(false);
    expect(solutionRequiresOrder('SELECT a FROM t -- order by a\n')).toBe(false);
    expect(solutionRequiresOrder('SELECT a FROM t /* order by a */')).toBe(false);
  });

  it('handles empty/null input', () => {
    expect(solutionRequiresOrder('')).toBe(false);
    expect(solutionRequiresOrder(null)).toBe(false);
  });
});

describe('stripSqlLiteralsAndComments', () => {
  it('strips single-quoted strings with doubled-quote escapes', () => {
    expect(stripSqlLiteralsAndComments("SELECT 'it''s order by' FROM t"))
      .not.toMatch(/order by/i);
  });

  it('strips double-quoted identifiers', () => {
    expect(stripSqlLiteralsAndComments('SELECT "order by col" FROM t'))
      .not.toMatch(/order by/i);
  });
});

describe('resultsMatch — the grading comparison', () => {
  const UNORDERED = 'SELECT name, score FROM players';
  const ORDERED = 'SELECT name, score FROM players ORDER BY score DESC';

  it('accepts same rows in a different order when the solution has no ORDER BY', () => {
    expect(resultsMatch(
      [['bob', 2], ['ana', 1]],
      [['ana', 1], ['bob', 2]],
      UNORDERED
    )).toBe(true);
  });

  it('rejects a different order when the solution HAS a top-level ORDER BY', () => {
    expect(resultsMatch(
      [['bob', 2], ['ana', 1]],
      [['ana', 1], ['bob', 2]],
      ORDERED
    )).toBe(false);
  });

  it('accepts the exact order when the solution has ORDER BY', () => {
    expect(resultsMatch(
      [['ana', 1], ['bob', 2]],
      [['ana', 1], ['bob', 2]],
      ORDERED
    )).toBe(true);
  });

  it('still rejects genuinely different rows, unordered', () => {
    expect(resultsMatch([['ana', 1]], [['ana', 2]], UNORDERED)).toBe(false);
  });

  it('treats duplicates as a multiset, not a set', () => {
    expect(resultsMatch(
      [['a'], ['a'], ['b']],
      [['a'], ['b'], ['b']],
      UNORDERED
    )).toBe(false);
  });

  it('rejects row-count mismatches regardless of ordering mode', () => {
    expect(resultsMatch([['a']], [['a'], ['b']], UNORDERED)).toBe(false);
  });

  it('empty vs empty matches; empty vs non-empty does not', () => {
    expect(resultsMatch([], [], UNORDERED)).toBe(true);
    expect(resultsMatch(null, [], UNORDERED)).toBe(true);
    expect(resultsMatch([], [['a']], UNORDERED)).toBe(false);
  });

  it('handles NULL cells (serialized as null) in unordered mode', () => {
    expect(resultsMatch(
      [[null, 1], ['x', 2]],
      [['x', 2], [null, 1]],
      UNORDERED
    )).toBe(true);
  });
});

describe('sortRowsCanonical', () => {
  it('returns a new array and leaves the input untouched', () => {
    const rows = [['b'], ['a']];
    const sorted = sortRowsCanonical(rows);
    expect(sorted).not.toBe(rows);
    expect(rows).toEqual([['b'], ['a']]);
    expect(sorted).toEqual([['a'], ['b']]);
  });
});

describe('parseOrderByKeys — sort keys of the final ORDER BY', () => {
  it('reads plain aliases with directions', () => {
    expect(parseOrderByKeys('SELECT a, b FROM t ORDER BY b DESC, a'))
      .toEqual([{ key: 'b', dir: 'desc' }, { key: 'a', dir: 'asc' }]);
  });

  it('strips table qualifiers and NULLS LAST, keeps positional numbers', () => {
    expect(parseOrderByKeys('SELECT c.name, x FROM c ORDER BY c.name ASC NULLS LAST, 2 DESC'))
      .toEqual([{ key: 'name', dir: 'asc' }, { key: 2, dir: 'desc' }]);
  });

  it('uses the FINAL top-level ORDER BY and ignores ordered subqueries / windows', () => {
    expect(parseOrderByKeys(
      'WITH t AS (SELECT * FROM x ORDER BY z LIMIT 5) SELECT a, RANK() OVER (ORDER BY q) r FROM t ORDER BY a LIMIT 10'
    )).toEqual([{ key: 'a', dir: 'asc' }]);
  });

  it('returns null for expressions (caller falls back to strict) and for no ORDER BY', () => {
    expect(parseOrderByKeys('SELECT a FROM t ORDER BY COUNT(*) DESC')).toBeNull();
    expect(parseOrderByKeys('SELECT a FROM t ORDER BY LOWER(a)')).toBeNull();
    expect(parseOrderByKeys('SELECT a FROM t')).toBeNull();
  });
});

describe('resultsMatch — ties inside an ORDER BY (challenge 121 incident)', () => {
  // 121: ORDER BY distinct_months DESC, total_orders DESC — no tiebreaker.
  const SOL = 'SELECT c.name, c.membership, COUNT(DISTINCT m) AS distinct_months, COUNT(*) AS total_orders '
    + 'FROM customers c JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id '
    + 'ORDER BY distinct_months DESC, total_orders DESC';
  const COLS = ['name', 'membership', 'distinct_months', 'total_orders'];
  const EXPECTED = [
    ['Ann', 'gold', 3, 4],
    ['Bob', 'gold', 3, 4],   // tied with Ann on both keys
    ['Cid', 'free', 3, 3],
    ['Dee', 'free', 2, 3],
  ];

  it('accepts tied rows in a different order', () => {
    const user = [EXPECTED[1], EXPECTED[0], EXPECTED[2], EXPECTED[3]];
    expect(resultsMatch(user, EXPECTED, SOL, COLS)).toBe(true);
  });

  it('still rejects a wrong order between rows that are NOT tied', () => {
    const user = [EXPECTED[2], EXPECTED[0], EXPECTED[1], EXPECTED[3]];
    expect(resultsMatch(user, EXPECTED, SOL, COLS)).toBe(false);
  });

  it('still rejects different rows even when the key sequence matches', () => {
    const user = [EXPECTED[0], ['Bob', 'silver', 3, 4], EXPECTED[2], EXPECTED[3]];
    expect(resultsMatch(user, EXPECTED, SOL, COLS)).toBe(false);
  });

  it('exact order always passes, with or without columns', () => {
    expect(resultsMatch(EXPECTED, EXPECTED, SOL, COLS)).toBe(true);
    expect(resultsMatch(EXPECTED, EXPECTED, SOL)).toBe(true);
  });

  it('without expected columns, ordered mode stays strict (backward compatible)', () => {
    const user = [EXPECTED[1], EXPECTED[0], EXPECTED[2], EXPECTED[3]];
    expect(resultsMatch(user, EXPECTED, SOL)).toBe(false);
  });

  it('falls back to strict when a sort key is an expression', () => {
    const sol = 'SELECT name, n FROM t ORDER BY COUNT(*) DESC';
    const exp = [['a', 2], ['b', 2]];
    expect(resultsMatch([['b', 2], ['a', 2]], exp, sol, ['name', 'n'])).toBe(false);
  });

  it('falls back to strict when a sort key is not an output column', () => {
    const sol = 'SELECT name FROM t ORDER BY salary DESC';
    const exp = [['a'], ['b']];
    expect(resultsMatch([['b'], ['a']], exp, sol, ['name'])).toBe(false);
  });

  it('resolves positional and qualified keys against output columns', () => {
    const sol = 'SELECT c.name, c.score FROM c ORDER BY 2 DESC, c.name';
    const exp = [['x', 9], ['a', 5], ['b', 5]];
    // a/b tie on score; name is the second key, so their order is FIXED
    expect(resultsMatch([['x', 9], ['b', 5], ['a', 5]], exp, sol, ['name', 'score'])).toBe(false);
    expect(resultsMatch([['x', 9], ['a', 5], ['b', 5]], exp, sol, ['name', 'score'])).toBe(true);
  });
});

describe('source guard: no grading site compares raw serialized rows', () => {
  const source = readFileSync(APP_JSX, 'utf8');

  it('the old strict-equality grading patterns are gone from app.jsx', () => {
    // These exact identifiers were the 2026-08-28 incident's grading sites.
    // A hit here means a grader was reverted (or a new one copy-pasted) to
    // order-strict comparison instead of importing resultsMatch from grade.js.
    expect(source).not.toMatch(/userVals === expectedVals/);
    expect(source).not.toMatch(/userRows === expectedRows/);
    expect(source).not.toMatch(/userValues === expectedValues/);
  });

  it('app.jsx imports the shared grader and uses it at every grading site', () => {
    expect(source).toMatch(/from '\.\/utils\/grade\.js'/);
    const uses = (source.match(/resultsMatch\(/g) || []).length;
    // 9 at conversion time: speed run, interview, foundation compare, AI
    // lesson, daily, main challenge, drills submit + 2 drills displays.
    expect(uses).toBeGreaterThanOrEqual(9);
  });
});
