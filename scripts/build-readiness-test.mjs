#!/usr/bin/env node
/**
 * SQL Interview Readiness Test — /sql-interview-readiness-test/
 * Founder's SEO plan, 2026-09-13: P0.6 (landing → challenge funnel), P1.10
 * (readiness test, no login), P1.11 (Skillmap as the acquisition door),
 * P3.21 (company-specific readiness score).
 *
 * The page asks ten questions with no signup, scores each Skillmap skill it
 * touches, and turns that into:
 *   - an overall readiness score — weighted by the SKILL MIX of the company's
 *     tagged practice set when ?company=<slug> is given ("Capital One Interview
 *     Readiness: 68%"), equal weights otherwise;
 *   - per-skill scores (Joins, Window Functions, Aggregation, …) and the
 *     weakest one;
 *   - recommended training: the topic page for that skill, and ONE next
 *     challenge — the gentlest free challenge on that skill, from the
 *     company's own set when it has one — opened directly in the app
 *     ("Build My Personalized Practice Plan").
 *
 * The weights are the company's tagged-set composition (the same numbers its
 * page shows), NOT a measurement of its interview; the page says so. The result
 * is also written to localStorage `sqlquest_readiness_v1` so the app can read
 * the company and the weakest skill on arrival.
 *
 * Events (first-party, /track.js `sqTrack`): readiness_started,
 * readiness_completed {company, score, weakest}, readiness_plan_clicked —
 * every one also carries {companySlug, role, src} since 2026-11-25 — and
 * readiness_shared {companySlug, role, method}. Never answers, never PII.
 *
 * 2026-11-25 — the SQL Interview Health Check (founder: "health checki de
 * yap"). Same URL, same ten questions, same scoring. The page is named and
 * promised as a health check (free, 10 minutes, no signup); the company is
 * the lens (?company=, the tagged-set weighting it always had) and a role
 * choice leans those weights (READINESS_ROLES / applyRoleWeights in the
 * shared module — a role multiplies, it never invents a company weight).
 * The result can be shared as /sql-interview-readiness-test/?r=<code>
 * (encodeShareCode: scores in tens + company slug + role code, nothing else);
 * the page decodes and shows it client-side. A per-result og:image is not
 * built yet — the share card uses the site image.
 *
 * DARK until the flip (PR #349 review): everything above from 2026-11-25 is
 * `renderHealthCheck`, written only while the build-time flag `healthCheck`
 * is true. Off, `render` writes today's page from
 * scripts/readiness-test-legacy.mjs, byte for byte.
 *
 * Run: node scripts/build-readiness-test.mjs   (writes src/sql-interview-readiness-test.html)
 */

import { questionSlugs } from './question-slugs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { loadBank, facts, SKILL_PAGE, HEALTH_CHECK_ON } from './build-company-pages.mjs';
import { renderLegacy, legacyData } from './readiness-test-legacy.mjs';
import { isFreePreview, makeChallengeComparator } from '../src/utils/challenge-order.js';
import { SKILL_TO_RADAR, mapTopicToSkill } from '../src/utils/skill-calc.js';
import { QUESTIONS, companySkillWeights, READINESS_ROLES, HEALTH_GOALS, EXTRA_QUESTIONS, SHARE_SKILLS, selectQuestions, applyRoleWeights, encodeShareCode, decodeShareCode, healthDaysOut, buildHealthRoadmap } from '../src/data/readiness-questions.js';
import { SQL_ROADMAP_CHALLENGE_ORDER } from '../src/data/roadmap-stages.js';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';
import { INTERVIEW_ARCHETYPES } from '../src/data/interview-archetypes.js';
import { FREE_SOLVE_QUOTA } from '../src/utils/display-count.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = 'https://sqlquest.app';

// The ten questions live in src/data/readiness-questions.js since 2026-09-17,
// shared with the in-app goal check (app.jsx, behind `goalMeasure`), which
// scores them with the module's `scoreReadiness` — the page's own inline
// formula below is unchanged, and the built page is byte-identical to what
// it was before the move. Re-exported so tests keep importing from here.
export { QUESTIONS };

const SKILLS = [...new Set(QUESTIONS.map(q => q.skill))];

// The page runs the shared module's own health-check functions, copied from
// its SOURCE TEXT (Function#toString is not stable: under vitest it returns
// the transformed code, so the committed page would never equal the build).
// Each one is self-contained by contract — see the module's header.
const MODULE_SRC = fs.readFileSync(path.join(ROOT, 'src', 'data', 'readiness-questions.js'), 'utf8');
export function inlineFn(name) {
  const start = MODULE_SRC.indexOf(`export function ${name}(`);
  if (start < 0) throw new Error(`inlineFn: no exported function ${name}`);
  let depth = 0;
  let i = MODULE_SRC.indexOf('{', MODULE_SRC.indexOf(')', start));
  for (; i < MODULE_SRC.length; i++) {
    if (MODULE_SRC[i] === '{') depth++;
    else if (MODULE_SRC[i] === '}' && --depth === 0) break;
  }
  return MODULE_SRC.slice(start + 'export '.length, i + 1);
}

