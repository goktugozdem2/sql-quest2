// Supabase Edge Function: create-checkout-session
// Deploy: supabase functions deploy create-checkout-session
//   (JWT verification stays ON: the browser calls it with the anon key, the
//   same way it calls capture-email. The anon key is public; the Origin
//   allowlist below and Stripe itself are what bound it.)
//
// Server-created Stripe Checkout Sessions (founder's written go, 2026-09-26),
// replacing Payment Links behind the client flag `checkoutSessions`.
//
// Why: Adaptive Pricing is "Always on" for Payment Links, so a buyer outside
// the US meets their local currency at the moment of paying (a Turkish buyer
// clicks $99 and sees TRY 5,021.88). A session created here sets
// `adaptive_pricing: { enabled: false }` and the buyer sees the USD price the
// modal showed. The same door carries two things a Payment Link cannot:
//   - an optional card-required 7-day trial (`trial: true`), and
//   - a regional price for India (`region: 'IN'`).
//
// Input  (POST JSON): { plan: 'monthly'|'annual', region: 'default'|'IN',
//                       username, email?, trial?: boolean, promo?: string }
// Output (200 JSON):  { url, plan, region, trial, notes: string[] }
//   `region` and `trial` are what was APPLIED, which may differ from what was
//   asked; `notes` says why (e.g. 'in_price_unset' — the IN price secrets are
//   not set yet, so the default price was used).
//
// Env (secrets): STRIPE_SECRET_KEY, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL
// (already set for stripe-webhook), STRIPE_PRICE_MONTHLY_IN and
// STRIPE_PRICE_ANNUAL_IN (optional — unset means India pays the default
// price). SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided by the
// platform and used only to read whether this username already had a trial.
//
// Never echoes a Stripe error or any secret to the client: a failure is
// `{ error: 'checkout_unavailable' }` and the client falls back to the
// Payment Link (src/utils/checkout-session.js, launchWithFallback).
//
// What the webhook does with the result: checkout.session.completed on a
// trialing subscription grants Pro to the trial end and logs
// `pro_trial_started` — NOT a purchase. The first real charge after the trial
// logs `pro_purchase_completed` with `after_trial: true`
// (supabase/functions/stripe-webhook).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

export const TRIAL_DAYS = 7;

// Who may call. Production, www, and the two local dev servers (npm run dev
// on :4321, vite on :5173). Anything else gets no CORS header and a 403.
export const ALLOWED_ORIGINS = new Set([
  "https://sqlquest.app",
  "https://www.sqlquest.app",
  "http://localhost:4321",
  "http://localhost:5173",
  "http://127.0.0.1:4321",
  "http://127.0.0.1:5173",
]);

// Same shapes as src/utils/checkout-session.js (tests/checkout-session.test.js
// reads both files and fails if they drift).
const PLANS = ["monthly", "annual"];
const REGIONS = ["default", "IN"];
const USERNAME_RE = /^[A-Za-z0-9_.@+-]{1,64}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PROMO_RE = /^[A-Za-z0-9_-]{1,40}$/;

function corsFor(origin: string | null): Record<string, string> {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(origin), "Content-Type": "application/json" },
  });
}

// The price for a plan in a region. An IN price whose secret is unset falls
// back to the default price, and the caller says so in `notes`.
function priceFor(plan: string, region: string): { price: string; region: string; note: string | null } {
  const def = plan === "annual" ? Deno.env.get("STRIPE_PRICE_ANNUAL") : Deno.env.get("STRIPE_PRICE_MONTHLY");
  if (region === "IN") {
    const inPrice = plan === "annual" ? Deno.env.get("STRIPE_PRICE_ANNUAL_IN") : Deno.env.get("STRIPE_PRICE_MONTHLY_IN");
    if (inPrice) return { price: inPrice, region: "IN", note: null };
    return { price: def || "", region: "default", note: "in_price_unset" };
  }
  return { price: def || "", region: "default", note: null };
}

// The region is the browser's hint (its time zone). When the platform tells
// us the caller's country, a hint that disagrees with it is not honoured —
// a regional price is for the region, not for whoever sends region: 'IN'.
function countryHeader(req: Request): string | null {
  for (const h of ["cf-ipcountry", "x-vercel-ip-country", "x-country"]) {
    const v = req.headers.get(h);
    if (v && /^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  }
  return null;
}

// One trial per account. Best-effort: if the read fails the trial is allowed,
// because the modal already promised it and a trial costs a week, not money.
async function trialAlreadyUsed(username: string): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return false;
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("pro_events")
      .select("id")
      .eq("event", "pro_trial_started")
      .eq("reason", "stripe_webhook")
      .eq("username", username)
      .limit(1);
    if (error) return false;
    return !!(data && data.length > 0);
  } catch (_) {
    return false;
  }
}

