// C7 question mining, run 3 (2026-11-24): two question shapes the site
// covered in a line but never answered with a worked query. The read behind
// them is docs/reads/questions-2026-11-24.md.
//
//   1. "my GROUP BY runs in SQLite and fails in PostgreSQL"
//        → /sql-debugging-practice/#group-by-sqlite-postgresql + FAQ
//   2. "the SUM doubled after a JOIN; can't I just add DISTINCT?"
//        → /sql-join-fan-out/ (a fourth "Why" line; its numbers are facts in
//          src/data/sql-patterns.js, so tests/sql-patterns.test.js runs them too)
//
// Guards: every query in the new hub section runs on the app's ecommerce
// dataset and returns the rows the page prints; every number the prose states
// is computed; the wrong query really is the lenient one (SQLite returns one
// row per category, not per product); the section is rendered and the FAQ
// answer is in both the visible FAQ and the schema; no frequency claims.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { GROUP_BY_DIALECT, renderHub, pageModel } from '../scripts/build-debug-pages.mjs';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

function loadDb(name) {
  const sb = { window: {} };
  vm.createContext(sb);
  vm.runInContext(read('src/data/datasets.js'), sb);
  const db = new Database(':memory:');
  for (const [table, t] of Object.entries(sb.window.publicDatasetsData[name].tables)) {
    const types = t.columns.map((_, i) => {
      const v = t.data.find(r => r[i] != null)?.[i];
      return typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.exec(`CREATE TABLE ${table} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${table} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
  return db;
}

let db, page;
beforeAll(() => {
  db = loadDb(GROUP_BY_DIALECT.dataset);
  page = text(renderHub(pageModel()));
});
const run = (sql) => db.prepare(sql.replace(/;\s*$/, '')).raw(true).all();
const g = GROUP_BY_DIALECT;

describe('/sql-debugging-practice/: GROUP BY in SQLite vs PostgreSQL', () => {
  it('the lenient query runs in SQLite and returns one row per category, not per product', () => {
    const got = run(g.wrong.sql);
    expect(got).toHaveLength(g.wrong.rowCount);
    expect(new Set(got.map(r => r[0])).size).toBe(got.length);
    // its revenue is the whole category's, whatever product name sits next to it
    expect(got.map(r => r[2]).sort()).toEqual(g.fixes[1].rows.map(r => r[2]).sort());
  });
  it('every fix returns the table printed under it', () => {
    for (const f of g.fixes) expect(run(f.sql), f.label).toEqual(f.rows);
  });
  it('every fact the prose states is what the data returns, and is on the page', () => {
    for (const f of g.facts) {
      expect(run(f.sql)[0][0], f.text).toBe(f.expect);
      expect(page, f.text).toContain(f.text);
    }
  });
  it('the section is rendered, with its heading, both fixes and the rule', () => {
    expect(page).toContain(g.heading);
    for (const f of g.fixes) expect(page).toContain(f.label);
    expect(page).toContain('Every column in the SELECT list is either in the GROUP BY or inside an aggregate.');
  });
  it('the FAQ answers it, visibly and in the schema', () => {
    const q = 'Why does my GROUP BY query run in SQLite but fail in PostgreSQL?';
    const html = renderHub(pageModel());
    expect(html).toContain(`<h3>${q}</h3>`);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const faq = ld.find(o => o['@type'] === 'FAQPage');
    expect(faq.mainEntity.map(e => e.name)).toContain(q);
  });
  it('makes no frequency claim', () => {
    for (const re of [/most[- ]asked/i, /most common(ly)? (asked|interview)/i, /\basked (in|at) \d+%/i]) {
      expect(page).not.toMatch(re);
    }
  });
});

describe('/sql-join-fan-out/: why DISTINCT does not repair a fan-out', () => {
  const p = SQL_PATTERNS.find(x => x.slug === 'sql-join-fan-out');
  it('the page says it, and each number in it is a checked fact', () => {
    const line = p.why.find(w => w.startsWith('Adding DISTINCT does not repair it.'));
    expect(line).toBeTruthy();
    for (const t of ['78,600.19 instead of 78,986.43', '262 transactions carry only 259 distinct amounts', 'return the right 10']) {
      expect(line, t).toContain(t);
      expect(p.facts.some(f => f.text.includes(t) || t.includes(f.text)), t).toBe(true);
    }
  });
});