const resolve = raw => SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;
const canon = c => [...new Set([...(c.skills || []), c.category].filter(Boolean).map(resolve).filter(Boolean))];
const playableFree = c => c.difficulty !== 'Hard' || isFreePreview(c);
const RANK = { Easy: 0, Medium: 1, Hard: 2 };

function companyList() {
  return fs.readdirSync(path.join(ROOT, 'src'))
    .filter(f => /-sql-interview\.html$/.test(f))
    .map(f => {
      const slug = f.replace(/-sql-interview\.html$/, '');
      const title = (fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      const name = (title.match(/^(.+?)\s+SQL\b/) || [])[1] || slug;
      return { slug, name: name.trim() };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

let QS = new Map();
// The gentlest free challenge on a skill, preferring the company's own set.
function nextFor(skill, pool, all) {
  const pick = list => list
    .filter(c => playableFree(c) && canon(c).includes(skill))
    .sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty] || a.id - b.id)
    .find(c => c.difficulty !== 'Easy') || list.filter(c => playableFree(c) && canon(c).includes(skill)).sort((a, b) => a.id - b.id)[0];
  const c = pick(pool) || pick(all);
  return c ? { id: c.id, title: c.title, difficulty: c.difficulty, slug: QS.get(c.id) } : null;
}

// The trap page shown next to a skill in the roadmap (the five pages of
// src/data/sql-patterns.js; tests/health-check.test.js binds the slugs).
export const TRAP_FOR_SKILL = {
  Joins: 'sql-join-fan-out',
  'NULL Handling': 'sql-not-in-null',
  'Date Functions': 'sql-between-timestamp',
  'Aggregation & Grouping': 'sql-average-of-averages',
};
// The mock that closes an interview roadmap for a signed archetype company
// (src/data/interview-archetypes.js members → src/data/mock-interviews.js).
// Every other company gets the generic timed mock page. Both are Pro.
// (CH below is keyed "c<id>", never a bare id: a bare "318" key reads as the
// exact bank total to tests/site-counts.test.js.)
export const ARCHETYPE_MOCKS = { 'capital-one': 'capital-one-codesignal', revolut: 'revolut-analytics-screen' };
export const ARCHETYPE_SLUGS = new Set(INTERVIEW_ARCHETYPES.flatMap(a => a.members.map(m => m.pageSlug)));

export function buildData() {
  const bank = loadBank();
  const all = [...bank.byId.values()];
  QS = questionSlugs(all);
  // Roadmap pools: per skill, in curriculum order (SQL_ROADMAP_STAGES via the
  // shared comparator — never raw id order), the company's tagged set first.
  const cmp = makeChallengeComparator(SQL_ROADMAP_CHALLENGE_ORDER);
  const CH = {};
  const ref = c => {
    if (!CH['c' + c.id]) CH['c' + c.id] = { id: c.id, title: c.title, difficulty: c.difficulty, slug: QS.get(c.id), pro: c.difficulty === 'Hard' && !isFreePreview(c) };
    return c.id;
  };
  const poolOf = (list, skill, cap) => list.filter(c => canon(c).includes(skill)).sort(cmp).slice(0, cap).map(ref);
  const companies = {};
  for (const { slug, name } of companyList()) {
    const f = facts(bank, name);
    if (!f.n) continue;
    const pool = f.ordered;
    // The same share-of-tagged-set numbers `f.dist` carries, from the shared
    // module so the app's check weights a company exactly as this page does.
    const { weights } = companySkillWeights({ tags: bank.tags, challenges: all, name, skills: SKILLS });
    const next = {};
    for (const s of SKILLS) next[s] = nextFor(s, pool, all);
    const archetype = ARCHETYPE_SLUGS.has(slug);
    const mock = archetype && ARCHETYPE_MOCKS[slug]
      ? { href: `/app/?interview=${ARCHETYPE_MOCKS[slug]}&src=health-check`, label: `The timed ${name} mock interview` }
      : null;
    companies[slug] = { name, n: f.n, weights, next, archetype, mock, pool: Object.fromEntries(SHARE_SKILLS.map(s => [s, poolOf(pool, s, 6)])) };
  }
  const general = {
    name: null,
    weights: Object.fromEntries(SKILLS.map(s => [s, 1])),
    next: Object.fromEntries(SKILLS.map(s => [s, nextFor(s, all, all)])),
    pool: Object.fromEntries(SHARE_SKILLS.map(s => [s, poolOf(all, s, 12)])),
  };
  const genericMock = { href: '/sql-mock-interview/', label: 'A timed SQL mock interview' };
  return { companies, general, genericMock, CH };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FAQ = [
  ['What does the SQL interview health check measure?', 'Ten questions across the skills SQL interviews lean on: joins, window functions, aggregation, CTEs and subqueries, NULL handling, date filters and conditional logic. Each question maps to one skill on your Skillmap, and the result shows a score per skill, your weakest one, and an overall readiness score.'],
  ['What does choosing a role change?', 'The questions stay the same. The role leans the weights of the overall score toward the SQL that role works with day to day: aggregation and conditional logic for a data analyst, CTEs and joins for an analytics engineer, joins and NULL handling for a data engineer, window functions for a data scientist. It is our emphasis, not a measurement of any interview.'],
  ['How is a company readiness score calculated?', 'When you pick a company, each skill is weighted by how much of that company\'s SQLQuest.app practice set uses it — the same composition its interview page shows. It is a weighting of our practice set, not a measurement of the company\'s interview, and the result says so.'],
  ['Do I need an account?', 'No. The test runs in your browser and needs no signup. When you open your recommended next challenge, the app starts in guest mode; an account is only needed to keep progress across devices.'],
  ['What happens after the test?', 'You get your weakest skill, the practice page for it, and one next challenge chosen for that skill — from the company\'s own set when you picked one. "Build my personalized practice plan" opens that challenge in the app, where the Coach keeps picking from your Skillmap.'],
];

/**
 * The page for the flag's state. `healthCheck` (src/data/feature-flags.js,
 * build-time, read once as HEALTH_CHECK_ON) off: today's readiness test, byte
 * for byte (scripts/readiness-test-legacy.mjs). On: the Health Check.
 */
export function render(data, { healthCheck = HEALTH_CHECK_ON } = {}) {
  return healthCheck ? renderHealthCheck(data) : renderLegacy(legacyData(data));
}

export function renderHealthCheck(data) {
  const title = 'SQL Interview Health Check: Free, 10 Minutes, No Signup | SQLQuest.app';
  const description = 'Free SQL interview health check: 10 questions, 10 minutes, no signup. Pick your company and role, get your Skillmap, a readiness score and the plan for your weakest skill.';
  const url = `${SITE}/sql-interview-readiness-test/`;
  const opts = Object.entries(data.companies).map(([slug, c]) => `<option value="${slug}">${esc(c.name)}</option>`).join('');
  const roleOpts = READINESS_ROLES.map(r => `<option value="${r.id}">${esc(r.label)}</option>`).join('');
  const goalOpts = HEALTH_GOALS.map(g => `<option value="${g.id}">${esc(g.label)}</option>`).join('');
  const traps = Object.fromEntries(Object.entries(TRAP_FOR_SKILL).map(([k, slug]) => { const t = SQL_PATTERNS.find(x => x.slug === slug); return [k, [`/${slug}/`, t.short]]; }));
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQLQuest.app', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'SQL Interview Health Check', item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'Quiz', name: 'SQL Interview Health Check', description, url, educationalLevel: 'Intermediate', isAccessibleForFree: true, inLanguage: 'en', about: SKILLS.map(s => ({ '@type': 'Thing', name: s })), provider: { '@type': 'Organization', name: 'SQLQuest.app', url: `${SITE}/` } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ].map(o => `  <script type="application/ld+json">\n  ${JSON.stringify(o, null, 2).replace(/\n/g, '\n  ')}\n  </script>`).join('\n');
  const faqHtml = FAQ.map(([q, a]) => `<details class="fi"><summary class="fd">${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n    ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GENERATED by scripts/build-readiness-test.mjs — edit the generator, not this file. -->
  <script src="/ref-track.js"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="SQLQuest.app">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
  <script defer src="/_vercel/insights/script.js"></script>
${ld}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#06060f;color:#e2e8f0;font-family:'DM Sans',sans-serif}
    .fd{font-family:'Space Grotesk',sans-serif}.fm{font-family:'JetBrains Mono',monospace}
    .nav{border-bottom:1px solid rgba(255,255,255,.06)}.ni{max-width:1100px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
    .wrap{max-width:760px;margin:0 auto;padding:48px 24px}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;border:none;font-family:inherit}.bp{padding:14px 28px;font-size:15px;background:#FFE34D;color:#0E0F13}.bo{padding:12px 22px;font-size:14px;background:transparent;color:#c084fc;border:1px solid rgba(124,58,237,.4)}
    .card{background:rgba(10,10,25,.6);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px}
    .opt{display:block;width:100%;text-align:left;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:13px 14px;margin:8px 0;color:#e2e8f0;font-size:14px;cursor:pointer;font-family:'JetBrains Mono',monospace;line-height:1.5}
    .opt:hover{border-color:rgba(192,132,252,.5)}.opt.ok{border-color:#22c55e;background:rgba(34,197,94,.08)}.opt.no{border-color:rgba(192,132,252,.6);background:rgba(124,58,237,.08)}
    pre{background:#0E0F13;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;overflow-x:auto;font-size:13px;line-height:1.6;color:#e2e8f0;margin:12px 0}
    .bar{height:8px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden}.bar>span{display:block;height:100%;background:#7c3aed}
    select{background:#0E0F13;color:#e2e8f0;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:11px 12px;font-size:15px;font-family:inherit;min-width:240px}
    input[type=date]{background:#0E0F13;color:#e2e8f0;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px 12px;font-size:15px;font-family:inherit;min-width:240px;color-scheme:dark}
    .step{border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px;margin:10px 0}.pro{font-size:11px;font-weight:700;color:#c084fc;border:1px solid rgba(124,58,237,.4);border-radius:6px;padding:1px 6px}
    .fi{border-bottom:1px solid rgba(255,255,255,.06);padding:16px 0}.fi summary{cursor:pointer;font-weight:700;font-size:16px}.fi p{color:#94a3b8;font-size:14px;line-height:1.75;margin-top:10px}
    [hidden]{display:none!important}
  </style>
</head>
<body>
<nav class="nav"><div class="ni"><a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:#e2e8f0;"><span style="width:32px;height:32px;border-radius:9px;background:#7c3aed;display:inline-flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span><span class="fd" style="font-weight:800;font-size:19px;">SQL Quest</span></a><a href="/sql-interview-prep/" style="color:#94a3b8;text-decoration:none;font-size:14px;">SQL Interview Prep</a></div></nav>

<main class="wrap">
  <p style="font-size:13px;color:#8b98ab;margin-bottom:12px;"><a href="/" style="color:#8b98ab;text-decoration:none;">SQL Quest</a> › SQL Interview Health Check</p>
  <h1 class="fd" style="font-size:clamp(32px,4.6vw,50px);font-weight:800;line-height:1.1;margin-bottom:14px;">SQL Interview <span style="color:#FFE34D;">Health Check</span></h1>
  <p class="fm" data-testid="health-promise" style="font-size:13px;color:#22c55e;font-weight:700;margin-bottom:12px;">Free · 10 minutes · no signup</p>
  <p id="lede" style="font-size:17px;color:#94a3b8;line-height:1.75;margin-bottom:26px;">First, what you are preparing for. Then ten SQL questions chosen for that goal. You get back your Skillmap and a week-by-week roadmap built for the goal, with the exact challenges to do in order.</p>

  <section id="shared" class="card" style="margin-bottom:20px;" hidden>
    <p id="slabel" class="fd" style="font-size:15px;color:#8b98ab;font-weight:700;margin-bottom:10px;"></p>
    <div id="sskills"></div>
    <p style="font-size:14px;color:#94a3b8;line-height:1.7;margin-top:14px;">Someone shared their Skillmap from this check. Take it yourself to get yours and your own roadmap.</p>
  </section>

  <section id="start" class="card">
    <label for="goal" style="display:block;font-size:14px;font-weight:700;margin-bottom:10px;">What are you preparing for?</label>
    <select id="goal"><option value="">Choose one</option>${goalOpts}</select>
    <div id="cowrap" style="margin-top:18px;">
      <label for="company" style="display:block;font-size:14px;font-weight:700;margin-bottom:10px;">Which company? <span style="color:#8b98ab;font-weight:500;">(optional)</span></label>
      <select id="company"><option value="">No specific company</option>${opts}</select>
    </div>
    <div style="margin-top:18px;">
      <label for="role" style="display:block;font-size:14px;font-weight:700;margin-bottom:10px;">Which role are you aiming for?</label>
      <select id="role"><option value="">Not sure yet</option>${roleOpts}</select>
    </div>
    <div id="datewrap" style="margin-top:18px;" hidden>
      <label for="date" style="display:block;font-size:14px;font-weight:700;margin-bottom:10px;">Interview date <span style="color:#8b98ab;font-weight:500;">(optional)</span></label>
      <input id="date" type="date">
    </div>
    <div id="weekswrap" style="margin-top:18px;" hidden>
      <label for="weeks" style="display:block;font-size:14px;font-weight:700;margin-bottom:10px;">How many weeks do you have? <span style="color:#8b98ab;font-weight:500;">(optional)</span></label>
      <select id="weeks"><option value="">Not sure</option><option value="2">2 weeks</option><option value="3">3 weeks</option><option value="4">4 weeks</option><option value="6">6 weeks</option><option value="8">8 weeks</option></select>
    </div>
    <p id="need" style="font-size:13px;color:#c084fc;margin-top:14px;" hidden>Choose what you are preparing for first.</p>
    <p style="font-size:13px;color:#8b98ab;margin:14px 0 18px;line-height:1.6;">Your answers to the questions stay in this browser. For an interview at a company we have modelled, the score is weighted by that company's practice set; the role leans the weights toward the SQL that role works with.</p>
    <button class="btn bp" id="go" type="button">Start the health check</button>
  </section>

  <section id="quiz" class="card" hidden>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span class="fm" id="count" style="font-size:12px;color:#8b98ab;"></span><span id="skill" style="font-size:12px;color:#c084fc;font-weight:700;"></span></div>
    <div class="bar" style="margin-bottom:18px;"><span id="prog" style="width:0%"></span></div>
    <p id="qtext" style="font-size:16px;line-height:1.7;"></p>
    <pre id="qsql" hidden></pre>
    <div id="opts"></div>
    <p id="why" style="font-size:14px;color:#94a3b8;line-height:1.7;margin-top:10px;" hidden></p>
    <button class="btn bo" id="next" type="button" style="margin-top:14px;" hidden>Next question →</button>
  </section>

  <section id="result" class="card" hidden>
    <p id="rgoal" style="font-size:13px;color:#8b98ab;margin-bottom:8px;line-height:1.6;"></p>
    <p id="rlabel" class="fd" style="font-size:15px;color:#8b98ab;font-weight:700;"></p>
    <p class="fd" style="font-size:56px;font-weight:800;line-height:1;margin:6px 0 4px;"><span id="rscore" style="color:#FFE34D;"></span></p>
    <p id="rnote" style="font-size:13px;color:#8b98ab;line-height:1.6;margin-bottom:20px;"></p>
    <p class="fd" style="font-size:16px;font-weight:800;margin-bottom:10px;">Your Skillmap</p>
    <div id="rskills"></div>
    <div id="roadmap" style="margin-top:26px;">
      <h2 id="rmtitle" class="fd" style="font-size:20px;font-weight:800;margin-bottom:6px;">Your roadmap</h2>
      <p id="rmlede" style="font-size:14px;color:#94a3b8;line-height:1.7;margin-bottom:8px;"></p>
      <ol id="rmsteps" style="list-style:none;"></ol>
      <p id="rmfree" style="font-size:13px;color:#8b98ab;line-height:1.7;margin-top:12px;"></p>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:22px;">
      <a id="plan" class="btn bp" href="/app/?src=readiness">Build My Personalized Practice Plan</a>
      <button id="share" class="btn bo" type="button">Share your Skillmap</button>
      <a id="retake" class="btn bo" href="/sql-interview-readiness-test/">Retake</a>
    </div>
    <p id="shared-note" style="font-size:13px;color:#8b98ab;margin-top:10px;" hidden></p>
  </section>

  <section style="margin-top:44px;">
    <h2 class="fd" style="font-size:24px;font-weight:800;margin-bottom:8px;">Frequently asked</h2>
    ${faqHtml}
  </section>
  <p style="font-size:14px;color:#94a3b8;margin-top:30px;line-height:1.8;">Practise by topic: <a href="/challenges/joins/" style="color:#c084fc;">JOIN practice</a> · <a href="/challenges/window-functions/" style="color:#c084fc;">Window functions</a> · <a href="/challenges/aggregation/" style="color:#c084fc;">GROUP BY exercises</a> · <a href="/challenges/cte/" style="color:#c084fc;">CTE practice</a> · <a href="/sql-exercises/" style="color:#c084fc;">All SQL practice questions</a> · <a href="/sql-interview-prep/" style="color:#c084fc;">Company interview guides</a></p>
</main>

<footer style="border-top:1px solid rgba(255,255,255,.06);padding:32px 24px;text-align:center;font-size:13px;color:#7f8da1;">SQL Quest — personalized SQL interview practice · <a href="/privacy/" style="color:#8b98ab;">Privacy</a> · <a href="/terms/" style="color:#8b98ab;">Terms</a></footer>

<script>
const QUESTIONS = ${JSON.stringify(QUESTIONS)};
const EXTRAS = ${JSON.stringify(EXTRA_QUESTIONS)};
const DATA = ${JSON.stringify(data)};
const SKILL_PAGE = ${JSON.stringify(Object.fromEntries(Object.entries(SKILL_PAGE)))};
const TRAPS = ${JSON.stringify(traps)};
const GOALS = ${JSON.stringify(HEALTH_GOALS)};
const ROLES = ${JSON.stringify(READINESS_ROLES)};
const SKILLS = ${JSON.stringify(SHARE_SKILLS)};
const FREE_QUOTA = ${FREE_SOLVE_QUOTA};
${inlineFn('selectQuestions')}
${inlineFn('applyRoleWeights')}
${inlineFn('encodeShareCode')}
${inlineFn('decodeShareCode')}
${inlineFn('healthDaysOut')}
${inlineFn('buildHealthRoadmap')}
const track = (e, p) => { try { window.sqTrack && window.sqTrack(e, p || {}); } catch (_) {} };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const params = new URLSearchParams(location.search);
const pre = params.get('company');
const SRC = (params.get('src') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || (params.get('r') ? 'share' : null);
if (pre && DATA.companies[pre]) {
  $('company').value = pre;
  $('goal').value = 'interview';
  $('lede').textContent = 'First, what you are preparing for. Then ten SQL questions chosen for that goal. You get back your Skillmap for the ' + DATA.companies[pre].name + ' interview and a week-by-week roadmap, with the exact challenges to do in order.';
}
const preGoal = params.get('goal');
if (preGoal && GOALS.some(g => g.id === preGoal)) $('goal').value = preGoal;
const preRole = params.get('role');
if (preRole && ROLES.some(r => r.id === preRole)) $('role').value = preRole;
const bars = (scores, hi) => Object.keys(scores).map(s => '<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px"><span>' + esc(s) + '</span><span class="fm" style="color:' + (scores[s] >= 100 ? '#22c55e' : '#e2e8f0') + '">' + scores[s] + '</span></div><div class="bar"><span style="width:' + scores[s] + '%;background:' + (s === hi ? '#c084fc' : '#7c3aed') + '"></span></div></div>').join('');
const shared = decodeShareCode(params.get('r'), SKILLS, ROLES, DATA.companies);
if (shared) {
  const sc = shared.company ? DATA.companies[shared.company].name : null;
  const sr = shared.role ? ROLES.find(r => r.id === shared.role).label : null;
  $('slabel').textContent = 'A shared Skillmap' + (sc ? ' · ' + sc : '') + (sr ? ' · ' + sr : '');
  $('sskills').innerHTML = bars(shared.scores, null);
  $('shared').hidden = false;
  if (shared.company && !pre) { $('company').value = shared.company; if (!$('goal').value) $('goal').value = 'interview'; }
  if (shared.role && !preRole) $('role').value = shared.role;
}
function syncGoal() {
  const g = $('goal').value;
  $('cowrap').hidden = g !== '' && g !== 'interview';
  $('datewrap').hidden = g !== 'interview';
  $('weekswrap').hidden = g === '' || g === 'interview';
  if (g) $('need').hidden = true;
}
$('goal').onchange = syncGoal;
syncGoal();
const lens = () => {
  const goal = GOALS.some(g => g.id === $('goal').value) ? $('goal').value : null;
  const companySlug = goal === 'interview' && DATA.companies[$('company').value] ? $('company').value : null;
  const role = ROLES.some(r => r.id === $('role').value) ? $('role').value : null;
  let daysOut = null;
  if (goal === 'interview') { const d = healthDaysOut($('date').value, Date.now()); daysOut = d !== null && d >= 0 && d <= 730 ? d : null; }
  else if (/^[0-9]+$/.test($('weeks').value)) daysOut = Number($('weeks').value) * 7;
  return { goal, companySlug, role, daysOut, src: SRC };
};
let i = 0; const answers = []; let SEL = QUESTIONS; let LENS = null;
function show() {
  const q = SEL[i];
  $('count').textContent = 'Question ' + (i + 1) + ' of ' + SEL.length;
  $('skill').textContent = q.skill + (q.kind === 'debug' ? ' · find the bug' : '');
  $('prog').style.width = (100 * i / SEL.length) + '%';
  $('qtext').textContent = q.q;
  $('qsql').hidden = !q.sql; $('qsql').textContent = q.sql || '';
  $('why').hidden = true; $('next').hidden = true;
  $('opts').innerHTML = '';
  q.options.forEach((o, k) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = o;
    b.onclick = () => {
      if (answers[i] !== undefined) return;
      answers[i] = k === q.answer;
      [...$('opts').children].forEach((el, n) => { if (n === q.answer) el.classList.add('ok'); else if (n === k) el.classList.add('no'); });
      $('why').textContent = (answers[i] ? 'Correct. ' : 'Not quite. ') + q.why; $('why').hidden = false;
      $('next').textContent = i + 1 < SEL.length ? 'Next question →' : 'See my roadmap →'; $('next').hidden = false;
    };
    $('opts').appendChild(b);
  });
}
$('go').onclick = () => {
  const L = lens();
  if (!L.goal) { $('need').hidden = false; $('goal').focus(); return; }
  LENS = L;
  SEL = selectQuestions({ goal: L.goal, role: L.role }, QUESTIONS, EXTRAS);
  $('start').hidden = true; $('shared').hidden = true; $('quiz').hidden = false;
  track('readiness_started', Object.assign({ company: L.companySlug }, L));
  show();
};
$('next').onclick = () => { i++; if (i < SEL.length) show(); else finish(); };
function finish() {
  const L = LENS;
  const co = L.companySlug ? DATA.companies[L.companySlug] : null;
  const arch = !!(co && co.archetype);
  const goalObj = GOALS.find(g => g.id === L.goal);
  const roleObj = ROLES.find(r => r.id === L.role) || null;
  const per = {};
  SEL.forEach((q, k) => { per[q.skill] = per[q.skill] || { right: 0, total: 0 }; per[q.skill].total++; if (answers[k]) per[q.skill].right++; });
  const skills = Object.keys(per);
  const score = s => Math.round(100 * per[s].right / per[s].total);
  // A company-weighted number only for a company whose interview we modelled
  // (a signed archetype); everyone else: every skill asked, equal weights.
  const base = arch ? co.weights : Object.fromEntries(skills.map(s => [s, 1]));
  const W = applyRoleWeights(base, L.role, ROLES);
  let wsum = 0, acc = 0;
  skills.forEach(s => { const w = W[s] || 0; wsum += w; acc += w * score(s); });
  const overall = wsum ? Math.round(acc / wsum) : Math.round(skills.reduce((a, s) => a + score(s), 0) / skills.length);
  const weakest = skills.slice().sort((a, b) => score(a) - score(b) || (W[b] || 0) - (W[a] || 0))[0];
  const scoresObj = Object.fromEntries(skills.map(s => [s, score(s)]));
  $('quiz').hidden = true; $('result').hidden = false;
  $('rgoal').textContent = 'Goal: ' + goalObj.label + (co ? ' · ' + co.name : '') + (roleObj ? ' · ' + roleObj.label : '') + (L.daysOut !== null ? ' · ' + L.daysOut + ' days' : '');
  $('rlabel').textContent = arch ? co.name + ' Interview Readiness' : 'Your SQL score';
  $('rscore').textContent = overall + '%';
  $('rnote').textContent = arch
    ? 'Weighted by the skill mix of our ' + co.name + ' practice set (' + co.n + ' challenges) — a weighting of our set, not a measurement of ' + co.name + '\\'s interview.'
    : co
      ? 'No ' + co.name + ' readiness number: we give one only for a company whose interview we have modelled. This is your score across the skills asked, and the roadmap draws on our ' + co.name + ' practice set first.'
      : 'Every skill asked, weighted equally.';
  if (roleObj) $('rnote').textContent += ' Leaned for the ' + roleObj.label + ' role toward ' + Object.keys(roleObj.lean).join(', ') + ': our emphasis for the role, not a measurement of any interview.';
  $('rskills').innerHTML = bars(scoresObj, weakest);
  const pools = {};
  skills.forEach(s => {
    const ids = [];
    ((co && co.pool[s]) || []).concat(DATA.general.pool[s] || []).forEach(id => { if (ids.indexOf(id) < 0) ids.push(id); });
    pools[s] = ids.map(id => DATA.CH['c' + id]).filter(Boolean);
  });
  const pages = {};
  skills.forEach(s => { if (SKILL_PAGE[s]) pages[s] = SKILL_PAGE[s]; });
  const rm = buildHealthRoadmap({ goal: L.goal, scores: scoresObj, weights: W, daysOut: L.daysOut, pools, pages, traps: TRAPS, mock: (co && co.mock) || DATA.genericMock });
  const unit = rm.unit === 'day' ? 'Day' : 'Week';
  $('rmtitle').textContent = 'Your roadmap: ' + rm.steps.length + ' ' + (rm.unit === 'day' ? (rm.steps.length === 1 ? 'day' : 'days') : 'weeks');
  // "goal, Skillmap, lean and days" read as a list ("your goal and your
  // Skillmap" when nothing else was given — walk of 2026-11-25), and the
  // order is said the way buildHealthRoadmap ranks: gap × weight, so on a
  // signed company the set's skill mix can put a 50 ahead of a 0.
  const from = ['your goal', 'your Skillmap'].concat(roleObj ? ['the ' + roleObj.label + ' lean'] : [], L.daysOut !== null ? ['the ' + L.daysOut + ' days you have'] : []);
  $('rmlede').textContent = 'Built from ' + from.slice(0, -1).join(', ') + ' and ' + from[from.length - 1] + '. '
    + (arch ? 'The skills come in order of the gap, weighted by how much of our ' + co.name + ' set uses them' : 'The skills that need the most work come first')
    + '; the challenges are in the order the curriculum teaches them' + (co ? ', ' + co.name + '\\'s practice set first' : '') + '.';
  const item = c => '<li style="font-size:14px;line-height:1.9"><a href="/questions/' + c.slug + '/" style="color:#e2e8f0">' + esc(c.title) + '</a> <span style="color:#8b98ab">' + c.difficulty + '</span>' + (c.pro ? ' <span class="pro">Pro</span>' : '') + '</li>';
  const reads = st => (st.page || st.trap) ? '<p style="font-size:13px;color:#94a3b8;margin-top:6px">Read: ' + [st.page, st.trap].filter(Boolean).map(p => '<a href="' + p[0] + '" style="color:#c084fc">' + esc(p[1]) + '</a>').join(' · ') + '</p>' : '';
  $('rmsteps').innerHTML = rm.steps.map(st => '<li class="step"><p class="fd" style="font-weight:800;font-size:15px">' + unit + ' ' + st.n + ' · ' + esc(st.skill) + ' <span class="fm" style="color:#8b98ab;font-size:12px;font-weight:400">now ' + st.score + '</span></p><ul style="list-style:none;margin-top:8px">' + st.items.map(item).join('') + '</ul>' + reads(st) + '</li>').join('')
    + (rm.mock ? '<li class="step"><p class="fd" style="font-weight:800;font-size:15px">Then · <a href="' + rm.mock.href + '" style="color:#e2e8f0">' + esc(rm.mock.label) + '</a> <span class="pro">Pro</span></p></li>' : '');
  $('rmfree').textContent = 'Free path: your first ' + FREE_QUOTA + ' challenge solves are free (any Easy or Medium, or a Hard preview), and the topic and trap pages are free to read. Items marked Pro' + (rm.mock ? ' and the mock' : '') + ' need Pro.';
  const next = rm.steps.reduce((a, st) => a.concat(st.items), []).find(c => !c.pro) || (co || DATA.general).next[weakest] || null;
  const href = '/app/?src=readiness' + (co ? '&company=' + encodeURIComponent(co.name) : '') + (next ? '&challenge=' + next.id : '') + '&goal=' + goalObj.intent;
  $('plan').href = href;
  const rq = [];
  if (L.goal) rq.push('goal=' + L.goal);
  if (L.companySlug) rq.push('company=' + L.companySlug);
  if (L.role) rq.push('role=' + L.role);
  $('retake').href = '/sql-interview-readiness-test/' + (rq.length ? '?' + rq.join('&') : '');
  try { localStorage.setItem('sqlquest_readiness_v1', JSON.stringify({ at: Date.now(), company: co ? co.name : null, overall, weakest, scores: scoresObj, goal: goalObj.intakeGoal, healthGoal: L.goal, date: L.goal === 'interview' && L.daysOut !== null ? $('date').value : null, intakeRole: roleObj ? roleObj.intakeRole : null })); } catch (_) {}
  track('readiness_completed', Object.assign({ company: co ? co.name : null, score: overall, weakest, archetype: arch, unit: rm.unit, steps: rm.steps.length }, L));
  $('plan').onclick = () => track('readiness_plan_clicked', Object.assign({ company: co ? co.name : null, weakest, challengeId: next ? next.id : null }, L));
  $('share').onclick = () => {
    const shareUrl = location.origin + '/sql-interview-readiness-test/?r=' + encodeShareCode({ scores: scoresObj, company: L.companySlug, role: L.role }, SKILLS, ROLES);
    const text = 'My SQL interview Skillmap' + (co ? ' for ' + co.name : '') + ': ' + skills.map(s => s + ' ' + score(s)).join(', ') + '. Free 10-minute SQL Interview Health Check:';
    const done = method => { track('readiness_shared', { companySlug: L.companySlug, role: L.role, method }); };
    if (navigator.share) { navigator.share({ title: 'My SQL interview Skillmap', text, url: shareUrl }).then(() => done('share')).catch(() => {}); return; }
    const note = $('shared-note');
    const showNote = msg => { note.textContent = msg; note.hidden = false; done('copy'); };
    try { navigator.clipboard.writeText(text + ' ' + shareUrl).then(() => showNote('Link copied.'), () => showNote(shareUrl)); }
    catch (_) { showNote(shareUrl); }
  };
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>
</body>
</html>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = buildData();
  fs.writeFileSync(path.join(ROOT, 'src', 'sql-interview-readiness-test.html'), render(data));
  console.log(`[readiness-test] ${QUESTIONS.length} questions · ${Object.keys(data.companies).length} companies`);
}
