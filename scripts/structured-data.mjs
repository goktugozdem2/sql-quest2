// Structured-data validation over the BUILT site (public/), 2026-11-24.
//
// Why this exists: the site ships ~1,100 JSON-LD blocks (BreadcrumbList on
// 400+ pages, LearningResource on every /questions/ page, Course, FAQPage,
// Article, SoftwareApplication with an Offer…) and nothing checked them
// against schema.org or Google's rich-result rules. tests/faq-schema.test.js
// only compares FAQ schema with the visible text. JSON-LD is also what an AI
// assistant reads, so a broken block is a page telling engines nothing.
// Research: the 2026-11-24 SEO/GEO tool shortlist (adopt-now #1).
//
// Engine: @adobe/structured-data-validator (Google rich-result rules per type
// + a schema.org vocabulary pass) on the output of @marbec/web-auto-extractor,
// the extractor its README pairs it with. Fully offline: the schema.org
// vocabulary is the pinned, trimmed copy in scripts/vendor/ (see
// vendor-schemaorg.mjs for why it is trimmed and how to move the pin).
//
// Policy (tests/structured-data-validator.test.js):
//   - severity ERROR always fails — no baseline can hold one. A malformed
//     JSON-LD block (unparseable JSON) is an ERROR too.
//   - severity WARNING is a RATCHET against scripts/structured-data-baseline.txt
//     (same shape as scripts/faq-schema-baseline.txt): a new warning fails, and
//     a listed warning that is gone must be deleted from the file.
//
// Usage:  node scripts/structured-data.mjs                  → report, exit 1 on errors or drift
//         node scripts/structured-data.mjs --write-baseline → rewrite the baseline from today's warnings
//                                                             (review the diff: it may only shrink)

import fs from 'node:fs';
import path from 'node:path';
import Validator from '@adobe/structured-data-validator';
import WebAutoExtractor from '@marbec/web-auto-extractor';
import { OUT as VOCAB_FILE } from './vendor/vendor-schemaorg.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
export const BASELINE_FILE = path.join(ROOT, 'scripts', 'structured-data-baseline.txt');

// public/weekly/ is date-stamped and rebuilt every week (CLAUDE.md: never
// commit it), so its blocks would make the ratchet move on its own.
const SKIP_DIRS = new Set(['weekly']);

export function builtPages(root = ROOT) {
  const pub = path.join(root, 'public');
  const out = [];
  (function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) {
        if (!(dir === pub && SKIP_DIRS.has(f))) walk(p);
      } else if (f.endsWith('.html')) out.push(p);
    }
  })(pub);
  return out.sort();
}

// "Course > offers:Offer > seller:Organization" — the issue's place in the
// block, without array indices, so inserting a step does not rename the rest.
export function pathLabel(issuePath = []) {
  const t = x => (Array.isArray(x) ? x.join('+') : x);
  return issuePath
    .map((p, i) => (i === 0 || !p.property ? t(p.type) : p.type ? `${p.property}:${t(p.type)}` : p.property))
    .join(' > ');
}

// A short, stable rule id per kind of message the validator emits.
export function ruleOf(issue) {
  const m = issue.issueMessage || '';
  let r;
  if ((r = m.match(/^Required attribute "(.+)" is missing$/))) return `required:${r[1]}`;
  if ((r = m.match(/^Invalid type for attribute "(.+)"$/))) return `invalid-type:${r[1]}`;
  if ((r = m.match(/^Missing field "(.+)" \(optional\)$/))) return `recommended:${r[1]}`;
  if ((r = m.match(/^Property "(.+)" for type ".+" is not supported by the schema\.org specification$/))) return `not-in-schema.org:${r[1]}`;
  if ((r = m.match(/^Type "(.+)" is not a valid schema\.org type$/))) return `unknown-type:${r[1]}`;
  if (m.startsWith('One of the following conditions')) return `one-of:${(issue.fieldNames || []).join('|')}`;
  return `other:${m.replace(/\s+/g, ' ').slice(0, 120)}`;
}

let vocab;
function validator() {
  vocab ??= JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8'));
  return new Validator(vocab);
}

// Every issue on every built page: { page, path, rule, severity, message }.
export async function validateSite(root = ROOT) {
  const v = validator();
  const issues = [];
  for (const file of builtPages(root)) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('application/ld+json')) continue;
    const page = path.relative(root, file).split(path.sep).join('/');
    issues.push(...(await validateHtml(html, v)).map(i => ({ page, ...i })));
  }
  return issues;
}

// One page's issues (exported for the self-tests).
export async function validateHtml(html, v = validator()) {
  const data = new WebAutoExtractor({ addLocation: false, embedSource: false }).parse(html);
  // JSON-LD only: the pages carry no microdata/RDFa of their own, and the
  // extractor's metatag/heading output is not structured data.
  data.microdata = {};
  data.rdfa = {};
  data.errors = (data.errors || []).filter(e => e.format === 'jsonld');
  const raw = await v.validate(data);
  return raw.map(i => ({
    path: pathLabel(i.path) || i.rootType || 'jsonld',
    rule: ruleOf(i),
    severity: i.severity,
    message: i.issueMessage,
  }));
}

// ---- the warning ratchet ---------------------------------------------------
// Baseline line: `<count>\t<page>\t<path>\t<rule>`. Counted, because the same
// rule at the same path repeats (six HowToSteps without an image), and a
// seventh one is a new issue.

export const keyOf = i => `${i.page}\t${i.path}\t${i.rule}`;

export function countWarnings(issues) {
  const m = new Map();
  for (const i of issues) if (i.severity === 'WARNING') m.set(keyOf(i), (m.get(keyOf(i)) || 0) + 1);
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
    '# Known structured-data WARNINGS on the built site — a ratchet, it may only shrink.',
    '# Written by `node scripts/structured-data.mjs --write-baseline`; guarded by',
    '# tests/structured-data-validator.test.js. ERRORS are never listed here: they always fail.',
    '# Fixed one? Delete (or lower the count of) its line in the same commit.',
    '# <count>\t<page>\t<path in the JSON-LD block>\t<rule>',
  ];
  const lines = [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, n]) => `${n}\t${k}`);
  return head.join('\n') + '\n' + lines.join('\n') + '\n';
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
  const errors = issues.filter(i => i.severity === 'ERROR');
  const counts = countWarnings(issues);
  if (process.argv.includes('--write-baseline')) {
    fs.writeFileSync(BASELINE_FILE, formatBaseline(counts));
    console.log(`wrote ${path.relative(ROOT, BASELINE_FILE)}: ${counts.size} lines, ${[...counts.values()].reduce((a, b) => a + b, 0)} warnings`);
  }
  const { added, stale } = compareToBaseline(counts, readBaseline());
  const byRule = {};
  for (const i of issues) byRule[`${i.severity} ${i.rule.split(':')[0]}`] = (byRule[`${i.severity} ${i.rule.split(':')[0]}`] || 0) + 1;
  console.log(`structured data: ${builtPages().length} pages, ${errors.length} errors, ${issues.length - errors.length} warnings`);
  for (const [k, n] of Object.entries(byRule).sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${k}`);
  for (const e of errors) console.log(`ERROR ${e.page}  ${e.path}  ${e.message}`);
  for (const [k, n] of added) console.log(`NEW WARNING (+${n})  ${k.replace(/\t/g, '  ')}`);
  for (const [k, n] of stale) console.log(`FIXED, still in baseline (-${n})  ${k.replace(/\t/g, '  ')}`);
  process.exit(errors.length || added.length || stale.length ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
