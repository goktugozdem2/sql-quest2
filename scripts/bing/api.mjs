// The Bing Webmaster Tools API, without dependencies (2026-10-01).
//
// The JSON endpoint is one URL per method:
//   GET  https://ssl.bing.com/webmaster/api.svc/json/<Method>?siteUrl=…&apikey=…
//   POST https://ssl.bing.com/webmaster/api.svc/json/<Method>?apikey=…   {json body}
// and every answer is wrapped as {"d": …}. An error is HTTP 400 with
// {"ErrorCode": n, "Message": "…"}.
//
// The key is ONE per Microsoft account (Webmaster Tools → Settings → API
// access) and opens every site that account has verified — so it lives only
// in the BING_WMT_KEY environment variable / GitHub Secret. It travels in
// the query string, which is why nothing here ever puts a request URL in a
// log line or an error message.

export const BING_SITE = 'https://sqlquest.app/';
export const BING_API = 'https://ssl.bing.com/webmaster/api.svc/json';

// The docs' JSON samples wrap every string parameter except siteUrl in JSON
// quotes (url=%22example.com%22). The live API wants them PLAIN: measured
// 2026-10-01, the quoted form answers 400 SiteUriSchemeIsNotSupported.
// scripts/bing/verify.mjs still tries both, so a change would show.
export const QUOTE_STRING_PARAMS = false;

export function readKey(env = process.env) {
  const key = String(env.BING_WMT_KEY || '').trim();
  if (!key) throw new Error('BING_WMT_KEY is not set');
  if (!/^[A-Za-z0-9]{16,64}$/.test(key)) throw new Error('BING_WMT_KEY does not look like a Bing Webmaster API key');
  return key;
}

/**
 * WCF's JSON date, "/Date(1316156400000-0700)/", as { at, date }: the instant
 * (ISO) and the calendar day in the offset the API sent. The reference's
 * samples carry -0700; the live API (2026-10-01) sends midnight UTC with no
 * offset, "/Date(1790553600000)/". Both read to the right day here; reading
 * an offset date as a UTC day would move every bucket one day late. A
 * missing value, or WCF's "no date" (0001-01-01), is null.
 */
export function parseBingDate(value) {
  const m = /\/Date\((-?\d+)([+-]\d{4})?\)\//.exec(String(value ?? ''));
  if (!m) return null;
  const ms = Number(m[1]);
  if (!Number.isFinite(ms) || ms < Date.UTC(2000, 0, 1)) return null;
  const off = m[2] ? (m[2][0] === '-' ? -1 : 1) * (Number(m[2].slice(1, 3)) * 60 + Number(m[2].slice(3, 5))) : 0;
  return { at: new Date(ms).toISOString(), date: new Date(ms + off * 60000).toISOString().slice(0, 10) };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const scrub = (text, key) => String(text ?? '').split(key).join('[key]');

/**
 * One API call; returns the unwrapped `d`. `params` go in the query string
 * (GET), `body` makes it a POST. 429 and 5xx back off and retry; a 400 is
 * the API saying no (bad key, not verified, quota) and fails at once with
 * its own message. The key never appears in what this throws or logs.
 */
export async function bingCall(method, { params = {}, body = null, key, env = process.env, retries = 4, fetchImpl = fetch, log = () => {}, quote = QUOTE_STRING_PARAMS } = {}) {
  const apiKey = key || readKey(env);
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(body ? {} : params)) {
    qs.set(k, quote && k !== 'siteUrl' && typeof v === 'string' ? JSON.stringify(v) : String(v));
  }
  qs.set('apikey', apiKey);
  const url = `${BING_API}/${method}?${qs}`;
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetchImpl(url, {
        method: body ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (e) {
      if (attempt >= retries) throw new Error(`Bing ${method}: network error — ${scrub(e?.message, apiKey)}`);
      await sleep(Math.min(30000, 1000 * 2 ** attempt));
      continue;
    }
    const text = await res.text().catch(() => '');
    if (res.ok) {
      try { return JSON.parse(text || '{}').d ?? null; }
      catch { throw new Error(`Bing ${method}: the answer is not JSON (${scrub(text, apiKey).slice(0, 120)})`); }
    }
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const wait = Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 250);
      log(`Bing ${method}: HTTP ${res.status}, retry ${attempt + 1}/${retries} in ${wait} ms`);
      await sleep(wait);
      continue;
    }
    let message = scrub(text, apiKey).slice(0, 300);
    let code = null;
    try { const j = JSON.parse(text); if (j && j.Message) { message = scrub(j.Message, apiKey); code = j.ErrorCode ?? null; } } catch { /* not JSON */ }
    const err = new Error(`Bing ${method} → HTTP ${res.status}: ${message}`);
    err.status = res.status;
    err.code = code;
    throw err;
  }
}

/** Upsert rows into a table through PostgREST with the service role, in batches. */
export async function upsert(table, conflict, rows, { url, serviceKey, fetchImpl = fetch, batch = 1000, headers } = {}) {
  let written = 0;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    const res = await fetchImpl(`${String(url).replace(/\/$/, '')}/rest/v1/${table}?on_conflict=${conflict}`, {
      method: 'POST',
      headers: { ...headers(serviceKey), 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`${table} upsert failed at row ${i}: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
    written += chunk.length;
  }
  return written;
}

/** Every row of a PostgREST read, 1,000 at a time. */
export async function restAll(pathQuery, { url, serviceKey, fetchImpl = fetch, headers } = {}) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetchImpl(`${String(url).replace(/\/$/, '')}/rest/v1/${pathQuery}`, {
      headers: { ...headers(serviceKey), range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`GET ${pathQuery.split('?')[0]} → HTTP ${res.status}`);
    const page = await res.json();
    out.push(...page);
    if (page.length < 1000) return out;
  }
}
