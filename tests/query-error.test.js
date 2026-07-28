// Every message string below was produced by running the offending query
// against the real employees dataset, not invented. Regenerate with the
// snippet in the last test if the engine changes.
import { describe, it, expect } from 'vitest';
import { classifyQueryError } from '../src/utils/query-error.js';

describe('classifyQueryError — real SQLite output', () => {
  it('flags the exact error our first annual subscriber hit', () => {
    // Serge, 2026-07-26, challenge 4:
    //   GROUP_CONCAT(name ORDER BY name ASC SEPARATOR ', ')
    // Valid MySQL. He was right that his query was correct; we never told him
    // which engine grades it. If this bucket is common, the fix is a dialect
    // note on the challenge, not better error copy.
    expect(classifyQueryError('near "SEPARATOR": syntax error')).toBe('dialect_mismatch');
  });

  it('separates dialect mistakes from ordinary syntax errors', () => {
    expect(classifyQueryError('near "FROM": syntax error')).toBe('syntax');
    expect(classifyQueryError('near "ILIKE": syntax error')).toBe('dialect_mismatch');
  });

  it('classifies each real engine message', () => {
    const cases = [
      ['near "SEPARATOR": syntax error',    'dialect_mismatch'],  // MySQL GROUP_CONCAT
      ['no such function: DATE_FORMAT',     'dialect_mismatch'],  // MySQL
      ['near "ILIKE": syntax error',        'dialect_mismatch'],  // Postgres
      ['unrecognized token: ":"',           'dialect_mismatch'],  // Postgres ::cast
      ['no such function: STRING_AGG',      'dialect_mismatch'],  // Postgres, on sql.js's older SQLite
      ['no such column: hire_date',         'no_such_column'],    // CTE scoping
      ['no such table: staff',              'no_such_table'],
      ['ambiguous column name: name',       'ambiguous_column'],
      ['near "FROM": syntax error',         'syntax'],
    ];
    for (const [msg, want] of cases) expect(classifyQueryError(msg), msg).toBe(want);
  });

  it('reads CTE column scoping as its own bucket, not generic syntax', () => {
    // WITH e AS (SELECT name, salary FROM employees)
    // SELECT name, salary, hire_date FROM e
    // hire_date is in employees but not in e. Teachable, not a typo.
    expect(classifyQueryError('no such column: hire_date')).toBe('no_such_column');
  });

  it('never throws on junk input — it runs inside an error handler', () => {
    for (const junk of [null, undefined, '', '   ', 0, false, {}, [], NaN]) {
      expect(() => classifyQueryError(junk)).not.toThrow();
      expect(typeof classifyQueryError(junk)).toBe('string');
    }
  });

  it('falls back to other rather than guessing', () => {
    expect(classifyQueryError('database disk image is malformed')).toBe('other');
    expect(classifyQueryError('interrupted')).toBe('other');
  });

  it('is case-insensitive — message casing is not a stable contract', () => {
    expect(classifyQueryError('NEAR "SEPARATOR": SYNTAX ERROR')).toBe('dialect_mismatch');
    expect(classifyQueryError('No Such Table: staff')).toBe('no_such_table');
  });
});
