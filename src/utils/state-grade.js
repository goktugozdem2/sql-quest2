// State-graded challenges (C6, 2026-11-22): the DML / DDL answer type.
//
// A SELECT challenge is graded on the rows a query returns. A DML or DDL
// answer changes STATE instead, so it is graded on what the tables hold
// afterwards:
//
//   1. a fresh in-memory copy of the challenge's dataset (never the shared
//      `db` — the same rule the ticket exercises follow with ticketDbFor),
//   2. the challenge's `setup` (ours: scaffolding tables, FK enforcement),
//   3. the person's statements, after `checkStatements` let them through,
//   4. the challenge's `probe` statements, each tried alone with its error
//      swallowed — rows that a correct schema must reject,
//   5. the challenge's `check` (a SELECT), compared with the same pipeline run
//      on the reference solution through the app's one comparator.
//
// Schema of a state challenge (all optional except grade + check):
//   grade:   'state'
//   setup:   SQL run first on every copy
//   check:   SELECT that reads the resulting state; ORDER BY decides ordering
//   allow:   statement kinds the person may run, e.g. ['UPDATE']; SELECT and
//            WITH … SELECT are always allowed
//   creates: table names the person's statements may create
//   probe:   [{ label, sql }] statements that must fail on a correct schema
//   checkTable: the table the diagnosis names (default creates[0] / tables[0])
//
// Always refused, whatever `allow` says: DROP, ATTACH, DETACH, PRAGMA, VACUUM,
// REINDEX, ANALYZE, any statement we cannot classify, any sqlite_* or
// pragma_* name, and any table outside the challenge's tables + `creates`.
//
// Pure: no React, no app state. `makeDb()` hands back a fresh sql.js (or
// sql.js-compatible) Database already loaded with the challenge's tables;
// every database opened here is closed here.

/** Remove comments and the contents of string literals (kept as ''). */
export function stripSql(sql) {
  let out = '';
  const s = String(sql || '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '-' && s[i + 1] === '-') { while (i < s.length && s[i] !== '\n') i++; out += '\n'; continue; }
    if (ch === '/' && s[i + 1] === '*') { i += 2; while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++; i++; out += ' '; continue; }
    if (ch === "'") { i++; while (i < s.length) { if (s[i] === "'" && s[i + 1] === "'") { i += 2; continue; } if (s[i] === "'") break; i++; } out += "''"; continue; }
    // Quoted identifiers ("…" with "" escapes, `…`, […]) are copied through
    // whole, so a quote character inside one can never open a fake string
    // that hides the statements after it (A1's bypass on #172).
    if (ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch;
      let j = i + 1;
      while (j < s.length) { if (s[j] === close && close !== ']' && s[j + 1] === close) { j += 2; continue; } if (s[j] === close) break; j++; }
      out += s.slice(i, j + 1);
      i = j;
      continue;
    }
    out += ch;
  }
  return out;
}

/** Split on semicolons at parenthesis depth 0, after stripping. */
export function splitStatements(sql) {
  const s = stripSql(sql);
  const parts = [];
  let depth = 0, cur = '', q = null;
  for (const ch of s) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
    if (ch === '[') { q = ']'; cur += ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { if (cur.trim()) parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

const LEAD = /^(CREATE\s+(?:TEMP\s+|TEMPORARY\s+)?(?:UNIQUE\s+)?(?:VIRTUAL\s+)?(?:TABLE|INDEX|VIEW|TRIGGER)|ALTER\s+TABLE|DROP|INSERT|UPDATE|DELETE|REPLACE|BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE|EXPLAIN|PRAGMA|ATTACH|DETACH|VACUUM|REINDEX|ANALYZE|SELECT|VALUES)\b/;

/** The statement's kind, from its leading keyword(s); a WITH prefix is looked through. */
export function statementKind(stmt) {
  const t = String(stmt).replace(/\s+/g, ' ').trim().toUpperCase();
  if (/^WITH\b/.test(t)) {
    let depth = 0;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '(') depth++;
      else if (t[i] === ')') depth--;
      else if (depth === 0 && i > 0 && /[\s)]/.test(t[i - 1])) {
        const m = /^(INSERT|UPDATE|DELETE|REPLACE|SELECT)\b/.exec(t.slice(i));
        if (m) return m[1] === 'REPLACE' ? 'INSERT' : m[1];
      }
    }
    return 'OTHER';
  }
  const m = LEAD.exec(t);
  if (!m) return 'OTHER';
  let k = m[1].replace(/\s+/g, ' ').replace(/ (TEMP|TEMPORARY|UNIQUE|VIRTUAL)(?= )/g, '');
  if (k === 'REPLACE') k = 'INSERT'; // REPLACE INTO is INSERT OR REPLACE
  if (k === 'VALUES') k = 'SELECT';
  return k;
}

