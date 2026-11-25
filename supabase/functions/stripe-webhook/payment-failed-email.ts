// The failed-charge email and the in-app fix link (M-01, 2026-11-22;
// docs/plans/monetization-ideas-2026-11-22.md, "M-01" and section 1c).
//
// Of the four trials that reached their day-7 charge without cancelling
// (2026-10-01 → 11-22), the first charge failed for two: one recovered after
// 16 days, one ($99 annual) is still lost. The email those people got said
// "just reply and I'll send you a secure Stripe link" and called a trial's
// first charge a "renewal"; the app said nothing. Now the email carries the
// invoice's own Stripe page (`hosted_invoice_url`, where the open invoice is
// paid with another card) as its button, the Customer Portal as the second
// line, and the reply line last.
//
// Pure, no imports, so tests/stripe-webhook-payment-failed.test.js runs it
// under vitest and the function runs it under Deno (the customer-row.ts way).

// The Customer Portal's no-code login link. The same constant lives in
// src/app.jsx (STRIPE_CUSTOMER_PORTAL_URL); a test binds the two. The webhook
// lets a function secret of the same name override it.
export const PORTAL_URL_DEFAULT = "https://billing.stripe.com/p/login/eVq6oI9WN11G31I9YodMI00";

// A link in a money email or on the app's billing line is only ever Stripe's
// own hosted invoice page: https, host exactly invoice.stripe.com, no
// credentials, no port. Anything else — a missing field, http, a look-alike
// host — answers null, and the caller leaves the button out. The app's half is
// src/utils/billing-issue.js (isStripeInvoiceUrl); a test runs both on one table.
export function stripeInvoiceUrl(url: unknown): string | null {
  if (typeof url !== "string" || url.length === 0 || url.length > 2048) return null;
  let u: URL;
  try { u = new URL(url); } catch (_) { return null; }
  if (u.protocol !== "https:" || u.hostname !== "invoice.stripe.com") return null;
  if (u.username || u.password || u.port) return null;
  return u.href;
}

// The first charge after a trial: the invoice's period starts where the trial
// ended (a later renewal starts a whole interval after it). Six hours of slack,
// the rule invoice.payment_succeeded has used since 2026-09-26.
export function startsAtTrialEnd(periodStart: number | null | undefined, trialEnd: number | null | undefined): boolean {
  if (!trialEnd || !periodStart) return false;
  return Math.abs(periodStart - trialEnd) <= 6 * 3600;
}

// What a failed charge means for access (A3, 2026-11-25;
// docs/reads/errors-2026-11-25.md). "No next attempt" used to be read as
// "Stripe gave up", and access was revoked on it. But Stripe also leaves
// next_payment_attempt empty on a charge it never attempted under the retry
// schedule (attempt_count 0), for example one that waits for the customer to
// confirm it on the invoice page. On 2026-11-24 a trial's first charge failed
// that way (attempt_count 0, next attempt null) and Pro was revoked within the
// hour of the trial converting. Three states:
//   retrying  — a next attempt is scheduled; touch nothing.
//   gave_up   — no next attempt after at least one counted attempt; the
//               retries ran out, so access ends here.
//   waiting   — no next attempt and no counted attempt; the invoice is open
//               and waits for the customer. Nothing is revoked: proExpiry
//               already stops at the period paid for (a trial's end), with
//               pro-access.js's three read-only days on top, exactly as while
//               retrying. Paid, invoice.payment_succeeded extends it; never
//               paid, the subscription ends the usual way.
export type FailedChargeState = "retrying" | "gave_up" | "waiting";
export function failedChargeState(nextPaymentAttempt: unknown, attemptCount: unknown): FailedChargeState {
  if (nextPaymentAttempt) return "retrying";
  return (Number(attemptCount) || 0) > 0 ? "gave_up" : "waiting";
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>
)[c]);

export type PaymentFailedEmailInput = {
  username?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  billingReason?: string | null;
  afterTrial?: boolean;
  willRetry?: boolean;
  // failedChargeState() === "waiting": no retry is scheduled, nothing revoked.
  waiting?: boolean;
  invoiceUrl?: string | null;
  portalUrl?: string | null;
};

// kind 'trial_first_charge' only for a subscription_cycle invoice that follows
// a trial; every other failed charge (a later cycle, a plan change) is a
// renewal. The checkout decline (subscription_create) never reaches here: the
// webhook records it and sends nothing.
export function paymentFailedEmail(input: PaymentFailedEmailInput) {
  const kind = input.billingReason === "subscription_cycle" && input.afterTrial === true
    ? "trial_first_charge" : "renewal";
  const amount = `${((Number(input.amountCents) || 0) / 100).toFixed(2)} ${String(input.currency || "usd").toUpperCase()}`;
  const invoiceUrl = stripeInvoiceUrl(input.invoiceUrl);
  const portalUrl = typeof input.portalUrl === "string" && /^https:\/\/billing\.stripe\.com\//.test(input.portalUrl)
    ? input.portalUrl : PORTAL_URL_DEFAULT;

  const subject = kind === "trial_first_charge"
    ? "From SQL Quest's founder — the first charge after your free week didn't go through"
    : "From SQL Quest's founder — your Pro renewal charge didn't go through";

  const what = kind === "trial_first_charge"
    ? `Your free week of Pro has ended, and the first charge (${amount}) didn't go through.`
    : `Your Pro renewal charge (${amount}) didn't go through.`;

  const retryLine = input.willRetry
    ? "Stripe will retry the charge automatically over the next few days — if the card just needs a top-up, you don't have to do anything."
    : input.waiting
      ? "Stripe couldn't finish this charge on its own and won't retry it by itself, so it is waiting for you on the invoice page."
      : "Stripe has stopped retrying, so Pro is paused until this charge is paid.";

  const p = (html: string) => `<p style="font-size: 15px; line-height: 1.8;">${html}</p>`;
  const parts: string[] = [
    p(`Hi ${esc(input.username || "there")},`),
    p(`I'm Göktuğ — I build SQL Quest. ${esc(what)} This is almost always a card that expired or a bank being cautious, not something you did.`),
    p(esc(retryLine)),
  ];
  if (invoiceUrl) {
    parts.push(p(`To pay it now with another card, open Stripe's page for this invoice — once it is paid, Pro carries on as before:`));
    parts.push(`<p style="margin: 20px 0;"><a href="${esc(invoiceUrl)}" data-role="invoice" style="display: inline-block; background: #7c3aed; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 20px; border-radius: 8px;">Fix it in Stripe</a></p>`);
    parts.push(p(`To change the card for future charges, or to cancel, use your billing page: <a href="${esc(portalUrl)}" data-role="portal">manage your plan in Stripe</a>.`));
  } else {
    parts.push(p(`To update the card, or to cancel, use your billing page: <a href="${esc(portalUrl)}" data-role="portal">manage your plan in Stripe</a>.`));
  }
  parts.push(p(`If anything here looks wrong, or the card keeps failing, just reply to this email — it comes straight to me.`));
  parts.push(p(`Göktuğ<br>Founder, SQL Quest`));

  const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
          ${parts.join("\n          ")}
        </div>`;
  return { kind, subject, html, invoiceUrl };
}
