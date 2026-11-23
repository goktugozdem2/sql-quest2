// Challenge 325 (2026-11-23, fleet B3) — reconciling two payment partners'
// settlement reports against one expectations table. The shape comes from a
// single candidate's report of a Stripe round (docs/reads/companies/stripe.md,
// row dated 2026-11-23; unattributed by the founder's promise). The card is
// our wording on our own synthetic tables (ecommerce.expected_payments,
// partner_a_report, partner_b_report), not the interview's question.
//
// The grader compares a learner's rows to the reference solution's, so the
// solution is run here on the app's own table rules (a column's type comes
// from the first row's value) and its result pinned. Then the wrong answers
// the round was about are run, and each must give a DIFFERENT result — or the
// data does not teach the lesson the card promises:
//   1. one direction only (missing, or unexpected, but not both);
//   2. the expectations table not filtered to the partner being reconciled
//      (both directions, and the subtler half-filter);
//   3. a report's repeated row counted twice (the key is not unique).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';
import { isFreePreview } from '../src/utils/challenge-order.js';
import { slugify } from '../scripts/question-slugs.mjs';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const sb = { window: { challengesData: [] }, console: { log() {} } };
vm.createContext(sb);
for (const f of ['../src/data/datasets.js', '../src/data/challenges.js', '../src/data/challenge-companies.js']) {
  vm.runInContext(readFileSync(here(f), 'utf8'), sb);
}
const { publicDatasetsData: datasets, challengesData: bank, challengeCompanies: tags } = sb.window;
const card = bank.find(c => c.id === 325);

function loadDb() {
  const db = new Database(':memory:');
  for (const [name, t] of Object.entries(datasets[card.dataset].tables)) {
    const types = t.columns.map((_, i) => {
      const s = t.data[0]?.[i];
      return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r.map(v => (v === undefined ? null : v)))))(t.data);
  }
  return db;
}
const db = loadDb();
const run = sql => db.prepare(sql).all().map(r => [r.partner, r.txn_id, r.issue]);

const EXPECTED = [
  ['A', 'T-1010', 'missing'],
  ['A', 'T-1021', 'missing'],
  ['A', 'T-1031', 'unexpected'],
  ['B', 'T-1008', 'missing'],
  ['B', 'T-1013', 'unexpected'],
  ['B', 'T-1019', 'missing'],
  ['B', 'T-1033', 'unexpected'],
];

// Wrong answers, written the way a learner would.
const missingOnly = `
  SELECT 'A' AS partner, txn_id, 'missing' AS issue FROM expected_payments e
   WHERE partner = 'A' AND NOT EXISTS (SELECT 1 FROM partner_a_report r WHERE r.txn_id = e.txn_id)
  UNION ALL
  SELECT 'B', txn_id, 'missing' FROM expected_payments e
   WHERE partner = 'B' AND NOT EXISTS (SELECT 1 FROM partner_b_report r WHERE r.txn_id = e.txn_id)
  ORDER BY partner, txn_id`;
const unexpectedOnly = `
  SELECT DISTINCT 'A' AS partner, txn_id, 'unexpected' AS issue FROM partner_a_report r
   WHERE NOT EXISTS (SELECT 1 FROM expected_payments e WHERE e.partner = 'A' AND e.txn_id = r.txn_id)
  UNION ALL
  SELECT DISTINCT 'B', txn_id, 'unexpected' FROM partner_b_report r
   WHERE NOT EXISTS (SELECT 1 FROM expected_payments e WHERE e.partner = 'B' AND e.txn_id = r.txn_id)
  ORDER BY partner, txn_id`;
const unfiltered = card.solution.replace(/ WHERE partner = '[AB]'/g, '');
const halfFiltered = card.solution
  .replace("SELECT txn_id FROM expected_payments WHERE partner = 'A')", "SELECT txn_id FROM expected_payments WHERE partner = 'A'), all_exp AS (SELECT txn_id FROM expected_payments)")
  .replace("FROM a WHERE NOT EXISTS (SELECT 1 FROM exp_a e", "FROM a WHERE NOT EXISTS (SELECT 1 FROM all_exp e")
  .replace("FROM b WHERE NOT EXISTS (SELECT 1 FROM exp_b e", "FROM b WHERE NOT EXISTS (SELECT 1 FROM all_exp e");
