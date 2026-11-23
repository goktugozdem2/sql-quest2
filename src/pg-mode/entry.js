// PostgreSQL mode — the engine (2026-11-22 spike, flag `postgresMode`).
//
// Built into public/pg-mode.js (scripts/build-pg-mode.mjs), NOT into
// app.js: the app loads it only when a person picks PostgreSQL, so with the
// flag off — or the toggle never touched — no byte of it, and no byte of
// PGlite, reaches the browser (tests/postgres-mode.test.js).
//
// window.SQLQuestPg:
//   available(challenge)        → boolean, from the generated allow-list
//   run(challenge, sql)         → {columns, rows, error, ms}
//   submit(challenge, sql)      → {correct, user, expected, error, ms}
//   timings()                   → {fetchMs, startMs, loadMs} of the cold start
// Each challenge gets its OWN PGlite instance (never the app's shared sql.js
// `db`), loaded once with that challenge's tables (challengeTablePlan); a
// statement that writes runs inside a transaction that is rolled back, so the
// next run starts from the same rows — what the app's SQLite path does by
// reloading the dataset.
import { challengeTablePlan } from '../utils/challenge-datasets.js';
import { resultsMatch } from '../utils/grade.js';
import {
  pgLoadSql, pgDateColumns, pgExpectedSql, pgResultToSqlJs, splitStatements,
  PG_SESSION_SQL, PG_TEXT_PARSED_OIDS,
} from '../utils/pg-translate.js';
import { PGLITE_BASE, PGLITE_FILES } from '../utils/pg-cdn.js';
import allow from '../data/postgres-allowlist.json';

const timings = { fetchMs: null, startMs: null, loadMs: {} };
let libPromise = null;

async function fetchChecked(file) {
  const res = await fetch(PGLITE_BASE + file.path, { integrity: file.sha384, mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`PGlite ${file.path}: HTTP ${res.status}`);
  return res;
}

// The library + its binaries, fetched once, each against its hash.
function loadLib() {
  if (libPromise) return libPromise;
  libPromise = (async () => {
    const t0 = performance.now();
    const [js, wasm, initdb, data] = await Promise.all([
      fetchChecked(PGLITE_FILES.js).then(r => r.text()),
      fetchChecked(PGLITE_FILES.wasm).then(r => r.arrayBuffer()),
      fetchChecked(PGLITE_FILES.initdb).then(r => r.arrayBuffer()),
      fetchChecked(PGLITE_FILES.data).then(r => r.blob()),
    ]);
    const module = { exports: {} };
    // index.cjs only requires Node modules on its Node branch.
    const req = name => { throw new Error(`PGlite asked for ${name} in the browser`); };
    // eslint-disable-next-line no-new-func
    new Function('module', 'exports', 'require', '__filename', '__dirname', js)(module, module.exports, req, PGLITE_FILES.js.path, '');
    const [pgliteWasmModule, initdbWasmModule] = await Promise.all([WebAssembly.compile(wasm), WebAssembly.compile(initdb)]);
    timings.fetchMs = Math.round(performance.now() - t0);
    return { PGlite: module.exports.PGlite, pgliteWasmModule, initdbWasmModule, fsBundle: data };
  })();
  libPromise.catch(() => { libPromise = null; });
  return libPromise;
}

const parsers = Object.fromEntries(PG_TEXT_PARSED_OIDS.map(o => [o, v => v]));
const instances = new Map(); // challenge id → Promise<PGlite>

function datasets() { return window.publicDatasetsData || {}; }

// One live instance at a time: each PGlite instance holds its own WASM
// memory (~300 MB of renderer RSS, measured in the spike), so moving to
// another challenge closes the previous one.
function closeOthers(keepId) {
  for (const [id, p] of instances) {
    if (id === keepId) continue;
    instances.delete(id);
    p.then(pg => pg.close()).catch(() => {});
  }
}

function instanceFor(challenge) {
  if (instances.has(challenge.id)) return instances.get(challenge.id);
  closeOthers(challenge.id);
  const p = (async () => {
    const lib = await loadLib();
    const t0 = performance.now();
    const pg = await lib.PGlite.create({
      pgliteWasmModule: lib.pgliteWasmModule,
      initdbWasmModule: lib.initdbWasmModule,
      fsBundle: lib.fsBundle,
      parsers,
    });
    if (timings.startMs === null) timings.startMs = Math.round(performance.now() - t0);
    const t1 = performance.now();
    await pg.exec(PG_SESSION_SQL);
    await pg.exec(pgLoadSql(challengeTablePlan(challenge, datasets()), datasets()));
    timings.loadMs[challenge.id] = Math.round(performance.now() - t1);
    return pg;
  })();
  p.catch(() => instances.delete(challenge.id));
  instances.set(challenge.id, p);
  return p;
}

const entryFor = challenge => (challenge && allow.challenges[challenge.id]) || null;

async function exec(pg, sql) {
  const stmts = splitStatements(sql);
  const writes = stmts.some(s => !/^\s*(SELECT|WITH|VALUES|TABLE|EXPLAIN|SHOW)\b/i.test(s));
  if (writes) await pg.exec('BEGIN');
  try {
    let res = null;
    for (const s of stmts) res = await pg.query(s, [], { rowMode: 'array' });
    return res ? pgResultToSqlJs(res) : { columns: [], values: [] };
  } finally {
    if (writes) await pg.exec('ROLLBACK').catch(() => {});
  }
}

async function run(challenge, sql) {
  const t0 = performance.now();
  try {
    const pg = await instanceFor(challenge);
    const r = await exec(pg, sql);
    return { columns: r.columns, rows: r.values, error: null, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { columns: [], rows: [], error: String((e && e.message) || e), ms: Math.round(performance.now() - t0) };
  }
}

async function submit(challenge, sql) {
  const entry = entryFor(challenge);
  if (!entry) return { correct: false, error: 'not available' };
  const t0 = performance.now();
  const user = await run(challenge, sql);
  if (user.error) return { correct: false, user, error: user.error, ms: Math.round(performance.now() - t0) };
  const expectedSql = pgExpectedSql(challenge, entry, pgDateColumns(challengeTablePlan(challenge, datasets()), datasets()));
  const expected = await run(challenge, expectedSql);
  if (expected.error) return { correct: false, user, error: `reference: ${expected.error}`, ms: Math.round(performance.now() - t0) };
  const correct = resultsMatch(user.rows, expected.rows, expectedSql, expected.columns);
  return { correct, user, expected, error: null, ms: Math.round(performance.now() - t0) };
}

window.SQLQuestPg = {
  version: allow.pglite,
  available: challenge => !!entryFor(challenge),
  run,
  submit,
  timings: () => JSON.parse(JSON.stringify(timings)),
  liveInstances: () => instances.size,
};
