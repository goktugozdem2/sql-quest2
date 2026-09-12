// Generate the synthetic NEOBANK LEDGER. Output → src/data/neobank-data.js
// (dataset key `finans_neobank`).
//
// WHY THIS EXISTS (2026-09-12)
//   The Interview tab can pin a company's own screen only for a registry
//   member (src/data/interview-archetypes.js), and membership needs a dataset
//   shaped like that company's screen. Revolut is our top company page by
//   landings (59 in 30 days, 14.4% CTR) and its 26 tagged challenges sit on
//   `ecommerce`, `finans_fraud` and `employees` — none of which is a neobank.
//   A neobank screen runs on users / transactions / currencies / top-ups. This
//   is that ledger. It is the data half of a future member; the sourced screen
//   format and the page section are still required and still not written.
//
// WHAT IT IS BUILT TO TEACH — the analytics SQL the Revolut page names:
//   - signup-cohort retention (users.signup_date × months with activity)
//   - activity streaks (consecutive active days per user)
//   - running balances (top_ups minus spend, ordered by time — a UNION ALL
//     and a window frame; balances never go negative on completed rows
//     because the generator SIMULATES the balance and declines the rest)
//   - conversion funnels (signup → kyc_verified_at → first top-up → first
//     card payment → paid plan, all dated on the user row or derivable)
//   - multi-currency: every money row carries amount + currency + amount_gbp,
//     and `currencies.rate_to_gbp` lets a query redo the conversion
//   - fees by plan (foreign-currency weekend fee, ATM over allowance,
//     monthly subscription for paid plans), p2p transfer pairs
//     (transfer_out ↔ transfer_in with counterparty_user_id), referrals
//     (users.referred_by), declines with a reason.
//
// SCALE (chosen for shippability — the whole file must stay under ~400 KB
// because it is inlined into public/data.js):
//   users:        240   (10% never pass KYC and therefore never transact)
//   currencies:    12
//   top_ups:     ~800
//   transactions: ~2,600
//
// DETERMINISTIC — seeded Mulberry32, seed 20260912. Regeneration reproduces
// the file byte for byte, which the validator and tests rely on.
//
//   node scripts/generate-neobank-ledger.js          # regenerate
//   node scripts/validate-neobank-ledger.mjs          # invariants + patterns
//
// Synthetic throughout. No real person, account or rate. Not affiliated with
// Revolut or any bank; "neobank" is a shape, not a company.

import fs from 'fs';
import path from 'path';

const __dirname = import.meta.dirname;
const ROOT = path.resolve(__dirname, '..');

// ───────────────────────────── PRNG ─────────────────────────────
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 20260912;
const rand = mulberry32(SEED);
const randInt = (lo, hi) => Math.floor(rand() * (hi - lo + 1)) + lo;
const randFloat = (lo, hi) => rand() * (hi - lo) + lo;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) { r -= w; if (r <= 0) return v; }
  return pairs[pairs.length - 1][0];
};
const round2 = (x) => Math.round(x * 100) / 100;

// ───────────────────────────── time ─────────────────────────────
const DAY = 86400000;
const AS_OF = Date.UTC(2026, 8, 1);            // 2026-09-01 — the ledger's "today"
const SIGNUP_FROM = Date.UTC(2025, 5, 1);      // 2025-06-01
const SIGNUP_TO = Date.UTC(2026, 7, 25);       // 2026-08-25
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);
const isoTs = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const dayStart = (ms) => Math.floor(ms / DAY) * DAY;
const isWeekend = (ms) => { const d = new Date(ms).getUTCDay(); return d === 0 || d === 6; };

// ───────────────────────────── reference data ─────────────────────────────
const CURRENCIES = [
  ['GBP', 'Pound sterling',     1.0],
  ['EUR', 'Euro',               0.85],
  ['USD', 'US dollar',          0.78],
  ['PLN', 'Polish złoty',       0.20],
  ['RON', 'Romanian leu',       0.17],
  ['CHF', 'Swiss franc',        0.87],
  ['SEK', 'Swedish krona',      0.072],
  ['CZK', 'Czech koruna',       0.034],
  ['HUF', 'Hungarian forint',   0.0021],
  ['TRY', 'Turkish lira',       0.021],
  ['AED', 'UAE dirham',         0.21],
  ['JPY', 'Japanese yen',       0.0052],
];
const RATE = Object.fromEntries(CURRENCIES.map(([c, , r]) => [c, r]));
const toGbp = (amount, cur) => round2(amount * RATE[cur]);
const fromGbp = (gbp, cur) => round2(gbp / RATE[cur]);

