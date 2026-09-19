import { describe, it, expect } from 'vitest';
import { formatSqlForDisplay } from '../src/utils/sql-format.js';

// Founder QA 2026-09-19, item 22: every Correct Solution renders laid out.
const tokens = (s) => s.replace(/\s+/g, ' ').replace(/\s*([(),])\s*/g, '$1').trim();

describe('formatSqlForDisplay', () => {
  it('breaks clauses and the select list, and changes no token', () => {
    const q = "SELECT name, department, salary FROM employees WHERE salary > 70000 ORDER BY department ASC, salary DESC";
    const f = formatSqlForDisplay(q);
    expect(f).toBe([
      'SELECT',
      '  name,',
      '  department,',
      '  salary',
      'FROM employees',
      'WHERE salary > 70000',
      'ORDER BY department ASC, salary DESC',
    ].join('\n'));
    expect(tokens(f)).toBe(tokens(q));
  });
  it('keeps function arguments on one line and indents a subquery', () => {
    const q = "SELECT d, ROUND(AVG(x), 2) AS a FROM t WHERE d IN (SELECT d FROM u WHERE y = 'a, b') GROUP BY d";
    const f = formatSqlForDisplay(q);
    expect(f).toContain('ROUND(AVG(x), 2) AS a');
    expect(f).toContain("WHERE y = 'a, b'");
    expect(f).toMatch(/IN \(\n {2}SELECT/);
    expect(tokens(f)).toBe(tokens(q));
  });
  it('joins go on their own line', () => {
    const f = formatSqlForDisplay('SELECT o.id, c.name FROM orders o JOIN customers c ON o.cid = c.id LEFT JOIN x ON x.id = o.id');
    expect(f.split('\n')).toContain('JOIN customers c ON o.cid = c.id');
    expect(f.split('\n')).toContain('LEFT JOIN x ON x.id = o.id');
  });
  it('leaves multi-line input and empty input alone', () => {
    expect(formatSqlForDisplay('SELECT a\nFROM t')).toBe('SELECT a\nFROM t');
    expect(formatSqlForDisplay('')).toBe('');
    expect(formatSqlForDisplay(null)).toBe('');
  });
  it('formats every one-line mock solution without changing its tokens', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    globalThis.window = globalThis.window || {};
    const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/data/mock-interviews.js'), 'utf8');
    new Function('window', src)(globalThis.window);
    let n = 0;
    for (const m of globalThis.window.mockInterviewsData) for (const q of m.questions) {
      if (!q.solution || q.solution.includes('\n')) continue;
      const f = formatSqlForDisplay(q.solution);
      expect(tokens(f), q.id).toBe(tokens(q.solution));
      expect(f.split('\n').length, q.id).toBeGreaterThan(1);
      n++;
    }
    expect(n).toBeGreaterThan(10);
  });
});

describe('formatSqlForDisplay: window clauses stay inside OVER()', () => {
  it('ORDER BY / PARTITION BY inside OVER() does not break', () => {
    const f = formatSqlForDisplay('SELECT a, RANK() OVER (PARTITION BY d ORDER BY s DESC) AS r FROM t ORDER BY r');
    expect(f).toContain('RANK() OVER (PARTITION BY d ORDER BY s DESC) AS r');
    expect(f.split('\n').pop()).toBe('ORDER BY r');
  });
});
