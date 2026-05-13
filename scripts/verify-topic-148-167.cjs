#!/usr/bin/env node
// Verify the 20 topic-deep-dive challenges (IDs 148-167).
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const win = {};
global.window = win;

eval(fs.readFileSync(path.join(root, 'src/data/datasets.js'), 'utf8').replace(/window\./g, 'win.'));
eval(fs.readFileSync(path.join(root, 'src/data/challenges.js'), 'utf8').replace(/window\./g, 'win.'));

const datasets = win.publicDatasetsData;
const challenges = win.challengesData.filter(c => c.id >= 148 && c.id <= 167);

function buildDbFor(datasetKey) {
  const ds = datasets[datasetKey];
  const db = new Database(':memory:');
  for (const [tableName, table] of Object.entries(ds.tables)) {
    const cols = table.columns;
    db.exec(`CREATE TABLE ${tableName} (${cols.map(c => `"${c}"`).join(', ')});`);
    const ins = db.prepare(`INSERT INTO ${tableName} VALUES (${cols.map(() => '?').join(',')})`);
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
    console.log(`${result.length > 0 ? '✓' : '⚠'} ID ${ch.id} (${ch.title}) — ${result.length} row(s)`);
    if (result.length === 0) {
      console.log('    Solution returns 0 rows — verify expected behavior');
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
  for (const f of failures) {
    console.log(`\nID ${f.id} (${f.title})`);
    console.log(`  SQL: ${f.sql.slice(0, 200)}...`);
    console.log(`  Err: ${f.err}`);
  }
  process.exit(1);
}
