// Validate the neobank ledger (src/data/neobank-data.js, key finans_neobank):
// referential integrity, money that reconciles, and the analytics patterns the
// dataset exists to teach actually producing non-trivial rows. Mirrors the
// app's loadDataset typing (first-row typeof), like validate-capital-one-mock.
//
//   node scripts/validate-neobank-ledger.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import Database from 'better-sqlite3';
const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
function loadWin(file) { const sb = { window: {}, console: { log() {} } }; vm.createContext(sb); vm.runInContext(fs.readFileSync(`${ROOT}/${file}`, 'utf8'), sb); return sb.window; }
const ds = loadWin('src/data/neobank-data.js').publicDatasetsData.finans_neobank;
const db = new Database(':memory:');
for (const [name, t] of Object.entries(ds.tables)) {
  const types = t.columns.map((_, i) => { const s = t.data.find(r => r[i] !== null)?.[i]; return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT'; });
  db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
  const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
  db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  console.log(`  ${name.padEnd(13)} ${t.data.length} rows`);
}

let fail = 0;
const check = (name, sql, ok) => {
  let rows; try { rows = db.prepare(sql).all(); } catch (e) { fail++; console.log(`FAIL ${name}: ${e.message}`); return; }
  const pass = ok(rows);
  if (!pass) fail++;
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name} → ${JSON.stringify(rows.length === 1 ? rows[0] : rows.slice(0, 4))}`);
};

const COMPLETED_DELTAS = `SELECT user_id, ts, amount_gbp AS delta, 0 AS k FROM top_ups
  UNION ALL SELECT user_id, ts, CASE WHEN type='transfer_in' THEN amount_gbp ELSE -(amount_gbp + fee_gbp) END,
                   CASE WHEN type='transfer_in' THEN 1 ELSE 2 END FROM transactions WHERE status='completed'`;

console.log('\n— integrity —');
check('referrers signed up before the people they referred',
  `SELECT count(*) AS n FROM users u JOIN users r ON r.user_id = u.referred_by WHERE r.signup_date >= u.signup_date`, r => r[0].n === 0);
check('every top-up and transaction belongs to a user',
  `SELECT (SELECT count(*) FROM top_ups t LEFT JOIN users u USING(user_id) WHERE u.user_id IS NULL)
        + (SELECT count(*) FROM transactions t LEFT JOIN users u USING(user_id) WHERE u.user_id IS NULL) AS n`, r => r[0].n === 0);
check('every counterparty is a user',
  `SELECT count(*) AS n FROM transactions t LEFT JOIN users u ON u.user_id = t.counterparty_user_id WHERE t.counterparty_user_id IS NOT NULL AND u.user_id IS NULL`, r => r[0].n === 0);
check('every currency code is in currencies',
  `SELECT count(*) AS n FROM (SELECT currency FROM top_ups UNION ALL SELECT currency FROM transactions) x LEFT JOIN currencies c ON c.code = x.currency WHERE c.code IS NULL`, r => r[0].n === 0);
check('users without KYC have no money movement',
  `SELECT count(*) AS n FROM users u WHERE kyc_verified_at IS NULL AND (EXISTS (SELECT 1 FROM top_ups t WHERE t.user_id = u.user_id) OR EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.user_id))`, r => r[0].n === 0);
check('no money movement before KYC',
  `SELECT count(*) AS n FROM (SELECT user_id, ts FROM top_ups UNION ALL SELECT user_id, ts FROM transactions) x JOIN users u USING(user_id) WHERE x.ts < u.kyc_verified_at`, r => r[0].n === 0);
check('amount_gbp agrees with currencies.rate_to_gbp (±0.011)',
  `SELECT count(*) AS n FROM (SELECT amount, currency, amount_gbp FROM transactions UNION ALL SELECT amount, currency, amount_gbp FROM top_ups) x JOIN currencies c ON c.code = x.currency WHERE abs(round(x.amount * c.rate_to_gbp, 2) - x.amount_gbp) > 0.011`, r => r[0].n === 0);
check('every completed transfer_out has its transfer_in twin (same ts, same gbp, counterparties swapped)',
  `SELECT count(*) AS n FROM transactions o LEFT JOIN transactions i ON i.type='transfer_in' AND i.user_id = o.counterparty_user_id AND i.counterparty_user_id = o.user_id AND i.ts = o.ts AND i.amount_gbp = o.amount_gbp
   WHERE o.type='transfer_out' AND o.status='completed' AND i.txn_id IS NULL`, r => r[0].n === 0);
check('no transfer_in without a transfer_out',
  `SELECT count(*) AS n FROM transactions i LEFT JOIN transactions o ON o.type='transfer_out' AND o.status='completed' AND o.user_id = i.counterparty_user_id AND o.counterparty_user_id = i.user_id AND o.ts = i.ts
   WHERE i.type='transfer_in' AND o.txn_id IS NULL`, r => r[0].n === 0);
check('declined and reversed rows carry the right reason field',
  `SELECT count(*) AS n FROM transactions WHERE (status='declined') <> (decline_reason IS NOT NULL)`, r => r[0].n === 0);

console.log('\n— money reconciles —');
check('running balance never negative on completed rows',
  `WITH ev AS (${COMPLETED_DELTAS}), run AS (SELECT user_id, ts, SUM(delta) OVER (PARTITION BY user_id ORDER BY ts, k ROWS UNBOUNDED PRECEDING) AS bal FROM ev)
   SELECT count(*) AS n, round(min(bal), 2) AS lowest FROM run`, r => r[0].n > 0 && r[0].lowest >= -0.011);
check('every insufficient_funds decline really was short at that moment',
  `SELECT count(*) AS n FROM transactions d WHERE d.decline_reason = 'insufficient_funds' AND
     (SELECT COALESCE(SUM(delta), 0) FROM (${COMPLETED_DELTAS}) e WHERE e.user_id = d.user_id AND e.ts <= d.ts) >= d.amount_gbp + d.fee_gbp`, r => r[0].n === 0);
check('insufficient_funds declines exist but are a minority (1–8%)',
  `SELECT round(100.0 * sum(decline_reason = 'insufficient_funds') / count(*), 2) AS pct FROM transactions`, r => r[0].pct >= 1 && r[0].pct <= 8);

console.log('\n— the patterns it is built for —');
check('cohort retention: at least 10 signup cohorts show activity in a later month',
  `WITH c AS (SELECT user_id, substr(signup_date, 1, 7) AS cohort FROM users),
        a AS (SELECT DISTINCT user_id, substr(ts, 1, 7) AS ym FROM transactions WHERE status = 'completed')
   SELECT count(DISTINCT cohort) AS cohorts FROM c JOIN a USING(user_id) WHERE a.ym > c.cohort`, r => r[0].cohorts >= 10);
check('streaks: the longest run of consecutive active days is at least 7',
  `WITH d AS (SELECT DISTINCT user_id, date(ts) AS day FROM transactions WHERE status = 'completed'),
        g AS (SELECT user_id, day, date(day, '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) || ' days') AS grp FROM d),
        s AS (SELECT user_id, grp, count(*) AS len FROM g GROUP BY user_id, grp)
   SELECT user_id, max(len) AS longest FROM s`, r => r[0].longest >= 7);
check('funnel: signed ≥ kyc ≥ topped up ≥ paid by card, every step non-empty',
  `SELECT count(*) AS signed, count(kyc_verified_at) AS kyc,
          (SELECT count(DISTINCT user_id) FROM top_ups) AS topped,
          (SELECT count(DISTINCT user_id) FROM transactions WHERE type = 'card_payment' AND status = 'completed') AS paid,
          (SELECT count(*) FROM users WHERE plan <> 'standard') AS paid_plan FROM users`,
  r => r[0].signed >= r[0].kyc && r[0].kyc >= r[0].topped && r[0].topped >= r[0].paid && r[0].paid > 0 && r[0].paid_plan > 0);
check('foreign-currency card payments exist (≥ 100)',
  `SELECT count(*) AS n FROM transactions t JOIN users u USING(user_id) WHERE t.type = 'card_payment' AND t.currency <> u.home_currency`, r => r[0].n >= 100);
check('fees by plan: every plan present, standard pays more per user than metal',
  `SELECT u.plan, round(sum(t.fee_gbp) / count(DISTINCT u.user_id), 2) AS fee_per_user FROM transactions t JOIN users u USING(user_id)
   WHERE t.status = 'completed' AND t.type IN ('card_payment', 'fx_exchange', 'atm_withdrawal') GROUP BY u.plan`,
  r => r.length === 4 && r.find(x => x.plan === 'standard').fee_per_user > r.find(x => x.plan === 'metal').fee_per_user);
check('p2p graph: at least 40 distinct sender→receiver pairs',
  `SELECT count(*) AS pairs FROM (SELECT DISTINCT user_id, counterparty_user_id FROM transactions WHERE type = 'transfer_out' AND status = 'completed')`, r => r[0].pairs >= 40);
check('referrals: referred users exist and some of them transacted',
  `SELECT count(*) AS referred, (SELECT count(DISTINCT t.user_id) FROM transactions t JOIN users u USING(user_id) WHERE u.referred_by IS NOT NULL) AS active_referred FROM users WHERE referred_by IS NOT NULL`, r => r[0].referred >= 30 && r[0].active_referred >= 20);

console.log(fail ? `\n${fail} FAIL` : '\nALL PASS');
process.exit(fail ? 1 : 0);
