// PostgreSQL mode — renderer memory and per-challenge start (2026-11-22).
//
//   npx serve public -l 4321 &
//   node scripts/pg/measure-memory.mjs [http://localhost:4321]
//
// Loads data.js and pg-mode.js into a blank page, then opens five challenges
// in turn on PostgreSQL (the engine keeps one instance live). Prints the sum
// of Chromium renderer RSS (ps, Linux) after each, and each start in ms.
// PGlite is served from node_modules (the pinned npm bytes).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.argv[2] || 'http://localhost:4321';
const rss = () => Math.round(Number(execSync("ps -eo rss,args | grep -i 'chrom' | grep -- '--type=renderer' | grep -v grep | awk '{s+=$1} END {print s}'").toString().trim()) / 1024);
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
await page.route(/cdn\.jsdelivr\.net\/npm\/@electric-sql\/pglite@[^/]+\/dist\/(.+)$/, r => {
  const f = r.request().url().match(/\/dist\/([^?]+)/)[1];
  return r.fulfill({ path: `node_modules/@electric-sql/pglite/dist/${f}`, contentType: f.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream', headers: { 'access-control-allow-origin': '*' } });
});
await page.goto(`${BASE}/robots.txt`);
for (const src of ['/data.js', '/pg-mode.js']) {
  await page.evaluate(async u => { const s = document.createElement('script'); s.src = u; await new Promise(r => { s.onload = r; document.head.appendChild(s); }); }, src);
}
const base = rss();
const rows = [];
for (const id of [99, 118, 285, 110, 300]) {
  const ms = await page.evaluate(async id => {
    const c = window.challengesData.find(x => x.id === id);
    const t = performance.now();
    await window.SQLQuestPg.run(c, 'SELECT 1');
    return Math.round(performance.now() - t);
  }, id);
  await page.waitForTimeout(1500);
  rows.push({ id, startMs: ms, rendererRssMB: rss(), liveInstances: await page.evaluate(() => window.SQLQuestPg.liveInstances()) });
}
console.log(JSON.stringify({ baseRendererRssMB: base, rows, timings: await page.evaluate(() => window.SQLQuestPg.timings()) }, null, 2));
await browser.close();
