// Runs every reference solution in the bank on SQLite (better-sqlite3, the
// app's own table rules) and on PGlite, three ways:
//   unchanged  — the SQLite text runs on Postgres and gives the same rows;
//   rewritten  — translateSqliteToPg's output runs and gives the same rows;
//   rounding   — the rewrite runs and differs only in the last kept digit of
//                a ROUND/AVG (Postgres rounds exact NUMERIC, SQLite a float:
//                ROUND(431.655, 2) is 431.66 on one and 431.65 on the other);
//                a correct Postgres answer, graded Postgres-to-Postgres;
//   nondeterministic — the SQLite reference itself changes when the same
//                rows are loaded in reverse or shuffled order (a tie under LIMIT, or an
//                ORDER BY that does not decide the order): a bank finding,
//                not a dialect one, and left out of the allow-list;
//   text_numbers — Postgres agrees with SQLite once numeric columns stored as
//                text are typed as numbers: the bank's own answer sorts
//                '99693450.00000' above '3300050700' (a bank bug);
//   hand       — neither (an error, or different rows) — needs a hand edit.
// "Same rows" is the app's comparator (resultsMatch) over values with the
// same timestamp written either engine's way, numbers to 12 significant
// digits, and a number stored as a string ('1931') equal to the number.
//
// Shared by scripts/pg/build-allowlist.mjs (writes the allow-list) and the
// spike's plan. Needs the devDependency @electric-sql/pglite (pinned).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { PGlite } from '@electric-sql/pglite';
import { challengeTablePlan } from '../../src/utils/challenge-datasets.js';
import { resultsMatch } from '../../src/utils/grade.js';
import {
  translateSqliteToPg, pgLoadSql, pgResultToSqlJs, canonicalTimestamp, pgDateColumns,
  splitStatements, pgColumnType, pgExpectedSql, PG_SESSION_SQL, PG_TEXT_PARSED_OIDS,
} from '../../src/utils/pg-translate.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));

export function loadBank() {
  const sb = { window: { challengesData: [] }, console: { log() {}, warn() {} } };
  vm.createContext(sb);
  for (const f of ['datasets.js', 'challenges.js', 'finans-data.js', 'finans-fraud-data.js', 'neobank-data.js',
    'gayrimenkul-data.js', 'uretim-data.js', 'sector-challenges.js']) vm.runInContext(readFileSync(here(`../../src/data/${f}`), 'utf8'), sb);
  return { datasets: sb.window.publicDatasetsData, bank: sb.window.challengesData };
}

function sqliteFor(plan, datasets, reverse = false, typed = false) {
  const db = new Database(':memory:');
  for (const step of plan) {
    for (const [name, t] of Object.entries(datasets[step.dataset].tables)) {
      if (step.tables && !step.tables.includes(name)) continue;
      const types = t.columns.map((_, i) => {
        if (typed) {
          const ty = pgColumnType(t.data.map(r => r[i]));
          return ty === 'INTEGER' || ty === 'BIGINT' ? 'INTEGER' : ty === 'DOUBLE PRECISION' ? 'REAL' : 'TEXT';
        }
        const s = t.data[0]?.[i];
        return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
      });
      db.exec(`DROP TABLE IF EXISTS ${name}`);
      db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
      const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
      const rows = reverse === 'shuffle' ? shuffled(t.data) : reverse ? [...t.data].reverse() : t.data;
      db.transaction(rs => rs.forEach(r => ins.run(r.map(v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v)))))(rows);
    }
  }
  return db;
}

