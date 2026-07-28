// The contract that matters: this runs inside writeProEvent, on every single
// event. If it can throw, it can break the app on page load. If it isn't
// stable, it's worse than the 'guest' string it replaces — it would look like
// a join key while silently splitting one person into many.
import { describe, it, expect } from 'vitest';
import { getAnonId, ANON_ID_KEY } from '../src/utils/anon-id.js';

const memStore = (initial = {}) => {
  const m = { ...initial };
  return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    _dump: () => m,
  };
};

const throwingStore = () => ({
  getItem() { throw new Error('SecurityError: storage blocked'); },
  setItem() { throw new Error('SecurityError: storage blocked'); },
});

// Deterministic stand-in so tests assert on shape, not on randomness.
const fakeCrypto = {
  getRandomValues: buf => { for (let i = 0; i < buf.length; i++) buf[i] = i; return buf; },
};

describe('getAnonId', () => {
  it('is stable across calls — the whole point of a join key', () => {
    const s = memStore();
    const a = getAnonId(s, fakeCrypto);
    const b = getAnonId(s, fakeCrypto);
    const c = getAnonId(s, fakeCrypto);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('persists under the documented key so the id survives a reload', () => {
    const s = memStore();
    const id = getAnonId(s, fakeCrypto);
    expect(s._dump()[ANON_ID_KEY]).toBe(id);
    // A "fresh page load" reading the same storage gets the same id.
    expect(getAnonId(memStore(s._dump()), fakeCrypto)).toBe(id);
  });

  it('returns 32 lowercase hex chars', () => {
    expect(getAnonId(memStore(), fakeCrypto)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('reuses an existing valid id rather than reminting', () => {
    const stored = 'a'.repeat(32);
    expect(getAnonId(memStore({ [ANON_ID_KEY]: stored }), fakeCrypto)).toBe(stored);
  });

  it('replaces a corrupt stored value instead of propagating it', () => {
    for (const junk of ['', 'guest', 'NOT-HEX-AT-ALL', 'abc', 'A'.repeat(32), 'f'.repeat(31)]) {
      const id = getAnonId(memStore({ [ANON_ID_KEY]: junk }), fakeCrypto);
      expect(id, junk).toMatch(/^[0-9a-f]{32}$/);
      expect(id, junk).not.toBe(junk);
    }
  });

  it('never throws when storage is blocked (private mode, sandboxed iframe)', () => {
    expect(() => getAnonId(throwingStore(), fakeCrypto)).not.toThrow();
    expect(getAnonId(throwingStore(), fakeCrypto)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('never throws when there is no storage at all', () => {
    expect(() => getAnonId(null, fakeCrypto)).not.toThrow();
    expect(getAnonId(null, fakeCrypto)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('falls back through randomUUID → getRandomValues → Math.random', () => {
    const uuid = { randomUUID: () => '01234567-89ab-cdef-0123-456789abcdef' };
    expect(getAnonId(memStore(), uuid)).toBe('0123456789abcdef0123456789abcdef');
    expect(getAnonId(memStore(), fakeCrypto)).toMatch(/^[0-9a-f]{32}$/);
    expect(getAnonId(memStore(), null)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('survives a crypto implementation that throws', () => {
    const hostile = {
      randomUUID() { throw new Error('nope'); },
      getRandomValues() { throw new Error('nope'); },
    };
    expect(() => getAnonId(memStore(), hostile)).not.toThrow();
    expect(getAnonId(memStore(), hostile)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('gives different browsers different ids', () => {
    const real = typeof crypto !== 'undefined' ? crypto : null;
    const ids = new Set(Array.from({ length: 200 }, () => getAnonId(memStore(), real)));
    expect(ids.size).toBe(200);
  });
});
