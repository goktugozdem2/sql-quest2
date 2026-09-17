// Supabase Edge Function: goal-note
// Deploy: supabase functions deploy goal-note
// Dry run: GET /functions/v1/goal-note?dry=1  — resolves the audience,
// renders both body variants for the first candidate, sends nothing.
// Smaller batch: GET /functions/v1/goal-note?limit=10 (only ever lowers the cap).
// NOT scheduled. The founder runs it, one batch a day, until the segment is
// drained; sending is a decision, not a default.
//
// The founder's question of 2026-09-17 (docs/plans/goal-capture-2026-09-17.md):
// how do we get the goal from the people who never gave one. Every real
// payer had said "interview" before they paid; a person we have not asked is
// a person the product cannot route. The weekly digest now opens with the
// question, but it only reaches people active that week — the last three
// Mondays it went to 4, 7 and 3 people. This is the one-time letter to
// everyone else: registered, reachable, active in the last 60 days, no goal
// on the row. Measured 2026-09-17 with the read-only MCP: 184 accounts.
//
// Audience (every condition is a skip reason in the dry run):
//   - registered: guests have no row and no channel (username not guest_%).
//   - has an email address.
//   - not an internal account (isInternalAccount, incl. @datrick / @example /
//     @mailtest).
//   - not opted out (userData.emailOptOut).
//   - no goal on record — goalOnRecord(), copied verbatim from the weekly
//     digest and kept in sync by tests/goal-note.test.js.
//   - active in the last ACTIVE_DAYS (users.data.lastActive, which is epoch-ms
//     on some rows and an ISO string on others; both are parsed).
//   - never received this template (email_events template='goal_note'
//     AND userData.goalNoteAt) — MAX_LIFETIME_SENDS = 1, a letter, not a
//     sequence.
//   - no other campaign in the last QUIET_HOURS (email_events).
//   - per-run cap MAX_PER_RUN, most recently active first. A batch of
//     identical-minute sends is the bulk fingerprint
//     (docs/outreach-2026-08-05.md); this drains over three or four days and
//     a copy mistake costs one batch.
//
// The email asks ONE question — what are you preparing for — with three
// plain links `/app/?src=goal_note&goal=interview|job_ready|learning`. The
// app's arrival hook records the goal when none is recorded (src/app.jsx,
// `?goal=`), so the click is the answer; nothing to fill in. Founder in the
// subject (two subjects, by username hash), two body wordings (by a second
// hash) so no two bodies in a batch are byte-identical, one real number
// where the row has one (the solve count; the attempts carry ids, not
// titles, and the bank is client-side, so a title is not available here).
// Nothing about the paid plan, no price, no follow-up: "I won't send another
// one of these" is a promise the once-ever guard keeps.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PER_RUN = 60
const MAX_LIFETIME_SENDS = 1
const QUIET_HOURS = 48
const ACTIVE_DAYS = 60
const TEMPLATE = 'goal_note'

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
      meta: ok ? { ...(args.meta || {}) } : { status, ...(args.meta || {}) },
    })
  } catch (_) { /* measurement is best-effort */ }
  return ok
}
// ── end shared block ──

// COPIED VERBATIM from supabase/functions/weekly-digest/index.ts and pinned
// equal to it by tests/goal-note.test.js. The digest asks the same question
// of the same people; if the two ever disagree on who "has a goal", one
// person is asked twice and another never. Change it there, then here.
function goalOnRecord(userData: any): boolean {
  const d = userData || {}
  const intent = d.intent || d.userIntent
  if (intent === 'interview' || intent === 'job_ready' || intent === 'learning') return true
  if (d.intake && typeof d.intake === 'object' && d.intake.goal) return true
  if (d.coachState && typeof d.coachState === 'object' && d.coachState.goalId) return true
  const t = d.prepTarget && typeof d.prepTarget === 'object' ? d.prepTarget : null
  if (t && (t.company || t.date)) return true
  return false
}

// users.data.lastActive is epoch-ms on some rows and an ISO string on
// others (and, defensively, a numeric string). 0 when unreadable.
const activeAt = (d: any): number => {
  const v = d?.lastActive
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v !== 'string' || !v) return 0
  const t = /^\d+$/.test(v) ? Number(v) : Date.parse(v)
  return Number.isFinite(t) ? t : 0
}