// Seeded (deterministic) shuffle, so the report is the same on every run.
function shuffled(arr) {
  const a = [...arr];
  let seed = 20261122;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const PG_PARSERS = Object.fromEntries(PG_TEXT_PARSED_OIDS.map(o => [o, v => v]));

export async function pgFor(plan, datasets) {
  const pg = await PGlite.create({ parsers: PG_PARSERS });
  await pg.exec(PG_SESSION_SQL);
  await pg.exec(pgLoadSql(plan, datasets));
  return pg;
}

const NUM_STR = /^-?(0|[1-9]\d*)(\.\d+)?$/;
const approx = v => {
  if (typeof v === 'string' && NUM_STR.test(v)) v = Number(v);
  if (typeof v === 'number') return Number.isInteger(v) ? v : Number(v.toPrecision(12));
  return canonicalTimestamp(v);
};
const canon = rows => rows.map(r => r.map(approx));

// Same rows except numbers that differ by at most one unit in the last
// decimal either side shows (2 vs 1.9, 431.65 vs 431.66).
const decimals = n => { const s = String(n); const i = s.indexOf('.'); return i < 0 ? 0 : s.length - i - 1; };
function onlyRounding(a, b) {
  if (a.length !== b.length) return false;
  const key = r => JSON.stringify(r.map(v => (typeof v === 'number' ? Math.round(v) : v)));
  const sa = [...a].sort((x, y) => (key(x) < key(y) ? -1 : 1));
  const sb = [...b].sort((x, y) => (key(x) < key(y) ? -1 : 1));
  let diff = 0;
  for (let i = 0; i < sa.length; i++) {
    if (sa[i].length !== sb[i].length) return false;
    for (let j = 0; j < sa[i].length; j++) {
      const x = sa[i][j], y = sb[i][j];
      if (x === y) continue;
      if (typeof x !== 'number' || typeof y !== 'number') return false;
      const d = Math.max(decimals(x), decimals(y), 1);
      if (Math.abs(x - y) > 10 ** -d + 1e-9) return false;
      diff++;
    }
  }
  return diff > 0;
}

// Every statement of the script; the last one's rows. A script with more
// than one statement (the DML set) runs inside a transaction rolled back
// after, so the shared instance stays clean.
async function tryPg(pg, sql) {
  const stmts = splitStatements(sql);
  const tx = stmts.length > 1;
  try {
    if (tx) await pg.exec('BEGIN');
    let res = null;
    for (const s of stmts) res = await pg.query(s, [], { rowMode: 'array' });
    return { ok: true, ...pgResultToSqlJs(res) };
  } catch (e) {
    return { ok: false, error: String(e.message || e).split('\n')[0] };
  } finally {
    if (tx) await pg.exec('ROLLBACK').catch(() => {});
  }
}

function runSqlite(plan, datasets, sql, reverse = false, typed = false) {
  const db = sqliteFor(plan, datasets, reverse, typed);
  try {
    const stmts = splitStatements(sql);
    for (const s of stmts.slice(0, -1)) db.exec(s);
    const stmt = db.prepare(stmts[stmts.length - 1]);
    return { columns: stmt.columns().map(x => x.name), values: stmt.raw().all() };
  } finally { db.close(); }
}

export async function runBank({ ids = null, log = () => {} } = {}) {
  const { datasets, bank } = loadBank();
  const pgs = new Map();
  const out = [];
  for (const c of bank) {
    if (ids && !ids.includes(c.id)) continue;
    const plan = challengeTablePlan(c, datasets);
    const key = JSON.stringify(plan);
    let sq;
    try {
      sq = runSqlite(plan, datasets, c.solution);
    } catch (e) {
      out.push({ id: c.id, status: 'sqlite_error', reason: String(e.message) });
      continue;
    }
    if (!pgs.has(key)) pgs.set(key, await pgFor(plan, datasets));
    const pg = pgs.get(key);
    const want = canon(sq.values);
    const same = r => r.ok && resultsMatch(canon(r.values), want, c.solution, sq.columns);
    const asIs = await tryPg(pg, c.solution);
    if (same(asIs)) { out.push({ id: c.id, status: 'unchanged', rewrites: [] }); continue; }
    const dateColumns = pgDateColumns(plan, datasets);
    const tr = translateSqliteToPg(c.solution, { dateColumns });
    // The form the app grades with (Postgres's own NULL order) must run too.
    const appRuns = async () => (await tryPg(pg, pgExpectedSql(c, 'rewrite', dateColumns))).ok;
    const rw = await tryPg(pg, tr.sql);
    if (same(rw)) { out.push({ id: c.id, status: 'rewritten', rewrites: tr.rewrites, appRuns: await appRuns() }); continue; }
    if (rw.ok && onlyRounding(canon(rw.values), want)) {
      out.push({ id: c.id, status: 'rounding', rewrites: tr.rewrites, appRuns: await appRuns() }); continue;
    }
    // Is the SQLite answer an artefact of numbers stored as text? Load the
    // same rows with numeric columns typed as numbers; if SQLite then agrees
    // with Postgres, the bank's expected output sorts or compares text.
    if (rw.ok) {
      const typed = runSqlite(plan, datasets, c.solution, false, true);
      if (resultsMatch(canon(rw.values), canon(typed.values), c.solution, typed.columns)) {
        out.push({ id: c.id, status: 'text_numbers', rewrites: tr.rewrites, appRuns: await appRuns(), reason: 'the SQLite answer compares numbers stored as text; Postgres types them' });
        continue;
      }
    }
    // Does the reference decide its own answer? Same rows, reverse order.
    const moved = [true, 'shuffle'].some(order => {
      const rev = runSqlite(plan, datasets, c.solution, order);
      return !resultsMatch(canon(rev.values), want, c.solution, sq.columns);
    });
    if (moved) {
      out.push({ id: c.id, status: 'nondeterministic', rewrites: tr.rewrites, reason: rw.ok ? 'runs; the reference depends on row order' : rw.error });
      continue;
    }
    out.push({
      id: c.id, status: 'hand', rewrites: tr.rewrites,
      reason: rw.ok ? `different rows (${rw.values.length} vs ${sq.values.length})` : rw.error,
    });
    log(c.id, out[out.length - 1].reason);
  }
  for (const pg of pgs.values()) await pg.close();
  return { results: out, bankSize: bank.length };
}
