#!/usr/bin/env node
/**
 * Two generated topic pages — /challenges/ranking-functions/ and
 * /challenges/advanced/ — plus their cards on the /challenges/ hub, and a
 * question-page link on every topic-page card (founder's SEO plan 2026-09-13,
 * P1.7 topic pages and P1.9 internal linking).
 *
 * The nine hand-written topic pages are bound to the bank by
 * tests/site-counts.test.js (TOPIC_PAGES). These two are generated from the
 * same kind of predicate, which the test imports from here as its spec
 * (EXTRA_TOPIC_SPECS) and then checks the written page against exactly as it
 * checks the others: head counts, section headings, card set and order, and
 * every number in the prose.
 *
 * Writes src/challenges/<slug>.html (build-static-pages.js publishes them and
 * injects track.js) and rewrites the hub cards between markers. Idempotent.
 *
 * Run: node scripts/build-topic-extra.mjs   (then npm run build)
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadQuestionBank, questionSlugs } from './question-slugs.mjs';
import { isFreePreview } from '../src/utils/challenge-order.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = 'https://sqlquest.app';

const sol = c => String(c.solution || '');
export const RANKING_FN = /\b(?:ROW_NUMBER|DENSE_RANK|RANK|NTILE|PERCENT_RANK)\s*\(/i;
const WINDOW_OVER = /\bOVER\s*\(/i;
const cteCount = c => (/\bWITH\b/i.test(sol(c)) ? (sol(c).match(/\bAS\s*\(/gi) || []).length : 0);

export const EXTRA_TOPIC_SPECS = {
  'ranking-functions': {
    population: c => RANKING_FN.test(sol(c)),
    sections: {
      'row-number': c => /\bROW_NUMBER\s*\(/i.test(sol(c)),
      'rank-dense-rank': c => /\b(?:RANK|DENSE_RANK)\s*\(/i.test(sol(c)),
      'top-n-per-group': c => /\b(?:ROW_NUMBER|DENSE_RANK|RANK)\s*\(\s*\)\s*OVER\s*\(\s*PARTITION\s+BY\b/i.test(sol(c)),
    },
  },
  advanced: {
    population: c => c.difficulty === 'Hard',
    sections: {
      'window-hard': c => WINDOW_OVER.test(sol(c)),
      'multi-step-ctes': c => cteCount(c) >= 2,
      'joins-and-subqueries': c => /\bJOIN\b/i.test(sol(c)) || /(?<!\bAS\s*)\(\s*SELECT\b/i.test(sol(c)),
    },
  },
};

const RANK = { Easy: 0, Medium: 1, Hard: 2 };
const playableFree = c => c.difficulty !== 'Hard' || isFreePreview(c);
const cardRank = c => RANK[c.difficulty] * 2 + (c.difficulty === 'Hard' && !isFreePreview(c) ? 1 : 0);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function tallyOf(list) {
  return {
    count: list.length,
    free: list.filter(playableFree).length,
    Easy: list.filter(c => c.difficulty === 'Easy').length,
    Medium: list.filter(c => c.difficulty === 'Medium').length,
    Hard: list.filter(c => c.difficulty === 'Hard').length,
    previews: list.filter(isFreePreview).length,
  };
}

const COPY = {
  'ranking-functions': {
    name: 'SQL Ranking Functions Practice',
    short: 'Ranking functions',
    tail: 'ROW_NUMBER, RANK, DENSE_RANK',
    description: t => `${t.count} SQL ranking function challenges, ${t.free} free: ROW_NUMBER for one row per group, RANK and DENSE_RANK for ties, and the top-N-per-group query interviews ask most. Runs in your browser, no signup.`,
    lede: t => `"The top three products in each category", "the latest order per customer", "the second-highest salary": most ranking questions are one of these, and every one is a ranking function over a <code>PARTITION BY</code>, then a filter on the rank. These ${t.count} challenges are every one in the bank whose reference solution ranks rows.`,
    sections: {
      'row-number': ['ROW_NUMBER — exactly one row per position', 'Numbers rows 1, 2, 3 with no ties, even when two rows are equal. That is what you want for "the latest order per customer": <code>ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY ordered_at DESC)</code>, then keep rank 1. Add a tie-breaker to the <code>ORDER BY</code>, or the row you keep is arbitrary.'],
      'rank-dense-rank': ['RANK and DENSE_RANK — when ties matter', 'Two salaries of 90,000 are both second. <code>RANK</code> then skips to fourth; <code>DENSE_RANK</code> goes to third. "The second-highest salary" is a <code>DENSE_RANK</code> question, and saying why out loud is half the interview answer.'],
      'top-n-per-group': ['Top-N per group — rank inside a partition, then filter', 'The ranking runs in a CTE or a subquery, because a window function cannot sit in <code>WHERE</code>. Then the outer query keeps <code>rn &lt;= N</code>. This is the shape behind "top sellers by region" and "best month per product".'],
    },
    why: 'Once rows are ranked, the next questions are about neighbours and running sums: <a href="/challenges/window-functions/">window functions</a> cover <code>LAG</code>, <code>LEAD</code> and frames. The filter-after-ranking step is a <a href="/challenges/cte/">CTE</a> or a <a href="/challenges/subqueries/">subquery</a>, and the rows being ranked usually come out of a <a href="/challenges/joins/">join</a>.',
    faq: [
      ['What is the difference between RANK, DENSE_RANK and ROW_NUMBER?', 'ROW_NUMBER gives every row a distinct number, ties included. RANK gives tied rows the same number and then skips (1, 2, 2, 4). DENSE_RANK gives tied rows the same number without skipping (1, 2, 2, 3).'],
      ['How do I get the top N rows per group in SQL?', 'Rank inside the group with ROW_NUMBER() or DENSE_RANK() OVER (PARTITION BY group ORDER BY metric DESC) in a CTE or subquery, then filter the rank in the outer query. A window function cannot be used directly in WHERE.'],
    ],
  },
  advanced: {
    name: 'Advanced SQL Interview Questions',
    short: 'Advanced SQL interview questions',
    tail: 'Hard Window, CTE and Join Problems',
    description: t => `${t.count} Hard SQL interview questions, ${t.free} free to open: multi-step CTEs, window functions over partitions, multi-table joins and subqueries, on real tables. Runs in your browser, no signup.`,
    lede: t => `These are the ${t.count} Hard challenges in the bank: the questions a senior analyst or data scientist screen ends on. Most of them combine two or three ideas in one query, so the sections below overlap on purpose. ${t.previews ? `The ${t.previews} free previews are listed first inside each section.` : ''}`,
    sections: {
      'window-hard': ['Hard window function questions', 'Ranking inside partitions, running totals with explicit frames, gaps and islands, period-over-period change with <code>LAG</code>. The hard part is rarely the function. It is choosing the partition and the order that make the numbers mean what the question asked.'],
      'multi-step-ctes': ['Multi-step CTE questions', 'Two or more named steps, where a later one reads an earlier one: build the per-user table, then the per-cohort table, then the ratio. Interviewers watch whether each step has one job.'],
      'joins-and-subqueries': ['Hard join and subquery questions', 'Several tables at different grains, a subquery that filters or feeds a comparison, and the anti-join behind "customers who never ordered": <code>NOT EXISTS</code> or <code>LEFT JOIN … IS NULL</code>. The trap is the fan-out, where a join multiplies rows before the aggregate counts them.'],
    },
    why: 'If a Hard question stalls, the fix is almost always one level down: the <a href="/challenges/ranking-functions/">ranking functions</a> page and the <a href="/challenges/window-functions/">window functions</a> on-ramp, <a href="/challenges/cte/">CTE practice</a>, or <a href="/challenges/joins/">joins</a>. The <a href="/sql-interview-readiness-test/">readiness test</a> finds which one in ten questions.',
    faq: [
      ['What counts as an advanced SQL interview question?', 'One that needs more than one idea in the same query, typically a window function over a partition, a chain of CTEs, or an anti-join, and where the grain of the result has to be reasoned about rather than read off the question.'],
      ['Are these the actual questions companies ask?', 'No. They are SQL Quest practice problems written around the patterns reported for data analyst, data scientist and analytics engineer screens. No company has published them.'],
    ],
  },
};

const CSS = fs.readFileSync(path.join(ROOT, 'src/challenges/string-functions.html'), 'utf8').match(/<style>[\s\S]*?<\/style>/)[0];

function card(c, slug, qslugs) {
  const label = isFreePreview(c) ? 'Free preview' : playableFree(c) ? 'Free' : 'Pro';
  const tags = [...new Set([...(c.skills || []), c.category].filter(Boolean))].slice(0, 3);
  return `      <div class="q-card">
        <span class="tag ${c.difficulty.toLowerCase()}">${c.difficulty}</span> <span class="tag ${playableFree(c) ? 'free' : 'pro'}">${label}</span>
        <h3><a href="/questions/${qslugs.get(c.id)}/" style="color:inherit;">${esc(c.title)}</a></h3>
        <p class="concepts">Uses: ${tags.map(t => `<code>${esc(t)}</code>`).join(' ')}</p>
        <a href="/app/?challenge=${c.id}&amp;src=challenges-${slug}" class="btn-practice">Try it →</a>
      </div>`;
}

export function renderTopic(slug, bank, qslugs) {
  const spec = EXTRA_TOPIC_SPECS[slug];
  const copy = COPY[slug];
  const pop = bank.filter(spec.population).sort((a, b) => cardRank(a) - cardRank(b) || a.id - b.id);
  const t = tallyOf(pop);
  const url = `${SITE}/challenges/${slug}/`;
  const title = `${copy.name} — ${t.count} Challenges (${t.free} Free): ${copy.tail}`;
  const desc = copy.description(t);
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: copy.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: copy.name, description: desc, url },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Practice by topic', item: `${SITE}/challenges/` },
      { '@type': 'ListItem', position: 3, name: copy.name, item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'LearningResource', name: copy.name, url, learningResourceType: 'Practice problem set', inLanguage: 'en', provider: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` } },
    faqLd,
  ];
  const sections = Object.entries(spec.sections).map(([id, pred]) => {
    const list = pop.filter(pred);
    const st = tallyOf(list);
    const [h, p] = copy.sections[id];
    return `  <section class="sec" id="${id}">
    <h2 class="fd">${h}: ${st.count} challenges (${st.free > 0 ? `${st.free} free` : 'all Pro'})</h2>
    <p>${p}</p>
    <p class="stamp">Counted from the challenge bank, September 2026. Easy first, then Medium, then Hard.</p>
    <div class="q-grid">
${list.map(c => card(c, slug, qslugs)).join('\n')}
    </div>
  </section>`;
  }).join('\n\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <!-- GENERATED by scripts/build-topic-extra.mjs (SEO plan 2026-09-13, P1.7). Do not edit: every count comes from EXTRA_TOPIC_SPECS over the live bank, and tests/site-counts.test.js checks the page against the same spec. -->
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
  <script defer src="/_vercel/insights/script.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  ${CSS}
</head>
<body>
<nav class="nav"><div class="ni">
  <a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;">
    <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#db2777);display:flex;align-items:center;justify-content:center;font-size:16px;">⚡</div>
    <span class="fd" style="font-size:18px;font-weight:800;">SQL Quest</span>
  </a>
  <a href="/app/?src=challenges-${slug}" class="bp">Start Free →</a>
</div></nav>
<div class="wrap">
  <p class="breadcrumb"><a href="/">SQL Quest</a> › <a href="/challenges/">Practice by topic</a> › ${esc(copy.short)}</p>
  <h1 class="fd">${esc(copy.name)} — <span style="background:linear-gradient(135deg,#c084fc,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${t.count} Challenges (${t.free} Free)</span></h1>
  <p class="lede">${copy.lede(t)}</p>
  <a href="/sql-interview-readiness-test/" class="cta" data-track="cta_topic_readiness">Find your weakest skill first →</a>

${sections}

  <section class="sec" id="why">
    <h2 class="fd">Where this shows up next</h2>
    <p>${copy.why}</p>
  </section>

  <section class="sec" id="faq">
    <h2 class="fd">Questions</h2>
${copy.faq.map(([q, a]) => `    <h3 style="font-size:16px;font-weight:700;color:#e2e8f0;margin:18px auto 6px;max-width:640px;">${esc(q)}</h3>\n    <p style="margin-bottom:10px;">${esc(a)}</p>`).join('\n')}
  </section>
  <div class="related">
    <a href="/challenges/">All Practice Topics →</a>
    <a href="/questions/">All SQL Interview Questions →</a>
    <a href="/challenges/window-functions/">Window Functions →</a>
    <a href="/challenges/cte/">CTE Challenges →</a>
    <a href="/challenges/joins/">JOIN Challenges →</a>
    <a href="/sql-interview-prep/">Company Interview Guides →</a>
  </div>
</div>
<footer class="ft"><p>⚡ <strong>SQL Quest</strong> — personalized SQL interview practice. <a href="/">Home</a> · <a href="/sql-exercises/">SQL Practice Questions</a> · <a href="/best-sql-practice-sites/">Best SQL Practice Sites</a></p><p style="margin-top:8px;font-size:11px;">© 2026 SQL Quest</p></footer>
</body>
</html>
`;
}

const HUB_CARDS = {
  'ranking-functions': ['Ranking functions', 'ROW_NUMBER, RANK and DENSE_RANK on their own page: one row per group, ties handled on purpose, and the top-N-per-group query that most ranking questions turn out to be.', 'Ranking function challenges →'],
  advanced: ['Advanced SQL interview questions', 'Every Hard challenge in the bank, sorted into Hard window questions, multi-step CTEs, and multi-table joins with subqueries. The free previews come first.', 'Advanced questions →'],
};

export function hubBlock(bank) {
  return `    <!-- topic-extra:start -->\n${Object.keys(EXTRA_TOPIC_SPECS).map(slug => {
    const t = tallyOf(bank.filter(EXTRA_TOPIC_SPECS[slug].population));
    const [title, d, go] = HUB_CARDS[slug];
    return `    <a class="t-card" href="/challenges/${slug}/" data-topic="${slug}">
      <p class="t-title">${title}</p>
      <p class="t-count"><strong><span class="t-n">${t.count}</span> challenges</strong> · <span class="t-f">${t.free}</span> free · <span class="t-e">${t.Easy}</span> Easy</p>
      <p class="t-desc">${d}</p>
      <p class="t-go">${go}</p>
    </a>`;
  }).join('\n')}\n    <!-- topic-extra:end -->`;
}

// P1.9: the card title on every topic page links its question page. The
// ?challenge= link stays the card's one app link (the guard counts it).
export function linkCardTitles(html, qslugs) {
  return html.replace(/<div class="q-card">([\s\S]*?)<\/div>/g, (whole, body) => {
    const id = (body.match(/\?challenge=(\d+)/) || [])[1];
    if (!id || /<h3><a /.test(body) || !qslugs.get(Number(id))) return whole;
    return whole.replace(/<h3>([\s\S]*?)<\/h3>/, (_, t) => `<h3><a href="/questions/${qslugs.get(Number(id))}/" style="color:inherit;">${t}</a></h3>`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bank } = loadQuestionBank();
  const qslugs = questionSlugs(bank);
  for (const slug of Object.keys(EXTRA_TOPIC_SPECS)) {
    fs.writeFileSync(path.join(ROOT, 'src/challenges', `${slug}.html`), renderTopic(slug, bank, qslugs));
  }
  const hubFile = path.join(ROOT, 'src/challenges/index.html');
  let hub = fs.readFileSync(hubFile, 'utf8');
  hub = hub.replace(/\n?\s*<!-- topic-extra:start -->[\s\S]*?<!-- topic-extra:end -->/, '');
  hub = hub.replace(/(<a class="t-card" href="\/challenges\/date-functions\/"[\s\S]*?<\/a>)/, `$1\n${hubBlock(bank)}`);
  fs.writeFileSync(hubFile, hub);
  let linked = 0;
  for (const f of fs.readdirSync(path.join(ROOT, 'src/challenges')).filter(x => x.endsWith('.html') && x !== 'index.html')) {
    const p = path.join(ROOT, 'src/challenges', f);
    const before = fs.readFileSync(p, 'utf8');
    const after = linkCardTitles(before, qslugs);
    if (after !== before) { fs.writeFileSync(p, after); linked++; }
  }
  console.log(`[topic-extra] ${Object.keys(EXTRA_TOPIC_SPECS).join(', ')} written · hub cards · question links on ${linked} topic pages`);
}
