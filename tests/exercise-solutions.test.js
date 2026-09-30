// /sql-exercises/ — "SQL exercises with solutions" and the per-topic trap
// lines (2026-09-30; docs/plans/seo-october-2026-09-29.md §1,
// docs/plans/bing-growth-2026-09-30.md lever 1).
//
// The page carries 64% of our Bing clicks and its title has promised "With
// Solutions" since 09-07. It now shows five. What must never drift:
//
//   - exactly five worked exercises, one per kind (filter/sort, GROUP BY +
//     HAVING, JOIN, CTE, window function);
//   - none is Hard (a Hard solution is what Pro sells), none is a sector
//     challenge, none is from the Revolut set (300–311) or tagged for a
//     signed archetype member (a set authored for that company), none is a
//     query a mock interview asks for;
//   - the query ON THE PAGE — read back out of the committed HTML, not out of
//     the generator — runs on the challenge's dataset and returns exactly the
//     rows the bank's reference solution returns, and is that solution token
//     for token;
//   - no hint text, and no other challenge's solution, in the section;
//   - the committed page is what the generator produces today;
//   - the question pages still publish no solution (tests/question-pages.test.js
//     owns that; this section is the one exception, and only for these five);
//   - the nine topic lines match the #by-topic grid and link the five trap
//     pages, once each;
//   - the meta description says "with solutions" in 120–170 characters with
//     no free count; the title is left to tests/snippet-length.test.js.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import {
  SOLVED_EXERCISES, KINDS, TOPIC_TRAPS, APP_SRC, PAGE,
  loadContext, publishProblems, displayedSql, renderPage, renderSolutions, squash,
} from '../scripts/build-exercise-solutions.mjs';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILT = path.join(ROOT, 'public/sql-exercises/index.html');
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const textOf = html => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const between = (html, name) => {
  const a = html.indexOf(`<!-- ${name}:start -->`);
  const b = html.indexOf(`<!-- ${name}:end -->`);
  expect(a, `${name}:start`).toBeGreaterThan(-1);
  expect(b, `${name}:end`).toBeGreaterThan(a);
  return html.slice(a, b);
};

/** The cards as the PAGE has them: [{ id, kind, html, sql }]. */
export function cardsOf(html) {
  const section = between(html, 'solutions');
  return [...section.matchAll(/<article class="sol" data-solution="(\d+)" data-kind="([^"]+)">([\s\S]*?)<\/article>/g)].map(m => {
    const pre = /<pre class="qe"><code>([\s\S]*?)<\/code><\/pre>/.exec(m[3]);
    return { id: Number(m[1]), kind: m[2], html: m[3], sql: pre ? decode(pre[1].replace(/<[^>]+>/g, '')) : null };
  });
}

let cx; let page; let cards;
const byId = id => cx.bank.find(c => c.id === id);
const dbs = {};
// The app's loadDataset typing: a column's type comes from the first row's value.
function dbFor(key) {
  if (dbs[key]) return dbs[key];
  const db = new Database(':memory:');
  for (const [name, t] of Object.entries(cx.datasets[key].tables)) {
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
  cx = loadContext();
  page = fs.readFileSync(PAGE, 'utf8');
  cards = cardsOf(page);
});

