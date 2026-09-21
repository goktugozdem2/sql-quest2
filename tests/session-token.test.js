// Session tokens — the pure half (2026-09-23). See src/utils/session-token.js
// and docs/plans/account-session-tokens-2026-09-22.md.
import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  SESSION_TOKEN_KEY, GUEST_SECRET_KEY, CURRENT_GUEST_KEY,
  isGuestUsername, newTokenHex,
  readSessionToken, writeSessionToken, clearSessionToken,
  readGuestSecret, clearGuestSecret, ensureGuestSecret,
  tokenForUsername, withToken, rpcBodyFallbacks,
} from '../src/utils/session-token.js';
import { GUEST_USER_KEY } from '../src/utils/progress-merge.js';

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    _m: m,
  };
}
const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };

describe('keys', () => {
  it('names the two stores and mirrors the guest identity key', () => {
    expect(SESSION_TOKEN_KEY).toBe('sqlquest_session_token');
    expect(GUEST_SECRET_KEY).toBe('sqlquest_guest_secret');
    expect(CURRENT_GUEST_KEY).toBe(GUEST_USER_KEY);
  });
  it('a guest is a guest_ name and nothing else', () => {
    expect(isGuestUsername('guest_1737000000000')).toBe(true);
    expect(isGuestUsername('alice')).toBe(false);
    expect(isGuestUsername('guestbook')).toBe(false);
    expect(isGuestUsername(null)).toBe(false);
  });
});