export const ALWAYS_FORBIDDEN = ['DROP', 'ATTACH', 'DETACH', 'PRAGMA', 'VACUUM', 'REINDEX', 'ANALYZE', 'OTHER'];

const IDENT = /"([^"]+)"|`([^`]+)`|\[([^\]]+)\]|([A-Za-z_][A-Za-z0-9_$]*)/y;
const STOP = new Set(['WHERE', 'GROUP', 'ORDER', 'LIMIT', 'HAVING', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS', 'NATURAL', 'ON', 'USING', 'UNION', 'EXCEPT', 'INTERSECT', 'WINDOW', 'SET', 'VALUES', 'SELECT', 'DEFAULT', 'RETURNING', 'AS', 'OUTER']);

function tokens(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }
    IDENT.lastIndex = i;
    const m = IDENT.exec(s);
    if (m) { out.push({ id: m[1] ?? m[2] ?? m[3] ?? m[4], quoted: !m[4] }); i = IDENT.lastIndex; continue; }
    out.push({ p: s[i] }); i++;
  }
  return out;
}

/** Every table name a statement reads or writes (FROM / JOIN / INTO / UPDATE / TABLE / REFERENCES / INDEX … ON). */
export function referencedTables(stmt) {
  const t = tokens(stripSql(stmt));
  const up = x => (x && x.id ? x.id.toUpperCase() : null);
  const names = [];
  const cte = new Set();
  // CTE names: WITH [RECURSIVE] name [(cols)] AS ( … ) , name AS ( … )
  for (let i = 1; i < t.length; i++) {
    const prev = up(t[i - 1]);
    const starts = prev === 'WITH' || prev === 'RECURSIVE' || (t[i - 1].p === ',' && t[i - 2]?.p === ')');
    if (!starts || !t[i].id) continue;
    let j = i + 1;
    if (t[j]?.p === '(') { let d = 0; for (; j < t.length; j++) { if (t[j].p === '(') d++; if (t[j].p === ')' && --d === 0) { j++; break; } } }
    if (up(t[j]) === 'AS') cte.add(t[i].id.toLowerCase());
  }
  const takeName = j => {
    // optional IF [NOT] EXISTS, optional schema.
    if (up(t[j]) === 'IF') { j++; if (up(t[j]) === 'NOT') j++; if (up(t[j]) === 'EXISTS') j++; }
    if (up(t[j]) === 'OR' && t[j + 1]?.id) j += 2; // UPDATE OR IGNORE t
    if (!t[j] || !t[j].id) return { j, name: null };
    let name = t[j].id;
    if (t[j + 1]?.p === '.' && t[j + 2]?.id) { name = `${t[j].id}.${t[j + 2].id}`; j += 2; }
    return { j: j + 1, name };
  };
  for (let i = 0; i < t.length; i++) {
    const k = up(t[i]);
    if (!k || t[i].quoted) continue;
    if (k === 'FROM' || k === 'JOIN') {
      let j = i + 1;
      // a comma list of table refs: name [AS] [alias] , name …
      for (;;) {
        if (t[j]?.p === '(') break; // subquery or table function
        const r = takeName(j);
        if (!r.name) break;
        if (STOP.has(r.name.toUpperCase())) break;
        if (t[r.j]?.p === '(') { names.push(r.name); break; } // table-valued function, e.g. pragma_table_info(...)
        names.push(r.name);
        j = r.j;
        if (up(t[j]) === 'AS') j++;
        if (t[j]?.id && !STOP.has(up(t[j]))) j++; // alias
        if (t[j]?.p === ',') { j++; continue; }
        break;
      }
    } else if (k === 'INTO' || k === 'TABLE' || k === 'REFERENCES') {
      const r = takeName(i + 1);
      if (r.name && !STOP.has(r.name.toUpperCase())) names.push(r.name);
    } else if (k === 'UPDATE') {
      if (up(t[i - 1]) === 'DO') continue; // ON CONFLICT … DO UPDATE SET
      const r = takeName(i + 1);
      if (r.name && !STOP.has(r.name.toUpperCase())) names.push(r.name);
    } else if (k === 'ON' && t.slice(Math.max(0, i - 6), i).some(x => up(x) === 'INDEX')) {
      const r = takeName(i + 1);
      if (r.name) names.push(r.name);
    }
  }
  return [...new Set(names.map(n => n.toLowerCase()).filter(n => !cte.has(n)))];
}

