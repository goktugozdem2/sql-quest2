#!/usr/bin/env node
// Export the synthetic card-transactions dataset (finans_fraud) as open CSVs
// for GitHub / Kaggle — the SEO read of 2026-09-22, item 6: in this category
// authority is not bought, it is earned by publishing something people use.
//
//   node scripts/export-open-dataset.mjs
//   → datasets/card-transactions/{accounts,merchants,transactions,chargebacks}.csv
//     + README.md + LICENSE
//
// The data is ours and synthetic (scripts/generate-fraud-transactions.js,
// seed 20260503). Two things are remapped for publication, and ONLY for
// publication — the app keeps its data byte for byte:
//   - email domain inbox.dev → inbox.example. `.dev` is a real TLD; a public
//     file of user1..userN@inbox.dev addresses could hit real mailboxes.
//     example.com and mail.test are reserved already and stay.
//   - ip_block → RFC 5737 documentation ranges (192.0.2.0/24,
//     198.51.100.0/24, 203.0.113.0/24), one-to-one in order of first
//     appearance, so accounts that share an address still share one.
// Nothing is published by this script. Publishing is the founder's step.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'datasets', 'card-transactions');

const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/finans-fraud-data.js'), 'utf8'), sandbox);
const ds = sandbox.window.publicDatasetsData.finans_fraud;

const DOC_RANGES = ['192.0.2', '198.51.100', '203.0.113'];
const ipMap = new Map();
const docIp = (ip) => {
  if (ip === null || ip === undefined || ip === '') return ip;
  if (!ipMap.has(ip)) {
    const n = ipMap.size;
    const range = DOC_RANGES[Math.floor(n / 254)];
    if (!range) throw new Error('more unique IPs than the documentation ranges hold');
    ipMap.set(ip, `${range}.${(n % 254) + 1}`);
  }
  return ipMap.get(ip);
};
const email = (e) => (typeof e === 'string' ? e.replace(/@inbox\.dev$/, '@inbox.example') : e);

const csvCell = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

fs.mkdirSync(OUT, { recursive: true });
const counts = {};
for (const [name, table] of Object.entries(ds.tables)) {
  const cols = table.columns;
  const rows = table.data || table.rows || [];
  const ei = cols.indexOf('email');
  const ii = cols.indexOf('ip_block');
  const lines = [cols.join(',')];
  for (const r of rows) {
    const row = Array.isArray(r) ? [...r] : cols.map(c => r[c]);
    if (ei >= 0) row[ei] = email(row[ei]);
    if (ii >= 0) row[ii] = docIp(row[ii]);
    lines.push(row.map(csvCell).join(','));
  }
  fs.writeFileSync(path.join(OUT, `${name}.csv`), lines.join('\n') + '\n');
  counts[name] = { rows: rows.length, cols };
}

const schema = Object.entries(counts)
  .map(([n, c]) => `| \`${n}.csv\` | ${c.rows.toLocaleString('en-US')} | ${c.cols.map(x => `\`${x}\``).join(', ')} |`)
  .join('\n');

fs.writeFileSync(path.join(OUT, 'README.md'), `# Card Transactions — a synthetic fraud dataset for SQL practice

A small, fully synthetic credit-card dataset for practising analytics and
fraud SQL: accounts, merchants, transactions and chargebacks, with realistic
fraud patterns injected on top of ordinary activity. It is the dataset behind
the card-transactions practice set on [SQL Quest](https://sqlquest.app/),
where every question on it runs in the browser and is graded against the
data — no setup.

## Tables

| File | Rows | Columns |
|---|---|---|
${schema}

Joins: \`transactions.account_id → accounts.account_id\`,
\`transactions.merchant_id → merchants.merchant_id\`,
\`chargebacks.txn_id → transactions.txn_id\`, and
\`chargebacks.related_chargeback_id → chargebacks.chargeback_id\` (a chain —
good for recursive CTEs).

## What is in it

Generated with a fixed seed (20260503), so every run of the generator gives
the same data. On top of ordinary activity the generator injects:

- 5 accounts flagged (\`accounts.status = 'flagged'\`)
- 5 accounts sharing one device fingerprint (\`dev_x4f2a9b1c7e\`) — a collusion
  ring; three of them are among the flagged
- 15 amount outliers (more than 3 standard deviations above the mean)
- 4 accounts with velocity bursts (6 or more transactions inside 5 minutes)
- accounts with impossible travel (a home-country purchase, then one on the
  other side of the world minutes later)
- chargebacks concentrated on the flagged accounts
- 6 chargebacks linked through \`related_chargeback_id\`: one 3-deep chain and
  one parent with two children

Every count above was checked against the published files. Some fraud is
planted without a label, on purpose: finding it is the exercise.

Questions it answers well: decline and chargeback rates by merchant risk
tier, velocity rules with window frames, anomaly bounds, shared-device rings,
the average-of-averages trap, and join fan-out.

## Fictional, and safe to publish

Everything is generated. Names of merchants are invented; no real person,
card or merchant is in it. For this public copy, email addresses use only
reserved domains (\`example.com\`, \`mail.test\`, \`inbox.example\`) and IP
addresses come from the RFC 5737 documentation ranges, mapped one-to-one so
accounts that share an address still share one.

## Practise on it

- In the browser, graded: [SQL Quest](https://sqlquest.app/) — the fraud
  analytics track and a timed card-transactions mock screen
- The walkthrough: [SQL for fraud analytics](https://sqlquest.app/blog/sql-for-fraud-analytics/)

## Licence

Public domain (CC0 1.0). Use it for anything. A link back to
[sqlquest.app](https://sqlquest.app/) is appreciated, not required.
`);

fs.writeFileSync(path.join(OUT, 'LICENSE'), `CC0 1.0 Universal — Public Domain Dedication

The person who associated a work with this deed has dedicated the work to the
public domain by waiving all of their rights to the work worldwide under
copyright law, including all related and neighbouring rights, to the extent
allowed by law. You can copy, modify, distribute and perform the work, even
for commercial purposes, all without asking permission.

Full text: https://creativecommons.org/publicdomain/zero/1.0/legalcode
`);

console.log(`[open-dataset] ${Object.entries(counts).map(([n, c]) => `${n} ${c.rows}`).join(', ')} → ${path.relative(ROOT, OUT)}`);
console.log(`[open-dataset] ${ipMap.size} IPs remapped to documentation ranges`);
