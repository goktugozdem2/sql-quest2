// Structured data on the company pages and the interview hub (C1, 2026-11-22).
//
// Every company page (src/*-sql-interview.html, 34 on 2026-11-22) and the hub
// (src/sql-interview-prep.html) carry JSON-LD: a Course or LearningResource, a
// FAQPage, and on the template pages a BreadcrumbList. faq-schema.test.js
// checks that a schema question appears somewhere on the page, as a ratchet.
// This file is the strict gate for these 35 pages, in source and as built:
//   - every ld+json block parses and names schema.org and a @type;
//   - one FAQPage, every entry a Question with an Answer, and the questions
//     AND answers equal the visible FAQ (the page's FAQS array), in order;
//   - Course/LearningResource carry a name (+ description and provider for a
//     Course), and any url equals the page's canonical;
//   - a BreadcrumbList numbers its items 1..n, names each one, gives every
//     non-final item an absolute sqlquest.app URL, and ends on the canonical.
// The first sweep (2026-11-22) found nothing failing: this is a guard, not a
// fix. Breaks it caught are listed in the commit.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://sqlquest.app';

export const PAGES = fs.readdirSync(path.join(ROOT, 'src'))
  .filter(f => /-sql-interview\.html$/.test(f))
  .sort()
  .map(f => f.replace(/\.html$/, ''))
  .concat(['sql-interview-prep']);

const noComments = s => s.replace(/<!--[\s\S]*?-->/g, '');

export const normText = s => String(s ?? '')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&mdash;|&#8212;/g, '—').replace(/&ndash;|&#8211;/g, '–')
  .normalize('NFC').replace(/\s+/g, ' ').trim();

/** Every ld+json block: { raw, json } or { raw, error }. */
export function ldBlocks(html) {
  return [...noComments(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m => {
      try { return { raw: m[1], json: JSON.parse(m[1]) }; } catch (e) { return { raw: m[1], error: e.message }; }
    });
}

const itemsOf = json => (Array.isArray(json) ? json : json['@graph'] || [json]);

/** The visible FAQ the page renders from its `const FAQS = [[q, a], …]`. */
export function visibleFaq(html) {
  const m = /const FAQS\s*=\s*(\[[\s\S]*?\n\s*\]);/.exec(noComments(html));
  if (!m) return null;
  // The array is this repo's own source: string literals only.
  return new Function(`return ${m[1]};`)();
}

/** All problems with one page's structured data, as readable strings. */
export function structuredDataProblems(html, slug) {
  const canonical = `${SITE}/${slug}/`;
  const out = [];
  const canon = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (canon !== canonical) out.push(`canonical is ${canon}, expected ${canonical}`);
  const blocks = ldBlocks(html);
  if (!blocks.length) out.push('no ld+json block');
  const faqs = [];
  for (const b of blocks) {
    if (b.error) { out.push(`ld+json does not parse: ${b.error}`); continue; }
    for (const it of itemsOf(b.json)) {
      const t = it['@type'];
      if (!/^https?:\/\/schema\.org\/?$/.test(it['@context'] ?? b.json['@context'] ?? '')) out.push(`${t}: @context is not schema.org`);
      if (!t) { out.push('a block has no @type'); continue; }
      if (t === 'FAQPage') faqs.push(it);
      if (t === 'Course' || t === 'LearningResource') {
        if (!it.name) out.push(`${t}: no name`);
        if (t === 'Course' && !it.description) out.push('Course: no description');
        if (t === 'Course' && !it.provider?.name) out.push('Course: no provider.name');
        if (it.url && it.url !== canonical) out.push(`${t}: url ${it.url} is not the canonical`);
      }
      if (t === 'BreadcrumbList') {
        const list = it.itemListElement || [];
        if (!list.length) out.push('BreadcrumbList: empty');
        list.forEach((x, i) => {
          if (x.position !== i + 1) out.push(`BreadcrumbList: item ${i + 1} has position ${x.position}`);
          if (!x.name) out.push(`BreadcrumbList: item ${i + 1} has no name`);
          const last = i === list.length - 1;
          if (!last && !String(x.item || '').startsWith(`${SITE}/`)) out.push(`BreadcrumbList: item ${i + 1} url ${x.item}`);
          if (last && x.item && x.item !== canonical) out.push(`BreadcrumbList: last item ${x.item} is not the canonical`);
        });
      }
    }
  }
  if (faqs.length !== 1) out.push(`${faqs.length} FAQPage blocks, expected 1`);
  const faq = faqs[0];
  if (faq) {
    const entries = faq.mainEntity || [];
    entries.forEach((q, i) => {
      if (q['@type'] !== 'Question' || !q.name) out.push(`FAQPage: entry ${i + 1} is not a named Question`);
      if (q.acceptedAnswer?.['@type'] !== 'Answer' || !q.acceptedAnswer?.text) out.push(`FAQPage: entry ${i + 1} has no Answer text`);
    });
    const visible = visibleFaq(html);
    if (!visible) out.push('FAQPage but no visible FAQS array');
    else {
      const sq = entries.map(q => normText(q.name));
      const vq = visible.map(([q]) => normText(q));
      if (JSON.stringify(sq) !== JSON.stringify(vq)) out.push(`FAQ questions differ from the visible FAQ: schema [${sq.join(' | ')}] vs page [${vq.join(' | ')}]`);
      else entries.forEach((q, i) => {
        const a = normText(q.acceptedAnswer?.text);
        const v = normText(visible[i][1]);
        if (a !== v) out.push(`FAQ answer ${i + 1} ("${sq[i]}") differs from the visible answer`);
      });
    }
  }
  return out;
}

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

describe('structured data — company pages and the interview hub', () => {
  it('covers every company page plus the hub', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(35);
    expect(PAGES).toContain('sql-interview-prep');
    expect(PAGES).toContain('capital-one-sql-interview');
  });

  it('source: valid JSON-LD, FAQ equal to the visible FAQ, breadcrumbs and urls sane', () => {
    const bad = PAGES.flatMap(slug => structuredDataProblems(read('src', `${slug}.html`), slug).map(p => `src/${slug}.html: ${p}`));
    expect(bad).toEqual([]);
  });

  it('built: the same holds for the served copy (public/<slug>/index.html)', () => {
    const bad = PAGES.flatMap(slug => structuredDataProblems(read('public', slug, 'index.html'), slug).map(p => `public/${slug}/index.html: ${p}`));
    expect(bad).toEqual([]);
  });
});

describe('the checker catches what it claims to', () => {
  const page = read('src', 'chime-sql-interview.html');
  it('a broken JSON-LD block', () => {
    const broken = page.replace('"@type": "FAQPage",', '"@type": "FAQPage",,');
    expect(broken).not.toBe(page);
    expect(structuredDataProblems(broken, 'chime-sql-interview').join('\n')).toMatch(/does not parse/);
  });
  it('a breadcrumb that skips a position', () => {
    const skipped = page.replace('"position": 2', '"position": 3');
    expect(skipped).not.toBe(page);
    expect(structuredDataProblems(skipped, 'chime-sql-interview').join('\n')).toMatch(/has position 3/);
  });
});
