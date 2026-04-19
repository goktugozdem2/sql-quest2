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
  beforeEach(() => {
    // Reset window.SUPABASE_URL between tests
    globalThis.window = globalThis.window || {};
    delete globalThis.window.SUPABASE_URL;
  });

  it('returns null when Supabase is not configured', () => {
    expect(ogImageUrl('alice')).toBeNull();
  });

  it('builds the correct endpoint URL when configured', () => {
    globalThis.window.SUPABASE_URL = 'https://project.supabase.co';
    const url = ogImageUrl('alice');
    expect(url).toBe('https://project.supabase.co/functions/v1/og-profile?handle=alice');
  });

  it('trims trailing slash from Supabase URL', () => {
    globalThis.window.SUPABASE_URL = 'https://project.supabase.co/';
    const url = ogImageUrl('alice');
    expect(url).toBe('https://project.supabase.co/functions/v1/og-profile?handle=alice');
  });

  it('URI-encodes the handle', () => {
    globalThis.window.SUPABASE_URL = 'https://project.supabase.co';
    const url = ogImageUrl('user name');
    expect(url).toContain('?handle=user%20name');
  });

  it('returns null for empty handle', () => {
    globalThis.window.SUPABASE_URL = 'https://project.supabase.co';
    expect(ogImageUrl('')).toBeNull();
    expect(ogImageUrl(null)).toBeNull();
  });
});
