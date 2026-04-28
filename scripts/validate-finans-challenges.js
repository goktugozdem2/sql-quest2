#!/usr/bin/env node
//
// scripts/validate-finans-challenges.js
//
// Loads the FDIC banking CSVs into an in-memory SQLite DB, then runs
// every challenge solution from src/data/sector-challenges.js (filtered
// to dataset=finans_banking). Prints PASS/FAIL per challenge with a
// preview of the first 3 result rows so you can eyeball correctness.
//
// Run after editing finans challenges or refreshing the dataset:
//   node scripts/validate-finans-challenges.js
//
// Exit codes: 0 = all pass, 1 = any FAIL, 2 = setup error.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src/data/sectors/finans');
const CHALLENGES_FILE = path.join(ROOT, 'src/data/sector-challenges.js');

// ─── Load challenges via vm sandbox ──────────────────────────────────

function loadSectorChallenges() {
  if (!fs.existsSync(CHALLENGES_FILE)) {
    console.error(`Challenges file not found: ${CHALLENGES_FILE}`);
    process.exit(2);
  }
  const src = fs.readFileSync(CHALLENGES_FILE, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const all = sandbox.window.sectorChallengesData;
  if (!Array.isArray(all)) {
    console.error('window.sectorChallengesData missing or not an array');
    process.exit(2);
  }
  return all.filter((c) => c && c.dataset === 'finans_banking');
}

// ─── CSV → table loader ──────────────────────────────────────────────
//
// Minimal CSV parser. Real-world CSVs use quotes, escaping, multiline
// fields. The FDIC data we generate is well-formed (we control writeCsv
// in download-finans-data.js), so this parser only handles:
//   - quoted fields with embedded commas
//   - escaped doubled-quotes inside quoted fields
// If the FDIC data ever grows newlines-in-fields, swap in csv-parse.

function parseCsv(content) {
  const rows = [];
  const lines = content.split('\n').filter((l) => l.length > 0);
  for (const line of lines) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        // quoted field
        let v = '';
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') {
            v += '"'; i += 2;
          } else if (line[i] === '"') {
            i++; break;
          } else {
            v += line[i]; i++;
          }
        }
        fields.push(v);
        if (line[i] === ',') i++;
      } else {
        // unquoted field
        let v = '';
        while (i < line.length && line[i] !== ',') { v += line[i]; i++; }
        fields.push(v);
        if (line[i] === ',') i++;
      }
    }
    rows.push(fields);
  }
  return rows;
}

// Type-infer a column from its sample values: integer, real, or text.
// Used so JOINs on `cert` work as numeric (so cert=628 in SQL doesn't
// silently fail to match a text "628" with a leading space).
function inferType(samples) {
  let isInt = true;
  let isReal = true;
  let allEmpty = true;
  for (const s of samples) {
    if (s === '' || s == null) continue;
    allEmpty = false;
    if (!/^-?\d+$/.test(s)) isInt = false;
    if (!/^-?\d+(?:\.\d+)?$/.test(s)) isReal = false;
  }
  if (allEmpty) return 'TEXT';
  if (isInt) return 'INTEGER';
  if (isReal) return 'REAL';
  return 'TEXT';
}

function loadTable(db, tableName, csvPath) {
  if (!fs.existsSync(csvPath)) {
    console.error(`Missing CSV: ${csvPath}`);
    process.exit(2);
  }
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length < 2) {
    console.warn(`  ${tableName}: empty CSV`);
    return;
  }
  const cols = rows[0];
  const data = rows.slice(1);

  // Sample first 50 rows to infer column types.
  const colTypes = cols.map((_, ci) => {
    const samples = data.slice(0, 50).map((r) => r[ci]);
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
        if (v === '' || v == null) return null;
        if (colTypes[i] === 'INTEGER') return parseInt(v, 10);
        if (colTypes[i] === 'REAL') return parseFloat(v);
        return v;
      });
      insert.run(padded);
    }
  });
  insertMany(data);
  console.log(`  ${tableName.padEnd(15)} ${data.length} rows  (cols: ${cols.length})`);
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  console.log('Loading FDIC CSVs into in-memory SQLite...\n');
  const db = new Database(':memory:');
  loadTable(db, 'institutions',  path.join(DATA_DIR, 'institutions.csv'));
  loadTable(db, 'financials',    path.join(DATA_DIR, 'financials.csv'));
  loadTable(db, 'branches',      path.join(DATA_DIR, 'branches.csv'));
  loadTable(db, 'failures',      path.join(DATA_DIR, 'failures.csv'));
  loadTable(db, 'summary_state', path.join(DATA_DIR, 'summary_state.csv'));

  console.log('\nLoading challenges from sector-challenges.js...\n');
  const challenges = loadSectorChallenges();
  if (challenges.length === 0) {
    console.warn('No finans_banking challenges found yet. Add some to sector-challenges.js then re-run.');
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
      console.log(`     PASS  ${rowCount} rows, cols: [${cols.join(', ')}]`);
      // Preview first 2 rows
      result.slice(0, 2).forEach((r) => {
        const flat = Object.entries(r)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ').slice(0, 140);
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
