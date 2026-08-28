// SQL Quest — result grading: when does row order count?
//
// THE INCIDENT (2026-08-28)
//
// Payer #2's only product complaint, in writing, three minutes after his
// cancellation was confirmed: "The grader is too strict sometimes on
// ordering. Some questions prompts don't specify the correct order."
//
// He was right. Every grading site in app.jsx compared results with strict
// JSON.stringify equality over the row array — main challenge submit, speed
// run, interview mode, daily challenge, the AI-lesson exercises, the drills
// panel, foundation practice, and the 30-day path. Row order ALWAYS mattered,
// even when neither the prompt nor the reference solution contained an
// ORDER BY. Without an ORDER BY, SQL guarantees nothing about row order; a
// user whose correct un-ordered query happened to scan in a different order
// than the reference was told "wrong". A correct answer graded wrong is the
// worst grading bug there is — the user can't fix it, because nothing is
// broken.
//
// THE RULE, and why it lives in ONE file: the reference solution's SQL is the
// contract. A top-level ORDER BY in the solution means order is part of the
// answer and rows are compared in sequence. No top-level ORDER BY means order
// was never asked for, and rows are compared as a multiset (canonical sort of
// both sides, then strict compare). ORDER BY inside parentheses — a window
// OVER (...), a subquery, a CTE body — does not order the final result and
// does not count.
//
// The challenge-order incident (challenge-order.js) taught us what happens
// when a comparison fix lands at one call site: it grows back at the others.
// Every grading site imports from here; tests/grade.test.js carries a source
// guard that fails if a raw strict comparison reappears in app.jsx.

// Strip string literals, quoted identifiers, and comments so a textual
// ORDER BY inside 'a string', "an identifier", -- a comment, or /* block */
// can't trigger (or hide) order detection.
export function stripSqlLiteralsAndComments(sql) {
  const s = String(sql || '');
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const next = s[i + 1];
    if (ch === "'") {
      i++;
      while (i < s.length) {
        if (s[i] === "'" && s[i + 1] === "'") { i += 2; continue; } // '' escape
        if (s[i] === "'") { i++; break; }
        i++;
      }
      out += ' ';
      continue;
    }
    if (ch === '"') {
      i++;
      while (i < s.length && s[i] !== '"') i++;
      i++;
      out += ' ';
      continue;
    }
    if (ch === '-' && next === '-') {
      while (i < s.length && s[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i += 2;
      out += ' ';
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

// True when the solution's SQL has an ORDER BY at parenthesis depth 0 — the
// only place an ORDER BY orders the statement's final result. OVER (ORDER BY
// ...), ordered subqueries, and ordered CTE bodies all sit inside parens and
// are ignored; the final ORDER BY of a WITH ... SELECT is at depth 0 and
// counts.
export function solutionRequiresOrder(sql) {
  const clean = stripSqlLiteralsAndComments(sql);
  const re = /\(|\)|\border\s+by\b/gi;
  let depth = 0;
  let m;
  while ((m = re.exec(clean)) !== null) {
    if (m[0] === '(') depth++;
    else if (m[0] === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0) return true;
  }
  return false;
}

const rowKey = (row) => JSON.stringify(row);

// Canonical multiset order: serialize each row, sort lexicographically.
// Returns a new array; input untouched. Duplicated rows survive (multiset,
// not set), so [a,a,b] never matches [a,b,b].
export function sortRowsCanonical(rows) {
  return [...(rows || [])].sort((a, b) => {
    const ka = rowKey(a);
    const kb = rowKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

// The one grading comparison. userRows / expectedRows are sql.js `values`
// arrays (array of row arrays; pass [] for an empty result). solutionSql is
// the reference solution — its top-level ORDER BY (or absence) decides
// whether order counts.
export function resultsMatch(userRows, expectedRows, solutionSql) {
  const u = userRows || [];
  const e = expectedRows || [];
  if (u.length !== e.length) return false;
  if (solutionRequiresOrder(solutionSql)) {
    return JSON.stringify(u) === JSON.stringify(e);
  }
  return JSON.stringify(sortRowsCanonical(u)) === JSON.stringify(sortRowsCanonical(e));
}
