// The search snippet of the five zero-click pages (2026-09-29).
//
// docs/reads/seo-weekly-2026-09-28.md: five pages sat on Google's first or
// second page for 28 days and were clicked zero times — /practice-sql-no-setup/
// (174 impressions, position 3.9), /blog/recursive-cte-explained/ (180, 5.0),
// /blog/window-functions-tutorial/ (360, 11.7), /blog/sql-running-total/
// (258, 11.0), /challenges/aggregation/ (1,197, 15.7). Their titles ran 79–90
// characters and their descriptions 186–237, so Google cut both mid-promise.
// The rewrite (founder-approved 2026-09-29) put the searcher's words first and
// one concrete promise inside the visible window. This test keeps them there:
//
//   - <title> at most TITLE_MAX characters, brand suffix included;
//   - meta description between DESC_MIN and DESC_MAX characters;
//   - no free count in any snippet field — "228 free", "(18 Free)", "first 10
//     solves": under the free quota the tier is "10 free challenge solves"
//     and a snippet is not where it is explained (tests/site-counts.test.js
//     section 6 owns the wording; here the number is simply absent);
//   - og:title is the title (the blog posts drop the " | SQLQuest.app" suffix
//     in og:title, the other pages keep it — both forms are the title), and
//     og:description / twitter:description are the description, so what a
//     share card says is what the search result says.
//
// Read on src/ (what is edited) and on the built copy in public/ when it
// exists (what is served), so a build step that rewrote a head would show.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { QUESTION_SNIPPETS } from '../scripts/build-question-pages.mjs';

const ROOT = new URL('../', import.meta.url).pathname;

export const TITLE_MAX = 70;
export const DESC_MIN = 120;
export const DESC_MAX = 170;
export const BRAND_SUFFIX = ' | SQLQuest.app';

export const SNIPPET_PAGES = [
  { src: 'src/practice-sql-no-setup.html', built: 'public/practice-sql-no-setup/index.html' },
  { src: 'src/blog/recursive-cte-explained.html', built: 'public/blog/recursive-cte-explained/index.html' },
  { src: 'src/blog/window-functions-tutorial.html', built: 'public/blog/window-functions-tutorial/index.html' },
  { src: 'src/blog/sql-running-total.html', built: 'public/blog/sql-running-total/index.html' },
  { src: 'src/challenges/aggregation.html', built: 'public/challenges/aggregation/index.html' },
  // 2026-10-11: "datalemur" — 381 impressions at 5.2, zero clicks (GSC
  // weekly 09-28 → 10-04); the title ran 81 characters and the description 300.
  { src: 'src/vs-datalemur.html', built: 'public/vs-datalemur/index.html' },
  // 2026-11-19, striking distance (GSC, 28 days to 2026-11-14): "sql join
  // examples" 506 impressions at 27.7; "how to govern ai-generated sql before
  // it reaches production" 158 at 3.4, zero clicks; "sqlbolt" 283 at 14.6 and
  // "how many lessons does sqlbolt have" 57 at 6.1. Pinned further below.
  { src: 'src/blog/sql-joins-explained.html', built: 'public/blog/sql-joins-explained/index.html' },
  { src: 'src/blog/validate-ai-generated-sql.html', built: 'public/blog/validate-ai-generated-sql/index.html' },
  { src: 'src/vs-sqlbolt.html', built: 'public/vs-sqlbolt/index.html' },
];

// "228 free", "300+ free", "(18 Free)", "first 10 solves", "10 free challenge
// solves" — any number standing next to "free", or a "first N" in a field
// that also says free. A snippet names no free count in either flag state.
const FREE_COUNT = /(?<![\w$.,~-])\d+\+?\s+free\b|\bfree\s+\d+\b|\(\d+ Free\)/i;
const FIRST_N = /\bfirst \d+\b/i;

