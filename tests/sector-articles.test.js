// The three sector posts (2026-11-23, the founder's ask; keyword read in
// docs/reads/sector-articles-keywords-2026-11-23.md):
//   /blog/banking-sql-interview-questions/
//   /blog/payments-sql-interview-questions/
//   /blog/ecommerce-sql-interview-questions/
//
// What this pins:
//  1. Every query a post shows runs on the dataset named on its code block
//     and returns the table (or the single value) printed under it.
//  2. No post shows the reference solution of any bank challenge, nor a
//     question, solution or verify query of the Capital One or Revolut mocks
//     (both are Pro; the question pages' rule).
//  3. Counts come from the helpers: the free tier is freeTierSentence(), the
//     set gate is COMPANY_SET_FREE_COUNT, and no bank size or price appears.
//  4. The visible FAQ equals the FAQPage JSON-LD, in order.
//  5. Every practice link names a challenge that exists, with its real
//     difficulty, Hard marked Pro, and the niche-343 placeholder present.
//  6. Title, description, canonical and OG are set, and each post is linked:
//     sitemap, blog index, build list, interview hub, its company pages (via
//     the crosslink strip's SECTOR_GUIDES) and, for the two finance posts, the
//     fraud pages.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { freeTierSentence, COMPANY_SET_FREE_COUNT } from '../src/utils/display-count.js';
import { SECTOR_GUIDES } from '../scripts/build-company-crosslinks.mjs';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel) => readFileSync(here(rel), 'utf8');

const POSTS = {
  'banking-sql-interview-questions': {
    datasets: ['finans_banking', 'finans_fraud'], queries: 5,
    companies: ['capital-one', 'jpmorgan', 'goldman-sachs', 'morgan-stanley'],
    fraudLinked: true,
  },
  'payments-sql-interview-questions': {
    datasets: ['finans_neobank'], queries: 4,
    companies: ['stripe', 'paypal', 'revolut', 'wise', 'monzo', 'chime'],
    fraudLinked: true,
  },
  'ecommerce-sql-interview-questions': {
    datasets: ['ecommerce'], queries: 3,
    companies: ['amazon', 'walmart', 'shopify'],
    fraudLinked: false,
  },
};
const SLUGS = Object.keys(POSTS);

const decode = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const norm = (sql) => sql.replace(/\s+/g, ' ').replace(/;\s*$/, '').trim().toLowerCase();

let win;
const dbs = {};
function db(name) {
  if (dbs[name]) return dbs[name];
  const ds = win.publicDatasetsData[name];
  if (!ds) throw new Error(`no dataset ${name}`);
  const d = new Database(':memory:');
  for (const [t, def] of Object.entries(ds.tables)) {
    d.exec(`CREATE TABLE ${t} (${def.columns.join(', ')})`);
    const ins = d.prepare(`INSERT INTO ${t} VALUES (${def.columns.map(() => '?').join(',')})`);
    d.transaction(rows => rows.forEach(r => ins.run(r)))(def.data);
  }
  return (dbs[name] = d);
}

beforeAll(() => {
  const sb = { window: { challengesData: [] }, console: { log() {} } };
  vm.createContext(sb);
  for (const f of ['datasets.js', 'finans-data.js', 'finans-fraud-data.js', 'neobank-data.js',
    'challenges.js', 'sector-challenges.js', 'mock-interviews.js']) {
    vm.runInContext(read(`../src/data/${f}`), sb);
  }
  win = sb.window;
});

const html = (slug) => read(`../src/blog/${slug}.html`);

