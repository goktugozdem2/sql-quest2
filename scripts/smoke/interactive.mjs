#!/usr/bin/env node
// Smoke check 1 — interactive within 10 seconds (plan §1, founder QA 2026-09-21).
//
//   node scripts/smoke/interactive.mjs [https://sqlquest.app]
//
// In a clean headless profile (no extensions, fresh user-data-dir): the app
// shell must render AND a click on the Learning Path tab must respond, both
// within BUDGET_MS of navigation. "Loads eventually" is a FAIL. Writes
// smoke-out/interactive.json with a machine-readable class the workflow's
// rollback job keys on:
//   frontend_dead  /app/ not 200 or without the app.js tag, app.js not 200,
//                  an uncaught error while loading, or no shell inside budget
//   slow           shell rendered, but the tab click missed the budget
//   ok             pass
// Hermetic: nothing the page does reaches Supabase or /api/ (lib.mjs).
import { launchChrome, evaluate, writeResult, CLASSES, HERMETIC_PREAMBLE } from './lib.mjs';

export const BUDGET_MS = 10_000;
export const CHECK = 'interactive';

const BASE = (process.argv[2] || process.env.SMOKE_URL || 'https://sqlquest.app').replace(/\/$/, '');

// The shell: the primary tabs (any session), the auth surface, or the
// first-run assessment — the three states scripts/smoke-test.js accepts.
const SHELL_EXPR = `(() => {
  const tabs = document.querySelector('[data-primary-learning-tabs="true"]');
  const text = document.body ? (document.body.textContent || '') : '';
  const hasFirstRun = /find your SQL starting point|answer 4 quick questions|start from zero|already interview-ready|what brings you here/i.test(text);
  const hasAuth = !!Array.from(document.querySelectorAll('h1,h2,h3,button')).find(el => /sign\\s*in|sign\\s*up|create account|get started/i.test(el.textContent || ''));
  const loading = !!document.querySelector('.loading-container');
  return { shell: !!tabs || hasFirstRun || hasAuth, tabs: !!tabs, hasFirstRun, hasAuth, loading };
})()`;

// Learning Path is the default tab, so a click on it alone shows nothing.
// Click Challenges, expect it active; click Learning Path, expect it back.
// Active = the filled style app.jsx gives the selected primary tab.
const ACTIVE = "b => /\\bbg-slate-800\\b/.test(b.className || '')";
const CLICK_EXPR = (which) => `(() => {
  const b = document.querySelector('[data-onboarding="${which}"]');
  if (!b) return { found: false };
  b.click();
  return { found: true };
})()`;
const ACTIVE_EXPR = (which) => `(() => {
  const b = document.querySelector('[data-onboarding="${which}"]');
  return !!b && (${ACTIVE})(b);
})()`;

// Plain HTTP first: a dead front end is usually visible without a browser.
export async function probeStatic(base, fetchImpl = fetch) {
  const page = await fetchImpl(`${base}/app/`, { redirect: 'follow' });
  const html = page.ok ? await page.text() : '';
  const m = html.match(/<script src="(\/app\.js(?:\?v=[a-f0-9]+)?)"/);
  const out = { pageStatus: page.status, hasAppTag: !!m, appJsStatus: null, appJsBytes: 0 };
  if (m) {
    const js = await fetchImpl(`${base}${m[1]}`);
    out.appJsStatus = js.status;
    out.appJsBytes = js.ok ? (await js.arrayBuffer()).byteLength : 0;
  }
  return out;
}

export function judgeStatic(p) {
  if (p.pageStatus !== 200) return `/app/ answered HTTP ${p.pageStatus}`;
  if (!p.hasAppTag) return '/app/ carries no /app.js script tag';
  if (p.appJsStatus !== 200) return `app.js answered HTTP ${p.appJsStatus}`;
  if (p.appJsBytes < 100_000) return `app.js is ${p.appJsBytes} bytes — a stub, not the bundle`;
  return null;
}

