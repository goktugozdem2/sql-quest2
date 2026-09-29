// "Explain your approach" — where the box is, where it is not, and why.
//
// docs/plans/explain-approach-mocks-2026-09-21.md (founder-approved
// 2026-09-29): every WRITTEN question in a mock that practises a live /
// talk-through round carries `explainApproach: true`; a multiple-choice
// question never does; a written question in a mock whose dated source says
// the round is a timed online test with nobody to talk to (the Capital One
// CodeSignal screen, the Revolut HackerRank screen) stays off. This file
// binds the LIVE bank to that split, so a new mock forces a decision and a
// stray flag on an MCQ or on the CodeSignal mock fails by name.
//
// Proven by deliberate breaks (2026-09-29): an `explainApproach: true` on
// the MCQ `c1-m1` failed "no multiple-choice question carries the box" (and
// "the CodeSignal mock has none"); the flag removed from `free-q2` failed
// "every written question in an enabled mock carries the box"; the flag
// added to the CodeSignal written question `c1-q1` failed "the CodeSignal
// mock has none" and "the enabled set is exactly the mocks we decided on".
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { explainsApproach, approachEnabledMockIds, approachSubmittedEvent } from '../src/utils/mock-approach.js';

const here = (rel) => path.resolve(import.meta.dirname, rel);
globalThis.window = globalThis.window || {};
new Function('window', fs.readFileSync(here('../src/data/mock-interviews.js'), 'utf8'))(globalThis.window);
const mocks = globalThis.window.mockInterviewsData || [];
const byId = (id) => mocks.find(m => m.id === id);

// The decision, written down: live / talk-through practice gets the box.
const ENABLED = [
  'sql-fundamentals-free', 'data-analyst-mid', 'backend-engineer-sql', 'faang-sql-interview',
  'business-analyst-sql', 'senior-data-engineer', 'top-10-most-asked',
  'capital-one-live-sql',
];
// Timed online screens, sourced as such: no talking, no box.
const OFF = ['capital-one-codesignal', 'revolut-analytics-screen'];

describe('the box is a per-question flag', () => {
  it('a written question with the flag explains; without it, or as MCQ, it does not', () => {
    expect(explainsApproach({ id: 'w', explainApproach: true })).toBe(true);
    expect(explainsApproach({ id: 'w' })).toBe(false);
    expect(explainsApproach({ id: 'w', explainApproach: 'yes' })).toBe(false);
    expect(explainsApproach({ id: 'm', type: 'mcq', explainApproach: true })).toBe(false);
    expect(explainsApproach(null)).toBe(false);
  });
  it('the event carries interview, question and the note length — 0 for an empty box, null for a question with no box', () => {
    const mi = { id: 'x-mock' };
    expect(approachSubmittedEvent(mi, { id: 'q1', explainApproach: true }, '  Join on txn_id, then aggregate.  '))
      .toEqual({ interviewId: 'x-mock', questionId: 'q1', chars: 'Join on txn_id, then aggregate.'.length, hasApproach: true });
    expect(approachSubmittedEvent(mi, { id: 'q1', explainApproach: true }, '   '))
      .toEqual({ interviewId: 'x-mock', questionId: 'q1', chars: 0, hasApproach: false });
    expect(approachSubmittedEvent(mi, { id: 'q1', explainApproach: true }, undefined).chars).toBe(0);
    expect(approachSubmittedEvent(mi, { id: 'q2' }, 'text')).toBeNull();
    expect(approachSubmittedEvent(mi, { id: 'm1', type: 'mcq', explainApproach: true }, 'text')).toBeNull();
  });
});

