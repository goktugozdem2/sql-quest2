import { describe, it, expect } from 'vitest';
import { extractTablesFromSql, detectSqlTopic, detectAllSqlConcepts, getAiLessonForTopic } from '../src/utils/sql-analysis.js';

describe('detectSqlTopic', () => {
  it('returns General for null/empty', () => {
    expect(detectSqlTopic(null)).toBe('General');
    expect(detectSqlTopic('')).toBe('General');
  });

  it('detects Window Functions', () => {
    expect(detectSqlTopic('SELECT ROW_NUMBER() OVER (ORDER BY id) FROM t')).toBe('Window Functions');
  });

  it('detects EXISTS', () => {
    expect(detectSqlTopic('SELECT * FROM t WHERE EXISTS (SELECT 1 FROM s)')).toBe('EXISTS');
  });

  it('detects GROUP BY & HAVING', () => {
    expect(detectSqlTopic('SELECT dept, COUNT(*) FROM emp GROUP BY dept HAVING COUNT(*) > 5')).toBe('GROUP BY & HAVING');
  });

  it('detects GROUP BY without HAVING', () => {
    expect(detectSqlTopic('SELECT dept, COUNT(*) FROM emp GROUP BY dept')).toBe('GROUP BY');
  });

  it('detects LEFT JOIN', () => {
    expect(detectSqlTopic('SELECT * FROM a LEFT JOIN b ON a.id = b.id')).toBe('LEFT JOIN');
  });

  it('detects RIGHT JOIN', () => {
    expect(detectSqlTopic('SELECT * FROM a RIGHT JOIN b ON a.id = b.id')).toBe('RIGHT JOIN');
  });

  it('detects FULL JOIN', () => {
    expect(detectSqlTopic('SELECT * FROM a FULL JOIN b ON a.id = b.id')).toBe('FULL JOIN');
  });

  it('detects INNER JOIN', () => {
    expect(detectSqlTopic('SELECT * FROM a INNER JOIN b ON a.id = b.id')).toBe('JOIN');
  });

  it('detects UNION', () => {
    expect(detectSqlTopic('SELECT 1 UNION SELECT 2')).toBe('UNION');
  });

  it('detects CASE', () => {
    expect(detectSqlTopic('SELECT CASE WHEN x > 0 THEN 1 ELSE 0 END FROM t')).toBe('CASE');
  });

  it('detects LIKE', () => {
    expect(detectSqlTopic("SELECT * FROM t WHERE name LIKE '%abc%'")).toBe('LIKE');
  });

  it('detects Subqueries', () => {
    expect(detectSqlTopic('SELECT * FROM t WHERE id IN (SELECT id FROM s)')).toBe('Subqueries');
  });

  it('detects BETWEEN', () => {
    expect(detectSqlTopic('SELECT * FROM t WHERE age BETWEEN 18 AND 65')).toBe('BETWEEN');
  });

  it('detects ORDER BY', () => {
    expect(detectSqlTopic('SELECT * FROM t ORDER BY name')).toBe('ORDER BY');
  });

  it('detects DISTINCT', () => {
    expect(detectSqlTopic('SELECT DISTINCT name FROM t')).toBe('DISTINCT');
  });

  it('detects Aggregation', () => {
    expect(detectSqlTopic('SELECT COUNT(*) FROM t')).toBe('Aggregation');
    expect(detectSqlTopic('SELECT SUM(price) FROM t')).toBe('Aggregation');
    expect(detectSqlTopic('SELECT AVG(score) FROM t')).toBe('Aggregation');
  });

  it('detects WHERE', () => {
    expect(detectSqlTopic('SELECT * FROM t WHERE id = 1')).toBe('WHERE');
  });

  it('returns SELECT for simple queries', () => {
    expect(detectSqlTopic('SELECT * FROM t')).toBe('SELECT');
  });

  it('is case-insensitive', () => {
    expect(detectSqlTopic('select * from t where id = 1')).toBe('WHERE');
  });
});

describe('detectAllSqlConcepts', () => {
  it('returns empty array for null/empty', () => {
    expect(detectAllSqlConcepts(null)).toEqual([]);
    expect(detectAllSqlConcepts('')).toEqual([]);
  });

  it('detects multiple concepts', () => {
    const sql = 'SELECT dept, COUNT(*) FROM emp LEFT JOIN dept ON emp.dept_id = dept.id WHERE active = 1 GROUP BY dept HAVING COUNT(*) > 5 ORDER BY dept';
    const concepts = detectAllSqlConcepts(sql);
    expect(concepts).toContain('LEFT JOIN');
    expect(concepts).toContain('COUNT');
    expect(concepts).toContain('GROUP BY');
    expect(concepts).toContain('HAVING');
    expect(concepts).toContain('WHERE');
    expect(concepts).toContain('ORDER BY');
  });

  it('detects window functions', () => {
    const sql = 'SELECT ROW_NUMBER() OVER (ORDER BY id), RANK() OVER (ORDER BY score) FROM t';
    const concepts = detectAllSqlConcepts(sql);
    expect(concepts).toContain('ROW_NUMBER');
    expect(concepts).toContain('RANK');
    expect(concepts).toContain('Window Functions');
  });

  it('detects CTE', () => {
    const sql = 'WITH cte AS (SELECT * FROM t) SELECT * FROM cte';
    const concepts = detectAllSqlConcepts(sql);
    expect(concepts).toContain('CTE');
  });

  it('removes duplicates', () => {
    const sql = 'SELECT COUNT(*), COUNT(DISTINCT id) FROM t';
    const concepts = detectAllSqlConcepts(sql);
    const countOccurrences = concepts.filter(c => c === 'COUNT').length;
    expect(countOccurrences).toBe(1);
  });
});

describe('extractTablesFromSql', () => {
  const tables = { users: [], orders: [], products: [] };

  it('returns empty for null input', () => {
    expect(extractTablesFromSql(null, tables)).toEqual([]);
    expect(extractTablesFromSql('SELECT 1', null)).toEqual([]);
  });

  it('extracts FROM table', () => {
    expect(extractTablesFromSql('SELECT * FROM users', tables)).toContain('users');
  });

  it('extracts JOIN table', () => {
    const result = extractTablesFromSql('SELECT * FROM users JOIN orders ON users.id = orders.user_id', tables);
    expect(result).toContain('users');
    expect(result).toContain('orders');
  });

  it('extracts table.column reference', () => {
    expect(extractTablesFromSql('SELECT products.name FROM products', tables)).toContain('products');
  });

  it('does not match non-existent tables', () => {
    expect(extractTablesFromSql('SELECT * FROM categories', tables)).toEqual([]);
  });
});

describe('getAiLessonForTopic', () => {
  it('maps known topics to lesson indices', () => {
    expect(getAiLessonForTopic('SELECT')).toBe(0);
    expect(getAiLessonForTopic('WHERE')).toBe(1);
    expect(getAiLessonForTopic('JOIN')).toBe(5);
    expect(getAiLessonForTopic('Window Functions')).toBe(9);
  });

  it('returns 0 for unknown topics', () => {
    expect(getAiLessonForTopic('Unknown')).toBe(0);
  });
});
