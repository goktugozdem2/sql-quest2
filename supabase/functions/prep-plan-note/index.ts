// Supabase Edge Function: prep-plan-note
// Deploy: supabase functions deploy prep-plan-note
// Dry run: GET /functions/v1/prep-plan-note?dry=1 — resolves the audience,
// renders every subject and the three items, one full sample, sends nothing.
//
// NOT SCHEDULED. NOT DEPLOYED as of 2026-09-17. Sending is the founder's
// decision; nothing in this repo schedules it, and this file says so on
// purpose. The plan doc (docs/plans/prep-plan-note-2026-09-17.md) holds the
// claim that would be read if it ever runs.
//
// Interview-first, point 3 (docs/plans/interview-first-2026-09-17.md): "the
// plan follows the person out of the app." A person with a date on
// `prepTarget` gets, every other day at most, one note in the founder's
// voice: N days to the date, the company they named, today's three items from
// THE SAME plan the Interview Prep card draws (src/utils/interview-prep.js
// `planToDate`, via ./plan.ts — never a second planner), and the weakest
// skill on their radar by name. One deep link per item. If an item is Pro it
// says so in two letters and a bracket, and that is the only place the word
// appears; there is no pitch and no price in this email.
//
// Audience — every one of these is a line in the loop below:
//   1. a registered account (no `guest_*` row; guests have no channel)
//   2. not an internal account (isInternalAccount — the inlined block)
//   3. not opted out (userData.emailOptOut)
//   4. an email address on the row
//   5. `userData.prepTarget.date` in the future and at most MAX_DAYS_OUT away
//      (daysUntil, the app's own calendar-day frame; today is not "future")
//   6. spacing and ceiling on THIS template from email_events: nothing in the
//      last SPACING_DAYS, and fewer than MAX_LIFETIME_SENDS ever — a cooldown
//      only spaces sends, it never stops them (CLAUDE.md, skill-decay 07-28),
//      so the ceiling is what ends a series for someone who never returns
//   7. quiet: any OTHER campaign's `sent` in the last QUIET_HOURS waits
//   (+ a plan with at least one item — a note with nothing to say is not sent)
//
// Per-run cap MAX_PER_RUN: identical-minute sends are the bulk fingerprint
// (docs/outreach-2026-08-05.md); a copy mistake costs one batch. Soonest
// date first — the person with three days left gets the slot before the
// person with forty.
//
// Measurement: a `sent` row in email_events with the resend_id (resend-webhook
// attributes engagement by that id; a sender that does not log is where the
// 107 'unknown' rows came from), and a pro_events row
// `prep_note_sent {company, daysOut, items, proItems}` with reason 'email'.
// The read is returned_48h and `prep_plan_item_opened` with src=prep_note.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildPrepNote, MAX_DAYS_OUT, type NoteItem, type PrepNote } from './plan.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEMPLATE = 'prep_plan_note'
const MAX_PER_RUN = 40
const SPACING_DAYS = 2          // never twice inside two days
const MAX_LIFETIME_SENDS = 5    // a series has an end
const QUIET_HOURS = 24          // any other campaign in the last day → wait

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
  html: string; unsub: string; replyTo?: string; meta?: Record<string, unknown>;
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
      meta: ok ? (args.meta || {}) : { status, ...(args.meta || {}) },
    })
  } catch (_) { /* measurement is best-effort */ }
  return ok
}
// ── end shared block ──

const esc = (s: string) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const dayWord = (n: number) => `${n} day${n === 1 ? '' : 's'}`

// Two subject lines, chosen by username so a batch never reads as one
// mailing and the same person always gets the same one (idempotent dry runs).
const SUBJECTS = [
  (n: number, company: string | null) =>
    `From SQL Quest's founder — ${dayWord(n)} to your ${company ? `${company} screen` : 'interview'}`,
  (n: number, _company: string | null) =>
    `I build SQL Quest — your plan for ${n === 1 ? 'tomorrow' : `the next ${dayWord(n)}`}`,
]
const pick = (username: string, len: number) => {
  let h = 0
  for (const ch of username) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % len
}
const subjectFor = (username: string, note: PrepNote) =>
  SUBJECTS[pick(username, SUBJECTS.length)](note.daysOut, note.company)

