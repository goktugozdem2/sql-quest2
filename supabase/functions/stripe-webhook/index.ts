// Supabase Edge Function: Stripe Webhook Handler
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Stripe endpoint events (dashboard → Developers → Webhooks): checkout.session.completed,
// invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted,
// checkout.session.expired, customer.subscription.updated, and since
// 2026-09-20 charge.refunded. An event the endpoint does not subscribe to is
// an event this file never sees — adding a branch here is half the change.
//
// Trials (2026-09-26, with create-checkout-session): a card-required 7-day
// trial arrives as checkout.session.completed on a TRIALING subscription with
// amount_total 0. That grants Pro to the trial end and logs
// `pro_trial_started` — never `pro_purchase_completed`. The money arrives as
// invoice.payment_succeeded (billing_reason subscription_cycle) at the trial
// end, and THAT logs the one `pro_purchase_completed` (after_trial: true).
// A trial cancelled before paying logs `pro_trial_cancelled` and ends Pro at
// the trial end. No new endpoint events are needed for any of it.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

async function logProEvent(event: string, username: string | null, reason: string, metadata: Record<string, unknown> = {}) {
  try {
    const { error } = await supabase.from("pro_events").insert({
      event,
      username: username || "unknown",
      reason,
      metadata: JSON.stringify(metadata),
      created_at: new Date().toISOString(),
    });
    if (error) console.warn("[stripe-webhook] pro_events insert failed:", error.message);
  } catch (err) {
    console.warn("[stripe-webhook] pro_events insert failed:", err);
  }
}

// One lookup, one revocation. Four branches need "who is this Stripe
// customer" and three need "take Pro away now"; before 2026-09-20 each one
// carried its own copy and they had drifted (one forgot proAutoRenew, which
// is the flag `lapsed-pro` segments on).
async function findUserByCustomer(customerId: string | null) {
  if (!customerId) return null;
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .filter("data->>stripeCustomerId", "eq", customerId);
  return users && users.length > 0 ? users[0] : null;
}

// proType is deliberately KEPT: pro-access.js needs it to tell a lapsed
// subscriber from someone who never had Pro, and the win-back copy depends
// on that difference.
async function revokeProAccess(userRecord: { username: string; data: Record<string, unknown> } | null) {
  if (!userRecord?.data) return false;
  const userData = userRecord.data as Record<string, unknown>;
  const had = userData.proStatus === true;
  userData.proStatus = false;
  userData.proExpiry = new Date().toISOString();
  userData.proAutoRenew = false;
  await supabase
    .from("users")
    .update({ data: userData, updated_at: new Date().toISOString() })
    .eq("username", userRecord.username);
  return had;
}

// Plan durations, in ONE place. Activation and renewal both read this: the
// renewal branch used to carry its own `if monthly +30 else if annual +365`,
// so any plan it did not name was extended by ZERO days — a quarterly
// subscriber would have paid every three months and watched their access
// expire anyway. Add a plan here and both paths learn it.
const PLAN_DAYS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  annual: 365,
  lifetime: 36500,
};

// Product/price ID to plan mapping - set via Supabase Edge Function secrets:
//   STRIPE_PRODUCT_MONTHLY, STRIPE_PRODUCT_QUARTERLY, STRIPE_PRODUCT_ANNUAL,
//   STRIPE_PRODUCT_LIFETIME (and the STRIPE_PRICE_* twins)
//
// `quarterly` is $49 every 3 months (2026-09-14). It started life as a
// one-time "Interview Pass" the same day and became a subscription before it
// shipped — the founder's call: monthly, quarterly, annual.
const plan = (type: string) => ({ type, durationDays: PLAN_DAYS[type] });

const PRODUCT_TO_PLAN: Record<string, { type: string; durationDays: number }> = {
  [Deno.env.get("STRIPE_PRODUCT_MONTHLY") || ""]: plan("monthly"),
  [Deno.env.get("STRIPE_PRODUCT_QUARTERLY") || ""]: plan("quarterly"),
  [Deno.env.get("STRIPE_PRODUCT_ANNUAL") || ""]: plan("annual"),
  [Deno.env.get("STRIPE_PRODUCT_LIFETIME") || ""]: plan("lifetime"),
};

