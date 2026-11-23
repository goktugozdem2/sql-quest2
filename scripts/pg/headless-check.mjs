// PostgreSQL mode — the headless walk (2026-11-22 spike).
//
//   npx serve public -l 4321 &          # the built site
//   PG_VENDOR_DIR=<dir> node scripts/pg/headless-check.mjs [http://localhost:4321]
//
// At 375x812 and 1366x768:
//   0. flag off  → no toggle, no request for /pg-mode.js or PGlite;
//      flag on, toggle untouched → the same: nothing loads until it is picked;
//   1-3. three challenges: pick PostgreSQL, Run a Postgres-native query,
//      Submit it (must be correct), and on the first one Run a SQLite-only
//      query (must error the way Postgres does) and Submit a wrong answer;
//   4. a challenge off the allow-list → "not available for this one yet".
// Records the cold load (bundle + PGlite fetch + start + tables) and the
// warm switch to the next challenge (its own instance + its tables).
//
// PGlite is served from node_modules/@electric-sql/pglite (the pinned npm
// files, byte-for-byte what jsDelivr serves), so the browser's SRI check on
// each of the four files really runs. The rest of the app's CDN files come
// from PG_VENDOR_DIR (npm installs of the pinned versions, the same layout
// scripts/smoke/uiux-audit.mjs reads), because a cloud session cannot reach
// the CDNs; their integrity attributes are stripped from the HTML as the
// audit does. Writes nothing to production: every Supabase call is answered
// in-page (HERMETIC_PREAMBLE).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HERMETIC_PREAMBLE } from '../smoke/lib.mjs';
import { vendorFile, guestSeed } from '../smoke/uiux-audit.mjs';

// Playwright is pre-installed globally in cloud sessions (NODE_PATH), which
// an ESM import does not read.
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = process.argv[2] || 'http://localhost:4321';
const VENDOR = process.env.PG_VENDOR_DIR;
const SHOTS = process.env.PG_SHOTS_DIR || null;
const PGLITE_DIST = path.join(ROOT, 'node_modules/@electric-sql/pglite/dist');

const CASES = [
  {
    id: 99,
    sql: 'SELECT SUM(salary) AS total_payroll, ROUND(AVG(salary)) AS avg_salary, MAX(salary) AS highest_salary, MIN(salary) AS lowest_salary, MAX(salary) - MIN(salary) AS salary_spread FROM employees',
    sqliteOnly: "SELECT strftime('%Y', hire_date) AS y FROM employees LIMIT 1",
    wrong: 'SELECT SUM(salary) FROM employees',
  },
  {
    id: 118,
    sql: "SELECT to_char(order_date, 'YYYY-MM') AS month, COUNT(*) AS order_count FROM orders WHERE EXTRACT(YEAR FROM order_date) = 2024 GROUP BY 1 ORDER BY 1",
  },
  {
    id: 110,
    sql: "SELECT name, department, hire_date, TRUNC((DATE '2024-06-01' - hire_date) / 365.0)::int AS years_worked, TRUNC((DATE '2024-06-01' - hire_date) / 30.44)::int AS months_worked FROM employees ORDER BY years_worked DESC, name",
  },
];
const UNAVAILABLE = 150;
const VIEWPORTS = [
  { name: '375', width: 375, height: 812, phone: true },
  { name: '1366', width: 1366, height: 768, phone: false },
];
const HERMETIC_ROUTE = /supabase\.co|functions\/v1|vercel-insights|va\.vercel|clarity\.ms|googletagmanager|google-analytics|\/api\/|\/_vercel\//;
const isPgRequest = u => /\/pg-mode\.js|@electric-sql\/pglite/.test(u);

async function context(browser, vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.phone, hasTouch: vp.phone, reducedMotion: 'reduce' });
  await ctx.addInitScript(HERMETIC_PREAMBLE);
  await ctx.addInitScript(guestSeed('guest_1795300000003', [91, 92, 93]));
  await ctx.route(HERMETIC_ROUTE, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/@electric-sql\/pglite@[^/]+\/dist\/(.+)$/, r => {
    const file = r.request().url().match(/\/dist\/([^?]+)/)[1];
    const p = path.join(PGLITE_DIST, file);
    if (!fs.existsSync(p)) return r.fulfill({ status: 404, body: '' });
    const type = file.endsWith('.wasm') ? 'application/wasm' : file.endsWith('.cjs') ? 'application/javascript' : 'application/octet-stream';
    return r.fulfill({ path: p, contentType: type, headers: { 'access-control-allow-origin': '*' } });
  });
  await ctx.route(/unpkg\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net\/npm\/@supabase/, r => {
    const f = VENDOR && vendorFile(r.request().url(), VENDOR);
    if (f && fs.existsSync(f)) return r.fulfill({ path: f, headers: { 'access-control-allow-origin': '*' } });
    return r.abort();
  });
  await ctx.route(u => u.origin === BASE && (u.pathname.endsWith('/') || u.pathname.endsWith('.html')), async r => {
    const res = await r.fetch();
    const body = (await res.text()).replace(/\sintegrity="[^"]*"/g, '');
    return r.fulfill({ response: res, body });
  });
  return ctx;
}

