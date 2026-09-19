import { describe, it, expect } from 'vitest';
import { mockMistakeDiagnosis } from '../src/utils/mock-interview.js';
import { diagnoseResult, primaryHint } from '../src/utils/diagnose.js';

// Founder QA 2026-09-19, item 5: every wrong mock answer gets one sentence.
const engine = { diagnose: diagnoseResult, hint: primaryHint };

describe('mockMistakeDiagnosis', () => {
  it('returns null for a correct answer', () => {
    expect(mockMistakeDiagnosis({ correct: true }, engine)).toBe(null);
  });
  it('a skip says skip, never "time ran out"', () => {
    const d = mockMistakeDiagnosis({ correct: false, skipped: true, userQuery: '' }, engine);
    expect(d.sentence).toMatch(/Skipped/);
    expect(d.sentence).not.toMatch(/[Tt]ime/);
  });
  it('a timeout with no query says time ran out', () => {
    expect(mockMistakeDiagnosis({ correct: false, timedOut: true, userQuery: '' }, engine).sentence).toMatch(/Time ran out/);
  });
  it('an MCQ keeps its authored explanation', () => {
    const d = mockMistakeDiagnosis({ correct: false, questionType: 'mcq', explanation: 'Because COUNT(col) skips NULLs.' }, engine);
    expect(d.sentence).toBe('Because COUNT(col) skips NULLs.');
  });
  it('a SQL answer with too many rows is diagnosed by the engine', () => {
    const d = mockMistakeDiagnosis({
      correct: false, userQuery: 'select dept from e',
      userOutput: { columns: ['dept'], rows: [['a'], ['a'], ['b']] },
      expectedOutput: { columns: ['dept'], rows: [['a'], ['b']] },
      concepts: ['GROUP BY'],
    }, engine);
    expect(d.sentence).toMatch(/Wrong number of rows/);
  });
  it('a SQL error is reported as an error, not as an empty result', () => {
    const d = mockMistakeDiagnosis({
      correct: false, userQuery: 'selec x', userError: 'near "selec": syntax error',
      userOutput: { columns: [], rows: [] }, expectedOutput: { columns: ['x'], rows: [[1]] },
    }, engine);
    expect(d.sentence).toMatch(/SQL error/);
  });
  it('a window question gets the window read', () => {
    const cols = ['name', 'rnk'];
    const d = mockMistakeDiagnosis({
      correct: false, userQuery: 'select name, dense_rank() over (order by s desc) rnk from e',
      userOutput: { columns: cols, rows: [['A', 1], ['B', 1], ['C', 2]] },
      expectedOutput: { columns: cols, rows: [['A', 1], ['B', 1], ['C', 3]] },
      concepts: ['Window Functions', 'RANK'],
    }, engine);
    expect(d.sentence).toMatch(/RANK, not DENSE_RANK/);
  });
});

import { weakConceptsFromHistory } from '../src/utils/mock-interview.js';
describe('weakConceptsFromHistory (founder QA item 13)', () => {
  it('a skipped question is not evidence of weakness', () => {
    const h = [{ questionResults: [
      { correct: false, skipped: true, userQuery: '', concepts: ['Window Functions'] },
    ] }];
    expect(weakConceptsFromHistory(h)).toEqual([]);
  });
  it('a concept answered right elsewhere is not a focus area', () => {
    const h = [{ questionResults: [
      { correct: true, userQuery: 'select ...', concepts: ['GROUP BY', 'COUNT'] },
      { correct: false, userQuery: 'select ...', concepts: ['GROUP BY', 'HAVING'] },
    ] }];
    expect(weakConceptsFromHistory(h)).toEqual(['HAVING']);
  });
  it('old history with only mistakes still works, minus the unattempted', () => {
    const h = [{ mistakes: [
      { userQuery: 'select 1', concepts: ['JOIN'] },
      { userQuery: '', timedOut: true, concepts: ['CTE'] },
    ] }];
    expect(weakConceptsFromHistory(h)).toEqual(['JOIN']);
  });
});
