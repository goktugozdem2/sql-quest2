// The Debug pack in the webhook (2026-11-23, founder's decision PR #251):
// the Debug set sold on its own, $9 once (India $3). Pure, no imports, so
// tests/debug-pack.test.js runs it under vitest and index.ts runs it under
// Deno — the same arrangement as ./customer-row.ts.
//
// The rules:
//   - A pack session is a `mode: 'payment'` session whose metadata says
//     `product=debug_pack`, OR whose line item is one of the pack's prices.
//     Either one routes it here and NEVER into the Pro activation below it
//     in index.ts: an unmapped $9/$3 one-time price would otherwise fall
//     through the amount fallback and be sold as a month of Pro.
//   - Ownership is `users.data.debugPackOwned = { at, sessionId,
//     paymentIntent, amount, currency }`. Nothing else on the row changes:
//     not proStatus, not proType/proExpiry/proAutoRenew, not stripeCustomerId
//     or stripeSessionId (the Pro activation's idempotency key).
//   - Idempotent on the session id: a redelivery finds its own sessionId on
//     the row and changes nothing (and writes no second purchase row).
//   - A full refund of the pack's payment clears the field; nothing else.

export const DEBUG_PACK_PRODUCT = "debug_pack";

export type PackRecord = {
  at: string;
  sessionId: string;
  paymentIntent: string | null;
  amount: number | null;
  currency: string | null;
};

type SessionLike = {
  id?: string | null;
  mode?: string | null;
  metadata?: Record<string, string> | null;
  payment_status?: string | null;
  payment_intent?: string | { id?: string } | null;
  amount_total?: number | null;
  currency?: string | null;
};

/** The pack's price ids from the function secrets (unset ones dropped). */
export function packPriceIds(env: (k: string) => string | undefined): string[] {
  return ["STRIPE_PRICE_DEBUG_PACK", "STRIPE_PRICE_DEBUG_PACK_IN"]
    .map((k) => env(k) || "")
    .filter((v) => v.length > 0);
}

/** Is this checkout session the Debug pack? Metadata or the price decides. */
export function isDebugPackSession(session: SessionLike | null | undefined, priceId: string | null | undefined, packPrices: string[]): boolean {
  if (!session) return false;
  if ((session.metadata || {}).product === DEBUG_PACK_PRODUCT) return true;
  return !!priceId && packPrices.includes(priceId);
}

const piId = (pi: SessionLike["payment_intent"]): string | null =>
  typeof pi === "string" ? pi : (pi && typeof pi.id === "string" ? pi.id : null);

/** The record the webhook writes, from the session. `now` is injectable for tests. */
export function packRecordFrom(session: SessionLike, now: Date = new Date()): PackRecord {
  return {
    at: now.toISOString(),
    sessionId: String(session.id || ""),
    paymentIntent: piId(session.payment_intent),
    amount: typeof session.amount_total === "number" ? session.amount_total : null,
    currency: typeof session.currency === "string" ? session.currency : null,
  };
}

/**
 * Apply a paid pack session to a user's `data`. Returns the new data and
 * whether anything changed. Never mutates the input; touches one key only.
 * A row that already holds THIS session is unchanged (redelivery). A row
 * that holds an EARLIER pack keeps it (a second purchase of the same thing
 * changes no access; the second session is reported, not written).
 */
export function applyPackPurchase(
  data: Record<string, unknown> | null | undefined,
  record: PackRecord,
): { data: Record<string, unknown>; changed: boolean; already: "same_session" | "owned" | null } {
  const base: Record<string, unknown> = data && typeof data === "object" ? { ...data } : {};
  const prev = base.debugPackOwned as Partial<PackRecord> | undefined;
  if (prev && typeof prev === "object" && prev.sessionId === record.sessionId) {
    return { data: base, changed: false, already: "same_session" };
  }
  if (prev && typeof prev === "object" && typeof prev.sessionId === "string" && prev.sessionId) {
    return { data: base, changed: false, already: "owned" };
  }
  base.debugPackOwned = { ...record };
  return { data: base, changed: true, already: null };
}

/**
 * A refund of the pack's payment. Clears `debugPackOwned` only on a FULL
 * refund of the payment the record names; a partial refund, or a refund of
 * another payment, changes nothing. Never touches any other key.
 */
export function applyPackRefund(
  data: Record<string, unknown> | null | undefined,
  paymentIntent: string | null,
  full: boolean,
): { data: Record<string, unknown>; cleared: boolean } {
  const base: Record<string, unknown> = data && typeof data === "object" ? { ...data } : {};
  const prev = base.debugPackOwned as Partial<PackRecord> | undefined;
  if (!full || !paymentIntent || !prev || typeof prev !== "object" || prev.paymentIntent !== paymentIntent) {
    return { data: base, cleared: false };
  }
  delete base.debugPackOwned;
  return { data: base, cleared: true };
}
