import { describe, it, expect } from 'vitest';
import { diagnoseResult } from '../src/utils/diagnose.js';

// Sample expected result used across tests — 3 rows of a simple report.
const expected = {
  columns: ['country', 'count', 'avg_revenue'],
  rows: [
    ['USA', 10, 150.5],
    ['UK', 5, 200.0],
    ['Japan', 3, 180.2],
  ],
};

describe('diagnoseResult', () => {
  it('returns runtime_error diagnosis when user query errored', () => {
    const d = diagnoseResult({ columns: [], rows: [] }, expected, 'no such column: count');
    expect(d.kind).toBe('runtime_error');
    expect(d.headline).toMatch(/SQL error/i);
    expect(d.hints.some(h => /column/i.test(h))).toBe(true);
  });

  it('returns empty_result when user returned zero rows but expected has rows', () => {
    const user = { columns: [], rows: [] };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('empty_result');
    expect(d.headline).toMatch(/no rows/i);
  });

  it('returns column_count when user has fewer columns', () => {
    const user = {
      columns: ['country', 'count'],  // missing avg_revenue
      rows: [['USA', 10], ['UK', 5], ['Japan', 3]],
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('column_count');
    expect(d.headline).toMatch(/expected 3, got 2/i);
    expect(d.hints.some(h => /missing/i.test(h))).toBe(true);
  });

  it('returns column_count when user has extra columns', () => {
    const user = {
      columns: ['country', 'count', 'avg_revenue', 'extra'],
      rows: [['USA', 10, 150.5, 'x'], ['UK', 5, 200.0, 'y'], ['Japan', 3, 180.2, 'z']],
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('column_count');
    expect(d.hints.some(h => /extra/i.test(h))).toBe(true);
  });

  it('returns column_name when names differ but count matches', () => {
    const user = {
      columns: ['country', 'total', 'avg_revenue'],  // 'total' should be 'count'
      rows: expected.rows,
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('column_name');
    expect(d.headline).toMatch(/names/i);
  });

  it('returns column_name when column ORDER is different', () => {
    const user = {
      columns: ['count', 'country', 'avg_revenue'],  // swapped first two
      rows: [[10, 'USA', 150.5], [5, 'UK', 200.0], [3, 'Japan', 180.2]],
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('column_name');
  });

  it('returns row_count when user has extra rows', () => {
    const user = {
      columns: expected.columns,
      rows: [...expected.rows, ['Germany', 2, 100]],
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('row_count');
    expect(d.headline).toMatch(/expected 3, got 4/i);
    expect(d.hints.some(h => /GROUP BY|DISTINCT|HAVING/i.test(h))).toBe(true);
  });

  it('returns row_count when user is missing rows', () => {
    const user = {
      columns: expected.columns,
      rows: expected.rows.slice(0, 2),
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('row_count');
    expect(d.headline).toMatch(/expected 3, got 2/i);
    expect(d.hints.some(h => /LEFT JOIN|WHERE|NULL/i.test(h))).toBe(true);
  });

  it('returns sort_order when same rows in different order', () => {
    const user = {
      columns: expected.columns,
      rows: [expected.rows[2], expected.rows[0], expected.rows[1]],
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('sort_order');
    expect(d.headline).toMatch(/sorted differently/i);
    expect(d.hints.some(h => /ORDER BY/i.test(h))).toBe(true);
  });

  it('returns cell_values when shape and sort match but values differ', () => {
    const user = {
      columns: expected.columns,
      rows: [
        ['USA', 10, 150.5],
        ['UK', 5, 199.0],  // off by 1 — wrong calc
        ['Japan', 3, 180.2],
      ],
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('cell_values');
    expect(d.headline).toMatch(/values are different/i);
    expect(d.preview).toBeDefined();
    expect(d.preview.rowIndex).toBe(1);
  });

  it('returns null_mismatch when mostly NULL handling differs', () => {
    const user = {
      columns: expected.columns,
      rows: [
        ['USA', 10, null],   // returned NULL where value expected
        ['UK', 5, null],
        ['Japan', 3, null],
      ],
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('null_mismatch');
    expect(d.hints.some(h => /COALESCE|NULL/i.test(h))).toBe(true);
  });

  it('returns identical when results match exactly (edge case)', () => {
    const user = JSON.parse(JSON.stringify(expected));
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('identical');
  });

  it('SQL error: no such column → suggests spelling and alias', () => {
    const d = diagnoseResult(null, expected, 'SQLITE error: no such column: revenu');
    expect(d.hints.some(h => /spelling|alias/i.test(h))).toBe(true);
  });

  it('SQL error: syntax error → suggests common culprits', () => {
    const d = diagnoseResult(null, expected, 'near "SLECT": syntax error');
    expect(d.hints.some(h => /syntax/i.test(h))).toBe(true);
  });

  it('SQL error: misuse of aggregate → directs to HAVING', () => {
    const d = diagnoseResult(null, expected, 'misuse of aggregate function COUNT');
    expect(d.hints.some(h => /HAVING/i.test(h))).toBe(true);
  });
});
