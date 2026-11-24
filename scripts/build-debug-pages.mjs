#!/usr/bin/env node
// /sql-debugging-practice/ — the one SEO page for the Debug question type
// (founder 2026-11-23: "bu özelliği iyi tanıtmamız lazım seo sayfalarıyla").
//
// The exception it ships under is the 2026-11-23 row in
// docs/agent/fleet/orchestrator-decisions.md: S1 is RED, so at most 2 new
// pages, keywords from our own GSC/Bing queries plus a dated SERP read
// (docs/reads/debug-seo-keywords-2026-11-23.md), generated, linked in the same
// commit, rendered ONLY while features.debugQuestions is true, and still no
// /questions/ page for a Debug item. The read found one distinct intent
// ("sql debugging practice / exercises"), so this is one page, not two.
//
// Flag off (until the flip): this script deletes the page if one is there,
// strips its sitemap block and injects no link anywhere — public/ does not
// change by a byte. Flag on: it writes public/sql-debugging-practice/index.html,
// the sitemap block between <!-- debug-hub:start/end -->, and one link to the
// page on the homepage footer, /sql-exercises/, the five trap pages, the two
// AI pages and the TikTok and Shopify pages (each between
// <!-- debug-hub-link:start/end -->, so a rebuild never doubles it).
//
// What the page never shows: an item's reference solution, its broken query
// (not even part of it), or its bugNote (which names the fix). It names the
// bug family per item — the hub's job is to say what kind of bug the set
// trains — and links only the items a cold visitor can open: a Hard is Pro,
// and the app swaps a cold visitor on a Hard deep link to an unrelated free
// preview (A1 on #249), so a Hard row says "Pro" and carries no link.
//
// Runs in `npm run build` right after debug-discovery.mjs (both write into
// the built copies in public/), before the prune, lastmod and llms.txt steps.
// Tests: tests/debug-seo-pages.test.js.

import fs from 'node:fs';
import path from 'node:path';
import { debugFlagOn, loadDebugItems, debugHref, builtCopies } from './debug-discovery.mjs';
import { CSS as PATTERN_CSS, highlight, inline, resultHtml } from './build-pattern-pages.mjs';
import { sqlQuestFacts } from './build-alternatives-pages.mjs';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';
import { freeTierSentence, freeSolvesLabel } from '../src/utils/display-count.js';
import { isFreePreview } from '../src/utils/challenge-order.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const SITE = 'https://sqlquest.app';

export const SLUG = 'sql-debugging-practice';
export const URL_PATH = `/${SLUG}/`;
export const PUBLISHED = '2026-11-23';
export const SRC = 'seo-debug';
export const TITLE = 'SQL Debugging Practice: Find and Fix the Bug | SQLQuest.app';
export const LINK_TEXT = 'SQL debugging practice';

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The bug families the set trains, one sentence each. `trap` is the page that
// explains it in full. Every Debug item maps to one family (FAMILY_BY_ID);
// an item without one fails the build, so a new item cannot ship unlabelled.
export const FAMILIES = {
  date_bound: { name: 'A date bound that drops the last day', line: "BETWEEN '…-01' AND '…-07' on a timestamp column stops at midnight on the 7th, so every row later that day is lost.", trap: 'sql-between-timestamp' },
  group_by: { name: 'GROUP BY on the wrong columns', line: 'Group by too few columns and different rows are averaged together; group by a raw timestamp and every row becomes its own group.' },
  integer_division: { name: 'Integer division', line: 'An integer divided by an integer stays an integer in SQLite, so a rate loses its decimals before ROUND ever sees them.' },
  count_null: { name: 'COUNT(*) against COUNT(column)', line: 'COUNT(*) counts rows; COUNT(column) and AVG(column) skip NULLs, so a count next to an average can describe different rows.' },
  not_in_null: { name: 'NOT IN with a NULL in the list', line: 'One NULL in the subquery makes every NOT IN comparison unknown, and the query quietly returns nothing.', trap: 'sql-not-in-null' },
  left_join_where: { name: 'A WHERE that undoes a LEFT JOIN', line: 'A filter on the right-hand table in WHERE throws away the unmatched rows the LEFT JOIN was there to keep.', trap: 'sql-left-join-where-filter' },
  ties: { name: 'Ties in a ranking', line: 'ROW_NUMBER never ties; RANK and DENSE_RANK do. Pick the one the question’s tie rule describes.' },
  distinct: { name: 'DISTINCT in the wrong place', line: 'DISTINCT inside an aggregate collapses equal values, so repeated quantities are counted once instead of every time.' },
  fan_out: { name: 'JOIN fan-out', line: 'Join one parent to two child tables and every pair repeats, so both totals are multiplied.', trap: 'sql-join-fan-out' },
  avg_of_avgs: { name: 'An average of averages', line: 'Averaging per-group averages weighs a group of two the same as a group of two hundred.', trap: 'sql-average-of-averages' },
  window_partition: { name: 'The wrong window partition', line: 'A running total partitioned by the wrong column restarts at the wrong place and mixes rows that do not belong together.' },
};

