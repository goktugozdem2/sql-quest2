// account-password, executed (2026-11-22, BACKLOG item 13). The function
// writes a new salt + hash that EVERY other login path must accept: the
// browser's hashPassword (src/app.jsx) and account-login. If the server's
// format drifted (salt+pw+salt, base64, another digest), the password change
// would succeed and the next sign-in would fail — a locked-out customer.
// Both halves are lifted out of their real files and run on the same input.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto, createHash } from 'node:crypto';

const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const fnSrc = read('supabase/functions/account-password/index.ts');
const appSrc = read('src/app.jsx');
const loginSrc = read('supabase/functions/account-login/index.ts');

const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a)));
// The few annotations these helpers carry; a new one fails the first test by name.
const stripTypes = code => code
  .replace(/\)\s*:\s*Promise<[^>]+>\s*\{/g, ') {')
  .replace(/\)\s*:\s*[A-Za-z0-9_[\]]+\s*\{/g, ') {')
  .replace(/\b([a-zA-Z_]\w*)\s*:\s*(string|number|boolean)\b(?=\s*[,)=])/g, '$1');

function run(code, exportNames, extra = {}) {
  const ctx = { crypto: webcrypto, TextEncoder, Uint8Array, Array, String, ...extra };
  vm.createContext(ctx);
  vm.runInContext(code + '\n' + exportNames.map(n => `this.${n} = ${n};`).join('\n'), ctx);
  return ctx;
}

const server = run(stripTypes(between(fnSrc, 'async function sha256Hex', 'Deno.serve(')),
  ['sha256Hex', 'timingSafeEqual', 'newSalt', 'newSessionToken']);
const client = run(between(appSrc, 'const simpleHash = (str) =>', 'const verifyPassword ='),
  ['hashPassword'], { window: { crypto: webcrypto }, console });

describe('account-password — the hash it writes is the one every login reads', () => {
  it('the helpers lifted from the function evaluate (if not: new TS syntax, extend stripTypes)', () => {
    expect(typeof server.sha256Hex).toBe('function');
    expect(typeof client.hashPassword).toBe('function');
  });

  it("server sha256Hex(salt + password) === the browser's hashPassword(password, salt)", async () => {
    for (const [pw, salt] of [['hunter22', 'a1b2c3'], ['pässwörd ✓', server.newSalt()], ['x'.repeat(256), '']]) {
      const s = await server.sha256Hex(salt + pw);
      expect(s).toBe(await client.hashPassword(pw, salt));
      expect(s).toBe(createHash('sha256').update(salt + pw, 'utf8').digest('hex'));
    }
  });

  it('account-login checks the same construction (salt first, then the password)', () => {
    expect(loginSrc).toMatch(/sha256Hex\(\(?storedSalt[^)]*\)?\s*\+\s*password\)/);
    expect(fnSrc).toMatch(/const hash = await sha256Hex\(salt \+ next\)/);
  });

  it('salts and session tokens are fresh hex of the stated length', () => {
    const a = server.newSalt(), b = server.newSalt();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
    expect(server.newSessionToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('compares the stored hash in constant time', () => {
    expect(server.timingSafeEqual('abc', 'abc')).toBe(true);
    expect(server.timingSafeEqual('abc', 'abd')).toBe(false);
    expect(server.timingSafeEqual('abc', 'ab')).toBe(false);
    expect(fnSrc).toMatch(/!timingSafeEqual\(computed, storedHash\)/);
  });
});

describe('account-password — the request gate', () => {
  it('rejects short or oversized new passwords and a missing current one before any read', () => {
    expect(fnSrc).toMatch(/if \(!username \|\| !current \|\| next\.length < 6 \|\| next\.length > 256\) \{\s*return json\(\{ ok: false, error: 'invalid_request' \}, 400\)/);
    expect(fnSrc.indexOf("error: 'invalid_request'")).toBeLessThan(fnSrc.indexOf('createClient('));
  });

  it('locks after 5 failures in 15 minutes, shared with account-login, and ends every other session', () => {
    expect(fnSrc).toMatch(/const MAX_FAILURES = 5/);
    expect(fnSrc).toMatch(/const WINDOW_MS = 15 \* 60 \* 1000/);
    expect(fnSrc).toMatch(/from\('account_login_attempts'\)/);
    expect(fnSrc).toMatch(/from\('account_sessions'\)\.delete\(\)\.eq\('username', row\.username\)/);
  });
});
