#!/usr/bin/env node
/**
 * Browser smoke test — runs a battery of checks against a local dev
 * server to catch regressions that unit tests can't reach (React
 * rendering, tab navigation, Coach engine integration, notifications).
 *
 * Usage:
 *   1. Start the server: `npm run dev` (python serves public/ on :4321)
 *      OR `npm run dev:vite` (Vite on :5173)
 *   2. Run: `node scripts/smoke-test.js [http://localhost:4321]`
 *
 * Exits non-zero if any check fails. Designed for CI / pre-push hook.
 *
 * Requires: Google Chrome installed at the macOS default location.
 * Uses Chrome's remote debugging protocol via a fresh headless instance.
 */

import { spawn } from 'child_process';
import http from 'http';

const URL = process.argv[2] || 'http://127.0.0.1:4321';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = 9222;

const checks = [];
const pass = (name) => { checks.push({ name, ok: true }); };
const fail = (name, why) => { checks.push({ name, ok: false, why }); };

async function evalInPage(tab, expr) {
  const res = await cdp(tab, 'Runtime.evaluate', {
    expression: `(async () => { try { const r = await (${expr}); return { ok: true, value: r }; } catch(e) { return { ok: false, err: String(e) }; } })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const r = res.result?.value || {};
  if (!r.ok) throw new Error(r.err || 'eval failed');
  return r.value;
}

let msgId = 0;
const pending = new Map();
let ws;

function cdp(tabId, method, params) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

async function main() {
  console.log(`Smoke test → ${URL}`);
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=/tmp/chrome-smoke-' + Date.now(),
    URL + '/app.html',
  ], { stdio: 'ignore' });

  // Wait for Chrome debug port
  for (let i = 0; i < 30; i++) {
    try {
      const tabs = await getJSON(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (tabs.length > 0) break;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }

  const tabs = await getJSON(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const tab = tabs.find(t => t.type === 'page');
  if (!tab) throw new Error('no tab');

  const WebSocket = (await import('ws')).WebSocket;
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result || msg);
    }
  });

  // Wait for app to render
  await new Promise(r => setTimeout(r, 3000));

  // ── Checks ────────────────────────────────────────────────────
  try {
    const boot = await evalInPage(tab, `{ hasSQLQuest: typeof window.SQLQuest, hasReact: typeof window.React, goalsCount: (window.coachGoals || []).length, challengesCount: (window.challengesData || []).length, lessonsCount: (window.aiLessonsData || []).length }`);
    if (boot.hasSQLQuest === 'function') pass('window.SQLQuest is a function');
    else fail('window.SQLQuest is a function', `got ${boot.hasSQLQuest}`);
    if (boot.hasReact === 'object') pass('window.React is an object');
    else fail('window.React is an object', `got ${boot.hasReact}`);
    if (boot.goalsCount >= 2) pass(`${boot.goalsCount} coach goals loaded`);
    else fail('at least 2 coach goals', `got ${boot.goalsCount}`);
    if (boot.challengesCount >= 100) pass(`${boot.challengesCount} challenges loaded`);
    else fail('at least 100 challenges', `got ${boot.challengesCount}`);
    if (boot.lessonsCount >= 10) pass(`${boot.lessonsCount} AI lessons loaded`);
    else fail('at least 10 AI lessons', `got ${boot.lessonsCount}`);

    // Render-state check — fresh headless Chrome has no logged-in user,
    // so we either land on a guest auth screen or see a "continue as
    // guest" path. Check for EITHER the tabs (logged-in) OR the auth
    // surface (guest). Both are valid boot states.
    const renderState = await evalInPage(tab, `
      (() => {
        const tabs = Array.from(document.querySelectorAll('button')).filter(b => /^(🧭|📝|💼|🏅|👤)/.test(b.textContent?.trim() || '')).map(b => b.textContent.trim());
        const hasAuth = !!Array.from(document.querySelectorAll('h1,h2,h3,button')).find(el => /sign\\s*in|sign\\s*up|create account|get started/i.test(el.textContent || ''));
        const hasLoading = !!document.querySelector('.loading-container');
        return { tabs, hasAuth, hasLoading };
      })()`);
    if (!renderState.hasLoading) pass('app has moved past the loading screen');
    else fail('app has moved past the loading screen', 'still showing loading-container');

    const hasAppUI = renderState.tabs.length >= 5 || renderState.hasAuth;
    if (hasAppUI) pass(`app shell rendered (tabs=${renderState.tabs.length} / hasAuth=${renderState.hasAuth})`);
    else fail('app shell rendered', 'no tabs AND no auth surface');

    // If we did land on the logged-in shell, check the Coach tab.
    // Otherwise skip — the auth flow requires real credentials we don't
    // have in CI.
    if (renderState.tabs.includes('🧭 Coach')) {
      const coachClick = await evalInPage(tab, `
        (async () => {
          const b = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === '🧭 Coach');
          b?.click();
          await new Promise(r => setTimeout(r, 300));
          return Array.from(document.querySelectorAll('button')).find(b => b.className?.includes('bg-purple-600 shadow-lg'))?.textContent?.trim();
        })()`);
      if (coachClick === '🧭 Coach') pass('Coach tab activates on click');
      else fail('Coach tab activates on click', `got ${coachClick}`);
    } else {
      pass('(skipped logged-in Coach check — no session)');
    }

  } finally {
    ws.close();
    chrome.kill();
  }

  // ── Report ────────────────────────────────────────────────────
  console.log('');
  let failed = 0;
  for (const c of checks) {
    if (c.ok) console.log(`  ✓ ${c.name}`);
    else { console.log(`  ✗ ${c.name} — ${c.why}`); failed++; }
  }
  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error('Smoke test crashed:', e); process.exit(2); });
