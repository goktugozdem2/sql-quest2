#!/usr/bin/env node
/**
 * The company interview page TEMPLATE (founder's SEO plan, 2026-09-13, P0.4).
 *
 * One reusable page for "{Company} SQL Interview Questions":
 *   1. hero — the company, one sourced sentence, two CTAs: start the set,
 *      check your readiness (the Skillmap door)
 *   2. how the interview runs — a table of reported facts, each row citing
 *      dated sources, disagreements stated, and the "does not publish the
 *      format" line tests/company-pages.test.js requires of a sourced page
 *   3. the SQL that comes up — topics as reported, ranked, next to the
 *      composition of our tagged set (TOPICS, computed from the bank)
 *   4. difficulty — as reported, next to our set's Easy/Medium/Hard split
 *   5. sample questions — shapes candidates report (paraphrased, cited) and
 *      the real SQL Quest challenges tagged to the company (FQ, from the bank)
 *   6. interactive practice + Skillmap readiness CTA
 *   7. topic links (the canonical skills the set leans on → /challenges/*)
 *   8. FAQ (visible array and JSON-LD written from one source)
 *   9. the related-companies strip (scripts/build-company-crosslinks.mjs)
 *
 * Data: src/data/company-interviews.js. Tags: the same file's NEW_COMPANY_TAGS
 * are merged into src/data/challenge-companies.js (idempotent). Output:
 * src/<slug>-sql-interview.html, committed like every other page, so the
 * bank guards (company-pages, site-counts, faq-schema, seo-audit) read it.
 *
 * Run:  node scripts/build-company-pages.mjs && node scripts/build-company-crosslinks.mjs && npm run build
 */

import { questionSlugs, loadQuestionBank } from './question-slugs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { COMPANY_INTERVIEWS, NEW_COMPANY_TAGS } from '../src/data/company-interviews.js';
import { SKILL_TO_RADAR, mapTopicToSkill, CANONICAL_SKILLS } from '../src/utils/skill-calc.js';
import { isFreePreview } from '../src/utils/challenge-order.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SITE = 'https://sqlquest.app';

// ── 1. tags ────────────────────────────────────────────────────────────────
const TAGS_FILE = path.join(ROOT, 'src/data/challenge-companies.js');
const TAG_MARK = '// MANUAL ADDITIONS 2026-09-13 (company template, P0.5)';

export function mergeTags() {
  let src = fs.readFileSync(TAGS_FILE, 'utf8');
  // The object carries comments between entries, so it is edited as text:
  // evaluate it to know what is there, then add a name inside an existing
  // "id": [ … ] array or append a new entry before the closing brace.
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const map = ctx.window.challengeCompanies;
  let added = 0;
  const appended = [];
  for (const [name, ids] of Object.entries(NEW_COMPANY_TAGS)) {
    for (const id of ids) {
      const k = String(id);
      if (map[k] && map[k].includes(name)) continue;
      if (map[k]) {
        const re = new RegExp(`("${k}"\\s*:\\s*\\[)([^\\]]*)(\\])`);
        src = src.replace(re, (m, a, body, c) => `${a}${body.replace(/\s*$/, '')},\n    ${JSON.stringify(name)}\n  ${c}`);
        map[k].push(name);
      } else {
        map[k] = [name];
        appended.push(k);
      }
      added++;
    }
  }
  if (appended.length) {
    const close = src.lastIndexOf('}');
    const before = src.slice(0, close).replace(/\s*$/, '');
    const entries = appended.map(k => `  "${k}": ${JSON.stringify(map[k], null, 2).replace(/\n/g, '\n  ')}`).join(',\n');
    src = `${before},\n${entries}\n${src.slice(close)}`;
  }
  if (!src.includes(TAG_MARK)) {
    const note = `${TAG_MARK}: DoorDash, Goldman Sachs,
// Walmart, TikTok, LinkedIn, Microsoft and Bloomberg. Each set is chosen
// against the SQL topics and data shape that company's dated sources report
// (src/data/company-interviews.js, docs/reads/company-research-2026-09-13.md),
// balanced Easy → Hard so a free visitor can start it: DoorDash on orders with
// window functions and month buckets; Goldman on dedup, latest record, running
// totals and salary tables; Walmart on retail joins, HAVING and top-N per
// category; TikTok on activation cohorts, day-level windows and ranking ties;
// LinkedIn on joins, HAVING, "has all of", self-joins and 30-day sign-up
// windows; Microsoft on joins, conditional aggregation and relational
// division; Bloomberg on time-bucketed financial aggregation and ranking.
// These are SQL Quest challenges matched to reported patterns, never a claim
// that the company asked them. Preserve on regeneration.
`;
    const at = src.indexOf('window.challengeCompanies');
    src = src.slice(0, at) + note + src.slice(at);
  }
  fs.writeFileSync(TAGS_FILE, src);
  return added;
}