const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (html, attr, name) => {
  const m = new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(html);
  return m ? decode(m[1]) : null;
};
const stripBrand = t => (t.endsWith(BRAND_SUFFIX) ? t.slice(0, -BRAND_SUFFIX.length) : t);

export function snippetFields(html) {
  const head = html.slice(0, html.indexOf('</head>') > 0 ? html.indexOf('</head>') : html.length);
  const t = /<title>([^<]*)<\/title>/i.exec(head);
  return {
    title: t ? decode(t[1]).trim() : null,
    description: meta(head, 'name', 'description'),
    ogTitle: meta(head, 'property', 'og:title'),
    ogDescription: meta(head, 'property', 'og:description'),
    twitterTitle: meta(head, 'name', 'twitter:title'),
    twitterDescription: meta(head, 'name', 'twitter:description'),
  };
}

export function snippetProblems(html) {
  const f = snippetFields(html);
  const problems = [];
  if (f.title == null) problems.push('no <title>');
  else if (f.title.length > TITLE_MAX) problems.push(`title is ${f.title.length} chars, max ${TITLE_MAX}: "${f.title}"`);
  if (f.description == null) problems.push('no meta description');
  else if (f.description.length < DESC_MIN || f.description.length > DESC_MAX) {
    problems.push(`description is ${f.description.length} chars, wanted ${DESC_MIN}–${DESC_MAX}: "${f.description}"`);
  }
  for (const [name, value] of Object.entries(f)) {
    if (value == null) continue;
    if (FREE_COUNT.test(value)) problems.push(`${name} states a free count: "${value}"`);
    if (/\bfree\b/i.test(value) && FIRST_N.test(value)) problems.push(`${name} says "first N" next to free: "${value}"`);
  }
  if (f.title != null && f.ogTitle != null && stripBrand(f.ogTitle) !== stripBrand(f.title)) {
    problems.push(`og:title differs from <title>: "${f.ogTitle}" vs "${f.title}"`);
  }
  if (f.title != null && f.twitterTitle != null && stripBrand(f.twitterTitle) !== stripBrand(f.title)) {
    problems.push(`twitter:title differs from <title>: "${f.twitterTitle}" vs "${f.title}"`);
  }
  if (f.description != null && f.ogDescription != null && f.ogDescription !== f.description) {
    problems.push(`og:description differs from the meta description: "${f.ogDescription}"`);
  }
  if (f.description != null && f.twitterDescription != null && f.twitterDescription !== f.description) {
    problems.push(`twitter:description differs from the meta description: "${f.twitterDescription}"`);
  }
  return problems;
}

describe('the rules, on fixtures whose verdict is known', () => {
  const page = ({ title, desc, og = title, ogd = desc }) =>
    `<html><head><title>${title}</title><meta name="description" content="${desc}">` +
    `<meta property="og:title" content="${og}"><meta property="og:description" content="${ogd}"></head><body>${'x'.repeat(50)} free 228</body></html>`;
  const desc = 'A description long enough to clear the floor and short enough to stay under the ceiling, saying one concrete thing the page delivers.';

  it('accepts a title within the cap and a description inside the band, brand suffix on or off og:title', () => {
    expect(snippetProblems(page({ title: 'Recursive CTE Explained — Org Chart Example | SQLQuest.app', desc }))).toEqual([]);
    expect(snippetProblems(page({ title: 'Recursive CTE Explained — Org Chart Example | SQLQuest.app', desc, og: 'Recursive CTE Explained — Org Chart Example' }))).toEqual([]);
  });

  it('fails a title over the cap and a description outside the band', () => {
    expect(snippetProblems(page({ title: 'x'.repeat(TITLE_MAX + 1), desc }))[0]).toMatch(/^title is 71 chars/);
    expect(snippetProblems(page({ title: 'ok', desc: 'short' }))[0]).toMatch(/^description is 5 chars/);
    expect(snippetProblems(page({ title: 'ok', desc: 'y'.repeat(DESC_MAX + 1) }))[0]).toMatch(/^description is 171 chars/);
  });

  it('fails a free count in any field, in either spelling', () => {
    for (const bad of ['228 free challenges and more', 'the 300+ free bank', '52 Challenges (18 Free)', 'your first 10 solves free', 'free 228 of them']) {
      const problems = snippetProblems(page({ title: 'ok', desc: `${bad} ${'z'.repeat(DESC_MIN)}` }));
      expect(problems.some(p => /free/.test(p)), `${bad}: ${problems.join(' | ')}`).toBe(true);
    }
    // "free" without a number is allowed — "Start free", "no signup, free"
    expect(snippetProblems(page({ title: 'ok', desc: `Start free, no signup. ${'z'.repeat(DESC_MIN)}` }))).toEqual([]);
  });

  it('fails an og:title or og:description that drifted from the head', () => {
    expect(snippetProblems(page({ title: 'ok', desc, og: 'other' }))[0]).toMatch(/^og:title differs/);
    expect(snippetProblems(page({ title: 'ok', desc, ogd: `${desc} and more` }))[0]).toMatch(/^og:description differs/);
  });
});

