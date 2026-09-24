// Step 7 of the GSC pipeline: the weekly report from gsc_daily.
//
//   node scripts/gsc/report.mjs            print Markdown; mail it when RESEND_API_KEY + REPORT_TO are set
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; optional RESEND_API_KEY and
// REPORT_TO (the founder's address, a GitHub Secret — never in the repo).
//
// The week ends on the LAST DATE IN THE TABLE, not today: GSC lands 2–3 days
// late, and a week ending today would compare a short week with a full one.
// Last 7 days vs the 7 before. Positions are impression-weighted averages.
// Sections, in the founder's order:
//   1. pages whose position rose / fell (≥ 20 impressions in both weeks)
//   2. queries that started getting impressions (none the week before)
//   3. queries in the top 20 with no clicks — title / meta work
//   4. queries at 10–20 — content work
//   5. company pages (/<company>-sql-interview/): impressions and position

import { pathToFileURL } from 'node:url';

export const MIN_IMPRESSIONS_MOVE = 20;
export const MIN_IMPRESSIONS_NOCLICK = 10;
export const TOP_N = 15;
const COMPANY_PAGE = /\/[a-z0-9-]+-sql-interview\/?$/;

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

export function weeks(lastDate) {
  return {
    cur: { start: addDays(lastDate, -6), end: lastDate },
    prev: { start: addDays(lastDate, -13), end: addDays(lastDate, -7) },
  };
}

/** Sum a slice's rows by `key` inside a window: clicks, impressions, weighted position. */
export function aggregate(rows, key, win) {
  const m = new Map();
  for (const r of rows) {
    if (r.date < win.start || r.date > win.end || r[key] == null) continue;
    const a = m.get(r[key]) || { key: r[key], clicks: 0, impressions: 0, posWeight: 0 };
    a.clicks += r.clicks || 0;
    a.impressions += r.impressions || 0;
    a.posWeight += (Number(r.position) || 0) * (r.impressions || 0);
    m.set(r[key], a);
  }
  for (const a of m.values()) a.position = a.impressions ? a.posWeight / a.impressions : null;
  return m;
}

export function buildReport({ queryRows, pageRows, lastDate }) {
  const w = weeks(lastDate);
  const pCur = aggregate(pageRows, 'page', w.cur);
  const pPrev = aggregate(pageRows, 'page', w.prev);
  const qCur = aggregate(queryRows, 'query', w.cur);
  const qPrev = aggregate(queryRows, 'query', w.prev);

  const moves = [];
  for (const [page, c] of pCur) {
    const p = pPrev.get(page);
    if (!p || c.impressions < MIN_IMPRESSIONS_MOVE || p.impressions < MIN_IMPRESSIONS_MOVE) continue;
    moves.push({ page, from: p.position, to: c.position, delta: p.position - c.position, impressions: c.impressions });
  }
  const risers = moves.filter(m => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, TOP_N);
  const fallers = moves.filter(m => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, TOP_N);

  const newQueries = [...qCur.values()].filter(q => q.impressions > 0 && !(qPrev.get(q.key)?.impressions > 0))
    .sort((a, b) => b.impressions - a.impressions).slice(0, TOP_N);
  const noClickTop20 = [...qCur.values()].filter(q => q.position != null && q.position <= 20 && q.clicks === 0 && q.impressions >= MIN_IMPRESSIONS_NOCLICK)
    .sort((a, b) => b.impressions - a.impressions).slice(0, TOP_N);
  const tenToTwenty = [...qCur.values()].filter(q => q.position != null && q.position > 10 && q.position <= 20)
    .sort((a, b) => b.impressions - a.impressions).slice(0, TOP_N);

  const company = (m) => {
    let impressions = 0, clicks = 0, posWeight = 0, pages = 0;
    for (const a of m.values()) if (COMPANY_PAGE.test(a.key)) { impressions += a.impressions; clicks += a.clicks; posWeight += a.posWeight; pages++; }
    return { pages, impressions, clicks, position: impressions ? posWeight / impressions : null };
  };
  return { w, risers, fallers, newQueries, noClickTop20, tenToTwenty, companyCur: company(pCur), companyPrev: company(pPrev) };
}

