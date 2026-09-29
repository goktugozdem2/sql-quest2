#!/usr/bin/env node
// Smoke check 4 — the daily database read (plan §1, founder 2026-09-22).
//
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/smoke/db-slow-queries.mjs
//
// One RPC, service role only: public.ops_capture_query_stats() takes today's
// snapshot of pg_stat_statements into ops.query_stats_daily and returns every
// statement whose 24 h delta shows MORE than MIN_CALLS calls at a mean ABOVE
// MIN_MEAN_MS. The leaderboard query of 2026-09-13 (noticed 09-21, when the
// Disk IO mail arrived) would have tripped this the next morning. Never
// resets the stats. Migration: supabase/migrations/20260929120000_ops_query_stats_daily.sql.
import { writeResult, CLASSES } from './lib.mjs';

export const MIN_MEAN_MS = 200;
export const MIN_CALLS = 1000;
export const WINDOW_HOURS = 24;
export const CHECK = 'db-slow-queries';
export const RPC = 'ops_capture_query_stats';

export function supabaseHeaders(key) {
  return { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
}

// The function already filters by the thresholds; this second pass is the
// contract for the tests and a guard against a migration whose defaults
// drifted from these numbers.
export function offendersOf(rows, { minMeanMs = MIN_MEAN_MS, minCalls = MIN_CALLS } = {}) {
  return (rows || [])
    .filter(r => Number(r.calls_delta) > minCalls && Number(r.mean_ms) > minMeanMs)
    .sort((a, b) => Number(b.mean_ms) - Number(a.mean_ms))
    .map(r => ({ queryid: String(r.queryid), calls: Number(r.calls_delta), meanMs: Math.round(Number(r.mean_ms) * 10) / 10, query: String(r.query_head || '').replace(/\s+/g, ' ').slice(0, 200) }));
}

export function render(offenders) {
  if (!offenders.length) return `no statement over ${MIN_MEAN_MS} ms mean with more than ${MIN_CALLS} calls in the last ${WINDOW_HOURS} h`;
  return offenders.map(o => `${o.meanMs} ms mean × ${o.calls} calls  queryid ${o.queryid}\n    ${o.query}`).join('\n');
}

export async function run({ env = process.env, fetchImpl = fetch } = {}) {
  const url = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Object.assign(new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set'), { infra: true });
  const res = await fetchImpl(`${url}/rest/v1/rpc/${RPC}`, {
    method: 'POST',
    headers: supabaseHeaders(key),
    body: JSON.stringify({ p_min_mean_ms: MIN_MEAN_MS, p_min_calls: MIN_CALLS, p_window_hours: WINDOW_HOURS }),
  });
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 300);
    const err = new Error(`rpc/${RPC} → HTTP ${res.status} ${text}`);
    // 404 = the migration is not applied yet: the check cannot run, which is
    // an infrastructure state to report, not a slow query.
    err.infra = true;
    throw err;
  }
  const rows = await res.json();
  return { rows, offenders: offendersOf(rows), firstSnapshot: Array.isArray(rows) && rows.length === 0 };
}

if (process.argv[1] && /db-slow-queries\.mjs$/.test(process.argv[1])) {
  run().then(({ offenders }) => {
    const ok = offenders.length === 0;
    writeResult({ check: CHECK, ok, class: ok ? 'ok' : CLASSES.BUSINESS, detail: { offenders, thresholds: { minMeanMs: MIN_MEAN_MS, minCalls: MIN_CALLS, windowHours: WINDOW_HOURS } } });
    console.log(`${ok ? '✓' : '✗'} ${CHECK} — ${render(offenders)}`);
    process.exit(ok ? 0 : 1);
  }).catch((e) => {
    writeResult({ check: CHECK, ok: false, class: CLASSES.INFRA, detail: { error: String(e.message || e) } });
    console.error(`✗ ${CHECK} — ${e.message}`);
    process.exit(1);
  });
}