export const FAMILY_BY_ID = {
  331: 'date_bound', 332: 'group_by', 333: 'integer_division', 334: 'count_null', 335: 'not_in_null', 336: 'left_join_where',
  337: 'ties', 338: 'distinct', 339: 'group_by', 340: 'fan_out', 341: 'avg_of_avgs', 342: 'window_partition',
};

// C7 question mining, 2026-11-24 (docs/reads/questions-2026-11-24.md): "why
// does my GROUP BY run in SQLite and fail in PostgreSQL?" answered on the page
// with a worked example. It runs on the app's ecommerce dataset, never on a
// Debug item's own data or query (the page must not show a broken query, and
// tests/debug-seo-pages.test.js checks no two of its lines appear here).
// Every query and every fact is run by tests/question-answers-2026-11-24.test.js.
export const GROUP_BY_DIALECT = {
  id: 'group-by-sqlite-postgresql',
  heading: 'Why a GROUP BY runs in SQLite and fails in PostgreSQL',
  dataset: 'ecommerce',
  wrong: {
    sql: "SELECT category,\n       product,\n       ROUND(SUM(total), 2) AS revenue\nFROM orders\nGROUP BY category;",
    rowCount: 2,
  },
  fixes: [
    {
      label: 'You wanted revenue per product: group by every column you show',
      sql: "SELECT category,\n       product,\n       ROUND(SUM(total), 2) AS revenue\nFROM orders\nGROUP BY category, product\nORDER BY revenue DESC\nLIMIT 3;",
      columns: ['category', 'product', 'revenue'],
      rows: [['Electronics', 'Laptop Pro', 1299.99], ['Furniture', 'Standing Desk', 599.99], ['Electronics', 'Graphics Card', 549.99]],
    },
    {
      label: 'You wanted revenue per category: put the product inside an aggregate',
      sql: "SELECT category,\n       COUNT(DISTINCT product) AS products,\n       ROUND(SUM(total), 2) AS revenue\nFROM orders\nGROUP BY category\nORDER BY category;",
      columns: ['category', 'products', 'revenue'],
      rows: [['Electronics', 23, 4984.68], ['Furniture', 17, 3171.76]],
    },
  ],
  // Each `text` appears on the page; each `sql` returns `expect` on the dataset.
  facts: [
    { text: '4,984.68', sql: "SELECT ROUND(SUM(total), 2) FROM orders WHERE category = 'Electronics'", expect: 4984.68 },
    { text: '23 products', sql: "SELECT COUNT(DISTINCT product) || ' products' FROM orders WHERE category = 'Electronics'", expect: '23 products' },
    { text: 'Laptop Pro, the top seller, brought in 1,299.99', sql: "SELECT product || ', the top seller, brought in ' || printf('%,.2f', SUM(total)) FROM orders GROUP BY product ORDER BY SUM(total) DESC LIMIT 1", expect: 'Laptop Pro, the top seller, brought in 1,299.99' },
  ],
  before: 'In SQLite this runs and returns two rows, one per category. Each row shows the whole category’s revenue (4,984.68 for Electronics) next to one product name SQLite took from one of the category’s rows. Electronics has 23 products, and the row reads as if that one product earned all of it. Laptop Pro, the top seller, brought in 1,299.99.',
  after: 'PostgreSQL refuses the same query with an error that `orders.product` must appear in the GROUP BY clause or be used in an aggregate function, and MySQL’s default mode refuses it too. SQLite is the lenient one: a column that is neither grouped nor aggregated gets a value from some row of the group. The error is the database asking you what you meant. Answer it one of two ways.',
  rule: 'Every column in the SELECT list is either in the GROUP BY or inside an aggregate. If SQLite accepted a query that breaks this rule, the number is not wrong yet, but the label next to it can be.',
};

