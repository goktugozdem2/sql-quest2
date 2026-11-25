// PostgreSQL mode — renderer memory and per-challenge start (2026-11-22).
//
//   npx serve public -l 4321 &
//   node scripts/pg/measure-memory.mjs [http://localhost:4321]
//
// Loads data.js and pg-mode.js into a blank 375x812 page, then opens six
// challenges in turn on PostgreSQL (five switches; since 2026-11-25 the
// engine boots ONE instance per session and swaps a schema per challenge).
// Prints the sum of Playwright Chromium's renderer RSS after each, the peak
// sampled every 100 ms across the whole walk, and each switch in ms. The
// plan's drop rule reads the peak: under ~700 MB after five switches
// (docs/plans/postgres-mode-flip-2026-11-25.md).
// PGlite is served from node_modules (the pinned npm bytes).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:4321';
// Only Playwright's own Chromium (its binaries live under ms-playwright on
// Linux and macOS alike): a desktop Chrome or Electron app running beside
// the script must not be summed in (2026-11-25, macOS read).
const rss = () => Math.round(Number(execSync("ps -eo rss,args | grep 'ms-playwright' | grep -- '--type=renderer' | grep -v grep | awk '{s+=$1} END {print s+0}'").toString().trim()) / 1024);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
await page.route(/cdn\.jsdelivr\.net\/npm\/@electric-sql\/pglite@[^/]+\/dist\/(.+)$/, r => {
  const f = r.request().url().match(/\/dist\/([^?]+)/)[1];
  return r.fulfill({ path: `node_modules/@electric-sql/pglite/dist/${f}`, contentType: f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream', headers: { 'access-control-allow-origin': '*' } });
});
await page.goto(`${BASE}/robots.txt`);
for (const src of ['/data.js', '/pg-mode.js']) {
  await page.evaluate(async u => { const s = document.createElement('script'); s.src = u; await new Promise(r => { s.onload = r; document.head.appendChild(s); }); }, src);
}
const base = rss();
let peak = base;
const sampler = setInterval(() => { try { peak = Math.max(peak, rss()); } catch (_) { /* ps raced a process exit */ } }, 100);
const rows = [];
for (const id of [99, 118, 285, 110, 300, 99]) {
  const ms = await page.evaluate(async id => {
    const c = window.challengesData.find(x => x.id === id);
    const t = performance.now();
    await window.SQLQuestPg.run(c, 'SELECT 1');
    return Math.round(performance.now() - t);
  }, id);
  await page.waitForTimeout(1500);
  rows.push({ id, startMs: ms, rendererRssMB: rss(), liveInstances: await page.evaluate(() => window.SQLQuestPg.liveInstances()) });
}
clearInterval(sampler);
const instancesCreated = await page.evaluate(() => (window.SQLQuestPg.instancesCreated ? window.SQLQuestPg.instancesCreated() : null));
console.log(JSON.stringify({ baseRendererRssMB: base, peakRendererRssMB: peak, instancesCreated, rows, timings: await page.evaluate(() => window.SQLQuestPg.timings()) }, null, 2));
await browser.close();
