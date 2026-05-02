// Generate synthetic credit-card transaction dataset for the
// transaction-level fraud track. Output → src/data/finans-fraud-data.js
//
// Design goals:
//   - Realistic enough that the 5 fraud SQL patterns produce real rows
//     (anomaly bounds, velocity, geographic mismatch, collusion, chargeback)
//   - Small enough to ship inline in the bundled data.js (target <400KB)
//   - Deterministic — uses a seeded PRNG so regeneration produces the
//     same dataset (matters for the validate-finans-fraud script + tests)
//   - Honest — fraud is INJECTED on top of a baseline of realistic
//     legitimate behavior, with the injection clearly documented in the
//     generator (not "everything is fraud" or "nothing is fraud")
//
// Scale (chosen for shippability):
//   accounts:     200   (10 of which are fraud, 5 are collusion ring)
//   merchants:    25
//   transactions: ~2000  (10/account legit baseline + fraud bursts)
//   chargebacks:  ~70   (~3.5% of txns, biased toward fraud accounts)
//
// To regenerate:
//   node scripts/generate-fraud-transactions.js
//
// To validate (the resulting challenges run successfully):
//   node scripts/validate-fraud-challenges.js  (TODO — after challenges land)

import fs from 'fs';
import path from 'path';

const __dirname = import.meta.dirname;
const ROOT = path.resolve(__dirname, '..');

