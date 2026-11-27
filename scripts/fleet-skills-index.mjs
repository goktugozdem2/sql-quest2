#!/usr/bin/env node
// The fleet's skills marketplace (2026-11-26, the skills loop).
//
// Every lane brief docs/agent/fleet/<ID>-<slug>.md is a skill with a YAML
// front-matter block (id, name, owner, runtime, status, cadence, metric,
// version, last_changed). This script joins that front-matter with the run
// ledger (docs/agent/fleet/runs/*.jsonl) and the papercut table
// (docs/agent/fleet/papercuts.md) into docs/agent/fleet/SKILLS.md.
//
//   npm run fleet:index            write SKILLS.md
//   npm run fleet:index -- --check exit 1 when the committed file is stale
//
// Deterministic on purpose: "runs in 28 d" counts back from the newest date in
// the ledger, never from today, so a re-run on unchanged inputs is
// byte-identical (tests/fleet-skills.test.js pins that).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FLEET_DIR = path.join('docs', 'agent', 'fleet');

export const BRIEF_FILE = /^(?:[A-Z]\d|AN)-[a-z0-9-]+\.md$/;
export const REQUIRED_KEYS = ['id', 'name', 'owner', 'runtime', 'status', 'cadence', 'metric', 'version', 'last_changed'];
export const OWNERS = ['orchestrator', 'founder', 'cloud-A0'];
export const RUNTIMES = ['laptop', 'cloud', 'actions'];
export const STATUSES = ['active', 'reduced', 'paused'];
export const OUTCOMES = ['pr', 'merged', 'read', 'drafts', 'noop', 'blocked', 'deploy', 'action'];

// The skill a ledger lane belongs to: "B1", "B1-followup", "C2/G1-ai-era" → its
// leading brief id; "orchestrator", "builder-…", "A01-scorecard" → null.
export function skillOfLane(lane) {
  const m = /^((?:[A-Z]\d|AN))(?:[-/]|$)/.exec(String(lane || ''));
  return m ? m[1] : null;
}

function stripComment(v) {
  let q = null;
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(v[i - 1]))) return v.slice(0, i).trim();
  }
  return v.trim();
}

function scalar(v) {
  if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}

// A deliberately small YAML subset: `key: value` lines, flow lists `[a, b]`,
// quoted strings, trailing ` # comments`. Anything else is an error, so a
// brief cannot carry front-matter this index silently misreads.
export function parseFrontMatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) throw new Error('front-matter is not closed');
  const out = {};
  for (const line of text.slice(4, end).split('\n')) {
    if (!line.trim()) continue;
    const m = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!m) throw new Error(`front-matter line not understood: ${line}`);
    const raw = stripComment(m[2]);
    if (/^\[.*\]$/.test(raw)) {
      out[m[1]] = raw.slice(1, -1).split(',').map(s => scalar(s.trim())).filter(s => s !== '');
    } else {
      out[m[1]] = scalar(raw);
    }
  }
  return out;
}

export function readBriefs(root = ROOT) {
  const dir = path.join(root, FLEET_DIR);
  return fs.readdirSync(dir).filter(f => BRIEF_FILE.test(f)).sort().map(file => {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    return { file, text, fm: parseFrontMatter(text) };
  });
}

export function readLedger(root = ROOT) {
  const dir = path.join(root, FLEET_DIR, 'runs');
  if (!fs.existsSync(dir)) return [];
  const rows = [];
  for (const f of fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}\.jsonl$/.test(f)).sort()) {
    fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => {
      if (!line.trim()) return;
      try { rows.push({ ...JSON.parse(line), _src: `${f}:${i + 1}` }); }
      catch (e) { throw new Error(`${f}:${i + 1} is not JSON: ${e.message}`); }
    });
  }
  return rows;
}

export function readPapercuts(root = ROOT) {
  const p = path.join(root, FLEET_DIR, 'papercuts.md');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n')
    .filter(l => /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(l))
    .map(l => {
      const c = l.split('|').slice(1, -1).map(s => s.trim());
      return { date: c[0], lane: c[1], papercut: c[2], fix: c[3], owner: c[4], status: c[5] };
    });
}

const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const cell = v => String(v).replace(/\|/g, '\\|');