// country → home currency, with a signup weight
const COUNTRIES = [
  ['GB', 'GBP', 30], ['IE', 'EUR', 6], ['FR', 'EUR', 8], ['DE', 'EUR', 9],
  ['ES', 'EUR', 7], ['PT', 'EUR', 4], ['NL', 'EUR', 5], ['IT', 'EUR', 5],
  ['LT', 'EUR', 5], ['PL', 'PLN', 10], ['RO', 'RON', 8], ['CH', 'CHF', 3],
];
const HOME_CUR = Object.fromEntries(COUNTRIES.map(([c, cur]) => [c, cur]));
// where a card gets used abroad, and in what currency
const ABROAD = [
  ['ES', 'EUR'], ['FR', 'EUR'], ['IT', 'EUR'], ['PT', 'EUR'], ['DE', 'EUR'],
  ['US', 'USD'], ['TR', 'TRY'], ['AE', 'AED'], ['CZ', 'CZK'], ['SE', 'SEK'],
  ['HU', 'HUF'], ['JP', 'JPY'], ['PL', 'PLN'], ['GB', 'GBP'], ['CH', 'CHF'],
];

const PLANS = [['standard', 72], ['plus', 12], ['premium', 11], ['metal', 5]];
const PLAN_FEE_GBP = { standard: 0, plus: 3.99, premium: 7.99, metal: 14.99 };
const FX_WEEKEND_FEE = { standard: 0.01, plus: 0.01, premium: 0, metal: 0 };   // share of amount
const ATM_FREE_GBP = { standard: 200, plus: 200, premium: 400, metal: 800 };     // per month
const ATM_FEE = 0.02;

// card categories with an amount range in GBP-equivalent
const CATEGORIES = [
  ['groceries', 8, 90, 20], ['restaurants', 6, 70, 16], ['transport', 2, 40, 14],
  ['shopping', 10, 220, 12], ['entertainment', 5, 60, 8], ['online_services', 4, 40, 8],
  ['utilities', 20, 160, 5], ['health', 8, 120, 4], ['fuel', 25, 90, 6], ['travel', 40, 600, 4],
];
const TOPUP_METHODS = [['card', 55], ['bank_transfer', 30], ['apple_pay', 10], ['google_pay', 5]];
const ROUND_TOPUPS = [50, 100, 150, 200, 300, 500];

// activity level → probability a given day is active, txns on an active day
const LEVELS = [
  ['churned', 25, 0.07, 1, 2],
  ['light',   33, 0.018, 1, 2],
  ['regular', 30, 0.04, 1, 3],
  ['heavy',   12, 0.085, 1, 3],
];
// Half the heavy users also get one 8–14 day stretch of near-daily activity —
// a commute, a trip — so the streak pattern has real material to find.
const STREAK_SHARE = 0.5;

// ───────────────────────────── users ─────────────────────────────
const N_USERS = 240;
const users = [];
for (let i = 1; i <= N_USERS; i++) {
  const country = weighted(COUNTRIES.map(([c, , w]) => [c, w]));
  const signupMs = dayStart(SIGNUP_FROM + rand() * (SIGNUP_TO - SIGNUP_FROM));
  const kycOk = rand() < 0.90;
  const kycMs = kycOk ? signupMs + randInt(0, 5) * DAY + randInt(0, 23) * 3600000 : null;
  const plan = kycOk ? weighted(PLANS) : 'standard';
  const planSince = plan === 'standard' ? isoDate(signupMs)
    : isoDate(Math.min(AS_OF - DAY, signupMs + randInt(1, 200) * DAY));
  const level = kycOk ? weighted(LEVELS.map(([l, w]) => [l, w])) : 'none';
  // when activity stops: churned users go quiet fast, some others drift off
  let activeUntil = AS_OF;
  if (level === 'churned') activeUntil = Math.min(AS_OF, signupMs + randInt(12, 45) * DAY);
  else if (level !== 'none' && rand() < 0.18) activeUntil = Math.min(AS_OF, signupMs + randInt(60, 300) * DAY);
  users.push({
    user_id: i,
    signup_date: isoDate(signupMs),
    signup_ms: signupMs,
    country,
    home_currency: HOME_CUR[country],
    plan,
    plan_since: planSince,
    kyc_verified_at: kycMs ? isoTs(kycMs) : null,
    kyc_ms: kycMs,
    referred_by: null,
    birth_year: randInt(1970, 2006),
    level,
    active_until: activeUntil,
  });
}
users.sort((a, b) => a.signup_ms - b.signup_ms);
users.forEach((u, idx) => { u.user_id = idx + 1; });   // ids follow signup order
// referrals: 18% of users referred by someone who signed up before them
for (let idx = 1; idx < users.length; idx++) {
  if (rand() < 0.18) users[idx].referred_by = users[randInt(0, idx - 1)].user_id;
}

