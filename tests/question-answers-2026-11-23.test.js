// C7 question mining, run 2 (2026-11-23): two question shapes the site
// covered in a line but never answered with a worked query. The read behind
// them is docs/reads/questions-2026-11-23.md.
//
//   1. "percentage of the total per group" → /blog/sql-group-by-tutorial/#percent-of-total
//   2. "show days with zero rows"          → /blog/recursive-cte-explained/#missing-days
//
// Guards: every query shown in a <pre data-q="…"> runs on the app's own
// dataset and returns the table the page prints under it (pinned here too, so
// a data change fails by name); every wrong-answer claim the prose makes is
// true on the data; the new FAQ entries' queries run; no frequency claims.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import Database from 'better-sqlite3';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const strip = (s) => decode(s.replace(/<[^>]+>/g, ''));
const norm = (s) => strip(s).replace(/\s+/g, ' ').trim();

const GROUPBY = 'src/blog/sql-group-by-tutorial.html';
const RECURSIVE = 'src/blog/recursive-cte-explained.html';

function loadDb() {
  const sb = { window: {} };
  vm.createContext(sb);
  vm.runInContext(read('src/data/datasets.js'), sb);
  const db = new Database(':memory:');
  for (const [name, t] of Object.entries(sb.window.publicDatasetsData.ecommerce.tables)) {
    const types = t.columns.map((_, i) => {
      const v = t.data.find(r => r[i] != null)?.[i];
      return typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT';
    });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
  return db;
}

function pageQuery(html, id) {
  const m = html.match(new RegExp(`<pre data-q="${id}">([\\s\\S]*?)</pre>`));
  if (!m) throw new Error(`no <pre data-q="${id}">`);
  return strip(m[1]);
}
function pageTable(html, id) {
  const m = html.match(new RegExp(`<table data-q-result="${id}">([\\s\\S]*?)</table>`));
  if (!m) throw new Error(`no <table data-q-result="${id}">`);
  const body = m[1].slice(m[1].indexOf('<tbody>'));
  return [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map(r => [...r[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(c => strip(c[1])));
}
// A page cell that looks like a number is compared as one ("5.0" is SQLite's 5.0).
const asValue = (s) => (/^-?\d+(\.\d+)?$/.test(s) ? Number(s) : s);
const noComments = (sql) => sql.replace(/--[^\n]*/g, '');

let db, groupby, recursive;
beforeAll(() => {
  db = loadDb();
  groupby = read(GROUPBY);
  recursive = read(RECURSIVE);
});
const run = (sql) => db.prepare(noComments(sql).trim().replace(/;\s*$/, '')).raw(true).all();

const PINNED = {
  [GROUPBY]: {
    'pct-of-total': [['completed', 37, 92.5], ['pending', 2, 5], ['cancelled', 1, 2.5]],
  },
  [RECURSIVE]: {
    'date-spine': [
      ['2024-03-05', 3], ['2024-03-06', 2], ['2024-03-07', 2], ['2024-03-08', 0], ['2024-03-09', 0],
      ['2024-03-10', 2], ['2024-03-11', 1], ['2024-03-12', 1], ['2024-03-13', 1], ['2024-03-14', 1],
    ],
  },
};

describe('every shown query returns the table printed under it', () => {
  for (const [page, queries] of Object.entries(PINNED)) {
    for (const [id, rows] of Object.entries(queries)) {
      it(`${page} ${id}`, () => {
        const html = read(page);
        const got = run(pageQuery(html, id));
        expect(got, `${id}: result moved from the pinned rows`).toEqual(rows);
        expect(pageTable(html, id).map(r => r.map(asValue)), `${id}: the page's table disagrees with the query`).toEqual(got);
      });
    }
  }
});

describe('the prose claims are true on the data', () => {
  it('group-by: integer division gives 92, 5 and 2, which add up to 99', () => {
    const r = run('SELECT status, COUNT(*) * 100 / (SELECT COUNT(*) FROM orders) AS pct FROM orders GROUP BY status ORDER BY pct DESC');
    expect(r).toEqual([['completed', 92], ['pending', 5], ['cancelled', 2]]);
    expect(r.reduce((a, x) => a + x[1], 0)).toBe(99);
    expect(norm(groupby)).toContain('the same data returns 92, 5 and 2, which add up to 99');
  });

  it('group-by: without the 100, every row returns 0', () => {
    const r = run('SELECT status, COUNT(*) / SUM(COUNT(*)) OVER () AS share FROM orders GROUP BY status');
    expect(r.every(x => x[1] === 0)).toBe(true);
    expect(norm(groupby)).toContain('without the 100 and every row returns 0');
  });

  it('group-by: the scalar-subquery form gives the same numbers as the window form', () => {
    const sub = run('SELECT status, COUNT(*) AS orders, ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM orders), 1) FROM orders GROUP BY status ORDER BY orders DESC');
    expect(sub).toEqual(PINNED[GROUPBY]['pct-of-total']);
  });

  it('group-by: the revenue and PARTITION BY variants named in the prose run', () => {
    const rev = run('SELECT category, 100.0 * SUM(total) / SUM(SUM(total)) OVER () FROM orders GROUP BY category');
    expect(rev.reduce((a, x) => a + x[1], 0)).toBeCloseTo(100, 6);
    const part = run('SELECT country, category, 100.0 * SUM(total) / SUM(SUM(total)) OVER (PARTITION BY country) FROM orders GROUP BY country, category');
    const byCountry = {};
    for (const [c, , p] of part) byCountry[c] = (byCountry[c] || 0) + p;
    for (const v of Object.values(byCountry)) expect(v).toBeCloseTo(100, 6);
  });

  it('recursive: a plain GROUP BY returns eight rows and loses March 8 and 9', () => {
    const r = run("SELECT date(login_at) AS day, COUNT(*) FROM logins WHERE login_at >= '2024-03-05' AND login_at < '2024-03-15' GROUP BY day");
    expect(r.length).toBe(8);
    expect(r.map(x => x[0])).not.toContain('2024-03-08');
    expect(r.map(x => x[0])).not.toContain('2024-03-09');
    expect(norm(recursive)).toContain('come back as eight rows: March 8 and 9 are missing');
  });

  it('recursive: COUNT(*) after the LEFT JOIN reports 1 for the empty days', () => {
    const shown = pageQuery(recursive, 'date-spine');
    expect(shown).toContain('COUNT(l.login_id)');
    const wrong = run(shown.replace('COUNT(l.login_id)', 'COUNT(*)'));
    expect(wrong.filter(x => x[0] === '2024-03-08' || x[0] === '2024-03-09')).toEqual([['2024-03-08', 1], ['2024-03-09', 1]]);
    expect(norm(recursive)).toContain('March 8 and 9 would report 1 login each instead of 0');
  });
});

function faqSchema(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const faq = blocks.find(b => b['@type'] === 'FAQPage');
  return faq.mainEntity.map(e => [e.name, e.acceptedAnswer.text]);
}

describe('the new FAQ entries are on the page and their SQL runs', () => {
  it('group-by: the question is the visible heading and the answer\'s expression runs', () => {
    const q = 'How do I calculate a percentage of the total in SQL?';
    const faq = faqSchema(groupby).find(([n]) => n === q);
    expect(faq).toBeTruthy();
    expect(groupby).toContain(`<h2 id="percent-of-total">${q}</h2>`);
    const expr = 'ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1)';
    expect(faq[1]).toContain(expr);
    expect(run(`SELECT status, COUNT(*) AS orders, ${expr} FROM orders GROUP BY status ORDER BY orders DESC`))
      .toEqual(PINNED[GROUPBY]['pct-of-total']);
  });

  it('recursive: the question is the visible heading and the answer names the COUNT trap', () => {
    const q = 'How do I show days with zero rows in a SQL report?';
    const faq = faqSchema(recursive).find(([n]) => n === q);
    expect(faq).toBeTruthy();
    expect(recursive).toContain(`<h3 id="missing-days">${q}</h3>`);
    expect(faq[1]).toContain('COUNT(l.login_id)');
    expect(faq[1]).toContain("date(day, '+1 day')");
  });
});

describe('no frequency claims in the new copy', () => {
  it('neither changed section says how often something is asked', () => {
    const sections = [
      groupby.slice(groupby.indexOf('<h2 id="percent-of-total">'), groupby.indexOf('<h2 id="rollup">')),
      recursive.slice(recursive.indexOf('<h3 id="missing-days">'), recursive.indexOf('<h2 id="infinite">')),
    ];
    for (const s of sections) {
      expect(s.length).toBeGreaterThan(500);
      expect(norm(s)).not.toMatch(/#1 asked|every interview|most[- ]asked|asked (often|a lot)|again and again|\d+% of/i);
    }
  });
});
