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
    // Since 2026-09-23 the retry is rpcBodyFallbacks (p_token, then
    // p_carry_pro_from) inside withTokenFallback; tests/session-token.test.js
    // pins the order.
    const at = app.indexOf('const _flushCloudSave');
    const block = app.slice(at, at + 3500);
    expect(block).toMatch(/carryProFrom \? \{ \.\.\.rpcBody, p_carry_pro_from: carryProFrom \} : rpcBody/);
    expect(block).toMatch(/withTokenFallback\('rpc\/sq_save_user'/);
    const helper = app.slice(app.indexOf('const withTokenFallback = async'), app.indexOf('const sessionTokenFor = '));
    expect(helper).toMatch(/for \(const b of rpcBodyFallbacks\(body\)\)/);
    expect(helper).toMatch(/if \(!isMissingServerSide\(err\)\) throw err;/);
  });
  it('no client code path grants a plan by writing the user record', () => {
    // upgradeToProMock is a leftover mock that is defined and never called.
    expect((app.match(/upgradeToProMock/g) || []).length).toBe(1);
  });
});

// ── Session tokens, steps 1–2 (2026-09-23) ──
// docs/plans/account-session-tokens-2026-09-22.md. Step 1 records a missing or
// wrong token and refuses nothing; these guards pin that the migration kept
// everything 20260922160000 did, and that every client call carries p_token.
describe('session tokens (2026-09-23)', () => {
  const tok = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260923100000_account_session_tokens.sql'), 'utf8');
  const guard = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260922160000_save_regression_guard.sql'), 'utf8');
  const rollback = fs.readFileSync(path.join(ROOT, 'supabase/manual/20260923_account_session_tokens_rollback.sql'), 'utf8');
  const fnOf = (src) => {
    const at = src.indexOf('create or replace function public.sq_save_user(');
    return src.slice(at, src.indexOf('$function$;', at));
  };

  it('sq_save_user is the 20260922160000 body, byte for byte, plus the two marked token blocks', () => {
    const before = fnOf(guard);
    let after = fnOf(tok);
    // Take out the one new parameter and the two insertions; what is left
    // must be the old body exactly.
    after = after.replace(',\n  p_token text default null::text\n)', '\n)');
    after = after.replace(/\n {6}-- ── session tokens \(2026-09-23\): a new guest row takes its secret now ──\n[\s\S]*?\n {6}end if;(?=\n {6}return;)/, '');
    after = after.replace(/\n\n {2}-- ── session tokens \(2026-09-23, step 1: recorded, never refused\) ──\n {2}perform public\.sq_session_token_check\(p_username, p_token, true\);\n/, '\n');
    expect(after).toBe(before);
    expect(fnOf(tok)).not.toBe(before);
  });

  it('keeps the regression guard and every server-owned field', () => {
    const fn = fnOf(tok);
    expect(fn).toContain("raise exception 'regression refused: solved % -> %, xp % -> %'");
    expect(fn).toContain('old_solved >= 3 and new_solved < old_solved * 0.8');
    expect(fn).toContain('old_xp >= 100 and new_xp < old_xp * 0.8');
    for (const k of ['unsubToken', 'stripeCustomerId', 'stripeSessionId', 'proStatus', 'proType', 'proExpiry', 'proAutoRenew', 'proGrantReason', 'emailOptOut', 'trialReminder_2days_sent_at', 'trialReminder_1day_sent_at', 'checkoutAbandonEmailAt', 'lastSkillDecayEmail', 'lastWelcomeBackEmail']) {
      expect(fn, k).toContain(`'${k}'`);
    }
    expect(fn).toMatch(/security definer/);
  });

  it('one function per name: the old signatures are dropped, the new ones default p_token and are granted to anon', () => {
    expect(tok).toContain('drop function if exists public.sq_save_user(text, jsonb, text, text, text, text);');
    expect(tok).toContain('drop function if exists public.sq_load_account(text);');
    expect(tok).toMatch(/sq_load_account\(p_username text, p_token text default null\)/);
    expect(tok).toMatch(/grant execute on function public\.sq_save_user\(text, jsonb, text, text, text, text, text\) to anon, authenticated/);
    expect(tok).toMatch(/grant execute on function public\.sq_load_account\(text, text\) to anon, authenticated/);
    expect(tok).toMatch(/^begin;$/m);
    expect(tok).toMatch(/^commit;$/m);
  });

  it('step 1 refuses nothing: the check is performed, never raised on', () => {
    const at = tok.indexOf('create or replace function public.sq_session_token_check');
    const check = tok.slice(at, tok.indexOf('$function$;', at));
    expect(check).not.toMatch(/raise exception/);
    expect(tok).toMatch(/perform public\.sq_session_token_check\(p_username, p_token, true\);/);
    expect(tok).toMatch(/perform public\.sq_session_token_check\(p_username, p_token, false\);/);
    expect(check).toMatch(/m\.at > now\(\) - interval '1 hour'/);
  });

  it('anon cannot mint a session, read a secret or call the check; nothing mints in SQL', () => {
    for (const t of ['account_sessions', 'guest_secrets', 'session_token_misses']) {
      expect(tok).toContain(`alter table public.${t} enable row level security;`);
      expect(tok).toContain(`revoke all on public.${t} from anon, authenticated;`);
      expect(tok).not.toMatch(new RegExp(`create policy[^;]*on public\\.${t}`));
    }
    expect(tok).toContain('revoke all on function public.sq_session_token_check(text, text, boolean) from anon, authenticated;');
    expect(tok).not.toMatch(/insert into public\.account_sessions/);
    expect(tok).not.toMatch(/sq_create_session/);
  });

  it('the rollback restores both old signatures with the guard', () => {
    expect(rollback).toContain('drop function if exists public.sq_save_user(text, jsonb, text, text, text, text, text);');
    expect(rollback).toContain('create or replace function public.sq_load_account(p_username text)');
    expect(fnOf(rollback)).toBe(fnOf(guard));
  });

  it('account-login mints after the password check and returns sessionToken', () => {
    const mintAt = login.indexOf('await mintSession(supabase, row.username)');
    expect(mintAt).toBeGreaterThan(login.indexOf('if (!ok) {'));
    expect(login.indexOf('if (!ok) {')).toBeGreaterThan(login.indexOf('timingSafeEqual(computed, storedHash)'));
    expect(login).toMatch(/return json\(\{ ok: true, username: row\.username, data, sessionToken \}\)/);
    expect(login).toMatch(/new Uint8Array\(32\)/);
    expect(login).toMatch(/crypto\.getRandomValues/);
    expect(login).toMatch(/token_hash: await sha256Hex\(token\)/);
  });

  it('account-password ends the account\'s sessions and returns a fresh one', () => {
    expect(password).toMatch(/from\('account_sessions'\)\.delete\(\)\.eq\('username', row\.username\)/);
    expect(password).toMatch(/return json\(\{ ok: true, salt, passwordHash: hash, sessionToken \}\)/);
  });

  it('every sq_save_user and sq_load_account call in the client carries p_token', () => {
    const calls = [...app.matchAll(/'rpc\/sq_(save_user|load_account)'|rest\/v1\/rpc\/sq_save_user/g)];
    expect(calls.length).toBe(3);
    for (const m of calls) {
      const around = app.slice(m.index - 1200, m.index + 400);
      expect(around, `call at ${m.index}`).toMatch(/withToken\([\s\S]*sessionTokenFor\((username|user)\)/);
    }
    const unload = app.slice(app.indexOf("window.addEventListener('beforeunload'"), app.indexOf("window.addEventListener('beforeunload'") + 1800);
    expect(unload).toMatch(/JSON\.stringify\(withToken\(\{[\s\S]*\}, sessionTokenFor\(user\)\)\)/);
  });

  it('login stores the token before the merge and the session load; register signs in; logout clears', () => {
    const at = app.indexOf('const handleLogin = async');
    const block = app.slice(at, at + 14000);
    const store = block.indexOf('writeSessionToken(localStorage, username, res.sessionToken)');
    expect(store).toBeGreaterThan(0);
    expect(block.indexOf('await mergeGuestIntoAccount(username)')).toBeGreaterThan(store);
    expect(block).toMatch(/await obtainSessionAfterRegister\(regUsername, authPassword\)/);
    expect(app).toMatch(/await obtainSessionAfterRegister\(username, password\)/);
    const helperAt = app.indexOf('const obtainSessionAfterRegister = async');
    expect(app.slice(helperAt, helperAt + 600)).toMatch(/callAccountFunction\('account-login'/);
    const logoutAt = app.indexOf('const handleLogout = () => {');
    expect(app.slice(logoutAt, logoutAt + 600)).toMatch(/clearSessionToken\(localStorage, currentUser\)/);
    expect(app).toMatch(/writeSessionToken\(localStorage, currentUser, res\.sessionToken\)/);
  });

  it('a new guest mints its secret before the hello save; a resumed guest mints lazily', () => {
    const at = app.indexOf('const startGuestMode = async');
    const block = app.slice(at, at + 6000);
    const mint = block.indexOf('ensureGuestSecret(localStorage, sessionUsername, window.crypto)');
    expect(mint).toBeGreaterThan(0);
    expect(block.indexOf('saveUserData(sessionUsername, {')).toBeGreaterThan(mint);
    expect(block).toMatch(/ensureGuestSecret\(localStorage, resumeGuest, window\.crypto\)/);
  });
});
