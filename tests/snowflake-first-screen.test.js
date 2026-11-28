// The Snowflake page's first screen (C5, 2026-11-28): where to start, the
// readiness test, what Pro gives and the closest Pro mock, and one "debug this
// query" item on the employees data. Every number the block states is
// computed here from the data, the broken query must give the wrong answer and
// the fix the right one, the frame cites only dated sources in the Snowflake
// dossier, and the mock line says only what the mock holds.
//
// The block is written by the company generator from FIRST_SCREENS.snowflake
// in scripts/company-first-screen.mjs. This test reads the committed block
// between the `company-first-screen:start/end` markers;
// tests/company-template.test.js pins that the generator writes it.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { loadBank, facts } from '../scripts/build-company-pages.mjs';
import { FIRST_SCREENS } from '../scripts/company-first-screen.mjs';
import { isFreePreview } from '../src/utils/challenge-order.js';
import { bankCountLabel, freeSolvesLabel } from '../src/utils/display-count.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const read = rel => readFileSync(here(rel), 'utf8');

const PAGE = read('../src/snowflake-sql-interview.html');
const START = '<!-- company-first-screen:start -->';
const END = '<!-- company-first-screen:end -->';
const DOOR = 'company-snowflake';
const FIRST_ID = 23;
const DEBUG_ID = 340;
const MOCK_ID = 'faang-sql-interview';
const cfg = FIRST_SCREENS.snowflake;

const unescape = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const text = html => unescape(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/ ([,;)])/g, '$1');
const codeBlocks = block => [...block.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)]
  .map(m => unescape(m[1].replace(/<span[^>]*>\d+<\/span>/g, '').replace(/<[^>]+>/g, '')));

function loadWindow(files) {
  const sb = { window: { publicDatasetsData: {}, challengesData: [] }, console: { log() {} } };
  vm.createContext(sb);
  for (const f of files) vm.runInContext(read(f), sb);
  return sb.window;
}

