// Session tokens — the pure half (2026-09-23).
//
// docs/plans/account-session-tokens-2026-09-22.md, approved by the founder on
// 2026-09-22. Until now every account read (rpc/sq_load_account) and write
// (rpc/sq_save_user) was keyed by username alone, with the anon key every
// browser holds: knowing a username was enough to overwrite that account.
//
// Two secrets, one per kind of row, each stored WITH the username it belongs
// to so a token is never sent for a different account:
//   * a registered account's session token — minted by the account-login /
//     account-password edge functions after a correct password, kept under
//     SESSION_TOKEN_KEY as {"username", "token"};
//   * a guest's secret — 32 random bytes minted in this browser at
//     startGuestMode (or lazily for a resumed guest that has none), kept under
//     GUEST_SECRET_KEY as {"username", "token"}. The server stores its SHA-256
//     on the first save that carries it (trust on first use — the founder's
//     decision for the 6,833 guest rows that predate this).
//
// The server only ever sees the token as p_token and stores only its hash.
// Step 1 of the release records a missing or wrong token and refuses nothing;
// step 4 is the cut. The four gaps found before the cut (2026-09-24) add two
// helpers here: withCarry (a carried plan proves the guest) and
// endSessionBody (logout ends the server row). tests/session-token.test.js pins this module and the
// source guards in tests/account-access.test.js pin every call site.
// The cut's client half (2026-09-25) adds isSessionTokenRequired,
// sessionRefusalAction, RELOGIN_MESSAGE and the relogin marker; pinned by
// tests/session-token-cut.test.js.

export const SESSION_TOKEN_KEY = 'sqlquest_session_token';
export const GUEST_SECRET_KEY = 'sqlquest_guest_secret';
// Mirror of progress-merge.js GUEST_USER_KEY — the one guest identity this
// browser keeps. Duplicated (not imported) so this module stays import-free.
export const CURRENT_GUEST_KEY = 'sqlquest_guest_user';

export function isGuestUsername(username) {
  return typeof username === 'string' && username.startsWith('guest_');
}

