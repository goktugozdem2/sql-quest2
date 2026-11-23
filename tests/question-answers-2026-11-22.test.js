// C7 question mining, run 1 (2026-11-22): answers added to existing pages for
// question shapes that the site covered but never answered directly. The read
// behind them is docs/reads/questions-2026-11-22.md.
//
// Three guards per page:
//   1. every query shown in a <pre data-q="…"> runs on the app's own dataset and
//      returns exactly the table the page prints under it (data-q-result), and
//      the result is pinned here too, so a data change fails by name;
//   2. the claims the prose makes about wrong answers are true on the data
//      (ROW_NUMBER = 6 repeats 98,000; no DISTINCT loses customer 2's streak);
//   3. the FAQPage JSON-LD equals the visible FAQ, question and answer.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import Database from 'better-sqlite3';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const strip = (s) => decode(s.replace(/<[^>]+>/g, ''));
const norm = (s) => strip(s).replace(/\s+/g, ' ').trim();

const RANKING = 'src/blog/row-number-vs-rank-vs-dense-rank.html';
const WINDOWS = 'src/blog/window-functions-tutorial.html';
const DUPES = 'src/sql-find-duplicates.html';

function loadDb() {
  const sb = { window: {} };
  vm.createContext(sb);
  vm.runInContext(read('src/data/datasets.js'), sb);
  const db = new Database(':memory:');
  for (const key of ['employees', 'ecommerce']) {
    for (const [name, t] of Object.entries(sb.window.publicDatasetsData[key].tables)) {
      // The app types a column from its values; first non-null value decides here.
      const types = t.columns.map((_, i) => {
        const v = t.data.find(r => r[i] != null)?.[i];
        return typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT';
      });
      db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
      const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
      db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
    }
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
  return [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map(r => [...r[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(c => strip(c[1])));
}
const cell = (v) => (v === null ? 'NULL' : String(v));

let db, ranking, windows, dupes;
beforeAll(() => {
  db = loadDb();
  ranking = read(RANKING);
  windows = read(WINDOWS);
  dupes = read(DUPES);
});
const run = (sql) => db.prepare(sql.trim().replace(/;\s*$/, '')).raw(true).all();

// The pinned results: what each shown query must return on the bundled data.
const PINNED = {
  [RANKING]: {
    'nth-rownumber': [['Teresa Murphy', 98000]],
    'nth-denserank': [['Alice Johnson', 95000], ['Paul Thompson', 95000]],
    'nth-offset': [[95000]],
  },
  [WINDOWS]: {
    'latest-per-customer': [
      [1, '2024-02-15', 'Webcam 4K'], [2, '2024-02-18', 'Floor Lamp'], [3, '2024-02-19', 'Bluetooth Speaker'],
      [4, '2024-02-16', 'Desk Mat'], [5, '2024-02-17', 'Router Pro'], [6, '2024-02-24', 'Bookends'],
      [7, '2024-02-20', 'Office Desk'], [8, '2024-02-21', 'Tablet Case'], [9, '2024-02-22', 'Throw Pillow'],
      [10, '2024-02-23', 'Smart Watch'],
    ],
    'month-over-month': [['2024-01', 4471.81, null, null], ['2024-02', 3684.63, -787.18, -17.6]],
    'login-streaks': [
      [4, '2024-03-10', '2024-03-14', 5], [8, '2024-03-28', '2024-04-01', 5], [1, '2024-03-01', '2024-03-04', 4],
      [2, '2024-03-05', '2024-03-07', 3], [4, '2024-03-01', '2024-03-03', 3],
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
        expect(pageTable(html, id), `${id}: the page's table disagrees with the query`).toEqual(got.map(r => r.map(cell)));
      });
    }
  }
});

describe('the prose claims are true on the data', () => {
  it('ranking: 32 distinct salaries, so OFFSET 40 in the scalar subquery gives one NULL row', () => {
    expect(run('SELECT COUNT(DISTINCT salary) FROM employees')).toEqual([[32]]);
    expect(ranking).toContain('with 32 distinct salaries in the table, an OFFSET of 40 returns one row holding NULL');
    const q = pageQuery(ranking, 'nth-offset').replace('OFFSET 5', 'OFFSET 40');
    expect(run(q)).toEqual([[null]]);
  });

  it('windows: SQLite bare-column MAX returns the same rows as the ROW_NUMBER version', () => {
    const bare = run('SELECT customer_id, MAX(order_date) AS order_date, product FROM orders GROUP BY customer_id ORDER BY customer_id');
    expect(bare).toEqual(PINNED[WINDOWS]['latest-per-customer']);
    expect(run('SELECT COUNT(DISTINCT customer_id) FROM orders')).toEqual([[10]]);
  });

  it('windows: without DISTINCT, customer 2 (two logins on March 6) loses the streak', () => {
    const shown = pageQuery(windows, 'login-streaks');
    expect(shown).toContain('SELECT DISTINCT customer_id');
    const noDistinct = run(shown.replace('SELECT DISTINCT customer_id', 'SELECT customer_id'));
    expect(noDistinct.some(r => r[0] === 2)).toBe(false);
    expect(run(shown).some(r => r[0] === 2)).toBe(true);
    expect(run("SELECT COUNT(*) FROM logins WHERE customer_id = 2 AND date(login_at) = '2024-03-06'")).toEqual([[2]]);
  });

  it('windows: customer 8 streak crosses the month boundary', () => {
    const r = PINNED[WINDOWS]['login-streaks'].find(x => x[0] === 8);
    expect(r[1].slice(0, 7)).not.toBe(r[2].slice(0, 7));
  });

  it('ranking FAQ: both queries in the answer run and give 95,000', () => {
    const faq = faqSchema(ranking).find(([q]) => q === 'How do I find the Nth-highest salary when salaries tie?');
    expect(faq).toBeTruthy();
    const dense = 'SELECT name, salary FROM (SELECT name, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dr FROM employees) WHERE dr = 6';
    const offset = 'SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 5';
    expect(faq[1]).toContain(dense);
    expect(faq[1]).toContain(offset);
    expect(run(dense)).toEqual(PINNED[RANKING]['nth-denserank']);
    expect(run(offset)).toEqual([[95000]]);
  });

  it('duplicates FAQ: the rowid DELETE removes 3 rows and leaves 13 unique emails', () => {
    const del = 'DELETE FROM customers WHERE rowid NOT IN (SELECT MIN(rowid) FROM customers GROUP BY email)';
    const faq = faqSchema(dupes).find(([q]) => q === 'What if the table has no id column to keep?');
    expect(faq).toBeTruthy();
    expect(faq[1]).toContain(del);
    expect(faq[1]).toContain('it removes 3 rows and leaves 13');
    const scratch = loadDb();
    expect(scratch.prepare(del).run().changes).toBe(3);
    expect(scratch.prepare('SELECT COUNT(*), COUNT(DISTINCT email) FROM customers').raw(true).get()).toEqual([13, 13]);
    // MAX(rowid) keeps the last copy: same count, different survivors.
    const other = loadDb();
    expect(other.prepare(del.replace('MIN(rowid)', 'MAX(rowid)')).run().changes).toBe(3);
  });
});

function faqSchema(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const faq = blocks.find(b => b['@type'] === 'FAQPage');
  return faq.mainEntity.map(e => [e.name, e.acceptedAnswer.text]);
}
function blogVisibleFaq(html) {
  const a = html.indexOf('<h2 id="faq">');
  const b = html.indexOf('<div class="related">', a);
  const sec = html.slice(a, b);
  return [...sec.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map(m => [norm(m[1]), norm(m[2])]);
}
function dupesVisibleFaq(html) {
  const i = html.indexOf('const FAQS=');
  const j = html.indexOf('\n];', i);
  return vm.runInNewContext(html.slice(i + 'const FAQS='.length, j + 3));
}

describe('the FAQPage JSON-LD equals the visible FAQ', () => {
  it('ranking blog', () => {
    expect(blogVisibleFaq(ranking)).toEqual(faqSchema(ranking).map(([q, t]) => [q, norm(t)]));
  });
  it('window-functions tutorial', () => {
    expect(blogVisibleFaq(windows)).toEqual(faqSchema(windows).map(([q, t]) => [q, norm(t)]));
  });
  it('sql-find-duplicates', () => {
    expect(dupesVisibleFaq(dupes)).toEqual(faqSchema(dupes));
  });
});

describe('no frequency claims in the new copy', () => {
  it('none of the changed pages says how often something is asked', () => {
    for (const html of [ranking, windows]) {
      const text = norm(html);
      expect(text).not.toMatch(/#1 asked|nearly every interview|roughly 30% of|most[- ]asked|again and again/i);
    }
  });
});
