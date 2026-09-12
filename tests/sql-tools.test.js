// The free SQL tools (/sql-query-checker/, /sql-query-explainer/,
// /sql-query-optimizer/) — SEO plan 2026-09-13, P2.15. Each rule is pinned on
// a query that must fire it AND on a near-miss that must not, because a tool
// that cries wolf on correct SQL loses the person it was built to attract.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { maskSql, checkQuery, optimizeQuery, explainQuery, cteBodies } from '../src/utils/sql-tools.js';
import { renderTool, renderHub, TOOLS, engineSource } from '../scripts/build-sql-tools.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const kinds = list => list.map(x => x.kind);

describe('masking', () => {
  it('hides strings and comments without moving offsets', () => {
    const q = "SELECT 'a -- b' AS x -- WHERE x = NULL\nFROM t /* NOT IN (SELECT 1) */";
    const m = maskSql(q);
    expect(m.length).toBe(q.length);
    expect(m).not.toMatch(/NULL|NOT IN/);
    expect(m).toContain('FROM t');
  });
  it('keywords inside a string never fire a rule', () => {
    expect(checkQuery("SELECT 'WHERE COUNT(x) = NULL' AS s FROM t")).toEqual([]);
  });
});

const CHECK = [
  ['not_in_null', 'SELECT name FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)', "SELECT name FROM customers WHERE id NOT IN (1, 2, 3)"],
  ['equals_null', 'SELECT * FROM t WHERE email = NULL', 'SELECT * FROM t WHERE email IS NULL'],
  ['window_in_where', 'SELECT * FROM emp WHERE ROW_NUMBER() OVER (ORDER BY salary DESC) <= 3', 'WITH r AS (SELECT *, ROW_NUMBER() OVER (ORDER BY salary DESC) AS rn FROM emp) SELECT * FROM r WHERE rn <= 3'],
  ['aggregate_in_where', 'SELECT dept FROM emp WHERE COUNT(*) > 3 GROUP BY dept', 'SELECT dept FROM emp GROUP BY dept HAVING COUNT(*) > 3'],
  ['not_grouped', 'SELECT department, name, AVG(salary) FROM employees GROUP BY department', "SELECT e.department AS dept, COUNT(*) AS n, CASE WHEN COUNT(*) > 5 THEN 'big' ELSE 'small' END AS size FROM employees e GROUP BY e.department"],
  ['left_join_where', "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid'", 'SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL'],
  ['implicit_cross_join', 'SELECT * FROM a, b WHERE a.x > 3', 'SELECT * FROM a, b WHERE a.id = b.a_id'],
  ['integer_division', 'SELECT COUNT(CASE WHEN churned = 1 THEN 1 END) / COUNT(*) AS rate FROM users', 'SELECT 1.0 * COUNT(CASE WHEN churned = 1 THEN 1 END) / COUNT(*) AS rate FROM users'],
  ['limit_without_order', 'SELECT * FROM t LIMIT 5', 'SELECT * FROM t ORDER BY id LIMIT 5'],
  ['syntax_parens', 'SELECT COUNT(* FROM t', 'SELECT COUNT(*) FROM t'],
  ['syntax_unterminated', "SELECT * FROM t WHERE name = 'O'Brien'", "SELECT * FROM t WHERE name = 'O''Brien'"],
  ['syntax_trailing_comma', 'SELECT a, b, FROM t', 'SELECT a, b FROM t'],
];

describe('checker', () => {
  for (const [kind, bad, good] of CHECK) {
    it(`${kind}: fires on the mistake, not on the fix`, () => {
      expect(kinds(checkQuery(bad))).toContain(kind);
      expect(kinds(checkQuery(good))).not.toContain(kind);
    });
  }
  it('a correct interview answer comes back clean', () => {
    const q = `WITH ranked AS (
      SELECT category, merchant_id, SUM(amount) AS spend,
             ROW_NUMBER() OVER (PARTITION BY category ORDER BY SUM(amount) DESC, merchant_id) AS rn
      FROM transactions GROUP BY category, merchant_id)
    SELECT category, merchant_id, spend FROM ranked WHERE rn <= 3 ORDER BY category, rn;`;
    expect(checkQuery(q)).toEqual([]);
  });
});

