// The Wise page's first screen (C5, 2026-11-25): the first question, the
// readiness test, what Pro gives, and one "debug this query" item on a
// multi-currency ledger. Every number the block states is computed here from
// the data, the broken query must give the wrong answer and the fix the right
// one, and every link the block adds goes where it says.
//
// The block is written by the company generator from FIRST_SCREENS.wise in
// scripts/company-first-screen.mjs (moved there 2026-11-27; it was
// hand-written, and the generator's next run would have deleted it). This
// test reads the committed block between the `company-first-screen:start/end`
// markers; tests/company-template.test.js pins that the generator writes it.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { loadBank, facts } from '../scripts/build-company-pages.mjs';
import { bankCountLabel, freeSolvesLabel } from '../src/utils/display-count.js';

const here = rel => fileURLToPath(new URL(rel, import.meta.url));
const read = rel => readFileSync(here(rel), 'utf8');

const PAGE = read('../src/wise-sql-interview.html');
const START = '<!-- company-first-screen:start -->';
const END = '<!-- company-first-screen:end -->';
const DOOR = 'company-wise';
const FIRST_ID = 285;
const DEBUG_ID = 341;

// Live QA 2026-11-27 (docs/reads/live-qa-2026-11-27.md, note B): after the hero
// section the block started below the fold, so it now sits INSIDE the hero,
// directly after the primary CTA row (the yellow button keeps its place).
// Returns what the placement tests check, from the page's own markup.
const heroPlacement = (html) => {
  const START = '<!-- company-first-screen:start -->';
  const hero = html.indexOf('<section class="hero"');
  const start = html.indexOf(START);
  const ctaRowEnd = html.indexOf('</div>', html.indexOf('data-track="cta_hero_primary"', hero)) + '</div>'.length;
  const heroEnd = html.indexOf('</section>', html.indexOf('<!-- company-first-screen:end -->'));
  return {
    once: html.split(START).length === 2,
    insideHero: hero >= 0 && start > hero && html.slice(hero, start).indexOf('</section>') < 0,
    rightAfterCtaRow: ctaRowEnd > hero && html.slice(ctaRowEnd, start).trim() === '',
    // contain:inline-size keeps the <pre> from widening the flex hero on a phone
    contained: /<div id="start" data-section="first-screen" style="[^"]*contain:inline-size/.test(html),
    heroEnd,
  };
};

const unescape = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const text = html => unescape(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

/** The queries in the block's <pre>s, line numbers stripped. */
function codeBlocks(block) {
  return [...block.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)]
    .map(m => unescape(m[1].replace(/<span[^>]*>\d+<\/span>/g, '').replace(/<[^>]+>/g, '')));
}

function loadWindow(files) {
  const sb = { window: { challengesData: [] }, console: { log() {} } };
  vm.createContext(sb);
  for (const f of files) vm.runInContext(read(f), sb);
  return sb.window;
}

