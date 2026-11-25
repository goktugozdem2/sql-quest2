#!/usr/bin/env node
/**
 * /sql-ddl-dml-practice/ (C6, 2026-11-25): the guide to the state-graded
 * DDL/DML set — what each statement does on SQLite, the one trap in each, and
 * the practice behind it.
 *
 * Copy and every statement: src/data/sql-ddl-dml.js. Each statement there is
 * run on a fresh copy of the dataset by tests/sql-ddl-dml-page.test.js, and
 * the result the page prints is the one the test pins.
 *
 * Practice links: `practice` ids are linked only when the id is in the live
 * bank as a state-graded challenge (`practiceItems`), so an id from a set that
 * has not merged yet renders nothing rather than a dead link. A locked Hard is
 * named with "Pro" and no link: the app swaps a cold visitor on a Hard deep
 * link to an unrelated free preview (A1 on #249).
 *
 * Writes src/sql-ddl-dml-practice.html (build-static-pages.js copies it to
 * public/), the sitemap block <!-- ddl-dml:start/end -->, and the one-line
 * links on /sql-exercises/ and /challenges/ between
 * <!-- ddl-dml-link:start/end --> in their SOURCE pages. Runs in
 * `npm run build` before build-static-pages.js. Do not hand-edit the page.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { esc, inline, shell, article, faqPage, faqSection, writeSitemapBlock, ROOT, SITE } from './guide-page-shell.mjs';
import {
  DDL_DML_SLUG, DDL_DML_PUBLISHED, DDL_DML_APP_SRC, DDL_DML_TITLE, DDL_DML_H1, DDL_DML_DESCRIPTION,
  DDL_DML_INTRO, DDL_DML_SECTIONS, DDL_DML_DIALECT, ddlDmlFaq,
} from '../src/data/sql-ddl-dml.js';
import { freeSolvesLabel } from '../src/utils/display-count.js';
import { isFreePreview } from '../src/utils/challenge-order.js';

export const SRC_PAGE = path.join(ROOT, 'src', `${DDL_DML_SLUG}.html`);
export const URL_PATH = `/${DDL_DML_SLUG}/`;

export function loadBank() {
  const ctx = { window: { challengesData: [] }, console: { log() {}, warn() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/challenges.js'), 'utf8'), ctx);
  return ctx.window.challengesData;
}

/** The practice ids that exist in `bank` as state-graded challenges, in the order given. */
export function practiceItems(ids, bank) {
  const byId = new Map(bank.map(c => [c.id, c]));
  return ids.map(id => byId.get(id)).filter(c => c && c.grade === 'state');
}

/** A row a cold visitor can open (not a locked Hard). */
export const openable = c => c.difficulty !== 'Hard' || isFreePreview(c);
export const appHref = c => `/app/?challenge=${c.id}&amp;src=${DDL_DML_APP_SRC}`;

const KEYWORDS = new Set(('SELECT FROM WHERE AND OR NOT IN EXISTS JOIN LEFT INNER ON AS GROUP BY ORDER HAVING WITH ' +
  'COUNT SUM AVG ROUND COALESCE IS NULL BETWEEN DESC ASC LIMIT CASE WHEN THEN ELSE END DISTINCT UNION ' +
  'INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX UNIQUE ALTER ADD COLUMN PRIMARY KEY REFERENCES ' +
  'CHECK DEFAULT CONFLICT DO BEGIN ROLLBACK COMMIT PRAGMA EXPLAIN QUERY PLAN INTEGER REAL TEXT').split(' '));

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

const cell = v => (v === null ? '<td><em>NULL</em></td>' : `<td>${esc(String(v))}</td>`);
const resultTable = r => `<div class="tbl"><table><thead><tr>${r.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${r.rows.map(row => `<tr>${row.map(cell).join('')}</tr>`).join('')}</tbody></table></div>`;

const STEP_LABEL = { right: ['good', 'Right'], alt: ['good', 'Also right'], safety: ['good', 'Safety net'], trap: ['bad', 'The trap'] };