let block, win, db;
beforeAll(() => {
  const a = PAGE.indexOf(START);
  const b = PAGE.indexOf(END);
  block = a >= 0 && b > a ? PAGE.slice(a, b) : '';
  win = loadWindow(['../src/data/datasets.js', '../src/data/debug-challenges.js', '../src/data/mock-interviews.js']);
  const ds = win.publicDatasetsData.employees;
  db = new Database(':memory:');
  // The app's loadDataset typing: the column type from the first row's value.
  for (const [name, t] of Object.entries(ds.tables)) {
    const types = t.columns.map((_, i) => { const v = t.data[0]?.[i]; return typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT'; });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
});
const one = sql => db.prepare(sql.replace(/;\s*$/, '')).raw(true).all()[0][0];

describe('the Snowflake first screen', () => {
  it('sits in the hero, once, right after the primary CTA row, in both copies', () => {
    expect(block, 'no first-screen block on the Snowflake page').not.toBe('');
    for (const [rel, html] of [['src', PAGE], ['public', read('../public/snowflake-sql-interview/index.html')]]) {
      const hero = html.indexOf('<section class="hero"');
      const start = html.indexOf(START);
      const ctaRowEnd = html.indexOf('</div>', html.indexOf('data-track="cta_hero_primary"', hero)) + '</div>'.length;
      expect(html.split(START).length, rel).toBe(2);
      expect(start > hero && html.slice(hero, start).indexOf('</section>') < 0, `${rel}: inside the hero`).toBe(true);
      expect(html.slice(ctaRowEnd, start).trim(), `${rel}: right after the CTA row`).toBe('');
      expect(html, rel).toMatch(/<div id="start" data-section="first-screen" style="[^"]*contain:inline-size/);
    }
  });

  it('every app link carries src=company-snowflake; readiness names the slug the test page selects', () => {
    const hrefs = [...block.matchAll(/href="([^"]+)"/g)].map(m => unescape(m[1]));
    const app = hrefs.filter(h => h.startsWith('/app/'));
    expect(app.length).toBe(3); // question, mock, debug
    for (const h of app) expect(new URL(h, 'https://x').searchParams.get('src'), h).toBe(DOOR);
    const q = new URL(hrefs.find(h => h.startsWith('/sql-interview-readiness-test/')), 'https://x').searchParams;
    expect([q.get('company'), q.get('src')]).toEqual(['snowflake', DOOR]);
    // The readiness page's <select> holds the slug, not the display name.
    expect(read('../public/sql-interview-readiness-test/index.html')).toContain('value="snowflake"');
  });

  it('starts with a Snowflake-tagged free Hard preview on employees, said by what it measures', () => {
    const f = facts(loadBank(), 'Snowflake');
    const c = f.ordered.find(x => x.id === FIRST_ID);
    expect(c, `#${FIRST_ID} is not tagged Snowflake`).toBeTruthy();
    expect(c.difficulty).toBe('Hard');
    expect(isFreePreview(c), `#${FIRST_ID} is not a free preview`).toBe(true);
    expect((c.tables || [])).toEqual(['employees']);
    expect(block).toContain(`<a href="/app/?challenge=${FIRST_ID}&amp;src=${DOOR}" data-track="cta_first_question" style="color:#c084fc;">${c.title}</a> (Hard)`);
    const line = text(block.split('Start with:')[1].split('</p>')[0]);
    expect(line).toContain("A Hard preview, so it opens inside the free tier.");
    // Founder rule 2026-10-05: what it measures, never how.
    expect(line).not.toMatch(/\b(DENSE_RANK|RANK\(|ROW_NUMBER|PARTITION BY|OVER|window function)/i);
  });

  it('the Pro line states the Hard count, the bank and the free tier through the helpers, never a price', () => {
    const bank = loadBank();
    const f = facts(bank, 'Snowflake');
    const t = text(block);
    expect(t).toContain(`the ${f.hard - f.previews} Hard challenges in the Snowflake set past its Hard previews`);
    expect(f.bank).toBe(bankCountLabel(bank.byId.size));
    expect(t).toContain(`all ${f.bank} challenges without the stop at ${freeSolvesLabel()}`);
    expect(t).not.toMatch(/\$\d/);
  });

  it('the mock line says only what the mock holds: Pro, 50 minutes, five written questions, the two named shapes', () => {
    const m = win.mockInterviewsData.find(x => x.id === MOCK_ID);
    expect(m).toBeTruthy();
    expect(m.isFree).toBe(false);
    expect(m.company).toBe('General');
    expect(m.totalTime).toBe(50 * 60);
    expect(m.questions.length).toBe(5);
    expect(m.questions.every(q => !q.options), 'all five are written, not multiple choice').toBe(true);
    const titles = m.questions.map(q => q.title.toLowerCase());
    expect(titles).toContain('second highest salary');
    expect(titles).toContain('consecutive orders');
    const t = text(block);
    expect(t).toContain('the Hard SQL Interview mock (Pro), 50 minutes, five written questions, including the second-highest salary and customers who ordered on consecutive days');
    expect(t).toContain('It is a general mock, not modelled on Snowflake');
    expect(block).toContain(`/app/?interview=${MOCK_ID}&amp;src=${DOOR}`);
  });

  it('the broken query runs and answers what the page says; the fix runs and equals the truth', () => {
    const [broken, fix] = codeBlocks(block);
    expect(broken && fix, 'two queries in the block').toBeTruthy();
    // Ground truth, written independently of the page.
    const truth = one('SELECT COUNT(DISTINCT manager_id) FROM employees WHERE manager_id IN (SELECT emp_id FROM employees)');
    expect(one(fix)).toBe(truth);
    expect(one(broken)).not.toBe(truth);
    expect([one(broken), one(fix)]).toEqual([cfg.brokenAnswer, cfg.fixAnswer]);
    expect(text(block)).toContain(`answers ${cfg.brokenAnswer}. Find the line.`);
    expect(text(block)).toContain(`The answer is ${cfg.fixAnswer}.`);
  });

  it('every number in the explanation comes from the data, and line 3 is the join', () => {
    const t = text(block);
    for (const fx of cfg.facts) {
      expect(one(fx.sql), fx.text).toBe(fx.expect);
      expect(t).toContain(fx.text);
    }
    // "the other 43 are reports": employees with a manager = the broken count.
    expect(one('SELECT COUNT(*) FROM employees WHERE manager_id IS NOT NULL')).toBe(cfg.brokenAnswer);
    expect(t).toContain(`so the other ${cfg.brokenAnswer} are reports`);
    const [broken] = codeBlocks(block);
    expect(broken.split('\n')[cfg.bugLine - 1]).toMatch(/^JOIN employees e ON e\.manager_id = m\.emp_id/);
    expect(t).toContain(`Line ${cfg.bugLine}:`);
  });

  it('gives away no Pro answer: no Hard challenge and no mock question asks for the count of managers', () => {
    const [, fix] = codeBlocks(block);
    const squash = s => String(s || '').replace(/\s+/g, ' ').toLowerCase();
    const all = loadWindow(['../src/data/challenges.js']).challengesData;
    for (const c of all.filter(x => x.difficulty === 'Hard')) expect(squash(c.solution), `#${c.id}`).not.toContain(squash(fix).replace(/;$/, ''));
    for (const m of win.mockInterviewsData) {
      for (const q of m.questions || []) expect(`${q.title} ${q.description}`, `${m.id}/${q.id}`).not.toMatch(/manage (at least one|anyone|someone)|how many managers/i);
    }
  });

  it('links the app\'s Debug item with the same join duplication, says Hard and Pro, and the trap page', () => {
    const d = (win.debugChallengesData || []).find(c => c.id === DEBUG_ID);
    expect(d, `Debug #${DEBUG_ID} missing`).toBeTruthy();
    expect(d.bugNote).toMatch(/fan-out/i);
    expect(d.difficulty).toBe('Hard');
    expect(d.trap).toBe('sql-join-fan-out');
    expect(block).toContain(`question ${DEBUG_ID} (Hard, Pro)`);
    expect(block).toContain('from our Debug set, not the Snowflake set');
    expect(block).toContain(`href="/${d.trap}/"`);
    expect(block).toContain('href="/sql-debugging-practice/"');
  });

  it('the frame cites only the dossier\'s dated sources, and states no format', () => {
    const dossier = read('../docs/reads/companies/snowflake.md');
    expect(dossier).toMatch(/\| S3 \| DataDriven: Snowflake data engineer interview guide \| https:\/\/datadriven\.io\/companies\/snowflake\/interview \| last updated 2026-09-23 \|/);
    expect(dossier).toMatch(/\| S4 \| GeeksforGeeks: Snowflake campus interview[^|]*\| https:\/\/www\.geeksforgeeks\.org\/\?p=1054489 \| last updated 2023-08-31 \|/);
    expect(dossier).toMatch(/Read 2026-11-22 with WebFetch/);
    expect(dossier).toMatch(/\*\*Earns more than the manager \(S3\)\.\*\*/);
    expect(dossier).toMatch(/employees on at least one\s+project \(S4\)/);
    expect(dossier).toMatch(/Ranking: nth \/ third-highest value — 2 of 2 \(S3, S4\)/);
    const t = text(block);
    expect(t).toContain("DataDriven's Snowflake data engineer guide, updated 23 Sep 2026, read 22 Nov 2026");
    expect(t).toContain('a 2023 campus report on GeeksforGeeks, updated 31 Aug 2023, read 22 Nov 2026');
    expect(t).toContain('Two reports are not a format.');
    // A general page: no sourced section, no format words, no frequency claim.
    expect(PAGE).not.toMatch(/How the interview runs \(sourced\)/);
    expect(t).not.toMatch(/\b(CoderPad|HackerRank|minutes? round|most[- ]asked|frequently asked)\b/i);
    const links = [...block.matchAll(/href="(https?:[^"]+)"/g)].map(m => m[1]);
    expect(links.sort()).toEqual(['https://datadriven.io/companies/snowflake/interview', 'https://www.geeksforgeeks.org/?p=1054489']);
  });

  it('the hero and FAQ make no unsourced claim about what Snowflake asks, in every copy', () => {
    for (const html of [PAGE, read('../public/snowflake-sql-interview/index.html')]) {
      expect(html).not.toMatch(/90% of what you'll be asked/);
      expect(html).not.toMatch(/Snowflake interviews actually test/);
      expect(html).not.toMatch(/we have no dated, citable source for them/);
      expect(html.split('we cite two dated reports of question shapes from its data-engineering interviews').length).toBe(3);
    }
  });
});
