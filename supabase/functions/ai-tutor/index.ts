// Supabase Edge Function: AI Tutor Proxy
// Proxies AI calls through your server with rate limiting per user tier
// Deploy: supabase functions deploy ai-tutor --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Daily call limits by plan type
const DAILY_LIMITS: Record<string, number> = {
  guest: 5,
  free: 20,
  monthly: 50,
  annual: 75,
  lifetime: 100,
};

// Phase-dependent max tokens — keep responses short and fast
const PHASE_MAX_TOKENS: Record<string, number> = {
  intro: 200,
  teaching: 350,
  practice: 300,
  feedback: 400,
  comprehension: 200,
  comprehension_feedback: 300,
  guided_build: 250,
  study: 350,
  // Sector MVP — goal_discovery returns a JSON object with extraction.
  // Slightly larger budget so the model has room for the summary line
  // in the user's language plus the structured fields.
  goal_discovery: 500,
  // Live Tutor — proactive nudge after a wrong submit. 1-2 sentences max.
  // Tight budget keeps cost minimal at scale and forces concision.
  live_nudge: 120,
};

const DEFAULT_MAX_TOKENS = 350;

// Sector MVP — hardcoded system prompt for goal_discovery mode.
// Lives backend-side so it can't be overridden by client (prompt
// injection / drift). Mirror the canonical sector list in
// src/data/sectors.js — keep these in lockstep.
const GOAL_DISCOVERY_SYSTEM_PROMPT = `You are extracting structured career goals from a brief 3-question SQL Quest mentor conversation. The user has answered three short questions:

Q1: Why do they want to learn SQL? (Job, interview, leveling up at work, curiosity, etc.)
Q2: What kind of data do they work with — or want to work with?
Q3: Where do they want to be in 6 months?

Extract these fields. Return ONLY a single JSON object. No markdown fences, no commentary, no prose before or after the JSON.

Required schema:
{
  "sector": "finans" | "e-ticaret" | "gayrimenkul" | "generic" | null,
  "role": string | null,
  "motivation": "interview" | "current_job" | "career_change" | "curiosity" | null,
  "experience": "beginner" | "intermediate" | "advanced" | null,
  "target": string | null,
  "ai_confidence": number,
  "summary_for_user": string
}

Rules:
- "sector" must be exactly one of the canonical values or null. Use:
  - "finans" → banking, fintech, insurance, payments, transactions, fraud detection, trading, mortgage-lending side
  - "e-ticaret" → online retail, marketplaces, basket/orders/products/SKUs, conversion funnels
  - "gayrimenkul" → real estate, property, listings, agents, time-on-market, mortgage-borrower side
  - "generic" → user explicitly mentioned no sector or said "all sectors"
  - null → unclear, don't guess
- "role" is a free-form snake_case string. Examples: "data_analyst", "data_scientist", "business_analyst", "data_engineer", "product_manager", "developer", "manager", "student", "analyst". Pick the most specific honest match. If unclear, leave null.
- "motivation" must be exactly one of the four enum values or null. Map common phrasings:
  - "mülakata hazırlanıyorum" / "for an interview" → "interview"
  - "mevcut işimde" / "at my job" / "manager wants me to" → "current_job"
  - "kariyer değişikliği" / "switching careers" / "career break" → "career_change"
  - "merak" / "just curious" / "for fun" → "curiosity"
- "experience" reflects what the USER said about themselves. "Beginner / sıfırdan / new graduate" → "beginner". "Some experience / a few years / mid-level" → "intermediate". "Senior / many years / expert / yıllarca" → "advanced". A user saying "I want to BECOME advanced" is NOT advanced — leave it null or pick beginner. Don't confuse aspiration with current state.
- "target" is free-form. Examples: "FAANG", "international", "promotion", "local_bank", "real_estate_firm". Null if unclear.
- "ai_confidence" is your overall confidence 0.0..1.0. Be honest — 0.4 is fine if signals were weak.
- "summary_for_user" MUST be in the same language as the user's answers (Turkish if their text was Turkish, English if English). One short sentence. Acknowledge what you learned and that you're tuning the Coach. Examples:
  - TR: "Anladım — Coach'u finans sektörüne göre ayarlıyorum, mülakat hazırlığı odaklı."
  - EN: "Got it — I'll tune the Coach for finance, focused on interview prep."
  - If extraction is mostly null: "Got it. Coach will start generic — we can refine later."
- NEVER invent fields the user didn't mention. Better to leave null. The downstream consumer respects nullness.

Output: a single valid JSON object only. Nothing else.`

// Live Tutor — proactive nudge after a wrong submit. Voice: friendly
// senior dev nudging a junior. Hard ceiling on length so the toast UI
// stays readable. NEVER hand the answer — point at the missing concept.
const LIVE_NUDGE_SYSTEM_PROMPT = `You are SQL Quest's Live AI Tutor. A student just hit a wrong submit on a SQL challenge. You see their query, the auto-diagnosis, and the challenge meta. Write ONE short, conversational nudge — like a senior dev leaning over their shoulder.

Hard rules:
- 1 to 2 sentences. NEVER more than 2.
- Conversational, friendly, second-person ("Try…", "Notice that…", "You're missing…"). NOT robotic.
- DON'T hand the answer. DON'T paste a corrected query. Point at the CONCEPT they're missing or the SPECIFIC line that's wrong.
- If the diagnosis names a clear pattern (NULL handling, integer division, JOIN fan-out, missing GROUP BY), surface it explicitly.
- If their query is in Turkish (variable names, comments) or the description is Turkish, reply in Turkish. Otherwise English.
- Plain text only. No markdown headers, no bullets, no emoji prefix (the UI adds 🤖).

Output: just the nudge text. No greeting, no sign-off.`;