// Each shown query with its dataset and the cells of the table that follows it.
function shownQueries(page) {
  const out = [];
  const re = /<div class="code-block" data-dataset="([a-z_]+)"><div class="code-label">([^<]*)<\/div><pre><code>([\s\S]*?)<\/code><\/pre><\/div>([\s\S]*?)(?=<div class="code-block"|<h2 )/g;
  let m;
  while ((m = re.exec(page))) {
    const table = m[4].match(/<table>[\s\S]*?<\/table>/);
    const cells = table
      ? [...table[0].matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].flatMap(b => [...b[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
        .map(r => [...r[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(c => decode(c[1]).trim())))
      : null;
    const strong = m[4].match(/returns <strong>([^<]+)<\/strong>/);
    out.push({ dataset: m[1], label: decode(m[2]), sql: decode(m[3]), cells, single: strong ? strong[1] : null });
  }
  return out;
}

describe.each(SLUGS)('%s: every shown query runs and returns what the page prints', (slug) => {
  it('shows the expected number of queries, each on a dataset the post names', () => {
    const qs = shownQueries(html(slug));
    expect(qs.length).toBe(POSTS[slug].queries);
    for (const q of qs) expect(POSTS[slug].datasets, q.label).toContain(q.dataset);
  });

  it('each query matches its printed result', () => {
    for (const q of shownQueries(html(slug))) {
      const rows = db(q.dataset).prepare(q.sql).all().map(r => Object.values(r).map(v => String(v)));
      if (q.cells) expect(rows, q.label).toEqual(q.cells);
      else {
        expect(q.single, `${q.label} needs a printed result`).toBeTruthy();
        expect(rows, q.label).toEqual([[q.single]]);
      }
    }
  });
});

describe('the prose claims that lean on the numbers', () => {
  it('banking: the wrong CASE loses two bands, the right one keeps all 193 banks', () => {
    const [wrong, right, roll] = shownQueries(html('banking-sql-interview-questions'));
    expect(wrong.cells.length).toBe(2);
    expect(right.cells.length).toBe(4);
    const total = c => c.reduce((s, r) => s + Number(r[1]), 0);
    expect(total(wrong.cells)).toBe(193);
    expect(total(right.cells)).toBe(193);
    // "of the 66 banks in band 2 at Q3, 3 rolled worse"; one band-4 bank has no Q4 row
    expect(roll.cells[1].slice(0, 2)).toEqual(['2', '66']);
    expect(roll.cells[1][4]).toBe('3');
    expect(roll.cells[3][5]).toBe('1');
  });

  it('banking: the JPMorgan reconciliation line is cited to the guide\'s summary, never under a report\'s stamp', () => {
    // Q1 on #266 (2026-11-24): the line had been carried under the expanded
    // "Interviewed Q2 2025" report, which says nothing about reconciliation.
    // It comes from Interview Query's summary of 21 reports; the one
    // accepted-offer card is stamped Q1 2025 (docs/reads/companies/jpmorgan.md).
    const page = html('banking-sql-interview-questions');
    const lines = page.split('\n').filter(l => /reconcil/i.test(l) && /Interview Query/.test(l));
    expect(lines.length).toBeGreaterThanOrEqual(2); // the claim and its Sources entry
    for (const l of lines) {
      expect(l, l).not.toMatch(/Interviewed Q\d \d{4}/);
      expect(l, l).toMatch(/21 candidate reports/);
    }
  });

  it('banking: text subtraction returns 0; the julianday version has a tie at 6.8', () => {
    const qs = shownQueries(html('banking-sql-interview-questions'));
    expect(qs[3].single).toBe('0');
    expect(qs[4].cells.filter(r => r[3] === '6.8').length).toBe(2);
  });

  it('payments: the mixed-currency total is about eight times the GBP one; on GBP nothing completed is unmatched', () => {
    const qs = shownQueries(html('payments-sql-interview-questions'));
    const ratio = Number(qs[1].single) / Number(qs[2].single);
    expect(ratio).toBeGreaterThan(7.5);
    expect(ratio).toBeLessThan(8.5);
    const completed = qs[3].cells.find(r => r[0] === 'completed');
    expect(completed).toEqual(['completed', '345', '209', '0']);
  });

  it('e-commerce: 100% vs 62.5% repeat rate; lift below 1 despite 0.63 confidence', () => {
    const qs = shownQueries(html('ecommerce-sql-interview-questions'));
    expect(qs[1].cells[0].slice(3)).toEqual(['100', '62.5']);
    expect(qs[2].cells[0][3]).toBe('0.63');
    expect(Number(qs[2].cells[0][5])).toBeLessThan(1);
  });
});

describe('no post publishes a bank solution or a Pro mock', () => {
  it('no shown query equals a challenge reference solution or a mock solution, verify query or prompt', () => {
    const banned = new Set();
    for (const c of win.challengesData) if (c.solution) banned.add(norm(c.solution));
    for (const m of win.mockInterviewsData.filter(m => /capital-one|revolut/.test(m.id))) {
      for (const q of m.questions) for (const s of [q.solution, q.verify?.sql, q.sql]) if (s) banned.add(norm(s));
    }
    expect(banned.size).toBeGreaterThan(300);
    for (const slug of SLUGS) {
      for (const q of shownQueries(html(slug))) expect(banned.has(norm(q.sql)), `${slug}: ${q.label}`).toBe(false);
    }
  });

  it('no post shows the Revolut mock\'s written tasks (monthly actives, top-decile NTILE) or its decline-rate-by-plan', () => {
    for (const slug of SLUGS) {
      for (const q of shownQueries(html(slug))) {
        expect(q.sql, q.label).not.toMatch(/count\s*\(\s*distinct\s+user_id/i);
        expect(q.sql, q.label).not.toMatch(/ntile/i);
        expect(q.sql, q.label).not.toMatch(/group by\s+u\.plan/i);
      }
    }
  });

  it('no post repeats a mock question\'s prompt, its shown query or its correct option', () => {
    // Titles are concept names ("The average of averages") that public trap
    // pages share by design, so the check reads what is Pro: the prompt, the
    // query the question shows, and the answer.
    const plain = t => String(t || '').replace(/[*`]/g, '').replace(/\s+/g, ' ').trim();
    const qs = win.mockInterviewsData.filter(m => /capital-one|revolut/.test(m.id)).flatMap(m => m.questions);
    const prompts = qs.map(q => plain(q.description).slice(0, 60)).filter(t => t.length >= 40);
    const snippets = new Set(qs.flatMap(q => (q.codeSnippets || []).map(c => norm(c.sql))));
    const answers = qs.map(q => plain((q.options || []).find(o => o.id === q.correctOptionId)?.text)).filter(t => t.length >= 30);
    expect(prompts.length).toBeGreaterThan(20);
    expect(snippets.size).toBeGreaterThan(5);
    expect(answers.length).toBeGreaterThan(5);
    for (const slug of SLUGS) {
      const text = decode(html(slug)).replace(/\s+/g, ' ');
      for (const t of prompts) expect(text.includes(t), `${slug}: prompt "${t}"`).toBe(false);
      for (const t of answers) expect(text.includes(t), `${slug}: answer "${t}"`).toBe(false);
      for (const q of shownQueries(html(slug))) expect(snippets.has(norm(q.sql)), `${slug}: ${q.label}`).toBe(false);
    }
  });
});

describe.each(SLUGS)('%s: counts, claims and the FAQ', (slug) => {
  it('states the free tier with freeTierSentence(), and no bank size or price', () => {
    const text = decode(html(slug));
    expect(text).toContain(freeTierSentence().replace(/\.$/, ''));
    expect(text).not.toMatch(/\b\d{3}\+/);
    expect(text).not.toMatch(/\$\d/);
    for (const m of text.matchAll(/first (\d+) are free to try/g)) expect(Number(m[1])).toBe(COMPANY_SET_FREE_COUNT);
  });

  it('makes no frequency claim', () => {
    const text = decode(html(slug));
    expect(text).not.toMatch(/most[- ]asked|most common(?:ly)? asked|by frequency|asked (?:often|frequently)|\d+% of (?:interviews|candidates)/i);
  });

  it('the visible FAQ equals the FAQPage JSON-LD, in order', () => {
    const page = html(slug);
    const ld = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const fq = ld.find(x => x['@type'] === 'FAQPage');
    const visible = [...page.matchAll(/<summary>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/g)].map(m => [decode(m[1]), decode(m[2])]);
    expect(visible.length).toBeGreaterThanOrEqual(4);
    expect(fq.mainEntity.map(e => [e.name, e.acceptedAnswer.text])).toEqual(visible);
    expect(ld.find(x => x['@type'] === 'Article')?.url).toBe(`https://sqlquest.app/blog/${slug}/`);
  });

  it('title within 60 characters, a description, canonical and OG', () => {
    const page = html(slug);
    const title = decode(page.match(/<title>([^<]*)<\/title>/)[1]);
    expect(title.length).toBeLessThanOrEqual(60);
    const desc = page.match(/<meta name="description" content="([^"]*)"/)[1];
    expect(desc.length).toBeGreaterThan(100);
    expect(desc.length).toBeLessThanOrEqual(160);
    expect(page).toContain(`<link rel="canonical" href="https://sqlquest.app/blog/${slug}/">`);
    expect(page).toContain(`<meta property="og:url" content="https://sqlquest.app/blog/${slug}/">`);
    expect(page).toMatch(/<meta property="og:title" content="[^"]+">/);
  });
});

describe.each(SLUGS)('%s: practice links and the path to purchase', (slug) => {
  it('every practice link is a real challenge, with its real difficulty, Hard marked Pro', () => {
    const page = html(slug);
    const list = page.match(new RegExp(`<ul class="practice-list" data-practice="${slug}">([\\s\\S]*?)</ul>`))[1];
    const items = [...list.matchAll(/<li><a href="\/app\/\?challenge=(\d+)&amp;src=blog-([a-z-]+)"[^>]*>([^<]+)<\/a> <span class="pl-meta">· (Easy|Medium|Hard)( · Pro)?<\/span>/g)];
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(items.length).toBe((list.match(/<li>/g) || []).length);
    const byId = new Map(win.challengesData.map(c => [c.id, c]));
    for (const [, id, src, title, diff, pro] of items) {
      const c = byId.get(Number(id));
      expect(c, `#${id}`).toBeTruthy();
      expect(src).toBe(slug);
      expect(decode(title), `#${id}`).toBe(c.title);
      expect(diff, `#${id}`).toBe(c.difficulty);
      expect(Boolean(pro), `#${id} Pro marker`).toBe(c.difficulty === 'Hard');
    }
    expect(list).toContain('<!-- niche-343:links -->');
  });

  it('every other ?challenge= link on the page also exists', () => {
    const ids = [...html(slug).matchAll(/\?challenge=(\d+)/g)].map(m => Number(m[1]));
    const known = new Set(win.challengesData.map(c => c.id));
    for (const id of ids) expect(known.has(id), `#${id}`).toBe(true);
  });

  it('links the readiness test and its company pages', () => {
    const page = html(slug);
    expect(page).toMatch(/href="\/sql-interview-readiness-test\/\?company=[a-z-]+"/);
    for (const co of POSTS[slug].companies) expect(page, co).toContain(`href="/${co}-sql-interview/"`);
  });
});

describe.each(SLUGS)('%s is linked and listed', (slug) => {
  const href = `/blog/${slug}/`;
  it('sitemap, blog index, interview hub and the build list', () => {
    expect(read('../public/sitemap.xml')).toContain(`<loc>https://sqlquest.app${href}</loc>`);
    expect(read('../src/blog/index.html')).toContain(`href="${href}"`);
    expect(read('../src/sql-interview-prep.html')).toContain(`href="${href}"`);
    expect(read('../scripts/build-static-pages.js')).toContain(`'${slug}'`);
  });

  it('every one of its company pages carries the guide in its strip, and the strip generator says so', () => {
    for (const co of POSTS[slug].companies) {
      expect(SECTOR_GUIDES[co]?.[0], co).toBe(href);
      expect(read(`../src/${co}-sql-interview.html`), co).toContain(`href="${href}" data-track="cta_sector_guide"`);
    }
  });

  it('the finance posts are linked from both fraud pages', () => {
    if (!POSTS[slug].fraudLinked) return;
    expect(read('../src/fraud-analytics-sql.html')).toContain(`href="${href}"`);
    expect(read('../src/blog/sql-for-fraud-analytics.html')).toContain(`href="${href}"`);
  });
});
