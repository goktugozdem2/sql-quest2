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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
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
  buildInterviewProgress,
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

  // 2026-09-19 (founder QA round 3, item 6): 12 multiple-choice + 2 written,
  // the proportion the sources describe ("mostly multiple choice, plus one
  // or a few written SQL questions"). The four harder written questions
  // moved to capital-one-live-sql.
  it('runs 12 multiple-choice then 2 written-SQL questions inside 70 minutes', () => {
    const mi = get();
    expect(mi).toBeTruthy();
    const mcqs = mi.questions.filter(isMcqQuestion);
    const sqls = mi.questions.filter(q => !isMcqQuestion(q));
    expect(mcqs.length).toBe(12);
    expect(sqls.length).toBe(2);
    expect(mi.totalTime).toBe(70 * 60);
    expect(mi.questions.reduce((s, q) => s + q.timeLimit, 0)).toBe(70 * 60);
    expect(mi.description).toMatch(/12 multiple-choice questions in 48 minutes, then 2 written-SQL questions in 22/);
    // MCQ section first, exactly as candidates describe the screen.
    expect(mi.questions.slice(0, 12).every(isMcqQuestion)).toBe(true);
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

describe('the Capital One live SQL round', () => {
  const live = () => interviews.find(i => i.id === 'capital-one-live-sql');
  it('is four written questions in 60 minutes, Pro, on the same dataset', () => {
    const mi = live();
    expect(mi).toBeTruthy();
    expect(mi.isFree).toBe(false);
    expect(mi.questions.length).toBe(4);
    expect(mi.questionsCount).toBe(4);
    expect(mi.questions.every(q => !isMcqQuestion(q) && q.dataset === 'finans_fraud')).toBe(true);
    expect(mi.totalTime).toBe(60 * 60);
    expect(mi.questions.reduce((s, q) => s + q.timeLimit, 0)).toBe(60 * 60);
    expect(mi.questions.map(q => q.order)).toEqual([1, 2, 3, 4]);
  });
  it('never claims to be Capital One\'s own round', () => {
    const mi = live();
    const copy = `${mi.title} ${mi.description} ${mi.description_tr}`;
    expect(copy).toMatch(/practice/i);
    expect(copy).toMatch(/does not publish/);
    expect(copy).toMatch(/not affiliated|bağlantılı ya da onun onaylı değildir/i);
  });
});

describe('the live round asks for an explanation (round 4, item 5)', () => {
  it('every capital-one-live-sql question carries explainApproach; the screen has none', () => {
    // Per question since 2026-09-29 (src/utils/mock-approach.js); the full
    // enabled / off split is pinned in tests/mock-approach.test.js.
    expect(interviews.find(i => i.id === 'capital-one-live-sql').questions.every(q => q.explainApproach === true)).toBe(true);
    expect(interviews.find(i => i.id === 'capital-one-codesignal').questions.some(q => q.explainApproach)).toBe(false);
  });
  it('the runner renders the box, asks the tutor, and saves the note with the answer', async () => {
    const fs = await import('node:fs');
    const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
    expect(app).toContain('{explainsApproach(rawCurrentQ) && (');
    expect(app).toContain('data-testid="interview-approach-feedback"');
    expect(app).toContain("approachNote: explainsApproach(currentQ) ? (interviewApproach.text.trim() || null) : undefined,");
    expect(app).toMatch(/REFERENCE APPROACH \(never reveal it/);
    expect(app).toContain('data-testid="interview-approach-review"');
  });
});

// Founder QA 2026-09-20, items 3 and 8: a question that says "the query
// below" must have one, and its text renders `inline code`.
describe('question bodies are complete and readable', () => {
  it('every code snippet carries non-empty SQL under the key the runner reads', () => {
    for (const mi of interviews) for (const q of (mi.questions || [])) {
      for (const c of (q.codeSnippets || [])) {
        expect(typeof c.sql, `${mi.id}/${q.id} snippet.sql`).toBe('string');
        expect(c.sql.trim().length, `${mi.id}/${q.id} snippet.sql empty`).toBeGreaterThan(10);
      }
    }
  });
  it('a question that points at a query below has one', () => {
    for (const mi of interviews) for (const q of (mi.questions || [])) {
      const points = /query below|queries below|the query above/i.test(q.description || '');
      if (points) expect((q.codeSnippets || []).length, `${mi.id}/${q.id} says "query below"`).toBeGreaterThan(0);
    }
  });
  it('the runner renders backticks as code, not as backticks', async () => {
    const fs = await import('node:fs');
    const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
    expect(app).toMatch(/const questionHtml = \(text\) =>/);
    expect(app).toContain('__html: questionHtml(currentQ.description)');
    expect(app).toMatch(/replace\(\/`\(\[\^`\\n\]\+\)`\/g/);
  });
});

// ---------------------------------------------------------------------------
// Auto-save of in-flight interview progress
//
// THE BUG (found live 2026-09-07, in the browser, on capital-one-codesignal)
//
// The effect that owns the 5-second auto-save listed `interviewTimer` and
// `interviewTotalTimer` in its dependency array. Both tick once per second, so
// React tore the effect down and re-created it every second — and a 5000ms
// interval that is cleared at 1000ms never fires. Not once, in the whole life
// of the feature.
//
// The observable cost: the ONLY write that ever landed was the explicit
// saveInterviewProgress() inside closeInterview(), i.e. progress survived
// clicking "Quit" and nothing else. A tab crash, an OS reload or a navigation
// away lost the sitting. Sat on question 1 of the Capital One mock for 70+
// seconds and localStorage still held a STALE entry from a previous, quit
// interview.
//
// Two tests, because there are two separable halves:
//   1. the SNAPSHOT — buildInterviewProgress, the pure part, asserted against
//      the exact fields the resume path in app.jsx reads back;
//   2. the INTERVAL LIFETIME — a source-shape guard, in the style of the
//      recommendation-order guard in tests/challenge-order.test.js. There is
//      no way to assert "this interval survives a re-render" without mounting
//      the 24k-line monolith, but there IS a way to assert the dependency
//      array that caused it can never come back.
// ---------------------------------------------------------------------------

describe('buildInterviewProgress', () => {
  const interview = { id: 'capital-one-codesignal', title: 'Capital One — CodeSignal SQL' };
  const state = {
    questionIndex: 3,
    currentQuery: 'SELECT 1',
    selectedOption: 'b',
    questionTimer: 42,
    totalTimer: 900,
    answers: [{ correct: true, score: 10, maxScore: 10 }],
    hintsUsed: ['q1'],
  };

  it('carries every field the resume path reads back', () => {
    const p = buildInterviewProgress(interview, state);
    // These key names are load-bearing: startInterview() reads them one by one
    // (app.jsx ~8797) and the resume card renders interviewTitle / totalTimer.
    expect(p).toMatchObject({
      interviewId: 'capital-one-codesignal',
      interviewTitle: 'Capital One — CodeSignal SQL',
      questionIndex: 3,
      currentQuery: 'SELECT 1',
      selectedOption: 'b',
      questionTimer: 42,
      totalTimer: 900,
      answers: state.answers,
      hintsUsed: ['q1'],
    });
    expect(typeof p.savedAt).toBe('string');
    expect(Number.isNaN(Date.parse(p.savedAt))).toBe(false);
  });

  it('survives a JSON round-trip through localStorage unchanged', () => {
    const p = buildInterviewProgress(interview, state);
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
  });

  it('returns null without an interview — there is nothing to save', () => {
    expect(buildInterviewProgress(null, state)).toBeNull();
    expect(buildInterviewProgress(undefined, {})).toBeNull();
  });

  it('keeps question 0 as 0, never collapsed to a falsy default', () => {
    // The bug this guards: `questionIndex: index || 0` reads fine and is fine,
    // but any `|| 1`-style normalisation here would resume the user onto the
    // wrong question. Question 0 is the common case for a fresh sitting.
    const p = buildInterviewProgress(interview, { questionIndex: 0 });
    expect(p.questionIndex).toBe(0);
  });

  it('defaults the collections and timers rather than emitting undefined', () => {
    const p = buildInterviewProgress(interview, {});
    expect(p.questionIndex).toBe(0);
    expect(p.currentQuery).toBe('');
    expect(p.selectedOption).toBeNull();
    expect(p.questionTimer).toBe(0);
    expect(p.totalTimer).toBe(0);
    expect(p.answers).toEqual([]);
    expect(p.hintsUsed).toEqual([]);
  });

  it('preserves a null MCQ selection instead of dropping the key', () => {
    // JSON.stringify drops undefined keys; the resume path uses `?? null`, so
    // either would work — but a present null is what the shipped shape has and
    // what the results screen counts as "skipped".
    const p = buildInterviewProgress(interview, { selectedOption: null });
    expect(Object.prototype.hasOwnProperty.call(p, 'selectedOption')).toBe(true);
    expect(p.selectedOption).toBeNull();
  });
});

describe('source guard: the interview auto-save interval outlives a timer tick', () => {
  const APP_JSX = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app.jsx');
  const appSource = readFileSync(APP_JSX, 'utf8');

  // The autosave effect is the one useEffect that both sets an interval and
  // names saveInterviewProgress. Found structurally rather than by line number
  // so it stays bound to the LIVE source as app.jsx moves.
  function autosaveEffect() {
    const open = /useEffect\(\(\) => \{/g;
    let m;
    while ((m = open.exec(appSource)) !== null) {
      const close = /\n\s*\},\s*\[([^\]]*)\]\s*\);/g;
      close.lastIndex = m.index;
      const end = close.exec(appSource);
      if (!end) continue;
      const body = appSource.slice(m.index, end.index);
      if (/setInterval/.test(body) && /saveInterviewProgress/.test(body)) {
        return {
          body,
          deps: end[1].split(',').map(s => s.trim()).filter(Boolean),
          line: appSource.slice(0, m.index).split('\n').length,
        };
      }
    }
    throw new Error('interview auto-save effect not found in app.jsx');
  }

  it('finds the effect at all', () => {
    expect(autosaveEffect().body).toContain('5000');
  });

  it('does not depend on any per-second value', () => {
    // interviewTimer / interviewTotalTimer increment once per second in the
    // timer effect (app.jsx ~8691). Either one in this dependency array means
    // the 5000ms interval is destroyed at 1000ms and NEVER fires.
    const { deps, line } = autosaveEffect();
    const perTick = deps.filter(d => d === 'interviewTimer' || d === 'interviewTotalTimer');
    expect(
      perTick,
      `app.jsx:${line} — the auto-save effect depends on [${perTick.join(', ')}], ` +
      `which tick(s) once per second. The 5s interval is torn down before it can fire. ` +
      `Read the current state through a ref instead of re-creating the interval.`
    ).toEqual([]);
  });

  it('reads current state through a ref, so the surviving interval is not stale', () => {
    // Trimming the deps alone is not enough: saveInterviewProgress closes over
    // state, so a long-lived interval would keep writing the state as it was
    // when the interview started.
    const { body } = autosaveEffect();
    expect(body).toMatch(/saveInterviewProgressRef\.current/);
  });

  it('still only runs while an interview is actually in flight', () => {
    const { deps } = autosaveEffect();
    expect(deps).toContain('activeInterview');
    expect(deps).toContain('interviewCompleted');
    expect(deps).toContain('interviewTimerActive');
  });
});