function groupByDialectHtml(g = GROUP_BY_DIALECT) {
  return `
  <h2 class="fd" id="${g.id}">${esc(g.heading)}</h2>
  <p class="lbl bad">Runs in SQLite, refused by PostgreSQL</p>
  <pre class="bad"><code>${highlight(g.wrong.sql)}</code></pre>
  <p class="lead">${inline(g.before)}</p>
  <p class="lead">${inline(g.after)}</p>
${g.fixes.map((f, i) => `  <p class="lbl good">Fix ${i + 1}: ${esc(f.label)}</p>
  <pre class="good"><code>${highlight(f.sql)}</code></pre>
  ${resultHtml(f)}`).join('\n')}
  <p class="rule"><strong>Rule of thumb.</strong> ${inline(g.rule)}</p>`;
}

const DIFF_ORDER = ['Easy', 'Medium', 'Hard'];
const cleanTitle = t => String(t).replace(/^Debug: /, '');

/** A row a cold visitor can open (not a locked Hard). */
export const openable = c => c.difficulty !== 'Hard' || isFreePreview(c);

export function pageModel(items = loadDebugItems(), facts = sqlQuestFacts()) {
  const list = items.filter(c => c && c.type === 'debug')
    .slice().sort((a, b) => DIFF_ORDER.indexOf(a.difficulty) - DIFF_ORDER.indexOf(b.difficulty) || a.id - b.id);
  const missing = list.filter(c => !FAMILIES[FAMILY_BY_ID[c.id]]).map(c => c.id);
  if (missing.length) throw new Error(`[debug-pages] no bug family for Debug item(s) ${missing.join(', ')} — add them to FAMILY_BY_ID`);
  const split = Object.fromEntries(DIFF_ORDER.map(d => [d, list.filter(c => c.difficulty === d).length]));
  const splitText = DIFF_ORDER.filter(d => split[d]).map(d => `${split[d]} ${d}`).join(', ');
  const first = list.find(openable) || null;
  const familyKeys = [...new Set(list.map(c => FAMILY_BY_ID[c.id]))];
  const patternBySlug = new Map(SQL_PATTERNS.map(p => [p.slug, p]));
  const families = familyKeys.map(k => ({ key: k, ...FAMILIES[k], trapPage: FAMILIES[k].trap && patternBySlug.has(FAMILIES[k].trap) ? FAMILIES[k].trap : null }));
  const n = list.length;
  const description = `${n} SQL debugging exercises. An AI assistant's query runs and returns the wrong answer: find the line, fix it, and the checker grades your fix.`;
  const lockedHard = list.some(c => !openable(c));
  // The free tier said the way the gates decide it (freeTierSentence), then
  // where Debug sits in it: Easy and Medium use the free solves, Hard is Pro.
  const access = `${freeTierSentence(facts.n)} Easy and Medium Debug questions count toward those ${freeSolvesLabel().replace(/^\d+ /, '')}${lockedHard ? '; the Hard ones are Pro' : ''}.`;
  const faq = [
    ['What is a SQL debugging exercise?', `A task, a dataset and a query that already runs but returns the wrong answer. You find the line that is wrong, fix the query, and submit it. The fix is graded like any SQL Quest challenge: your result is compared with the expected rows.`],
    ['Did an AI assistant really write these queries?', 'Each query is presented as an AI assistant’s draft, because that is the situation you meet when you review one. We wrote and checked every query ourselves, so each has one known defect and an expected result to grade your fix against.'],
    ['Do I have to find the wrong line before I fix it?', 'No. Tapping the line you think is wrong is optional and scored on its own, as your spot accuracy. It never blocks the fix and a wrong tap never costs you a solve.'],
    ['Which SQL dialect do the questions use?', 'SQLite, running in your browser. The bugs in this set are about logic, not dialect: the same JOIN, NULL, date and window mistakes return wrong answers in PostgreSQL, MySQL, BigQuery or Snowflake.'],
    ['Why does my GROUP BY query run in SQLite but fail in PostgreSQL?', 'SQLite lets you select a column that is neither in the GROUP BY nor inside an aggregate, and fills it with a value from some row of the group. PostgreSQL and MySQL’s default mode refuse that query. Either add the column to the GROUP BY, if you wanted one row per value of it, or wrap it in an aggregate such as COUNT(DISTINCT …) or MAX(…), if you wanted one row per group. The worked example on this page shows both on the same data.'],
    ['Is SQL debugging practice free?', access],
    ['Where can I read about these bugs first?', `Five of them have their own page with the query, the reason and the fix: ${SQL_PATTERNS.map(p => p.short).join(', ')}.`],
  ];
  return { list, n, split, splitText, first, families, description, access, faq };
}