// ───────────────────────────── ledger simulation ─────────────────────────────
let txnId = 1;
let topUpId = 1;
const topUps = [];
const transactions = [];

function addTopUp(u, ms, gbp, method) {
  const amount = fromGbp(gbp, u.home_currency);
  topUps.push({
    top_up_id: topUpId++, user_id: u.user_id, ts: isoTs(ms), amount, currency: u.home_currency,
    amount_gbp: toGbp(amount, u.home_currency), method,
  });
  return toGbp(amount, u.home_currency);
}

function pushTxn(u, ms, fields) {
  transactions.push({
    txn_id: txnId++, user_id: u.user_id, ts: isoTs(ms),
    type: fields.type, amount: fields.amount, currency: fields.currency,
    amount_gbp: fields.amount_gbp, fee_gbp: fields.fee_gbp || 0,
    merchant_category: fields.merchant_category || null,
    merchant_country: fields.merchant_country || null,
    counterparty_user_id: fields.counterparty_user_id || null,
    status: fields.status, decline_reason: fields.decline_reason || null,
  });
}

// balances in GBP, kept by the simulation so completed spend never overdraws
const balance = new Map(users.map(u => [u.user_id, 0]));
const atmThisMonth = new Map();   // `${user}-${yyyy-mm}` → gbp withdrawn
const eligible = users.filter(u => u.level !== 'none');
const byId = new Map(users.map(u => [u.user_id, u]));

// p2p credits waiting to be applied to a recipient's simulated balance, in
// ledger time: destination user → [{ ms, gbp }]
const incoming = new Map();
const applyIncoming = (u, uptoMs) => {
  const list = incoming.get(u.user_id);
  if (!list || list.length === 0) return;
  let bal = balance.get(u.user_id);
  const keep = [];
  for (const c of list) { if (c.ms <= uptoMs) bal = round2(bal + c.gbp); else keep.push(c); }
  incoming.set(u.user_id, keep);
  balance.set(u.user_id, bal);
};

