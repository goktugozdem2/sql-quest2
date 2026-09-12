#!/usr/bin/env node
/**
 * Free SQL tools — /sql-query-checker/, /sql-query-explainer/,
 * /sql-query-optimizer/ and the /sql-tools/ hub (founder's SEO plan
 * 2026-09-13, P2.15: link-magnet tools; the readiness test and /sql-quiz/
 * are the other two on the hub).
 *
 * The analysis is src/utils/sql-tools.js, inlined into each page with its
 * `export` keywords stripped, so the page and the tests run the same code.
 * Nothing is sent anywhere: the query stays in the browser. The only event
 * is `tool_used {tool, found, kinds}` — never the query text.
 *
 * Writes src/<slug>.html (build-static-pages.js publishes them and injects
 * track.js). Idempotent; tests/sql-tools.test.js checks freshness.
 *
 * Run: node scripts/build-sql-tools.mjs   (part of `npm run build`)
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = 'https://sqlquest.app';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function engineSource() {
  return fs.readFileSync(path.join(ROOT, 'src/utils/sql-tools.js'), 'utf8')
    .replace(/^export\s+(?=(?:async\s+)?function|const|let)/gm, '')
    .replace(/<\/script/gi, '<\\/script');
}

const EXAMPLES = [
  ['Top 3 per group', `WITH ranked AS (
  SELECT category, merchant_id, SUM(amount) AS spend,
         ROW_NUMBER() OVER (PARTITION BY category ORDER BY SUM(amount) DESC) AS rn
  FROM transactions
  GROUP BY category, merchant_id
)
SELECT category, merchant_id, spend
FROM ranked
WHERE rn <= 3
ORDER BY category, rn;`],
  ['Customers who never ordered', `SELECT name
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);`],
  ['Paid orders per customer', `SELECT c.name, COUNT(o.id) AS paid_orders
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'paid'
GROUP BY c.name;`],
  ['Customer spend in 2024', `SELECT DISTINCT c.id,
       (SELECT SUM(o.total) FROM orders o WHERE o.customer_id = c.id) AS spend
FROM customers c
JOIN orders o2 ON o2.customer_id = c.id
WHERE YEAR(c.created_at) = 2024
  AND c.email LIKE '%gmail.com';`],
  ['Churn rate by plan', `SELECT plan, name, COUNT(CASE WHEN churned = 1 THEN 1 END) / COUNT(*) AS churn_rate
FROM users
GROUP BY plan;`],
];

const RULES = {
  checker: [
    ['NOT IN over a subquery that can return NULL', 'If the subquery returns one NULL, NOT IN is never true and the query returns no rows. NOT EXISTS does not have this trap.'],
    ['= NULL instead of IS NULL', 'A comparison with NULL is unknown, not true, so the filter silently drops every row.'],
    ['A window function in WHERE', 'WHERE runs before ROW_NUMBER, RANK and the other window functions exist. Rank in a CTE, filter outside it.'],
    ['An aggregate in WHERE', 'COUNT and SUM belong in HAVING, which runs after GROUP BY.'],
    ['A column that is neither grouped nor aggregated', 'PostgreSQL rejects it. MySQL and SQLite quietly return an arbitrary row from each group, which is worse.'],
    ['A WHERE filter on the right side of a LEFT JOIN', 'Unmatched rows carry NULL there, fail the filter and vanish: the LEFT JOIN has become an INNER JOIN.'],
    ['Tables listed with commas and no join condition', 'That is a cross join — every row paired with every row.'],
    ['Integer division in a rate', 'COUNT / COUNT truncates in PostgreSQL and SQLite, so a 40% rate comes back as 0.'],
    ['LIMIT without ORDER BY', 'Which rows come back is not defined and can change between runs.'],
    ['Unbalanced parentheses, unclosed quotes, stray commas', 'The syntax slips that stop a query from running at all.'],
  ],
  optimizer: [
    ['A function around a column in WHERE', 'YEAR(created_at) = 2024 cannot use an index on created_at. A date range can.'],
    ["LIKE with a leading '%'", 'No ordinary index helps a pattern that can start anywhere.'],
    ['A correlated subquery in SELECT', 'It runs once per outer row. A join to a pre-aggregated CTE, or a window function, runs once.'],
    ['DISTINCT on top of a JOIN', 'Usually a fan-out being cleaned up after the fact. Fix the grain instead.'],
    ['UNION where UNION ALL would do', 'UNION removes duplicates, which costs a sort or a hash over the whole result.'],
    ['NOT IN (SELECT …)', 'NOT EXISTS is usually planned better, and it is correct when NULLs appear.'],
    ['(SELECT COUNT(*) …) > 0', 'EXISTS stops at the first match; COUNT reads them all.'],
    ['The same subquery written twice', 'Name it once in a WITH clause.'],
    ['A row filter in HAVING', 'A condition that uses no aggregate can run in WHERE, before grouping.'],
    ['SELECT *', 'Reads columns you do not use and breaks when the table changes.'],
  ],
  explainer: [
    ['The order the database runs it', 'FROM and joins, then WHERE, GROUP BY, HAVING, SELECT, ORDER BY, LIMIT — not the order it is written.'],
    ['Each CTE on its own', 'Every WITH step is explained separately, top to bottom, the way the main query reads them.'],
    ['Joins and what they keep', 'Which rows an INNER, LEFT, RIGHT, FULL or CROSS join keeps, and the fan-out warning when a join can repeat rows.'],
    ['Window functions', 'What OVER, PARTITION BY and the ORDER BY inside it do, and how ROW_NUMBER, RANK and DENSE_RANK differ on ties.'],
    ['CASE, COALESCE, subqueries', 'Conditional values, NULL defaults, and when a subquery runs once per row.'],
  ],
};

const TOOLS = {
  'sql-query-checker': {
    kind: 'checker',
    name: 'SQL Query Checker',
    title: 'SQL Query Checker — Find the Mistakes That Return Wrong Rows (Free)',
    h1: 'SQL query checker',
    sub: 'Paste a query. It points out the mistakes that return the wrong rows or fail to run — NOT IN with NULLs, a window function in WHERE, a LEFT JOIN that quietly became an INNER JOIN — and says how to fix each one.',
    description: 'Free SQL query checker: paste a query and see the mistakes that return wrong rows — NOT IN with NULLs, = NULL, window functions in WHERE, ungrouped columns, LEFT JOIN filters. Runs in your browser.',
    button: 'Check query',
    faq: [
      ['Does the SQL query checker run my query?', 'No. It reads the text of the query in your browser and never sends it anywhere. That means it catches the mistakes visible in the SQL itself, not ones that depend on your data — to test a query against real tables, solve it in the SQL Quest editor.'],
      ['Which SQL dialects does it support?', 'The checks are about standard SQL behaviour that PostgreSQL, MySQL, SQLite, SQL Server, BigQuery and Snowflake share: how NULL compares, when WHERE runs, what GROUP BY requires. Where a dialect differs, the message says so.'],
      ['Why is NOT IN with a subquery flagged?', 'If the subquery returns even one NULL, NOT IN evaluates to unknown for every row and the query returns nothing. NOT EXISTS gives the answer you meant. It is a classic trap in SQL interview questions about customers who never ordered.'],
    ],
  },
  'sql-query-explainer': {
    kind: 'explainer',
    name: 'SQL Query Explainer',
    title: 'SQL Query Explainer — Explain a SQL Query Step by Step (Free)',
    h1: 'SQL query explainer',
    sub: 'Paste a query and read it clause by clause, in the order the database actually runs it — CTEs, joins, grouping, window functions and all.',
    description: 'Free SQL query explainer: paste any SELECT and get a plain-English, step-by-step explanation in execution order — CTEs, JOINs, GROUP BY, HAVING, window functions, CASE. Runs in your browser.',
    button: 'Explain query',
    faq: [
      ['What order does SQL run a query in?', 'FROM and the joins first, then WHERE, GROUP BY, HAVING, then SELECT (including window functions), DISTINCT, ORDER BY and LIMIT. That is why a SELECT alias cannot be used in WHERE, and why a window function cannot be filtered in the same query that computes it.'],
      ['Does the explainer send my query to an AI?', 'No. The explanation is produced in your browser from the structure of the query, so it works offline and nothing leaves the page.'],
      ['Can it explain CTEs and window functions?', 'Yes. Each WITH step is explained on its own, and window functions get a note on what OVER, PARTITION BY and ORDER BY do, including how ROW_NUMBER, RANK and DENSE_RANK treat ties.'],
    ],
  },
  'sql-query-optimizer': {
    kind: 'optimizer',
    name: 'SQL Query Optimizer',
    title: 'SQL Query Optimizer — Free Suggestions to Make a Query Faster',
    h1: 'SQL query optimizer',
    sub: 'Paste a query. It points out the patterns that make SQL slow — functions on indexed columns, leading wildcards, correlated subqueries, DISTINCT hiding a fan-out — and shows the faster shape. None of the suggestions change the result.',
    description: 'Free SQL query optimizer: paste a query and get suggestions to make it faster — non-sargable WHERE, LIKE with a leading wildcard, correlated subqueries, DISTINCT over JOIN, UNION vs UNION ALL. Runs in your browser.',
    button: 'Optimize query',
    faq: [
      ['Does this optimizer read my execution plan?', 'No. It reads the query text and flags patterns that are slow on almost every database. For a specific table, run EXPLAIN (or EXPLAIN ANALYZE) on your own database — these suggestions tell you what to look for in it.'],
      ['What does sargable mean?', 'A condition the database can answer with an index. created_at >= \'2024-01-01\' is sargable; YEAR(created_at) = 2024 is not, because the function has to be computed for every row first.'],
      ['Is UNION slower than UNION ALL?', 'Usually, yes. UNION removes duplicate rows, which needs a sort or hash over the combined result. If the two halves cannot overlap, UNION ALL returns the same rows with less work.'],
    ],
  },
};

const CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#06060f;color:#e2e8f0;font-family:'DM Sans',sans-serif;line-height:1.6}
a{color:#c084fc;text-decoration:none}a:hover{text-decoration:underline}.fd{font-family:'Space Grotesk',sans-serif}.fm,code,textarea{font-family:'JetBrains Mono',monospace}
code{font-size:.92em;color:#c084fc}.nav{border-bottom:1px solid rgba(255,255,255,.06)}.ni{max-width:1000px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.wrap{max-width:880px;margin:0 auto;padding:36px 24px 64px}.crumb{font-size:13px;color:#8b98ab;margin-bottom:14px}.crumb a{color:#8b98ab}
h1{font-size:clamp(30px,4.4vw,46px);font-weight:800;line-height:1.12;margin-bottom:12px}h2{font-size:21px;font-weight:800;margin:40px 0 12px}
.sub{font-size:17px;color:#94a3b8;max-width:720px;margin-bottom:22px}
textarea{width:100%;min-height:220px;background:#0b0b1a;color:#e2e8f0;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;resize:vertical}
textarea:focus{outline:2px solid rgba(124,58,237,.5);border-color:transparent}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:12px 0 6px}
.btn{display:inline-flex;align-items:center;gap:8px;border-radius:12px;font-weight:700;text-decoration:none;cursor:pointer;border:0;font-family:inherit}.bp{padding:12px 24px;font-size:15px;background:#FFE34D;color:#0E0F13}
.bo{padding:10px 16px;font-size:13px;color:#c084fc;background:transparent;border:1px solid rgba(124,58,237,.4)}.bp:hover,.bo:hover{text-decoration:none;filter:brightness(1.05)}
select{background:#0b0b1a;color:#cbd5e1;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:9px 12px;font-size:13px;font-family:inherit}
.note{font-size:12px;color:#8b98ab}
.res{margin-top:22px}.item{background:rgba(10,10,25,.6);border:1px solid rgba(255,255,255,.08);border-left:3px solid #7c3aed;border-radius:12px;padding:14px 18px;margin-bottom:10px}
.item.error{border-left-color:#FF6B6B}.item.warning,.item.high{border-left-color:#FFB020}.item.medium{border-left-color:#7CC4FF}.item.low{border-left-color:#8b98ab}
.item h3{font-size:15px;font-weight:700;margin-bottom:4px}.item p{font-size:14px;color:#cbd5e1}.item .fix{color:#94a3b8;margin-top:6px}.item .lk{font-size:13px;margin-top:6px}
.lvl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#8b98ab;margin-right:6px}
.ok{background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:12px;padding:14px 18px;font-size:14px;color:#cbd5e1}
.rules{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}.rules div{background:rgba(10,10,25,.5);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px}
.rules h3{font-size:14px;font-weight:700;margin-bottom:4px}.rules p{font-size:13px;color:#94a3b8}
.box{background:rgba(10,10,25,.6);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px 22px}
.faq h3{font-size:16px;font-weight:700;margin:18px 0 6px}.faq p{font-size:15px;color:#94a3b8}
.tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.tools a{display:block;background:rgba(10,10,25,.5);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px 18px;color:#e2e8f0}
.tools a:hover{border-color:rgba(124,58,237,.35);text-decoration:none}.tools a span{display:block;font-size:13px;color:#94a3b8;margin-top:4px}
.ft{border-top:1px solid rgba(255,255,255,.06);padding:30px 24px;text-align:center;font-size:13px;color:#7f8da1}`;

const OTHER = {
  'sql-interview-readiness-test': ['SQL Interview Readiness Test', 'Ten questions, no signup: a Skillmap and your weakest skill.'],
  'sql-quiz': ['SQL Skill Test', 'A five-minute adaptive quiz that places your SQL level.'],
  'sql-query-explainer': ['SQL Query Explainer', 'Any SELECT, explained clause by clause in execution order.'],
  'sql-query-checker': ['SQL Query Checker', 'The mistakes that return wrong rows, and how to fix them.'],
  'sql-query-optimizer': ['SQL Query Optimizer', 'The patterns that make a query slow, and the faster shape.'],
};

function head({ title, description, url, ld }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GENERATED by scripts/build-sql-tools.mjs — do not edit. -->
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
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
  <script defer src="/_vercel/insights/script.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
<nav class="nav"><div class="ni"><a href="/" class="fd" style="color:#e2e8f0;font-weight:800;font-size:18px;">SQL Quest</a><span style="display:flex;gap:16px;font-size:14px;"><a href="/sql-tools/">Free SQL tools</a><a href="/questions/">Questions</a></span></div></nav>`;
}

const FOOT = `<footer class="ft">SQL Quest — personalized SQL interview practice · <a href="/sql-tools/">Free SQL tools</a> · <a href="/questions/">SQL interview questions</a> · <a href="/challenges/">Practice by topic</a> · <a href="/privacy/">Privacy</a></footer>
</body>
</html>
`;

const breadcrumb = (name, url) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
  { '@type': 'ListItem', position: 2, name: 'Free SQL tools', item: `${SITE}/sql-tools/` },
  ...(name ? [{ '@type': 'ListItem', position: 3, name, item: url }] : []),
] });

export function renderTool(slug) {
  const t = TOOLS[slug];
  const url = `${SITE}/${slug}/`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: t.name, url, description: t.description, applicationCategory: 'DeveloperApplication', operatingSystem: 'Any (runs in the browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, provider: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` } },
    breadcrumb(t.name, url),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: t.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const others = Object.entries(OTHER).filter(([s]) => s !== slug);
  return `${head({ title: t.title, description: t.description, url, ld })}
<main class="wrap">
  <p class="crumb"><a href="/">SQL Quest</a> › <a href="/sql-tools/">Free SQL tools</a> › ${esc(t.name)}</p>
  <h1 class="fd">${esc(t.h1)}</h1>
  <p class="sub">${esc(t.sub)}</p>

  <label for="q" class="note" style="display:block;margin-bottom:6px;">Your SQL query</label>
  <textarea id="q" spellcheck="false" placeholder="SELECT …"></textarea>
  <div class="row">
    <button class="btn bp" id="go" type="button">${esc(t.button)}</button>
    <select id="ex" aria-label="Load an example query"><option value="">Load an example…</option>${EXAMPLES.map(([n], i) => `<option value="${i}">${esc(n)}</option>`).join('')}</select>
    <span class="note">Runs in your browser. Your query is not sent anywhere.</span>
  </div>
  <div class="res" id="out" aria-live="polite"></div>

  <h2 class="fd">What it ${t.kind === 'explainer' ? 'explains' : 'looks for'}</h2>
  <div class="rules">${RULES[t.kind].map(([h, p]) => `<div><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}</div>
  <p class="note" style="margin-top:12px;">It reads the SQL text — it does not connect to a database or see your data. A query can pass every check and still answer the wrong question, which is what a grader against real tables is for.</p>

  <div class="box" style="margin-top:36px;">
    <p class="fd" style="font-size:19px;font-weight:800;margin-bottom:6px;">These are the mistakes interviews are built to catch.</p>
    <p style="font-size:15px;color:#94a3b8;margin-bottom:14px;">SQL Quest grades your query against real tables and tells you which rows are wrong, then builds your practice around the skills you miss. Ten questions find the weakest one.</p>
    <div class="row"><a class="btn bp" href="/sql-interview-readiness-test/" data-track="cta_tool_readiness_${slug}">Check my interview readiness</a><a class="btn bo" href="/app/?src=${slug}" data-track="cta_tool_practice_${slug}">Practice free in the browser</a></div>
  </div>

  <section class="faq">
    <h2 class="fd">Questions</h2>
${t.faq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}
  </section>

  <h2 class="fd">More free SQL tools</h2>
  <div class="tools">${others.map(([s, [n, d]]) => `<a href="/${s}/">${esc(n)}<span>${esc(d)}</span></a>`).join('')}</div>
</main>
<script>
${engineSource()}
(function () {
  var TOOL = ${JSON.stringify(t.kind)};
  var EX = ${JSON.stringify(EXAMPLES.map(e => e[1]))};
  var KEY = 'sqlquest_tool_query';
  var $ = function (id) { return document.getElementById(id); };
  var h = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var code = function (s) { return h(s).replace(/\\b(SELECT|FROM|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|JOIN|LEFT JOIN|NOT IN|NOT EXISTS|EXISTS|IS NULL|IS NOT NULL|UNION ALL|UNION|OVER|PARTITION BY|ROW_NUMBER|DENSE_RANK|RANK|COUNT|SUM|AVG|CASE WHEN|COALESCE|DISTINCT|LIKE|CTE|WITH)\\b/g, '<code>$1</code>'); };
  try { var saved = localStorage.getItem(KEY); if (saved) $('q').value = saved; } catch (e) {}
  if (!$('q').value) $('q').value = EX[TOOL === 'optimizer' ? 3 : TOOL === 'checker' ? 1 : 0];
  $('ex').onchange = function () { if (this.value !== '') { $('q').value = EX[Number(this.value)]; run(); } };
  function learn(l) { return l ? '<p class="lk">Learn it: <a href="' + l[0] + '">' + h(l[1]) + '</a></p>' : ''; }
  function crossLinks() {
    var links = [['checker', '/sql-query-checker/', 'Check it for mistakes'], ['explainer', '/sql-query-explainer/', 'Explain it step by step'], ['optimizer', '/sql-query-optimizer/', 'Optimize it']]
      .filter(function (x) { return x[0] !== TOOL; })
      .map(function (x) { return '<a class="btn bo" href="' + x[1] + '" data-track="tool_cross_' + x[0] + '">' + x[2] + ' →</a>'; });
    return '<div class="row" style="margin-top:14px;">' + links.join('') + '</div>';
  }
  function run() {
    var sql = $('q').value;
    try { localStorage.setItem(KEY, sql.slice(0, 20000)); } catch (e) {}
    var html = '', found = 0, kinds = [];
    if (TOOL === 'explainer') {
      var r = explainQuery(sql);
      found = r.steps.length;
      html += '<p class="sub" style="font-size:15px;margin-bottom:14px;">' + h(r.summary) + '</p>';
      r.steps.forEach(function (s, i) {
        html += '<div class="item"><h3>' + (i + 1) + '. ' + h(s.title) + ' <span class="lvl">' + h(s.clause) + '</span></h3><p>' + code(s.text) + '</p></div>';
        if (s.clause === 'WITH') (r.ctes || []).forEach(function (c) {
          html += '<div class="item" style="margin-left:18px;"><h3><span class="lvl">CTE</span>' + h(c.name) + '</h3>' + c.steps.map(function (x) { return '<p style="margin-top:6px;"><span class="lvl">' + h(x.clause) + '</span>' + code(x.text) + '</p>'; }).join('') + '</div>';
        });
      });
      var issues = checkQuery(sql);
      if (issues.length) html += '<div class="item warning"><h3>The checker also found ' + (issues.length === 1 ? 'one possible mistake' : issues.length + ' possible mistakes') + '</h3><p>' + issues.map(function (x) { return h(x.message); }).join('<br>') + '</p></div>';
    } else {
      var list = TOOL === 'checker' ? checkQuery(sql) : optimizeQuery(sql);
      found = list.length;
      kinds = list.map(function (x) { return x.kind; });
      if (!sql.trim()) html = '<div class="ok">Paste a query above.</div>';
      else if (!list.length) html = '<div class="ok">' + (TOOL === 'checker' ? 'No mistakes found in the text of this query. That does not prove it answers the question — only running it against the data does.' : 'No slow patterns found in the text of this query. For a big table, run EXPLAIN on your database to see the plan.') + '</div>';
      list.forEach(function (x) {
        var lvl = x.severity || x.impact;
        html += '<div class="item ' + h(lvl) + '"><h3><span class="lvl">' + h(TOOL === 'checker' ? lvl : lvl + ' impact') + '</span></h3><p>' + code(x.message) + '</p><p class="fix"><strong style="color:#e2e8f0;">Fix:</strong> ' + code(x.fix) + '</p>' + learn(x.learn) + '</div>';
      });
    }
    $('out').innerHTML = html + crossLinks();
    if (window.sqTrack) window.sqTrack('tool_used', { tool: TOOL, found: found, kinds: kinds.slice(0, 10) });
  }
  $('go').onclick = run;
  $('q').addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run(); });
  run();
})();
</script>
${FOOT}`;
}

export function renderHub() {
  const url = `${SITE}/sql-tools/`;
  const title = 'Free SQL Tools — Query Checker, Explainer, Optimizer and Skill Tests';
  const description = 'Free SQL tools that run in your browser: check a query for mistakes, explain it step by step, find what makes it slow, and test your SQL interview readiness. No signup.';
  const faq = [
    ['Are these SQL tools free?', 'Yes, all five, with no signup. The query tools run entirely in your browser; the readiness test and the skill test need no account either.'],
    ['Which tool should I start with?', 'If you are preparing for an interview, the readiness test: ten questions tell you which SQL skill to fix first. If you have a query in front of you, paste it into the checker, then the explainer.'],
  ];
  const ld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Free SQL tools', url, description,
      hasPart: Object.entries(OTHER).map(([s, [n]]) => ({ '@type': 'WebApplication', name: n, url: `${SITE}/${s}/`, applicationCategory: 'DeveloperApplication', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } })) },
    breadcrumb(null, url),
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  return `${head({ title, description, url, ld })}
<main class="wrap">
  <p class="crumb"><a href="/">SQL Quest</a> › Free SQL tools</p>
  <h1 class="fd">Free SQL tools</h1>
  <p class="sub">Five tools, no signup. Two find out where your SQL stands; three work on the query in front of you, entirely in your browser.</p>
  <div class="tools">${Object.entries(OTHER).map(([s, [n, d]]) => `<a href="/${s}/" data-track="tools_hub_${s}">${esc(n)}<span>${esc(d)}</span></a>`).join('')}</div>
  <section class="faq">
    <h2 class="fd">Questions</h2>
${faq.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}
  </section>
  <div class="box" style="margin-top:30px;">
    <p style="font-size:15px;color:#94a3b8;">Practising for an interview? Every question in the bank has its own page — <a href="/questions/">SQL interview questions</a> — and each topic has a practice set: <a href="/challenges/joins/">joins</a>, <a href="/challenges/window-functions/">window functions</a>, <a href="/challenges/ranking-functions/">ranking functions</a>, <a href="/challenges/cte/">CTEs</a>, <a href="/challenges/advanced/">advanced questions</a>.</p>
  </div>
</main>
${FOOT}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const slug of Object.keys(TOOLS)) fs.writeFileSync(path.join(ROOT, 'src', `${slug}.html`), renderTool(slug));
  fs.writeFileSync(path.join(ROOT, 'src', 'sql-tools.html'), renderHub());
  console.log(`[sql-tools] ${Object.keys(TOOLS).length} tools + hub`);
}

export { TOOLS };
