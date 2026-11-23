// The topic-learn pilot (2026-11-23): /challenges/window-functions/ and
// /challenges/cte/ get "Learn it in 3 minutes" → "Now try it" → "The next
// step" above their challenge lists; the seven other hand-written topic pages
// are the comparison group. Generator: scripts/build-topic-learn.mjs, content:
// src/data/topic-learn.js. Ledger: "learn → practice → next step on two topic
// pages (pilot)".
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { loadQuestionBank, questionSlugs } from '../scripts/question-slugs.mjs';
import { collectBankFacts } from '../scripts/build-llms-txt.js';
import { renderLearnBlock, START, END, SDK_URL } from '../scripts/build-topic-learn.mjs';
import { PRACTICE_IT, practiceItLine } from '../scripts/inject-blog-practice.mjs';
import { TOPIC_LEARN } from '../src/data/topic-learn.js';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';
import { makeChallengeComparator, isFreePreview } from '../src/utils/challenge-order.js';
import { SQL_ROADMAP_CHALLENGE_ORDER } from '../src/data/roadmap-stages.js';
import { freeTierSentence, freeSolvesLabel, bankCountLabel } from '../src/utils/display-count.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const PILOT = ['window-functions', 'cte'];
// The comparison group: the hand-written topic pages left as they are. The two
// generated ones (ranking-functions, advanced) are rebuilt from the bank and
// sit outside both groups.
const CONTROL = ['joins', 'aggregation', 'case-when', 'subqueries', 'null-handling', 'date-functions', 'string-functions'];
const EVENTS = ['learn_example_run', 'learn_ladder_click', 'learn_next_step'];

let bank, tags, qslugs, bankCount;
const page = {};
const block = {};
const sectionOf = (html, id) => {
  const open = html.indexOf(`id="${id}"`);
  if (open < 0) return '';
  return html.slice(open, html.indexOf('</section>', open));
};

beforeAll(() => {
  ({ bank, tags } = loadQuestionBank());
  qslugs = questionSlugs(bank);
  bankCount = collectBankFacts(ROOT).challengeCount;
  for (const slug of PILOT) {
    page[slug] = read(`src/challenges/${slug}.html`);
    const a = page[slug].indexOf(START);
    const b = page[slug].indexOf(END);
    block[slug] = a >= 0 && b > a ? page[slug].slice(a, b + END.length) : '';
  }
});

