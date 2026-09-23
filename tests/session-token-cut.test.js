// Session tokens, step 4 — the cut, and the client that must ship before it
// (2026-09-25). docs/plans/account-session-tokens-2026-09-22.md, Status.
//
// SQL: supabase/manual/20260925b_session_token_cut.sql is NOT a migration; it
// is applied by hand on the founder's go. Its behaviour is proved on a local
// Postgres by supabase/manual/account-session-tokens-replica-test.sql
// (section "the cut", mutation-checked). These guards pin its text to the
// prep migration it builds on, and bind the client to its error message.
//
// Client: when sq_load_account / sq_save_user answer "session token
// required", a registered account is signed in again with its local progress
// kept and merged back; a guest keeps its local blob (a fresh identity only
// when there is nothing to keep). Inert until the cut: nothing answers that
// message before it.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  SESSION_TOKEN_REQUIRED, isSessionTokenRequired, RELOGIN_MESSAGE,
  sessionRefusalAction, RELOGIN_PENDING_KEY, markReloginPending, isReloginPending, clearReloginPending,
} from '../src/utils/session-token.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const app = read('src/app.jsx');
const tok = read('supabase/migrations/20260923100000_account_session_tokens.sql');
const prep = read('supabase/migrations/20260925100000_session_token_cut_prep.sql');
const cut = read('supabase/manual/20260925b_session_token_cut.sql');
const cutRollback = read('supabase/manual/20260925b_session_token_cut_rollback.sql');
const replica = read('supabase/manual/account-session-tokens-replica-test.sql');

const fnOf = (src, name = 'sq_save_user') => {
  const at = src.indexOf(`create or replace function public.${name}(`);
  expect(at, name).toBeGreaterThan(-1);
  const quote = src.slice(at).match(/\nas (\$\w*\$)/)[1];
  return src.slice(at, src.indexOf(quote + ';', at));
};
const between = (src, from, to) => {
  const a = src.indexOf(from);
  expect(a, `marker not found: ${from}`).toBeGreaterThan(-1);
  const b = src.indexOf(to, a + from.length);
  expect(b, `marker not found: ${to}`).toBeGreaterThan(a);
  return src.slice(a, b);
};

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, _m: m };
}
const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };

