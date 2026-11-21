// The company page's hero names question 1 (M-02,
// docs/plans/monetization-ideas-2026-11-22.md). Only 19% of company-page
// landing people open the app; the hero button now names the question the
// app's company banner will hand them. Pins: every company page's
// `cta_hero_primary` names a real challenge, and it is the one the banner
// picks for a cold visitor (curriculum order, Hard locks, the company set
// gate) — so the page never promises a question the app will not open; the
// link itself is unchanged (no `?challenge=` until the 12-18 banner read).
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadQuestionBank } from '../scripts/question-slugs.mjs';
import { SQL_ROADMAP_CHALLENGE_ORDER } from '../src/data/roadmap-stages.js';
import { buildCurriculumOrder } from '../src/utils/challenge-order.js';
import { companyFirstQuestion, companyHeroCtaText } from '../src/utils/company-first-question.js';
import { withHeroCta, HERO_NAMES_FIRST_QUESTION, COMPANY_SET_GATE_ON } from '../scripts/build-company-pages.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const app = read('src/app.jsx');
const flags = read('src/data/feature-flags.js');
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

let bank, byTitle;
beforeAll(() => {
  const { bank: b, tags } = loadQuestionBank();
  bank = b.map(c => ({ ...c, companies: tags[c.id] || [] }));
  byTitle = new Map(bank.map(c => [c.title, c]));
});

const C = (id, difficulty, extra = {}) => ({ id, difficulty, title: `T${id}`, ...extra });

describe('companyFirstQuestion — the banner\'s pick for a cold visitor', () => {
  it('follows curriculum order, never raw id order', () => {
    const order = buildCurriculumOrder([{ challengeIds: [7, 3] }]);
    expect(companyFirstQuestion({ order, scoped: [C(3, 'Easy'), C(7, 'Easy')], setGateOn: false }).id).toBe(7);
  });
  it('skips a locked Hard, keeps a free Hard preview', () => {
    const order = buildCurriculumOrder([{ challengeIds: [5, 6, 8] }]);
    expect(companyFirstQuestion({ order, scoped: [C(5, 'Hard'), C(8, 'Easy')], setGateOn: false }).id).toBe(8);
    expect(companyFirstQuestion({ order, scoped: [C(6, 'Hard', { freePreview: true }), C(8, 'Easy')], setGateOn: false }).id).toBe(6);
  });
  it('under the set gate only the first three of the set (difficulty, then id) are eligible', () => {
    const order = buildCurriculumOrder([{ challengeIds: [40] }]);
    const scoped = [C(10, 'Easy'), C(11, 'Easy'), C(12, 'Medium'), C(40, 'Medium')];
    expect(companyFirstQuestion({ order, scoped, setGateOn: false }).id).toBe(40);
    expect(companyFirstQuestion({ order, scoped, setGateOn: true }).id).toBe(10);
  });
  it('nothing to pick → null; the words never carry a number', () => {
    expect(companyFirstQuestion({ order: new Map(), scoped: [] })).toBeNull();
    expect(companyFirstQuestion({ order: new Map(), scoped: [C(1, 'Hard')], setGateOn: false })).toBeNull();
    expect(companyHeroCtaText('Wise', { title: 'Country Codes in Uppercase' }))
      .toBe('Solve Wise question 1 now: Country Codes in Uppercase — free, no sign-up');
    expect(companyHeroCtaText('Wise', null)).toBe('Solve Wise question 1 now — free, no sign-up');
  });
});

describe('the generator reads the app\'s own flag', () => {
  it('COMPANY_SET_GATE_ON agrees with feature-flags.js', () => {
    expect(COMPANY_SET_GATE_ON).toBe(/\n\s*companySetGate:\s*true,/.test(flags));
    expect(HERO_NAMES_FIRST_QUESTION).toBe(true);
  });
  it('the app\'s banner still picks with the same locks the helper mirrors', () => {
    const at = app.indexOf('const companyBannerNext = () =>');
    const fn = app.slice(at, app.indexOf('\n  };', at));
    expect(fn).toContain('pickNextChallenge(scoped');
    expect(fn).toContain("isContentLocked('challenge', c)");
    expect(fn).toContain('companySetGate(');
    expect(app).toContain("case 'challenge': return item?.difficulty === 'Hard' && !item?.freePreview;");
  });
});

