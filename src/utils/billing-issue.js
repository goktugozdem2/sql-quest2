// The failed charge's fix link, in the app (M-01, 2026-11-22;
// docs/plans/monetization-ideas-2026-11-22.md, "M-01" and section 1c).
//
// Of the four trials that reached their day-7 charge without cancelling, the
// first charge failed for two: one recovered after 16 days, one ($99 annual)
// is still lost. The app said nothing. When a subscription goes past_due,
// stripe-webhook writes `users.data.billingIssue = { since, invoiceUrl,
// subscriptionId }` and clears it on active and on subscription.deleted; the
// field is server-owned (sq_save_user keeps the row's value, migration
// 20261122130000). This turns it into one line under the header: "Your card
// didn't go through — fix it in Stripe", opening the open invoice's own
// Stripe page, where the person pays it with another card.
//
// The link is only ever https://invoice.stripe.com/… — anything else (no
// field, no URL, http, a look-alike host) renders nothing. The webhook's half
// is supabase/functions/stripe-webhook/payment-failed-email.ts
// (stripeInvoiceUrl); tests/billing-issue.test.js runs both on one table.
//
// Pure: the record is passed in.

export const BILLING_ISSUE_TEXT = "Your card didn't go through — fix it in Stripe";

export function isStripeInvoiceUrl(url) {
  if (typeof url !== 'string' || url.length === 0 || url.length > 2048) return false;
  let u;
  try { u = new URL(url); } catch { return false; }
  return u.protocol === 'https:' && u.hostname === 'invoice.stripe.com' && !u.username && !u.password && !u.port;
}

export function billingIssueLine(userData) {
  const issue = userData && typeof userData === 'object' ? userData.billingIssue : null;
  if (!issue || typeof issue !== 'object') return null;
  if (!isStripeInvoiceUrl(issue.invoiceUrl)) return null;
  return { text: BILLING_ISSUE_TEXT, url: new URL(issue.invoiceUrl).href };
}

// Whole days since the webhook wrote the field (event metadata only).
export function billingIssueDays(userData, now = Date.now()) {
  const t = Date.parse(String(userData?.billingIssue?.since ?? ''));
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 86400000)) : null;
}
