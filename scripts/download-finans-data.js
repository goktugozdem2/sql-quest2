#!/usr/bin/env node
//
// scripts/download-finans-data.js
//
// Fetches real banking data from the FDIC BankFind Suite API and writes a
// SQL Quest-shaped dataset into src/data/sectors/finans/. Used by the
// finans sector content (Phase 2.1A — see docs/sector-content-plan.md).
//
// Source: https://banks.data.fdic.gov/api/  (US Government public domain
// data, 17 USC §105 — commercially redistributable with no restriction).
//
// What we end up with:
//
//   institutions  ~200 rows  | top US banks by assets, real RSSD/CERT IDs
//   financials    ~800 rows  | 4 quarters of call report data per bank
//   branches      ~1000 rows | sampled branches across top 50 banks
//   failures      ~570 rows  | every FDIC-recorded bank failure since 2001
//   summary_state  ~52 rows  | state-level aggregate snapshot (2025)
//
// Outputs:
//   src/data/sectors/finans/<table>.csv   — raw, human-inspectable, git-diffable
//   src/data/sectors/finans/finans-data.js — JS shim, registers
//                                             window.publicDatasetsData.finans
//
// Re-run anytime to refresh. The output is idempotent given the same API
// snapshot (the FDIC quarterly reports update on a fixed cadence).
//
// Run:    node scripts/download-finans-data.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src/data/sectors/finans');
fs.mkdirSync(OUT_DIR, { recursive: true });

const API = 'https://banks.data.fdic.gov/api';

// ─── Fetch helpers ──────────────────────────────────────────────────

// Total-cap semantics: `params.limit` is the TOTAL number of rows we want
// across all pages. Set high (e.g. 100_000) for "fetch all". The page size
// per-request is min(total, 1000) — FDIC API caps each page at 1000.
async function fetchPaged(endpoint, params = {}, label = endpoint) {
  const totalCap = Number(params.limit) || 1000;
  const pageSize = Math.min(totalCap, 1000);
  const all = [];
  let offset = 0;
  // Hard ceiling to prevent runaway requests on misconfig.
  for (let page = 0; page < 100; page++) {
    if (all.length >= totalCap) break;
    const url = new URL(`${API}/${endpoint}`);
    for (const [k, v] of Object.entries(params)) {
      if (k === 'limit' || k === 'offset') continue;
      if (v != null) url.searchParams.set(k, String(v));
    }
    const remaining = totalCap - all.length;
    url.searchParams.set('limit', String(Math.min(pageSize, remaining)));
    url.searchParams.set('offset', String(offset));
    process.stdout.write(`  ${label} page ${page + 1}…`);
    const resp = await fetch(url.toString(), { redirect: 'follow' });
    if (!resp.ok) throw new Error(`${endpoint} → HTTP ${resp.status}`);
    const json = await resp.json();
    const rows = (json.data || []).map((d) => d.data || d);
    process.stdout.write(` ${rows.length} rows\n`);
    all.push(...rows);
    if (rows.length < pageSize) break;
    offset += rows.length;
  }
  return all.slice(0, totalCap);
}

// ─── Field mapping ───────────────────────────────────────────────────
// The FDIC API uses ALL_CAPS legacy names (CERT, ASSET, IDT1CER, LNRENRES
// etc). We rename to lower_snake_case for SQL ergonomics, but keep the
// industry-recognizable parts (asset, dep, tier1, npl_ratio) so a banker
// looking at the schema feels at home.

const INSTITUTION_FIELDS = [
  'CERT', 'NAME', 'CITY', 'STALP', 'ZIP',
  'CHARTER', 'ESTYMD', 'ASSET', 'DEP', 'EQ',
  'OFFICES', 'BKCLASS',
];
const RENAME_INSTITUTION = {
  CERT: 'cert', NAME: 'name', CITY: 'city', STALP: 'state',
  ZIP: 'zip', CHARTER: 'charter_class', ESTYMD: 'established_date',
  ASSET: 'total_assets', DEP: 'total_deposits', EQ: 'total_equity',
  OFFICES: 'office_count', BKCLASS: 'bank_class',
};

const FINANCIAL_FIELDS = [
  'CERT', 'NAME', 'REPDTE',
  'ASSET', 'DEP', 'EQ', 'NETINC',
  'LNLSNET', 'LNATRES', 'NPERFV',
  'IDT1CER', 'ROA', 'ROE',
];
const RENAME_FINANCIAL = {
  CERT: 'cert', NAME: 'name', REPDTE: 'period_end',
  ASSET: 'total_assets', DEP: 'total_deposits', EQ: 'total_equity',
  NETINC: 'net_income', LNLSNET: 'net_loans',
  LNATRES: 'loan_loss_allowance', NPERFV: 'npl_ratio',
  IDT1CER: 'tier1_capital_ratio', ROA: 'return_on_assets',
  ROE: 'return_on_equity',
};

