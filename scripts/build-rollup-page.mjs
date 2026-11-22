#!/usr/bin/env node
/**
 * /sql-rollup-interview-questions/ (2026-11-22). GSC, 28 days to 2026-11-22:
 * "rollup interview questions" — 657 impressions, 0 clicks, position 8.9, on
 * /questions/recursive-team-size-rollup/, a page that does not answer it.
 *
 * Content and every number: src/data/sql-rollup.js, run against the bank's
 * datasets by tests/sql-rollup.test.js. A small sibling of
 * scripts/build-pattern-pages.mjs (same CSS and helpers), but it writes the
 * SOURCE page, src/sql-rollup-interview-questions.html, so build-static-pages.js
 * copies it to public/ with the analytics tag and every src/ guard
 * (seo-consistency, snippet-length, site-counts) reads it. Also writes the
 * sitemap block between <!-- rollup:start --> and <!-- rollup:end -->.
 *
 * Runs in `npm run build` before build-static-pages.js. Do not hand-edit the
 * page; edit the data file and rebuild.
 */

import fs from 'node:fs';
import path from 'node:path';
import { esc, inline, CSS } from './build-pattern-pages.mjs';
import { loadQuestionBank, questionSlugs } from './question-slugs.mjs';
import {
  ROLLUP_SLUG, ROLLUP_PUBLISHED, ROLLUP_TITLE, ROLLUP_H1, ROLLUP_DESCRIPTION, ROLLUP_APP_SRC, ROLLUP_CTA_CHALLENGE,
  GROUPING_CLAUSES, DIALECTS, ROLLUP_QUESTIONS, ROLLUP_PRACTICE, ROLLUP_FAQ,
} from '../src/data/sql-rollup.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = 'https://sqlquest.app';
export const SRC_PAGE = path.join(ROOT, 'src', `${ROLLUP_SLUG}.html`);

const KEYWORDS = new Set(('SELECT FROM WHERE AND OR NOT IN EXISTS JOIN LEFT INNER ON AS GROUP BY ORDER HAVING WITH RECURSIVE ' +
  'COUNT SUM AVG MAX MIN ROUND SUBSTR COALESCE IS NULL DESC ASC CASE WHEN THEN ELSE END DISTINCT UNION ALL ' +
  'ROLLUP CUBE GROUPING SETS').split(' '));

/** SQL → HTML in the brand syntax palette (blue keyword, green string, orange number). */
export function highlight(sql) {
  const out = [];
  const re = /('(?:[^']|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(sql))) {
    if (m[1]) out.push(`<span class="s">${esc(m[1])}</span>`);
    else if (m[2]) out.push(`<span class="n">${esc(m[2])}</span>`);
    else if (m[3]) out.push(KEYWORDS.has(m[3].toUpperCase()) ? `<span class="k">${esc(m[3])}</span>` : esc(m[3]));
    else out.push(esc(m[4] || m[5]));
  }
  return out.join('');
}

/** How a result value is shown: decimals with two places, integers with separators. */
export const fmt = v => (typeof v === 'number' && !Number.isInteger(v)
  ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : typeof v === 'number' ? v.toLocaleString('en-US') : String(v));

