// Supabase Edge Function: lapsed-pro
// Deploy: supabase functions deploy lapsed-pro
// Schedule: daily at 16:00 UTC via pg_cron (URL must include https://).
// Dry run: GET /functions/v1/lapsed-pro?dry=1  — resolves the audience and
// renders nothing, sends nothing.
//
// The one segment no in-app trigger can reach.
//
// 53 users carry proStatus=true on Pro that has already expired; 23 of them
// are engaged (5+ solves). They had the paid product, used it, lost it, and
// drifted. The paywall can't reach them because it only fires on a session
// that never happens — five of them (jnani 22 solves, apriwaymw 15, thurai
// 12, ajayjadeja 11, tausif1122 10) were last active BEFORE their trial even
// expired. They had Pro the whole time they used SQL Quest, so the milestone
// modal correctly never fired, and then they were gone. Email is the only
// channel left.
//
// The stale flag is the targeting key, not a bug to route around:
// proStatus=true AND expiry in the past IS the definition of lapsed. The app
// itself evaluates Pro as flag AND (lifetime OR expiry > now), so these
// people are correctly free in the product — only the row is stale.
//
// Guards:
//   - once per user EVER (userData.lapsedProEmailAt). A win-back is a letter,
//     not a sequence.
//   - engaged only (MIN_SOLVES). Emailing someone who lapsed after two
//     solves is spam; they never saw what they'd be coming back to.
//   - 3-day floor after expiry, so a lapse that's about to auto-renew or get
//     fixed doesn't trigger a "we miss you" the same afternoon.
//   - per-run cap. The backlog is ~23 and the first run would otherwise send
//     them all in one burst; it drains over days instead, which also means a
//     copy mistake costs a handful of sends rather than the whole segment.
//   - skips opted-out, no-email, still-live-Pro, and guests (no row).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const REPLY_TO = 'goktug@datrick.com'
const MIN_SOLVES = 5
const MIN_DAYS_SINCE_EXPIRY = 3
const MAX_PER_RUN = 8

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
    SQL Quest — Master SQL through practice · <a href="${SITE}" style="color:#9ca3af;">sqlquest.app</a><br>
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
  } catch (_) { /* email_events may not exist yet — measurement is best-effort */ }
  return ok
}
// ── end shared block ──

const isProLive = (d: any) =>
  d?.proStatus === true &&
  (d?.proType === 'lifetime' || (d?.proExpiry && new Date(d.proExpiry) > new Date()))

