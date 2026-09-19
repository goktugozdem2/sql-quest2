import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Founder QA 2026-09-19, item 14: in a multiple-choice question, a rationale
// beside the wrong options and a bare correct one is a tell. Either every
// option of a question carries a " — reason", or none does.
globalThis.window = globalThis.window || {};
const src = fs.readFileSync(path.resolve(import.meta.dirname, '../src/data/mock-interviews.js'), 'utf8');
new Function('window', src)(globalThis.window);
const mocks = globalThis.window.mockInterviewsData || [];

describe('MCQ options: all with a reason, or none', () => {
  const mcqs = mocks.flatMap(m => (m.questions || []).filter(q => q.type === 'mcq').map(q => ({ mock: m.id, q })));
  it('finds the MCQs', () => { expect(mcqs.length).toBeGreaterThanOrEqual(10); });
  for (const { mock, q } of mcqs) {
    for (const field of ['text', 'text_tr']) {
      it(`${mock} ${q.id} (${field})`, () => {
        const withReason = q.options.filter(o => / — /.test(o[field] || '')).length;
        expect([0, q.options.length]).toContain(withReason);
      });
    }
  }
});