const table = (head, rows, cls = '') => `<div class="tbl${cls}"><table><thead><tr>${head.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

const EXTRA_CSS = `.bp{padding:13px 26px;font-size:15px;background:#FFE34D;color:#0E0F13}.bp:hover{text-decoration:none}
.tbl.prose td{white-space:normal;font-family:'DM Sans',sans-serif;font-size:14px;vertical-align:top}.tbl.prose td:first-child{font-family:'JetBrains Mono',monospace;font-size:13px;color:#e2e8f0}
.q{border-top:1px solid #2A2E38;margin-top:34px;padding-top:6px}.q h3{font-size:18px;margin-top:18px}.q .num{color:#8b98ab;margin-right:6px}
.faq h3{font-size:16px;margin:22px 0 6px}.faq p{font-size:15px;color:#cbd5e1}
@media (max-width:520px){.wrap{padding:28px 16px 56px}pre{font-size:12.5px;padding:14px}.ni{padding:14px 16px}}`;

export function renderRollupPage({ bank, slugs } = (() => { const { bank } = loadQuestionBank(); return { bank, slugs: questionSlugs(bank) }; })()) {
  const url = `${SITE}/${ROLLUP_SLUG}/`;
  const byId = new Map(bank.map(c => [c.id, c]));
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'SQL Interview Questions', item: `${SITE}/questions/` },
      { '@type': 'ListItem', position: 3, name: 'Rollup interview questions', item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'Article', headline: ROLLUP_H1, description: ROLLUP_DESCRIPTION, url,
      mainEntityOfPage: url, image: `${SITE}/og-image.png`, inLanguage: 'en',
      datePublished: ROLLUP_PUBLISHED, dateModified: ROLLUP_PUBLISHED,
      author: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` },
      publisher: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/og-image.png` } } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: ROLLUP_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ];
  const question = (q, i) => `
  <section class="q" id="${q.id}" data-rollup-question="${q.id}">
    <h3 class="fd"><span class="num">${i + 1}.</span>${esc(q.h)}</h3>
    <p class="lead">${inline(q.task)}</p>${q.standard ? `
    <p class="lbl">PostgreSQL · the GROUP BY clause is the same in SQL Server, Oracle and Snowflake</p>
    <pre><code>${highlight(q.standard)}</code></pre>
    <p class="lbl good">SQLite has no ${esc(q.clause)}: the same result with UNION ALL · runs in SQL Quest</p>` : `
    <p class="lbl good">SQLite and PostgreSQL · runs in SQL Quest</p>`}
    <pre class="good"><code>${highlight(q.sqlite)}</code></pre>
    <p class="res">Returns, on the <code>${esc(q.dataset)}</code> tables:</p>
    ${table(q.columns, q.rows.map(r => r.map(v => esc(fmt(v)))))}
    <div class="why">${q.why.map(w => `<p>${inline(w)}</p>`).join('')}</div>
  </section>`;
  const practice = ROLLUP_PRACTICE.map(id => byId.get(id)).filter(Boolean)
    .map(c => `<a href="/questions/${slugs.get(c.id)}/">${esc(c.title)}<span>${esc(c.difficulty)} · SQL practice question</span></a>`).join('');
  const cta = `/app/?challenge=${ROLLUP_CTA_CHALLENGE}&amp;src=${ROLLUP_APP_SRC}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GENERATED by scripts/build-rollup-page.mjs from src/data/sql-rollup.js — do not edit. -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(ROLLUP_TITLE)}</title>
  <meta name="description" content="${esc(ROLLUP_DESCRIPTION)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="SQLQuest.app">
  <meta property="og:title" content="${esc(ROLLUP_TITLE)}">
  <meta property="og:description" content="${esc(ROLLUP_DESCRIPTION)}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(ROLLUP_TITLE)}">
  <meta name="twitter:description" content="${esc(ROLLUP_DESCRIPTION)}">
  <script defer src="/_vercel/insights/script.js"></script>
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>${CSS}
${EXTRA_CSS}</style>
</head>
<body>
<nav class="nav"><div class="ni"><a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:#e2e8f0;"><span style="width:32px;height:32px;border-radius:9px;background:#7c3aed;display:inline-flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span><span class="fd" style="font-weight:800;font-size:18px;">SQL Quest</span></a><a href="/questions/" style="font-size:14px;">All questions</a></div></nav>
<main class="wrap">
  <p class="crumb"><a href="/">SQL Quest</a> › <a href="/questions/">SQL Interview Questions</a> › Rollup questions</p>
  <h1 class="fd">${esc(ROLLUP_H1)}</h1>
  <p class="trap">A rollup question asks for one aggregate at several levels in one result: a row per group, a subtotal per parent group, and a grand total. PostgreSQL, SQL Server, Oracle and Snowflake write it as <code>GROUP BY ROLLUP</code>, <code>CUBE</code> or <code>GROUPING SETS</code>. SQLite has none of the three, so each question below is worked both ways.</p>
  <p class="lead">The data is SQL Quest's own practice tables: an online shop's <code>orders</code> and a company's <code>employees</code> with their managers. Every result table on this page is what the SQLite query returns on them.</p>

  <h2 class="fd">ROLLUP, CUBE and GROUPING SETS</h2>
  ${table(['Clause', 'Groups by', 'What you get'], GROUPING_CLAUSES.map(([c, g, w]) => [esc(c), esc(g), esc(w)]), ' prose')}

  <h2 class="fd">Which databases have them</h2>
  ${table(['Database', 'Rollup syntax'], DIALECTS.map(([d, s]) => [esc(d), inline(s)]), ' prose')}
  <p class="lead" style="margin-top:12px;">On a subtotal row the column that was rolled away is NULL. Label it with <code>CASE WHEN GROUPING(col) = 1 THEN 'All' ELSE col END</code> rather than <code>COALESCE</code>: a column can hold real NULLs too, and a GROUP BY manager_id over this table already has a NULL group of 7 people. <code>GROUPING()</code> is 1 only on the rows the rollup added.</p>

  <h2 class="fd">Five rollup interview questions, worked</h2>
${ROLLUP_QUESTIONS.map(question).join('\n')}

  <h2 class="fd">Practise it</h2>
  <p class="lead" style="margin-bottom:12px;">Questions from the bank on a share of the grand total and on manager hierarchies. Their solutions stay in the app.</p>
  <div class="rel">${practice}</div>

  <div class="box" style="margin-top:36px;text-align:center;">
    <p class="fd" style="font-size:19px;font-weight:800;margin-bottom:6px;">Work out a share of the grand total, against a checked answer</p>
    <p style="font-size:14px;color:#94a3b8;margin-bottom:16px;">SQLite in your browser, no signup. Your rows are compared with the expected rows, and a wrong answer gets a diagnosis, not just "incorrect".</p>
    <a class="btn bp" href="${cta}" data-track="cta_rollup_practice">Practise in the browser editor →</a>
    <p style="font-size:14px;color:#94a3b8;margin-top:14px;">Not sure which skill to work on? <a href="/sql-interview-readiness-test/" data-track="cta_rollup_readiness">Take the ten-question readiness test</a>.</p>
  </div>

  <section class="faq">
    <h2 class="fd">Questions</h2>
${ROLLUP_FAQ.map(([q, a]) => `    <h3>${esc(q)}</h3>\n    <p>${esc(a)}</p>`).join('\n')}
  </section>

  <h2 class="fd">Related</h2>
  <div class="rel">
    <a href="/blog/recursive-cte-explained/">Recursive CTEs explained<span>Anchor, step, stop, on an org chart</span></a>
    <a href="/blog/sql-group-by-tutorial/">GROUP BY tutorial<span>The grain of a result</span></a>
    <a href="/sql-average-of-averages/">Average of averages<span>Why a total is not the mean of the subtotals' means</span></a>
    <a href="/challenges/aggregation/">Aggregation practice<span>GROUP BY and HAVING questions</span></a>
    <a href="/challenges/cte/">CTE practice<span>Chained and recursive CTE questions</span></a>
    <a href="/sql-exercises/">SQL practice questions<span>By topic and difficulty</span></a>
  </div>
</main>
<footer class="ft">SQL Quest — personalized SQL interview practice · <a href="/questions/">All SQL interview questions</a> · <a href="/sql-exercises/">Practice by difficulty</a> · <a href="/sql-interview-prep/">Company guides</a> · <a href="/privacy/">Privacy</a></footer>
</body>
</html>
`;
}

export function writeSitemap() {
  const file = path.join(ROOT, 'public', 'sitemap.xml');
  let xml = fs.readFileSync(file, 'utf8');
  xml = xml.replace(/\s*<!-- rollup:start -->[\s\S]*?<!-- rollup:end -->/, '');
  // Placeholder date; scripts/sitemap-lastmod.mjs rewrites <lastmod> from the built page's hash.
  const block = `\n  <!-- rollup:start -->\n  <url>\n    <loc>${SITE}/${ROLLUP_SLUG}/</loc>\n    <lastmod>${ROLLUP_PUBLISHED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n  <!-- rollup:end -->`;
  xml = xml.replace('</urlset>', `${block}\n</urlset>`);
  fs.writeFileSync(file, xml);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fs.writeFileSync(SRC_PAGE, renderRollupPage());
  writeSitemap();
  console.log(`[rollup-page] src/${ROLLUP_SLUG}.html · ${ROLLUP_QUESTIONS.length} questions · sitemap block 1 URL`);
}
