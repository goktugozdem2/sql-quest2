#!/usr/bin/env node
/**
 * Product Hunt gallery, step 1 of 2: real screenshots of the real app.
 *
 * docs/marketing/product-hunt-launch-kit-2026-09-14.md §3 asks for five
 * frames. Every one of them is the live bundle rendering a seeded profile —
 * no mock-up of a screen, because a launch page that shows a screen the
 * product does not have is the one thing a PH commenter will catch.
 *
 * HERMETIC, same preamble as scripts/e2e-verify.mjs: the local app points at
 * the production Supabase project, so every request that would leave the
 * machine is answered in-page. A seeded 40-solve "guest" must never be saved
 * as a real row.
 *
 * Dark flags stay dark. Nothing here passes ?ff_features_… — the gallery
 * shows what a visitor on launch day sees.
 *
 * Usage: npm run dev   (public/ on :4321), then
 *        node scripts/ph-gallery/capture.mjs [shot…]
 * Output: scripts/ph-gallery/raw/<shot>.png at 2× device scale.
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { mapTopicToSkill } from '../../src/utils/skill-calc.js';

const URL = process.env.PH_URL || 'http://127.0.0.1:4321';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9400 + (process.pid % 500);
const OUT = path.join(import.meta.dirname, 'raw');
fs.mkdirSync(OUT, { recursive: true });

let msgId = 0;
const pending = new Map();
let ws;
let ROW = null;
const cdp = (method, params) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const wait = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => {
  http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => res(JSON.parse(b))); }).on('error', rej);
});

export async function ev(expr) {
  const r = await cdp('Runtime.evaluate', {
    expression: `(async () => { try { return { ok: 1, v: await (${expr}) }; } catch (e) { return { ok: 0, e: String(e && e.stack || e) }; } })()`,
    awaitPromise: true, returnByValue: true,
  });
  const x = r.result?.value || {};
  if (!x.ok) throw new Error(x.e || 'eval failed');
  return x.v;
}

const preamble = seed => `
(() => {
  window.__row = ${JSON.stringify(ROW)};
  try {
    localStorage.clear();
    const seed = ${JSON.stringify(seed)};
    for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  } catch (_) {}
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input && input.url ? input.url : input);
    if (/supabase|functions\\/v1|vercel-insights|va\\.vercel|\\/api\\//i.test(url)) {
      const J = { 'Content-Type': 'application/json' };
      if (/rpc\\/sq_save_user/.test(url)) return new Response('', { status: 204, headers: J });
      if (/users_public\\?/.test(url) && window.__row) return new Response(JSON.stringify([window.__row]), { status: 200, headers: J });
      return new Response('[]', { status: 200, headers: J });
    }
    return real(input, init);
  };
  // sendBeacon is the other way out.
  try { navigator.sendBeacon = () => true; } catch (_) {}
})();
`;

async function load(seed, p) {
  if (load._id) await cdp('Page.removeScriptToEvaluateOnNewDocument', { identifier: load._id }).catch(() => {});
  const r = await cdp('Page.addScriptToEvaluateOnNewDocument', { source: preamble(seed) });
  load._id = r.identifier;
  await cdp('Page.navigate', { url: URL + p });
  await wait(3500);
}

async function viewport(width, height) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: false });
}

async function shot(name, clip) {
  const params = { format: 'png', captureBeyondViewport: !!clip };
  if (clip) params.clip = { ...clip, scale: 1 };
  const r = await cdp('Page.captureScreenshot', params);
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
}

/** Close whatever modal the seeded state pops (achievements, asks). */
const closeModals = `(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 6; i++) {
    const b = Array.from(document.querySelectorAll('button')).find(b => /^(✕|×|Close|Maybe later|Not now)$/i.test((b.textContent || '').trim()) && b.offsetParent);
    if (!b) break;
    b.click(); await w(350);
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await w(300);
  return true;
})()`;

// ── the seeded learner ─────────────────────────────────────────────────────
//
// An uneven Skillmap is the point of frame 1: strong on joins and
// aggregation, middling on CTEs, thin on window functions and NULLs. Built
// from the live bank so every id is real.
const localDay = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

