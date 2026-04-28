#!/usr/bin/env node
//
// scripts/download-uretim-data.js
//
// Builds the üretim (manufacturing) sector dataset from the UCI AI4I 2020
// Predictive Maintenance dataset.
//
// IMPORTANT — disclosure:
// AI4I 2020 is a SYNTHETIC industry-standard benchmark dataset published
// by Stephan Matzka (2020). It is NOT raw factory floor data — that is
// not publicly available under permissive licenses. AI4I IS, however, the
// canonical predictive maintenance benchmark used by Siemens / GE Digital /
// Honeywell ML teams for model training and evaluation. Industrial
// engineers recognize the column structure (rotational_speed_rpm,
// torque_nm, tool_wear_min) and the FMEA failure modes (TWF, HDF, PWF,
// OSF, RNF) — these reflect real-world physics and real failure
// taxonomies used in maintenance engineering.
//
// Source: https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset
// License: CC BY 4.0 (Matzka, S., 2020). Commercial use permitted with attribution.
//
// We split the original 10k-row single CSV into four relational tables
// for SQL practice:
//
//   products          1000 rows | unique product_id, quality type, tool wear
//   operational_data  1000 rows | sensor readings per UDI (temps, rpm, torque)
//   failure_events    1000 rows | overall failure flag + 5 mode flags per UDI
//   failure_modes        5 rows | lookup: code, name, fmea_category
//
// The sample is random within the CSV (preserves the ~3.4% failure rate
// of the source dataset). FK on UDI joins all three observation tables.
//
// Run:    node scripts/download-uretim-data.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src/data/sectors/uretim');
fs.mkdirSync(OUT_DIR, { recursive: true });

const ZIP_URL = 'https://archive.ics.uci.edu/static/public/601/ai4i+2020+predictive+maintenance+dataset.zip';
const SAMPLE_SIZE = 1000;

// ─── Lookup table for failure modes (hand-authored, public knowledge) ──

const FAILURE_MODES = [
  { code: 'TWF', name: 'Tool Wear Failure',         fmea_category: 'Mechanical',  description: 'Tool wear exceeded threshold (~200 minutes)' },
  { code: 'HDF', name: 'Heat Dissipation Failure',  fmea_category: 'Thermal',     description: 'Air-process temperature differential too low + high rotational speed' },
  { code: 'PWF', name: 'Power Failure',             fmea_category: 'Electrical',  description: 'Required process power outside [3500, 9000] W envelope' },
  { code: 'OSF', name: 'Overstrain Failure',        fmea_category: 'Mechanical',  description: 'Tool wear × torque product too high (per-quality threshold)' },
  { code: 'RNF', name: 'Random Failure',            fmea_category: 'Stochastic',  description: 'Random process upset; uncorrelated with sensor signals' },
];

// ─── CSV parser ──────────────────────────────────────────────────────

function parseCsv(content) {
  const rows = [];
  // Strip BOM if present (the AI4I file has a leading byte-order mark).
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  const lines = content.split('\n').filter((l) => l.length > 0);
  for (const line of lines) {
    // AI4I file is well-formed (no quoted fields with commas), so a
    // simple split is safe.
    rows.push(line.split(','));
  }
  return rows;
}

