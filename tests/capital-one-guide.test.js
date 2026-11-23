// The Capital One guide's first screen (C5, 2026-11-23):
// /blog/capital-one-codesignal-data-analyst-assessment/.
//
// What this pins:
//  1. A visible "Updated" date that equals the BlogPosting dateModified.
//  2. The format lines are attributed (candidates, the vendor) and never put
//     in Capital One's mouth; the vendor source is listed with its read date.
//  3. The general coding assessment is told apart, with a quote that the
//     page's own Blind source carries.
//  4. The mock is offered by numbers read from src/data/mock-interviews.js,
//     and the page claims no multi-table rate question unless the mock has one.
//  5. Every first-screen link carries src=blog-capital-one; the readiness link
//     names a company page that exists; question 1 exists and is Easy.
//  6. The free tier comes from freeTierSentence(); no bank count, no query.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { freeTierSentence } from '../src/utils/display-count.js';

const here = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel) => readFileSync(here(rel), 'utf8');
const SLUG = 'capital-one-codesignal-data-analyst-assessment';

const decode = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');

let html, first, mock, challenges;
beforeAll(() => {
  html = read(`../src/blog/${SLUG}.html`);
  const a = html.indexOf('<!-- first-screen:start');
  const b = html.indexOf('<!-- first-screen:end -->');
  first = a >= 0 && b > a ? html.slice(html.indexOf('-->', a) + 3, b) : '';
  const sb = { window: { challengesData: [] }, console: { log() {} } };
  vm.createContext(sb);
  for (const f of ['../src/data/challenges.js', '../src/data/sector-challenges.js', '../src/data/mock-interviews.js']) {
    vm.runInContext(read(f), sb);
  }
  mock = sb.window.mockInterviewsData.find(m => m.id === 'capital-one-codesignal');
  challenges = [...(sb.window.challengesData || []), ...(sb.window.sectorChallengesData || [])];
});

describe('the first screen exists and sits above the long read', () => {
  it('has the block, before the intro and before the format section', () => {
    expect(first.length).toBeGreaterThan(200);
    const at = html.indexOf('data-testid="c1-first-screen"');
    expect(at).toBeGreaterThan(html.indexOf('</h1>'));
    expect(at).toBeLessThan(html.indexOf('<p class="intro">'));
    expect(at).toBeLessThan(html.indexOf('<h2 id="format">'));
  });

  it('shows "Updated 2026-11-23" and the JSON-LD dateModified agrees', () => {
    const m = html.match(/<time datetime="(\d{4}-\d{2}-\d{2})" data-testid="updated-date">Updated (\d{4}-\d{2}-\d{2})<\/time>/);
    expect(m).toBeTruthy();
    expect(m[1]).toBe(m[2]);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x => JSON.parse(x[1]));
    const post = ld.find(x => x['@type'] === 'BlogPosting');
    expect(post.dateModified).toBe(m[1]);
    expect(post.datePublished).toBe('2026-09-07');
  });
});

