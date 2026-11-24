// Lighthouse CI gate — the pure half (2026-11-24, adopt-now #4 of the SEO/GEO
// tool shortlist). scripts/lighthouse/run.mjs runs `lhci collect` + `lhci
// assert` per preset and hands the results here; tests/lighthouse-ci.test.js
// imports these helpers and pins the config they read.
//
// The assertions themselves live in lighthouserc.json and are never loosened
// to make a page pass. A page that fails one TODAY is listed in
// scripts/lighthouse-baseline.txt — a ratchet that may only shrink:
//   - an error-level failure NOT in the baseline        → the job fails (new regression);
//   - a baseline line whose failure no longer happens   → the job fails until the line is deleted;
//   - a baseline failure that still happens             → reported, does not fail.
// Warn-level assertions (performance) never fail and never enter the baseline.

import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const RC_FILE = path.join(ROOT, 'lighthouserc.json');
export const BASELINE_FILE = path.join(ROOT, 'scripts', 'lighthouse-baseline.txt');
export const PRESETS = ['mobile', 'desktop'];

export function readRc(file = RC_FILE) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** `http://localhost:4321/sql-exercises/` → `/sql-exercises/` */
export const urlPath = u => new URL(u).pathname;

/** The assertion's id as lighthouserc.json names it: `categories:seo`, `cumulative-layout-shift`. */
export function assertionId(r) {
  return r.auditProperty ? `${r.auditId}:${r.auditProperty}` : r.auditId;
}

/** One key per failing error-level assertion: `<preset>\t<path>\t<assertion>`. */
export function failureKeys(preset, assertionResults) {
  const keys = new Set();
  for (const r of assertionResults) {
    if (r.level !== 'error' || r.passed) continue;
    keys.add(`${preset}\t${urlPath(r.url)}\t${assertionId(r)}`);
  }
  return [...keys].sort();
}

/** Baseline lines are `<preset>\t<path>\t<assertion>`; `#` starts a comment. */
export function parseBaseline(text) {
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const parts = line.split(/\t+/);
    if (parts.length !== 3) throw new Error(`lighthouse baseline: bad line "${raw}" (want <preset>\\t<path>\\t<assertion>)`);
    out.push(parts.join('\t'));
  }
  return out;
}

export function readBaseline(file = BASELINE_FILE) {
  return fs.existsSync(file) ? parseBaseline(fs.readFileSync(file, 'utf8')) : [];
}

/**
 * Compare today's failures with the baseline, for the presets that ran.
 * @returns {{ fresh: string[], stale: string[], known: string[] }}
 */
export function compareToBaseline(failures, baseline, presetsRun = PRESETS) {
  const ran = new Set(presetsRun);
  const base = new Set(baseline.filter(k => ran.has(k.split('\t')[0])));
  const now = new Set(failures);
  return {
    fresh: [...now].filter(k => !base.has(k)).sort(),
    stale: [...base].filter(k => !now.has(k)).sort(),
    known: [...now].filter(k => base.has(k)).sort(),
  };
}

const median = xs => {
  const s = xs.filter(x => typeof x === 'number').sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Median per URL over the runs: SEO, a11y, perf, CLS, LCP (ms). */
export function summarise(lhrs) {
  const byUrl = new Map();
  for (const l of lhrs) {
    const p = urlPath(l.requestedUrl || l.finalDisplayedUrl);
    if (!byUrl.has(p)) byUrl.set(p, []);
    byUrl.get(p).push(l);
  }
  const rows = [];
  for (const [p, runs] of byUrl) {
    rows.push({
      path: p,
      runs: runs.length,
      seo: median(runs.map(l => l.categories.seo?.score)),
      a11y: median(runs.map(l => l.categories.accessibility?.score)),
      perf: median(runs.map(l => l.categories.performance?.score)),
      cls: median(runs.map(l => l.audits['cumulative-layout-shift']?.numericValue)),
      lcp: median(runs.map(l => l.audits['largest-contentful-paint']?.numericValue)),
    });
  }
  return rows;
}

/** The failing audits behind a category (weighted, score < 1), heaviest first. */
export function topAudits(lhr, category, n = 3) {
  const cat = lhr.categories[category];
  if (!cat) return [];
  return cat.auditRefs
    .filter(r => r.weight > 0)
    .map(r => ({ id: r.id, weight: r.weight, a: lhr.audits[r.id] }))
    .filter(x => x.a && x.a.score !== null && x.a.score < 1)
    .sort((x, y) => y.weight - x.weight)
    .slice(0, n)
    .map(x => `${x.id} (${x.a.title.replace(/`/g, '')}${x.a.details?.items?.length ? `, ${x.a.details.items.length} item(s)` : ''})`);
}

/** The elements behind a layout shift, from the layout-shifts audit. */
export function topShifts(lhr, n = 3) {
  const items = lhr.audits['layout-shifts']?.details?.items || [];
  return items.slice(0, n).map(i => `${i.node?.selector || i.node?.snippet || 'unknown'} (${Number(i.score).toFixed(3)})`);
}