async function openChallenge(page, id, flag) {
  await page.goto(`${BASE}/app/?challenge=${id}${flag ? '&ff_features_postgresMode=true' : ''}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('.CodeMirror', { timeout: 20000 });
  await page.waitForTimeout(800);
}
const setSql = (page, sql) => page.evaluate(s => document.querySelector('.CodeMirror').CodeMirror.setValue(s), sql);
const click = (page, re) => page.getByRole('button', { name: re }).filter({ visible: true }).first().click({ timeout: 5000 });
const resultText = page => page.locator('[data-testid="challenge-result-anchor"] ~ *').allInnerTexts().then(t => t.join('\n'));

async function pickPostgres(page) {
  const t0 = Date.now();
  await page.locator('[data-engine="postgres"]').filter({ visible: true }).first().click();
  await page.waitForFunction(() => {
    const s = document.querySelector('[data-testid="pg-status"]');
    return s && s.dataset.phase !== 'loading';
  }, null, { timeout: 60000 });
  const phase = await page.locator('[data-testid="pg-status"]').getAttribute('data-phase');
  return { phase, wallMs: Date.now() - t0, text: await page.locator('[data-testid="pg-status"]').innerText() };
}

async function verdict(page) {
  await page.waitForSelector('[data-testid="pg-verdict"]', { timeout: 20000 });
  return page.locator('[data-testid="pg-verdict"]').getAttribute('data-verdict');
}

const report = { base: BASE, at: new Date().toISOString(), viewports: {} };
const fail = [];
const expect = (ok, msg) => { if (!ok) fail.push(msg); };

const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const out = (report.viewports[vp.name] = { cases: [] });

    // 0. flag off, then flag on with the toggle untouched: nothing loads.
    for (const flag of [false, true]) {
      const ctx = await context(browser, vp);
      const page = await ctx.newPage();
      const pgReqs = [];
      page.on('request', r => { if (isPgRequest(r.url())) pgReqs.push(r.url()); });
      await openChallenge(page, 94, flag);
      await setSql(page, 'SELECT title FROM movies LIMIT 3');
      await click(page, /^Run$/);
      await page.waitForTimeout(800);
      const toggles = await page.locator('[data-testid="sql-engine-toggle"]').count();
      const key = flag ? 'flagOnUntouched' : 'flagOff';
      out[key] = { toggles, pgRequests: pgReqs.length, hasSQLQuestPg: await page.evaluate(() => !!window.SQLQuestPg) };
      expect(pgReqs.length === 0, `${vp.name} ${key}: PGlite/pg-mode requested: ${pgReqs.join(', ')}`);
      expect(flag ? toggles === 1 : toggles === 0, `${vp.name} ${key}: ${toggles} toggles`);
      await ctx.close();
    }

    // 1-4. one context: the cold start on the first challenge, warm after.
    const ctx = await context(browser, vp);
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('pageerror', e => consoleErrors.push(String(e.message || e)));
    for (const [i, c] of CASES.entries()) {
      await openChallenge(page, c.id, true);
      const pick = await pickPostgres(page);
      const row = { id: c.id, phase: pick.phase, status: pick.text, pickWallMs: pick.wallMs };
      expect(pick.phase === 'ready', `${vp.name} #${c.id}: PostgreSQL ${pick.phase} (${pick.text})`);
      if (pick.phase !== 'ready') { out.cases.push(row); continue; }
      if (c.sqliteOnly) {
        await setSql(page, c.sqliteOnly);
        await click(page, /^Run$/);
        await page.waitForTimeout(600);
        row.sqliteOnlyRun = (await resultText(page)).match(/function strftime[^\n]*/)?.[0] || null;
        expect(!!row.sqliteOnlyRun, `${vp.name} #${c.id}: strftime did not error on PostgreSQL`);
        await setSql(page, c.wrong);
        await click(page, /^Submit$/);
        row.wrongVerdict = await verdict(page);
        expect(row.wrongVerdict === 'wrong', `${vp.name} #${c.id}: wrong answer graded ${row.wrongVerdict}`);
      }
      await setSql(page, c.sql);
      await click(page, /^Run$/);
      await page.waitForFunction(() => /Ran in \d+\s*ms/.test(document.body.innerText), null, { timeout: 10000 });
      const ran = await resultText(page);
      row.queryMs = Number((ran.match(/Ran in (\d+)\s*ms/) || [])[1]); // the app's own timer
      row.runShowsRows = /\(\d+ rows?\)/.test(ran);
      expect(row.runShowsRows, `${vp.name} #${c.id}: Run showed no rows`);
      const tSub = Date.now();
      await click(page, /^Submit$/);
      row.verdict = await verdict(page);
      row.submitWallMs = Date.now() - tSub;
      expect(row.verdict === 'correct', `${vp.name} #${c.id}: Postgres-native answer graded ${row.verdict}`);
      if (i === 0) {
        row.timings = await page.evaluate(() => window.SQLQuestPg.timings());
        row.memory = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
      }
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `pg-${vp.name}-${c.id}.png`) });
      out.cases.push(row);
    }
    await openChallenge(page, UNAVAILABLE, true);
    const un = await pickPostgres(page);
    out.unavailable = { id: UNAVAILABLE, phase: un.phase, text: un.text };
    expect(un.phase === 'unavailable' && /not available for this one yet/.test(un.text), `${vp.name} #${UNAVAILABLE}: ${un.phase}`);
    out.pageErrors = consoleErrors;
    expect(consoleErrors.length === 0, `${vp.name}: page errors ${consoleErrors.join(' | ')}`);
    // Overflow at the phone width: the toggle must not widen the page.
    out.horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(!out.horizontalOverflow, `${vp.name}: horizontal overflow`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (fail.length) {
  console.error('\nFAIL\n' + fail.map(f => '  - ' + f).join('\n'));
  process.exit(1);
}
console.error('\nPASS');
