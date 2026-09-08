import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import {
  findViolations, keyOf, readBaseline, schemaQuestions, pageBody, normalise, htmlPages,
} from '../scripts/faq-schema.mjs';

const ROOT = join(import.meta.dirname, '..');

// ---------------------------------------------------------------------------
// A page's FAQPage schema must describe questions the page actually contains.
//
// Google requires the marked-up Q&A to be visible on the source page. The
// sharper reason for us: JSON-LD is what an AI assistant reads. Perplexity
// quoted llms.txt back verbatim on 2026-09-06 — schema is read the same way,
// so a page whose FAQ answers questions the page never asks is a page telling
// assistants something nobody wrote.
//
// Found 2026-09-08 while fixing the two Turkish posts, whose schema FAQ and
// visible FAQ were entirely different question sets. The survey found 103
// such questions across 24 pages; the homepage declares nine.
//
// This is a RATCHET, not a clean gate — 103 findings cannot be fixed in the
// commit that discovers them, and a guard that can never go green is not a
// guard. Same shape as scripts/content-lint-baseline.txt.
// ---------------------------------------------------------------------------
describe('FAQPage schema describes questions that are on the page', () => {
  const violations = findViolations(ROOT);
  const baseline = readBaseline(ROOT);
  const keys = new Set(violations.map(keyOf));

  it('no NEW mismatch — every finding is one the baseline already knew about', () => {
    const added = violations.filter(v => !baseline.has(keyOf(v)));
    const detail = added.map(v => `  ${v.page}\n    "${v.question}"`).join('\n');
    expect(added.length, added.length === 0 ? '' :
      `${added.length} FAQ question(s) marked up but not present on the page.\n` +
      `Either write the visible Q&A or drop it from the JSON-LD — do NOT add it to ` +
      `scripts/faq-schema-baseline.txt:\n${detail}`).toBe(0);
  });

  it('the baseline only shrinks — a fixed line must be deleted from it', () => {
    const stale = [...baseline].filter(k => !keys.has(k));
    expect(stale, stale.length === 0 ? '' :
      `${stale.length} baseline line(s) no longer describe a real violation. ` +
      `Delete them from scripts/faq-schema-baseline.txt:\n  ${stale.join('\n  ')}`).toEqual([]);
  });

  it('the baseline names only pages that exist', () => {
    const gone = [...baseline]
      .map(k => k.split('\t')[0])
      .filter((p, i, a) => a.indexOf(p) === i)
      .filter(p => !existsSync(join(ROOT, p)));
    expect(gone, `baseline names deleted page(s): ${gone.join(', ')}`).toEqual([]);
  });
});

describe('the check itself is honest', () => {
  it('counts a JS-rendered FAQ as present — the company pages render theirs', () => {
    // An earlier draft stripped every <script> and produced 345 false
    // positives, because all 23 company pages build their FAQ from a `const FQ`
    // array. Google renders JS before indexing, so those questions are real.
    const page = 'src/airbnb-sql-interview.html';
    const html = readFileSync(join(ROOT, page), 'utf8');
    const qs = schemaQuestions(html);
    expect(qs.length, 'fixture lost its FAQ schema — pick another company page').toBeGreaterThan(0);
    const body = normalise(pageBody(html));
    for (const q of qs) {
      expect(body.includes(normalise(q)), `${page} should count "${q}" as present`).toBe(true);
    }
  });

  it('catches a question that is only in the schema', () => {
    // The homepage is the real instance: nine questions, none on the page.
    const found = findViolations(ROOT).filter(v => v.page === 'src/index.html');
    expect(found.length, 'src/index.html was fixed — delete its baseline lines and this expectation')
      .toBeGreaterThan(0);
  });

  it('normalises Unicode so Turkish questions compare correctly', () => {
    expect(normalise('WITH kullanımı nasıl? Sözdizimi nedir?'))
      .toBe('with kullanımı nasıl sözdizimi nedir');
    expect(normalise('LEFT JOIN nedir, ne zaman kullanılır?'))
      .toBe('left join nedir ne zaman kullanılır');
  });

  it('scans every directory that publishes pages', () => {
    const pages = htmlPages(ROOT);
    expect(pages).toContain('src/index.html');
    expect(pages.some(p => p.startsWith('src/blog/'))).toBe(true);
    expect(pages.some(p => p.startsWith('src/challenges/'))).toBe(true);
  });
});
