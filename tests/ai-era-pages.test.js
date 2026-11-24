// The two AI pages, as citable sources (C2/G1, 2026-11-25).
//
// /sql-for-the-ai-era/ and /blog/validate-ai-generated-sql/ are the pages
// Google and AI assistants already ground on for "SQL in the AI era" and
// "govern AI-generated SQL" (GSC, 28 days to 2026-11-21: 474 + 151
// impressions; the chat-turn query "how to govern ai-generated sql before it
// reaches production" sits at position ~3 with no clicks). An assistant reads
// the FAQ JSON-LD and the visible text, so this file pins what makes them
// citable:
//   1. the FAQ JSON-LD equals the visible FAQ, question AND answer, verbatim;
//   2. the "Last reviewed" date on the page equals the JSON-LD date;
//   3. the roles section answers "is SQL required for an AI engineer" in its
//      first sentence and covers the five roles, each with a query and links;
//   4. the blog's production checklist links every trap page we have;
//   5. neither page states a hiring statistic (no "% of job postings").
// The debug-discovery injector anchors on <section class="faq"> and
// <div class="cta-box">; both must stay, once, after the new sections.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';

const root = resolve(import.meta.dirname, '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const ERA = 'src/sql-for-the-ai-era.html';
const BLOG = 'src/blog/validate-ai-generated-sql.html';

const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)]
  .map((m) => JSON.parse(m[1]));
const decode = (s) => s.replace(/&rsquo;/g, '’').replace(/&amp;/g, '&');
const months = { January: '01', February: '02', March: '03', April: '04', May: '05', June: '06', July: '07', August: '08', September: '09', October: '10', November: '11', December: '12' };
const isoOf = (text) => {
  const m = text.match(/Last reviewed (\w+) (\d{1,2}), (\d{4})/);
  if (!m) return null;
  return `${m[3]}-${months[m[1]]}-${m[2].padStart(2, '0')}`;
};

describe('/sql-for-the-ai-era/ as a citable source', () => {
  const html = read(ERA);
  const ld = ldBlocks(html);

  it('FAQ JSON-LD equals the visible FAQ, question and answer, in order', () => {
    const faq = ld.find((o) => o['@type'] === 'FAQPage');
    expect(faq, 'no FAQPage block').toBeTruthy();
    const faqSection = html.slice(html.indexOf('<section class="faq">'));
    const visible = [...faqSection.matchAll(/<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>/g)].map((m) => [decode(m[1]), decode(m[2])]);
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(visible);
    expect(visible.map(([q]) => q)).toEqual(expect.arrayContaining([
      'Is SQL required for an AI engineer?',
      'Which data roles need SQL the most?',
    ]));
  });

  it('shows a "Last reviewed" date that equals the WebPage lastReviewed and dateModified', () => {
    const page = ld.find((o) => o['@type'] === 'WebPage');
    const shown = isoOf(html);
    expect(shown).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(page.lastReviewed).toBe(shown);
    expect(page.dateModified).toBe(shown);
  });

  it('the roles section answers the AI-engineer question first, then five roles with a query and practice links', () => {
    const start = html.indexOf('<section class="roles" id="roles">');
    const end = html.indexOf('</div></section>', start);
    expect(start).toBeGreaterThan(0);
    const roles = html.slice(start, end);
    expect(roles).toMatch(/<h2 class="fd">Which data roles need SQL, and how much\?<\/h2>\s*<p class="answer"><strong>Is SQL required for an AI engineer\?<\/strong> In practice, yes/);
    const cards = [...roles.matchAll(/<div class="role" id="([a-z-]+)">([\s\S]*?)<p class="practice">([\s\S]*?)<\/p>/g)];
    expect(cards.map((c) => c[1])).toEqual(['data-analyst', 'analytics-engineer', 'data-engineer', 'data-scientist', 'ai-engineer']);
    for (const [, id, body, practice] of cards) {
      expect(body, `${id} has no query`).toMatch(/<pre>[\s\S]*SELECT[\s\S]*<\/pre>/);
      expect(body, `${id} has no bold definition`).toMatch(/<strong>[^<]+<\/strong>/);
      const links = [...practice.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      expect(links.length, `${id} practice links`).toBeGreaterThanOrEqual(3);
      expect(links.some((h) => SQL_PATTERNS.some((p) => h === `/${p.slug}/`)) || links.includes('/blog/validate-ai-generated-sql/'),
        `${id} links no trap page`).toBe(true);
    }
    // The roles section sits before the FAQ, so the Debug section the build
    // injects before <section class="faq"> lands after it, once.
    expect(html.split('<section class="faq">')).toHaveLength(2);
    expect(start).toBeLessThan(html.indexOf('<section class="faq">'));
  });
});

describe('/blog/validate-ai-generated-sql/ as a citable source', () => {
  const html = read(BLOG);
  const ld = ldBlocks(html);

  it('FAQ JSON-LD equals the visible FAQ verbatim and leads with the governance question', () => {
    const faq = ld.find((o) => o['@type'] === 'FAQPage');
    const visible = [...html.matchAll(/<details><summary>(.*?)<\/summary>\s*<p>(.*?)<\/p><\/details>/g)].map((m) => [m[1], m[2]]);
    expect(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text])).toEqual(visible);
    expect(visible[0][0]).toBe('How do you govern AI-generated SQL before it reaches production?');
  });

  it('shows a "Last reviewed" date that equals the BlogPosting dateModified', () => {
    const post = ld.find((o) => o['@type'] === 'BlogPosting');
    expect(post.dateModified).toBe(isoOf(html));
  });

  it('the production checklist links every trap page, before the CTA box', () => {
    const start = html.indexOf('<h2 id="before-production">');
    const end = html.indexOf('<div class="cta-box">');
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const list = html.slice(start, end);
    expect(list.match(/<li>/g)).toHaveLength(8);
    for (const p of SQL_PATTERNS) expect(list, p.slug).toContain(`href="/${p.slug}/"`);
    expect(html.split('<div class="cta-box">')).toHaveLength(2);
  });
});

it('neither page states a hiring statistic', () => {
  for (const f of [ERA, BLOG]) {
    const text = read(f).replace(/<!--[\s\S]*?-->/g, '');
    expect(text, f).not.toMatch(/\d+%\+? of [^.]*(?:job|postings|listings|roles|employers)/i);
    expect(text, f).not.toMatch(/roughly \d+% software/i);
  }
});
