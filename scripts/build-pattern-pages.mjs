// SQL trap / pattern pages → public/<slug>/index.html (founder's SEO task,
// 2026-09-25). Content and every number: src/data/sql-patterns.js, verified
// against the dataset by tests/sql-patterns.test.js. Also writes the sitemap
// block between <!-- patterns:start --> and <!-- patterns:end -->.
// Runs in `npm run build` right after build-question-pages.mjs, which links
// each cited challenge's question page back here (PATTERNS_FOR_CHALLENGE).

import fs from 'node:fs';
import path from 'node:path';
import { SQL_PATTERNS, PATTERN_PUBLISHED, patternTitle } from '../src/data/sql-patterns.js';
import { loadQuestionBank, questionSlugs } from './question-slugs.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const SITE = 'https://sqlquest.app';

export const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Escape, then `code` → <code>code</code>. */
export const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');

const KEYWORDS = new Set(('SELECT FROM WHERE AND OR NOT IN EXISTS JOIN LEFT INNER ON AS GROUP BY ORDER HAVING WITH ' +
  'COUNT SUM AVG ROUND DATE COALESCE IS NULL BETWEEN DESC ASC LIMIT CASE WHEN THEN ELSE END DISTINCT UNION').split(' '));

/** SQL → HTML with the brand syntax palette (blue keyword, green string, orange number). */
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

const fmt = v => (typeof v === 'number' && !Number.isInteger(v)
  ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  : typeof v === 'number' ? v.toLocaleString('en-US') : String(v));

