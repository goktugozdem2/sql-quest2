// Step 3 of the Bing pipeline: what Bing knows about every sitemap URL →
// bing_url_status. This is the read the 12-URL dashboard sample stood in for.
//
//   node scripts/bing/inspect.mjs               every sitemap URL
//   node scripts/bing/inspect.mjs --limit 20    the 20 checked longest ago
//   node scripts/bing/inspect.mjs --dry-run     inspect, print, write nothing
//
// Env: BING_WMT_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (not with --dry-run).
//
// GetUrlInfo answers with crawl facts — HTTP status, last crawl, discovery
// date, document size — not with the dashboard's word "Indexed". So a URL
// here is one of: never crawled, crawled with an error, crawled before the
// page last changed (`stale`), or crawled since (`ok`). The site-wide
// indexed COUNT is GetCrawlStats.InIndex, in bing_crawl_daily.

import { pathToFileURL } from 'node:url';
import { supabaseAuthHeaders } from '../gsc/auth.mjs';
import { bingCall, parseBingDate, readKey, upsert, restAll, BING_SITE } from './api.mjs';

export const SITEMAP_URL = 'https://sqlquest.app/sitemap.xml';
// GetUrlInfo allows about TEN CALLS A MINUTE. Measured 2026-10-01: three
// workers 200 ms apart were refused ("ThrottleHost") inside 2.3 s; one call
// a second got ten through, then a 20–60 s refusal, ten more, and so on —
// 100 URLs in 9.6 minutes either way. So: one call at a time, 6.5 s apart,
// which never meets the throttle; the 415-URL sitemap takes ~45 minutes.
export const CONCURRENCY = 1;
export const MIN_INTERVAL_MS = 6500;
export const WRITE_EVERY = 10;

/** <url><loc>…</loc><lastmod>…</lastmod></url> → [{ url, lastmod }] (lastmod may be null). */
export function parseSitemapEntries(xml) {
  return [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(m[1]);
    const mod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(m[1]);
    return loc ? { url: loc[1].trim(), lastmod: mod ? mod[1].trim() : null } : null;
  }).filter(Boolean);
}

/** Never-checked first, then oldest `checked_at`; at most `limit`. */
export function pickBatch(urls, checked = {}, limit = Infinity) {
  return [...new Set(urls)]
    .map(u => ({ u, t: checked[u] ? Date.parse(checked[u]) : -Infinity }))
    .sort((a, b) => a.t - b.t || a.u.localeCompare(b.u))
    .slice(0, limit)
    .map(x => x.u);
}

/** A UrlInfo answer (or null: Bing has no record) → a bing_url_status record. */
export function toUrlStatus(url, info, now = new Date()) {
  const i = info || {};
  return {
    url,
    http_status: Number.isFinite(Number(i.HttpStatus)) ? Number(i.HttpStatus) : null,
    last_crawled: parseBingDate(i.LastCrawledDate)?.at || null,
    discovered: parseBingDate(i.DiscoveryDate)?.at || null,
    document_size: Number.isFinite(Number(i.DocumentSize)) ? Number(i.DocumentSize) : null,
    anchor_count: Number.isFinite(Number(i.AnchorCount)) ? Number(i.AnchorCount) : null,
    is_page: typeof i.IsPage === 'boolean' ? i.IsPage : null,
    checked_at: now.toISOString(),
  };
}

/**
 * never — Bing has not fetched it;  error — the last fetch was not a 2xx;
 * stale — fetched before the sitemap's lastmod;  ok — fetched since.
 * HttpStatus is 0 on a page Bing crawled the same morning (the homepage,
 * 2026-10-01), so 0 is "nothing to report", not an error.
 */
export function classify(rec, lastmod = null) {
  if (!rec || !rec.last_crawled) return 'never';
  if (rec.http_status && (rec.http_status < 200 || rec.http_status >= 300)) return 'error';
  if (lastmod && Date.parse(rec.last_crawled) < Date.parse(lastmod)) return 'stale';
  
  return 'ok';
}

export function summarize(records, entries) {
  const mod = Object.fromEntries(entries.map(e => [e.url, e.lastmod]));
  const groups = { never: [], error: [], stale: [], ok: [] };
  for (const r of records) groups[classify(r, mod[r.url])].push(r);
  return { total: records.length, ...groups };
}

export function renderReport(sum, { date = new Date().toISOString().slice(0, 10) } = {}) {
  const day = (t) => (t ? String(t).slice(0, 10) : 'never');
  const table = (rows, head, line) => (rows.length ? [head, head.replace(/[^|]+/g, '---'), ...rows.map(line)] : ['None.']);
  return [
    `# Bing URL status — ${date}`,
    '',
    `${sum.ok.length} of ${sum.total} sitemap URLs crawled since they last changed; ${sum.stale.length} crawled before; ${sum.never.length} never crawled; ${sum.error.length} answered with an error.`,
    '',
    '## Never crawled',
    '',
    ...table(sum.never, '| URL | Discovered |', r => `| ${r.url} | ${day(r.discovered)} |`),
    '',
    '## Crawled with an error',
    '',
    ...table(sum.error, '| URL | HTTP | Last crawled |', r => `| ${r.url} | ${r.http_status} | ${day(r.last_crawled)} |`),
    '',
    '## Crawled before the last change',
    '',
    ...table(sum.stale, '| URL | Last crawled |', r => `| ${r.url} | ${day(r.last_crawled)} |`),
    '',
  ].join('\n');
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function run({ argv = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log, now = new Date(), pace = MIN_INTERVAL_MS, concurrency = CONCURRENCY } = {}) {
  const dryRun = argv.includes('--dry-run');
  const li = argv.indexOf('--limit');
  const limit = li >= 0 ? Math.max(1, Number(argv[li + 1]) || 1) : Infinity;
  const db = { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl, headers: supabaseAuthHeaders };
  if (!dryRun && (!db.url || !db.serviceKey)) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run)');
  const key = readKey(env);

  const sm = await fetchImpl(env.SITEMAP_URL || SITEMAP_URL);
  if (!sm.ok) throw new Error(`sitemap → HTTP ${sm.status}`);
  const entries = parseSitemapEntries(await sm.text());
  const checked = {};
  if (!dryRun) for (const r of await restAll('bing_url_status?select=url,checked_at', db)) checked[r.url] = r.checked_at;
  const batch = pickBatch(entries.map(e => e.url), checked, limit);
  log(`sitemap: ${entries.length} URLs · inspecting ${batch.length}${dryRun ? ' · dry run' : ''}`);

  const records = [];
  let pending = [];
  const flush = async () => {
    if (dryRun || !pending.length) return;
    const out = pending; pending = [];
    await upsert('bing_url_status', 'url', out, db);
  };
  let next = 0;
  const worker = async () => {
    while (next < batch.length) {
      const u = batch[next++];
      const info = await bingCall('GetUrlInfo', { key, fetchImpl, log, params: { siteUrl: BING_SITE, url: u } });
      const rec = toUrlStatus(u, info, new Date());
      records.push(rec);
      pending.push(rec);
      if (pending.length >= WRITE_EVERY) await flush();
      if (records.length % 100 === 0) log(`  ${records.length}/${batch.length} inspected`);
      if (pace) await sleep(pace);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) }, worker));
  await flush();

  // The report covers the whole table, restricted to what the sitemap lists today.
  const inSitemap = new Set(entries.map(e => e.url));
  const all = (dryRun ? records : await restAll('bing_url_status?select=*', db)).filter(r => inSitemap.has(r.url));
  const report = renderReport(summarize(all, entries), { date: now.toISOString().slice(0, 10) });
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
