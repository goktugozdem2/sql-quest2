// SQL Quest — mock-interview question types
//
// WHY THIS FILE EXISTS
//
// Until 2026-09-07 the mock-interview runner had exactly one question type:
// a SQL editor. The Capital One data-analyst screen candidates actually sit
// is *mostly multiple choice over a provided dataset*, plus written SQL — so
// the product shipped the smaller half of the screen two of our three paying
// users were preparing for.
//
// Adding `type: 'mcq'` puts two answer shapes through one runner (timer,
// progress bar, saved progress, results screen, mistake review, AI study
// flow). Two failure modes are worth a test:
//
//   1. REGRESSION — a question with no `type` must still be a SQL question.
//      Every one of the ~20 interviews already in the bank is untyped, and a
//      default that flipped would break all of them silently.
//   2. AUTHORING — an MCQ with a duplicate option id, a correctOptionId that
//      is not among the options, or a missing `_tr` renders as a question
//      nobody can answer correctly. Those are data bugs, not code bugs, so
//      the second half of this file binds to the LIVE mock-interviews bank
//      rather than to fixtures.
//
// What is NOT tested here: whether the stated correct option is the TRUE
// answer for the dataset. That is not knowable without running SQL against
// finans_fraud — it is asserted by scripts/validate-capital-one-mock.mjs,
// which executes each question's `verify.sql` and proves exactly one option
// matches what the data returns.

import { describe, it, expect, beforeAll } from 'vitest';
import {
  QUESTION_TYPE_SQL,
  QUESTION_TYPE_MCQ,
  questionType,
  isMcqQuestion,
  isSqlQuestion,
  applyHintPenalty,
  findOption,
  scoreMcqAnswer,
  tallyInterviewResult,
  validateMcqQuestion,
  nextOptionId,
} from '../src/utils/mock-interview.js';
import { localizeQuestion } from '../src/utils/i18n.js';

const mcq = (over = {}) => ({
  id: 'q1',
  type: 'mcq',
  points: 10,
  options: [
    { id: 'a', text: 'A', text_tr: 'A' },
    { id: 'b', text: 'B', text_tr: 'B' },
    { id: 'c', text: 'C', text_tr: 'C' },
  ],
  correctOptionId: 'b',
  explanation: 'because',
  explanation_tr: 'çünkü',
  ...over,
});

describe('questionType — the no-regression default', () => {
  it('treats an untyped question as SQL (every legacy interview is untyped)', () => {
    expect(questionType({ id: 'legacy', solution: 'SELECT 1' })).toBe(QUESTION_TYPE_SQL);
    expect(isSqlQuestion({ id: 'legacy' })).toBe(true);
    expect(isMcqQuestion({ id: 'legacy' })).toBe(false);
  });

  it('treats an explicit sql type as SQL', () => {
    expect(questionType({ type: 'sql' })).toBe(QUESTION_TYPE_SQL);
  });

  it('recognises mcq, case-insensitively', () => {
    expect(questionType({ type: 'mcq' })).toBe(QUESTION_TYPE_MCQ);
    expect(questionType({ type: 'MCQ' })).toBe(QUESTION_TYPE_MCQ);
    expect(isMcqQuestion({ type: 'mcq' })).toBe(true);
  });

  it('falls back to SQL for junk, null and undefined rather than throwing', () => {
    expect(questionType(null)).toBe(QUESTION_TYPE_SQL);
    expect(questionType(undefined)).toBe(QUESTION_TYPE_SQL);
    expect(questionType({ type: 42 })).toBe(QUESTION_TYPE_SQL);
    expect(questionType({ type: 'essay' })).toBe(QUESTION_TYPE_SQL);
  });
});

describe('applyHintPenalty', () => {
  it('costs 15% of face value per hint, floored', () => {
    expect(applyHintPenalty(20, 0)).toBe(20);
    expect(applyHintPenalty(20, 1)).toBe(17); // floor(20*0.15) = 3
    expect(applyHintPenalty(20, 2)).toBe(14);
    expect(applyHintPenalty(10, 1)).toBe(9);  // floor(10*0.15) = 1
  });

  it('never goes below zero however many hints were taken', () => {
    expect(applyHintPenalty(10, 99)).toBe(0);
  });

  it('is safe on missing / non-numeric input', () => {
    expect(applyHintPenalty(undefined, 1)).toBe(0);
    expect(applyHintPenalty(10, undefined)).toBe(10);
    expect(applyHintPenalty(10, -3)).toBe(10);
  });
});