/** Lower-cased table names the person may touch. */
export function allowedTables(challenge, loadedTables = []) {
  // tables the challenge's own setup creates (scaffolding such as vip_list) count as the challenge's
  const scaffold = splitStatements(challenge.setup || '')
    .filter(s => statementKind(s) === 'CREATE TABLE')
    .flatMap(s => referencedTables(s).slice(0, 1));
  return new Set([...(challenge.tables || []), ...loadedTables, ...(challenge.creates || []), ...scaffold].map(x => String(x).toLowerCase()));
}

/**
 * Gate the person's code before it runs. Returns { ok: true, kinds } or
 * { ok: false, reason, kind?, table?, message }.
 */
export function checkStatements(sql, challenge, loadedTables = []) {
  const stmts = splitStatements(sql);
  if (!stmts.length) return { ok: false, reason: 'empty', message: 'Write at least one statement.' };
  const allow = new Set(['SELECT', ...(challenge.allow || []).map(x => String(x).toUpperCase())]);
  const tables = allowedTables(challenge, loadedTables);
  const kinds = [];
  for (const s of stmts) {
    const kind = statementKind(s);
    kinds.push(kind);
    if (ALWAYS_FORBIDDEN.includes(kind)) {
      return { ok: false, reason: 'forbidden', kind, message: kind === 'OTHER' ? 'This statement is not allowed in this challenge.' : `${kind} is not allowed in this challenge.` };
    }
    if (!allow.has(kind)) {
      return { ok: false, reason: 'not_allowed', kind, message: `${kind} is not allowed in this challenge. Allowed here: ${[...allow].join(', ')}.` };
    }
    for (const name of referencedTables(s)) {
      if (name.includes('.') && !name.startsWith('main.')) return { ok: false, reason: 'unknown_table', table: name, message: `Only this challenge's tables can be used (${name} is not one of them).` };
      const bare = name.replace(/^main\./, '');
      if (bare.startsWith('sqlite_') || bare.startsWith('pragma_') || !tables.has(bare)) {
        return { ok: false, reason: 'unknown_table', table: bare, message: `Only this challenge's tables can be used (${bare} is not one of them).` };
      }
    }
  }
  return { ok: true, kinds };
}

/** The per-statement gate the run applies: null to let a statement run, the refusal otherwise. */
function gateFor(challenge, loadedTables) {
  return text => { const g = checkStatements(text, challenge, loadedTables); return g.ok ? null : g; };
}

export const isStateGraded = c => !!c && c.grade === 'state' && typeof c.check === 'string';

const shape = r => (r && r.length ? { columns: r[r.length - 1].columns, rows: r[r.length - 1].values } : { columns: [], rows: [] });

// Run `sql` statement by statement as SQLite itself splits it (sql.js
// iterateStatements), gating each statement's own text before it runs. The
// text gate in checkStatements is a fast, friendly refusal; this is the
// guarantee: no statement executes that the gate did not see on its own, so
// a parser gap can never smuggle one through. Engines without the iterator
// fall back to exec after the text gate.
export function execGated(db, sql, gateOne) {
  if (!gateOne || typeof db.iterateStatements !== 'function') return shape(db.exec(sql));
  let last = { columns: [], rows: [] };
  for (const stmt of db.iterateStatements(sql)) {
    try {
      const refused = gateOne(stmt.getSQL());
      if (refused) { const e = new Error(refused.message); e.refused = refused; throw e; }
      const rows = [];
      while (stmt.step()) rows.push(stmt.get());
      if (rows.length) last = { columns: stmt.getColumnNames(), rows };
    } finally {
      stmt.free();
    }
  }
  return last;
}

function runSide(makeDb, challenge, sql, gateOne = null) {
  const db = makeDb();
  try {
    if (challenge.setup) db.exec(challenge.setup);
    let last = { columns: [], rows: [] };
    let error = null;
    let refused = null;
    try { last = execGated(db, sql, gateOne); } catch (e) { if (e && e.refused) refused = e.refused; else error = String(e && e.message || e); }
    if (refused) return { refused, last, error: null, accepted: [], check: { columns: [], rows: [] }, checkError: null };
    const accepted = [];
    if (!error) {
      for (const p of challenge.probe || []) {
        try { db.exec(p.sql); accepted.push(p.label); } catch { /* rejected: what a correct schema does */ }
      }
    }
    let check = { columns: [], rows: [] };
    let checkError = null;
    try { check = shape(db.exec(challenge.check)); } catch (e) { checkError = String(e && e.message || e); }
    return { last, error, accepted, check, checkError };
  } finally {
    try { db.close(); } catch { /* already closed */ }
  }
}

