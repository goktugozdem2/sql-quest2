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
