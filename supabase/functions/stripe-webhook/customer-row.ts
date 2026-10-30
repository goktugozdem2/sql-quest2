// Which users row is "this Stripe customer" (2026-10-30).
//
// A guest who starts a trial and then registers leaves TWO rows carrying the
// same `stripeCustomerId`: the guest row the checkout was opened from, and the
// account the guest progress (and the plan) was carried into. Every lookup in
// stripe-webhook took `users[0]` from an unordered PostgREST result, so a
// renewal or the day-7 charge after a trial could extend Pro on the
// abandoned guest row while the person who paid stayed lapsed. Seen live in
// October 2026: a trial started as a guest and was then registered; both
// rows held the customer id, and the subscription.updated row landed on the
// account only by the order the database happened to return.
//
// Rule: a registered account beats a guest row; among equals, the row the
// subscription's own metadata names; then the most recently updated. Pure,
// no imports, so tests/stripe-webhook-customer-row.test.js runs it under
// vitest and the function runs it under Deno.

export type CustomerRow = { username: string; updated_at?: string | null; data?: Record<string, unknown> | null };

export const isGuestUsername = (u: unknown): boolean => typeof u === "string" && /^guest_/.test(u);

export function pickCustomerRow<T extends CustomerRow>(rows: T[] | null | undefined, hintUsername: string | null = null): T | null {
  const list = Array.isArray(rows) ? rows.filter((r) => r && typeof r.username === "string") : [];
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  const time = (r: T) => {
    const t = Date.parse(String(r.updated_at ?? ""));
    return Number.isFinite(t) ? t : 0;
  };
  return list.slice().sort((a, b) =>
    (isGuestUsername(a.username) ? 1 : 0) - (isGuestUsername(b.username) ? 1 : 0)
    || (b.username === hintUsername ? 1 : 0) - (a.username === hintUsername ? 1 : 0)
    || time(b) - time(a)
    || a.username.localeCompare(b.username)
  )[0];
}
