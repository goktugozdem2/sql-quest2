// The Metrics & Case Round (2026-11-22, lanes C5/B3).
//
// One test per item. Every number the set shows is computed here from the
// dataset the item names: the correct option through the item's own
// `verify.sql`, every wrong option through its own query below, so a wrong
// option can never quietly become right (or a right one wrong) when a
// dataset is regenerated. The three written items run their reference, a
// correct alternative that must pass the app's grader, and the common wrong
// answer that must fail it. Then the free-preview gate (src/utils/case-round.js),
// its wiring in app.jsx, and the one sourced line on four company pages.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { isMcqQuestion, validateMcqQuestion } from '../src/utils/mock-interview.js';
import { resultsMatch } from '../src/utils/grade.js';
import { CASE_ROUND_MOCK_ID, freePreviewCount, freePreviewLabel, canStartMock, mockRunFor, previewEndReason, canResumeProgress } from '../src/utils/case-round.js';
import { COMPANY_INTERVIEWS } from '../src/data/company-interviews.js';
import { caseRoundLine, CASE_ROUND_LINE } from '../scripts/build-company-pages.mjs';
import { registeredMetrics } from '../scripts/ledger/due.mjs';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel) => readFileSync(here(rel), 'utf8');

function loadWindow(files) {
  const sb = { window: { challengesData: [] }, console: { log() {} } };
  vm.createContext(sb);
  for (const f of files) vm.runInContext(read(f), sb);
  return sb.window;
}

