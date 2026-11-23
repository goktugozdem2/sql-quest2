// Challenges 343-354 (2026-11-23, fleet R1 + content): twelve niche sector
// shapes — banking, payments, retail and product analytics — modelled on
// dated public candidate reports. Sources, dates and what was dropped as
// already covered: docs/reads/niche-sector-questions-2026-11-23.md.
//
// 343 sits in the core bank (challenges.js, ecommerce); 344-354 sit in
// sector-challenges.js on the finans datasets. Every reference solution runs
// here on the app's table rules (app.jsx loadDataset: a column's type comes
// from the first row's value), its result is pinned, and it is graded with
// the app's own resultsMatch. Each card also carries the wrong answer a
// learner is most likely to write; that query must FAIL, or the card is not
// testing the idea it was written for.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';
import { resultsMatch } from '../src/utils/grade.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const sb = { window: { challengesData: [] }, console: { log() {}, warn() {} } };
vm.createContext(sb);
for (const f of [
  'datasets.js', 'finans-data.js', 'finans-fraud-data.js', 'neobank-data.js',
  'challenges.js', 'sector-challenges.js', 'challenge-companies.js',
]) vm.runInContext(readFileSync(here(`../src/data/${f}`), 'utf8'), sb);
const { publicDatasetsData: datasets, challengesData: bank, sectorChallengesData: sector, challengeCompanies } = sb.window;
const IDS = [343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354];
const HARD = [348, 349, 350, 351, 352, 353, 354];
const byId = id => bank.find(c => c.id === id);

const dbs = {};
function dbFor(key) {
  if (dbs[key]) return dbs[key];
  const db = new Database(':memory:');
  for (const [name, t] of Object.entries(datasets[key].tables)) {
    const types = t.columns.map((_, i) => {
      const s = t.data[0]?.[i];
      return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r.map(v => (v === undefined ? null : v)))))(t.data);
  }
  return (dbs[key] = db);
}
const run = (id, sql) => dbFor(byId(id).dataset).prepare(sql ?? byId(id).solution).all();

// Grade a learner query the way the app does: value arrays, the reference's
// columns, the reference's ORDER BY.
function grades(id, sql) {
  const c = byId(id);
  const db = dbFor(c.dataset);
  const ref = db.prepare(c.solution);
  const expected = ref.raw().all();
  const columns = ref.columns().map(col => col.name);
  const got = db.prepare(sql).raw().all();
  return resultsMatch(got, expected, c.solution, columns);
}
// A wrong answer written as an edit of the reference.
const edit = (id, from, to) => {
  const s = byId(id).solution;
  if (!s.includes(from)) throw new Error(`#${id}: "${from}" not in the solution`);
  return s.split(from).join(to);
};