export function buildIndex(root = ROOT) {
  const briefs = readBriefs(root);
  const runs = readLedger(root);
  const cuts = readPapercuts(root);
  const asOf = runs.reduce((m, r) => (r.date > m ? r.date : m), '');
  const since = asOf ? addDays(asOf, -27) : '';

  const per = new Map();
  const unattributed = new Map();
  for (const r of runs) {
    const id = skillOfLane(r.lane);
    const key = id && briefs.some(b => b.fm?.id === id) ? id : null;
    const bucket = key ? (per.get(key) ?? per.set(key, { runs: [], merged: new Set() }).get(key))
      : (unattributed.get(r.lane) ?? unattributed.set(r.lane, { runs: [], merged: new Set() }).get(r.lane));
    bucket.runs.push(r);
    for (const n of r.merged || []) bucket.merged.add(n);
  }
  const openCuts = new Map();
  for (const c of cuts) {
    if (!/^open/i.test(c.status)) continue;
    const id = skillOfLane(c.lane) || 'fleet';
    openCuts.set(id, (openCuts.get(id) || 0) + 1);
  }

  const rows = briefs.map(({ fm, file }) => {
    const b = per.get(fm.id) || { runs: [], merged: new Set() };
    const last = b.runs.reduce((m, r) => (r.date > m ? r.date : m), '');
    const recent = b.runs.filter(r => r.date >= since).length;
    const metric = Array.isArray(fm.metric) ? fm.metric.map(m => `\`${m}\``).join(', ') : 'undefined';
    return `| [${fm.id}](${file}) | ${cell(fm.name)} | ${fm.status} | ${fm.runtime} | ${cell(fm.cadence)} | ${fm.owner} | ${fm.version} | ${metric} | ${last || '—'} | ${recent} | ${b.merged.size} | ${openCuts.get(fm.id) || 0} |`;
  });

  const count = s => briefs.filter(b => b.fm.status === s).length;
  const totalMin = runs.reduce((a, r) => a + (typeof r.minutes === 'number' ? r.minutes : 0), 0);
  const timed = runs.filter(r => typeof r.minutes === 'number').length;
  const tokens = runs.reduce((a, r) => a + (typeof r.tokens === 'number' ? r.tokens : 0), 0);
  const allMerged = new Set(runs.flatMap(r => r.merged || []));
  const openTotal = cuts.filter(c => /^open/i.test(c.status)).length;
  const fixedTotal = cuts.filter(c => /^fixed/i.test(c.status)).length;

  const other = [...unattributed.entries()]
    .map(([lane, b]) => ({ lane, n: b.runs.length, merged: b.merged.size }))
    .sort((a, b) => b.n - a.n || (a.lane < b.lane ? -1 : a.lane > b.lane ? 1 : 0));

  return [
    '# Fleet skills — the index',
    '',
    '<!-- Generated by scripts/fleet-skills-index.mjs (`npm run fleet:index`). Do not edit by hand. -->',
    '',
    'Every lane brief in this folder is a skill: versioned front-matter, an owner, a',
    'metric, and a run history in the ledger. How the loop works: README, "The',
    'skills loop". Sources: the briefs\' front-matter, `runs/*.jsonl`, `papercuts.md`.',
    '',
    `**${briefs.length} skills** — ${count('active')} active, ${count('reduced')} reduced, ${count('paused')} paused.`,
    `Ledger as of **${asOf || '—'}**: ${runs.length} runs, ${allMerged.size} merged PRs, ${Math.round(totalMin)} minutes over ${timed} timed runs, ${(tokens / 1e6).toFixed(1)}M tokens.`,
    `Papercuts: ${openTotal} open, ${fixedTotal} fixed.`,
    '',
    `"Runs in 28 d" counts ${since || '—'} → ${asOf || '—'}. "Merged PRs" counts distinct merged PRs over the whole ledger. A metric of \`undefined\` has no entry in \`docs/agent/metrics.md\` yet (TODO in the brief).`,
    '',
    '| id | name | status | runtime | cadence | owner | version | metric | last run | runs in 28 d | merged PRs | papercuts open |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
    '',
    '## Runs outside a lane brief',
    '',
    'Orchestrator work, one-off builders and investigations. A name that keeps',
    'coming back here is a lane without a brief: D3 decides whether it gets one.',
    '',
    '| lane | runs | merged PRs |',
    '|---|---|---|',
    ...other.map(o => `| ${cell(o.lane)} | ${o.n} | ${o.merged} |`),
    '',
  ].join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = path.join(ROOT, FLEET_DIR, 'SKILLS.md');
  const md = buildIndex(ROOT);
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (cur !== md) { console.error('SKILLS.md is stale: run npm run fleet:index'); process.exit(1); }
    console.log('SKILLS.md is up to date');
  } else {
    fs.writeFileSync(out, md);
    console.log(`wrote ${path.relative(ROOT, out)}`);
  }
}
