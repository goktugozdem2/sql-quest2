#!/usr/bin/env node
// The UI/UX audit (A4, docs/agent/fleet/A4-uiux.md): every marketing page and
// the app's main screens, at six viewports and two colour schemes, through
// checks U1–U12 (scripts/smoke/uiux-checks.mjs).
//
//   npm run build && npx serve public -l 4321
//   npm run uiux -- [--base http://localhost:4321] [--out dir] [--only marketing|app]
//                   [--pages regex] [--viewports phone-s,laptop] [--themes dark]
//                   [--concurrency 6] [--checks U1,U2,U7,U8] [--repo-report]
//
// Hermetic: every request to Supabase, the edge functions (the AI tutor
// included), /api/ and analytics is answered in the browser — the same
// stubs as SMOKE_HERMETIC=1 — so a run writes nothing and costs nothing.
//
// UIUX_VENDOR_DIR: a folder with node_modules/{react,react-dom,lucide,sql.js,
// codemirror,@supabase/supabase-js} at the versions the pages pin. When set,
// CDN requests are served from it and the pages' SRI attributes are dropped
// (the npm builds are not byte-identical to the CDN's). For sandboxes whose
// network blocks the CDNs; leave it unset anywhere the CDNs answer.
//
// Output (default ./uiux-out, or UIUX_OUT): findings.json, report.md and
// shots/*.png. Screenshots never go in the repo.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { HERMETIC_PREAMBLE, firstScreenArmPreamble } from './lib.mjs';
import { VIEWPORTS, THEMES, SEVERITY, CHECK_NAMES, runChecks, dedupe, countMatrix, severityTotals } from './uiux-checks.mjs';
import { installHelpers, collectStatic, collectFocus, collectCoverProbes, collectModals, CLS_INIT } from './uiux-collect.js';
import { quotaWallHashArm } from '../../src/utils/quota-wall-inline.js';

const require = createRequire(import.meta.url);

// ── Arguments ───────────────────────────────────────────────────────────
export function parseArgs(argv) {
  const a = { base: 'http://localhost:4321', out: process.env.UIUX_OUT || path.join(process.cwd(), 'uiux-out'), only: null, pages: null, viewports: null, themes: null, concurrency: 6, checks: null, repoReport: false, shots: true };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--base') { a.base = v.replace(/\/$/, ''); i++; }
    else if (k === '--out') { a.out = v; i++; }
    else if (k === '--only') { a.only = v; i++; }
    else if (k === '--pages') { a.pages = new RegExp(v); i++; }
    else if (k === '--viewports') { a.viewports = v.split(','); i++; }
    else if (k === '--themes') { a.themes = v.split(','); i++; }
    else if (k === '--concurrency') { a.concurrency = +v; i++; }
    else if (k === '--checks') { a.checks = v.split(','); i++; }
    else if (k === '--repo-report') a.repoReport = true;
    else if (k === '--no-shots') a.shots = false;
    else if (/^https?:/.test(k)) a.base = k.replace(/\/$/, '');
  }
  return a;
}

// ── Surfaces ────────────────────────────────────────────────────────────
/** Marketing pages from the built sitemap; /questions/ sampled (one template). */
export function marketingPages(sitemapXml, sample = 5) {
  const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/^https?:\/\/[^/]+/, '') || '/');
  const questions = locs.filter(p => p.startsWith('/questions/'));
  const rest = locs.filter(p => !p.startsWith('/questions/'));
  const step = Math.max(1, Math.floor(questions.length / sample));
  const sampled = questions.filter((_, i) => i % step === 0).slice(0, sample);
  return [...rest, ...sampled].map(p => ({ id: p, path: p, kind: 'marketing' }));
}

const QUOTA = [91, 92, 93, 94, 95, 96, 97, 98, 99, 100];