// Words that would hand the learner the method. A card names the outcome.
const METHOD_WORDS = /\bOVER\b|PARTITION|ROW_NUMBER|\bRANK\b|strftime|COUNT\s*\(|IS NULL|COALESCE|GROUP BY|UNION|EXISTS|\bwindow\b|julianday/i;

describe('the twelve cards', () => {
  it('exist once each, on shipped datasets, with every field the app reads, in both languages', () => {
    for (const id of IDS) {
      expect(bank.filter(c => c.id === id), `#${id}`).toHaveLength(1);
      const c = byId(id);
      for (const k of ['title', 'description', 'hint', 'solution', 'title_tr', 'description_tr', 'hint_tr', 'category', 'difficulty']) {
        expect(typeof c[k], `#${id}.${k}`).toBe('string');
        expect(c[k].length, `#${id}.${k}`).toBeGreaterThan(3);
      }
      expect(c.example?.input && c.example?.output && c.example_tr?.input && c.example_tr?.output, `#${id} examples`).toBeTruthy();
      expect(c.description_tr, `#${id} TR is not a copy`).not.toBe(c.description);
      expect(Object.keys(datasets)).toContain(c.dataset);
      for (const t of c.tables) expect(Object.keys(datasets[c.dataset].tables), `#${id} ${t}`).toContain(t);
      expect(c.xpReward).toBeGreaterThan(0);
      expect(['Medium', 'Hard']).toContain(c.difficulty);
      expect(c.difficulty === 'Hard', `#${id}`).toBe(HARD.includes(id));
    }
  });

  it('343 is a core card with a slug; 344-354 are finans sector cards, untagged by company', () => {
    expect(byId(343).dataset).toBe('ecommerce');
    expect(byId(343).slug).toBe('which-markets-really-declined');
    expect(sector.filter(c => IDS.includes(c.id)).map(c => c.id)).toEqual(IDS.slice(1));
    for (const id of IDS.slice(1)) expect(byId(id).sectorTags, `#${id}`).toEqual(['finans']);
    // Not part of the signed Capital One or Revolut sets: no company tag at all.
    for (const id of IDS) expect(challengeCompanies[id], `#${id}`).toBeUndefined();
  });

  it('sit in the measured split: 4 banking/payments + 1 regulator, 4 retail, 3 product; at least 3 Medium', () => {
    expect(IDS.filter(id => byId(id).difficulty === 'Medium')).toHaveLength(5);
    const skillOf = {
      343: 'Conditional Logic', 344: 'Aggregation & Grouping', 345: 'Joins', 346: 'Aggregation & Grouping',
      347: 'Subqueries & CTEs', 348: 'NULL Handling', 349: 'Date Functions', 350: 'Conditional Logic',
      351: 'Joins', 352: 'Subqueries & CTEs', 353: 'Date Functions', 354: 'NULL Handling',
    };
    for (const id of IDS) expect(challengeMatchesSkill(byId(id), skillOf[id]), `#${id}`).toBe(true);
  });

  it('never name the method in the prompt, in either language', () => {
    for (const id of IDS) {
      const c = byId(id);
      for (const d of [c.description, c.description_tr]) expect(d, `#${id}`).not.toMatch(METHOD_WORDS);
    }
  });

  it("never put the query in the hint (a question page shows a free card's hint)", () => {
    for (const id of IDS) {
      const c = byId(id);
      for (const h of [c.hint, c.hint_tr]) {
        expect(h, `#${id}`).not.toMatch(/\bSELECT\b|\bFROM\b|\bWHERE\b/);
        expect(h, `#${id}`).not.toContain(c.solution.slice(0, 30));
      }
    }
  });

  it('every multi-row solution orders its result at the top level, so rows compare in sequence', () => {
    for (const id of IDS.filter(i => i !== 348 && i !== 350)) expect(/ORDER BY [^)]*$/i.test(byId(id).solution), `#${id}`).toBe(true);
    expect(run(348)).toHaveLength(1);
    expect(run(350)).toHaveLength(1);
  });

  it('every reference passes its own grader', () => {
    for (const id of IDS) expect(grades(id, byId(id).solution), `#${id}`).toBe(true);
  });
});