function buildDb(ds) {
  const db = new Database(':memory:');
  for (const [name, t] of Object.entries(ds.tables)) {
    const types = t.columns.map((_, i) => {
      const s = t.data.find(r => r[i] != null)?.[i];
      return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
  return db;
}

// One row → one comparable string; 1-decimal and 2-decimal values keep the
// precision the option prints (37.1, 39.0, 30.00).
const flat = (row) => Object.values(row).map(v => String(v)).join('|');
const one = (db, sql) => flat(db.prepare(sql).get());
const rowsOf = (db, sql) => {
  const st = db.prepare(sql);
  return { columns: st.columns().map(c => c.name), rows: st.raw().all() };
};
const graded = (db, user, solution) => {
  const u = rowsOf(db, user);
  const e = rowsOf(db, solution);
  return resultsMatch(u.rows, e.rows, solution, e.columns);
};

const USER_TYPES = "('card_payment', 'transfer_out', 'bill_payment', 'atm_withdrawal', 'fx_exchange')";
const AUG = "ts >= '2026-08-01' AND ts < '2026-09-01'";
const Q3_2025 = "signup_date >= '2025-07-01' AND signup_date < '2025-10-01'";
const FRAUD = "('fraud_card_present', 'fraud_card_not_present')";
const APRIL = "t.txn_at >= '2026-04-01' AND t.txn_at < '2026-05-01'";
const ACT = `SELECT COUNT(DISTINCT user_id) FROM transactions WHERE status = 'completed' AND type IN ${USER_TYPES} AND ${AUG}`;
const ANY = `SELECT COUNT(DISTINCT user_id) FROM transactions WHERE status = 'completed' AND ${AUG}`;
const ALL_USERS = "SELECT COUNT(*) FROM users WHERE signup_date < '2026-09-01'";
const PRE_AUG = "SELECT COUNT(*) FROM users WHERE signup_date < '2026-08-01'";
const rate = (num, den) => `SELECT (${num}) AS n, (${den}) AS d, printf('%.1f', ROUND(100.0 * (${num}) / (${den}), 1)) AS pct`;
const CARD_AUG = `FROM transactions WHERE type = 'card_payment' AND status = 'completed' AND ${AUG}`;
const REV_6M = `WITH c AS (SELECT user_id, signup_date FROM users WHERE ${Q3_2025}), r AS (SELECT c.user_id, SUM(CASE WHEN t.status = 'completed' THEN t.fee_gbp + CASE WHEN t.type = 'subscription_fee' THEN t.amount_gbp ELSE 0 END ELSE 0 END) AS rev, SUM(CASE WHEN t.status = 'completed' THEN t.fee_gbp ELSE 0 END) AS fees FROM c LEFT JOIN transactions t ON t.user_id = c.user_id AND t.ts < date(c.signup_date, '+6 months') GROUP BY c.user_id)`;
const cpaOver = (cond) => `SELECT printf('%.2f', 1440.0 / COUNT(*)) FROM users u WHERE u.${Q3_2025} AND ${cond}`;
const APR_TXNS = `SELECT COUNT(*) FROM transactions t WHERE ${APRIL}`;
const APR_CB = (extra) => `SELECT COUNT(*) FROM chargebacks c JOIN transactions t ON t.txn_id = c.txn_id WHERE ${APRIL} ${extra}`;

// The value every option prints, recomputed from the data. Keyed by option id.
const OPTION_SQL = {
  finans_neobank: {
    cr1a: rate(ANY, ALL_USERS),
    cr1b: rate(ACT, ALL_USERS),
    cr1c: rate(ACT, PRE_AUG),
    cr1d: rate(ANY, PRE_AUG),
    cr2a: `SELECT printf('%.2f', ROUND(SUM(amount_gbp) / COUNT(*), 2)) ${CARD_AUG}`,
    cr2b: `SELECT printf('%.2f', ROUND(SUM(amount_gbp) / (SELECT COUNT(*) FROM users), 2)) ${CARD_AUG}`,
    cr2c: `SELECT printf('%.2f', ROUND(SUM(amount_gbp) / COUNT(DISTINCT user_id), 2)) FROM transactions WHERE type = 'card_payment' AND ${AUG}`,
    cr2d: `SELECT printf('%.2f', ROUND(SUM(amount_gbp) / COUNT(DISTINCT user_id), 2)) ${CARD_AUG}`,
    cr4a: `${REV_6M} SELECT printf('%.2f', ROUND(SUM(rev) / SUM(rev > 0), 2)) FROM r`,
    cr4b: `${REV_6M} SELECT printf('%.2f', ROUND(SUM(fees) / COUNT(*), 2)) FROM r`,
    cr4c: `${REV_6M} SELECT printf('%.2f', ROUND(SUM(rev), 2)) FROM r`,
    cr4d: `${REV_6M} SELECT printf('%.2f', ROUND(SUM(rev) / COUNT(*), 2)) FROM r`,
    cr5a: cpaOver('1 = 1'),
    cr5b: cpaOver("EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.user_id AND t.type = 'card_payment' AND t.status = 'completed' AND t.ts < date(u.signup_date, '+30 day'))"),
    cr5c: cpaOver("EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.user_id AND t.type = 'card_payment' AND t.status = 'completed')"),
    cr5d: `${REV_6M} SELECT printf('%.2f', 1440.0 / SUM(rev > 0)) FROM r`,
    cr6a: `SELECT printf('%.1f', ROUND(100.0 * COUNT(DISTINCT CASE WHEN t.type = 'card_payment' AND t.status = 'completed' AND t.ts < date(u.signup_date, '+30 day') THEN u.user_id END) / COUNT(DISTINCT u.user_id), 1)) FROM users u LEFT JOIN transactions t ON t.user_id = u.user_id WHERE u.${Q3_2025}`,
    // The query shown in the item, as written: the inner JOIN.
    cr6b: `SELECT printf('%.1f', ROUND(100.0 * COUNT(DISTINCT CASE WHEN t.type = 'card_payment' AND t.status = 'completed' AND t.ts < date(u.signup_date, '+30 day') THEN u.user_id END) / COUNT(DISTINCT u.user_id), 1)) FROM users u JOIN transactions t ON t.user_id = u.user_id WHERE u.${Q3_2025}`,
    cr6c: `SELECT printf('%.1f', ROUND(100.0 * SUM(EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.user_id AND t.type = 'card_payment' AND t.status = 'completed' AND t.ts < date(u.signup_date, '+30 day'))) / SUM(EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.user_id AND t.type = 'card_payment' AND t.status = 'completed')), 1)) FROM users u WHERE u.${Q3_2025}`,
    cr6d: `SELECT printf('%.1f', ROUND(100.0 * SUM(EXISTS (SELECT 1 FROM transactions t WHERE t.user_id = u.user_id)) / COUNT(*), 1)) FROM users u WHERE u.${Q3_2025}`,
  },
  finans_fraud: {
    cr7a: `SELECT printf('%.2f', ROUND(100.0 * (${APR_CB('')}) / (${APR_TXNS}), 2))`,
    cr7b: `SELECT printf('%.1f', ROUND(100.0 * (${APR_CB(`AND c.reason_code IN ${FRAUD}`)}) / (SELECT COUNT(DISTINCT account_id) FROM transactions t WHERE ${APRIL}), 1))`,
    cr7c: `SELECT printf('%.2f', ROUND(100.0 * (${APR_CB(`AND c.reason_code IN ${FRAUD}`)}) / (${APR_TXNS}), 2))`,
    cr7d: `SELECT printf('%.2f', ROUND(100.0 * (SELECT SUM(t.amount) FROM chargebacks c JOIN transactions t ON t.txn_id = c.txn_id WHERE ${APRIL} AND c.reason_code IN ${FRAUD}) / (SELECT SUM(amount) FROM transactions t WHERE ${APRIL}), 2))`,
    cr8a: APR_CB(`AND c.reason_code IN ${FRAUD}`),
    cr8b: APR_CB(`AND c.reason_code IN ${FRAUD} AND c.opened_at >= '2026-05-01'`),
    cr8c: APR_CB("AND c.opened_at >= '2026-05-01'"),
    cr8d: APR_CB(`AND c.reason_code IN ${FRAUD} AND c.opened_at < '2026-05-01'`),
  },
};

// Strip a printed option down to the number it states ("£49.66 — …" → 49.66,
// "117 of 240 = 48.8% — …" → 117|240|48.8), and compare to the data.
const RETENTION = (signupDen, firstDen) => `WITH ui AS (SELECT user_id, date(ts) AS d FROM transactions WHERE status = 'completed' AND type IN ${USER_TYPES}), c AS (SELECT u.user_id, u.signup_date, (SELECT MIN(d) FROM ui WHERE ui.user_id = u.user_id) AS first_d FROM users u WHERE u.signup_date >= '2026-01-01' AND u.signup_date < '2026-07-01') SELECT SUM(EXISTS (SELECT 1 FROM ui WHERE ui.user_id = c.user_id AND ui.d BETWEEN date(c.signup_date, '+7 day') AND date(c.signup_date, '+13 day'))) AS rs, ${signupDen} AS ds, SUM(first_d IS NOT NULL AND EXISTS (SELECT 1 FROM ui WHERE ui.user_id = c.user_id AND ui.d BETWEEN date(c.first_d, '+7 day') AND date(c.first_d, '+13 day'))) AS rf, ${firstDen} AS df FROM c`;

let win, mock, dbs;
beforeAll(() => {
  win = loadWindow(['../src/data/neobank-data.js', '../src/data/finans-fraud-data.js', '../src/data/mock-interviews.js']);
  mock = win.mockInterviewsData.find(i => i.id === CASE_ROUND_MOCK_ID);
  dbs = {
    finans_neobank: buildDb(win.publicDatasetsData.finans_neobank),
    finans_fraud: buildDb(win.publicDatasetsData.finans_fraud),
  };
});

describe('the set — one mock, the existing engine', () => {
  it('exists with 12 items, 9 MCQ then 3 written, on our two datasets', () => {
    expect(mock).toBeTruthy();
    expect(mock.questions.length).toBe(12);
    expect(mock.questionsCount).toBe(12);
    expect(mock.questions.filter(isMcqQuestion).length).toBe(9);
    expect(mock.questions.slice(9).every(q => !isMcqQuestion(q) && q.solution && q.gradingNotes && q.gradingNotes_tr)).toBe(true);
    for (const q of mock.questions) expect(['finans_neobank', 'finans_fraud'], q.id).toContain(q.dataset);
    expect(mock.questions.map(q => q.order)).toEqual(mock.questions.map((_, i) => i + 1));
  });
  it('is Pro with the first 3 free, and its clock adds up', () => {
    expect(mock.isFree).toBe(false);
    expect(mock.freeQuestionCount).toBe(3);
    expect(mock.questions.reduce((s, q) => s + q.timeLimit, 0)).toBe(mock.totalTime);
  });
  it('makes no frequency claim and names no company', () => {
    const text = JSON.stringify(mock);
    expect(text).not.toMatch(/most[- ]asked|by frequency|% of interviews|always asked|Chime|Coinbase|PayPal|Monzo|Revolut/i);
  });
  it('every MCQ validates, EN and TR', () => {
    for (const q of mock.questions.filter(isMcqQuestion)) expect(validateMcqQuestion(q), q.id).toEqual([]);
  });
});

// One test per item: the correct option is what the data says, and every
// wrong option's number is what its own (wrong) definition gives.
describe('each multiple-choice item, recomputed from the data', () => {
  const ids = ['cr-m1', 'cr-m2', 'cr-m3', 'cr-m4', 'cr-m5', 'cr-m6', 'cr-m7', 'cr-m8'];
  for (const id of ids) {
    it(`${id}: correct option = verify.sql, every option's number from its own query`, () => {
      const q = mock.questions.find(x => x.id === id);
      const db = dbs[q.dataset];
      const correct = q.options.find(o => o.id === q.correctOptionId);
      expect(one(db, q.verify.sql), `${id} verify`).toBe(correct.value);
      if (id === 'cr-m3') {
        const want = { cr3a: RETENTION('COUNT(*)', 'COUNT(*)'), cr3b: RETENTION('COUNT(first_d)', 'COUNT(first_d)'), cr3c: RETENTION('COUNT(*)', 'COUNT(first_d)') };
        for (const [oid, sql] of Object.entries(want)) expect(one(db, sql), oid).toBe(q.options.find(o => o.id === oid).value);
        // 3d swaps the two pairs.
        const [rs, ds, rf, df] = one(db, want.cr3c).split('|');
        expect(q.options.find(o => o.id === 'cr3d').value).toBe([rf, df, rs, ds].join('|'));
      } else {
        for (const o of q.options) {
          const sql = OPTION_SQL[q.dataset][o.id];
          expect(sql, `${o.id} has a query`).toBeTruthy();
          expect(one(db, sql), o.id).toBe(o.value);
        }
      }
      // Every option states its own number in both languages.
      for (const o of q.options) {
        const n = o.value.split('|');
        for (const field of ['text', 'text_tr']) {
          const digits = o[field].replace(/(\d)[.,](?=\d{3}\b)/g, '$1').replace(/,/g, '.');
          for (const part of n) expect(digits, `${o.id}.${field} states ${part}`).toContain(String(Number(part)));
        }
      }
      expect(new Set(q.options.map(o => o.value)).size).toBe(q.options.length);
    });
  }

  it('cr-m9: the plain sentence states the cohort, the two retained counts and who is left out', () => {
    const q = mock.questions.find(x => x.id === 'cr-m9');
    const db = dbs[q.dataset];
    const [cohort, never] = one(db, q.verify.sql).split('|');
    const [rs, , rf, df] = one(db, RETENTION('COUNT(*)', 'COUNT(first_d)')).split('|');
    const right = q.options.find(o => o.id === q.correctOptionId);
    for (const field of ['text', 'text_tr']) {
      for (const n of [cohort, never, rs, rf, df]) expect(right[field], `${field} ${n}`).toMatch(new RegExp(`\\b${n}\\b`));
    }
    // The wrong ones are the three classic misreadings: the filtered rate as
    // everyone's, "not active" as churn, a share as a causal lift.
    expect(q.options.filter(o => o.id !== q.correctOptionId).map(o => o.value).sort()).toEqual(['causal', 'churn', 'quarter']);
  });

  it('cr-m4 and cr-m5 explanations quote the same six-month revenue and CAC the data gives', () => {
    const m4 = mock.questions.find(x => x.id === 'cr-m4');
    const m5 = mock.questions.find(x => x.id === 'cr-m5');
    const rev = one(dbs.finans_neobank, OPTION_SQL.finans_neobank.cr4d);
    const cac = one(dbs.finans_neobank, OPTION_SQL.finans_neobank.cr5a);
    expect(m5.explanation).toContain(`£${rev}`);
    expect(m5.explanation).toContain(`£${cac}`);
    expect(m5.explanation).toContain(`${Math.round(100 * Number(rev) / Number(cac))}%`);
    expect(m4.explanation).toContain(`£${rev}`);
  });

  it('cr-m8: the lag stated is the lag in the data, and the as-of rate is what it read', () => {
    const q = mock.questions.find(x => x.id === 'cr-m8');
    const db = dbs.finans_fraud;
    const maxLag = db.prepare(`SELECT CAST(ROUND(MAX(julianday(c.opened_at) - julianday(t.txn_at))) AS INTEGER) AS d FROM chargebacks c JOIN transactions t ON t.txn_id = c.txn_id`).get().d;
    expect(q.explanation).toContain(`${maxLag} days`);
    const asOf = one(db, `SELECT printf('%.2f', ROUND(100.0 * (${APR_CB(`AND c.reason_code IN ${FRAUD} AND c.opened_at < '2026-05-01'`)}) / (${APR_TXNS}), 2))`);
    expect(q.options.find(o => o.id === q.correctOptionId).text).toContain(`${asOf}%`);
  });
});

describe('each written item: reference, an alternative that passes, the common mistake that fails', () => {
  const W = {
    'cr-q1': {
      rows: [[89, 240, 37.1]],
      alt: `SELECT (${ACT}) AS active_users, (${ALL_USERS}) AS users, ROUND(100.0 * (${ACT}) / (${ALL_USERS}), 1) AS active_rate_pct`,
      wrong: [
        // plan fees and incoming transfers counted as activity
        `SELECT (${ANY}) AS a, (${ALL_USERS}) AS u, ROUND(100.0 * (${ANY}) / (${ALL_USERS}), 1) AS p`,
        // integer division
        `SELECT (${ACT}) AS a, (${ALL_USERS}) AS u, ROUND(100 * (${ACT}) / (${ALL_USERS}), 1) AS p`,
      ],
    },
    'cr-q2': {
      rows: [['2026-03', 960, 17, 1.77], ['2026-04', 1119, 22, 1.97]],
      alt: `SELECT substr(t.txn_at, 1, 7) AS m, COUNT(*) AS n, SUM(CASE WHEN c.reason_code IN ${FRAUD} THEN 1 ELSE 0 END) AS f, ROUND(100.0 * SUM(CASE WHEN c.reason_code IN ${FRAUD} THEN 1 ELSE 0 END) / COUNT(*), 2) AS p FROM transactions t LEFT JOIN chargebacks c ON c.txn_id = t.txn_id WHERE t.txn_at >= '2026-03-01' AND t.txn_at < '2026-05-01' GROUP BY m ORDER BY m`,
      wrong: [
        // the right-table filter in WHERE: the LEFT JOIN becomes inner
        `SELECT substr(t.txn_at, 1, 7) AS m, COUNT(*) AS n, COUNT(c.chargeback_id) AS f, ROUND(100.0 * COUNT(c.chargeback_id) / COUNT(*), 2) AS p FROM transactions t LEFT JOIN chargebacks c ON c.txn_id = t.txn_id WHERE c.reason_code IN ${FRAUD} AND t.txn_at >= '2026-03-01' AND t.txn_at < '2026-05-01' GROUP BY m ORDER BY m`,
        // disputes counted as fraud
        `SELECT substr(t.txn_at, 1, 7) AS m, COUNT(*) AS n, COUNT(c.chargeback_id) AS f, ROUND(100.0 * COUNT(c.chargeback_id) / COUNT(*), 2) AS p FROM transactions t LEFT JOIN chargebacks c ON c.txn_id = t.txn_id WHERE t.txn_at >= '2026-03-01' AND t.txn_at < '2026-05-01' GROUP BY m ORDER BY m`,
      ],
    },
    'cr-q3': {
      rows: [[87, 13, 70, 18]],
      alt: `WITH a AS (SELECT DISTINCT user_id, date(ts) AS d FROM transactions WHERE status = 'completed' AND type IN ${USER_TYPES}), c AS (SELECT u.user_id, u.signup_date, (SELECT MIN(d) FROM a WHERE a.user_id = u.user_id) AS f FROM users u WHERE u.signup_date BETWEEN '2026-01-01' AND '2026-06-30'), w AS (SELECT c.user_id, MAX(CASE WHEN a.d BETWEEN date(c.signup_date, '+7 day') AND date(c.signup_date, '+13 day') THEN 1 ELSE 0 END) AS rs, MAX(CASE WHEN a.d BETWEEN date(c.f, '+7 day') AND date(c.f, '+13 day') THEN 1 ELSE 0 END) AS rf FROM c LEFT JOIN a ON a.user_id = c.user_id GROUP BY c.user_id) SELECT (SELECT COUNT(*) FROM c), SUM(rs), (SELECT COUNT(f) FROM c), SUM(rf) FROM w`,
      wrong: [
        // the cohort built from transactions: the 17 who never transacted vanish
        `WITH a AS (SELECT DISTINCT user_id, date(ts) AS d FROM transactions WHERE status = 'completed' AND type IN ${USER_TYPES}), c AS (SELECT u.user_id, u.signup_date, MIN(a.d) AS f FROM users u JOIN a ON a.user_id = u.user_id WHERE u.signup_date >= '2026-01-01' AND u.signup_date < '2026-07-01' GROUP BY u.user_id, u.signup_date) SELECT COUNT(*), SUM(EXISTS (SELECT 1 FROM a WHERE a.user_id = c.user_id AND a.d BETWEEN date(c.signup_date, '+7 day') AND date(c.signup_date, '+13 day'))), COUNT(f), SUM(EXISTS (SELECT 1 FROM a WHERE a.user_id = c.user_id AND a.d BETWEEN date(c.f, '+7 day') AND date(c.f, '+13 day'))) FROM c`,
        // raw ts against bare dates: the last day of each window is lost
        `WITH a AS (SELECT user_id, ts AS d FROM transactions WHERE status = 'completed' AND type IN ${USER_TYPES}), c AS (SELECT u.user_id, u.signup_date, (SELECT MIN(date(d)) FROM a WHERE a.user_id = u.user_id) AS f FROM users u WHERE u.signup_date >= '2026-01-01' AND u.signup_date < '2026-07-01') SELECT COUNT(*), SUM(EXISTS (SELECT 1 FROM a WHERE a.user_id = c.user_id AND a.d BETWEEN date(c.signup_date, '+7 day') AND date(c.signup_date, '+13 day'))), COUNT(f), SUM(EXISTS (SELECT 1 FROM a WHERE a.user_id = c.user_id AND a.d BETWEEN date(c.f, '+7 day') AND date(c.f, '+13 day'))) FROM c`,
      ],
    },
  };
  for (const [id, w] of Object.entries(W)) {
    it(`${id}: reference returns the pinned rows; grading notes quote them; alt passes; mistakes fail`, () => {
      const q = mock.questions.find(x => x.id === id);
      const db = dbs[q.dataset];
      expect(rowsOf(db, q.solution).rows).toEqual(w.rows);
      for (const v of w.rows.flat().filter(v => typeof v === 'number')) {
        const shown = v >= 1000 ? v.toLocaleString('en-US') : String(v);
        expect(q.gradingNotes, `${id} notes quote ${v}`).toContain(shown);
      }
      expect(graded(db, w.alt, q.solution), `${id} alternative`).toBe(true);
      for (const bad of w.wrong) expect(graded(db, bad, q.solution), `${id} wrong: ${bad.slice(0, 60)}`).toBe(false);
    });
  }
});

describe('the free preview (src/utils/case-round.js)', () => {
  it('a free person gets the first 3 as their own run; Pro gets all 12', () => {
    expect(freePreviewCount(mock)).toBe(3);
    const free = mockRunFor(mock, false);
    expect(free.preview).toBe(true);
    expect(free.interview.id).toBe(mock.id);
    expect(free.interview.questions.map(q => q.id)).toEqual(['cr-m1', 'cr-m2', 'cr-m3']);
    expect(free.interview.previewOf).toEqual({ total: 12, free: 3 });
    expect(free.interview.totalTime).toBe(9 * 60);
    const pro = mockRunFor(mock, true);
    expect(pro.preview).toBe(false);
    expect(pro.interview).toBe(mock);
  });
  it('can start: free mock yes, preview mock yes, a plain Pro mock no', () => {
    const plainPro = win.mockInterviewsData.find(i => i.id === 'revolut-analytics-screen');
    expect(canStartMock(mock, false)).toBe(true);
    expect(canStartMock(plainPro, false)).toBe(false);
    expect(canStartMock(plainPro, true)).toBe(true);
    expect(mockRunFor(plainPro, false).preview).toBe(false);
  });
  it('the end of a preview opens the case_round reason; a full run opens nothing', () => {
    const r = previewEndReason(mockRunFor(mock, false).interview, { solvedCount: 2 });
    expect(r).toMatchObject({ type: 'case_round', interviewId: mock.id, freeCount: 3, total: 12, solvedCount: 2 });
    expect(previewEndReason(mock)).toBeNull();
  });
  it('only this mock carries a preview (no other mock was opened by accident)', () => {
    expect(win.mockInterviewsData.filter(m => freePreviewCount(m) > 0).map(m => m.id)).toEqual([CASE_ROUND_MOCK_ID]);
  });
});

describe('saved progress never resumes past the run it opens into', () => {
  it('a Pro save at question 7 does not resume into the free 3; one inside them does', () => {
    const run = mockRunFor(mock, false).interview;
    expect(canResumeProgress({ interviewId: mock.id, questionIndex: 7, answers: new Array(7) }, run)).toBe(false);
    expect(canResumeProgress({ interviewId: mock.id, questionIndex: 2, answers: [1, 2] }, run)).toBe(true);
    expect(canResumeProgress({ interviewId: mock.id, questionIndex: 7, answers: new Array(7) }, mock)).toBe(true);
    expect(canResumeProgress({ interviewId: 'other', questionIndex: 0, answers: [] }, run)).toBe(false);
    expect(canResumeProgress(null, run)).toBe(false);
  });
  it('startInterview resumes through canResumeProgress, after the run is cut', () => {
    const app = read('../src/app.jsx');
    const cut = app.indexOf('interview = mockRunFor(interview, userProStatus).interview;');
    const resume = app.indexOf('if (!forceNew && canResumeProgress(savedInterviewProgress, interview))');
    expect(cut).toBeGreaterThan(0);
    expect(resume).toBeGreaterThan(cut);
  });
});

describe('app.jsx wiring', () => {
  const app = read('../src/app.jsx');
  it('both start paths and the card use canStartMock, and cut the run with mockRunFor', () => {
    expect(app).toMatch(/const canAccessInterview = \(interview\) => canStartMock\(interview, userProStatus\);/);
    expect((app.match(/if \(!canStartMock\(interview, userProStatus\)\) \{/g) || []).length).toBe(2);
    expect((app.match(/interview = mockRunFor\(interview, userProStatus\)\.interview;/g) || []).length).toBe(2);
  });
  it('the last free answer completes the run and opens the case_round modal', () => {
    const adv = app.slice(app.indexOf('const advanceInterviewQuestion = () =>'), app.indexOf('const completeInterview = ('));
    expect(adv).toMatch(/completeInterview\(finalAnswers\);[\s\S]*previewEndReason\(activeInterview[\s\S]*setProModalReason\(endReason\);[\s\S]*setShowProModal\(true\)/);
  });
  it('a correct answer in the run itself clears the cold-start check (history has not re-rendered yet)', () => {
    const adv = app.slice(app.indexOf('const advanceInterviewQuestion = () =>'), app.indexOf('const completeInterview = ('));
    expect(adv).toMatch(/const solvedInRun = finalAnswers\.some\(a => a && a\.correct\);\s*if \(solvedInRun \|\| !openColdStartInstead\(\)\) \{/);
  });
  it('the results screen of a preview does not say "Keep Practicing!" over a perfect score', () => {
    expect(app).toMatch(/interviewResults\.preview\s*\?\s*`The free \$\{interviewResults\.preview\.free\} are done`/);
  });
  it('a preview is never a pass', () => {
    expect(app).toMatch(/const passed = !activeInterview\.previewOf && /);
  });
  it('the modal speaks to the case_round reason', () => {
    expect(app).toMatch(/proModalReason\.type === 'case_round'\s*\?\s*`/);
    expect(app).toContain('data-testid="pro-modal-case-round"');
  });
  it('written items show their grading notes after submit', () => {
    expect(app).toContain('data-testid="interview-grading-notes"');
  });
});

describe('the company-page line: only where the page\'s own source says so', () => {
  const WITH = ['paypal', 'coinbase', 'monzo', 'chime'];
  it('the four pages carry the line, citing their own sources, with a Pro link to the set', () => {
    for (const key of WITH) {
      const d = COMPANY_INTERVIEWS[key];
      expect(d.caseRound, key).toBeTruthy();
      for (const k of d.caseRound.sources) expect(Object.keys(d.sources), `${key} cites ${k}`).toContain(k);
      const html = read(`../src/${key}-sql-interview.html`);
      const block = html.match(/<!-- case-round:start -->[\s\S]*?<!-- case-round:end -->/);
      expect(block, key).toBeTruthy();
      expect(block[0]).toContain(CASE_ROUND_LINE);
      expect(block[0]).toContain(`/app/?interview=${CASE_ROUND_MOCK_ID}&amp;src=${key}-sql-interview`);
      for (const k of d.caseRound.sources) expect(block[0]).toContain(`#src-${k}`);
      expect(block[0]).toMatch(/>[^<]*\bPro\b[^<]*<\/a>/);
    }
  });
  it('no other page states it — Revolut\'s one source describes no such round', () => {
    for (const key of Object.keys(COMPANY_INTERVIEWS).filter(k => !WITH.includes(k))) {
      expect(COMPANY_INTERVIEWS[key].caseRound, key).toBeUndefined();
    }
    expect(read('../src/revolut-sql-interview.html')).not.toContain(CASE_ROUND_LINE);
  });
  it('the free count on the pages is the mock\'s own freeQuestionCount, never a literal', () => {
    // A1 on #174 (2026-11-24): "the first 3" was hard-coded in the generator,
    // so a mock moved to 5 would have left four pages saying 3.
    const n = freePreviewCount(mock);
    expect(n).toBe(mock.freeQuestionCount);
    for (const key of WITH) {
      const block = read(`../src/${key}-sql-interview.html`).match(/<!-- case-round:start -->[\s\S]*?<!-- case-round:end -->/)[0];
      expect(block, key).toContain(`(${freePreviewLabel(mock)})`);
      expect(block, key).toContain(`the first ${n} questions are free`);
    }
    const d = COMPANY_INTERVIEWS.chime;
    const five = caseRoundLine(d, 'chime-sql-interview', { ...mock, freeQuestionCount: 5 });
    expect(five).toContain('the first 5 questions are free, the rest is Pro');
    expect(five).not.toMatch(/the first 3 questions/);
    expect(caseRoundLine(d, 'chime-sql-interview', { ...mock, freeQuestionCount: 1 })).toContain('the first question is free, the rest is Pro');
    expect(() => caseRoundLine(d, 'chime-sql-interview', { ...mock, freeQuestionCount: 0 })).toThrow(/no free questions/);
    expect(read('../scripts/build-company-pages.mjs')).not.toMatch(/first \d+ questions? (are|is) free/);
  });
  it('the generator refuses a line that cites a source the page does not have', () => {
    const d = { ...COMPANY_INTERVIEWS.chime, caseRound: { note: 'x', sources: ['made-up'] } };
    expect(() => caseRoundLine(d, 'chime-sql-interview')).toThrow(/cite/);
    expect(caseRoundLine({ ...COMPANY_INTERVIEWS.chime, caseRound: undefined }, 'chime-sql-interview')).toBe('');
  });
});

describe('the claim: case_round_funnel, one name for one funnel', () => {
  // A1 on #174 (2026-11-24): the PR defined `content_funnel`, the name main's
  // per-landing-page funnel (#173) already had, so the claim's verdict would
  // read UNDEFINED. Renamed `case_round_funnel` (2026-11-25).
  const ledger = read('../docs/agent/ledger.md');
  const metricsText = read('../docs/agent/metrics.md');
  it('the ledger claim names case_round_funnel, and metrics.md defines it under that heading once', () => {
    const claim = ledger.match(/### the Metrics & Case Round[^\n]*\n[\s\S]*?(?=\n### |\n## )/);
    expect(claim).toBeTruthy();
    const metric = claim[0].match(/\*\*Metric\*\* `([a-z0-9_]+)`/);
    expect(metric && metric[1]).toBe('case_round_funnel');
    expect(registeredMetrics(metricsText).has('case_round_funnel')).toBe(true);
    expect(metricsText.match(/^## `case_round_funnel`$/gm)).toHaveLength(1);
    // main's content_funnel stays the per-landing-page funnel, and only that
    const cf = metricsText.match(/^## `content_funnel`\n[\s\S]*?(?=\n## )/gm) || [];
    expect(cf).toHaveLength(1);
    expect(cf[0]).not.toMatch(/metrics-case-round/);
  });
});
