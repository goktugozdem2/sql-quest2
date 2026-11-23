#!/usr/bin/env node
// The daily UI/UX audit's one issue (A4, .github/workflows/uiux-daily.yml).
//
//   node scripts/smoke/uiux-issue.mjs --findings uiux-out/findings.json \
//        [--previous uiux-last/findings.json] [--run-url URL]
//   node scripts/smoke/uiux-issue.mjs --failure --run-url URL
//
// ONE open issue labelled `uiux-audit` is A4's queue. A run with critical or
// major findings opens it or rewrites its body (new since the last run first,
// then the whole queue by root cause) and comments only when something is
// new. A run with no critical and no major closes it. A job failure (not a
// finding) comments on it. Advisory: this script never fails the job over a
// finding, and it never prints the token.
//
// Env: GH_TOKEN (the workflow's github.token), GITHUB_REPOSITORY.

import fs from 'node:fs';
import { fingerprint } from './uiux-checks.mjs';

export const LABEL = 'uiux-audit';
export const TITLE = 'UI/UX audit: critical and major findings (daily, cross-browser)';
export const MARKER = '<!-- uiux-audit:daily -->';
const BODY_LIMIT = 60000; // GitHub caps an issue body at 65,536 characters.
const SEV_ORDER = { critical: 0, major: 1, minor: 2 };

export const blocking = (f) => f.severity === 'critical' || f.severity === 'major';

/** Critical + major findings in `current` that the previous run did not have. null previous = first run. */
export function newSince(current, previous) {
  const cur = (current || []).filter(blocking);
  if (!previous) return cur;
  const seen = new Set((previous || []).filter(blocking).map(fingerprint));
  return cur.filter(f => !seen.has(fingerprint(f)));
}

/** What to do with the issue: open, update or close it, or nothing. */
export function decide({ blockingCount, openIssue }) {
  if (blockingCount === 0) return openIssue ? 'close' : 'none';
  return openIssue ? 'update' : 'open';
}

const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

/** Group findings by check + selector: one root cause usually spans many pages and rows. */
export function groups(findings) {
  const map = new Map();
  for (const f of findings) {
    const k = f.check + '\u0001' + f.selector;
    if (!map.has(k)) map.set(k, { check: f.check, severity: f.severity, selector: f.selector, detail: f.detail, pages: new Set(), rows: new Set(), engines: new Set(), n: 0 });
    const g = map.get(k);
    g.pages.add(f.page); g.rows.add(f.viewport); g.engines.add(f.engine || 'chromium'); g.n++;
  }
  return [...map.values()].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.n - a.n);
}

export function renderBody({ report, fresh, firstRun = false, runUrl = '', limit = 80 }) {
  const t = report.totals || { critical: 0, major: 0, minor: 0 };
  const L = [MARKER, ''];
  L.push(`Run ${report.at || ''}${runUrl ? ` · [workflow run](${runUrl})` : ''} · base ${report.base || ''} · ${report.jobs || 0} runs over ${report.surfaces || 0} surfaces.`, '');
  L.push(`**Critical ${t.critical} · major ${t.major} · minor ${t.minor}**`, '');
  const et = report.engines || {};
  if (Object.keys(et).length) {
    L.push('| engine | critical | major | minor |', '|---|---:|---:|---:|');
    for (const e of Object.keys(et).sort()) L.push(`| ${e} | ${et[e].critical} | ${et[e].major} | ${et[e].minor} |`);
    L.push('');
  }
  for (const s of report.skipped || []) L.push(`> Skipped ${s.engine} (${s.rows.join(', ')}): ${cell(s.reason)}`, '');
  L.push('Engine emulations, not devices: WebKit is Safari\'s engine, Chromium is Chrome\'s. iOS Safari\'s toolbar and keyboard, real fonts and in-app webviews are not covered.', '');

  const sorted = [...fresh].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  L.push(`## New since the last run: ${fresh.length}${firstRun ? ' (first run — no earlier findings to compare)' : ''}`, '');
  if (sorted.length) {
    L.push('| sev | check | page | device | browser | theme | selector | detail |', '|---|---|---|---|---|---|---|---|');
    for (const f of sorted.slice(0, limit)) L.push(`| ${f.severity} | ${f.check} | ${cell(f.page)} | ${cell(f.device || f.viewport)} | ${cell(f.browser || '')} | ${f.theme} | \`${cell(f.selector)}\` | ${cell(f.detail)} |`);
    if (sorted.length > limit) L.push('', `…and ${sorted.length - limit} more in the run's artifact (findings.json).`);
    L.push('');
  }

  const all = groups((report.findings || []).filter(blocking));
  L.push(`## A4's queue: every critical and major finding, by root cause (${all.length} groups)`, '');
  L.push('Fix critical first, then major, one root cause per PR, at most 3 a day (docs/agent/fleet/A4-uiux.md).', '');
  L.push('| sev | check | selector | pages | rows | engines | findings | example |', '|---|---|---|---:|---|---|---:|---|');
  for (const g of all.slice(0, 40)) {
    const pages = [...g.pages];
    L.push(`| ${g.severity} | ${g.check} | \`${cell(g.selector)}\` | ${pages.length <= 2 ? cell(pages.join(', ')) : pages.length} | ${[...g.rows].join(', ')} | ${[...g.engines].join(', ')} | ${g.n} | ${cell(g.detail)} |`);
  }
  if (all.length > 40) L.push('', `…and ${all.length - 40} more groups in the artifact.`);
  let body = L.join('\n');
  if (body.length > BODY_LIMIT) body = body.slice(0, BODY_LIMIT) + '\n\n…truncated; the full list is in the artifact.';
  return body;
}

