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
//   or, for the Debug pack (2026-11-23):
//                     { product: 'debug_pack', region, username, email? }
//   → a one-time `mode: 'payment'` session on STRIPE_PRICE_DEBUG_PACK /
//     STRIPE_PRICE_DEBUG_PACK_IN; 503 `debug_pack_unconfigured` when the
//     region's secret is unset (never another price).
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
// Recovery (M-11, 2026-11-22): every session asks for
// `after_expiration.recovery` (../_shared/checkout-recovery.ts), so an
// expired one carries a 30-day link back to a copy of itself.
//
// What the webhook does with the result: checkout.session.completed on a
// trialing subscription grants Pro to the trial end and logs
// `pro_trial_started` — NOT a purchase. The first real charge after the trial
// logs `pro_purchase_completed` with `after_trial: true`
// (supabase/functions/stripe-webhook).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno";
import { recoveryParams } from "../_shared/checkout-recovery.ts";

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

// One trial per account, and none for an account that has already PAID.
// 2026-11-17: a payer whose renewal failed and whose subscription ended came
// back the next day and was handed a fresh 7-day trial, because the only
// check was for an earlier trial and they had bought without one. A purchase
// recorded by the webhook (the only money truth) now counts as "used".
// Best-effort: if the read fails the trial is allowed, because the modal
// already promised it and a trial costs a week, not money.
const TRIAL_USED_EVENTS = ["pro_trial_started", "pro_purchase_completed"];
async function trialAlreadyUsed(username: string): Promise<boolean> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return false;
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("pro_events")
      .select("id")
      .in("event", TRIAL_USED_EVENTS)
      .eq("reason", "stripe_webhook")
      .eq("username", username)
      .limit(1);
    if (error) return false;
    return !!(data && data.length > 0);
  } catch (_) {
    return false;
  }
}

// The step between the plan click and the Stripe page (docs/funnel.md,
// 2026-10-06). The client records the click (`pro_checkout_clicked`); until
// this row nothing recorded that a session was actually made, so "clicked but
// never saw Stripe" and "saw Stripe and left" read the same. One row per
// outcome, reason 'checkout_session', never blocking the answer: a logging
// failure — or a slow write, past LOG_TIMEOUT_MS — still returns the session.
const LOG_TIMEOUT_MS = 1500;
async function logCheckoutEvent(event: "pro_checkout_started" | "pro_checkout_session_failed" | "debug_pack_checkout_started" | "debug_pack_checkout_failed", username: string, metadata: Record<string, unknown>): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  try {
    const supabase = createClient(url, key);
    const write = supabase.from("pro_events").insert({ event, username, reason: "checkout_session", metadata });
    await Promise.race([write, new Promise((r) => setTimeout(r, LOG_TIMEOUT_MS))]);
  } catch (_) {
    // never let a log break a checkout
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

  // Warm-up (2026-11-20): the app sends { warm: true } when the Pro modal
  // opens, so the connection to Stripe is open before the plan click. No
  // session, no row, nothing returned but 204. Every session in the week to
  // 11-20 took 7–9 s and the client waited at most 8.
  if (input.warm === true) {
    const t0 = Date.now();
    const price = Deno.env.get("STRIPE_PRICE_MONTHLY");
    try { if (price) await stripe.prices.retrieve(price); } catch (_) { /* a warm-up never fails loudly */ }
    console.log(`warm ${Date.now() - t0}ms`);
    return new Response(null, { status: 204, headers: corsFor(origin) });
  }

  // ── The Debug pack (2026-11-23, founder's decision PR #251) ──
  // `product: 'debug_pack'` is a separate one-time purchase: $9, India $3,
  // its own Stripe prices, `mode: 'payment'`, no trial, no promo, no
  // recovery link (checkout-abandon mails about Pro). The same Origin
  // allowlist above guards it. A missing price secret answers 503
  // `debug_pack_unconfigured` — never another price.
  if (input.product !== undefined) {
    if (input.product !== DEBUG_PACK_PRODUCT) return json({ error: "invalid_product" }, 400, origin);
    return await debugPackSession(req, input, origin);
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
    await logCheckoutEvent("pro_checkout_session_failed", username, { plan, region: chosen.region, trial: trialAsked, stage: "no_price" });
    return json({ error: "checkout_unavailable" }, 503, origin);
  }

  const tStart = Date.now();
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

  // M-11 (2026-11-22): on expiry Stripe attaches a recovery URL that opens a
  // copy of this session; stripe-webhook stores it and checkout-abandon puts
  // it on the mail's button. The copy's promo field follows the rule above —
  // none when this session already carries a discount, so the copy never
  // holds both. consent_collection stays OFF: Stripe-sent promotional mail is
  // the founder's consent decision, not this function's.
  params.after_expiration = recoveryParams(!!params.discounts);

  try {
    // deno-lint-ignore no-explicit-any
    const tStripe = Date.now();
    const session = await stripe.checkout.sessions.create(params as any);
    // Where the click's wait goes (2026-11-20): before Stripe (trial lookup,
    // promo) and the Stripe call itself.
    console.log(`timing pre=${tStripe - tStart}ms stripe=${Date.now() - tStripe}ms`);
    if (!session.url) {
      console.error("[create-checkout-session] session created without a url", session.id);
      await logCheckoutEvent("pro_checkout_session_failed", username, { plan, region: chosen.region, trial, stage: "no_url" });
      return json({ error: "checkout_unavailable" }, 502, origin);
    }
    console.log(`checkout session ${session.id} for ${username}: ${plan}/${chosen.region}${trial ? " +trial" : ""}`);
    await logCheckoutEvent("pro_checkout_started", username, { session_id: session.id, plan, region: chosen.region, trial, promo: !!params.discounts, notes });
    return json({ url: session.url, plan, region: chosen.region, trial, notes }, 200, origin);
  } catch (err) {
    // Logged for us, never returned: a Stripe error can name a price id, an
    // account setting or a parameter, none of which the browser needs.
    const type = (err as { type?: string })?.type || "unknown";
    const code = (err as { code?: string })?.code || "";
    console.error(`[create-checkout-session] stripe error ${type} ${code}`);
    await logCheckoutEvent("pro_checkout_session_failed", username, { plan, region: chosen.region, trial, stage: "stripe", error_type: type, error_code: code || null });
    return json({ error: "checkout_unavailable" }, 502, origin);
  }
});

