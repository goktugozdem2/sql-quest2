// Supabase Edge Function: AI Tutor Proxy
// Proxies AI calls through your server with rate limiting per user tier
// Deploy: supabase functions deploy ai-tutor --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Daily call limits by plan type
const DAILY_LIMITS: Record<string, number> = {
  free: 10,
  monthly: 50,
  annual: 75,
  lifetime: 100,
};

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-username",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { username, messages, systemPrompt } = body;

    if (!username) {
      return new Response(
        JSON.stringify({ error: "Username required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 1. Look up user and determine their plan ---
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("username, data")
      .eq("username", username)
      .single();

    if (userError || !userRecord) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userData = userRecord.data || {};
    
    // Determine plan type
    let planType = "free";
    if (userData.proStatus === true) {
      const expiry = new Date(userData.proExpiry || 0);
      if (expiry > new Date()) {
        planType = userData.proType || "monthly";
      }
    }

    const dailyLimit = DAILY_LIMITS[planType] || DAILY_LIMITS.free;

    // --- 2. Check rate limit ---
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Get or create today's usage record
    const { data: usageRecord } = await supabase
      .from("ai_usage")
      .select("*")
      .eq("username", username)
      .eq("date", today)
      .single();

    const currentCount = usageRecord?.call_count || 0;

    if (currentCount >= dailyLimit) {
      return new Response(
        JSON.stringify({
          error: "Daily AI limit reached",
          limit: dailyLimit,
          used: currentCount,
          plan: planType,
          resetsAt: today + "T24:00:00Z",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 3. Call Claude API ---
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1000,
        system: systemPrompt || "You are a helpful SQL tutor.",
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Anthropic API error:", response.status, errorData);
      return new Response(
        JSON.stringify({ error: "AI service error", status: response.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const text = aiResponse.content?.[0]?.text || "";

    // --- 4. Update usage count ---
    if (usageRecord) {
      await supabase
        .from("ai_usage")
        .update({ call_count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq("username", username)
        .eq("date", today);
    } else {
      await supabase
        .from("ai_usage")
        .insert({ username, date: today, call_count: 1, plan_type: planType });
    }

    // --- 5. Return response ---
    return new Response(
      JSON.stringify({
        text,
        usage: {
          used: currentCount + 1,
          limit: dailyLimit,
          plan: planType,
          remaining: dailyLimit - currentCount - 1,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
