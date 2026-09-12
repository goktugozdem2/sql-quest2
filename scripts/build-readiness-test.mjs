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
 * readiness_completed {company, score, weakest}, readiness_plan_clicked.
 *
 * Run: node scripts/build-readiness-test.mjs   (writes src/sql-interview-readiness-test.html)
 */

import { questionSlugs } from './question-slugs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { loadBank, facts, SKILL_PAGE } from './build-company-pages.mjs';
import { isFreePreview } from '../src/utils/challenge-order.js';
import { SKILL_TO_RADAR, mapTopicToSkill } from '../src/utils/skill-calc.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = 'https://sqlquest.app';

// Ten questions. Every answer was worked by hand against the SQL shown; the
// explanations say why, so a wrong answer still teaches the point.
export const QUESTIONS = [
  {
    skill: 'Joins',
    q: 'customers has 3 rows (Ana, Ben, Cy). orders has 3 rows: two for Ana, one for Ben, none for Cy. What does this return?',
    sql: 'SELECT c.name, COUNT(o.id) AS orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.name;',
    options: ['3 rows — Cy has 0', '2 rows — Cy is missing', '3 rows — Cy has 1', '3 rows — Cy has NULL'],
    answer: 0,
    why: 'The LEFT JOIN keeps Cy with NULLs on the orders side, and COUNT(o.id) skips NULLs, so Cy counts 0. COUNT(*) would have said 1.',
  },
  {
    skill: 'Joins',
    q: 'orders: (1, amount 100), (2, amount 50). order_items: two items for order 1, one for order 2. What is the result?',
    sql: 'SELECT SUM(o.amount)\nFROM orders o\nJOIN order_items i ON i.order_id = o.id;',
    options: ['150', '250', '300', 'An error'],
    answer: 1,
    why: 'The join repeats order 1 once per item, so its 100 is summed twice: 100 + 100 + 50 = 250. This fan-out is the most common wrong answer in analytics rounds; aggregate before joining.',
  },
  {
    skill: 'Window Functions',
    q: 'You need each employee\'s salary rank within their department. Ties share a rank and the next rank has no gap. Which expression?',
    sql: null,
    options: ['DENSE_RANK() OVER (PARTITION BY dept ORDER BY salary DESC)', 'RANK() OVER (ORDER BY salary DESC)', 'ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC)', 'DENSE_RANK() OVER (ORDER BY dept, salary DESC)'],
    answer: 0,
    why: 'PARTITION BY restarts the ranking per department; DENSE_RANK gives ties the same rank without gaps. RANK leaves gaps, ROW_NUMBER breaks ties arbitrarily, and the last option ranks across all departments.',
  },
  {
    skill: 'Window Functions',
    q: 'daily_sales(day, revenue). Which expression gives each day\'s change versus the previous day?',
    sql: null,
    options: ['revenue - LAG(revenue) OVER (ORDER BY day)', 'revenue - LEAD(revenue) OVER (ORDER BY day)', 'revenue - MAX(revenue) OVER (ORDER BY day)', 'SUM(revenue) OVER (ORDER BY day) - revenue'],
    answer: 0,
    why: 'LAG looks one row back in the window order. LEAD looks forward, the MAX version compares with the running maximum, and the last one is the running total of the days before. The first day comes back NULL — say so in an interview.',
  },
  {
    skill: 'Aggregation & Grouping',
    q: 'Which query returns departments with more than 5 employees?',
    sql: null,
    options: ['SELECT dept FROM employees GROUP BY dept HAVING COUNT(*) > 5', 'SELECT dept FROM employees WHERE COUNT(*) > 5 GROUP BY dept', 'SELECT dept, COUNT(*) > 5 FROM employees GROUP BY dept', 'SELECT dept FROM employees GROUP BY dept WHERE COUNT(*) > 5'],
    answer: 0,
    why: 'WHERE filters rows before grouping, so it cannot see COUNT(*). HAVING filters the groups after they are formed. The third option returns every department with a true/false column.',
  },
  {
    skill: 'Aggregation & Grouping',
    q: 'payments has three rows: (user 1, 10), (user 1, NULL), (user 2, 20). What does this return?',
    sql: 'SELECT COUNT(*), COUNT(amount), AVG(amount)\nFROM payments;',
    options: ['3, 3, 10', '3, 2, 10', '3, 2, 15', '2, 2, 15'],
    answer: 2,
    why: 'COUNT(*) counts rows (3); COUNT(amount) and AVG(amount) ignore the NULL, so the average is (10 + 20) / 2 = 15, not 30 / 3.',
  },
  {
    skill: 'Subqueries & CTEs',
    q: 'Find customers whose total spend is above the average customer\'s total spend. Which query is correct?',
    sql: null,
    options: [
      'WITH t AS (SELECT customer_id, SUM(amount) AS total FROM orders GROUP BY customer_id) SELECT customer_id FROM t WHERE total > (SELECT AVG(total) FROM t)',
      'SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(amount) > AVG(amount)',
      'SELECT customer_id FROM orders WHERE SUM(amount) > AVG(amount) GROUP BY customer_id',
      'SELECT customer_id, AVG(SUM(amount)) FROM orders GROUP BY customer_id',
    ],
    answer: 0,
    why: 'The average has to be taken over per-customer totals, so the totals are computed first (the CTE) and averaged second. The HAVING version compares a customer\'s total with their own average order, and nesting aggregates is not allowed.',
  },
  {
    skill: 'NULL Handling',
    q: 'users.referrer_id holds 5, 7, NULL and NULL. What does this return?',
    sql: 'SELECT COUNT(*) FROM users\nWHERE referrer_id <> 5;',
    options: ['1', '2', '3', '4'],
    answer: 0,
    why: 'NULL <> 5 is unknown, not true, so both NULL rows are filtered out; only the 7 survives. To keep them: WHERE referrer_id <> 5 OR referrer_id IS NULL.',
  },
  {
    skill: 'Date Functions',
    q: 'orders.created_at is a TIMESTAMP. Which filter returns every order placed in March 2026, and nothing else?',
    sql: null,
    options: ["created_at >= '2026-03-01' AND created_at < '2026-04-01'", "created_at BETWEEN '2026-03-01' AND '2026-03-31'", "EXTRACT(MONTH FROM created_at) = 3", "created_at LIKE '2026-03%'"],
    answer: 0,
    why: 'The half-open range includes all of 31 March. BETWEEN stops at midnight on the 31st, the EXTRACT version matches March of every year, and LIKE on a timestamp depends on the dialect\'s text conversion.',
  },
  {
    skill: 'Conditional Logic',
    q: 'In PostgreSQL, which expression gives the share of orders with status \'refunded\' as a decimal?',
    sql: null,
    options: ["AVG(CASE WHEN status = 'refunded' THEN 1.0 ELSE 0 END)", "COUNT(CASE WHEN status = 'refunded' THEN 1 END) / COUNT(*)", "SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) / COUNT(*)", "COUNT(status = 'refunded') / COUNT(*)"],
    answer: 0,
    why: 'Averaging a 1.0/0 flag is the share, as a decimal. The next two divide integers, which truncates to 0 in PostgreSQL, and COUNT(status = \'refunded\') counts every non-NULL comparison, true or false.',
  },
];

