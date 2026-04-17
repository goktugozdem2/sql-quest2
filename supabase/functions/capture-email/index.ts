// Supabase Edge Function: capture-email
// Deploy: supabase functions deploy capture-email
//
// Accepts { email, source, variant } POSTs from the landing pages and the
// signed-out Coach empty state. Inserts into `email_captures` (deduped on
// email). Intentionally permissive on rejection: we'd rather drop a dupe
// silently than leak whether an email is on our list.
//
// Required migration (run once in Supabase SQL editor):
//
//   create table if not exists public.email_captures (
//     id                 bigint generated always as identity primary key,
//     email              text not null,
//     source             text,                       -- 'coach_signed_out', 'landing_home', etc.
//     variant            text,                       -- analytics variant tag
//     user_agent         text,
//     referrer           text,
//     ip_hash            text,
//     captured_at        timestamptz not null default now(),
//     -- Drip sequence state (used by capture-email-drip edge function):
//     unsubscribe_token  text,
//     unsubscribed       boolean not null default false,
//     last_drip_index    int     not null default -1,
//     last_drip_sent_at  timestamptz,
//     unique(email)
//   );
//   create index if not exists email_captures_captured_at_idx
//     on public.email_captures (captured_at desc);
//   create index if not exists email_captures_drip_idx
//     on public.email_captures (unsubscribed, last_drip_index, last_drip_sent_at);
//
//   -- RLS on, no public access. Service role (edge function) writes.
//   alter table public.email_captures enable row level security;
//
// Env (already configured in Supabase project):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Invocation from the client (no auth — this is a public capture endpoint):
//   fetch('<project>.supabase.co/functions/v1/capture-email', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', apikey: <anon key> },
//     body: JSON.stringify({ email, source, variant })
//   })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// RFC-5322 "good enough" — defensible without being a regex contest.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  const email = String(body?.email || '').trim().toLowerCase()
  if (!email || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid_email' }, 400)
  }
  // Cap to something sane so we don't store an email-length DOS
  if (email.length > 255) return json({ ok: false, error: 'email_too_long' }, 400)

  const source  = truncate(String(body?.source  || 'unknown'), 60)
  const variant = truncate(String(body?.variant || ''), 60) || null

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ ok: false, error: 'server_misconfigured' }, 500)
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const userAgent = truncate(req.headers.get('user-agent') || '', 512)
  const referrer  = truncate(req.headers.get('referer')    || '', 512)
  const ipHash    = hashIp(req.headers.get('x-forwarded-for') || '')

  // Upsert so dupes don't throw — we return ok either way. Don't tell the
  // client whether the email was already on the list (avoid enumeration).
  // New rows get a per-email unsubscribe token for drip sequence links.
  const unsubscribeToken = generateToken(16)
  const { error } = await supabase
    .from('email_captures')
    .upsert(
      {
        email,
        source,
        variant,
        user_agent: userAgent,
        referrer,
        ip_hash: ipHash,
        unsubscribe_token: unsubscribeToken,
      },
      { onConflict: 'email', ignoreDuplicates: true }
    )

  if (error) {
    // Log-side only — don't leak to client. Still return ok:true so the
    // form can show a friendly "thanks" regardless.
    console.error('[capture-email] insert error:', error.message)
  }

  return json({ ok: true })
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function truncate(s: string, n: number) {
  if (!s) return s
  return s.length > n ? s.slice(0, n) : s
}

// Generate a URL-safe random token (hex). Used for unsubscribe links in
// drip emails — see supabase/functions/capture-email-drip/index.ts.
function generateToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

// Simple FNV-1a-ish hash of the IP — stops us from storing raw IPs while
// still letting us detect repeat submissions from the same source.
function hashIp(ip: string): string {
  if (!ip) return ''
  const primary = ip.split(',')[0].trim()
  let h = 2166136261
  for (let i = 0; i < primary.length; i++) {
    h ^= primary.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}
