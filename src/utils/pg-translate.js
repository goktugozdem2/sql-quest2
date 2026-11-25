// SQLite → PostgreSQL: the PostgreSQL-mode spike (2026-11-22).
//
// Why: every query in SQL Quest runs on SQLite (sql.js). The screens our
// buyers sit run PostgreSQL, BigQuery, Snowflake or MySQL. dialect-notes.js
// explains the differences; a candidate who practises strftime and writes
// DATE_TRUNC on the day still meets them cold. The spike runs the bank on
// PGlite (Postgres compiled to WASM) — plan and numbers in
// docs/plans/postgres-mode-2026-11-22.md.
//
// This module is pure (no window, no PGlite): it holds
//   1. the schema rule — the app's tables typed the way a Postgres interview
//      database would type them (dates as DATE / TIMESTAMP, never TEXT);
//   2. the translator — a reference solution written for SQLite rewritten so
//      Postgres returns the SAME rows, so the existing comparator
//      (src/utils/grade.js) can grade a learner's Postgres query against it;
//   3. the row adapter — PGlite's result shape into the {columns, rows} shape
//      every grading site already reads.
//
// The translator is token-aware (string literals, quoted identifiers and
// comments are never touched) and conservative: what it cannot rewrite with
// the same meaning it leaves alone, and scripts/pg/build-allowlist.mjs runs
// every reference solution to find out which ones still match.

// ── 1. Schema ──────────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TS_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?$/;
const INT_STR_RE = /^-?(0|[1-9]\d*)$/;
const DEC_STR_RE = /^-?(0|[1-9]\d*)\.\d+$/;

// Postgres type for one column, from ALL its values (SQLite's affinity keeps
// 7.5 in an INTEGER column; Postgres would refuse it, so the whole column is
// read, not the first row the app's sql.js loader looks at).
export function pgColumnType(values) {
  let sawNum = false, sawFloat = false, sawStr = false, big = false, sawBool = false;
  let allDate = true, allTs = true, anyStr = false, allInt = true, allNum = true, bigStr = false;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'boolean') { sawBool = true; continue; }
    if (typeof v === 'number') {
      sawNum = true;
      if (!Number.isInteger(v)) sawFloat = true;
      else if (Math.abs(v) > 2147483647) big = true;
      continue;
    }
    sawStr = true;
    anyStr = true;
    const s = String(v);
    if (!DATE_RE.test(s)) allDate = false;
    if (!TS_RE.test(s)) allTs = false;
    // Numbers stored as strings (the NYC sets: year_built '1931'). A
    // Postgres interview database types them as numbers; a leading zero
    // (a zip code) keeps the column TEXT.
    if (!INT_STR_RE.test(s)) allInt = false;
    else if (Math.abs(Number(s)) > 2147483647) bigStr = true;
    if (!INT_STR_RE.test(s) && !DEC_STR_RE.test(s)) allNum = false;
  }
  if (sawStr && sawNum) return 'TEXT';
  if (anyStr && allDate) return 'DATE';
  if (anyStr && allTs) return 'TIMESTAMP';
  if (anyStr && !sawNum && allInt) return bigStr ? 'BIGINT' : 'INTEGER';
  if (anyStr && !sawNum && allNum) return 'DOUBLE PRECISION';
  if (sawStr) return 'TEXT';
  if (sawBool && !sawNum) return 'BOOLEAN';
  if (sawFloat) return 'DOUBLE PRECISION';
  if (sawNum) return big ? 'BIGINT' : 'INTEGER';
  return 'TEXT';
}

function sqlLiteral(v, type) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return type === 'BOOLEAN' ? (v ? 'TRUE' : 'FALSE') : (v ? '1' : '0');
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

// CREATE + INSERT for one table, as one SQL string for PGlite's exec().
// Rows go in batches of 500 so a 5,000-row table is ten statements.
export function pgTableSql(name, table) {
  const types = table.columns.map((_, i) => pgColumnType(table.data.map(r => r[i])));
  const cols = table.columns.map((c, i) => `${c} ${types[i]}`).join(', ');
  const out = [`DROP TABLE IF EXISTS ${name};`, `CREATE TABLE ${name} (${cols});`];
  for (let i = 0; i < table.data.length; i += 500) {
    const chunk = table.data.slice(i, i + 500)
      .map(r => `(${table.columns.map((_, j) => sqlLiteral(r[j], types[j])).join(',')})`);
    out.push(`INSERT INTO ${name} VALUES ${chunk.join(',')};`);
  }
  return out.join('\n');
}

