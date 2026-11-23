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
// ── mode=new (2026-11-22): the same question to people who just signed up ──
// GET /functions/v1/goal-note?mode=new[&dry=1][&limit=N]
// The backlog run above drains the people who never gave a goal; this mode
// asks each NEW registrant once, while they still remember why they came.
// Same template (goal_note), so "once per person ever" spans both modes.
// Audience (each a skip reason in the dry run):
//   - registered 24 to 72 hours ago, read from users.data.createdAt (epoch-ms
//     or ISO). Never users.created_at: the client overwrote that column on
//     every save before 2026-09-12. And never sooner than 12 hours after
//     sign-up, a separate guard that survives a change to the window.
//   - has an email, not internal, not opted out, no goal on record, not in
//     FOUNDER_MAILED_BY_HAND, never sent goal_note in either mode, no other
//     campaign in QUIET_HOURS. The same checks as the backlog run.
// Timing: meant to run hourly. A person is mailed only while their local
// clock reads 09:xx or 10:xx, from the tz stamped on their activation events
// (streak-reminder's method). No tz on record: the 14:xx UTC run.
// Content: the email voice rule, kept true for an automated send. The founder
// in the subject (three phrasings by hash). The body never claims to be typed
// by hand: a cron sends it. It says what is true instead: the founder set it
// up to ask every new person one question, replies go to the founder's own
// inbox (REPLY_TO), and the founder reads them. One specific fact (the company
// page they came in through, from arrivalSrc `company:X`, else their solve
// count; a challenge title is not available server-side, the bank ships to
// the browser), one question, three one-click answers carrying `m=new`, the
// reply line for an interview, no price, no sequence. Two body wordings.
// Cap 20 a run (MAX_PER_RUN_NEW); ?limit= only lowers it.
// NOT scheduled either. The founder deploys it and adds the cron line.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PER_RUN = 60
const MAX_PER_RUN_NEW = 20
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

// `m=new` marks an answer from the new-signup mode, so the arrival event
// (`intent_captured {src, m}`) splits the two modes without a second template.
type Mode = 'backlog' | 'new'
const goalLink = (goal: string, label: string, mode: Mode) =>
  `<a href="${utm(`/app/?src=goal_note&goal=${goal}${mode === 'new' ? '&m=new' : ''}`, TEMPLATE)}" style="color: #7c3aed; font-weight: 600; text-decoration: none;">${label}</a>`

const linksFor = (mode: Mode) => `${goalLink('interview', 'An interview', mode)} &nbsp;·&nbsp; ${goalLink('job_ready', 'Getting job-ready', mode)} &nbsp;·&nbsp; ${goalLink('learning', 'SQL in general', mode)}`
const LINKS = linksFor('backlog')

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

const FOUNDER_MAILED_BY_HAND = new Set(['alexis_montesdeoca', 'harinivr02', 'rereremin'])

// ── mode=new: pure block (tests/goal-note.test.js runs it) ──────────────────
const NEW_MIN_AGE_HOURS = 24
const NEW_MAX_AGE_HOURS = 72
const NEW_MIN_HOURS_AFTER_SIGNUP = 12
const SEND_LOCAL_HOURS = [9, 10]
const FALLBACK_UTC_HOUR = 14

// users.data.createdAt is epoch-ms on rows the auth path wrote and an ISO
// string on the rest (and, defensively, a numeric string). 0 when unreadable.
function createdAtMs(d: any): number {
  const v = d?.createdAt
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v !== 'string' || !v) return 0
  const t = /^\d+$/.test(v) ? Number(v) : Date.parse(v)
  return Number.isFinite(t) ? t : 0
}

// Null when the sign-up time is inside the window, else the skip reason. The
// 12-hour floor is its own check: lowering the window's floor never mails
// anyone in their first 12 hours.
function signupWindowSkip(
  createdMs: number, nowMs: number,
  w: { minAge: number; maxAge: number; floor: number } = { minAge: NEW_MIN_AGE_HOURS, maxAge: NEW_MAX_AGE_HOURS, floor: NEW_MIN_HOURS_AFTER_SIGNUP },
): string | null {
  if (!createdMs) return 'no_created_at'
  const hours = (nowMs - createdMs) / 3600000
  if (hours < w.floor) return 'too_new'
  if (hours < w.minAge) return 'too_new'
  if (hours > w.maxAge) return 'too_old'
  return null
}

