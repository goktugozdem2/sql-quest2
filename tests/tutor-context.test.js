import { describe, it, expect } from 'vitest';
import { SQLITE_TUTOR_RULES, mistakeStudyContext, buildMistakeContextBlock, mistakeOpeningPrompt } from '../src/utils/tutor-context.js';
import { dateUpperBoundTrap, rowDiffSummary, diagnoseResult, primaryHint } from '../src/utils/diagnose.js';
import fs from 'node:fs';

// Founder QA 2026-09-19, items 1, 2 and 5.
describe('the ISO-timestamp BETWEEN trap', () => {
  it('names the lost day and a strict-< fix', () => {
    const t = dateUpperBoundTrap("SELECT COUNT(*) FROM transactions WHERE txn_at BETWEEN '2026-04-01' AND '2026-04-30'");
    expect(t).toMatch(/every row on 2026-04-30 is dropped/);
    expect(t).toMatch(/txn_at < '2026-05-01'/);
  });
  it('rolls month and year ends correctly', () => {
    expect(dateUpperBoundTrap("where d between '2026-12-01' and '2026-12-31'")).toMatch(/< '2027-01-01'/);
  });
  it('<= a bare date is the same trap', () => {
    expect(dateUpperBoundTrap("where txn_at <= '2026-04-30'")).toMatch(/< '2026-05-01'/);
  });
  it('DATE(col) BETWEEN and strftime are fine', () => {
    expect(dateUpperBoundTrap("where DATE(txn_at) BETWEEN '2026-04-01' AND '2026-04-30'")).toBe(null);
    expect(dateUpperBoundTrap("where strftime('%Y-%m', txn_at) = '2026-04'")).toBe(null);
  });
  it('primaryHint leads with it on missing rows', () => {
    const cols = ['txn_day', 'n'];
    const d = diagnoseResult({ columns: cols, rows: [['2026-04-29', 3]] }, { columns: cols, rows: [['2026-04-29', 3], ['2026-04-30', 35]] });
    expect(primaryHint(d, { query: "select ... where txn_at between '2026-04-01' and '2026-04-30'" })).toMatch(/2026-04-30 is dropped/);
  });
});

describe('the rule rides on every tutor call', () => {
  it('forbids the bare-date BETWEEN and names the fixes', () => {
    expect(SQLITE_TUTOR_RULES).toMatch(/NEVER filter them with BETWEEN 'YYYY-MM-01' AND 'YYYY-MM-31'/);
    expect(SQLITE_TUTOR_RULES).toMatch(/strict </);
  });
  it('callAI appends it', () => {
    const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
    const call = app.slice(app.indexOf('const callAI = async'), app.indexOf('const callAI = async') + 1500);
    expect(call).toContain('SQLITE_TUTOR_RULES');
  });
});

describe('the mistake reaches the tutor', () => {
  const m = {
    questionTitle: 'Daily card volume for April 2026', questionDescription: 'Operations wants **April 2026**.',
    userQuery: "SELECT substr(txn_at,1,10) d, COUNT(*) n FROM transactions WHERE txn_at BETWEEN '2026-04-01' AND '2026-04-30' GROUP BY d",
    correctSolution: "SELECT ... WHERE strftime('%Y-%m', txn_at) = '2026-04' ...",
    userOutput: { columns: ['d', 'n'], rows: [['2026-04-29', 3]] },
    expectedOutput: { columns: ['d', 'n'], rows: [['2026-04-29', 3], ['2026-04-30', 35]] },
    diagnosis: { sentence: 'Wrong number of rows — expected 2, got 1', hint: null },
    dataset: 'finans_fraud',
  };
  it('carries the query, the solution, the diagnosis, the cause and the missing row', () => {
    const block = buildMistakeContextBlock(mistakeStudyContext(m));
    expect(block).toContain(m.userQuery);
    expect(block).toContain("strftime('%Y-%m', txn_at) = '2026-04'");
    expect(block).toContain('Wrong number of rows');
    expect(block).toMatch(/every row on 2026-04-30 is dropped/);
    expect(block).toContain('2026-04-30 | 35');
    expect(block).toMatch(/Never ask them to paste it/);
  });
  it('opens on the mistake, not on a concept overview', () => {
    expect(mistakeOpeningPrompt(mistakeStudyContext(m))).toMatch(/What your query did/);
  });
  it('rowDiffSummary names missing and extra rows', () => {
    const r = rowDiffSummary({ columns: ['a'], rows: [[1], [9]] }, { columns: ['a'], rows: [[1], [2]] });
    expect(r.missing).toEqual([[2]]);
    expect(r.extra).toEqual([[9]]);
  });
});
