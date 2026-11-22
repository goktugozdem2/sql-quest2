// An expired Stripe session gets its recovery link (M-11, 2026-11-22;
// docs/plans/monetization-ideas-2026-11-22.md, "M-11" and section 1b).
//
// 23 Checkout Sessions expired unpaid in the 30 days to 11-22 and the
// checkout-abandon mail sent people to the plain app, where they had to find
// the modal, pick the plan again and wait for a new session. A session created
// with `after_expiration.recovery.enabled` gets, on expiry, a URL that opens a
// COPY of itself (same price, same trial offer) — one click back to the card
// form. Stripe keeps that URL usable for 30 days
// (`after_expiration.recovery.expires_at`).
//
// Used by three places:
//   - create-checkout-session asks for the recovery URL (recoveryParams);
//   - stripe-webhook stores it on `pro_checkout_expired` (expiredSessionMeta);
//   - checkout-abandon puts it on the mail's button (recoveryDecision), after
//     reading the session back from Stripe, because `pro_events` accepts
//     anon inserts and a stored row alone is not proof the link is ours.
//
// Pure, no imports, so tests/checkout-recovery.test.js runs it under vitest
// and the functions run it under Deno (the payment-failed-email.ts way).

// Stripe's documented hosts for a recovery URL. The API reference's example
// is `https://buy.stripe.com/r/live_…` (docs.stripe.com/payments/checkout/
// abandoned-carts, read 2026-11-22); a Checkout Session's own `url` is on
// checkout.stripe.com. Exact host match, https only — a look-alike host, http,
// credentials or a port answer null and the mail keeps today's link.
export const RECOVERY_HOSTS = ["checkout.stripe.com", "buy.stripe.com"];

export function stripeRecoveryUrl(url: unknown): string | null {
  if (typeof url !== "string" || url.length === 0 || url.length > 2048) return null;
  let u: URL;
  try { u = new URL(url); } catch (_) { return null; }
  if (u.protocol !== "https:" || !RECOVERY_HOSTS.includes(u.hostname)) return null;
  if (u.username || u.password || u.port) return null;
  return u.href;
}

// A Checkout Session id, so a forged row cannot steer the Stripe read to
// another path.
export const SESSION_ID_RE = /^cs_(live|test)_[A-Za-z0-9]{10,200}$/;

// The session params (create-checkout-session). Stripe refuses `discounts`
// together with `allow_promotion_codes` on a session, and the recovered
// session is a copy of this one — so a session that already carries a
// discount asks for no promo field on its copy (conservative: the documented
// conflict is never risked, and the copy keeps the discount it was given).
export function recoveryParams(hasDiscounts: boolean) {
  return { recovery: { enabled: true, allow_promotion_codes: !hasDiscounts } };
}

type SessionLike = {
  after_expiration?: { recovery?: { url?: unknown; expires_at?: unknown } | null } | null;
  customer_details?: { email?: unknown } | null;
  customer_email?: unknown;
  consent?: { promotions?: unknown } | null;
  client_reference_id?: unknown;
  status?: unknown;
  id?: unknown;
  metadata?: Record<string, unknown> | null;
};

// What the webhook adds to `pro_checkout_expired`. Never an address: only
// whether Stripe holds one, and whether it was the one we prefilled.
//   recovery_url           — Stripe's URL, kept only if stripeRecoveryUrl passes
//   recovery_expires_at    — ISO time the URL stops working (Stripe: 30 days)
//   stripe_email_present   — Stripe has an address the person typed on its page
//                            (customer_details.email) and we did not prefill
//   prefilled_email        — we sent customer_email (an address we already hold)
//   promotions_consent     — consent.promotions === 'opt_in' (only ever true if
//                            consent_collection is turned on — it is not)
// Stripe's docs: an expired session's payload carries customer_details.email
// only when the person gave promotional consent, so with consent collection
// off `stripe_email_present` will almost always be false.
export function expiredSessionMeta(session: SessionLike) {
  const rec = session?.after_expiration?.recovery || null;
  const url = stripeRecoveryUrl(rec?.url);
  const exp = typeof rec?.expires_at === "number" && rec.expires_at > 0 ? rec.expires_at : null;
  const typed = typeof session?.customer_details?.email === "string" && session.customer_details.email.includes("@");
  const prefilled = typeof session?.customer_email === "string" && session.customer_email.includes("@");
  return {
    recovery_url: url,
    recovery_expires_at: url && exp ? new Date(exp * 1000).toISOString() : null,
    stripe_email_present: typed && !prefilled,
    prefilled_email: prefilled,
    promotions_consent: session?.consent?.promotions === "opt_in",
  };
}

