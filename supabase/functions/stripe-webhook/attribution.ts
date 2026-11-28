// Whose event is this, and may the webhook write to that row (2026-11-28).
//
// Every Checkout Session makes a NEW Stripe customer (create-checkout-session
// passes no `customer`), and checkout.session.completed writes that new id
// over the row's `stripeCustomerId`. A person who buys a second subscription
// while the first is still alive therefore loses the first one's mapping: its
// retries, its recovery payment, its renewals and its end all looked up a
// customer id no row carries any more, and were written as username
// "unknown" (or, for a paid invoice, not written at all). Seen live: a trial
// whose day-7 charge failed on 10-18, a second purchase on 10-23, and the
// first subscription's retries (10-23, 10-29), its recovery payment (11-03)
// and, by inference, its 11-18 renewal all fell off the account
// (docs/reads/india-checkout-2026-11-28.md §7; PR fix/webhook-mapping-decline-codes).
// The same "unknown" also caught events that race checkout.session.completed
// (a subscription going incomplete → active a second before the row gets its
// customer id) and checkout declines on a customer minutes old.
//
// Rule: the customer id decides the row the webhook may WRITE to (grant,
// extend, revoke, billingIssue) — unchanged. When no row carries the customer
// id, the event is still ATTRIBUTED to the person the subscription names: its
// own metadata (create-checkout-session writes `username` there), then the
// Checkout Session that created it (`client_reference_id`, which Payment
// Links carry too). An attributed-only match never writes: a second
// subscription must not revoke or extend the access the first one holds.
// Pure, no imports, so vitest runs what Deno runs
// (tests/stripe-webhook-attribution.test.js).

export type MatchedBy = "customer" | "subscription_metadata" | "checkout_session";

export type Attribution<T> = {
  // the row the webhook may write to — only ever a customer-id match
  row: T | null;
  // the username the pro_events row is written under
  username: string | null;
  matchedBy: MatchedBy | null;
};

// The app's own username shape (create-checkout-session's USERNAME_RE).
const USERNAME_RE = /^[A-Za-z0-9_.@+-]{1,64}$/;

export function cleanUsername(value: unknown): string | null {
  return typeof value === "string" && USERNAME_RE.test(value) ? value : null;
}

// The username a Stripe object's subscription metadata names. Reads a
// Subscription (`metadata`), an Invoice (`subscription_details.metadata`, then
// its first line's `metadata`) — whichever the object is.
export function subscriptionUsername(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as {
    metadata?: Record<string, unknown> | null;
    subscription_details?: { metadata?: Record<string, unknown> | null } | null;
    lines?: { data?: Array<{ metadata?: Record<string, unknown> | null }> } | null;
  };
  return cleanUsername(o.subscription_details?.metadata?.username)
    || cleanUsername(o.metadata?.username)
    || cleanUsername(o.lines?.data?.[0]?.metadata?.username)
    || null;
}

export function attributeEvent<T extends { username: string }>(
  row: T | null | undefined,
  metadataUsername: string | null,
  sessionUsername: string | null = null,
): Attribution<T> {
  if (row && typeof row.username === "string") return { row, username: row.username, matchedBy: "customer" };
  const meta = cleanUsername(metadataUsername);
  if (meta) return { row: null, username: meta, matchedBy: "subscription_metadata" };
  const ref = cleanUsername(sessionUsername);
  if (ref) return { row: null, username: ref, matchedBy: "checkout_session" };
  return { row: null, username: null, matchedBy: null };
}