// Internal accounts. `sqlquest`, `test2` (84 solves) and friends carry real
// addresses and sail through every audience filter — the first audience read
// for this function had `sqlquest` sitting in it. They don't just make for an
// awkward send: every one of them lands in email_events and quietly inflates
// the send counts and 48h-return rates we judge these campaigns by.
// NOTE: no other email function filters these. Worth fixing across the set.
const isInternalAccount = (username: string, email?: string | null) =>
  /^(test|demo|admin|qa)\d*$/i.test(username) ||
  username.toLowerCase() === 'sqlquest' ||
  (email || '').toLowerCase().endsWith('@datrick.com')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const dry = new URL(req.url).searchParams.get('dry') === '1'
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY && !dry) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Everyone still flagged Pro. Expiry is evaluated here, not in the query,
    // because proExpiry lives inside the jsonb blob.
    const { data: rows, error } = await supabase
      .from('users')
      .select('username, email, data, updated_at')
      .eq('data->>proStatus', 'true')
    if (error) throw error

    const now = Date.now()
    const audience: any[] = []
    const skips: Record<string, number> = {}
    const skip = (why: string) => { skips[why] = (skips[why] || 0) + 1 }

    for (const row of (rows || [])) {
      const username = row.username || ''
      const d = row.data || {}
      if (!username || username === 'guest' || username.startsWith('guest_')) { skip('guest'); continue }
      if (isInternalAccount(username, row.email)) { skip('internal_account'); continue }
      if (isProLive(d)) { skip('still_pro'); continue }
      if (!d.proExpiry) { skip('no_expiry'); continue }

      const daysSince = Math.floor((now - new Date(d.proExpiry).getTime()) / 86400000)
      if (daysSince < MIN_DAYS_SINCE_EXPIRY) { skip('too_soon'); continue }

      const solved = (d.solvedChallenges || []).length
      if (solved < MIN_SOLVES) { skip('not_engaged'); continue }
      if (!row.email) { skip('no_email'); continue }
      if (d.emailOptOut === true) { skip('opted_out'); continue }
      if (d.lapsedProEmailAt) { skip('already_sent'); continue }

      audience.push({
        username, email: row.email, data: d, solved, daysSince,
        // A lapsed paid subscription is a churned customer; a lapsed trial
        // never paid. Same offer, different thing to say about it.
        wasPaying: d.proType === 'monthly' || d.proType === 'annual',
        proType: d.proType || 'trial',
      })
    }

    // Most engaged first: if the cap bites, spend it on the strongest signal.
    audience.sort((a, b) => b.solved - a.solved)
    const batch = audience.slice(0, MAX_PER_RUN)

    if (dry) {
      return new Response(JSON.stringify({
        dry: true,
        flagged_pro_rows: rows?.length ?? 0,
        eligible: audience.length,
        would_send_now: batch.length,
        cap: MAX_PER_RUN,
        skips,
        preview: batch.map(a => ({
          username: a.username, solves: a.solved,
          days_since_expiry: a.daysSince, pro_type: a.proType, was_paying: a.wasPaying,
        })),
      }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let sent = 0, failed = 0
    for (const a of batch) {
      const unsubToken = await ensureUnsubToken(supabase, a.username, a.data)
      const cta = utm('/app.html', 'lapsed_pro')

      // No discount, no urgency, no fake scarcity. The honest reason to come
      // back is that the thing they left got better, so that's the email.
      const openingLine = a.wasPaying
        ? `Your SQL Quest Pro subscription lapsed ${a.daysSince} days ago, and I noticed you haven't been back since.`
        : `Your SQL Quest Pro trial ended ${a.daysSince} days ago, and I noticed you haven't been back since.`

      const subject = a.wasPaying
        ? 'Your Pro lapsed — and the part you were using got rebuilt'
        : 'Your trial ended before the best part shipped'

      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
          <p style="font-size: 15px; line-height: 1.8;">Hi ${a.username},</p>
          <p style="font-size: 15px; line-height: 1.8;">
            I'm Göktuğ — I built SQL Quest. ${openingLine}
            You'd solved ${a.solved} challenges by then, which is more than most people ever do.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            I'm not writing with a discount. I'm writing because I fixed the thing
            that was probably wrong while you were here.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            The Coach — the part that decides what you practise next — had a bug that
            switched off its adaptivity. It was showing beginners' steps to people who
            were past them, and neither of its learning paths could actually be
            finished. That's fixed. There's also a new <strong>SQL Interview Prep</strong>
            path built around the patterns interview loops actually ask.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            And the jump from the easy challenges to the hard ones was a cliff — window
            functions had 32 Hard problems and not a single Easy one. I wrote 12 new
            challenges to fill the middle, so JOINs, subqueries and window functions now
            have a ramp instead of a wall.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            All of that is free. Your ${a.solved} solves and your skill radar are exactly
            where you left them.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${cta}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Pick up where you left off →
            </a>
          </div>
          <p style="font-size: 15px; line-height: 1.8;">
            If you left because something was broken or missing, I'd really like to hear
            which — <strong>just hit reply</strong>, it comes straight to me.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">— Göktuğ</p>
        </div>`

      const ok = await sendAndLog(supabase, RESEND_API_KEY!, {
        to: a.email, username: a.username, template: 'lapsed_pro',
        subject, html, unsub: unsubLink(unsubToken), replyTo: REPLY_TO,
      })
      if (ok) {
        await supabase.from('users')
          .update({ data: { ...a.data, lapsedProEmailAt: new Date().toISOString() } })
          .eq('username', a.username)
        sent++
      } else failed++
    }

    return new Response(JSON.stringify({
      sent, failed, eligible: audience.length, remaining: audience.length - batch.length, skips,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    // Every other email function writes `err.message` here and every one of
    // them fails `deno check` for it; the edge runtime doesn't strict-check,
    // so it ships. Narrowing costs nothing and makes this one clean.
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
