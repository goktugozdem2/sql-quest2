// Step 1 of the Bing pipeline: does the key open sqlquest.app, and do the
// answers have the shape the other scripts assume?
//
//   BING_WMT_KEY=… node scripts/bing/verify.mjs
//
// Prints: the sites the key sees, the URL-submission quota, the newest row
// of each stats method (so position scale and date buckets can be compared
// with the dashboard by eye), and whether GetUrlInfo wants its `url`
// parameter plain or JSON-quoted. Exit 0 only when the site is in the list.
// The key is never printed.

import { bingCall, parseBingDate, readKey, BING_SITE } from './api.mjs';

async function main() {
  const key = readKey();
  console.log('key: set');
  const sites = (await bingCall('GetUserSites', { key })) || [];
  console.log(`sites visible to the key: ${sites.length}`);
  for (const s of sites) console.log(`  ${s.Url}  verified=${s.IsVerified}`);
  const norm = (u) => String(u || '').replace(/\/$/, '').toLowerCase();
  const ours = sites.find(s => norm(s.Url) === norm(BING_SITE));
  if (!ours) {
    console.error(`MISSING: ${BING_SITE} is not in the list — the key belongs to an account that has not verified it.`);
    process.exit(1);
  }

  const quota = await bingCall('GetUrlSubmissionQuota', { key, params: { siteUrl: BING_SITE } });
  console.log(`URL submission quota: daily=${quota?.DailyQuota} monthly=${quota?.MonthlyQuota}`);

  const newest = (rows) => [...(rows || [])].sort((a, b) => String(parseBingDate(b.Date)?.at).localeCompare(String(parseBingDate(a.Date)?.at)))[0];
  for (const method of ['GetRankAndTrafficStats', 'GetQueryStats', 'GetPageStats', 'GetCrawlStats']) {
    const rows = (await bingCall(method, { key, params: { siteUrl: BING_SITE } })) || [];
    const dates = [...new Set(rows.map(r => parseBingDate(r.Date)?.date))].filter(Boolean).sort();
    console.log(`${method}: ${rows.length} rows, ${dates.length} distinct dates ${dates[0] || '—'} → ${dates[dates.length - 1] || '—'}; last three dates: ${dates.slice(-3).join(', ')}`);
    console.log(`  newest: ${JSON.stringify(newest(rows) || null)}`);
  }

  for (const quote of [false, true]) {
    try {
      const info = await bingCall('GetUrlInfo', { key, quote, params: { siteUrl: BING_SITE, url: BING_SITE } });
      console.log(`GetUrlInfo (${quote ? 'JSON-quoted' : 'plain'} url): ${JSON.stringify(info)}`);
    } catch (e) {
      console.log(`GetUrlInfo (${quote ? 'JSON-quoted' : 'plain'} url): ${e.message}`);
    }
  }
  console.log(`OK: ${BING_SITE} verified=${ours.IsVerified}`);
}

main().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