describe('the live bank: where the box is', () => {
  it('finds every mock the decision names', () => {
    for (const id of [...ENABLED, ...OFF]) expect(byId(id), id).toBeTruthy();
  });
  it('no multiple-choice question carries the box', () => {
    const mcqs = mocks.flatMap(m => (m.questions || []).filter(q => q.type === 'mcq').map(q => `${m.id}/${q.id}`));
    expect(mcqs.length).toBeGreaterThanOrEqual(18);
    const flagged = mocks.flatMap(m => (m.questions || []).filter(q => q.type === 'mcq' && 'explainApproach' in q).map(q => `${m.id}/${q.id}`));
    expect(flagged).toEqual([]);
  });
  it('the CodeSignal mock has none — a timed online test with nobody to talk to', () => {
    const c1 = byId('capital-one-codesignal');
    expect(c1.explainApproach).toBeUndefined();
    expect(c1.questions.filter(q => 'explainApproach' in q).map(q => q.id)).toEqual([]);
    // Its written half exists, so the absence is a decision, not a gap.
    expect(c1.questions.filter(q => q.type !== 'mcq').length).toBe(2);
  });
  it('the Revolut HackerRank screen has none — the talk-through is round two, which has no mock', () => {
    const rv = byId('revolut-analytics-screen');
    expect(rv.explainApproach).toBeUndefined();
    expect(rv.questions.filter(q => 'explainApproach' in q).map(q => q.id)).toEqual([]);
    expect(rv.questions.filter(q => q.type !== 'mcq').length).toBe(2);
  });
  it('every written question in an enabled mock carries the box', () => {
    for (const id of ENABLED) {
      const written = byId(id).questions.filter(q => q.type !== 'mcq');
      expect(written.length, `${id} has written questions`).toBeGreaterThan(0);
      const missing = written.filter(q => !explainsApproach(q)).map(q => q.id);
      expect(missing, `${id} written questions without the box`).toEqual([]);
    }
  });
  it('the enabled set is exactly the mocks we decided on — a new mock forces a decision', () => {
    expect(approachEnabledMockIds(mocks).sort()).toEqual([...ENABLED].sort());
    expect(mocks.map(m => m.id).sort()).toEqual([...ENABLED, ...OFF].sort());
  });
  it('the flag never lives on the mock any more', () => {
    expect(mocks.filter(m => 'explainApproach' in m).map(m => m.id)).toEqual([]);
  });
  it('the two OFF sections say why in the data file', () => {
    const src = fs.readFileSync(here('../src/data/mock-interviews.js'), 'utf8');
    const c1 = src.indexOf("id: 'c1-q1'");
    const rv = src.indexOf("id: 'rv-q1'");
    expect(src.slice(c1 - 900, c1)).toMatch(/No `explainApproach` here, on purpose[\s\S]*CodeSignal/);
    expect(src.slice(rv - 900, rv)).toMatch(/No `explainApproach` here, on purpose[\s\S]*HackerRank/);
  });
});

describe('the runner and the copy are generic — nothing is Capital One\'s', () => {
  const app = fs.readFileSync(here('../src/app.jsx'), 'utf8');
  it('the box, the saved note and the event all read the question flag', () => {
    expect(app).toContain("import { explainsApproach, approachSubmittedEvent } from './utils/mock-approach.js';");
    expect(app).toContain('{explainsApproach(rawCurrentQ) && (');
    expect(app).toContain('approachNote: explainsApproach(currentQ) ?');
    expect(app).toContain("trackActivationEvent('mock_approach_submitted'");
    expect(app).not.toContain('activeInterview.explainApproach');
  });
  it('the feedback prompt names the mock\'s own question and reference, not a company or a dataset', () => {
    const start = app.indexOf('const getApproachFeedback = async () => {');
    const body = app.slice(start, app.indexOf('const canAccessInterview', start));
    expect(body).toContain('QUESTION: ${q.title}');
    expect(body).toContain('REFERENCE APPROACH (never reveal it or write it out): ${q.solution}');
    expect(body).not.toMatch(/Capital One|card|chargeback|finans_fraud|Revolut|neobank/i);
  });
  it('the box\'s copy in both languages is about the interview, not a company or its tables', () => {
    const i18n = fs.readFileSync(here('../src/utils/i18n.js'), 'utf8');
    const lines = i18n.split('\n').filter(l => /approach(Label|Placeholder|Button|Loading|Note):/.test(l));
    expect(lines.length).toBe(10);
    for (const l of lines) expect(l).not.toMatch(/Capital One|CodeSignal|chargeback|transactions|Revolut|HackerRank/i);
  });
});