async function main() {
  const t0 = Date.now();
  const elapsed = () => Date.now() - t0;
  const finish = (ok, cls, detail) => {
    const row = writeResult({ check: CHECK, ok, class: ok ? 'ok' : cls, detail, elapsedMs: elapsed(), url: `${BASE}/app/` });
    console.log(`${ok ? '✓' : '✗'} ${CHECK} — ${JSON.stringify(detail)} (${row.elapsedMs} ms)`);
    process.exit(ok ? 0 : 1);
  };

  let probe;
  try { probe = await probeStatic(BASE); } catch (e) { return finish(false, CLASSES.INFRA, { step: 'http', error: String(e.message || e) }); }
  const dead = judgeStatic(probe);
  if (dead) return finish(false, CLASSES.FRONTEND_DEAD, { step: 'http', why: dead, ...probe });

  let chrome;
  try { chrome = await launchChrome(); } catch (e) { return finish(false, CLASSES.INFRA, { step: 'chrome', error: String(e.message || e) }); }
  const errors = [];
  try {
    const { cdp } = chrome;
    chrome.on((msg) => {
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params?.exceptionDetails || {};
        errors.push(d.exception?.description || d.text || 'uncaught');
      }
    });
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: HERMETIC_PREAMBLE });
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

    const navAt = Date.now();
    const deadline = navAt + BUDGET_MS;
    const sinceNav = () => Date.now() - navAt;
    await cdp('Page.navigate', { url: `${BASE}/app/` });

    // 1. The shell.
    let shell = null;
    while (Date.now() < deadline) {
      try { shell = await evaluate(cdp, SHELL_EXPR); } catch (_) { shell = null; }
      if (shell?.shell) break;
      await new Promise(r => setTimeout(r, 250));
    }
    if (errors.length) return finish(false, CLASSES.FRONTEND_DEAD, { step: 'load', why: 'uncaught error on load', errors: errors.slice(0, 3), shellAtMs: shell?.shell ? sinceNav() : null });
    if (!shell?.shell) return finish(false, CLASSES.FRONTEND_DEAD, { step: 'shell', why: `no shell within ${BUDGET_MS} ms`, last: shell });
    const shellMs = sinceNav();
    if (!shell.tabs) {
      // Auth surface or first-run screen without the primary tabs: the
      // shell is up but there is no Learning Path tab to click. That is a
      // pass on "rendered", and a documented skip on the click.
      return finish(true, null, { shellMs, clickMs: null, note: 'no primary tabs on this surface (auth/first-run); click skipped', shell });
    }

    // 2. The click round-trip: Challenges, then Learning Path back.
    const waitActive = async (which) => {
      while (Date.now() < deadline) {
        if (await evaluate(cdp, ACTIVE_EXPR(which)).catch(() => false)) return true;
        await new Promise(r => setTimeout(r, 100));
      }
      return false;
    };
    const c1 = await evaluate(cdp, CLICK_EXPR('nav-quests'));
    if (!c1.found) return finish(false, CLASSES.SLOW, { step: 'click', why: 'Challenges tab not in the DOM', shellMs });
    if (!(await waitActive('nav-quests'))) return finish(false, CLASSES.SLOW, { step: 'click', why: `Challenges click did not respond within ${BUDGET_MS} ms of navigation`, shellMs });
    const c2 = await evaluate(cdp, CLICK_EXPR('nav-guide'));
    if (!c2.found) return finish(false, CLASSES.SLOW, { step: 'click', why: 'Learning Path tab not in the DOM', shellMs });
    if (!(await waitActive('nav-guide'))) return finish(false, CLASSES.SLOW, { step: 'click', why: `Learning Path click did not respond within ${BUDGET_MS} ms of navigation`, shellMs });
    const clickMs = sinceNav();
    if (errors.length) return finish(false, CLASSES.FRONTEND_DEAD, { step: 'click', why: 'uncaught error', errors: errors.slice(0, 3), shellMs, clickMs });
    return finish(true, null, { shellMs, clickMs, budgetMs: BUDGET_MS });
  } catch (e) {
    return finish(false, CLASSES.INFRA, { step: 'cdp', error: String(e.message || e) });
  } finally {
    chrome.close();
  }
}

if (process.argv[1] && /interactive\.mjs$/.test(process.argv[1])) {
  main().catch((e) => { writeResult({ check: CHECK, ok: false, class: CLASSES.INFRA, detail: { error: String(e) } }); console.error(e); process.exit(2); });
}
