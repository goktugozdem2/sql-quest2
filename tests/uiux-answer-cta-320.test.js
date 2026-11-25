// The answer-first CTA wraps on a 320 px phone (A4 UI/UX audit, issue #308,
// 2026-11-24, U1/U2 on the Galaxy S9+ row).
//
// /datalemur-alternatives/ opens with an answer-first paragraph ending in
// "Practise a SQL interview question free", set `white-space:nowrap` so the
// phrase never breaks. On a 320 px phone that one unbreakable line is 317 px
// inside a ~233 px box: the page ran 42 px sideways and the CTA's right half
// sat off screen. Below 480 px the phrase may now wrap; from 480 px up it
// stays on one line, as before.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderAlternatives, PAGES, CSS } from '../scripts/build-alternatives-pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const ctaTag = (html) => html.match(/<a [^>]*data-track="cta_answer_first_[^"]*"[^>]*>/)?.[0];

describe('the answer-first CTA fits a 320 px phone', () => {
  const withAnswer = Object.keys(PAGES).filter(slug => ctaTag(renderAlternatives(slug)));

  it('at least the DataLemur page has the CTA', () => expect(withAnswer).toContain('datalemur-alternatives'));

  it('the CTA is never nowrap inline (it would hold 317 px in a 233 px box)', () => {
    for (const slug of withAnswer) expect(ctaTag(renderAlternatives(slug)), slug).not.toMatch(/white-space:\s*nowrap/);
  });

  it('it keeps the phrase on one line only where it fits (480 px and up)', () => {
    for (const slug of withAnswer) expect(ctaTag(renderAlternatives(slug)), slug).toMatch(/class="af-cta"/);
    expect(CSS.replace(/\s+/g, '')).toContain('@media(min-width:480px){.af-cta{white-space:nowrap}}');
  });

  it('the committed page matches the generator', () => {
    for (const slug of withAnswer) {
      expect(fs.readFileSync(path.join(ROOT, 'src', `${slug}.html`), 'utf8'), `${slug}: run node scripts/build-alternatives-pages.mjs`).toBe(renderAlternatives(slug));
    }
  });
});
