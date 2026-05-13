#!/usr/bin/env node
// Find challenges where the user would see "no expected output":
//   1. Solution returns 0 rows (silent correctness bug)
//   2. example.output text is missing or empty
//   3. Same for example_tr.output

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const win = {};
global.window = win;
eval(fs.readFileSync(path.join(root, 'src/data/datasets.js'), 'utf8').replace(/window\./g, 'win.'));
eval(fs.readFileSync(path.join(root, 'src/data/challenges.js'), 'utf8').replace(/window\./g, 'win.'));

const datasets = win.publicDatasetsData;
const challenges = win.challengesData;

// Load ALL datasets into one DB — matches the live app behavior
// (src/app.jsx loads titanic+movies+employees+ecommerce at startup, line ~5197)
function buildDbWithAllDatasets() {
  const db = new Database(':memory:');
  for (const dsKey of Object.keys(datasets)) {
    for (const [tableName, table] of Object.entries(datasets[dsKey].tables)) {
      db.exec(`CREATE TABLE ${tableName} (${table.columns.map(c => `"${c}"`).join(', ')});`);
      const ins = db.prepare(`INSERT INTO ${tableName} VALUES (${table.columns.map(() => '?').join(',')})`);
      const tx = db.transaction(rows => { for (const r of rows) ins.run(...r); });
      tx(table.data);
    }
  }
  return db;
}

const sharedDb = buildDbWithAllDatasets();
function buildDbFor(_datasetKey) {
  return sharedDb;
}

const zeroRowSolutions = [];
const missingExampleOutput = [];
const missingExampleOutputTr = [];
const solutionErrors = [];

for (const ch of challenges) {
  // Check example.output text
  const exOut = ch.example && ch.example.output;
  if (!exOut || (typeof exOut === 'string' && exOut.trim() === '')) {
    missingExampleOutput.push({ id: ch.id, title: ch.title });
  }
  const exOutTr = ch.example_tr && ch.example_tr.output;
  if (ch.example_tr && (!exOutTr || (typeof exOutTr === 'string' && exOutTr.trim() === ''))) {
    missingExampleOutputTr.push({ id: ch.id, title: ch.title });
  }

  // Run solution and count rows (against all-datasets DB to match the live app)
  if (!ch.dataset) continue;
  const db = buildDbFor(ch.dataset);
  try {
    const rows = db.prepare(ch.solution).all();
    if (rows.length === 0) {
      zeroRowSolutions.push({ id: ch.id, title: ch.title, dataset: ch.dataset });
    }
  } catch (err) {
    solutionErrors.push({ id: ch.id, title: ch.title, err: err.message });
  }
}

console.log(`Scanned ${challenges.length} challenges\n`);

console.log(`Solutions returning 0 rows (silent grader failure): ${zeroRowSolutions.length}`);
for (const s of zeroRowSolutions) {
  console.log(`  ID ${s.id} — ${s.title} (${s.dataset})`);
}

console.log(`\nSolutions that error: ${solutionErrors.length}`);
for (const s of solutionErrors) {
  console.log(`  ID ${s.id} — ${s.title}`);
  console.log(`    ${s.err}`);
}

console.log(`\nMissing or empty example.output (EN): ${missingExampleOutput.length}`);
for (const s of missingExampleOutput) {
  console.log(`  ID ${s.id} — ${s.title}`);
}

console.log(`\nMissing or empty example_tr.output (TR): ${missingExampleOutputTr.length}`);
for (const s of missingExampleOutputTr) {
  console.log(`  ID ${s.id} — ${s.title}`);
}