// The person's local hour, from the IANA zone their events carry. A known
// zone sends at 09:xx or 10:xx local; no zone (or one Intl rejects) sends on
// the 14:xx UTC run.
function sendWindow(tz: string | null, now: Date): { tz: string | null; hour: number; due: boolean } {
  let hour: number | null = null
  if (tz) {
    try {
      hour = parseInt(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now), 10) % 24
      if (!Number.isFinite(hour)) hour = null
    } catch (_) { hour = null }
  }
  if (hour === null) {
    const utcHour = now.getUTCHours()
    return { tz: null, hour: utcHour, due: utcHour === FALLBACK_UTC_HOUR }
  }
  return { tz, hour, due: SEND_LOCAL_HOURS.includes(hour) }
}

// arrivalSrc `company:<Name>` comes from a URL parameter, so it is the
// visitor's text, not ours: only a plain company name goes into an email.
function companyFromArrival(src: unknown): string | null {
  if (typeof src !== 'string' || !src.startsWith('company:')) return null
  const name = src.slice('company:'.length).trim()
  return /^[A-Za-z0-9][A-Za-z0-9 .&'-]{0,39}$/.test(name) ? name : null
}

// The founder in every subject (CLAUDE.md, email voice), three phrasings so a
// batch does not read as a mailing.
const SUBJECTS_NEW = [
  'I build SQL Quest. One question for you',
  "From SQL Quest's founder: what are you practising for?",
  'A question from the person who builds SQL Quest, after your first days',
]
const subjectForNew = (username: string) => SUBJECTS_NEW[hash(`${username}:new`) % SUBJECTS_NEW.length]

// One specific fact: the company page they came in through, else their solve
// count, else nothing (the sentence is omitted, never padded).
function factLine(args: { company: string | null; solves: number }): string {
  const { company, solves } = args
  if (company) return ` You came in through our ${company} page, so I could guess. I would rather ask.`
  if (solves > 0) return ` You have solved ${solves} ${solves === 1 ? 'challenge' : 'challenges'} since you joined, and I would rather ask than guess from that.`
  return ''
}

const REPLY_LINE = "If it's an interview, reply with the company and the date. I read every reply."

function renderNewBody(args: { username: string; solves: number; company: string | null; variant: Variant }): string {
  const { username, variant } = args
  const fact = factLine(args)
  const links = linksFor('new')
  const body = variant === 'A'
    ? `
      <p style="${P}">Hi ${username},</p>
      <p style="${P}">I build SQL Quest. You joined in the last few days, and I set this up so I can ask every new person one question.${fact}</p>
      <p style="${P}"><strong>One question: what are you preparing for?</strong></p>
      <p style="${P}">${links}</p>
      <p style="${P}">One click, nothing to fill in. The answer sets the order the Coach puts things in front of you.</p>
      <p style="${P}">Your reply comes to my own inbox. ${REPLY_LINE} I won't send another one of these.</p>`
    : `
      <p style="${P}">Hi ${username},</p>
      <p style="${P}">You joined SQL Quest in the last couple of days. I build it, and I wanted every new person to get one question from me.${fact}</p>
      <p style="${P}"><strong>What are you preparing for?</strong></p>
      <p style="${P}">${links}</p>
      <p style="${P}">That click is the whole answer. It changes what the Coach shows you from your next session on.</p>
      <p style="${P}">That is the only ask, and I won't send another one of these. Replies land in my own inbox, not a support queue. ${REPLY_LINE}</p>`
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">${body}
      <p style="${P}">Göktuğ<br><span style="color:#6b7280;">Founder, SQL Quest</span></p>
    </div>`
}
// PostgREST answers at most the project's max-rows (1,000 by default)
// whatever range is asked, and says nothing when it cuts. A single read would
// drop rows silently: the newest sign-ups from the users read, or past sends
// from the once-ever read (a second letter to the same person). So every
// list read pages, in a stable order, until a page comes back empty; the
// step is whatever the server returned, so any cap works. An error throws:
// a run that cannot see who was already mailed must not mail anyone.
async function fetchAllRows(
  page: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>,
  pageSize = 1000, maxRows = 100000,
): Promise<any[]> {
  const out: any[] = []
  for (let from = 0; from < maxRows;) {
    const { data, error } = await page(from, from + pageSize - 1)
    if (error) throw error
    const rows = data || []
    if (rows.length === 0) break
    out.push(...rows)
    from += rows.length
  }
  return out
}
// ── end mode=new pure block ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Caller gate (2026-09-17): this function is deployed with JWT verification
  // off, and the anon key ships in every browser — without this line anyone
  // with the URL could mail the whole segment. Only the service role may call
  // it, dry run included (the dry run lists usernames).
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
    const url = new URL(req.url)
    const dry = url.searchParams.get('dry') === '1'
    // Two modes, one template: the backlog run (default) and the new-signup
    // run (`?mode=new`, header above).
    const mode: Mode = url.searchParams.get('mode') === 'new' ? 'new' : 'backlog'
    const runMax = mode === 'new' ? MAX_PER_RUN_NEW : MAX_PER_RUN
    const limitParam = Number(url.searchParams.get('limit'))
    // ?limit= only ever lowers the cap.
    const cap = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(runMax, Math.floor(limitParam)) : runMax
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY && !dry) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Registered accounts with an address. Guests have no row and no channel.
    const rows = await fetchAllRows((from, to) => supabase
      .from('users')
      .select('username, email, data')
      .not('username', 'like', 'guest_%')
      .not('email', 'is', null)
      .order('username', { ascending: true })
      .range(from, to))

    // Once per user EVER: anyone with a sent row for this template is done,
    // whatever the row's own stamp says.
    const already = await fetchAllRows((from, to) => supabase
      .from('email_events')
      .select('username')
      .eq('template', TEMPLATE)
      .eq('event', 'sent')
      .order('id', { ascending: true })
      .range(from, to))
    const lifetime = new Map<string, number>()
    for (const r of (already || [])) {
      if (!r.username) continue
      lifetime.set(r.username, (lifetime.get(r.username) || 0) + 1)
    }

    // Anyone mailed by any campaign in the last QUIET_HOURS waits.
    const quietSince = new Date(Date.now() - QUIET_HOURS * 3600000).toISOString()
    const recent = await fetchAllRows((from, to) => supabase
      .from('email_events')
      .select('username')
      .eq('event', 'sent')
      .gte('created_at', quietSince)
      .order('id', { ascending: true })
      .range(from, to))
    const recentlyMailed = new Set((recent || []).map((r: any) => r.username).filter(Boolean))

    const nowMs = Date.now()
    const activeSince = nowMs - ACTIVE_DAYS * 86400000

    type Candidate = {
      username: string; email: string; userData: any; solves: number; variant: Variant; lastActive: number;
      createdMs: number; company: string | null; tz: string | null; localHour: number | null; due: boolean;
    }
    const audience: Candidate[] = []
    const skips: Record<string, number> = {}
    const skip = (why: string) => { skips[why] = (skips[why] || 0) + 1 }
    for (const row of (rows || [])) {
      const username = row.username as string
      const email = (row.email || '').trim()
      const userData = row.data || {}
      if (!email || !email.includes('@')) { skip('no_email'); continue }
      if (isInternalAccount(username, email)) { skip('internal'); continue }
      // The founder wrote to these three by hand on 2026-09-12 (ledger: "three
      // hand-written founder emails of 09-12"), and that
      // entry says: do not mail them again.
      if (FOUNDER_MAILED_BY_HAND.has(username)) { skip('founder_mailed'); continue }
      if (userData.emailOptOut === true) { skip('opted_out'); continue }
      if (goalOnRecord(userData)) { skip('goal_on_record'); continue }
      const lastActive = activeAt(userData)
      const createdMs = createdAtMs(userData)
      if (mode === 'new') {
        const why = signupWindowSkip(createdMs, nowMs)   // 24-72 h ago, never under 12 h
        if (why) { skip(why); continue }
      } else if (lastActive < activeSince) { skip('inactive'); continue }
      if ((lifetime.get(username) || 0) >= MAX_LIFETIME_SENDS) { skip('already_sent'); continue }   // once ever
      if (userData.goalNoteAt) { skip('already_sent'); continue }                                     // once ever, row stamp
      if (recentlyMailed.has(username)) { skip('quiet_window'); continue }                            // no stacking
      const solves = Array.isArray(userData.solvedChallenges) ? userData.solvedChallenges.length : 0
      audience.push({ username, email, userData, solves, variant: variantFor(username), lastActive, createdMs, company: null, tz: null, localHour: null, due: true })
    }

    let due = audience
    if (mode === 'new' && audience.length > 0) {
      // Zone and arrival door per candidate, from their own activation events
      // (newest first; metadata is jsonb, or a JSON string on older rows).
      const tzByUser = new Map<string, string>()
      const companyByUser = new Map<string, string>()
      try {
        const evRows = await fetchAllRows((from, to) => supabase
          .from('pro_events')
          .select('username, metadata')
          .eq('reason', 'activation_funnel')
          .in('username', audience.map(c => c.username))
          .order('created_at', { ascending: false })
          .range(from, to))
        for (const row of (evRows || [])) {
          if (!row.username) continue
          let meta: any = row.metadata
          if (typeof meta === 'string') { try { meta = JSON.parse(meta) } catch (_) { meta = null } }
          if (!meta || typeof meta !== 'object') continue
          if (!tzByUser.has(row.username) && typeof meta.tz === 'string' && meta.tz.includes('/')) tzByUser.set(row.username, meta.tz)
          const company = companyFromArrival(meta.arrivalSrc)
          if (!companyByUser.has(row.username) && company) companyByUser.set(row.username, company)
        }
      } catch (_) { /* best-effort: no zone means the 14:xx UTC run, no company means the solve count */ }
      const now = new Date(nowMs)
      for (const c of audience) {
        const w = sendWindow(tzByUser.get(c.username) || null, now)
        c.tz = w.tz
        c.localHour = w.hour
        c.due = w.due
        c.company = companyByUser.get(c.username) || null
      }
      due = audience.filter(c => c.due)
      const notDue = audience.length - due.length
      if (notDue > 0) skips.not_send_hour = notDue
      // Closest to the 72-hour edge first: they have the fewest runs left.
      due.sort((a, b) => a.createdMs - b.createdMs)
    } else {
      // Most recently active first: the people most likely to still be inside.
      audience.sort((a, b) => b.lastActive - a.lastActive)
    }
    const batch = due.slice(0, cap)
    const subjectOf = (c: Candidate) => mode === 'new' ? subjectForNew(c.username) : subjectFor(c.username)
    const bodyOf = (c: Candidate, variant: Variant) => mode === 'new'
      ? renderNewBody({ username: c.username, solves: c.solves, company: c.company, variant })
      : renderBody({ username: c.username, solves: c.solves, variant })

    if (dry) {
      // The first candidate of the whole audience, due now or not, so a dry
      // run outside the send hour still previews the wording.
      const first = batch[0] || audience[0]
      return new Response(JSON.stringify({
        dry: true, mode, candidates: audience.length, due: due.length, batch: batch.length, cap, skipped: skips,
        // Every candidate, with when they would be mailed (new mode) or how
        // recently they were active (backlog).
        preview: audience.map(c => ({
          username: c.username, solves: c.solves, variant: c.variant, subject: subjectOf(c),
          ...(mode === 'new'
            ? { createdAt: new Date(c.createdMs).toISOString(), tz: c.tz, localHour: c.localHour, dueNow: c.due, company: c.company }
            : { lastActive: new Date(c.lastActive).toISOString() }),
        })),
        sample: first ? {
          subject: subjectOf(first),
          variant: first.variant,
          html: bodyOf(first, first.variant),
        } : null,
        // Both wordings on the same person, for the founder's read.
        variants: first ? {
          A: bodyOf(first, 'A'),
          B: bodyOf(first, 'B'),
        } : null,
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sent = 0, failed = 0
    for (const c of batch) {
      const unsubToken = await ensureUnsubToken(supabase, c.username, c.userData)
      const subject = subjectOf(c)
      const html = bodyOf(c, c.variant)
      const ok = await sendAndLog(supabase, RESEND_API_KEY!, {
        to: c.email, username: c.username, template: TEMPLATE, subject, html,
        unsub: unsubLink(unsubToken), replyTo: REPLY_TO,
        meta: { mode, variant: c.variant, solves: c.solves },
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
        metadata: { mode, solves: c.solves, variant: c.variant },
      })
      if (evErr) console.error('goal_note_sent insert failed', c.username, evErr.message)
    }

    return new Response(JSON.stringify({
      mode, sent, failed, skipped: skips, candidates: audience.length,
      remaining: Math.max(0, due.length - batch.length),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
