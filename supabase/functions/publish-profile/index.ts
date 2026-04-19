// Supabase Edge Function: publish-profile
// Deploy: supabase functions deploy publish-profile
//
// Accepts a user's SQL Quest profile snapshot and upserts it into the
// public_profiles table. Reads are unrestricted (anon can SELECT); writes
// go through this function so we can enforce handle ownership via a shared
// secret the client only knows for their own account.
//
// Threat model (v1, intentionally light):
//   - Squatting: first writer owns a handle forever. Subsequent writes to
//     the same handle must include the matching ownership_hash. If a handle
//     is stale (no updates in N days) we don't auto-release; a human can
//     delete from Supabase to free it.
//   - Impersonation: since SQL Quest uses its own user system (not Supabase
//     Auth), we derive `ownership_hash` from the user's stored password hash
//     + a salt. This binds the public handle to the real account without
//     surfacing the password. If someone copies the ownership_hash from a
//     friend's browser, they can update that profile — accepted risk for
//     v1 on a learning app.
//   - Garbage data: we cap field sizes and skip rows with no skill data.
//
// Required migration (run once in Supabase SQL editor):
//
//   create table if not exists public.public_profiles (
//     handle           text primary key,
//     display_name     text,
//     skills           jsonb not null default '{}'::jsonb,
//     total_solves     int    not null default 0,
//     streak           int    not null default 0,
//     xp               int    not null default 0,
//     archetype_name   text,
//     archetype_emoji  text,
//     ownership_hash   text not null,
//     updated_at       timestamptz not null default now(),
//     created_at       timestamptz not null default now()
//   );
//   create index if not exists public_profiles_updated_at_idx
//     on public.public_profiles (updated_at desc);
//
//   -- RLS: anon SELECT allowed, no direct write. Writes go through this
//   -- edge function using the service role key.
//   alter table public.public_profiles enable row level security;
//   create policy "Public read of profiles"
//     on public.public_profiles for select
//     to anon using (true);
//
// Env (already configured):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{1,30}$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'method_not_allowed' }, 405)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }

  const handle = String(body?.handle || '').trim().toLowerCase()
  if (!handle || !HANDLE_RE.test(handle)) {
    return json({ ok: false, error: 'invalid_handle' }, 400)
  }

  const ownershipHash = String(body?.ownership_hash || '').slice(0, 200)
  if (!ownershipHash) {
    return json({ ok: false, error: 'missing_ownership' }, 400)
  }

  const skills = isPlainObject(body?.skills) ? body.skills : null
  if (!skills || Object.keys(skills).length === 0) {
    return json({ ok: false, error: 'no_skills' }, 400)
  }
  // Cap skill payload size. A legit profile is ~500 bytes; anything over 8KB
  // is either garbage or someone probing.
  const skillsJson = JSON.stringify(skills)
  if (skillsJson.length > 8192) {
    return json({ ok: false, error: 'skills_too_large' }, 400)
  }

  const row = {
    handle,
    display_name: truncate(String(body?.display_name || handle), 40),
    skills,
    total_solves: toInt(body?.total_solves, 0, 0, 100000),
    streak:       toInt(body?.streak, 0, 0, 10000),
    xp:           toInt(body?.xp, 0, 0, 10_000_000),
    archetype_name:  truncate(String(body?.archetype_name  || ''), 60) || null,
    archetype_emoji: truncate(String(body?.archetype_emoji || ''), 8) || null,
    ownership_hash:  ownershipHash,
    updated_at: new Date().toISOString(),
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Handle ownership check: if the row already exists with a different
  // ownership_hash, reject. Otherwise upsert.
  const { data: existing, error: readErr } = await supa
    .from('public_profiles')
    .select('ownership_hash')
    .eq('handle', handle)
    .maybeSingle()

  if (readErr) {
    return json({ ok: false, error: 'db_read_failed' }, 500)
  }

  if (existing && existing.ownership_hash !== ownershipHash) {
    return json({ ok: false, error: 'handle_claimed' }, 409)
  }

  const { error: writeErr } = await supa
    .from('public_profiles')
    .upsert(row, { onConflict: 'handle' })

  if (writeErr) {
    return json({ ok: false, error: 'db_write_failed', detail: writeErr.message }, 500)
  }

  return json({ ok: true, handle, url: `/u/${handle}/` })
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function truncate(s: string, n: number) {
  if (!s) return ''
  return s.length <= n ? s : s.slice(0, n)
}

function toInt(v: any, fallback: number, min: number, max: number) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n)))
}

function isPlainObject(x: any): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}