function itemRow(c) {
  const fam = FAMILIES[FAMILY_BY_ID[c.id]];
  const title = esc(cleanTitle(c.title));
  const cell = openable(c)
    ? `<a href="${debugHref(c, SRC)}" data-track="cta_debug_hub_item">${title}</a>`
    : `${title} <span class="pro">Pro</span>`;
  // On a phone the third column folds under the title (.bk), so the table never scrolls sideways.
  return `<tr><td>${cell}<span class="bk">${esc(fam.name)}</span></td><td>${esc(c.difficulty)}</td><td>${esc(fam.name)}</td></tr>`;
}

export function renderHub(model = pageModel()) {
  const { list, n, splitText, first, families, description, access, faq } = model;
  const url = `${SITE}${URL_PATH}`;
  const h1 = 'SQL debugging practice: fix the query an AI wrote';
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: h1, description, url, datePublished: PUBLISHED, dateModified: PUBLISHED, author: { '@type': 'Person', name: 'Göktuğ', jobTitle: 'Founder, SQL Quest' }, publisher: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'SQL exercises', item: `${SITE}/sql-exercises/` },
      { '@type': 'ListItem', position: 3, name: 'SQL debugging practice', item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const cta = first
    ? `<a class="btn" href="${debugHref(first, SRC)}" data-track="cta_debug_hub_start">Fix your first query</a>`
    : `<a class="btn" href="/app/?src=${SRC}" data-track="cta_debug_hub_start">Open the practice app</a>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GENERATED by scripts/build-debug-pages.mjs from src/data/debug-challenges.js — do not edit. Rendered only while features.debugQuestions is true. -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(TITLE)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="SQLQuest.app">
  <meta property="og:title" content="${esc(TITLE)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(TITLE)}">
  <meta name="twitter:description" content="${esc(description)}">
  <script defer src="/_vercel/insights/script.js"></script>
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>${PATTERN_CSS}
.btn{padding:13px 24px;font-size:15px;background:#FFE34D;color:#0E0F13}.btn:hover{text-decoration:none}
ol.steps{margin:10px 0 0 20px;color:#cbd5e1;font-size:16px}ol.steps li{margin:8px 0}ol.steps strong{color:#e2e8f0}
.fam{list-style:none;display:grid;gap:10px}.fam li{background:rgba(10,10,25,.5);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px;font-size:15px;color:#cbd5e1}.fam li strong{display:block;color:#e2e8f0}
.items{overflow-x:auto;border:1px solid #2A2E38;border-radius:10px;margin-top:10px}.items table{border-collapse:collapse;width:100%;font-size:14px;min-width:520px}
.items th,.items td{padding:9px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,.05)}.items th{color:#8b98ab;font-weight:700;font-size:12px;letter-spacing:.06em;text-transform:uppercase}.items td{color:#cbd5e1}
.pro{font-size:12px;font-weight:700;color:#c084fc;border:1px solid rgba(124,58,237,.4);border-radius:6px;padding:1px 6px;margin-left:6px}
.faq h3{font-size:16px}.faq p{font-size:15px;color:#cbd5e1}
.bk{display:none}
@media(max-width:600px){.wrap{padding:28px 16px 56px}.ni{padding:12px 16px}.items table{min-width:0}.items th:nth-child(3),.items td:nth-child(3){display:none}.bk{display:block;font-size:13px;color:#8b98ab;margin-top:2px}}</style>
</head>
<body>
<nav class="nav"><div class="ni"><a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:#e2e8f0;"><span style="width:32px;height:32px;border-radius:9px;background:#7c3aed;display:inline-flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span><span class="fd" style="font-weight:800;font-size:18px;">SQL Quest</span></a><a href="/sql-exercises/" style="font-size:14px;">SQL exercises</a></div></nav>
<main class="wrap">
  <p class="crumb"><a href="/">SQL Quest</a> › <a href="/sql-exercises/">SQL exercises</a> › SQL debugging practice</p>
  <h1 class="fd">${esc(h1)}</h1>
  <p class="lead">${n} practice questions that start from a query instead of a blank editor. An AI assistant wrote each one for the task. It runs, it returns a believable answer, and the answer is wrong. Find the line, fix the query, and the checker grades your fix against the expected result.</p>
  <p class="lead">Reviewing a query you did not write is part of the job: a colleague’s, an old dashboard’s, or one an assistant drafted in a second. The bugs that matter raise no error, so this set trains the habit that catches them: check what the query returns, not how it reads.</p>
  <p style="margin-top:22px;">${cta}</p>

  <h2 class="fd" id="how-it-works">How it works: spot, fix, learn</h2>
  <ol class="steps">
    <li><strong>Spot.</strong> Read the task and the AI’s query, and tap the line you think is wrong. This step is optional and scored on its own.</li>
    <li><strong>Fix.</strong> Edit the query and submit it. Run the original first if you like, and compare its rows with the expected ones to see what the bug does.</li>
    <li><strong>Learn.</strong> After a correct fix, one line says what the bug was, with a link to the trap page when there is one.</li>
  </ol>

  <h2 class="fd" id="bug-kinds">The bugs in the set</h2>
  <ul class="fam">${families.map(f => `<li><strong>${esc(f.name)}</strong>${esc(f.line)}${f.trapPage ? ` <a href="/${f.trapPage}/">Read the trap</a>` : ''}</li>`).join('')}</ul>

  <h2 class="fd" id="questions">The ${n} questions</h2>
  <p class="lead">${esc(splitText)}. ${esc(access)}</p>
  <div class="items"><table>
    <thead><tr><th>Question</th><th>Difficulty</th><th>Bug kind</th></tr></thead>
    <tbody>${list.map(itemRow).join('')}</tbody>
  </table></div>
${groupByDialectHtml()}

  <section class="faq">
    <h2 class="fd">Questions</h2>
${faq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}
  </section>

  <h2 class="fd">Related</h2>
  <div class="rel">${SQL_PATTERNS.map(p => `<a href="/${p.slug}/">${esc(p.short)}<span>SQL trap</span></a>`).join('')}<a href="/sql-for-the-ai-era/">SQL for the AI era<span>What the work asks for now</span></a><a href="/blog/validate-ai-generated-sql/">How to validate AI-generated SQL<span>Blog</span></a><a href="/vs-chatgpt/">SQL Quest vs ChatGPT<span>Comparison</span></a><a href="/sql-exercises/">SQL exercises<span>Practice by topic</span></a></div>
</main>
<script defer src="/track.js"></script>
<footer class="ft">SQL Quest — personalized SQL interview practice · <a href="/questions/">All SQL interview questions</a> · <a href="/sql-exercises/">Practice by difficulty</a> · <a href="/sql-interview-prep/">Company guides</a> · <a href="/sql-tools/">Free SQL tools</a> · <a href="/privacy/">Privacy</a></footer>
</body>
</html>
`;
}