/** A guest with `solved` challenges, resumed from the local blob (startGuestMode). */
export function guestSeed(guest, solved, { onboarded = true, extra = '' } = {}) {
  return `(() => { try {
    if (sessionStorage.getItem('__uiux_seeded')) return;
    sessionStorage.setItem('__uiux_seeded', '1');
    localStorage.clear();
    const g = ${JSON.stringify(guest)};
    localStorage.setItem('sqlquest_guest_user', g);
    ${onboarded ? "localStorage.setItem('sqlquest_onboarding_completed', 'true');" : ''}
    localStorage.setItem('sqlquest_promo_6solves_guest', '1');
    localStorage.setItem('sqlquest_promo_10solves_guest', '1');
    localStorage.setItem('sqlquest_user_' + g, JSON.stringify({
      username: g,
      solvedChallenges: ${JSON.stringify(solved)},
      challengeAttempts: ${JSON.stringify(solved)}.map(id => ({ challengeId: id, correct: true, timestamp: Date.now() - 60000 })),
      // The solve-count badges a real guest earned on the way: without them
      // the resume awards them all at once and a toast covers the screen.
      unlockedAchievements: ${JSON.stringify(['first_query', ...(solved.length >= 5 ? ['challenge_5'] : []), ...(solved.length >= 10 ? ['challenge_10'] : [])])},
      createdAt: Date.now() - 86400000,
      lastActive: Date.now() - 3600000,
    }));
    ${extra}
  } catch (_) {} })();`;
}

/** An anonymous id whose quota-wall arm is `arm` (the app's own hash). */
export function aidForQuotaArm(arm) {
  for (let i = 0; i < 1000; i++) {
    const aid = `uiux-audit-${i}`;
    if (quotaWallHashArm(aid) === arm) return aid;
  }
  throw new Error('no aid for arm ' + arm);
}

// The app's day (getTodayString: GMT+3, rolling over at 11:00).
const APP_TODAY_JS = `(() => { const g = new Date(Date.now() + 3 * 3600000); if (g.getUTCHours() < 11) g.setUTCDate(g.getUTCDate() - 1); return g.getUTCFullYear() + '-' + String(g.getUTCMonth() + 1).padStart(2, '0') + '-' + String(g.getUTCDate()).padStart(2, '0'); })()`;

const clickText = (re) => async (page) => {
  // By accessible name: a button's icon slot can leave stray whitespace in
  // its text (" Run"), which a text regex anchored at ^ does not match.
  const loc = page.getByRole('button', { name: re }).or(page.getByRole('link', { name: re })).filter({ visible: true }).first();
  await loc.click({ timeout: 5000 });
};
const wait = (ms) => (page) => page.waitForTimeout(ms);

