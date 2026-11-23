// The SEO read of 2026-09-22: the content is better than the competition's
// and it does not rank; what hurts is authority, consistency and coverage.
// These are the consistency half — the things a page says that another page,
// or the product, contradicts. Each guard names what it caught.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
// Every page under src/, subfolders included — the first version of this
// file read src/ and src/blog/ only and missed src/challenges/, where eleven
// topic pages still linked to /app.html and one said "70% of hard SQL
// interview questions at Meta, Google, Amazon".
const walk = dir => fs.readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith('.html') ? [`${dir}/${e.name}`] : []);
const pages = walk('src').filter(f => f !== 'src/app.html');
const read = f => fs.readFileSync(join(ROOT, f), 'utf8');
const noComments = s => s.replace(/<!--[\s\S]*?-->/g, '');
const visibleText = s => noComments(s)
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ');

describe('the Turkish banner is not in the English homepage', () => {
  // It sat in the static HTML, so every visitor and every crawler got it.
  // It is written by the geo script, only for a visitor from Türkiye.
  it('no Turkish banner copy in the static markup', () => {
    const home = read('src/index.html');
    expect(visibleText(home)).not.toMatch(/artık Türkçe|Hadi başla/);
    expect(home).toMatch(/<div class="tr-banner" id="trBanner" lang="tr"><\/div>/);
  });
});