let block, win, db, debugItem;
beforeAll(() => {
  const a = PAGE.indexOf(START);
  const b = PAGE.indexOf(END);
  block = a >= 0 && b > a ? PAGE.slice(a, b) : '';
  win = loadWindow(['../src/data/neobank-data.js', '../src/data/debug-challenges.js']);
  debugItem = (win.debugChallengesData || []).find(c => c.id === DEBUG_ID);
  const ds = win.publicDatasetsData.finans_neobank;
  db = new Database(':memory:');
  for (const [name, t] of Object.entries(ds.tables)) {
    const types = t.columns.map((_, i) => { const s = t.data[0]?.[i]; return typeof s === 'number' ? (Number.isInteger(s) ? 'INTEGER' : 'REAL') : 'TEXT'; });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
});

// The ground truth, written independently of the page: total fees over the
// number of exchanges, per home currency.
const TRUTH = `SELECT u.home_currency AS home_currency,
                      ROUND(SUM(t.fee_gbp) / COUNT(*), 2) AS avg_fee_gbp,
                      COUNT(*) AS exchanges
               FROM transactions t JOIN users u USING (user_id)
               WHERE t.type = 'fx_exchange' AND t.status = 'completed'
               GROUP BY u.home_currency ORDER BY u.home_currency`;
const asMap = rows => new Map(rows.map(r => [r.home_currency, r.avg_fee_gbp]));

describe('the Wise first screen', () => {
  it('sits in the hero, once, right after the primary CTA row, ahead of the provenance note', () => {
    expect(block, 'no first-screen block on the Wise page').not.toBe('');
    for (const [rel, html] of [['src', PAGE], ['public', read('../public/wise-sql-interview/index.html')]]) {
      const p = heroPlacement(html);
      expect(p, rel).toMatchObject({ once: true, insideHero: true, rightAfterCtaRow: true, contained: true });
      expect(html.indexOf('<!-- company-provenance:start -->'), rel).toBeGreaterThan(p.heroEnd);
    }
  });

  it('every app link in the block carries src=company-wise, and the readiness link names wise', () => {
    const hrefs = [...block.matchAll(/href="([^"]+)"/g)].map(m => unescape(m[1]));
    const app = hrefs.filter(h => h.startsWith('/app/'));
    expect(app.length).toBe(2);
    for (const h of app) expect(new URL(h, 'https://x').searchParams.get('src'), h).toBe(DOOR);
    const rt = hrefs.find(h => h.startsWith('/sql-interview-readiness-test/'));
    const q = new URL(rt, 'https://x').searchParams;
    expect([q.get('company'), q.get('src')]).toEqual(['wise', DOOR]);
  });

  it('the first question is a free-tier, Wise-tagged Easy on the card ledger, named as the bank names it', () => {
    const f = facts(loadBank(), 'Wise');
    const c = f.ordered.find(x => x.id === FIRST_ID);
    expect(c, `#${FIRST_ID} is not tagged Wise`).toBeTruthy();
    expect(c.difficulty).toBe('Easy');
    expect(c.dataset).toBe('finans_fraud');
    expect(block).toContain(`<a href="/app/?challenge=${FIRST_ID}&amp;src=${DOOR}" data-track="cta_first_question" style="color:#c084fc;">${c.title}</a> (Easy)`);
  });

  // A1 REVISE on ceec172: the "Start with" line handed over #285's solution
  // path (join before you group, count people and payments apart). Founder's
  // rule 2026-10-05: say what a question measures, never how. And a page that
  // cites a dated report must not deny having one (FAQ, both copies).
  it('the "Start with" line says what #285 measures, never how to solve it', () => {
    const line = text(block.split('Start with:')[1].split('</p>')[0]);
    expect(line).toMatch(/joins and aggregation/);
    expect(line).not.toMatch(/\b(join before|before you group|GROUP BY|COUNT|separately)\b/i);
  });
  it('the FAQ no longer denies the dated source the page cites, in both copies', () => {
    expect(PAGE).not.toMatch(/we have no dated, citable source for them/);
    expect(PAGE.split('we have one dated report of a debug-a-query question').length).toBe(3);
  });
  it('the Pro line states the Hard count, the bank and the free tier through the helpers', () => {
    const f = facts(loadBank(), 'Wise');
    const t = text(block);
    expect(t).toContain(`the ${f.hard - f.previews} Hard challenges in the Wise set`);
    expect(f.bank).toBe(bankCountLabel(loadBank().byId.size));
    expect(t).toContain(`all ${f.bank} challenges without the stop at ${freeSolvesLabel()}`);
    expect(t).not.toMatch(/\$\d/); // never a price
  });

  it('the broken query runs and is wrong; the fix runs and equals the truth', () => {
    const [broken, fix] = codeBlocks(block);
    expect(broken && fix, 'two queries in the block').toBeTruthy();
    const truth = asMap(db.prepare(TRUTH).all());
    const got = q => asMap(db.prepare(q.replace(/;\s*$/, '')).all());
    expect(got(fix)).toEqual(truth);
    const wrong = got(broken);
    expect(wrong).not.toEqual(truth);
    const off = [...truth.keys()].filter(k => wrong.get(k) !== truth.get(k));
    expect(off.length).toBe(4);
    expect(truth.size).toBe(5);
    expect(text(block)).toContain('Four of the five are wrong');
  });

  it('every number in the explanation comes from the data', () => {
    const t = text(block);
    const [broken] = codeBlocks(block);
    const pln = db.prepare(TRUTH).all().find(r => r.home_currency === 'PLN');
    const plnWrong = db.prepare(broken.replace(/;\s*$/, '')).all().find(r => r.home_currency === 'PLN');
    expect(t).toContain(`PLN users made ${pln.exchanges} completed exchanges: the query says ${plnWrong.avg_fee_gbp.toFixed(2)}, the real average fee is ${pln.avg_fee_gbp.toFixed(2)}`);
    const users = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
    const ccy = db.prepare('SELECT COUNT(*) AS n FROM currencies').get().n;
    expect(t).toContain(`(${users} users, ${ccy} currencies)`);
    // "a user with ten": some user really made ten or more.
    const most = db.prepare("SELECT MAX(c) AS m FROM (SELECT COUNT(*) AS c FROM transactions WHERE type = 'fx_exchange' AND status = 'completed' GROUP BY user_id)").get().m;
    expect(t).toContain('as much as a user with ten');
    expect(most).toBeGreaterThanOrEqual(10);
    // The bug lines the copy names are the per-user grain.
    expect(broken.split('\n')[3]).toMatch(/t\.user_id, AVG\(t\.fee_gbp\)/);
    expect(broken.split('\n')[7]).toMatch(/GROUP BY u\.home_currency, t\.user_id/);
    expect(t).toContain('Lines 4 and 8');
  });

  it('links the app\'s Debug item with the same bug, says it is Hard and Pro, and the trap page it trains', () => {
    expect(debugItem, `Debug #${DEBUG_ID} missing`).toBeTruthy();
    expect(debugItem.bugNote).toMatch(/average of averages/i);
    expect(debugItem.difficulty).toBe('Hard');
    expect(block).toContain(`question ${DEBUG_ID} (Hard, Pro)`);
    expect(block).toContain('from our Debug set, not the Wise set');
    expect(block).toContain(`href="/${debugItem.trap}/"`);
    expect(block).toContain('href="/sql-debugging-practice/"');
  });

  it('is not a Revolut mock question (same ledger): no mock question touches fees', () => {
    const mocks = loadWindow(['../src/data/mock-interviews.js']).mockInterviewsData;
    const rv = mocks.find(m => m.id === 'revolut-analytics-screen');
    expect(rv).toBeTruthy();
    expect(JSON.stringify(rv.questions)).not.toMatch(/fee_gbp/);
  });

  it('the one interview line cites a fetched, dated source in the Wise dossier', () => {
    const dossier = read('../docs/reads/companies/wise.md');
    expect(dossier).toMatch(/\| W11 \| Dataford — Wise Data Analyst guide \| [^|]+ \| updated 2026-10-08 \|[^\n]*Apify 200/);
    expect(dossier).toMatch(/\*\*W11 \(a candidate line quoted by a prep guide\):\*\* given a SQL query, say\s+what is wrong with it/);
    expect(text(block)).toContain("Dataford's Wise Data Analyst guide, updated 8 Oct 2026, read 22 Nov 2026");
    // No format claim and no sources list (this is a general page).
    expect(block).not.toMatch(/Sources:/);
  });
});
