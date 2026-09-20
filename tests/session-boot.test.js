import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { savedAccountName, sessionLoadingAtBoot, shouldWaitForSession } from '../src/utils/session-boot.js';

// Founder QA 2026-09-20, items 1–2: a deep link opened while signed in must
// never mint a guest. The gap between mount and the restored session was
// being read as "cold visitor".
const store = (v) => ({ getItem: (k) => (k === 'sqlquest_user' ? v : null) });
const blind = { getItem: () => { throw new Error('private mode'); } };

describe('session boot', () => {
  it('reads a saved account, ignores a guest name', () => {
    expect(savedAccountName(store('test2'))).toBe('test2');
    expect(savedAccountName(store('guest_1790'))).toBe(null);
    expect(savedAccountName(store(null))).toBe(null);
    expect(savedAccountName(blind)).toBe(null);
    expect(savedAccountName(null)).toBe(null);
  });
  it('holds the session flag at boot only when an account is saved', () => {
    expect(sessionLoadingAtBoot(store('test2'))).toBe(true);
    expect(sessionLoadingAtBoot(store('guest_1'))).toBe(false);
    expect(sessionLoadingAtBoot(store(null))).toBe(false);
  });
  it('a resolver waits for a saved account, not for a cold visitor', () => {
    const s = store('test2');
    expect(shouldWaitForSession({ isSessionLoading: true, currentUser: null, storage: s })).toBe(true);
    expect(shouldWaitForSession({ isSessionLoading: false, currentUser: null, storage: s })).toBe(true);
    expect(shouldWaitForSession({ isSessionLoading: false, currentUser: 'test2', storage: s })).toBe(false);
    expect(shouldWaitForSession({ isSessionLoading: false, currentUser: null, storage: store(null) })).toBe(false);
    expect(shouldWaitForSession({ isSessionLoading: false, currentUser: 'guest_1', storage: store(null) })).toBe(false);
  });
});

describe('every deep-link resolver uses the one rule', () => {
  const app = fs.readFileSync(new URL('../src/app.jsx', import.meta.url), 'utf8');
  it('the flag starts held when an account is saved', () => {
    expect(app).toMatch(/useState\(\(\) => sessionLoadingAtBoot\(/);
  });
  it('the restore path releases the hold when nothing will restore', () => {
    const block = app.slice(app.indexOf('// User was deleted from Supabase'), app.indexOf('// User was deleted from Supabase') + 400);
    expect(block).toContain('setIsSessionLoading(false)');
  });
  it('no resolver mints a guest without the wait', () => {
    // Three resolvers: ?challenge=, ?company=/?sector=, ?interview=.
    expect((app.match(/shouldWaitForSession\(\{ isSessionLoading, currentUser/g) || []).length).toBe(3);
    expect(app).not.toMatch(/if \(!pendingListDeepLinkRef\.current\) return;\s*\n\s*if \(isSessionLoading\) return;/);
  });
});
