#!/usr/bin/env node
// Which ledger claims are due for a read? (V1, 2026-11-23)
//
// A pure parser over docs/agent/ledger.md (and, for the metric check,
// docs/agent/metrics.md). No network, no secrets, no database: it only says
// which open claims have a read date on or before --date, so the verifier
// knows what to measure. The orchestrator runs it daily.
//
//   node scripts/ledger/due.mjs                 # due + overdue as of today (UTC)
//   node scripts/ledger/due.mjs --date 2026-12-20
//   node scripts/ledger/due.mjs --all           # also upcoming and undated
//   node scripts/ledger/due.mjs --json
//
// What counts as open: a `### ` entry with a **Read** label and no verdict
// line (`- **Verdict** …` that is not `_pending_`), or whose latest verdict
// names a re-read date ("re-read 2026-12-20"). A heading ending in
// `— **OPEN**` is open whatever it carries; one ending in a verdict word
// (`— **HIT**`) is closed. Entries with no Read label are notes, not claims.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ISO = /\d{4}-\d{2}-\d{2}/;
const HEADING_VERDICT = /—\s*\*\*(HIT|MISS|FLAT|MOVED|UNREADABLE|UNDEFINED|INCONCLUSIVE|SIGNED[^*]*)\*\*\s*(\(|$)/;
const HEADING_OPEN = /—\s*\*\*OPEN\*\*\s*$/;

/** Split the ledger into `### ` entries, each with the `## ` section it sits in. */
export function splitEntries(text) {
  const lines = text.split('\n');
  const entries = [];
  let section = null;
  let cur = null;
  lines.forEach((line, i) => {
    const h2 = /^## (.+)$/.exec(line);
    const h3 = /^### (.+)$/.exec(line);
    if (h2 || h3) {
      if (cur) entries.push(cur);
      cur = null;
    }
    if (h2) { section = h2[1].trim().toLowerCase(); return; }
    if (h3) { cur = { title: h3[1].trim(), line: i + 1, section, body: [] }; return; }
    if (cur) cur.body.push(line);
  });
  if (cur) entries.push(cur);
  return entries.map((e) => ({ ...e, body: e.body.join('\n') }));
}

const VERDICT_LINE = /^\s*- \*\*Verdict[^*]*\*\*/;

/** The verdict lines of an entry, `_pending_` ones left out. */
export function verdictLines(body) {
  return body.split('\n').filter((l) => VERDICT_LINE.test(l) && !/^\s*- \*\*Verdict\*\*\s*_pending_/.test(l));
}

/** The read label: the first concrete date after a Read label, else its words. */
export function readDate(body) {
  // The verdict block's own "- **Read** <sentence>" is not a read date, so
  // the claim is everything above the first verdict line.
  const all = body.split('\n');
  const firstVerdict = all.findIndex((l) => VERDICT_LINE.test(l));
  const claimPart = (firstVerdict === -1 ? all : all.slice(0, firstVerdict))
    .filter((l) => !/^\s*- \*\*(Measured|Next)/.test(l)).join('\n');
  const label = /\*\*Read(?: on| date)?(?:\*\*)?[\s*:]*([^\n]*(?:\n[ \t]+[^\n-][^\n]*)?)/g;
  const plain = /(?:^|[.·]\s+|\s)Read (\d{4}-\d{2}-\d{2})/gm;
  let firstWords = null;
  let found = false;
  for (const m of claimPart.matchAll(label)) {
    found = true;
    const after = m[1].replace(/\s+/g, ' ').trim();
    const d = /^\**\s*(\d{4}-\d{2}-\d{2})/.exec(after);
    if (d) return { date: d[1], note: null, found };
    if (firstWords === null) firstWords = after.slice(0, 80);
  }
  for (const m of claimPart.matchAll(plain)) return { date: m[1], note: null, found: true };
  return { date: null, note: firstWords, found };
}

/** A re-read date named in the latest verdict, if any. */
export function reReadDate(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = /re-?read(?: due| on)?:?\s*\**\s*(\d{4}-\d{2}-\d{2})/i.exec(lines[i]);
    if (m) return m[1];
    if (/\*\*Verdict/.test(lines[i])) return null; // the latest verdict names none
  }
  return null;
}

