// What the AI tutor is told, beyond the lesson (2026-09-19, founder QA
// items 1–2). Pure: no React, no fetch.
//
// SQLITE_TUTOR_RULES rides on EVERY tutor call (callAI appends it). The
// study session's concept step printed
//   WHERE timestamp_col BETWEEN 'YYYY-MM-01' AND 'YYYY-MM-31'
// as "Key syntax" — the exact trap the Capital One mock's Q8 teaches as
// wrong and Q9 marks down. Our timestamps are ISO strings; a bare-date upper
// bound drops the last day.
//
// buildMistakeContextBlock turns one wrong mock answer into the block the
// study prompts carry, so "why was my query wrong?" is answered about the
// query, not with "paste what you wrote".

import { dateUpperBoundTrap, rowDiffSummary } from './diagnose.js';

export const SQLITE_TUTOR_RULES = `SQL RULES FOR EVERY EXAMPLE YOU WRITE (SQLite):
- Timestamp columns in these datasets are ISO-8601 TEXT, e.g. '2026-04-30T11:21:24.844Z'. NEVER filter them with BETWEEN 'YYYY-MM-01' AND 'YYYY-MM-31' or <= 'YYYY-MM-DD': text comparison puts '2026-04-30T11:21Z' after '2026-04-30', so the last day is silently lost. To filter a month use strftime('%Y-%m', col) = 'YYYY-MM'; for a range use col >= 'YYYY-MM-DD' AND col < 'next-day' (strict <), or DATE(col) BETWEEN 'a' AND 'b'.
- Use strftime for date parts and || for string concatenation. Integer / integer is integer division: write 100.0 * x / y.`;

const cell = (v) => (v === null || v === undefined ? 'NULL' : String(v));
const rowText = (r) => (Array.isArray(r) ? r.map(cell).join(' | ') : '');
const stripMd = (s) => String(s || '').replace(/\*\*(.*?)\*\*/g, '$1');

/**
 * The study-session context for one wrong mock answer.
 * @param {object} m  a results-screen mistake ({questionTitle, questionDescription,
 *   questionType, userQuery, correctSolution, explanation, userOutput,
 *   expectedOutput, userError, diagnosis, dataset, concepts})
 * @returns {object|null}
 */
export function mistakeStudyContext(m) {
  if (!m) return null;
  const isMcq = m.questionType === 'mcq';
  const rows = isMcq ? null : rowDiffSummary(m.userOutput, m.expectedOutput, 3);
  const trap = isMcq ? null : dateUpperBoundTrap(m.userQuery);
  return {
    title: m.questionTitle || '',
    question: stripMd(m.questionDescription),
    isMcq,
    userAnswer: String(m.userQuery || '').trim(),
    correct: String(m.correctSolution || '').trim(),
    explanation: m.explanation || '',
    error: m.userError || null,
    diagnosis: m.diagnosis?.sentence || null,
    diagnosisHint: trap || m.diagnosis?.hint || null,
    rows,
    dataset: m.dataset || null,
    concepts: Array.isArray(m.concepts) ? m.concepts : [],
  };
}

/** The prompt block. Empty string for no context. */
export function buildMistakeContextBlock(ctx) {
  if (!ctx) return '';
  const lines = [
    'THE STUDENT\'S MISTAKE (from a timed mock interview — this is what the session is about):',
    `Question: ${ctx.title}${ctx.question ? ` — ${ctx.question}` : ''}`,
  ];
  if (ctx.isMcq) {
    lines.push(`They picked: ${ctx.userAnswer || '(no answer)'}`);
    lines.push(`Correct answer: ${ctx.correct}`);
    if (ctx.explanation) lines.push(`Why: ${ctx.explanation}`);
  } else {
    lines.push(`Their query:\n\`\`\`sql\n${ctx.userAnswer || '(no answer submitted)'}\n\`\`\``);
    lines.push(`Reference solution:\n\`\`\`sql\n${ctx.correct}\n\`\`\``);
    if (ctx.error) lines.push(`Their query failed with: ${ctx.error}`);
    if (ctx.diagnosis) lines.push(`Diagnosis: ${ctx.diagnosis}`);
    if (ctx.diagnosisHint) lines.push(`Cause / fix: ${ctx.diagnosisHint}`);
    if (ctx.rows) {
      const cols = ctx.rows.columns.join(' | ');
      if (ctx.rows.missingTotal > 0) lines.push(`Rows the reference returns and theirs does not (${ctx.rows.missingTotal}), columns ${cols}:\n${ctx.rows.missing.map(rowText).join('\n')}`);
      if (ctx.rows.extraTotal > 0) lines.push(`Rows theirs returns and the reference does not (${ctx.rows.extraTotal}), columns ${cols}:\n${ctx.rows.extra.map(rowText).join('\n')}`);
    }
  }
  lines.push('You can see their query above. Never ask them to paste it. Talk about THEIR query: name the exact clause, the exact rows it loses or adds, and the smallest change that fixes it.');
  return lines.join('\n');
}

/** The first tutor turn for a mistake: explain it, fix it, one rule. */
export function mistakeOpeningPrompt(ctx) {
  if (!ctx) return null;
  return ctx.isMcq
    ? 'Explain why the option I picked is wrong and why the correct one is right, in under 120 words. End with one rule to remember.'
    : `Explain what went wrong with my query in under 150 words, in three short parts:
**What your query did** — the exact clause, and the exact rows it lost or added (use the rows given).
**The fix** — my query with the smallest change, in a sql block.
**The rule** — one sentence to remember.`;
}
