// Challenges 312-316 (2026-09-24) — the String Functions ceiling and two
// NULL Handling cards, written when the bank stood at 299 and the founder
// asked for it to pass 300.
//
// Measured that morning through challengeMatchesSkill: String Functions held
// 7 Easy / 4 Medium / 1 Hard — a floor and no ceiling. So three of the five
// are string work (one Medium, two Hard) and two are NULL Handling (one
// Medium, one Hard), all on datasets the bank already ships.
//
// Every reference solution is executed here on the app's own table rules
// (app.jsx loadDataset: a column's type comes from the first row's value) and
// its result is pinned — the grader compares a learner's rows to these, so an
// empty or drifting result would accept wrong answers. Each card also names a
// trap in its description; the trap query is run too and must give a
// DIFFERENT answer, or the description is promising a lesson the data does
// not teach.
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
for (const f of ['../src/data/datasets.js', '../src/data/challenges.js']) vm.runInContext(readFileSync(here(f), 'utf8'), sb);
const { publicDatasetsData: datasets, challengesData: bank } = sb.window;
const IDS = [312, 313, 314, 315, 316];
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

describe('the five cards', () => {
  it('exist once each, on classic datasets, with every field the app reads', () => {
    for (const id of IDS) {
      expect(bank.filter(c => c.id === id), `#${id}`).toHaveLength(1);
      const c = byId(id);
      for (const k of ['title', 'description', 'hint', 'solution', 'title_tr', 'description_tr', 'hint_tr', 'slug', 'category']) {
        expect(typeof c[k], `#${id}.${k}`).toBe('string');
      }
      expect(c.example?.output && c.example_tr?.output, `#${id} examples`).toBeTruthy();
      expect(Object.keys(datasets)).toContain(c.dataset);
      for (const t of c.tables) expect(Object.keys(datasets[c.dataset].tables), `#${id} ${t}`).toContain(t);
      expect(c.xpReward).toBeGreaterThan(0);
      // Paywall rules are untouched: the new Hards are Pro, not previews.
      expect(isFreePreview(c), `#${id}`).toBe(false);
    }
  });

  it('aim at the measured gaps: 3 String Functions (1 Medium, 2 Hard), 2 NULL Handling (1 Medium, 1 Hard)', () => {
    const mix = (skill) => IDS.map(byId).filter(c => c.category === skill).map(c => c.difficulty).sort();
    expect(mix('String Functions')).toEqual(['Hard', 'Hard', 'Medium']);
    expect(mix('NULL Handling')).toEqual(['Hard', 'Medium']);
    for (const id of IDS) expect(challengeMatchesSkill(byId(id), byId(id).category), `#${id}`).toBe(true);
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
  it('312 — three accounts whose name does not produce their email, each tied to the original', () => {
    const rows = run(312);
    expect(rows.map(r => [r.customer_id, r.name_handle, r.original_id])).toEqual([
      [14, 'john.smith.jr', 1],
      [15, 'emma.w.', 2],
      [16, 'dan.martinez', 7],
    ]);
  });

  it('313 — 52 married women; a multi-word own name gives its first word, a missing husband is NULL', () => {
    const rows = run(313);
    expect(rows).toHaveLength(52);
    expect(rows.find(r => r.passenger_id === 103)).toEqual({ passenger_id: 103, surname: 'Maioni', own_first_name: 'Lucia', husband_first_name: 'Norman' });
    expect(rows.find(r => r.passenger_id === 16)).toEqual({ passenger_id: 16, surname: 'Hewlett', own_first_name: 'Mary', husband_first_name: null });
    expect(rows.filter(r => r.husband_first_name === null).map(r => r.passenger_id)).toEqual([16, 67]);
    expect(rows.every(r => r.own_first_name && !r.own_first_name.includes(' ') && r.husband_first_name !== '')).toBe(true);
    // The trap: without NULLIF the two missing husbands come back as '' — not NULL.
    const trap = run(313, byId(313).solution.replace(/NULLIF\((CASE[\s\S]*?END), ''\)/, '$1'));
    expect(trap.filter(r => r.husband_first_name === '')).toHaveLength(2);
  });

  it('314 — 23 shelves, 25 titles moved; the letter-A and mid-title "The" traps each change the answer', () => {
    const rows = run(314);
    expect(rows).toHaveLength(23);
    expect(rows.reduce((n, r) => n + r.films, 0)).toBe(100);
    expect(rows.reduce((n, r) => n + r.moved_by_article, 0)).toBe(25);
    expect(rows.find(r => r.shelf === 'S')).toEqual({ shelf: 'S', films: 17, moved_by_article: 3 });
    const letterA = run(314, byId(314).solution.replace("LIKE 'A %'", "LIKE 'A%'"));
    expect(letterA).not.toEqual(rows);
    const replaceAll = run(314, byId(314).solution.replace(/CASE WHEN[\s\S]*?END AS shelf_title/, "REPLACE(title, 'The ', '') AS shelf_title"));
    expect(replaceAll.reduce((n, r) => n + r.moved_by_article, 0)).toBe(27);
  });

  it('315 — five departments; COUNT(column), the NULL comparison and AVG each matter', () => {
    const rows = run(315);
    expect(rows).toEqual([
      { department: 'Engineering', headcount: 18, with_manager: 16, top_level: 2, out_earn_manager: 0, avg_gap_to_manager: 20500 },
      { department: 'Finance', headcount: 7, with_manager: 6, top_level: 1, out_earn_manager: 1, avg_gap_to_manager: 21833 },
      { department: 'HR', headcount: 8, with_manager: 7, top_level: 1, out_earn_manager: 0, avg_gap_to_manager: 23000 },
      { department: 'Marketing', headcount: 8, with_manager: 7, top_level: 1, out_earn_manager: 0, avg_gap_to_manager: 27143 },
      { department: 'Sales', headcount: 9, with_manager: 7, top_level: 2, out_earn_manager: 0, avg_gap_to_manager: 36000 },
    ]);
    const flipped = run(315, byId(315).solution.replace('CASE WHEN e.salary > m.salary THEN 1 ELSE 0 END', 'CASE WHEN e.salary <= m.salary THEN 0 ELSE 1 END'));
    expect(flipped.reduce((n, r) => n + r.out_earn_manager, 0)).toBe(1 + 7);
  });

  it('316 — four ports including a one-passenger Unknown; COALESCE alone leaves the blank as its own group', () => {
    const rows = run(316);
    expect(rows.map(r => [r.port, r.passengers, r.ages_missing])).toEqual([
      ['S', 645, 112], ['C', 168, 40], ['Q', 77, 25], ['Unknown', 1, 0],
    ]);
    expect(rows.reduce((n, r) => n + r.ages_missing, 0)).toBe(177);
    expect(rows.find(r => r.port === 'Q')).toMatchObject({ avg_age_known: 38.1, avg_age_filled: 37.5 });
    const noNullif = run(316, byId(316).solution.replace("NULLIF(embarked, '')", 'embarked'));
    expect(noNullif.map(r => r.port)).toContain('');
    expect(noNullif.map(r => r.port)).not.toContain('Unknown');
  });
});
