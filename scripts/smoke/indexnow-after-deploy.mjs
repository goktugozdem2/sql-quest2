#!/usr/bin/env node
// IndexNow after every deploy (founder, 2026-09-30) — .github/workflows/indexnow.yml.
//
//   BEFORE=<sha> AFTER=<sha> GITHUB_EVENT_NAME=push node scripts/smoke/indexnow-after-deploy.mjs [https://sqlquest.app]
//
// `npm run indexnow` tells Bing/Yandex/Seznam/Naver which pages changed; until
// this date it was run by hand, which means it was run when somebody
// remembered. This runs it after a push to main that touched public/**:
//
//   1. Only on a push. Never on a schedule or by hand from CI: with nothing
//      pushed there is nothing new, and resubmitting unchanged URLs is the one
//      thing IndexNow asks you not to do.
//   2. Only the URLs whose <lastmod> this push changed (or added) in
//      public/sitemap.xml — lastmod is content-hashed (scripts/sitemap-lastmod.mjs),
//      so a changed lastmod IS a changed page. A push that moved no lastmod
//      submits nothing. When the pushed-from commit cannot be read (a force
//      push), it falls back to the script's own default, lastmod in the last
//      7 days.
//   3. Only after the deploy is live: the app marker (wait-for-deploy.mjs,
//      reused), and then the served /sitemap.xml must be byte-equal to the
//      committed one — a push that changed only static pages leaves the app
//      hash untouched, so the app marker alone would say "live" at once.
//      Pinging before the page is served sends the crawler to the old page.
//   4. Never fails anything. A deploy that did not go live, a 403 from the
//      API, a network error: one ::warning:: line in the log, exit 0. It has
//      no result file in smoke-out/, so it cannot reach the smoke verdict,
//      the alert or the rollback.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { waitForDeploy, committedAppHash, CEILING_MS, POLL_MS } from './wait-for-deploy.mjs';

export const SITEMAP = 'public/sitemap.xml';

// loc → lastmod (null when the entry carries none).
export function sitemapLastmods(xml) {
  const out = new Map();
  for (const block of String(xml || '').split('<url>').slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    out.set(loc, block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() || null);
  }
  return out;
}

// The URLs this push changed: new in the sitemap, or carrying a different
// lastmod than before. A URL that left the sitemap is not submitted.
export function changedUrls(beforeXml, afterXml) {
  const before = sitemapLastmods(beforeXml);
  const urls = [];
  for (const [loc, lastmod] of sitemapLastmods(afterXml)) {
    if (!before.has(loc) || before.get(loc) !== lastmod) urls.push(loc);
  }
  return urls;
}

export async function waitForSitemap({ base, committed, fetchImpl = fetch, now = Date.now, sleep = (ms) => new Promise(r => setTimeout(r, ms)), log = console.log, ceilingMs = CEILING_MS, pollMs = POLL_MS }) {
  const start = now();
  let last = null;
  while (now() - start < ceilingMs) {
    try {
      const res = await fetchImpl(`${base}/sitemap.xml`, { headers: { 'cache-control': 'no-cache' } });
      const served = await res.text();
      last = { status: res.status, bytes: served.length };
      if (res.ok && served === committed) return { live: true, waitedMs: now() - start };
    } catch (e) { last = { error: String(e.message || e) }; }
    log(`waiting for the committed sitemap.xml to be served — ${JSON.stringify(last)}`);
    await sleep(pollMs);
  }
  return { live: false, waitedMs: now() - start, last };
}

function gitShow(sha, file, cwd) {
  if (!sha || /^0+$/.test(sha)) return null;
  try { return execFileSync('git', ['show', `${sha}:${file}`], { cwd, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch (_) { return null; }
}

function submitWithScript(urls, cwd) {
  const r = spawnSync(process.execPath, ['scripts/indexnow.mjs', ...urls], { cwd, stdio: 'inherit' });
  return r.status === 0 ? { ok: true } : { ok: false, why: `scripts/indexnow.mjs exited ${r.status}` };
}

// Returns what happened; never throws for anything a ping can run into.
export async function run({
  env = process.env,
  base = 'https://sqlquest.app',
  root = process.cwd(),
  readFile = (p) => fs.readFileSync(p, 'utf8'),
  showAt = (sha, file) => gitShow(sha, file, root),
  waitApp = waitForDeploy,
  waitSitemap = waitForSitemap,
  submit = (urls) => submitWithScript(urls, root),
  fetchImpl = fetch,
  log = console.log,
} = {}) {
  if (env.GITHUB_EVENT_NAME !== 'push') return { submitted: 0, skipped: `not a push (${env.GITHUB_EVENT_NAME || 'no event'}) — IndexNow runs only after a deploy` };
  const after = readFile(path.join(root, SITEMAP));
  const before = showAt(env.BEFORE, SITEMAP);
  // null = the 7-day default of scripts/indexnow.mjs (no pushed-from commit to compare with).
  const urls = before == null ? null : changedUrls(before, after);
  if (urls && urls.length === 0) return { submitted: 0, skipped: 'no <lastmod> changed in this push' };

  const expected = committedAppHash(readFile(path.join(root, 'public', 'app.html')));
  if (!expected) return { submitted: 0, skipped: 'public/app.html carries no app.js?v= hash' };
  const app = await waitApp({ base, expected, fetchImpl, log });
  if (!app.live) return { submitted: 0, skipped: `the deploy did not go live within ${Math.round(app.waitedMs / 1000)} s` };
  const sm = await waitSitemap({ base, committed: after, fetchImpl, log });
  if (!sm.live) return { submitted: 0, skipped: `the committed sitemap.xml was not served within ${Math.round(sm.waitedMs / 1000)} s` };

  const r = submit(urls || []);
  if (!r.ok) return { submitted: 0, error: r.why };
  return { submitted: urls ? urls.length : null, mode: urls ? 'changed in this push' : 'lastmod within 7 days (no pushed-from commit)' };
}

if (process.argv[1] && /indexnow-after-deploy\.mjs$/.test(process.argv[1])) {
  const base = (process.argv[2] || process.env.SMOKE_URL || 'https://sqlquest.app').replace(/\/$/, '');
  run({ base }).then((r) => {
    if (r.error) console.log(`::warning::IndexNow ping failed: ${r.error}`);
    else if (r.skipped) console.log(`IndexNow: nothing submitted — ${r.skipped}`);
    else console.log(`IndexNow: submitted ${r.submitted ?? 'the default window'} URL(s) — ${r.mode}`);
  }).catch((e) => {
    console.log(`::warning::IndexNow ping failed: ${String(e && e.message || e)}`);
  }).finally(() => process.exit(0));
}
