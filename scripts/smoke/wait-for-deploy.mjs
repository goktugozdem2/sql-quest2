#!/usr/bin/env node
// Wait until the Vercel production deploy of THIS commit is live.
//
//   node scripts/smoke/wait-for-deploy.mjs [https://sqlquest.app]
//
// The marker is the one the build already stamps: scripts/cachebust.js
// writes `/app.js?v=<md5 8>` (a content hash of public/app.js) into
// public/app.html, and both files are committed. So the committed hash IS
// the deployed hash once the deploy is live: poll /app/ until the served
// page carries the same `app.js?v=`, then confirm the served app.js hashes
// to it (the marker inside app.js itself — the tag alone could be a cached
// page). Ceiling 10 minutes, then exit 1 (the smoke run still proceeds,
// against whatever is live, and says so).
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

export const CEILING_MS = 10 * 60_000;
export const POLL_MS = 15_000;

export function committedAppHash(html) {
  const m = String(html).match(/src="\/app\.js\?v=([a-f0-9]{8})"/);
  return m ? m[1] : null;
}

export function hashOf(buf) {
  return crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
}

export async function waitForDeploy({ base, expected, fetchImpl = fetch, now = Date.now, sleep = (ms) => new Promise(r => setTimeout(r, ms)), log = console.log, ceilingMs = CEILING_MS, pollMs = POLL_MS }) {
  const start = now();
  let last = null;
  while (now() - start < ceilingMs) {
    try {
      const page = await fetchImpl(`${base}/app/`, { headers: { 'cache-control': 'no-cache' } });
      const html = await page.text();
      const live = committedAppHash(html);
      last = { pageStatus: page.status, live };
      if (page.ok && live === expected) {
        const js = await fetchImpl(`${base}/app.js?v=${expected}`, { headers: { 'cache-control': 'no-cache' } });
        const served = hashOf(Buffer.from(await js.arrayBuffer()));
        if (js.ok && served === expected) { log(`deploy live: app.js?v=${expected} after ${Math.round((now() - start) / 1000)} s`); return { live: true, waitedMs: now() - start }; }
        last.servedJsHash = served;
      }
    } catch (e) { last = { error: String(e.message || e) }; }
    log(`waiting for app.js?v=${expected} — live: ${JSON.stringify(last)}`);
    await sleep(pollMs);
  }
  return { live: false, waitedMs: now() - start, last };
}

if (process.argv[1] && /wait-for-deploy\.mjs$/.test(process.argv[1])) {
  const base = (process.argv[2] || process.env.SMOKE_URL || 'https://sqlquest.app').replace(/\/$/, '');
  const expected = committedAppHash(fs.readFileSync(path.join(process.cwd(), 'public', 'app.html'), 'utf8'));
  if (!expected) { console.error('public/app.html carries no app.js?v= hash'); process.exit(2); }
  waitForDeploy({ base, expected }).then((r) => {
    if (!r.live) { console.error(`deploy not live after ${Math.round(r.waitedMs / 1000)} s: ${JSON.stringify(r.last)}`); process.exit(1); }
  });
}