function buildSeed(bank, achievementIds) {
  // Share of each skill's questions solved. Tuned against calculateSkillLevels
  // on the live bank (overall ≈ 55, Window Functions ≈ 28, NULL ≈ 31): the
  // shape of someone six weeks into interview prep who has avoided windows.
  // Challenges tag several skills, so the strong skills skip anything tagged
  // with the two weak ones — otherwise solving joins quietly fills them in.
  const share = { 'Joins': 0.75, 'Aggregation & Grouping': 0.55, 'Subqueries & CTEs': 0.5, 'Conditional Logic': 0.55, 'String Functions': 0.6, 'Date Functions': 0.3, 'NULL Handling': 0.12, 'Window Functions': 0.03 };
  const WEAK = ['Window Functions', 'NULL Handling'];
  const rank = { Easy: 0, Medium: 1, Hard: 2 };
  const picked = new Map();
  for (const [skill, f] of Object.entries(share)) {
    const all = bank.filter(c => c.canon.includes(skill));
    const pool = all
      .filter(c => !picked.has(c.id) && WEAK.every(w => w === skill || !c.canon.includes(w)))
      .sort((x, y) => rank[x.difficulty] - rank[y.difficulty]);
    for (const c of pool.slice(0, Math.round(f * all.length))) picked.set(c.id, c);
  }
  const now = Date.now();
  const solved = [...picked.values()];
  const attempts = [];
  solved.forEach((c, i) => {
    const t = now - (solved.length - i) * 5.2 * 3600 * 1000;
    if (i % 5 === 0) attempts.push({ challengeId: c.id, correct: false, topics: c.topics, timestamp: t - 600000, difficulty: c.difficulty });
    attempts.push({ challengeId: c.id, correct: true, topics: c.topics, timestamp: t, difficulty: c.difficulty });
  });
  // Two misses on window functions with no solve: the gap the coach reads.
  bank.filter(c => c.canon.includes('Window Functions') && !picked.has(c.id)).slice(0, 2)
    .forEach((c, i) => attempts.push({ challengeId: c.id, correct: false, topics: c.topics, timestamp: now - (i + 1) * 3600 * 1000, difficulty: c.difficulty }));
  return {
    solvedChallenges: solved.map(c => c.id),
    challengeAttempts: attempts,
    xp: 9420, level: 14, streak: 12, longestStreak: 12,
    dailyStreak: 12, maxDailyStreak: 12, lastStreakDay: localDay(now),
    lastActive: now, createdAt: now - 42 * 86400000,
    hasSeenOnboarding: true, firstRunCompleted: true,
    // Every achievement pre-awarded: an unlock toast over a gallery frame is noise.
    unlockedAchievements: achievementIds,
  };
}

async function main() {
  const only = process.argv.slice(2);
  const want = n => !only.length || only.includes(n);
  console.log(`PH gallery capture → ${URL}`);
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    `--user-data-dir=/tmp/chrome-ph-${Date.now()}`, 'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try { if ((await getJSON(`http://127.0.0.1:${PORT}/json`)).length) break; } catch (_) {}
    await wait(200);
  }
  const tab = (await getJSON(`http://127.0.0.1:${PORT}/json`)).find(t => t.type === 'page');
  const WebSocket = (await import('ws')).WebSocket;
  ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
  ws.on('message', d => {
    const m = JSON.parse(d.toString());
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m.result || m); pending.delete(m.id); }
  });
  await cdp('Page.enable', {});
  await cdp('Runtime.enable', {});

  try {
    await viewport(1440, 900);
    await load({}, '/app/');
    const bank = await ev(`(window.challengesData || []).map(c => ({
      id: c.id, difficulty: c.difficulty,
      topics: [...(c.skills || []), c.category].filter(Boolean),
    }))`);
    for (const c of bank) c.canon = [...new Set(c.topics.map(t => mapTopicToSkill(t)).filter(Boolean))];
    if (process.env.PH_DUMP) { fs.writeFileSync(path.join(OUT, 'bank.json'), JSON.stringify(await ev(`window.challengesData`))); process.exit(0); }
    const achievementIds = await ev(`(window.gameAchievements || []).map(a => a.id)`);
    const data = buildSeed(bank, achievementIds);
    // A signed-in account, not a guest: the gallery shows the product as a
    // returning learner sees it. The read of the row is answered in-page.
    const G = 'maya_k';
    ROW = { username: G, data };
    const seed = {
      sqlquest_user: G, [`sqlquest_user_${G}`]: data,
      sqlquest_first_run_completed_v1: 'true',
      sqlquest_first_entry_tour_v1: 'completed_1',
      sqlquest_challenges_entry_tour_v1: 'completed_1',
      sqlquest_app_tour_v1: 'completed_1',
      sqlquest_onboarding_v1: 'completed',
      sqlquest_first_run_level: 'working',
      // Suppresses the daily-reward calendar, which is written to skip anyone
      // who signed up in the last five minutes.
      sqlquest_signup_at: String(Date.now() + 3600 * 1000),
    };
    fs.writeFileSync(path.join(OUT, 'seed.json'), JSON.stringify({ solves: data.solvedChallenges.length, ids: data.solvedChallenges }, null, 2));

    const mod = await import('./shots.mjs');
    for (const s of mod.SHOTS) {
      if (!want(s.name)) continue;
      console.log(`→ ${s.name}`);
      await viewport(s.width || 1440, s.height || 900);
      const G2 = seed.sqlquest_user;
      const shotSeed = s.cold ? {} : s.patch ? { ...seed, [`sqlquest_user_${G2}`]: { ...data, ...s.patch } } : seed;
      ROW = s.cold ? null : { username: G2, data: shotSeed[`sqlquest_user_${G2}`] };
      await load(shotSeed, s.path);
      await ev(closeModals);
      const clip = await s.prepare({ ev, wait, closeModals: () => ev(closeModals) });
      await wait(600);
      // A prepare may return several named clips from one page state.
      if (Array.isArray(clip)) for (const c of clip) await shot(`${s.name}-${c.part}`, c.clip);
      else await shot(s.name, clip || undefined);
    }
  } finally {
    try { ws.close(); } catch (_) {}
    chrome.kill('SIGKILL');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
