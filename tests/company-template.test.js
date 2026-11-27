import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { COMPANY_INTERVIEWS, NEW_COMPANY_TAGS } from '../src/data/company-interviews.js';
import { loadBank, facts, renderPage, withProvenance, pageOutputs, SKIP_UNTIL_READ } from '../scripts/build-company-pages.mjs';
import { withFirstScreen, FIRST_SCREENS } from '../scripts/company-first-screen.mjs';
import { QUESTIONS, buildData, render } from '../scripts/build-readiness-test.mjs';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';

// The company template and the readiness test (founder's SEO plan,
// 2026-09-13, P0.4–P0.6). Both write committed pages from data; these guards
// keep the committed pages equal to what the generators would write today, and
// keep the data honest: every cited source resolves, every tag is a real
// challenge, and the readiness test's answers are in range.
const ROOT = path.resolve(import.meta.dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const stripStrip = html => html.replace(/<!-- related-companies:start -->[\s\S]*?<!-- related-companies:end -->\n?/, '');

describe('company template', () => {
  const bank = loadBank();

  it('every format row and question shape cites sources that exist, with a date', () => {
    for (const [key, d] of Object.entries(COMPANY_INTERVIEWS)) {
      const keys = new Set(Object.keys(d.sources));
      for (const r of d.format) for (const k of r[2]) expect(keys.has(k), `${key}: format row "${r[0]}" cites ${k}`).toBe(true);
      for (const s of d.shapes) expect(keys.has(s[1]), `${key}: shape cites ${s[1]}`).toBe(true);
      for (const [k, [label, url, date]] of Object.entries(d.sources)) {
        expect(label.length, `${key}/${k} label`).toBeGreaterThan(5);
        expect(date, `${key}/${k} date`).toBeTruthy();
        if (url) expect(url, `${key}/${k}`).toMatch(/^https:\/\//);
      }
    }
  });

  it('every new tag is a real challenge, and no set starts without a free Easy or Medium', () => {
    for (const [name, ids] of Object.entries(NEW_COMPANY_TAGS)) {
      for (const id of ids) expect(bank.byId.has(id), `${name} #${id}`).toBe(true);
      const f = facts(bank, name);
      expect(f.n, name).toBe(new Set(ids).size);
      expect(f.easy + f.medium, `${name} needs a free way in`).toBeGreaterThanOrEqual(8);
    }
  });

  it('the committed pages are the generator\'s output (the related strip aside)', () => {
    for (const [key, d] of Object.entries(COMPANY_INTERVIEWS)) {
      const committed = stripStrip(read(`src/${key}-sql-interview.html`));
      // The provenance note (2026-09-14) is injected after generation, so the
      // expectation carries it too — the guard still covers that block.
      // So is the first-screen block (2026-11-24, scripts/company-first-screen.mjs).
      const f = facts(bank, d.name);
      const generated = withFirstScreen(withProvenance(renderPage(key, d, f), { slug: key, name: d.name }), key, f);
      expect(committed, `${key}: re-run node scripts/build-company-pages.mjs`).toBe(stripStrip(generated));
    }
  });

  // 2026-11-27: the check above covered only the template pages. The older
  // pages are rewritten by the same run (olderPage strips the first-screen
  // block and puts back only what FIRST_SCREENS holds), and Wise's
  // hand-written first screen (#361) would have been deleted by the next run
  // without any test noticing. This runs the whole generator in memory over
  // the committed sources and asks for every company page, byte for byte.
  // Proven by removing FIRST_SCREENS.wise: fails naming wise-sql-interview.html.
  it('running the generator over the committed sources changes no company page, byte for byte', () => {
    const outputs = pageOutputs(bank);
    const pages = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /-sql-interview\.html$/.test(f))
      .filter(f => !SKIP_UNTIL_READ.has(f.replace(/-sql-interview\.html$/, '')));
    expect([...outputs.keys()].map(k => `${k}-sql-interview.html`).sort()).toEqual(pages.sort());
    for (const [key, { before, after }] of outputs) {
      expect(after === before, `${key}-sql-interview.html: node scripts/build-company-pages.mjs would rewrite it (a hand edit the generator does not own?)`).toBe(true);
    }
  });

  it('a first-screen block appears only on a page FIRST_SCREENS configures', () => {
    for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(x => /-sql-interview\.html$/.test(x))) {
      const key = f.replace(/-sql-interview\.html$/, '');
      expect(read(`src/${f}`).includes('<!-- company-first-screen:start -->'), `${f}: block without a FIRST_SCREENS entry, or entry without a block`)
        .toBe(Boolean(FIRST_SCREENS[key]));
    }
  });

  // 2026-11-27: until this date the company generators ran only by hand, so a
  // fix made in build-company-pages.mjs reached no page until someone
  // remembered to run it, and a hand edit to a generated page sat in the tree
  // until the next person did. `npm run build` now runs them, in the order
  // CLAUDE.md's "Company pages" section gives (pages → cross-link strip →
  // the rest of the build), before card-skill-blurbs rewrites the card lines
  // and before build-static-pages copies the pages into public/. The strip
  // comes second because the template pages are rendered without it.
  it('npm run build runs the company generators, pages then strip, before the blurbs and the copy to public/', () => {
    const build = JSON.parse(read('package.json')).scripts.build;
    const at = s => build.indexOf(`node scripts/${s}`);
    const pages = at('build-company-pages.mjs');
    const strip = at('build-company-crosslinks.mjs');
    expect(pages, 'build-company-pages.mjs is not in the build script').toBeGreaterThan(-1);
    expect(strip, 'build-company-crosslinks.mjs is not in the build script').toBeGreaterThan(-1);
    expect(pages, 'build-company-pages must run before build-company-crosslinks').toBeLessThan(strip);
    expect(strip, 'the company generators must run before build-interview-hub').toBeLessThan(at('build-interview-hub.mjs'));
    expect(strip, 'the company generators must run before card-skill-blurbs').toBeLessThan(at('card-skill-blurbs.mjs'));
    expect(strip, 'the company generators must run before build-static-pages').toBeLessThan(at('build-static-pages.js'));
  });

  it('every older company page carries the readiness block and the topic links', () => {
    const pages = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /-sql-interview\.html$/.test(f));
    expect(pages.length).toBeGreaterThanOrEqual(30);
    for (const f of pages) {
      const html = read(`src/${f}`);
      expect(html, f).toContain('<!-- company-readiness:start -->');
      expect(html, f).toContain('/sql-interview-readiness-test/?company=');
      expect(html, f).toContain('<!-- company-topics:start -->');
    }
  });
});

