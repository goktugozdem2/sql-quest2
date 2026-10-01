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
//   - send a URL whose own status row is older than STATUS_MAX_AGE_DAYS — Bing
//     may have crawled it since — or run at all on a table that does not
//     cover the sitemap. The inspector turns the sitemap over every three
//     days (150 URLs a day), so on a Monday every row is that fresh.
// IndexNow (the push after every deploy) stays the signal for a page that
// just changed; this is the sweep for what IndexNow did not get crawled.

import { pathToFileURL } from 'node:url';
import { supabaseAuthHeaders } from '../gsc/auth.mjs';
import { bingCall, readKey, upsert, restAll, BING_SITE } from './api.mjs';
import { SITEMAP_URL, parseSitemapEntries, classify } from './inspect.mjs';

export const COOLDOWN_DAYS = 14;
export const MAX_PER_RUN = 100;
export const STATUS_MAX_AGE_DAYS = 4;

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
export function pickSubmissions({ entries, status = {}, lastSubmitted = {}, now = new Date(), cooldownDays = COOLDOWN_DAYS, maxAgeDays = STATUS_MAX_AGE_DAYS, limit = MAX_PER_RUN } = {}) {
  const cutoff = now.getTime() - cooldownDays * 86400000;
  const freshSince = now.getTime() - maxAgeDays * 86400000;
  const rank = { never: 0, stale: 1 };
  return entries
    // Only a URL we looked at recently: "never crawled" read a week ago is not a fact today.
    .filter(e => status[e.url] && Date.parse(status[e.url].checked_at) >= freshSince)
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
  const freshSince = now.getTime() - STATUS_MAX_AGE_DAYS * 86400000;
  const fresh = entries.filter(e => status[e.url] && Date.parse(status[e.url].checked_at) >= freshSince);
  if (fresh.length < entries.length * 0.9) {
    throw new Error(`bing_url_status has a check from the last ${STATUS_MAX_AGE_DAYS} days for ${fresh.length} of ${entries.length} sitemap URLs — run scripts/bing/inspect.mjs first`);
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
