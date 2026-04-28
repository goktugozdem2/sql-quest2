#!/usr/bin/env node
//
// scripts/download-gayrimenkul-data.js
//
// Fetches real NYC real estate data from NYC OpenData (Socrata API) and
// writes a SQL Quest-shaped dataset into src/data/sectors/gayrimenkul/.
// Used by the gayrimenkul sector content (Phase 2.1B).
//
// Sources (NYC OpenData — covered by NYC Open Data Terms of Use, which
// permits commercial redistribution with attribution):
//
//   PLUTO Property Tax Lots:
//     https://data.cityofnewyork.us/resource/64uk-42ks.json
//   ACRIS Real Property Master (sales):
//     https://data.cityofnewyork.us/resource/bnx9-e6tj.json
//   ACRIS Legals (joins documents → BBL):
//     https://data.cityofnewyork.us/resource/8h5j-fqxa.json
//   ACRIS Parties (buyers + sellers):
//     https://data.cityofnewyork.us/resource/636b-3b5g.json
//   DOB Permit Issuance:
//     https://data.cityofnewyork.us/resource/ipu4-2q9a.json
//
// What we end up with:
//   properties     ~500 rows  | Manhattan + Brooklyn lots, real BBL,
//                              | assessed value, year built, building class
//   sales          ~500 rows  | recent ACRIS documents (DEED, MTGE)
//   sales_legals   ~500 rows  | document → BBL bridge (real property linkage)
//   sales_parties  ~1000 rows | buyers + sellers
//   permits        ~500 rows  | recent DOB permits with owner/work type
//
// FK relationships (rough; some orphan rows OK for LEFT JOIN practice):
//   sales_legals.document_id → sales.document_id
//   sales_parties.document_id → sales.document_id
//   sales_legals.bbl → properties.bbl
//   permits.bbl → properties.bbl
//
// Run:    node scripts/download-gayrimenkul-data.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src/data/sectors/gayrimenkul');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SOCRATA = 'https://data.cityofnewyork.us/resource';

async function fetchSocrata(resourceId, params = {}, label = resourceId) {
  const url = new URL(`${SOCRATA}/${resourceId}.json`);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  process.stdout.write(`  ${label}…`);
  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`${resourceId}: HTTP ${resp.status}`);
  const rows = await resp.json();
  process.stdout.write(` ${rows.length} rows\n`);
  return rows;
}

// ─── BBL helpers ────────────────────────────────────────────────────
//
// A NYC BBL is borough(1) + block(5, zero-padded) + lot(4, zero-padded) =
// 10 digit string. PLUTO returns the BBL as text-with-decimals (e.g.
// "4061730023.00000000"). ACRIS legals returns separate borough/block/lot
// columns. We canonicalize both sides to a 10-digit string for clean JOINs.

function canonicalizeBblFromPluto(rawBbl) {
  if (rawBbl == null) return null;
  // Strip decimals if present.
  const intPart = String(rawBbl).split('.')[0];
  // Pad to 10 digits.
  return intPart.padStart(10, '0');
}

