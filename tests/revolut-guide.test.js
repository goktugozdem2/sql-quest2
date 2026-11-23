// The Revolut data analyst guide (C5, 2026-11-22):
// /blog/revolut-data-analyst-sql-screen/.
//
// What this pins:
//  1. Every query the post shows runs on finans_neobank and returns the
//     table printed under it. If the ledger is regenerated, this fails.
//  2. The post never solves the mock's written tasks or a Revolut-set
//     challenge. The mock is Pro and the set's solutions are never
//     published (the question pages' rule).
//  3. Every quoted format line exists verbatim in the dated read recorded
//     in src/data/interview-archetypes.js. No unsourced format line.
//  4. The free tier comes from freeTierSentence(), and no bank count appears.
//  5. The visible FAQ matches the FAQPage JSON-LD, and the post is linked:
//     sitemap, blog index, interview hub, the Revolut page, build list.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { freeTierSentence, COMPANY_SET_FREE_COUNT } from '../src/utils/display-count.js';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel) => readFileSync(here(rel), 'utf8');
const SLUG = 'revolut-data-analyst-sql-screen';
const PAGE = `../src/blog/${SLUG}.html`;

const decode = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const norm = (sql) => sql.replace(/\s+/g, ' ').replace(/;\s*$/, '').trim().toLowerCase();

function loadWindow(files) {
  const sb = { window: { challengesData: [] }, console: { log() {} } };
  vm.createContext(sb);
  for (const f of files) vm.runInContext(read(f), sb);
  return sb.window;
}

