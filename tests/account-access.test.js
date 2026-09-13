// Account access (2026-09-13): reads through users_public, writes through
// sq_save_user, sign-in and password change in edge functions, with the old
// table path kept only as a fallback for a server side that is not deployed.
// The SQL itself is exercised by supabase/manual/account-access-replica-test.sql
// against a local Postgres; these guards bind the client to it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ACCOUNT_PRIVATE_KEYS, withLocalAccountKeys, isMissingServerSide, accountFunctionStatus } from '../src/utils/account-access.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(ROOT, 'src/app.jsx'), 'utf8');
const migration = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260913130000_account_access_functions.sql'), 'utf8');
const login = fs.readFileSync(path.join(ROOT, 'supabase/functions/account-login/index.ts'), 'utf8');
const password = fs.readFileSync(path.join(ROOT, 'supabase/functions/account-password/index.ts'), 'utf8');

describe('pure half', () => {
  it('puts the owner\'s own keys back onto a sanitized cloud read, never over a value the cloud sent', () => {
    const local = JSON.stringify({ passwordHash: 'h', salt: 's', email: 'e@x.io', unsubToken: 't', xp: 1 });
    expect(withLocalAccountKeys({ xp: 9 }, local)).toEqual({ xp: 9, passwordHash: 'h', salt: 's', email: 'e@x.io', unsubToken: 't' });
    expect(withLocalAccountKeys({ xp: 9, email: 'cloud@x.io' }, local).email).toBe('cloud@x.io');
    expect(withLocalAccountKeys({ xp: 9 }, null)).toEqual({ xp: 9 });
    expect(withLocalAccountKeys({ xp: 9 }, '{broken')).toEqual({ xp: 9 });
  });

  it('falls back to the table only on a 404', () => {
    expect(isMissingServerSide(new Error('Supabase 404: {"code":"PGRST202"}'))).toBe(true);
    expect(isMissingServerSide(new Error('Supabase 401: denied'))).toBe(false);
    expect(isMissingServerSide(new Error('Failed to fetch'))).toBe(false);
  });

  it('maps edge function responses', () => {
    expect(accountFunctionStatus(200, { ok: true })).toBe('ok');
    expect(accountFunctionStatus(401, { ok: false })).toBe('invalid');
    expect(accountFunctionStatus(429, { ok: false, error: 'locked' })).toBe('locked');
    expect(accountFunctionStatus(404, null)).toBe('unavailable');
    expect(accountFunctionStatus(500, { ok: false })).toBe('unavailable');
  });
});

describe('the SQL and the client agree', () => {
  it('users_public removes exactly ACCOUNT_PRIVATE_KEYS', () => {
    const view = migration.slice(migration.indexOf('create or replace view public.users_public'), migration.indexOf('from public.users u;'));
    const removed = [...view.matchAll(/- '(\w+)'/g)].map(m => m[1]).sort();
    expect(removed).toEqual([...ACCOUNT_PRIVATE_KEYS].sort());
  });

  it('sq_save_user keeps the row\'s server-set keys', () => {
    const fn = migration.slice(migration.indexOf('create or replace function public.sq_save_user'), migration.indexOf('grant execute on function public.sq_save_user'));
    for (const k of ACCOUNT_PRIVATE_KEYS.filter(k => !['passwordHash', 'salt', 'email'].includes(k))) expect(fn).toContain(`'${k}'`);
    expect(fn).toMatch(/security definer/);
  });

  it('the session-only functions are not executable by anon', () => {
    expect(migration).toMatch(/grant execute on function public\.sq_set_password_for_session_email\(text, text\) to authenticated;/);
    expect(migration).toMatch(/grant execute on function public\.sq_mark_email_verified\(\) to authenticated;/);
    expect(migration).not.toMatch(/sq_set_password_for_session_email\(text, text\) to anon/);
  });

  it('both edge functions hash the way the client does: hex SHA-256 of salt then password', () => {
    expect(app).toMatch(/encoder\.encode\(salt \+ password\)/);
    expect(login).toMatch(/sha256Hex\(\(storedSalt \|\| 'no-account-salt'\) \+ password\)/);
    expect(password).toMatch(/sha256Hex\(salt \+ next\)/);
    for (const src of [login, password]) {
      expect(src).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
      expect(src).toMatch(/timingSafeEqual/);
    }
  });

  it('account-login returns one generic error, never which half was wrong', () => {
    const errors = [...login.matchAll(/error: '([a-z_]+)'/g)].map(m => m[1]);
    expect(new Set(errors)).toEqual(new Set(['method_not_allowed', 'invalid_json', 'invalid_credentials', 'locked']));
  });
});

