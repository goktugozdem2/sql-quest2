#!/usr/bin/env node
//
// scripts/verify-correlated-onramps-189-190.cjs
//
// Verifies the #correlated Easy on-ramp (IDs 189-190). Same contract as
// scripts/verify-subquery-onramps-186-188.cjs — each reference solution must
// run against its own dataset and return at least one row, because the grader
// compares the user's rows to the solution's and a solution returning nothing
// accepts any empty query.
//
// It adds one thing those three did not need: **the prose makes checkable
// claims about the data**, and prose drifts silently. Every number quoted in
// a description is asserted here:
//
//   189 — 52 rows; the whole-table-average query (186) returns 61; 5 rows are
//         in 189 and not 186; 14 are in 186 and not 189; Mystery contributes
//         nothing because it holds one film.
//   190 — 44 rows; 6 people manage someone; 7 manager_id are NULL; and the
//         NOT IN form the description tells the learner to run really does
//         return ZERO rows. If a future dataset edit fills those NULLs, the
//         card's whole lesson quietly becomes false — this fails first.
//
//   node scripts/verify-correlated-onramps-189-190.cjs
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
const byId = id => win.challengesData.find(c => c.id === id);

// Kept identical to TOPIC_PAGES.subqueries in tests/site-counts.test.js.
const NON_CTE_SUBQUERY = /(?<!\bAS\s*)\(\s*SELECT\b/i;
const EXISTS_SUBQUERY = /\bEXISTS\s*\(\s*SELECT\b/i;
const hasCorrelatedTag = c => [...(c.skills || []), c.category].filter(Boolean).some(t => /correlated/i.test(t));

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
const check = (label, got, want) => {
  const ok = got === want;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${got}${ok ? '' : ` (expected ${want})`}`);
  ok ? pass++ : fail++;
};

for (const id of [189, 190]) {
  const ch = byId(id);
  if (!ch) { console.log(`#${id} MISSING`); fail++; continue; }
  console.log(`\n#${ch.id} [${ch.difficulty}] ${ch.title}  (dataset: ${ch.dataset})`);
  const db = buildDbFor(ch.dataset);
  const rows = db.prepare(ch.solution).all();

  check('solution returns rows', rows.length > 0, true);
  check('lands in the subqueries population', NON_CTE_SUBQUERY.test(ch.solution), true);
  check('lands in #correlated', hasCorrelatedTag(ch) || EXISTS_SUBQUERY.test(ch.solution), true);
  check('is Easy', ch.difficulty, 'Easy');
  for (const f of ['title_tr', 'description_tr', 'hint_tr', 'example_tr']) {
    check(`has ${f}`, !!ch[f], true);
  }

  if (id === 189) {
    check('row count quoted in the card', rows.length, 52);
    const whole = db.prepare('SELECT COUNT(*) n FROM movies WHERE rating > (SELECT AVG(rating) FROM movies)').get().n;
    check('186 (whole-table average) returns', whole, 61);
    check('in 189, not in 186', db.prepare(
      'SELECT COUNT(*) n FROM movies m WHERE m.rating > (SELECT AVG(m2.rating) FROM movies m2 WHERE m2.genre = m.genre) AND m.rating <= (SELECT AVG(rating) FROM movies)').get().n, 5);
    check('in 186, not in 189', db.prepare(
      'SELECT COUNT(*) n FROM movies m WHERE m.rating > (SELECT AVG(rating) FROM movies) AND m.rating <= (SELECT AVG(m2.rating) FROM movies m2 WHERE m2.genre = m.genre)').get().n, 14);
    check('Mystery holds exactly one film, so it contributes nothing',
      db.prepare("SELECT COUNT(*) n FROM movies WHERE genre = 'Mystery'").get().n, 1);
    check('no Mystery row in the answer', rows.some(r => r.genre === 'Mystery'), false);
    check('the ordering is total (no genre+rating+title tie)', db.prepare(
      'SELECT COUNT(*) n FROM (SELECT genre, rating, title, COUNT(*) c FROM movies GROUP BY genre, rating, title HAVING c > 1)').get().n, 0);
  }

  if (id === 190) {
    check('row count quoted in the card', rows.length, 44);
    check('people who manage someone', db.prepare(
      'SELECT COUNT(*) n FROM employees e WHERE EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = e.emp_id)').get().n, 6);
    check('NULL manager_id — the reason the trap fires', db.prepare(
      'SELECT COUNT(*) n FROM employees WHERE manager_id IS NULL').get().n, 7);
    // The card tells the learner to run this and see nothing. If it ever
    // returns rows, the lesson is wrong on the page.
    check('the NOT IN form really does return zero rows', db.prepare(
      'SELECT COUNT(*) n FROM employees e WHERE e.emp_id NOT IN (SELECT manager_id FROM employees)').get().n, 0);
    check('the ordering is total (no department+name tie)', db.prepare(
      'SELECT COUNT(*) n FROM (SELECT department, name, COUNT(*) c FROM employees GROUP BY department, name HAVING c > 1)').get().n, 0);
  }
  db.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
