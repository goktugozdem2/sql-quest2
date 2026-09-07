#!/usr/bin/env node
//
// scripts/verify-subquery-onramps-186-188.cjs
//
// Verifies the subquery Easy on-ramp (IDs 186-188): each reference solution
// must execute against its own classic dataset AND return at least one row.
//
// An empty result is a FAIL, not a curiosity — the grader compares the user's
// rows to the solution's rows, so a solution returning nothing accepts any
// empty query (the rule scripts/validate-fraud-challenges.js learned on #278).
//
// It also re-computes the /challenges/subqueries/ predicates from
// tests/site-counts.test.js against each new solution, so "the page will pick
// it up" is measured here rather than hoped for.
//
//   node scripts/verify-subquery-onramps-186-188.cjs
//
// Exit codes: 0 = all pass, 1 = any FAIL.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const win = {};
global.window = win;

eval(fs.readFileSync(path.join(root, 'src/data/datasets.js'), 'utf8').replace(/window\./g, 'win.'));
eval(fs.readFileSync(path.join(root, 'src/data/challenges.js'), 'utf8').replace(/window\./g, 'win.'));

const datasets = win.publicDatasetsData;
const challenges = win.challengesData.filter(c => c.id >= 186 && c.id <= 188);

// The live predicates — kept identical to TOPIC_PAGES.subqueries in
// tests/site-counts.test.js. If they drift, that test fails first.
const NON_CTE_SUBQUERY = /(?<!\bAS\s*)\(\s*SELECT\b/i;
const SCALAR_OR_IN_SUBQUERY = /(?<!\b(?:AS|FROM|JOIN|EXISTS)\s*)\(\s*SELECT\b/i;
const EXISTS_SUBQUERY = /\bEXISTS\s*\(\s*SELECT\b/i;
const DERIVED_TABLE = /\b(?:FROM|JOIN)\s*\(\s*SELECT\b/i;

function buildDbFor(datasetKey) {
  const ds = datasets[datasetKey];
  if (!ds) throw new Error(`unknown dataset "${datasetKey}"`);
  const db = new Database(':memory:');
  for (const [tableName, table] of Object.entries(ds.tables)) {
    const cols = table.columns;
    db.exec(`CREATE TABLE ${tableName} (${cols.map(c => `"${c}"`).join(', ')});`);
    const ins = db.prepare(`INSERT INTO ${tableName} VALUES (${cols.map(() => '?').join(',')})`);
    const tx = db.transaction(rows => { for (const r of rows) ins.run(...r.map(v => (v === undefined ? null : v))); });
    tx(table.data);
  }
  return db;
}

let pass = 0, fail = 0;

for (const ch of challenges) {
  console.log(`#${ch.id} [${ch.difficulty}] ${ch.title}  (dataset: ${ch.dataset})`);
  let db;
  try {
    db = buildDbFor(ch.dataset);
    const rows = db.prepare(ch.solution).all();
    if (rows.length === 0) {
      console.log('     FAIL  0 rows — a solution must return at least one row\n');
      fail++;
      continue;
    }
    const cols = Object.keys(rows[0]);
    console.log(`     PASS  ${rows.length} rows, cols: [${cols.join(', ')}]`);
    rows.slice(0, 2).forEach(r => console.log(`           ${Object.entries(r).map(([k, v]) => `${k}=${v}`).join(', ').slice(0, 140)}`));
    const sql = ch.solution;
    const sections = [
      NON_CTE_SUBQUERY.test(sql) ? 'population' : null,
      SCALAR_OR_IN_SUBQUERY.test(sql) ? '#scalar-and-in' : null,
      (/correlated/i.test([...(ch.skills || []), ch.category].join(' ')) || EXISTS_SUBQUERY.test(sql)) ? '#correlated' : null,
      DERIVED_TABLE.test(sql) ? '#derived-tables' : null,
    ].filter(Boolean);
    console.log(`           subqueries page: ${sections.join(', ') || 'NOT SELECTED'}`);
    if (!NON_CTE_SUBQUERY.test(sql)) {
      console.log('     FAIL  the subqueries page population predicate does not select it\n');
      fail++;
      continue;
    }
    console.log('');
    pass++;
  } catch (err) {
    console.log(`     FAIL  ${err.message}\n`);
    fail++;
  } finally {
    if (db) db.close();
  }
}

console.log(`─── ${pass} passed, ${fail} failed ───`);
process.exit(fail === 0 ? 0 : 1);