// The India prices (2026-09-26) are separate Price objects on the same plans.
// They are mapped by id here AND caught by the interval rule below, because
// the amount fallback would otherwise read a regional annual (well under
// $99) as a MONTH of access.
const PRICE_TO_PLAN: Record<string, { type: string; durationDays: number }> = {
  [Deno.env.get("STRIPE_PRICE_MONTHLY") || ""]: plan("monthly"),
  [Deno.env.get("STRIPE_PRICE_QUARTERLY") || ""]: plan("quarterly"),
  [Deno.env.get("STRIPE_PRICE_ANNUAL") || ""]: plan("annual"),
  [Deno.env.get("STRIPE_PRICE_LIFETIME") || ""]: plan("lifetime"),
  [Deno.env.get("STRIPE_PRICE_MONTHLY_IN") || ""]: plan("monthly"),
  [Deno.env.get("STRIPE_PRICE_ANNUAL_IN") || ""]: plan("annual"),
};
delete PRICE_TO_PLAN[""];
delete PRODUCT_TO_PLAN[""];

// The plan a recurring price bills for, read from the price itself. Runs
// AFTER the id maps and BEFORE the amount fallback: a price whose id no
// secret names still says how often it bills, and that is the truth the
// amount only guesses at. (The amount fallback turned any unmapped price
// under $49 into 30 days — a $39/yr regional annual would have been sold as
// a month.) A one-time price has no `recurring` and falls through.
function planFromInterval(price: Stripe.Price | null | undefined) {
  const r = price?.recurring;
  if (!r) return null;
  const count = r.interval_count || 1;
  if (r.interval === "year" && count === 1) return plan("annual");
  if (r.interval === "month" && count === 3) return plan("quarterly");
  if (r.interval === "month" && count === 1) return plan("monthly");
  return null;
}

// A user record's affiliate conversion row. Written when money first
// arrives: at checkout for a paid purchase, at the first charge for a trial.
async function recordReferralConversion(
  userRecord: { username: string },
  userData: Record<string, unknown>,
  email: string | null,
  planType: string,
  amountCents: number | null,
  metadata: Record<string, unknown>,
) {
  // Affiliate attribution: if this user signed up via a referrer, log
  // the conversion. We read userData.refCode (stamped at signup, see
  // src/app.jsx → saveUserData) so this never depends on the client
  // round-tripping the ref code through Stripe metadata. Best-effort —
  // a missing refCode is normal (most users come direct).
  try {
    if (userData.refCode && typeof userData.refCode === "string") {
      await supabase.from("referrals").insert({
        ref_code:     userData.refCode.toLowerCase(),
        event_type:   "pro_conversion",
        username:     userRecord.username,
        email:        email || (userData.email as string) || null,
        plan_type:    planType,
        amount_cents: amountCents,
        metadata: {
          ...metadata,
          ref_code_at:       userData.refCodeAt || null,
          auto_renew:        userData.proAutoRenew,
        },
      });
    }
  } catch (err) {
    // Conversion logging is supplementary — never fail the Pro
    // activation because the referrals table couldn't be written.
    console.error("[stripe-webhook] referral insert failed:", err);
  }
}