// 32 random bytes as 64 lowercase hex chars. Never falls back to Math.random:
// a guessable secret is worse than none, because none is at least recorded as
// 'missing'. Returns null when there is no CSPRNG.
export function newTokenHex(cryptoObj) {
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') return null;
  const bytes = new Uint8Array(32);
  cryptoObj.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function readKeyed(storage, key, username) {
  if (!storage || !username) return null;
  let raw;
  try { raw = storage.getItem(key); } catch { return null; }
  if (!raw) return null;
  let rec;
  try { rec = JSON.parse(raw); } catch { return null; }
  if (!rec || typeof rec !== 'object') return null;
  if (rec.username !== username) return null;
  return typeof rec.token === 'string' && rec.token.length > 0 ? rec.token : null;
}

function writeKeyed(storage, key, username, token) {
  if (!storage || !username || typeof token !== 'string' || !token) return false;
  try { storage.setItem(key, JSON.stringify({ username, token })); return true; } catch { return false; }
}

// Removes the record; with a username, only when the record belongs to it.
function clearKeyed(storage, key, username) {
  if (!storage) return;
  try {
    if (username) {
      const raw = storage.getItem(key);
      let rec = null;
      try { rec = raw ? JSON.parse(raw) : null; } catch { rec = null; }
      if (rec && rec.username !== username) return;
    }
    storage.removeItem(key);
  } catch { /* private mode — nothing stored, nothing to clear */ }
}

export function readSessionToken(storage, username) {
  return readKeyed(storage, SESSION_TOKEN_KEY, username);
}
export function writeSessionToken(storage, username, token) {
  return writeKeyed(storage, SESSION_TOKEN_KEY, username, token);
}
export function clearSessionToken(storage, username) {
  clearKeyed(storage, SESSION_TOKEN_KEY, username);
}

export function readGuestSecret(storage, username) {
  return readKeyed(storage, GUEST_SECRET_KEY, username);
}
export function clearGuestSecret(storage, username) {
  clearKeyed(storage, GUEST_SECRET_KEY, username);
}

// The guest's secret, minted and stored now when it has none. Only for a
// guest_* name. Replaces a secret kept for a DIFFERENT guest name — the
// browser holds one guest identity at a time.
export function ensureGuestSecret(storage, username, cryptoObj) {
  if (!isGuestUsername(username)) return null;
  const existing = readGuestSecret(storage, username);
  if (existing) return existing;
  const minted = newTokenHex(cryptoObj);
  if (!minted) return null;
  return writeKeyed(storage, GUEST_SECRET_KEY, username, minted) ? minted : null;
}

// Which token to send for this username — the one rule every read and write
// goes through. A guest gets its secret (minted lazily, but only when this
// browser's current guest IS that name: a late debounced flush of an older
// guest must not replace the current guest's secret). A registered account
// gets its session token, and only if it was stored for that same username.
export function tokenForUsername(storage, username, cryptoObj) {
  if (!username) return null;
  if (isGuestUsername(username)) {
    const existing = readGuestSecret(storage, username);
    if (existing) return existing;
    let current;
    try { current = storage ? storage.getItem(CURRENT_GUEST_KEY) : null; } catch { current = null; }
    return current === username ? ensureGuestSecret(storage, username, cryptoObj) : null;
  }
  return readSessionToken(storage, username);
}

// The rpc body with p_token added only when there is one: a call without a
// token stays byte-for-byte what an old client sends.
export function withToken(body, token) {
  return token ? { ...body, p_token: token } : body;
}

// The save body for a new account that carries a paid guest's plan
// (2026-09-24, gap 2 of the step-4 cut). p_carry_pro_from names the guest
// row; p_carry_token is THAT guest's own secret, read from this browser and
// never minted here — a secret the server has never seen proves nothing, so a
// browser that holds none sends none and the server records 'missing' against
// the guest. Only a guest_* name is ever carried from (the server ignores
// anything else anyway). Read the secret BEFORE forgetGuest clears it.
export function withCarry(body, carryProFrom, storage) {
  if (!isGuestUsername(carryProFrom)) return body;
  const secret = readGuestSecret(storage, carryProFrom);
  return secret
    ? { ...body, p_carry_pro_from: carryProFrom, p_carry_token: secret }
    : { ...body, p_carry_pro_from: carryProFrom };
}

// The body for rpc/sq_end_session (2026-09-24, gap 4): logout ends the
// session on the server, not only in this browser. null when there is
// nothing to end — a guest, or an account this browser holds no token for.
// The server deletes only the row matching BOTH the username and the token's
// hash, so without the token itself the call can do nothing.
export function endSessionBody(storage, username) {
  if (!username || isGuestUsername(username)) return null;
  const token = readSessionToken(storage, username);
  return token ? { p_username: username, p_token: token } : null;
}

// ── The cut (step 4), client half (2026-09-25) ──
// supabase/manual/20260925b_session_token_cut.sql makes sq_load_account and
// sq_save_user RAISE "session token required" (errcode 28000, HTTP 403) when
// an EXISTING row is reached with a missing or wrong token. This half ships
// FIRST and is inert until then: nothing answers that message before the cut.
// Matched on the message, never on the status — a 403 has other causes.
export const SESSION_TOKEN_REQUIRED = 'session token required';
export function isSessionTokenRequired(err) {
  const msg = err && typeof err === 'object' ? err.message : err;
  return typeof msg === 'string' && msg.includes(SESSION_TOKEN_REQUIRED);
}

// The one sentence the sign-in screen shows after a refusal.
export const RELOGIN_MESSAGE = "For your account's security, please sign in again — your progress is safe.";

// What to do when the server refuses a row for want of its token:
//   'relogin'    a registered account that is the one on screen (activeUser),
//                or when nobody is (a page load, a sign-in, a registration:
//                activeUser empty or the sign-in screen open) — clear its
//                token and session, keep the local progress, ask for the
//                password once;
//   'new_guest'  this browser's current guest, with nothing worth keeping
//                locally — a fresh guest identity (new row, new secret);
//   'keep_local' a guest with progress (its truth is local; the cloud copy is
//                only a copy), or a late flush for an account or a guest that
//                is no longer the one on screen (a debounced save that fires
//                after logout carries no token) — record it, stop sending,
//                keep the blob, and never sign out whoever is using the app.
export function sessionRefusalAction({ username, activeUser, authScreenOpen, currentGuest, localHasProgress }) {
  if (!username) return 'keep_local';
  if (!isGuestUsername(username)) {
    return (!activeUser || activeUser === username || authScreenOpen) ? 'relogin' : 'keep_local';
  }
  if (username === currentGuest && !localHasProgress) return 'new_guest';
  return 'keep_local';
}

// "This account was signed out by a refusal and owes a merge on sign-in."
// Stored as {"username", "at"}; the progress itself stays where it always
// is, under sqlquest_user_<username>, which a successful sign-in overwrites —
// so the sign-in path reads it BEFORE writing (readStaleOwnBlob in app.jsx).
export const RELOGIN_PENDING_KEY = 'sqlquest_relogin_pending';
export function markReloginPending(storage, username, now = Date.now()) {
  if (!storage || !username || isGuestUsername(username)) return false;
  try { storage.setItem(RELOGIN_PENDING_KEY, JSON.stringify({ username, at: now })); return true; } catch { return false; }
}
export function isReloginPending(storage, username) {
  if (!storage || !username) return false;
  try {
    const rec = JSON.parse(storage.getItem(RELOGIN_PENDING_KEY) || 'null');
    return !!(rec && typeof rec === 'object' && rec.username === username);
  } catch { return false; }
}
export function clearReloginPending(storage) {
  if (!storage) return;
  try { storage.removeItem(RELOGIN_PENDING_KEY); } catch { /* private mode */ }
}

// The rpc bodies to try, in order, for a server that may not have every
// parameter yet (PostgREST answers 404 when no function matches the named
// arguments). Parameters are dropped newest first, cumulatively:
//   p_carry_token    — a server before 20260924100000,
//   p_token          — a server before 20260923100000,
//   p_carry_pro_from — a server before 20260914100000.
// Duplicates (same parameter names) are dropped — compared by key set, never
// by stringifying p_data, which can be a 100 KB blob.
const PARAMS_NEWEST_FIRST = ['p_carry_token', 'p_token', 'p_carry_pro_from'];
export function rpcBodyFallbacks(body) {
  const out = [body];
  const sig = (b) => Object.keys(b).sort().join(',');
  let cur = body;
  for (const key of PARAMS_NEWEST_FIRST) {
    if (!(key in cur)) continue;
    const { [key]: _dropped, ...rest } = cur; // eslint-disable-line no-unused-vars
    cur = rest;
    if (!out.some(x => sig(x) === sig(cur))) out.push(cur);
  }
  return out;
}
