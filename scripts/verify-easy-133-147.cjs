#!/usr/bin/env node
// Verify the 15 new Easy challenges (IDs 133-147) execute against real dataset.
// Loads challenges.js + datasets.js into a Node global window, builds an in-memory
// SQLite DB with better-sqlite3, runs each solution, prints PASS/FAIL.

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const win = {};
// Stub Browser globals before loading the data files.
global.window = win;

eval(fs.readFileSync(path.join(root, 'src/data/datasets.js'), 'utf8').replace(/window\./g, 'win.'));
eval(fs.readFileSync(path.join(root, 'src/data/challenges.js'), 'utf8').replace(/window\./g, 'win.'));

const datasets = win.publicDatasetsData;
const challenges = win.challengesData.filter(c => c.id >= 133 && c.id <= 147);

console.log(`Loaded ${challenges.length} new challenges, ${Object.keys(datasets).length} datasets`);

function buildDbFor(datasetKey) {
  const ds = datasets[datasetKey];
  if (!ds) throw new Error(`Dataset ${datasetKey} not found`);
  const db = new Database(':memory:');
  for (const [tableName, table] of Object.entries(ds.tables)) {
    const cols = table.columns;
    const colDefs = cols.map(c => `"${c}"`).join(', ');
    db.exec(`CREATE TABLE ${tableName} (${colDefs});`);
    const placeholders = cols.map(() => '?').join(',');
    const ins = db.prepare(`INSERT INTO ${tableName} VALUES (${placeholders})`);
    const tx = db.transaction(rows => { for (const r of rows) ins.run(...r); });
    tx(table.data);
  }
  return db;
}

let passed = 0, failed = 0;
const failures = [];

for (const ch of challenges) {
  const db = buildDbFor(ch.dataset);
  try {
    const result = db.prepare(ch.solution).all();
    if (result.length === 0) {
      console.log(`⚠ ID ${ch.id} (${ch.title}) — runs but returns 0 rows`);
    } else {
      console.log(`✓ ID ${ch.id} (${ch.title}) — ${result.length} row(s)`);
    }
    passed++;
  } catch (err) {
    failed++;
    failures.push({ id: ch.id, title: ch.title, err: err.message, sql: ch.solution });
    console.log(`✗ ID ${ch.id} (${ch.title}) — ${err.message}`);
  } finally {
    db.close();
  }
}

console.log(`\n${passed}/${challenges.length} pass, ${failed} fail`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  ID ${f.id} (${f.title})`);
    console.log(`    SQL: ${f.sql}`);
    console.log(`    Err: ${f.err}`);
  }
  process.exit(1);
}
