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

/**
 * Is this browser a guest at the moment an event is written? (2026-11-27)
 *
 * `app_opened` used to stamp the `isGuest` state, which is false until
 * startGuestMode() runs. A cold visitor (no saved account) has
 * isSessionLoading false from the first render, so app_opened fired on that
 * render — before the mount effect's setTimeout started guest mode — and
 * wrote `isGuest: false` on 11,763 of 11,764 rows from 08-01 to 11-27
 * (docs/reads/retention-drivers-2026-11-27.md, papercuts).
 *
 * Guest = not signed in to an account: a `guest_*` session, or no session
 * yet (a pre-login visitor, including someone on the sign-in screen). Only a
 * signed-in, non-guest account is false.
 *
 * @param {{ currentUser: string|null, isGuest: boolean }} s
 * @returns {boolean}
 */
export function isGuestSession({ currentUser, isGuest }) {
  if (isGuest === true) return true;
  if (typeof currentUser !== 'string' || !currentUser) return true;
  return currentUser.startsWith('guest_');
}
