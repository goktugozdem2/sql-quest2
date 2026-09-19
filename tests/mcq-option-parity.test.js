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

// Founder QA 2026-09-19, items 7–9: the timed screen gives no warnings and
// names no method; the right answer is never simply the largest option.
describe('capital-one: a screen, not a lesson', () => {
  const c1 = mocks.find(m => m.id === 'capital-one-codesignal');
  it('no SQL prompt names a method or warns about a trap', () => {
    for (const q of mocks.filter(m => /^capital-one/.test(m.id)).flatMap(m => m.questions).filter(q => q.type !== 'mcq')) {
      for (const f of ['title', 'title_tr', 'description', 'description_tr']) {
        const t = q[f] || '';
        expect(t, `${q.id}.${f}`).not.toMatch(/strftime|natural tool|ROW_NUMBER|\(CTE\)|trap|tuzağı|Careful|Dikkat|conditional aggregation|Koşullu aggregation/i);
      }
    }
  });
  it('practice notes exist where the warning moved', () => {
    const all = mocks.filter(m => /^capital-one/.test(m.id)).flatMap(m => m.questions);
    for (const id of ['c1-q3', 'c1-q5', 'c1-q6']) {
      const q = all.find(x => x.id === id);
      expect(q.practiceNote, id).toBeTruthy();
      expect(q.practiceNote_tr, id).toBeTruthy();
    }
  });
  it('Q6: the correct total is not the largest number offered', () => {
    const q = c1.questions.find(x => x.id === 'c1-m6');
    const num = o => Number(String(o.value).split('|').pop());
    const correct = q.options.find(o => o.id === q.correctOptionId);
    expect(Math.max(...q.options.map(num))).toBeGreaterThan(num(correct));
  });
});

describe('capital-one: each MCQ names each subject once (round 3, item 5)', () => {
  const c1 = mocks.find(m => m.id === 'capital-one-codesignal');
  it('Q6: no merchant appears in two options', () => {
    const q = c1.questions.find(x => x.id === 'c1-m6');
    const names = q.options.map(o => String(o.value).split('|')[0]);
    expect(new Set(names).size).toBe(names.length);
  });
  it('Q11 (now the live round\'s first): the reference aggregates before it joins', () => {
    const q = mocks.find(m => m.id === 'capital-one-live-sql').questions.find(x => x.id === 'c1-q3');
    expect(q.solution).toMatch(/LEFT JOIN \(SELECT account_id, COUNT\(\*\)/);
  });
});
