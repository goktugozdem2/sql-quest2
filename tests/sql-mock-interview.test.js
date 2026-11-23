// /sql-mock-interview/ (C2, 2026-11-22; GEO panel prompt #11, "timed SQL mock
// interview online", had no general page). What must never drift:
//
//   - the mock table is the app's own mock data: one row per mock, with its
//     question count and format, minutes, pass mark, and Free only where the
//     mock is `isFree`;
//   - no mock's question or answer is on the page — no prompt, no code
//     snippet, no option, no solution (the mocks are the Pro product, and the
//     Capital One mock is never quoted: CLAUDE.md, SQL trap pages);
//   - company mocks link to their company page (where the dated sources are)
//     and the page makes no other claim about a company's screen;
//   - only the free mock gets an ?interview= link;
//   - no price, frequency claim or "unlimited"; the FAQ JSON-LD equals the
//     visible FAQ;
//   - the committed src page is what the generator writes, and the page is in
//     the build, the sitemap, llms.txt, and linked from /sql-exercises/ and
//     /sql-interview-prep/ in the same commit.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  renderMockInterviewPage, loadMocks, mockRows, pageFacts, companyPagePath,
} from '../scripts/build-mock-interview-page.mjs';
import { MOCK_PAGE_SLUG, MOCK_PAGE_TITLE, mockPageFaq } from '../src/data/sql-mock-interview.js';
import { FREE_MOCK_ID } from '../src/utils/free-tier-boundary.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const textOf = html => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const squash = s => String(s).replace(/[*`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

let mocks; let html; let text;
beforeAll(() => {
  mocks = loadMocks();
  html = renderMockInterviewPage(mocks);
  text = textOf(html);
});

describe('the table is the app\'s mock data', () => {
  it('one row per mock, in the data\'s order, with minutes, pass mark and access from the data', () => {
    const rows = [...html.matchAll(/<tr data-mock="(\d+)"><td>([\s\S]*?)<\/td><td>([^<]*)<\/td><td>(\d+)<\/td><td>(\d+)%<\/td><td>(Free|Pro)<\/td><\/tr>/g)];
    expect(rows.map(r => Number(r[1]))).toEqual(mocks.map((m, i) => i + 1));
    for (const [, n, name, format, minutes, pass, access] of rows) {
      const m = mocks[Number(n) - 1];
      const id = m.id;
      expect(decode(name.replace(/<br>[\s\S]*$/, '')), id).toBe(m.title);
      expect(Number(minutes), id).toBe(Math.round(m.totalTime / 60));
      expect(Number(pass), id).toBe(m.passingScore);
      expect(access, id).toBe(m.isFree ? 'Free' : 'Pro');
      const mcq = m.questions.filter(q => q.type === 'mcq').length;
      expect(decode(format), id).toBe(mcq ? `${m.questions.length} (${mcq} multiple choice, ${m.questions.length - mcq} written SQL)` : `${m.questions.length} written SQL`);
      expect(m.questionsCount, `${id}: questionsCount agrees with its questions`).toBe(m.questions.length);
    }
  });

  it('exactly one mock is free, it is the free mock the gates name, and the summary says the rest are Pro', () => {
    const free = mocks.filter(m => m.isFree);
    expect(free.map(m => m.id)).toEqual([FREE_MOCK_ID]);
    const f = pageFacts(mockRows(mocks));
    const answer = html.slice(html.indexOf('data-answer-first="true"'), html.indexOf('</p>', html.indexOf('data-answer-first="true"')));
    expect(decode(answer)).toContain(`The ${free[0].title} (${free[0].questions.length} questions, ${Math.round(free[0].totalTime / 60)} minutes) is free`);
    expect(decode(answer)).toContain(`The other ${mocks.length - 1} mocks are Pro, from ${f.proShortest.minutes} to ${f.longest.minutes} minutes.`);
  });

  it('only the free mock gets an ?interview= link, and the primary CTA is it', () => {
    const links = [...html.matchAll(/\?interview=([a-z0-9-]+)/g)].map(m => m[1]);
    expect(links.length).toBeGreaterThan(0);
    expect(new Set(links)).toEqual(new Set([FREE_MOCK_ID]));
    const bp = [...html.matchAll(/<a class="btn bp" href="([^"]+)" data-track="([^"]+)">/g)];
    expect(bp).toHaveLength(1);
    expect(decode(bp[0][1])).toBe(`/app/?interview=${FREE_MOCK_ID}&src=sql-mock-interview`);
    expect(bp[0][2]).toBe('cta_mockpage_free');
    expect((html.match(/FFE34D/g) || []).length).toBe(1);
  });

  it('each company mock links to its company page, which exists and names the mock\'s company', () => {
    const sourced = mocks.filter(m => m.sourced);
    expect(sourced.length).toBeGreaterThan(0);
    for (const m of sourced) {
      const href = companyPagePath(m.company);
      const at = html.indexOf(`data-mock="${mocks.indexOf(m) + 1}"`);
      const row = html.slice(at, html.indexOf('</tr>', at));
      expect(row, m.id).toContain(`href="${href}"`);
      expect(exists(`src${href.replace(/\/$/, '')}.html`), href).toBe(true);
      expect(read(`src${href.replace(/\/$/, '')}.html`)).toContain(m.company);
    }
  });
});

