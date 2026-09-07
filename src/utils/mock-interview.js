// Mock-interview question types, answer scoring and result tallying.
//
// WHY THIS FILE EXISTS
//
// Until 2026-09-07 every mock-interview question was a SQL-editor question,
// and all of the scoring lived inline in app.jsx. The Capital One data-analyst
// screen candidates actually sit is *mostly multiple choice over a provided
// CSV dataset* plus a written-SQL section — so the larger half of that screen
// did not exist in the product at all.
//
// Adding `type: 'mcq'` means there are now two answer shapes flowing through
// one runner (timer, progress bar, saved progress, results screen, mistake
// review). Everything downstream of `submitInterviewAnswer` reads
// `answer.correct` / `answer.score` / `answer.maxScore`, so the ONLY safe way
// to add a type is to keep that shape byte-identical and branch on the way in.
// These are the pure pieces of that branch, extracted so they can be tested
// without a DOM, a sql.js database or a React tree.
//
// Invariant to preserve: a question with no `type` is a SQL question. The
// existing 20-odd interviews carry no `type` field and must not regress.

export const QUESTION_TYPE_SQL = 'sql';
export const QUESTION_TYPE_MCQ = 'mcq';

/**
 * The type of a question, defaulting to SQL when the field is absent.
 * Every legacy question in src/data/mock-interviews.js is untyped.
 */
export function questionType(q) {
  const raw = q && typeof q.type === 'string' ? q.type.toLowerCase() : '';
  return raw === QUESTION_TYPE_MCQ ? QUESTION_TYPE_MCQ : QUESTION_TYPE_SQL;
}

export function isMcqQuestion(q) {
  return questionType(q) === QUESTION_TYPE_MCQ;
}

export function isSqlQuestion(q) {
  return questionType(q) === QUESTION_TYPE_SQL;
}

/**
 * Hint penalty, shared by both question types: each hint taken costs 15% of
 * the question's face value, floored, and the score never goes below 0.
 * This is the exact arithmetic the SQL path used inline before the split —
 * do not "clean it up" into a percentage of the remaining score, that would
 * silently change every historical comparison.
 */
export function applyHintPenalty(points, hintsUsedCount) {
  const base = Number(points) || 0;
  const used = Math.max(0, Number(hintsUsedCount) || 0);
  return Math.max(0, base - used * Math.floor(base * 0.15));
}

/** The option object for an id, or null. */
export function findOption(q, optionId) {
  if (!q || !Array.isArray(q.options)) return null;
  return q.options.find(o => o && o.id === optionId) || null;
}

/**
 * Score one MCQ answer. Returns the same {correct, score, maxScore} triple the
 * SQL path produces, so the caller can build one answer object either way.
 *
 * A null / undefined selection (skipped, or the per-question timer expired)
 * is simply wrong — never throws, never awards partial credit.
 */
export function scoreMcqAnswer(q, selectedOptionId, { hintsUsed = 0 } = {}) {
  const maxScore = Number(q?.points) || 0;
  const selected = findOption(q, selectedOptionId);
  const correct = !!selected && selected.id === q.correctOptionId;
  return {
    correct,
    score: correct ? applyHintPenalty(maxScore, hintsUsed) : 0,
    maxScore,
    selectedOption: selected,
    correctOption: findOption(q, q?.correctOptionId),
  };
}

/**
 * Tally a finished interview from its answers. Mirrors what completeInterview
 * does in app.jsx; `maxScore` deliberately sums the QUESTIONS (not the
 * answers) so an interview abandoned mid-way still scores against the full
 * paper, exactly as it did before.
 */
export function tallyInterviewResult(questions, answers, passingScore = 60) {
  const qs = Array.isArray(questions) ? questions : [];
  const as = Array.isArray(answers) ? answers : [];
  const totalScore = as.reduce((sum, a) => sum + (Number(a?.score) || 0), 0);
  const maxScore = qs.reduce((sum, q) => sum + (Number(q?.points) || 0), 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  return {
    totalScore,
    maxScore,
    percentage,
    passed: maxScore > 0 && percentage >= passingScore,
    questionsCorrect: as.filter(a => a && a.correct).length,
    questionsTotal: as.length,
  };
}

/**
 * Structural validation of one MCQ question. Returns an array of human
 * readable problems — empty means valid. Used by the data-shape test and by
 * scripts/validate-capital-one-mock.mjs so the two cannot drift.
 */
export function validateMcqQuestion(q, { requireTr = true } = {}) {
  const errors = [];
  const where = q?.id ? `[${q.id}]` : '[question with no id]';
  if (!isMcqQuestion(q)) {
    errors.push(`${where} type is not 'mcq'`);
    return errors;
  }
  const options = Array.isArray(q.options) ? q.options : [];
  if (options.length < 3) errors.push(`${where} needs at least 3 options, has ${options.length}`);

  const seen = new Set();
  options.forEach((o, i) => {
    if (!o || typeof o.id !== 'string' || !o.id.trim()) {
      errors.push(`${where} option ${i} has no string id`);
      return;
    }
    if (seen.has(o.id)) errors.push(`${where} duplicate option id '${o.id}'`);
    seen.add(o.id);
    if (typeof o.text !== 'string' || !o.text.trim()) errors.push(`${where} option '${o.id}' has no text`);
    if (requireTr && (typeof o.text_tr !== 'string' || !o.text_tr.trim())) {
      errors.push(`${where} option '${o.id}' has no text_tr`);
    }
  });

  if (typeof q.correctOptionId !== 'string' || !q.correctOptionId.trim()) {
    errors.push(`${where} has no correctOptionId`);
  } else if (!seen.has(q.correctOptionId)) {
    errors.push(`${where} correctOptionId '${q.correctOptionId}' is not one of the options`);
  }

  if (typeof q.explanation !== 'string' || !q.explanation.trim()) {
    errors.push(`${where} has no explanation`);
  }
  if (requireTr && (typeof q.explanation_tr !== 'string' || !q.explanation_tr.trim())) {
    errors.push(`${where} has no explanation_tr`);
  }
  if (q.solution !== undefined) {
    errors.push(`${where} is an MCQ but carries a 'solution' — the runner would try to execute it`);
  }
  return errors;
}

/**
 * Move a radio-group selection with the arrow keys. Pure so the keyboard
 * behaviour is testable: returns the id that should become selected, wrapping
 * at both ends. Returns the current id when the key is not a navigation key.
 */
export function nextOptionId(options, currentId, key) {
  const ids = (Array.isArray(options) ? options : []).map(o => o?.id).filter(Boolean);
  if (ids.length === 0) return currentId ?? null;
  const forward = key === 'ArrowDown' || key === 'ArrowRight';
  const back = key === 'ArrowUp' || key === 'ArrowLeft';
  if (!forward && !back) return currentId ?? null;
  const at = ids.indexOf(currentId);
  if (at === -1) return forward ? ids[0] : ids[ids.length - 1];
  const next = forward ? (at + 1) % ids.length : (at - 1 + ids.length) % ids.length;
  return ids[next];
}