// Deterministic per person: the same username always gets the same subject
// and the same wording, so a dry run previews exactly what a send would do.
const hash = (s: string) => {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

// Two subjects, the founder in both — the recipient decides whether to open
// on the headline (CLAUDE.md, email voice).
const SUBJECTS = [
  'A question from the person who builds SQL Quest',
  "SQL Quest's founder here — one question",
]
const subjectFor = (username: string) => SUBJECTS[hash(username) % SUBJECTS.length]

// Two body wordings, chosen by a second hash so subject and wording do not
// pair up; same substance, never byte-identical.
const VARIANTS = ['A', 'B'] as const
type Variant = typeof VARIANTS[number]
const variantFor = (username: string): Variant => VARIANTS[hash(`${username}:body`) % VARIANTS.length]

const goalLink = (goal: string, label: string) =>
  `<a href="${utm(`/app/?src=goal_note&goal=${goal}`, TEMPLATE)}" style="color: #7c3aed; font-weight: 600; text-decoration: none;">${label}</a>`

const LINKS = `${goalLink('interview', 'An interview')} &nbsp;·&nbsp; ${goalLink('job_ready', 'Getting job-ready')} &nbsp;·&nbsp; ${goalLink('learning', 'SQL in general')}`

const P = 'font-size: 15px; line-height: 1.8;'

function renderBody(args: { username: string; solves: number; variant: Variant }): string {
  const { username, solves, variant } = args
  // One real number where the row has one. At zero the sentence is omitted
  // rather than padded.
  const numberA = solves > 0
    ? ` You have solved ${solves} ${solves === 1 ? 'challenge' : 'challenges'} here, and I would rather ask than guess from that.`
    : ''
  const numberB = solves > 0
    ? ` You have solved ${solves} ${solves === 1 ? 'challenge' : 'challenges'} here, and nobody ever asked you why.`
    : ''
  const body = variant === 'A'
    ? `
      <p style="${P}">Hi ${username},</p>
      <p style="${P}">I build SQL Quest, and I am writing this myself to a short list of people who have used it and never told us what they are practising for.${numberA}</p>
      <p style="${P}"><strong>One question: what are you preparing for?</strong></p>
      <p style="${P}">${LINKS}</p>
      <p style="${P}">One click, nothing to fill in. The answer changes what the Coach puts in front of you next — the same bank, a different order.</p>
      <p style="${P}">I won't send another one of these. If it is none of the three, hit reply and tell me in a line; it comes straight to me.</p>`
    : `
      <p style="${P}">Hi ${username},</p>
      <p style="${P}">This is not a sequence. There are a few dozen people on this list, and I am writing to each of you one at a time, because the product never asked you.${numberB}</p>
      <p style="${P}"><strong>What are you preparing for?</strong></p>
      <p style="${P}">${LINKS}</p>
      <p style="${P}">That one click is the whole answer, and it changes what the Coach puts in front of you from the next session on.</p>
      <p style="${P}">You will not get a second one of these from me. If none of the three fits, reply and say so; it lands in my inbox, not a queue.</p>`
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">${body}
      <p style="${P}">Göktuğ<br><span style="color:#6b7280;">Founder, SQL Quest</span></p>
    </div>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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

    // Registered accounts with an address. Guests have no row and no channel.
    const { data: rows, error } = await supabase
      .from('users')
      .select('username, email, data')
      .not('username', 'like', 'guest_%')
      .not('email', 'is', null)
      .range(0, 4999)
    if (error) throw error

    // Once per user EVER: anyone with a sent row for this template is done,
    // whatever the row's own stamp says.
    const { data: already } = await supabase
      .from('email_events')
      .select('username')
      .eq('template', TEMPLATE)
      .eq('event', 'sent')
    const lifetime = new Map<string, number>()
    for (const r of (already || [])) {
      if (!r.username) continue
      lifetime.set(r.username, (lifetime.get(r.username) || 0) + 1)
    }

    // Anyone mailed by any campaign in the last QUIET_HOURS waits.
    const quietSince = new Date(Date.now() - QUIET_HOURS * 3600000).toISOString()
    const { data: recent } = await supabase
      .from('email_events')
      .select('username')
      .eq('event', 'sent')
      .gte('created_at', quietSince)
    const recentlyMailed = new Set((recent || []).map((r: any) => r.username).filter(Boolean))

    const activeSince = Date.now() - ACTIVE_DAYS * 86400000

    type Candidate = { username: string; email: string; userData: any; solves: number; variant: Variant; lastActive: number }
    const audience: Candidate[] = []
    const skips: Record<string, number> = {}
    const skip = (why: string) => { skips[why] = (skips[why] || 0) + 1 }
    for (const row of (rows || [])) {
      const username = row.username as string
      const email = (row.email || '').trim()
      const userData = row.data || {}
      if (!email || !email.includes('@')) { skip('no_email'); continue }
      if (isInternalAccount(username, email)) { skip('internal'); continue }
      if (userData.emailOptOut === true) { skip('opted_out'); continue }
      if (goalOnRecord(userData)) { skip('goal_on_record'); continue }
      const lastActive = activeAt(userData)
      if (lastActive < activeSince) { skip('inactive'); continue }
      if ((lifetime.get(username) || 0) >= MAX_LIFETIME_SENDS) { skip('already_sent'); continue }   // once ever
      if (userData.goalNoteAt) { skip('already_sent'); continue }                                     // once ever, row stamp
      if (recentlyMailed.has(username)) { skip('quiet_window'); continue }                            // no stacking
      const solves = Array.isArray(userData.solvedChallenges) ? userData.solvedChallenges.length : 0
      audience.push({ username, email, userData, solves, variant: variantFor(username), lastActive })
    }
    // Most recently active first: the people most likely to still be inside.
    audience.sort((a, b) => b.lastActive - a.lastActive)
    const batch = audience.slice(0, cap)

    if (dry) {
      const first = batch[0]
      return new Response(JSON.stringify({
        dry: true, candidates: audience.length, batch: batch.length, cap, skipped: skips,
        preview: batch.map(c => ({
          username: c.username, solves: c.solves, variant: c.variant,
          subject: subjectFor(c.username), lastActive: new Date(c.lastActive).toISOString(),
        })),
        sample: first ? {
          subject: subjectFor(first.username),
          variant: first.variant,
          html: renderBody({ username: first.username, solves: first.solves, variant: first.variant }),
        } : null,
        // Both wordings on the same person, for the founder's read.
        variants: first ? {
          A: renderBody({ username: first.username, solves: first.solves, variant: 'A' }),
          B: renderBody({ username: first.username, solves: first.solves, variant: 'B' }),
        } : null,
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sent = 0, failed = 0
    for (const c of batch) {
      const unsubToken = await ensureUnsubToken(supabase, c.username, c.userData)
      const subject = subjectFor(c.username)
      const html = renderBody({ username: c.username, solves: c.solves, variant: c.variant })
      const ok = await sendAndLog(supabase, RESEND_API_KEY!, {
        to: c.email, username: c.username, template: TEMPLATE, subject, html,
        unsub: unsubLink(unsubToken), replyTo: REPLY_TO,
        meta: { solves: c.solves, variant: c.variant },
      })
      if (!ok) { failed++; continue }
      sent++
      await supabase
        .from('users')
        .update({ data: { ...c.userData, goalNoteAt: new Date().toISOString() } })
        .eq('username', c.username)
      // The product-side row the goal_capture_by_door read joins on. Checked,
      // not swallowed: supabase-js resolves with { error } on a rejected insert.
      const { error: evErr } = await supabase.from('pro_events').insert({
        event: 'goal_note_sent',
        username: c.username,
        reason: 'email',
        metadata: { solves: c.solves, variant: c.variant },
      })
      if (evErr) console.error('goal_note_sent insert failed', c.username, evErr.message)
    }

    return new Response(JSON.stringify({
      sent, failed, skipped: skips, candidates: audience.length,
      remaining: Math.max(0, audience.length - batch.length),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
