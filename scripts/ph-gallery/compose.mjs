#!/usr/bin/env node
/**
 * Product Hunt gallery, step 2 of 2: frame each real screenshot.
 *
 * Reads scripts/ph-gallery/raw/*.png (from capture.mjs), writes
 * docs/marketing/product-hunt/gallery-<n>-<name>.png at 1270×760 (the PH
 * spec) and @2x, plus logo-240.png.
 *
 * The frame is the homepage's marketing language, not the app's: the
 * #06060f ground with the one purple wash from .hbg, Space Grotesk headlines,
 * DM Sans body, the purple bolt mark. Words on a frame are claims — each one
 * is either on the homepage already or bound by tests/site-counts.test.js.
 * The screenshots are never retouched; they are only cropped.
 *
 * Usage: node scripts/ph-gallery/compose.mjs
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const RAW = path.join(import.meta.dirname, 'raw');
const OUT = path.join(ROOT, 'docs/marketing/product-hunt');
const TMP = path.join(import.meta.dirname, '.frames');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9400 + ((process.pid + 7) % 500);
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const BOLT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>';

const img = name => `file://${path.join(RAW, `${name}.png`)}`;

/** A screenshot in a hairline frame. `crop` shows only the top `crop` px (CSS) of it. */
const shot = (name, { width, crop, style = '' } = {}) => `
  <div class="shot" style="width:${width}px;${crop ? `height:${crop}px;` : ''}${style}">
    <img src="${img(name)}" style="width:100%;display:block">
  </div>`;

const sizeOf = name => {
  // PNG width/height live at bytes 16–23; the capture is at 2×, so halve.
  const b = fs.readFileSync(path.join(RAW, `${name}.png`));
  return { w: b.readUInt32BE(16) / 2, h: b.readUInt32BE(20) / 2 };
};

/** A region of a screenshot (CSS px of the capture) shown `width` px wide. */
const region = (name, { x = 0, y = 0, w, h, width, style = '' }) => {
  const src = sizeOf(name);
  w = w || src.w - x; h = h || src.h - y;
  const k = width / w;
  return `
  <div class="shot" style="width:${width}px;height:${Math.round(h * k)}px;${style}">
    <img src="${img(name)}" style="display:block;width:${src.w * k}px;margin-left:${-x * k}px;margin-top:${-y * k}px">
  </div>`;
};

const FRAMES = [
  {
    file: 'gallery-1-skillmap',
    eyebrow: 'The Skillmap',
    title: 'Your next question comes from <em>your weakest skill</em>.',
    body: 'Nine SQL skills, scored from every query you solve. The plan reads the map, not a fixed list.',
    right: `
      ${shot('skillmap', { width: 700 })}
      ${shot('plan', { width: 700, style: 'margin-top:18px' })}`,
  },
  {
    file: 'gallery-2-diagnosis',
    eyebrow: 'When it is wrong',
    title: 'It tells you <em>why</em> the query is wrong.',
    body: 'Expected 46 rows, got 40 — and the six that went missing. Not “try again”.',
    right: `
      ${shot('wrong-editor', { width: 700, crop: 150 })}
      ${shot('wrong-diagnosis', { width: 700, style: 'margin-top:16px' })}`,
  },
  {
    file: 'gallery-3-company-mock',
    eyebrow: 'Company sets · timed mocks',
    title: 'Sit the screen <em>before</em> you sit the screen.',
    body: '30 company question sets and timed mocks — here, the 70-minute Capital One format.',
    // The mock's header strip, its first question, and the set it belongs to.
    right: `
      ${region('mock', { h: 76, width: 700 })}
      <div style="display:flex;gap:16px;margin-top:16px;width:700px;align-items:flex-start">
        ${region('mock', { x: 0, y: 84, w: 520, h: 520, width: 410, style: '' })}
        <div style="display:flex;flex-direction:column;gap:12px;flex:1">
          ${shot('company-card1', { width: 274 })}
          ${shot('company-card2', { width: 274 })}
          ${shot('company-card3', { width: 274 })}
        </div>
      </div>`,
  },
  {
    file: 'gallery-4-readiness',
    eyebrow: 'Free · no signup',
    title: 'Ten questions. <em>Your readiness</em> in five minutes.',
    body: 'Pick a company and the score is weighted by its practice set. Your weakest skill comes with a plan.',
    // Score, Skillmap and the weakest skill; the buttons below are cut.
    right: region('readiness', { h: 690, width: 560 }),
  },
  {
    file: 'gallery-5-pricing',
    eyebrow: 'Pricing',
    title: 'Free to practise. <em>Pro</em> when a screen has a date.',
    // No price in the words: the app also sells a $49 quarter the homepage
    // does not show, so the only prices on this frame are the page's own.
    body: 'Upgrade inside the app when an interview is on the calendar. Cancel anytime; 7-day full refund.',
    right: `
      ${region('pricing', { x: 100, y: 208, w: 1000, h: 198, width: 700 })}
      ${region('pricing', { x: 280, y: 418, w: 640, h: 286, width: 580, style: 'margin-top:18px' })}`,
  },
];

