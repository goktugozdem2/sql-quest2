// The content funnel, mailed (2026-11-22, B2; metric `content_funnel`).
//
//   node scripts/content-funnel-report.mjs                 build it, mail it when RESEND_API_KEY + REPORT_TO are set
//   node scripts/content-funnel-report.mjs --out <file>    laptop: also write the Markdown to a local file
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; optional RESEND_API_KEY and
// REPORT_TO (GitHub Secrets — never in the repo).
//
// Reads the view public.content_funnel (scripts/content-funnel.sql, migration
// 20261122160000) over PostgREST with the service role, the same client and
// auth headers as scripts/gsc/report.mjs.
//
// THE REPO IS PUBLIC, and so are its Actions logs. Unlike the GSC report this
// one never prints the Markdown, never writes GITHUB_STEP_SUMMARY and never
// logs a row: per-page business numbers go only to REPORT_TO. The log says
// how many rows were read and whether the mail went. No URL carries a key
// (the key rides in headers), and errors name the table, never a query.
// tests/content-funnel.test.js holds all of that.
//
// Sections:
//   1. totals per window (7 / 28 / 60 days)
//   2. top pages by trials or purchases, 28 days
//   3. new or changed pages: sitemap lastmod in the last 28 days, with their
//      28-day funnel (lastmod moves whenever a page's built bytes change, so
//      this is "new or changed", not "born")
//   4. C5's kill-rule candidates: ≥ 300 landing people and 0 trials or
//      purchases in 60 days

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { supabaseAuthHeaders } from './gsc/auth.mjs';

export const VIEW = 'content_funnel';
export const WINDOWS = [7, 28, 60];
export const KILL_MIN_LANDING = 300;
export const TOP_N = 15;
export const NEW_PAGE_DAYS = 28;
export const STEPS = [
  ['landing_people', 'Landed'],
  ['app_opened', 'Opened app'],
  ['first_run', 'First run'],
  ['first_solve', 'First solve'],
  ['solves_3', '3 solves'],
  ['signup', 'Signup'],
  ['modal_shown', 'Pro modal'],
  ['plan_click', 'Plan click'],
  ['trial_or_purchase', 'Trial or purchase'],
];
const NUMERIC = [...STEPS.map(s => s[0]), 'trials', 'purchases'];

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

/** A sitemap path as the tracker names the page: "/" → home, "/blog/x/" → blog/x. */
export function pageForPath(p) {
  const s = String(p).replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '').replace(/^\/+/, '').replace(/\.html$/, '');
  return s === '' || s === 'index' ? 'home' : s;
}

export function normalizeRows(rows) {
  return rows.map(r => {
    const o = { window_days: Number(r.window_days), page: String(r.page) };
    for (const k of NUMERIC) o[k] = Number(r[k]) || 0;
    return o;
  });
}

export function totals(rows, windowDays) {
  const t = { page: '(all pages)' };
  for (const k of NUMERIC) t[k] = 0;
  for (const r of rows) if (r.window_days === windowDays) for (const k of NUMERIC) t[k] += r[k];
  return t;
}

const per1000 = (n, d) => (d ? ((1000 * n) / d).toFixed(1) : '—');

/** Pages from sitemap-lastmod.json whose lastmod is inside the last `days` before `today`. */
export function recentPages(manifest, today, days = NEW_PAGE_DAYS) {
  const since = addDays(today, -days);
  return Object.entries((manifest && manifest.pages) || {})
    .filter(([, v]) => v && v.lastmod && v.lastmod > since && v.lastmod <= today)
    .map(([p, v]) => ({ page: pageForPath(p), lastmod: v.lastmod }));
}

export function buildReport({ rows, manifest, today }) {
  const r = normalizeRows(rows);
  const w28 = r.filter(x => x.window_days === 28);
  const w60 = r.filter(x => x.window_days === 60);
  const byPage28 = new Map(w28.map(x => [x.page, x]));

  const topByTrials = w28.filter(x => x.trial_or_purchase > 0)
    .sort((a, b) => b.trial_or_purchase - a.trial_or_purchase || b.landing_people - a.landing_people || a.page.localeCompare(b.page))
    .slice(0, TOP_N);
  const topByLanding = [...w28]
    .sort((a, b) => b.landing_people - a.landing_people || a.page.localeCompare(b.page))
    .slice(0, TOP_N);

  const empty = (page) => { const o = { page }; for (const k of NUMERIC) o[k] = 0; return o; };
  const recent = recentPages(manifest, today)
    .map(p => ({ ...(byPage28.get(p.page) || empty(p.page)), lastmod: p.lastmod }))
    .sort((a, b) => b.landing_people - a.landing_people || b.lastmod.localeCompare(a.lastmod) || a.page.localeCompare(b.page));

  const kill = w60.filter(x => x.landing_people >= KILL_MIN_LANDING && x.trial_or_purchase === 0)
    .sort((a, b) => b.landing_people - a.landing_people || a.page.localeCompare(b.page));

  return {
    today,
    totals: WINDOWS.map(w => ({ window_days: w, ...totals(r, w) })),
    topByTrials, topByLanding, recent, kill,
    pages28: w28.length,
  };
}

