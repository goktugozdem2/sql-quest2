// Supabase Edge Function: account-password
// Deploy: supabase functions deploy account-password --no-verify-jwt
//
// Changes a password after checking the current one server-side. Client
// saves can no longer replace a stored password hash (public.sq_save_user
// keeps the row's own), so this is the path for "Change password" in the
// app. The new salt and hash are computed here in the client's format (hex
// SHA-256 of salt || password) so every existing login path keeps working.
//
// Shares the failure counter with account-login.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function newSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  let body: any
  try { body = await req.json() } catch { return json({ ok: false, error: 'invalid_json' }, 400) }

  const username = String(body?.username || '').trim().toLowerCase().slice(0, 64)
  const current = String(body?.currentPassword || '')
  const next = String(body?.newPassword || '')
  if (!username || !current || next.length < 6 || next.length > 256) {
    return json({ ok: false, error: 'invalid_request' }, 400)
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const now = Date.now()
  const { data: attempt } = await supabase
    .from('account_login_attempts').select('*').eq('login', username).maybeSingle()
  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > now) {
    return json({ ok: false, error: 'locked' }, 429)
  }

  const { data: rows } = await supabase.from('users').select('username,password_hash,salt,data').eq('username', username).limit(1)
  const row = rows?.[0]
  const storedHash = String(row?.password_hash || row?.data?.passwordHash || '')
  const storedSalt = String(row?.salt || row?.data?.salt || '')
  const computed = await sha256Hex((storedSalt || 'no-account-salt') + current)
  if (!row || !storedHash || !timingSafeEqual(computed, storedHash)) {
    const inWindow = attempt && now - new Date(attempt.window_started_at).getTime() < WINDOW_MS
    const failures = (inWindow ? attempt.failures : 0) + 1
    await supabase.from('account_login_attempts').upsert({
      login: username,
      failures,
      window_started_at: inWindow ? attempt.window_started_at : new Date(now).toISOString(),
      locked_until: failures >= MAX_FAILURES ? new Date(now + LOCK_MS).toISOString() : null,
    })
    return json({ ok: false, error: 'invalid_credentials' }, 401)
  }

  const salt = newSalt()
  const hash = await sha256Hex(salt + next)
  const data = (row.data && typeof row.data === 'object') ? { ...row.data } : {}
  data.passwordHash = hash
  data.salt = salt

  const { error } = await supabase.from('users')
    .update({ password_hash: hash, salt, data, updated_at: new Date().toISOString() })
    .eq('username', username)
  if (error) return json({ ok: false, error: 'save_failed' }, 500)

  if (attempt) await supabase.from('account_login_attempts').delete().eq('login', username)
  return json({ ok: true, salt, passwordHash: hash })
})
