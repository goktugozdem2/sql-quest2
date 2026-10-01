// Step 5 of the Bing pipeline: the weekly Bing report.
//
//   node scripts/bing/report.mjs    print Markdown; mail it when RESEND_API_KEY + REPORT_TO are set
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; optional RESEND_API_KEY, REPORT_TO.
//
// Sections, each answering one question the growth plan asks
// (docs/plans/bing-growth-2026-09-30.md):
//   1. site: clicks / impressions, the last 7 days of data vs the 7 before
//   2. index: pages in Bing's index and crawl errors, now vs 7 days before
//   3. the door: /sql-exercises/'s share of clicks, and its queries
//   4. pages in the top 10 with no clicks — snippet work
//   5. pages at position 10–20 with real impressions — content / link work
//   6. sitemap URLs never crawled, and crawled before their last change
// The week ends on the last date in the data, never on today. Query and page
// rows are WEEKLY buckets (one date every seven days), so sections 3–5 read
// the four newest buckets — 28 days — and are never compared day by day.

import { pathToFileURL } from 'node:url';
import { supabaseAuthHeaders } from '../gsc/auth.mjs';
import { restAll } from './api.mjs';
import { SITEMAP_URL, parseSitemapEntries, summarize } from './inspect.mjs';

export const DOOR = 'https://sqlquest.app/sql-exercises/';
export const WINDOW_DAYS = 28;
export const MIN_IMPRESSIONS = 20;
export const TOP_N = 15;

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

export function weeks(lastDate) {
  return {
    cur: { start: addDays(lastDate, -6), end: lastDate },
    prev: { start: addDays(lastDate, -13), end: addDays(lastDate, -7) },
  };
}

const inWin = (r, w) => r.date >= w.start && r.date <= w.end;
export const sumSite = (rows, w) => rows.filter(r => inWin(r, w)).reduce((a, r) => ({ clicks: a.clicks + (r.clicks || 0), impressions: a.impressions + (r.impressions || 0) }), { clicks: 0, impressions: 0 });

/** Sum a slice by `key` inside a window; position is impression-weighted. */
export function aggregate(rows, key, win) {
  const m = new Map();
  for (const r of rows) {
    if (!inWin(r, win) || r[key] == null) continue;
    const a = m.get(r[key]) || { key: r[key], clicks: 0, impressions: 0, w: 0 };
    a.clicks += r.clicks || 0;
    a.impressions += r.impressions || 0;
    a.w += (Number(r.avg_impression_position) || 0) * (r.impressions || 0);
    m.set(r[key], a);
  }
  return [...m.values()].map(a => ({ ...a, position: a.impressions ? a.w / a.impressions : null }));
}

export function buildReport({ siteRows, crawlRows, pageRows, doorQueryRows, statusRows = [], entries = [] }) {
  const lastDate = siteRows.map(r => r.date).sort().pop();
  const w = weeks(lastDate);
  const lastStat = pageRows.map(r => r.date).sort().pop() || lastDate;
  const win = { start: addDays(lastStat, -(WINDOW_DAYS - 1)), end: lastStat };

  const crawl = [...crawlRows].sort((a, b) => a.date.localeCompare(b.date));
  const crawlNow = crawl[crawl.length - 1] || null;
  const crawlBefore = crawlNow ? [...crawl].reverse().find(r => r.date <= addDays(crawlNow.date, -7)) || null : null;

  const pages = aggregate(pageRows, 'page', win);
  const totalClicks = pages.reduce((s, p) => s + p.clicks, 0);
  const door = pages.find(p => p.key === DOOR) || { clicks: 0, impressions: 0, position: null };
  const by = (f) => (a, b) => f(b) - f(a) || String(a.key).localeCompare(String(b.key));

  return {
    lastDate, w, win,
    site: { cur: sumSite(siteRows, w.cur), prev: sumSite(siteRows, w.prev) },
    crawlNow, crawlBefore,
    door: { ...door, share: totalClicks ? door.clicks / totalClicks : null, totalClicks },
    doorQueries: aggregate(doorQueryRows, 'query', win).sort(by(q => q.impressions)).slice(0, TOP_N),
    noClickTop10: pages.filter(p => p.clicks === 0 && p.impressions >= MIN_IMPRESSIONS && p.position != null && p.position <= 10).sort(by(p => p.impressions)).slice(0, TOP_N),
    tenToTwenty: pages.filter(p => p.impressions >= MIN_IMPRESSIONS && p.position != null && p.position > 10 && p.position <= 20).sort(by(p => p.impressions)).slice(0, TOP_N),
    urls: entries.length ? summarize(statusRows.filter(r => entries.some(e => e.url === r.url)), entries) : null,
    sitemapSize: entries.length,
  };
}

