// Competitor facts on the hand-written comparison pages (C2, 2026-11-22).
//
// tests/alternatives-pages.test.js pins the two generated pages to their
// reads. The other nine comparison pages are hand-written and had no guard:
// on 2026-11-22 three of them still quoted StrataScratch at $19/mo, $97.30/yr
// and $202.30 lifetime, after StrataScratch moved to $24 / $139 / $289
// (docs/reads/monetization-competitors-2026-11-22.md), and four called
// DataLemur's and StrataScratch's company tags "verified provenance", which
// the 2026-09-13 read says no page may do. Audit:
// docs/reads/competitor-facts-2026-11-22.md.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PRICE_TABLE } from '../src/utils/regional-price.js';
import { freeSolvesLabel } from '../src/utils/display-count.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

const COMPARISON_PAGES = [
  'best-sql-practice-sites', 'sql-practice-comparison', 'datalemur-alternatives', 'stratascratch-alternatives',
  'vs-datalemur', 'vs-stratascratch', 'vs-leetcode-sql', 'vs-hackerrank-sql', 'vs-sqlbolt', 'vs-sqlzoo', 'vs-chatgpt',
];
// Every dated competitor read a page may quote from.
const READS = ['alternatives-facts-2026-09-13.md', 'monetization-competitors-2026-11-22.md', 'competitor-facts-2026-11-22.md']
  .map(f => read(`docs/reads/${f}`)).join('\n');
// SQL Quest's own prices; the differences the pages work out between two
// quoted prices; and $100, the refunded order in vs-datalemur's diagnosis demo.
const OURS = new Set(Object.values(PRICE_TABLE).flatMap(r => [r.monthly, r.annual]).map(n => `$${n}`));
const ARITHMETIC = new Set(['$0', '$5', '$39', '$40', '$8.25', '$100']);

const visible = html => html.replace(/<!--[\s\S]*?-->/g, '');
const page = slug => visible(read(`src/${slug}.html`));

describe('competitor facts on the comparison pages', () => {
  it('every dollar figure is SQL Quest\'s own, simple arithmetic, or in a dated competitor read', () => {
    const missing = [];
    for (const slug of COMPARISON_PAGES) {
      for (const m of page(slug).matchAll(/\$\d[\d,]*(?:\.\d+)?/g)) {
        const v = m[0].replace(/,$/, '');
        if (OURS.has(v) || ARITHMETIC.has(v)) continue;
        if (!READS.includes(v)) missing.push(`${slug}: ${v}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('carries none of StrataScratch\'s superseded prices', () => {
    for (const slug of COMPARISON_PAGES) {
      const html = page(slug);
      expect(html, slug).not.toMatch(/\$19(?!\d)/);
      expect(html, slug).not.toMatch(/\$97\.30|\$202\.30|\$8\.11/);
    }
  });

  it('never calls a competitor\'s company tags verified', () => {
    const re = /verified[ -](?:company )?(?:provenance|sourcing|real|interview|question)|high confidence|with confidence/i;
    for (const slug of COMPARISON_PAGES) expect(page(slug), slug).not.toMatch(re);
  });

  // A1 review, 2026-11-22: a bare "✓ Verified" table cell said the same thing
  // as "verified provenance" and slipped past the phrase check above.
  it('has no bare "Verified" table cell', () => {
    for (const slug of COMPARISON_PAGES) expect(page(slug), slug).not.toMatch(/>\s*✓?\s*Verified\s*</);
  });

  // CLAUDE.md: "Unlimited" is never claimed anywhere; Pro has a daily AI cap.
  it('never calls Pro unlimited', () => {
    for (const slug of COMPARISON_PAGES) expect(page(slug), slug).not.toMatch(/\bunlimited\b/i);
  });
});

// The three pages an assistant is most likely to lift an answer from:
// vs-datalemur is the page Perplexity cited for "alternatives to DataLemur"
// (ai-visibility-2026-09-06.md); best-sql-practice-sites answers the "where
// do I practise SQL" family the listicles own; datalemur-alternatives
// answers the alternatives family by its own title.
describe('answer-first summaries', () => {
  for (const slug of ['vs-datalemur', 'best-sql-practice-sites', 'datalemur-alternatives']) {
    it(`${slug} opens with one, under the H1, with a practise link`, () => {
      const html = page(slug);
      const blocks = html.match(/<p class="answer(?:-first)?" data-testid="answer-first"[^>]*>[\s\S]*?<\/p>/g) || [];
      expect(blocks, slug).toHaveLength(1);
      const at = html.indexOf('data-testid="answer-first"');
      expect(at).toBeGreaterThan(html.indexOf('</h1>'));
      expect(at).toBeLessThan(html.indexOf('<h2'));
      const text = blocks[0];
      expect(text).toMatch(new RegExp(`href="/app/\\?src=${slug}"`));
      expect(text).toContain(freeSolvesLabel());
      expect(text).not.toMatch(/most[- ]asked|by frequency|\d+% of|most popular|most people/i);
      const prose = text.replace(/<a [\s\S]*<\/a>/, '').replace(/<[^>]+>/g, '');
      const sentences = prose.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(x => x.trim());
      expect(sentences.length, slug).toBeGreaterThanOrEqual(2);
      expect(sentences.length, slug).toBeLessThanOrEqual(3);
    });
  }
});
