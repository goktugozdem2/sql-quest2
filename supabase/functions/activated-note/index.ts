// Supabase Edge Function: activated-note
// Deploy: supabase functions deploy activated-note
// Dry run: GET /functions/v1/activated-note?dry=1  — resolves the audience,
// renders one sample, sends nothing.
// NOT scheduled. The founder runs it, one batch a day, until the segment is
// drained; sending is a decision, not a default.
//
// The founder's week-2 plan, item 8 (2026-09-12): "one email to the
// activated non-payers, a single CTA." Measured that evening: 136 registered
// accounts with six or more distinct solves, never a stripe_webhook purchase,
// every one with an email address, 87 active in the last 30 days. Every
// purchase in the product's history came at 6–10 solves in the first session
// (docs/reads/purchase-timing-2026-09-09.md); these people passed that point
// and were asked once, by the modal, on the day. This is the second ask, in
// the founder's voice, with the interview promise the homepage now makes.
//
// Guards:
//   - once per user EVER (userData.activatedNoteAt). A second ask is a
//     letter, not a sequence.
//   - six distinct solves or more (MIN_SOLVES): the segment is the activated.
//   - never a payer: proStatus true (bought, granted, or trialling) skips.
//   - no stacking: anyone with any campaign email in the last 7 days
//     (email_events) waits for the next batch.
//   - per-run cap (MAX_PER_RUN): 136 identical-minute sends is the bulk
//     fingerprint (docs/outreach-2026-08-05.md); this drains over four days,
//     and a copy mistake costs one batch.
//   - skips opted-out, no-email, internal, guests (no row).
//   - the body is personal on purpose: solve count, the weakest skill on the
//     person's radar when the record holds one, the company they named.
//     Same substance, never byte-identical bodies.
//
//   - every letter goes out as HTML AND plain text (the text part is
//     rendered from the same template; deliverability).
//
// The single CTA opens the Pro modal directly (?pro=1, reason 'email_link' in
// src/app.jsx) — the surface where checkout happens, not a page about it.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// The letter itself (2026-11-25): the layout is a React Email template,
// emails/activated-note.tsx, rendered at build time into
// ./template.generated.ts (scripts/build-emails.mjs) — no React runtime here.
// letter.ts picks the per-recipient sentences and fills the slots; it is
// pure, so tests/activated-note-template.test.js renders real letters.
import { renderActivatedNote, weakestSkill } from './letter.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIN_SOLVES = 6
const MAX_PER_RUN = 40
const QUIET_DAYS = 7
const TEMPLATE = 'activated_note'

// Internal accounts (inlined; keep in sync across email functions — canonical
// copy lives in lapsed-pro).
const isInternalAccount = (username: string, email?: string | null) => {
  const u = (username || '').toLowerCase()
  const e = (email || '').toLowerCase()
  return /^(test|demo|admin|qa)\d*$/i.test(u) ||
    u === 'sqlquest' ||
    u === 'elena' ||
    u.includes('fabletest') ||
    /^linktest/.test(u) ||
    /^internalroutine/.test(u) ||
    e.endsWith('@datrick.com') ||
    e.endsWith('@example.com') ||
    e.endsWith('@mailtest.com')
}

const REPLY_TO = 'goktug@datrick.com'

// ── shared email plumbing (inlined; keep in sync across email functions) ──
const SITE = 'https://sqlquest.app'
const FROM = 'Göktuğ at SQL Quest <noreply@sqlquest.app>'

const utm = (path: string, camp: string) =>
  `${SITE}${path}${path.includes('?') ? '&' : '?'}utm_source=email&utm_campaign=${camp}`

async function ensureUnsubToken(supabase: any, username: string, userData: any): Promise<string> {
  if (userData.unsubToken) return userData.unsubToken
  userData.unsubToken = crypto.randomUUID()
  await supabase.from('users').update({ data: userData }).eq('username', username)
  return userData.unsubToken
}