// The same load plan the app's sql.js loader uses (challenge-datasets.js):
// [{dataset, tables|null}] → one SQL string.
export function pgLoadSql(plan, datasets) {
  const parts = [];
  for (const step of plan || []) {
    const ds = datasets && datasets[step.dataset];
    if (!ds) continue;
    for (const [name, t] of Object.entries(ds.tables)) {
      if (step.tables && !step.tables.includes(name)) continue;
      parts.push(pgTableSql(name, t));
    }
  }
  return parts.join('\n');
}

// Lower-case names of the plan's DATE / TIMESTAMP columns (the translator's
// dateColumns option).
export function pgDateColumns(plan, datasets) {
  const out = new Set();
  for (const step of plan || []) {
    const ds = datasets && datasets[step.dataset];
    if (!ds) continue;
    for (const [name, t] of Object.entries(ds.tables)) {
      if (step.tables && !step.tables.includes(name)) continue;
      t.columns.forEach((c, i) => {
        const ty = pgColumnType(t.data.map(r => r[i]));
        if (ty === 'DATE' || ty === 'TIMESTAMP') out.add(c.toLowerCase());
      });
    }
  }
  return out;
}

// Session settings every instance runs once: UTC, ISO dates (so a DATE comes
// back as '2024-01-15', the string the SQLite tables hold).
export const PG_SESSION_SQL = "SET TimeZone = 'UTC'; SET DateStyle = 'ISO, YMD'; SET IntervalStyle = 'postgres';";

// ── 2. Translator ──────────────────────────────────────────────────────────

// Tokens: {t, v}. t ∈ str | qid | cmt | ws | num | id | op | ( | ) | ,
export function tokenize(sql) {
  const s = String(sql || '');
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const n = s[i + 1];
    let j = i + 1;
    if (c === "'") {
      while (j < s.length) {
        if (s[j] === "'" && s[j + 1] === "'") { j += 2; continue; }
        if (s[j] === "'") { j++; break; }
        j++;
      }
      toks.push({ t: 'str', v: s.slice(i, j) });
    } else if (c === '"' || c === '`' || c === '[') {
      const close = c === '[' ? ']' : c;
      while (j < s.length && s[j] !== close) j++;
      j++;
      toks.push({ t: 'qid', v: s.slice(i, j) });
    } else if (c === '-' && n === '-') {
      while (j < s.length && s[j] !== '\n') j++;
      toks.push({ t: 'cmt', v: s.slice(i, j) });
    } else if (c === '/' && n === '*') {
      j = s.indexOf('*/', i + 2);
      j = j < 0 ? s.length : j + 2;
      toks.push({ t: 'cmt', v: s.slice(i, j) });
    } else if (/\s/.test(c)) {
      while (j < s.length && /\s/.test(s[j])) j++;
      toks.push({ t: 'ws', v: s.slice(i, j) });
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(n || ''))) {
      while (j < s.length && /[0-9.eE]/.test(s[j])) j++;
      toks.push({ t: 'num', v: s.slice(i, j) });
    } else if (/[A-Za-z_]/.test(c)) {
      while (j < s.length && /[A-Za-z0-9_$]/.test(s[j])) j++;
      toks.push({ t: 'id', v: s.slice(i, j) });
    } else if (c === '(' || c === ')' || c === ',') {
      toks.push({ t: c, v: c });
    } else {
      // two-char operators
      const two = s.slice(i, i + 2);
      if (['||', '<=', '>=', '<>', '!=', '==', '::'].includes(two)) j = i + 2;
      toks.push({ t: 'op', v: s.slice(i, j) });
    }
    i = j;
  }
  return toks;
}

const join = toks => toks.map(x => x.v).join('');
const isSkip = x => x.t === 'ws' || x.t === 'cmt';
const up = x => (x && x.t === 'id' ? x.v.toUpperCase() : '');