describe('client call sites', () => {
  it('saves go through sq_save_user; the table upsert is the 404 fallback only', () => {
    const at = app.indexOf('const _flushCloudSave');
    const block = app.slice(at, at + 3000);
    expect(block).toMatch(/rpc\/sq_save_user/);
    const fallback = block.indexOf("users?on_conflict=username");
    expect(fallback).toBeGreaterThan(block.indexOf('isMissingServerSide(err)'));
    const unload = app.slice(app.indexOf("window.addEventListener('beforeunload'"), app.indexOf("window.addEventListener('beforeunload'") + 1500);
    expect(unload).toMatch(/rest\/v1\/rpc\/sq_save_user/);
    expect(unload).not.toMatch(/rest\/v1\/users\?on_conflict/);
  });

  it('every direct users? read sits in a fallback branch', () => {
    const lines = app.split('\n');
    const direct = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /supabaseFetch\(\s*[`'"]users\?/.test(l));
    for (const { l, i } of direct) {
      const context = lines.slice(Math.max(0, i - 25), i + 1).join('\n');
      expect(context, `line ${i + 1}: ${l.trim()}`).toMatch(/isMissingServerSide|legacyTable|PGRST202|!serverSignedIn|!serverReset/);
    }
  });

  it('login asks account-login first, and a locked or invalid answer never reaches the in-browser check', () => {
    const at = app.indexOf('const handleLogin = async');
    const block = app.slice(at, at + 6000);
    const serverAt = block.indexOf("callAccountFunction('account-login'");
    expect(serverAt).toBeGreaterThan(0);
    expect(block.indexOf('if (!serverSignedIn) {')).toBeGreaterThan(serverAt);
    expect(block.slice(serverAt, block.indexOf('if (!serverSignedIn) {'))).toMatch(/res\.status === 'invalid'[\s\S]*return;/);
  });

  it('change password and recovery reset go through the server', () => {
    expect(app).toMatch(/callAccountFunction\('account-password'/);
    expect(app).toMatch(/rpc\('sq_set_password_for_session_email'/);
    expect(app.match(/rpc\('sq_mark_email_verified'\)/g).length).toBe(2);
  });
});

describe('server-owned plan fields (2026-09-14)', () => {
  const m2 = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260914100000_server_owned_account_fields.sql'), 'utf8');
  it('sq_save_user keeps every plan and sender key from the row', () => {
    for (const k of ['proStatus', 'proType', 'proExpiry', 'proAutoRenew', 'proGrantReason', 'emailOptOut', 'trialReminder_2days_sent_at', 'checkoutAbandonEmailAt', 'lastSkillDecayEmail', 'lastWelcomeBackEmail', 'unsubToken', 'stripeCustomerId']) {
      expect(m2, k).toContain(`'${k}'`);
    }
    expect(m2).toContain("p_carry_pro_from like 'guest\\_%'");
    expect(m2).toMatch(/drop policy if exists "Service role full access" on public\.ai_usage/);
  });
  it('the sign-up paths name the guest row, and a 404 retries without it', () => {
    expect((app.match(/carryProFrom: /g) || []).length).toBeGreaterThanOrEqual(2);
    const at = app.indexOf('const _flushCloudSave');
    expect(app.slice(at, at + 3500)).toMatch(/if \(!carryProFrom \|\| !isMissingServerSide\(err\)\) throw err;/);
  });
  it('no client code path grants a plan by writing the user record', () => {
    // upgradeToProMock is a leftover mock that is defined and never called.
    expect((app.match(/upgradeToProMock/g) || []).length).toBe(1);
  });
});