// ---- links to the hub, injected into the built copies (flag on only) ----

const LINK_START = '<!-- debug-hub-link:start -->';
const LINK_END = '<!-- debug-hub-link:end -->';
const wrapLink = html => `${LINK_START}${html}${LINK_END}`;
const para = (inner, style = 'margin-top:14px;') => wrapLink(`<p style="${style}">${inner}</p>`);
const hubA = track => `<a href="${URL_PATH}" data-track="${track}">${LINK_TEXT}</a>`;

/** Every page that links to the hub: file under public/, where, and what. */
export function linkTargets(n) {
  const all = `all ${n} questions where an AI’s query returns the wrong answer and you fix it`;
  return [
    { file: 'index.html', anchor: '<a href="/weekly/">Weekly challenge</a>', place: 'after', html: wrapLink(`<a href="${URL_PATH}">SQL debugging practice</a>`) },
    { file: 'sql-exercises/index.html', anchor: '<!-- topic-traps:end -->', place: 'after',
      html: para(`Practise the traps the other way round: ${hubA('cta_exercises_debug_hub')}, ${all}.`, 'max-width:860px;margin:18px auto 0;font-size:14px;color:#94a3b8;line-height:1.7;') },
    ...SQL_PATTERNS.map(p => ({ file: `${p.slug}/index.html`, anchor: '<h2 class="fd">Related SQL traps</h2>', place: 'before',
      html: para(`More bugs to find and fix: ${hubA('cta_pattern_debug_hub')}, ${all}.`, 'margin-top:22px;font-size:15px;color:#cbd5e1;') })),
    { file: 'sql-for-the-ai-era/index.html', anchor: '<!-- debug-discovery:end -->', place: 'before', html: para(`All of them, with the bug each one trains: ${hubA('cta_ai_debug_hub')}.`) },
    { file: 'blog/validate-ai-generated-sql/index.html', anchor: '<!-- debug-discovery:end -->', place: 'before', html: para(`All of them, with the bug each one trains: ${hubA('cta_ai_debug_hub')}.`) },
    { file: 'tiktok-sql-interview/index.html', anchor: '<!-- company-topics:end -->', place: 'after', html: para(`Reading a query someone else wrote, and fixing it: ${hubA('cta_company_debug_hub')}, ${all}.`, 'max-width:860px;margin:18px auto 0;font-size:15px;color:#94a3b8;') },
    { file: 'shopify-sql-interview/index.html', anchor: '<!-- company-topics:end -->', place: 'after', html: para(`Reading a query someone else wrote, and fixing it: ${hubA('cta_company_debug_hub')}, ${all}.`, 'max-width:860px;margin:18px auto 0;font-size:15px;color:#94a3b8;') },
  ];
}

