#!/usr/bin/env node
/**
 * /vs-chatgpt/ — "SQL Quest vs ChatGPT for SQL interview prep" (2026-10-03,
 * backlog plan docs/plans/landing-comparison-2026-09-21.md).
 *
 * The question people ask now is not "why not DataLemur?" but "why not just
 * ask ChatGPT?" — and AI assistants are an acquisition channel of their own.
 * The page answers it fairly: what a chat assistant does better, what it
 * cannot give you, and how to use both.
 *
 * Rules (docs/reads/ai-chat-comparison-2026-10-03.md):
 *   - No claim about ChatGPT's features, models, limits or prices. Every row
 *     on the chat side is about the workflow (who wrote the question, what
 *     the answer is checked against), true of any chat assistant.
 *   - No claim about how often a chat assistant is wrong. The five example
 *     queries are OUR trap pages' wrong queries (src/data/sql-patterns.js,
 *     run against the dataset by tests/sql-patterns.test.js); the page never
 *     says an assistant wrote them.
 *   - Our own numbers come from the bank, the price table and the free-tier
 *     constants at build time.
 *
 * Writes src/vs-chatgpt.html. Run: node scripts/build-vs-chatgpt.mjs
 * (part of `npm run build`; tests/vs-chatgpt.test.js checks freshness).
 */

import fs from 'node:fs';
import path from 'node:path';
import { sqlQuestFacts, CSS } from './build-alternatives-pages.mjs';
import { SQL_PATTERNS } from '../src/data/sql-patterns.js';
import { PRICE_TABLE } from '../src/utils/regional-price.js';
import { FREE_SOLVE_QUOTA } from '../src/utils/display-count.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = 'https://sqlquest.app';
export const SLUG = 'vs-chatgpt';
export const PUBLISHED = '2026-10-03';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const TITLE = 'ChatGPT for SQL Interview Prep vs SQLQuest.app (2026)';
export const DESCRIPTION = 'ChatGPT explains SQL well. It cannot check your query against an answer key, track your weakest skill or time you like a screen. A fair comparison, and how to use both.';

export function pageModel() {
  const sq = sqlQuestFacts();
  const price = PRICE_TABLE.default;
  const rows = [
    ['Explain a concept or an error message', 'Yes, on any topic you ask about. This is where it is strongest.', 'Yes: the lessons, and the tutor on every challenge.'],
    ['Write a query for a task you describe', 'Yes, at once.', 'On request. The tutor first names what is wrong, then the clause, then the full query, because writing it yourself is what the interview tests.'],
    ['A question with a checked answer', 'Only if you bring one. The question and the check come from the same place.', `${sq.bank} questions, each with an expected result your query is compared against.`],
    ['Say why your result is wrong', 'It reviews the query text it is shown.', 'It compares your rows to the expected rows: missing rows, extra rows, the right shape with wrong values side by side.'],
    ['Know your weakest skill across weeks', 'It has no record of graded attempts, because nothing was graded.', 'A Skillmap across nine SQL skills, rebuilt from every attempt; the next question comes from the weakest.'],
    ['Practise under a screen’s clock', 'You would have to set the timer and the rules yourself.', 'Timed, scored mocks: a free general mock, and Pro screens built to the formats candidates report.'],
    ['Cost', 'Many people already use one.', `${FREE_SOLVE_QUOTA} free challenge solves with no card; Pro $${price.monthly}/month or $${price.annual}/year.`],
  ];
  const traps = SQL_PATTERNS.map(p => ({ slug: p.slug, short: p.short, wrong: p.wrong.says, right: p.right }));
  const faq = [
    ['Can I prepare for a SQL interview with ChatGPT alone?', 'You can learn a lot from it: concepts, syntax, how a window function works, why an error message appeared. What it cannot give you on its own is a question whose answer was fixed before you wrote your query, so a query that runs and returns a plausible wrong number can go unnoticed. Practise on questions with a checked answer, and use a chat assistant to understand the ones you get wrong.'],
    ['SQL Quest also has an AI tutor. What is the difference?', 'The tutor (Claude) does not grade anything itself. Your query is first run against the dataset and compared to the expected result, and the tutor starts from that diagnosis: which rows are missing, which values differ, which skill the miss belongs to. It also climbs a ladder instead of handing over the query: what is wrong, then which clause, then the full query if you ask for it.'],
    ['Will ChatGPT write wrong SQL?', 'Any author can, human or AI, and the dangerous mistakes are the ones that raise no error. The five examples on this page all run cleanly and return a believable number. A reviewer reading the query text can miss them; comparing the result with a known answer does not.'],
    ['Does SQL Quest support PostgreSQL, BigQuery or Snowflake?', 'No. Queries run in SQLite in your browser. Most interview-style questions use the same SELECT, JOIN, GROUP BY and window function syntax, but for dialect-specific functions a chat assistant or the database’s own documentation is the better source.'],
    ['How much does SQL Quest cost?', `${FREE_SOLVE_QUOTA} free challenge solves with no card, plus the lessons, the daily challenge, the Coach and the Skillmap. Pro is $${PRICE_TABLE.default.annual} a year or $${PRICE_TABLE.default.monthly} a month and opens all ${sq.bank} questions and the timed mock bank.`],
    ['Who wrote this comparison?', 'The person who builds SQL Quest. That is why the page starts with what a chat assistant does better, and why it makes no claim about ChatGPT’s features, limits or prices, which change often.'],
  ];
  return { sq, rows, traps, faq };
}

