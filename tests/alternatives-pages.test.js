// Neutral comparison pages (SEO plan 2026-09-13, P2.14). Competitor facts
// come from the dated read each tool's `checked` date names (READS in the
// generator: alternatives-facts-2026-09-13.md, or a later re-read); this pins that the
// pages are what the generator writes, that every competitor price on them
// appears in that read, that each carries its dated source, and that SQL
// Quest's own section says what it is worse at.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderAlternatives, PAGES, tools, sqlQuestFacts, READS } from '../scripts/build-alternatives-pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const readFor = t => {
  const file = READS[t.checked || '2026-09-13'];
  if (!file) throw new Error(`no read registered for ${t.checked}`);
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
};

describe('alternatives pages', () => {
  it('src files are fresh', () => {
    for (const slug of Object.keys(PAGES)) {
      expect(fs.readFileSync(path.join(ROOT, 'src', `${slug}.html`), 'utf8'), `${slug} stale`).toBe(renderAlternatives(slug));
    }
  });

  it('every competitor dollar figure is in the dated read its check date names', () => {
    const T = tools(sqlQuestFacts());
    const missing = [];
    for (const [k, t] of Object.entries(T)) {
      if (t.ours) continue;
      const facts = readFor(t);
      for (const m of `${t.paid} ${t.free}`.matchAll(/\$[\d,]+(?:\.\d+)?/g)) {
        if (!facts.includes(m[0])) missing.push(`${k}: ${m[0]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every competitor card links its source with the check date; ours lists weaknesses', () => {
    for (const slug of Object.keys(PAGES)) {
      const html = renderAlternatives(slug);
      expect(html).toContain('Who wrote this:');
      expect(html).toContain('Where it is weaker:');
      const dated = (html.match(/checked \d{4}-\d{2}-\d{2}\./g) || []).filter(m => READS[m.slice(8, 18)]);
      expect(dated.length).toBeGreaterThanOrEqual(PAGES[slug].order.length - 1);
      expect(html).not.toMatch(/\bverified\b/i);
    }
  });

  it('the DataLemur page opens with an answer-first summary built from the dated entries (C2, 2026-11-22)', () => {
    const T = tools(sqlQuestFacts());
    const html = renderAlternatives('datalemur-alternatives');
    const m = html.match(/<p class="answer" data-testid="answer-first"[^>]*>([\s\S]*?)<\/p>/);
    expect(m, 'answer-first block').toBeTruthy();
    // It sits above the lede, i.e. it is the first thing under the H1.
    expect(html.indexOf('data-testid="answer-first"')).toBeLessThan(html.indexOf('class="lede"'));
    const text = m[1];
    expect(text).toContain(`checked on ${T.datalemur.checked}`);
    for (const d of text.matchAll(/\$[\d,]+(?:\.\d+)?/g)) expect(readFor(T.datalemur), d[0]).toContain(d[0]);
    expect(text).toMatch(/href="\/app\/\?src=datalemur-alternatives"/);
    expect(text).not.toMatch(/most[- ]asked|by frequency|\d+% of/i);
  });
});
