// SQL Quest — the company pages' two-section structure (2026-09-29)
//
// docs/plans/company-sourced-vs-topical-2026-09-21.md, "What is left" item 1,
// founder's go 2026-09-29. A company page has two kinds of content and until
// this date they were told apart by a note, not by structure:
//
//   "How the interview runs (sourced)" — the format rows and their dated
//     sources. Exists ONLY on a page in SOURCED_SLUGS; a general page has no
//     such section because it has nothing sourced to put in it.
//   "Topic practice" — the tagged challenge list on EVERY page, headed, with
//     one sentence saying what the set is. Three versions (practiceSentence in
//     the generator): the signed archetypes (Capital One, Revolut) carry the
//     app's `companySetSourced` line and the company-set gate's free three;
//     sourced-but-unsigned pages carry the app's `companySetMatched` line;
//     general pages say "tagged by topic from the 300+ bank, not modelled on
//     <Company>'s interview". The first two are read from src/utils/i18n.js so
//     page and app cannot drift.
//
// Capital One was frozen until its read (docs/plans/capital-one-2026-10-12.md);
// the freeze lifted 2026-11-22 and the page now carries both sections like
// every other signed archetype. SKIP_UNTIL_READ stays, empty, for the next one.
//
// Proven by deliberate breaks on 2026-09-29 (see the commit): a renamed
// eyebrow, a format heading on a general page, the archetype sentence on an
// unsigned page, and one byte appended to the built Capital One page each
// failed the test named for it.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SOURCED_SLUGS, SKIP_UNTIL_READ, practiceSentence, withTopicPractice, loadBank, facts } from '../scripts/build-company-pages.mjs';
import { readCompanyPages } from '../scripts/build-llms-txt.js';
import { archetypeForCompany } from '../src/data/interview-archetypes.js';
import { t, setLang } from '../src/utils/i18n.js';
import { COMPANY_SET_FREE_COUNT } from '../src/utils/display-count.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const noComments = s => s.replace(/<!--[\s\S]*?-->/g, '');
const count = (s, re) => (s.match(re) || []).length;

setLang('en');

const bank = loadBank();
const PAGES = readCompanyPages(ROOT, bank.tags).map(p => {
  const key = p.slug.replace(/-sql-interview$/, '');
  return { key, slug: p.slug, name: p.name, file: `src/${p.slug}.html`, html: read(`src/${p.slug}.html`) };
});
const LIVE = PAGES.filter(p => !SKIP_UNTIL_READ.has(p.key));
const SKIPPED = PAGES.filter(p => SKIP_UNTIL_READ.has(p.key));

const TOPIC_EYEBROW = /<span class="sl">Topic practice<\/span>/g;
const FORMAT_HEADING = /How the interview runs/g;
const ARCHETYPE_SENTENCE = /written for their reported screen/g;

describe('the page set this file binds', () => {
  it('is every company page, none skipped since the Capital One read (2026-11-22)', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(30);
    expect([...SKIP_UNTIL_READ]).toEqual([]);
    expect(SKIPPED).toEqual([]);
  });

  it('the signed archetypes are Capital One and Revolut, and nobody else', () => {
    const signed = PAGES.filter(p => archetypeForCompany(p.name)).map(p => p.key).sort();
    expect(signed).toEqual(['capital-one', 'revolut']);
  });
});