export function renderVsChatgpt() {
  const { rows, traps, faq } = pageModel();
  const url = `${SITE}/${SLUG}/`;
  const h1 = 'SQL Quest vs ChatGPT for SQL interview prep';
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: h1, description: DESCRIPTION, url, datePublished: PUBLISHED, dateModified: PUBLISHED, author: { '@type': 'Person', name: 'Göktuğ', jobTitle: 'Founder, SQL Quest' }, publisher: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${SITE}/sql-practice-comparison/` },
      { '@type': 'ListItem', position: 3, name: 'SQL Quest vs ChatGPT', item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GENERATED by scripts/build-vs-chatgpt.mjs — do not edit. Rules: docs/reads/ai-chat-comparison-2026-10-03.md -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(TITLE)}</title>
  <meta name="description" content="${esc(DESCRIPTION)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="SQLQuest.app">
  <meta property="og:title" content="${esc(TITLE)}">
  <meta property="og:description" content="${esc(DESCRIPTION)}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
  <script defer src="/_vercel/insights/script.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@600;700;800&display=swap" rel="stylesheet">
  <style>${CSS}
table.ai{min-width:680px}table.ai td:first-child{white-space:normal;width:24%}table.ai td:last-child{color:#cbd5e1}
code{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.92em;color:#e2e8f0}
ol.steps{margin:10px 0 0 20px;color:#94a3b8;font-size:16px}ol.steps li{margin:8px 0}</style>
</head>
<body>
<nav class="nav"><div class="ni"><a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:#e2e8f0;"><span style="width:32px;height:32px;border-radius:9px;background:#7c3aed;display:inline-flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span><span class="fd" style="font-weight:800;font-size:18px;">SQL Quest</span></a><a href="/sql-practice-comparison/" style="font-size:14px;">All comparisons</a></div></nav>
<main class="wrap">
  <p class="crumb"><a href="/">SQL Quest</a> › <a href="/sql-practice-comparison/">Comparisons</a> › SQL Quest vs ChatGPT</p>
  <h1 class="fd">${esc(h1)}</h1>
  <p class="lede">Many people now prepare for a SQL interview with a chat assistant open beside them, and they should: it explains SQL well and answers at once. What it cannot give you is the thing the interview grades, a query you wrote yourself, checked against an answer that was fixed before you started, under the clock.</p>
  <p class="disc"><strong>Who wrote this:</strong> the person who builds SQL Quest. This page makes no claim about ChatGPT’s features, models, limits or prices, which change often. Every row on the chat side is about how the practice works, and is true of any chat assistant.</p>

  <h2 class="fd">What a chat assistant does better</h2>
  <ul style="margin:8px 0 0 20px;color:#94a3b8;font-size:16px;">
    <li>It answers any question, in any dialect: PostgreSQL, BigQuery, Snowflake, SQL Server. SQL Quest runs SQLite only.</li>
    <li>It can explain a query from your own work, at your own company, which no practice site has seen.</li>
    <li>It is already open on most people’s laptops, and its range goes far beyond SQL.</li>
  </ul>

  <h2 class="fd">What you need on the day, side by side</h2>
  <div class="tw"><table class="ai">
    <thead><tr><th>What the interview needs</th><th>A chat assistant</th><th>SQL Quest</th></tr></thead>
    <tbody>${rows.map(([need, chat, ours]) => `<tr><td>${esc(need)}</td><td>${esc(chat)}</td><td>${esc(ours)}</td></tr>`).join('')}</tbody>
  </table></div>

  <h2 class="fd" id="queries-that-run">Five queries that run and return the wrong number</h2>
  <p>The mistakes that cost an interview are the ones without an error. Each query below runs cleanly on the same card-transactions dataset and returns a believable answer. Reading the query text, a reviewer, human or AI, can miss the problem. Comparing the result with a known answer does not.</p>
  <div class="tw" style="margin-top:14px;"><table class="ai">
    <thead><tr><th>The trap</th><th>What the query returns</th><th>The right answer</th></tr></thead>
    <tbody>${traps.map(t => `<tr><td><a href="/${t.slug}/">${esc(t.short)}</a></td><td>${esc(t.wrong)}</td><td>${esc(t.right)}</td></tr>`).join('')}</tbody>
  </table></div>
  <p style="font-size:13px;margin-top:8px;">Each trap has its own page with the query, the reason and the fix. The queries are ours, written to show the trap; this page does not say an assistant wrote them.</p>

  <h2 class="fd">How to use both</h2>
  <ol class="steps">
    <li><strong style="color:#e2e8f0;">Write the query yourself first,</strong> on a question with a fixed answer, ideally timed. That is the skill being tested.</li>
    <li><strong style="color:#e2e8f0;">Run it against the expected result.</strong> A wrong answer you can see beats a right-looking one you cannot check.</li>
    <li><strong style="color:#e2e8f0;">When it is wrong, ask about the gap, not for the query.</strong> &ldquo;Why does my LEFT JOIN drop the merchants with no chargebacks?&rdquo; teaches you something; &ldquo;write this for me&rdquo; does not. Any tutor works here, ours or a chat assistant.</li>
    <li><strong style="color:#e2e8f0;">Come back to the skill you missed a few days later,</strong> on a new question. That is what the Skillmap schedules for you.</li>
  </ol>

  <div class="tool" style="margin-top:30px;text-align:center;">
    <p class="fd" style="font-size:20px;font-weight:800;color:#e2e8f0;margin-bottom:6px;">Find the skill to fix first</p>
    <p style="margin-bottom:14px;">Ten questions, no signup: a Skillmap across joins, window functions, aggregation and the rest, with a checked answer for every question.</p>
    <a class="btn" href="/sql-interview-readiness-test/" data-track="cta_vs_chatgpt_readiness">Check my interview readiness</a>
    <p style="margin-top:12px;font-size:14px;">Or <a href="/app/?src=vs_chatgpt" data-track="cta_vs_chatgpt_app">open a graded challenge in the app</a>.</p>
  </div>

  <section class="faq">
    <h2 class="fd">Questions</h2>
${faq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}
  </section>

  <h2 class="fd">Related</h2>
  <div class="rel">
    <a href="/sql-for-the-ai-era/">SQL for the AI era</a>
    <a href="/sql-query-checker/">Free SQL query checker</a>
    <a href="/datalemur-alternatives/">DataLemur alternatives</a>
    <a href="/vs-leetcode-sql/">SQL Quest vs LeetCode SQL</a>
    <a href="/best-sql-practice-sites/">Best SQL practice sites</a>
  </div>
</main>
<footer class="ft">SQL Quest — personalized SQL interview practice · <a href="/sql-practice-comparison/">All comparisons</a> · <a href="/questions/">SQL interview questions</a> · <a href="/privacy/">Privacy</a></footer>
</body>
</html>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.writeFileSync(path.join(ROOT, 'src', `${SLUG}.html`), renderVsChatgpt());
  console.log(`[vs-chatgpt] src/${SLUG}.html`);
}