describe('the page gives away no mock question or answer', () => {
  it('no prompt, code snippet, option, explanation or solution of any mock appears in the page', () => {
    const flat = squash(text);
    const leaks = [];
    for (const m of mocks) {
      for (const q of m.questions) {
        const pieces = [
          q.description, q.solution, q.explanation, q.verify?.sql,
          ...(q.codeSnippets || []).map(s => s.sql || s.code),
          ...(q.options || []).map(o => o.text || o.label),
        ].filter(s => typeof s === 'string' && squash(s).length > 25);
        for (const s of pieces) if (flat.includes(squash(s))) leaks.push(`${m.id}/${q.id}: ${String(s).slice(0, 60)}`);
        // a question title is short; it may not appear as a phrase either
        if (q.title && squash(q.title).length > 12 && flat.includes(squash(q.title))) leaks.push(`${m.id}/${q.id} title: ${q.title}`);
      }
    }
    expect(leaks).toEqual([]);
  });

  it('no SQL on the page at all', () => {
    expect(html).not.toMatch(/<pre|<code/);
    expect(text).not.toMatch(/\bSELECT\b[^.]*\bFROM\b/);
  });
});

describe('claims', () => {
  it('no price, frequency claim or "unlimited"', () => {
    expect(text).not.toMatch(/\$\s?\d/);
    expect(text).not.toMatch(/\b(?:often|frequently|commonly|most[- ]asked|popular|every interview|always asked|again and again|top \d+)\b/i);
    expect(html).not.toMatch(/most[- ]asked/i);
    expect(text).not.toMatch(/\bunlimited\b/i);
  });

  it('a company is named only in a company mock\'s row, the sourced sentence and the FAQ that says the mocks are not the real interview', () => {
    const companies = [...new Set(mocks.filter(m => m.sourced).map(m => m.company))];
    const outside = companies.flatMap(c => {
      const stripped = html
        .replace(/<tr data-mock="[^"]+">[\s\S]*?<\/tr>/g, '')
        .replace(/<p class="lead"[^>]*>\d+ of the Pro mocks are practice modelled[\s\S]*?<\/p>/, '')
        .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
        .replace(/<h3>Are the [^<]* mocks the real interview\?<\/h3>/, '');
      return textOf(stripped).includes(c) ? [c] : [];
    });
    expect(outside).toEqual([]);
    expect(text).toContain('no company wrote or endorsed these mocks');
  });

  it('FAQ JSON-LD equals the visible FAQ, verbatim', () => {
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const faq = ld.find(o => o['@type'] === 'FAQPage');
    const section = html.slice(html.indexOf('<section class="faq">'), html.indexOf('</section>', html.indexOf('<section class="faq">')));
    const visible = [...section.matchAll(/<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>/g)].map(m => [decode(m[1]), decode(m[2])]);
    expect(visible).toEqual(mockPageFaq(pageFacts(mockRows(mocks))));
    expect(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text])).toEqual(visible);
  });

  it('the title says timed SQL mock interview, and the answer comes first', () => {
    expect(MOCK_PAGE_TITLE).toMatch(/^Timed SQL Mock Interview Online/);
    expect(html.indexOf('data-answer-first="true"')).toBeGreaterThan(html.indexOf('<h1'));
    expect(html.indexOf('data-answer-first="true"')).toBeLessThan(html.indexOf('<h2'));
  });
});

describe('wiring', () => {
  it('the committed src page is what the generator writes', () => {
    expect(read(`src/${MOCK_PAGE_SLUG}.html`)).toBe(html);
  });

  it('runs in the build before build-static-pages, and the built page is in the sitemap once', () => {
    const build = JSON.parse(read('package.json')).scripts.build;
    expect(build).toContain('node scripts/build-mock-interview-page.mjs');
    expect(build.indexOf('build-mock-interview-page')).toBeLessThan(build.indexOf('build-static-pages'));
    const xml = read('public/sitemap.xml');
    const block = xml.slice(xml.indexOf('<!-- mock-page:start -->'), xml.indexOf('<!-- mock-page:end -->'));
    expect(block).toContain(`<loc>https://sqlquest.app/${MOCK_PAGE_SLUG}/</loc>`);
    expect(xml.match(new RegExp(`<loc>https://sqlquest.app/${MOCK_PAGE_SLUG}/</loc>`, 'g'))).toHaveLength(1);
    expect(read(`public/${MOCK_PAGE_SLUG}/index.html`)).toContain('/track.js');
  });

  it('is linked from /sql-exercises/ (outside its generated blocks), /sql-interview-prep/, the plan page and llms.txt', () => {
    const href = `href="/${MOCK_PAGE_SLUG}/"`;
    const ex = read('src/sql-exercises.html').replace(/<!-- (solutions|topic-traps):start -->[\s\S]*?<!-- \1:end -->/g, '');
    expect(ex).toContain(href);
    expect(read('src/sql-interview-prep.html').replace(/<!-- company-grid:start -->[\s\S]*?<!-- company-grid:end -->/, '')).toContain(href);
    for (const f of ['public/sql-exercises/index.html', 'public/sql-interview-prep/index.html', 'public/sql-interview-prep-plan/index.html']) {
      expect(read(f), f).toContain(href);
    }
    expect(read('public/llms.txt')).toContain(`https://sqlquest.app/${MOCK_PAGE_SLUG}/`);
  });
});
