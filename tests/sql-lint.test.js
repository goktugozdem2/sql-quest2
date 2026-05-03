import { describe, it, expect } from 'vitest';
import { lintSQL, isIdle } from '../src/utils/sql-lint.js';

describe('lintSQL', () => {
  it('returns empty array for empty / null input', () => {
    expect(lintSQL('')).toEqual([]);
    expect(lintSQL(null)).toEqual([]);
    expect(lintSQL(undefined)).toEqual([]);
  });

  it('returns empty array for clean queries', () => {
    expect(lintSQL('SELECT name FROM users')).toEqual([]);
    expect(lintSQL('SELECT COUNT(*) FROM users WHERE active = 1')).toEqual([]);
  });

  // ─── Integer division ──────────────────────────────────────────────
  describe('integer_division', () => {
    it('flags / 1000000 (the Elena case)', () => {
      const w = lintSQL('SELECT SUM(amount) / 1000000 FROM transactions');
      expect(w.length).toBeGreaterThanOrEqual(1);
      expect(w[0].kind).toBe('integer_division');
      expect(w[0].fix).toBe('1000000.0');
    });

    it('does NOT flag / 1000000.0', () => {
      const w = lintSQL('SELECT SUM(amount) / 1000000.0 FROM transactions');
      expect(w.filter(x => x.kind === 'integer_division')).toHaveLength(0);
    });

    it('does NOT flag small divisors (< 100)', () => {
      const w = lintSQL('SELECT total / 2 FROM stats');
      expect(w.filter(x => x.kind === 'integer_division')).toHaveLength(0);
    });

    it('flags / 100 in percentage context', () => {
      const w = lintSQL('SELECT SUM(x) / 100 AS pct FROM t');
      // 100 is the boundary — we flag >= 100
      const intDiv = w.find(x => x.kind === 'integer_division');
      expect(intDiv).toBeDefined();
    });
  });

  // ─── JOIN without ON ────────────────────────────────────────────────
  describe('join_no_on', () => {
    it('flags JOIN missing ON clause', () => {
      const w = lintSQL('SELECT * FROM a JOIN b WHERE a.id = b.id');
      expect(w.find(x => x.kind === 'join_no_on')).toBeDefined();
    });

    it('does NOT flag JOIN with ON', () => {
      const w = lintSQL('SELECT * FROM a JOIN b ON a.id = b.id');
      expect(w.filter(x => x.kind === 'join_no_on')).toHaveLength(0);
    });

    it('does NOT flag JOIN with USING', () => {
      const w = lintSQL('SELECT * FROM a JOIN b USING (id)');
      expect(w.filter(x => x.kind === 'join_no_on')).toHaveLength(0);
    });

    it('does NOT flag CROSS JOIN', () => {
      const w = lintSQL('SELECT * FROM a CROSS JOIN b');
      expect(w.filter(x => x.kind === 'join_no_on')).toHaveLength(0);
    });

    it('flags LEFT JOIN missing ON', () => {
      const w = lintSQL('SELECT * FROM a LEFT JOIN b');
      expect(w.find(x => x.kind === 'join_no_on')).toBeDefined();
    });
  });

  // ─── = NULL ─────────────────────────────────────────────────────────
  describe('null_comparison', () => {
    it('flags = NULL', () => {
      const w = lintSQL('SELECT * FROM users WHERE email = NULL');
      expect(w.find(x => x.kind === 'null_comparison')).toBeDefined();
    });

    it('flags != NULL', () => {
      const w = lintSQL('SELECT * FROM users WHERE email != NULL');
      expect(w.find(x => x.kind === 'null_comparison')).toBeDefined();
    });

    it('flags <> NULL', () => {
      const w = lintSQL('SELECT * FROM users WHERE email <> NULL');
      expect(w.find(x => x.kind === 'null_comparison')).toBeDefined();
    });

    it('does NOT flag IS NULL', () => {
      const w = lintSQL('SELECT * FROM users WHERE email IS NULL');
      expect(w.filter(x => x.kind === 'null_comparison')).toHaveLength(0);
    });

    it('does NOT flag IS NOT NULL', () => {
      const w = lintSQL('SELECT * FROM users WHERE email IS NOT NULL');
      expect(w.filter(x => x.kind === 'null_comparison')).toHaveLength(0);
    });
  });

  // ─── Aggregate in WHERE ─────────────────────────────────────────────
  describe('aggregate_in_where', () => {
    it('flags COUNT in WHERE', () => {
      const w = lintSQL('SELECT * FROM t WHERE COUNT(*) > 5');
      expect(w.find(x => x.kind === 'aggregate_in_where')).toBeDefined();
    });

    it('flags SUM in WHERE', () => {
      const w = lintSQL('SELECT name FROM t WHERE SUM(amount) > 100');
      expect(w.find(x => x.kind === 'aggregate_in_where')).toBeDefined();
    });

    it('does NOT flag aggregate in HAVING', () => {
      const w = lintSQL('SELECT name FROM t GROUP BY name HAVING COUNT(*) > 5');
      expect(w.filter(x => x.kind === 'aggregate_in_where')).toHaveLength(0);
    });

    it('does NOT flag aggregate in SELECT', () => {
      const w = lintSQL('SELECT COUNT(*) FROM t WHERE active = 1');
      expect(w.filter(x => x.kind === 'aggregate_in_where')).toHaveLength(0);
    });
  });

  // ─── Missing GROUP BY ───────────────────────────────────────────────
  describe('missing_group_by', () => {
    it('flags SELECT name, COUNT(*) without GROUP BY', () => {
      const w = lintSQL('SELECT name, COUNT(*) FROM users');
      expect(w.find(x => x.kind === 'missing_group_by')).toBeDefined();
    });

    it('does NOT flag pure aggregate', () => {
      const w = lintSQL('SELECT COUNT(*), SUM(x) FROM users');
      expect(w.filter(x => x.kind === 'missing_group_by')).toHaveLength(0);
    });

    it('does NOT flag with GROUP BY present', () => {
      const w = lintSQL('SELECT name, COUNT(*) FROM users GROUP BY name');
      expect(w.filter(x => x.kind === 'missing_group_by')).toHaveLength(0);
    });

    it('does NOT flag SELECT *', () => {
      const w = lintSQL('SELECT * FROM users');
      expect(w.filter(x => x.kind === 'missing_group_by')).toHaveLength(0);
    });
  });

  // ─── Comments stripped ──────────────────────────────────────────────
  it('ignores patterns inside line comments', () => {
    const w = lintSQL('SELECT * FROM t -- WHERE x = NULL');
    expect(w).toHaveLength(0);
  });

  it('ignores patterns inside block comments', () => {
    const w = lintSQL('SELECT * FROM t /* WHERE x = NULL */');
    expect(w).toHaveLength(0);
  });
});

describe('isIdle', () => {
  it('returns false when lastEditAt is null/undefined', () => {
    expect(isIdle(null)).toBe(false);
    expect(isIdle(undefined)).toBe(false);
  });

  it('returns true when elapsed >= threshold', () => {
    const now = 1000000;
    expect(isIdle(now - 30000, 30000, now)).toBe(true);
    expect(isIdle(now - 60000, 30000, now)).toBe(true);
  });

  it('returns false when elapsed < threshold', () => {
    const now = 1000000;
    expect(isIdle(now - 5000, 30000, now)).toBe(false);
    expect(isIdle(now - 29999, 30000, now)).toBe(false);
  });
});