describe('scoreMcqAnswer', () => {
  it('awards full points for the correct option', () => {
    const r = scoreMcqAnswer(mcq(), 'b');
    expect(r.correct).toBe(true);
    expect(r.score).toBe(10);
    expect(r.maxScore).toBe(10);
    expect(r.selectedOption.id).toBe('b');
    expect(r.correctOption.id).toBe('b');
  });

  it('scores zero for a wrong option but still reports the right one', () => {
    const r = scoreMcqAnswer(mcq(), 'a');
    expect(r.correct).toBe(false);
    expect(r.score).toBe(0);
    expect(r.maxScore).toBe(10);
    expect(r.correctOption.id).toBe('b');
  });

  it('applies the hint penalty only when the answer is right', () => {
    expect(scoreMcqAnswer(mcq({ points: 20 }), 'b', { hintsUsed: 1 }).score).toBe(17);
    expect(scoreMcqAnswer(mcq({ points: 20 }), 'a', { hintsUsed: 1 }).score).toBe(0);
  });

  it('treats a skip / timeout (null selection) as wrong, never throwing', () => {
    for (const sel of [null, undefined, '', 'no-such-option']) {
      const r = scoreMcqAnswer(mcq(), sel);
      expect(r.correct).toBe(false);
      expect(r.score).toBe(0);
      expect(r.selectedOption).toBe(null);
    }
  });

  it('still reports maxScore so an unanswered question counts against the paper', () => {
    expect(scoreMcqAnswer(mcq({ points: 12 }), null).maxScore).toBe(12);
  });
});

describe('findOption', () => {
  it('returns the option or null, never throws on a malformed question', () => {
    expect(findOption(mcq(), 'c').text).toBe('C');
    expect(findOption(mcq(), 'zzz')).toBe(null);
    expect(findOption(null, 'a')).toBe(null);
    expect(findOption({ id: 'sql-q' }, 'a')).toBe(null);
  });
});

describe('tallyInterviewResult — one shape for both question types', () => {
  const questions = [
    { id: 'm1', type: 'mcq', points: 10 },
    { id: 'm2', type: 'mcq', points: 10 },
    { id: 'q1', points: 20 },
  ];

  it('sums answer scores against the FULL paper, not just the answered part', () => {
    const answers = [{ correct: true, score: 10 }, { correct: false, score: 0 }];
    const r = tallyInterviewResult(questions, answers, 60);
    expect(r.totalScore).toBe(10);
    expect(r.maxScore).toBe(40); // all three questions, including the unreached one
    expect(r.percentage).toBe(25);
    expect(r.passed).toBe(false);
    expect(r.questionsCorrect).toBe(1);
    expect(r.questionsTotal).toBe(2);
  });

  it('passes at exactly the passing score', () => {
    const answers = [{ correct: true, score: 10 }, { correct: true, score: 10 }, { correct: true, score: 4 }];
    expect(tallyInterviewResult(questions, answers, 60).percentage).toBe(60);
    expect(tallyInterviewResult(questions, answers, 60).passed).toBe(true);
  });

  it('mixes MCQ and SQL scores without caring which was which', () => {
    const answers = [{ correct: true, score: 10 }, { correct: true, score: 10 }, { correct: true, score: 20 }];
    const r = tallyInterviewResult(questions, answers, 60);
    expect(r.percentage).toBe(100);
    expect(r.passed).toBe(true);
  });

  it('does not divide by zero on an empty paper', () => {
    const r = tallyInterviewResult([], [], 60);
    expect(r.percentage).toBe(0);
    expect(r.passed).toBe(false);
  });
});

describe('validateMcqQuestion', () => {
  it('accepts a well-formed question', () => {
    expect(validateMcqQuestion(mcq())).toEqual([]);
  });

  it('rejects fewer than three options', () => {
    const errs = validateMcqQuestion(mcq({ options: [{ id: 'a', text: 'A', text_tr: 'A' }] }));
    expect(errs.join(' ')).toMatch(/at least 3 options/);
  });

  it('rejects duplicate option ids', () => {
    const errs = validateMcqQuestion(mcq({
      options: [
        { id: 'a', text: 'A', text_tr: 'A' },
        { id: 'a', text: 'B', text_tr: 'B' },
        { id: 'c', text: 'C', text_tr: 'C' },
      ],
    }));
    expect(errs.join(' ')).toMatch(/duplicate option id/);
  });

  it('rejects a correctOptionId that is not one of the options', () => {
    const errs = validateMcqQuestion(mcq({ correctOptionId: 'zzz' }));
    expect(errs.join(' ')).toMatch(/is not one of the options/);
  });

  it('rejects a missing correctOptionId', () => {
    const errs = validateMcqQuestion(mcq({ correctOptionId: undefined }));
    expect(errs.join(' ')).toMatch(/no correctOptionId/);
  });

  it('rejects missing _tr strings when Turkish is required', () => {
    const errs = validateMcqQuestion(mcq({ explanation_tr: undefined }));
    expect(errs.join(' ')).toMatch(/no explanation_tr/);
    expect(validateMcqQuestion(mcq({ explanation_tr: undefined }), { requireTr: false })).toEqual([]);
  });

  it('rejects an MCQ that also carries a solution — the runner would execute it', () => {
    const errs = validateMcqQuestion(mcq({ solution: 'SELECT 1' }));
    expect(errs.join(' ')).toMatch(/carries a 'solution'/);
  });
});

