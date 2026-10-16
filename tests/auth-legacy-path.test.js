// The old in-browser sign-in check (2026-10-16). Direct reads of `users` are
// refused since the access cut (supabase/manual/20260913b_users_direct_access_off.sql),
// so the legacy block can only fail. It ran for every REGISTRATION (the
// server sign-in is login-only) — 401s in the edge log, "permission denied
// for table users" in the postgres log on each sign-up — and on a login whose
// function call failed for any reason, telling a person with the right
// password that it was wrong. Now: login only, and only when account-login
// answers 404 (not deployed).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const app = fs.readFileSync(path.join(path.resolve(import.meta.dirname, '..'), 'src/app.jsx'), 'utf8');
const login = app.slice(app.indexOf('  const handleLogin = async () => {'), app.indexOf("    if (authMode === 'register') {\n      // For registration, use authUsername"));

describe('handleLogin — the legacy path', () => {
  it('runs for login only, never for a registration', () => {
    expect(login).toContain("if (authMode === 'login' && !serverSignedIn) {");
    expect(login).not.toMatch(/\n {4}if \(!serverSignedIn\) \{/);
  });

  it('every direct users? read in it sits behind that gate', () => {
    const gate = login.indexOf("if (authMode === 'login' && !serverSignedIn) {");
    for (const m of login.matchAll(/supabaseFetch\(`users\?|legacyTable: true/g)) expect(m.index, m[0]).toBeGreaterThan(gate);
  });

  it('a deployed function that did not answer is "temporarily unavailable", never "wrong password"', () => {
    const call = login.indexOf("callAccountFunction('account-login'");
    const notDeployed = login.indexOf('} else if (res.httpStatus !== 404) {');
    const gate = login.indexOf("if (authMode === 'login' && !serverSignedIn) {");
    expect(call).toBeGreaterThan(0);
    expect(notDeployed).toBeGreaterThan(call);
    expect(notDeployed).toBeLessThan(gate);
    expect(login.slice(notDeployed, gate)).toMatch(/setAuthError\('Sign-in is temporarily unavailable\. Please try again in a moment\.'\);\s*return;/);
  });
});
