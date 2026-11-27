// The Stripe page's first screen and sourced section (C5, 2026-11-27).
//
// The page is hand-written (an older company page), so the first screen is
// written into src/stripe-sql-interview.html, not generated; the sourced
// rows come from SOURCED_FORMATS.stripe (src/data/company-interviews.js),
// built from docs/reads/companies/stripe.md. This file pins:
//   - every query the block shows runs on the card ledger, the broken one
//     gives the wrong number the copy says, the fix the right one, and a
//     second wrong answer (COUNT(*) on the dispute side) fails too;
//   - every number in the copy is what the data returns;
//   - every app link carries src=company-stripe; question 1 is in the Stripe
//     set and free to a cold visitor; the Pro line's counts come from the
//     page facts and helpers;
//   - the mock link names Pro, its free count is the mock's own, and the
//     copy never calls it Stripe's;
//   - the dossier's low-confidence facts (a platform, a length, the
//     privately reported reconciliation round) stay off the page.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import Database from 'better-sqlite3';
import { loadBank, facts } from '../scripts/build-company-pages.mjs';
import { SOURCED_FORMATS } from '../src/data/company-interviews.js';
import { freeSolvesLabel } from '../src/utils/display-count.js';
import { freePreviewCount } from '../src/utils/case-round.js';
import { isFreePreview } from '../src/utils/challenge-order.js';

