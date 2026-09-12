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
// The single CTA opens the Pro modal directly (?pro=1, reason 'email_link' in
// src/app.jsx) — the surface where checkout happens, not a page about it.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

async function sendAndLog(supabase: any, apiKey: string, args: {
  to: string; username: string; template: string; subject: string;
  html: string; unsub: string; replyTo?: string;
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
        html: args.html + footer(args.unsub),
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

// The nine canonical skills (src/utils/skill-calc.js). A record written by
// the app since 2026-09-12 carries these names; older records are ignored.
const CANONICAL = [
  'Querying Basics', 'Aggregation & Grouping', 'Joins', 'Subqueries & CTEs',
  'Conditional Logic', 'Window Functions', 'String Functions', 'Date Functions', 'NULL Handling',
]
function weakestSkill(userData: any): string | null {
  const m = userData?.skillMastery
  if (!m || typeof m !== 'object') return null
  let best: { name: string; mastery: number } | null = null
  for (const name of CANONICAL) {
    const row = m[name]
    const mastery = row && typeof row.mastery === 'number' ? row.mastery : null
    if (mastery === null) continue
    if (!best || mastery < best.mastery) best = { name, mastery }
  }
  return best && best.mastery < 70 ? best.name : null
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// Three subject lines, chosen by username so a batch never reads as one
// mailing and the same person always gets the same one (idempotent dry runs).
const SUBJECTS = [
  (n: number) => `From SQL Quest's founder — after your ${ordinal(n)} solve`,
  (n: number) => `SQL Quest's founder here — ${n} solves in, one question`,
  (n: number) => `I build SQL Quest — the part after ${n} solves`,
]
const pick = (username: string, len: number) => {
  let h = 0
  for (const ch of username) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % len
}

function renderBody(args: { username: string; solves: number; weakest: string | null; company: string | null; cta: string }): string {
  const { username, solves, weakest, company, cta } = args
  const openers = [
    `You have ${solves} solves on SQL Quest. That is past the point where most people stop, so this one is from me, not from a sequence.`,
    `${solves} solves. Most people who start never reach six, and you are well past it — so I am writing this myself.`,
    `I looked at the accounts that got past six solves and never bought, and yours is one of a short list, so I am writing to you directly.`,
  ]
  const opener = openers[pick(username, openers.length)]
  const radar = weakest
    ? `Your radar's lowest line right now is <strong>${weakest}</strong>. That is the shape the screens save for last, and it is where the Hard set starts.`
    : `The Hard set is where the screens' last question lives: a window function over a ledger, a NULL nobody handled, a correlated subquery.`
  const target = company
    ? `You named <strong>${company}</strong>. Its set and, where candidates have reported the format, its timed mock are in Pro.`
    : `If there is a company on your calendar, its set is there — Revolut and Capital One also have a timed mock built to the reported screen.`
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <p style="font-size: 15px; line-height: 1.8;">Hi ${username},</p>
      <p style="font-size: 15px; line-height: 1.8;">${opener}</p>
      <p style="font-size: 15px; line-height: 1.8;">${radar} ${target}</p>
      <p style="font-size: 15px; line-height: 1.8;">
        Pro is the interview run before the interview: the Hard set, the timed mocks, and a tutor that stays with you through the session.
        $99 a year, or $29 a month, with a 7-day refund if it does not move your prep.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${cta}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: 700;">
          See what Pro adds →
        </a>
      </div>
      <p style="font-size: 15px; line-height: 1.8;">
        If you are not interviewing, ignore this — the free bank is not going anywhere. And if something stopped you last time, hit reply; it comes straight to me.
      </p>
      <p style="font-size: 15px; line-height: 1.8;">Göktuğ<br><span style="color:#6b7280;">Founder, SQL Quest</span></p>
    </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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
        sample: sample ? {
          subject: SUBJECTS[pick(sample.username, SUBJECTS.length)](sample.solves),
          html: renderBody({ ...sample, cta: utm('/app/?src=activated_note&pro=1', TEMPLATE) }),
        } : null,
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sent = 0
    for (const c of batch) {
      const unsubToken = await ensureUnsubToken(supabase, c.username, c.userData)
      const subject = SUBJECTS[pick(c.username, SUBJECTS.length)](c.solves)
      const html = renderBody({ ...c, cta: utm('/app/?src=activated_note&pro=1', TEMPLATE) })
      const ok = await sendAndLog(supabase, RESEND_API_KEY!, {
        to: c.email, username: c.username, template: TEMPLATE, subject, html,
        unsub: unsubLink(unsubToken), replyTo: REPLY_TO,
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