const SKILLS = [...new Set(QUESTIONS.map(q => q.skill))];

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

export function buildData() {
  const bank = loadBank();
  const all = [...bank.byId.values()];
  QS = questionSlugs(all);
  const companies = {};
  for (const { slug, name } of companyList()) {
    const f = facts(bank, name);
    if (!f.n) continue;
    const pool = f.ordered;
    const weights = {};
    for (const s of SKILLS) weights[s] = (f.dist.find(d => d.skill === s) || { share: 0 }).share;
    const next = {};
    for (const s of SKILLS) next[s] = nextFor(s, pool, all);
    companies[slug] = { name, n: f.n, weights, next };
  }
  const general = { name: null, weights: Object.fromEntries(SKILLS.map(s => [s, 1])), next: Object.fromEntries(SKILLS.map(s => [s, nextFor(s, all, all)])) };
  return { companies, general };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FAQ = [
  ['What does the SQL interview readiness test measure?', 'Ten questions across the skills SQL interviews lean on: joins, window functions, aggregation, CTEs and subqueries, NULL handling, date filters and conditional logic. Each question maps to one skill on your Skillmap, and the result shows a score per skill, your weakest one, and an overall readiness score.'],
  ['How is a company readiness score calculated?', 'When you pick a company, each skill is weighted by how much of that company\'s SQL Quest practice set uses it — the same composition its interview page shows. It is a weighting of our practice set, not a measurement of the company\'s interview, and the result says so.'],
  ['Do I need an account?', 'No. The test runs in your browser and needs no signup. When you open your recommended next challenge, the app starts in guest mode; an account is only needed to keep progress across devices.'],
  ['What happens after the test?', 'You get your weakest skill, the practice page for it, and one next challenge chosen for that skill — from the company\'s own set when you picked one. "Build my personalized practice plan" opens that challenge in the app, where the Coach keeps picking from your Skillmap.'],
];

export function render(data) {
  const title = 'SQL Interview Readiness Test — Free, 10 Questions, Your Skillmap | SQL Quest';
  const description = 'Free SQL interview readiness test: 10 questions, no signup. Get a readiness score (weighted for your target company), a score per SQL skill — joins, window functions, aggregation — and the practice plan for your weakest one.';
  const url = `${SITE}/sql-interview-readiness-test/`;
  const opts = Object.entries(data.companies).map(([slug, c]) => `<option value="${slug}">${esc(c.name)}</option>`).join('');
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'SQL Interview Readiness Test', item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'Quiz', name: 'SQL Interview Readiness Test', description, url, educationalLevel: 'Intermediate', isAccessibleForFree: true, inLanguage: 'en', about: SKILLS.map(s => ({ '@type': 'Thing', name: s })), provider: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` } },
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
  <meta property="og:site_name" content="SQL Quest">
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
    .fi{border-bottom:1px solid rgba(255,255,255,.06);padding:16px 0}.fi summary{cursor:pointer;font-weight:700;font-size:16px}.fi p{color:#94a3b8;font-size:14px;line-height:1.75;margin-top:10px}
    [hidden]{display:none!important}
  </style>
</head>
<body>
<nav class="nav"><div class="ni"><a href="/" class="fd" style="color:#e2e8f0;text-decoration:none;font-weight:800;font-size:19px;">SQL Quest</a><a href="/sql-interview-prep/" style="color:#94a3b8;text-decoration:none;font-size:14px;">SQL Interview Prep</a></div></nav>

<main class="wrap">
  <p style="font-size:13px;color:#8b98ab;margin-bottom:12px;"><a href="/" style="color:#8b98ab;text-decoration:none;">SQL Quest</a> › SQL Interview Readiness Test</p>
  <h1 class="fd" style="font-size:clamp(32px,4.6vw,50px);font-weight:800;line-height:1.1;margin-bottom:14px;">SQL Interview <span style="color:#FFE34D;">Readiness Test</span></h1>
  <p id="lede" style="font-size:17px;color:#94a3b8;line-height:1.75;margin-bottom:26px;">Ten questions, no signup, about five minutes. You get a readiness score, your Skillmap across the SQL interviews lean on, and the practice plan for your weakest skill.</p>

  <section id="start" class="card">
    <label for="company" style="display:block;font-size:14px;font-weight:700;margin-bottom:10px;">Preparing for a specific company? <span style="color:#8b98ab;font-weight:500;">(optional)</span></label>
    <select id="company"><option value="">No specific company</option>${opts}</select>
    <p style="font-size:13px;color:#8b98ab;margin:12px 0 18px;line-height:1.6;">With a company picked, the score is weighted by the skill mix of that company's practice set.</p>
    <button class="btn bp" id="go" type="button">Start the test</button>
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
    <p id="rlabel" class="fd" style="font-size:15px;color:#8b98ab;font-weight:700;"></p>
    <p class="fd" style="font-size:56px;font-weight:800;line-height:1;margin:6px 0 4px;"><span id="rscore" style="color:#FFE34D;"></span></p>
    <p id="rnote" style="font-size:13px;color:#8b98ab;line-height:1.6;margin-bottom:20px;"></p>
    <p class="fd" style="font-size:16px;font-weight:800;margin-bottom:10px;">Your Skillmap</p>
    <div id="rskills"></div>
    <div style="margin-top:22px;padding:18px;border:1px solid rgba(124,58,237,.3);border-radius:12px;background:rgba(124,58,237,.06);">
      <p style="font-size:14px;color:#94a3b8;">Weakest skill</p>
      <p id="rweak" class="fd" style="font-size:22px;font-weight:800;margin:4px 0 8px;"></p>
      <p id="rtrain" style="font-size:14px;color:#94a3b8;line-height:1.7;"></p>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:22px;">
      <a id="plan" class="btn bp" href="/app/?src=readiness">Build My Personalized Practice Plan</a>
      <a id="retake" class="btn bo" href="/sql-interview-readiness-test/">Retake</a>
    </div>
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
const DATA = ${JSON.stringify(data)};
const SKILL_PAGE = ${JSON.stringify(Object.fromEntries(Object.entries(SKILL_PAGE)))};
const track = (e, p) => { try { window.sqTrack && window.sqTrack(e, p || {}); } catch (_) {} };
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const pre = params.get('company');
if (pre && DATA.companies[pre]) {
  $('company').value = pre;
  $('lede').textContent = 'Ten questions, no signup, about five minutes. You get your ' + DATA.companies[pre].name + ' interview readiness score, your Skillmap, and the practice plan for your weakest skill.';
}
let i = 0; const answers = [];
function show() {
  const q = QUESTIONS[i];
  $('count').textContent = 'Question ' + (i + 1) + ' of ' + QUESTIONS.length;
  $('skill').textContent = q.skill;
  $('prog').style.width = (100 * i / QUESTIONS.length) + '%';
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
      $('next').textContent = i + 1 < QUESTIONS.length ? 'Next question →' : 'See my result →'; $('next').hidden = false;
    };
    $('opts').appendChild(b);
  });
}
$('go').onclick = () => { $('start').hidden = true; $('quiz').hidden = false; track('readiness_started', { company: $('company').value || null }); show(); };
$('next').onclick = () => { i++; if (i < QUESTIONS.length) show(); else finish(); };
function finish() {
  const slug = $('company').value; const co = DATA.companies[slug] || null; const base = co || DATA.general;
  const per = {};
  QUESTIONS.forEach((q, k) => { per[q.skill] = per[q.skill] || { right: 0, total: 0 }; per[q.skill].total++; if (answers[k]) per[q.skill].right++; });
  const skills = Object.keys(per);
  const score = s => Math.round(100 * per[s].right / per[s].total);
  let wsum = 0, acc = 0;
  skills.forEach(s => { const w = base.weights[s] || 0; wsum += w; acc += w * score(s); });
  const overall = wsum ? Math.round(acc / wsum) : Math.round(skills.reduce((a, s) => a + score(s), 0) / skills.length);
  const weakest = skills.slice().sort((a, b) => score(a) - score(b) || (base.weights[b] || 0) - (base.weights[a] || 0))[0];
  $('quiz').hidden = true; $('result').hidden = false;
  $('rlabel').textContent = co ? co.name + ' Interview Readiness' : 'SQL Interview Readiness';
  $('rscore').textContent = overall + '%';
  $('rnote').textContent = co
    ? 'Weighted by the skill mix of our ' + co.name + ' practice set (' + co.n + ' challenges) — a weighting of our set, not a measurement of ' + co.name + '\\'s interview.'
    : 'Every skill weighted equally. Pick a company to weight the score by its practice set.';
  $('rskills').innerHTML = skills.map(s => '<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px"><span>' + s + '</span><span class="fm" style="color:' + (score(s) >= 100 ? '#22c55e' : '#e2e8f0') + '">' + score(s) + '</span></div><div class="bar"><span style="width:' + score(s) + '%;background:' + (s === weakest ? '#c084fc' : '#7c3aed') + '"></span></div></div>').join('');
  $('rweak').textContent = weakest;
  const next = base.next[weakest];
  const page = SKILL_PAGE[weakest];
  $('rtrain').innerHTML = 'Start with ' + (next ? '<a href="/questions/' + next.slug + '/" style="color:#e2e8f0;font-weight:700">' + next.title + '</a> (' + next.difficulty + ', free)' : 'the free challenges on this skill') + (co ? ' from the ' + co.name + ' set' : '') + ', then work through ' + (page ? '<a href="' + page[0] + '" style="color:#c084fc">' + page[1] + '</a>' : 'the practice bank') + '. The Coach keeps picking from your Skillmap as you solve.';
  const href = '/app/?src=readiness' + (co ? '&company=' + encodeURIComponent(co.name) : '') + (next ? '&challenge=' + next.id : '');
  $('plan').href = href;
  $('retake').href = '/sql-interview-readiness-test/' + (slug ? '?company=' + slug : '');
  try { localStorage.setItem('sqlquest_readiness_v1', JSON.stringify({ at: Date.now(), company: co ? co.name : null, overall, weakest, scores: Object.fromEntries(skills.map(s => [s, score(s)])) })); } catch (_) {}
  track('readiness_completed', { company: co ? co.name : null, score: overall, weakest });
  $('plan').onclick = () => track('readiness_plan_clicked', { company: co ? co.name : null, weakest, challengeId: next ? next.id : null });
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
