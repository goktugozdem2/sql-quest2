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
