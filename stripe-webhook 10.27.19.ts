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

// Product ID to plan type mapping - UPDATE THESE with your actual Stripe Product IDs
const PRODUCT_TO_PLAN: Record<string, { type: string; durationDays: number }> = {
  "prod_monthly_xxx": { type: "monthly", durationDays: 30 },
  "prod_annual_xxx": { type: "annual", durationDays: 365 },
  "prod_lifetime_xxx": { type: "lifetime", durationDays: 36500 }, // 100 years
};

// Price ID mapping (alternative to product ID)
const PRICE_TO_PLAN: Record<string, { type: string; durationDays: number }> = {
  // Get these from Stripe Dashboard > Products > Click product > Copy Price ID
  "price_xxx_monthly": { type: "monthly", durationDays: 30 },
  "price_xxx_annual": { type: "annual", durationDays: 365 },
  "price_xxx_lifetime": { type: "lifetime", durationDays: 36500 },
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
    
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    
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
      }
      
      return new Response("Subscription extended", { status: 200 });
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
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
});
