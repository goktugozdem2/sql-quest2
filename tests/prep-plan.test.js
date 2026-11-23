// /sql-interview-prep-plan/ (C2, 2026-11-22; GEO panel prompt #13, "2-week
// SQL interview prep plan", had no page). What must never drift:
//
//   - the nine skill days follow the learning path's order of the canonical
//     skills, and each day's questions are Easy → Medium → Hard on that skill,
//     picked in CURRICULUM order — never raw bank order, whose first Medium is
//     challenge 1 (CLAUDE.md, "raw challenge order");
//   - every question link resolves to a real challenge's /questions/ page;
//   - what is free is said by freeTierSentence, the bank only by its label,
//     and no price, frequency claim or company name is on the page;
//   - the FAQ JSON-LD equals the visible FAQ;
//   - the committed src page is what the generator writes, and the page is in
//     the build, the sitemap, llms.txt, and linked from /sql-exercises/ and
//     /sql-interview-prep/ in the same commit (CLAUDE.md, "Search-engine indexing").
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  renderPrepPlanPage, planDays, loadPlanContext, skillOrder, planEligible, accessTag, DIFFICULTIES,
} from '../scripts/build-prep-plan-page.mjs';
import { PLAN_SLUG, PLAN_TITLE, CLOSING_DAYS, SKILL_TOPIC_PAGE, planFaq } from '../src/data/prep-plan.js';
import { SQL_ROADMAP_STAGES, SQL_ROADMAP_CHALLENGE_ORDER } from '../src/data/roadmap-stages.js';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';
import { CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import { isFreePreview } from '../src/utils/challenge-order.js';
import { freeTierSentence, bankCountLabel } from '../src/utils/display-count.js';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const textOf = html => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

let cx; let days; let html; let text;
beforeAll(() => {
  cx = loadPlanContext();
  days = planDays(cx);
  html = renderPrepPlanPage(cx);
  text = textOf(html);
});

describe('the plan: nine skills, Easy to Hard, in curriculum order', () => {
  it('one day per canonical skill, in the order the learning path first teaches them', () => {
    expect(days.map(d => d.skill).sort()).toEqual([...CANONICAL_SKILLS].sort());
    const firstStage = skill => SQL_ROADMAP_STAGES.findIndex(st => (st.skills || []).includes(skill));
    const stageIdx = days.map(d => firstStage(d.skill)).filter(i => i >= 0);
    expect(stageIdx).toEqual(stageIdx.slice().sort((a, b) => a - b));
    expect(days.map(d => d.skill)).toEqual(skillOrder());
    expect(days[0].skill).toBe('Querying Basics');
  });

  it('every pick is on its skill, from the general bank, used once, and Easy → Medium → Hard within the day', () => {
    const seen = new Set();
    for (const d of days) {
      expect(d.picks.length, d.skill).toBe(3);
      const rank = d.picks.map(c => DIFFICULTIES.indexOf(c.difficulty));
      expect(rank, d.skill).toEqual(rank.slice().sort((a, b) => a - b));
      for (const c of d.picks) {
        expect(challengeMatchesSkill(c, d.skill), `${d.skill}: #${c.id}`).toBe(true);
        expect(planEligible(c, cx), `#${c.id}`).toBe(true);
        expect(seen.has(c.id), `#${c.id} used twice`).toBe(false);
        seen.add(c.id);
      }
    }
  });

  it('a day has a Hard whenever the general bank has one left on that skill', () => {
    for (const d of days) {
      const hardLeft = cx.bank.some(c => c.difficulty === 'Hard' && planEligible(c, cx) && challengeMatchesSkill(c, d.skill));
      if (hardLeft) expect(d.picks.some(c => c.difficulty === 'Hard'), d.skill).toBe(true);
    }
  });

  it('picks follow the curriculum, never raw bank order: the home stage first, earliest position first', () => {
    // challenge 1 is the bank's first Medium and the raw-order trap; 91 is where every path starts
    expect(days.flatMap(d => d.picks).map(c => c.id)).not.toContain(1);
    expect(days[0].picks[0].id).toBe(91);
    const used = new Set();
    for (const d of days) {
      const home = SQL_ROADMAP_STAGES.filter(st => (st.skills || []).includes(d.skill)).flatMap(st => st.challengeIds || []);
      for (const c of d.picks) {
        const candidates = cx.bank.filter(x => x.difficulty === c.difficulty && !used.has(x.id) && home.includes(x.id)
          && planEligible(x, cx) && challengeMatchesSkill(x, d.skill));
        if (candidates.length) {
          const earliest = candidates.slice().sort((a, b) => SQL_ROADMAP_CHALLENGE_ORDER.get(a.id) - SQL_ROADMAP_CHALLENGE_ORDER.get(b.id))[0];
          expect(c.id, `${d.skill} ${c.difficulty}: the home stage's earliest`).toBe(earliest.id);
        }
        used.add(c.id);
      }
    }
  });

  it('a Hard is tagged Pro unless it is a free preview', () => {
    for (const d of days) {
      for (const c of d.picks) {
        expect(accessTag(c)).toBe(c.difficulty !== 'Hard' ? null : isFreePreview(c) ? 'preview' : 'Pro');
        const tags = html.slice(html.indexOf(`data-plan-question="${c.id}"`), html.indexOf('</li>', html.indexOf(`data-plan-question="${c.id}"`)));
        if (accessTag(c)) expect(tags, `#${c.id}`).toContain(`<span class="tag">${accessTag(c)}</span>`);
        else expect(tags, `#${c.id}`).not.toMatch(/>(Pro|preview)</);
      }
    }
  });
});

describe('the page', () => {
  it('links every pick to its real /questions/ page, in plan order, and nothing else as a question', () => {
    const linked = [...html.matchAll(/<a href="\/questions\/([^"/]+)\/" data-plan-question="(\d+)">/g)];
    expect(linked.map(m => Number(m[2]))).toEqual(days.flatMap(d => d.picks.map(c => c.id)));
    for (const [, slug, id] of linked) {
      const c = cx.bank.find(x => x.id === Number(id));
      expect(c, `challenge ${id}`).toBeTruthy();
      expect(cx.slugs.get(c.id)).toBe(slug);
      expect(exists(`public/questions/${slug}/index.html`), slug).toBe(true);
    }
  });

  it('has a day 0 and fourteen numbered days: nine skills, then the closing days', () => {
    const numbers = [...html.matchAll(/data-plan-day="(\d+)"/g)].map(m => Number(m[1]));
    expect(numbers).toEqual([...Array(15).keys()]);
    expect(days.length + CLOSING_DAYS.length).toBe(14);
    expect(PLAN_TITLE).toContain('2-Week SQL Interview Prep Plan');
  });

  it('links the readiness test (day 0 and the last day), the trap pages, the Coach, the mock page and each topic page', () => {
    const day = n => html.slice(html.indexOf(`data-plan-day="${n}"`), html.indexOf('</section>', html.indexOf(`data-plan-day="${n}"`)));
    expect(day(0)).toContain('href="/sql-interview-readiness-test/"');
    expect(day(14)).toContain('href="/sql-interview-readiness-test/"');
    for (const p of SQL_PATTERNS) expect(day(10)).toContain(`href="/${p.slug}/"`);
    expect(day(11)).toMatch(/href="\/app\/\?src=prep-plan"/);
    expect(day(12)).toContain('href="/sql-mock-interview/"');
    for (const [skill, href] of Object.entries(SKILL_TOPIC_PAGE)) {
      expect(html, skill).toContain(`href="${href}"`);
      expect(exists(`public${href}index.html`), href).toBe(true);
    }
  });

  it('says what is free with freeTierSentence and the bank only through its label', () => {
    expect(text).toContain(freeTierSentence(cx.bank.length));
    expect(text).not.toContain(String(cx.bank.length));
    expect(text).toContain(bankCountLabel(cx.bank.length));
  });

  it('makes no price, frequency or company claim', () => {
    expect(text).not.toMatch(/\$\s?\d/);
    expect(text).not.toMatch(/\b(?:often|frequently|commonly|most[- ]asked|popular|every interview|always asked|top \d+)\b/i);
    expect(text).not.toMatch(/\b(?:Google|Meta|Amazon|Apple|Netflix|Microsoft|Capital One|Revolut|Stripe|Wise|JPMorgan|Uber|Airbnb|FAANG)\b/);
    expect(text).not.toMatch(/\bunlimited\b/i);
  });

  it('FAQ JSON-LD equals the visible FAQ, verbatim', () => {
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]));
    const faq = ld.find(o => o['@type'] === 'FAQPage');
    const section = html.slice(html.indexOf('<section class="faq">'), html.indexOf('</section>', html.indexOf('<section class="faq">')));
    const visible = [...section.matchAll(/<h3>(.*?)<\/h3>\s*<p>(.*?)<\/p>/g)].map(m => [decode(m[1]), decode(m[2])]);
    expect(visible).toEqual(planFaq({ bankCount: cx.bank.length }));
    expect(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text])).toEqual(visible);
  });

  it('answers first, and one primary CTA, tracked, on day 1\'s first question', () => {
    const first = html.indexOf('data-answer-first="true"');
    expect(first).toBeGreaterThan(html.indexOf('<h1'));
    expect(first).toBeLessThan(html.indexOf('data-plan-day="0"'));
    const bp = [...html.matchAll(/<a class="btn bp" href="([^"]+)" data-track="([^"]+)">/g)];
    expect(bp).toHaveLength(1);
    expect(decode(bp[0][1])).toBe(`/app/?challenge=${days[0].picks[0].id}&src=prep-plan`);
    expect(days[0].picks[0].difficulty).not.toBe('Hard');
    expect((html.match(/FFE34D/g) || []).length).toBe(1);
  });
});