// CORS headers for browser requests
function getCorsHeaders(reqOrigin: string | null): Record<string, string> {
  // If ALLOWED_ORIGIN is set, restrict to that domain; otherwise allow all
  const allowedOrigin = ALLOWED_ORIGIN
    ? (reqOrigin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN)
    : "*";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-username",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

serve(async (req) => {
  const reqOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(reqOrigin);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { username, messages, systemPrompt, phase, challenge_id, mode } = body;

    // The user's literal question — the intent signal tutor_events was
    // missing. Truncated hard: this is for content-gap analysis, not
    // transcript storage.
    const lastUserMsg = Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m?.role === "user")
      : null;
    const questionText = typeof lastUserMsg?.content === "string"
      ? lastUserMsg.content.slice(0, 500)
      : null;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sector MVP: when client requests goal_discovery mode, override the
    // system prompt with our hardcoded extraction prompt (so it can't be
    // tampered with) and tag the phase for cost analytics. Client-supplied
    // systemPrompt is ignored in this mode.
    let effectiveSystemPrompt = systemPrompt;
    let effectivePhase = phase;
    if (mode === "goal_discovery") {
      effectiveSystemPrompt = GOAL_DISCOVERY_SYSTEM_PROMPT;
      effectivePhase = "goal_discovery";
    }
    // Live Tutor proactive nudge — pin the system prompt server-side so
    // it can't be tampered with from the client. The client packs the
    // challenge + query + diagnosis into a single user message; we don't
    // need a multi-turn conversation here. Phase tag is for analytics.
    if (mode === "live_nudge") {
      effectiveSystemPrompt = LIVE_NUDGE_SYSTEM_PROMPT;
      effectivePhase = "live_nudge";
    }

    // --- 1. Look up user and determine their plan ---
    const isGuest = !username || username.startsWith("guest_");
    let planType = "guest";
    let rateLimitUsername = username || `guest_${req.headers.get("x-forwarded-for") || "unknown"}`;

    if (!isGuest) {
      // IMPORTANT: only select the specific JSONB fields we need.
      // Selecting the full `data` column pulls hundreds of KB per call
      // (conversation history, lesson progress, etc.) and blows up egress.
      const { data: userRecord, error: userError } = await supabase
        .from("users")
        .select("username, data->proStatus, data->proType, data->proExpiry")
        .eq("username", username)
        .single();

      if (userError || !userRecord) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Determine plan type
      planType = "free";
      if (userRecord.proStatus === true) {
        const expiry = new Date(userRecord.proExpiry || 0);
        if (expiry > new Date()) {
          planType = userRecord.proType || "monthly";
        }
      }
    }

    const dailyLimit = DAILY_LIMITS[planType] || DAILY_LIMITS.guest;

    // --- 2. Atomic rate limit check-and-increment ---
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    // Use upsert + check in a single operation to prevent race conditions
    const { data: upsertResult, error: upsertError } = await supabase
      .rpc("increment_ai_usage", {
        p_username: rateLimitUsername,
        p_date: today,
        p_plan_type: planType,
        p_daily_limit: dailyLimit,
      });

    if (upsertError) {
      // Fallback to non-atomic approach if RPC doesn't exist yet
      console.warn("RPC not available, falling back:", upsertError.message);

      const { data: usageRecord } = await supabase
        .from("ai_usage")
        .select("call_count")
        .eq("username", rateLimitUsername)
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

      // Call Claude API with non-atomic path
      const maxTokens = PHASE_MAX_TOKENS[effectivePhase] || DEFAULT_MAX_TOKENS;
      const response = await callClaude(messages, effectiveSystemPrompt, maxTokens);
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

      // Log tutor event (fire-and-forget, fallback path)
      supabase
        .from("tutor_events")
        .insert({
          username,
          challenge_id: challenge_id || null,
          phase: effectivePhase || null,
          question: questionText,
        })
        .then(({ error }) => {
          if (error) console.warn("tutor_events insert failed:", error.message);
        });

      // Update usage count (non-atomic fallback)
      if (usageRecord) {
        await supabase
          .from("ai_usage")
          .update({ call_count: currentCount + 1, updated_at: new Date().toISOString() })
          .eq("username", rateLimitUsername)
          .eq("date", today);
      } else {
        await supabase
          .from("ai_usage")
          .insert({ username: rateLimitUsername, date: today, call_count: 1, plan_type: planType });
      }

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
    }

    // Atomic path succeeded
    const { new_count, was_limited } = upsertResult;

    if (was_limited) {
      return new Response(
        JSON.stringify({
          error: "Daily AI limit reached",
          limit: dailyLimit,
          used: new_count,
          plan: planType,
          resetsAt: today + "T24:00:00Z",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- 3. Call Claude API ---
    const maxTokens = PHASE_MAX_TOKENS[effectivePhase] || DEFAULT_MAX_TOKENS;
    const response = await callClaude(messages, effectiveSystemPrompt, maxTokens);

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

    // --- 4. Log tutor event (fire-and-forget) ---
    supabase
      .from("tutor_events")
      .insert({
        username: rateLimitUsername,
        challenge_id: challenge_id || null,
        phase: effectivePhase || null,
        question: questionText,
      })
      .then(({ error }) => {
        if (error) console.warn("tutor_events insert failed:", error.message);
      });

    // --- 5. Return response ---
    return new Response(
      JSON.stringify({
        text,
        usage: {
          used: new_count,
          limit: dailyLimit,
          plan: planType,
          remaining: dailyLimit - new_count,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const corsHeaders = getCorsHeaders(null);
    console.error("Proxy error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Call Claude API
async function callClaude(messages: any[], systemPrompt: string | undefined, maxTokens: number) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: systemPrompt || "You are a helpful SQL tutor.",
      messages: messages,
    }),
  });
}
