// One-off: put the URL batches that were pasted into Bing's URL Submission
// dialog by hand (2026-09-23 → 2026-10-01, logged in
// docs/reads/bing-url-submissions.txt) into bing_submissions, so the
// submitter's 14-day cooldown knows about them. Without this its first run
// would re-send, the same week, URLs Bing was handed days ago.
//
//   node scripts/bing/seed-submissions.mjs --dry-run   count per day, write nothing
//   node scripts/bing/seed-submissions.mjs             upsert (safe to repeat)
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. No Bing call is made.

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { supabaseAuthHeaders } from '../gsc/auth.mjs';
import { upsert } from './api.mjs';

export const LOG_FILE = new URL('../../docs/reads/bing-url-submissions.txt', import.meta.url);

/** "## 2026-09-23 (99, …)" headings, then one URL a line → [{ url, submitted_at, reason }]. */
export function parseSubmissionLog(text) {
  const out = [];
  let day = null;
  for (const line of String(text).split('\n')) {
    const h = /^##\s+(\d{4}-\d{2}-\d{2})\b/.exec(line);
    if (h) { day = h[1]; continue; }
    const u = /^(https:\/\/sqlquest\.app\/\S*)\s*$/.exec(line.trim());
    if (u && day) out.push({ url: u[1], submitted_at: `${day}T12:00:00.000Z`, reason: 'by_hand' });
  }
  // One row per (url, day): the table's key, and a batch must not name a key twice.
  return [...new Map(out.map(r => [`${r.url}|${r.submitted_at}`, r])).values()];
}

export async function run({ argv = process.argv.slice(2), env = process.env, fetchImpl = fetch, log = console.log, text = readFileSync(LOG_FILE, 'utf8') } = {}) {
  const rows = parseSubmissionLog(text);
  const perDay = {};
  for (const r of rows) perDay[r.submitted_at.slice(0, 10)] = (perDay[r.submitted_at.slice(0, 10)] || 0) + 1;
  log(`hand submissions in the log: ${rows.length} (${Object.entries(perDay).map(([d, n]) => `${d}: ${n}`).join(', ')})`);
  if (argv.includes('--dry-run')) return { rows: rows.length, written: 0 };
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or pass --dry-run)');
  const written = await upsert('bing_submissions', 'url,submitted_at', rows, { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, fetchImpl, headers: supabaseAuthHeaders });
  log(`written: ${written}`);
  return { rows: rows.length, written };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  run().catch(err => { console.error(`FAILED: ${err.message}`); process.exit(1); });
}