// Index of the ')' matching the '(' at `open`, or -1.
function matchParen(toks, open) {
  let d = 0;
  for (let k = open; k < toks.length; k++) {
    if (toks[k].t === '(') d++;
    else if (toks[k].t === ')') { d--; if (d === 0) return k; }
  }
  return -1;
}

// Split toks[a..b) on depth-0 commas.
function splitArgs(toks, a, b) {
  const args = [];
  let d = 0, start = a;
  for (let k = a; k < b; k++) {
    if (toks[k].t === '(') d++;
    else if (toks[k].t === ')') d--;
    else if (toks[k].t === ',' && d === 0) { args.push(toks.slice(start, k)); start = k + 1; }
  }
  args.push(toks.slice(start, b));
  return args.map(x => join(x)); // untrimmed: a call left alone keeps its text
}

// The text of a lone string literal, else null ('-' || n || ' days' is an
// expression, not a literal).
const unquote = s => {
  const toks = tokenize(s).filter(x => !isSkip(x));
  return toks.length === 1 && toks[0].t === 'str' ? toks[0].v.slice(1, -1).replace(/''/g, "'") : null;
};

// strftime specifiers → to_char patterns. %w, %s, %W, %f, %J have no
// to_char equivalent with the same output and are handled (or refused) apart.
const STRFTIME_MAP = { '%Y': 'YYYY', '%m': 'MM', '%d': 'DD', '%H': 'HH24', '%M': 'MI', '%S': 'SS', '%j': 'DDD', '%%': '%' };

function toCharPattern(fmt) {
  let out = '';
  let lit = '';
  const flush = () => { if (lit) { out += `"${lit}"`; lit = ''; } };
  for (let k = 0; k < fmt.length; k++) {
    if (fmt[k] === '%') {
      const spec = fmt.slice(k, k + 2);
      if (!STRFTIME_MAP[spec]) return null;
      flush();
      out += STRFTIME_MAP[spec];
      k++;
    } else if (/[A-Za-z]/.test(fmt[k])) {
      lit += fmt[k]; // letters are pattern codes in to_char; quote them
    } else {
      flush();
      out += fmt[k];
    }
  }
  flush();
  return out;
}

// A SQLite time value plus its modifiers → a Postgres timestamp expression.
// Returns null when a modifier has no same-meaning rewrite.
function tsExpr(value, mods) {
  const v = value.trim();
  const lit = unquote(v);
  let e;
  if (lit !== null && lit.toLowerCase() === 'now') e = 'LOCALTIMESTAMP(0)';
  else if (lit !== null) e = `TIMESTAMP '${lit.replace(/'/g, "''")}'`;
  else e = `CAST(${v} AS TIMESTAMP)`;
  for (const m of mods) {
    const ml = unquote(m);
    if (ml === null) { e = `(${e} + CAST(${m} AS INTERVAL))`; continue; }
    const t = ml.trim().toLowerCase();
    let mm;
    if ((mm = t.match(/^([+-]?\d+(?:\.\d+)?)\s+(second|minute|hour|day|month|year)s?$/))) {
      e = `(${e} + INTERVAL '${mm[1]} ${mm[2]}s')`;
    } else if ((mm = t.match(/^start of (month|year|day)$/))) {
      e = `DATE_TRUNC('${mm[1]}', ${e})`;
    } else {
      return null; // weekday N, unixepoch, localtime, utc…
    }
  }
  return e;
}

