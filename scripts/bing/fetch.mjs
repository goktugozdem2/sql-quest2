// Step 2 of the Bing pipeline: search and crawl statistics → Supabase.
//
//   node scripts/bing/fetch.mjs             everything the API holds (≈ 6 months), upserted
//   node scripts/bing/fetch.mjs --dry-run   fetch and count, write nothing
//
// Env: BING_WMT_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (not with --dry-run).
//
// Unlike Search Console there is no date range to ask for: each method
// answers with its whole history, so every run rewrites all of it.
//   GetRankAndTrafficStats → bing_site_daily   (site clicks / impressions, daily)
//   GetQueryStats          → bing_stats, page NULL
//   GetPageStats           → bing_stats, query NULL   (the API puts the page URL in `Query`)
//   GetPageQueryStats      → bing_stats, both set — one call per page, for the
//                            TOP_PAGES pages by impressions in the last 35 days
//   GetCrawlStats          → bing_crawl_daily  (crawled, errors, InIndex, daily)
// Same rule as gsc_daily: each slice is a whole, never sum across slices.
// Measured 2026-10-01: site and crawl rows are one per DAY; query and page
// rows are one per WEEK, dated seven days apart (…, 09-18, 09-25) — so a
// `date` in bing_stats is a week's bucket, never a day, and must not be
// joined to a day in bing_site_daily. A bucket is the seven days ENDING on
// its date (Saturday → Friday): for 09-25 the pages' clicks were 258
// against 280 site clicks in the week ending that day and 157 in the days
// after it. Positions are plain whole numbers.

import { pathToFileURL } from 'node:url';
import { supabaseAuthHeaders } from '../gsc/auth.mjs';
import { bingCall, parseBingDate, readKey, upsert, BING_SITE } from './api.mjs';

export const TOP_PAGES = 30;
export const TOP_PAGES_WINDOW_DAYS = 35;

const int = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
// A position is 1 or more. The API sends -1 where it has none — measured
// 2026-10-01: AvgClickPosition is -1 on every row, clicks or not.
const pos = (v) => (num(v) != null && num(v) >= 1 ? num(v) : null);

/** A QueryStats row → a bing_stats record for the slice ('query' | 'page' | 'query_page'). */
export function toStatRecord(row, slice, page = null) {
  const d = parseBingDate(row?.Date);
  if (!d || row?.Query == null || row.Query === '') return null;
  return {
    date: d.date,
    query: slice === 'page' ? null : String(row.Query),
    page: slice === 'page' ? String(row.Query) : slice === 'query_page' ? page : null,
    clicks: int(row.Clicks),
    impressions: int(row.Impressions),
    avg_click_position: pos(row.AvgClickPosition),
    avg_impression_position: pos(row.AvgImpressionPosition),
  };
}

export function toSiteRecord(row) {
  const d = parseBingDate(row?.Date);
  return d ? { date: d.date, clicks: int(row.Clicks), impressions: int(row.Impressions) } : null;
}

export function toCrawlRecord(row) {
  const d = parseBingDate(row?.Date);
  if (!d) return null;
  return {
    date: d.date,
    crawled_pages: int(row.CrawledPages), crawl_errors: int(row.CrawlErrors),
    in_index: int(row.InIndex), in_links: int(row.InLinks),
    code_2xx: int(row.Code2xx), code_301: int(row.Code301), code_302: int(row.Code302),
    code_4xx: int(row.Code4xx), code_5xx: int(row.Code5xx),
    blocked_by_robots: int(row.BlockedByRobotsTxt), contains_malware: int(row.ContainsMalware),
    all_other_codes: int(row.AllOtherCodes),
  };
}

/**
 * One record per key, the last one winning. Postgres refuses an upsert whose
 * batch names the same conflict key twice, and the API does repeat rows.
 */
export function dedupe(records, keyOf) {
  const m = new Map();
  for (const r of records) if (r) m.set(keyOf(r), r);
  return [...m.values()];
}

/** The pages worth a per-page query call: most impressions in the recent window. */
export function topPages(pageRecords, { n = TOP_PAGES, days = TOP_PAGES_WINDOW_DAYS, today = new Date() } = {}) {
  const since = new Date(today.getTime() - days * 86400000).toISOString().slice(0, 10);
  const sum = new Map();
  for (const r of pageRecords) if (r.date >= since) sum.set(r.page, (sum.get(r.page) || 0) + r.impressions);
  return [...sum.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([p]) => p);
}

const statKey = (r) => `${r.date}|${r.query ?? ''}|${r.page ?? ''}`;

export async function run({ argv = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log, today = new Date() } = {}) {
  const dryRun = argv.includes('--dry-run');
  const db = { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl, headers: supabaseAuthHeaders };
  if (!dryRun && (!db.url || !db.serviceKey)) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run)');
  const key = readKey(env);
  const call = (method, params = {}) => bingCall(method, { key, fetchImpl, log, params: { siteUrl: BING_SITE, ...params } });
  const stamp = (rows) => rows.map(r => ({ ...r, fetched_at: new Date().toISOString() }));
  const write = async (table, conflict, rows) => (dryRun ? 0 : upsert(table, conflict, stamp(rows), db));
  log(`Bing ${BING_SITE}${dryRun ? ' · dry run' : ''}`);

  const site = dedupe(((await call('GetRankAndTrafficStats')) || []).map(toSiteRecord), r => r.date);
  await write('bing_site_daily', 'date', site);
  log(`  site: ${site.length} days`);

  const queries = dedupe(((await call('GetQueryStats')) || []).map(r => toStatRecord(r, 'query')), statKey);
  await write('bing_stats', 'date,query,page', queries);
  log(`  [query]: ${queries.length} rows`);

  const pages = dedupe(((await call('GetPageStats')) || []).map(r => toStatRecord(r, 'page')), statKey);
  await write('bing_stats', 'date,query,page', pages);
  log(`  [page]: ${pages.length} rows`);

  const top = topPages(pages, { today });
  let qp = [];
  for (const page of top) {
    const rows = (await call('GetPageQueryStats', { page })) || [];
    qp.push(...rows.map(r => toStatRecord(r, 'query_page', page)));
  }
  qp = dedupe(qp, statKey);
  await write('bing_stats', 'date,query,page', qp);
  log(`  [query, page]: ${qp.length} rows over ${top.length} pages`);

  const crawl = dedupe(((await call('GetCrawlStats')) || []).map(toCrawlRecord), r => r.date);
  await write('bing_crawl_daily', 'date', crawl);
  const lastCrawl = [...crawl].sort((a, b) => a.date.localeCompare(b.date)).pop();
  log(`  crawl: ${crawl.length} days${lastCrawl ? ` · ${lastCrawl.date}: in index ${lastCrawl.in_index}, crawled ${lastCrawl.crawled_pages}, errors ${lastCrawl.crawl_errors}` : ''}`);

  const totals = { site: site.length, query: queries.length, page: pages.length, query_page: qp.length, crawl: crawl.length };
  log(`done: ${Object.entries(totals).map(([k, v]) => `${k}=${v}`).join(' ')} (${dryRun ? 'fetched, not written' : 'written'})`);
  return totals;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
}