const itemLine = (it: NoteItem) => {
  const what = it.kind === 'mock'
    ? `the timed mock — ${esc(it.title)}`
    : `${esc(it.title)}${it.skill ? ` <span style="color:#6b7280;">· ${esc(it.skill)}</span>` : ''}${it.difficulty ? ` <span style="color:#6b7280;">· ${esc(it.difficulty)}</span>` : ''}`
  return `<li style="margin:6px 0;"><a href="${utm(it.path, TEMPLATE)}" style="color:#7c3aed;text-decoration:none;font-weight:600;">${what}</a>${it.pro ? ' (Pro)' : ''}</li>`
}

function renderBody(args: { username: string; note: PrepNote }): string {
  const { username, note } = args
  const where = note.company ? `your ${esc(note.company)} screen` : 'your interview'
  const n = note.daysOut
  // Two openers, chosen by username; same substance, never the same bytes.
  const openers = [
    `${dayWord(n)} to ${where}. I am writing this myself, one at a time, to the couple of dozen people who have a date in SQL Quest — it is short because the work is below, not here.`,
    `You put a date in SQL Quest, and it is ${dayWord(n)} away. There are only a couple of dozen people on this list, so this is written by hand, not by a sequence.`,
  ]
  const opener = openers[pick(username, openers.length)]
  const weakest = note.weakest
    ? `The lowest line on your Skillmap is <strong>${esc(note.weakest)}</strong>${note.weakestInItems ? ' — one of the items below starts there.' : '.'}`
    : ''
  const todays = note.items.length === 3 ? "Today's three" : "Today's list"
  const source = note.company
    ? (note.archetype
        ? `${todays} come${note.items.length === 3 ? '' : 's'} from the ${esc(note.company)} plan the app draws for you, so what you do here shows up there.`
        : `${todays} ${note.items.length === 3 ? 'are' : 'is'} built from the questions tagged ${esc(note.company)} and your own gaps — not ${esc(note.company)}'s process, which nobody outside it can promise.`)
    : `${todays} ${note.items.length === 3 ? 'are' : 'is'} drawn from your own gaps, the way the app would hand them to you.`
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <p style="font-size: 15px; line-height: 1.8;">Hi ${esc(username)},</p>
      <p style="font-size: 15px; line-height: 1.8;">${opener}</p>
      ${weakest ? `<p style="font-size: 15px; line-height: 1.8;">${weakest}</p>` : ''}
      <p style="font-size: 15px; line-height: 1.8;">${source}</p>
      <ol style="font-size: 15px; line-height: 1.8; padding-left: 20px;">
        ${note.items.map(itemLine).join('\n        ')}
      </ol>
      <p style="font-size: 15px; line-height: 1.8;">
        That is the whole email. If the date moved, or the company did, change it in the app and the next note follows. And if something in there is wrong for where you are, hit reply — it comes straight to me.
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
    const now = Date.now()

    // (1) registered, (4) with an address. Guests have no row and no channel.
    const { data: rows, error } = await supabase
      .from('users')
      .select('username, email, data')
      .not('username', 'like', 'guest_%')
      .not('email', 'is', null)
      .range(0, 4999)
    if (error) throw error

    // (6) this template's own history: the last SPACING_DAYS, and the lifetime
    // count. One read over the template, split in memory.
    const { data: ownRows } = await supabase
      .from('email_events')
      .select('username, created_at')
      .eq('template', TEMPLATE)
      .eq('event', 'sent')
    const spacingSince = now - SPACING_DAYS * 86400000
    const lifetime = new Map<string, number>()
    const recentlyNoted = new Set<string>()
    for (const r of (ownRows || [])) {
      lifetime.set(r.username, (lifetime.get(r.username) || 0) + 1)
      if (Date.parse(r.created_at) >= spacingSince) recentlyNoted.add(r.username)
    }

    // (7) anyone mailed by ANY OTHER campaign in the last QUIET_HOURS waits.
    const quietSince = new Date(now - QUIET_HOURS * 3600000).toISOString()
    const { data: recent } = await supabase
      .from('email_events')
      .select('username')
      .eq('event', 'sent')
      .neq('template', TEMPLATE)
      .gte('created_at', quietSince)
    const recentlyMailed = new Set((recent || []).map((r: any) => r.username))

    type Candidate = { username: string; email: string; userData: any; note: PrepNote }
    const audience: Candidate[] = []
    const skippedWhy: Record<string, number> = {}
    const skip = (why: string) => { skippedWhy[why] = (skippedWhy[why] || 0) + 1 }
    for (const row of (rows || [])) {
      const username = row.username as string
      const email = (row.email || '').trim()
      const userData = row.data || {}
      if (!email || !email.includes('@')) { skip('no_email'); continue }                       // (4)
      if (isInternalAccount(username, email)) { skip('internal'); continue }                    // (2)
      if (userData.emailOptOut === true) { skip('opted_out'); continue }                        // (3)
      if (typeof userData?.prepTarget?.date !== 'string') { skip('no_date'); continue }         // (5)
      if (recentlyNoted.has(username)) { skip('spacing'); continue }                            // (6)
      if ((lifetime.get(username) || 0) >= MAX_LIFETIME_SENDS) { skip('lifetime_cap'); continue } // (6)
      if (recentlyMailed.has(username)) { skip('quiet'); continue }                             // (7)
      // (5) the window, in the app's own frame, and the plan itself.
      const note = buildPrepNote(userData, now)
      if (!note) { skip('date_out_of_window_or_no_items'); continue }
      audience.push({ username, email, userData, note })
    }
    // Soonest date first: the person with three days left gets the slot.
    audience.sort((a, b) => (a.note.daysOut - b.note.daysOut) || a.username.localeCompare(b.username))
    const batch = audience.slice(0, MAX_PER_RUN)
    const skipped = Object.values(skippedWhy).reduce((s, n) => s + n, 0)

    if (dry) {
      const sample = batch[0]
      return new Response(JSON.stringify({
        dry: true, template: TEMPLATE, candidates: audience.length, batch: batch.length, cap: MAX_PER_RUN,
        maxDaysOut: MAX_DAYS_OUT, skipped, skippedWhy,
        preview: batch.map(c => ({
          username: c.username,
          company: c.note.company,
          archetype: c.note.archetype,
          daysOut: c.note.daysOut,
          weakest: c.note.weakest,
          subject: subjectFor(c.username, c.note),
          items: c.note.items.map(i => ({ kind: i.kind, title: i.title, skill: i.skill, difficulty: i.difficulty, pro: i.pro, url: utm(i.path, TEMPLATE) })),
          proItems: c.note.proItems,
          lifetimeSoFar: lifetime.get(c.username) || 0,
        })),
        sample: sample ? {
          subject: subjectFor(sample.username, sample.note),
          html: renderBody({ username: sample.username, note: sample.note }),
        } : null,
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sent = 0, failed = 0
    for (const c of batch) {
      const unsubToken = await ensureUnsubToken(supabase, c.username, c.userData)
      const subject = subjectFor(c.username, c.note)
      const html = renderBody({ username: c.username, note: c.note })
      const ok = await sendAndLog(supabase, RESEND_API_KEY!, {
        to: c.email, username: c.username, template: TEMPLATE, subject, html,
        unsub: unsubLink(unsubToken), replyTo: REPLY_TO,
        meta: { company: c.note.company, daysOut: c.note.daysOut, items: c.note.items.length, proItems: c.note.proItems },
      })
      if (!ok) { failed++; continue }
      sent++
      // The product-side row the funnel joins on. Checked, not swallowed:
      // supabase-js resolves with { error } on a rejected insert.
      const { error: evErr } = await supabase.from('pro_events').insert({
        event: 'prep_note_sent',
        username: c.username,
        reason: 'email',
        metadata: {
          company: c.note.company,
          daysOut: c.note.daysOut,
          items: c.note.items.length,
          proItems: c.note.proItems,
          archetype: c.note.archetype,
        },
      })
      if (evErr) console.error('prep_note_sent insert failed', c.username, evErr.message)
    }

    return new Response(JSON.stringify({
      sent, failed, skipped, skippedWhy, candidates: audience.length,
      remaining: Math.max(0, audience.length - batch.length),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