// Each rewrite: (args) → replacement text, or null to leave the call alone.
const FN_REWRITES = {
  IFNULL: args => (args.length === 2 ? `COALESCE(${args.join(', ')})` : null),
  INSTR: args => (args.length === 2 ? `STRPOS(${args[0]}, ${args[1]})` : null),
  ROUND: args => (args.length === 2 ? `ROUND(CAST(${args[0]} AS NUMERIC), ${args[1]})` : null),
  GROUP_CONCAT: args => {
    if (args.length < 1 || args.length > 2) return null;
    let x = args[0];
    let distinct = '';
    const m = x.match(/^distinct\s+(.*)$/is);
    if (m) { distinct = 'DISTINCT '; x = m[1]; }
    const sep = args[1] ?? "','";
    if (distinct && args[1]) return null;
    return `STRING_AGG(${distinct}CAST(${x} AS TEXT), ${sep})`;
  },
  MAX: args => (args.length >= 2 ? `GREATEST(${args.join(', ')})` : null),
  MIN: args => (args.length >= 2 ? `LEAST(${args.join(', ')})` : null),
  STRFTIME: args => {
    if (args.length < 2) return null;
    const fmt = unquote(args[0]);
    if (fmt === null) return null;
    const ts = tsExpr(args[1], args.slice(2));
    if (!ts) return null;
    if (fmt === '%w') return `CAST(EXTRACT(DOW FROM ${ts}) AS INTEGER)::TEXT`;
    if (fmt === '%s') return `CAST(EXTRACT(EPOCH FROM ${ts}) AS BIGINT)::TEXT`;
    const pat = toCharPattern(fmt);
    return pat === null ? null : `TO_CHAR(${ts}, '${pat}')`;
  },
  DATE: args => {
    if (args.length < 1) return null;
    const ts = tsExpr(args[0], args.slice(1));
    return ts ? `TO_CHAR(${ts}, 'YYYY-MM-DD')` : null;
  },
  DATETIME: args => {
    if (args.length < 1) return null;
    const ts = tsExpr(args[0], args.slice(1));
    return ts ? `TO_CHAR(${ts}, 'YYYY-MM-DD HH24:MI:SS')` : null;
  },
  JULIANDAY: args => {
    if (args.length < 1) return null;
    const ts = tsExpr(args[0], args.slice(1));
    return ts ? `(EXTRACT(EPOCH FROM ${ts}) / 86400.0 + 2440587.5)` : null;
  },
};

// Name of the rewrite a call used, for the allow-list's report.
const REWRITE_LABEL = {
  IFNULL: 'IFNULL→COALESCE', INSTR: 'INSTR→STRPOS', ROUND: 'ROUND(x::numeric)',
  GROUP_CONCAT: 'GROUP_CONCAT→STRING_AGG', MAX: 'MAX(a,b)→GREATEST', MIN: 'MIN(a,b)→LEAST',
  STRFTIME: 'strftime→to_char', DATE: 'date()→to_char', DATETIME: 'datetime()→to_char',
  JULIANDAY: 'julianday→epoch',
};

