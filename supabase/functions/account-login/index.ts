// Supabase Edge Function: account-login
// Deploy: supabase functions deploy account-login --no-verify-jwt
//
// Signs a user in by username or email and returns their account record.
// The password check happens here, against the stored salt and hash, with
// the service role — the client no longer needs to read another account's
// credentials to log in. Same hash format the client has always written:
// lowercase hex SHA-256 of (salt || password).
//
// Failed attempts are counted per login in public.account_login_attempts:
// 5 failures inside 15 minutes lock that login for 15 minutes. The response
// never says whether the username or the password was wrong.
//
// Session tokens (2026-09-23, docs/plans/account-session-tokens-2026-09-22.md):
// a correct password mints a random 32-byte token, stores only its SHA-256 in
// public.account_sessions, and returns the token as `sessionToken`. The client
// sends it as p_token on every sq_load_account / sq_save_user call. This is the
// ONLY place a token for an existing account is minted — anon cannot reach
// account_sessions and there is no SQL function that mints one — so holding a
// token means someone typed this account's password on that browser.
// Registration gets its token here too: right after the registering save the
// client signs in with the credentials it just set (no second function).
// If the insert fails (the migration not applied yet) the sign-in still
// succeeds without a token: step 1 records a missing token, it never refuses.

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

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function newSessionToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Mint, store the hash, return the token (null when the table is not there).
export async function mintSession(supabase: any, username: string): Promise<string | null> {
  const token = newSessionToken()
  try {
    const { error } = await supabase.from('account_sessions').insert({ username, token_hash: await sha256Hex(token) })
    if (error) { console.error('account_sessions insert failed:', error.message || error); return null }
  } catch (err) {
    console.error('account_sessions insert failed:', err)
    return null
  }
  return token
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  let body: any
  try { body = await req.json() } catch { return json({ ok: false, error: 'invalid_json' }, 400) }

  const login = String(body?.login || '').trim().toLowerCase().slice(0, 254)
  const password = String(body?.password || '')
  if (login.length < 3 || !password || password.length > 256) {
    return json({ ok: false, error: 'invalid_credentials' }, 401)
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  // ── lockout ──
  const now = Date.now()
  const { data: attempt } = await supabase
    .from('account_login_attempts').select('*').eq('login', login).maybeSingle()
  if (attempt?.locked_until && new Date(attempt.locked_until).getTime() > now) {
    return json({ ok: false, error: 'locked', retryAfterSeconds: Math.ceil((new Date(attempt.locked_until).getTime() - now) / 1000) }, 429)
  }

  const recordFailure = async () => {
    const inWindow = attempt && now - new Date(attempt.window_started_at).getTime() < WINDOW_MS
    const failures = (inWindow ? attempt.failures : 0) + 1
    await supabase.from('account_login_attempts').upsert({
      login,
      failures,
      window_started_at: inWindow ? attempt.window_started_at : new Date(now).toISOString(),
      locked_until: failures >= MAX_FAILURES ? new Date(now + LOCK_MS).toISOString() : null,
    })
    return failures >= MAX_FAILURES
  }

  // ── find the account ──
  let row: any = null
  if (login.includes('@')) {
    const byColumn = await supabase.from('users').select('username,password_hash,salt,email,data').eq('email', login).limit(1)
    row = byColumn.data?.[0] || null
    if (!row) {
      const byData = await supabase.from('users').select('username,password_hash,salt,email,data').eq('data->>email', login).limit(1)
      row = byData.data?.[0] || null
    }
  } else {
    const byName = await supabase.from('users').select('username,password_hash,salt,email,data').eq('username', login).limit(1)
    row = byName.data?.[0] || null
  }

  const storedHash = String(row?.password_hash || row?.data?.passwordHash || '')
  const storedSalt = String(row?.salt || row?.data?.salt || '')
  // Run the hash even when there is no account, so timing does not reveal it.
  const computed = await sha256Hex((storedSalt || 'no-account-salt') + password)
  const ok = !!row && storedHash.length > 0 && timingSafeEqual(computed, storedHash)

  if (!ok) {
    const locked = await recordFailure()
    return json({ ok: false, error: locked ? 'locked' : 'invalid_credentials' }, locked ? 429 : 401)
  }

  if (attempt) await supabase.from('account_login_attempts').delete().eq('login', login)

  // The owner's own record, as the client has always held it locally.
  const data = (row.data && typeof row.data === 'object') ? { ...row.data } : {}
  data.passwordHash = storedHash
  data.salt = storedSalt
  if (row.email || data.email) data.email = row.email || data.email

  const sessionToken = await mintSession(supabase, row.username)

  return json({ ok: true, username: row.username, data, sessionToken })
})
