#!/usr/bin/env node
// Lighthouse CI over six template pages, mobile and desktop (2026-11-24).
//
//   node scripts/lighthouse/run.mjs            # both presets
//   node scripts/lighthouse/run.mjs mobile     # one preset
//
// Needs a built public/ (npm run build) and Chrome. For each preset it runs
// `lhci collect` (lighthouserc.json: serve public/ on :4321, six URLs, three
// runs each), `lhci assert`, and `lhci upload --target=filesystem` into
// lhci-reports/<preset>/ — never temporary-public-storage, whose reports are
// public. Then the gate (scripts/lighthouse/gate.mjs) compares the error-level
// failures with scripts/lighthouse-baseline.txt and exits 1 on a new failure
// or a baseline line that no longer fails. A median table per URL goes to
// stdout, lhci-reports/summary.md and $GITHUB_STEP_SUMMARY.
//
// Analytics: track.js already stays silent on localhost and on a Lighthouse
// user agent; lighthouserc.json also blocks Clarity, Supabase and /_vercel/
// so no run reaches a production table or the Clarity project.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  ROOT, PRESETS, readBaseline, failureKeys, compareToBaseline, summarise, topAudits, topShifts, urlPath,
} from './gate.mjs';

const presets = process.argv.slice(2).filter(a => PRESETS.includes(a));
const run = presets.length ? presets : PRESETS;
const LHCI_DIR = path.join(ROOT, '.lighthouseci');
const OUT = path.join(ROOT, 'lhci-reports');
const bin = process.env.LHCI_BIN || path.join(ROOT, 'node_modules', '.bin', 'lhci');

function lhci(args) {
  const r = spawnSync(bin, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.error) console.error(`lhci: ${r.error.message}`);
  return r.status ?? 1;
}

const fmtScore = s => (s == null ? '–' : Math.round(s * 100).toString());
const lines = ['# Lighthouse CI', '', `Six template pages, 3 runs each, median. Commit ${process.env.GITHUB_SHA || '(local)'}.`, ''];
const allFailures = [];

for (const preset of run) {
  fs.rmSync(LHCI_DIR, { recursive: true, force: true });
  const extra = preset === 'desktop' ? ['--settings.preset=desktop'] : [];
  if (lhci(['collect', '--config=lighthouserc.json', ...extra]) !== 0) {
    console.error(`lhci collect failed for ${preset}`);
    process.exit(2);
  }
  lhci(['assert', '--config=lighthouserc.json']); // exit code is ours to decide, below
  lhci(['upload', '--config=lighthouserc.json', `--outputDir=${path.join(OUT, preset)}`]);

  const lhrs = fs.readdirSync(LHCI_DIR).filter(f => /^lhr-.*\.json$/.test(f))
    .map(f => JSON.parse(fs.readFileSync(path.join(LHCI_DIR, f), 'utf8')));
  const results = JSON.parse(fs.readFileSync(path.join(LHCI_DIR, 'assertion-results.json'), 'utf8'));
  fs.mkdirSync(path.join(OUT, preset), { recursive: true });
  fs.copyFileSync(path.join(LHCI_DIR, 'assertion-results.json'), path.join(OUT, preset, 'assertion-results.json'));

  const failures = failureKeys(preset, results);
  allFailures.push(...failures);

  lines.push(`## ${preset}`, '', '| page | SEO | a11y | perf | CLS | LCP |', '|---|---|---|---|---|---|');
  for (const r of summarise(lhrs)) {
    lines.push(`| ${r.path} | ${fmtScore(r.seo)} | ${fmtScore(r.a11y)} | ${fmtScore(r.perf)} | ${r.cls == null ? '–' : r.cls.toFixed(3)} | ${r.lcp == null ? '–' : `${Math.round(r.lcp)} ms`} |`);
  }
  lines.push('');
  if (failures.length) {
    lines.push('Error-level failures and the audits behind them:', '');
    for (const k of failures) {
      const [, p, id] = k.split('\t');
      const lhr = lhrs.find(l => urlPath(l.requestedUrl || l.finalDisplayedUrl) === p);
      const why = !lhr ? [] : id === 'cumulative-layout-shift' ? topShifts(lhr) : topAudits(lhr, id.split(':')[1]);
      lines.push(`- \`${p}\` ${id}: ${why.join('; ') || '(no failing audit found)'}`);
    }
    lines.push('');
  }
  const warns = results.filter(r => r.level === 'warn' && !r.passed);
  if (warns.length) {
    lines.push(`Warnings (not gating): ${warns.map(r => `\`${urlPath(r.url)}\` performance ${fmtScore(r.actual)}`).join(', ')}`, '');
  }
}

const { fresh, stale, known } = compareToBaseline(allFailures, readBaseline(), run);
lines.push('## Gate', '');
lines.push(`- known (scripts/lighthouse-baseline.txt, not failing the job): ${known.length}`);
for (const k of known) lines.push(`  - ${k.replace(/\t/g, ' ')}`);
lines.push(`- NEW failures: ${fresh.length}`);
for (const k of fresh) lines.push(`  - ${k.replace(/\t/g, ' ')}`);
lines.push(`- fixed but still in the baseline (delete the line): ${stale.length}`);
for (const k of stale) lines.push(`  - ${k.replace(/\t/g, ' ')}`);

const md = lines.join('\n') + '\n';
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'summary.md'), md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log('\n' + md);

if (fresh.length || stale.length) {
  console.error(fresh.length ? 'Lighthouse: new assertion failures (not in scripts/lighthouse-baseline.txt).' : '');
  console.error(stale.length ? 'Lighthouse: baseline lines that pass now — delete them from scripts/lighthouse-baseline.txt.' : '');
  process.exit(1);
}
