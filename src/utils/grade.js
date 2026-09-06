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

// THE SECOND INCIDENT (2026-09-06) — ties inside an ORDER BY.
//
// Feedback #6, a 131-solve job-ready user on challenge 121: "The expected
// output is sorted differently for those with 4 orders than those with 3."
// 121's solution ends `ORDER BY distinct_months DESC, total_orders DESC` with
// no tiebreaker, so customers tied on both keys come out in whatever order
// the engine's GROUP BY happened to produce; a correct query whose ties land
// differently was marked wrong. He abandoned the challenge. The first fix
// above does not cover this — a top-level ORDER BY kept the compare strictly
// sequential — so ordered mode is now TIE-TOLERANT: the SEQUENCE of sort-key
// tuples must match exactly (the asked-for order is enforced) and the
// multiset of full rows must match (tied rows may come in any order).
//
// Sort keys are resolved to output columns only when every ORDER BY term is
// a plain identifier / alias / positional number; an expression (COUNT(*),
// LOWER(name)…) or a key that is not an output column makes the term
// unresolvable and the compare falls back to the strict sequence — never
// looser than before, only stricter than necessary in the cases we cannot
// read. Adding a tiebreaker to the solution is still the right content fix.

// Text after the LAST top-level ORDER BY, cut at a top-level LIMIT/OFFSET/;.
function topLevelOrderByClause(clean) {
  const re = /\(|\)|\border\s+by\b|\blimit\b|\boffset\b|;/gi;
  let depth = 0;
  let m;
  let start = -1;
  let end = -1;
  while ((m = re.exec(clean)) !== null) {
    const tok = m[0];
    if (tok === '(') { depth++; continue; }
    if (tok === ')') { depth = Math.max(0, depth - 1); continue; }
    if (depth !== 0) continue;
    if (/^order/i.test(tok)) { start = m.index + tok.length; end = -1; continue; }
    if (start >= 0 && end < 0) end = m.index; // first LIMIT/OFFSET/; after it
  }
  if (start < 0) return null;
  return clean.slice(start, end < 0 ? clean.length : end);
}

function splitTopLevelCommas(text) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += ch;
  }
  parts.push(cur);
  return parts.map(p => p.trim()).filter(Boolean);
}

// Returns [{ key, dir }] — key is a lowercase identifier (qualifier stripped)
// or a positive integer for positional terms — or null when the solution has
// no top-level ORDER BY or any term is not a plain identifier/number.
export function parseOrderByKeys(sql) {
  const clean = stripSqlLiteralsAndComments(sql);
  const clause = topLevelOrderByClause(clean);
  if (clause == null) return null;
  const terms = splitTopLevelCommas(clause);
  if (!terms.length) return null;
  const out = [];
  for (const raw of terms) {
    let t = raw.replace(/\s+nulls\s+(first|last)\s*$/i, '').trim();
    let dir = 'asc';
    const dm = t.match(/\s+(asc|desc)\s*$/i);
    if (dm) { dir = dm[1].toLowerCase(); t = t.slice(0, dm.index).trim(); }
    if (/^\d+$/.test(t)) { out.push({ key: Number(t), dir }); continue; }
    const ident = t.match(/^(?:[A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*)$/);
    if (!ident) return null;
    out.push({ key: ident[1].toLowerCase(), dir });
  }
  return out;
}

// Map parsed keys onto the expected result's column indices; null if any key
// cannot be found (then the caller falls back to the strict sequence).
function resolveKeyIndices(keys, columns) {
  if (!keys || !Array.isArray(columns) || !columns.length) return null;
  const lower = columns.map(c => String(c).toLowerCase());
  const idx = [];
  for (const k of keys) {
    if (typeof k.key === 'number') {
      if (k.key < 1 || k.key > columns.length) return null;
      idx.push(k.key - 1);
      continue;
    }
    // Prefer an exact output-column match; also accept a qualified output
    // name like "c.name" whose last segment matches.
    let i = lower.indexOf(k.key);
    if (i < 0) i = lower.findIndex(c => c.split('.').pop() === k.key);
    if (i < 0) return null;
    idx.push(i);
  }
  return idx;
}

const keyTuple = (row, idx) => JSON.stringify(idx.map(i => row[i]));

// The one grading comparison. userRows / expectedRows are sql.js `values`
// arrays (array of row arrays; pass [] for an empty result). solutionSql is
// the reference solution — its top-level ORDER BY (or absence) decides
// whether order counts. expectedColumns (sql.js `columns` of the reference
// result) lets ordered mode tolerate ties; without it ordered mode is strict.
export function resultsMatch(userRows, expectedRows, solutionSql, expectedColumns) {
  const u = userRows || [];
  const e = expectedRows || [];
  if (u.length !== e.length) return false;
  if (!solutionRequiresOrder(solutionSql)) {
    return JSON.stringify(sortRowsCanonical(u)) === JSON.stringify(sortRowsCanonical(e));
  }
  if (JSON.stringify(u) === JSON.stringify(e)) return true; // exact order always passes
  const idx = resolveKeyIndices(parseOrderByKeys(solutionSql), expectedColumns);
  if (!idx) return false; // keys unreadable → strict, as before
  // Same rows (as a multiset) AND the same sequence of sort-key tuples: the
  // requested order is honoured, tied rows may sit in any order.
  if (JSON.stringify(sortRowsCanonical(u)) !== JSON.stringify(sortRowsCanonical(e))) return false;
  for (let i = 0; i < e.length; i++) {
    if (keyTuple(u[i], idx) !== keyTuple(e[i], idx)) return false;
  }
  return true;
}