// A plan that does not renew. Stripe sends no invoice for these, so
// proAutoRenew must be false — the 2026-09-07 incident was exactly an
// auto-renew flag on something that never renewed, pushing proExpiry forward
// on every login (src/utils/pro-access.js). Quarterly is NOT here: it bills
// every three months like the other two subscriptions.
const ONE_TIME_PLANS = new Set(["lifetime"]);

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret");
    return new Response("Webhook signature missing", { status: 400 });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature. Must be the async variant: Deno's edge
    // runtime only exposes SubtleCrypto, and the sync constructEvent throws
    // "SubtleCryptoProvider cannot be used in a synchronous context" —
    // which our catch turned into a 400 on every real delivery.
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    
    console.log(`Received event: ${event.type}`);

    // Handle checkout.session.completed (payment successful)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const email = session.customer_details?.email?.toLowerCase();
      const username = session.client_reference_id; // We pass this from the app
      
      if (!email && !username) {
        console.error("No email or username found in session");
        return new Response("No user identifier", { status: 400 });
      }

      // Get line items to determine the plan
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;
      const productId = lineItems.data[0]?.price?.product as string;
      
      // Determine plan type: the id maps, then the price's own billing
      // interval, and only then the amount.
      let planInfo = PRICE_TO_PLAN[priceId] || PRODUCT_TO_PLAN[productId]
        || planFromInterval(lineItems.data[0]?.price);
      
      // Fallback: determine by amount. Order matters — the old
      // `else { monthly }` meant ANY unmapped amount became 30 days, so a $49
      // quarterly would have taken the money and granted a month. If the
      // secret is unset the amount has to carry it, and it says so in the log
      // rather than guessing quietly.
      if (!planInfo) {
        const amount = session.amount_total || 0;
        if (amount >= 19900) {
          planInfo = plan("lifetime");
        } else if (amount >= 9900) {
          planInfo = plan("annual");
        } else if (amount >= 4900) {
          planInfo = plan("quarterly");
        } else {
          planInfo = plan("monthly");
        }
        console.warn(`No price/product mapping for ${priceId || productId}; fell back to ${planInfo.type} on amount ${amount}`);
      }

      // A trial? Only a $0 subscription checkout can be one, so the extra
      // Stripe read happens only then — a paid checkout never waits on it.
      // If the read fails we answer non-2xx and Stripe redelivers: guessing
      // here would either sell a trial as a purchase or a purchase as a trial.
      let trialEnd: number | null = null;
      const subscriptionId: string | null = (session.subscription as string) || null;
      if (session.mode === "subscription" && subscriptionId && (session.amount_total ?? 0) === 0) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub.status === "trialing" && sub.trial_end) trialEnd = sub.trial_end;
      }
      const isTrial = trialEnd !== null;

      // Calculate expiry date. A trial runs to its own end; the first charge
      // (invoice.payment_succeeded, below) extends it by the plan.
      const expiry = isTrial ? new Date((trialEnd as number) * 1000) : new Date();
      if (!isTrial) expiry.setDate(expiry.getDate() + planInfo.durationDays);

      console.log(`Activating ${planInfo.type} plan for ${username || email}, expires: ${expiry.toISOString()}`);

      // Find user by username first, then by email
      let userData = null;
      let userRecord = null;

      if (username) {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("username", username)
          .single();
        userRecord = data;
        userData = data?.data;
      }

      if (!userRecord && email) {
        // Try by email column first
        let result = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();
        
        if (!result.data) {
          // Try by data->email
          result = await supabase
            .from("users")
            .select("*")
            .eq("data->>email", email)
            .single();
        }
        
        userRecord = result.data;
        userData = result.data?.data;
      }

      if (!userRecord || !userData) {
        console.error(`User not found: ${username || email}`);
        // Store payment for later - user might not have signed up yet
        await supabase.from("pending_subscriptions").insert({
          email: email,
          username: username,
          plan_type: planInfo.type,
          expiry: expiry.toISOString(),
          stripe_session_id: session.id,
          created_at: new Date().toISOString(),
        });
        if (isTrial) {
          await logProEvent("pro_trial_started", username || null, "stripe_webhook", {
            plan_type: planInfo.type,
            trial_end: expiry.toISOString(),
            stripe_session_id: session.id,
            stripe_subscription_id: subscriptionId,
            pending: true,
          });
          return new Response("User not found, trial stored for later", { status: 200 });
        }
        await logProEvent("pro_purchase_pending", username || null, "stripe_webhook", {
          plan_type: planInfo.type,
          amount_cents: session.amount_total || null,
          stripe_session_id: session.id,
          has_email: !!email,
        });
        return new Response("User not found, payment stored for later", { status: 200 });
      }

      // Redelivery: Stripe retries an event our reply did not acknowledge,
      // and the money truth must not count one session twice. The session id
      // is stamped in the same write that grants Pro, so a row that already
      // carries it has been processed.
      const alreadyProcessed = userData.stripeSessionId === session.id;

      if (alreadyProcessed) {
        console.log(`↺ checkout ${session.id} already processed for ${userRecord.username}`);
        return new Response("Already processed", { status: 200 });
      }

      // Update user's Pro status
      userData.proStatus = true;
      userData.proType = planInfo.type;
      userData.proExpiry = expiry.toISOString();
      userData.proAutoRenew = !ONE_TIME_PLANS.has(planInfo.type);
      userData.stripeCustomerId = session.customer as string;
      userData.stripeSessionId = session.id;
      if (isTrial) {
        userData.proTrial = true;
        userData.proTrialEnd = expiry.toISOString();
      } else {
        delete userData.proTrial;
        delete userData.proTrialEnd;
      }

      const { error } = await supabase
        .from("users")
        .update({ data: userData, updated_at: new Date().toISOString() })
        .eq("username", userRecord.username);

      if (error) {
        console.error("Failed to update user:", error);
        return new Response("Database update failed", { status: 500 });
      }

      // A trial is not money. It gets its own row, and the purchase row is
      // written when the first real charge lands (invoice.payment_succeeded,
      // after_trial: true). pro_purchase_completed/stripe_webhook is the only
      // money truth in this company — a $0 trial in it would be a sale that
      // never happened.
      if (isTrial) {
        console.log(`🧪 Trial started for ${userRecord.username} (${planInfo.type}) until ${expiry.toISOString()}`);
        await logProEvent("pro_trial_started", userRecord.username, "stripe_webhook", {
          plan_type: planInfo.type,
          trial_end: expiry.toISOString(),
          stripe_session_id: session.id,
          stripe_subscription_id: subscriptionId,
        });
        return new Response("Trial started", { status: 200 });
      }

      console.log(`✅ Successfully activated Pro for ${userRecord.username}`);
      await logProEvent("pro_purchase_completed", userRecord.username, "stripe_webhook", {
        plan_type: planInfo.type,
        amount_cents: session.amount_total || null,
        stripe_session_id: session.id,
        stripe_subscription_id: subscriptionId,
        auto_renew: userData.proAutoRenew,
      });

      await recordReferralConversion(userRecord, userData, email || null, planInfo.type, session.amount_total || null, {
        stripe_session_id: session.id,
      });

      return new Response("Pro activated", { status: 200 });
    }

    // Handle subscription updates (for recurring payments)
    //
    // Three kinds of paid invoice arrive here, and only one of them is a
    // renewal (2026-09-26, with the trial):
    //   - $0 (the trial's opening invoice, or a 100% coupon): no money, no
    //     extension. Before this guard a trial's $0 invoice would have added
    //     a whole plan period on top of the trial.
    //   - billing_reason subscription_create: the FIRST invoice of a new
    //     subscription. checkout.session.completed owns activation and the
    //     purchase row; extending here as well granted a second period
    //     whenever this event happened to land after the checkout event.
    //   - subscription_cycle: a renewal — or, once, the first real charge
    //     after a trial, which is the purchase (after_trial: true).
    // invoice.paid is deliberately NOT handled: the endpoint subscribes to
    // invoice.payment_succeeded, and answering both would count one charge
    // twice.
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const amountPaid = invoice.amount_paid ?? 0;

      if (amountPaid <= 0) {
        console.log(`\u2139\uFE0F $0 invoice ${invoice.id} (${invoice.billing_reason}) — nothing to extend`);
        return new Response("Zero-amount invoice ignored", { status: 200 });
      }
      if (invoice.billing_reason === "subscription_create") {
        console.log(`\u2139\uFE0F first invoice ${invoice.id} — activation is checkout.session.completed's`);
        return new Response("Activation handled by checkout", { status: 200 });
      }

      // Find user by Stripe customer ID
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .filter("data->>stripeCustomerId", "eq", customerId);

      if (users && users.length > 0) {
        const userRecord = users[0];
        const userData = userRecord.data;

        // The first charge after a trial. Stripe's own record decides it:
        // the subscription had a trial, and this invoice's period starts
        // where the trial ended (later renewals start a whole interval
        // after it). The read is made only for cycle invoices; if it fails
        // for someone we know is trialing, answer non-2xx and let Stripe
        // redeliver rather than file a purchase as a renewal.
        let afterTrial = false;
        const subscriptionId = (invoice.subscription as string) || null;
        if (invoice.billing_reason === "subscription_cycle" && subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            const periodStart = invoice.lines?.data?.[0]?.period?.start ?? invoice.created;
            afterTrial = !!sub.trial_end && Math.abs(periodStart - sub.trial_end) <= 6 * 3600;
          } catch (err) {
            if (userData.proTrial === true) throw err;
            console.warn("[stripe-webhook] subscription read failed; treating as a renewal:", err);
          }
        }

        // Redelivery of the conversion we already recorded.
        if (afterTrial && userData.proTrialConvertedInvoice === invoice.id) {
          return new Response("Already processed", { status: 200 });
        }

        // Extend subscription
        const currentExpiry = new Date(userData.proExpiry || new Date());
        const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
        
        // PLAN_DAYS, not a second copy of the durations. An unknown plan
        // used to extend by nothing at all, which reads as "paid and lost
        // access" — so it now extends by a month and says so loudly rather
        // than silently doing nothing.
        const renewDays = PLAN_DAYS[userData.proType];
        if (!renewDays) {
          console.error(`[stripe-webhook] renewal for unknown plan "${userData.proType}" (${userRecord.username}) — extending 30 days as a floor`);
        }
        newExpiry.setDate(newExpiry.getDate() + (renewDays || 30));

        userData.proExpiry = newExpiry.toISOString();
        userData.proStatus = true;
        if (afterTrial) {
          userData.proTrial = false;
          userData.proTrialConvertedInvoice = invoice.id;
        }

        await supabase
          .from("users")
          .update({ data: userData, updated_at: new Date().toISOString() })
          .eq("username", userRecord.username);

        if (afterTrial) {
          // The trial's money. This is the ONE purchase row for a trial
          // subscription: its checkout wrote pro_trial_started, not this.
          console.log(`✅ Trial converted for ${userRecord.username} until ${newExpiry.toISOString()}`);
          await logProEvent("pro_purchase_completed", userRecord.username, "stripe_webhook", {
            plan_type: userData.proType || "unknown",
            amount_cents: amountPaid,
            after_trial: true,
            invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            auto_renew: userData.proAutoRenew,
          });
          await recordReferralConversion(userRecord, userData, invoice.customer_email || null,
            userData.proType || "unknown", amountPaid, { invoice_id: invoice.id, after_trial: true });
        } else {
          console.log(`✅ Extended subscription for ${userRecord.username} until ${newExpiry.toISOString()}`);
          await logProEvent("pro_renewal_completed", userRecord.username, "stripe_webhook", {
            plan_type: userData.proType || "unknown",
            invoice_id: invoice.id,
          });
        }
      }
      
      return new Response("Subscription extended", { status: 200 });
    }

    // Handle failed renewal charges. Before this handler, a failed card on
    // renewal day produced total silence: no event row, no email, nothing —
    // the subscription would just quietly die through Stripe's retry window
    // and eventually surface as a subscription.deleted. First real renewal
    // is 2026-08-09; this exists so we hear about it the moment it happens.
    //
    // Deliberately does NOT touch proStatus/proExpiry: Stripe Smart Retries
    // will re-attempt over the following days, and most failures recover on
    // their own. Downgrading here would punish a transient card decline.
    // Final failure arrives as customer.subscription.deleted, which already
    // flips proAutoRenew and lets Pro lapse naturally.
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const willRetry = !!invoice.next_payment_attempt;

      const { data: users } = await supabase
        .from("users")
        .select("*")
        .filter("data->>stripeCustomerId", "eq", customerId);
      const userRecord = users && users.length > 0 ? users[0] : null;

      // One email per invoice, but a pro_events row per ATTEMPT. Stripe
      // fires this event on every retry (attempt 1, 2, 3…); the attempt
      // trail is signal, a nag email per retry is not. Dedupe key: has any
      // prior pro_payment_failed row carried this invoice id?
      const { data: prior } = await supabase
        .from("pro_events")
        .select("id")
        .eq("event", "pro_payment_failed")
        .like("metadata", `%${invoice.id}%`)
        .limit(1);
      const alreadyEmailed = !!(prior && prior.length > 0);

      await logProEvent("pro_payment_failed", userRecord?.username || null, "stripe_webhook", {
        invoice_id: invoice.id,
        attempt_count: invoice.attempt_count ?? null,
        amount_due_cents: invoice.amount_due ?? null,
        will_retry: willRetry,
        next_attempt_unix: invoice.next_payment_attempt ?? null,
        billing_reason: invoice.billing_reason ?? null,
      });

      // Stripe has stopped retrying: this person is not going to pay for the
      // period they are in, so access ends here rather than running to an
      // expiry they never bought. While retries are still scheduled we touch
      // nothing — proExpiry already stops at the end of the period they DID
      // pay for, and pro-access.js adds its three read-only days on top, so
      // the grace window exists without anyone granting it. Downgrading on a
      // first decline would punish a card that recovers on the second try.
      if (!willRetry && userRecord) {
        const had = await revokeProAccess(userRecord);
        await logProEvent("pro_access_revoked", userRecord.username, "stripe_webhook", {
          cause: "payment_failed_final",
          invoice_id: invoice.id,
          attempt_count: invoice.attempt_count ?? null,
          had_access: had,
        });
        console.log(`\u26D4 Access revoked for ${userRecord.username} — Stripe gave up on invoice ${invoice.id}`);
      }

      const toEmail = userRecord?.email || userRecord?.data?.email
        || invoice.customer_email || null;
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

      // Dunning is transactional, not marketing: it concerns money the user
      // is actively being charged, so it does not check emailOptOut and
      // carries no unsubscribe footer.
      if (!alreadyEmailed && toEmail && RESEND_API_KEY) {
        const username = userRecord?.username || "there";
        const retryLine = willRetry
          ? "Stripe will retry the charge automatically over the next few days — if the card just needs a top-up, you don't have to do anything."
          : "Stripe has stopped retrying, so the subscription will lapse unless the card is updated.";
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "Göktuğ at SQL Quest <noreply@sqlquest.app>",
              to: toEmail,
              reply_to: "goktug@datrick.com",
              subject: "Your SQL Quest payment didn't go through",
              html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
          <p style="font-size: 15px; line-height: 1.8;">Hi ${username},</p>
          <p style="font-size: 15px; line-height: 1.8;">
            I'm Göktuğ — I built SQL Quest. Your Pro renewal charge
            (${((invoice.amount_due ?? 0) / 100).toFixed(2)} USD) didn't go through just now.
            This is almost always a card that expired or a bank being cautious, not something you did.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">${retryLine}</p>
          <p style="font-size: 15px; line-height: 1.8;">
            If the card needs replacing, <strong>just reply to this email</strong> and I'll send you
            a secure Stripe link to update it. Your Pro stays active through the retry window either way.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">— Göktuğ</p>
        </div>`,
            }),
          });
          try {
            // resend_id was hard-coded null, which meant the delivered/bounced
            // webhook for a failed-payment notice could never be joined back
            // to its send and landed as template='unknown'.
            let rid: string | null = null;
            try { rid = (await res.clone().json())?.id ?? null; } catch (_) { /* non-JSON body */ }
            await supabase.from("email_events").insert({
              username: userRecord?.username || "unknown",
              email: toEmail,
              template: "payment_failed",
              event: res.ok ? "sent" : "send_failed",
              resend_id: rid,
              meta: { invoice_id: invoice.id, will_retry: willRetry },
            });
          } catch (_) { /* measurement is best-effort */ }
          console.log(`💳 payment_failed email ${res.ok ? "sent" : "FAILED"} to ${toEmail} (invoice ${invoice.id})`);
        } catch (mailErr) {
          console.error("[stripe-webhook] payment_failed email error:", mailErr);
        }
      } else {
        console.log(`💳 payment_failed logged for invoice ${invoice.id} (email: ${alreadyEmailed ? "already sent" : toEmail ? "no key" : "no address"})`);
      }

      return new Response("Payment failure recorded", { status: 200 });
    }

    // Handle an expired Checkout Session — the person opened checkout and
    // never paid; Stripe expires the session 24 hours after creation. Before
    // this handler the only trace was our own pro_checkout_returned, written
    // only when the person came back to the app. Founder's week-2 item 9
    // (2026-09-12): "measure the checkout abandonment point". No user data
    // changes; one pro_events row per expired session. The Stripe endpoint
    // must subscribe to checkout.session.expired for this to fire.
    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const username = session.client_reference_id || null;
      let planType = "unknown";
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        const priceId = lineItems.data[0]?.price?.id || "";
        const productId = (lineItems.data[0]?.price?.product as string) || "";
        planType = (PRICE_TO_PLAN[priceId] || PRODUCT_TO_PLAN[productId]
          || planFromInterval(lineItems.data[0]?.price))?.type || "unknown";
      } catch (_) { /* the row still says the session expired */ }
      await logProEvent("pro_checkout_expired", username, "stripe_webhook", {
        plan_type: planType,
        stripe_session_id: session.id,
        email_present: !!(session.customer_details?.email || session.customer_email),
        opened_at: session.created ? new Date(session.created * 1000).toISOString() : null,
      });
      console.log(`⏳ Checkout session expired for ${username || "unknown"} (${planType})`);
      return new Response("Checkout expiry recorded", { status: 200 });
    }

    // Handle a scheduled cancellation, or its undo. The Customer Portal sets
    // cancel_at_period_end=true the moment a person cancels; the subscription
    // stays active until the period ends, and the only event we used to hear
    // was subscription.deleted on THAT day. Measured 2026-09-12: sab3r's
    // cancellation was learned from the dashboard, and jeromezhao's in-app
    // press (before 09-03) never reached Stripe at all. From this handler on,
    // users.data.proAutoRenew is written by Stripe alone, so the flag is a
    // fact again (docs/agent/metrics.md, payer_churn). Access is never
    // shortened here — Pro runs to the period end. The Stripe endpoint must
    // subscribe to customer.subscription.updated for this to fire.
    if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const previous = ((event.data as { previous_attributes?: Record<string, unknown> }).previous_attributes) || {};
      const flipped = Object.prototype.hasOwnProperty.call(previous, "cancel_at_period_end")
        && previous["cancel_at_period_end"] !== subscription.cancel_at_period_end;

      // Stripe carries the lifecycle in `status`, and until 2026-09-20 this
      // branch read only the cancel flag and returned — so a subscription
      // going past_due or unpaid changed nothing on our side and the person
      // kept whatever the stored expiry said. The statuses that matter:
      //   past_due  the renewal failed and retries are running. Access is
      //             already bounded by the period they paid for; we record
      //             it so the state is readable, and change nothing.
      //   unpaid    Stripe has given up. Access ends now.
      //   active    recovered from past_due — worth a row, nothing to write
      //             (invoice.payment_succeeded did the extending).
      const statusChanged = Object.prototype.hasOwnProperty.call(previous, "status")
        && previous["status"] !== subscription.status;
      if (!flipped && !statusChanged) return new Response("Subscription update noted", { status: 200 });

      const customerId = subscription.customer as string;
      const userRecord = await findUserByCustomer(customerId);
      const userData = userRecord?.data;

      if (statusChanged) {
        const from = (previous["status"] as string) || null;
        if (subscription.status === "unpaid" || subscription.status === "incomplete_expired") {
          const had = await revokeProAccess(userRecord);
          await logProEvent("pro_access_revoked", userRecord?.username || null, "stripe_webhook", {
            cause: `subscription_${subscription.status}`,
            from_status: from,
            stripe_customer_id: customerId,
            had_access: had,
          });
        } else {
          await logProEvent("pro_subscription_status", userRecord?.username || null, "stripe_webhook", {
            status: subscription.status,
            from_status: from,
            plan_type: (userData as Record<string, unknown> | undefined)?.proType || "unknown",
            period_end: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          });
        }
        console.log(`\u2139\uFE0F Subscription ${from} \u2192 ${subscription.status} for ${userRecord?.username || customerId}`);
        if (!flipped) return new Response("Subscription status recorded", { status: 200 });
      }
      const daysSincePurchase = subscription.created
        ? Math.round((Date.now() - subscription.created * 1000) / 86400000)
        : null;

      if (userRecord && userData) {
        userData.proAutoRenew = !subscription.cancel_at_period_end;
        await supabase
          .from("users")
          .update({ data: userData, updated_at: new Date().toISOString() })
          .eq("username", userRecord.username);
      }

      // A trial cancelled before its first charge is not a paying customer
      // leaving, so it stays out of payer_churn (pro_subscription_cancelled).
      // Access needs no write: a trial's proExpiry already IS the trial end,
      // and Stripe ends the subscription there without charging.
      if (subscription.status === "trialing") {
        await logProEvent(
          subscription.cancel_at_period_end ? "pro_trial_cancelled" : "pro_trial_reactivated",
          userRecord?.username || null,
          "stripe_webhook",
          {
            plan_type: userData?.proType || "unknown",
            scheduled: true,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          },
        );
        console.log(`${subscription.cancel_at_period_end ? "⚠️ Trial cancellation scheduled" : "↩️ Trial cancellation undone"} for ${userRecord?.username || customerId}`);
        return new Response("Trial update recorded", { status: 200 });
      }

      await logProEvent(
        subscription.cancel_at_period_end ? "pro_subscription_cancelled" : "pro_subscription_reactivated",
        userRecord?.username || null,
        "stripe_webhook",
        {
          plan_type: userData?.proType || "unknown",
          scheduled: true,
          cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
          period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
          days_since_purchase: daysSincePurchase,
        },
      );
      console.log(`${subscription.cancel_at_period_end ? "⚠️ Cancellation scheduled" : "↩️ Cancellation undone"} for ${userRecord?.username || customerId}`);
      return new Response("Subscription update recorded", { status: 200 });
    }

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .filter("data->>stripeCustomerId", "eq", customerId);

      // WHY a subscription ended decides whether the person keeps the period
      // (2026-09-14, founder: "ödeme fail olursa pro free'ye dönmeli").
      //
      // Two very different things arrive as the same event:
      //   - someone CANCELLED. They paid for the period they are in, so they
      //     keep it to its end. Taking it away would be taking back something
      //     already bought.
      //   - Stripe gave up COLLECTING. They did not pay for the period they
      //     are in, and "let it expire naturally" handed them up to a month
      //     free — a year on the annual plan.
      //
      // The old branch did the second thing to both. Stripe distinguishes
      // them: `cancellation_details.reason` and the terminal status.
      const cancelReason = (subscription as { cancellation_details?: { reason?: string } })
        .cancellation_details?.reason || null;
      const endedForNonPayment = cancelReason === "payment_failed"
        || subscription.status === "unpaid"
        || subscription.status === "incomplete_expired";

      // A trial that never became a payment (2026-09-26): it ended inside
      // the trial — cancelled during it, or at its end — or the record says
      // the first charge never landed. Such a person keeps Pro to the trial
      // end, not a day longer, and is logged as pro_trial_cancelled: they
      // were never a paying customer, so they are not payer churn.
      const trialEndIso = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
      const endedAt = subscription.ended_at || subscription.canceled_at || null;
      const endedInsideTrial = !!subscription.trial_end && !!endedAt && endedAt <= subscription.trial_end + 3600;

      if (users && users.length > 0) {
        const userRecord = users[0];
        const userData = userRecord.data;
        const trialNeverPaid = endedInsideTrial || userData.proTrial === true;

        userData.proAutoRenew = false;
        if (endedForNonPayment) {
          // Access ends now, not at a date they never paid to reach.
          // proType is deliberately KEPT: pro-access.js needs it to tell a
          // lapsed subscriber from someone who never had Pro, and the
          // win-back copy depends on that difference.
          userData.proStatus = false;
          userData.proExpiry = new Date().toISOString();
        } else if (trialNeverPaid && trialEndIso) {
          // Cancelled mid-trial: the trial runs to its end, as promised.
          userData.proExpiry = trialEndIso;
        }

        await supabase
          .from("users")
          .update({ data: userData, updated_at: new Date().toISOString() })
          .eq("username", userRecord.username);

        if (trialNeverPaid) {
          await logProEvent("pro_trial_cancelled", userRecord.username, "stripe_webhook", {
            plan_type: userData.proType || "unknown",
            ended: true,
            reason: cancelReason,
            revoked: endedForNonPayment,
            trial_end: trialEndIso,
          });
          console.log(`⚠️ Trial ended unpaid for ${userRecord.username} (${cancelReason || subscription.status})`);
          return new Response("Trial cancelled", { status: 200 });
        }

        // 2026-09-12: this branch logged to the console and nothing else, so
        // the date a paying customer left was recorded nowhere in our data.
        await logProEvent("pro_subscription_cancelled", userRecord.username, "stripe_webhook", {
          plan_type: userData.proType || "unknown",
          ended: true,
          reason: cancelReason,
          revoked: endedForNonPayment,
          days_since_purchase: subscription.created
            ? Math.round((Date.now() - subscription.created * 1000) / 86400000)
            : null,
        });
        console.log(`⚠️ Subscription ended for ${userRecord.username} (${cancelReason || subscription.status}) — ${endedForNonPayment ? "access revoked now" : "keeps the paid period"}`);
      } else {
        await logProEvent("pro_subscription_cancelled", null, "stripe_webhook", {
          plan_type: "unknown", ended: true, reason: cancelReason,
          revoked: endedForNonPayment, stripe_customer_id: customerId,
        });
      }
      
      return new Response("Subscription cancelled", { status: 200 });
    }

    // A refund is the end of the relationship, not a discount on it. Until
    // 2026-09-20 nothing here listened, so the money went back and the
    // person kept Pro until their expiry — a year, on the annual plan.
    //
    // Two judgements are encoded:
    //   - PARTIAL refunds do not revoke. They are a correction to an amount,
    //     not an exit, and the period is still paid for.
    //   - a FULL refund also CANCELS the subscription. Our only refund policy
    //     is the 7-day money-back guarantee, which is a full exit; leaving the
    //     subscription live would charge the person again next period while
    //     they have no access, silently, which is the worst outcome available.
    //     If a goodwill "here is this month back, please stay" case ever
    //     exists, it needs its own path — do not quietly weaken this one.
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const amount = charge.amount ?? 0;
      const refunded = charge.amount_refunded ?? 0;
      const full = amount > 0 && refunded >= amount;
      let customerId = (charge.customer as string) || null;
      let subscriptionId: string | null = null;

      if (charge.invoice) {
        try {
          const invoice = await stripe.invoices.retrieve(charge.invoice as string);
          customerId = customerId || (invoice.customer as string) || null;
          subscriptionId = (invoice.subscription as string) || null;
        } catch (err) {
          console.warn("[stripe-webhook] could not read the refunded charge's invoice:", err);
        }
      }

      const userRecord = await findUserByCustomer(customerId);
      let cancelledSubscription: string | null = null;

      if (full) {
        await revokeProAccess(userRecord);
        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            if (sub.status !== "canceled") {
              await stripe.subscriptions.cancel(subscriptionId);
              cancelledSubscription = subscriptionId;
            }
          } catch (err) {
            console.error("[stripe-webhook] refund: subscription cancel failed:", err);
          }
        }
      }

      await logProEvent("pro_refunded", userRecord?.username || null, "stripe_webhook", {
        full,
        charge_id: charge.id,
        amount_cents: amount,
        amount_refunded_cents: refunded,
        currency: charge.currency || null,
        stripe_customer_id: customerId,
        subscription_cancelled: cancelledSubscription,
        revoked: full && !!userRecord,
        matched_user: !!userRecord,
      });
      console.log(`\u21A9\uFE0F ${full ? "Full" : "Partial"} refund on ${charge.id} for ${userRecord?.username || customerId || "unknown customer"}${cancelledSubscription ? " (subscription cancelled)" : ""}`);
      return new Response("Refund recorded", { status: 200 });
    }

    return new Response("Event received", { status: 200 });
    
  } catch (err) {
    console.error("Webhook error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }
});
