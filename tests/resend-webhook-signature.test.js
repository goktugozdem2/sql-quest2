// resend-webhook's Svix signature check, RUN — not grepped (2026-11-22,
// BACKLOG item 13). The function is Deno TypeScript; the verification block
// (between `const enc` and `Deno.serve(`) uses only Web Crypto, atob/btoa and
// TextEncoder, which Node has. The test lifts that block out of the real
// file, drops its few type annotations, evaluates it, and signs requests the
// way Svix does. If new TypeScript syntax lands in the block, the first test
// fails by name — extend `stripTypes`, do not skip it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHmac, webcrypto, randomBytes } from 'node:crypto';

const src = fs.readFileSync(new URL('../supabase/functions/resend-webhook/index.ts', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('const enc = new TextEncoder()'), src.indexOf('Deno.serve('));

const stripTypes = code => code
  .replace(/\)\s*:\s*Promise<[^>]+>\s*\{/g, ') {')
  .replace(/\)\s*:\s*[A-Za-z0-9_[\]]+\s*\{/g, ') {')
  .replace(/\b([a-zA-Z_]\w*)\s*:\s*(string|number|boolean|ArrayBuffer|Uint8Array)\b(?=\s*[,)=])/g, '$1')
  .replace(/\s+as\s+ArrayBuffer\b/g, '');

function load() {
  const ctx = { crypto: webcrypto, atob, btoa, TextEncoder, Uint8Array, String, Math };
  vm.createContext(ctx);
  vm.runInContext(stripTypes(block) + '\nthis.verifySvix = verifySvix; this.timingSafeEqual = timingSafeEqual;', ctx);
  return ctx;
}

const secretBytes = randomBytes(24);
const SECRET = 'whsec_' + secretBytes.toString('base64');
const sign = (id, ts, body, key = secretBytes) => 'v1,' + createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');

describe('resend-webhook — verifySvix, executed', () => {
  const { verifySvix, timingSafeEqual } = load();
  const id = 'msg_2Lx', ts = '1795300000', body = '{"type":"email.delivered","data":{"email_id":"re_1"}}';

  it('the block lifted from the function evaluates (if not: new TS syntax, extend stripTypes)', () => {
    expect(typeof verifySvix).toBe('function');
    expect(typeof timingSafeEqual).toBe('function');
  });

  it('accepts a request signed with the secret', async () => {
    expect(await verifySvix(SECRET, id, ts, body, sign(id, ts, body))).toBe(true);
  });

  it('accepts when any one of several signatures matches (Svix key rotation)', async () => {
    const header = `${sign(id, ts, body, randomBytes(24))} ${sign(id, ts, body)}`;
    expect(await verifySvix(SECRET, id, ts, body, header)).toBe(true);
  });

  it('refuses a tampered body, another message id, another timestamp, another secret', async () => {
    const good = sign(id, ts, body);
    expect(await verifySvix(SECRET, id, ts, body.replace('delivered', 'clicked'), good)).toBe(false);
    expect(await verifySvix(SECRET, 'msg_other', ts, body, good)).toBe(false);
    expect(await verifySvix(SECRET, id, '1795300001', body, good)).toBe(false);
    expect(await verifySvix('whsec_' + randomBytes(24).toString('base64'), id, ts, body, good)).toBe(false);
  });

  it('refuses an empty or malformed header and never throws', async () => {
    for (const h of ['', 'v1', 'v1,', 'garbage', 'v1,!!!notbase64']) {
      expect(await verifySvix(SECRET, id, ts, body, h), JSON.stringify(h)).toBe(false);
    }
    expect(await verifySvix('whsec_%%%', id, ts, body, sign(id, ts, body))).toBe(false);
  });

  it('compares in constant time (no plain === on the signature)', () => {
    expect(block).not.toMatch(/sig\s*===\s*expected/);
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('resend-webhook — the request gate', () => {
  const serve = src.slice(src.indexOf('Deno.serve('));
  it('fails closed without the secret, and rejects a stale timestamp before verifying', () => {
    expect(serve).toMatch(/if \(!secret\) return new Response\('webhook secret not configured', \{ status: 401 \}\)/);
    const stale = serve.indexOf("'stale timestamp'");
    expect(stale).toBeGreaterThan(0);
    expect(serve.slice(stale - 200, stale)).toMatch(/Math\.abs\(Date\.now\(\) \/ 1000 - tsNum\) > 300/);
    expect(serve.indexOf('verifySvix(')).toBeGreaterThan(stale);
  });
});