/** Metric names: the backticked identifiers on the Metric line, checked against the registry. */
export function metricsOf(body, known = null) {
  const m = /\*\*Metrics?:?\*\*:?([^\n]*(?:\n[ \t]+[^\n-][^\n]*)?)/.exec(body);
  if (!m) return { names: [], known: false };
  const ids = [...m[1].matchAll(/`([a-z][a-z0-9_]*)/g)].map((x) => x[1]);
  if (!known) return { names: ids, known: null };
  const hits = ids.filter((id) => known.has(id));
  return hits.length ? { names: hits, known: true } : { names: ids.slice(0, 1), known: false };
}

/** Metric names registered in docs/agent/metrics.md (`## \`name\`` or `## \`a\` / \`b\``). */
export function registeredMetrics(metricsText) {
  const set = new Set();
  for (const line of metricsText.split('\n')) {
    if (!/^#{2,3} `/.test(line)) continue;
    for (const m of line.matchAll(/`([a-z][a-z0-9_]*)/g)) set.add(m[1]);
  }
  return set;
}

const DAY = 86400000;
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/**
 * Every claim that is still open, with its read date and status as of `asOf`.
 * status: 'overdue' (read date before asOf), 'due' (equal), 'upcoming', 'no-date'.
 */
export function openClaims(ledgerText, { asOf, metrics = null } = {}) {
  if (!ISO.test(asOf || '')) throw new Error('asOf must be YYYY-MM-DD');
  const out = [];
  for (const e of splitEntries(ledgerText)) {
    if (e.section === null || !/^(open|closed)\b/.test(e.section)) continue;
    const forcedOpen = HEADING_OPEN.test(e.title);
    if (!forcedOpen && HEADING_VERDICT.test(e.title)) continue;
    const r = readDate(e.body);
    if (!r.found) continue; // a note, not a claim
    const verdicts = verdictLines(e.body);
    let date = r.date;
    let reRead = false;
    if (verdicts.length) {
      const rr = reReadDate(verdicts);
      if (rr) { date = rr; reRead = true; } else if (!forcedOpen) continue;
    }
    const metric = metricsOf(e.body, metrics);
    let status = 'no-date';
    let daysLate = null;
    if (date) {
      daysLate = daysBetween(date, asOf);
      status = daysLate > 0 ? 'overdue' : daysLate === 0 ? 'due' : 'upcoming';
    }
    out.push({
      title: e.title.replace(HEADING_OPEN, '').trim(),
      line: e.line,
      readDate: date,
      readNote: date ? null : r.note,
      reRead,
      metric: metric.names,
      metricRegistered: metric.known,
      status,
      daysLate,
    });
  }
  const rank = { overdue: 0, due: 1, upcoming: 2, 'no-date': 3 };
  return out.sort((a, b) => rank[a.status] - rank[b.status] || String(a.readDate).localeCompare(String(b.readDate)) || a.line - b.line);
}

function parseArgs(argv) {
  const args = { date: new Date().toISOString().slice(0, 10), all: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--date') args.date = argv[++i];
    else if (a.startsWith('--date=')) args.date = a.slice(7);
    else if (a === '--all') args.all = true;
    else if (a === '--json') args.json = true;
    else if (a === '--ledger') args.ledger = argv[++i];
    else if (a === '--metrics') args.metrics = argv[++i];
  }
  return args;
}

export function render(claims, { all = false } = {}) {
  const show = all ? claims : claims.filter((c) => c.status === 'overdue' || c.status === 'due');
  const count = (s) => claims.filter((c) => c.status === s).length;
  const lines = [`open claims: ${claims.length} · overdue ${count('overdue')} · due ${count('due')} · upcoming ${count('upcoming')} · no date ${count('no-date')}`];
  for (const c of show) {
    const when = c.readDate ? `${c.readDate}${c.reRead ? ' (re-read)' : ''}` : `— ${c.readNote || 'no date'}`;
    const late = c.status === 'overdue' ? ` · ${c.daysLate} d late` : '';
    const metric = c.metric.length ? c.metric.join(', ') + (c.metricRegistered === false ? ' (NOT in metrics.md)' : '') : '(no metric line)';
    lines.push(`${c.status.padEnd(8)} ${when}${late} · L${c.line} · ${c.title} · ${metric}`);
  }
  return lines.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const args = parseArgs(process.argv.slice(2));
  const ledger = fs.readFileSync(args.ledger || path.join(root, 'docs/agent/ledger.md'), 'utf8');
  const metricsPath = args.metrics || path.join(root, 'docs/agent/metrics.md');
  const metrics = fs.existsSync(metricsPath) ? registeredMetrics(fs.readFileSync(metricsPath, 'utf8')) : null;
  const claims = openClaims(ledger, { asOf: args.date, metrics });
  console.log(args.json ? JSON.stringify(claims, null, 2) : render(claims, { all: args.all }));
}
