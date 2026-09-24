// Step 3 of the GSC pipeline: Search Console search analytics → gsc_daily.
//
//   node scripts/gsc/fetch.mjs              last 7 days, re-written every run
//   node scripts/gsc/fetch.mjs --backfill   16 months back, in monthly chunks
//   node scripts/gsc/fetch.mjs --dry-run    fetch and count, write nothing
//
// Env: GSC_SA_KEY (service-account JSON), SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (not needed with --dry-run).
//
// Three slices, each with `date` as a dimension so every row is one day:
//   [date, query]        → page NULL
//   [date, page]         → query NULL
//   [date, query, page]  → both set
// Each slice is a whole on its own: never sum clicks across slices. GSC data
// arrives 2–3 days late and is revised afterwards, so the default run asks
// for the last 7 days with dataState 'all' (fresh data included) and
// upserts over whatever is there.

import { pathToFileURL } from 'node:url';
import { getAccessToken, googleFetch, GSC_PROPERTY } from './auth.mjs';

export const SLICES = [
  { name: 'query', dimensions: ['date', 'query'] },
  { name: 'page', dimensions: ['date', 'page'] },
  { name: 'query_page', dimensions: ['date', 'query', 'page'] },
];
export const ROW_LIMIT = 25000;
export const DEFAULT_DAYS = 7;
export const BACKFILL_MONTHS = 16;
export const UPSERT_BATCH = 1000;

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };

/** The date windows a run covers, oldest first. `today` is a Date (UTC). */
export function dateWindows({ backfill = false, today = new Date(), days = DEFAULT_DAYS, months = BACKFILL_MONTHS } = {}) {
  const end = addDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())), -1);
  if (!backfill) return [{ start: iso(addDays(end, -(days - 1))), end: iso(end) }];
  const first = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, 1));
  const out = [];
  for (let s = first; s <= end; s = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1))) {
    const monthEnd = addDays(new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1)), -1);
    out.push({ start: iso(s), end: iso(monthEnd < end ? monthEnd : end) });
  }
  return out;
}

/** A searchAnalytics row → a gsc_daily record for its slice. */
export function toRecord(row, slice) {
  const keys = row.keys || [];
  const rec = { date: keys[0], query: null, page: null };
  slice.dimensions.forEach((dim, i) => { if (dim !== 'date') rec[dim] = keys[i] ?? null; });
  rec.clicks = Math.round(row.clicks || 0);
  rec.impressions = Math.round(row.impressions || 0);
  rec.ctr = typeof row.ctr === 'number' ? Number(row.ctr.toFixed(6)) : null;
  rec.position = typeof row.position === 'number' ? Number(row.position.toFixed(3)) : null;
  return rec;
}

/** Every row of one slice in one window, paging with startRow. */
export async function fetchSlice({ token, slice, window, property = GSC_PROPERTY, fetchImpl = fetch, log = () => {} }) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;
  const rows = [];
  for (let startRow = 0; ; startRow += ROW_LIMIT) {
    const data = await googleFetch(url, {
      token, method: 'POST', fetchImpl, log,
      body: { startDate: window.start, endDate: window.end, dimensions: slice.dimensions, type: 'web', dataState: 'all', rowLimit: ROW_LIMIT, startRow },
    });
    const page = data.rows || [];
    rows.push(...page.map(r => toRecord(r, slice)));
    if (page.length < ROW_LIMIT) break;
  }
  return rows;
}

/** Upsert into gsc_daily through PostgREST with the service role, in batches. */
export async function upsertRows(rows, { url, serviceKey, fetchImpl = fetch, batch = UPSERT_BATCH } = {}) {
  let written = 0;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const res = await fetchImpl(`${url.replace(/\/$/, '')}/rest/v1/gsc_daily?on_conflict=date,query,page`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        'content-type': 'application/json',
        prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(chunk.map(r => ({ ...r, fetched_at: new Date().toISOString() }))),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`gsc_daily upsert failed at row ${i}: HTTP ${res.status} ${text.slice(0, 300)}`);
    }
    written += chunk.length;
  }
  return written;
}

export async function run({ argv = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log, today = new Date() } = {}) {
  const backfill = argv.includes('--backfill');
  const dryRun = argv.includes('--dry-run');
  if (!dryRun && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run)');
  }
  const { token } = await getAccessToken({ env, fetchImpl });
  const windows = dateWindows({ backfill, today });
  log(`GSC ${GSC_PROPERTY} · ${backfill ? 'backfill' : 'daily'} · ${windows[0].start} → ${windows[windows.length - 1].end}${dryRun ? ' · dry run' : ''}`);
  const totals = {};
  for (const window of windows) {
    for (const slice of SLICES) {
      const rows = await fetchSlice({ token, slice, window, fetchImpl, log });
      const written = dryRun ? 0 : await upsertRows(rows, { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl });
      totals[slice.name] = (totals[slice.name] || 0) + (dryRun ? rows.length : written);
      log(`  ${window.start}..${window.end} [${slice.dimensions.join(', ')}]: ${rows.length} rows${dryRun ? '' : `, ${written} written`}`);
    }
  }
  log(`done: ${Object.entries(totals).map(([k, v]) => `${k}=${v}`).join(' ')} (${dryRun ? 'fetched, not written' : 'written'})`);
  return totals;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
}
