// Supabase Edge Function: interview-outcome-note
// Deploy: supabase functions deploy interview-outcome-note
// Dry run: GET /functions/v1/interview-outcome-note?dry=1 — resolves the
// audience, renders both wordings for the first candidate, sends nothing.
// Smaller batch: ?limit=5 (only ever lowers the cap).
// NOT scheduled. The founder runs it; sending is a decision, not a default.
//
// The one question after the date (2026-09-19). The interview chain is
// measured up to "paid" and then goes dark: whether the person passed the
// screen we only ever learn from a hand-written reply (harinivr02, 09-19).
// A person whose `prepTarget.date` has passed gets, once per date, one short
// note in the founder's voice: how did it go. The answer is a click on one
// of three plain links — /app/?src=outcome_note&outcome=passed|failed|moved
// — which the app records as `interview_outcome {outcome, source:'link'}`
// and takes the past date off the record (src/app.jsx, the outcome door).
// Anything else is a reply, straight to the founder.
//
// Audience — every one of these is a line in the loop below:
//   1. a registered account (no `guest_*` row; guests have no channel)
//   2. an email address on the row
//   3. not an internal account (isInternalAccount — the inlined block)
//   4. not opted out (userData.emailOptOut)
//   5. `userData.prepTarget.date` between MIN_DAYS_AFTER and MAX_DAYS_AFTER
//      days in the past (calendar days, UTC — the same YYYY-MM-DD the app
//      writes; a future date belongs to prep-plan-note, not here)
//   6. no outcome recorded yet (userData.prepTarget.outcome)
//   7. never asked about THIS date: userData.outcomeNoteFor === date, or a
//      `sent` row for this template whose meta.date is this date — a new
//      date is a new interview and earns a new question
//   8. quiet: any campaign's `sent` in the last QUIET_HOURS waits
//
// Per-run cap MAX_PER_RUN (identical-minute sends are the bulk fingerprint,
// docs/outreach-2026-08-05.md). Most recent date first.
//
// Measurement: a `sent` row in email_events with the resend_id and
// meta {company, date, daysSince}; a pro_events row `outcome_note_sent
// {company, daysSince}` with reason 'email' — daysSince, never the date
// (the prep_target_set rule). The read is `interview_outcome` by source and
// the founder's inbox — metrics.md `interview_outcome`.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SENDER_SECRET.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEMPLATE = 'interview_outcome_note'
const MAX_PER_RUN = 20
const MIN_DAYS_AFTER = 1       // the day after, not the day of
const MAX_DAYS_AFTER = 14      // two weeks on, the question is stale
const QUIET_HOURS = 24

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

// Calendar days from a YYYY-MM-DD date to `now`, in the UTC day frame the app
// writes the date in. Positive = the date has passed. null for anything that
// is not a valid date (including a rolled-over one like 2026-02-31).
export const daysSince = (isoDate: unknown, now: number): number | null => {
  if (typeof isoDate !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim())
  if (!m) return null
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3])
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  const targetMs = Date.UTC(y, mo - 1, d)
  const back = new Date(targetMs)
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null
  const n = new Date(now)
  const todayMs = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())
  return Math.round((todayMs - targetMs) / 86400000)
}

const agoWord = (n: number) => n === 1 ? 'yesterday' : `${n} days ago`

