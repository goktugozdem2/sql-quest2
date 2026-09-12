// Neutral comparison pages (SEO plan 2026-09-13, P2.14). Competitor facts
// come from docs/reads/alternatives-facts-2026-09-13.md; this pins that the
// pages are what the generator writes, that every competitor price on them
// appears in that read, that each carries its dated source, and that SQL
// Quest's own section says what it is worse at.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { renderAlternatives, PAGES, tools, sqlQuestFacts } from '../scripts/build-alternatives-pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const facts = fs.readFileSync(path.join(ROOT, 'docs/reads/alternatives-facts-2026-09-13.md'), 'utf8');

describe('alternatives pages', () => {
  it('src files are fresh', () => {
    for (const slug of Object.keys(PAGES)) {
      expect(fs.readFileSync(path.join(ROOT, 'src', `${slug}.html`), 'utf8'), `${slug} stale`).toBe(renderAlternatives(slug));
    }
  });

  it('every competitor dollar figure is in the dated facts read', () => {
    const T = tools(sqlQuestFacts());
    const missing = [];
    for (const [k, t] of Object.entries(T)) {
      if (t.ours) continue;
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
      expect((html.match(/checked 2026-09-13\./g) || []).length).toBeGreaterThanOrEqual(PAGES[slug].order.length - 1);
      expect(html).not.toMatch(/\bverified\b/i);
    }
  });
});