// Day loop per user, users in signup order, days in time order. A p2p
// transfer writes both rows at the sender's timestamp. So that the simulated
// balance is exactly the balance a running-balance query will see, a recipient
// is always a user LATER in this outer loop (so their spending has not been
// simulated yet) who passed KYC at least a day before the transfer, and the
// credit is queued in `incoming` and applied to their balance in ledger time
// as their own loop reaches it. That is what makes every insufficient_funds
// decline genuinely short at that moment, which the validator checks.
for (let uIdx = 0; uIdx < eligible.length; uIdx++) {
  const u = eligible[uIdx];
  const [, , pActive, minTx, maxTx] = LEVELS.find(l => l[0] === u.level);
  const firstDay = dayStart(u.kyc_ms) + DAY;
  const streak = (u.level === 'heavy' && rand() < STREAK_SHARE && u.active_until - firstDay > 40 * DAY)
    ? (() => { const start = firstDay + randInt(10, Math.max(11, Math.floor((u.active_until - firstDay) / DAY) - 20)) * DAY; return { start, end: start + randInt(8, 14) * DAY }; })()
    : null;
  const salaryDay = randInt(1, 28);
  const salaryGbp = u.level === 'heavy' ? randInt(1400, 2600) : u.level === 'regular' ? randInt(500, 1500) : randInt(150, 500);
  const paysSalary = u.level === 'heavy' || (u.level === 'regular' && rand() < 0.7);
  // an opening top-up shortly after KYC — the funnel's third step
  balance.set(u.user_id, round2(balance.get(u.user_id) + addTopUp(u, firstDay + randInt(0, 6) * 3600000, pick(ROUND_TOPUPS), weighted(TOPUP_METHODS))));

  for (let day = firstDay; day < u.active_until; day += DAY) {
    applyIncoming(u, day);
    const d = new Date(day);
    const inStreak = !!streak && day >= streak.start && day < streak.end;
    const ym = d.toISOString().slice(0, 7);
    // salary-like monthly top-up
    if (paysSalary && d.getUTCDate() === salaryDay) {
      balance.set(u.user_id, round2(balance.get(u.user_id) + addTopUp(u, day + randInt(1, 5) * 3600000, salaryGbp, 'bank_transfer')));
    }
    // monthly subscription fee on the plan anniversary day — topped up first
    // when short, the way a direct debit usually is
    if (u.plan !== 'standard' && day >= Date.parse(u.plan_since + 'T00:00:00Z') && d.getUTCDate() === new Date(u.plan_since).getUTCDate()) {
      const fee = PLAN_FEE_GBP[u.plan];
      if (balance.get(u.user_id) < fee) balance.set(u.user_id, round2(balance.get(u.user_id) + addTopUp(u, day + 5.5 * 3600000, 50, weighted(TOPUP_METHODS))));
      balance.set(u.user_id, round2(balance.get(u.user_id) - fee));
      pushTxn(u, day + 6 * 3600000, { type: 'subscription_fee', amount: fee, currency: 'GBP', amount_gbp: fee, status: 'completed' });
    }
    if (!inStreak && rand() >= pActive) continue;

    const nTx = inStreak ? randInt(1, 2) : randInt(minTx, maxTx);
    const stamps = [];
    for (let k = 0; k < nTx; k++) stamps.push(day + randInt(7, 23) * 3600000 + randInt(0, 59) * 60000 + randInt(0, 59) * 1000);
    stamps.sort((a, b) => a - b);
    for (const ms of stamps) {
      applyIncoming(u, ms);
      const kind = weighted([['card_payment', 62], ['transfer_out', 12], ['atm_withdrawal', 8], ['fx_exchange', 8], ['bill_payment', 10]]);
      let gbp, cur, amount, fields;
      if (kind === 'card_payment') {
        const [cat, lo, hi] = weighted(CATEGORIES.map(c => [c, c[3]]));
        const abroad = rand() < 0.15;
        const [mCountry, mCur] = abroad ? pick(ABROAD) : [u.country, u.home_currency];
        gbp = round2(randFloat(lo, hi));
        cur = mCur; amount = fromGbp(gbp, cur);
        const fee = (cur !== u.home_currency && isWeekend(ms)) ? round2(gbp * FX_WEEKEND_FEE[u.plan]) : 0;
        fields = { type: kind, amount, currency: cur, amount_gbp: toGbp(amount, cur), fee_gbp: fee, merchant_category: cat, merchant_country: mCountry };
      } else if (kind === 'transfer_out') {
        const cands = eligible.slice(uIdx + 1).filter(o => o.kyc_ms && o.kyc_ms + DAY < ms);
        if (cands.length === 0) continue;
        const other = pick(cands);
        gbp = round2(randFloat(5, 250)); cur = u.home_currency; amount = fromGbp(gbp, cur);
        fields = { type: kind, amount, currency: cur, amount_gbp: toGbp(amount, cur), counterparty_user_id: other.user_id };
      } else if (kind === 'atm_withdrawal') {
        gbp = pick([20, 40, 50, 60, 100, 150, 200]); cur = u.home_currency; amount = fromGbp(gbp, cur);
        const key = `${u.user_id}-${ym}`;
        const used = atmThisMonth.get(key) || 0;
        const over = Math.max(0, used + gbp - ATM_FREE_GBP[u.plan]);
        fields = { type: kind, amount, currency: cur, amount_gbp: toGbp(amount, cur), fee_gbp: round2(over * ATM_FEE) };
      } else if (kind === 'fx_exchange') {
        // buying a foreign currency with home-currency balance
        cur = pick(CURRENCIES.map(c => c[0]).filter(c => c !== u.home_currency));
        gbp = round2(randFloat(30, 600)); amount = fromGbp(gbp, cur);
        const fee = isWeekend(ms) ? round2(gbp * FX_WEEKEND_FEE[u.plan]) : 0;
        fields = { type: kind, amount, currency: cur, amount_gbp: toGbp(amount, cur), fee_gbp: fee };
      } else {
        gbp = round2(randFloat(15, 220)); cur = u.home_currency; amount = fromGbp(gbp, cur);
        fields = { type: 'bill_payment', amount, currency: cur, amount_gbp: toGbp(amount, cur), merchant_category: 'utilities', merchant_country: u.country };
      }

      // top up first if the balance is short — most people do; some spend first
      const need = fields.amount_gbp + (fields.fee_gbp || 0);
      let bal = balance.get(u.user_id);
      if (bal < need && rand() < 0.93) {
        const topUp = ROUND_TOPUPS.find(r => bal + r >= need + 1) || 500;
        bal = round2(bal + addTopUp(u, ms - randInt(5, 90) * 60000, topUp, weighted(TOPUP_METHODS)));
        balance.set(u.user_id, bal);
      }
      // outcome
      let status = 'completed', reason = null;
      if (bal < need) { status = 'declined'; reason = 'insufficient_funds'; }
      else if (rand() < 0.012) { status = 'declined'; reason = pick(['suspected_fraud', 'card_frozen', 'merchant_blocked']); }
      else if (rand() < 0.008) { status = 'reversed'; }

      if (status === 'completed') {
        balance.set(u.user_id, round2(bal - need));
        if (kind === 'atm_withdrawal') atmThisMonth.set(`${u.user_id}-${ym}`, (atmThisMonth.get(`${u.user_id}-${ym}`) || 0) + gbp);
        if (kind === 'transfer_out') {
          const other = byId.get(fields.counterparty_user_id);
          const inAmount = fromGbp(fields.amount_gbp, other.home_currency);
          pushTxn(u, ms, { ...fields, status });
          pushTxn(other, ms, { type: 'transfer_in', amount: inAmount, currency: other.home_currency, amount_gbp: fields.amount_gbp, counterparty_user_id: u.user_id, status: 'completed' });
          if (!incoming.has(other.user_id)) incoming.set(other.user_id, []);
          incoming.get(other.user_id).push({ ms, gbp: fields.amount_gbp });
          continue;
        }
      }
      pushTxn(u, ms, { ...fields, status, decline_reason: reason });
    }
  }
}