const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const text = (html) => unescape(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const squash = (s) => String(s).replace(/;\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();

const PAGES = ['src/stripe-sql-interview.html', 'public/stripe-sql-interview/index.html'];
const block = (html) => {
  const at = html.indexOf('<section id="start" data-section="first-screen"');
  expect(at, 'first-screen section').toBeGreaterThan(0);
  return html.slice(at, html.indexOf('</div></section>', at) + '</div></section>'.length);
};
// The <pre> blocks as SQL, line-number spans removed.
const shownQueries = (html) => [...html.matchAll(/<pre class="fm"[^>]*>([\s\S]*?)<\/pre>/g)]
  .map(m => unescape(m[1].replace(/<span[^>]*>\d+<\/span>/g, '')));

let db, mocks, bank, f;
beforeAll(() => {
  const sb = { window: { publicDatasetsData: {} }, console: { log() {} } };
  vm.createContext(sb);
  vm.runInContext(read('src/data/finans-fraud-data.js'), sb);
  vm.runInContext(read('src/data/mock-interviews.js'), sb);
  mocks = sb.window.mockInterviewsData;
  const ds = sb.window.publicDatasetsData.finans_fraud;
  db = new Database(':memory:');
  // The app's loadDataset typing: the column type from the first row's value.
  for (const [name, t] of Object.entries(ds.tables)) {
    const types = t.columns.map((_, i) => { const v = t.data[0]?.[i]; return typeof v === 'number' ? (Number.isInteger(v) ? 'INTEGER' : 'REAL') : 'TEXT'; });
    db.exec(`CREATE TABLE ${name} (${t.columns.map((c, i) => `${c} ${types[i]}`).join(', ')})`);
    const ins = db.prepare(`INSERT INTO ${name} VALUES (${t.columns.map(() => '?').join(',')})`);
    db.transaction(rows => rows.forEach(r => ins.run(r)))(t.data);
  }
  bank = loadBank();
  f = facts(bank, 'Stripe');
});
const one = (sql) => db.prepare(sql.replace(/;\s*$/, '')).raw(true).all()[0][0];

describe('debug this query: every shown query runs, and the broken one is wrong', () => {
  it('the page shows exactly two queries, the broken one and the fix, and they are not the same', () => {
    for (const rel of PAGES) {
      const q = shownQueries(block(read(rel)));
      expect(q.length, rel).toBe(2);
      expect(squash(q[0])).not.toBe(squash(q[1]));
    }
  });

  it('the broken query answers 3.51, the fix 3.49, as the copy says', () => {
    const [broken, fix] = shownQueries(block(read(PAGES[0])));
    expect(one(broken)).toBe(3.51);
    expect(one(fix)).toBe(3.49);
    const t = text(block(read(PAGES[0])));
    expect(t).toContain('answers 3.51. Find the line.');
    expect(t).toContain('the answer is 3.49, not 3.51');
  });

  it('the line the copy names is the line the fix changes', () => {
    const [broken, fix] = shownQueries(block(read(PAGES[0]))).map(q => q.split('\n'));
    const changed = broken.map((l, i) => (l === fix[i] ? 0 : i + 1)).filter(Boolean);
    expect(changed).toEqual([4]);
    expect(text(block(read(PAGES[0])))).toContain('Line 4: BETWEEN with a bare end date.');
  });

  it('another wrong answer fails too: COUNT(*) on the dispute side counts every transaction', () => {
    const [, fix] = shownQueries(block(read(PAGES[0])));
    const wrong = fix.replace('COUNT(c.chargeback_id)', 'COUNT(*)');
    expect(wrong).not.toBe(fix);
    expect(one(wrong)).not.toBe(one(fix));
  });

  it('every number in the copy is what the ledger returns', () => {
    const t = text(block(read(PAGES[0])));
    const april = "t.txn_at >= '2026-04-01' AND t.txn_at < '2026-05-01'";
    const last = "t.txn_at >= '2026-04-30' AND t.txn_at < '2026-05-01'";
    const n = (where, col = 't.txn_id') => one(`SELECT COUNT(${col}) FROM transactions t LEFT JOIN chargebacks c ON c.txn_id = t.txn_id WHERE ${where}`);
    expect(n(april)).toBe(1119);
    expect(n(april, 'c.chargeback_id')).toBe(39);
    expect(n(last)).toBe(35);
    expect(n(last, 'c.chargeback_id')).toBe(1);
    // A transaction has at most one chargeback, so the rate is per transaction.
    expect(one('SELECT COUNT(*) - COUNT(DISTINCT txn_id) FROM chargebacks')).toBe(0);
    expect(t).toContain('April has 1,119 transactions and 39 of them were disputed');
    expect(t).toContain('the 35 transactions made later that day drop out, one of them disputed');
  });

  it('is not any mock question\'s query', () => {
    const theirs = mocks.flatMap(m => (m.questions || []).flatMap(q => [...(q.codeSnippets || []).map(s => s.sql), q.verify?.sql, q.solution]))
      .filter(Boolean).map(squash);
    for (const mine of shownQueries(block(read(PAGES[0])))) expect(theirs).not.toContain(squash(mine));
  });

  it('the trap page it links to exists', () => {
    expect(block(read(PAGES[0]))).toContain('href="/sql-between-timestamp/"');
    expect(fs.existsSync(new URL('../public/sql-between-timestamp/index.html', import.meta.url))).toBe(true);
  });
});

describe('the first screen', () => {
  it('sits under the hero and the provenance note, above the sourced section, on the committed and built page', () => {
    for (const rel of PAGES) {
      const html = read(rel);
      const heroEnd = html.indexOf('</section>', html.indexOf('<section class="hero"'));
      const prov = html.indexOf('<!-- company-provenance:end -->');
      const start = html.indexOf('<section id="start" data-section="first-screen"');
      const format = html.indexOf('<section id="format" data-section="format-sourced"');
      expect(prov, rel).toBeGreaterThan(heroEnd);
      expect(start, rel).toBeGreaterThan(prov);
      expect(format, rel).toBeGreaterThan(start);
      expect(html.slice(prov, start).replace('<!-- company-provenance:end -->', '').trim(), rel).toBe('');
    }
  });

  it('every app link carries src=company-stripe', () => {
    for (const rel of PAGES) {
      const links = [...block(read(rel)).matchAll(/href="(\/app\/[^"]*)"/g)].map(m => m[1]);
      expect(links.length, rel).toBe(4);
      for (const h of links) expect(h, `${rel}: ${h}`).toMatch(/[?;]src=company-stripe(&|$)/);
    }
    expect(block(read(PAGES[0]))).toContain('href="/sql-interview-readiness-test/?company=stripe&amp;src=company-stripe"');
  });

  it('question 1 is challenge 280: in the Stripe set, Medium, free to a cold visitor, titled as the bank titles it', () => {
    const c = f.ordered.find(x => x.id === 280);
    expect(c, '280 is tagged Stripe').toBeTruthy();
    expect(c.difficulty).toBe('Medium');
    const t = text(block(read(PAGES[0])));
    expect(t).toContain(`Start with: ${c.title} (Medium, free)`);
    expect(block(read(PAGES[0]))).toContain('href="/app/?challenge=280&amp;src=company-stripe"');
    // The set link's own first question, as the hero names it.
    expect(t).toContain(`opens on ${f.first.title} (${f.first.difficulty})`);
  });

  it('330 is named Pro, and is: tagged Stripe, Hard, not a free preview', () => {
    const c = f.ordered.find(x => x.id === 330);
    expect(c, '330 is tagged Stripe').toBeTruthy();
    expect(c.difficulty).toBe('Hard');
    expect(isFreePreview(c)).toBe(false);
    expect(text(block(read(PAGES[0])))).toContain('a two-partner payment reconciliation (Hard, Pro)');
  });

  it('the Pro line counts come from the page facts and helpers, never a price', () => {
    const t = text(block(read(PAGES[0])));
    expect(t).toContain(`the ${f.hard - f.previews} Hard questions in this set past the free previews`);
    expect(t).toContain(`all ${f.bank} questions without the stop at ${freeSolvesLabel()}`);
    expect(t).not.toMatch(/\$\d|unlimited|most[- ]asked/i);
  });

  it('the mock link: the case round, its own free count, labelled Pro, called ours', () => {
    const mock = mocks.find(m => m.id === 'metrics-case-round');
    expect(mock).toBeTruthy();
    const html = block(read(PAGES[0]));
    const m = html.match(/<a href="\/app\/\?interview=metrics-case-round&amp;src=company-stripe"[^>]*>([^<]*)<\/a>/);
    expect(m, 'mock link').toBeTruthy();
    expect(unescape(m[1])).toContain(`first ${freePreviewCount(mock)} questions free, the rest is Pro`);
    expect(text(html)).toContain("It is our mock, not Stripe's.");
    expect(text(html)).not.toMatch(/Stripe's (own )?(mock|question)/);
  });

  it('the frame cites a source the sourced section carries', () => {
    const [, url] = SOURCED_FORMATS.stripe.sources['iq-da-st'];
    expect(block(read(PAGES[0]))).toContain(`href="${url}"`);
    expect(read(PAGES[0])).toContain('id="src-iq-da-st"');
  });
});

describe('the sourced section stays inside the dossier', () => {
  const d = () => SOURCED_FORMATS.stripe;
  it('every row but "Not stated here" cites a source on the page', () => {
    for (const [label, , keys] of d().format) {
      if (label === 'Not stated here') { expect(keys).toEqual([]); continue; }
      expect(keys.length, label).toBeGreaterThan(0);
      for (const k of keys) expect(d().sources[k], `${label}: ${k}`).toBeTruthy();
    }
  });

  it('carries none of the low-confidence facts: no platform, no length, no reconciliation round', () => {
    for (const rel of PAGES) {
      const html = read(rel);
      const fmt = html.slice(html.indexOf('<!-- company-format:start -->'), html.indexOf('<!-- company-format:end -->'));
      expect(fmt.length, rel).toBeGreaterThan(0);
      expect(fmt, rel).not.toMatch(/HackerRank|CoderPad|\b\d+[- ]min|reconcil|bug squash/i);
      expect(text(html), rel).not.toMatch(/reconciliation round/i);
    }
  });

  it('the page no longer says it has no source', () => {
    for (const rel of PAGES) {
      const t = text(read(rel));
      expect(t, rel).not.toMatch(/we have no dated (public|, citable) source/);
      expect(t, rel).toContain('How the interview runs (sourced)');
    }
  });
});
