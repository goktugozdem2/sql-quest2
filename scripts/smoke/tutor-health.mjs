#!/usr/bin/env node
// Smoke check 5 — the tutor answers (founder, 2026-09-30).
//
//   [SUPABASE_URL=…] node scripts/smoke/tutor-health.mjs
//
// On 2026-09-27 supabase/functions/ai-tutor returned 502 for three days (the
// Anthropic org spend limit was hit) and nobody noticed: every other smoke
// check stubs the backend (HERMETIC_PREAMBLE), so none of them can see it.
// This is the ONE check that makes a real call: a single `live_nudge` to the
// production tutor as the internal account `sqlquest` — capped server-side at
// 120 output tokens, about $0.002 a call, one call a run.
//
// Pass  = HTTP 200 and a `text` of at least MIN_TEXT characters.
// Note  = HTTP 429: the internal account's daily limit is used up. The
//         function answered and the limiter works; that is not an outage.
// Fail  = anything else, class `business` — NEVER `frontend_dead`, so a tutor
//         outage can never roll the front end back. A check that could not
//         run at all (no URL, no key) is `infra`.
//
// The anon key is public — it ships in every browser — so it is read from
// the built bundle that defines `window.SUPABASE_ANON_KEY` (public/data.js,
// from src/data/config.js; public/app.html loads it), not from a secret.
import fs from 'node:fs';
import path from 'node:path';
import { writeResult, CLASSES } from './lib.mjs';

export const CHECK = 'tutor-health';
export const MIN_TEXT = 20;
export const ORIGIN = 'https://sqlquest.app';
export const TIMEOUT_MS = 45_000;
// Where the page defines the key, in the order tried.
export const KEY_SOURCES = ['public/data.js', 'src/data/config.js', 'public/app.html'];
export const REQUEST_BODY = Object.freeze({
  username: 'sqlquest',
  mode: 'live_nudge',
  phase: 'live_nudge',
  messages: [{ role: 'user', content: 'Query: SELECT dept, AVG(salary) FROM emp; Diagnosis: one row, expected 5.' }],
});

const grab = (text, name) => {
  const m = String(text || '').match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`));
  return m ? m[1] : null;
};
export const anonKeyFrom = (text) => {
  const k = grab(text, 'SUPABASE_ANON_KEY');
  return k && /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(k) ? k : null;
};
export const supabaseUrlFrom = (text) => {
  const u = grab(text, 'SUPABASE_URL');
  return u && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(u) ? u : null;
};

// The anon key's payload says role=anon. Refuse anything else: this script
// must never find a service-role key in a file and send it anywhere.
export function roleOf(jwt) {
  try { return JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64url').toString('utf8')).role || null; } catch (_) { return null; }
}

export function readPublicConfig({ root = process.cwd(), readFile = (p) => fs.readFileSync(p, 'utf8') } = {}) {
  for (const rel of KEY_SOURCES) {
    let text;
    try { text = readFile(path.join(root, rel)); } catch (_) { continue; }
    const key = anonKeyFrom(text);
    if (key) return { key, url: supabaseUrlFrom(text), source: rel };
  }
  return { key: null, url: null, source: null };
}

// { ok, note?, why? } from the HTTP status and the parsed body.
export function judge({ status, body }) {
  if (status === 429) return { ok: true, note: `HTTP 429 — the internal account's daily limit is used up (${body?.used ?? '?'}/${body?.limit ?? '?'}); the function answered, the model was not reached` };
  if (status !== 200) return { ok: false, why: `HTTP ${status}${body?.error ? ` — ${body.error}` : ''}${body?.status ? ` (upstream ${body.status})` : ''}` };
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (text.length < MIN_TEXT) return { ok: false, why: `HTTP 200 but text is ${text.length} characters (need ${MIN_TEXT})` };
  return { ok: true };
}

export async function run({ env = process.env, fetchImpl = fetch, root = process.cwd(), readFile } = {}) {
  const cfg = readPublicConfig({ root, readFile });
  const url = String(env.SUPABASE_URL || cfg.url || '').replace(/\/$/, '');
  if (!cfg.key) throw Object.assign(new Error(`no SUPABASE_ANON_KEY found in ${KEY_SOURCES.join(', ')}`), { infra: true });
  if (roleOf(cfg.key) !== 'anon') throw Object.assign(new Error(`the key in ${cfg.source} is not an anon key — refusing to send it`), { infra: true });
  if (!url) throw Object.assign(new Error('SUPABASE_URL not set and not found beside the key'), { infra: true });
  const started = Date.now();
  let res;
  try {
    res = await fetchImpl(`${url}/functions/v1/ai-tutor`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: cfg.key, authorization: `Bearer ${cfg.key}`, origin: ORIGIN },
      body: JSON.stringify(REQUEST_BODY),
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
    });
  } catch (e) {
    // The tutor not answering at all IS the outage this check exists for.
    return { ok: false, why: `no answer: ${String(e.message || e)}`, status: 0, ms: Date.now() - started, keySource: cfg.source };
  }
  const raw = await res.text().catch(() => '');
  let body = null;
  try { body = JSON.parse(raw); } catch (_) { /* judged as a non-JSON answer below */ }
  const v = judge({ status: res.status, body });
  return {
    ...v,
    status: res.status,
    ms: Date.now() - started,
    keySource: cfg.source,
    textLength: typeof body?.text === 'string' ? body.text.trim().length : 0,
    sample: typeof body?.text === 'string' ? body.text.trim().slice(0, 160) : raw.slice(0, 160),
    usage: body?.usage || null,
  };
}

if (process.argv[1] && /tutor-health\.mjs$/.test(process.argv[1])) {
  run().then((r) => {
    writeResult({ check: CHECK, ok: r.ok, class: r.ok ? 'ok' : CLASSES.BUSINESS, detail: r });
    console.log(`${r.ok ? '✓' : '✗'} ${CHECK} — HTTP ${r.status} in ${r.ms} ms${r.note ? ` — ${r.note}` : ''}${r.why ? ` — ${r.why}` : ''}${r.ok && !r.note ? ` — ${r.textLength} chars: ${JSON.stringify(r.sample)}` : ''}`);
    process.exit(r.ok ? 0 : 1);
  }).catch((e) => {
    writeResult({ check: CHECK, ok: false, class: CLASSES.INFRA, detail: { error: String(e.message || e) } });
    console.error(`✗ ${CHECK} — ${e.message}`);
    process.exit(1);
  });
}