// ── 2. the bank ────────────────────────────────────────────────────────────
export function loadBank() {
  const ctx = { window: {}, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  for (const f of ['src/data/challenges.js', 'src/data/sector-challenges.js', 'src/data/challenge-companies.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  }
  const byId = new Map();
  for (const c of [...ctx.window.challengesData, ...(ctx.window.sectorChallengesData || [])]) byId.set(c.id, c);
  return { byId, tags: ctx.window.challengeCompanies };
}

const DIFF_RANK = { Easy: 0, Medium: 1, Hard: 2 };
const resolve = raw => SKILL_TO_RADAR[raw] || SKILL_TO_RADAR[mapTopicToSkill(raw || '')] || null;
const playableFree = c => c.difficulty !== 'Hard' || isFreePreview(c);

export function facts(bank, name) {
  const tagged = Object.keys(bank.tags)
    .filter(id => (bank.tags[id] || []).some(n => n.toLowerCase() === name.toLowerCase()))
    .map(id => bank.byId.get(Number(id))).filter(Boolean);
  const counts = {};
  for (const c of tagged) {
    for (const k of new Set([...(c.skills || []), c.category].filter(Boolean).map(resolve).filter(Boolean))) counts[k] = (counts[k] || 0) + 1;
  }
  const dist = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || CANONICAL_SKILLS.indexOf(a[0]) - CANONICAL_SKILLS.indexOf(b[0]))
    .map(([skill, count]) => ({ skill, count, share: Math.round((100 * count) / tagged.length) }));
  const ordered = tagged.slice().sort((a, b) =>
    (DIFF_RANK[a.difficulty] * 2 + (a.difficulty === 'Hard' && !isFreePreview(a) ? 1 : 0))
    - (DIFF_RANK[b.difficulty] * 2 + (b.difficulty === 'Hard' && !isFreePreview(b) ? 1 : 0))
    || a.id - b.id);
  const by = d => tagged.filter(c => c.difficulty === d).length;
  return { n: tagged.length, free: tagged.filter(playableFree).length, easy: by('Easy'), medium: by('Medium'), hard: by('Hard'), dist, ordered };
}

// ── 3. shared pieces (also used to inject modules into the older pages) ────
export const SKILL_SUB = {
  'Querying Basics': 'SELECT, WHERE, ORDER BY, LIMIT, DISTINCT',
  'Aggregation & Grouping': 'COUNT, SUM, AVG, MIN, MAX, GROUP BY, HAVING',
  'Joins': 'INNER and LEFT JOIN, self-joins, and the fan-out they cause',
  'Window Functions': 'ROW_NUMBER, RANK, LAG, LEAD and frames over PARTITION BY',
  'Subqueries & CTEs': 'WITH, derived tables, scalar and correlated subqueries, EXISTS',
  'Date Functions': 'truncation, extraction, date ranges and rolling windows',
  'Conditional Logic': 'CASE for row labels, buckets and conditional aggregation',
  'NULL Handling': 'IS NULL, COALESCE, NULLIF, and what COUNT skips',
  'String Functions': 'SUBSTR, INSTR, LIKE, TRIM and concatenation',
};
export const SKILL_PAGE = {
  'Joins': ['/challenges/joins/', 'JOIN practice'],
  'Window Functions': ['/challenges/window-functions/', 'Window function practice'],
  'Subqueries & CTEs': ['/challenges/cte/', 'CTE practice'],
  'Aggregation & Grouping': ['/challenges/aggregation/', 'GROUP BY exercises'],
  'Conditional Logic': ['/challenges/case-when/', 'CASE WHEN practice'],
  'Date Functions': ['/challenges/date-functions/', 'Date function practice'],
  'NULL Handling': ['/challenges/null-handling/', 'NULL handling practice'],
  'String Functions': ['/challenges/string-functions/', 'String function practice'],
  'Querying Basics': ['/sql-exercises/', 'SQL practice questions'],
};

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsq = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

export function readinessBlock({ slug, name, src }) {
  return `<!-- company-readiness:start -->
<section id="readiness" style="border-top:1px solid rgba(255,255,255,.04);"><div class="sec" style="padding:56px 24px;text-align:center;">
  <p class="sl" style="color:#8b98ab;margin-bottom:10px;">Skillmap</p>
  <h2 class="fd" style="font-size:clamp(26px,3.2vw,38px);font-weight:800;color:#e2e8f0;margin-bottom:12px;">How ready are you for the ${esc(name)} SQL round?</h2>
  <p style="font-size:15px;color:#94a3b8;max-width:620px;margin:0 auto 26px;line-height:1.75;">Ten questions, no signup. You get a readiness score weighted to the SQL this page covers, your Skillmap across joins, window functions, aggregation and the rest, and the weakest skill to practise first.</p>
  <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
    <a href="/sql-interview-readiness-test/?company=${slug}" class="btn bp" data-track="cta_readiness_${slug.replace(/-/g, '_')}">Check my ${esc(name)} readiness</a>
    <a href="/app/?company=${encodeURIComponent(name)}&amp;src=${src}" class="btn bo" data-track="cta_start_set_${slug.replace(/-/g, '_')}">Start the ${esc(name)} set</a>
  </div>
</div></section>
<!-- company-readiness:end -->`;
}

let QSLUGS = null;
const qslug = id => {
  if (!QSLUGS) QSLUGS = questionSlugs(loadQuestionBank().bank);
  return QSLUGS.get(id);
};

export function topicLinksBlock({ name, dist, ordered = [] }) {
  const qs = ordered.filter(c => qslug(c.id))
    .map(c => `<a href="/questions/${qslug(c.id)}/" style="color:#c084fc;text-decoration:none;">${esc(c.title)}</a>`);
  const links = dist.filter(d => SKILL_PAGE[d.skill] && d.skill !== 'Querying Basics').slice(0, 5)
    .map(d => `<a href="${SKILL_PAGE[d.skill][0]}" style="color:#c084fc;text-decoration:none;font-weight:600;">${SKILL_PAGE[d.skill][1]}</a>`);
  return `<!-- company-topics:start -->
<p data-crosslink="topics" style="margin:28px auto;max-width:720px;padding:16px 20px;border:1px solid rgba(124,58,237,.25);border-radius:12px;background:rgba(124,58,237,.06);font-size:14px;line-height:1.8;color:#94a3b8;">Drill the skills the ${esc(name)} set leans on, one at a time: ${links.join(' · ')} — or browse every <a href="/sql-exercises/" style="color:#c084fc;text-decoration:none;font-weight:600;">SQL practice question</a>.</p>${qs.length ? `
<p data-crosslink="questions" style="margin:-12px auto 28px;max-width:720px;padding:0 20px;font-size:13px;line-height:1.9;color:#8b98ab;">Every question in the ${esc(name)} set, one page each with the schema and a hint: ${qs.join(' · ')}.</p>` : ''}
<!-- company-topics:end -->`;
}

export function breadcrumbLd(slug, name) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'SQL Interview Prep', item: `${SITE}/sql-interview-prep/` },
      { '@type': 'ListItem', position: 3, name: `${name} SQL Interview Questions`, item: `${SITE}/${slug}-sql-interview/` },
    ],
  };
}

