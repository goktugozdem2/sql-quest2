// Step 4 of the Bing pipeline: hand Bing the sitemap URLs it has not crawled
// (or not since they changed), inside the quota — the batch that used to be
// pasted into the URL Submission dialog by hand.
//
//   node scripts/bing/submit.mjs --dry-run   say what would be sent, send nothing
//   node scripts/bing/submit.mjs             send, and log every URL in bing_submissions
//
// Env: BING_WMT_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
//
// What it will not do, by construction:
//   - send a URL that is not in the sitemap;
//   - send a URL again within COOLDOWN_DAYS (a URL Bing still has not crawled
//     after a submission is not helped by a second one the next week);
//   - send more than MAX_PER_RUN, or more than the quota the API reports;
//   - run on a bing_url_status older than FRESH_DAYS — it would re-send URLs
//     Bing crawled since. Run scripts/bing/inspect.mjs first.
// IndexNow (the push after every deploy) stays the signal for a page that
// just changed; this is the sweep for what IndexNow did not get crawled.

import { pathToFileURL } from 'node:url';
import { supabaseAuthHeaders } from '../gsc/auth.mjs';
import { bingCall, readKey, upsert, restAll, BING_SITE } from './api.mjs';
import { SITEMAP_URL, parseSitemapEntries, classify } from './inspect.mjs';

export const COOLDOWN_DAYS = 14;
export const MAX_PER_RUN = 100;
export const FRESH_DAYS = 3;

/** How many URLs this run may send: the smaller of the API's two quotas and our own cap. */
export function allowance(quota, cap = MAX_PER_RUN) {
  const daily = Number(quota?.DailyQuota);
  const monthly = Number(quota?.MonthlyQuota);
  if (!Number.isFinite(daily) || !Number.isFinite(monthly)) return 0;
  return Math.max(0, Math.min(daily, monthly, cap));
}

/**
 * The URLs to send, never-crawled first, then crawled-before-the-change;
 * each with its reason. `status` is { url → bing_url_status row },
 * `lastSubmitted` is { url → ISO time of the latest submission }.
 */
export function pickSubmissions({ entries, status = {}, lastSubmitted = {}, now = new Date(), cooldownDays = COOLDOWN_DAYS, limit = MAX_PER_RUN } = {}) {
  const cutoff = now.getTime() - cooldownDays * 86400000;
  const rank = { never: 0, stale: 1 };
  return entries
    .map(e => ({ url: e.url, reason: classify(status[e.url], e.lastmod) }))
    .filter(x => x.reason in rank)
    .filter(x => !(lastSubmitted[x.url] && Date.parse(lastSubmitted[x.url]) > cutoff))
    .sort((a, b) => rank[a.reason] - rank[b.reason] || a.url.localeCompare(b.url))
    .slice(0, Math.max(0, limit));
}

export async function run({ argv = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log, now = new Date() } = {}) {
  const dryRun = argv.includes('--dry-run');
  const db = { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl, headers: supabaseAuthHeaders };
  if (!db.url || !db.serviceKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  const key = readKey(env);

  const sm = await fetchImpl(env.SITEMAP_URL || SITEMAP_URL);
  if (!sm.ok) throw new Error(`sitemap → HTTP ${sm.status}`);
  const entries = parseSitemapEntries(await sm.text());

  const rows = await restAll('bing_url_status?select=*', db);
  const status = Object.fromEntries(rows.map(r => [r.url, r]));
  const known = entries.filter(e => status[e.url]);
  const newest = known.reduce((t, e) => Math.max(t, Date.parse(status[e.url].checked_at) || 0), 0);
  if (known.length < entries.length * 0.9 || newest < now.getTime() - FRESH_DAYS * 86400000) {
    throw new Error(`bing_url_status covers ${known.length} of ${entries.length} sitemap URLs, newest check ${newest ? new Date(newest).toISOString().slice(0, 10) : 'never'} — run scripts/bing/inspect.mjs first`);
  }

  const lastSubmitted = {};
  for (const r of await restAll('bing_submissions?select=url,submitted_at&order=submitted_at', db)) lastSubmitted[r.url] = r.submitted_at;

  const quota = await bingCall('GetUrlSubmissionQuota', { key, fetchImpl, log, params: { siteUrl: BING_SITE } });
  const room = allowance(quota);
  const picks = pickSubmissions({ entries, status, lastSubmitted, now, limit: room });
  const count = (reason) => picks.filter(p => p.reason === reason).length;
  log(`quota: daily ${quota?.DailyQuota}, monthly ${quota?.MonthlyQuota} · sending ${picks.length} (${count('never')} never crawled, ${count('stale')} crawled before the last change)${dryRun ? ' · dry run' : ''}`);
  for (const p of picks) log(`  ${p.reason}  ${p.url}`);
  if (dryRun || !picks.length) return { submitted: 0, picks };

  await bingCall('SubmitUrlBatch', { key, fetchImpl, log, body: { siteUrl: BING_SITE, urlList: picks.map(p => p.url) } });
  const at = now.toISOString();
  await upsert('bing_submissions', 'url,submitted_at', picks.map(p => ({ url: p.url, submitted_at: at, reason: p.reason })), db);
  log(`submitted ${picks.length}`);
  return { submitted: picks.length, picks };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
}
