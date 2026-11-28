// The AI tutor's daily caps, as the app shows them (2026-11-28).
//
// The server decides: supabase/functions/ai-tutor DAILY_LIMITS (guest 5,
// free 20, monthly 50, annual 75, lifetime 100), with "guest" meaning no
// username or a `guest_…` one. An edge function cannot import from src/, so
// tests/tutor-limit-claims.test.js binds every number here to that table.
//
// Until this date the app showed every non-Pro person "Daily AI Calls 0/20"
// before their first call — a guest included, whom the server stops at 5
// (A2, docs/reads/live-qa-2026-11-28.md). The server's own `usage` on each
// answer still replaces whatever is shown here.
import { isGuestSession } from './session-boot.js';

export const TUTOR_GUEST_DAILY_LIMIT = 5;
export const TUTOR_FREE_DAILY_LIMIT = 20;
// Pro shows the monthly tier's cap; annual and lifetime are higher, and the
// first answer brings the real one.
export const TUTOR_PRO_DISPLAY_LIMIT = 50;

/**
 * The daily tutor cap to show before the server has answered.
 * Pro first (unchanged display). While a saved account is still being
 * restored the person is not yet known to be a guest, so the free cap shows,
 * as before; only a settled guest session shows the guest cap.
 * @param {{ pro: boolean, currentUser: string|null, isGuest: boolean, isSessionLoading?: boolean }} s
 * @returns {number}
 */
export function tutorDisplayLimit({ pro, currentUser, isGuest, isSessionLoading = false }) {
  if (pro) return TUTOR_PRO_DISPLAY_LIMIT;
  if (!isSessionLoading && isGuestSession({ currentUser, isGuest })) return TUTOR_GUEST_DAILY_LIMIT;
  return TUTOR_FREE_DAILY_LIMIT;
}