// ── 4. the page ────────────────────────────────────────────────────────────
function faqFor(key, d, f) {
  const src = Object.values(d.sources);
  const newest = src.map(s => s[2]).filter(x => /20\d\d/.test(x)).map(x => Number(x.match(/20\d\d/)[0])).sort().pop();
  const top = f.dist.slice(0, 4).map(x => `${x.skill} (${x.count})`).join(', ');
  return [
    [`How does the ${d.name} SQL interview work?`, `${d.name} does not publish the format, so everything on this page is what candidates and prep guides have described publicly, with the source and date beside each fact. In short: ${d.format.map(r => r[1]).join(' ')} Sources are dated up to ${newest}; formats change, so treat every specific as reported, not official.`],
    [`What SQL topics come up in ${d.name} interviews?`, `Reported most often: ${d.reportedTopics.slice(0, 5).join('; ')}. ${d.difficulty}`],
    [`Are these the real ${d.name} interview questions?`, `No. The question shapes on this page are paraphrased from the public sources cited beside them, and the practice set is ${f.n} SQL Quest challenges chosen because their SQL matches those reported patterns — not questions ${d.name} has asked. By skill, the set leans on ${top}.`],
    [`Is the ${d.name} practice set free?`, `${f.free} of the ${f.n} challenges play free with no signup — every Easy and Medium plus any free Hard previews. The rest sit on Pro ($29/mo or $99/yr). Everything runs in the browser, and the readiness check on this page needs no account.`],
  ];
}