const f1 = (n) => (n == null ? '—' : n.toFixed(1));
const path = (u) => String(u).replace(/^https?:\/\/[^/]+/, '') || '/';

export function renderMarkdown(r) {
  const t = (head, rows) => rows.length ? [head, head.replace(/[^|]+/g, '---'), ...rows].join('\n') : '_None this week._';
  const cc = r.companyCur, cp = r.companyPrev;
  return [
    `# Search Console — week ${r.w.cur.start} → ${r.w.cur.end}`,
    '',
    `Compared with ${r.w.prev.start} → ${r.w.prev.end}. Source: gsc_daily (GSC, property sc-domain:sqlquest.app). Positions are impression-weighted.`,
    '',
    '## Pages moving up',
    t('| Page | Position | Impressions |', r.risers.map(m => `| ${path(m.page)} | ${f1(m.from)} → ${f1(m.to)} | ${m.impressions} |`)),
    '',
    '## Pages moving down',
    t('| Page | Position | Impressions |', r.fallers.map(m => `| ${path(m.page)} | ${f1(m.from)} → ${f1(m.to)} | ${m.impressions} |`)),
    '',
    '## Queries that started getting impressions',
    t('| Query | Impressions | Position |', r.newQueries.map(q => `| ${q.key} | ${q.impressions} | ${f1(q.position)} |`)),
    '',
    '## In the top 20, no clicks (title / meta work)',
    t('| Query | Impressions | Position |', r.noClickTop20.map(q => `| ${q.key} | ${q.impressions} | ${f1(q.position)} |`)),
    '',
    '## Position 10–20 (content work)',
    t('| Query | Impressions | Clicks | Position |', r.tenToTwenty.map(q => `| ${q.key} | ${q.impressions} | ${q.clicks} | ${f1(q.position)} |`)),
    '',
    '## Company pages',
    `| | Pages with impressions | Impressions | Clicks | Avg position |`,
    `|---|---|---|---|---|`,
    `| This week | ${cc.pages} | ${cc.impressions} | ${cc.clicks} | ${f1(cc.position)} |`,
    `| Week before | ${cp.pages} | ${cp.impressions} | ${cp.clicks} | ${f1(cp.position)} |`,
    '',
  ].join('\n');
}

async function restAll(pathQuery, { url, serviceKey, fetchImpl }) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/${pathQuery}`, {
      headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`GET ${pathQuery.split('?')[0]} → HTTP ${res.status}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

export async function run({ env = process.env, fetchImpl = fetch, log = console.log } = {}) {
  const db = { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl };
  if (!db.url || !db.serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  const last = await restAll('gsc_daily?select=date&order=date.desc&limit=1', db);
  if (!last.length) throw new Error('gsc_daily is empty — run scripts/gsc/fetch.mjs --backfill first');
  const lastDate = last[0].date;
  const since = weeks(lastDate).prev.start;
  const cols = 'date,query,page,clicks,impressions,position';
  const queryRows = await restAll(`gsc_daily?select=${cols}&date=gte.${since}&page=is.null&order=date`, db);
  const pageRows = await restAll(`gsc_daily?select=${cols}&date=gte.${since}&query=is.null&order=date`, db);
  const md = renderMarkdown(buildReport({ queryRows, pageRows, lastDate }));
  log(md);
  if (env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(env.GITHUB_STEP_SUMMARY, md + '\n');
  }
  if (env.RESEND_API_KEY && env.REPORT_TO) {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: 'SQL Quest reports <noreply@sqlquest.app>',
        to: [env.REPORT_TO],
        subject: `Search Console weekly — ${weeks(lastDate).cur.start} → ${lastDate}`,
        text: md,
      }),
    });
    if (!res.ok) throw new Error(`mail → HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`);
    log('mailed');
  } else {
    log('not mailed (RESEND_API_KEY / REPORT_TO not set)');
  }
  return md;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
}