describe('the section', () => {
  it('has exactly five exercises, one per kind, in the registry\'s order', () => {
    expect(SOLVED_EXERCISES).toHaveLength(5);
    expect(SOLVED_EXERCISES.map(s => s.kind)).toEqual(KINDS);
    expect(new Set(SOLVED_EXERCISES.map(s => s.id)).size).toBe(5);
    expect(cards).toHaveLength(5);
    expect(cards.map(c => c.id)).toEqual(SOLVED_EXERCISES.map(s => s.id));
    expect(cards.map(c => c.kind)).toEqual(KINDS);
    expect((between(page, 'solutions').match(/<pre/g) || []).length).toBe(5);
  });

  it('sits under the H2 "SQL exercises with solutions", above the long lists', () => {
    const at = s => { const i = page.indexOf(s); expect(i, s).toBeGreaterThan(-1); return i; };
    const section = at('<section id="solutions">');
    expect(between(page, 'solutions')).toMatch(/<h2[^>]*>SQL exercises with solutions<\/h2>/);
    expect(section).toBeGreaterThan(at('<section class="hero">'));
    for (const later of ['<section id="slices"', '<section id="by-topic">', '<section id="by-difficulty">', '<section id="sample">', '<section id="faq"']) {
      expect(section, later).toBeLessThan(at(later));
    }
  });

  it('each exercise uses what its kind names', () => {
    const must = {
      'filter-sort': [/\bWHERE\b/i, /\bORDER BY\b/i],
      'group-having': [/\bGROUP BY\b/i, /\bHAVING\b/i],
      join: [/\bJOIN\b/i],
      cte: [/^\s*WITH\b/i],
      window: [/\bOVER\s*\(/i],
    };
    for (const c of cards) for (const re of must[c.kind]) expect(c.sql, `#${c.id} ${c.kind}`).toMatch(re);
  });
});

describe('what may be published', () => {
  it('every exercise is Easy or Medium, a core challenge on a classic dataset, in no company-authored set and no mock', () => {
    for (const s of SOLVED_EXERCISES) {
      const c = byId(s.id);
      expect(publishProblems(c, cx), `#${s.id}`).toEqual([]);
      expect(['Easy', 'Medium'], `#${s.id}`).toContain(c.difficulty);
      expect(s.id < 300 || s.id > 311, `#${s.id}`).toBe(true);
      expect(['titanic', 'movies', 'employees', 'ecommerce'], `#${s.id}`).toContain(c.dataset);
      for (const company of ['Capital One', 'Revolut']) expect(cx.tags[s.id] || [], `#${s.id}`).not.toContain(company);
    }
  });

  it('the rule refuses what it should: a Hard, the Revolut set, a sector challenge, an archetype company\'s tag, a mock answer', () => {
    const ok = byId(SOLVED_EXERCISES[0].id);
    const why = (c, over = {}) => publishProblems(c, { ...cx, ...over }).join(' | ');
    expect(why(cx.bank.find(c => c.difficulty === 'Hard' && cx.datasets[c.dataset]))).toMatch(/difficulty is Hard/);
    expect(why(byId(300))).toMatch(/Revolut set/);
    expect(why(cx.bank.find(c => cx.sectorIds.has(c.id) && c.difficulty === 'Easy'))).toMatch(/sector-track/);
    expect(why(ok, { tags: { ...cx.tags, [ok.id]: ['Snowflake', 'capital one'] } })).toMatch(/company-authored set \(capital one\)/);
    expect(why(ok, { mockSolutions: [`${ok.solution.replace(/ /g, '\n  ')};`] })).toMatch(/mock interview answer/);
    expect(why(undefined)).toMatch(/not in the bank/);
    // …and the generator will not write a page that breaks it.
    expect(() => renderSolutions({ ...cx, tags: { ...cx.tags, [ok.id]: ['Revolut'] } })).toThrow(/cannot be published/);
  });

  it('the mock bank was really read (or the mock rule guards nothing)', () => {
    expect(cx.mockSolutions.length).toBeGreaterThan(20);
    expect(cx.sectorIds.size).toBeGreaterThan(50);
  });

  it('shows no hint text and no other challenge\'s solution', () => {
    const section = squash(textOf(between(page, 'solutions')));
    for (const s of SOLVED_EXERCISES) {
      const hint = squash(byId(s.id).hint);
      expect(hint.length, `#${s.id} hint`).toBeGreaterThan(20);
      expect(section.includes(hint), `#${s.id}'s hint is on the page`).toBe(false);
    }
    const shown = new Set(SOLVED_EXERCISES.map(s => s.id));
    const mine = SOLVED_EXERCISES.map(s => squash(byId(s.id).solution));
    const leaks = cx.bank.filter(c => !shown.has(c.id)).filter(c => {
      const sol = squash(c.solution);
      // A challenge whose query is identical to (or a prefix of) a shown one is
      // not a second leak; anything else that appears in full is.
      return sol.length >= 40 && section.includes(sol) && !mine.some(m => m.includes(sol));
    }).map(c => c.id);
    expect(leaks).toEqual([]);
  });
});

describe('every displayed query runs and matches the bank', () => {
  for (const spec of SOLVED_EXERCISES) {
    it(`#${spec.id} (${spec.kind})`, () => {
      const c = byId(spec.id);
      const card = cards.find(k => k.id === spec.id);
      expect(card?.sql, 'a <pre><code> query on the page').toBeTruthy();
      // token for token the reference solution — the layout adds whitespace only
      expect(squash(card.sql)).toBe(squash(c.solution));
      expect(card.sql).toBe(displayedSql(c));
      const shown = run(c.dataset, card.sql);
      const ref = run(c.dataset, c.solution);
      expect(ref.rows.length, 'the reference solution returns rows').toBeGreaterThan(0);
      expect(shown.columns).toEqual(ref.columns);
      expect(shown.rows).toEqual(ref.rows);
      // the tables line names the challenge's own tables, with the dataset's columns
      for (const t of c.tables) {
        expect(squash(textOf(card.html))).toContain(squash(`${t}(${cx.datasets[c.dataset].tables[t].columns.join(', ')})`));
      }
    });
  }
});

describe('links', () => {
  it('each exercise links its question page and the app, and both exist', () => {
    for (const card of cards) {
      const slug = cx.slugs.get(card.id);
      expect(card.html, `#${card.id}`).toContain(`href="/questions/${slug}/"`);
      expect(card.html, `#${card.id}`).toContain(`href="/app/?challenge=${card.id}&amp;src=${APP_SRC}"`);
      expect(card.html).not.toContain('/app.html');
      const built = path.join(ROOT, 'public/questions', slug, 'index.html');
      if (fs.existsSync(path.join(ROOT, 'public/questions'))) expect(fs.existsSync(built), built).toBe(true);
    }
    expect(APP_SRC).toBe('sql-exercises-solutions');
  });
});

describe('the per-topic trap lines', () => {
  const grid = () => {
    const a = page.indexOf('<section id="by-topic">');
    return page.slice(a, page.indexOf('<!-- topic-traps:start -->'));
  };

  it('one line per topic of the #by-topic grid, in the grid\'s order', () => {
    const topics = [...grid().matchAll(/<a href="(\/challenges\/[a-z-]+\/)" data-track="cta_topic"/g)].map(m => m[1]);
    expect(topics).toHaveLength(9);
    expect(TOPIC_TRAPS.map(t => t[0])).toEqual(topics);
    const block = between(page, 'topic-traps');
    expect((block.match(/<li /g) || []).length).toBe(9);
    for (const [href, name] of TOPIC_TRAPS) {
      expect(block).toContain(`<a href="${href}"`);
      expect(fs.existsSync(path.join(ROOT, 'src', `${href.slice(1, -1)}.html`)), href).toBe(true);
      expect(textOf(block)).toContain(`${name} — `);
    }
  });

  it('sits inside #by-topic, under the grid', () => {
    const start = page.indexOf('<!-- topic-traps:start -->');
    expect(start).toBeGreaterThan(page.indexOf('<section id="by-topic">'));
    expect(start).toBeLessThan(page.indexOf('<section id="by-difficulty">'));
  });

  it('links every trap page exactly once, and only trap pages that exist', () => {
    const block = between(page, 'topic-traps');
    const linked = [...block.matchAll(/<a href="\/(sql-[a-z-]+)\/" data-track="cta_trap"/g)].map(m => m[1]);
    expect(linked.slice().sort()).toEqual(SQL_PATTERNS.map(p => p.slug).sort());
    expect(linked).toHaveLength(5);
    expect(TOPIC_TRAPS.filter(t => t[3] === null)).toHaveLength(4);
  });

  it('each sentence is one sentence and makes no frequency claim', () => {
    for (const [, name, text] of TOPIC_TRAPS) {
      expect(text.trim().endsWith('.'), name).toBe(true);
      expect((text.match(/[.!?](\s|$)/g) || []).length, name).toBe(1);
      expect(text, name).not.toMatch(/most[- ]asked|most common|frequen|% of interviews|always asked/i);
    }
  });
});

describe('the committed page', () => {
  it('is what the generator produces today', () => {
    expect(renderPage(page, cx)).toBe(page);
  });

  it('is what public/ serves (when built)', () => {
    if (!fs.existsSync(BUILT)) return;
    const built = fs.readFileSync(BUILT, 'utf8');
    expect(between(built, 'solutions')).toBe(between(page, 'solutions'));
    expect(between(built, 'topic-traps')).toBe(between(page, 'topic-traps'));
  });

  // tests/site-counts.test.js section 6 reads the whole page against the two
  // flags; here the generated blocks simply name no free count at all.
  it('names no free count in either block', () => {
    for (const name of ['solutions', 'topic-traps']) {
      const block = between(page, name);
      expect(textOf(block)).not.toMatch(/\d+\+?\s+free\b|\bfree\s+\d+\b|\bfirst \d+\b/i);
    }
  });

  it('the generator runs in the build before the page is copied to public/', () => {
    const build = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).scripts.build;
    const gen = build.indexOf('build-exercise-solutions.mjs');
    expect(gen).toBeGreaterThan(-1);
    expect(gen).toBeLessThan(build.indexOf('build-static-pages.js'));
  });
});

describe('the meta description', () => {
  const desc = () => decode((/<meta name="description" content="([^"]*)"/.exec(page) || [])[1] || '');

  it('says "with solutions" in 120–170 characters, with no free count', () => {
    const d = desc();
    expect(d).toMatch(/with solutions/i);
    expect(d.length).toBeGreaterThanOrEqual(120);
    expect(d.length).toBeLessThanOrEqual(170);
    expect(d).not.toMatch(/(?<![\w$.,~-])\d+\+?\s+free\b|\bfree\s+\d+\b|\(\d+ Free\)|\bfirst \d+\b/i);
    expect(d).toContain('300+');
  });

  it('promises five worked exercises only while the page shows five', () => {
    if (/\bfive worked\b/i.test(desc())) expect(cards).toHaveLength(5);
  });

  it('is the served description too (when built)', () => {
    if (!fs.existsSync(BUILT)) return;
    const built = decode((/<meta name="description" content="([^"]*)"/.exec(fs.readFileSync(BUILT, 'utf8')) || [])[1] || '');
    expect(built).toBe(desc());
  });
});
