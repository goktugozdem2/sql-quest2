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

/**
 * One sentence on what went wrong with a mock answer, for the results
 * screen and the feedback overlay (founder QA 2026-09-19, item 5: the
 * Fundamentals mock showed "Your Answer / Correct Solution" side by side and
 * nothing else; the Capital One MCQs carry an explanation for every option).
 *
 * An MCQ answer keeps its authored explanation. A written answer is read by
 * the same diagnosis engine the challenge page uses, fed the question's own
 * concepts so a window question is diagnosed as one. Pure: pass the engine in.
 *
 * @param {object} a  the answer object submitInterviewAnswer builds
 * @param {{diagnose: Function, hint: Function}} engine  diagnoseResult / primaryHint
 * @returns {{sentence: string, hint: string|null}|null}  null for a correct answer
 */
export function mockMistakeDiagnosis(a, engine) {
  if (!a || a.correct) return null;
  const mcq = isMcqQuestion({ type: a.questionType });
  if (a.skipped) return { sentence: 'Skipped: no answer was submitted, so no points.', hint: mcq && a.explanation ? a.explanation : null };
  if (mcq) {
    return a.explanation ? { sentence: a.explanation, hint: null } : null;
  }
  const query = String(a.userQuery || '').trim();
  if (!query) {
    return a.timedOut
      ? { sentence: 'Time ran out before an answer was submitted.', hint: null }
      : { sentence: 'No answer was submitted.', hint: null };
  }
  if (!engine || typeof engine.diagnose !== 'function') return null;
  const ctx = { topics: a.concepts || [], query, solution: a.correctSolution || '' };
  let d;
  try {
    d = engine.diagnose(
      a.userOutput || { columns: [], rows: [] },
      a.expectedOutput || { columns: [], rows: [] },
      a.userError || null,
      ctx,
    );
  } catch (_) { d = null; }
  if (!d || d.kind === 'identical') return { sentence: 'The query ran, but its result did not match the expected output.', hint: null };
  let hint;
  try { hint = engine.hint ? engine.hint(d, { ...ctx, description: a.questionDescription || '' }) : null; } catch (_) { hint = null; }
  // Name the rows (founder QA 2026-09-19, item 5): "missing rows, WHERE
  // stricter than the question" said nothing a candidate could act on when
  // the lost row was 2026-04-30 and the cause a text BETWEEN.
  let rows;
  try { rows = engine.rows ? engine.rows(a.userOutput, a.expectedOutput, 3) : null; } catch (_) { rows = null; }
  const show = (r) => (Array.isArray(r) ? r.map(v => (v === null || v === undefined ? 'NULL' : String(v))).join(' · ') : '');
  let sentence = d.headline;
  if (rows && rows.missingTotal > 0 && rows.extraTotal === 0) {
    sentence += `. Missing from yours: ${rows.missing.map(show).join('; ')}${rows.missingTotal > rows.missing.length ? ` (+${rows.missingTotal - rows.missing.length} more)` : ''}.`;
  } else if (rows && rows.extraTotal > 0 && rows.missingTotal === 0) {
    sentence += `. Extra in yours: ${rows.extra.map(show).join('; ')}${rows.extraTotal > rows.extra.length ? ` (+${rows.extraTotal - rows.extra.length} more)` : ''}.`;
  }
  return { sentence, hint: hint && hint !== d.headline ? hint : null, rows };
}

/**
 * Focus areas from mock history (founder QA 2026-09-19, item 13). The old
 * read counted every concept of every missed question — a skipped question
 * about window functions made "Window Functions" a focus area although it
 * was never attempted, and a question missed on HAVING made its GROUP BY a
 * focus area although the GROUP BY was right. Now: only attempted questions
 * count (a skip or an empty timeout is not evidence), and a concept is weak
 * only when it was missed more often than it was answered correctly.
 *
 * @param {Array} history  interviewHistory entries ({ questionResults | mistakes })
 * @param {number} limit
 * @returns {string[]} concepts, weakest first
 */
export function weakConceptsFromHistory(history, limit = 3) {
  const miss = new Map();
  const ok = new Map();
  // Submitted, not skipped and not timed out: a timed-out question was never
  // submitted, even with a half-written query in the box (round 4, item 3),
  // and before 2026-09-19 a Skip was stored as a time-out.
  const attempted = (a) => !a.skipped && !a.timedOut && (
    a.questionType === QUESTION_TYPE_MCQ ? !!a.selectedOptionId : String(a.userQuery || '').trim().length > 0
  );
  for (const result of (history || [])) {
    const answers = Array.isArray(result?.questionResults) && result.questionResults.length > 0
      ? result.questionResults
      : (result?.mistakes || []).map(m => ({ ...m, correct: false }));
    for (const a of answers) {
      if (!a) continue;
      const concepts = Array.isArray(a.concepts) ? a.concepts : [];
      if (a.correct) { for (const c of concepts) ok.set(c, (ok.get(c) || 0) + 1); continue; }
      if (!attempted(a)) continue;
      for (const c of concepts) miss.set(c, (miss.get(c) || 0) + 1);
    }
  }
  return [...miss.entries()]
    .map(([c, m]) => [c, m - (ok.get(c) || 0)])
    .filter(([, net]) => net > 0)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([c]) => c);
}
