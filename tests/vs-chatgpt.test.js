// /vs-chatgpt/ (2026-10-03, backlog plan landing-comparison-2026-09-21.md).
// Pins: the page is what the generator writes; it makes no claim about
// ChatGPT's features, limits, prices or error rate (rules in
// docs/reads/ai-chat-comparison-2026-10-03.md); its five example queries are
// the trap pages' own (themselves run against the data by sql-patterns.test.js);
// our prices and free count come from the live constants; the FAQ JSON-LD
// equals the visible FAQ; and the homepage block links it without adding a
// fourth "Start free".
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderVsChatgpt, pageModel, SLUG } from '../scripts/build-vs-chatgpt.mjs';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';
import { PRICE_TABLE } from '../src/utils/regional-price.js';
import { FREE_SOLVE_QUOTA } from '../src/utils/display-count.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const html = renderVsChatgpt();
const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

describe('/vs-chatgpt/', () => {
  it('src file is fresh', () => {
    expect(read(`src/${SLUG}.html`)).toBe(html);
  });

  it('makes no claim about ChatGPT prices, models, limits or how often it is wrong', () => {
    const dollars = [...text.matchAll(/\$\d[\d,.]*/g)].map(m => m[0]);
    const ours = [`$${PRICE_TABLE.default.monthly}`, `$${PRICE_TABLE.default.annual}`];
    expect(dollars.filter(d => !ours.includes(d))).toEqual([]);
    expect(text).not.toMatch(/GPT-\d|\bo\d\b|ChatGPT (?:Plus|Pro|Team)|\b[Mm]essage (?:cap|limit)/);
    expect(text).not.toMatch(/hallucinat/i);
    expect(text).not.toMatch(/\b(?:often|usually|frequently|most of the time|\d+%\s+of the time)\b[^.]{0,40}\bwrong/i);
    expect(text).not.toMatch(/ChatGPT (?:wrote|produced|generated|gave)/i);
  });

  it('the five example queries are the trap pages’ own, and link there', () => {
    const { traps } = pageModel();
    expect(traps.length).toBe(SQL_PATTERNS.length);
    for (const p of SQL_PATTERNS) {
      expect(html).toContain(`<a href="/${p.slug}/">`);
      expect(decode(html)).toContain(p.wrong.says);
      expect(decode(html)).toContain(p.right);
    }
  });

  it('our numbers come from the live constants', () => {
    const { sq } = pageModel();
    expect(text).toContain(`${FREE_SOLVE_QUOTA} free challenge solves`);
    expect(text).toContain(`Pro $${PRICE_TABLE.default.monthly}/month or $${PRICE_TABLE.default.annual}/year`);
    expect(text).toContain(`${sq.bank} questions`);
  });

  it('starts with what a chat assistant does better, and says who wrote it', () => {
    expect(html.indexOf('What a chat assistant does better')).toBeGreaterThan(0);
    expect(html.indexOf('What a chat assistant does better')).toBeLessThan(html.indexOf('side by side'));
    expect(html).toContain('Who wrote this:');
    expect(text).toContain('SQLite only');
  });

  it('FAQ JSON-LD equals the visible FAQ', () => {
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const faq = ld.find(o => o['@type'] === 'FAQPage');
    const visible = [...html.matchAll(/<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>/g)].map(m => [decode(m[1]), decode(m[2])]);
    expect(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text])).toEqual(visible);
  });

  it('is in the sitemap, the build, llms, and linked from the homepage, footer and comparison pages', () => {
    expect(read('public/sitemap.xml')).toContain('<loc>https://sqlquest.app/vs-chatgpt/</loc>');
    expect(JSON.parse(read('package.json')).scripts.build).toContain('node scripts/build-vs-chatgpt.mjs');
    expect(read('src/llms.template.md')).toContain('https://sqlquest.app/vs-chatgpt/');
    for (const f of ['src/sql-practice-comparison.html', 'src/best-sql-practice-sites.html', 'src/sql-for-the-ai-era.html', 'src/datalemur-alternatives.html', 'src/stratascratch-alternatives.html']) {
      expect(read(f), f).toContain('href="/vs-chatgpt/"');
    }
    const home = read('src/index.html');
    const footer = home.slice(home.indexOf('<footer class="ft">'), home.indexOf('</footer>', home.indexOf('<footer class="ft">')));
    expect(footer).toContain('href="/vs-chatgpt/"');
  });

  it('the homepage block is a link, not a fourth Start free, and never in the accent', () => {
    const home = read('src/index.html');
    const i = home.indexOf('data-testid="why-not-chatgpt"');
    expect(i).toBeGreaterThan(0);
    const block = home.slice(i, home.indexOf('</div>', home.indexOf('</p>', home.indexOf('vs-chatgpt', i))) );
    expect(block).toContain('href="/vs-chatgpt/"');
    expect(block).toContain('data-track="home_vs_chatgpt"');
    expect(block).not.toMatch(/FFE34D|class="bp"|Start free/i);
    const body = home.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
    expect((body.match(/>\s*Start free\s*</g) || []).length).toBe(3);
  });
});