// ── the SQL ──
describe('the cut file (supabase/manual/20260925b_session_token_cut.sql)', () => {
  const STEP1 = "  -- ── session tokens (2026-09-23, step 1: recorded, never refused) ──\n  perform public.sq_session_token_check(p_username, p_token, true);\n";
  const CUT_SAVE = / {2}-- ── session token cut \(step 4\): an existing row needs its token ──\n[\s\S]*? {2}-- ── end session token cut ──\n/;
  const CUT_LOAD = / {2}-- ── session token cut \(step 4\): an existing row is read only with its token ──\n[\s\S]*? {2}-- ── end session token cut ──\n/;

  it('is not a migration, and no migration raises "session token required"', () => {
    expect(fs.existsSync(path.join(ROOT, 'supabase/migrations/20260925b_session_token_cut.sql'))).toBe(false);
    for (const f of fs.readdirSync(path.join(ROOT, 'supabase/migrations'))) {
      expect(read(`supabase/migrations/${f}`), f).not.toMatch(/raise exception 'session token required'/);
    }
    expect(cut).toMatch(/NOT A MIGRATION/);
    expect(cut).toMatch(/founder's explicit go/);
  });

  it('sq_save_user is the prep migration\'s body with exactly three marked changes', () => {
    const before = fnOf(prep);
    let after = fnOf(cut);
    expect(after).toMatch(CUT_SAVE);
    after = after.replace(CUT_SAVE, STEP1);
    after = after.replace('\n  v_tok text; -- session token cut (step 4)', '');
    after = after.replace(
      / {8}-- session token cut \(step 4\): only the guest's own secret carries the\n[\s\S]*? {8}v_carry := public\.sq_session_token_check\(p_carry_pro_from, p_carry_token, true\);\n {8}if v_carry not in \('ok', 'claimed'\) then\n/,
      "        v_carry := public.sq_session_token_check(p_carry_pro_from, p_carry_token, false);\n        if v_carry = 'unclaimed' and not exists (\n          select 1 from public.session_token_misses m\n           where m.username = p_carry_pro_from and m.at > now() - interval '1 hour'\n        ) then\n          insert into public.session_token_misses (username, kind) values (p_carry_pro_from, 'missing');\n        end if;\n        if v_carry = 'invalid' then\n",
    );
    expect(after).toBe(before);
  });

  it('the save refuses anything but ok / claimed, with the message the client matches, except for a trusted caller', () => {
    const block = fnOf(cut).match(CUT_SAVE)[0];
    expect(block).toContain('if not public.sq_session_trusted_caller() then');
    expect(block).toContain('v_tok := public.sq_session_token_check(p_username, p_token, true);');
    expect(block).toContain("if v_tok not in ('ok', 'claimed') then");
    expect(block).toMatch(/raise exception 'session token required'\n\s+using errcode = '28000'/);
    // the new-row path is untouched: registration and a new guest need no token
    const fn = fnOf(cut);
    expect(fn.indexOf('session token cut (step 4): an existing row needs its token')).toBeGreaterThan(fn.indexOf('-- ── existing row ──'));
    // regression guard, server-owned keys and the prep rule survive
    expect(fn).toContain("raise exception 'regression refused: solved % -> %, xp % -> %'");
    expect(fn).toContain('password never lands on a password-less named row');
    for (const k of ['unsubToken', 'stripeCustomerId', 'proStatus', 'proExpiry', 'emailOptOut', 'lastWelcomeBackEmail']) expect(fn, k).toContain(`'${k}'`);
  });

  it('the load raises the same message for an existing row without its token; a missing name still answers empty', () => {
    const load = fnOf(cut, 'sq_load_account');
    const block = load.match(CUT_LOAD)[0];
    expect(block).toMatch(/if exists \(select 1 from public\.users u where u\.username = p_username\)\n\s+and not public\.sq_session_trusted_caller\(\) then/);
    expect(block).toContain("if public.sq_session_token_check(p_username, p_token, false) <> 'ok' then");
    expect(block).toMatch(/raise exception 'session token required'\n\s+using errcode = '28000'/);
    // everything else is 20260923100000's function
    const restored = load.replace(CUT_LOAD, "  if exists (select 1 from public.users u where u.username = p_username) then\n    perform public.sq_session_token_check(p_username, p_token, false);\n  end if;\n");
    expect(restored).toBe(fnOf(tok, 'sq_load_account'));
  });

  it('the trusted-caller helper: service_role by JWT, or a direct session; never callable by anon', () => {
    const fn = fnOf(cut, 'sq_session_trusted_caller');
    expect(fn).toContain("current_setting('request.jwt.claims', true)");
    expect(fn).toContain("current_setting('request.jwt.claim.role', true)");
    expect(fn).toContain("= 'service_role'");
    expect(fn).toContain("session_user::text not in ('authenticator', 'anon', 'authenticated')");
    expect(fn).not.toMatch(/security definer/);
    expect(cut).toContain('revoke all on function public.sq_session_trusted_caller() from anon, authenticated;');
  });

  it('same signatures (no drop), grants restated, one transaction, schema reloaded', () => {
    expect(cut).not.toMatch(/drop function/);
    expect(cut).toMatch(/grant execute on function public\.sq_save_user\(text, jsonb, text, text, text, text, text, text\) to anon, authenticated, service_role;/);
    expect(cut).toMatch(/grant execute on function public\.sq_load_account\(text, text\) to anon, authenticated, service_role;/);
    expect(cut).toMatch(/^begin;$/m);
    expect(cut).toMatch(/^commit;$/m);
    expect(cut.trim().endsWith("notify pgrst, 'reload schema';")).toBe(true);
  });

  it('the rollback puts back step 1 exactly: 20260923100000\'s load, the prep\'s save, no helper', () => {
    expect(fnOf(cutRollback, 'sq_load_account')).toBe(fnOf(tok, 'sq_load_account'));
    expect(fnOf(cutRollback)).toBe(fnOf(prep));
    expect(cutRollback).toContain('drop function if exists public.sq_session_trusted_caller();');
    expect(cutRollback).not.toMatch(/raise exception 'session token required'/);
  });

  it('the client matches the exact message the SQL raises', () => {
    expect(SESSION_TOKEN_REQUIRED).toBe('session token required');
    expect((cut.match(/raise exception 'session token required'/g) || []).length).toBe(2);
  });

  it('the replica test proves every rule, the rollback and the re-apply', () => {
    expect(replica).toContain('\\ir 20260925b_session_token_cut.sql');
    expect(replica).toContain('\\ir 20260925b_session_token_cut_rollback.sql');
    for (const k of ['cut1:', 'cut2:', 'cut3:', 'cut4:', 'cut5:', 'cut6:', 'cut7:', 'cut rollback:', 'cut forward-again:']) expect(replica, k).toContain(k);
  });
});

// ── the pure half ──
describe('isSessionTokenRequired', () => {
  it('matches the refusal however it arrives (supabaseFetch wraps the body)', () => {
    expect(isSessionTokenRequired(new Error('Supabase 403: {"code":"28000","message":"session token required","hint":"sign in again"}'))).toBe(true);
    expect(isSessionTokenRequired('session token required (not sent)')).toBe(true);
  });
  it('matches nothing else — a 403, a regression refusal, a password refusal, a network error', () => {
    expect(isSessionTokenRequired(new Error('Supabase 403: permission denied'))).toBe(false);
    expect(isSessionTokenRequired(new Error('Supabase 400: regression refused: solved 8 -> 4'))).toBe(false);
    expect(isSessionTokenRequired(new Error('Supabase 403: password refused: this username belongs to an existing account'))).toBe(false);
    expect(isSessionTokenRequired(new Error('Failed to fetch'))).toBe(false);
    expect(isSessionTokenRequired(null)).toBe(false);
    expect(isSessionTokenRequired({})).toBe(false);
  });
});

describe('sessionRefusalAction', () => {
  it('a registered account signs in again when it is the one on screen, or nobody is', () => {
    expect(sessionRefusalAction({ username: 'alice', activeUser: 'alice', currentGuest: 'guest_1', localHasProgress: true })).toBe('relogin');
    expect(sessionRefusalAction({ username: 'alice', activeUser: null, localHasProgress: false })).toBe('relogin');      // page load
    expect(sessionRefusalAction({ username: 'alice', activeUser: 'guest_9', authScreenOpen: true })).toBe('relogin');   // registering from guest mode
  });
  it('a late flush for an account no longer on screen never signs anyone out', () => {
    expect(sessionRefusalAction({ username: 'alice', activeUser: 'bob', authScreenOpen: false, localHasProgress: true })).toBe('keep_local');
    expect(sessionRefusalAction({ username: 'alice', activeUser: 'guest_9', authScreenOpen: false })).toBe('keep_local');
  });
  it('a guest keeps its local blob; a fresh identity only for this browser\'s guest with nothing to keep', () => {
    expect(sessionRefusalAction({ username: 'guest_1', currentGuest: 'guest_1', localHasProgress: true })).toBe('keep_local');
    expect(sessionRefusalAction({ username: 'guest_1', currentGuest: 'guest_1', localHasProgress: false })).toBe('new_guest');
    // a late flush for a guest this browser no longer is: never replace the current one
    expect(sessionRefusalAction({ username: 'guest_1', currentGuest: 'guest_2', localHasProgress: false })).toBe('keep_local');
    expect(sessionRefusalAction({ username: null })).toBe('keep_local');
  });
});

describe('the relogin marker', () => {
  it('is kept per account and only for a registered name', () => {
    const s = memStorage();
    expect(markReloginPending(s, 'alice', 123)).toBe(true);
    expect(JSON.parse(s.getItem(RELOGIN_PENDING_KEY))).toEqual({ username: 'alice', at: 123 });
    expect(isReloginPending(s, 'alice')).toBe(true);
    expect(isReloginPending(s, 'bob')).toBe(false);
    expect(markReloginPending(s, 'guest_1')).toBe(false);
    clearReloginPending(s);
    expect(isReloginPending(s, 'alice')).toBe(false);
  });
  it('survives garbage and storage that throws', () => {
    expect(isReloginPending(memStorage({ [RELOGIN_PENDING_KEY]: '{broken' }), 'alice')).toBe(false);
    expect(isReloginPending(throwing, 'alice')).toBe(false);
    expect(markReloginPending(throwing, 'alice')).toBe(false);
    expect(() => clearReloginPending(throwing)).not.toThrow();
    expect(isReloginPending(null, 'alice')).toBe(false);
  });
});

describe('the sentence', () => {
  it('is one plain sentence that says why and that the progress is safe', () => {
    expect(RELOGIN_MESSAGE).toBe("For your account's security, please sign in again — your progress is safe.");
    expect(RELOGIN_MESSAGE).not.toMatch(/\bPro\b|upgrade|token/i);
  });
});

// ── the wiring (source guards on src/app.jsx) ──
describe('client: a refusal is noticed where it happens', () => {
  it('fetchAccountRow notes a refused read before the 404 fallback', () => {
    const fn = between(app, 'const fetchAccountRow = async', 'const fetchAccountRows = async');
    expect(fn.indexOf("if (noteSessionRefusal(username, 'read', err)) throw err;")).toBeGreaterThan(-1);
    expect(fn.indexOf("noteSessionRefusal(username, 'read', err)")).toBeLessThan(fn.indexOf('if (!isMissingServerSide(err)) throw err;'));
  });
  it('noteSessionRefusal remembers the username and fires sq:session-refused only for the cut\'s message', () => {
    const fn = between(app, 'const noteSessionRefusal = ', 'const wasSessionRefused = ');
    expect(fn).toMatch(/if \(!username \|\| !isSessionTokenRequired\(err\)\) return false;/);
    expect(fn).toContain('_sessionRefused.add(username);');
    expect(fn).toContain("new CustomEvent('sq:session-refused', { detail: { username, kind } })");
  });
  it('_flushCloudSave stops sending for a refused name (not ok, so a forced save still throws) and notes a refused write', () => {
    const flush = between(app, 'const _flushCloudSave = async', 'const saveUserData = async');
    expect(flush).toMatch(/if \(wasSessionRefused\(username\)\) return \{ ok: false, error: new Error\('session token required \(not sent\)'\) \};/);
    expect(flush.indexOf('wasSessionRefused(username)')).toBeLessThan(flush.indexOf("withTokenFallback('rpc/sq_save_user'"));
    expect(flush).toContain("noteSessionRefusal(username, 'write', err);");
    const unload = between(app, "window.addEventListener('beforeunload'", '_cloudSaveQueue.clear();');
    expect(unload).toContain('if (wasSessionRefused(user)) continue;');
  });
});

describe('client: a refusal is never read as "account deleted"', () => {
  it('loadUserSession returns before it removes the session and the local blob', () => {
    const fn = between(app, 'const loadUserSession = async', 'xpRestoreRef.current = true;');
    const guard = fn.indexOf('if (!userData && wasSessionRefused(username)) {');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(fn.indexOf("localStorage.removeItem(`sqlquest_user_${username}`);"));
    const guardBlock = fn.slice(guard, fn.indexOf('return;', guard));
    expect(guardBlock).not.toMatch(/removeItem/);
  });
  it('the mount check does not retry a refused read as a session load', () => {
    const block = between(app, 'fetchAccountRow(savedUser).then(', "// Check notification settings");
    expect(block).toMatch(/if \(isSessionTokenRequired\(err\)\) \{ setIsSessionLoading\(false\); return; \}\n\s+\/\/ On error, try to restore session anyway\n\s+loadUserSession\(savedUser\);/);
  });
});

describe('client: the refusal handler', () => {
  const handler = between(app, "const [reloginNotice, setReloginNotice] = useState(false);", '// This account\'s own local copy, when a refusal signed it out');

  it('listens for sq:session-refused and acts once per username', () => {
    expect(handler).toContain("window.addEventListener('sq:session-refused', onSessionRefused);");
    expect(handler).toContain("window.removeEventListener('sq:session-refused', onSessionRefused);");
    expect(handler).toMatch(/if \(sessionRefusalHandledRef\.current\.has\(username\)\) return;\n\s+sessionRefusalHandledRef\.current\.add\(username\);/);
    expect(handler).toMatch(/sessionRefusalAction\(\{ username, activeUser: currentUser, authScreenOpen: showAuth, currentGuest, localHasProgress: hasProgress\(local\) \}\)/);
  });

  it('records session_token_refused {kind, registered} — and {guest: true} for a guest', () => {
    expect(handler).toMatch(/trackActivationEvent\('session_token_refused', registered\n\s+\? \{ kind, registered: true, action \}\n\s+: \{ kind, registered: false, guest: true, action \}\);/);
  });

  it('registered: clears the token and the session, keeps the blob, opens sign-in with the sentence', () => {
    const relogin = handler.slice(handler.indexOf("if (action === 'relogin') {"), handler.indexOf("} else if (action === 'new_guest') {"));
    expect(relogin).toContain('clearSessionToken(localStorage, username)');
    expect(relogin).toContain("localStorage.removeItem('sqlquest_user')");
    expect(relogin).toContain('markReloginPending(localStorage, username)');
    expect(relogin).toContain('_cloudSaveQueue.delete(username);');
    expect(relogin).toContain("setAuthMode('login');");
    expect(relogin).toContain('setAuthUsername(username);');
    expect(relogin).toContain('setReloginNotice(true);');
    expect(relogin).toContain('setShowAuth(true);');
    expect(relogin).toContain("trackActivationEvent('session_relogin_shown', { kind });");
    // the progress blob is never touched here
    expect(relogin).not.toMatch(/removeItem\(`sqlquest_user_/);
    expect(relogin).not.toMatch(/forgetGuest|clearGuestSecret/);
  });

  it('guest: a fresh identity only on new_guest; keep_local does nothing but stop sending', () => {
    expect(handler).toMatch(/\} else if \(action === 'new_guest'\) \{\n\s+freshGuestMintedRef\.current = true;\n\s+startGuestMode\(\{ resumeGuest: null \}\);\n\s+\}/);
    // at most one fresh guest per page: a refused new guest must not loop
    expect(handler).toContain("if (action === 'new_guest' && freshGuestMintedRef.current) action = 'keep_local';");
    expect(handler).not.toMatch(/action === 'keep_local'/);
  });

  it('the sign-in screen shows the sentence on the login form only', () => {
    expect(app).toMatch(/\{reloginNotice && authMode === 'login' && \(\n\s+<p data-testid="relogin-notice"[^>]*>\n\s+\{RELOGIN_MESSAGE\}/);
  });
});

describe('client: the sign-in carries the kept progress back', () => {
  const login = between(app, 'const handleLogin = async', 'const handleChangePassword = async');
  const server = login.slice(login.indexOf("if (res.status === 'ok' && res.username && res.data) {"), login.indexOf("} else if (res.status === 'locked') {"));

  it('reads the account\'s own local copy before the server record overwrites it', () => {
    const readAt = server.indexOf('const staleOwn = readStaleOwnBlob(username);');
    expect(readAt).toBeGreaterThan(-1);
    expect(readAt).toBeLessThan(server.indexOf('localStorage.setItem(`sqlquest_user_${username}`, JSON.stringify(res.data))'));
  });

  it('with the new token stored, lifts the refusal and merges — before the guest merge and the session load', () => {
    const tokenAt = server.indexOf('writeSessionToken(localStorage, username, res.sessionToken)');
    const clearAt = server.indexOf('clearSessionRefusal(username);');
    const carryAt = server.indexOf('if (staleOwn) await carryStaleOwnBlob(username, res.data, staleOwn);');
    expect(clearAt).toBeGreaterThan(tokenAt);
    expect(carryAt).toBeGreaterThan(clearAt);
    expect(server).toContain('sessionRefusalHandledRef.current.delete(username);');
    expect(login.indexOf('await mergeGuestIntoAccount(username)')).toBeGreaterThan(login.indexOf('carryStaleOwnBlob(username'));
  });

  it('the merge is the save-recovery merge, saved with force, and always completes the event and the marker', () => {
    const fn = between(app, 'const carryStaleOwnBlob = async', '// ── Share loop');
    expect(fn).toMatch(/mergeProgress\(withLocalAccountKeys\(username, cloudData\), stale, \{ challenges: window\.challengesData \|\| challenges \|\| \[\] \}\)/);
    expect(fn).toMatch(/if \(summary\.newSolves > 0 \|\| summary\.newAttempts > 0\) \{\n\s+await saveUserData\(username, res\.merged, \{ force: true \}\);/);
    expect((fn.match(/trackActivationEvent\('session_relogin_completed'/g) || []).length).toBe(2);
    expect(fn).toMatch(/finally \{\n\s+try \{ clearReloginPending\(localStorage\); \} catch \(_\) \{\}\n\s+setReloginNotice\(false\);/);
    const reader = between(app, 'const readStaleOwnBlob = (username) => {', 'const carryStaleOwnBlob = async');
    expect(reader).toContain('if (!isReloginPending(localStorage, username)) return null;');
  });
});