describe('"Topic practice" — the tagged challenge list, headed, on every page', () => {
  it('every company page has exactly one "Topic practice" heading', () => {
    for (const p of LIVE) {
      expect(count(noComments(p.html), TOPIC_EYEBROW), `${p.file}: run node scripts/build-company-pages.mjs`).toBe(1);
    }
  });

  it('the section sits after the challenge cards and above the FAQ, and holds the question list', () => {
    for (const p of LIVE) {
      const at = p.html.indexOf('<section id="topic-practice"');
      const cards = p.html.search(/<section id="(?:[a-z]+-)?questions"/);
      const faq = p.html.indexOf('<section id="faq"');
      expect(at, `${p.file}: no #topic-practice section`).toBeGreaterThan(0);
      if (cards >= 0) expect(at, `${p.file}: Topic practice must follow the challenge cards`).toBeGreaterThan(cards);
      expect(at, `${p.file}: Topic practice must sit above the FAQ`).toBeLessThan(faq);
      const block = p.html.slice(at, p.html.indexOf('<!-- company-topics:end -->', at));
      expect(block, `${p.file}: the section must carry the question list`).toMatch(/data-crosslink="questions"/);
      expect(count(block, /href="\/questions\//g), `${p.file}: the question list is empty`).toBeGreaterThan(0);
    }
  });

  it('the skipped page keeps the old strip and no new heading until its read', () => {
    for (const p of SKIPPED) {
      expect(count(noComments(p.html), TOPIC_EYEBROW), p.file).toBe(0);
      expect(p.html, `${p.file}: the old topic-links strip must still be there`).toContain('<!-- company-topics:start -->');
    }
  });

  it('is idempotent — a second run changes nothing', () => {
    const p = LIVE.find(x => x.key === 'anthropic');
    const f = facts(bank, p.name);
    const opts = { slug: p.key, name: p.name, dist: f.dist, ordered: f.ordered, bank: f.bank };
    const once = withTopicPractice(p.html, opts);
    expect(once).toBe(p.html);
    expect(withTopicPractice(once, opts)).toBe(once);
  });
});

describe('the one honest sentence under "Topic practice"', () => {
  const sentenceOn = p => {
    const m = p.html.match(/<p data-practice-kind="(archetype|sourced|general)"[^>]*>([^<]*)<\/p>/);
    return m ? { kind: m[1], text: m[2].replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"') } : null;
  };

  it('the archetype sentence appears only on the signed pages, with the set gate\'s free three', () => {
    for (const p of LIVE) {
      const n = count(noComments(p.html), ARCHETYPE_SENTENCE);
      if (archetypeForCompany(p.name)) {
        expect(n, `${p.file}: a signed archetype carries the authored sentence once`).toBe(1);
        expect(p.html).toContain(`In the app's ${p.name} set the first ${COMPANY_SET_FREE_COUNT} are free to try.`);
      } else {
        expect(n, `${p.file}: only a signed archetype may say the set was written for the company`).toBe(0);
      }
    }
    expect(LIVE.filter(p => archetypeForCompany(p.name)).map(p => p.key).sort()).toEqual(['capital-one', 'revolut']);
  });

  it('every page carries the sentence the generator would write, and it matches the app\'s copy', () => {
    for (const p of LIVE) {
      const f = facts(bank, p.name);
      const got = sentenceOn(p);
      expect(got, `${p.file}: no data-practice-kind sentence`).toBeTruthy();
      expect(got.text, p.file).toBe(practiceSentence({ slug: p.key, name: p.name, bank: f.bank }));
      const signed = !!archetypeForCompany(p.name);
      const sourced = SOURCED_SLUGS.has(p.key);
      expect(got.kind, p.file).toBe(signed ? 'archetype' : sourced ? 'sourced' : 'general');
      if (signed) {
        expect(got.text, p.file).toContain(t('practice', 'companySetSourced', { company: p.name }));
      } else if (sourced) {
        expect(got.text, p.file).toBe(t('practice', 'companySetMatched', { company: p.name }));
      } else {
        expect(got.text, p.file).toContain(`tagged by topic from the ${f.bank} bank, not modelled on ${p.name}'s interview`);
        // A general page has no source, so it must not say what candidates report.
        expect(got.text, p.file).not.toMatch(/candidates report/);
      }
    }
  });
});

describe('"How the interview runs (sourced)" — only where sources exist', () => {
  it('the heading appears exactly once on every sourced page and never on a general one', () => {
    for (const p of LIVE) {
      const n = count(noComments(p.html), FORMAT_HEADING);
      if (SOURCED_SLUGS.has(p.key)) {
        expect(n, `${p.file}: a sourced page carries the format heading once`).toBe(1);
        expect(noComments(p.html), `${p.file}: the heading must say it is sourced`).toMatch(/How the interview runs \(sourced\)/);
        // The rows it heads carry the dated sources line (company-pages.test.js binds the date).
        const at = p.html.indexOf('How the interview runs');
        const rest = p.html.slice(at);
        expect(rest, `${p.file}: a Sources: line must follow the heading`).toMatch(/Sources: /);
      } else {
        expect(n, `${p.file}: a page with no dated source has nothing to put under this heading`).toBe(0);
      }
    }
  });

  it('is not vacuous — both kinds of page exist', () => {
    expect(LIVE.filter(p => SOURCED_SLUGS.has(p.key)).length).toBeGreaterThanOrEqual(10);
    // 19 → 18 on 2026-11-23: Shopify became a sourced page.
    expect(LIVE.filter(p => !SOURCED_SLUGS.has(p.key)).length).toBeGreaterThanOrEqual(18);
  });
});

// 2026-09-29: the app's company view says the same thing the page does. It
// used to show `companySetMatched` ("topics candidates report") for every
// company without an authored set — including the 19 with no source at all.
describe('the app and the page agree on where a company set came from', () => {
  const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
  const i18n = fs.readFileSync(path.join(ROOT, 'src/utils/i18n.js'), 'utf8');

  it('i18n carries companySetGeneral in both languages, with the bank count', () => {
    expect(i18n.match(/companySetGeneral: '/g)).toHaveLength(2);
    expect(t('practice', 'companySetGeneral', { company: 'Acme', bank: '300+' }))
      .toBe("These are SQL Quest challenges tagged by topic from the 300+ bank, not modelled on Acme's interview — we have no dated public source for it, so this is general practice on the kind of data Acme works with.");
  });

  it('the app picks sourced / matched / general from the same registries as the page', async () => {
    expect(app).toMatch(/companyHasAuthoredSet\(company\) \? 'companySetSourced' : companyHasSourcedFormat\(company\) \? 'companySetMatched' : 'companySetGeneral'/);
    expect(app.match(/i18n_t\('practice', companySetProvenanceKey\(companyFilter\), \{ company: companyFilter, bank: bankCountLabel\(challenges\.length\) \}\)/g)).toHaveLength(2);
    const { SOURCED_COMPANY_NAMES, COMPANY_INTERVIEWS, SOURCED_FORMATS } = await import('../src/data/company-interviews.js');
    for (const c of [...Object.values(COMPANY_INTERVIEWS), ...Object.values(SOURCED_FORMATS)]) expect(SOURCED_COMPANY_NAMES.has(c.name), c.name).toBe(true);
    expect(SOURCED_COMPANY_NAMES.has('Anthropic')).toBe(false);
  });
});
