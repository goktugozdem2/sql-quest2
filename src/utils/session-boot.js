// Is there a saved account whose session has not been restored yet?
//
// 2026-09-20 (founder QA round 5, items 1–2). `isSessionLoading` used to
// start false and only become true INSIDE loadUserSession — but restoring a
// saved account first does an async cloud check, so between mount and that
// call `currentUser` is null and nothing says "wait". Every deep-link
// resolver read that as "cold visitor" and called startGuestMode(): opening
// /app/?challenge=23 while signed in dropped the person into a guest
// session, header "Log in", Pro gone, and the Learning Path showing the
// guest's progress instead of their own. (The ?interview= resolver had
// worked around it in-place on 2026-09-14; this fixes the source.)
//
// Pure so it can be tested and reused by every resolver.

/** The saved account name, or null. A `guest_*` value is never an account. */
export function savedAccountName(storage) {
  try {
    const raw = storage && storage.getItem ? storage.getItem('sqlquest_user') : null;
    if (typeof raw !== 'string' || !raw) return null;
    return raw.startsWith('guest_') ? null : raw;
  } catch (_) {
    return null;   // private mode: treat as no saved account
  }
}

/** True at mount when a saved account exists: hold every consumer until the session lands. */
export function sessionLoadingAtBoot(storage) {
  return savedAccountName(storage) !== null;
}

/**
 * Should a deep-link resolver wait rather than mint a guest?
 * @param {{ isSessionLoading: boolean, currentUser: string|null, storage: object }} s
 */
export function shouldWaitForSession({ isSessionLoading, currentUser, storage }) {
  if (isSessionLoading) return true;
  if (currentUser) return false;
  return savedAccountName(storage) !== null;
}