const BRANCH_FIELDS = [
  'BRNUM', 'CERT', 'NAMEFULL', 'ADDRESS', 'CITY', 'STALP', 'ZIP',
  'SERVTYPE_DESC',
];
const RENAME_BRANCH = {
  BRNUM: 'branch_number', CERT: 'cert', NAMEFULL: 'branch_name',
  ADDRESS: 'address', CITY: 'city', STALP: 'state', ZIP: 'zip',
  SERVTYPE_DESC: 'service_type',
};

const FAILURE_FIELDS = [
  'CERT', 'NAME', 'CITY', 'STALP', 'FAILDATE',
  'QBFASSET', 'QBFDEP', 'RESTYPE', 'COST',
];
const RENAME_FAILURE = {
  CERT: 'cert', NAME: 'name', CITY: 'city', STALP: 'state',
  FAILDATE: 'failure_date', QBFASSET: 'pre_failure_assets',
  QBFDEP: 'pre_failure_deposits', RESTYPE: 'resolution_type',
  COST: 'estimated_loss',
};

const SUMMARY_FIELDS = [
  'YEAR', 'STNAME', 'COUNT', 'ASSET', 'DEP', 'NETINC',
];
const RENAME_SUMMARY = {
  YEAR: 'year', STNAME: 'state_name', COUNT: 'bank_count',
  ASSET: 'total_assets', DEP: 'total_deposits', NETINC: 'net_income',
};

function rename(rows, map) {
  return rows.map((r) => {
    const out = {};
    for (const [from, to] of Object.entries(map)) {
      if (Object.prototype.hasOwnProperty.call(r, from)) out[to] = r[from];
      else out[to] = null;
    }
    return out;
  });
}