const page = f => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1270px;height:760px;overflow:hidden;background:#06060f;color:#e2e8f0;font-family:'DM Sans',sans-serif}
  .bg{position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 0% 0%,rgba(124,58,237,.16) 0%,transparent 60%)}
  .wrap{position:relative;display:flex;height:100%;padding:56px 56px 48px 64px;gap:48px;align-items:center}
  .left{flex:0 0 400px;display:flex;flex-direction:column;height:100%}
  .brand{display:flex;align-items:center;gap:12px}
  .mark{width:40px;height:40px;border-radius:10px;background:#7c3aed;color:#fff;display:flex;align-items:center;justify-content:center}
  .mark svg{width:20px;height:20px}
  .name{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:20px;letter-spacing:-.01em}
  .copy{margin-top:auto;margin-bottom:auto}
  .eyebrow{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8b98ab;margin-bottom:18px}
  h1{font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:46px;line-height:1.06;letter-spacing:-.02em;color:#f1f5f9}
  h1 em{font-style:normal;color:#c084fc}
  p{margin-top:22px;font-size:19px;line-height:1.5;color:#94a3b8}
  .foot{font-size:14px;color:#64748b}
  .right{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%}
  .shot{border:1px solid rgba(255,255,255,.10);border-radius:10px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.55);background:#0b0c14}
</style></head><body>
<div class="bg"></div>
<div class="wrap">
  <div class="left">
    <div class="brand"><div class="mark">${BOLT}</div><div class="name">SQLQuest.app</div></div>
    <div class="copy">
      <div class="eyebrow">${f.eyebrow}</div>
      <h1>${f.title}</h1>
      <p>${f.body}</p>
    </div>
    <div class="foot">Personalized SQL interview practice</div>
  </div>
  <div class="right">${f.right}</div>
</div>
</body></html>`;

const logo = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:240px;height:240px;background:#06060f;overflow:hidden}
  .m{position:absolute;inset:0;background:#7c3aed;border-radius:52px;color:#fff;display:flex;align-items:center;justify-content:center}
  .m svg{width:128px;height:128px;stroke-width:1.9}
</style></head><body><div class="m">${BOLT}</div></body></html>`;

// ── headless Chrome over CDP ───────────────────────────────────────────────
let ws; let msgId = 0; const pending = new Map();
const cdp = (method, params) => new Promise(resolve => {
  const id = ++msgId; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params }));
});
const wait = ms => new Promise(r => setTimeout(r, ms));
const getJSON = u => new Promise((res, rej) => {
  http.get(u, r => { let b = ''; r.on('data', c => b += c); r.on('end', () => res(JSON.parse(b))); }).on('error', rej);
});

async function render(html, file, width, height, scales) {
  const src = path.join(TMP, `${path.basename(file)}.html`);
  fs.writeFileSync(src, html);
  for (const scale of scales) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
    await cdp('Page.navigate', { url: `file://${src}` });
    await wait(1500);
    await cdp('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true });
    const r = await cdp('Page.captureScreenshot', { format: 'png' });
    const out = scale === 1 ? `${file}.png` : `${file}@${scale}x.png`;
    fs.writeFileSync(out, Buffer.from(r.data, 'base64'));
    console.log(`  ✓ ${path.relative(ROOT, out)}`);
  }
}

async function main() {
  for (const need of ['skillmap', 'plan', 'wrong-editor', 'wrong-diagnosis', 'mock', 'company-card1', 'company-card2', 'company-card3', 'readiness', 'pricing']) {
    if (!fs.existsSync(path.join(RAW, `${need}.png`))) throw new Error(`missing raw/${need}.png — run capture.mjs first`);
  }
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
    '--allow-file-access-from-files', `--user-data-dir=/tmp/chrome-phc-${Date.now()}`, 'about:blank',
  ], { stdio: 'ignore' });
  try {
    for (let i = 0; i < 40; i++) {
      try { if ((await getJSON(`http://127.0.0.1:${PORT}/json`)).length) break; } catch (_) {}
      await wait(200);
    }
    const tab = (await getJSON(`http://127.0.0.1:${PORT}/json`)).find(t => t.type === 'page');
    const WebSocket = (await import('ws')).WebSocket;
    ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });
    ws.on('message', d => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m); pending.delete(m.id); } });
    await cdp('Page.enable', {});
    for (const f of FRAMES) await render(page(f), path.join(OUT, f.file), 1270, 760, [1, 2]);
    await render(logo, path.join(OUT, 'logo-240'), 240, 240, [1]);
  } finally {
    try { ws.close(); } catch (_) {}
    chrome.kill('SIGKILL');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