function stepHtml(s) {
  const [cls, tag] = STEP_LABEL[s.kind];
  const parts = [`  <p class="lbl ${cls}">${tag}: ${esc(s.label)}</p>`];
  if (s.sql) parts.push(`  <pre class="${cls}"><code>${highlight(s.sql)}</code></pre>`);
  if (s.check) parts.push(`${s.sql ? '  <p class="res">Then:</p>\n' : ''}  <pre><code>${highlight(s.check)}</code></pre>`);
  parts.push(s.error
    ? `  <p class="res">SQLite: <strong>${esc(s.error)}</strong></p>`
    : `  ${resultTable(s.result)}`);
  return parts.join('\n');
}

function practiceHtml(items) {
  if (!items.length) return '';
  const one = c => openable(c)
    ? `<a href="${appHref(c)}" data-track="cta_ddl_dml_item">${esc(c.title)}</a> (${esc(c.difficulty)})`
    : `${esc(c.title)} (${esc(c.difficulty)}, Pro)`;
  return `  <p class="lead" data-ddl-practice="true">Practise it: ${items.map(one).join(' · ')}.</p>`;
}

export function pageModel(bank = loadBank()) {
  const sections = DDL_DML_SECTIONS.map(s => ({ ...s, items: practiceItems(s.practice, bank) }));
  const all = [...new Map(sections.flatMap(s => s.items).map(c => [c.id, c])).values()];
  const first = all.filter(openable).sort((a, b) => ['Easy', 'Medium', 'Hard'].indexOf(a.difficulty) - ['Easy', 'Medium', 'Hard'].indexOf(b.difficulty) || a.id - b.id)[0] || null;
  const faq = ddlDmlFaq({ freeSolves: freeSolvesLabel(), hasLockedHard: all.some(c => !openable(c)) });
  return { sections, all, first, faq };
}

export function renderDdlDmlPage(bank = loadBank()) {
  const url = `${SITE}${URL_PATH}`;
  const { sections, all, first, faq } = pageModel(bank);
  const crumbLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'SQL Quest', item: `${SITE}/` },
    { '@type': 'ListItem', position: 2, name: 'SQL exercises', item: `${SITE}/sql-exercises/` },
    { '@type': 'ListItem', position: 3, name: 'SQL DDL and DML practice', item: url },
  ] };
  const ldObjects = [crumbLd, article({ headline: DDL_DML_H1, description: DDL_DML_DESCRIPTION, url, published: DDL_DML_PUBLISHED }), faqPage(faq)];
  const cta = first
    ? `<a class="btn bp" href="${appHref(first)}" data-track="cta_ddl_dml_start">Start with ${esc(first.title)} →</a>`
    : `<a class="btn bp" href="/app/?src=${DDL_DML_APP_SRC}" data-track="cta_ddl_dml_start">Open the practice app →</a>`;
  const toc = sections.map(s => `<li><a href="#${s.id}">${esc(s.h2.split(':')[0])}</a> <span class="tag">${s.kind}</span></li>`).join('');
  const body = `  <h1 class="fd">${esc(DDL_DML_H1)}</h1>
  <p class="answer" data-answer-first="true">${inline(DDL_DML_INTRO[0])}</p>
  <p class="lead">${inline(DDL_DML_INTRO[1])}</p>
  <p style="margin-top:22px;">${cta}</p>

  <h2 class="fd">On this page</h2>
  <ol class="steps">${toc}</ol>
${sections.map(s => `
  <h2 class="fd" id="${s.id}">${esc(s.h2)}</h2>
  <p class="lead">${inline(s.what)}</p>
${s.setup ? `  <p class="lbl">Setup for this example</p>\n  <pre><code>${highlight(s.setup)}</code></pre>\n` : ''}${s.steps.map(stepHtml).join('\n')}
  <p class="rule">${inline(s.trap)}${s.trapLink ? ` <a href="${s.trapLink.href}">${esc(s.trapLink.text)}</a>.` : ''}</p>