const head = ['Page', ...STEPS.map(s => s[1]), 'Per 1,000'];
const row = (x, label = x.page) =>
  `| ${label} | ${STEPS.map(([k]) => x[k]).join(' | ')} | ${per1000(x.trial_or_purchase, x.landing_people)} |`;
const table = (rows, labelFn) => rows.length
  ? [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(x => row(x, labelFn ? labelFn(x) : x.page))].join('\n')
  : '_None._';

export function renderMarkdown(rep) {
  const RECENT_CAP = 40;
  return [
    `# Content funnel — ${rep.today}`,
    '',
    'Per landing page: people (COALESCE(aid, username)) credited to the first page they landed on inside the window, bots and internal accounts out. A landing person scrolled, clicked or did anything after the view (`landing_people`). Trials and purchases are `stripe_webhook` rows only. "Per 1,000" is trials or purchases per 1,000 landing people. Source: view `content_funnel` (scripts/content-funnel.sql); metric `content_funnel` in docs/agent/metrics.md.',
    '',
    '## Totals',
    table(rep.totals, x => `${x.window_days} days`),
    '',
    '## Top pages by trials or purchases (28 days)',
    table(rep.topByTrials),
    ...(rep.topByTrials.length ? [] : ['', '### No trials or purchases from a landing page in 28 days. Top pages by landing people instead', table(rep.topByLanding)]),
    '',
    `## New or changed pages (sitemap lastmod in the last ${NEW_PAGE_DAYS} days), 28-day funnel`,
    'lastmod moves when a page\'s built bytes change, so this lists changed pages too. Read a page against its own ledger claim, not against this list.',
    '',
    table(rep.recent.slice(0, RECENT_CAP), x => `${x.page} (${x.lastmod})`),
    ...(rep.recent.length > RECENT_CAP ? ['', `_${rep.recent.length - RECENT_CAP} more not shown (fewest landing people)._`] : []),
    '',
    `## Kill-rule candidates (C5): ≥ ${KILL_MIN_LANDING} landing people and 0 trials or purchases in 60 days`,
    'One improvement run first; prune only after 30 more days at 0 (docs/agent/fleet/C5-revenue-content.md).',
    '',
    table(rep.kill),
    '',
  ].join('\n');
}

async function restAll(pathQuery, { url, serviceKey, fetchImpl }) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/${pathQuery}`, {
      headers: { ...supabaseAuthHeaders(serviceKey), range: `${from}-${from + 999}` },
    });
    if (!res.ok) {
      const hint = res.status === 404 ? ' (is migration 20261122160000_content_funnel_view.sql applied?)' : '';
      throw new Error(`GET ${pathQuery.split('?')[0]} → HTTP ${res.status}${hint}`);
    }
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

export function readManifest(root = process.cwd()) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'src/data/sitemap-lastmod.json'), 'utf8')); }
  catch { return { pages: {} }; }
}

export async function run({ env = process.env, fetchImpl = fetch, log = console.log, argv = process.argv.slice(2), now = new Date(), root = process.cwd() } = {}) {
  const db = { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl };
  if (!db.url || !db.serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  const rows = await restAll(`${VIEW}?select=*`, db);
  const today = iso(now);
  const md = renderMarkdown(buildReport({ rows, manifest: readManifest(root), today }));
  log(`read ${rows.length} rows from ${VIEW}`);

  const outAt = argv.indexOf('--out');
  if (outAt >= 0 && argv[outAt + 1]) {
    fs.writeFileSync(argv[outAt + 1], md);
    log('written to the --out file');
  }

  if (env.RESEND_API_KEY && env.REPORT_TO) {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'SQL Quest reports <noreply@sqlquest.app>',
        to: [env.REPORT_TO],
        subject: `Content funnel — ${today}`,
        text: md,
      }),
    });
    if (!res.ok) throw new Error(`mail → HTTP ${res.status}`);
    log('mailed');
  } else {
    log('not mailed (RESEND_API_KEY / REPORT_TO not set)');
  }
  return md;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
}