describe('nextOptionId — arrow-key radio navigation', () => {
  const opts = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('moves forward and wraps', () => {
    expect(nextOptionId(opts, 'a', 'ArrowDown')).toBe('b');
    expect(nextOptionId(opts, 'c', 'ArrowDown')).toBe('a');
    expect(nextOptionId(opts, 'a', 'ArrowRight')).toBe('b');
  });

  it('moves backward and wraps', () => {
    expect(nextOptionId(opts, 'b', 'ArrowUp')).toBe('a');
    expect(nextOptionId(opts, 'a', 'ArrowUp')).toBe('c');
    expect(nextOptionId(opts, 'b', 'ArrowLeft')).toBe('a');
  });

  it('lands on an end when nothing is selected yet', () => {
    expect(nextOptionId(opts, null, 'ArrowDown')).toBe('a');
    expect(nextOptionId(opts, null, 'ArrowUp')).toBe('c');
  });

  it('leaves the selection alone for any other key, including Enter', () => {
    expect(nextOptionId(opts, 'b', 'Enter')).toBe('b');
    expect(nextOptionId(opts, 'b', 'a')).toBe('b');
  });

  it('is safe on an empty option list', () => {
    expect(nextOptionId([], null, 'ArrowDown')).toBe(null);
    expect(nextOptionId(undefined, 'a', 'ArrowDown')).toBe('a');
  });
});

describe('localizeQuestion carries MCQ strings across languages', () => {
  const q = mcq({
    title: 'T', title_tr: 'T-tr',
    description: 'D', description_tr: 'D-tr',
    codeSnippets: [{ label: 'Query A', label_tr: 'Sorgu A', sql: 'SELECT 1' }],
  });

  it('swaps option text, explanation and snippet labels but never the SQL', () => {
    const tr = localizeQuestion(q, 'tr');
    expect(tr.title).toBe('T-tr');
    expect(tr.explanation).toBe('çünkü');
    expect(tr.codeSnippets[0].label).toBe('Sorgu A');
    expect(tr.codeSnippets[0].sql).toBe('SELECT 1');
  });

  it('leaves English alone and keeps option ids stable so scoring still works', () => {
    const en = localizeQuestion(q, 'en');
    expect(en.options.map(o => o.id)).toEqual(['a', 'b', 'c']);
    expect(localizeQuestion(q, 'tr').options.map(o => o.id)).toEqual(['a', 'b', 'c']);
    expect(scoreMcqAnswer(localizeQuestion(q, 'tr'), 'b').correct).toBe(true);
  });
});

// ── The live bank ────────────────────────────────────────────────────────
let interviews;

beforeAll(async () => {
  globalThis.window = globalThis.window || {};
  await import('../src/data/mock-interviews.js');
  interviews = globalThis.window.mockInterviewsData;
});