const f1 = (n) => (n == null ? '—' : Number(n).toFixed(1));
const pct = (n) => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);
const ctr = (s) => (s.impressions ? pct(s.clicks / s.impressions) : '—');
const path = (u) => String(u).replace('https://sqlquest.app', '') || '/';
const t = (head, rows) => (rows.length ? [head, head.replace(/[^|]+/g, '---'), ...rows].join('\n') : 'None.');

export function renderMarkdown(r) {
  const u = r.urls;
  return [
    `# Bing weekly — ${r.w.cur.start} → ${r.lastDate}`,
    '',
    '## Site',
    '| | Clicks | Impressions | CTR |',
    '|---|---|---|---|',
    `| ${r.w.cur.start} → ${r.w.cur.end} | ${r.site.cur.clicks} | ${r.site.cur.impressions} | ${ctr(r.site.cur)} |`,
    `| ${r.w.prev.start} → ${r.w.prev.end} | ${r.site.prev.clicks} | ${r.site.prev.impressions} | ${ctr(r.site.prev)} |`,
    '',
    '## Index and crawl',
    r.crawlNow
      ? `In Bing's index on ${r.crawlNow.date}: **${r.crawlNow.in_index}**${r.crawlBefore ? ` (${r.crawlBefore.in_index} on ${r.crawlBefore.date})` : ''}${r.sitemapSize ? ` of ${r.sitemapSize} sitemap URLs` : ''}. Crawled that day: ${r.crawlNow.crawled_pages}; errors: ${r.crawlNow.crawl_errors}; 4xx: ${r.crawlNow.code_4xx}; 5xx: ${r.crawlNow.code_5xx}.`
      : 'No crawl statistics yet.',
    u ? `Sitemap URLs: ${u.ok.length} crawled since their last change, ${u.stale.length} crawled before it, ${u.never.length} never crawled, ${u.error.length} with an error.` : '',
    '',
    `## The door: /sql-exercises/ (weekly buckets ${r.win.start} → ${r.win.end})`,
    `${r.door.clicks} of ${r.door.totalClicks} page clicks (${pct(r.door.share)}), ${r.door.impressions} impressions, position ${f1(r.door.position)}.`,
    '',
    t('| Query | Impressions | Clicks | Position |', r.doorQueries.map(q => `| ${q.key} | ${q.impressions} | ${q.clicks} | ${f1(q.position)} |`)),
    '',
    '## In the top 10, no clicks (title / description work)',
    t('| Page | Impressions | Position |', r.noClickTop10.map(p => `| ${path(p.key)} | ${p.impressions} | ${f1(p.position)} |`)),
    '',
    '## Position 10–20 (content / internal-link work)',
    t('| Page | Impressions | Clicks | Position |', r.tenToTwenty.map(p => `| ${path(p.key)} | ${p.impressions} | ${p.clicks} | ${f1(p.position)} |`)),
    '',
    '## Never crawled',
    u ? t('| URL | Discovered |', u.never.slice(0, 40).map(x => `| ${path(x.url)} | ${x.discovered ? x.discovered.slice(0, 10) : '—'} |`)) + (u.never.length > 40 ? `\n… and ${u.never.length - 40} more` : '') : 'No URL status yet — run scripts/bing/inspect.mjs.',
    '',
  ].join('\n');
}

export async function run({ env = process.env, fetchImpl = fetch, log = console.log } = {}) {
  const db = { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl, headers: supabaseAuthHeaders };
  if (!db.url || !db.serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  const siteRows = await restAll('bing_site_daily?select=date,clicks,impressions&order=date', db);
  if (!siteRows.length) throw new Error('bing_site_daily is empty — run scripts/bing/fetch.mjs first');
  const since = addDays(siteRows[siteRows.length - 1].date, -60);
  const cols = 'date,query,page,clicks,impressions,avg_impression_position';
  const crawlRows = await restAll(`bing_crawl_daily?select=*&date=gte.${since}&order=date`, db);
  const pageRows = await restAll(`bing_stats?select=${cols}&date=gte.${since}&query=is.null&order=date`, db);
  const doorQueryRows = await restAll(`bing_stats?select=${cols}&date=gte.${since}&page=eq.${encodeURIComponent(DOOR)}&query=not.is.null&order=date`, db);
  const statusRows = await restAll('bing_url_status?select=*', db);
  const sm = await fetchImpl(env.SITEMAP_URL || SITEMAP_URL);
  const entries = sm.ok ? parseSitemapEntries(await sm.text()) : [];
  const report = buildReport({ siteRows, crawlRows, pageRows, doorQueryRows, statusRows, entries });
  const md = renderMarkdown(report);
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
        subject: `Bing weekly — ${report.w.cur.start} → ${report.lastDate}`,
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