const repeated = card.solution.replace(/SELECT DISTINCT txn_id/g, 'SELECT txn_id');

describe('card 325 — the record', () => {
  it('exists once, Hard, on the ecommerce tables, with every field the app reads', () => {
    expect(bank.filter(c => c.id === 325)).toHaveLength(1);
    for (const k of ['title', 'description', 'hint', 'solution', 'title_tr', 'description_tr', 'hint_tr', 'slug', 'category']) {
      expect(typeof card[k], k).toBe('string');
    }
    expect(card.difficulty).toBe('Hard');
    expect(card.dataset).toBe('ecommerce');
    expect(card.tables).toEqual(['expected_payments', 'partner_a_report', 'partner_b_report']);
    for (const t of card.tables) expect(Object.keys(datasets.ecommerce.tables)).toContain(t);
    expect(card.example?.output && card.example_tr?.output).toBeTruthy();
    expect(card.xpReward).toBeGreaterThan(0);
    expect(card.slug).toBe(slugify(card.title));
    expect(isFreePreview(card)).toBe(false);
    expect(challengeMatchesSkill(card, 'Subqueries & CTEs')).toBe(true);
  });

  it('is tagged Stripe, and no other company', () => {
    expect(tags['325']).toEqual(['Stripe']);
  });

  it('never names the method or the company in what the learner reads', () => {
    for (const s of [card.title, card.description, card.title_tr, card.description_tr]) {
      expect(s).not.toMatch(/anti[- ]?join|unique|benzersiz|duplicate/i);
      expect(s).not.toMatch(/NOT EXISTS|NOT IN|EXCEPT|LEFT JOIN|IS NULL|DISTINCT/); // SQL keywords, upper case
      expect(s).not.toMatch(/stripe/i);
    }
    for (const h of [card.hint, card.hint_tr]) {
      expect(h).not.toMatch(/\bSELECT\b/);
      expect(h).not.toContain(card.solution.slice(0, 40));
    }
  });

  it('orders its result at the top level, so rows compare in sequence', () => {
    expect(/ORDER BY [^)]*$/i.test(card.solution)).toBe(true);
  });
});

describe('card 325 — the solution and the wrong answers, run', () => {
  it('the reference gives 7 rows: 4 missing, 3 unexpected', () => {
    expect(run(card.solution)).toEqual(EXPECTED);
  });

  it('the data plants every trap the card is about', () => {
    const count = sql => db.prepare(sql).get().n;
    expect(count("SELECT COUNT(*) AS n FROM expected_payments WHERE partner = 'A'")).toBe(12);
    expect(count("SELECT COUNT(*) AS n FROM expected_payments WHERE partner = 'B'")).toBe(12);
    expect(count("SELECT COUNT(*) AS n FROM partner_b_report WHERE txn_id = 'T-1033'")).toBe(2);
    expect(count("SELECT COUNT(*) AS n FROM expected_payments WHERE txn_id = 'T-1013' AND partner = 'A'")).toBe(1);
  });

  it('wrong answer 1: one direction only — fails either way', () => {
    expect(run(missingOnly)).toHaveLength(4);
    expect(run(missingOnly)).not.toEqual(EXPECTED);
    expect(run(unexpectedOnly)).toHaveLength(3);
    expect(run(unexpectedOnly)).not.toEqual(EXPECTED);
  });

  it('wrong answer 2: the expectations not filtered to the partner — 29 rows instead of 7', () => {
    const rows = run(unfiltered);
    expect(rows).toHaveLength(29);
    expect(rows).not.toEqual(EXPECTED);
    // The half-filter (filtered only when looking for misses) hides T-1013,
    // which partner A was sent and partner B settled.
    const half = run(halfFiltered);
    expect(half).toEqual(EXPECTED.filter(r => r[1] !== 'T-1013'));
  });

  it('wrong answer 3: the repeated report row counted twice — T-1033 appears twice', () => {
    const rows = run(repeated);
    expect(rows.filter(r => r[1] === 'T-1033')).toHaveLength(2);
    expect(rows).not.toEqual(EXPECTED);
  });
});