describe('format lines are sourced, never Capital One\'s own words', () => {
  it('attributes the format to candidates and the vendor, and says Capital One does not publish it', () => {
    const t = decode(first);
    expect(t).toMatch(/as candidates report it/);
    expect(t).toMatch(/Blind reports, December 2021 to June 2025/);
    expect(t).toMatch(/CodeSignal's own help page/);
    expect(t).toMatch(/that page does not name Capital One/);
    expect(t).toMatch(/Capital One does not publish the format/);
    expect(t).not.toMatch(/Capital One (says|states|confirms|describes)/i);
  });

  it('the vendor page is in Sources with its URL and read date', () => {
    const src = html.slice(html.indexOf('<h2 id="sources">'));
    expect(src).toContain('https://support.codesignal.com/hc/en-us/articles/4407377178647');
    expect(decode(src)).toMatch(/read 22 November 2026/);
    // R1's dossier is where the vendor read is recorded.
    const dossier = read('../docs/reads/companies/capital-one.md');
    expect(dossier).toContain('https://support.codesignal.com/hc/en-us/articles/4407377178647');
    expect(dossier).toMatch(/70 minutes: 1 coding question \+ 14 quiz questions/);
  });

  it('the general-coding line quotes a source the page already cites', () => {
    const t = decode(first);
    expect(t).toMatch(/Not the general coding assessment/);
    const quotes = [...t.matchAll(/"([^"]{8,})"/g)].map(m => m[1]);
    expect(quotes).toEqual(['14 questions instead of just 4']);
    const table = decode(html.slice(html.indexOf('<h2 id="format">'), html.indexOf('<h2 id="schema">')));
    for (const q of quotes) expect(table, q).toContain(`"${q}"`);
  });
});

describe('the mock is offered by its real numbers', () => {
  it('70 minutes, 14 questions, 12 multiple choice in 48 then 2 written in 22', () => {
    expect(mock).toBeTruthy();
    const mcq = mock.questions.filter(q => q.type === 'mcq');
    const written = mock.questions.filter(q => q.type !== 'mcq');
    const mins = (qs) => qs.reduce((s, q) => s + q.timeLimit, 0) / 60;
    expect(mock.totalTime / 60).toBe(70);
    expect(mock.questionsCount).toBe(14);
    expect(mock.questions.length).toBe(14);
    expect(mcq.length).toBe(12);
    expect(written.length).toBe(2);
    expect(mins(mcq)).toBe(48);
    expect(mins(written)).toBe(22);
    expect(new Set(mcq.map(q => q.timeLimit))).toEqual(new Set([4 * 60]));

    const t = decode(first);
    expect(t).toContain(`is ${mock.totalTime / 60} minutes and ${mock.questionsCount} questions, timed and scored`);
    expect(t).toContain(`${mcq.length} multiple choice in ${mins(mcq)} minutes, then ${written.length} written SQL in ${mins(written)}`);
    expect(t).toContain(`${mcq[0].timeLimit / 60} minutes a multiple-choice question`);
    expect(mock.isFree).toBe(false);
    expect(t).toMatch(/Take the timed mock · Pro/);
  });

  it('each topic it names is a real question in the mock', () => {
    const ids = mock.questions.map(q => q.id);
    // joins at the right grain, a join that double-counts, a share of transactions, timestamps as text
    for (const id of ['c1-m3', 'c1-m2', 'c1-m5', 'c1-m4']) expect(ids).toContain(id);
    expect(mock.questions.find(q => q.id === 'c1-m2').title).toMatch(/fan-out/i);
    expect(mock.questions.find(q => q.id === 'c1-m3').title).toMatch(/grain/i);
    expect(mock.questions.find(q => q.id === 'c1-m5').title).toMatch(/share/i);
    expect(mock.questions.find(q => q.id === 'c1-m4').description).toMatch(/full ISO timestamp/);
  });

  it('claims no multi-table rate question unless the mock has one (N2)', () => {
    const multiTableRate = mock.questions.some(q => {
      const sql = q.verify?.sql || q.solution || '';
      return /\bjoin\b/i.test(sql) && /\/|\bpct\b|rate|share/i.test(sql);
    });
    const claims = /(multi-table|several tables|across tables|joined tables)[^.]*\b(rate|share)|\b(rate|share)[^.]*(multi-table|several tables|across tables|joined tables)/i
      .test(decode(first));
    if (!multiTableRate) expect(claims).toBe(false);
  });
});

describe('links carry the blog door and point at real things', () => {
  it('every first-screen link carries src=blog-capital-one', () => {
    const hrefs = [...first.matchAll(/href="([^"]+)"/g)].map(m => m[1].replace(/&amp;/g, '&'));
    expect(hrefs.length).toBe(3);
    for (const h of hrefs) expect(new URL(h, 'https://sqlquest.app').searchParams.get('src'), h).toBe('blog-capital-one');
  });

  it('mock, readiness (?company=) and question 1 resolve', () => {
    const hrefs = [...first.matchAll(/href="([^"]+)"/g)].map(m => new URL(m[1].replace(/&amp;/g, '&'), 'https://sqlquest.app'));
    const mockLink = hrefs.find(u => u.searchParams.get('interview'));
    expect(mockLink.pathname).toBe('/app/');
    expect(mockLink.searchParams.get('interview')).toBe(mock.id);

    const ready = hrefs.find(u => u.pathname === '/sql-interview-readiness-test/');
    const slug = ready.searchParams.get('company');
    expect(slug).toBe('capital-one');
    expect(existsSync(here(`../src/${slug}-sql-interview.html`))).toBe(true);

    const q1 = hrefs.find(u => u.searchParams.get('challenge'));
    const c = challenges.find(x => String(x.id) === q1.searchParams.get('challenge'));
    expect(c, 'question 1 exists').toBeTruthy();
    expect(c.difficulty).toBe('Easy');
    expect(decode(first)).toContain(c.title);
  });
});

describe('counts and the free tier come from the helpers', () => {
  it('states the free tier with freeTierSentence()', () => {
    expect(decode(first)).toContain(freeTierSentence());
  });

  it('states no bank size and shows no query', () => {
    const t = decode(first);
    expect(t).not.toMatch(/\b\d{3}\+/);
    expect(first).not.toMatch(/<pre|<code/);
  });
});

// Q1 2026-11-23: the Feb 2022 and Jun 2025 Blind entries had each other's
// link. Each thread id is pinned to the date and quote its page carries.
describe('each Blind source sits on the thread that says it', () => {
  const PAIRS = [
    ['07h0ouhn', 'February 2022', '14 questions instead of just 4'],
    ['c318r0cw', 'June 2025', 'around 14–15 questions in 70 minutes'],
  ];
  it('the Sources entry for each thread carries its own date and quote', () => {
    const items = html.slice(html.indexOf('<ul class="sources">')).split('<li>');
    for (const [id, date, quote] of PAIRS) {
      const li = items.find(x => x.includes(id));
      expect(li, id).toBeTruthy();
      expect(li, id).toContain(`(${date};`);
      expect(li, id).toContain(`"${quote}"`);
    }
  });
  it("R1's dossier lists both thread URLs", () => {
    const dossier = read('../docs/reads/companies/capital-one.md');
    for (const [id] of PAIRS) expect(dossier, id).toMatch(new RegExp(`teamblind\\.com/post/[^\\s|)]*${id}`));
  });
});
