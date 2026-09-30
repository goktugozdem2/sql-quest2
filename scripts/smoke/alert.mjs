#!/usr/bin/env node
// The alert (plan §2): on failure only, ONE email through Resend, deduplicated
// per failing check per calendar day (UTC). The dedupe key lives in the one
// GitHub issue labelled `smoke` — the same place the GSC workflows keep
// their failures (scripts/gsc/notify-failure.sh): each alert comments there
// with a marker `<!-- smoke:<check>:<date> -->` per check, and a check that
// already carries today's marker is not mailed again. Resend hit 80% of its
// daily quota on 2026-09-12; a mail per run would compete with real mail.
//
//   GH_TOKEN=… RESEND_API_KEY=… REPORT_TO=… RUN_URL=… node scripts/smoke/alert.mjs
// Optional: ROLLBACK_RESULT (JSON from vercel-rollback.mjs), DEPLOY_LIVE=false.
import { execFileSync } from 'node:child_process';
import { readResults, classifyRun } from './lib.mjs';

export const LABEL = 'smoke';
export const ISSUE_TITLE = 'Smoke bot: production check failures';
export const FROM = 'SQL Quest smoke bot <noreply@sqlquest.app>';

export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
export const markerFor = (check, day) => `<!-- smoke:${check}:${day} -->`;
export const markersIn = (text) => [...String(text || '').matchAll(/<!-- smoke:([a-z0-9_-]+):(\d{4}-\d{2}-\d{2}) -->/g)].map(m => ({ check: m[1], day: m[2] }));

// Which of the failing checks have not been alerted today.
export function newFailures(failed, seenMarkers, day = utcDay()) {
  const seen = new Set(seenMarkers.filter(m => m.day === day).map(m => m.check));
  return failed.filter(c => !seen.has(c));
}

// The subject names the failing check(s) — the founder reads it on a phone.
export function subjectFor(checks, { rolledBack = false } = {}) {
  const list = checks.join(', ');
  return `[smoke] ${list} failed on sqlquest.app${rolledBack ? ' — rolled back' : ''}`;
}

export function renderBody({ results, failed, runUrl, rollback, deployLive, day }) {
  const lines = [];
  lines.push(`Smoke run ${new Date().toISOString()} — failing: ${failed.join(', ')}`);
  if (deployLive === false) lines.push('The deploy marker never went live within 10 minutes; the checks ran against whatever was serving.');
  if (rollback) {
    if (rollback.rolledBack) lines.push(`ROLLED BACK: production ${rollback.from || '?'} → ${rollback.to} (${rollback.commit || 'commit unknown'}). A human fix follows, not a retry.`);
    else if (rollback.skipped) lines.push(`Rollback skipped: ${rollback.skipped}.`);
    else if (rollback.error) lines.push(`Rollback FAILED: ${rollback.error}`);
  }
  lines.push('');
  for (const r of results.filter(r => r.ok === false)) {
    lines.push(`✗ ${r.check} [${r.class}]`);
    lines.push('  ' + JSON.stringify(r.detail).slice(0, 900));
  }
  const advisory = results.filter(r => r.ok === false && r.class === 'advisory');
  if (advisory.length) {
    lines.push('', 'advisory (not counted as a failure — see scripts/smoke/lib.mjs classifyRun):');
    for (const r of advisory) lines.push(`  ~ ${r.check}: ${JSON.stringify(r.detail).slice(0, 600)}`);
  }
  const passed = results.filter(r => r.ok === true).map(r => r.check);
  if (passed.length) lines.push('', `passed: ${passed.join(', ')}`);
  // A pass that carries a note (tutor-health on a 429: the limiter answered,
  // the model was not reached) is said, so a pass is never read as more than it was.
  for (const r of results.filter(r => r.ok === true && r.detail && r.detail.note)) lines.push(`  note, ${r.check}: ${r.detail.note}`);
  lines.push('', `Run: ${runUrl || '(local)'}`);
  lines.push('', ...failed.map(c => markerFor(c, day)));
  return lines.join('\n');
}

function gh(args) {
  return execFileSync('gh', args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
}

export function findIssue() {
  const out = gh(['issue', 'list', '--label', LABEL, '--state', 'open', '--search', `"${ISSUE_TITLE}" in:title`, '--json', 'number,body', '--limit', '1']);
  const arr = JSON.parse(out || '[]');
  return arr[0] || null;
}

export function issueMarkers(issue) {
  if (!issue) return [];
  const markers = markersIn(issue.body);
  try {
    const comments = gh(['issue', 'view', String(issue.number), '--json', 'comments', '--jq', '[.comments[].body] | join("\n")']);
    markers.push(...markersIn(comments));
  } catch (_) { /* no comments yet */ }
  return markers;
}

export async function sendMail({ env = process.env, fetchImpl = fetch, subject, text }) {
  if (!env.RESEND_API_KEY || !env.REPORT_TO) return { mailed: false, why: 'RESEND_API_KEY / REPORT_TO not set' };
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [env.REPORT_TO], subject, text }),
  });
  if (!res.ok) throw new Error(`mail → HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
  return { mailed: true };
}

async function main() {
  const results = readResults();
  const { failed, frontendDead } = classifyRun(results);
  const deployLive = process.env.DEPLOY_LIVE === 'false' ? false : undefined;
  let rollback = null;
  try { rollback = process.env.ROLLBACK_RESULT ? JSON.parse(process.env.ROLLBACK_RESULT) : null; } catch (_) { rollback = { error: 'unparseable ROLLBACK_RESULT' }; }
  if (!failed.length) { console.log('nothing failed — no alert'); return; }

  const day = utcDay();
  let issue = null; let seen = [];
  try { issue = findIssue(); seen = issueMarkers(issue); } catch (e) { console.warn(`gh unavailable (${String(e.message).split('\n')[0]}) — alerting without dedupe`); }
  const fresh = newFailures(failed, seen, day);
  if (!fresh.length) { console.log(`already alerted today for ${failed.join(', ')} — no comment, no mail`); return; }

  const body = renderBody({ results, failed, runUrl: process.env.RUN_URL, rollback, deployLive, day });
  try {
    gh(['label', 'create', LABEL, '--color', 'B60205', '--description', 'Smoke bot: production checks', '--force']);
    if (issue) gh(['issue', 'comment', String(issue.number), '--body', body]);
    else gh(['issue', 'create', '--title', ISSUE_TITLE, '--label', LABEL, '--body', body]);
  } catch (e) { console.warn(`issue write failed: ${String(e.message).split('\n')[0]}`); }

  const subject = subjectFor(fresh, { rolledBack: !!rollback?.rolledBack });
  const mail = await sendMail({ subject, text: body });
  console.log(`${mail.mailed ? 'mailed' : `not mailed (${mail.why})`}: ${subject}${frontendDead ? ' [frontend_dead]' : ''}`);
}

if (process.argv[1] && /alert\.mjs$/.test(process.argv[1])) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
