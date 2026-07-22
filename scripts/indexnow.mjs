#!/usr/bin/env node
/**
 * IndexNow submitter — tells Bing (+ Yandex, Seznam, Naver, Yep) that pages changed.
 *
 * Google ignores IndexNow; this is the Bing-side equivalent of GSC's
 * "Request Indexing", except it needs no account and has no daily quota.
 *
 * Ownership proof is the key file at public/<KEY>.txt — it must be live on
 * the domain BEFORE submitting, or the API returns 403.
 *
 *   node scripts/indexnow.mjs                 # URLs with lastmod in the last 7 days
 *   node scripts/indexnow.mjs --days 30       # ...last 30 days
 *   node scripts/indexnow.mjs --all           # every URL in the sitemap
 *   node scripts/indexnow.mjs /plaid-sql-interview/ https://sqlquest.app/x/
 *   node scripts/indexnow.mjs --dry ...       # print the payload, submit nothing
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'sqlquest.app';
const ORIGIN = `https://${HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

// The key is whatever 32-hex .txt file sits in public/ — no second source of truth.
function findKey() {
  const candidates = readdirSync(join(ROOT, 'public'))
    .filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  if (candidates.length === 0) {
    throw new Error('No IndexNow key file in public/. Create one: openssl rand -hex 16');
  }
  if (candidates.length > 1) {
    throw new Error(`Multiple IndexNow key files in public/: ${candidates.join(', ')}`);
  }
  const file = candidates[0];
  const key = file.replace(/\.txt$/, '');
  const body = readFileSync(join(ROOT, 'public', file), 'utf8').trim();
  if (body !== key) {
    throw new Error(`${file} must contain exactly "${key}" (found "${body}")`);
  }
  return { key, keyLocation: `${ORIGIN}/${file}` };
}

function sitemapEntries() {
  const xml = readFileSync(join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  const entries = [];
  for (const block of xml.split('<url>').slice(1)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    entries.push({ loc, lastmod: block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() || null });
  }
  return entries;
}

const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const all = argv.includes('--all');
const daysIdx = argv.indexOf('--days');
const days = daysIdx !== -1 ? Number(argv[daysIdx + 1]) : 7;
const explicit = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--days');

let urls;
let why;
if (explicit.length) {
  urls = explicit.map((u) => (u.startsWith('http') ? u : ORIGIN + (u.startsWith('/') ? u : `/${u}`)));
  why = 'explicit args';
} else {
  const entries = sitemapEntries();
  if (all) {
    urls = entries.map((e) => e.loc);
    why = 'whole sitemap';
  } else {
    const cutoff = Date.now() - days * 86400_000;
    urls = entries.filter((e) => e.lastmod && Date.parse(e.lastmod) >= cutoff).map((e) => e.loc);
    why = `lastmod within ${days}d`;
  }
}

const offSite = urls.filter((u) => !u.startsWith(`${ORIGIN}/`) && u !== ORIGIN);
if (offSite.length) {
  console.error(`Refusing: ${offSite.length} URL(s) not on ${HOST}:\n  ${offSite.join('\n  ')}`);
  process.exit(1);
}
if (!urls.length) {
  console.log(`Nothing to submit (${why}).`);
  process.exit(0);
}

const { key, keyLocation } = findKey();
const payload = { host: HOST, key, keyLocation, urlList: urls };

console.log(`IndexNow — ${urls.length} URL(s) (${why})`);
for (const u of urls) console.log(`  ${u}`);
console.log(`  key: ${keyLocation}`);

if (dry) {
  console.log('\n--dry: not submitting.');
  process.exit(0);
}

// The key file must already be live, or IndexNow 403s on validation.
const probe = await fetch(keyLocation, { cache: 'no-store' });
const probeBody = probe.ok ? (await probe.text()).trim() : '';
if (probeBody !== key) {
  console.error(`\nKey file not live at ${keyLocation} (HTTP ${probe.status}). Deploy it first.`);
  process.exit(1);
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log(`\nHTTP ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 300)}` : ''}`);
// 200 = accepted, 202 = accepted, key validation pending.
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