export function appScenarios() {
  const g3 = 'guest_1795300000003';
  const g10 = 'guest_1795300000010';
  const controlAid = aidForQuotaArm('control');
  const inlineAid = aidForQuotaArm('inline');
  const fresh = `(() => { try { if (sessionStorage.getItem('__uiux_seeded')) return; sessionStorage.setItem('__uiux_seeded', '1'); localStorage.clear(); } catch (_) {} })();`;
  return [
    { id: 'app:first-run-quiz', path: '/app/', seed: fresh + firstScreenArmPreamble('quiz') },
    { id: 'app:first-run-challenge', path: '/app/', seed: fresh + firstScreenArmPreamble('challenge') },
    { id: 'app:home-guest-3', path: '/app/', seed: guestSeed(g3, [91, 92, 93]) },
    {
      id: 'app:challenge-result', path: '/app/?challenge=94', seed: guestSeed(g3, [91, 92, 93]),
      steps: [
        async (page) => { await page.waitForSelector('.CodeMirror', { timeout: 10000 }); await page.evaluate(() => document.querySelector('.CodeMirror').CodeMirror.setValue('SELECT 1 AS x')); },
        clickText(/^Run$/), wait(1500), clickText(/^Submit$/), wait(2500),
      ],
    },
    { id: 'app:challenge-list', path: '/app/', seed: guestSeed(g3, [91, 92, 93]), steps: [clickText(/^Challenges/), wait(1500)] },
    {
      id: 'app:quota-wall-control', path: '/app/?challenge=101',
      seed: guestSeed(g10, QUOTA, { extra: `localStorage.setItem('sqlquest_aid', ${JSON.stringify(controlAid)});` }),
    },
    {
      id: 'app:quota-wall-inline', path: '/app/?challenge=101',
      seed: guestSeed(g10, QUOTA, { extra: `localStorage.setItem('sqlquest_aid', ${JSON.stringify(inlineAid)}); localStorage.setItem('sqlquest_quota_wall_modal_day_' + g, ${APP_TODAY_JS});` }),
    },
    { id: 'app:pro-modal', path: '/app/', seed: guestSeed(g3, [91, 92, 93]), steps: [async (page) => page.click('[data-testid="header-pro"]'), wait(1500)] },
    { id: 'app:interview-tab', path: '/app/', seed: guestSeed(g3, [91, 92, 93]), steps: [clickText(/^Interview/), wait(1500)] },
    { id: 'app:mock-in-progress', path: '/app/', seed: guestSeed(g3, [91, 92, 93]), steps: [clickText(/^Interview/), wait(1200), clickText(/^Start Interview$/), wait(2500)] },
    { id: 'app:auth-modal', path: '/app/', seed: guestSeed(g3, [91, 92, 93]), steps: [clickText(/^Log in$/), wait(1200)] },
    { id: 'app:feedback-widget', path: '/app/', seed: guestSeed(g3, [91, 92, 93]), steps: [async (page) => page.click('.sq-feedback-fab'), wait(1000)] },
    { id: 'app:company-wise', path: '/app/?company=Wise', seed: guestSeed(g3, [91, 92, 93]) },
  ].map(s => ({ ...s, kind: 'app' }));
}

// ── Vendoring (sandboxes without CDN access) ────────────────────────────
export function vendorFile(url, dir) {
  const nm = path.join(dir, 'node_modules');
  let m;
  if ((m = url.match(/unpkg\.com\/(react|react-dom)@[^/]+\/(.*)$/))) return path.join(nm, m[1], m[2]);
  if ((m = url.match(/unpkg\.com\/lucide@[^/]+\/(.*)$/))) return path.join(nm, 'lucide', m[1]);
  if ((m = url.match(/sql\.js\/[^/]+\/(.*)$/))) return path.join(nm, 'sql.js/dist', m[1]);
  if ((m = url.match(/supabase-js@[^/]+\/(.*)$/))) return path.join(nm, '@supabase/supabase-js', m[1]);
  if ((m = url.match(/codemirror\/[^/]+\/(.*)$/))) {
    let p = m[1].replace('.min.', '.');
    if (/^codemirror\.(js|css)$/.test(p)) p = 'lib/' + p;
    return path.join(nm, 'codemirror', p);
  }
  return null;
}

// ── One job: a surface at a viewport and theme ──────────────────────────
const HERMETIC_ROUTE = /supabase\.co|functions\/v1|vercel-insights|va\.vercel|clarity\.ms|googletagmanager|google-analytics|\/api\/|\/_vercel\//;

