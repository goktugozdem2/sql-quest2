#!/usr/bin/env node
//
// scripts/validate-fraud-challenges.js
//
// Loads the synthetic fraud-transaction dataset (from finans-fraud-data.js)
// into in-memory SQLite, then runs every challenge solution from
// src/data/sector-challenges.js where dataset === 'finans_fraud'.
//
// Run after editing fraud_transactions challenges or regenerating data:
//   node scripts/validate-fraud-challenges.js
//
// Exit codes: 0 = all pass, 1 = any FAIL, 2 = setup error.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRAUD_DATA_FILE = path.join(ROOT, 'src/data/finans-fraud-data.js');
const CHALLENGES_FILE = path.join(ROOT, 'src/data/sector-challenges.js');

function loadFraudDataset() {
  if (!fs.existsSync(FRAUD_DATA_FILE)) {
    console.error(`Fraud data file not found: ${FRAUD_DATA_FILE}`);
    console.error('Generate it via: node scripts/generate-fraud-transactions.js');
    process.exit(2);
  }
  const src = fs.readFileSync(FRAUD_DATA_FILE, 'utf8');
  const sandbox = { window: {}, console: { log: () => {} } };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const ds = sandbox.window.publicDatasetsData?.finans_fraud;
  if (!ds || !ds.tables) {
    console.error('finans_fraud dataset not found in data file');
    process.exit(2);
  }
  return ds;
}

function loadChallenges() {
  const src = fs.readFileSync(CHALLENGES_FILE, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const all = sandbox.window.sectorChallengesData;
  if (!Array.isArray(all)) {
    console.error('window.sectorChallengesData missing or not an array');
    process.exit(2);
  }
  return all.filter((c) => c && c.dataset === 'finans_fraud');
}

// Infer SQL type from sample values — needed so JOINs and arithmetic
// work as numeric instead of getting silently coerced to text.
function inferType(samples) {
  let isInt = true;
  let isReal = true;
  let allEmpty = true;
  for (const s of samples) {
    if (s === null || s === undefined || s === '') continue;
    allEmpty = false;
    if (typeof s === 'number') {
      if (!Number.isInteger(s)) isInt = false;
      continue;
    }
    const str = String(s);
    if (!/^-?\d+$/.test(str)) isInt = false;
    if (!/^-?\d+(?:\.\d+)?$/.test(str)) isReal = false;
  }
  if (allEmpty) return 'TEXT';
  if (isInt) return 'INTEGER';
  if (isReal) return 'REAL';
  return 'TEXT';
}

function loadTable(db, tableName, tableDef) {
  const cols = tableDef.columns;
  const rows = tableDef.data;
  // Sample first 50 rows for type inference per column
  const colTypes = cols.map((_, ci) => {
    const samples = rows.slice(0, 50).map((r) => r[ci]);
    return inferType(samples);
  });
  const colDefs = cols.map((c, i) => `"${c}" ${colTypes[i]}`).join(', ');
  db.exec(`DROP TABLE IF EXISTS ${tableName}`);
  db.exec(`CREATE TABLE ${tableName} (${colDefs})`);
  const placeholders = cols.map(() => '?').join(',');
  const insert = db.prepare(`INSERT INTO ${tableName} VALUES (${placeholders})`);
  const insertMany = db.transaction((rows) => {
    for (const r of rows) {
      const padded = cols.map((_, i) => {
        const v = r[i];
        if (v === undefined || v === '') return null;
        if (colTypes[i] === 'INTEGER' && typeof v === 'string') return parseInt(v, 10);
        if (colTypes[i] === 'REAL' && typeof v === 'string') return parseFloat(v);
        return v;
      });
      insert.run(padded);
    }
  });
  insertMany(rows);
  console.log(`  ${tableName.padEnd(15)} ${rows.length} rows  (cols: ${cols.length})`);
}

function main() {
  console.log('Loading synthetic fraud dataset into in-memory SQLite...\n');
  const db = new Database(':memory:');
  const ds = loadFraudDataset();
  for (const [tableName, tableDef] of Object.entries(ds.tables)) {
    loadTable(db, tableName, tableDef);
  }

  console.log('\nLoading fraud_transactions challenges...\n');
  const challenges = loadChallenges();
  if (challenges.length === 0) {
    console.warn('No finans_fraud challenges found. Add some to sector-challenges.js then re-run.');
    process.exit(0);
  }

  let pass = 0, fail = 0;
  for (const c of challenges) {
    const id = c.id ?? '?';
    const title = c.title || '(untitled)';
    const sql = c.solution || '';
    process.stdout.write(`#${String(id).padEnd(3)} [${(c.difficulty || '?').padEnd(6)}] ${title}\n`);
    if (!sql) {
      console.log(`     FAIL: no solution\n`);
      fail++;
      continue;
    }
    try {
      const stmt = db.prepare(sql);
      const result = stmt.all();
      const rowCount = result.length;
      const cols = rowCount > 0 ? Object.keys(result[0]) : [];
      const status = rowCount === 0 ? 'PASS (0 rows — verify expected)' : 'PASS';
      console.log(`     ${status}  ${rowCount} rows, cols: [${cols.join(', ')}]`);
      result.slice(0, 2).forEach((r) => {
        const flat = Object.entries(r).map(([k, v]) => `${k}=${v}`).join(', ').slice(0, 160);
        console.log(`           ${flat}`);
      });
      console.log('');
      pass++;
    } catch (err) {
      console.log(`     FAIL  ${err.message}\n`);
      fail++;
    }
  }

  console.log(`─── ${pass} passed, ${fail} failed ───`);
  db.close();
  process.exit(fail === 0 ? 0 : 1);
}

main();