// Recompute every balance from scratch, in time order, and fail loudly if a
// completed row overdraws — the simulation above must agree with what a
// running-balance query over the written rows will say.
{
  const events = [];
  for (const t of topUps) events.push({ ms: Date.parse(t.ts + 'Z'), user: t.user_id, delta: t.amount_gbp, k: 0 });
  for (const t of transactions) {
    if (t.status !== 'completed') continue;
    if (t.type === 'transfer_in') events.push({ ms: Date.parse(t.ts + 'Z'), user: t.user_id, delta: t.amount_gbp, k: 1 });
    else events.push({ ms: Date.parse(t.ts + 'Z'), user: t.user_id, delta: -(t.amount_gbp + t.fee_gbp), k: 2 });
  }
  events.sort((a, b) => a.ms - b.ms || a.k - b.k);
  const bal = new Map();
  let overdraws = 0;
  for (const e of events) {
    const b = round2((bal.get(e.user) || 0) + e.delta);
    if (b < -0.011) overdraws++;
    bal.set(e.user, b);
  }
  if (overdraws) { console.error(`[generate-neobank-ledger] ${overdraws} completed rows overdraw — generator bug`); process.exit(1); }
}

// sort and renumber so ids follow time
topUps.sort((a, b) => a.ts.localeCompare(b.ts) || a.user_id - b.user_id);
topUps.forEach((t, i) => { t.top_up_id = i + 1; });
transactions.sort((a, b) => a.ts.localeCompare(b.ts) || a.user_id - b.user_id || (a.type === 'transfer_out' ? -1 : 1));
transactions.forEach((t, i) => { t.txn_id = i + 1; });