const unsubLink = (token: string) =>
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/email-unsubscribe?ut=${token}`

const footer = (unsub: string) => `
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:32px;line-height:1.7;">
    SQL Quest — SQL interview practice by company · <a href="${SITE}" style="color:#9ca3af;">sqlquest.app</a><br>
    <a href="${unsub}" style="color:#9ca3af;">Unsubscribe</a>
  </p>`

// This copy differs from the other senders' in two optional fields, added
// for the React Email letter (2026-11-25): `text` sends the plain-text part,
// and `footerInHtml` says the template already carries the footer with the
// unsubscribe link (a full <html> document must not get one appended after
// </html>). Without them it behaves exactly like the other copies.
async function sendAndLog(supabase: any, apiKey: string, args: {
  to: string; username: string; template: string; subject: string;
  html: string; unsub: string; replyTo?: string; text?: string; footerInHtml?: boolean;
}): Promise<boolean> {
  let ok = false, resendId: string | null = null, status = 0
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: FROM,
        to: args.to,
        subject: args.subject,
        html: args.footerInHtml ? args.html : args.html + footer(args.unsub),
        ...(args.text ? { text: args.text } : {}),
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        headers: { 'List-Unsubscribe': `<${args.unsub}>` },
      }),
    })
    ok = res.ok
    status = res.status
    try { resendId = (await res.json())?.id ?? null } catch (_) { /* ignore */ }
  } catch (_) { ok = false }
  try {
    await supabase.from('email_events').insert({
      username: args.username, email: args.to, template: args.template,
      event: ok ? 'sent' : 'send_failed', resend_id: resendId,
      meta: ok ? {} : { status },
    })
  } catch (_) { /* measurement is best-effort */ }
  return ok
}
// ── end shared block ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Caller gate (2026-09-17): the anon key ships in every browser, and JWT
  // verification lets it through — without this line anyone with the URL
  // could trigger a send. Only the service role may call this function.
  // The pg_cron jobs must carry it (supabase/manual/20260917_cron_service_role.sql).
  // Accepted: the SENDER_SECRET function secret (what pg_cron and the founder
  // send — set 2026-09-17 after the Vault's service-role copy turned out not to
  // equal the function's own), or the service role key itself.
  const senderSecret = Deno.env.get('SENDER_SECRET') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const given = req.headers.get('authorization') ?? ''
  const accepted = [senderSecret, serviceKey].filter(s => s.length >= 32).map(s => `Bearer ${s}`)
  if (accepted.length === 0 || !accepted.includes(given)) {
    return new Response(JSON.stringify({ error: 'service role required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const dry = new URL(req.url).searchParams.get('dry') === '1'
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY && !dry) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Registered accounts with an address. Guests have no row and no channel.
    const { data: rows, error } = await supabase
      .from('users')
      .select('username, email, data')
      .not('username', 'like', 'guest_%')
      .not('email', 'is', null)
      .range(0, 4999)
    if (error) throw error

    // Payers, by the only money truth.
    const { data: paidRows } = await supabase
      .from('pro_events')
      .select('username')
      .eq('event', 'pro_purchase_completed')
      .eq('reason', 'stripe_webhook')
    const paid = new Set((paidRows || []).map((r: any) => r.username))

    // Anyone mailed by any campaign in the last QUIET_DAYS waits.
    const quietSince = new Date(Date.now() - QUIET_DAYS * 86400000).toISOString()
    const { data: recent } = await supabase
      .from('email_events')
      .select('username')
      .eq('event', 'sent')
      .gte('created_at', quietSince)
    const recentlyMailed = new Set((recent || []).map((r: any) => r.username))

    type Candidate = { username: string; email: string; userData: any; solves: number; weakest: string | null; company: string | null }
    const audience: Candidate[] = []
    let skipped = 0
    for (const row of (rows || [])) {
      const username = row.username as string
      const email = (row.email || '').trim()
      const userData = row.data || {}
      const solves = Array.isArray(userData.solvedChallenges) ? userData.solvedChallenges.length : 0
      if (!email || !email.includes('@')) { skipped++; continue }
      if (isInternalAccount(username, email)) { skipped++; continue }
      if (solves < MIN_SOLVES) { skipped++; continue }
      if (paid.has(username) || userData.proStatus === true) { skipped++; continue }
      if (userData.emailOptOut === true) { skipped++; continue }
      if (userData.activatedNoteAt) { skipped++; continue }              // once ever
      if (recentlyMailed.has(username)) { skipped++; continue }          // no stacking
      const company = typeof userData?.prepTarget?.company === 'string' && userData.prepTarget.company.trim()
        ? userData.prepTarget.company.trim() : null
      audience.push({ username, email, userData, solves, weakest: weakestSkill(userData), company })
    }
    // Most recent activity first: the people most likely to be mid-prep.
    const activeAt = (d: any) => {
      const v = d?.lastActive
      const t = typeof v === 'number' ? v : Date.parse(v || '')
      return Number.isFinite(t) ? t : 0
    }
    audience.sort((a, b) => activeAt(b.userData) - activeAt(a.userData))
    const batch = audience.slice(0, MAX_PER_RUN)

    if (dry) {
      const sample = batch[0]
      return new Response(JSON.stringify({
        dry: true, candidates: audience.length, batch: batch.length, cap: MAX_PER_RUN, skipped,
        preview: batch.map(c => ({ username: c.username, solves: c.solves, weakest: c.weakest, company: c.company })),
        // The unsubscribe link in a dry sample is a stand-in: a dry run writes
        // nothing, so it mints no token.
        sample: sample ? renderActivatedNote(sample, {
          cta: utm('/app/?src=activated_note&pro=1', TEMPLATE),
          unsub: unsubLink('dry-run-no-token'),
        }) : null,
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sent = 0
    for (const c of batch) {
      // Once ever, checked again at the moment of sending: the audience was
      // read when this run began, and a second run started meanwhile (two
      // tabs, a retry) would otherwise mail the same person twice.
      const { data: fresh } = await supabase
        .from('users')
        .select('marked:data->activatedNoteAt')
        .eq('username', c.username)
        .maybeSingle()
      if (fresh?.marked) { skipped++; continue }
      const unsubToken = await ensureUnsubToken(supabase, c.username, c.userData)
      const unsub = unsubLink(unsubToken)
      const { subject, html, text } = renderActivatedNote(c, {
        cta: utm('/app/?src=activated_note&pro=1', TEMPLATE), unsub,
      })
      const ok = await sendAndLog(supabase, RESEND_API_KEY!, {
        to: c.email, username: c.username, template: TEMPLATE, subject, html, text,
        footerInHtml: true, unsub, replyTo: REPLY_TO,
      })
      if (ok) {
        await supabase
          .from('users')
          .update({ data: { ...c.userData, activatedNoteAt: new Date().toISOString() } })
          .eq('username', c.username)
        sent++
      } else {
        skipped++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, candidates: audience.length, remaining: Math.max(0, audience.length - sent) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
