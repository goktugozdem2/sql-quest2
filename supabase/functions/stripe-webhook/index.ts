// Supabase Edge Function: Stripe Webhook Handler
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt

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

// Product ID to plan type mapping - set via Supabase Edge Function secrets:
//   STRIPE_PRODUCT_MONTHLY, STRIPE_PRODUCT_ANNUAL, STRIPE_PRODUCT_LIFETIME
//   STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, STRIPE_PRICE_LIFETIME
const PRODUCT_TO_PLAN: Record<string, { type: string; durationDays: number }> = {
  [Deno.env.get("STRIPE_PRODUCT_MONTHLY") || ""]: { type: "monthly", durationDays: 30 },
  [Deno.env.get("STRIPE_PRODUCT_ANNUAL") || ""]: { type: "annual", durationDays: 365 },
  [Deno.env.get("STRIPE_PRODUCT_LIFETIME") || ""]: { type: "lifetime", durationDays: 36500 },
};

const PRICE_TO_PLAN: Record<string, { type: string; durationDays: number }> = {
  [Deno.env.get("STRIPE_PRICE_MONTHLY") || ""]: { type: "monthly", durationDays: 30 },
  [Deno.env.get("STRIPE_PRICE_ANNUAL") || ""]: { type: "annual", durationDays: 365 },
  [Deno.env.get("STRIPE_PRICE_LIFETIME") || ""]: { type: "lifetime", durationDays: 36500 },
};

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
      
      // Determine plan type
      let planInfo = PRICE_TO_PLAN[priceId] || PRODUCT_TO_PLAN[productId];
      
      // Fallback: determine by amount
      if (!planInfo) {
        const amount = session.amount_total || 0;
        if (amount >= 19900) {
          planInfo = { type: "lifetime", durationDays: 36500 };
        } else if (amount >= 9900) {
          planInfo = { type: "annual", durationDays: 365 };
        } else {
          planInfo = { type: "monthly", durationDays: 30 };
        }
      }

      // Calculate expiry date
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + planInfo.durationDays);

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
        await logProEvent("pro_purchase_pending", username || null, "stripe_webhook", {
          plan_type: planInfo.type,
          amount_cents: session.amount_total || null,
          stripe_session_id: session.id,
          has_email: !!email,
        });
        return new Response("User not found, payment stored for later", { status: 200 });
      }

      // Update user's Pro status
      userData.proStatus = true;
      userData.proType = planInfo.type;
      userData.proExpiry = expiry.toISOString();
      userData.proAutoRenew = planInfo.type !== "lifetime";
      userData.stripeCustomerId = session.customer as string;
      userData.stripeSessionId = session.id;

      const { error } = await supabase
        .from("users")
        .update({ data: userData, updated_at: new Date().toISOString() })
        .eq("username", userRecord.username);

      if (error) {
        console.error("Failed to update user:", error);
        return new Response("Database update failed", { status: 500 });
      }

      console.log(`✅ Successfully activated Pro for ${userRecord.username}`);
      await logProEvent("pro_purchase_completed", userRecord.username, "stripe_webhook", {
        plan_type: planInfo.type,
        amount_cents: session.amount_total || null,
        stripe_session_id: session.id,
        auto_renew: userData.proAutoRenew,
      });

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
            email:        email || userData.email || null,
            plan_type:    planInfo.type,
            amount_cents: session.amount_total || null,
            metadata: {
              stripe_session_id: session.id,
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

      return new Response("Pro activated", { status: 200 });
    }

    // Handle subscription updates (for recurring payments)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      
      // Find user by Stripe customer ID
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .filter("data->>stripeCustomerId", "eq", customerId);

      if (users && users.length > 0) {
        const userRecord = users[0];
        const userData = userRecord.data;
        
        // Extend subscription
        const currentExpiry = new Date(userData.proExpiry || new Date());
        const newExpiry = new Date(Math.max(currentExpiry.getTime(), Date.now()));
        
        if (userData.proType === "monthly") {
          newExpiry.setDate(newExpiry.getDate() + 30);
        } else if (userData.proType === "annual") {
          newExpiry.setDate(newExpiry.getDate() + 365);
        }

        userData.proExpiry = newExpiry.toISOString();
        userData.proStatus = true;

        await supabase
          .from("users")
          .update({ data: userData, updated_at: new Date().toISOString() })
          .eq("username", userRecord.username);

        console.log(`✅ Extended subscription for ${userRecord.username} until ${newExpiry.toISOString()}`);
        await logProEvent("pro_renewal_completed", userRecord.username, "stripe_webhook", {
          plan_type: userData.proType || "unknown",
          invoice_id: invoice.id,
        });
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
            await supabase.from("email_events").insert({
              username: userRecord?.username || "unknown",
              email: toEmail,
              template: "payment_failed",
              event: res.ok ? "sent" : "send_failed",
              resend_id: null,
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

    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      const { data: users } = await supabase
        .from("users")
        .select("*")
        .filter("data->>stripeCustomerId", "eq", customerId);

      if (users && users.length > 0) {
        const userRecord = users[0];
        const userData = userRecord.data;
        
        userData.proAutoRenew = false;
        // Don't remove Pro immediately - let it expire naturally

        await supabase
          .from("users")
          .update({ data: userData, updated_at: new Date().toISOString() })
          .eq("username", userRecord.username);

        console.log(`⚠️ Subscription cancelled for ${userRecord.username}`);
      }
      
      return new Response("Subscription cancelled", { status: 200 });
    }

    return new Response("Event received", { status: 200 });
    
  } catch (err) {
    console.error("Webhook error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }
});