describe('both pilot pages carry all three blocks', () => {
  it.each(PILOT)('%s: learn, ladder, next step — and the committed page is the generator\'s output', slug => {
    expect(block[slug], `${slug} has no topic-learn block`).not.toBe('');
    expect(block[slug]).toBe(renderLearnBlock(slug, bank, qslugs, tags, bankCount));
    const learn = sectionOf(block[slug], 'learn');
    expect(learn).toContain('Learn it in 3 minutes');
    expect(learn).toMatch(/<h3>The syntax<\/h3>\s*<pre>/);
    expect(learn).toContain('<h3>A worked example</h3>');
    expect((learn.match(/class="tl-table"/g) || []).length, 'the table and the result').toBeGreaterThanOrEqual(2);
    expect(learn).toMatch(/<h3>A common mistake: /);
    expect(learn).toContain(`href="${TOPIC_LEARN[slug].mistake.link.href}"`);
    const ladder = sectionOf(block[slug], 'practice-ladder');
    expect(ladder).toContain('Now try it');
    expect((ladder.match(/data-ladder-step="/g) || []).length).toBe(3);
    const next = sectionOf(block[slug], 'next-step');
    for (const k of ['readiness', 'companies', 'free-tier']) expect(next, `next step "${k}"`).toContain(`data-next="${k}"`);
    expect(next).toContain('href="/sql-interview-readiness-test/"');
  });

  it.each(PILOT)('%s: the blocks sit above every existing challenge list', slug => {
    const firstCard = page[slug].indexOf('<div class="q-card">');
    expect(firstCard).toBeGreaterThan(0);
    expect(page[slug].indexOf(END)).toBeLessThan(firstCard);
  });

  it.each(PILOT)('%s: exactly one accent CTA, and the accent nowhere else', slug => {
    expect((block[slug].match(/class="tl-cta[ "]/g) || []).length).toBe(1);
    // #FFE34D is declared once, as the token, and used only by .tl-cta.
    expect((block[slug].match(/#FFE34D/gi) || []).length).toBe(1);
    expect((block[slug].match(/var\(--tl-accent\)/g) || []).length).toBe(1);
    expect(block[slug]).toMatch(/\.tl-cta\{[^}]*background:var\(--tl-accent\)/);
  });

  it.each(PILOT)('%s: the three events, and only those, are on the new blocks', slug => {
    const names = [...block[slug].matchAll(/data-track="([^"]+)"/g)].map(m => m[1]);
    for (const e of EVENTS) expect(names, e).toContain(e);
    expect(names.filter(n => !EVENTS.includes(n))).toEqual([]);
    // src/track.js sends any [data-track] click with reason 'landing'; the
    // names must be plain snake_case to be read in pro_events.
    for (const n of names) expect(n).toMatch(/^[a-z][a-z_]*$/);
    expect(read('src/track.js')).toMatch(/closest\('\[data-track\]'\)/);
  });

  it.each(PILOT)('%s: the runnable box loads nothing until it is used, from the app\'s own sql.js build', slug => {
    expect(page[slug]).not.toMatch(/<script[^>]+src="[^"]*sql-wasm/);
    expect(read('src/app.jsx')).toContain(SDK_URL.replace(/sql-wasm\.js$/, ''));
    expect(block[slug]).toMatch(/open\.addEventListener\('click'[\s\S]*sdk\(\)/);
    expect(block[slug]).toContain('data-tl-reset');
  });
});

describe('the worked examples return what the page shows', () => {
  it.each(PILOT)('%s: query and the mistake\'s fix, run in SQLite', slug => {
    const L = TOPIC_LEARN[slug];
    const run = sql => {
      const db = new Database(':memory:');
      db.exec(L.setup);
      const st = db.prepare(sql);
      const out = { columns: st.columns().map(c => c.name), rows: st.raw().all() };
      db.close();
      return out;
    };
    const db = new Database(':memory:');
    db.exec(L.setup);
    expect(db.prepare(`SELECT * FROM ${L.table}`).raw().all()).toEqual(L.tableRows);
    db.close();
    expect(run(L.query)).toEqual({ columns: L.columns, rows: L.rows });
    if (L.mistake.fix) expect(run(L.mistake.fix)).toEqual({ columns: L.mistake.fixColumns, rows: L.mistake.fixRows });
  });
});

describe('the ladder: real bank challenges, the skill, curriculum order, Hard never linked as free', () => {
  // Re-stated here, not imported from the generator, so the test does not
  // certify the generator with its own predicate.
  const skillOf = {
    'window-functions': c => challengeMatchesSkill(c, 'Window Functions'),
    cte: c => /\bWITH\b/i.test(String(c.solution || '')) && challengeMatchesSkill(c, 'Subqueries & CTEs'),
  };
  const stepsOf = slug => [...sectionOf(block[slug], 'practice-ladder').matchAll(/<li class="tl-step" data-ladder-step="(\w+)" data-challenge-id="(\d+)">([\s\S]*?)<\/li>/g)]
    .map(m => ({ diff: m[1], id: Number(m[2]), html: m[3] }));

  it.each(PILOT)('%s: Easy → Medium → Hard, each the first of its difficulty in curriculum order', slug => {
    const steps = stepsOf(slug);
    expect(steps.map(s => s.diff)).toEqual(['easy', 'medium', 'hard']);
    const byId = new Map(bank.map(c => [c.id, c]));
    for (const s of steps) {
      const c = byId.get(s.id);
      expect(c, `challenge ${s.id} is not in the bank`).toBeTruthy();
      expect(c.difficulty.toLowerCase()).toBe(s.diff);
      expect(skillOf[slug](c), `challenge ${s.id} does not teach ${slug}`).toBe(true);
      const pool = bank.filter(x => skillOf[slug](x) && x.difficulty === c.difficulty);
      const want = pool.sort(makeChallengeComparator(SQL_ROADMAP_CHALLENGE_ORDER, { previewsFirst: c.difficulty === 'Hard' }))[0];
      expect(s.id, `${slug} ${s.diff}: curriculum order picks ${want.id}`).toBe(want.id);
      expect(s.html).toContain(`>${c.difficulty}</span>`);
    }
  });

  it.each(PILOT)('%s: a playable step deep-links the app with its source; a Pro step says Pro and never does', slug => {
    const byId = new Map(bank.map(c => [c.id, c]));
    for (const s of stepsOf(slug)) {
      const c = byId.get(s.id);
      const pro = c.difficulty === 'Hard' && !isFreePreview(c);
      const label = pro ? 'Pro' : isFreePreview(c) ? 'Free preview' : 'Free';
      expect(s.html).toContain(`<span class="tag ${pro ? 'pro' : 'free'}">${label}</span>`);
      const links = [...s.html.matchAll(/\?challenge=(\d+)/g)].map(m => Number(m[1]));
      if (pro) expect(links, `Pro step ${s.id} is linked as if free`).toEqual([]);
      else {
        expect(links).toEqual([s.id]);
        expect(s.html).toContain(`/app/?challenge=${s.id}&amp;src=topic-learn-${slug}"`);
      }
      expect(s.html).toContain('data-track="learn_ladder_click"');
    }
  });
});

describe('no reference solution of a bank challenge appears on the page', () => {
  const norm = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ').toLowerCase().replace(/;\s*$/, '').replace(/\s+/g, ' ').trim();
  it.each(PILOT)('%s: neither in the page nor as an example query', slug => {
    const text = norm(page[slug]);
    const L = TOPIC_LEARN[slug];
    const examples = [L.query, L.mistake.fix].filter(Boolean).map(norm);
    const hits = [];
    for (const c of bank) {
      const sol = norm(c.solution || '');
      if (sol.length < 40) continue;
      if (text.includes(sol)) hits.push(`${c.id} on the page`);
      if (examples.includes(sol)) hits.push(`${c.id} as an example`);
    }
    expect(hits).toEqual([]);
  });
});

describe('the counts come from the helpers', () => {
  it.each(PILOT)('%s: the free tier is said the gate\'s way, the bank as its rounded label', slug => {
    const next = sectionOf(block[slug], 'next-step');
    expect(next).toContain(freeTierSentence(bankCount));
    expect(next).toContain(freeSolvesLabel());
    expect(next).toContain(`Pro opens all ${bankCountLabel(bankCount)}`);
    // No other number of challenges in the new blocks: the exact bank total
    // never, and no "N free" but the quota.
    const visible = block[slug].replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
    expect(visible).not.toMatch(new RegExp(`\\b${bankCount}\\b`));
    const frees = [...visible.matchAll(/\b(\d+) free\b/gi)].map(m => Number(m[1]));
    expect(frees.every(n => freeSolvesLabel().startsWith(`${n} free`))).toBe(true);
  });

  it.each(PILOT)('%s: no FAQ added; the page\'s JSON-LD still parses', slug => {
    expect(block[slug]).not.toMatch(/FAQPage|application\/ld\+json/);
    const ld = [...page[slug].matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(ld.length).toBeGreaterThan(0);
    for (const m of ld) expect(() => JSON.parse(m[1])).not.toThrow();
  });
});

describe('the comparison group is untouched', () => {
  it.each(CONTROL)('%s carries none of the pilot', slug => {
    const html = read(`src/challenges/${slug}.html`);
    expect(html).not.toContain(START);
    expect(html).not.toMatch(/id="(?:learn|practice-ladder|next-step)"/);
    expect(html).not.toMatch(/data-track="learn_/);
    expect(html).not.toContain('src=topic-learn-');
  });
});

describe('the two tutorials link the upgraded pages as "Practice it"', () => {
  it.each(Object.entries(PRACTICE_IT))('%s', (post, target) => {
    const html = read(`src/blog/${post}.html`);
    const box = html.slice(html.indexOf('<!-- blog-practice:start -->'), html.indexOf('<!-- blog-practice:end -->'));
    expect(box).toContain(practiceItLine(target));
    expect(target[0]).toMatch(new RegExp(`^/challenges/(?:${PILOT.join('|')})/#learn$`));
  });
});