function resultHtml(q) {
  if (q.rows && q.columns) {
    return `<div class="tbl"><table><thead><tr>${q.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${q.rows.map(r => `<tr>${r.map(v => `<td>${esc(fmt(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  if (q.rows) return `<p class="res">Returns: <strong>${esc(fmt(q.rows[0][0]))}</strong></p>`;
  return `<p class="res">Returns: <strong>${esc(fmt(q.rowCount))} rows</strong></p>`;
}

const CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#06060f;color:#e2e8f0;font-family:'DM Sans',sans-serif;line-height:1.65}
a{color:#c084fc;text-decoration:none}a:hover{text-decoration:underline}.fd{font-family:'Space Grotesk',sans-serif}
code,pre{font-family:'JetBrains Mono',monospace;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}code{font-size:.9em;color:#c084fc}pre code{font-size:inherit;color:#F2F0EA}
.nav{border-bottom:1px solid rgba(255,255,255,.06)}.ni{max-width:1000px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.wrap{max-width:820px;margin:0 auto;padding:36px 24px 64px}.crumb{font-size:13px;color:#8b98ab;margin-bottom:14px}.crumb a{color:#8b98ab}
h1{font-size:clamp(28px,4vw,40px);font-weight:800;line-height:1.15;margin-bottom:16px}h2{font-size:20px;font-weight:800;margin:36px 0 12px}h3{font-size:15px;font-weight:700;margin:22px 0 8px;color:#e2e8f0}
.trap{font-size:18px;color:#e2e8f0;border-left:3px solid #7c3aed;padding:4px 0 4px 16px;margin-bottom:10px}.lead{font-size:16px;color:#cbd5e1}.lead+.lead{margin-top:10px}
pre{background:#0E0F13;border:1px solid #2A2E38;border-radius:10px;padding:16px 18px;overflow-x:auto;font-size:14px;line-height:1.6;color:#F2F0EA;margin:10px 0}
pre .k{color:#7CC4FF}pre .s{color:#B5E48C}pre .n{color:#FFB86C}.bad{border-color:rgba(255,107,107,.45)}.good{border-color:rgba(74,222,128,.45)}
.lbl{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8b98ab;margin-top:18px}.lbl.bad{color:#FF6B6B}.lbl.good{color:#4ADE80}
.res{font-size:15px;color:#cbd5e1;margin:6px 0 4px}.res strong{font-family:'JetBrains Mono',monospace}
.tbl{overflow-x:auto;margin:8px 0 6px;border:1px solid #2A2E38;border-radius:10px}.tbl table{border-collapse:collapse;width:100%;font-size:13px}
.tbl th,.tbl td{padding:7px 12px;text-align:left;border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap;font-family:'JetBrains Mono',monospace}.tbl th{color:#7CC4FF;font-weight:600}.tbl td{color:#cbd5e1}
.why p{font-size:16px;color:#cbd5e1}.why p+p{margin-top:10px}.rule{background:rgba(124,58,237,.08);border:1px solid rgba(124,58,237,.3);border-radius:10px;padding:14px 16px;font-size:15px;color:#e2e8f0;margin-top:22px}
.box{background:rgba(10,10,25,.6);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px 20px}
.rel{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.rel a{display:block;background:rgba(10,10,25,.5);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px;color:#e2e8f0;font-size:14px}
.rel a span{display:block;font-size:12px;color:#8b98ab;margin-top:2px}.btn{display:inline-flex;align-items:center;gap:8px;border-radius:12px;font-weight:700;text-decoration:none}
.bo{padding:12px 22px;font-size:14px;color:#c084fc;border:1px solid rgba(124,58,237,.4)}.bo:hover{text-decoration:none}.ft{border-top:1px solid rgba(255,255,255,.06);padding:30px 24px;text-align:center;font-size:13px;color:#7f8da1}`;

function head({ title, description, url, ld }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GENERATED by scripts/build-pattern-pages.mjs from src/data/sql-patterns.js — do not edit. -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="SQLQuest.app">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <script defer src="/_vercel/insights/script.js"></script>
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
<nav class="nav"><div class="ni"><a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:#e2e8f0;"><span style="width:32px;height:32px;border-radius:9px;background:#7c3aed;display:inline-flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></span><span class="fd" style="font-weight:800;font-size:18px;">SQL Quest</span></a><a href="/sql-interview-readiness-test/" style="font-size:14px;">Readiness test</a></div></nav>`;
}

const foot = `<script defer src="/track.js"></script>
<footer class="ft">SQL Quest — personalized SQL interview practice · <a href="/questions/">All SQL interview questions</a> · <a href="/sql-exercises/">Practice by difficulty</a> · <a href="/sql-interview-prep/">Company guides</a> · <a href="/sql-tools/">Free SQL tools</a> · <a href="/privacy/">Privacy</a></footer>
</body>
</html>
`;

export function renderPattern(p, { slugs, bank, year = new Date().getFullYear(), modified = PATTERN_PUBLISHED } = {}) {
  const url = `${SITE}/${p.slug}/`;
  const title = patternTitle(p, year) + ' | SQLQuest.app';
  const byId = new Map(bank.map(c => [c.id, c]));
  const others = SQL_PATTERNS.filter(o => o.slug !== p.slug);
  const related = p.related.map(s => SQL_PATTERNS.find(o => o.slug === s)).filter(Boolean);
  const rest = others.filter(o => !p.related.includes(o.slug));
  const mockHref = m => `/app/?interview=${m.id}&amp;src=pattern-${p.slug}`;
  const mockLine = m => `<a href="${mockHref(m)}" data-track="cta_pattern_mock">question ${m.number} of our ${esc(m.name)}</a>`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'SQL Interview Questions', item: `${SITE}/questions/` },
      { '@type': 'ListItem', position: 3, name: p.short, item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'Article', headline: p.h1, description: p.description, url,
      mainEntityOfPage: url, image: `${SITE}/og-image.png`, inLanguage: 'en',
      datePublished: PATTERN_PUBLISHED, dateModified: modified,
      author: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` },
      publisher: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/og-image.png` } } },
  ];
  const fix = (f, i) => `
  <p class="lbl good">Fix ${i + 1} — ${esc(f.label)}</p>
  <pre class="good"><code>${highlight(f.sql)}</code></pre>
  ${resultHtml(f)}`;
  return `${head({ title, description: p.description, url, ld })}
<main class="wrap">
  <p class="crumb"><a href="/">SQL Quest</a> › <a href="/questions/">SQL Interview Questions</a> › SQL traps › ${esc(p.short)}</p>
  <h1 class="fd">${esc(p.h1)}</h1>
  <p class="trap" data-pattern-trap="true">${inline(p.trap)}</p>

  <h2 class="fd">The task</h2>
  <p class="lead">${inline(p.task)} The data is SQL Quest's synthetic card-transactions set (accounts, merchants, transactions, chargebacks), and every result on this page is what the query returns on it.</p>

  <p class="lbl bad">The query that looks right</p>
  <pre class="bad"><code>${highlight(p.wrong.sql)}</code></pre>
  ${resultHtml(p.wrong)}
  <p class="res">${inline(p.wrong.says)}</p>
  ${p.breakdown ? `<h3>${esc(p.breakdown.caption)}</h3>
  <pre><code>${highlight(p.breakdown.sql)}</code></pre>
  ${resultHtml(p.breakdown)}` : ''}

  <h2 class="fd">Why</h2>
  <div class="why">${p.why.map(w => `<p>${inline(w)}</p>`).join('')}</div>

  <h2 class="fd">The fix</h2>${p.fixes.map(fix).join('')}
  <p class="res" style="margin-top:14px;"><strong style="font-family:inherit;color:#4ADE80;">Right answer:</strong> ${inline(p.right)}</p>
  <p class="rule"><strong>Rule of thumb.</strong> ${inline(p.rule)}</p>
  ${p.readMore ? `<p style="font-size:15px;color:#94a3b8;margin-top:14px;">Read next: <a href="${p.readMore.href}">${esc(p.readMore.text)}</a></p>` : ''}

  <h2 class="fd">Where this trap is tested</h2>
  <p class="lead">This trap is ${mockLine(p.mock)}${p.alsoIn ? `, and again in ${mockLine(p.alsoIn)}` : ''} — a timed practice screen on the same kind of data. The mock asks it in a different form, so this page does not give its answer away.</p>

  <h2 class="fd">Practise it</h2>
  <div class="rel">${p.challenges.map(id => byId.get(id)).filter(Boolean).map(c => `<a href="/questions/${slugs.get(c.id)}/">${esc(c.title)}<span>${esc(c.difficulty)} · SQL practice question</span></a>`).join('')}</div>

  <h2 class="fd">Related SQL traps</h2>
  <div class="rel">${[...related, ...rest].map(o => `<a href="/${o.slug}/">${esc(o.short)}<span>${esc(o.h1.replace(/^SQL [^:]+: /, ''))}</span></a>`).join('')}</div>

  <div class="box" style="margin-top:36px;text-align:center;">
    <p class="fd" style="font-size:19px;font-weight:800;margin-bottom:6px;">Which traps would cost you in an interview?</p>
    <p style="font-size:14px;color:#94a3b8;margin-bottom:14px;">Ten questions, no signup: a Skillmap across nine SQL skills and the one to fix first.</p>
    <a class="btn bo" href="/sql-interview-readiness-test/" data-track="cta_pattern_readiness">Take the readiness test</a>
  </div>
</main>
${foot}`;
}

function writeSitemap() {
  const file = path.join(PUB, 'sitemap.xml');
  let xml = fs.readFileSync(file, 'utf8');
  xml = xml.replace(/\s*<!-- patterns:start -->[\s\S]*?<!-- patterns:end -->/, '');
  // The date is a placeholder; scripts/sitemap-lastmod.mjs rewrites every
  // <lastmod> from the built page's content hash at the end of the build.
  const block = `\n  <!-- patterns:start -->\n${SQL_PATTERNS.map(p => `  <url>\n    <loc>${SITE}/${p.slug}/</loc>\n    <lastmod>${PATTERN_PUBLISHED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`).join('\n')}\n  <!-- patterns:end -->`;
  xml = xml.replace('</urlset>', `${block}\n</urlset>`);
  fs.writeFileSync(file, xml);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bank } = loadQuestionBank();
  const slugs = questionSlugs(bank);
  for (const p of SQL_PATTERNS) {
    const out = path.join(PUB, p.slug);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'index.html'), renderPattern(p, { slugs, bank }));
  }
  writeSitemap();
  console.log(`[pattern-pages] ${SQL_PATTERNS.length} SQL trap pages · sitemap block ${SQL_PATTERNS.length} URLs`);
}
