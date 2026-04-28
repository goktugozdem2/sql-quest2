#!/usr/bin/env node
//
// scripts/validate-sector-challenges.js
//
// Sector-agnostic validator. Loads each sector's CSVs into a separate
// in-memory SQLite DB (so finans tables don't collide with gayrimenkul
// tables of the same name), then runs every challenge in
// src/data/sector-challenges.js against the right DB based on its
// `dataset` field. Prints PASS/FAIL with a 2-row preview.
//
// Run after editing any sector's challenges or refreshing any dataset:
//   node scripts/validate-sector-challenges.js
//
// Optionally filter to one sector:
//   node scripts/validate-sector-challenges.js finans
//   node scripts/validate-sector-challenges.js gayrimenkul
//   node scripts/validate-sector-challenges.js uretim

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CHALLENGES_FILE = path.join(ROOT, 'src/data/sector-challenges.js');
const SECTOR_FILTER = process.argv[2] || null; // optional CLI filter

// ─── Sector → CSV directory + dataset key map ────────────────────────
//
// Add new sectors here as we ship them. The dataset key matches the
// challenge.dataset string and the window.publicDatasetsData entry.
const SECTORS = [
  { id: 'finans',      datasetKey: 'finans_banking',   csvDir: 'src/data/sectors/finans' },
  { id: 'gayrimenkul', datasetKey: 'gayrimenkul_nyc',  csvDir: 'src/data/sectors/gayrimenkul' },
  { id: 'uretim',      datasetKey: 'uretim_industrial',csvDir: 'src/data/sectors/uretim' },
];

// ─── CSV parser ──────────────────────────────────────────────────────

function parseCsv(content) {
  const rows = [];
  const lines = content.split('\n').filter((l) => l.length > 0);
  for (const line of lines) {
    const fields = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        let v = '';
        i++;
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { v += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { v += line[i]; i++; }
        }
        fields.push(v);
        if (line[i] === ',') i++;
      } else {
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

function inferType(samples) {
  let isInt = true, isReal = true, allEmpty = true;
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
  if (!fs.existsSync(csvPath)) return false;
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(content);
  if (rows.length < 2) { return false; }
  const cols = rows[0];
  const data = rows.slice(1);
  const colTypes = cols.map((_, ci) => inferType(data.slice(0, 50).map((r) => r[ci])));
  const colDefs = cols.map((c, i) => `"${c}" ${colTypes[i]}`).join(', ');
  db.exec(`DROP TABLE IF EXISTS ${tableName}`);
  db.exec(`CREATE TABLE ${tableName} (${colDefs})`);
  const placeholders = cols.map(() => '?').join(',');
  const insert = db.prepare(`INSERT INTO ${tableName} VALUES (${placeholders})`);
  const insertMany = db.transaction((rs) => {
    for (const r of rs) {
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
  return data.length;
}

function loadSectorDb(sector) {
  const dir = path.join(ROOT, sector.csvDir);
  if (!fs.existsSync(dir)) return null;
  const db = new Database(':memory:');
  const csvFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.csv'));
  for (const f of csvFiles) {
    const tableName = f.replace(/\.csv$/, '');
    const count = loadTable(db, tableName, path.join(dir, f));
    if (count) console.log(`    ${sector.id}.${tableName.padEnd(15)} ${count} rows`);
  }
  return db;
}

function loadSectorChallenges() {
  const src = fs.readFileSync(CHALLENGES_FILE, 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.sectorChallengesData || [];
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  console.log('Loading sector CSVs into in-memory SQLite (per-sector)...\n');
  const dbs = {};
  for (const sector of SECTORS) {
    if (SECTOR_FILTER && sector.id !== SECTOR_FILTER) continue;
    process.stdout.write(`  ${sector.id} (${sector.datasetKey}):\n`);
    const db = loadSectorDb(sector);
    if (db) dbs[sector.datasetKey] = db;
    else console.log(`    (no CSVs at ${sector.csvDir})`);
  }

  console.log('\nLoading challenges from sector-challenges.js...\n');
  const allChallenges = loadSectorChallenges();
  const challenges = SECTOR_FILTER
    ? allChallenges.filter((c) => {
        const sec = SECTORS.find((s) => s.id === SECTOR_FILTER);
        return sec && c.dataset === sec.datasetKey;
      })
    : allChallenges;
  if (challenges.length === 0) {
    console.warn('No matching challenges found.');
    process.exit(0);
  }

  let pass = 0, fail = 0;
  let lastSector = null;
  for (const c of challenges) {
    const id = c.id ?? '?';
    const title = c.title || '(untitled)';
    const sql = c.solution || '';
    const datasetKey = c.dataset;
    const db = dbs[datasetKey];

    // Sector header
    const sectorOfThis = SECTORS.find((s) => s.datasetKey === datasetKey);
    if (sectorOfThis && sectorOfThis.id !== lastSector) {
      console.log(`\n  ═══ ${sectorOfThis.id.toUpperCase()} ═══`);
      lastSector = sectorOfThis.id;
    }

    process.stdout.write(`  #${String(id).padEnd(3)} [${(c.difficulty || '?').padEnd(6)}] ${title}\n`);
    if (!db) { console.log(`     SKIP  no DB for dataset=${datasetKey}\n`); continue; }
    if (!sql) { console.log(`     FAIL  no solution\n`); fail++; continue; }
    try {
      const stmt = db.prepare(sql);
      const result = stmt.all();
      const rowCount = result.length;
      const cols = rowCount > 0 ? Object.keys(result[0]) : [];
      console.log(`       PASS  ${rowCount} rows, cols: [${cols.join(', ')}]`);
      result.slice(0, 2).forEach((r) => {
        const flat = Object.entries(r).map(([k, v]) => `${k}=${v}`).join(', ').slice(0, 140);
        console.log(`             ${flat}`);
      });
      console.log('');
      pass++;
    } catch (err) {
      console.log(`       FAIL  ${err.message}\n`);
      fail++;
    }
  }

  console.log(`─── ${pass} passed, ${fail} failed ───`);
  for (const db of Object.values(dbs)) db.close();
  process.exit(fail === 0 ? 0 : 1);
}

main();
