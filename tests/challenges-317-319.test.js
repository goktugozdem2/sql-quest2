// Challenges 317-319 (2026-10-21) — the shapes of a Business Intelligence
// Engineer technical round a candidate described to us by email
// (docs/reads/amazon-bie-candidate-report-2026-10-21.md; name withheld).
//
// They are our wording on our own synthetic tables (ecommerce.logins,
// ecommerce.reviews), not the interview's questions, and no card names the
// company. Each reference solution is executed on the app's own table rules
// and its result pinned — the grader compares a learner's rows to these. Each
// card names a trap in its description; the trap query is run too and must
// give a DIFFERENT answer, or the card promises a lesson the data does not
// teach. The department-average shape from the same report already had two
// cards (131, 171); they are tagged Amazon rather than duplicated.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';
import { isFreePreview } from '../src/utils/challenge-order.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const sb = { window: { challengesData: [] }, console: { log() {} } };
vm.createContext(sb);
for (const f of ['../src/data/datasets.js', '../src/data/challenges.js', '../src/data/challenge-companies.js']) {
  vm.runInContext(readFileSync(here(f), 'utf8'), sb);
}
const { publicDatasetsData: datasets, challengesData: bank, challengeCompanies: tags } = sb.window;
const IDS = [317, 318, 319];
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

describe('the three cards', () => {
  it('exist once each, on the ecommerce tables, with every field the app reads', () => {
    for (const id of IDS) {
      expect(bank.filter(c => c.id === id), `#${id}`).toHaveLength(1);
      const c = byId(id);
      for (const k of ['title', 'description', 'hint', 'solution', 'title_tr', 'description_tr', 'hint_tr', 'slug', 'category']) {
        expect(typeof c[k], `#${id}.${k}`).toBe('string');
      }
      expect(c.example?.output && c.example_tr?.output, `#${id} examples`).toBeTruthy();
      expect(c.dataset).toBe('ecommerce');
      for (const t of c.tables) expect(Object.keys(datasets.ecommerce.tables), `#${id} ${t}`).toContain(t);
      expect(c.xpReward).toBeGreaterThan(0);
      expect(isFreePreview(c), `#${id}`).toBe(false);
    }
    expect(IDS.map(byId).map(c => c.difficulty)).toEqual(['Medium', 'Hard', 'Hard']);
  });

  it('land on the radar as window-function work; the two login cards also as date work', () => {
    for (const id of IDS) expect(challengeMatchesSkill(byId(id), 'Window Functions'), `#${id}`).toBe(true);
    for (const id of [318, 319]) expect(challengeMatchesSkill(byId(id), 'Date Functions'), `#${id}`).toBe(true);
  });

  it('are tagged Amazon, with the department-average cards beside them — and never name the company in their text', () => {
    for (const id of [131, 171, ...IDS]) expect(tags[String(id)], `#${id}`).toContain('Amazon');
    for (const id of IDS) {
      const c = byId(id);
      expect([c.title, c.description, c.hint, c.title_tr, c.description_tr, c.hint_tr].join(' '), `#${id}`).not.toMatch(/amazon/i);
    }
  });

  it('render as paragraphs: real line breaks, never a literal backslash-n on screen', () => {
    for (const id of IDS) {
      const c = byId(id);
      for (const t of [c.description, c.description_tr, c.hint, c.hint_tr]) expect(t, `#${id}`).not.toMatch(/\\n/);
      for (const t of [c.description, c.description_tr]) expect(t, `#${id}`).toContain('\n\n');
    }
  });

  it('never put the query in the hint (the question pages show a free card\'s hint)', () => {
    for (const id of IDS) {
      const c = byId(id);
      for (const h of [c.hint, c.hint_tr]) {
        expect(h, `#${id}`).not.toMatch(/\bSELECT\b/);
        expect(h, `#${id}`).not.toContain(c.solution.slice(0, 40));
      }
    }
  });

  it('every solution orders its result at the top level, so rows compare in sequence', () => {
    for (const id of IDS) expect(/ORDER BY [^)]*$/i.test(byId(id).solution), `#${id}`).toBe(true);
  });
});

describe('the solutions, run', () => {
  it('317 — three pairs; a third review and id order each change the answer', () => {
    expect(run(317)).toEqual([
      { name: 'Daniel Martinez', product: 'Office Chair' },
      { name: 'James Johnson', product: 'Laptop Pro' },
      { name: 'John Smith', product: 'Laptop Pro' },
    ]);
    // Without "exactly twice": the customer with three reviews comes in.
    const noCount = run(317, byId(317).solution.replace('AND r1.n = 2 ', ''));
    expect(noCount.map(r => r.name)).toContain('Michael Brown');
    // "Second" by review_id instead of by date: the out-of-order rows drop out.
    const byReviewId = run(317, byId(317).solution.replace('ORDER BY review_date', 'ORDER BY review_id'));
    expect(byReviewId.map(r => r.name)).not.toContain('Daniel Martinez');
  });

  it('318 — five streaks, one across a month end; without DISTINCT a same-day login breaks one', () => {
    expect(run(318)).toEqual([
      { name: 'Olivia Anderson', streak_start: '2024-03-28', streak_length: 5 },
      { name: 'Sarah Davis', streak_start: '2024-03-10', streak_length: 5 },
      { name: 'John Smith', streak_start: '2024-03-01', streak_length: 4 },
      { name: 'Emma Wilson', streak_start: '2024-03-05', streak_length: 3 },
      { name: 'Sarah Davis', streak_start: '2024-03-01', streak_length: 3 },
    ]);
    const noDistinct = run(318, byId(318).solution.replace('SELECT DISTINCT customer_id, DATE(login_at)', 'SELECT customer_id, DATE(login_at)'));
    expect(noDistinct.map(r => r.name)).not.toContain('Emma Wilson');
  });

  it('319 — seven customers; counting logins instead of days, or a 5-day gap, each change the answer', () => {
    expect(run(319)).toEqual([
      { name: 'John Smith', first_hit: '2024-03-03' },
      { name: 'Sarah Davis', first_hit: '2024-03-03' },
      { name: 'Michael Brown', first_hit: '2024-03-04' },
      { name: 'Emily Taylor', first_hit: '2024-03-07' },
      { name: 'Emma Wilson', first_hit: '2024-03-07' },
      { name: 'James Johnson', first_hit: '2024-03-24' },
      { name: 'Olivia Anderson', first_hit: '2024-03-30' },
    ]);
    // Three logins on one day are one login day: counting rows lets Daniel in.
    const noDistinct = run(319, byId(319).solution.replace('SELECT DISTINCT customer_id, DATE(login_at)', 'SELECT customer_id, DATE(login_at)'));
    expect(noDistinct.map(r => r.name)).toContain('Daniel Martinez');
    // The window is 7 days, so 6 days apart is inside it: Emily sits on the boundary.
    const strict = run(319, byId(319).solution.replace('<= 6', '< 6'));
    expect(strict.map(r => r.name)).not.toContain('Emily Taylor');
  });
});