// ─── CSV writer (RFC 4180-ish) ──────────────────────────────────────

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function writeCsv(file, rows) {
  if (!rows.length) {
    fs.writeFileSync(file, '', 'utf8');
    return;
  }
  const cols = Object.keys(rows[0]);
  const lines = [cols.join(',')];
  for (const r of rows) {
    lines.push(cols.map((c) => csvEscape(r[c])).join(','));
  }
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('Downloading FDIC banking data...\n');

  // 1) Top 200 active banks by assets
  console.log('1/5  institutions (top 200 by assets)');
  const instRaw = await fetchPaged('institutions', {
    filters: 'ACTIVE:1',
    fields: INSTITUTION_FIELDS.join(','),
    sort_by: 'ASSET',
    sort_order: 'DESC',
    limit: 200,
  }, 'institutions');
  const institutions = rename(instRaw, RENAME_INSTITUTION);
  writeCsv(path.join(OUT_DIR, 'institutions.csv'), institutions);

  // The CERTs we'll join on for downstream tables.
  const topCerts = institutions.map((r) => r.cert).filter(Boolean);

  // 2) Last 4 reporting periods of financials per top bank.
  // FDIC reporting periods are quarterly: 0331, 0630, 0930, 1231 of each year.
  // Pull the latest 4 (covers the most-recent year).
  console.log('\n2/5  financials (latest 4 quarters, top banks only)');
  const periods = ['20251231', '20250930', '20250630', '20250331'];
  const financialsAll = [];
  for (const period of periods) {
    // FDIC API caps at 1000 per call — and we only have 200 banks, so one call/period suffices.
    // But the 'filters' arg only takes a single CERT; we have to query without
    // a CERT filter and then in-memory filter to topCerts.
    const finRaw = await fetchPaged('financials', {
      filters: `REPDTE:${period}`,
      fields: FINANCIAL_FIELDS.join(','),
      sort_by: 'ASSET',
      sort_order: 'DESC',
      limit: 200,
    }, `financials ${period}`);
    const renamed = rename(finRaw, RENAME_FINANCIAL);
    financialsAll.push(...renamed.filter((r) => topCerts.includes(r.cert)));
  }
  writeCsv(path.join(OUT_DIR, 'financials.csv'), financialsAll);

  // 3) Sample of branches: 5 per bank × top 50 banks = 250 rows.
  // Keep it tight — branch tables are deep + we want JOINs to fit in head.
  console.log('\n3/5  branches (5 per bank × top 50)');
  const top50 = topCerts.slice(0, 50);
  const branchesAll = [];
  for (const cert of top50) {
    const branchRaw = await fetchPaged('locations', {
      filters: `CERT:${cert}`,
      fields: BRANCH_FIELDS.join(','),
      limit: 5,
    }, `branches CERT=${cert}`);
    const renamed = rename(branchRaw, RENAME_BRANCH);
    branchesAll.push(...renamed);
  }
  writeCsv(path.join(OUT_DIR, 'branches.csv'), branchesAll);

  // 4) Recent bank failures (last ~25 years gets us 600 rows).
  console.log('\n4/5  failures (most recent 600)');
  const failRaw = await fetchPaged('failures', {
    fields: FAILURE_FIELDS.join(','),
    sort_by: 'FAILDATE',
    sort_order: 'DESC',
    limit: 600,
  }, 'failures');
  const failures = rename(failRaw, RENAME_FAILURE);
  writeCsv(path.join(OUT_DIR, 'failures.csv'), failures);

  // 5) State-level summary (community banks aggregate, latest year).
  // 56 US states + territories.
  console.log('\n5/5  summary_state (per-state rollup, latest year)');
  const sumRaw = await fetchPaged('summary', {
    filters: 'YEAR:2025',
    fields: SUMMARY_FIELDS.join(','),
    limit: 60,
  }, 'summary');
  const summary = rename(sumRaw, RENAME_SUMMARY);
  writeCsv(path.join(OUT_DIR, 'summary_state.csv'), summary);

  // ─── Build the JS shim that the data bundle picks up ──────────────
  // CSVs stay in src/data/sectors/finans/ for human inspection + git diff.
  // The JS shim goes flat into src/data/ so the bundle pipeline finds it
  // by name (matches the existing convention with datasets.js, goals.js).
  console.log('\n→ Writing JS shim for data bundle');
  const shim = buildShim({
    institutions, financials: financialsAll, branches: branchesAll,
    failures, summary_state: summary,
  });
  fs.writeFileSync(path.join(ROOT, 'src/data/finans-data.js'), shim, 'utf8');
  // Clean up the legacy in-sector copy if it exists from earlier runs.
  const legacyCopy = path.join(OUT_DIR, 'finans-data.js');
  if (fs.existsSync(legacyCopy)) fs.unlinkSync(legacyCopy);

  // Print summary
  console.log('\n─── Done ──────────────────────────────');
  console.log(`  institutions   ${institutions.length} rows`);
  console.log(`  financials     ${financialsAll.length} rows`);
  console.log(`  branches       ${branchesAll.length} rows`);
  console.log(`  failures       ${failures.length} rows`);
  console.log(`  summary_state  ${summary.length} rows`);
  console.log(`\n  Wrote ${OUT_DIR}/`);
  console.log('  • CSVs (human-inspectable)');
  console.log('  • finans-data.js (JS shim for bundle)\n');
}

function buildShim(tables) {
  // Build the SQL Quest publicDatasetsData entry. Keep the same shape as
  // the existing datasets.js entries (titanic, employees, movies) so the
  // SQLite-WASM loader can ingest it without special-casing.
  const tableEntries = {};
  for (const [tableName, rows] of Object.entries(tables)) {
    if (!rows.length) {
      tableEntries[tableName] = { columns: [], data: [] };
      continue;
    }
    const cols = Object.keys(rows[0]);
    const data = rows.map((r) => cols.map((c) => r[c] ?? null));
    tableEntries[tableName] = { columns: cols, data };
  }

  const header = `// SQL Quest — finans sector dataset (generated)
//
// DO NOT EDIT BY HAND. Regenerate via:
//   node scripts/download-finans-data.js
//
// Source: FDIC BankFind Suite API (https://banks.data.fdic.gov/api/)
// License: U.S. Government public domain (17 U.S.C. §105) — commercially
// redistributable with no restriction. We add an attribution note in
// SECTOR_MVP_SETUP.md and the in-app dataset description below.

window.publicDatasetsData = window.publicDatasetsData || {};
window.publicDatasetsData.finans_banking = {
  name: "US Banking (FDIC)",
  icon: "Building2",
  description: "Real US bank financials from the FDIC BankFind Suite — top 200 banks by assets, 4 quarters of call report data, sampled branches, all historical failures, plus state-level rollups. Real RSSD/CERT identifiers and tier1/NPL ratios that working bankers recognize.",
  source: "FDIC BankFind Suite (US Government, public domain)",
  source_url: "https://banks.data.fdic.gov/api/",
  sector: "finans",
  tables: ${JSON.stringify(tableEntries, null, 2)}
};
`;
  return header;
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