// ─────────────────────────────────────────────
// Seeded PRNG — Mulberry32. Same seed → same output.
// ─────────────────────────────────────────────
function mulberry32(seed) {
  let t = seed >>> 0;
  return function() {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260503);
const randInt = (lo, hi) => Math.floor(rand() * (hi - lo + 1)) + lo;
const randFloat = (lo, hi) => rand() * (hi - lo) + lo;
const randPick = (arr) => arr[Math.floor(rand() * arr.length)];

// ─────────────────────────────────────────────
// Static reference data
// ─────────────────────────────────────────────
const COUNTRIES = [
  { code: 'US', name: 'United States', tz_offset: -5, lat: 40.7,  lng: -74.0 },  // NYC anchor
  { code: 'GB', name: 'United Kingdom', tz_offset:  0, lat: 51.5,  lng:  -0.1 },
  { code: 'TR', name: 'Türkiye',        tz_offset:  3, lat: 41.0,  lng:  28.9 },
  { code: 'DE', name: 'Germany',        tz_offset:  1, lat: 52.5,  lng:  13.4 },
  { code: 'JP', name: 'Japan',          tz_offset:  9, lat: 35.7,  lng: 139.7 },
];

const MERCHANT_CATEGORIES = [
  'Grocery', 'Restaurant', 'Gas', 'Online Retail', 'Subscription',
  'Travel', 'Electronics', 'Clothing', 'Pharmacy', 'Rideshare',
];

const CHARGEBACK_REASONS = [
  'fraud_card_not_present',  // most common online-fraud chargeback
  'fraud_card_present',
  'service_not_received',
  'duplicate_charge',
  'item_not_as_described',
];

// ─────────────────────────────────────────────
// Generate merchants
// ─────────────────────────────────────────────
const merchants = [];
const merchantNames = [
  'BigBox Mart', 'Quick Stop', 'Aurora Cafe', 'Petra Gas', 'Flux Online',
  'Subscript Co', 'JetWings Travel', 'Tech Den', 'Vespa Apparel', 'PillPath',
  'RideHail Inc', 'Global Eats', 'StreamCloud', 'BookHouse', 'PowerCharge',
  'CityMart', 'CloudKitchen', 'TrainHub', 'GadgetWorks', 'StyleHaus',
  'MediCo', 'TripStop', 'BookFlight', 'AppPay', 'NextDay',
];
for (let i = 1; i <= 25; i++) {
  merchants.push({
    merchant_id: i,
    name: merchantNames[i - 1],
    category: randPick(MERCHANT_CATEGORIES),
    country: randPick(COUNTRIES).code,
    risk_tier: i <= 3 ? 'high' : i <= 10 ? 'medium' : 'low',  // fraud disproportionately on high-risk
  });
}

// ─────────────────────────────────────────────
// Generate accounts
// ─────────────────────────────────────────────
// 200 total. 10 marked fraud (5%). 5 of those share device fingerprint
// (collusion ring). Account IDs 1-200.
const accounts = [];
const FRAUD_ACCOUNT_IDS = new Set([3, 17, 42, 88, 109, 134, 156, 171, 188, 195]);
const COLLUSION_RING = new Set([42, 88, 134, 156, 195]);  // share device
const COLLUSION_DEVICE = 'dev_x4f2a9b1c7e';
const COLLUSION_IP = '203.0.113.';

for (let i = 1; i <= 200; i++) {
  const country = randPick(COUNTRIES);
  const isFraud = FRAUD_ACCOUNT_IDS.has(i);
  const inRing = COLLUSION_RING.has(i);
  // Signups in the past 18 months — fraud accounts tend to be younger
  const daysOld = isFraud ? randInt(7, 90) : randInt(30, 540);
  const signupAt = new Date(Date.UTC(2026, 4, 3) - daysOld * 86400000).toISOString();
  accounts.push({
    account_id: i,
    email: `user${i}@${randPick(['example.com', 'mail.test', 'inbox.dev'])}`,
    signup_at: signupAt,
    country: country.code,
    device_fingerprint: inRing
      ? COLLUSION_DEVICE
      : 'dev_' + (rand().toString(16).slice(2, 14)),
    ip_block: inRing
      ? COLLUSION_IP + randInt(1, 20)
      : `${randInt(10, 220)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(0, 255)}`,
    status: isFraud && i % 3 === 0 ? 'flagged' : 'active',
  });
}

// ─────────────────────────────────────────────
// Generate transactions
// ─────────────────────────────────────────────
// Baseline: ~10 legitimate txns per account spread over the past 60 days.
// Fraud injection layered on top of that.
const transactions = [];
let txnId = 1;

// Helper — small jitter around an anchor lat/lng so each account's txns
// cluster geographically without all being identical.
function jitterCoord(anchor, magnitude = 0.5) {
  return Number((anchor + (rand() - 0.5) * 2 * magnitude).toFixed(4));
}

const NOW_MS = Date.UTC(2026, 4, 3, 12, 0, 0);  // 2026-05-03 12:00 UTC anchor
const DAY_MS = 86400000;

// LEGITIMATE BASELINE — every account
for (const acc of accounts) {
  const country = COUNTRIES.find(c => c.code === acc.country);
  const txnCount = randInt(7, 14);  // ~10 baseline
  for (let i = 0; i < txnCount; i++) {
    const daysAgo = randFloat(0, 60);
    const txnAt = new Date(NOW_MS - daysAgo * DAY_MS).toISOString();
    transactions.push({
      txn_id: txnId++,
      account_id: acc.account_id,
      amount: Number((randFloat(5, 250)).toFixed(2)),
      txn_at: txnAt,
      merchant_id: randInt(1, 25),
      lat: jitterCoord(country.lat),
      lng: jitterCoord(country.lng),
      status: 'completed',
    });
  }
}

// FRAUD INJECTION 1 — Anomalous-amount outliers (4-sigma+)
// Place ~15 unusually large transactions so the 3-sigma cutoff catches them.
// These belong to fraud accounts but also to a few legit accounts (real
// world: anomalies happen to legit users too).
const ANOMALY_AMOUNT_ACCOUNTS = [3, 17, 42, 109, 200, 150, 88, 156, 30, 75, 140, 188, 120, 105, 195];
for (const accId of ANOMALY_AMOUNT_ACCOUNTS) {
  const acc = accounts[accId - 1];
  const country = COUNTRIES.find(c => c.code === acc.country);
  transactions.push({
    txn_id: txnId++,
    account_id: accId,
    amount: Number((randFloat(2500, 9500)).toFixed(2)),  // way above the 250 baseline
    txn_at: new Date(NOW_MS - randInt(1, 14) * DAY_MS).toISOString(),
    merchant_id: randInt(1, 5),  // high-risk merchant
    lat: jitterCoord(country.lat),
    lng: jitterCoord(country.lng),
    status: 'completed',
  });
}

// FRAUD INJECTION 2 — Velocity bursts (≥5 txns in 5 minutes)
// Accounts 17, 88, 109, 188 each get a burst.
const VELOCITY_ACCOUNTS = [17, 88, 109, 188];
for (const accId of VELOCITY_ACCOUNTS) {
  const acc = accounts[accId - 1];
  const country = COUNTRIES.find(c => c.code === acc.country);
  // Burst start: random point in last 30 days
  const burstStartMs = NOW_MS - randInt(1, 30) * DAY_MS - randInt(0, 86400) * 1000;
  const burstSize = randInt(6, 11);  // 6-10 txns
  for (let i = 0; i < burstSize; i++) {
    transactions.push({
      txn_id: txnId++,
      account_id: accId,
      amount: Number((randFloat(20, 180)).toFixed(2)),
      txn_at: new Date(burstStartMs + i * randInt(20, 60) * 1000).toISOString(),  // 20-60 sec apart
      merchant_id: randInt(1, 25),
      lat: jitterCoord(country.lat),
      lng: jitterCoord(country.lng),
      status: 'completed',
    });
  }
}

// FRAUD INJECTION 3 — Geographic mismatches (impossible travel)
// Account 42 + 156 + 195 each get a US→far-country pair within 30 min.
const GEO_PAIRS = [
  { accId: 42,  city1: { lat: 40.7,  lng: -74.0 }, city2: { lat: 35.7,  lng: 139.7 } },  // NYC → Tokyo
  { accId: 156, city1: { lat: 51.5,  lng:  -0.1 }, city2: { lat: -33.9, lng: 151.2 } },  // London → Sydney
  { accId: 195, city1: { lat: 41.0,  lng:  28.9 }, city2: { lat: 19.4,  lng: -99.1 } },  // Istanbul → Mexico City
];
for (const pair of GEO_PAIRS) {
  const baseMs = NOW_MS - randInt(2, 20) * DAY_MS;
  transactions.push({
    txn_id: txnId++,
    account_id: pair.accId,
    amount: Number(randFloat(40, 220).toFixed(2)),
    txn_at: new Date(baseMs).toISOString(),
    merchant_id: randInt(1, 25),
    lat: jitterCoord(pair.city1.lat, 0.05),
    lng: jitterCoord(pair.city1.lng, 0.05),
    status: 'completed',
  });
  transactions.push({
    txn_id: txnId++,
    account_id: pair.accId,
    amount: Number(randFloat(40, 220).toFixed(2)),
    txn_at: new Date(baseMs + randInt(8, 25) * 60 * 1000).toISOString(),  // 8-25 min later
    merchant_id: randInt(1, 25),
    lat: jitterCoord(pair.city2.lat, 0.05),
    lng: jitterCoord(pair.city2.lng, 0.05),
    status: 'completed',
  });
}

// Sort transactions chronologically — makes the data easier to inspect
transactions.sort((a, b) => Date.parse(a.txn_at) - Date.parse(b.txn_at));
// Re-issue txn_id in chronological order so it's a proper sequence
transactions.forEach((t, i) => { t.txn_id = i + 1; });

// ─────────────────────────────────────────────
// Generate chargebacks
// ─────────────────────────────────────────────
// ~3.5% of txns get chargebacks. Fraud accounts are 5x more likely.
// Some chargebacks chain via related_chargeback_id to test recursive CTE.
const chargebacks = [];
let chargebackId = 1;

for (const txn of transactions) {
  const isFraudAccount = FRAUD_ACCOUNT_IDS.has(txn.account_id);
  const baseRate = isFraudAccount ? 0.20 : 0.025;
  if (rand() < baseRate) {
    chargebacks.push({
      chargeback_id: chargebackId++,
      txn_id: txn.txn_id,
      account_id: txn.account_id,
      merchant_id: txn.merchant_id,
      reason_code: isFraudAccount ? randPick(['fraud_card_not_present', 'fraud_card_present']) : randPick(CHARGEBACK_REASONS),
      opened_at: new Date(Date.parse(txn.txn_at) + randInt(1, 14) * DAY_MS).toISOString(),
      resolved_at: rand() < 0.7 ? new Date(Date.parse(txn.txn_at) + randInt(15, 45) * DAY_MS).toISOString() : null,
      status: rand() < 0.7 ? randPick(['merchant_won', 'cardholder_won', 'split']) : 'open',
      related_chargeback_id: null,
    });
  }
}

// Build a few chargeback chains — recursive CTE test fixtures.
// Chain 1: cb #2 relates to #1, #3 relates to #2 (3-deep)
// Chain 2: cb #5 relates to #4, #7 relates to #4 (branching)
if (chargebacks.length >= 7) {
  chargebacks[1].related_chargeback_id = chargebacks[0].chargeback_id;
  chargebacks[2].related_chargeback_id = chargebacks[1].chargeback_id;
  chargebacks[4].related_chargeback_id = chargebacks[3].chargeback_id;
  chargebacks[6].related_chargeback_id = chargebacks[3].chargeback_id;
}

// ─────────────────────────────────────────────
// Emit data file
// ─────────────────────────────────────────────
const banner = `// SQL Quest — fraud transaction synthetic dataset (generated)
//
// DO NOT EDIT BY HAND. Regenerate via:
//   node scripts/generate-fraud-transactions.js
//
// Synthetic — generated with seed 20260503 for determinism. Models the
// bank-level FDIC track at the transaction layer: a credit-card payments
// system with realistic fraud patterns INJECTED on top of legitimate
// baseline activity. Used by the fraud_transactions challenge track
// (IDs 270+) to teach: anomaly bounds (3-sigma on amount), velocity
// rules (events per window), geographic mismatch (impossible travel),
// cross-account collusion (shared device fingerprint), recursive CTE
// (chargeback chains).
//
// Fraud injection summary (look at the generator for full detail):
//   - 10 of 200 accounts marked as fraud (5%)
//   - 5 of those share device fingerprint (collusion ring)
//   - 15 transactions are amount-outliers (3-sigma+ above mean)
//   - 4 accounts have velocity bursts (6-10 txns in <5 min)
//   - 3 accounts have geographic mismatches (US→Tokyo within 25 min)
//   - Chargeback rate 5x higher on fraud accounts (~20% vs ~2.5%)
//   - 5 chargebacks chained for recursive-CTE test fixtures
//
// License: Public domain — fully synthetic, no real PII or merchant
// names. Generated names are fictional.
`;

const dataObj = {
  name: 'Card Transactions (Synthetic Fraud)',
  icon: 'CreditCard',
  description: 'Synthetic credit-card transaction dataset for transaction-level fraud SQL practice. 200 accounts, 25 merchants, ~2000 transactions, ~70 chargebacks. Fraud patterns INJECTED on top of legitimate baseline: amount anomalies, velocity bursts, geographic impossible-travel, cross-account collusion via shared device fingerprint, chargeback chains for recursive CTE practice.',
  source: 'Synthetic (generated with deterministic seed)',
  source_url: 'https://sqlquest.app/blog/sql-for-fraud-analytics/',
  sector: 'finans',
  tables: {
    accounts: {
      columns: ['account_id', 'email', 'signup_at', 'country', 'device_fingerprint', 'ip_block', 'status'],
      data: accounts.map(a => [a.account_id, a.email, a.signup_at, a.country, a.device_fingerprint, a.ip_block, a.status]),
    },
    merchants: {
      columns: ['merchant_id', 'name', 'category', 'country', 'risk_tier'],
      data: merchants.map(m => [m.merchant_id, m.name, m.category, m.country, m.risk_tier]),
    },
    transactions: {
      columns: ['txn_id', 'account_id', 'amount', 'txn_at', 'merchant_id', 'lat', 'lng', 'status'],
      data: transactions.map(t => [t.txn_id, t.account_id, t.amount, t.txn_at, t.merchant_id, t.lat, t.lng, t.status]),
    },
    chargebacks: {
      columns: ['chargeback_id', 'txn_id', 'account_id', 'merchant_id', 'reason_code', 'opened_at', 'resolved_at', 'status', 'related_chargeback_id'],
      data: chargebacks.map(c => [c.chargeback_id, c.txn_id, c.account_id, c.merchant_id, c.reason_code, c.opened_at, c.resolved_at, c.status, c.related_chargeback_id]),
    },
  },
};

const out = `${banner}
window.publicDatasetsData = window.publicDatasetsData || {};
window.publicDatasetsData.finans_fraud = ${JSON.stringify(dataObj, null, 2)};

console.log('[finans-fraud-data] Loaded', Object.keys(window.publicDatasetsData.finans_fraud.tables).length, 'tables —', ${transactions.length}, 'transactions,', ${accounts.length}, 'accounts,', ${chargebacks.length}, 'chargebacks');
`;

const outPath = path.join(ROOT, 'src/data/finans-fraud-data.js');
fs.writeFileSync(outPath, out);
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`[generate-fraud-transactions] wrote ${outPath} (${sizeKb} KB)`);
console.log(`  accounts:     ${accounts.length}`);
console.log(`  merchants:    ${merchants.length}`);
console.log(`  transactions: ${transactions.length}`);
console.log(`  chargebacks:  ${chargebacks.length}`);
console.log(`  fraud accts:  ${FRAUD_ACCOUNT_IDS.size}`);
console.log(`  collusion ring (shared device): ${[...COLLUSION_RING].sort((a,b)=>a-b).join(', ')}`);
