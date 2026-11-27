// The first screen of a company page (C5, 2026-11-24): question 1, the
// readiness test, the Pro line, and one "debug this query" item. Every query
// the page shows runs here: the broken one must give the wrong answer the page
// says it gives, the fix the right one, and every number in the copy is what
// the dataset returns. The item is not a mock question, it links to the app's
// own Debug question on the same bug, and every app link carries the door.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { FIRST_SCREENS, firstScreenBlock, withFirstScreen, pageData } from '../scripts/company-first-screen.mjs';
import { loadBank, facts } from '../scripts/build-company-pages.mjs';
import { COMPANY_INTERVIEWS } from '../src/data/company-interviews.js';
import { freeSolvesLabel } from '../src/utils/display-count.js';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const squash = (s) => String(s).replace(/;\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/\s+/g, ' ');

let dbs, mocks, debugItems, bank;
beforeAll(() => {
  const sb = { window: { publicDatasetsData: {} }, console: { log() {} } };
  vm.createContext(sb);
  vm.runInContext(read('src/data/datasets.js'), sb); // ecommerce (Amazon)
  vm.runInContext(read('src/data/finans-fraud-data.js'), sb);
  vm.runInContext(read('src/data/mock-interviews.js'), sb);
  vm.runInContext(read('src/data/debug-challenges.js'), sb);
  mocks = sb.window.mockInterviewsData;
  debugItems = sb.window.debugChallengesData;
  dbs = {};
  for (const [dsName, ds] of Object.entries(sb.window.publicDatasetsData)) {
    const db = new Database(':memory:');
    // The app's loadDataset typing: the column type from the first row's value.
    for (const [name, t] of Object.entries(ds.tables)) {
      const types = t.columns.map((_, i) => { const v = t.data[0]?.[i]; return typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT'; });
      db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
      const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
      db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
    }
    dbs[dsName] = db;
  }
  bank = loadBank();
});
const one = (db, sql) => db.prepare(sql.replace(/;\s*$/, '')).raw(true).all()[0][0];
const amazon = FIRST_SCREENS.amazon;

describe('the debug item: every shown query runs, and the broken one is wrong', () => {
  for (const [key, cfg] of Object.entries(FIRST_SCREENS)) {
    it(`${key}: broken answers ${cfg.brokenAnswer}, the fix ${cfg.fixAnswer}, and they differ`, () => {
      const db = dbs[cfg.dataset];
      expect(db, cfg.dataset).toBeTruthy();
      expect(one(db, cfg.broken), `${key} broken`).toBe(cfg.brokenAnswer);
      expect(one(db, cfg.fix), `${key} fix`).toBe(cfg.fixAnswer);
      expect(cfg.fixAnswer).not.toBe(cfg.brokenAnswer);
      // The bug line the copy names is a line the fix does not keep
      // (the fix may move it, as Monzo's does, but never keeps it).
      expect(cfg.fix.split('\n'), `${key}: the fix still holds line ${cfg.bugLine}`).not.toContain(cfg.broken.split('\n')[cfg.bugLine - 1]);
    });

    it(`${key}: every number in the copy is what the dataset returns`, () => {
      const db = dbs[cfg.dataset];
      const html = text(firstScreenBlock(key, facts(bank, pageData(key).name)));
      for (const f of cfg.facts) {
        expect(one(db, f.sql), f.text).toBe(f.expect);
        expect(html, f.text).toContain(f.text.replace(/ of them$/, ''));
      }
      expect(html).toContain(`answers ${cfg.brokenAnswer}`);
      expect(html).toContain(`the answer is ${cfg.fixAnswer}, not ${cfg.brokenAnswer}`);
    });

    it(`${key}: not any mock question's query`, () => {
      const theirs = mocks.flatMap(m => (m.questions || []).flatMap(q => [...(q.codeSnippets || []).map(s => s.sql), q.verify?.sql, q.solution]))
        .filter(Boolean).map(squash);
      for (const mine of [cfg.broken, cfg.fix]) expect(theirs).not.toContain(squash(mine));
    });

    it(`${key}: the app item is a live, non-Hard Debug question with the same bug`, () => {
      const item = debugItems.find(c => c.id === cfg.debugId);
      expect(item, `debug ${cfg.debugId}`).toBeTruthy();
      expect(item.type).toBe('debug');
      expect(item.difficulty).not.toBe('Hard'); // a Hard is Pro: a cold visitor would be swapped away
      expect(item.trap).toBe(cfg.trapSlug);
      if (cfg.trapSlug) expect(fs.existsSync(new URL(`../public/${cfg.trapSlug}/index.html`, import.meta.url))).toBe(true);
      expect(/\n\s*debugQuestions:\s*true,/.test(read('src/data/feature-flags.js')), 'Debug set is live').toBe(true);
    });
  }
});

describe('the block on the page', () => {
  it('sits right under the hero on the committed and built Monzo page', () => {
    for (const rel of ['src/monzo-sql-interview.html', 'public/monzo-sql-interview/index.html']) {
      const html = read(rel);
      const heroEnd = html.indexOf('</section>', html.indexOf('<section class="hero"'));
      const start = html.indexOf('<!-- company-first-screen:start -->');
      expect(start, rel).toBeGreaterThan(heroEnd);
      expect(html.slice(heroEnd, start).replace(/<\/section>/, '').trim(), rel).toBe('');
      expect(html.indexOf('<section id="format"'), rel).toBeGreaterThan(start);
    }
  });

  it('every app link in the block carries src=company-monzo, and question 1 is the hero\'s', () => {
    const f = facts(bank, 'Monzo');
    const html = firstScreenBlock('monzo', f);
    const appLinks = [...html.matchAll(/href="(\/app\/[^"]*)"/g)].map(m => m[1]);
    expect(appLinks.length).toBe(2);
    for (const h of appLinks) expect(h, h).toMatch(/[?;]src=company-monzo(&|$)/);
    expect(appLinks).toContain(`/app/?challenge=${f.first.id}&amp;src=company-monzo`);
    expect(appLinks).toContain(`/app/?challenge=${FIRST_SCREENS.monzo.debugId}&amp;src=company-monzo`);
    expect(html).toContain('/sql-interview-readiness-test/?company=monzo&amp;src=company-monzo');
    expect(text(html)).toContain(`Question 1: ${f.first.title}`);
  });

  it('the Pro line uses the helpers and the page facts, never a price', () => {
    const f = facts(bank, 'Monzo');
    const t = text(firstScreenBlock('monzo', f));
    expect(t).toContain(`the ${f.hard - f.previews} Hard questions in this set past the free preview`);
    expect(t).toContain(`all ${f.bank} questions without the stop at ${freeSolvesLabel()}`);
    expect(t).not.toMatch(/\$\d|unlimited|most[- ]asked/i);
  });

  it('the frame cites a source the page already carries, with its date', () => {
    const cfg = FIRST_SCREENS.monzo;
    const [title, url, date] = COMPANY_INTERVIEWS.monzo.sources[cfg.sourceKey];
    const html = firstScreenBlock('monzo', facts(bank, 'Monzo'));
    expect(html).toContain(`href="${url}"`);
    expect(text(html)).toContain(`${title.replace(/'/g, "'")}, ${date}`);
    expect(read('src/monzo-sql-interview.html')).toContain(`id="src-${cfg.sourceKey}"`);
  });

  it('is idempotent, and a company with no config is unchanged', () => {
    const f = facts(bank, 'Monzo');
    const page = read('src/monzo-sql-interview.html');
    expect(withFirstScreen(page, 'monzo', f)).toBe(page);
    const chime = read('src/chime-sql-interview.html');
    expect(withFirstScreen(chime, 'chime', facts(bank, 'Chime'))).toBe(chime);
    expect(chime).not.toContain('company-first-screen');
  });
});

// Amazon (C5, 2026-11-26): an older, hand-written page given the block by the
// generator's last step. "Start with" is #131, the first shape in the BIE
// round reported to us; the hero keeps #19 (its series is pinned).
describe('the Amazon first screen', () => {
  const f = () => facts(bank, 'Amazon');
  it('sits right under the hero on the committed and built page, ahead of the provenance note and the sourced format', () => {
    for (const rel of ['src/amazon-sql-interview.html', 'public/amazon-sql-interview/index.html']) {
      const html = read(rel);
      const heroEnd = html.indexOf('</section>', html.indexOf('<section class="hero"'));
      const start = html.indexOf('<!-- company-first-screen:start -->');
      expect(start, rel).toBeGreaterThan(heroEnd);
      expect(html.split('<!-- company-first-screen:start -->').length, rel).toBe(2);
      expect(html.indexOf('<!-- company-provenance:start -->'), rel).toBeGreaterThan(html.indexOf('<!-- company-first-screen:end -->'));
      expect(html.indexOf('<section id="format"'), rel).toBeGreaterThan(start);
    }
  });

  it('is what the generator writes (idempotent)', () => {
    const page = read('src/amazon-sql-interview.html');
    expect(withFirstScreen(page, 'amazon', f())).toBe(page);
  });

  it('every app link carries src=company-amazon; readiness names amazon; the set link declares the goal', () => {
    const html = firstScreenBlock('amazon', f());
    const appLinks = [...html.matchAll(/href="(\/app\/[^"]*)"/g)].map(m => m[1]);
    expect(appLinks.length).toBe(4);
    for (const h of appLinks) expect(h, h).toMatch(/[?;]src=company-amazon$/);
    expect(appLinks).toEqual(expect.arrayContaining([
      '/app/?challenge=131&amp;src=company-amazon',
      '/app/?company=Amazon&amp;goal=interview&amp;src=company-amazon',
      '/app/?interview=faang-sql-interview&amp;src=company-amazon',
      '/app/?challenge=334&amp;src=company-amazon',
    ]));
    expect(html).toContain('/sql-interview-readiness-test/?company=amazon&amp;src=company-amazon');
  });

  it('"Start with" is a free-tier, Amazon-tagged Medium on a shape the reported round names, and says what it measures, not how', () => {
    const c = f().ordered.find(x => x.id === amazon.firstId);
    expect(c, '#131 is not tagged Amazon').toBeTruthy();
    expect(c.difficulty).toBe('Medium');
    const t = text(firstScreenBlock('amazon', f()));
    expect(t).toContain(`Start with: ${c.title} (Medium): a row compared against its own group's average.`);
    const line = t.split('Start with:')[1].split('The set:')[0];
    expect(line).not.toMatch(/\b(AVG|PARTITION BY|GROUP BY|subquery|correlated|JOIN)\b/i);
    // The shape is the reported round's first problem.
    expect(read('docs/reads/amazon-bie-candidate-report-2026-10-21.md')).toMatch(/salary exceeds their department's average/);
  });

  it('the set line states the live split, and the Pro line names the closest Pro mock honestly', () => {
    const fx = f();
    const t = text(firstScreenBlock('amazon', fx));
    expect(t).toContain(`all ${fx.n} Amazon-tagged challenges in the app (${fx.medium} Medium, ${fx.hard} Hard)`);
    expect(t).toContain('not questions Amazon has asked');
    const m = mocks.find(x => x.id === amazon.mock.id);
    expect(m.isFree).toBe(false);
    expect(m.totalTime).toBe(50 * 60);
    expect(m.questions.length).toBe(5);
    expect(m.questions.map(q => q.title)).toEqual(expect.arrayContaining(['Second highest salary', 'Consecutive Orders']));
    expect(t).toMatch(/the Hard SQL Interview mock \(Pro\) ?, 50 minutes, five written questions/);
    expect(t).toContain('not modelled on Amazon');
    // A1 REVISE on 3ef5844a: the note described a question the mock does not
    // have ("second-highest salary per department"). Every question the note
    // names must be a title in the mock, and "per department" may only follow
    // the one per-department question.
    const note = amazon.mock.note;
    expect(note).toMatch(/the second-highest salary, consecutive orders and the longest-tenured employee per department/);
    const titles = m.questions.map(q => q.title.toLowerCase());
    for (const named of ['second highest salary', 'consecutive orders', 'longest-tenured employee per department']) {
      expect(titles, named).toContain(named);
    }
    expect(note).not.toMatch(/salary per department/);
    expect(m.questions.find(q => q.title === 'Second highest salary').description).not.toMatch(/department/i);
    expect(t).not.toMatch(/\$\d|unlimited|most[- ]asked|Amazon's own (mock|question)/i);
  });

  it('the frame cites the reported round already in the sourced table, and its follow-up is on record', () => {
    const [title, , date] = pageData('amazon').sources[amazon.sourceKey];
    const html = firstScreenBlock('amazon', f());
    expect(text(html)).toContain(`${title}, ${date}`);
    expect(html).toContain('href="#src-reported-amzn"');
    expect(read('src/amazon-sql-interview.html')).toContain('id="src-reported-amzn"');
    expect(read('docs/reads/amazon-bie-candidate-report-2026-10-21.md')).toMatch(/COUNT\(\*\) vs COUNT\(column\)/);
  });

  // A1 REVISE on 3ef5844a: "7 Medium" survived in the plan intro and FAQ #1
  // (both copies) after the set grew to 10. Every "N Medium" / "N Hard" the
  // page states for the set must be the live split.
  it('every Medium/Hard count the page states is the live split', () => {
    const fx = f();
    for (const rel of ['src/amazon-sql-interview.html', 'public/amazon-sql-interview/index.html']) {
      const html = read(rel);
      const medium = [...html.matchAll(/\b(\d+) Medium\b/g)].map(x => +x[1]);
      expect(medium.length, rel).toBeGreaterThan(0);
      for (const n of medium) expect(n, `${rel}: "${n} Medium"`).toBe(fx.medium);
      for (const n of [...html.matchAll(/\b(\d+) Hard\b(?! previews| questions in this set past)/g)].map(x => +x[1])) {
        expect([fx.hard, fx.previews], `${rel}: "${n} Hard"`).toContain(n);
      }
    }
  });

  it('Debug 334 is the same COUNT(*) against COUNT(column) difference', () => {
    const item = debugItems.find(c => c.id === amazon.debugId);
    expect(item.brokenQuery.split('\n')[item.bugLines[0] - 1]).toMatch(/COUNT\(\*\)/);
    expect(item.solution).toMatch(/COUNT\(age\)/);
  });
});