async function runJob(browser, job, opts) {
  const { surface, viewport, theme } = job;
  const ctx = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.phone, hasTouch: viewport.phone,
    colorScheme: theme, reducedMotion: 'reduce',
  });
  const consoleErrors = [];
  const failedRequests = [];
  try {
    await ctx.addInitScript(HERMETIC_PREAMBLE);
    await ctx.addInitScript(CLS_INIT);
    if (surface.seed) await ctx.addInitScript(surface.seed);
    await ctx.route(HERMETIC_ROUTE, (r) => {
      const url = r.request().url();
      if (/rpc\/sq_save_user/.test(url)) return r.fulfill({ status: 204, body: '' });
      return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    const vendor = process.env.UIUX_VENDOR_DIR;
    if (vendor) {
      await ctx.route(/unpkg\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, (r) => {
        const f = vendorFile(r.request().url(), vendor);
        if (f && fs.existsSync(f)) return r.fulfill({ path: f });
        return r.abort();
      });
      await ctx.route((u) => u.origin === opts.base && (u.pathname.endsWith('/') || u.pathname.endsWith('.html')), async (r) => {
        const res = await r.fetch();
        const body = (await res.text()).replace(/\sintegrity="[^"]*"/g, '');
        return r.fulfill({ response: res, body });
      });
    }
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push({ text: m.text(), url: m.location()?.url || '' }); });
    page.on('pageerror', (e) => consoleErrors.push({ text: 'pageerror: ' + String(e.message || e) }));
    page.on('requestfailed', (r) => { const f = r.failure(); if (!/ERR_ABORTED/.test(f?.errorText || '')) failedRequests.push({ url: r.url(), failure: f?.errorText }); });
    page.on('response', (r) => { if (r.status() >= 400) failedRequests.push({ url: r.url(), status: r.status() }); });

    await page.goto(opts.base + surface.path, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(surface.kind === 'app' ? 6500 : 600);
    for (const [i, step] of (surface.steps || []).entries()) {
      try { await step(page); } catch (e) { throw new Error(`step ${i + 1} of ${surface.id}: ${String(e.message || e).split('\n')[0]}`); }
    }

    await page.evaluate(installHelpers);
    const snap = await page.evaluate(collectStatic);
    const vp = { ...viewport };
    snap.consoleErrors = consoleErrors;
    snap.failedRequests = failedRequests;
    snap.origin = opts.base;
    // Keyboard modality for :focus-visible, then the focus pass.
    await page.keyboard.press('Tab').catch(() => {});
    snap.primaries = await page.evaluate(collectFocus).catch(() => []);
    snap.modals = await page.evaluate(collectModals).catch(() => []);
    // Static findings decide the screenshot, before the cover probes scroll.
    let shot = null;
    const pre = runChecks({ ...snap, coverProbes: [] }, vp).filter(f => f.severity !== 'minor');
    if (opts.shots && pre.length) {
      shot = path.join(opts.out, 'shots', `${slug(surface.id)}__${viewport.name}__${theme}.png`);
      await page.screenshot({ path: shot }).catch(() => { shot = null; });
    }
    snap.coverProbes = viewport.phone ? await page.evaluate(collectCoverProbes).catch(() => []) : [];
    let found = runChecks(snap, vp);
    if (opts.checks) found = found.filter(f => opts.checks.includes(f.check));
    return found.map(f => ({ ...f, page: surface.id, viewport: viewport.name, theme, shot }));
  } catch (e) {
    return [{ check: 'U12', severity: SEVERITY.U12, selector: 'run', detail: 'audit could not run the page: ' + String(e.message || e).split('\n')[0].slice(0, 160), page: surface.id, viewport: viewport.name, theme, shot: null }];
  } finally {
    await ctx.close().catch(() => {});
  }
}

const slug = (s) => String(s).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home';