export type ExpiredRow = { created_at: string; metadata: unknown };

const parseMeta = (m: unknown): Record<string, unknown> => {
  if (m && typeof m === "object") return m as Record<string, unknown>;
  if (typeof m !== "string") return {};
  try {
    const once = JSON.parse(m);
    if (typeof once === "string") return JSON.parse(once) || {};
    return once || {};
  } catch (_) { return {}; }
};

// The person's latest expired session that belongs to THIS abandon: opened at
// or after the checkout click (minus a few minutes for clock skew). An older
// expired session is a different visit and its link is not offered.
export const CLICK_SLACK_MS = 10 * 60 * 1000;
export function latestExpiredForClick(rows: ExpiredRow[], clickAt: string) {
  const click = Date.parse(clickAt);
  let best: { at: number; meta: Record<string, unknown> } | null = null;
  for (const r of rows || []) {
    const meta = parseMeta(r.metadata);
    const at = Date.parse(r.created_at);
    if (!Number.isFinite(at)) continue;
    const opened = typeof meta.opened_at === "string" ? Date.parse(meta.opened_at) : NaN;
    if (Number.isFinite(click) && Number.isFinite(opened) && opened < click - CLICK_SLACK_MS) continue;
    if (!best || at > best.at) best = { at, meta };
  }
  return best ? best.meta : null;
}

// Whether the mail's button opens the recovery URL, and why not when it does
// not. `session` is the session as read back from Stripe at send time (null
// when the read failed or was skipped). The URL always comes from Stripe's
// copy, never from the stored row alone.
export function recoveryDecision(input: {
  username: string;
  row: Record<string, unknown> | null;
  session: SessionLike | null;
  now: number;
  trialOrPaidBefore: boolean;
}): { use: boolean; url: string | null; expiresAt: string | null; why: string } {
  const no = (why: string) => ({ use: false, url: null, expiresAt: null, why });
  if (!input.row) return no("no_expired_session");
  if (!stripeRecoveryUrl(input.row.recovery_url)) return no("no_recovery_url");
  // A recovered session is a copy, trial included, and bypasses the
  // one-trial-per-account check create-checkout-session makes. Anyone who has
  // already started a trial or paid gets today's link instead.
  if (input.trialOrPaidBefore) return no("trial_or_paid_before");
  const s = input.session;
  if (!s) return no("stripe_read_failed");
  if (s.id !== input.row.stripe_session_id) return no("session_mismatch");
  if (s.client_reference_id !== input.username) return no("username_mismatch");
  if (s.status !== "expired") return no("not_expired");
  const url = stripeRecoveryUrl(s.after_expiration?.recovery?.url);
  if (!url) return no("no_recovery_url");
  const exp = s.after_expiration?.recovery?.expires_at;
  if (typeof exp !== "number" || exp * 1000 <= input.now) return no("recovery_expired");
  return { use: true, url, expiresAt: new Date(exp * 1000).toISOString(), why: "recovery" };
}

// Mailing an address we only got from Stripe (typed on Stripe's page, never
// given to us) is the founder's consent decision (plan M-11, Risks). OFF.
// Turning it on is a one-line change here plus a deploy of checkout-abandon,
// and only means something if consent_collection.promotions is also turned
// on in create-checkout-session — without it Stripe does not return the
// address of an expired session at all.
export const MAIL_STRIPE_ONLY_ADDRESSES = false;
