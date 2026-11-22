// scripts/topic-coverage.mjs counts statements and clauses in reference
// solutions, never words (C6, 2026-11-22). These tests pin the parser on the
// cases that would inflate a count — a keyword in a comment, inside a string
// literal, or in prose — and run the CLI end to end so the zero-coverage line
// the read is built from keeps reporting.
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { topicsOf, splitStatements, statementKind, measureCoverage } from '../scripts/topic-coverage.mjs';

const script = fileURLToPath(new URL('../scripts/topic-coverage.mjs', import.meta.url));

describe('statement parsing', () => {
  it('splits on top-level semicolons only', () => {
    expect(splitStatements("UPDATE t SET a = 1; SELECT ';' FROM t")).toHaveLength(2);
    expect(splitStatements('SELECT 1')).toHaveLength(1);
  });

  it('classifies by the leading keyword, looking through WITH', () => {
    expect(statementKind('with x as (select 1) delete from t where id in (select * from x)')).toBe('DELETE');
    expect(statementKind('WITH x AS (SELECT 1) SELECT * FROM x')).toBe('SELECT');
    expect(statementKind('CREATE TABLE t (id INTEGER PRIMARY KEY)')).toBe('CREATE TABLE');
    expect(statementKind('create unique index i on t(a)')).toBe('CREATE INDEX');
  });

  it('never counts a keyword in a string, a comment or a column name', () => {
    expect(topicsOf("SELECT 'DELETE FROM x; UPDATE y' AS note FROM t")).toEqual([]);
    expect(topicsOf('-- UPDATE customers SET x = 1\nSELECT * FROM t')).toEqual([]);
    expect(topicsOf('/* INSERT INTO a SELECT 1 */ SELECT updated_at, deleted FROM t')).toEqual([]);
  });

  it('finds the statement-level topics', () => {
    expect(topicsOf('INSERT INTO a (x) SELECT x FROM b; SELECT * FROM a')).toContain('insert_select');
    expect(topicsOf("INSERT INTO a VALUES (1, 'x')")).toEqual(['insert_values']);
    expect(topicsOf('INSERT INTO a (k, v) VALUES (1, 2) ON CONFLICT (k) DO UPDATE SET v = excluded.v')).toContain('upsert');
    expect(topicsOf('BEGIN; DELETE FROM a; COMMIT')).toEqual(expect.arrayContaining(['transactions', 'delete']));
    expect(topicsOf('SELECT SUM(CASE WHEN a THEN 1 END) FROM t')).toEqual(['pivot']);
  });
});

describe('the coverage report', () => {
  const cov = measureCoverage();

  it('reads the whole bank and counts every topic', () => {
    expect(cov.bankSize).toBeGreaterThan(300);
    expect(cov.rows.every(r => Number.isInteger(r.bank) && r.bank === r.bankIds.length)).toBe(true);
  });

  it('lists exactly the zero-coverage topics, and the CLI prints them', () => {
    expect(cov.zero).toEqual(cov.rows.filter(r => r.bank === 0).map(r => r.label));
    expect(cov.zero.length).toBeGreaterThan(0);
    const out = execFileSync(process.execPath, [script], { encoding: 'utf8' });
    const line = out.split('\n').find(l => l.startsWith('Zero coverage in the bank:'));
    expect(line).toBeTruthy();
    for (const label of cov.zero) expect(line).toContain(label);
  });

  it('the existing DML challenges are found as statements (180-185)', () => {
    const ids = name => cov.rows.find(r => r.id === name).bankIds;
    expect(ids('update')).toEqual(expect.arrayContaining([181, 184, 185]));
    expect(ids('delete')).toEqual(expect.arrayContaining([182, 183]));
    expect(ids('insert_values')).toContain(180);
  });
});