${practiceHtml(s.items)}`).join('\n')}

  <h2 class="fd">Other databases</h2>
  <p class="lead">${esc(DDL_DML_DIALECT)}</p>

  <div class="box" style="margin-top:36px;text-align:center;">
    <p class="fd" style="font-size:19px;font-weight:800;margin-bottom:6px;">Practise on a copy you cannot break</p>
    <p style="font-size:14px;color:#94a3b8;margin-bottom:16px;">${all.length ? `${all.length} questions graded on what your tables hold after your statements run.` : 'Questions graded on what your tables hold after your statements run.'} Every attempt starts from fresh data.</p>
    ${cta}
  </div>

${faqSection(faq)}

  <h2 class="fd">Related</h2>
  <div class="rel">
    <a href="/sql-find-duplicates/">Find duplicate rows in SQL<span>The SELECT before the DELETE</span></a>
    <a href="/sql-not-in-null/">NOT IN with a NULL<span>SQL trap</span></a>
    <a href="/sql-query-optimizer/">SQL query optimizer<span>Free tool</span></a>
    <a href="/sql-exercises/">SQL practice questions<span>By topic and difficulty</span></a>
  </div>`;
  return shell({
    generator: 'scripts/build-ddl-dml-page.mjs', dataFile: 'src/data/sql-ddl-dml.js',
    title: DDL_DML_TITLE, description: DDL_DML_DESCRIPTION, url, ldObjects, crumb: 'SQL DDL and DML practice', body,
    parent: { href: '/sql-exercises/', name: 'SQL exercises' },
  });
}

// ---- the two links in, written into the SOURCE pages between markers ----

export const LINK_START = '<!-- ddl-dml-link:start -->';
export const LINK_END = '<!-- ddl-dml-link:end -->';
const P_STYLE = 'max-width:860px;margin:10px auto 0;font-size:14px;color:#94a3b8;line-height:1.7;';
const A_STYLE = 'color:#c084fc;font-weight:600;';

export const LINK_TARGETS = [
  { file: 'sql-exercises.html', anchor: '<!-- topic-traps:end -->',
    html: `<p style="${P_STYLE}">Changing data rather than reading it: <a href="${URL_PATH}" data-track="cta_ddl_dml_page" style="${A_STYLE}">SQL DDL and DML practice</a> covers INSERT, UPDATE, DELETE, UPSERT, ALTER TABLE and CREATE INDEX, the trap in each, and questions graded on what your tables hold afterwards.</p>` },
  { file: 'challenges/index.html', anchor: '<p style="margin:0 auto 28px;"><a href="/questions/">',
    html: `<p style="margin:0 auto 18px;">Writing to tables instead of reading them: <a href="${URL_PATH}" data-track="cta_ddl_dml_page">INSERT, UPDATE, DELETE, UPSERT, ALTER and CREATE INDEX practice →</a></p>` },
];

/** Put (or refresh) the link block right after the anchor (the hub: right before it). */
export function withLink(html, target) {
  const block = `${LINK_START}${target.html}${LINK_END}`;
  const stripped = html.replace(new RegExp(`${LINK_START}[\\s\\S]*?${LINK_END}\\s*`), '');
  const i = stripped.indexOf(target.anchor);
  if (i < 0) throw new Error(`[ddl-dml-page] anchor not found in src/${target.file}: ${target.anchor}`);
  if (target.file === 'challenges/index.html') return `${stripped.slice(0, i)}${block}\n  ${stripped.slice(i)}`;
  const at = i + target.anchor.length;
  return `${stripped.slice(0, at)}\n  ${block}${stripped.slice(at)}`;
}

export const writeSitemap = () => writeSitemapBlock('ddl-dml', DDL_DML_SLUG, DDL_DML_PUBLISHED);

if (import.meta.url === `file://${process.argv[1]}`) {
  const bank = loadBank();
  fs.writeFileSync(SRC_PAGE, renderDdlDmlPage(bank));
  for (const t of LINK_TARGETS) {
    const f = path.join(ROOT, 'src', t.file);
    const html = fs.readFileSync(f, 'utf8');
    const next = withLink(html, t);
    if (next !== html) fs.writeFileSync(f, next);
  }
  writeSitemap();
  const { all } = pageModel(bank);
  console.log(`[ddl-dml-page] src/${DDL_DML_SLUG}.html · ${all.length} practice questions linked (${all.map(c => c.id).join(', ')}) · 2 source pages linked · sitemap block 1 URL`);
}