describe('the five zero-click pages carry a snippet that fits the result', () => {
  for (const { src, built } of SNIPPET_PAGES) {
    it(`${src} — title ≤ ${TITLE_MAX}, description ${DESC_MIN}–${DESC_MAX}, no free count, share tags agree`, () => {
      const html = fs.readFileSync(path.join(ROOT, src), 'utf8');
      expect(snippetProblems(html)).toEqual([]);
    });

    it(`${built} — the served copy carries the same snippet`, () => {
      const builtPath = path.join(ROOT, built);
      if (!fs.existsSync(builtPath)) return; // not built in this checkout; src is the source of truth
      const a = snippetFields(fs.readFileSync(path.join(ROOT, src), 'utf8'));
      const b = snippetFields(fs.readFileSync(builtPath, 'utf8'));
      expect(b.title).toBe(a.title);
      expect(b.description).toBe(a.description);
      expect(snippetProblems(fs.readFileSync(builtPath, 'utf8'))).toEqual([]);
    });
  }
});

// Bing, 2026-09-30: /sql-exercises/ carries 64% of Bing clicks and its title
// was 86 characters ("Title too long", high severity in Webmaster Tools).
// Founder's option A: shorten this one title, leading words unchanged.
describe('/sql-exercises/ title fits Bing', () => {
  const titleOf = (p) => (fs.readFileSync(path.join(ROOT, p), 'utf8').match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  it('is at most 70 characters, leads with the searched phrase, in src and in the served copy', () => {
    const src = titleOf('src/sql-exercises.html');
    expect(src.length).toBeLessThanOrEqual(70);
    expect(src).toMatch(/^SQL Practice Questions /);
    expect(titleOf('public/sql-exercises/index.html')).toBe(src);
  });

  // 2026-11-14: Bing clicks on this page fell 227 -> 46 a week (10-02 -> 11-06)
  // at about the same position; "sql practice exercises" lost CTR hardest
  // (14% -> 7% at position ~3), and Google's best-clicked query for the page
  // is "sql practice exercises with solutions". The title names both nouns and
  // the "with solutions" phrase; the H1 keeps "SQL Practice Questions".
  it('names questions AND exercises, and says "With Solutions"', () => {
    const src = titleOf('src/sql-exercises.html');
    expect(src).toMatch(/Questions/);
    expect(src).toMatch(/Exercises With Solutions/);
  });
});

// 2026-11-19: the four striking-distance snippets say what the searcher typed,
// and say it honestly. Each assertion is the reason the snippet was rewritten,
// so a later edit that drifts back fails here by name.
describe('the 2026-11-19 striking-distance snippets answer their query', () => {
  const fieldsOf = p => snippetFields(fs.readFileSync(path.join(ROOT, p), 'utf8'));

  it('/blog/sql-joins-explained/ leads with "SQL JOIN Examples" and names the anti-join and self join', () => {
    const f = fieldsOf('src/blog/sql-joins-explained.html');
    expect(f.title).toMatch(/^SQL JOIN Examples: /);
    expect(f.title).toMatch(/Anti-Join/);
    expect(f.title).toMatch(/Self Join/);
    expect(f.description).toMatch(/^SQL JOIN examples /);
    expect(f.description).toMatch(/LEFT JOIN … IS NULL/);
    // the body carries the example every snippet word promises
    const html = fs.readFileSync(path.join(ROOT, 'src/blog/sql-joins-explained.html'), 'utf8');
    for (const id of ['inner', 'left', 'anti-join', 'self']) expect(html).toContain(`<h2 id="${id}">`);
  });

  it('/blog/validate-ai-generated-sql/ answers "govern AI-generated SQL before production"', () => {
    const f = fieldsOf('src/blog/validate-ai-generated-sql.html');
    expect(f.title).toMatch(/^Govern AI-Generated SQL Before Production/);
    expect(f.description).toMatch(/AI-generated SQL before production/);
    expect(f.description).toMatch(/seven checks/);
  });

  it('/vs-sqlbolt/ states the lesson count, only as the dated read has it, and answers it in the FAQ', () => {
    const f = fieldsOf('src/vs-sqlbolt.html');
    const read = fs.readFileSync(path.join(ROOT, 'docs/reads/sqlbolt-2026-11-19.md'), 'utf8');
    const lessons = Number((/\*\*(\d+) lessons\*\*/.exec(read) || [])[1]);
    const tasks = Number((/\*\*(\d+) exercise tasks\*\*/.exec(read) || [])[1]);
    expect(lessons).toBeGreaterThan(0);
    expect(tasks).toBeGreaterThan(0);
    expect(f.title).toMatch(new RegExp(`^SQLBolt: ${lessons} Lessons, ${tasks} Exercises`));
    expect(f.description).toContain(`${lessons} lessons and ${tasks} exercise tasks`);
    expect(f.description).toMatch(/SQL Bolt/);
    const html = fs.readFileSync(path.join(ROOT, 'src/vs-sqlbolt.html'), 'utf8');
    // in the FAQPage JSON-LD and in the visible list, which mirrors it
    expect(html.match(/How many lessons does SQLBolt have\?/g)).toHaveLength(2);
  });

  it('/questions/recursive-team-size-rollup/ says it is a recursive CTE, not GROUP BY ROLLUP', () => {
    const o = QUESTION_SNIPPETS['recursive-team-size-rollup'];
    expect(o).toBeTruthy();
    expect(o.title).toMatch(/Recursive CTE/);
    expect(o.title).not.toMatch(/rollup/i);
    expect(o.description).toMatch(/not GROUP BY ROLLUP/);
    const built = path.join(ROOT, 'public/questions/recursive-team-size-rollup/index.html');
    if (!fs.existsSync(built)) return; // not built in this checkout
    const html = fs.readFileSync(built, 'utf8');
    expect(snippetProblems(html)).toEqual([]);
    const f = snippetFields(html);
    expect(f.title).toBe(o.title);
    expect(f.description).toBe(o.description);
  });

  it('an override touches only its own page — a neighbour keeps the template snippet', () => {
    const dir = path.join(ROOT, 'public/questions');
    if (!fs.existsSync(dir)) return;
    const others = fs.readdirSync(dir).filter(d => d !== 'recursive-team-size-rollup' && fs.existsSync(path.join(dir, d, 'index.html')));
    expect(others.length).toBeGreaterThan(100);
    const bad = others.filter(d => !/ — SQL Interview Question \((Easy|Medium|Hard)\) \| SQLQuest\.app$/.test(snippetFields(fs.readFileSync(path.join(dir, d, 'index.html'), 'utf8')).title));
    expect(bad).toEqual([]);
  });
});