// ───────────────────────────── output ─────────────────────────────
const banner = `// SQL Quest — neobank ledger synthetic dataset (generated)
//
// DO NOT EDIT BY HAND. Regenerate via:
//   node scripts/generate-neobank-ledger.js
//
// Synthetic — seed ${SEED}. A multi-currency consumer neobank: ${users.length} users
// across ${COUNTRIES.length} countries, ${CURRENCIES.length} currencies, ${topUps.length} top-ups, ${transactions.length}
// transactions (card payments at home and abroad, p2p transfers written as
// matched out/in pairs, ATM withdrawals with a per-plan free allowance, FX
// exchanges, bill payments, monthly plan fees). Balances are simulated, so
// completed spend never overdraws and 'insufficient_funds' declines are real.
// Built for cohort retention, activity streaks, running balances, conversion
// funnels, multi-currency conversion and fee-by-plan questions. Not affiliated
// with any bank; "neobank" is a shape, not a company.
//`;

const dataObj = {
  name: 'Neobank Ledger',
  icon: 'Wallet',
  description: `Multi-currency consumer neobank: ${users.length} users, ${topUps.length} top-ups, ${transactions.length} transactions in ${CURRENCIES.length} currencies. Cohorts, streaks, running balances, funnels, FX and fees.`,
  source: 'Synthetic (generated with deterministic seed)',
  sector: 'finans',
  tables: {
    users: {
      columns: ['user_id', 'signup_date', 'country', 'home_currency', 'plan', 'plan_since', 'kyc_verified_at', 'referred_by', 'birth_year'],
      data: users.map(u => [u.user_id, u.signup_date, u.country, u.home_currency, u.plan, u.plan_since, u.kyc_verified_at, u.referred_by, u.birth_year]),
    },
    currencies: {
      columns: ['code', 'name', 'rate_to_gbp'],
      data: CURRENCIES.map(([code, name, rate]) => [code, name, rate]),
    },
    top_ups: {
      columns: ['top_up_id', 'user_id', 'ts', 'amount', 'currency', 'amount_gbp', 'method'],
      data: topUps.map(t => [t.top_up_id, t.user_id, t.ts, t.amount, t.currency, t.amount_gbp, t.method]),
    },
    transactions: {
      columns: ['txn_id', 'user_id', 'ts', 'type', 'amount', 'currency', 'amount_gbp', 'fee_gbp', 'merchant_category', 'merchant_country', 'counterparty_user_id', 'status', 'decline_reason'],
      data: transactions.map(t => [t.txn_id, t.user_id, t.ts, t.type, t.amount, t.currency, t.amount_gbp, t.fee_gbp, t.merchant_category, t.merchant_country, t.counterparty_user_id, t.status, t.decline_reason]),
    },
  },
};

const out = `${banner}
window.publicDatasetsData = window.publicDatasetsData || {};
window.publicDatasetsData.finans_neobank = ${JSON.stringify(dataObj)};
`;

const outPath = path.join(ROOT, 'src/data/neobank-data.js');
fs.writeFileSync(outPath, out);
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
const declined = transactions.filter(t => t.status === 'declined').length;
const insufficient = transactions.filter(t => t.decline_reason === 'insufficient_funds').length;
console.log(`[generate-neobank-ledger] wrote ${outPath} (${sizeKb} KB)`);
console.log(`  users:        ${users.length}  (no KYC: ${users.filter(u => !u.kyc_verified_at).length}, referred: ${users.filter(u => u.referred_by).length})`);
console.log(`  levels:       ${LEVELS.map(([l]) => `${l}=${users.filter(u => u.level === l).length}`).join(' ')}`);
console.log(`  top_ups:      ${topUps.length}`);
console.log(`  transactions: ${transactions.length}  (declined ${declined}, of which insufficient_funds ${insufficient}; reversed ${transactions.filter(t => t.status === 'reversed').length})`);
console.log(`  by type:      ${Object.entries(transactions.reduce((m, t) => (m[t.type] = (m[t.type] || 0) + 1, m), {})).map(([k, v]) => `${k}=${v}`).join(' ')}`);