function buildBblFromAcris(borough, block, lot) {
  if (borough == null || block == null || lot == null) return null;
  const b = String(borough).padStart(1, '0').slice(0, 1);
  const bk = String(block).padStart(5, '0').slice(-5);
  const lt = String(lot).padStart(4, '0').slice(-4);
  return `${b}${bk}${lt}`;
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
  console.log('Downloading NYC real-estate data...\n');

  // 1) Sales — recent (2024+) DEED/MTGE documents, sorted by amount desc
  console.log('1/5  sales (ACRIS Master, recent DEED/MTGE)');
  const salesRaw = await fetchSocrata('bnx9-e6tj', {
    $where: "document_date >= '2024-01-01' AND (doc_type = 'DEED' OR doc_type = 'MTGE')",
    $order: 'document_amt DESC',
    $limit: 500,
  }, 'sales');
  const sales = salesRaw.map((r) => ({
    document_id: r.document_id,
    record_type: r.record_type,
    doc_type: r.doc_type,
    recorded_borough: r.recorded_borough,
    document_date: r.document_date ? r.document_date.slice(0, 10) : null,
    document_amt: r.document_amt ? Number(r.document_amt) : null,
    recorded_datetime: r.recorded_datetime ? r.recorded_datetime.slice(0, 10) : null,
  }));
  writeCsv(path.join(OUT_DIR, 'sales.csv'), sales);

  const docIds = sales.map((s) => s.document_id).filter(Boolean);

  // 2) Sales legals — joins documents to BBL. Filter to our doc IDs.
  // ONE document can cover MANY BBLs (commercial portfolios), so we cap
  // total legals at 1500 to keep the dataset bounded but still rich enough
  // for multi-BBL JOIN practice.
  console.log('\n2/5  sales_legals (ACRIS Legals → BBL bridge)');
  const legalsAll = [];
  const LEGALS_CAP = 1500;
  for (let i = 0; i < docIds.length && legalsAll.length < LEGALS_CAP; i += 50) {
    const batch = docIds.slice(i, i + 50);
    const inList = batch.map((d) => `'${d}'`).join(',');
    const rows = await fetchSocrata('8h5j-fqxa', {
      $where: `document_id IN (${inList})`,
      $limit: 500,
    }, `legals batch ${i / 50 + 1}`);
    for (const r of rows) {
      if (legalsAll.length >= LEGALS_CAP) break;
      legalsAll.push({
        document_id: r.document_id,
        bbl: buildBblFromAcris(r.borough, r.block, r.lot),
        property_type: r.property_type,
        street_number: r.street_number,
        street_name: r.street_name,
        unit: r.unit,
      });
    }
  }
  writeCsv(path.join(OUT_DIR, 'sales_legals.csv'), legalsAll);

  // 3) Sales parties — buyer + seller. Same chunking.
  console.log('\n3/5  sales_parties (ACRIS Parties)');
  const partiesAll = [];
  for (let i = 0; i < docIds.length; i += 50) {
    const batch = docIds.slice(i, i + 50);
    const inList = batch.map((d) => `'${d}'`).join(',');
    const rows = await fetchSocrata('636b-3b5g', {
      $where: `document_id IN (${inList})`,
      $limit: 500,
    }, `parties batch ${i / 50 + 1}`);
    for (const r of rows) {
      partiesAll.push({
        document_id: r.document_id,
        // ACRIS party_type: 1 = first party (typically grantor/seller in DEED),
        // 2 = second party (typically grantee/buyer). We surface the role
        // explicitly — it's confusing otherwise.
        party_type: r.party_type,
        party_role: r.party_type === '1' ? 'SELLER'
                  : r.party_type === '2' ? 'BUYER' : 'OTHER',
        name: r.name,
      });
    }
  }
  writeCsv(path.join(OUT_DIR, 'sales_parties.csv'), partiesAll);

  // 4) Properties — fetch the BBLs that came back in legals.
  console.log('\n4/5  properties (PLUTO, MN + BK separately)');
  const bblSet = [...new Set(legalsAll.map((l) => l.bbl).filter(Boolean))];
  // Two passes (one per borough) — Socrata's IN-list returns rows in
  // arbitrary order and one borough can saturate the limit. Fetching
  // each borough separately + ordering by assessed value ensures we
  // get a meaningful mix at the top of the dataset.
  const mnRaw = await fetchSocrata('64uk-42ks', {
    $where: "borough='MN'",
    $order: 'assesstot DESC',
    $limit: 1000,
  }, 'PLUTO MN');
  const bkRaw = await fetchSocrata('64uk-42ks', {
    $where: "borough='BK'",
    $order: 'assesstot DESC',
    $limit: 1000,
  }, 'PLUTO BK');
  const plutoRaw = [...mnRaw, ...bkRaw];
  const properties = plutoRaw.map((r) => ({
    bbl: canonicalizeBblFromPluto(r.bbl),
    borough: r.borough,
    address: r.address,
    zip: r.zipcode,
    bldg_class: r.bldgclass,
    land_use: r.landuse,
    year_built: r.yearbuilt,
    num_floors: r.numfloors,
    units_residential: r.unitsres,
    units_total: r.unitstotal,
    lot_area_sqft: r.lotarea,
    bldg_area_sqft: r.bldgarea,
    assess_total: r.assesstot,
    owner_name: r.ownername,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
  // Keep ones that match our sales BBLs first (for the JOIN value), then
  // fill up to 500 with random Manhattan/Brooklyn so the table feels real.
  const matchedProps = properties.filter((p) => bblSet.includes(p.bbl));
  const otherProps = properties.filter((p) => !bblSet.includes(p.bbl));
  const finalProps = [...matchedProps, ...otherProps].slice(0, 500);
  writeCsv(path.join(OUT_DIR, 'properties.csv'), finalProps);

  // 5) Permits — recent issuances, sample 500.
  // NB: filing_date in DOB Permits is text "MM/DD/YYYY" — Socrata can't
  // do a date comparison on it directly. We pull most-recent by sorting
  // on dobrundate (which IS a real timestamp) and filter to ISSUED.
  console.log('\n5/5  permits (DOB Permit Issuance, most-recent ISSUED)');
  const permitsRaw = await fetchSocrata('ipu4-2q9a', {
    $where: "permit_status = 'ISSUED'",
    $order: 'dobrundate DESC',
    $limit: 500,
  }, 'permits');
  const permits = permitsRaw.map((r) => ({
    permit_id: r.permit_si_no,
    job_id: r.job__,
    bbl: buildBblFromAcris(boroughCode(r.borough), r.block, r.lot),
    borough: r.borough,
    permit_type: r.permit_type,
    permit_status: r.permit_status,
    work_type: r.work_type,
    filing_date: r.filing_date,
    issuance_date: r.issuance_date,
    expiration_date: r.expiration_date,
    bldg_type: r.bldg_type,
    owner_business_name: r.owner_s_business_name,
    owner_business_type: r.owner_s_business_type,
    permittee_business_name: r.permittee_s_business_name,
  }));
  writeCsv(path.join(OUT_DIR, 'permits.csv'), permits);

  // ─── JS shim for bundle ───────────────────────────────────────────
  console.log('\n→ Writing JS shim for data bundle');
  const shim = buildShim({
    properties: finalProps,
    sales,
    sales_legals: legalsAll,
    sales_parties: partiesAll,
    permits,
  });
  fs.writeFileSync(path.join(ROOT, 'src/data/gayrimenkul-data.js'), shim, 'utf8');

  console.log('\n─── Done ──────────────────────────────');
  console.log(`  properties     ${finalProps.length} rows`);
  console.log(`  sales          ${sales.length} rows`);
  console.log(`  sales_legals   ${legalsAll.length} rows`);
  console.log(`  sales_parties  ${partiesAll.length} rows`);
  console.log(`  permits        ${permits.length} rows`);
  console.log(`\n  Wrote ${OUT_DIR}/ + src/data/gayrimenkul-data.js\n`);
}

// PLUTO uses 2-letter borough codes (MN, BK); DOB Permits uses full names
// ('MANHATTAN'). Convert to ACRIS numeric (1=MN, 2=BX, 3=BK, 4=QN, 5=SI)
// for consistent BBL building.
function boroughCode(rawBorough) {
  if (!rawBorough) return null;
  const upper = String(rawBorough).toUpperCase();
  if (upper.includes('MAN')) return '1';
  if (upper.includes('BRONX')) return '2';
  if (upper.includes('BROOK')) return '3';
  if (upper.includes('QUEEN')) return '4';
  if (upper.includes('STATEN')) return '5';
  if (upper === 'MN') return '1';
  if (upper === 'BX') return '2';
  if (upper === 'BK') return '3';
  if (upper === 'QN') return '4';
  if (upper === 'SI') return '5';
  return null;
}

function buildShim(tables) {
  const tableEntries = {};
  for (const [name, rows] of Object.entries(tables)) {
    if (!rows.length) { tableEntries[name] = { columns: [], data: [] }; continue; }
    const cols = Object.keys(rows[0]);
    const data = rows.map((r) => cols.map((c) => r[c] ?? null));
    tableEntries[name] = { columns: cols, data };
  }
  const header = `// SQL Quest — gayrimenkul sector dataset (generated)
//
// DO NOT EDIT BY HAND. Regenerate via:
//   node scripts/download-gayrimenkul-data.js
//
// Source: NYC OpenData (https://opendata.cityofnewyork.us/)
// License: NYC Open Data Terms of Use — explicitly permits "commercial
// or noncommercial purposes" with attribution.

window.publicDatasetsData = window.publicDatasetsData || {};
window.publicDatasetsData.gayrimenkul_nyc = {
  name: "NYC Real Estate (OpenData)",
  icon: "Home",
  description: "Real NYC property data — PLUTO lots (Manhattan + Brooklyn), ACRIS sales + legals + parties, DOB permits. Real BBL identifiers and ACRIS document types that working real-estate analysts recognize.",
  source: "NYC OpenData (PLUTO + ACRIS + DOB)",
  source_url: "https://opendata.cityofnewyork.us/",
  sector: "gayrimenkul",
  tables: ${JSON.stringify(tableEntries, null, 2)}
};
`;
  return header;
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