const OPT = [
  ['non_sargable', 'SELECT id FROM orders WHERE YEAR(created_at) = 2024', "SELECT id FROM orders WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01'"],
  ['leading_wildcard', "SELECT id FROM users WHERE email LIKE '%gmail.com'", "SELECT id FROM users WHERE email LIKE 'ann%'"],
  ['correlated_select', 'SELECT c.id, (SELECT SUM(o.total) FROM orders o WHERE o.customer_id = c.id) AS spend FROM customers c', 'SELECT c.id, s.spend FROM customers c JOIN (SELECT customer_id, SUM(total) AS spend FROM orders GROUP BY customer_id) s ON s.customer_id = c.id'],
  ['distinct_join', 'SELECT DISTINCT c.id FROM customers c JOIN orders o ON o.customer_id = c.id', 'SELECT c.id FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)'],
  ['union_all', 'SELECT id FROM a UNION SELECT id FROM b', 'SELECT id FROM a UNION ALL SELECT id FROM b'],
  ['or_to_in', "SELECT id FROM t WHERE status = 'a' OR status = 'b'", "SELECT id FROM t WHERE status IN ('a', 'b')"],
  ['having_non_aggregate', "SELECT dept, COUNT(*) FROM e GROUP BY dept HAVING dept = 'Sales' AND COUNT(*) > 3", "SELECT dept, COUNT(*) FROM e WHERE dept = 'Sales' GROUP BY dept HAVING COUNT(*) > 3"],
  ['select_star', 'SELECT * FROM t', 'SELECT COUNT(*) FROM t'],
];

describe('optimizer', () => {
  for (const [kind, slow, fast] of OPT) {
    it(`${kind}: fires on the slow shape, not on the fast one`, () => {
      expect(kinds(optimizeQuery(slow))).toContain(kind);
      expect(kinds(optimizeQuery(fast))).not.toContain(kind);
    });
  }
});

describe('explainer', () => {
  it('walks the clauses in execution order and explains each CTE', () => {
    const r = explainQuery('WITH a AS (SELECT user_id, COUNT(*) AS n FROM orders GROUP BY user_id) SELECT u.name, a.n FROM users u LEFT JOIN a ON a.user_id = u.id WHERE a.n > 2 ORDER BY a.n DESC LIMIT 10;');
    expect(r.steps.map(s => s.clause)).toEqual(['WITH', 'FROM', 'WHERE', 'SELECT', 'ORDER BY', 'LIMIT']);
    expect(r.ctes.map(c => c.name)).toEqual(['a']);
    expect(r.ctes[0].steps.map(s => s.clause)).toEqual(['FROM', 'GROUP BY', 'SELECT']);
    expect(r.steps.find(s => s.clause === 'LIMIT').text).toContain('10 rows');
    expect(r.steps.find(s => s.clause === 'FROM').text).toContain('LEFT JOIN');
  });
  it('cteBodies splits several CTEs, nested parentheses included', () => {
    const b = cteBodies('WITH x AS (SELECT COUNT(*) FROM t), y (a, b) AS (SELECT (1), 2) SELECT * FROM x, y');
    expect(b.map(c => c.name)).toEqual(['x', 'y']);
    expect(b[1].body.trim()).toBe('SELECT (1), 2');
  });
  it('says nothing about a non-query', () => {
    expect(explainQuery('hello').steps).toEqual([]);
  });
});

describe('the pages', () => {
  it('src/<tool>.html is what the generator writes today', () => {
    for (const slug of Object.keys(TOOLS)) {
      expect(fs.readFileSync(path.join(ROOT, 'src', `${slug}.html`), 'utf8'), `${slug} stale — node scripts/build-sql-tools.mjs`).toBe(renderTool(slug));
    }
    expect(fs.readFileSync(path.join(ROOT, 'src/sql-tools.html'), 'utf8')).toBe(renderHub());
  });
  it('the inlined engine parses as a classic script (no import/export left)', () => {
    const src = engineSource();
    expect(src).not.toMatch(/^\s*(?:import|export)\b/m);
    expect(() => new vm.Script(src)).not.toThrow();
  });
  it('never sends the query anywhere: no fetch, no beacon, and the event carries no text', () => {
    for (const slug of Object.keys(TOOLS)) {
      const html = renderTool(slug);
      expect(html).not.toMatch(/\bfetch\s*\(|sendBeacon|XMLHttpRequest/);
      const call = html.match(/sqTrack\('tool_used',\s*(\{[^}]*\})/)[1];
      expect(call).not.toMatch(/sql|value/);
    }
  });
  it('every page script runs without throwing on its default example', () => {
    for (const slug of Object.keys(TOOLS)) {
      const script = renderTool(slug).match(/<script>\n([\s\S]*?)<\/script>/)[1];
      const els = {};
      const el = () => ({ value: '', innerHTML: '', addEventListener() {}, set onclick(f) { this._c = f; }, set onchange(f) {} });
      const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {} }, document: { getElementById: id => (els[id] = els[id] || el()) } };
      vm.createContext(ctx);
      expect(() => vm.runInContext(script, ctx), slug).not.toThrow();
      expect(els.out.innerHTML.length, slug).toBeGreaterThan(50);
    }
  });
});