/** Run the person's code on a fresh copy and return what the tables hold (for Run). */
export function runStateAttempt({ makeDb, challenge, sql, loadedTables = [] }) {
  const gate = checkStatements(sql, challenge, loadedTables);
  if (!gate.ok) return { refused: gate };
  return runSide(makeDb, challenge, sql, gateFor(challenge, loadedTables));
}

export function checkTableOf(challenge) {
  return challenge.checkTable || (challenge.creates && challenge.creates[0]) || (challenge.tables && challenge.tables[0]) || 'table';
}

/**
 * Grade one attempt. `compare(userRows, expectedRows, checkSql, expectedColumns)`
 * is the app's comparator (resultsMatch in src/utils/grade.js).
 * Returns { passed, refused?, error?, user, expected, diagnosis }.
 */
export function gradeStateChallenge({ makeDb, challenge, sql, compare, loadedTables = [] }) {
  const gate = checkStatements(sql, challenge, loadedTables);
  if (!gate.ok) {
    return { passed: false, refused: gate, error: gate.message, diagnosis: stateDiagnosis({ refused: gate }, challenge) };
  }
  const expected = runSide(makeDb, challenge, challenge.solution);
  if (expected.error || expected.checkError) throw new Error(`state challenge #${challenge.id}: reference failed: ${expected.error || expected.checkError}`);
  const user = runSide(makeDb, challenge, sql, gateFor(challenge, loadedTables));
  if (user.refused) return { passed: false, refused: user.refused, error: user.refused.message, user, expected, diagnosis: stateDiagnosis({ refused: user.refused }, challenge) };
  if (user.error) return { passed: false, error: user.error, user, expected, diagnosis: null };
  const passed = !user.checkError
    && user.accepted.length === expected.accepted.length
    && compare(user.check.rows, expected.check.rows, challenge.check, expected.check.columns);
  return { passed, user, expected, diagnosis: passed ? null : stateDiagnosis({ user, expected }, challenge) };
}

/**
 * The wrong-answer sentence, in the shape the challenge page renders
 * (kind / headline / details / hints). It speaks about the table, never
 * about a SELECT's output.
 */
export function stateDiagnosis({ refused, user, expected }, challenge, lang = 'en') {
  const tr = lang === 'tr';
  const table = checkTableOf(challenge);
  if (refused) {
    return {
      kind: 'state_refused',
      headline: tr ? 'Bu ifade bu challenge\'da çalıştırılamaz' : 'That statement is not allowed here',
      details: refused.message,
      hints: [],
    };
  }
  if (user.checkError) {
    return {
      kind: 'state_missing',
      headline: tr ? `\`${table}\` okunamadı` : `\`${table}\` could not be read after your statements`,
      details: user.checkError,
      hints: [],
    };
  }
  const extra = user.accepted.filter(l => !expected.accepted.includes(l));
  if (extra.length) {
    return {
      kind: 'state_constraint',
      headline: tr ? 'Reddedilmesi gereken bir satır tabloya girdi' : 'A row that should have been rejected got in',
      details: tr ? `Tablon şu satırı kabul etti: ${extra[0]}.` : `Your table accepted: ${extra[0]}.`,
      hints: [],
    };
  }
  const missing = expected.accepted.filter(l => !user.accepted.includes(l));
  if (missing.length) {
    return {
      kind: 'state_rejected_valid',
      headline: tr ? 'Tablon geçerli bir satırı reddetti' : 'Your table rejected a valid row',
      details: tr ? `Kabul edilmesi gereken satır reddedildi: ${missing[0]}.` : `This row should have been accepted: ${missing[0]}.`,
      hints: [],
    };
  }
  const n = user.check.rows.length;
  const m = expected.check.rows.length;
  if (n !== m) {
    return {
      kind: 'state_row_count',
      headline: tr ? `\`${table}\` tablon ${n} satırla bitti, beklenen ${m}` : `Your table ended up with ${n} row${n === 1 ? '' : 's'}, expected ${m}`,
      details: tr
        ? (n > m ? 'Fazla satır kaldı ya da eklendi.' : 'Bazı satırlar eksik.')
        : (n > m ? `\`${table}\` holds ${n - m} more row${n - m === 1 ? '' : 's'} than it should.` : `\`${table}\` is missing ${m - n} row${m - n === 1 ? '' : 's'}.`),
      hints: [],
    };
  }
  return {
    kind: 'state_values',
    headline: tr ? `\`${table}\` doğru satır sayısında (${n}), ama bazı değerler farklı` : `Your table has the right number of rows (${n}), but some values differ`,
    details: tr ? 'Hangi satırların değiştiğini Your Output ile Expected Output arasında karşılaştır.' : 'Compare Your Output with Expected Output to see which rows changed.',
    hints: [],
  };
}
