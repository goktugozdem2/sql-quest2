// Content lint — mechanical quality gate for every challenge.
//
// Catches the two defect classes that burned real users (Jul 2026 audit:
// #209 4% success on an Easy, #221 spec/solution ordering mismatch):
//
//   1. BROKEN    — the official solution errors against its own dataset.
//   2. NONDETERM — the solution's ORDER BY under-determines row order:
//                  inserting the table rows in reverse changes the output.
//                  The grader compares exact row order, so every correct
//                  user answer becomes a coin flip.
//
// Run: node scripts/lint-content.mjs   (exits 1 if any finding)
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const ROOT = new URL('..', import.meta.url).pathname;

function loadGlobal(file, varName) {
  const src = fs.readFileSync(`${ROOT}/src/data/${file}`, 'utf-8');
  const w = {};
  // eslint-disable-next-line no-new-func
  new Function('window', src)(w);
  return w[varName];
}

// ── datasets ────────────────────────────────────────────────────────
// Core datasets live in datasets.js-style bundles; sector datasets in
// window.publicDatasetsData. Build a name -> {table: {columns, data}} map.
const datasets = {};

// Sector datasets
const w = {};
for (const f of ['finans-data.js', 'finans-fraud-data.js', 'gayrimenkul-data.js', 'uretim-data.js']) {
  try {
    const src = fs.readFileSync(`${ROOT}/src/data/${f}`, 'utf-8');
    new Function('window', src)(w);
  } catch (_) { /* optional file */ }
}
for (const [name, ds] of Object.entries(w.publicDatasetsData || {})) {
  datasets[name] = ds.tables;
}

// Core datasets (titanic / employees / movies / orders-customers ...)
try {
  const src = fs.readFileSync(`${ROOT}/src/data/datasets.js`, 'utf-8');
  const w2 = {};
  new Function('window', src)(w2);
  for (const [name, ds] of Object.entries(w2.datasetsData || w2.publicDatasetsData || {})) {
    datasets[name] = ds.tables || ds;
  }
} catch (_) { /* resolved below if named differently */ }

function buildDb(tables, reverse) {
  const db = new DatabaseSync(':memory:');
  for (const [tn, t] of Object.entries(tables)) {
    if (!t || !t.columns || !t.data) continue;
    db.exec(`CREATE TABLE ${tn} (${t.columns.map(c => `"${c}"`).join(',')})`);
    const ins = db.prepare(`INSERT INTO ${tn} VALUES (${t.columns.map(() => '?').join(',')})`);
    const rows = reverse ? [...t.data].reverse() : t.data;
    for (const r of rows) ins.run(...r.map(v => (v === undefined ? null : v)));
  }
  return db;
}

// Split a solution into statements. Naive on purpose — it only needs to
// handle the semicolons OUR solutions contain, and it must not split inside
// a string literal (e.g. a WHERE clause matching 'a;b').
function splitStatements(sql) {
  const out = [];
  let cur = '', qs = null;
  for (const ch of sql) {
    if (qs) { cur += ch; if (ch === qs) qs = null; continue; }
    if (ch === "'" || ch === '"') { qs = ch; cur += ch; continue; }
    if (ch === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function runSolution(tables, sql, reverse) {
  const db = buildDb(tables, reverse);
  try {
    // Multi-statement solutions (the DML challenges: mutate, then SELECT to
    // prove it) must run EVERY statement and report the last result set —
    // which is what the browser's db.exec does. Passing the whole script to
    // prepare().all() silently executed only the first statement and returned
    // [], so both the forward and reversed runs came back empty and every DML
    // challenge got rubber-stamped as deterministic and unbroken. A lint that
    // silently passes is worse than no lint.
    const stmts = splitStatements(sql);
    let rows = [];
    for (const s of stmts) rows = db.prepare(s).all();
    return { rows };
  } catch (e) {
    return { error: e.message };
  } finally {
    db.close();
  }
}

// ── challenges ──────────────────────────────────────────────────────
const core = loadGlobal('challenges.js', 'challengesData') || [];
const sector = loadGlobal('sector-challenges.js', 'sectorChallengesData') || [];
const all = [...core, ...sector];

const findings = [];
let checked = 0, skipped = 0;

for (const c of all) {
  if (!c.solution) { skipped++; continue; }
  const tables = datasets[c.dataset];
  if (!tables) { skipped++; continue; }

  const fwd = runSolution(tables, c.solution, false);
  if (fwd.error) {
    findings.push({ id: c.id, kind: 'BROKEN', title: c.title, note: fwd.error.slice(0, 120) });
    continue;
  }
  const rev = runSolution(tables, c.solution, true);
  checked++;
  if (JSON.stringify(fwd.rows) !== JSON.stringify(rev.rows)) {
    findings.push({ id: c.id, kind: 'NONDETERM', title: c.title, note: `${fwd.rows.length} rows; order depends on insert order — add a unique tiebreak to ORDER BY` });
  }
}

console.log(`content-lint: ${checked} checked, ${skipped} skipped (no solution or dataset not loadable here)`);
for (const f of findings.sort((a, b) => a.kind.localeCompare(b.kind) || a.id - b.id)) {
  console.log(`  ${f.kind.padEnd(9)} #${String(f.id).padEnd(4)} ${f.title} — ${f.note}`);
}

// Ratchet: legacy findings are baselined (scripts/content-lint-baseline.txt);
// the gate only fails on NEW findings so existing debt can't grow. Shrink the
// baseline as challenges get fixed — never add to it.
let baseline = new Set();
try {
  baseline = new Set(
    fs.readFileSync(`${ROOT}/scripts/content-lint-baseline.txt`, 'utf-8')
      .split('\n').map(l => (l.match(/#(\d+)/) || [])[1]).filter(Boolean)
  );
} catch (_) { /* no baseline — everything is new */ }
const fresh = findings.filter(f => !baseline.has(String(f.id)));

console.log(findings.length
  ? `\n${findings.length} finding(s) — ${fresh.length} NEW vs baseline`
  : '\nclean');
if (fresh.length) {
  console.log('NEW findings (fix before shipping):');
  for (const f of fresh) console.log(`  ${f.kind} #${f.id} ${f.title}`);
}
process.exit(fresh.length ? 1 : 0);
