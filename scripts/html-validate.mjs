// HTML validation over the BUILT site (public/), 2026-11-24.
//
// Why this exists: ~515 pages are written by a dozen generators and a few
// post-build injectors that splice strings into finished HTML. Nothing parsed
// the result. The first run found the homepage with two <body> tags and a
// stray </div>, and the footer injector putting a <style> under <footer> on
// 508 pages. Browsers repair all of that silently, so no visual check ever
// would. Research: the 2026-11-24 SEO/GEO tool shortlist ("worth watching").
//
// Engine: html-validate (exact-pinned devDependency; offline, no network).
// Config, tuned for static marketing pages — no framework rules:
//   - `html-validate:standard`: the rules that check the HTML standard itself
//     (duplicate ids, misnested / stray end tags, an element where it is not
//     permitted — a second <body> — or more often than permitted — a second
//     <head> —, invalid or misused attributes, required attributes and
//     content, void elements with content, unknown character references);
//   - plus the bug-shaped rules from `recommended`: unclosed elements
//     (no-implicit-close), missing alt (wcag/h37, h36), empty links, headings
//     and titles, a form without a submit button, duplicate form names,
//     focusable content under aria-hidden.
//   Left out on purpose, because they are style, not bugs: inline styles,
//   trailing whitespace, quote style, title length (seo-audit owns titles),
//   `type="text/javascript"`, <tbody>, and the button-type / landmark-name
//   preferences.
//
// Policy (tests/html-validate.test.js): a RATCHET against
// scripts/html-validate-baseline.txt, the same shape as structured-data's —
// a new error fails, and a listed error that is gone must leave the file.
//
// Usage:  node scripts/html-validate.mjs                  → report by rule, exit 1 on drift
//         node scripts/html-validate.mjs --write-baseline → rewrite the baseline from today's errors
//                                                           (review the diff: it may only shrink)

import fs from 'node:fs';
import path from 'node:path';
import { HtmlValidate } from 'html-validate';

const ROOT = path.resolve(import.meta.dirname, '..');
export const BASELINE_FILE = path.join(ROOT, 'scripts', 'html-validate-baseline.txt');

export const CONFIG = {
  extends: ['html-validate:standard'],
  rules: Object.fromEntries([
    'no-implicit-close',
    'wcag/h30', 'wcag/h32', 'wcag/h36', 'wcag/h37', 'wcag/h63', 'wcag/h67', 'wcag/h71',
    'empty-heading', 'empty-title', 'text-content',
    'form-dup-name', 'input-attributes', 'hidden-focusable', 'aria-hidden-body',
    'no-dup-class', 'meta-refresh',
  ].map(r => [r, 'error'])),
};

// public/weekly/ and its index weekly.html are date-stamped and rebuilt by
// `npm run build:weekly`, not by `npm run build` (CLAUDE.md: never commit
// weekly/), so their errors would move the ratchet on their own.
const SKIP_DIRS = new Set(['weekly']);
const SKIP_FILES = new Set(['weekly.html']);

export function builtPages(root = ROOT) {
  const pub = path.join(root, 'public');
  const out = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        if (!(dir === pub && SKIP_DIRS.has(f))) walk(p);
      } else if (f.endsWith('.html') && !(dir === pub && SKIP_FILES.has(f))) out.push(p);
    }
  })(pub);
  return out.sort();
}

let hv;
const validator = () => (hv ??= new HtmlValidate(CONFIG));

// One page's messages: { rule, message, line, column }.
export async function validateHtml(html) {
  const r = await validator().validateString(html);
  return r.results.flatMap(x => x.messages).map(m => ({
    rule: m.ruleId, message: m.message.replace(/\s+/g, ' '), line: m.line, column: m.column,
  }));
}

// Every error on every built page: { page, rule, message, line, column }.
export async function validateSite(root = ROOT) {
  const issues = [];
  for (const file of builtPages(root)) {
    const page = path.relative(root, file).split(path.sep).join('/');
    for (const m of await validateHtml(fs.readFileSync(file, 'utf8'))) issues.push({ page, ...m });
  }
  return issues;
}

// ---- the ratchet ------------------------------------------------------------
// Baseline line: `<count>\t<page>\t<rule>\t<message>`. No line numbers — an
// edit above an error would rename it. Counted, because the same message
// repeats on a page, and one more is a new error.

export const keyOf = i => `${i.page}\t${i.rule}\t${i.message}`;

export function countIssues(issues) {
  const m = new Map();
  for (const i of issues) m.set(keyOf(i), (m.get(keyOf(i)) || 0) + 1);
  return m;
}

export function readBaseline(file = BASELINE_FILE) {
  const m = new Map();
  if (!fs.existsSync(file)) return m;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [n, ...rest] = line.split('\t');
    m.set(rest.join('\t'), Number(n));
  }
  return m;
}

export function formatBaseline(counts) {
  const head = [
    '# Known HTML errors on the built site — a ratchet, it may only shrink.',
    '# Written by `node scripts/html-validate.mjs --write-baseline`; guarded by',
    '# tests/html-validate.test.js. Fixed one? Delete (or lower the count of) its line in the same commit.',
    '# <count>\t<page>\t<rule>\t<message>',
  ];
  const lines = [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, n]) => `${n}\t${k}`);
  return head.join('\n') + '\n' + lines.join('\n') + (lines.length ? '\n' : '');
}

// { added: [[key, extra]], stale: [[key, fewer]] } against the baseline.
export function compareToBaseline(counts, baseline) {
  const added = [];
  const stale = [];
  for (const [k, n] of counts) if (n > (baseline.get(k) || 0)) added.push([k, n - (baseline.get(k) || 0)]);
  for (const [k, n] of baseline) if (n > (counts.get(k) || 0)) stale.push([k, n - (counts.get(k) || 0)]);
  return { added, stale };
}

async function main() {
  const issues = await validateSite();
  const counts = countIssues(issues);
  if (process.argv.includes('--write-baseline')) {
    fs.writeFileSync(BASELINE_FILE, formatBaseline(counts));
    console.log(`wrote ${path.relative(ROOT, BASELINE_FILE)}: ${counts.size} lines, ${issues.length} errors`);
  }
  const { added, stale } = compareToBaseline(counts, readBaseline());
  const byRule = {};
  const pagesByRule = {};
  for (const i of issues) {
    byRule[i.rule] = (byRule[i.rule] || 0) + 1;
    (pagesByRule[i.rule] ??= new Set()).add(i.page);
  }
  console.log(`html-validate: ${builtPages().length} pages, ${issues.length} errors`);
  for (const [k, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${k}\t(${pagesByRule[k].size} pages)`);
  const at = new Map(issues.map(i => [keyOf(i), `${i.page}:${i.line}:${i.column}`]));
  for (const [k, n] of added) console.log(`NEW (+${n})  ${at.get(k)}  ${k.split('\t').slice(1).join('  ')}`);
  for (const [k, n] of stale) console.log(`FIXED, still in baseline (-${n})  ${k.replace(/\t/g, '  ')}`);
  process.exit(added.length || stale.length ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