// Deterministic per person: the same username always gets the same subject
// and the same wording, so a dry run previews exactly what a send would do.
const hash = (s: string) => {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

// Founder in every subject (CLAUDE.md, email voice).
const SUBJECTS: Array<(company: string | null) => string> = [
  (company) => `From SQL Quest's founder — how did the ${company ? `${company} screen` : 'interview'} go?`,
  (_company) => "SQL Quest's founder here — one question, now that the date has passed",
]
const subjectFor = (username: string, company: string | null) =>
  SUBJECTS[hash(username) % SUBJECTS.length](company)

const VARIANTS = ['A', 'B'] as const
type Variant = typeof VARIANTS[number]
const variantFor = (username: string): Variant => VARIANTS[hash(`${username}:body`) % VARIANTS.length]

const outcomeLink = (outcome: string, label: string) =>
  `<a href="${utm(`/app/?src=outcome_note&outcome=${outcome}`, TEMPLATE)}" style="color: #7c3aed; font-weight: 600; text-decoration: none;">${label}</a>`

const LINKS = `${outcomeLink('passed', 'It went well')} &nbsp;·&nbsp; ${outcomeLink('failed', 'Not this time')} &nbsp;·&nbsp; ${outcomeLink('moved', 'It moved or has not happened')}`

const P = 'font-size: 15px; line-height: 1.8;'

export type OutcomeNote = { company: string | null; date: string; daysSince: number }

function renderBody(args: { username: string; note: OutcomeNote; variant: Variant }): string {
  const { username, note, variant } = args
  const where = note.company ? `the ${esc(note.company)} screen` : 'your interview'
  const body = variant === 'A'
    ? `
      <p style="${P}">Hi ${esc(username)},</p>
      <p style="${P}">You put a date in SQL Quest, and by that date ${where} was ${agoWord(note.daysSince)}. I am writing this myself to the few people who had a date; it is one question, and the answer is a click.</p>
      <p style="${P}"><strong>How did it go?</strong></p>
      <p style="${P}">${LINKS}</p>
      <p style="${P}">The click is enough. A pass closes the plan; a miss keeps it open from where you are; a moved date gets a new countdown once you put the new one in. If you can spare one more line, hit reply and tell me which question came up — that is the one thing I cannot see from here.</p>
      <p style="${P}">I won't send another one of these about this date.</p>`
    : `
      <p style="${P}">Hi ${esc(username)},</p>
      <p style="${P}">This is not a sequence. There are only a handful of people with a date in SQL Quest, and yours says ${where} was ${agoWord(note.daysSince)}, so I am asking each of you the same thing by hand.</p>
      <p style="${P}"><strong>How did it go?</strong></p>
      <p style="${P}">${LINKS}</p>
      <p style="${P}">One click and the app knows what to do next: a pass closes the plan, a miss keeps it open, a moved date waits for the new one. And if a particular question decided it, reply and name it; it lands in my inbox, not a queue.</p>
      <p style="${P}">You will not get a second one of these about this date.</p>`
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">${body}
      <p style="${P}">Göktuğ<br><span style="color:#6b7280;">Founder, SQL Quest</span></p>
    </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Caller gate (2026-09-17): JWT verification is off and the anon key ships
  // in every browser. Only the SENDER_SECRET function secret or the service
  // role key may call this, dry run included (the dry run lists usernames).
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
    const url = new URL(req.url)
    const dry = url.searchParams.get('dry') === '1'
    const limitParam = Number(url.searchParams.get('limit'))
    // ?limit= only ever lowers the cap.
    const cap = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(MAX_PER_RUN, Math.floor(limitParam)) : MAX_PER_RUN
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY && !dry) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const now = Date.now()

    // (1)(2) registered accounts with an address.
    const { data: rows, error } = await supabase
      .from('users')
      .select('username, email, data')
      .not('username', 'like', 'guest_%')
      .not('email', 'is', null)
      .range(0, 4999)
    if (error) throw error

    // (7) this template's own history, by the date it asked about.
    const { data: ownRows } = await supabase
      .from('email_events')
      .select('username, meta')
      .eq('template', TEMPLATE)
      .eq('event', 'sent')
    const askedFor = new Set<string>()
    for (const r of (ownRows || [])) {
      const d = r?.meta?.date
      if (r.username && typeof d === 'string') askedFor.add(`${r.username}|${d}`)
    }

    // (8) anyone mailed by ANY campaign in the last QUIET_HOURS waits.
    const quietSince = new Date(now - QUIET_HOURS * 3600000).toISOString()
    const { data: recent } = await supabase
      .from('email_events')
      .select('username')
      .eq('event', 'sent')
      .gte('created_at', quietSince)
    const recentlyMailed = new Set((recent || []).map((r: any) => r.username).filter(Boolean))

    type Candidate = { username: string; email: string; userData: any; note: OutcomeNote; variant: Variant }
    const audience: Candidate[] = []
    const skippedWhy: Record<string, number> = {}
    const skip = (why: string) => { skippedWhy[why] = (skippedWhy[why] || 0) + 1 }
    for (const row of (rows || [])) {
      const username = row.username as string
      const email = (row.email || '').trim()
      const userData = row.data || {}
      if (!email || !email.includes('@')) { skip('no_email'); continue }                       // (2)
      if (isInternalAccount(username, email)) { skip('internal'); continue }                    // (3)
      if (userData.emailOptOut === true) { skip('opted_out'); continue }                        // (4)
      const target = userData.prepTarget && typeof userData.prepTarget === 'object' ? userData.prepTarget : null
      const date = typeof target?.date === 'string' ? target.date.trim() : null
      if (!date) { skip('no_date'); continue }                                                  // (5)
      const since = daysSince(date, now)
      if (since === null) { skip('bad_date'); continue }
      if (since < MIN_DAYS_AFTER) { skip('date_not_passed'); continue }                         // (5)
      if (since > MAX_DAYS_AFTER) { skip('date_too_old'); continue }                            // (5)
      if (target.outcome) { skip('outcome_recorded'); continue }                                // (6)
      if (userData.outcomeNoteFor === date || askedFor.has(`${username}|${date}`)) { skip('already_asked'); continue } // (7)
      if (recentlyMailed.has(username)) { skip('quiet'); continue }                             // (8)
      const company = typeof target.company === 'string' && target.company.trim() ? target.company.trim() : null
      audience.push({ username, email, userData, note: { company, date, daysSince: since }, variant: variantFor(username) })
    }
    // Most recent date first: the freshest memory gets the slot.
    audience.sort((a, b) => (a.note.daysSince - b.note.daysSince) || a.username.localeCompare(b.username))
    const batch = audience.slice(0, cap)
    const skipped = Object.values(skippedWhy).reduce((s, n) => s + n, 0)

    if (dry) {
      const first = batch[0]
      return new Response(JSON.stringify({
        dry: true, template: TEMPLATE, candidates: audience.length, batch: batch.length, cap,
        window: { minDaysAfter: MIN_DAYS_AFTER, maxDaysAfter: MAX_DAYS_AFTER }, skipped, skippedWhy,
        preview: batch.map(c => ({
          username: c.username, company: c.note.company, daysSince: c.note.daysSince, variant: c.variant,
          subject: subjectFor(c.username, c.note.company),
        })),
        sample: first ? {
          subject: subjectFor(first.username, first.note.company),
          variant: first.variant,
          html: renderBody({ username: first.username, note: first.note, variant: first.variant }),
        } : null,
        variants: first ? {
          A: renderBody({ username: first.username, note: first.note, variant: 'A' }),
          B: renderBody({ username: first.username, note: first.note, variant: 'B' }),
        } : null,
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sent = 0, failed = 0
    for (const c of batch) {
      const unsubToken = await ensureUnsubToken(supabase, c.username, c.userData)
      const subject = subjectFor(c.username, c.note.company)
      const html = renderBody({ username: c.username, note: c.note, variant: c.variant })
      const ok = await sendAndLog(supabase, RESEND_API_KEY!, {
        to: c.email, username: c.username, template: TEMPLATE, subject, html,
        unsub: unsubLink(unsubToken), replyTo: REPLY_TO,
        meta: { company: c.note.company, date: c.note.date, daysSince: c.note.daysSince, variant: c.variant },
      })
      if (!ok) { failed++; continue }
      sent++
      // Once per date: the row stamp is the second guard beside the send log.
      await supabase
        .from('users')
        .update({ data: { ...c.userData, outcomeNoteFor: c.note.date, outcomeNoteAt: new Date().toISOString() } })
        .eq('username', c.username)
      // The product-side row the interview_outcome read joins on. daysSince,
      // never the date. Checked, not swallowed.
      const { error: evErr } = await supabase.from('pro_events').insert({
        event: 'outcome_note_sent',
        username: c.username,
        reason: 'email',
        metadata: { company: c.note.company, daysSince: c.note.daysSince, variant: c.variant },
      })
      if (evErr) console.error('outcome_note_sent insert failed', c.username, evErr.message)
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
