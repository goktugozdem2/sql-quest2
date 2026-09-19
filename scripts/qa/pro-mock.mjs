#!/usr/bin/env node
/**
 * QA harness: a signed-in Pro learner in the local build, hermetic.
 * Same preamble as scripts/ph-gallery/capture.mjs — every request that would
 * leave the machine is answered in-page, so nothing is written to production.
 *
 * Usage: npm run dev (public/ on :4321), then
 *   node scripts/qa/pro-mock.mjs <scenario> [--width=1470 --height=660]
 * Scenarios are functions below; each prints JSON and may write
 * scripts/qa/out/<name>.png.
 */
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const URL = process.env.QA_URL || 'http://127.0.0.1:4321';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9300 + (process.pid % 500);
const OUT = path.join(import.meta.dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const W = Number(arg('width', 1470)); const H = Number(arg('height', 660));

let ws; let msgId = 0; const pending = new Map();
const cdp = (method, params) => new Promise(res => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => { http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => res(JSON.parse(b))); }).on('error', rej); });
async function ev(expr) {
  const r = await cdp('Runtime.evaluate', { expression: `(async () => { try { return { ok: 1, v: await (${expr}) }; } catch (e) { return { ok: 0, e: String(e && e.stack || e) }; } })()`, awaitPromise: true, returnByValue: true });
  const x = r.result?.value || {}; if (!x.ok) throw new Error(x.e || 'eval failed'); return x.v;
}
async function shot(name) { const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(r.data, 'base64')); }

const U = 'qa_pro';
const data = {
  proStatus: true, proType: 'annual', proExpiry: new Date(Date.now() + 300 * 86400000).toISOString(),
  solvedChallenges: [91, 92, 93, 94, 95, 96, 97, 98], challengeAttempts: [], xp: 500,
  hasSeenOnboarding: true, firstRunCompleted: true, lastActive: Date.now(), createdAt: Date.now() - 30 * 86400000,
};
const preamble = `(() => {
  window.__row = ${JSON.stringify({ username: U, data })};
  try {
    if (!sessionStorage.getItem('qa_seeded')) {
      localStorage.clear();
      const seed = ${JSON.stringify({
        sqlquest_user: U, [`sqlquest_user_${U}`]: JSON.stringify(data),
        sqlquest_first_run_completed_v1: 'true', sqlquest_onboarding_v1: 'completed',
        sqlquest_app_tour_v1: 'completed_1', sqlquest_first_entry_tour_v1: 'completed_1',
        sqlquest_challenges_entry_tour_v1: 'completed_1', sqlquest_lang: 'en',
        sqlquest_signup_at: String(Date.now() + 3600000),
      })};
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
      sessionStorage.setItem('qa_seeded', '1');
    }
  } catch (_) {}
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = String(input && input.url ? input.url : input);
    if (/supabase|functions\\/v1|vercel-insights|va\\.vercel|\\/api\\//i.test(url)) {
      const J = { 'Content-Type': 'application/json' };
      if (/rpc\\/sq_save_user/.test(url)) return new Response('', { status: 204, headers: J });
      if (/users_public\\?/.test(url)) return new Response(JSON.stringify([window.__row]), { status: 200, headers: J });
      return new Response('[]', { status: 200, headers: J });
    }
    return real(input, init);
  };
  try { navigator.sendBeacon = () => true; } catch (_) {}
})();`;

const click = (re) => `(() => { const b = [...document.querySelectorAll('button')].find(b => ${re}.test(b.textContent.trim())); if (b) b.click(); return !!b; })()`;

