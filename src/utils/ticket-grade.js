// Grading a ticket (2026-10-04): the answer must CONTAIN the figures a PM
// asked for. Column names, order and extra columns do not matter; the grain
// does, through the row cap — a dump of the table is not an answer.
//
// Tolerance rule, written before the first ticket (the plan's open question):
//   - a number matches when |cell − value| ≤ tol;
//   - a `percent` figure also matches as a fraction (cell × 100);
//   - numeric strings count as numbers ("2.46", "2.46%");
//   - a text figure matches a cell equal to it, trimmed, case-insensitive.
// The feedback names missing figures by LABEL only — never a value.

import { TICKET_MAX_ROWS } from '../data/tickets.js';

const asNumber = (cell) => {
  if (typeof cell === 'number' && Number.isFinite(cell)) return cell;
  if (typeof cell === 'string') {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*%?\s*$/.exec(cell);
    if (m) return Number(m[1]);
  }
  return null;
};

export function numberMatches(cell, fig) {
  const n = asNumber(cell);
  if (n === null) return false;
  const tol = Math.max(0, fig.tol ?? 0) + 1e-9;
  if (Math.abs(n - fig.value) <= tol) return true;
  if (fig.percent && Math.abs(n * 100 - fig.value) <= tol) return true;
  return false;
}

export function textMatches(cell, fig) {
  return typeof cell === 'string' && cell.trim().toLowerCase() === String(fig.value).trim().toLowerCase();
}

// rows: array of row arrays (sql.js `values`). Returns
// { passed, tooManyRows, empty, found: [labels], missing: [labels] }.
export function gradeTicket(rows, expect, { maxRows = TICKET_MAX_ROWS } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const cells = list.flat();
  const figs = [
    ...((expect && expect.numbers) || []).map(f => ({ ...f, kind: 'number' })),
    ...((expect && expect.text) || []).map(f => ({ ...f, kind: 'text' })),
  ];
  if (list.length === 0) return { passed: false, empty: true, tooManyRows: false, found: [], missing: figs.map(f => f.label) };
  if (list.length > maxRows) return { passed: false, empty: false, tooManyRows: true, found: [], missing: figs.map(f => f.label) };
  const found = [];
  const missing = [];
  for (const f of figs) {
    const hit = cells.some(c => (f.kind === 'number' ? numberMatches(c, f) : textMatches(c, f)));
    (hit ? found : missing).push(f.label);
  }
  return { passed: missing.length === 0 && figs.length > 0, empty: false, tooManyRows: false, found, missing };
}

// The one sentence under the result. Labels only.
export function ticketFeedback(g) {
  if (!g) return '';
  if (g.passed) return 'Every figure the request needs is in your answer.';
  if (g.empty) return 'The query returned no rows. The request needs an answer with figures in it.';
  if (g.tooManyRows) return `That is ${TICKET_MAX_ROWS}+ rows. A PM wants the answer, not the table: aggregate down to the figures they asked for.`;
  const total = g.found.length + g.missing.length;
  return `${g.found.length} of ${total} figures found. Still missing: ${g.missing.join('; ')}.`;
}
