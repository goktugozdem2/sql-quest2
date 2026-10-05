// The founder's review of 2026-10-05, pinned. Six items:
//   1. challenge cards gave the solution away ("DENSE_RANK inside PARTITION BY…")
//   2. the dialect was not said
//   3. our own comparison table showed our weakest row
//   4. /app spoke of play and boss battles; the demo goal was "Fundamentals"
//   5. Capital One's numbers (frozen page — on 2026-10-12)
//   6. a Pro mock button that did not say Pro
// Capital One is frozen until its 10-12 read; its items are in
// docs/plans/capital-one-2026-10-12.md and FROZEN below lists it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadQuestionBank } from '../scripts/question-slugs.mjs';
import { FROZEN, BLURB_PREFIX, blurbFor, companyPages } from '../scripts/card-skill-blurbs.mjs';
import { DIALECTS, DIALECT_ROWS, DIALECT_SENTENCE } from '../src/utils/dialect-notes.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { bank } = loadQuestionBank();
const byId = new Map(bank.map(c => [c.id, c]));
const METHOD = /\b(DENSE_RANK|ROW_NUMBER|NTILE|PERCENT_RANK|PARTITION BY|OVER\s*\(|LAG|LEAD|strftime|julianday|GROUP BY|JOIN|HAVING|COALESCE|CASE WHEN|EXISTS|NOT IN|IS NULL|SUM\(|COUNT\(|AVG\(|ROUND\(|ORDER BY|WHERE|UNION|ROWS BETWEEN|RANGE BETWEEN|scalar subquery|anti-join)\b/;
const cardsOf = html => [...html.matchAll(/<a href="\/app\/\?[^"]*challenge=(\d+)"[^>]*>([\s\S]*?)<\/a>/g)]
  .map(m => ({ id: Number(m[1]), blurb: ([...m[2].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(x => x[1].replace(/<[^>]+>/g, ''))[1] || '') }));

describe('1 — a card says what a question measures, never how to solve it', () => {
  it('no card blurb on a company page names a solution method (Capital One frozen until 10-12)', () => {
    const bad = [];
    for (const f of companyPages()) {
      if (FROZEN.has(f)) continue;
      for (const c of cardsOf(read(`src/${f}`))) if (METHOD.test(c.blurb)) bad.push(`${f} #${c.id}: ${c.blurb.slice(0, 80)}`);
    }
    expect(bad).toEqual([]);
  });

  it('every rewritten blurb is the skills line from the bank', () => {
    let n = 0;
    for (const f of companyPages()) {
      if (FROZEN.has(f)) continue;
      for (const c of cardsOf(read(`src/${f}`))) {
        if (!c.blurb.startsWith(BLURB_PREFIX)) continue;
        expect(c.blurb, `${f} #${c.id}`).toBe(blurbFor(byId.get(c.id)));
        n++;
      }
    }
    expect(n).toBeGreaterThanOrEqual(60);
  });

  it('only Capital One is frozen, and its 10-12 plan carries the change', () => {
    expect([...FROZEN]).toEqual(['capital-one-sql-interview.html']);
    expect(read('docs/plans/capital-one-2026-10-12.md')).toMatch(/node scripts\/card-skill-blurbs\.mjs/);
  });
});

describe('2 — the dialect is said', () => {
  it('one table, four engines, every row runnable-looking and complete', () => {
    expect(DIALECTS).toEqual(['SQLite (here)', 'PostgreSQL', 'MySQL', 'Snowflake']);
    for (const r of DIALECT_ROWS) expect(r.cells, r.what).toHaveLength(4);
    expect(DIALECT_ROWS.map(r => r.cells[0]).join(' ')).toMatch(/strftime/);
    expect(DIALECT_ROWS.map(r => r.cells[0]).join(' ')).toMatch(/julianday/);
  });

  it('the app renders it on every challenge, and every company page but the frozen one says it', () => {
    const app = read('src/app.jsx');
    expect(app).toContain('data-testid="dialect-notes"');
    expect(app).toContain('{DIALECT_ROWS.map(r => (');
    for (const f of companyPages()) {
      if (FROZEN.has(f)) continue;
      const html = read(`src/${f}`);
      expect(html, f).toContain('data-dialect="note"');
      expect(html, f).toContain(DIALECT_SENTENCE.replace(/'/g, '&#39;').slice(0, 40).replace(/&#39;/g, "'").slice(0, 30));
    }
  });
});

describe('3 — our own table does not show our weakest row', () => {
  it('the homepage comparison has no "Free tier" row', () => {
    const home = read('src/index.html');
    const table = home.slice(home.indexOf('<table class="cmp-tab">'), home.indexOf('</table>', home.indexOf('<table class="cmp-tab">')));
    expect(table).not.toMatch(/>Free tier</);
    expect(table).not.toMatch(/10 free solves/);
  });
});

describe('4 — one story: interview practice', () => {
  it('/app’s title and share text say interview practice, never play, gamified or boss battles', () => {
    const html = read('src/app.html');
    const head = html.slice(0, html.indexOf('</head>')).replace(/<!--[\s\S]*?-->/g, '');
    expect(head).not.toMatch(/Through Play|gamified|boss battle|30-day/i);
    for (const tag of ['<title>', 'og:title', 'twitter:title']) expect(head.slice(head.indexOf(tag), head.indexOf(tag) + 160)).toMatch(/SQL Interview Practice/);
    expect(head).toMatch(/<meta name="description" content="Practise for the SQL interview/);
  });

  it('the homepage demo shows the interview goal with its real step count', () => {
    const home = read('src/index.html');
    expect(home).not.toContain('<div class="cm-htitle">SQL Fundamentals Mastery</div>');
    expect(home).toContain('<div class="cm-htitle">SQL Interview Prep · screen in 9 days</div>');
    const goals = read('src/data/goals.js');
    const block = goals.slice(goals.indexOf("id: 'interview-prep'"));
    const curriculum = block.slice(block.indexOf('curriculum:'), block.indexOf('exitCriteria'));
    const steps = (curriculum.match(/\bid: '/g) || []).length;
    expect(home).toContain(`<span>Step 16 of ${steps}</span>`);
  });
});

describe('6 — a Pro button says Pro', () => {
  it('every mock link on a company page (but the frozen one) is labelled Pro', () => {
    const bad = [];
    for (const f of companyPages()) {
      if (FROZEN.has(f)) continue;
      for (const m of read(`src/${f}`).matchAll(/<a [^>]*href="\/app\/\?interview=[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) {
        if (!/\bPro\b/.test(m[1])) bad.push(`${f}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