const SCENARIOS = {
  // Open a mock by id and report its shape as the runner shows it.
  async open_mock() {
    const id = arg('id', 'capital-one-live-sql');
    await cdp('Page.navigate', { url: `${URL}/app/?interview=${id}` });
    await wait(6000);
    await shot(`open-${id}`);
    return ev(`({ header: document.querySelector('[data-testid="interview-content"]')?.previousElementSibling?.innerText.replace(/\\s+/g, ' ').slice(0, 160), q: document.querySelector('[data-testid="interview-question"] h3')?.textContent, locked: /Unlock|Upgrade/.test(document.body.innerText.slice(0, 3000)) && !document.querySelector('[data-testid="interview-question"]') })`);
  },
  // Walk Capital One to Q6 answering A each time; record the overlay's box
  // for every MCQ, and Q6's question-card box before and after a pick.
  async c1_overlay() {
    await cdp('Page.navigate', { url: `${URL}/app/?interview=capital-one-codesignal` });
    await wait(6000);
    const boxes = [];
    for (let i = 0; i < 8; i++) {
      const q = await ev(`document.querySelector('[data-testid="interview-question"] h3')?.textContent || null`);
      const before = await ev(`(() => { const el = document.querySelector('[data-testid="interview-question"]'); const r = el && el.getBoundingClientRect(); return r ? Math.round(r.top) : null; })()`);
      const layout = await ev(`(() => { const pane = document.querySelector('[data-testid="interview-content"]'); const hdr = pane && pane.previousElementSibling; return { paneTop: pane && Math.round(pane.getBoundingClientRect().top), paneScroll: pane && pane.scrollTop, hdrH: hdr && Math.round(hdr.getBoundingClientRect().height), hdrText: hdr && hdr.innerText.replace(/\\s+/g, ' ').slice(0, 160) }; })()`);
      await ev(`(() => { const o = document.querySelector('[data-testid^="interview-mcq-option-"]'); if (o) o.click(); return true; })()`);
      await wait(200);
      const after = await ev(`(() => { const el = document.querySelector('[data-testid="interview-question"]'); const r = el && el.getBoundingClientRect(); return r ? Math.round(r.top) : null; })()`);
      await ev(`(() => { const b = document.querySelector('[data-testid="interview-mcq-submit"]'); if (b) b.click(); return true; })()`);
      await wait(500);
      const ov = await ev(`(() => { const d = [...document.querySelectorAll('.fixed.inset-0 > div')].find(e => /Next question|See results/.test(e.innerText)); if (!d) return null; const r = d.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height) }; })()`);
      if (i === 5) await shot('c1-q6-overlay');
      boxes.push({ q, cardTopBeforePick: before, cardTopAfterPick: after, overlay: ov, layout });
      await ev(click('/^Next question/'));
      await wait(600);
    }
    return boxes;
  },
  // Practice mode: Q11 shows its trap note and the original title.
  async c1_practice_note() {
    await cdp('Page.navigate', { url: `${URL}/app/?interview=capital-one-codesignal` });
    await wait(6000);
    return ev(`(async () => {
      const w = ms => new Promise(r => setTimeout(r, ms));
      // leave the timed run, open the same mock in practice mode
      window.confirm = () => true;
      const quit = [...document.querySelectorAll('button')].find(b => /Quit/.test(b.textContent)); if (quit) quit.click();
      await w(800);
      const tab = [...document.querySelectorAll('button')].find(b => /Interview/i.test(b.textContent) && b.textContent.length < 30); if (tab) tab.click();
      await w(800);
      const card = [...document.querySelectorAll('h3')].find(h => /Capital One/.test(h.textContent));
      const root = card && card.closest('.rounded-xl');
      const practice = root && [...root.querySelectorAll('button')].find(b => /Practice/.test(b.textContent));
      if (!practice) return { error: 'no practice button', cards: [...document.querySelectorAll('h3')].map(h => h.textContent).slice(0, 12) };
      practice.click(); await w(1500);
      for (let i = 0; i < 10; i++) {
        const next = [...document.querySelectorAll('button')].find(b => /^Next Question →$/.test(b.textContent.trim()));
        if (next) next.click(); await w(400);
        const n2 = [...document.querySelectorAll('button')].find(b => /^Next question →$/.test(b.textContent.trim()));
        if (n2) n2.click(); await w(400);
      }
      return { title: document.querySelector('[data-testid="interview-question"] h3')?.textContent, note: document.querySelector('[data-testid="interview-practice-note"]')?.textContent || null };
    })()`);
  },
};

async function main() {
  const name = process.argv[2];
  if (!SCENARIOS[name]) { console.error(`scenarios: ${Object.keys(SCENARIOS).join(', ')}`); process.exit(2); }
  const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', `--user-data-dir=/tmp/chrome-qa-${Date.now()}`, 'about:blank'], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) { try { if ((await getJSON(`http://127.0.0.1:${PORT}/json`)).length) break; } catch (_) {} await wait(200); }
    const tab = (await getJSON(`http://127.0.0.1:${PORT}/json`)).find(t => t.type === 'page');
    const WebSocket = (await import('ws')).WebSocket;
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
    ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m); pending.delete(m.id); } });
    await cdp('Page.enable', {}); await cdp('Runtime.enable', {});
    await cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await cdp('Page.addScriptToEvaluateOnNewDocument', { source: preamble });
    console.log(JSON.stringify(await SCENARIOS[name](), null, 2));
  } finally { try { ws.close(); } catch (_) {} chrome.kill('SIGKILL'); }
}
main().catch(e => { console.error(e); process.exit(1); });