/** Insert once at the anchor. Flag off, a missing anchor, or already there → unchanged. */
export function withHubLink(html, target, { flagOn }) {
  if (!flagOn || html.includes(LINK_START)) return html;
  const i = html.indexOf(target.anchor);
  if (i < 0) return html;
  const at = target.place === 'after' ? i + target.anchor.length : i;
  return html.slice(0, at) + target.html + html.slice(at);
}

/** The sitemap with the hub's block (flag on) or without it (flag off). */
export function withSitemapBlock(xml, { flagOn }) {
  const out = xml.replace(/\s*<!-- debug-hub:start -->[\s\S]*?<!-- debug-hub:end -->/, '');
  if (!flagOn) return out;
  // The date is a placeholder; scripts/sitemap-lastmod.mjs rewrites it from the page hash.
  const block = `\n  <!-- debug-hub:start -->\n  <url>\n    <loc>${SITE}${URL_PATH}</loc>\n    <lastmod>${PUBLISHED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n  <!-- debug-hub:end -->`;
  return out.replace('</urlset>', `${block}\n</urlset>`);
}

/** llms.txt entry point while the page exists (build-llms-txt.js). */
export const llmsEntryPoint = (flagOn = debugFlagOn()) => (flagOn
  ? [[URL_PATH, 'SQL debugging practice: questions that open on an AI assistant’s wrong query; find the line, fix it, and the fix is graded against the expected result.']]
  : []);

export function buildDebugPages({ flagOn = debugFlagOn(), pub = PUB } = {}) {
  const dir = path.join(pub, SLUG);
  const sitemap = path.join(pub, 'sitemap.xml');
  if (fs.existsSync(sitemap)) {
    const xml = fs.readFileSync(sitemap, 'utf8');
    const next = withSitemapBlock(xml, { flagOn });
    if (next !== xml) fs.writeFileSync(sitemap, next);
  }
  if (!flagOn) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    return { pages: 0, links: 0 };
  }
  const model = pageModel();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), renderHub(model));
  let links = 0;
  // Both built copies of each page: Vercel serves the flat <slug>.html (S1 F5).
  for (const t of linkTargets(model.n)) {
    for (const file of builtCopies(pub, t.file)) {
      const html = fs.readFileSync(file, 'utf8');
      const next = withHubLink(html, t, { flagOn });
      if (next !== html) { fs.writeFileSync(file, next); links++; }
    }
  }
  return { pages: 1, links };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flagOn = debugFlagOn();
  const { pages, links } = buildDebugPages({ flagOn });
  console.log(`[debug-pages] debugQuestions ${flagOn ? 'ON' : 'off'} · ${pages} page(s) · ${links} page(s) linked to ${URL_PATH}`);
}
