// Supabase Edge Function: resend-webhook
// Deploy with verify_jwt=false — Resend calls this, not our clients.
// Auth is the Svix signature instead (RESEND_WEBHOOK_SECRET).
//
// Receives Resend webhook events (email.delivered / opened / clicked /
// bounced / complained) and appends them to email_events, joined back to
// the original send by resend_id. This is the read side of the email
// measurement loop: senders log 'sent', this logs what happened next.
//
// Setup:
//   1. Resend dashboard → Webhooks → Add endpoint:
//        https://<project>.supabase.co/functions/v1/resend-webhook
//      Events: delivered, opened, clicked, bounced, complained
//   2. Copy the signing secret (whsec_...) →
//        supabase secrets set RESEND_WEBHOOK_SECRET=whsec_...
//
// Fails closed: if the secret is missing or the signature doesn't verify,
// the event is dropped with 401. Analytics rows are not worth accepting
// unauthenticated writes for.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_WEBHOOK_SECRET.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const enc = new TextEncoder()

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64(bytes: ArrayBuffer): string {
  let bin = ''
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
  return btoa(bin)
}

// Svix signature scheme (used by Resend): HMAC-SHA256 over "<id>.<ts>.<body>"
// with the base64-decoded secret; header carries space-separated "v1,<b64sig>".
async function verifySvix(secret: string, id: string, ts: string, body: string, sigHeader: string): Promise<boolean> {
  try {
    const secretB64 = secret.startsWith('whsec_') ? secret.slice(6) : secret
    const key = await crypto.subtle.importKey(
      'raw', b64ToBytes(secretB64).buffer as ArrayBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const signed = await crypto.subtle.sign('HMAC', key, enc.encode(`${id}.${ts}.${body}`))
    const expected = bytesToB64(signed)
    return sigHeader.split(' ').some(part => {
      const [, sig] = part.split(',')
      return sig === expected
    })
  } catch (_) {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET')
  if (!secret) return new Response('webhook secret not configured', { status: 401 })

  const svixId = req.headers.get('svix-id') || ''
  const svixTs = req.headers.get('svix-timestamp') || ''
  const svixSig = req.headers.get('svix-signature') || ''
  const body = await req.text()

  // Reject stale timestamps (replay guard, 5 min tolerance).
  const tsNum = parseInt(svixTs, 10)
  if (!tsNum || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    return new Response('stale timestamp', { status: 401 })
  }

  if (!(await verifySvix(secret, svixId, svixTs, body, svixSig))) {
    return new Response('invalid signature', { status: 401 })
  }

  let payload: any
  try { payload = JSON.parse(body) } catch (_) {
    return new Response('bad payload', { status: 400 })
  }

  const type = String(payload?.type || '')            // e.g. "email.opened"
  const event = type.replace(/^email\./, '')          // "opened"
  const resendId = payload?.data?.email_id || null
  const toEmail = Array.isArray(payload?.data?.to) ? payload.data.to[0] : (payload?.data?.to || null)
  if (!event || !resendId) return new Response('ignored', { status: 200 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Copy template/username from the original 'sent' row so per-template
  // funnels don't need a join at read time.
  let template = 'unknown', username: string | null = null
  try {
    const { data: sentRow } = await supabase
      .from('email_events')
      .select('template, username')
      .eq('resend_id', resendId)
      .eq('event', 'sent')
      .maybeSingle()
    if (sentRow) { template = sentRow.template; username = sentRow.username }
  } catch (_) { /* best-effort */ }

  try {
    await supabase.from('email_events').insert({
      username, email: toEmail, template, event, resend_id: resendId,
      meta: { link: payload?.data?.click?.link || null },
    })
  } catch (_) {
    // Table missing or insert failure — still 200 so Resend doesn't retry forever.
  }

  return new Response('ok', { status: 200 })
})
