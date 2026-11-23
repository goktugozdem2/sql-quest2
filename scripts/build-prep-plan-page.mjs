#!/usr/bin/env node
/**
 * /sql-interview-prep-plan/ (C2, 2026-11-22): the general 2-week SQL interview
 * plan the G1 GEO read found missing (panel prompt #13, docs/reads/geo-2026-11-22.md).
 *
 * Copy: src/data/prep-plan.js. The questions on each skill day are picked here
 * from the live bank by `planDays`, never listed by hand, so the plan moves with
 * the bank:
 *   - the nine skill days follow the order the learning path teaches the
 *     canonical skills (SQL_ROADMAP_STAGES' `skills`, first appearance);
 *   - each day is an Easy, a Medium and a Hard on that skill
 *     (challengeMatchesSkill), in that order;
 *   - each pick is the first in CURRICULUM order (makeChallengeComparator over
 *     SQL_ROADMAP_CHALLENGE_ORDER), preferring a challenge the skill's own
 *     roadmap stage lists, then one whose category is the skill, then — for a
 *     Hard — a free preview. Never raw bank order: the bank is interview-
 *     ordered and its first Medium is challenge 1 (CLAUDE.md, "raw challenge
 *     order"; src/utils/challenge-order.js has the incident);
 *   - only the general bank: no sector-track challenge, nothing on an interview
 *     archetype's dataset (the Capital One and Revolut sets), no DML;
 *   - a challenge is used once; a skill with no question at a difficulty
 *     (Querying Basics has no Medium or Hard on its own) takes a second one
 *     at the difficulty below.
 *
 * Writes src/sql-interview-prep-plan.html (build-static-pages.js copies it to
 * public/) and the sitemap block <!-- prep-plan:start/end -->. Runs in
 * `npm run build` before build-static-pages.js. Do not hand-edit the page.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { esc, inline, shell, breadcrumb, article, faqPage, faqSection, writeSitemapBlock, ROOT, SITE } from './guide-page-shell.mjs';
import { loadQuestionBank, questionSlugs } from './question-slugs.mjs';
import { SQL_ROADMAP_STAGES, SQL_ROADMAP_CHALLENGE_ORDER } from '../src/data/roadmap-stages.js';
import { makeChallengeComparator, isFreePreview } from '../src/utils/challenge-order.js';
import { challengeMatchesSkill } from '../src/utils/skill-drill.js';
import { CANONICAL_SKILLS, SKILL_TO_RADAR, mapTopicToSkill } from '../src/utils/skill-calc.js';
import { INTERVIEW_ARCHETYPES } from '../src/data/interview-archetypes.js';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';
import { QUESTIONS as READINESS_QUESTIONS } from '../src/data/readiness-questions.js';
import { freeTierSentence } from '../src/utils/display-count.js';
import {
  PLAN_SLUG, PLAN_PUBLISHED, PLAN_TITLE, PLAN_H1, PLAN_DESCRIPTION, PLAN_APP_SRC,
  SKILL_TOPIC_PAGE, SKILL_FOCUS, CLOSING_DAYS, planFaq,
} from '../src/data/prep-plan.js';

export const SRC_PAGE = path.join(ROOT, 'src', `${PLAN_SLUG}.html`);
export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const NUM_WORD = { 3: 'three', 4: 'four', 5: 'five', 6: 'six', 10: 'ten', 14: 'fourteen' };
const word = n => NUM_WORD[n] || String(n);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const DML = /^(UPDATE|INSERT|DELETE|DML|DDL|CREATE|ALTER|DROP)\b/i;

/** The canonical skills in the order the learning path first teaches them. */
export function skillOrder(stages = SQL_ROADMAP_STAGES) {
  const out = [];
  for (const s of stages) for (const k of s.skills || []) if (!out.includes(k)) out.push(k);
  for (const k of CANONICAL_SKILLS) if (!out.includes(k)) out.push(k);
  return out;
}

const categorySkill = c => SKILL_TO_RADAR[c.category] || SKILL_TO_RADAR[mapTopicToSkill(c.category || '')] || null;

/** May the plan use this challenge? The general bank only. */
export function planEligible(c, { sectorIds, archetypeDatasets }) {
  if (!c || sectorIds.has(c.id)) return false;
  if (archetypeDatasets.has(c.dataset)) return false;
  if ((c.skills || []).some(t => DML.test(t))) return false;
  return true;
}

