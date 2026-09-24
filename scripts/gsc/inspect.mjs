// Step 5 of the GSC pipeline: URL Inspection for every sitemap URL →
// gsc_index_status, plus a report of what is not indexed and what Google has
// not crawled in 30 days.
//
//   node scripts/gsc/inspect.mjs                all sitemap URLs, stalest first, up to the daily budget
//   node scripts/gsc/inspect.mjs --limit 20     inspect at most 20
//   node scripts/gsc/inspect.mjs --dry-run      inspect, print, write nothing
//
// Env: GSC_SA_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (not with --dry-run).
// Quota: 2,000 inspections a day and 600 a minute per property. A run stays
// under DAILY_BUDGET and paces itself; URLs never checked go first, then the
// ones checked longest ago, so a sitemap bigger than one day's budget is
// covered over consecutive runs.

import { pathToFileURL } from 'node:url';
import { getAccessToken, googleFetch, supabaseAuthHeaders, GSC_PROPERTY } from './auth.mjs';

export const SITEMAP_URL = 'https://sqlquest.app/sitemap.xml';
export const DAILY_BUDGET = 1900;          // of Google's 2,000/day, leaving room for manual checks
export const MIN_INTERVAL_MS = 150;        // ~400/min, under the 600/min limit
export const STALE_CRAWL_DAYS = 30;

export function parseSitemap(xml) {
  return [...String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1].trim());
}

/** Never-checked first, then oldest `checked_at`; at most `limit`. */
export function pickBatch(urls, checked = {}, limit = DAILY_BUDGET) {
  return [...new Set(urls)]
    .map(u => ({ u, t: checked[u] ? Date.parse(checked[u]) : -Infinity }))
    .sort((a, b) => a.t - b.t || a.u.localeCompare(b.u))
    .slice(0, limit)
    .map(x => x.u);
}

/** An inspection response → a gsc_index_status record. */
export function toStatus(url, result, now = new Date()) {
  const r = result?.inspectionResult?.indexStatusResult || {};
  return {
    url,
    last_crawled: r.lastCrawlTime || null,
    coverage_state: r.coverageState || null,
    indexing_state: r.indexingState || null,
    verdict: r.verdict || null,
    checked_at: now.toISOString(),
  };
}

/** What the report lists: not indexed (verdict not PASS), and crawled > 30 days ago or never. */
export function summarize(records, now = new Date()) {
  const cutoff = now.getTime() - STALE_CRAWL_DAYS * 86400000;
  const notIndexed = records.filter(r => r.verdict !== 'PASS');
  const stale = records.filter(r => !r.last_crawled || Date.parse(r.last_crawled) < cutoff);
  return { total: records.length, indexed: records.length - notIndexed.length, notIndexed, stale };
}

export function renderReport(sum, { date = new Date().toISOString().slice(0, 10) } = {}) {
  const lines = [
    `# GSC index status — ${date}`,
    '',
    `${sum.indexed} of ${sum.total} inspected URLs indexed; ${sum.notIndexed.length} not; ${sum.stale.length} not crawled in ${STALE_CRAWL_DAYS} days (or never).`,
    '',
    '## Not indexed',
    '',
    ...(sum.notIndexed.length ? ['| URL | Coverage | Verdict | Last crawled |', '|---|---|---|---|',
      ...sum.notIndexed.map(r => `| ${r.url} | ${r.coverage_state || '—'} | ${r.verdict || '—'} | ${r.last_crawled ? r.last_crawled.slice(0, 10) : 'never'} |`)] : ['None.']),
    '',
    `## Not crawled in ${STALE_CRAWL_DAYS} days`,
    '',
    ...(sum.stale.length ? ['| URL | Last crawled | Coverage |', '|---|---|---|',
      ...sum.stale.map(r => `| ${r.url} | ${r.last_crawled ? r.last_crawled.slice(0, 10) : 'never'} | ${r.coverage_state || '—'} |`)] : ['None.']),
    '',
  ];
  return lines.join('\n');
}

async function restGet(path, { url, serviceKey, fetchImpl }) {
  const res = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/${path}`, { headers: supabaseAuthHeaders(serviceKey) });
  if (!res.ok) throw new Error(`GET ${path.split('?')[0]} → HTTP ${res.status}`);
  return res.json();
}

async function upsertStatus(records, { url, serviceKey, fetchImpl }) {
  if (!records.length) return 0;
  const res = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/gsc_index_status?on_conflict=url`, {
    method: 'POST',
    headers: { ...supabaseAuthHeaders(serviceKey), 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(records),
  });
  if (!res.ok) throw new Error(`gsc_index_status upsert → HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
  return records.length;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function run({ argv = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log, now = new Date(), pace = MIN_INTERVAL_MS } = {}) {
  const dryRun = argv.includes('--dry-run');
  const li = argv.indexOf('--limit');
  const limit = li >= 0 ? Math.max(1, Math.min(DAILY_BUDGET, Number(argv[li + 1]) || DAILY_BUDGET)) : DAILY_BUDGET;
  const db = { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl };
  if (!dryRun && (!db.url || !db.serviceKey)) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run)');

  const sm = await fetchImpl(env.SITEMAP_URL || SITEMAP_URL);
  if (!sm.ok) throw new Error(`sitemap → HTTP ${sm.status}`);
  const urls = parseSitemap(await sm.text());
  const checked = {};
  if (!dryRun) for (const r of await restGet('gsc_index_status?select=url,checked_at', db)) checked[r.url] = r.checked_at;
  const batch = pickBatch(urls, checked, limit);
  log(`sitemap: ${urls.length} URLs · inspecting ${batch.length}${dryRun ? ' · dry run' : ''}`);

  const { token } = await getAccessToken({ env, fetchImpl });
  const records = [];
  for (const u of batch) {
    const result = await googleFetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      token, method: 'POST', fetchImpl, log,
      body: { inspectionUrl: u, siteUrl: GSC_PROPERTY },
    });
    records.push(toStatus(u, result, now));
    if (!dryRun && records.length % 100 === 0) await upsertStatus(records.slice(-100), db);
    if (pace) await sleep(pace);
  }
  if (!dryRun && records.length % 100) await upsertStatus(records.slice(-(records.length % 100)), db);

  // The report covers the whole table, not only this run's batch.
  const all = dryRun ? records : await restGet('gsc_index_status?select=*', db);
  const report = renderReport(summarize(all, now), { date: now.toISOString().slice(0, 10) });
  log(report);
  if (env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(env.GITHUB_STEP_SUMMARY, report + '\n');
  }
  return { inspected: records.length, report };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
}