describe('one app URL', () => {
  // /app.html 308s to /app/ (cleanUrls) and /app/ carries the canonical.
  // Linking to the redirect spends a hop on every click and every crawl.
  it('no page links to /app.html', () => {
    const bad = pages.filter(f => /href="\/?app\.html(?=[?"#])/.test(noComments(read(f))));
    expect(bad).toEqual([]);
  });
});

// The same rule the mocks got on 2026-09-21: no claim about how OFTEN
// something is asked in interviews, and no claim about a company's interview,
// without a dated source. None exists for any of these. "Classic", "core",
// "learn this first" say where a pattern sits; they do not claim a rate.
const FREQUENCY = [
  /most[- ]asked/i,
  /by (?:rough )?frequency/i,
  /\b\d{1,3}% of (?:FAANG|hard|mid|interview|SQL interview)/i,
  /asked in roughly \d+%/i,
  /top-\d most/i,
  /interview reports from/i,
  /SQL Quest user surveys?/i,
  /About \d+ responses/i,
  /citation note in our internal tracker/i,
];

describe('no unsourced interview-frequency claims', () => {
  it('in any page — body, meta or JSON-LD', () => {
    const hits = [];
    for (const f of pages) {
      const s = noComments(read(f));
      for (const re of FREQUENCY) {
        const m = s.match(re);
        if (m) hits.push(`${f}: "${s.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20).replace(/\s+/g, ' ')}"`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('in the product: challenge text, mocks and the readiness questions', () => {
    const hits = [];
    for (const f of ['src/data/challenges.js', 'src/data/mock-interviews.js', 'src/data/readiness-questions.js']) {
      // strings only: drop line comments and the one legacy id that carries
      // the words ('top-10-most-asked' — ids are stable, titles are not)
      const s = read(f).split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
        .replace(/'top-10-most-asked'/g, "'id'").replace(/TOP 10 MOST ASKED/g, '');
      for (const re of FREQUENCY) {
        const m = s.match(re);
        if (m) hits.push(`${f}: "${s.slice(Math.max(0, m.index - 60), m.index + m[0].length + 20).replace(/\s+/g, ' ')}"`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('the FAANG guide names no source it cannot show', () => {
    const g = read('src/blog/faang-sql-interview-guide.html');
    expect(g).not.toMatch(/Glassdoor interview reports|Blind threads|SQL Quest user surveys/);
    expect(g).toContain('An earlier version of this section was wrong');
  });
});

// 2026-11-22 (C1, after A1's review of #132): no page, no generator output
// and no product string names a company as what interviews "ask" or "use".
// The sweep found nine company heroes ("Master the SQL patterns Airbnb asks
// across …"), the Google page's "exact patterns Google asks", /after-bootcamp/'s
// "modelled on the exact patterns Meta, Google, Amazon, Apple, and Netflix
// ask", /fraud-analytics-sql/'s "asked at PayPal, Stripe, Block, JPMorgan",
// two app strings and seventeen challenge descriptions in both languages
// ("asked at Google and Amazon", "her FAANG şirketinde sorulur") — those print
// on /questions/. None had a source. A sourced company page states its format
// in its "How the interview runs (sourced)" rows, phrased as reports; none of
// those rows uses these shapes, so no exemption is needed.
// The denials stay legal: "Does this page know what SQL questions Airbnb
// asks? No …" and "not questions Airbnb asks" use "questions", not
// "patterns", and are not matched.
const registry = fs.readFileSync(join(ROOT, 'scripts/build-company-crosslinks.mjs'), 'utf8');
const COMPANY_NAMES = [...new Set([
  ...[...registry.matchAll(/name: '([^']+)'/g)].map(m => m[1]),
  'FAANG', 'MAANG', 'Facebook', 'Bloomberg', 'Oracle', 'Square', 'PayPal', 'Block', 'Microsoft',
])];
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CO = `(?:${COMPANY_NAMES.map(esc).join('|')})`;
const CO_LIST = `${CO}(?:(?:\\s*,\\s*(?:and\\s+|&\\s+|or\\s+)?|\\s+(?:and|&|or|ve)\\s+)${CO})*`;
export const COMPANY_CLAIMS = [
  new RegExp(`\\bpatterns?\\s+(?:that\\s+)?${CO_LIST}\\s+(?:asks?|uses?|tests?)\\b`, 'i'),
  new RegExp(`\\bpatterns?\\s+that\\s+recur\\s+in\\s+${CO}`, 'i'),
  new RegExp(`\\b(?:asked|tested)\\s+(?:constantly\\s+|frequently\\s+|often\\s+)?(?:at|by|in)\\s+(?:literally\\s+)?(?:every\\s+)?${CO_LIST}`, 'i'),
  new RegExp(`\\b${CO}\\s+asks\\s+(?:this|these|it)\\b`, 'i'),
  /\bexact (?:SQL )?patterns?\b/i,
  /\b(?:every|top-\d+) FAANG\b/i,
  new RegExp(`${CO_LIST}['’]?(?:da|de|ta|te|'da|'de)\\s+(?:sürekli\\s+)?sorulur`, 'i'),
  /\bher FAANG\b/i,
  /\bFAANG (?:mülakatçılarının|interviewers really)\b/i,
];

export function findCompanyClaims(text) {
  const hits = [];
  for (const re of COMPANY_CLAIMS) {
    for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))) {
      hits.push(text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20).replace(/\s+/g, ' '));
    }
  }
  return hits;
}

const builtPages = () => {
  const out = [];
  const walkPublic = dir => {
    for (const e of fs.readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walkPublic(p);
      else if (/\.(?:html|txt)$/.test(e.name) && e.name !== 'app.html') out.push(p);
    }
  };
  walkPublic('public');
  return out;
};
const PRODUCT_TEXT = ['src/data/challenges.js', 'src/data/sector-challenges.js', 'src/data/mock-interviews.js', 'src/data/readiness-questions.js', 'src/data/lessons.js', 'src/app.jsx'];
const stringsOnly = s => s.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

describe('no unsourced company-interview claims', () => {
  it('fixture: the shapes the sweep found fail, the denials pass', () => {
    for (const bad of [
      'Master the SQL patterns Airbnb asks across Data Analyst roles.',
      'challenges modelled on the exact patterns Meta, Google, Amazon, Apple, and Netflix ask in phone screens',
      'Practice the SQL patterns that recur in Meta (formerly Facebook) interview rounds.',
      'the core SQL question types asked at PayPal, Stripe, Block, JPMorgan, and most fintech risk teams',
      'Non-equi joins are asked at Google and Bloomberg because they test',
      'MoM growth is asked at literally every FAANG company.',
      'Google asks this pattern frequently because',
      "Pareto analizi Netflix ve Spotify'da sorulur çünkü",
      'manager_id üzerinden self-join\'ler her FAANG şirketinde sorulur',
    ]) expect(findCompanyClaims(bad), bad).not.toEqual([]);
    for (const good of [
      'Does this page know what SQL questions Airbnb asks? No, and it does not claim to.',
      'These are OUR challenges matched to the patterns, not questions Airbnb asks.',
      "SQL practice for Airbnb's Data Analyst, Data Scientist, and Analytics Engineer roles.",
      'Exercises are tagged by topic, not modelled on any one company\'s interview.',
    ]) expect(findCompanyClaims(good), good).toEqual([]);
  });

  it('in any page under src/ — body, meta and JSON-LD', () => {
    const hits = pages.flatMap(f => findCompanyClaims(noComments(read(f))).map(h => `${f}: "${h}"`));
    expect(hits).toEqual([]);
  });

  it('in the generators\' output (public/, incl. /questions/ and llms.txt)', () => {
    const hits = builtPages().flatMap(f => findCompanyClaims(noComments(read(f))).map(h => `${f}: "${h}"`));
    expect(hits).toEqual([]);
  });

  it('in the product: challenge, mock, lesson and app strings', () => {
    const hits = PRODUCT_TEXT.flatMap(f => findCompanyClaims(stringsOnly(read(f))).map(h => `${f}: "${h}"`));
    expect(hits).toEqual([]);
  });
});

// 2026-11-22: "300+ exercises as of September 2026" sat on /sql-exercises/ in
// November, and "300+ hands-on challenges (10 free challenge solves to start,
// as of September 2026)" on /learn-sql/. A date on our own count only goes
// stale: the counts come from the bank at build time and need no date. A dated
// competitor fact keeps its date: the competitor rule requires it (a dated
// read in docs/reads/), so a sentence that names a competitor is exempt.
const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
const AS_OF = new RegExp(`\\bas of ${MONTH} 20\\d\\d\\b`, 'gi');
const COMPETITORS = /\b(?:StrataScratch|DataLemur|LeetCode|HackerRank|SQLBolt|SQLZoo|Mode|Interview ?Query|Exponent|Codecademy|DataCamp|Coursera|Udemy|W3Schools|ChatGPT|Gemini|Claude)\b/i;
export function findDatedOwnClaims(text) {
  const flat = text.replace(/<[^>]+>/g, '\n');
  const hits = [];
  for (const m of flat.matchAll(AS_OF)) {
    const start = Math.max(flat.lastIndexOf('.', m.index), flat.lastIndexOf('\n', m.index)) + 1;
    const ends = ['.', '\n'].map(c => flat.indexOf(c, m.index + m[0].length)).filter(i => i >= 0);
    const sentence = flat.slice(start, ends.length ? Math.min(...ends) : undefined);
    if (COMPETITORS.test(sentence)) continue;
    hits.push(sentence.trim().slice(0, 160));
  }
  return hits;
}

describe('no "as of <Month> <Year>" on our own counts', () => {
  it('fixture: our count with a date fails, a dated competitor price passes', () => {
    expect(findDatedOwnClaims('<p>300+ exercises as of September 2026: 99 Easy.</p>')).toHaveLength(1);
    expect(findDatedOwnClaims('<p>300+ hands-on challenges (10 free challenge solves to start, as of September 2026).</p>')).toHaveLength(1);
    expect(findDatedOwnClaims('<p>StrataScratch has company tags and — as of November 2026 — a $24/month Premium.</p>')).toEqual([]);
  });

  it('in any page under src/, the llms.txt template and the generators\' output', () => {
    const files = [...pages, 'src/llms.template.md', ...builtPages()];
    const hits = files.flatMap(f => findDatedOwnClaims(noComments(read(f))).map(h => `${f}: "${h}"`));
    expect(hits).toEqual([]);
  });
});
