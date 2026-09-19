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
    expect(d.headline).toMatch(/wrong values|values are different/i);
    expect(d.preview).toBeDefined();
    expect(d.preview.rowIndex).toBe(1);
    // V1 enhancement: rowDiffs contains the same first-diff row with column flags.
    expect(d.preview.rowDiffs).toBeDefined();
    expect(d.preview.rowDiffs).toHaveLength(1);
    expect(d.preview.rowDiffs[0].diffCols).toEqual([false, false, true]);
    expect(d.preview.totalDiffRows).toBe(1);
  });

  it('cell_values: surfaces all differing rows when multiple', () => {
    const user = {
      columns: expected.columns,
      rows: [
        ['USA', 10, 200.0],   // avg_revenue wrong
        ['UK', 5, 200.0],     // correct
        ['Japan', 99, 999.0], // both count and avg wrong
      ],
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('cell_values');
    expect(d.headline).toMatch(/2 rows/);
    expect(d.preview.totalDiffRows).toBe(2);
    expect(d.preview.rowDiffs).toHaveLength(2);
    // Row 0: only avg_revenue differs.
    expect(d.preview.rowDiffs[0].rowIndex).toBe(0);
    expect(d.preview.rowDiffs[0].diffCols).toEqual([false, false, true]);
    // Row 2: count AND avg_revenue differ.
    expect(d.preview.rowDiffs[1].rowIndex).toBe(2);
    expect(d.preview.rowDiffs[1].diffCols).toEqual([false, true, true]);
  });

  it('cell_values: detects SQLite integer-division pattern (Elena #214)', () => {
    // Mirrors the bug: user wrote `/ 1000000` instead of `/ 1000000.0`,
    // so values came out as floor(expected) for the dividend rows.
    const exp = {
      columns: ['name_type', 'bank_count', 'total_assets_billions'],
      rows: [
        ['Other', 171, 20517.8],
        ['Trust', 21, 1246.0],
        ['Savings', 8, 202.0],
      ],
    };
    const user = {
      columns: exp.columns,
      rows: [
        ['Other', 171, 20517],   // floor of 20517.8
        ['Trust', 21, 1246],     // floor of 1246.0 — same display value
        ['Savings', 8, 201],     // floor of 201.954 — actual mismatch
      ],
    };
    const d = diagnoseResult(user, exp);
    expect(d.kind).toBe('cell_values');
    // First hint should call out integer division specifically.
    expect(d.hints[0]).toMatch(/integer division/i);
    expect(d.hints[0]).toMatch(/1000000\.0|`\.0`/);
    expect(d.details).toMatch(/integer division/i);
  });

  it('cell_values: does NOT trigger integer-division hint when values are unrelated', () => {
    const exp = {
      columns: ['city', 'avg'],
      rows: [['Tokyo', 100.5], ['Paris', 200.7]],
    };
    const user = {
      columns: exp.columns,
      rows: [['Tokyo', 999.9], ['Paris', 888.8]],   // unrelated wrong values
    };
    const d = diagnoseResult(user, exp);
    expect(d.kind).toBe('cell_values');
    // Should NOT add the integer-division hint.
    expect(d.hints[0]).not.toMatch(/integer division/i);
  });

  it('cell_values: caps rowDiffs at 5 but preserves totalDiffRows', () => {
    const bigExpected = {
      columns: ['id', 'val'],
      rows: Array.from({ length: 10 }, (_, i) => [i, i * 10]),
    };
    const bigUser = {
      columns: bigExpected.columns,
      rows: Array.from({ length: 10 }, (_, i) => [i, i * 10 + 1]), // every row off by 1
    };
    const d = diagnoseResult(bigUser, bigExpected);
    expect(d.kind).toBe('cell_values');
    expect(d.preview.totalDiffRows).toBe(10);
    expect(d.preview.rowDiffs).toHaveLength(5); // capped at 5 for UI density
  });

  it('row_count: extra rows include the rows themselves', () => {
    const user = {
      columns: expected.columns,
      rows: [...expected.rows, ['Germany', 2, 100], ['France', 4, 120]],
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('row_count');
    expect(d.preview).toBeDefined();
    expect(d.preview.extraTotal).toBe(2);
    expect(d.preview.extraRows.map(e => e.row[0])).toEqual(['Germany', 'France']);
    expect(d.preview.missingTotal).toBe(0);
  });

  it('row_count: missing rows include the expected rows that user lacks', () => {
    const user = {
      columns: expected.columns,
      rows: expected.rows.slice(0, 1), // only USA
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('row_count');
    expect(d.preview.missingTotal).toBe(2);
    expect(d.preview.missingRows.map(m => m.row[0])).toEqual(['UK', 'Japan']);
    expect(d.preview.extraTotal).toBe(0);
  });

  it('sort_order: positionDiffs reports where rows belong', () => {
    const user = {
      columns: expected.columns,
      rows: [expected.rows[2], expected.rows[0], expected.rows[1]], // Japan, USA, UK
    };
    const d = diagnoseResult(user, expected);
    expect(d.kind).toBe('sort_order');
    expect(d.preview).toBeDefined();
    expect(d.preview.positionDiffs.length).toBeGreaterThan(0);
    // user row 0 (Japan) should be at expected row 2.
    const japanShift = d.preview.positionDiffs.find(p => p.row[0] === 'Japan');
    expect(japanShift).toBeDefined();
    expect(japanShift.userRowIndex).toBe(0);
    expect(japanShift.expectedRowIndex).toBe(2);
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

// Founder QA 2026-09-19, item 3: a window challenge is diagnosed as one.
import { diagnoseResult as dx, primaryHint as ph, isWindowContext } from '../src/utils/diagnose.js';
describe('window functions are read before the generic value branch', () => {
  const cols = ['name', 'salary', 'rnk'];
  const expectedRank = { columns: cols, rows: [['A', 90, 1], ['B', 90, 1], ['C', 80, 3], ['D', 70, 4]] };
  const ctx = { topics: ['Window Functions', 'RANK'], query: 'SELECT name, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM e' };

  it('DENSE_RANK where RANK is expected → names RANK, never AVG/COUNT/ROUND/CASE', () => {
    const user = { columns: cols, rows: [['A', 90, 1], ['B', 90, 1], ['C', 80, 2], ['D', 70, 3]] };
    const d = dx(user, expectedRank, null, ctx);
    expect(d.kind).toBe('window_rank');
    expect(d.headline).toMatch(/RANK, not DENSE_RANK/);
    expect(d.details).toMatch(/You used DENSE_RANK/);
    const all = [d.headline, d.details, ...d.hints, ph(d, ctx)].join(' ');
    expect(all).not.toMatch(/AVG|COUNT\(\*\)|ROUND|CASE WHEN/);
    expect(ph(d, ctx)).toMatch(/RANK\(\) instead of DENSE_RANK/);
  });

  it('RANK where DENSE_RANK is expected', () => {
    const exp = { columns: cols, rows: [['A', 90, 1], ['B', 90, 1], ['C', 80, 2], ['D', 70, 3]] };
    const user = { columns: cols, rows: [['A', 90, 1], ['B', 90, 1], ['C', 80, 3], ['D', 70, 4]] };
    const d = dx(user, exp, null, { topics: ['Window Functions'] });
    expect(d.headline).toMatch(/DENSE_RANK, not RANK/);
  });

  it('ROW_NUMBER where ties must share a rank', () => {
    const user = { columns: cols, rows: [['A', 90, 1], ['B', 90, 2], ['C', 80, 3], ['D', 70, 4]] };
    const d = dx(user, expectedRank, null, { topics: ['Window Functions'] });
    expect(d.headline).toMatch(/ROW_NUMBER never ties/);
  });

  it('missing PARTITION BY: expected restarts at 1, user counts through', () => {
    const c = ['dept', 'name', 'rn'];
    const exp = { columns: c, rows: [['x', 'A', 1], ['x', 'B', 2], ['y', 'C', 1], ['y', 'D', 2]] };
    const user = { columns: c, rows: [['x', 'A', 1], ['x', 'B', 2], ['y', 'C', 3], ['y', 'D', 4]] };
    const d = dx(user, exp, null, { topics: ['ROW_NUMBER'] });
    expect(d.headline).toMatch(/PARTITION BY/);
  });

  it('without window context the generic branch is unchanged', () => {
    const user = { columns: cols, rows: [['A', 90, 1], ['B', 90, 1], ['C', 80, 2], ['D', 70, 3]] };
    const d = dx(user, expectedRank, null, { topics: ['Aggregation'] });
    expect(d.kind).toBe('cell_values');
  });

  it('a window challenge whose mismatch is not a rank column still gets window hints first', () => {
    const c = ['name', 'running'];
    const exp = { columns: c, rows: [['A', 10.5], ['B', 20.5]] };
    const user = { columns: c, rows: [['A', 10.5], ['B', 30.5]] };
    const d = dx(user, exp, null, { topics: ['Window Functions'] });
    expect(d.kind).toBe('cell_values');
    expect(d.hints[0]).toMatch(/PARTITION BY/);
    expect(ph(d, { topics: ['Window Functions'], query: 'select avg(x) over () from t' })).not.toMatch(/AVG\(\) skips/);
  });

  it('isWindowContext reads tags, the query and the solution', () => {
    expect(isWindowContext({ topics: ['Window Functions + CTE'] })).toBe(true);
    expect(isWindowContext({ query: 'select rank() over (order by x) from t' })).toBe(true);
    expect(isWindowContext({ solution: 'select sum(x) over (partition by y) from t' })).toBe(true);
    expect(isWindowContext({ topics: ['GROUP BY'], query: 'select 1' })).toBe(false);
  });
});

// Founder QA 2026-09-19, round 4, item 2: every fix in the headline.
import { windowQueryFixes, fixesHeadline } from '../src/utils/diagnose.js';
describe('multiple window fixes are all named', () => {
  const solution = 'SELECT name, department, salary, RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS r FROM employees';
  it('DENSE_RANK and a missing PARTITION BY → two fixes', () => {
    const f = windowQueryFixes('SELECT name, department, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r FROM employees', solution);
    expect(f.map(x => x.kind)).toEqual(['function', 'partition']);
    expect(fixesHeadline(f)).toBe('Two fixes: use RANK instead of DENSE_RANK, and add PARTITION BY department');
  });
  it('direction alone is one fix, no multi headline', () => {
    const f = windowQueryFixes('SELECT RANK() OVER (PARTITION BY department ORDER BY salary ASC) r FROM employees', solution);
    expect(f.map(x => x.kind)).toEqual(['direction']);
    expect(fixesHeadline(f)).toBe(null);
  });
  it('three fixes read as a list', () => {
    const f = windowQueryFixes('SELECT ROW_NUMBER() OVER (ORDER BY salary ASC) r FROM employees', solution);
    expect(fixesHeadline(f)).toBe('Three fixes: use RANK instead of ROW_NUMBER, add PARTITION BY department, and sort inside OVER() DESC, not ASC');
  });
  it('the diagnosis headline carries both', () => {
    const cols = ['name', 'department', 'salary', 'r'];
    const exp = { columns: cols, rows: [['A', 'x', 9, 1], ['B', 'x', 9, 1], ['C', 'x', 5, 3], ['D', 'y', 8, 1]] };
    const user = { columns: cols, rows: [['A', 'x', 9, 1], ['B', 'x', 9, 1], ['C', 'x', 5, 3], ['D', 'y', 8, 2]] };
    const d = dx(user, exp, null, { topics: ['Window Functions'], query: 'SELECT name, department, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS r FROM employees', solution });
    expect(d.headline).toMatch(/^Two fixes: use RANK instead of DENSE_RANK, and add PARTITION BY department/);
  });
});