// ── The Debug pack's session (2026-11-23) ──
// Below serve() on purpose: the Pro path above reads top to bottom as it
// always did. Declarations here are hoisted (functions) or initialised before
// any request arrives (the const).
export const DEBUG_PACK_PRODUCT = "debug_pack";

// The pack's price for a region, or null when its secret is unset. No
// fallback between regions: an India buyer is never charged the $9 price
// because the $3 one is missing, and nobody is charged a Pro price.
function debugPackPriceFor(region: string): string | null {
  const v = region === "IN" ? Deno.env.get("STRIPE_PRICE_DEBUG_PACK_IN") : Deno.env.get("STRIPE_PRICE_DEBUG_PACK");
  return v && v.length > 0 ? v : null;
}

async function debugPackSession(req: Request, input: Record<string, unknown>, origin: string) {
  const regionAsked = input.region ?? "default";
  const username = input.username;
  const email = input.email;
  if (typeof regionAsked !== "string" || !REGIONS.includes(regionAsked)) return json({ error: "invalid_region" }, 400, origin);
  if (typeof username !== "string" || !USERNAME_RE.test(username)) return json({ error: "invalid_username" }, 400, origin);
  if (email !== undefined && email !== null && email !== "" &&
      (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email))) {
    return json({ error: "invalid_email" }, 400, origin);
  }
  // A pack has no trial and no promo; asking for either is a malformed call.
  if (input.trial !== undefined && input.trial !== false) return json({ error: "invalid_trial" }, 400, origin);
  if (input.plan !== undefined) return json({ error: "invalid_plan" }, 400, origin);

  const notes: string[] = [];
  let region = regionAsked;
  const country = countryHeader(req);
  if (region === "IN" && country && country !== "IN") {
    region = "default";
    notes.push("country_mismatch");
  }
  const price = debugPackPriceFor(region);
  if (!price) {
    console.error(`[create-checkout-session] debug pack price unset for ${region}`);
    await logCheckoutEvent("debug_pack_checkout_failed", username, { product: DEBUG_PACK_PRODUCT, region, stage: "debug_pack_unconfigured" });
    return json({ error: "debug_pack_unconfigured" }, 503, origin);
  }

  // Its own event names (debug_pack_checkout_started / _failed), so the Pro
  // series that read pro_checkout_started are not inflated by the pack.
  const metadata = { username, product: DEBUG_PACK_PRODUCT, region, source: "checkout_session" };
  const params: Record<string, unknown> = {
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    client_reference_id: username,
    success_url: `${origin}/app/?payment=success&product=${DEBUG_PACK_PRODUCT}`,
    cancel_url: `${origin}/app/`,
    adaptive_pricing: { enabled: false },
    metadata,
    // The PaymentIntent carries the same marks, so a refund of this payment
    // (charge.refunded) is recognised as the pack's and never revokes Pro.
    payment_intent_data: { metadata },
  };
  if (typeof email === "string" && email) params.customer_email = email.toLowerCase();

  try {
    const tStripe = Date.now();
    // deno-lint-ignore no-explicit-any
    const session = await stripe.checkout.sessions.create(params as any);
    console.log(`timing debug_pack stripe=${Date.now() - tStripe}ms`);
    if (!session.url) {
      await logCheckoutEvent("debug_pack_checkout_failed", username, { product: DEBUG_PACK_PRODUCT, region, stage: "no_url" });
      return json({ error: "checkout_unavailable" }, 502, origin);
    }
    await logCheckoutEvent("debug_pack_checkout_started", username, { session_id: session.id, product: DEBUG_PACK_PRODUCT, region, trial: false, notes });
    return json({ url: session.url, product: DEBUG_PACK_PRODUCT, region, trial: false, notes }, 200, origin);
  } catch (err) {
    const type = (err as { type?: string })?.type || "unknown";
    const code = (err as { code?: string })?.code || "";
    console.error(`[create-checkout-session] stripe error (debug pack) ${type} ${code}`);
    await logCheckoutEvent("debug_pack_checkout_failed", username, { product: DEBUG_PACK_PRODUCT, region, stage: "stripe", error_type: type, error_code: code || null });
    return json({ error: "checkout_unavailable" }, 502, origin);
  }
}