// ── Report ──────────────────────────────────────────────────────────────
export function renderReport(findings, { title = 'UI/UX audit', surfaces = 0, jobs = 0, viewports = VIEWPORTS.map(v => v.name), repoReport = false } = {}) {
  const lines = [];
  const tot = severityTotals(findings);
  lines.push(`# ${title}`, '');
  lines.push(`${surfaces} surfaces, ${jobs} page × viewport × theme runs. Findings are deduplicated per page, viewport, theme and selector.`, '');
  lines.push(`**Critical ${tot.critical} · major ${tot.major} · minor ${tot.minor}**`, '');
  lines.push('## Counts by check × viewport', '');
  lines.push(`| check | severity | ${viewports.join(' | ')} | total |`);
  lines.push(`|---|---|${viewports.map(() => '---:').join('|')}|---:|`);
  const m = countMatrix(findings, viewports);
  for (const c of Object.keys(SEVERITY)) {
    const row = viewports.map(v => m[c][v]);
    lines.push(`| ${c} ${CHECK_NAMES[c]} | ${SEVERITY[c]} | ${row.join(' | ')} | ${row.reduce((a, b) => a + b, 0)} |`);
  }
  lines.push('');
  // Groups: one row per check + selector, with how many pages it touches.
  const groups = new Map();
  for (const f of findings) {
    const k = f.check + '\u0001' + f.selector;
    if (!groups.has(k)) groups.set(k, { check: f.check, severity: f.severity, selector: f.selector, pages: new Set(), viewports: new Set(), themes: new Set(), n: 0, detail: f.detail, shot: f.shot });
    const g = groups.get(k);
    g.pages.add(f.page); g.viewports.add(f.viewport); g.themes.add(f.theme); g.n++;
    if (!g.shot && f.shot) g.shot = f.shot;
  }
  const order = { critical: 0, major: 1, minor: 2 };
  const sorted = [...groups.values()].sort((a, b) => order[a.severity] - order[b.severity] || b.n - a.n);
  lines.push('## Findings by selector', '');
  lines.push(`| sev | check | selector | pages | viewports | themes | runs | example${repoReport ? '' : ' | screenshot'} |`);
  lines.push(`|---|---|---|---:|---|---|---:|---${repoReport ? '' : '|---'}|`);
  for (const g of sorted) {
    const pages = [...g.pages];
    const pagesCell = pages.length <= 3 ? pages.join(', ') : `${pages.length} (${pages.slice(0, 2).join(', ')}, …)`;
    const cells = [g.severity, g.check, '`' + g.selector.replace(/\|/g, '\\|') + '`', pagesCell, [...g.viewports].join(', '), [...g.themes].join(', '), g.n, String(g.detail).replace(/\|/g, '\\|')];
    if (!repoReport) cells.push(g.shot ? path.basename(g.shot) : '');
    lines.push('| ' + cells.join(' | ') + ' |');
  }
  lines.push('');
  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────
export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  let playwright;
  try { playwright = require('playwright'); } catch (_) { console.error('uiux: Playwright is not installed (npm i -D playwright, or run where it is)'); process.exit(2); }
  fs.mkdirSync(path.join(opts.out, 'shots'), { recursive: true });

  let surfaces = [];
  if (opts.only !== 'app') {
    const xml = await (await fetch(opts.base + '/sitemap.xml')).text();
    surfaces.push(...marketingPages(xml));
  }
  if (opts.only !== 'marketing') surfaces.push(...appScenarios());
  if (opts.pages) surfaces = surfaces.filter(s => opts.pages.test(s.id));
  const viewports = VIEWPORTS.filter(v => !opts.viewports || opts.viewports.includes(v.name));
  const themes = THEMES.filter(t => !opts.themes || opts.themes.includes(t));
  const jobs = [];
  for (const surface of surfaces) for (const viewport of viewports) for (const theme of themes) jobs.push({ surface, viewport, theme });

  const launch = {};
  if (process.env.UIUX_PROXY) launch.proxy = { server: process.env.UIUX_PROXY, bypass: 'localhost,127.0.0.1' };
  const browser = await playwright.chromium.launch(launch);
  const all = [];
  let next = 0, done = 0;
  const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      all.push(...await runJob(browser, job, opts));
      done++;
      if (done % 50 === 0 || done === jobs.length) console.log(`uiux: ${done}/${jobs.length} runs, ${Math.round((Date.now() - t0) / 1000)} s`);
    }
  }));
  await browser.close();

  const findings = dedupe(all);
  const out = { at: new Date().toISOString(), base: opts.base, surfaces: surfaces.length, jobs: jobs.length, totals: severityTotals(findings), matrix: countMatrix(findings, viewports.map(v => v.name)), findings };
  fs.writeFileSync(path.join(opts.out, 'findings.json'), JSON.stringify(out, null, 2));
  const md = renderReport(findings, { surfaces: surfaces.length, jobs: jobs.length, viewports: viewports.map(v => v.name), repoReport: opts.repoReport });
  fs.writeFileSync(path.join(opts.out, 'report.md'), md);
  console.log(`uiux: critical ${out.totals.critical} · major ${out.totals.major} · minor ${out.totals.minor} → ${path.join(opts.out, 'report.md')}`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error('uiux: crashed', e); process.exit(2); });
}