describe('newTokenHex', () => {
  it('is 32 random bytes as 64 hex chars, different each time', () => {
    const a = newTokenHex(webcrypto);
    const b = newTokenHex(webcrypto);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
  it('never falls back to a guessable source', () => {
    expect(newTokenHex(null)).toBeNull();
    expect(newTokenHex({})).toBeNull();
  });
});

describe('the session token is keyed by username', () => {
  it('is returned only for the account it was stored for', () => {
    const s = memStorage();
    writeSessionToken(s, 'alice', 'tok-a');
    expect(readSessionToken(s, 'alice')).toBe('tok-a');
    expect(readSessionToken(s, 'bob')).toBeNull();
    expect(tokenForUsername(s, 'bob', webcrypto)).toBeNull();
  });
  it('a new sign-in replaces it', () => {
    const s = memStorage();
    writeSessionToken(s, 'alice', 'tok-a');
    writeSessionToken(s, 'bob', 'tok-b');
    expect(readSessionToken(s, 'alice')).toBeNull();
    expect(readSessionToken(s, 'bob')).toBe('tok-b');
  });
  it('logout clears only its own account\'s token', () => {
    const s = memStorage();
    writeSessionToken(s, 'alice', 'tok-a');
    clearSessionToken(s, 'bob');
    expect(readSessionToken(s, 'alice')).toBe('tok-a');
    clearSessionToken(s, 'alice');
    expect(readSessionToken(s, 'alice')).toBeNull();
  });
  it('ignores garbage, a bare string, and storage that throws', () => {
    expect(readSessionToken(memStorage({ [SESSION_TOKEN_KEY]: 'not json' }), 'alice')).toBeNull();
    expect(readSessionToken(memStorage({ [SESSION_TOKEN_KEY]: '"tok"' }), 'alice')).toBeNull();
    expect(readSessionToken(memStorage({ [SESSION_TOKEN_KEY]: '{"username":"alice","token":""}' }), 'alice')).toBeNull();
    expect(readSessionToken(throwing, 'alice')).toBeNull();
    expect(writeSessionToken(throwing, 'alice', 'x')).toBe(false);
    expect(() => clearSessionToken(throwing, 'alice')).not.toThrow();
  });
});

describe('guest secrets', () => {
  it('ensureGuestSecret mints once and then returns the same secret', () => {
    const s = memStorage();
    const a = ensureGuestSecret(s, 'guest_1', webcrypto);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(ensureGuestSecret(s, 'guest_1', webcrypto)).toBe(a);
    expect(readGuestSecret(s, 'guest_1')).toBe(a);
  });
  it('never mints for a registered name', () => {
    expect(ensureGuestSecret(memStorage(), 'alice', webcrypto)).toBeNull();
  });
  it('a new guest identity replaces the old one\'s secret', () => {
    const s = memStorage();
    const a = ensureGuestSecret(s, 'guest_1', webcrypto);
    const b = ensureGuestSecret(s, 'guest_2', webcrypto);
    expect(b).not.toBe(a);
    expect(readGuestSecret(s, 'guest_1')).toBeNull();
  });
  it('clearGuestSecret leaves another guest\'s secret alone', () => {
    const s = memStorage();
    const b = ensureGuestSecret(s, 'guest_2', webcrypto);
    clearGuestSecret(s, 'guest_1');
    expect(readGuestSecret(s, 'guest_2')).toBe(b);
    clearGuestSecret(s, 'guest_2');
    expect(readGuestSecret(s, 'guest_2')).toBeNull();
  });
});

describe('tokenForUsername — which token goes with which row', () => {
  it('a guest sends its secret, never the account token', () => {
    const s = memStorage();
    writeSessionToken(s, 'alice', 'tok-a');
    const g = ensureGuestSecret(s, 'guest_1', webcrypto);
    expect(tokenForUsername(s, 'guest_1', webcrypto)).toBe(g);
    expect(tokenForUsername(s, 'alice', webcrypto)).toBe('tok-a');
  });
  it('a resumed guest with no secret gets one lazily — only when it is this browser\'s current guest', () => {
    const s = memStorage({ [GUEST_USER_KEY]: 'guest_1' });
    const t = tokenForUsername(s, 'guest_1', webcrypto);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenForUsername(s, 'guest_1', webcrypto)).toBe(t);
  });
  it('a late flush for an older guest does not replace the current guest\'s secret', () => {
    const s = memStorage({ [GUEST_USER_KEY]: 'guest_2' });
    const current = ensureGuestSecret(s, 'guest_2', webcrypto);
    expect(tokenForUsername(s, 'guest_1', webcrypto)).toBeNull();
    expect(readGuestSecret(s, 'guest_2')).toBe(current);
  });
  it('no username, no token', () => {
    expect(tokenForUsername(memStorage(), '', webcrypto)).toBeNull();
    expect(tokenForUsername(memStorage(), null, webcrypto)).toBeNull();
  });
});

describe('rpc bodies', () => {
  it('withToken adds p_token only when there is one — an old client body is unchanged', () => {
    const body = { p_username: 'alice', p_data: {} };
    expect(withToken(body, null)).toBe(body);
    expect(withToken(body, '')).toBe(body);
    expect(withToken(body, 't')).toEqual({ ...body, p_token: 't' });
    expect(body).not.toHaveProperty('p_token');
  });
  it('fallbacks drop p_token first, then p_carry_pro_from', () => {
    const full = { p_username: 'bob', p_data: {}, p_carry_pro_from: 'guest_1', p_token: 't' };
    expect(rpcBodyFallbacks(full)).toEqual([
      full,
      { p_username: 'bob', p_data: {}, p_carry_pro_from: 'guest_1' },
      { p_username: 'bob', p_data: {} },
    ]);
  });
  it('a body with nothing to drop is tried once', () => {
    const b = { p_username: 'alice' };
    expect(rpcBodyFallbacks(b)).toEqual([b]);
    expect(rpcBodyFallbacks({ p_username: 'a', p_token: 't' })).toEqual([{ p_username: 'a', p_token: 't' }, { p_username: 'a' }]);
    expect(rpcBodyFallbacks({ p_username: 'a', p_carry_pro_from: 'g' })).toEqual([{ p_username: 'a', p_carry_pro_from: 'g' }, { p_username: 'a' }]);
  });
});
