// Referral code helpers — pure functions, used both client- and edge-side.
//
// A ref_code is the partner identifier that arrives via `?ref=tinahuang`.
// We normalize aggressively (lowercase, validate) so partners can share
// links written however they want (`?ref=TinaHuang`, `?ref=tina_huang`)
// and conversions all bucket to the same row.

// 2-60 chars, alphanumeric + underscore + dash. Case-insensitive at parse,
// always lowercased on storage. This shape was picked to stay URL-clean,
// readable in dashboards, and impossible to use for injection.
export const REF_CODE_RE = /^[a-z0-9_-]{2,60}$/i;

// Returns the normalized ref_code, or null if invalid. Use this everywhere
// we accept a ref_code from the outside world (URL, request body, modal
// input). Never insert a non-normalized value into Supabase.
export function normalizeRefCode(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!REF_CODE_RE.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

// Was the user's referral attribution captured recently enough to count?
// Last-click attribution with a 30-day cookie window: if a partner's link
// got clicked more than a month ago and the user only signs up now, that's
// almost certainly an organic signup — don't credit the partner. Returns
// true if the timestamp is missing too (treat unknown-age as fresh, since
// pre-Phase-1 stamps will all lack timestamps).
export const REFERRER_FRESHNESS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function isReferrerFresh(refCodeAt, nowMs = Date.now()) {
  if (refCodeAt == null) return true; // unknown age → don't penalize
  const t = typeof refCodeAt === 'number' ? refCodeAt : Date.parse(refCodeAt);
  if (!Number.isFinite(t) || t <= 0) return true;
  return nowMs - t <= REFERRER_FRESHNESS_MS;
}

// ============================================================
// Peer-to-peer referral helpers
// ============================================================
//
// Each user has an auto-generated personal_ref_code derived from their
// username. The format must be stable: same username → same code, every
// time, on every device. We use base64(username), strip URL-unfriendly
// chars, take first 8, uppercase. Mirrors the historic in-app generator
// in src/app.jsx so existing localStorage codes line up with DB lookups.
//
// Why 8 chars: short enough to share verbally ("type ABC12345"), long
// enough to keep collision rate near zero up to ~100k users (uppercase
// alnum gives 36^8 ≈ 2.8 trillion possibilities; birthday-collision
// risk is negligible at our scale).
//
// Why uppercase: visually distinct from URL params and tokens elsewhere
// in our system. Easier to spot in screenshots and shared messages.

// Generate a deterministic peer ref code from a username.
// Returns null for invalid/empty/guest usernames — those should never
// have a public ref code (guests are local-only, ref codes are global).
export function generatePersonalRefCode(username) {
  if (!username || typeof username !== 'string') return null;
  const trimmed = username.trim();
  if (!trimmed || trimmed.startsWith('guest_')) return null;
  if (typeof btoa !== 'function') return null; // SSR/Node fallback
  try {
    return btoa(trimmed).replace(/[=+/]/g, '').substring(0, 8).toUpperCase();
  } catch (_) {
    return null;
  }
}

// Reward formula — kept in lockstep with the SQL function
// `public.get_my_referral_stats` and the my-referral-stats Edge Function.
// Three places enforce the same numbers; if you change them, change all
// three. Test coverage in tests/referrals.test.js asserts they agree.
export const REFERRAL_TIERS = [
  { signups: 1, days: 3,  label: '+3 days Pro' },
  { signups: 3, days: 7,  label: '+7 days Pro' },
  { signups: 5, days: 14, label: '+14 days Pro' },
];
export const REFERRAL_PRO_CONVERSION_BONUS_DAYS = 30;

// Returns the total Pro days earned for a (signups, conversions) count.
// Tiered milestone (highest tier reached, not cumulative) plus a flat
// per-conversion bonus. Same formula as the SQL function.
export function calculateProDaysEarned(signups, conversions) {
  const s = Math.max(0, Number(signups) || 0);
  const c = Math.max(0, Number(conversions) || 0);
  let tierDays = 0;
  for (const t of REFERRAL_TIERS) {
    if (s >= t.signups) tierDays = t.days;
  }
  return tierDays + c * REFERRAL_PRO_CONVERSION_BONUS_DAYS;
}

// Compute the next milestone the user is working toward. Returns null
// once they've passed every signup tier (their next reward only comes
// from a friend going Pro at that point).
export function nextReferralMilestone(signups) {
  const s = Math.max(0, Number(signups) || 0);
  for (const t of REFERRAL_TIERS) {
    if (s < t.signups) {
      return { at: t.signups, reward: t.label, remaining: t.signups - s };
    }
  }
  return null;
}
