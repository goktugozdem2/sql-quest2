// Google service-account auth for the Search Console pipeline, with no
// dependency: a JWT signed RS256 with node:crypto, exchanged for an access
// token at the key's token_uri.
//
// The key is read from the environment ONLY — GSC_SA_KEY holds the whole
// service-account JSON (a GitHub Secret in CI). It is never written to disk,
// never logged, never put in an error message.

import { createSign } from 'node:crypto';

export const GSC_PROPERTY = 'sc-domain:sqlquest.app';   // a domain property: never https://sqlquest.app
export const SCOPE_READONLY = 'https://www.googleapis.com/auth/webmasters.readonly';

export function readServiceAccount(env = process.env) {
  const raw = env.GSC_SA_KEY;
  if (!raw) throw new Error('GSC_SA_KEY is not set (the service-account JSON, whole)');
  let key;
  try { key = JSON.parse(raw); } catch { throw new Error('GSC_SA_KEY is not valid JSON'); }
  if (key.type !== 'service_account' || !key.client_email || !key.private_key) {
    throw new Error('GSC_SA_KEY is not a service-account key');
  }
  return key;
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export async function getAccessToken({ scope = SCOPE_READONLY, env = process.env, fetchImpl = fetch } = {}) {
  const key = readServiceAccount(env);
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = key.token_uri || 'https://oauth2.googleapis.com/token';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: key.client_email, scope, aud: tokenUri, iat: now, exp: now + 3600 }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(key.private_key))}`;
  const res = await fetchImpl(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`token exchange failed: HTTP ${res.status} ${body.error || ''} ${body.error_description || ''}`.trim());
  }
  return { token: body.access_token, clientEmail: key.client_email };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * A Google API call with retry: 429 and 5xx back off exponentially
 * (1 s, 2 s, 4 s, … up to `retries`), everything else fails at once.
 */
export async function googleFetch(url, { token, method = 'GET', body = null, retries = 6, fetchImpl = fetch, log = () => {} } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(url, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.ok) return res.json();
    const retryable = res.status === 429 || res.status >= 500;
    const text = await res.text().catch(() => '');
    if (!retryable || attempt >= retries) {
      const err = new Error(`${method} ${url.split('?')[0]} → HTTP ${res.status}: ${text.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    const wait = Math.min(60000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 250);
    log(`HTTP ${res.status}, retry ${attempt + 1}/${retries} in ${wait} ms`);
    await sleep(wait);
  }
}