describe('the solutions, run and pinned, and the wrong answers that must fail', () => {
  it('343 — 7 markets, only the UK fell on both revenue and units', () => {
    const rows = run(343);
    expect(rows).toHaveLength(7);
    expect(rows.filter(r => r.real_decline === 1).map(r => r.country)).toEqual(['UK']);
    const uk = rows.find(r => r.country === 'UK');
    expect(uk).toEqual({ country: 'UK', jan_revenue: 639.98, feb_revenue: 49.99, revenue_change_pct: -92.2, jan_units: 2, feb_units: 1, units_change_pct: -50, real_decline: 1 });
    const usa = rows.find(r => r.country === 'USA');
    expect([usa.revenue_change_pct, usa.units_change_pct, usa.real_decline]).toEqual([-41.9, 83.3, 0]);
    // Wrong: integer arithmetic on the units — 1 → 5 becomes 400 only by luck, 6 → 11 truncates to 0.
    expect(grades(343, edit(343, 'ROUND(100.0 * (feb_units - jan_units) / jan_units, 1)', '100 * (feb_units - jan_units) / jan_units'))).toBe(false);
    // Wrong: "declined" on revenue alone flags the USA and Canada as well.
    expect(grades(343, edit(343, 'feb_revenue < jan_revenue * 0.95 AND feb_units < jan_units * 0.95', 'feb_revenue < jan_revenue * 0.95'))).toBe(false);
  });

  it('344 — 8 months of 2026; the first month is measured over the whole ledger', () => {
    const rows = run(344);
    expect(rows.map(r => r.month)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']);
    expect(rows[0]).toEqual({ month: '2026-01', new_spenders: 13, new_spend_gbp: 1958.02, returning_spenders: 36, returning_spend_gbp: 4065.43 });
    expect(rows[7]).toEqual({ month: '2026-08', new_spenders: 13, new_spend_gbp: 2550.83, returning_spenders: 70, returning_spend_gbp: 12470.05 });
    // Wrong: narrowing to 2026 before finding the first month makes every 2025 spender new in January.
    const early = edit(344, "WHERE type = 'card_payment' AND status = 'completed')", "WHERE type = 'card_payment' AND status = 'completed' AND ts >= '2026-01-01')");
    expect(run(344, early)[0].new_spenders).toBe(49);
    expect(grades(344, early)).toBe(false);
  });

  it('345 — dated by the payment, March is 3.33% (32 of 960); by filing month it would read 23', () => {
    expect(run(345)).toEqual([
      { payment_month: '2026-03', payments: 960, disputed_payments: 32, dispute_rate_pct: 3.33, disputes_filed_that_month: 23 },
      { payment_month: '2026-04', payments: 1119, disputed_payments: 39, dispute_rate_pct: 3.49, disputes_filed_that_month: 37 },
      { payment_month: '2026-05', payments: 86, disputed_payments: 5, dispute_rate_pct: 5.81, disputes_filed_that_month: 16 },
    ]);
    // Wrong: dating the disputed payments by the chargeback's opened_at.
    expect(grades(345, edit(345, 'SELECT substr(t.txn_at, 1, 7) AS month, COUNT(DISTINCT c.txn_id)', 'SELECT substr(c.opened_at, 1, 7) AS month, COUNT(DISTINCT c.txn_id)'))).toBe(false);
  });

  it('346 — the loan-weighted system ratio sits under the plain average every quarter', () => {
    const rows = run(346);
    expect(rows).toEqual([
      { period_end: '20250331', banks: 186, avg_bank_npl_pct: 0.669, system_npl_pct: 0.602 },
      { period_end: '20250630', banks: 189, avg_bank_npl_pct: 0.638, system_npl_pct: 0.584 },
      { period_end: '20250930', banks: 192, avg_bank_npl_pct: 0.641, system_npl_pct: 0.583 },
      { period_end: '20251231', banks: 192, avg_bank_npl_pct: 0.651, system_npl_pct: 0.597 },
    ]);
    // Wrong: the plain average in both columns.
    expect(grades(346, edit(346, 'ROUND(SUM(npl_ratio * net_loans) / SUM(net_loans), 3)', 'ROUND(AVG(npl_ratio), 3)'))).toBe(false);
  });

  it('347 — four methods; bank transfer leads on the sum of each user\'s largest top-up', () => {
    expect(run(347)).toEqual([
      { method: 'bank_transfer', users: 145, sum_of_largest_gbp: 113788 },
      { method: 'card', users: 163, sum_of_largest_gbp: 38500 },
      { method: 'apple_pay', users: 49, sum_of_largest_gbp: 9550 },
      { method: 'google_pay', users: 24, sum_of_largest_gbp: 3750 },
    ]);
    // Wrong: summing every top-up instead of each user's largest.
    expect(grades(347, 'SELECT method, COUNT(DISTINCT user_id) AS users, ROUND(SUM(amount_gbp), 2) AS sum_of_largest_gbp FROM top_ups GROUP BY method ORDER BY sum_of_largest_gbp DESC, method')).toBe(false);
  });

  it('348 — 189 accounts hold 481085.44 at the end of 30 June 2026', () => {
    expect(run(348)).toEqual([{ accounts: 189, customer_funds_gbp: 481085.44, largest_balance_gbp: 23765.34, accounts_under_50_gbp: 20 }]);
    // Wrong 1: cutting at '2026-06-30' drops everything that happened during the 30th.
    expect(grades(348, edit(348, "< '2026-07-01'", "<= '2026-06-30'"))).toBe(false);
    // Wrong 2: forgetting the fees.
    expect(grades(348, edit(348, ' - COALESCE(fee_gbp, 0) AS delta', ' AS delta'))).toBe(false);
    // Wrong 3: letting declined and reversed transactions move the balance.
    expect(grades(348, edit(348, "WHERE status = 'completed' AND ts", 'WHERE ts'))).toBe(false);
  });

  it('349 — seven mature 2026 cohorts; step 2 only counts after step 1', () => {
    expect(run(349)).toEqual([
      { signup_month: '2026-01', signups: 14, kyc_3d: 8, paid_30d: 6 },
      { signup_month: '2026-02', signups: 19, kyc_3d: 7, paid_30d: 4 },
      { signup_month: '2026-03', signups: 15, kyc_3d: 6, paid_30d: 2 },
      { signup_month: '2026-04', signups: 16, kyc_3d: 10, paid_30d: 5 },
      { signup_month: '2026-05', signups: 8, kyc_3d: 5, paid_30d: 2 },
      { signup_month: '2026-06', signups: 15, kyc_3d: 11, paid_30d: 8 },
      { signup_month: '2026-07', signups: 19, kyc_3d: 9, paid_30d: 5 },
    ]);
    // Wrong 1: no maturity cut — an August cohort appears and July grows.
    expect(grades(349, edit(349, "date('2026-08-31', '-33 days')", "'2026-08-31'"))).toBe(false);
    // Wrong 2: step 2 counted on its own, not only after step 1.
    expect(grades(349, edit(349, 'SUM(kyc_ok * pay_ok)', 'SUM(pay_ok)'))).toBe(false);
  });

  it('350 — 8 comparable markets; 672.4% headline against 466.3% like-for-like', () => {
    expect(run(350)).toEqual([{ comparable_markets: 8, all_markets_growth_pct: 672.4, like_for_like_growth_pct: 466.3 }]);
    // Wrong: averaging each comparable market's own growth.
    const avgOfGrowth = "WITH m AS (SELECT merchant_country, SUM(CASE WHEN ts >= '2025-07-01' AND ts < '2025-08-01' THEN amount_gbp ELSE 0 END) AS a, SUM(CASE WHEN ts >= '2026-07-01' AND ts < '2026-08-01' THEN amount_gbp ELSE 0 END) AS b FROM transactions WHERE type = 'card_payment' AND status = 'completed' GROUP BY merchant_country) SELECT SUM(CASE WHEN a > 0 AND b > 0 THEN 1 ELSE 0 END) AS comparable_markets, ROUND(100.0 * (SUM(b) - SUM(a)) / SUM(a), 1) AS all_markets_growth_pct, ROUND(AVG(CASE WHEN a > 0 AND b > 0 THEN 100.0 * (b - a) / a END), 1) AS like_for_like_growth_pct FROM m";
    expect(grades(350, avgOfGrowth)).toBe(false);
  });

  it('351 — Clothing & Travel share the most accounts; one row per pair, deduped per account', () => {
    expect(run(351)).toEqual([
      { category_a: 'Clothing', category_b: 'Travel', accounts_both: 152, pct_of_a_also_b: 85.4 },
      { category_a: 'Clothing', category_b: 'Gas', accounts_both: 149, pct_of_a_also_b: 83.7 },
      { category_a: 'Gas', category_b: 'Travel', accounts_both: 138, pct_of_a_also_b: 84.1 },
      { category_a: 'Clothing', category_b: 'Grocery', accounts_both: 136, pct_of_a_also_b: 76.4 },
      { category_a: 'Clothing', category_b: 'Pharmacy', accounts_both: 131, pct_of_a_also_b: 73.6 },
    ]);
    // Wrong 1: no per-account dedupe — transaction pairs, not shoppers.
    expect(grades(351, edit(351, 'SELECT DISTINCT t.account_id', 'SELECT t.account_id'))).toBe(false);
    // Wrong 2: "different" instead of "smaller first" lists every pair twice.
    expect(grades(351, edit(351, 'a.category < b.category', 'a.category <> b.category'))).toBe(false);
  });

  it('352 — 14 months; the four flows add up', () => {
    const rows = run(352);
    expect(rows).toHaveLength(14);
    expect(rows[0].month).toBe('2025-07');
    expect(rows.find(r => r.month === '2026-03')).toEqual({ month: '2026-03', active_users: 96, new_users: 12, retained_users: 63, resurrected_users: 21, churned_users: 12 });
    for (const r of rows) expect(r.new_users + r.retained_users + r.resurrected_users, r.month).toBe(r.active_users);
    // Wrong: everyone seen before counts as retained, so resurrected collapses into it.
    expect(grades(352, edit(352, 'SUM(f.was_active) AS retained_users', 'SUM(CASE WHEN f.month > f.first_month THEN 1 ELSE 0 END) AS retained_users'))).toBe(false);
  });

  it('353 — 15 months; quiet days pull the early averages down', () => {
    const rows = run(353);
    expect(rows).toHaveLength(15);
    expect(rows[0]).toEqual({ month: '2025-06', mau: 10, avg_dau: 0.77, stickiness_pct: 7.7 });
    expect(rows[14]).toEqual({ month: '2026-08', mau: 117, avg_dau: 8.87, stickiness_pct: 7.6 });
    // The example's "13 of its 30 days".
    expect(run(353, "SELECT COUNT(DISTINCT substr(ts, 1, 10)) AS n FROM transactions WHERE status = 'completed' AND ts LIKE '2025-06%'")[0].n).toBe(13);
    // Wrong: averaging only the days that had activity.
    const activeDaysOnly = "WITH daily AS (SELECT substr(ts, 1, 10) AS d, COUNT(DISTINCT user_id) AS dau FROM transactions WHERE status = 'completed' GROUP BY 1), mau AS (SELECT substr(ts, 1, 7) AS month, COUNT(DISTINCT user_id) AS mau FROM transactions WHERE status = 'completed' GROUP BY 1) SELECT substr(d.d, 1, 7) AS month, m.mau, ROUND(AVG(d.dau), 2) AS avg_dau, ROUND(100.0 * AVG(d.dau) / m.mau, 1) AS stickiness_pct FROM daily d JOIN mau m ON m.month = substr(d.d, 1, 7) GROUP BY 1, m.mau ORDER BY 1";
    expect(grades(353, activeDaysOnly)).toBe(false);
  });

  it('354 — four buckets over 209 eligible users, the never-active included', () => {
    expect(run(354)).toEqual([
      { first_two_weeks_days: '0', users: 117, retained_users: 88, retention_pct: 75.2 },
      { first_two_weeks_days: '1', users: 64, retained_users: 53, retention_pct: 82.8 },
      { first_two_weeks_days: '2', users: 19, retained_users: 16, retention_pct: 84.2 },
      { first_two_weeks_days: '3+', users: 9, retained_users: 7, retention_pct: 77.8 },
    ]);
    // Wrong: the status test after the join drops every user who never transacted.
    expect(grades(354, edit(354, "LEFT JOIN transactions t ON t.user_id = e.user_id AND t.status = 'completed' GROUP BY", "LEFT JOIN transactions t ON t.user_id = e.user_id WHERE t.status = 'completed' GROUP BY"))).toBe(false);
  });
});

describe('the examples state the data', () => {
  const nums = s => (s.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(x => Number(x.replace(/,/g, '')));
  it('every pinned figure an example output quotes is in the reference result, in both languages', () => {
    const quoted = {
      343: [639.98, 49.99, 92.2, 50, 41.9, 83.3],
      344: [13, 1958.02, 36, 4065.43, 2550.83, 70, 12470.05],
      345: [960, 32, 3.33, 23],
      346: [186, 0.669, 0.602],
      347: [145, 113788, 163, 38500],
      348: [189, 481085.44, 23765.34, 20],
      349: [14, 8, 6],
      350: [8],
      351: [152, 85.4],
      352: [96, 12, 63, 21],
      353: [10, 0.77, 7.7],
      354: [117, 75.2, 19, 84.2],
    };
    for (const id of IDS) {
      const flat = JSON.stringify(run(id));
      for (const n of quoted[id]) expect(flat.includes(String(n)) || flat.includes(String(-n)), `#${id} ${n}`).toBe(true);
      for (const ex of [byId(id).example.output, byId(id).example_tr.output]) {
        const said = nums(ex);
        for (const n of quoted[id]) expect(said, `#${id} "${ex}"`).toContain(n);
      }
    }
  });

  it('the input lines count the tables they name', () => {
    const count = (ds, sql) => dbFor(ds).prepare(sql).get().n;
    expect(count('finans_neobank', "SELECT COUNT(*) AS n FROM transactions WHERE type = 'card_payment' AND status = 'completed'")).toBe(1725);
    expect(count('finans_neobank', 'SELECT COUNT(*) AS n FROM transactions')).toBe(3433);
    expect(count('finans_neobank', 'SELECT COUNT(*) AS n FROM top_ups')).toBe(1153);
    expect(count('finans_neobank', 'SELECT COUNT(*) AS n FROM users')).toBe(240);
    expect(count('finans_fraud', 'SELECT COUNT(*) AS n FROM transactions')).toBe(2165);
    expect(count('finans_fraud', 'SELECT COUNT(*) AS n FROM chargebacks')).toBe(76);
    expect(count('finans_fraud', 'SELECT COUNT(DISTINCT account_id) AS n FROM transactions')).toBe(200);
    expect(count('finans_banking', 'SELECT COUNT(*) AS n FROM financials')).toBe(763);
    expect(count('ecommerce', "SELECT COUNT(*) AS n FROM orders WHERE status = 'completed'")).toBe(37);
    expect(count('finans_neobank', "SELECT COUNT(DISTINCT merchant_country) AS n FROM transactions WHERE type = 'card_payment' AND status = 'completed'")).toBe(19);
  });
});