let html, db, win;
beforeAll(() => {
  html = read(PAGE);
  win = loadWindow([
    '../src/data/neobank-data.js',
    '../src/data/challenges.js',
    '../src/data/sector-challenges.js',
    '../src/data/mock-interviews.js',
  ]);
  const ds = win.publicDatasetsData.finans_neobank;
  db = new Database(':memory:');
  for (const [name, t] of Object.entries(ds.tables)) {
    db.exec(`CREATE TABLE ${name} (${t.columns.join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
});

// Each shown query with the cells of the result table that follows it.
function shownQueries() {
  const out = [];
  const re = /<div class="code-block"><div class="code-label">([^<]*)<\/div><pre><code>([\s\S]*?)<\/code><\/pre><\/div>([\s\S]*?)(?=<div class="code-block"|<h2 )/g;
  let m;
  while ((m = re.exec(html))) {
    const table = m[3].match(/<table>[\s\S]*?<\/table>/);
    const cells = table
      ? [...table[0].matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].flatMap(b => [...b[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
        .map(r => [...r[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(c => decode(c[1]).trim())))
      : null;
    const strong = m[3].match(/returns <strong>([\d,.]+)<\/strong>/);
    out.push({ label: m[1], sql: decode(m[2]), cells, single: strong ? strong[1].replace(/,/g, '') : null });
  }
  return out;
}

describe('every query on the page runs and returns what the page prints', () => {
  it('finds the four shown queries', () => {
    expect(shownQueries().length).toBe(4);
  });

  it.each([0, 1, 2, 3])('query %i matches its printed result', (i) => {
    const q = shownQueries()[i];
    const rows = db.prepare(q.sql).all().map(r => Object.values(r).map(v => String(v)));
    if (q.cells) {
      expect(rows, q.label).toEqual(q.cells);
    } else {
      expect(q.single, `${q.label} needs a printed result`).toBeTruthy();
      expect(rows, q.label).toEqual([[q.single]]);
    }
  });

  it('the wrong p2p query is about double the right one (the claim in the prose)', () => {
    const [wrong, right] = shownQueries();
    const w = Number(db.prepare(wrong.sql).get().p2p_volume_gbp);
    const r = Number(db.prepare(right.sql).get().p2p_volume_gbp);
    expect(w / r).toBeGreaterThan(1.9);
    expect(w / r).toBeLessThan(2.1);
  });

  it('COALESCE flips the top plan, as the prose says (plus without, premium with)', () => {
    const q = shownQueries()[2];
    const rows = db.prepare(q.sql).all();
    const byRaw = [...rows].sort((a, b) => b.avg_spenders_only - a.avg_spenders_only)[0].plan;
    expect(byRaw).toBe('plus');
    expect(rows[0].plan).toBe('premium');
  });
});

describe('it never solves the Pro mock or a Revolut-set challenge', () => {
  it('no shown query is a mock solution, a mock verify query or a set solution', () => {
    const mock = win.mockInterviewsData.find(m => m.id === 'revolut-analytics-screen');
    expect(mock).toBeTruthy();
    const banned = new Set();
    for (const q of mock.questions) {
      for (const s of [q.solution, q.verify?.sql, q.sql]) if (s) banned.add(norm(s));
    }
    for (const c of win.challengesData.filter(c => c.dataset === 'finans_neobank')) banned.add(norm(c.solution));
    expect(banned.size).toBeGreaterThan(12);
    for (const q of shownQueries()) expect(banned.has(norm(q.sql)), q.label).toBe(false);
  });

  it('shows no COUNT(DISTINCT user_id) monthly-active query and no NTILE decile', () => {
    for (const q of shownQueries()) {
      expect(q.sql, q.label).not.toMatch(/count\s*\(\s*distinct\s+user_id/i);
      expect(q.sql, q.label).not.toMatch(/ntile/i);
    }
  });
});

describe('every quoted format line is in the dated read', () => {
  it('each double-quoted phrase in the format table and FAQ appears verbatim in the recorded source', () => {
    const source = read('../src/data/interview-archetypes.js').replace(/\s*\n\s*\/\/\s*/g, ' ');
    const fmt = html.slice(html.indexOf('<h2 id="format">'), html.indexOf('<h2 id="schema">'));
    const faq = html.slice(html.indexOf('<h2 id="faq">'), html.indexOf('<h2 id="sources">'));
    const quotes = [...decode(fmt + faq).matchAll(/"([^"]{12,})"/g)].map(m => m[1]);
    expect(quotes.length).toBeGreaterThan(6);
    for (const q of quotes) expect(source.includes(q), q).toBe(true);
  });

  it('names its source, the read date, and that nothing comes from Revolut', () => {
    expect(html).toContain('Revolut Data Analyst Interview Guide 2026');
    expect(html).toContain('12 September 2026');
    expect(html).toMatch(/Nothing comes from Revolut|Nothing on this page comes from Revolut/);
  });
});

describe('counts and the free tier come from the helpers', () => {
  it('states the free tier with freeTierSentence() and the set gate with its constant', () => {
    const text = decode(html);
    expect(text).toContain(freeTierSentence().replace(/\.$/, ''));
    expect(text).toContain(`the first ${COMPANY_SET_FREE_COUNT} are free to try`);
  });

  it('states no bank size and no price', () => {
    const text = decode(html);
    expect(text).not.toMatch(/\b\d{3}\+/);
    expect(text).not.toMatch(/\$\d/);
  });
});

describe('the FAQ schema matches the visible FAQ', () => {
  it('same questions and answers, in order', () => {
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const fq = ld.find(x => x['@type'] === 'FAQPage');
    const visible = [...html.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map(m => [decode(m[1]), decode(m[2])]);
    expect(fq.mainEntity.map(e => [e.name, e.acceptedAnswer.text])).toEqual(visible);
  });
});

describe('the post is linked and listed', () => {
  const href = `/blog/${SLUG}/`;
  it('sitemap, blog index, hub, Revolut page and the build list carry it', () => {
    expect(read('../public/sitemap.xml')).toContain(`https://sqlquest.app${href}`);
    expect(read('../src/blog/index.html')).toContain(`href="${href}"`);
    expect(read('../src/sql-interview-prep.html')).toContain(`href="${href}"`);
    expect(read('../src/revolut-sql-interview.html')).toContain(`href="${href}"`);
    expect(read('../scripts/build-static-pages.js')).toContain(`'${SLUG}'`);
  });

  it('links question 1, the readiness test and the mock, and the slugs exist', () => {
    expect(html).toContain('/app/?company=Revolut&amp;goal=interview&amp;src=blog-revolut');
    expect(html).toContain('/sql-interview-readiness-test/?company=revolut');
    expect(html).toContain('/app/?interview=revolut-analytics-screen&amp;src=revolut-blog');
    expect(html).toContain('/questions/monthly-spend-per-account/');
    expect(win.challengesData.concat(loadWindow(['../src/data/sector-challenges.js']).challengesData || [])
      .some(c => c.title === 'Monthly Spend Per Account')).toBe(true);
  });
});
