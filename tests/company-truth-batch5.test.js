// R1 batch 5 truth fixes (2026-11-23) — the unsourced phrases the dossiers
// found must not come back.
//
// Dossiers: docs/reads/companies/{apple,tesla,tiktok,bloomberg,amazon}.md and
// docs/reads/company-research-2026-11-20.md (Monzo). Each phrase below was on a
// live page and had no source at medium confidence or better: a claim about
// what a company "screens for", a role a cited source never names, a ranked
// topic list with no counts behind it, a difficulty grade read off snippets
// that were never opened, a sourced page denying it has sources, a company
// that publishes its process described as one that does not.
//
// Every page is checked twice: the source under src/ and both built copies
// under public/ (build-static-pages.js writes <slug>.html and <slug>/index.html).

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SOURCED_SLUGS, withCurrentSourcesPointer } from '../scripts/build-company-pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const copies = slug => [
  `src/${slug}-sql-interview.html`,
  `public/${slug}-sql-interview.html`,
  `public/${slug}-sql-interview/index.html`,
].filter(f => fs.existsSync(path.join(ROOT, f)));

const BANNED = {
  apple: [
    /every pattern asked/i,
    /\bApp Store\b/,
    /\bServices (?:growth|revenue)\b/i,
    /Apple(?:&rsquo;|['’])?s? patterns/i,
    /Apple SQL interview patterns/i,
    /apple bi sql/i,
    /Analytics Engineer roles/i,
  ],
  tesla: [
    /screens? for/i,
    /factory floors/i,
    /Tesla-pattern/i,
    /Tesla(?:&rsquo;|['’])s patterns/i,
    /Tesla SQL interview patterns/i,
  ],
  tiktok: [
    /Data Scientist, Data Analyst and Data Engineer/,
    /Reported most often/,
    /agree on a live SQL screen/i,
    /screen on HackerRank/i,
    /\(live, on HackerRank\)/i,
    /medium-to-hard/i,
    /creator cohorts/i,
    /6 Feb 2022/,
  ],
  bloomberg: [
    /Reported most often/,
    /SQL shaped around prices, trades and sessions/i,
    /Joins, INNER vs LEFT/,
    /Easy-to-medium/i,
    /updated 3 Jun 2026/,
    /what candidates report about the data analyst process/i,
    /30–60 minute data exercise/,
  ],
  monzo: [/Monzo does not publish/],
};

describe('R1 batch 5: the unsourced phrases stay off the pages', () => {
  for (const [slug, res] of Object.entries(BANNED)) {
    it(`${slug}: none of the ${res.length} removed phrases is back (src and both built copies)`, () => {
      const files = copies(slug);
      expect(files.length, `${slug}: src page and its built copies`).toBe(3);
      const hits = files.flatMap(f => res.filter(re => re.test(read(f))).map(re => `${f}: ${re}`));
      expect(hits).toEqual([]);
    });
  }

  it('Monzo says it publishes its own process (the `publishes` field), in the section, the note and the FAQ', () => {
    const html = read('src/monzo-sql-interview.html');
    expect(html.split('Monzo publishes how its data interviews run').length - 1).toBeGreaterThanOrEqual(4);
  });

  it('TikTok carries the read-or-debug row, cited to two reports', () => {
    const html = read('src/tiktok-sql-interview.html');
    expect(html).toMatch(/Read or debug a query/);
    expect(html).toMatch(/prachub-tt-ds-jun26[\s\S]*prachub-tt-de-sep25/);
  });
});

// A sourced page that also says "we have no dated, citable source … this page
// states no round length, no tool and no process" contradicts its own sourced
// section. Amazon did (its FAQ and general card), as Meta and Shopify did
// before #209; Apple would have, the moment it gained a sourced row.
const DENIALS = [
  /we have no dated, citable source/i,
  /states no round length, no tool and no process/i,
  /no dated public source for how/i,
];
describe('a sourced company page never denies having sources', () => {
  const sourced = [...SOURCED_SLUGS].filter(s => fs.existsSync(path.join(ROOT, `src/${s}-sql-interview.html`)));
  it('is not vacuous — Amazon and Apple are among the sourced pages', () => {
    expect(sourced).toEqual(expect.arrayContaining(['amazon', 'apple', 'meta', 'shopify']));
  });
  it('holds for every sourced page, src and built', () => {
    const hits = sourced.flatMap(s => copies(s).flatMap(f => DENIALS.filter(re => re.test(read(f))).map(re => `${f}: ${re}`)));
    expect(hits).toEqual([]);
  });
});

// "The one page on this site that does carry dated public sources for a
// company's screen is the Capital One page" was true in September and false
// by November (sixteen sourced pages). The generator rewrites it on every run
// (withCurrentSourcesPointer); this fails if any page carries it again.
const STALE = /The one page on this site (?:that does carry|with) dated public sources/;
describe('the "only Capital One has sources" sentence is gone everywhere', () => {
  it('fixture: the rewrite turns all three stale forms into the current one', () => {
    const faqLd = "… once you solve one. The one page on this site that does carry dated public sources for a company's screen is the Capital One page.";
    const faqJs = "… once you solve one. The one page on this site that does carry dated public sources for a company\\'s screen is the Capital One page.";
    const card = 'gap. The one page on this site with dated public sources for a company’s screen is the <a href="/capital-one-sql-interview/" style="color:inherit">Capital One CodeSignal page</a>.';
    for (const s of [faqLd, faqJs, card]) {
      const out = withCurrentSourcesPointer(s);
      expect(out, s).not.toMatch(STALE);
      expect(out).toMatch(/Pages that do (?:carry|have) dated public sources/);
    }
    expect(withCurrentSourcesPointer(card)).toContain('<a href="/capital-one-sql-interview/" style="color:inherit">Capital One CodeSignal page</a>, list them.');
  });
  it('no company page under src/ or public/ carries it', () => {
    const files = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /-sql-interview\.html$/.test(f))
      .flatMap(f => copies(f.replace(/-sql-interview\.html$/, '')));
    expect(files.length).toBeGreaterThan(60);
    expect(files.filter(f => STALE.test(read(f)))).toEqual([]);
  });
});
