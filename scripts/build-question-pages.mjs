#!/usr/bin/env node
/**
 * Indexable question pages — /questions/<slug>/ and the /questions/ hub.
 * Founder's SEO plan, 2026-09-13, P1.8 ("turn the challenge bank into
 * indexable question pages") and P1.9 (internal linking as a knowledge graph).
 *
 * One page per challenge in the bank: the problem, the schema of the tables
 * it uses (columns and three sample rows), difficulty, the companies whose
 * practice sets include it, the concepts it exercises (linked to the topic
 * pages), the hint (free challenges only — Pro hints stay in the app), an
 * "open it in the browser editor" link straight into the app, related
 * questions on the same skill, and the readiness test. The reference solution
 * is never published here: it is what the app shows after a solve.
 *
 * Written at build time into public/questions/ (generated output, like
 * public/weekly/), with the sitemap's question block rewritten between
 * markers. Slugs come from scripts/question-slugs.mjs so the company pages and
 * topic pages can link the same URLs.
 *
 * Run: node scripts/build-question-pages.mjs   (part of `npm run build`)
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { questionSlugs, loadQuestionBank } from './question-slugs.mjs';
import { SKILL_PAGE } from './build-company-pages.mjs';
import { SKILL_TO_RADAR, mapTopicToSkill, CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import { isFreePreview } from '../src/utils/challenge-order.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const SITE = 'https://sqlquest.app';

const resolve = raw => SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;
const canon = c => [...new Set([...(c.skills || []), c.category].filter(Boolean).map(resolve).filter(Boolean))];
const playableFree = c => c.difficulty !== 'Hard' || isFreePreview(c);
const RANK = { Easy: 0, Medium: 1, Hard: 2 };
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// The bank writes emphasis as **bold** and `code`.
const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
const paras = s => String(s || '').split(/\n\s*\n/).map(p => `<p>${md(p.trim()).replace(/\n/g, '<br>')}</p>`).join('\n');
const plain = s => String(s || '').replace(/\*\*|`/g, '').replace(/\s+/g, ' ').trim();
// Some on-ramp hints are the whole query. Those stay in the app: a page that
// hands over the answer is a page nobody needs to leave.
const squashWs = s => String(s || '').replace(/\s+/g, ' ').trim();
export const showHint = c => !!c.hint && !squashWs(c.hint).includes(squashWs(c.solution).slice(0, 60));
const RANKING = /\b(?:ROW_NUMBER|DENSE_RANK|RANK|NTILE|PERCENT_RANK)\s*\(/i;

function loadDatasets() {
  const ctx = { window: {}, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  for (const f of ['datasets.js', 'finans-data.js', 'finans-fraud-data.js', 'neobank-data.js', 'gayrimenkul-data.js', 'uretim-data.js']) {
    const p = path.join(ROOT, 'src/data', f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx);
  }
  return ctx.window.publicDatasetsData || {};
}

function companyPages() {
  const out = {};
  for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(x => /-sql-interview\.html$/.test(x))) {
    const title = (fs.readFileSync(path.join(ROOT, 'src', f), 'utf8').match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const name = ((title.match(/^(.+?)\s+SQL\b/) || [])[1] || '').trim();
    if (name) out[name.toLowerCase()] = { name, url: `/${f.replace(/\.html$/, '')}/` };
  }
  return out;
}

function schemaHtml(c, datasets) {
  const ds = datasets[c.dataset];
  if (!ds || !ds.tables) return '';
  const tables = (c.tables && c.tables.length ? c.tables : Object.keys(ds.tables)).filter(t => ds.tables[t]);
  return tables.map(t => {
    const tb = ds.tables[t];
    const cols = tb.columns || [];
    const rows = (tb.data || []).slice(0, 3);
    return `<div class="tbl"><p class="fm tname">${esc(t)}</p><table><thead><tr>${cols.map(col => `<th>${esc(col)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${v === null ? '<span class="nul">NULL</span>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }).join('\n');
}

const CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{background:#06060f;color:#e2e8f0;font-family:'DM Sans',sans-serif;line-height:1.6}
a{color:#c084fc;text-decoration:none}a:hover{text-decoration:underline}.fd{font-family:'Space Grotesk',sans-serif}.fm,code{font-family:'JetBrains Mono',monospace}
code{font-size:.92em;color:#c084fc}.nav{border-bottom:1px solid rgba(255,255,255,.06)}.ni{max-width:1000px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.wrap{max-width:860px;margin:0 auto;padding:36px 24px 64px}.crumb{font-size:13px;color:#8b98ab;margin-bottom:14px}.crumb a{color:#8b98ab}
h1{font-size:clamp(28px,4vw,42px);font-weight:800;line-height:1.15;margin-bottom:14px}h2{font-size:20px;font-weight:800;margin:34px 0 12px}
.meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}.tag{font-size:12px;font-weight:700;padding:3px 10px;border-radius:100px;background:rgba(255,255,255,.07);color:#cbd5e1}
.tag.easy{background:rgba(34,197,94,.14);color:#22c55e}.tag.medium{background:rgba(255,176,32,.15);color:#FFB020}.tag.hard{background:rgba(192,132,252,.14);color:#c084fc}
.prob{font-size:17px;color:#cbd5e1;line-height:1.8}.prob p+p{margin-top:12px}.box{background:rgba(10,10,25,.6);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px 20px}
.tbl{overflow-x:auto;margin:10px 0 16px;border:1px solid rgba(255,255,255,.08);border-radius:10px}.tbl table{border-collapse:collapse;width:100%;font-size:13px}.tname{font-size:13px;color:#e2e8f0;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06)}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap;font-family:'JetBrains Mono',monospace}.tbl th{color:#7CC4FF;font-weight:600}.tbl td{color:#94a3b8}.nul{color:#8b98ab;font-style:italic}
.btn{display:inline-flex;align-items:center;gap:8px;border-radius:12px;font-weight:700;text-decoration:none}.bp{padding:13px 26px;font-size:15px;background:#FFE34D;color:#0E0F13}.bo{padding:12px 22px;font-size:14px;color:#c084fc;border:1px solid rgba(124,58,237,.4)}
.bp:hover,.bo:hover{text-decoration:none}.rel{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}.rel a{display:block;background:rgba(10,10,25,.5);border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px 14px;color:#e2e8f0;font-size:14px}
.rel a span{display:block;font-size:12px;color:#8b98ab;margin-top:2px}.ft{border-top:1px solid rgba(255,255,255,.06);padding:30px 24px;text-align:center;font-size:13px;color:#7f8da1}`;

const head = ({ title, description, url, ld }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GENERATED by scripts/build-question-pages.mjs from the challenge bank — do not edit. -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="SQL Quest">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <script defer src="/_vercel/insights/script.js"></script>
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>${CSS}</style>
</head>
<body>
<nav class="nav"><div class="ni"><a href="/" class="fd" style="color:#e2e8f0;font-weight:800;font-size:18px;">SQL Quest</a><a href="/sql-interview-readiness-test/" style="font-size:14px;">Readiness test</a></div></nav>`;

const foot = `<script defer src="/track.js"></script>
<footer class="ft">SQL Quest — personalized SQL interview practice · <a href="/questions/">All SQL interview questions</a> · <a href="/sql-exercises/">Practice by difficulty</a> · <a href="/sql-interview-prep/">Company guides</a> · <a href="/sql-tools/">Free SQL tools</a> · <a href="/privacy/">Privacy</a></footer>
</body>
</html>
`;

export function renderQuestion(c, ctx) {
  const { slugs, datasets, companies, bank, taggedBy } = ctx;
  const slug = slugs.get(c.id);
  const url = `${SITE}/questions/${slug}/`;
  const skills = canon(c);
  const primary = skills.find(s => s !== 'Querying Basics') || skills[0] || 'Querying Basics';
  const free = playableFree(c);
  const cos = (taggedBy[c.id] || []).map(n => companies[n.toLowerCase()]).filter(Boolean);
  const title = `${c.title} — SQL Interview Question (${c.difficulty}) | SQL Quest`;
  const description = `${plain(c.description).slice(0, 138).replace(/\s+\S*$/, '')}… A ${c.difficulty.toLowerCase()} SQL practice question on ${primary.toLowerCase()}, with the schema, a hint and an in-browser editor.`;
  const concepts = [...new Set([...(c.skills || []), c.category].filter(Boolean))];
  const topicLinks = skills.filter(s => SKILL_PAGE[s]).map(s => `<a href="${SKILL_PAGE[s][0]}">${esc(SKILL_PAGE[s][1])}</a>`);
  if (RANKING.test(c.solution || '')) topicLinks.push('<a href="/challenges/ranking-functions/">Ranking function practice</a>');
  if (c.difficulty === 'Hard') topicLinks.push('<a href="/challenges/advanced/">Advanced SQL interview questions</a>');
  const related = bank
    .filter(o => o.id !== c.id && canon(o).includes(primary))
    .sort((a, b) => Math.abs(RANK[a.difficulty] - RANK[c.difficulty]) - Math.abs(RANK[b.difficulty] - RANK[c.difficulty]) || (playableFree(b) - playableFree(a)) || a.id - b.id)
    .slice(0, 6);
  const appUrl = `/app/?challenge=${c.id}&amp;src=question-${slug}`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'SQL Interview Questions', item: `${SITE}/questions/` },
      { '@type': 'ListItem', position: 3, name: c.title, item: url },
    ] },
    { '@context': 'https://schema.org', '@type': 'LearningResource', name: c.title, description: plain(c.description), url,
      learningResourceType: 'Practice problem', educationalLevel: c.difficulty, isAccessibleForFree: free, inLanguage: 'en',
      teaches: skills, keywords: concepts.join(', '), provider: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` } },
  ];
  return `${head({ title, description, url, ld })}
<main class="wrap">
  <p class="crumb"><a href="/">SQL Quest</a> › <a href="/questions/">SQL Interview Questions</a> › ${esc(primary)}</p>
  <h1 class="fd">${esc(c.title)}</h1>
  <div class="meta"><span class="tag ${c.difficulty.toLowerCase()}">${c.difficulty}</span><span class="tag">${free ? 'Free' : 'Pro'}</span>${skills.map(s => `<span class="tag">${esc(s)}</span>`).join('')}</div>
  <div class="prob">${paras(c.description)}</div>
  <p style="margin-top:22px;"><a class="btn bp" href="${appUrl}" data-track="cta_question_solve">Solve it in the browser editor →</a></p>
  <p style="font-size:13px;color:#8b98ab;margin-top:10px;">Runs on SQLite in your browser, graded against the expected result, no signup. A wrong answer gets a diagnosis, not just "incorrect".</p>

  <h2 class="fd">Schema</h2>
  ${schemaHtml(c, datasets) || '<p style="color:#94a3b8;">The tables are listed in the editor.</p>'}
  ${c.example && c.example.output ? `<p style="font-size:14px;color:#94a3b8;"><strong style="color:#e2e8f0;">Expected output:</strong> ${esc(c.example.output)}</p>` : ''}

  <h2 class="fd">Hint</h2>
  <div class="box" style="font-size:15px;color:#cbd5e1;">${!free ? 'This is a Pro challenge — the hint, the step-by-step tutor and the reference solution open in the app.' : showHint(c) ? md(c.hint) : `The hint for this one spells out most of the query, so it stays in the editor. Reach for ${concepts.slice(0, 3).map(t => `<code>${esc(t)}</code>`).join(', ')}, and open the hint there if you stall.`}</div>

  <h2 class="fd">Concepts</h2>
  <p style="font-size:15px;color:#94a3b8;">${concepts.map(t => `<code>${esc(t)}</code>`).join(' ')}</p>
  ${topicLinks.length ? `<p style="font-size:15px;color:#94a3b8;margin-top:8px;">Practise the topic: ${topicLinks.join(' · ')}</p>` : ''}

  ${cos.length ? `<h2 class="fd">In these company practice sets</h2>
  <p style="font-size:15px;color:#94a3b8;">${cos.map(x => `<a href="${x.url}">${esc(x.name)}</a>`).join(' · ')}</p>
  <p style="font-size:13px;color:#8b98ab;margin-top:6px;">A SQL Quest challenge matched to patterns reported for these companies — not a question any of them has published.</p>` : ''}

  <h2 class="fd">Related questions</h2>
  <div class="rel">${related.map(o => `<a href="/questions/${slugs.get(o.id)}/">${esc(o.title)}<span>${o.difficulty} · ${playableFree(o) ? 'Free' : 'Pro'}</span></a>`).join('')}</div>

  <div class="box" style="margin-top:34px;text-align:center;">
    <p class="fd" style="font-size:19px;font-weight:800;margin-bottom:6px;">Where would this cost you points in an interview?</p>
    <p style="font-size:14px;color:#94a3b8;margin-bottom:14px;">Ten questions, no signup: a Skillmap across nine SQL skills and the one to fix first.</p>
    <a class="btn bo" href="/sql-interview-readiness-test/" data-track="cta_question_readiness">Take the readiness test</a>
  </div>
</main>
${foot}`;
}

export function renderHub(bank, slugs) {
  const url = `${SITE}/questions/`;
  const groups = {};
  for (const c of bank) {
    const s = canon(c).find(x => x !== 'Querying Basics') || 'Querying Basics';
    (groups[s] = groups[s] || []).push(c);
  }
  const order = CANONICAL_SKILLS.filter(s => groups[s]);
  const title = `SQL Interview Questions — ${bank.length} Practice Problems by Topic | SQL Quest`;
  const description = `Every SQL Quest practice question as its own page: joins, window functions, aggregation, CTEs, CASE, dates, NULLs and strings. Easy to Hard, runnable in the browser.`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'SQL Interview Questions', url, description,
    mainEntity: { '@type': 'ItemList', numberOfItems: bank.length, itemListElement: bank.slice(0, 50).map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/questions/${slugs.get(c.id)}/`, name: c.title })) } }];
  const sections = order.map(s => {
    const list = groups[s].sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty] || a.id - b.id);
    return `<h2 class="fd" id="${s.toLowerCase().replace(/[^a-z]+/g, '-')}">${esc(s)}</h2>
  <div class="rel">${list.map(c => `<a href="/questions/${slugs.get(c.id)}/">${esc(c.title)}<span>${c.difficulty} · ${playableFree(c) ? 'Free' : 'Pro'}</span></a>`).join('')}</div>`;
  }).join('\n  ');
  return `${head({ title, description, url, ld })}
<main class="wrap" style="max-width:1000px;">
  <p class="crumb"><a href="/">SQL Quest</a> › SQL Interview Questions</p>
  <h1 class="fd">SQL Interview Questions, one page each</h1>
  <p style="font-size:17px;color:#94a3b8;max-width:720px;margin-bottom:18px;">Every practice question in the SQL Quest bank, grouped by the Skillmap skill it leans on. Each page has the problem, the schema with sample rows, a hint and a link into the browser editor.</p>
  <p style="margin-bottom:10px;"><a class="btn bp" href="/sql-interview-readiness-test/" data-track="cta_questions_hub_readiness">Find your weakest skill first</a></p>
  <p style="font-size:14px;color:#94a3b8;">Jump to: ${order.map(s => `<a href="#${s.toLowerCase().replace(/[^a-z]+/g, '-')}">${esc(s)}</a>`).join(' · ')}</p>
  ${sections}
</main>
${foot}`;
}

function writeSitemap(slugs) {
  const file = path.join(PUB, 'sitemap.xml');
  let xml = fs.readFileSync(file, 'utf8');
  xml = xml.replace(/\s*<!-- questions:start -->[\s\S]*?<!-- questions:end -->/, '');
  const today = '2026-09-13';
  const urls = [`${SITE}/questions/`, ...[...slugs.values()].map(s => `${SITE}/questions/${s}/`)];
  const block = `\n  <!-- questions:start -->\n${urls.map(u => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${u.endsWith('/questions/') ? '0.8' : '0.6'}</priority>\n  </url>`).join('\n')}\n  <!-- questions:end -->`;
  xml = xml.replace('</urlset>', `${block}\n</urlset>`);
  fs.writeFileSync(file, xml);
  return urls.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bank, tags } = loadQuestionBank();
  const slugs = questionSlugs(bank);
  const taggedBy = {};
  for (const [id, names] of Object.entries(tags)) taggedBy[id] = names;
  const ctx = { slugs, datasets: loadDatasets(), companies: companyPages(), bank, taggedBy };
  const dir = path.join(PUB, 'questions');
  fs.rmSync(dir, { recursive: true, force: true });
  for (const c of bank) {
    const out = path.join(dir, slugs.get(c.id));
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'index.html'), renderQuestion(c, ctx));
  }
  fs.writeFileSync(path.join(dir, 'index.html'), renderHub(bank, slugs));
  const n = writeSitemap(slugs);
  console.log(`[question-pages] ${bank.length} question pages + hub · sitemap block ${n} URLs`);
}
