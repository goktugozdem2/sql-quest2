// SQL trap / pattern pages (2026-09-25): every number on a page is what the
// dataset returns, the pages never hand out the Pro mock's answers, company
// names appear only as "tested in our … mock", and the pages are wired into
// the sitemap, the question pages, the blog and the app.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { SQL_PATTERNS, PATTERN_DATASET, PATTERN_FOR_MOCK_QUESTION, PATTERNS_FOR_CHALLENGE, patternTitle } from '../src/data/sql-patterns.js';
import { renderPattern } from '../scripts/build-pattern-pages.mjs';
import { loadQuestionBank, questionSlugs } from '../scripts/question-slugs.mjs';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const exists = (rel) => fs.existsSync(new URL(`../${rel}`, import.meta.url));
const squash = (s) => String(s).replace(/;\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

let db, mocks, bank, slugs;
beforeAll(() => {
  const sb = { window: {}, console: { log() {} } };
  vm.createContext(sb);
  vm.runInContext(read('src/data/finans-fraud-data.js'), sb);
  vm.runInContext(read('src/data/mock-interviews.js'), sb);
  mocks = sb.window.mockInterviewsData;
  const ds = sb.window.publicDatasetsData[PATTERN_DATASET];
  db = new Database(':memory:');
  // The app's loadDataset typing: the column type from the first row's value.
  for (const [name, t] of Object.entries(ds.tables)) {
    const types = t.columns.map((_, i) => { const v = t.data[0]?.[i]; return typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT'; });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
  ({ bank } = loadQuestionBank());
  slugs = questionSlugs(bank);
});
const run = (sql) => db.prepare(sql.replace(/;\s*$/, '')).raw(true).all();

describe('every query returns what its page says, on the dataset', () => {
  for (const p of SQL_PATTERNS) {
    it(p.slug, () => {
      const queries = [['wrong', p.wrong], ...p.fixes.map((f, i) => [`fix ${i + 1}`, f]), ...(p.breakdown ? [['breakdown', p.breakdown]] : [])];
      for (const [label, q] of queries) {
        const got = run(q.sql);
        if (q.rows) expect(got, `${p.slug} ${label}`).toEqual(q.rows);
        else expect(got.length, `${p.slug} ${label}`).toBe(q.rowCount);
      }
      for (const f of p.facts) expect(run(f.sql)[0][0], `${p.slug} fact "${f.text}"`).toBe(f.expect);
      // the wrong answer and the right one really differ
      const wrong = JSON.stringify(p.wrong.rows || p.wrong.rowCount);
      for (const f of p.fixes) expect(JSON.stringify(f.rows || f.rowCount)).not.toBe(wrong);
    });
  }
});

describe('the pages', () => {
  const pages = () => SQL_PATTERNS.map(p => [p, renderPattern(p, { slugs, bank, year: 2031 })]);

  it('state every checked fact and every result they show', () => {
    for (const [p, html] of pages()) {
      const t = text(html);
      for (const f of p.facts) expect(t, `${p.slug}: "${f.text}"`).toContain(f.text);
      for (const q of [p.wrong, ...p.fixes, ...(p.breakdown ? [p.breakdown] : [])]) {
        if (q.rows) for (const v of q.rows.flat()) {
          const shown = typeof v === 'number' && !Number.isInteger(v) ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : typeof v === 'number' ? v.toLocaleString('en-US') : v;
          expect(t, `${p.slug}: ${shown}`).toContain(String(shown));
        } else expect(t).toContain(`${q.rowCount} rows`);
      }
    }
  });

  it('take the year in the title from the build, not from the source', () => {
    for (const [p, html] of pages()) {
      expect(p.title).toContain('{year}');
      expect(html).toContain(`<title>${patternTitle(p, 2031).replace(/&/g, '&amp;')} | SQLQuest.app</title>`);
    }
    expect(read('scripts/build-pattern-pages.mjs')).toMatch(/year = new Date\(\)\.getFullYear\(\)/);
  });

  it('follow the template: trap first, the wrong query, why, the fix, the mock, practice, related traps', () => {
    for (const [p, html] of pages()) {
      const order = ['data-pattern-trap', 'The task', 'The query that looks right', '>Why<', '>The fix<', 'Right answer', 'Where this trap is tested', 'Practise it', 'Related SQL traps'];
      let at = 0;
      for (const mark of order) { const i = html.indexOf(mark, at); expect(i, `${p.slug}: ${mark}`).toBeGreaterThan(-1); at = i; }
      expect(p.fixes.length).toBeGreaterThanOrEqual(1);
      expect(p.challenges.length).toBeGreaterThanOrEqual(2);
      expect(p.challenges.length).toBeLessThanOrEqual(4);
    }
  });

  it('carry Article structured data with dates, and no FAQ schema (there is no Q&A section)', () => {
    for (const [p, html] of pages()) {
      const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
      const art = ld.find(o => o['@type'] === 'Article');
      expect(art, p.slug).toBeTruthy();
      expect(art.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(art.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ld.some(o => o['@type'] === 'FAQPage')).toBe(false);
    }
  });

  it('render code without ligatures, in the brand SQL palette', () => {
    const html = pages()[0][1];
    expect(html).toMatch(/font-variant-ligatures:none/);
    expect(html).toMatch(/pre \.k\{color:#7CC4FF\}pre \.s\{color:#B5E48C\}pre \.n\{color:#FFB86C\}/);
    expect(html).toContain('COUNT</span>(*)');
  });

  it('name a company only as "tested in our … mock" — never a claim about its interview', () => {
    const COMPANIES = /\b(Capital One|Revolut|Google|Meta|Amazon|Stripe|Wise|JPMorgan|Snowflake|Apple|Netflix|Uber|Airbnb)\b/;
    for (const [p, html] of pages()) {
      const t = text(html).replace(/question \d+ of our Capital One [\w\s-]+? mock/g, '');
      expect(t, p.slug).not.toMatch(COMPANIES);
    }
  });
});

describe('the Pro mock keeps its answers', () => {
  it('each page names a real mock question, by its real number', () => {
    for (const p of SQL_PATTERNS) {
      for (const m of [p.mock, p.alsoIn].filter(Boolean)) {
        const mock = mocks.find(x => x.id === m.id);
        expect(mock, m.id).toBeTruthy();
        const i = mock.questions.findIndex(q => q.id === m.question);
        expect(i, m.question).toBeGreaterThan(-1);
        expect(i + 1, `${p.slug} → ${m.question}`).toBe(m.number);
      }
    }
  });

  it("no page query is the mock question's own query, and no page shows its correct option", () => {
    for (const p of SQL_PATTERNS) {
      for (const m of [p.mock, p.alsoIn].filter(Boolean)) {
        const q = mocks.find(x => x.id === m.id).questions.find(x => x.id === m.question);
        const theirs = [...(q.codeSnippets || []).map(s => s.sql), q.verify?.sql, q.solution].filter(Boolean).map(squash);
        for (const mine of [p.wrong, ...p.fixes].map(x => squash(x.sql))) expect(theirs, p.slug).not.toContain(mine);
        const correct = (q.options || []).find(o => o.id === q.correctOptionId);
        if (correct && /^[\d.|]+$/.test(correct.value)) {
          const html = renderPattern(p, { slugs, bank });
          for (const v of correct.value.split('|')) {
            const shown = Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
            if (Number(v) > 20) expect(text(html), `${p.slug} shows the mock's answer ${shown}`).not.toContain(shown);
          }
        }
      }
    }
  });
});

describe('wiring', () => {
  it('the built pages exist and are in the sitemap', () => {
    const xml = read('public/sitemap.xml');
    const block = xml.slice(xml.indexOf('<!-- patterns:start -->'), xml.indexOf('<!-- patterns:end -->'));
    for (const p of SQL_PATTERNS) {
      expect(exists(`public/${p.slug}/index.html`), p.slug).toBe(true);
      expect(block).toContain(`<loc>https://sqlquest.app/${p.slug}/</loc>`);
    }
  });

  it('challenges, related traps and read-more links all resolve', () => {
    const ids = new Set(bank.map(c => c.id));
    const all = new Set(SQL_PATTERNS.map(p => p.slug));
    for (const p of SQL_PATTERNS) {
      for (const id of p.challenges) expect(ids.has(id), `${p.slug} → challenge ${id}`).toBe(true);
      for (const s of p.related) expect(all.has(s), `${p.slug} → ${s}`).toBe(true);
      if (p.readMore) expect(exists(`src${p.readMore.href.replace(/\/$/, '')}.html`) || exists(`src${p.readMore.href}index.html`), p.readMore.href).toBe(true);
    }
  });

  it('every cited challenge\'s question page links back to its trap page', () => {
    for (const [id, list] of Object.entries(PATTERNS_FOR_CHALLENGE)) {
      const html = read(`public/questions/${slugs.get(Number(id))}/index.html`);
      for (const s of list) expect(html, `question ${id} → ${s}`).toContain(`href="/${s}/"`);
    }
  });

  it('every trap page is linked from at least one blog post', () => {
    const blog = fs.readdirSync(new URL('../src/blog/', import.meta.url)).filter(f => f.endsWith('.html')).map(f => read(`src/blog/${f}`)).join('\n');
    for (const s of ['sql-not-in-null', 'sql-join-fan-out', 'sql-left-join-where-filter']) expect(blog, s).toContain(`href="/${s}/"`);
    // the NULL post and the NOT IN page link each other — no canonical between them
    expect(read('src/blog/null-handling-mistakes.html')).toContain('href="/sql-not-in-null/"');
    expect(SQL_PATTERNS.find(p => p.slug === 'sql-not-in-null').readMore.href).toBe('/blog/null-handling-mistakes/');
  });

  it('a trap page → mock link goes straight to the price, with the trap as context', () => {
    const app = read('src/app.jsx');
    // the deep link carries ?src=pattern-<slug> into startInterview
    expect(app).toMatch(/src\.startsWith\('pattern-'\)/);
    expect(app).toContain('startInterview(target, false, { patternSlug, fromLink: true, linkSrc })');
    // for a non-Pro visitor the pattern branch runs BEFORE the cold-start gate and the free-mock nudge
    const gate = app.slice(app.indexOf('const startInterview = (interview, forceNew = false, opts = {}) => {'));
    const iPattern = gate.indexOf("type: 'pattern_mock'");
    expect(iPattern).toBeGreaterThan(0);
    expect(iPattern).toBeLessThan(gate.indexOf('if (openColdStartInstead()) return;'));
    expect(iPattern).toBeLessThan(gate.indexOf('nudgeToFreeMock('));
    expect(app).toContain('data-testid="pro-modal-pattern-mock"');
    // the funnel joins: modal, plan click and checkout click all carry the trap page
    expect(app).toMatch(/'pro_modal_shown', \{[\s\S]{0,700}patternSlug: proModalReason\?\.patternSlug \|\| null/);
    expect(app).toMatch(/'pro_plan_clicked', \{[\s\S]{0,300}modalReason: proModalReason\?\.type \|\| null,\s*\n\s*patternSlug: proModalReason\?\.patternSlug \|\| null/);
    expect(app).toMatch(/'pro_checkout_clicked', \{ plan, email: email \|\| null, modalReason: proModalReason\?\.type \|\| null, patternSlug: proModalReason\?\.patternSlug \|\| null/);
    // and the trap page's link says where it came from
    for (const p of SQL_PATTERNS) expect(renderPattern(p, { slugs, bank })).toContain(`src=pattern-${p.slug}`);
  });

  it('a wrong mock answer links to its trap: in the feedback, on the results, and in Study with AI', () => {
    const app = read('src/app.jsx');
    const slugSet = new Set(SQL_PATTERNS.map(p => p.slug));
    for (const s of Object.values(PATTERN_FOR_MOCK_QUESTION)) expect(slugSet.has(s)).toBe(true);
    for (const id of Object.keys(PATTERN_FOR_MOCK_QUESTION)) expect(mocks.some(m => m.questions.some(q => q.id === id)), id).toBe(true);
    expect(app).toContain("import { PATTERN_FOR_MOCK_QUESTION, SQL_PATTERNS } from './data/sql-patterns.js';");
    for (const tid of ['interview-pattern-link', 'interview-results-pattern-link', 'study-pattern-link']) expect(app).toContain(`data-testid="${tid}"`);
    expect(app.match(/PATTERN_FOR_MOCK_QUESTION\[currentQ\.id\]/g)).toHaveLength(2);
  });
});