export function renderPage(key, d, f) {
  const slug = `${key}-sql-interview`;
  const url = `${SITE}/${slug}/`;
  const title = `${d.title} | SQL Quest`;
  const faqs = faqFor(key, d, f);
  const srcKeys = Object.keys(d.sources);
  const cite = keys => keys.length
    ? keys.map(k => `<a href="#src-${k}" style="color:#8b98ab;text-decoration:none;font-size:11px;vertical-align:super;">[${srcKeys.indexOf(k) + 1}]</a>`).join('')
    : '<span style="color:#8b98ab;font-size:11px;"> (no reliable source)</span>';
  const formatRows = d.format.map(r => `      <tr><th scope="row" style="text-align:left;vertical-align:top;padding:14px 16px;color:#e2e8f0;font-weight:700;font-size:14px;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,.06);">${esc(r[0])}</th><td style="padding:14px 16px;color:#94a3b8;font-size:14px;line-height:1.7;border-bottom:1px solid rgba(255,255,255,.06);">${esc(r[1])}${cite(r[2])}</td></tr>`).join('\n');
  const sourcesLine = srcKeys.map((k, i) => {
    const [label, href, date] = d.sources[k];
    const text = `${esc(label)} (${esc(date)})`;
    return `<li id="src-${k}" style="margin:4px 0;">[${i + 1}] ${href ? `<a href="${href}" rel="nofollow noopener" target="_blank" style="color:#94a3b8;">${text}</a>` : text}</li>`;
  }).join('');
  const sourcesSentence = `Sources: ${srcKeys.map(k => `${d.sources[k][0]} (${d.sources[k][2]})`).join('; ')}.`;
  const shapes = d.shapes.map(s => `      <li style="margin:0 0 12px;line-height:1.7;">${esc(s[0])}${cite([s[1]])}</li>`).join('\n');
  const reported = d.reportedTopics.map((t, i) => `<li style="margin:0 0 8px;"><span class="fm" style="color:#8b98ab;margin-right:8px;">${i + 1}</span>${esc(t)}</li>`).join('');
  const topicsJs = f.dist.map((x, i) => `  ['${x.share}%','${jsq(x.skill)}','${x.count} of the ${f.n} · ${jsq(SKILL_SUB[x.skill] || '')}','${['#c084fc', '#a78bfa', '#7c3aed', '#c084fc'][i % 4]}']`).join(',\n');
  const fq = f.ordered.slice(0, 6);
  const fqJs = fq.map(c => `  {id:${c.id},q:'${jsq(c.title)}',d:'${c.difficulty}',free:${playableFree(c)},t:[${(c.skills || []).slice(0, 3).map(t => `'${jsq(t)}'`).join(',')}]}`).join(',\n');
  const faqJs = faqs.map(([q, a]) => `  ['${jsq(q)}','${jsq(a)}']`).join(',\n');

  const ld = [
    breadcrumbLd(key, d.name),
    {
      '@context': 'https://schema.org', '@type': 'LearningResource',
      name: `${d.name} SQL Interview Questions`,
      description: d.description,
      url, inLanguage: 'en', isAccessibleForFree: true,
      learningResourceType: 'Practice problems',
      educationalLevel: 'Intermediate',
      teaches: f.dist.map(x => x.skill),
      provider: { '@type': 'Organization', name: 'SQL Quest', url: `${SITE}/` },
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ].map(o => `  <script type="application/ld+json">\n  ${JSON.stringify(o, null, 2).replace(/\n/g, '\n  ')}\n  </script>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- GENERATED by scripts/build-company-pages.mjs from src/data/company-interviews.js — edit the data, not this file. -->
  <script src="/ref-track.js"></script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(d.description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="SQL Quest">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(d.description)}">
  <meta property="og:image" content="${SITE}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(d.description)}">
  <meta name="twitter:image" content="${SITE}/og-image.png">
  <script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>
  <script defer src="/_vercel/insights/script.js"></script>
${ld}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{background:#06060f;color:#e2e8f0;font-family:'DM Sans',sans-serif;overflow-x:hidden}
    .fd{font-family:'Space Grotesk',sans-serif}.fm{font-family:'JetBrains Mono',monospace}
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(6,6,15,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,.06)}.ni{max-width:1200px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}.nl{display:flex;align-items:center;gap:22px}.nl a{color:#94a3b8;text-decoration:none;font-size:14px;font-weight:500}.nl a:hover{color:#e2e8f0}
    .btn{display:inline-flex;align-items:center;gap:8px;border-radius:12px;font-weight:700;cursor:pointer;text-decoration:none;border:none;transition:transform .15s ease-out}.bp{padding:13px 28px;font-size:15px;background:#FFE34D;color:#0E0F13}.bp:hover{transform:translateY(-1px)}.bo{padding:12px 24px;font-size:14px;background:transparent;color:#c084fc;border:1px solid rgba(124,58,237,.4)}
    .sec{max-width:1100px;margin:0 auto;padding:56px 24px}.sl{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8b98ab}.st{font-size:clamp(26px,3.2vw,40px);font-weight:800;margin-top:10px;line-height:1.15}
    .qg{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}.qc{background:rgba(10,10,25,.5);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:18px}.qc:hover{border-color:rgba(192,132,252,.35)}
    .db{font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px}.dh{background:rgba(192,132,252,.14);color:#c084fc}.dm{background:rgba(255,227,77,.12);color:#FFE34D}.de{background:rgba(34,197,94,.15);color:#22c55e}.dp{background:rgba(255,255,255,.08);color:#94a3b8}.tt{font-size:11px;padding:3px 10px;border-radius:100px;background:rgba(124,58,237,.1);color:#a78bfa;font-weight:600}
    .tg{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}.tc{background:rgba(10,10,25,.6);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:20px 18px}
    .tbl{overflow-x:auto;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(10,10,25,.55)}.tbl table{width:100%;border-collapse:collapse;min-width:560px}
    .fi{border-bottom:1px solid rgba(255,255,255,.06);padding:18px 0;cursor:pointer}.fh{display:flex;justify-content:space-between;align-items:center}.ftg{color:#c084fc;font-size:22px;flex-shrink:0}.fa{max-height:0;overflow:hidden;transition:max-height .3s ease}.fi.o .fa{max-height:600px}
    .qc.qa{display:block;text-decoration:none}
    .ft{border-top:1px solid rgba(255,255,255,.06);padding:40px 24px;text-align:center}.flk{margin-top:16px;display:flex;justify-content:center;gap:22px;flex-wrap:wrap}.flk a{color:#8b98ab;text-decoration:none;font-size:13px}
    @media(max-width:768px){.nl a:not(.btn){display:none}}
  </style>
</head>
<body>

<nav class="nav" id="nav"><div class="ni">
  <a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit;"><div style="width:34px;height:34px;border-radius:10px;background:#7c3aed;display:flex;align-items:center;justify-content:center;color:#fff;"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg></div><span class="fd" style="font-size:19px;font-weight:800;">SQL Quest</span></a>
  <div class="nl"><a href="#format">Format</a><a href="#topics">Topics</a><a href="#questions">Questions</a><a href="#faq">FAQ</a><a href="/sql-interview-readiness-test/?company=${key}" class="btn bp" style="font-size:13px;padding:9px 18px;">Check readiness</a></div>
</div></nav>

<section class="hero"><div class="sec" style="padding-top:128px;padding-bottom:40px;">
  <p style="font-size:13px;color:#8b98ab;margin-bottom:14px;"><a href="/" style="color:#8b98ab;text-decoration:none;">SQL Quest</a> › <a href="/sql-interview-prep/" style="color:#8b98ab;text-decoration:none;">SQL Interview Prep</a> › ${esc(d.name)}</p>
  <h1 class="fd" style="font-size:clamp(36px,5vw,58px);font-weight:800;line-height:1.08;margin-bottom:18px;">${esc(d.name)} SQL Interview <span style="color:#FFE34D;">Questions</span></h1>
  <p style="font-size:18px;line-height:1.75;color:#94a3b8;max-width:720px;margin-bottom:28px;">${esc(d.hero)}</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;">
    <a href="/app/?company=${encodeURIComponent(d.name)}&amp;src=${slug}" class="btn bp" data-track="cta_hero_primary">Start the ${esc(d.name)} set — free</a>
    <a href="/sql-interview-readiness-test/?company=${key}" class="btn bo" data-track="cta_hero_readiness">Check my readiness</a>
  </div>
  <p style="font-size:13px;color:#8b98ab;margin-top:18px;">${f.n} practice challenges · ${f.easy} Easy / ${f.medium} Medium / ${f.hard} Hard · ${f.free} play free · runs in the browser</p>
</div></section>

<section id="format" style="border-top:1px solid rgba(255,255,255,.04);"><div class="sec">
  <span class="sl">How the interview runs</span>
  <h2 class="st fd">The ${esc(d.name)} SQL interview, as candidates report it</h2>
  <p style="font-size:15px;color:#94a3b8;margin:14px 0 22px;max-width:760px;line-height:1.75;">${esc(d.name)} does not publish the format. Each row is what candidates and prep guides have described publicly, with its source; where sources disagree, the row says so. Formats change — treat every specific as reported, not official.</p>
  <div class="tbl"><table>
    <tbody>
${formatRows}
    </tbody>
  </table></div>
  <ol style="list-style:none;margin-top:18px;font-size:12px;color:#8b98ab;line-height:1.6;">${sourcesLine}</ol>
  <p style="font-size:12px;color:#5b6577;margin-top:10px;">${esc(sourcesSentence)} Accessed 13 Sep 2026.</p>
</div></section>

<section id="topics" style="border-top:1px solid rgba(255,255,255,.04);"><div class="sec">
  <span class="sl">The SQL that comes up</span>
  <h2 class="st fd">What ${esc(d.name)} SQL questions test</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px;margin-top:22px;">
    <div>
      <p style="font-size:14px;color:#e2e8f0;font-weight:700;margin-bottom:12px;">Reported most often, in order</p>
      <ul style="list-style:none;font-size:15px;color:#94a3b8;line-height:1.6;">${reported}</ul>
      <p style="font-size:14px;color:#94a3b8;margin-top:16px;line-height:1.7;"><strong style="color:#e2e8f0;">Difficulty:</strong> ${esc(d.difficulty)} The data is ${esc(d.dataShape)}.</p>
    </div>
    <div>
      <p style="font-size:14px;color:#e2e8f0;font-weight:700;margin-bottom:12px;">Our ${esc(d.name)} practice set, by skill</p>
      <p style="font-size:13px;color:#8b98ab;line-height:1.6;margin-bottom:12px;">The ${f.n} SQL Quest challenges tagged ${esc(d.name)}, resolved onto the nine Skillmap skills. A challenge exercises several skills, so shares do not sum to 100%. This is the composition of the practice set on this page, not a measurement of ${esc(d.name)}&rsquo;s interview.</p>
      <div class="tg" id="topic-cards"></div>
    </div>
  </div>
</div></section>

<section id="questions" style="border-top:1px solid rgba(255,255,255,.04);"><div class="sec">
  <span class="sl">Sample questions</span>
  <h2 class="st fd">${esc(d.name)} SQL question shapes, and where to practise them</h2>
  <p style="font-size:14px;color:#e2e8f0;font-weight:700;margin:22px 0 12px;">Shapes candidates and guides report (paraphrased)</p>
  <ul style="font-size:15px;color:#94a3b8;padding-left:20px;max-width:820px;">
${shapes}
  </ul>
  <p style="font-size:14px;color:#e2e8f0;font-weight:700;margin:26px 0 12px;">Practise now — SQL Quest challenges matched to those patterns</p>
  <p style="font-size:13px;color:#8b98ab;margin-bottom:14px;max-width:760px;line-height:1.6;">Our challenges, chosen because their SQL matches the shapes above; not questions ${esc(d.name)} has asked. Each card opens the challenge in the browser — no signup.</p>
  <div class="qg" id="question-cards"></div>
  <div style="margin-top:22px;"><a href="/app/?company=${encodeURIComponent(d.name)}&amp;src=${slug}" class="btn bo" data-track="cta_questions_all">Open all ${f.n} ${esc(d.name)} practice challenges →</a></div>
</div></section>

${readinessBlock({ slug: key, name: d.name, src: slug })}

<section id="faq" style="border-top:1px solid rgba(255,255,255,.04);"><div class="sec" style="max-width:760px;" id="faqc">
  <h2 class="fd" style="font-size:30px;font-weight:800;text-align:center;margin-bottom:28px;">Frequently asked</h2>
</div></section>

${topicLinksBlock({ name: d.name, dist: f.dist, ordered: f.ordered })}

<section class="cs"><div class="sec" style="text-align:center;padding:64px 24px;border-top:1px solid rgba(255,255,255,.04);">
  <h2 class="fd" style="font-size:clamp(28px,4vw,44px);font-weight:800;line-height:1.15;margin-bottom:14px;">Ready for the ${esc(d.name)} SQL round?</h2>
  <p style="font-size:16px;color:#94a3b8;max-width:560px;margin:0 auto 26px;">No signup, no card. Start with the free challenges in the set; the Skillmap shows what to fix before the interview.</p>
  <a href="/app/?company=${encodeURIComponent(d.name)}&amp;src=${slug}" class="btn bp" data-track="cta_closing">Start the ${esc(d.name)} set — free</a>
</div></section>

<footer class="ft"><p class="fd" style="font-size:16px;font-weight:800;">SQL Quest</p><p style="font-size:13px;color:#7f8da1;margin-top:6px;">Personalized SQL interview practice.</p>
<div class="flk"><a href="/sql-interview-prep/">SQL Interview Prep</a><a href="/sql-exercises/">SQL Practice Questions</a><a href="/sql-interview-readiness-test/">Readiness Test</a><a href="/best-sql-practice-sites/">Best SQL Practice Sites</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/refund/">Refund Policy</a></div><p style="font-size:11px;color:#79879b;margin-top:20px;">© 2026 SQL Quest</p></footer>

<script>
// GENERATED FROM THE BANK — do not hand-edit. Bound by tests/company-pages.test.js.
const TOPICS=[
${topicsJs}
];
document.getElementById('topic-cards').innerHTML=TOPICS.map(t=>\`<div class="tc"><p class="fd" style="font-size:28px;font-weight:800;color:\${t[3]}">\${t[0]}</p><p style="font-size:13px;font-weight:700;color:#e2e8f0;margin-top:4px">\${t[1]}</p><p style="font-size:11px;color:#8b98ab;margin-top:6px;line-height:1.5">\${t[2]}</p></div>\`).join('');

// GENERATED FROM THE BANK — real SQL Quest challenges tagged ${d.name}, Easy → Hard.
const FQ=[
${fqJs}
];
document.getElementById('question-cards').innerHTML=FQ.map(f=>\`<a class="qc qa" href="/app/?src=${slug}&challenge=\${f.id}"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px"><span style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8b98ab">SQL Quest challenge #\${f.id}</span><span style="display:flex;gap:6px"><span class="db \${f.d==='Hard'?'dh':f.d==='Easy'?'de':'dm'}">\${f.d}</span><span class="db \${f.free?'de':'dp'}">\${f.free?'Free':'Pro'}</span></span></div><p style="font-size:15px;font-weight:700;color:#e2e8f0;line-height:1.5;margin-bottom:10px">\${f.q}</p><div style="display:flex;gap:6px;flex-wrap:wrap">\${f.t.map(t=>\`<span class="tt">\${t}</span>\`).join('')}</div></a>\`).join('');

// GENERATED — mirrors the FAQPage JSON-LD in <head> exactly.
const FAQS=[
${faqJs}
];
const faqc=document.getElementById('faqc');
FAQS.forEach(f=>{const d=document.createElement('div');d.className='fi';d.innerHTML=\`<div class="fh"><p style="font-size:16px;font-weight:700;color:#e2e8f0;padding-right:16px">\${f[0]}</p><span class="ftg">+</span></div><div class="fa"><p style="font-size:14px;line-height:1.8;color:#94a3b8;padding-top:12px">\${f[1]}</p></div>\`;d.addEventListener('click',()=>d.classList.toggle('o'));faqc.appendChild(d);});
</script>
</body>
</html>
`;
}

// ── 5. shared modules for the pages that predate the template ─────────────
// The 23 older company pages keep their copy (several rank and convert); they
// get the template's readiness/Skillmap block after their question cards and
// the topic-links strip before the related-companies strip. Idempotent.
export function injectModules(bank) {
  const done = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(x => /-sql-interview\.html$/.test(x))) {
    const key = f.replace(/-sql-interview\.html$/, '');
    if (COMPANY_INTERVIEWS[key]) continue;
    const file = path.join(ROOT, 'src', f);
    let html = fs.readFileSync(file, 'utf8');
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const name = ((title.match(/^(.+?)\s+SQL\b/) || [])[1] || key).trim();
    const fx = facts(bank, name);
    html = html.replace(/<!-- company-readiness:start -->[\s\S]*?<!-- company-readiness:end -->\n?/, '');
    html = html.replace(/<!-- company-topics:start -->[\s\S]*?<!-- company-topics:end -->\n?/, '');
    const faqAnchor = html.indexOf('<section id="faq"');
    if (faqAnchor < 0) continue;
    html = html.slice(0, faqAnchor) + readinessBlock({ slug: key, name, src: `${key}-sql-interview` }) + '\n\n' + html.slice(faqAnchor);
    const rel = html.indexOf('<!-- related-companies:start -->');
    const at = rel >= 0 ? rel : html.indexOf('<section class="cs">');
    if (at >= 0) html = html.slice(0, at) + topicLinksBlock({ name, dist: fx.dist, ordered: fx.ordered }) + '\n' + html.slice(at);
    fs.writeFileSync(file, html);
    done.push(key);
  }
  return done;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const added = mergeTags();
  const bank = loadBank();
  for (const [key, d] of Object.entries(COMPANY_INTERVIEWS)) {
    const f = facts(bank, d.name);
    const file = path.join(ROOT, 'src', `${key}-sql-interview.html`);
    let html = renderPage(key, d, f);
    // Keep an existing related-companies strip (the cross-link generator owns
    // it and inserts it before <section class="cs">).
    if (fs.existsSync(file)) {
      const old = fs.readFileSync(file, 'utf8');
      const m = old.match(/<!-- related-companies:start -->[\s\S]*?<!-- related-companies:end -->\n?/);
      if (m) html = html.replace('<section class="cs"', `${m[0]}<section class="cs"`);
    }
    fs.writeFileSync(file, html);
    console.log(`[company-pages] ${key}: ${f.n} tagged (E${f.easy}/M${f.medium}/H${f.hard}, ${f.free} free)`);
  }
  console.log(`[company-pages] ${added} new tags merged`);
  const injected = injectModules(loadBank());
  console.log(`[company-pages] shared modules on ${injected.length} older pages`);
}