// ── GitHub ──────────────────────────────────────────────────────────────
async function gh(method, url, body) {
  const repo = process.env.GITHUB_REPOSITORY;
  const res = await fetch(`https://api.github.com/repos/${repo}${url}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'uiux-audit' },
    body: body ? JSON.stringify(body) : undefined,
  });
  // Never echo the request: the status and the path are enough.
  if (!res.ok && res.status !== 422) throw new Error(`GitHub ${method} ${url} → ${res.status}`);
  return res.status === 204 ? null : res.json().catch(() => null);
}

async function openIssue() {
  const list = await gh('GET', `/issues?state=open&labels=${LABEL}&per_page=10`);
  return (list || []).find(i => !i.pull_request) || null;
}

function arg(argv, k) { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; }

export async function main(argv = process.argv.slice(2)) {
  if (!process.env.GH_TOKEN || !process.env.GITHUB_REPOSITORY) { console.log('uiux-issue: no GH_TOKEN/GITHUB_REPOSITORY — nothing posted'); return; }
  const runUrl = arg(argv, '--run-url') || '';
  await gh('POST', '/labels', { name: LABEL, color: 'c5def5', description: 'Daily UI/UX audit findings (A4)' });
  const issue = await openIssue();

  if (argv.includes('--failure')) {
    const text = `${MARKER}\nThe daily UI/UX audit job failed (a job failure, not a finding)${runUrl ? `: ${runUrl}` : ''}. Nothing was rolled back; nothing else is blocked.`;
    if (issue) await gh('POST', `/issues/${issue.number}/comments`, { body: text });
    else await gh('POST', '/issues', { title: TITLE, labels: [LABEL], body: text });
    console.log('uiux-issue: failure reported');
    return;
  }

  const report = JSON.parse(fs.readFileSync(arg(argv, '--findings'), 'utf8'));
  const prevPath = arg(argv, '--previous');
  const prev = prevPath && fs.existsSync(prevPath) ? JSON.parse(fs.readFileSync(prevPath, 'utf8')) : null;
  const fresh = newSince(report.findings, prev && prev.findings);
  const blockingCount = (report.findings || []).filter(blocking).length;
  const action = decide({ blockingCount, openIssue: issue });
  const body = renderBody({ report, fresh, firstRun: !prev, runUrl });

  if (action === 'open') await gh('POST', '/issues', { title: TITLE, labels: [LABEL], body });
  else if (action === 'update') {
    await gh('PATCH', `/issues/${issue.number}`, { body });
    if (fresh.length) await gh('POST', `/issues/${issue.number}/comments`, { body: `${fresh.length} new critical/major finding(s) since the last run${runUrl ? ` — ${runUrl}` : ''}. The body lists them.` });
  } else if (action === 'close') {
    await gh('POST', `/issues/${issue.number}/comments`, { body: `Clean run: 0 critical, 0 major${runUrl ? ` — ${runUrl}` : ''}. Closing.` });
    await gh('PATCH', `/issues/${issue.number}`, { state: 'closed', state_reason: 'completed' });
  }
  console.log(`uiux-issue: ${action} (${blockingCount} critical+major, ${fresh.length} new)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Advisory: a GitHub error is logged, and the workflow's failure step reports it.
  main().catch((e) => { console.error('uiux-issue:', String(e.message || e)); process.exit(1); });
}
