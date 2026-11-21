// columnFixLine (2026-11-22): one line that fixes a column mismatch. The
// column kinds were the slowest wrong submit to recover (`column_set` 69.7%
// within the hour, 09-30 → 11-21); the student was shown two header lists to
// diff by eye. Expected headers below are the bank's own shapes.
import { describe, it, expect } from 'vitest';
import { columnFixLine, diagnoseResult, primaryHint } from '../src/utils/diagnose.js';

describe('columnFixLine', () => {
  it.each([
    [['COUNT(*)'], ['txn_count'], 'Name the expression: COUNT(*) AS txn_count.'],
    [['account_id', 'total'], ['account_id', 'total_spend'], 'Rename total to total_spend: total AS total_spend.'],
    [['ROUND(AVG(amount), 2)', 'category'], ['category', 'avg_amount'], 'Name the expression: ROUND(AVG(amount), 2) AS avg_amount — and keep the order: category, avg_amount.'],
    [['a', 'b', 'c', 'd', 'e'], ['a', 'b'], 'Remove c, d, e — SELECT * brings every column; list only the ones asked for.'],
    [['a', 'x'], ['a'], 'Remove x.'],
    [['a'], ['a', 'b', 'c'], 'Add b, c.'],
    [['a', 'z'], ['a', 'b', 'c'], 'Add b, c; drop z.'],
    [['b', 'a'], ['a', 'b'], 'Right columns, wrong order — SELECT them as: a, b.'],
    [['Name'], ['name'], 'Names are matched exactly: rename Name to name (… AS name).'],
    [['NAME', 'AGE'], ['name', 'age'], 'Names are matched exactly, case included: use name, age.'],
  ])('%j vs %j', (user, expected, line) => {
    expect(columnFixLine(user, expected)).toBe(line);
  });

  it('says nothing when the headers already match', () => {
    expect(columnFixLine(['a', 'b'], ['a', 'b'])).toBeNull();
    expect(columnFixLine(['a'], [])).toBeNull();
  });
});

describe('the student sees it first', () => {
  const rows = n => Array.from({ length: n }, (_, i) => [i]);
  it('column_count: primaryHint is the fix line', () => {
    const d = diagnoseResult({ columns: ['category', 'COUNT(*)', 'extra'], rows: [[1, 2, 3]] }, { columns: ['category', 'n'], rows: [[1, 2]] });
    expect(d.kind).toBe('column_count');
    expect(primaryHint(d, {})).toBe('Add n; drop COUNT(*), extra.');
  });
  it('column_name: primaryHint is the fix line', () => {
    const d = diagnoseResult({ columns: ['COUNT(*)'], rows: rows(1) }, { columns: ['txn_count'], rows: rows(1) });
    expect(d.kind).toBe('column_name');
    expect(primaryHint(d, {})).toBe('Name the expression: COUNT(*) AS txn_count.');
    expect(d.hints[1]).toMatch(/^Expected order:/);
  });
});
