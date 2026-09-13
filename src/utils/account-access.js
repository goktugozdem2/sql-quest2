// Account access — the pure half (2026-09-13).
//
// Account reads go through the users_public view and writes through the
// sq_save_user function (supabase/migrations/20260913130000_*); sign-in and
// password change run in the account-login / account-password edge
// functions. The view never returns ACCOUNT_PRIVATE_KEYS, so a signed-in
// browser puts its own copy back onto every cloud read (withLocalAccountKeys)
// — otherwise the next autosave and the profile publisher would see the
// owner's own email and hash vanish. tests/account-access.test.js binds this
// list to the view in the migration.

export const ACCOUNT_PRIVATE_KEYS = ['passwordHash', 'salt', 'email', 'unsubToken', 'stripeCustomerId', 'stripeSessionId'];

export function withLocalAccountKeys(data, localRaw) {
  if (!data || typeof data !== 'object') return data;
  let local = null;
  try { local = localRaw ? JSON.parse(localRaw) : null; } catch (_) { local = null; }
  if (!local || typeof local !== 'object') return data;
  const out = { ...data };
  for (const k of ACCOUNT_PRIVATE_KEYS) {
    if (out[k] === undefined && local[k] !== undefined) out[k] = local[k];
  }
  return out;
}

// supabaseFetch({ throwOnError: true }) errors read "Supabase <status>: …".
// 404 is PostgREST's answer for a view or function that is not deployed yet,
// which is the only case the old table path is allowed to run.
export function isMissingServerSide(err) {
  return /Supabase 404/.test(String((err && err.message) || ''));
}

// What callAccountFunction reports for an edge function response.
export function accountFunctionStatus(httpStatus, body) {
  if (httpStatus === 404) return 'unavailable';
  if (httpStatus >= 200 && httpStatus < 300 && body && body.ok) return 'ok';
  if (httpStatus === 429 || (body && body.error === 'locked')) return 'locked';
  if (httpStatus === 401) return 'invalid';
  return 'unavailable';
}