// ─── CSV writer ──────────────────────────────────────────────────────

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function writeCsv(file, rows) {
  if (!rows.length) { fs.writeFileSync(file, '', 'utf8'); return; }
  const cols = Object.keys(rows[0]);
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map((c) => csvEscape(r[c])).join(','));
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log('Building üretim dataset from UCI AI4I 2020...\n');

  // 1) Download the zip (or reuse if already extracted)
  const localCsv = '/tmp/ai4i_data/ai4i2020.csv';
  if (!fs.existsSync(localCsv)) {
    console.log('Downloading + extracting AI4I zip...');
    const { execSync } = await import('node:child_process');
    fs.mkdirSync('/tmp/ai4i_data', { recursive: true });
    execSync(`curl -sL '${ZIP_URL}' -o /tmp/ai4i.zip && unzip -o /tmp/ai4i.zip -d /tmp/ai4i_data`,
      { stdio: 'inherit' });
  }

  // 2) Parse CSV
  const content = fs.readFileSync(localCsv, 'utf8');
  const rows = parseCsv(content);
  const cols = rows[0]; // ['UDI','Product ID','Type','Air temperature [K]','Process temperature [K]','Rotational speed [rpm]','Torque [Nm]','Tool wear [min]','Machine failure','TWF','HDF','PWF','OSF','RNF']
  const data = rows.slice(1);
  console.log(`  Loaded ${data.length} rows × ${cols.length} columns`);

  // 3) Random sample preserving failure distribution.
  // The source has ~340 failures in 10k rows (3.4%). Random sampling
  // preserves the rate; for 1000 rows we expect ~34 failures.
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const sampled = shuffled.slice(0, SAMPLE_SIZE);
  console.log(`  Sampled ${sampled.length} rows`);
  const failuresInSample = sampled.filter((r) => r[8] === '1').length;
  console.log(`  ${failuresInSample} failures in sample (${(100 * failuresInSample / sampled.length).toFixed(1)}%)`);

  // 4) Split into 3 relational tables on UDI.
  const products = sampled.map((r) => ({
    udi: parseInt(r[0], 10),
    product_id: r[1],
    type: r[2],                       // L / M / H quality
    tool_wear_min: parseInt(r[7], 10),
  }));
  const operational = sampled.map((r) => ({
    udi: parseInt(r[0], 10),
    air_temp_k: parseFloat(r[3]),
    process_temp_k: parseFloat(r[4]),
    rotational_speed_rpm: parseInt(r[5], 10),
    torque_nm: parseFloat(r[6]),
  }));
  const failureEvents = sampled.map((r) => ({
    udi: parseInt(r[0], 10),
    machine_failure: parseInt(r[8], 10),
    twf: parseInt(r[9], 10),
    hdf: parseInt(r[10], 10),
    pwf: parseInt(r[11], 10),
    osf: parseInt(r[12], 10),
    rnf: parseInt(r[13], 10),
  }));

  // 5) Write CSVs (for inspection) + JS shim
  writeCsv(path.join(OUT_DIR, 'products.csv'), products);
  writeCsv(path.join(OUT_DIR, 'operational_data.csv'), operational);
  writeCsv(path.join(OUT_DIR, 'failure_events.csv'), failureEvents);
  writeCsv(path.join(OUT_DIR, 'failure_modes.csv'), FAILURE_MODES);

  console.log('\n→ Writing JS shim for data bundle');
  const shim = buildShim({
    products, operational_data: operational,
    failure_events: failureEvents, failure_modes: FAILURE_MODES,
  });
  fs.writeFileSync(path.join(ROOT, 'src/data/uretim-data.js'), shim, 'utf8');

  console.log('\n─── Done ──────────────────────────────');
  console.log(`  products          ${products.length} rows`);
  console.log(`  operational_data  ${operational.length} rows`);
  console.log(`  failure_events    ${failureEvents.length} rows`);
  console.log(`  failure_modes     ${FAILURE_MODES.length} rows`);
  console.log(`\n  Wrote ${OUT_DIR}/ + src/data/uretim-data.js\n`);
}

function buildShim(tables) {
  const tableEntries = {};
  for (const [name, rows] of Object.entries(tables)) {
    if (!rows.length) { tableEntries[name] = { columns: [], data: [] }; continue; }
    const cols = Object.keys(rows[0]);
    const data = rows.map((r) => cols.map((c) => r[c] ?? null));
    tableEntries[name] = { columns: cols, data };
  }
  // Disclosure is in the description so it surfaces in the in-app dataset
  // info panel — users see exactly what they're learning on.
  const desc = "Industry-standard predictive maintenance benchmark dataset from UCI ML Repository (Matzka 2020). Used by Siemens, GE Digital, Honeywell ML teams for predictive-maintenance research. Real industrial column structure (rotational speed, torque, tool wear) and real FMEA failure modes (TWF tool-wear, HDF heat-dissipation, PWF power, OSF overstrain, RNF random) — but synthetic data underneath, since real factory IoT data is not publicly available under permissive licenses.";
  const header = `// SQL Quest — üretim sector dataset (generated)
//
// DO NOT EDIT BY HAND. Regenerate via:
//   node scripts/download-uretim-data.js
//
// Source: UCI ML Repository AI4I 2020 Predictive Maintenance Dataset (Matzka 2020)
// License: CC BY 4.0 — commercial redistribution permitted with attribution.
// See ATTRIBUTION + IMPORTANT DISCLOSURE notes in the dataset description.

window.publicDatasetsData = window.publicDatasetsData || {};
window.publicDatasetsData.uretim_industrial = {
  name: "Industrial Predictive Maintenance (UCI AI4I 2020)",
  icon: "Factory",
  description: ${JSON.stringify(desc)},
  source: "UCI ML Repository AI4I 2020 (Matzka 2020)",
  source_url: "https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset",
  sector: "uretim",
  tables: ${JSON.stringify(tableEntries, null, 2)}
};
`;
  return header;
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
