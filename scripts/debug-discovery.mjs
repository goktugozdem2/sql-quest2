// Discovery for the Debug items on the static site (design PR #248) — and
// only while features.debugQuestions is true.
//
// The static pages cannot read a runtime flag, so the build reads it: every
// link to a Debug item is rendered at build time from src/data/feature-flags.js.
// Flag off (today): no page changes by a byte, so no lastmod moves and no
// crawler sees a link to an item the app does not show. Flag on: the five trap
// pages get "Fix this bug yourself: question N" (build-pattern-pages.mjs), and
// /sql-for-the-ai-era/ and /blog/validate-ai-generated-sql/ get one short
// section each (this file's main, run after build-static-pages.js, which
// writes into the built copies in public/, never into src/).
//
// Links go to /app/?challenge=<id>, the existing deep link: it starts guest
// mode, returns, and opens on the next run, so the free quota is read first.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { debugQuestionsOn } from '../src/utils/debug-questions.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');

export function readFlags(file = path.join(ROOT, 'src/data/feature-flags.js')) {
  const ctx = { window: { location: { search: '' } }, URLSearchParams, console: { log() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx);
  return ctx.window.FEATURE_FLAGS;
}

export const debugFlagOn = (flags = readFlags()) => debugQuestionsOn(flags);

export function loadDebugItems() {
  const ctx = { window: {}, console: { log() {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data/debug-challenges.js'), 'utf8'), ctx);
  return ctx.window.debugChallengesData || [];
}

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const debugHref = (item, src) => `/app/?challenge=${item.id}&amp;src=${encodeURIComponent(src)}`;

/** The Debug item for a trap page, or null (always null with the flag off). */
export function debugItemForTrap(slug, { flagOn, items }) {
  if (!flagOn) return null;
  // Only an item a visitor with no solves can open: a Hard is Pro, and the
  // app swaps a cold visitor to an unrelated free Hard preview, so "Fix this
  // bug yourself" would land on a different question (A1 on #249). The
  // fan-out and average-of-averages pages carry no line until a non-Hard
  // item exists for them.
  return (items || []).find(c => c && c.type === 'debug' && c.trap === slug && c.difficulty !== 'Hard') || null;
}

/** The trap page's line. */
export function trapDebugLine(item, slug) {
  if (!item) return '';
  return `<p class="lead" data-debug-link="true" style="margin-top:14px;">Fix this bug yourself: <a href="${debugHref(item, `pattern-debug-${slug}`)}" data-track="cta_pattern_debug">question ${item.id}</a> — an AI assistant wrote the query, and it returns the wrong answer.</p>`;
}

export const AI_PAGES = [
  { file: 'sql-for-the-ai-era/index.html', anchor: '<section class="faq">', src: 'ai-era-debug' },
  { file: 'blog/validate-ai-generated-sql/index.html', anchor: '<div class="cta-box">', src: 'validate-ai-debug' },
];

/** The one section on the two AI pages: what the set is, and three items to start with. */
export function aiSectionHtml(items, src, { wrap = false } = {}) {
  // Three a cold visitor can open: no Hard (Pro; see debugItemForTrap).
  const open = items.filter(c => c.difficulty !== 'Hard');
  const pick = [open.find(c => c.difficulty === 'Easy'), ...open.filter(c => c.difficulty === 'Medium').slice(0, 2)].filter(Boolean);
  const inner = `<h2 class="fd" id="fix-the-ai">Fix a query an AI wrote</h2>
  <p>${items.length} practice questions open on a query an AI assistant wrote for the task. Each runs, and each returns the wrong answer: a join that repeats rows, a NULL in a NOT IN, a date bound that drops the last day. Find the line, fix it, and the checker grades your fix like any other question.</p>
  <ul>${pick.map(c => `<li><a href="${debugHref(c, src)}" data-track="cta_ai_debug">${esc(c.title.replace(/^Debug: /, ''))}</a> (${esc(c.difficulty)})</li>`).join('')}</ul>`;
  const block = `<!-- debug-discovery:start --><div data-debug-section="true">${inner}</div><!-- debug-discovery:end -->`;
  return wrap ? `<section class="principle"><div class="wrap">${block}</div></section>` : block;
}

/** Insert the section once, before the anchor. Flag off or no anchor → unchanged. */
export function withAiSection(html, { flagOn, items, anchor, src, wrap }) {
  if (!flagOn || !items || items.length === 0) return html;
  if (html.includes('<!-- debug-discovery:start -->')) return html;
  const i = html.indexOf(anchor);
  if (i < 0) return html;
  return html.slice(0, i) + aiSectionHtml(items, src, { wrap }) + '\n' + html.slice(i);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const flagOn = debugFlagOn();
  const items = loadDebugItems();
  let n = 0;
  for (const p of AI_PAGES) {
    const file = path.join(PUB, p.file);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    const next = withAiSection(html, { flagOn, items, anchor: p.anchor, src: p.src, wrap: p.file.startsWith('sql-for-the-ai-era') });
    if (next !== html) { fs.writeFileSync(file, next); n++; }
  }
  console.log(`[debug-discovery] debugQuestions ${flagOn ? 'ON' : 'off'} · ${n} page(s) given the section`);
}