async function resolvePromotionCode(code: string): Promise<string | null> {
  try {
    const found = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    return found.data[0]?.id || null;
  } catch (_) {
    return null;
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response("ok", { headers: corsFor(origin) });
  }
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return json({ error: "origin_not_allowed" }, 403, null);
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch (_) {
    return json({ error: "invalid_json" }, 400, origin);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ error: "invalid_body" }, 400, origin);
  }

  // ── strict validation: allowlists and shapes, nothing passed through ──
  const plan = input.plan;
  const regionAsked = input.region ?? "default";
  const username = input.username;
  const email = input.email;
  const trialAsked = input.trial ?? false;
  const promo = input.promo;

  if (typeof plan !== "string" || !PLANS.includes(plan)) return json({ error: "invalid_plan" }, 400, origin);
  if (typeof regionAsked !== "string" || !REGIONS.includes(regionAsked)) return json({ error: "invalid_region" }, 400, origin);
  if (typeof username !== "string" || !USERNAME_RE.test(username)) return json({ error: "invalid_username" }, 400, origin);
  if (email !== undefined && email !== null && email !== "" &&
      (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email))) {
    return json({ error: "invalid_email" }, 400, origin);
  }
  if (typeof trialAsked !== "boolean") return json({ error: "invalid_trial" }, 400, origin);
  if (promo !== undefined && promo !== null && promo !== "" &&
      (typeof promo !== "string" || !PROMO_RE.test(promo))) {
    return json({ error: "invalid_promo" }, 400, origin);
  }

  const notes: string[] = [];

  let region = regionAsked;
  const country = countryHeader(req);
  if (region === "IN" && country && country !== "IN") {
    region = "default";
    notes.push("country_mismatch");
  }
  const chosen = priceFor(plan, region);
  if (chosen.note) notes.push(chosen.note);
  if (!chosen.price) {
    console.error(`[create-checkout-session] no price configured for ${plan}/${chosen.region}`);
    return json({ error: "checkout_unavailable" }, 503, origin);
  }

  let trial = trialAsked;
  if (trial && await trialAlreadyUsed(username)) {
    trial = false;
    notes.push("trial_already_used");
  }

  const metadata = {
    username,
    plan,
    region: chosen.region,
    trial: trial ? "true" : "false",
    source: "checkout_session",
  };

  // Same round trip the Payment Links use: the app reads ?payment=success
  // and polls for the webhook's Pro (src/app.jsx, pendingPaymentSuccessRef).
  // A cancel lands on the plain app, where the checkout breadcrumb records
  // the abandon exactly as it does for someone pressing Back on a link.
  const base = origin;
  const params: Record<string, unknown> = {
    mode: "subscription",
    line_items: [{ price: chosen.price, quantity: 1 }],
    client_reference_id: username,
    success_url: `${base}/app/?payment=success`,
    cancel_url: `${base}/app/`,
    // The whole reason for this function: the buyer sees USD.
    adaptive_pricing: { enabled: false },
    payment_method_collection: "always",
    metadata,
    subscription_data: {
      metadata,
      ...(trial
        ? {
            trial_period_days: TRIAL_DAYS,
            trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
          }
        : {}),
    },
  };
  if (typeof email === "string" && email) params.customer_email = email.toLowerCase();

  // Stripe refuses `discounts` together with `allow_promotion_codes`, so a
  // code that resolves to an ACTIVE promotion code is applied, and anything
  // else leaves the field open for the buyer to type one.
  if (typeof promo === "string" && promo) {
    const promotionCode = await resolvePromotionCode(promo);
    if (promotionCode) params.discounts = [{ promotion_code: promotionCode }];
    else notes.push("promo_not_found");
  }
  if (!params.discounts) params.allow_promotion_codes = true;

  try {
    // deno-lint-ignore no-explicit-any
    const session = await stripe.checkout.sessions.create(params as any);
    if (!session.url) {
      console.error("[create-checkout-session] session created without a url", session.id);
      return json({ error: "checkout_unavailable" }, 502, origin);
    }
    console.log(`checkout session ${session.id} for ${username}: ${plan}/${chosen.region}${trial ? " +trial" : ""}`);
    return json({ url: session.url, plan, region: chosen.region, trial, notes }, 200, origin);
  } catch (err) {
    // Logged for us, never returned: a Stripe error can name a price id, an
    // account setting or a parameter, none of which the browser needs.
    const type = (err as { type?: string })?.type || "unknown";
    const code = (err as { code?: string })?.code || "";
    console.error(`[create-checkout-session] stripe error ${type} ${code}`);
    return json({ error: "checkout_unavailable" }, 502, origin);
  }
});