describe('every company page names its question 1', () => {
  const pages = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /-sql-interview\.html$/.test(f));

  it('each page but Capital One has exactly one cta_hero_primary, a /app/?company= link (no ?challenge=)', () => {
    expect(pages.length).toBeGreaterThanOrEqual(30);
    for (const f of pages) {
      const html = read(`src/${f}`);
      const n = (html.match(/data-track="cta_hero_primary"/g) || []).length;
      // Capital One's hero already opens challenge 275 directly (its own plan,
      // docs/plans/capital-one-2026-10-12.md); it keeps that button.
      if (f === 'capital-one-sql-interview.html') { expect(n, f).toBe(0); continue; }
      expect(n, f).toBe(1);
      const m = html.match(/<a href="([^"]*)" class="btn bp" data-track="cta_hero_primary">/);
      expect(m, f).not.toBeNull();
      expect(m[1], f).toMatch(/^\/app\/\?company=[^"&]+&amp;(src=[a-z-]+-sql-interview&amp;)?goal=interview$/);
    }
  });

  it('the named question exists in the bank and is the curriculum-first open one of the company\'s set', () => {
    for (const f of pages) {
      if (f === 'capital-one-sql-interview.html') continue;
      const html = read(`src/${f}`);
      const m = html.match(/<a href="\/app\/\?company=([^"&]+)[^"]*" class="btn bp" data-track="cta_hero_primary">([^<]*)<\/a>/);
      const company = decodeURIComponent(m[1]);
      const text = unesc(m[2]);
      const named = text.match(/^Solve (.+?) question 1 now: (.+) — free, no sign-up$/);
      expect(named, `${f}: "${text}"`).not.toBeNull();
      expect(named[1], f).toBe(company);
      const challenge = byTitle.get(named[2]);
      expect(challenge, `${f}: "${named[2]}" is not a challenge title in the bank`).toBeTruthy();
      const scoped = bank.filter(c => c.companies.includes(company));
      const pick = companyFirstQuestion({ order: SQL_ROADMAP_CHALLENGE_ORDER, scoped, setGateOn: COMPANY_SET_GATE_ON });
      expect(pick, f).not.toBeNull();
      expect(challenge.id, `${f}: names #${challenge.id}, the banner opens #${pick.id} "${pick.title}"`).toBe(pick.id);
      expect(challenge.difficulty === 'Hard' && !challenge.freePreview, `${f}: a locked Hard`).toBe(false);
    }
  });
});

describe('withHeroCta (the older pages)', () => {
  const page = `<nav><a href="/app/?company=Wise&amp;goal=interview" class="btn bp" style="x">Start Free →</a></nav>
<section class="hero"><div>
      <a href="/app/?company=Wise&amp;goal=interview" class="btn bp">Practice 16 Wise-Pattern Challenges Free</a>
      <a href="#questions" class="btn bo">See Sample Questions ↓</a>
</div></section>`;
  it('rewrites the hero button only, keeps its href, adds the tracking; idempotent', () => {
    const once = withHeroCta(page, { name: 'Wise', first: { title: 'Country Codes in Uppercase' } });
    expect(once).toContain('<a href="/app/?company=Wise&amp;goal=interview" class="btn bp" data-track="cta_hero_primary">Solve Wise question 1 now: Country Codes in Uppercase — free, no sign-up</a>');
    expect(once, 'the nav button is not the hero').toContain('style="x">Start Free →</a>');
    expect(withHeroCta(once, { name: 'Wise', first: { title: 'Country Codes in Uppercase' } })).toBe(once);
  });
  it('leaves a page without a plain company link in its hero alone', () => {
    const c1 = '<section class="hero"><a href="/app/?company=Capital%20One&challenge=275&src=x" class="btn bp" data-track="cta_practice_card_data">Practice</a></section>';
    expect(withHeroCta(c1, { name: 'Capital One', first: { title: 'X' } })).toBe(c1);
  });
});