describe('wiring', () => {
  it('the committed src page is what the generator writes', () => {
    expect(read(`src/${PLAN_SLUG}.html`)).toBe(html);
  });

  it('runs in the build before build-static-pages, and the built page is in the sitemap once', () => {
    const build = JSON.parse(read('package.json')).scripts.build;
    expect(build).toContain('node scripts/build-prep-plan-page.mjs');
    expect(build.indexOf('build-prep-plan-page')).toBeLessThan(build.indexOf('build-static-pages'));
    const xml = read('public/sitemap.xml');
    const block = xml.slice(xml.indexOf('<!-- prep-plan:start -->'), xml.indexOf('<!-- prep-plan:end -->'));
    expect(block).toContain(`<loc>https://sqlquest.app/${PLAN_SLUG}/</loc>`);
    expect(xml.match(new RegExp(`<loc>https://sqlquest.app/${PLAN_SLUG}/</loc>`, 'g'))).toHaveLength(1);
    expect(read(`public/${PLAN_SLUG}/index.html`)).toContain('/track.js');
  });

  it('is linked from /sql-exercises/ (outside its generated blocks), /sql-interview-prep/, the mock page and llms.txt', () => {
    const href = `href="/${PLAN_SLUG}/"`;
    const ex = read('src/sql-exercises.html').replace(/<!-- (solutions|topic-traps):start -->[\s\S]*?<!-- \1:end -->/g, '');
    expect(ex).toContain(href);
    expect(read('src/sql-interview-prep.html').replace(/<!-- company-grid:start -->[\s\S]*?<!-- company-grid:end -->/, '')).toContain(href);
    for (const f of ['public/sql-exercises/index.html', 'public/sql-interview-prep/index.html', 'public/sql-mock-interview/index.html']) {
      expect(read(f), f).toContain(href);
    }
    expect(read('public/llms.txt')).toContain(`https://sqlquest.app/${PLAN_SLUG}/`);
  });
});
