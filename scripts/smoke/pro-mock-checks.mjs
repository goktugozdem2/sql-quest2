#!/usr/bin/env node
// Smoke check 3 — three scripts/qa/pro-mock.mjs scenarios against production.
//
//   node scripts/smoke/pro-mock-checks.mjs [https://sqlquest.app]
//
// pro-mock.mjs is hermetic by construction: its preamble answers every
// Supabase / functions / vercel / /api/ request in-page, so a run against
// production writes no row and no event (verified in its source, 2026-09-29).
// That is why these may run daily. Each scenario prints JSON; this wrapper
// turns three of them into pass/fail on the plan's list — "the Pro modal
// opens", "a deep link keeps the session", "the app loads (with its tabs)".
// Not run: `leaderboard_load` (35 s of polling), the streak and mock-walk
// scenarios (screenshots for a human), anything with --solve/--claim.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { writeResult, CLASSES, resolveChrome } from './lib.mjs';

export const CHECK = 'pro-mock';
export const SCENARIOS = ['price_modal_copy', 'deeplink_session', 'free_interview_surface'];

// One judge per scenario, over the JSON the scenario prints.
export const JUDGES = {
  price_modal_copy: (r) => r.modalOpen === true && (r.prices || []).some(p => /^\$(29|99)/.test(p)) ? null : `Pro modal did not open with the plans: ${JSON.stringify({ modalOpen: r.modalOpen, prices: r.prices })}`,
  deeplink_session: (r) => r.late && r.late.savedUser === 'qa_pro' && r.late.guestBanner === false && r.late.openedChallenge ? null : `deep link lost the session or the challenge: ${JSON.stringify(r.late)}`,
  free_interview_surface: (r) => r.hasInterviewTab === true && r.tabsText && r.tabsText !== 'NO TABS BLOCK' ? null : `app shell without the tabs or the Interview tab: ${JSON.stringify({ hasInterviewTab: r.hasInterviewTab, tabsText: r.tabsText })}`,
};

function runScenario(name, { base, extra = [] }) {
  return new Promise((resolve) => {
    const script = path.join(process.cwd(), 'scripts', 'qa', 'pro-mock.mjs');
    const child = spawn(process.execPath, [script, name, ...extra], {
      env: { ...process.env, QA_URL: base, CHROME: process.env.CHROME || safeChrome() },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = ''; let err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    const timer = setTimeout(() => child.kill('SIGKILL'), 90_000);
    child.on('close', (code) => {
      clearTimeout(timer);
      let json = null;
      try { json = JSON.parse(out.slice(out.indexOf('{'))); } catch (_) { /* no JSON */ }
      resolve({ name, code, json, err: err.slice(-400) });
    });
  });
}

function safeChrome() { try { return resolveChrome(); } catch (_) { return ''; } }

export function judge(results) {
  const failures = [];
  for (const r of results) {
    if (r.code !== 0 || !r.json) { failures.push({ scenario: r.name, why: `scenario exited ${r.code} without JSON`, stderr: r.err }); continue; }
    const why = JUDGES[r.name](r.json);
    if (why) failures.push({ scenario: r.name, why });
  }
  return failures;
}

async function main() {
  const base = (process.argv[2] || process.env.SMOKE_URL || 'https://sqlquest.app').replace(/\/$/, '');
  const results = [];
  for (const name of SCENARIOS) {
    // Both the modal and the Interview surface are read as the free
    // zero-solve account (a Pro account has no modal to open — measured
    // against production 2026-09-29: modalOpen=false without --free).
    const extra = name === 'deeplink_session' ? [] : ['--free'];
    results.push(await runScenario(name, { base, extra }));
  }
  const failures = judge(results);
  const ok = failures.length === 0;
  writeResult({ check: CHECK, ok, class: ok ? 'ok' : CLASSES.BUSINESS, detail: { scenarios: SCENARIOS, failures } });
  for (const r of results) console.log(`${failures.some(f => f.scenario === r.name) ? '✗' : '✓'} ${CHECK}/${r.name}`);
  if (!ok) console.log(JSON.stringify(failures, null, 2));
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] && /pro-mock-checks\.mjs$/.test(process.argv[1])) {
  main().catch((e) => { writeResult({ check: CHECK, ok: false, class: CLASSES.INFRA, detail: { error: String(e) } }); console.error(e); process.exit(2); });
}