describe('SQL interview readiness test', () => {
  it('ten questions, four options each, an answer in range, a canonical skill, and a reason', () => {
    expect(QUESTIONS.length).toBe(10);
    for (const q of QUESTIONS) {
      expect(q.options.length, q.q).toBe(4);
      expect(q.answer >= 0 && q.answer < 4, q.q).toBe(true);
      expect(CANONICAL_SKILLS, q.q).toContain(q.skill);
      expect(q.why.length, q.q).toBeGreaterThan(40);
    }
  });

  it('company weights come from the tagged set, and every recommended next challenge is free and real', () => {
    const data = buildData();
    const bank = loadBank();
    expect(Object.keys(data.companies).length).toBeGreaterThanOrEqual(30);
    for (const [slug, c] of Object.entries(data.companies)) {
      expect(Object.values(c.weights).some(w => w > 0), slug).toBe(true);
      for (const [skill, next] of Object.entries(c.next)) {
        if (!next) continue;
        const ch = bank.byId.get(next.id);
        expect(ch, `${slug}/${skill}`).toBeTruthy();
        expect(ch.title).toBe(next.title);
      }
    }
  });

  it('the committed page is the generator\'s output', () => {
    expect(read('src/sql-interview-readiness-test.html'), 're-run node scripts/build-readiness-test.mjs').toBe(render(buildData()));
  });

  it('says the company score is a weighting of our set, not a measurement of the interview', () => {
    expect(read('src/sql-interview-readiness-test.html')).toMatch(/a weighting of our set, not a measurement of/);
  });
});
