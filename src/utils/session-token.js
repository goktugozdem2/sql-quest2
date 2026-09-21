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
// step 4 is the cut. tests/session-token.test.js pins this module and the
// source guards in tests/account-access.test.js pin every call site.

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

// The rpc bodies to try, in order, for a server that may not have every
// parameter yet (PostgREST answers 404 when no function matches the named
// arguments). Full body first; then without p_token (a server before
// 20260923100000); then without p_carry_pro_from as well (a server before
// 20260914100000). Duplicates (same parameter names) are dropped — compared by
// key set, never by stringifying p_data, which can be a 100 KB blob.
export function rpcBodyFallbacks(body) {
  const out = [body];
  const sig = (b) => Object.keys(b).sort().join(',');
  const push = (b) => {
    if (!out.some(x => sig(x) === sig(b))) out.push(b);
  };
  if ('p_token' in body) {
    const { p_token, ...rest } = body; // eslint-disable-line no-unused-vars
    push(rest);
  }
  if ('p_carry_pro_from' in body) {
    const { p_token, p_carry_pro_from, ...rest } = body; // eslint-disable-line no-unused-vars
    push(rest);
  }
  return out;
}