describe('live mock-interviews data shape', () => {
  const allQuestions = () => interviews.flatMap(i => i.questions.map(q => ({ i, q })));

  it('loads a non-empty bank', () => {
    expect(Array.isArray(interviews)).toBe(true);
    expect(interviews.length).toBeGreaterThan(0);
  });

  it('every SQL question still has a solution — no question lost one to the MCQ work', () => {
    for (const { i, q } of allQuestions()) {
      if (isMcqQuestion(q)) continue;
      expect(typeof q.solution, `${i.id}/${q.id} solution`).toBe('string');
      expect(q.solution.trim().length, `${i.id}/${q.id} solution is empty`).toBeGreaterThan(0);
    }
  });

  it('every MCQ passes validateMcqQuestion — ids unique, correct id present, _tr complete', () => {
    const problems = [];
    for (const { i, q } of allQuestions()) {
      if (!isMcqQuestion(q)) continue;
      problems.push(...validateMcqQuestion(q).map(e => `${i.id} ${e}`));
    }
    expect(problems).toEqual([]);
  });

  it('every MCQ has at least 3 options and a correctOptionId among them', () => {
    for (const { i, q } of allQuestions()) {
      if (!isMcqQuestion(q)) continue;
      const where = `${i.id}/${q.id}`;
      expect(q.options.length, `${where} option count`).toBeGreaterThanOrEqual(3);
      expect(q.options.map(o => o.id), `${where} correctOptionId`).toContain(q.correctOptionId);
      expect(new Set(q.options.map(o => o.id)).size, `${where} duplicate ids`).toBe(q.options.length);
    }
  });

  it('every MCQ carries a verify.sql and a machine-comparable value per option', () => {
    // The validator script is what proves the values are TRUE against the
    // data; this only guarantees it has something to work with, so an MCQ
    // cannot ship unverifiable.
    for (const { i, q } of allQuestions()) {
      if (!isMcqQuestion(q)) continue;
      const where = `${i.id}/${q.id}`;
      expect(typeof q.verify?.sql, `${where} verify.sql`).toBe('string');
      for (const o of q.options) {
        expect(o.value === undefined || o.value === null, `${where} option ${o.id} has no value`).toBe(false);
      }
    }
  });

  it('question ids are unique inside each interview', () => {
    for (const i of interviews) {
      const ids = i.questions.map(q => q.id);
      expect(new Set(ids).size, `${i.id} duplicate question ids`).toBe(ids.length);
    }
  });

  it('declared questionsCount matches the questions actually authored', () => {
    for (const i of interviews) {
      expect(i.questionsCount, `${i.id} questionsCount`).toBe(i.questions.length);
    }
  });

  // NOT asserted bank-wide on purpose. Six interviews authored before this
  // work sum their per-question limits ABOVE their wall clock — free 26/25,
  // data-analyst-mid 38/35, backend-engineer-sql 41/40, business-analyst-sql
  // 33/30, senior-data-engineer 57/55, top-10-most-asked 100/90. Whether that
  // is intentional (a per-question cap you are not meant to spend in full) or
  // six separate slips is a content decision, not one to make from a test
  // written for a different feature. capital-one-codesignal is held to the
  // tight version because its 70 minutes is the whole claim it makes.
  it('capital-one time limits fit exactly inside the interview total time', () => {
    const mi = interviews.find(i => i.id === 'capital-one-codesignal');
    const sum = mi.questions.reduce((s, q) => s + q.timeLimit, 0);
    expect(sum).toBe(mi.totalTime);
  });
});

describe('the Capital One mock is both halves of the screen', () => {
  const get = () => interviews.find(i => i.id === 'capital-one-codesignal');

  it('runs 8 multiple-choice then 6 written-SQL questions inside 70 minutes', () => {
    const mi = get();
    expect(mi).toBeTruthy();
    const mcqs = mi.questions.filter(isMcqQuestion);
    const sqls = mi.questions.filter(q => !isMcqQuestion(q));
    expect(mcqs.length).toBe(8);
    expect(sqls.length).toBe(6);
    expect(mi.totalTime).toBe(70 * 60);
    expect(mi.questions.reduce((s, q) => s + q.timeLimit, 0)).toBe(70 * 60);
    // MCQ section first, exactly as candidates describe the screen.
    expect(mi.questions.slice(0, 8).every(isMcqQuestion)).toBe(true);
    expect(mi.questions.map(q => q.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it('stays Pro and stays on the card-transaction dataset', () => {
    const mi = get();
    expect(mi.isFree).toBe(false);
    for (const q of mi.questions) expect(q.dataset).toBe('finans_fraud');
  });

  it('never claims to be Capital One\'s actual test', () => {
    const mi = get();
    const copy = `${mi.description} ${mi.description_tr}`;
    expect(copy).toMatch(/[Cc]andidate-reported|aday/i);
    expect(copy).toMatch(/not affiliated|bağlantılı ya da onun onaylı değildir/i);
  });

  it('translates every MCQ string into Turkish', () => {
    const mi = get();
    for (const q of mi.questions.filter(isMcqQuestion)) {
      expect(q.title_tr, `${q.id} title_tr`).toBeTruthy();
      expect(q.description_tr, `${q.id} description_tr`).toBeTruthy();
      expect(q.explanation_tr, `${q.id} explanation_tr`).toBeTruthy();
      expect(Array.isArray(q.hints_tr), `${q.id} hints_tr`).toBe(true);
      expect(q.hints_tr.length, `${q.id} hints_tr count`).toBe(q.hints.length);
      for (const o of q.options) expect(o.text_tr, `${q.id}/${o.id} text_tr`).toBeTruthy();
      for (const c of (q.codeSnippets || [])) expect(c.label_tr, `${q.id} snippet label_tr`).toBeTruthy();
    }
  });
});
