// /sql-rollup-interview-questions/ (2026-11-22; GSC: "rollup interview
// questions", 657 impressions, 0 clicks, position 8.9 on a page that does not
// answer it). What must never drift:
//
//   - every SQLite query returns, on the bank's own dataset, exactly the rows
//     the page shows, and every number the prose states has a query behind it;
//   - each standard query uses the clause its question is about, and the
//     SQLite form beside it does not (it is the form that runs in the app);
//   - no query on the page is a bank challenge's reference solution or a mock
//     interview's answer;
//   - no claim about how often anything is asked, and no company names;
//   - the FAQ JSON-LD equals the visible FAQ;
//   - one primary CTA into the app, tracked, on a challenge free accounts can play;
//   - the committed src page is what the generator writes, and the page is in
//     the build, the sitemap, and linked from /sql-exercises/, the aggregation
//     and CTE topic pages, and the question pages it cites (in the same commit
//     as the page: CLAUDE.md, "Search-engine indexing").
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import {
  ROLLUP_SLUG, ROLLUP_TITLE, ROLLUP_QUESTIONS, ROLLUP_FACTS, ROLLUP_PRACTICE, ROLLUP_FAQ,
  ROLLUP_CTA_CHALLENGE, ROLLUP_APP_SRC,
} from '../src/data/sql-rollup.js';
import { renderRollupPage, fmt } from '../scripts/build-rollup-page.mjs';
import { loadQuestionBank, questionSlugs } from '../scripts/question-slugs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const textOf = html => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const squash = s => String(s).replace(/;\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();