/** The comparator for one skill and difficulty: home stage, then category, then (Hard) preview, then curriculum order. */
export function planComparator(skill, difficulty, { stages = SQL_ROADMAP_STAGES, order = SQL_ROADMAP_CHALLENGE_ORDER } = {}) {
  const home = new Set(stages.filter(st => (st.skills || []).includes(skill)).flatMap(st => st.challengeIds || []));
  const base = makeChallengeComparator(order);
  const key = c => [home.has(c.id) ? 0 : 1, categorySkill(c) === skill ? 0 : 1, difficulty === 'Hard' && !isFreePreview(c) ? 1 : 0];
  return (a, b) => {
    const ka = key(a); const kb = key(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return base(a, b);
  };
}

export function loadPlanContext() {
  const { bank } = loadQuestionBank();
  const ctx = { window: {}, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/sector-challenges.js'), 'utf8'), ctx);
  return {
    bank,
    slugs: questionSlugs(bank),
    sectorIds: new Set((ctx.window.sectorChallengesData || []).map(c => c.id)),
    archetypeDatasets: new Set(INTERVIEW_ARCHETYPES.map(a => a.dataset)),
  };
}

/** The nine skill days: [{ skill, picks: [challenge, …] }] in skill order. */
export function planDays(cx = loadPlanContext()) {
  const used = new Set();
  const pick = (skill, difficulty) => {
    const pool = cx.bank.filter(c => c.difficulty === difficulty && !used.has(c.id)
      && planEligible(c, cx) && challengeMatchesSkill(c, skill));
    const c = pool.slice().sort(planComparator(skill, difficulty))[0] || null;
    if (c) used.add(c.id);
    return c;
  };
  return skillOrder().map(skill => {
    const picks = [];
    for (const d of DIFFICULTIES) {
      let c = pick(skill, d);
      // No question at this difficulty: a second one at the difficulty below.
      for (let i = DIFFICULTIES.indexOf(d) - 1; !c && i >= 0; i--) c = pick(skill, DIFFICULTIES[i]);
      if (c) picks.push(c);
    }
    return { skill, picks };
  });
}

/** How a pick is labelled for access: a Hard is Pro unless it is a free preview. */
export const accessTag = c => (c.difficulty !== 'Hard' ? null : isFreePreview(c) ? 'preview' : 'Pro');

export function renderPrepPlanPage(cx = loadPlanContext()) {
  const url = `${SITE}/${PLAN_SLUG}/`;
  const days = planDays(cx);
  const faq = planFaq({ bankCount: cx.bank.length });
  const questionCount = days.reduce((n, d) => n + d.picks.length, 0);
  const totalDays = days.length + CLOSING_DAYS.length;
  const readinessHref = '/sql-interview-readiness-test/';
  const ldObjects = [
    breadcrumb('2-week SQL interview prep plan', url),
    article({ headline: PLAN_H1, description: PLAN_DESCRIPTION, url, published: PLAN_PUBLISHED }),
    faqPage(faq),
  ];
  const q = c => `<li><a href="/questions/${cx.slugs.get(c.id)}/" data-plan-question="${c.id}">${esc(c.title)}</a><span class="tag">${esc(c.difficulty)}</span>${accessTag(c) ? `<span class="tag">${accessTag(c)}</span>` : ''}</li>`;
  const skillDay = (d, i) => `
  <section class="day" id="day-${i + 1}" data-plan-day="${i + 1}" data-plan-skill="${esc(d.skill)}">
    <h3 class="fd"><span class="num">Day ${i + 1}</span>${esc(d.skill)}</h3>
    <p>${inline(SKILL_FOCUS[d.skill])}</p>
    <ol>${d.picks.map(q).join('')}</ol>${DIFFICULTIES.every(x => d.picks.some(c => c.difficulty === x)) ? '' : `
    <p>The bank has no ${DIFFICULTIES.filter(x => !d.picks.some(c => c.difficulty === x)).join(' or ')} question on this skill alone; the harder days build on it.</p>`}
    <p>More on this skill: <a href="${SKILL_TOPIC_PAGE[d.skill]}">${esc(d.skill)} practice</a>.</p>
  </section>`;
  const closingLinks = {
    traps: `<ol>${SQL_PATTERNS.map(p => `<li><a href="/${p.slug}/">${esc(p.short)}</a></li>`).join('')}</ol>`,
    coach: `<p><a href="/app/?src=${PLAN_APP_SRC}" data-track="cta_plan_coach">Open the Coach in the app</a>; the Coach and its Skillmap are free.</p>`,
    mock: `<p><a href="/sql-mock-interview/">What the timed mocks are, and which is free</a>.</p>`,
    review: '',
    retest: `<p><a href="${readinessHref}" data-track="cta_plan_retest">Retake the readiness test</a>.</p>`,
  };
  const fill = t => t.replace(/\{traps\}/g, word(SQL_PATTERNS.length)).replace(/\{readiness\}/g, word(READINESS_QUESTIONS.length));
  const closingDay = (d, i) => `
  <section class="day" id="day-${days.length + i + 1}" data-plan-day="${days.length + i + 1}" data-plan-kind="${d.kind}">
    <h3 class="fd"><span class="num">Day ${days.length + i + 1}</span>${esc(fill(d.h))}</h3>
    <p>${inline(fill(d.p))}</p>${closingLinks[d.kind] ? `\n    ${closingLinks[d.kind]}` : ''}
  </section>`;
  const body = `  <h1 class="fd">${esc(PLAN_H1)}</h1>
  <p class="answer" data-answer-first="true">${cap(word(totalDays))} days. Days 1 to ${days.length} take one SQL skill each, three questions a day from Easy up to Hard, in the order SQL Quest's learning path teaches them. Days ${days.length + 1} to ${totalDays} are the traps, your two weakest skills, a timed mock and its review. Before day 1, a ${word(READINESS_QUESTIONS.length)}-question readiness test shows which skill needs the spare time.</p>
  <p class="lead">Every question below links to its page, with the prompt and the tables; solve it in the browser from there. The plan names ${questionCount} questions. What is free: ${esc(freeTierSentence(cx.bank.length))} A Hard marked Pro needs Pro; a Hard marked preview can be one of your free solves.</p>

  <section class="day" id="day-0" data-plan-day="0" data-plan-kind="readiness">
    <h3 class="fd"><span class="num">Day 0</span>The readiness test</h3>
    <p>${cap(word(READINESS_QUESTIONS.length))} questions, no signup. You get a Skillmap across the nine skills and the one to fix first. Note your weakest two: on any day whose skill you already pass, solve only the Hard question and give the rest of the hour to them.</p>
    <p><a href="${readinessHref}" data-track="cta_plan_readiness">Take the readiness test</a>.</p>
  </section>
${days.map(skillDay).join('\n')}
${CLOSING_DAYS.map(closingDay).join('\n')}

  <div class="box" style="margin-top:36px;text-align:center;">
    <p class="fd" style="font-size:19px;font-weight:800;margin-bottom:6px;">Start day 1 in the browser</p>
    <p style="font-size:14px;color:#94a3b8;margin-bottom:16px;">SQLite runs in your browser, no signup. Your rows are checked against the expected rows, and a wrong answer gets a diagnosis, not just "incorrect".</p>
    <a class="btn bp" href="/app/?challenge=${days[0].picks[0].id}&amp;src=${PLAN_APP_SRC}" data-track="cta_plan_start">Start day 1 →</a>
  </div>

${faqSection(faq)}

  <h2 class="fd">Related</h2>
  <div class="rel">
    <a href="/sql-mock-interview/">Timed SQL mock interviews<span>What a mock is, and how to rehearse the screen</span></a>
    <a href="${readinessHref}">SQL interview readiness test<span>Ten questions, a Skillmap, no signup</span></a>
    <a href="/sql-interview-prep/">Company interview guides<span>Every company page, grouped by sector</span></a>
    <a href="/sql-exercises/">SQL practice questions<span>By topic and difficulty</span></a>
  </div>`;
  return shell({
    generator: 'scripts/build-prep-plan-page.mjs', dataFile: 'src/data/prep-plan.js',
    title: PLAN_TITLE, description: PLAN_DESCRIPTION, url, ldObjects, crumb: '2-week prep plan', body,
  });
}

export const writeSitemap = () => writeSitemapBlock('prep-plan', PLAN_SLUG, PLAN_PUBLISHED);

if (import.meta.url === `file://${process.argv[1]}`) {
  const cx = loadPlanContext();
  fs.writeFileSync(SRC_PAGE, renderPrepPlanPage(cx));
  writeSitemap();
  const days = planDays(cx);
  console.log(`[prep-plan-page] src/${PLAN_SLUG}.html · ${days.length} skill days · ${days.map(d => d.picks.map(c => c.id).join('/')).join(' ')} · sitemap block 1 URL`);
}