const CAST_TYPES = { REAL: 'DOUBLE PRECISION', FLOAT: 'DOUBLE PRECISION', DOUBLE: 'DOUBLE PRECISION' };
const INT_TYPES = new Set(['INTEGER', 'INT', 'BIGINT']);
// A cast whose operand is arithmetic (or a numeric function) — never a text
// expression, which TRUNC would refuse.
function truncates(expr) {
  const e = expr.trim();
  if (/^'.*'$/s.test(e)) return false;
  if (/\b(TO_CHAR|SUBSTR|SUBSTRING|STRFTIME|REPLACE|TRIM|UPPER|LOWER|STRING_AGG)\s*\(/i.test(e)) return false;
  return /[-+*/]|\b(JULIANDAY|EXTRACT|ROUND|AVG|SUM)\b/i.test(e);
}

// Text functions that Postgres refuses on a DATE / TIMESTAMP column
// (substr(date, …) does not exist) — SQLite stores dates as text, so the
// bank reads them as text.
const TEXT_FNS = new Set(['SUBSTR', 'SUBSTRING', 'LENGTH', 'INSTR', 'STRPOS', 'REPLACE', 'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM']);
const lastIdent = expr => {
  const m = expr.trim().match(/^(?:[A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*)$/);
  return m ? m[1].toLowerCase() : null;
};

function rewriteCalls(sql, used, opts = {}) {
  const toks = tokenize(sql);
  let out = '';
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    const name = up(tk);
    // the next non-space token
    let p = k + 1;
    while (p < toks.length && isSkip(toks[p])) p++;
    const prev = (() => { let q = k - 1; while (q >= 0 && isSkip(toks[q])) q--; return q >= 0 ? toks[q] : null; })();
    if (name && toks[p] && toks[p].t === '(' && !(prev && prev.t === 'op' && prev.v === '.')) {
      const close = matchParen(toks, p);
      if (close > 0) {
        const gap = join(toks.slice(k + 1, p)); // `OVER (` keeps its space
        const raw = splitArgs(toks, p + 1, close).map(a => rewriteCalls(a, used, opts));
        const inner = raw.map(a => a.trim());
        if (name === 'CAST') {
          // CAST(x AS REAL) → DOUBLE PRECISION
          const body = rewriteCalls(join(toks.slice(p + 1, close)), used, opts);
          const m = body.match(/^(.*)\s+AS\s+([A-Za-z]+)\s*$/is);
          const ty = m && m[2].toUpperCase();
          if (m && CAST_TYPES[ty]) {
            used.add('CAST AS REAL→DOUBLE PRECISION');
            out += `CAST(${m[1]} AS ${CAST_TYPES[ty]})`;
          } else if (m && INT_TYPES.has(ty) && truncates(m[1])) {
            // SQLite's CAST(x AS INTEGER) truncates 2.7 to 2; Postgres rounds to 3.
            used.add('CAST AS INTEGER→TRUNC');
            out += `CAST(TRUNC(${m[1]}) AS ${ty})`;
          } else out += `${tk.v}${gap}(${body})`;
          k = close;
          continue;
        }
        if (TEXT_FNS.has(name) && opts.dateColumns && inner.length && opts.dateColumns.has(lastIdent(inner[0]))) {
          used.add('date column::text');
          inner[0] = `CAST(${inner[0]} AS TEXT)`;
          raw[0] = inner[0];
        }
        const fn = FN_REWRITES[name];
        const rep = fn && !(inner.length === 1 && inner[0] === '') ? fn(inner) : null;
        if (rep !== null && rep !== undefined) {
          used.add(REWRITE_LABEL[name]);
          out += rep;
        } else {
          out += `${tk.v}${gap}(${raw.join(',')})`;
        }
        k = close;
        continue;
      }
    }
    // SQLite's LIKE ignores ASCII case; Postgres's does not.
    if (name === 'LIKE') {
      used.add('LIKE→ILIKE');
      // `date_col LIKE '2025-%'`: the column before LIKE (or NOT LIKE) read as text
      const m = out.match(/((?:[A-Za-z_][A-Za-z0-9_]*\.)?([A-Za-z_][A-Za-z0-9_]*))(\s+(?:NOT\s+)?)$/i);
      if (m && opts.dateColumns && opts.dateColumns.has(m[2].toLowerCase())) {
        used.add('date column::text');
        out = out.slice(0, out.length - m[0].length) + `CAST(${m[1]} AS TEXT)${m[3]}`;
      }
      out += 'ILIKE';
      continue;
    }
    out += tk.v;
  }
  return out;
}

// SQLite sorts NULLs first ascending and last descending; Postgres the
// reverse. Every ORDER BY item without an explicit NULLS gets SQLite's rule.
const ORDER_END = new Set(['LIMIT', 'OFFSET', 'ROWS', 'RANGE', 'GROUPS', 'UNION', 'EXCEPT', 'INTERSECT', 'FETCH', 'FOR', 'WINDOW']);

function addNullsOrder(sql, used) {
  const toks = tokenize(sql);
  const out = [];
  let k = 0;
  while (k < toks.length) {
    const tk = toks[k];
    if (up(tk) === 'ORDER') {
      let p = k + 1;
      while (p < toks.length && isSkip(toks[p])) p++;
      if (up(toks[p]) === 'BY') {
        for (let q = k; q <= p; q++) out.push(toks[q].v);
        // collect items until the clause ends at depth 0
        let q = p + 1;
        let d = 0;
        let item = [];
        const flushItem = () => {
          const text = join(item);
          const words = item.filter(x => x.t === 'id').map(x => x.v.toUpperCase());
          if (text.trim() && !words.includes('NULLS')) {
            const desc = words[words.length - 1] === 'DESC';
            const trail = text.match(/\s*$/)[0];
            out.push(text.slice(0, text.length - trail.length) + (desc ? ' NULLS LAST' : ' NULLS FIRST') + trail);
            used.add('NULLS FIRST/LAST');
          } else out.push(text);
          item = [];
        };
        for (; q < toks.length; q++) {
          const x = toks[q];
          if (x.t === '(') d++;
          if (x.t === ')') { if (d === 0) break; d--; }
          if (d === 0 && (ORDER_END.has(up(x)) || (x.t === 'op' && x.v === ';'))) break;
          if (d === 0 && x.t === ',') { flushItem(); out.push(','); continue; }
          item.push(x);
        }
        flushItem();
        k = q;
        continue;
      }
    }
    out.push(tk.v);
    k++;
  }
  return out.join('');
}

// SQLite → Postgres. Returns { sql, rewrites: [labels] }; rewrites is empty
// when the query runs as written.
// opts.dateColumns: Set of lower-case column names typed DATE / TIMESTAMP in
// this challenge's tables (pgDateColumns).
// opts.sqliteNullOrder (default true): pin SQLite's NULL placement on every
// ORDER BY. The coverage measure needs it (same rows as SQLite); the app
// does NOT — its expected output is what Postgres itself returns, so a
// learner's plain `ORDER BY x DESC` is not marked wrong for Postgres's own
// NULLS FIRST (pgExpectedSql).
export function translateSqliteToPg(sql, opts = {}) {
  const used = new Set();
  let out = rewriteCalls(String(sql || ''), used, opts);
  if (opts.sqliteNullOrder !== false) out = addNullsOrder(out, used);
  return { sql: out, rewrites: [...used].sort() };
}

// The SQL the app runs on Postgres for a challenge's expected output: the
// reference as written when the allow-list says it runs unchanged ('asis'),
// else its rewrite without the SQLite NULL order. null = not on the list.
export function pgExpectedSql(challenge, allowEntry, dateColumns) {
  if (!challenge || !allowEntry) return null;
  if (allowEntry === 'asis') return challenge.solution;
  return translateSqliteToPg(challenge.solution, { dateColumns, sqliteNullOrder: false }).sql;
}

// Statements of a script, split on depth-0 semicolons outside literals and
// comments. Empty statements dropped.
export function splitStatements(sql) {
  const parts = [];
  let cur = [];
  for (const x of tokenize(sql)) {
    if (x.t === 'op' && x.v === ';') { parts.push(join(cur)); cur = []; } else cur.push(x);
  }
  parts.push(join(cur));
  return parts.map(p => p.trim()).filter(p => p && tokenize(p).some(x => !isSkip(x)));
}

// ── 3. Result adapter ──────────────────────────────────────────────────────

// PGlite returns { fields: [{name, dataTypeID}], rows: [[…]] } with
// rowMode 'array'. Numbers that Postgres keeps exact (numeric, bigint) arrive
// as strings or BigInt; the comparator compares JSON, so they become plain
// numbers, the way sql.js hands them over. Booleans become 1/0 (SQLite has
// no boolean). Dates are parsed as text by the instance's parsers, so they
// stay the ISO strings the tables hold.
export const PG_NUMERIC_OIDS = new Set([20, 21, 23, 700, 701, 1700]);
export const PG_TEXT_PARSED_OIDS = [1082, 1083, 1114, 1184, 1186]; // date, time, timestamp, timestamptz, interval

export function normalizePgValue(v, oid) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (PG_NUMERIC_OIDS.has(oid) && typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }
  if (v instanceof Date) return v.toISOString().replace('T', ' ').replace(/\.000Z$|Z$/, '');
  return v;
}

export function pgResultToSqlJs(res) {
  const fields = (res && res.fields) || [];
  return {
    columns: fields.map(f => f.name),
    values: ((res && res.rows) || []).map(r => (Array.isArray(r) ? r : fields.map(f => r[f.name]))
      .map((v, i) => normalizePgValue(v, fields[i] && fields[i].dataTypeID))),
  };
}

// For the coverage measure only: the same instant written SQLite's way
// ('2024-01-15T10:30:00.000Z') and Postgres's way ('2024-01-15 10:30:00')
// count as one value. Grading in the app compares Postgres with Postgres and
// never needs this.
export function canonicalTimestamp(v) {
  if (typeof v !== 'string' || !TS_RE.test(v)) return v;
  return v.replace('T', ' ').replace(/Z$/, '').replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
