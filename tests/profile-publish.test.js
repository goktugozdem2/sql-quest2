/**
 * Unit tests for profile-publish.js pure helpers. The network calls
 * (publishProfile, fetchPublicProfile) are integration-level and need
 * a live Supabase or mocks — covered by the smoke test / manual QA.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { deriveOwnershipHash, ogImageUrl } from '../src/utils/profile-publish.js';

// Minimal localStorage shim for tests (node env has none by default).
const memStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (memStore.has(k) ? memStore.get(k) : null),
  setItem: (k, v) => memStore.set(k, String(v)),
  removeItem: (k) => memStore.delete(k),
  clear: () => memStore.clear(),
};

describe('deriveOwnershipHash', () => {
  beforeEach(() => memStore.clear());

  it('returns a stable hash when passwordHash is provided', () => {
    const a = deriveOwnershipHash('alice', 'pwhash123');
    const b = deriveOwnershipHash('alice', 'pwhash123');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]+$/);
  });

  it('different users with same password produce different hashes', () => {
    const a = deriveOwnershipHash('alice', 'sharedpw');
    const b = deriveOwnershipHash('bob', 'sharedpw');
    expect(a).not.toBe(b);
  });

  it('different passwords for same user produce different hashes', () => {
    const a = deriveOwnershipHash('alice', 'pw1');
    const b = deriveOwnershipHash('alice', 'pw2');
    expect(a).not.toBe(b);
  });

  it('is case-insensitive on username', () => {
    const a = deriveOwnershipHash('Alice', 'pw');
    const b = deriveOwnershipHash('ALICE', 'pw');
    const c = deriveOwnershipHash('alice', 'pw');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('falls back to a device-stored token when no passwordHash', () => {
    const a = deriveOwnershipHash('elena');
    const b = deriveOwnershipHash('elena');
    expect(a).toBe(b); // second call returns the stored token
    expect(memStore.get('sqlquest_profile_token_elena')).toBe(a);
  });

  it('returns null for empty username', () => {
    expect(deriveOwnershipHash('')).toBeNull();
    expect(deriveOwnershipHash(null)).toBeNull();
    expect(deriveOwnershipHash(undefined)).toBeNull();
  });

  it('does NOT send the raw passwordHash as the token', () => {
    const pw = 'this-should-not-appear';
    const hash = deriveOwnershipHash('alice', pw);
    expect(hash).not.toContain(pw);
    expect(hash).not.toContain('this-should');
  });
});

describe('ogImageUrl', () => {
  // Behaviour changed deliberately (Jul 2026): this used to return the
  // Supabase og-profile endpoint, which serves image/svg+xml. Every major
  // card renderer silently rejects SVG, so no shared profile ever unfurled an
  // image. It now points at the same-origin PNG route, /api/og-card, which is
  // also what api/u.js writes into the server-rendered tags.
  beforeEach(() => {
    globalThis.window = globalThis.window || {};
    globalThis.window.location = { origin: 'https://sqlquest.app' };
  });

  it('points at the PNG route, never the SVG function', () => {
    const url = ogImageUrl('alice');
    expect(url).toBe('https://sqlquest.app/api/og-card/?handle=alice');
    expect(url).not.toContain('og-profile');
    expect(url).not.toContain('.svg');
  });

  it('is absolute — a relative og:image is not reliably resolved', () => {
    expect(ogImageUrl('alice')).toMatch(/^https?:\/\//);
  });

  it('no longer depends on Supabase being configured', () => {
    delete globalThis.window.SUPABASE_URL;
    expect(ogImageUrl('alice')).toBe('https://sqlquest.app/api/og-card/?handle=alice');
  });

  it('falls back to the production origin outside a browser', () => {
    const saved = globalThis.window;
    globalThis.window = undefined;
    expect(ogImageUrl('alice')).toBe('https://sqlquest.app/api/og-card/?handle=alice');
    globalThis.window = saved;
  });

  it('URI-encodes the handle', () => {
    expect(ogImageUrl('user name')).toContain('?handle=user%20name');
  });

  it('returns null for empty handle', () => {
    expect(ogImageUrl('')).toBeNull();
    expect(ogImageUrl(null)).toBeNull();
  });

  it('agrees with the URL api/u.js emits server-side', async () => {
    const { _internals } = await import('../api/u.js');
    const block = _internals.metaBlock({ display_name: 'alice', skills: {}, total_solves: 3, streak: 1 }, 'alice');
    const serverImg = block.match(/property="og:image" content="([^"]+)"/)[1];
    expect(serverImg).toBe(ogImageUrl('alice'));
  });
});