let datasets; let mocks; let bank; let slugs; let html; let text;
const dbs = {};
// The app's loadDataset typing: a column's type comes from the first row's value.
function dbFor(key) {
  if (dbs[key]) return dbs[key];
  const db = new Database(':memory:');
  for (const [name, t] of Object.entries(datasets[key].tables)) {
    const types = t.columns.map((_, i) => { const v = t.data[0]?.[i]; return typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT'; });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r.map(v => (v === undefined ? null : v)))))(t.data);
  }
  return (dbs[key] = db);
}
const run = (dataset, sql) => {
  const st = dbFor(dataset).prepare(sql.replace(/;\s*$/, ''));
  return { columns: st.columns().map(c => c.name), rows: st.raw(true).all() };
};

beforeAll(() => {
  const sb = { window: {}, console: { log() {} } };
  vm.createContext(sb);
  vm.runInContext(read('src/data/datasets.js'), sb);
  vm.runInContext(read('src/data/mock-interviews.js'), sb);
  datasets = sb.window.publicDatasetsData;
  mocks = sb.window.mockInterviewsData;
  ({ bank } = loadQuestionBank());
  slugs = questionSlugs(bank);
  html = renderRollupPage({ bank, slugs });
  text = textOf(html);
});

describe('every query returns what the page says, on the dataset', () => {
  for (const q of ROLLUP_QUESTIONS) {
    it(`${q.id}: the SQLite form returns the pinned rows and columns`, () => {
      const got = run(q.dataset, q.sqlite);
      expect(got.columns, q.id).toEqual(q.columns);
      expect(got.rows, q.id).toEqual(q.rows);
    });
  }

  it('every number in the prose has a query that returns it, and the page says it', () => {
    for (const f of ROLLUP_FACTS) {
      expect(run(f.dataset, f.sql).rows[0][0], f.text).toBe(f.expect);
      expect(text, f.text).toContain(f.text);
    }
  });

  it('the page shows every value of every result table', () => {
    for (const q of ROLLUP_QUESTIONS) {
      for (const c of q.columns) expect(html, `${q.id} column ${c}`).toContain(`<th>${c}</th>`);
      for (const v of q.rows.flat()) expect(html, `${q.id}: ${v}`).toContain(`<td>${fmt(v)}</td>`);
    }
  });

  it('the tree rollup and the department rollup both add up to the whole company', () => {
    const tree = ROLLUP_QUESTIONS.find(q => q.id === 'tree');
    const all = run('employees', 'SELECT COUNT(*), SUM(salary) FROM employees').rows[0];
    expect([tree.rows.reduce((a, r) => a + r[1], 0), tree.rows.reduce((a, r) => a + r[2], 0)]).toEqual(all);
    const sets = ROLLUP_QUESTIONS.find(q => q.id === 'grouping-sets');
    expect(sets.rows.find(r => r[0] === 'total').slice(2)).toEqual(all);
  });
});

describe('each question is worked both ways', () => {
  const CLAUSE = { ROLLUP: /GROUP BY ROLLUP \(/, CUBE: /GROUP BY CUBE \(/, 'GROUPING SETS': /GROUP BY GROUPING SETS \(/ };
  it('the standard query uses its clause and GROUPING(); the SQLite form uses neither', () => {
    for (const q of ROLLUP_QUESTIONS) {
      expect(q.sqlite, `${q.id} SQLite form`).not.toMatch(/\b(ROLLUP|CUBE|GROUPING)\b/i);
      if (q.clause === 'RECURSIVE') { expect(q.standard).toBeNull(); expect(q.sqlite).toMatch(/^WITH RECURSIVE\b/); continue; }
      expect(q.standard, q.id).toMatch(CLAUSE[q.clause]);
      expect(q.standard, q.id).toMatch(/GROUPING\(/);
      expect(q.sqlite, q.id).toMatch(/UNION ALL/);
    }
    expect(ROLLUP_QUESTIONS.map(q => q.clause)).toEqual(['ROLLUP', 'ROLLUP', 'CUBE', 'GROUPING SETS', 'RECURSIVE']);
    expect(ROLLUP_QUESTIONS.length).toBeGreaterThanOrEqual(4);
    expect(ROLLUP_QUESTIONS.length).toBeLessThanOrEqual(6);
  });

  it('the page names the four engines with ROLLUP and says SQLite has none', () => {
    for (const db of ['PostgreSQL', 'SQL Server', 'Oracle', 'Snowflake']) expect(text).toContain(db);
    expect(text).toContain('SQLite has none of the three');
    expect(text).toContain('WITH ROLLUP');
  });
});

describe('the page gives away no answer the product sells', () => {
  it('no query is a bank reference solution or a mock interview answer', () => {
    const theirs = new Set([
      ...bank.map(c => c.solution),
      ...mocks.flatMap(m => m.questions.flatMap(q => [q.solution, q.verify?.sql, ...(q.codeSnippets || []).map(s => s.sql)])),
    ].filter(Boolean).map(squash));
    for (const q of ROLLUP_QUESTIONS) {
      for (const sql of [q.sqlite, q.standard].filter(Boolean)) expect(theirs.has(squash(sql)), q.id).toBe(false);
    }
    // and no reference solution appears anywhere in the page's text
    const flat = squash(text);
    const leaked = bank.filter(c => c.solution && squash(c.solution).length > 40 && flat.includes(squash(c.solution)));
    expect(leaked.map(c => c.id)).toEqual([]);
  });

  it('makes no claim about how often anything is asked, and names no company', () => {
    expect(text).not.toMatch(/\b(?:often|frequently|commonly|most[- ]asked|popular|every interview|always asked|top \d+)\b/i);
    expect(text).not.toMatch(/\b(?:Google|Meta|Amazon|Apple|Netflix|Microsoft|Capital One|Revolut|Stripe|Wise|JPMorgan|Uber|Airbnb|FAANG)\b/);
  });
});

describe('the head, the FAQ and the CTA', () => {
  it('the title names "Rollup Interview Questions"', () => {
    expect(ROLLUP_TITLE).toContain('Rollup Interview Questions');
    expect(html).toContain(`<title>${ROLLUP_TITLE}</title>`);
    expect(html).toContain(`<link rel="canonical" href="https://sqlquest.app/${ROLLUP_SLUG}/">`);
  });

  it('FAQ JSON-LD equals the visible FAQ, verbatim', () => {
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const faq = ld.find(o => o['@type'] === 'FAQPage');
    const section = html.slice(html.indexOf('<section class="faq">'), html.indexOf('</section>', html.indexOf('<section class="faq">')));
    const visible = [...section.matchAll(/<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>/g)].map(m => [decode(m[1]), decode(m[2])]);
    expect(visible).toEqual(ROLLUP_FAQ);
    expect(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text])).toEqual(visible);
  });

  it('one primary CTA, tracked, into a challenge a free account can play', () => {
    const bp = [...html.matchAll(/<a class="btn bp" href="([^"]+)" data-track="([^"]+)">/g)];
    expect(bp).toHaveLength(1);
    expect(decode(bp[0][1])).toBe(`/app/?challenge=${ROLLUP_CTA_CHALLENGE}&src=${ROLLUP_APP_SRC}`);
    expect(bp[0][2]).toBe('cta_rollup_practice');
    const c = bank.find(x => x.id === ROLLUP_CTA_CHALLENGE);
    expect(c && c.difficulty).not.toBe('Hard');
    // the accent is on that button only
    expect((html.match(/FFE34D/g) || []).length).toBe(1);
  });

  it('links every practice question to its /questions/ page, recursive-team-size-rollup included', () => {
    for (const id of ROLLUP_PRACTICE) {
      const slug = slugs.get(id);
      expect(slug, `challenge ${id}`).toBeTruthy();
      expect(html).toContain(`href="/questions/${slug}/"`);
    }
    expect(html).toContain('href="/questions/recursive-team-size-rollup/"');
  });
});

describe('wiring', () => {
  it('the committed src page is what the generator writes', () => {
    expect(read(`src/${ROLLUP_SLUG}.html`)).toBe(html);
  });

  it('runs in the build before build-static-pages, and the built page is in the sitemap', () => {
    const build = JSON.parse(read('package.json')).scripts.build;
    expect(build).toContain('node scripts/build-rollup-page.mjs');
    expect(build.indexOf('build-rollup-page')).toBeLessThan(build.indexOf('build-static-pages'));
    const xml = read('public/sitemap.xml');
    const block = xml.slice(xml.indexOf('<!-- rollup:start -->'), xml.indexOf('<!-- rollup:end -->'));
    expect(block).toContain(`<loc>https://sqlquest.app/${ROLLUP_SLUG}/</loc>`);
    expect((xml.match(new RegExp(`<loc>https://sqlquest.app/${ROLLUP_SLUG}/</loc>`, 'g')) || [])).toHaveLength(1);
    expect(exists(`public/${ROLLUP_SLUG}/index.html`)).toBe(true);
    expect(read(`public/${ROLLUP_SLUG}/index.html`)).toContain('/track.js');
  });

  it('is linked from /sql-exercises/ (outside its generated blocks), the aggregation and CTE topic pages', () => {
    const href = `href="/${ROLLUP_SLUG}/"`;
    const ex = read('src/sql-exercises.html');
    const outside = ex.replace(/<!-- (solutions|topic-traps):start -->[\s\S]*?<!-- \1:end -->/g, '');
    expect(outside).toContain(href);
    for (const f of ['src/challenges/aggregation.html', 'src/challenges/cte.html']) expect(read(f), f).toContain(href);
    for (const f of ['public/sql-exercises/index.html', 'public/challenges/aggregation/index.html', 'public/challenges/cte/index.html']) {
      expect(read(f), f).toContain(href);
    }
  });

  it('every cited question page links back, and recursive-team-size-rollup does so above the problem', () => {
    const href = `href="/${ROLLUP_SLUG}/"`;
    for (const id of ROLLUP_PRACTICE) expect(read(`public/questions/${slugs.get(id)}/index.html`), `question ${id}`).toContain(href);
    const q44 = read('public/questions/recursive-team-size-rollup/index.html');
    const note = q44.indexOf('data-question-note="true"');
    expect(note).toBeGreaterThan(q44.indexOf('<h1'));
    expect(note).toBeLessThan(q44.indexOf('<div class="prob">'));
    expect(q44.slice(note, q44.indexOf('</p>', note))).toContain(href);
    // a question the page does not cite carries no link to it
    const other = bank.find(c => !ROLLUP_PRACTICE.includes(c.id));
    expect(read(`public/questions/${slugs.get(other.id)}/index.html`)).not.toContain(href);
  });
});
