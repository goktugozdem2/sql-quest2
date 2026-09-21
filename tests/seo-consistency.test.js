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
