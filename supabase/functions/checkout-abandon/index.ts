// Supabase Edge Function: checkout-abandon
// Deploy: supabase functions deploy checkout-abandon
// Schedule: daily at 15:00 UTC via pg_cron (URL must include https://).
//
// The highest-intent email in the product. Targets users who clicked
// through to Stripe checkout (pro_events event='pro_checkout_clicked')
// 24-72 hours ago and did not buy. Real case that motivated this: a user
// opened checkout three times in 37 seconds and walked away — nobody
// followed up.
//
// SEGMENT 2, added 2026-09-14 on the founder's ask: people who were SHOWN the
// Pro modal 24-72h ago and never clicked a plan. Measured the same day, over
// 30 days: 209 people shown, 7 clicked (3.3%), 119 of them reachable by email.
// So this segment is ~17x the click segment, which currently resolves to
// almost nobody — there were 7 checkout clicks in 30 days and 0 in the last 8.
//
// It is deliberately a WEAKER ask than segment 1, because the two audiences
// are not the same thing. Someone who clicked checkout asked to buy. Someone
// who was shown the modal was INTERRUPTED with a price at their sixth solve
// and closed it — they asked for nothing. The copy therefore leads with their
// progress, says the interruption was our timing and not their problem,
// mentions Pro once, and asks one question. It does not say "you forgot to
// buy", because they did not forget anything.
//
// Guards:
//   - once per user EVER (userData.checkoutAbandonEmailAt for segment 1,
//     userData.modalAbandonEmailAt for segment 2) — personal founder notes,
//     not a nag sequence
//   - skips users who bought (proStatus true), opted out, or have no email
//   - 24h lower bound: don't email someone who might still be mid-purchase
//   - segment 2 additionally: registered only (a guest shown a modal has no
//     channel), >= MIN_SOLVES so we never mail someone we interrupted early,
//     never anyone who clicked (they belong to segment 1), capped per run
//   - ?dry=1 resolves the audience and sends nothing
//
// Sent from the founder with reply-to, because the email's real job is to
// start a conversation about what stopped them.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Segment 2 knobs. The modal fires at the sixth-solve milestone, so the floor
// is there on purpose: it excludes anyone who met a `generic` or lock-driven
// modal at two or three solves, who are exactly the people the 09-29
// quietEarlyAsks flip is trying to stop asking.
const MIN_SOLVES = 6
const MAX_PER_RUN = 25

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Internal accounts (test2 with 84 solves, sqlquest, test109 and friends)
// carry real addresses and pass every audience filter — they land in
// email_events and inflate the send counts and 48h-return rates these
// campaigns are judged by. (inlined; keep in sync across email functions —
// canonical copy lives in lapsed-pro)
const isInternalAccount = (username: string, email?: string | null) => {
  // Kept in sync with src/utils/leagues.js — that copy was already the broad
  // one; these inline copies were not, and fabletestdb / fabletestfree /
  // fabletestux / linktest348013 / internalroutine768 sailed through every
  // audience filter. Two of them have failed welcome-back with a Resend 422
  // every single day since 07-23 (@example.com is unroutable by RFC 2606).
  // They also land in email_events and inflate the send counts and 48h-return
  // rates these campaigns are judged by.
  const u = (username || '').toLowerCase()
  const e = (email || '').toLowerCase()
  return /^(test|demo|admin|qa)\d*$/i.test(u) ||
    u === 'sqlquest' ||
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Caller gate (2026-09-17): the anon key ships in every browser, and JWT
  // verification lets it through — without this line anyone with the URL
  // could trigger a send. Only the service role may call this function.
  // The pg_cron jobs must carry it (supabase/manual/20260917_cron_service_role.sql).
  const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`
  if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || (req.headers.get('authorization') ?? '') !== expected) {
    return new Response(JSON.stringify({ error: 'service role required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const dry = new URL(req.url).searchParams.get('dry') === '1'
    const now = Date.now()
    const since = new Date(now - 72 * 60 * 60 * 1000).toISOString()
    const until = new Date(now - 24 * 60 * 60 * 1000).toISOString()

    // Checkout clicks in the 24-72h window.
    const { data: clicks, error } = await supabase
      .from('pro_events')
      .select('username, metadata, created_at')
      .eq('reason', 'activation_funnel')
      .eq('event', 'pro_checkout_clicked')
      .gte('created_at', since)
      .lte('created_at', until)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Latest click per username (metadata is a double-encoded JSON string).
    // Guests are INCLUDED when their click carries an email (captured by
    // the checkout email step, H11) — they have no users-table row, so the
    // event metadata is the only way to reach them. 3 of the first 5
    // clickers ever were guests; before this they were unrecoverable.
    const latestByUser = new Map<string, { plan: string; at: string; email: string | null }>()
    for (const row of (clicks || [])) {
      const u = row.username
      if (!u || latestByUser.has(u)) continue
      let plan = 'monthly', email: string | null = null
      try {
        const md = JSON.parse(row.metadata) || {}
        plan = md.plan || 'monthly'
        email = typeof md.email === 'string' && md.email.includes('@') ? md.email : null
      } catch (_) { /* keep defaults */ }
      const isGuest = u === 'guest' || u.startsWith('guest_')
      if (isGuest && !email) continue // unreachable — no channel
      latestByUser.set(u, { plan, at: row.created_at, email })
    }

    let sent = 0, skipped = 0
    for (const [username, click] of latestByUser) {
      if (isInternalAccount(username, click.email)) { skipped++; continue }
      const isGuest = username === 'guest' || username.startsWith('guest_')

      if (isGuest) {
        // Guest path — email came from the click event (H11 capture).
        const email = click.email!
        // Dedup: once per email address ever, tracked via email_events
        // (guests have no users.data to stamp).
        const { data: prior } = await supabase
          .from('email_events')
          .select('id').eq('email', email)
          .eq('template', 'checkout_abandon').eq('event', 'sent').limit(1)
        if (prior && prior.length > 0) { skipped++; continue }
        // Respect the captures unsubscribe flag; reuse (or create) the
        // email_captures row so the unsub link has a token to point at.
        let { data: cap } = await supabase
          .from('email_captures')
          .select('unsubscribe_token, unsubscribed')
          .eq('email', email).maybeSingle()
        if (cap?.unsubscribed) { skipped++; continue }
        if (!cap?.unsubscribe_token) {
          const token = crypto.randomUUID()
          await supabase.from('email_captures')
            .insert({ email, source: 'checkout', unsubscribe_token: token })
          cap = { unsubscribe_token: token, unsubscribed: false }
        }
        // Skip if this email already paid (pending_subscriptions claimed or not).
        const { data: paid } = await supabase
          .from('pending_subscriptions')
          .select('id').eq('email', email.toLowerCase()).limit(1)
        if (paid && paid.length > 0) { skipped++; continue }

        const planLabel = click.plan === 'annual' ? 'the annual plan'
          : click.plan === 'lifetime' ? 'the lifetime plan' : 'the monthly plan'
        const cta = utm('/app.html', 'checkout_abandon')
        const ok = await sendAndLog(supabase, RESEND_API_KEY, {
          to: email, username, template: 'checkout_abandon',
          subject: 'You were one step from Pro — what stopped you?',
          html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
          <p style="font-size: 15px; line-height: 1.8;">Hi,</p>
          <p style="font-size: 15px; line-height: 1.8;">
            I'm Göktuğ — I built SQL Quest. I saw you opened checkout for ${planLabel}
            but didn't finish. That's completely fine — I'm not writing to push you.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            I'd genuinely like to know what stopped you: the price, not sure it's worth it,
            a payment hiccup? <strong>Just hit reply</strong> — it goes straight to me and
            every answer makes the product better.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            And if you were on the fence: Pro comes with a 7-day money-back guarantee.
            If it doesn't move your prep, reply to your receipt and I'll refund you in
            full, no questions asked.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${cta}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Pick up where you left off →
            </a>
          </div>
          <p style="font-size: 15px; line-height: 1.8;">— Göktuğ</p>
        </div>`,
          unsub: `${Deno.env.get('SUPABASE_URL')}/functions/v1/email-unsubscribe?t=${cap.unsubscribe_token}`,
          replyTo: REPLY_TO,
        })
        if (ok) sent++; else skipped++
        continue
      }

      const { data: userRow } = await supabase
        .from('users')
        .select('username, email, data')
        .eq('username', username)
        .maybeSingle()

      if (!userRow?.email) { skipped++; continue }
      const userData = userRow.data || {}
      if (userData.emailOptOut === true) { skipped++; continue }
      if (userData.proStatus === true) { skipped++; continue }          // they bought
      if (userData.checkoutAbandonEmailAt) { skipped++; continue }      // once ever

      const solved = (userData.solvedChallenges || []).length
      const planLabel = click.plan === 'annual' ? 'the annual plan'
        : click.plan === 'lifetime' ? 'the lifetime plan' : 'the monthly plan'

      const unsubToken = await ensureUnsubToken(supabase, username, userData)
      const cta = utm('/app.html', 'checkout_abandon')
      const subject = 'You were one step from Pro — what stopped you?'
      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
          <p style="font-size: 15px; line-height: 1.8;">Hi ${username},</p>
          <p style="font-size: 15px; line-height: 1.8;">
            I'm Göktuğ — I built SQL Quest. I saw you opened checkout for ${planLabel}
            ${solved > 0 ? `after solving ${solved} challenges` : 'recently'} but didn't finish.
            That's completely fine — I'm not writing to push you.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            I'd genuinely like to know what stopped you: the price, not sure it's worth it,
            a payment hiccup? <strong>Just hit reply</strong> — it goes straight to me and
            every answer makes the product better.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            And if you were on the fence: Pro comes with a 7-day money-back guarantee.
            If it doesn't move your prep, reply to your receipt and I'll refund you in
            full, no questions asked.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${cta}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Pick up where you left off →
            </a>
          </div>
          <p style="font-size: 15px; line-height: 1.8;">— Göktuğ</p>
        </div>
      `

      const ok = await sendAndLog(supabase, RESEND_API_KEY, {
        to: userRow.email, username, template: 'checkout_abandon',
        subject, html, unsub: unsubLink(unsubToken), replyTo: REPLY_TO,
      })
      if (ok) {
        await supabase
          .from('users')
          .update({ data: { ...userData, checkoutAbandonEmailAt: new Date().toISOString() } })
          .eq('username', username)
        sent++
      }
    }

    // ── SEGMENT 2: shown the modal, never clicked ────────────────────────
    //
    // Everyone above asked to buy. These people did not: the modal opened at
    // their sixth solve and they closed it. The email says so.
    const { data: shows } = await supabase
      .from('pro_events')
      .select('username, metadata, created_at')
      .eq('reason', 'activation_funnel')
      .eq('event', 'pro_modal_shown')
      .gte('created_at', since)
      .lte('created_at', until)
      .order('created_at', { ascending: false })

    // One row per registered person, newest show first.
    const shownBy = new Map<string, { at: string; reason: string }>()
    for (const row of (shows || [])) {
      const u = row.username
      if (!u || u === 'guest' || u.startsWith('guest_')) continue  // no channel
      if (shownBy.has(u) || latestByUser.has(u)) continue          // segment 1 wins
      let reason = 'generic'
      try { reason = (JSON.parse(row.metadata) || {}).reason || 'generic' } catch (_) { /* default */ }
      shownBy.set(u, { at: row.created_at, reason })
    }

    let sent2 = 0, skipped2 = 0
    const audience2: string[] = []
    for (const [username, show] of shownBy) {
      if (sent2 >= MAX_PER_RUN) break
      if (isInternalAccount(username)) { skipped2++; continue }

      // Anyone who clicked a plan AT ANY TIME belongs to segment 1's story,
      // not this one — even if the click was outside the 24-72h window.
      const { data: clickedEver } = await supabase
        .from('pro_events')
        .select('id').eq('username', username)
        .in('event', ['pro_plan_clicked', 'pro_checkout_clicked']).limit(1)
      if (clickedEver && clickedEver.length > 0) { skipped2++; continue }

      const { data: userRow } = await supabase
        .from('users').select('username, email, data').eq('username', username).maybeSingle()
      if (!userRow?.email) { skipped2++; continue }
      const userData = userRow.data || {}
      if (userData.emailOptOut === true) { skipped2++; continue }
      if (userData.proStatus === true) { skipped2++; continue }
      if (userData.modalAbandonEmailAt) { skipped2++; continue }        // once ever
      if (userData.checkoutAbandonEmailAt) { skipped2++; continue }     // already had the other note

      const solved = (userData.solvedChallenges || []).length
      if (solved < MIN_SOLVES) { skipped2++; continue }

      audience2.push(`${username} (${solved} solves, ${show.reason})`)
      if (dry) { sent2++; continue }

      const unsubToken = await ensureUnsubToken(supabase, username, userData)
      const cta = utm('/app.html', 'modal_abandon')
      const subject = "SQL Quest's founder here — I showed you a price at the wrong moment"
      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
          <p style="font-size: 15px; line-height: 1.8;">Hi ${username},</p>
          <p style="font-size: 15px; line-height: 1.8;">
            I'm Göktuğ — I build SQL Quest, and I'm writing this myself to a short list.
            You solved ${solved} challenges, and somewhere around the sixth one the app
            stopped you and showed you a price. You closed it, which is the right thing
            to do when something interrupts you mid-flow.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            That timing was my decision, not your problem, and I'm not writing to ask
            again. I'd rather tell you the useful part I skipped: ${solved} solves is
            past where most people stop, and the next thing worth your time is whichever
            skill your Skillmap has lowest — it is on your Coach tab and it costs nothing.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">
            Pro exists and it is $29/mo or $99/yr. That is the last you'll hear of it
            from me — no reminder, no second email, no sequence. I don't run those.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${cta}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Back to your next question →
            </a>
          </div>
          <p style="font-size: 15px; line-height: 1.8;">
            One question, and it's the reason I wrote: <strong>what would have made that
            moment useful instead of annoying?</strong> Hit reply — it comes to me.
          </p>
          <p style="font-size: 15px; line-height: 1.8;">— Göktuğ<br>Founder, SQL Quest</p>
        </div>
      `

      const ok = await sendAndLog(supabase, RESEND_API_KEY, {
        to: userRow.email, username, template: 'modal_abandon',
        subject, html, unsub: unsubLink(unsubToken), replyTo: REPLY_TO,
      })
      if (ok) {
        await supabase.from('users')
          .update({ data: { ...userData, modalAbandonEmailAt: new Date().toISOString() } })
          .eq('username', username)
        sent2++
      } else { skipped2++ }
    }

    return new Response(JSON.stringify({
      dry,
      checkout_clicked: { sent, skipped, candidates: latestByUser.size },
      modal_no_click: { sent: sent2, skipped: skipped2, candidates: shownBy.size, audience: audience2 },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    // `unknown` in Deno's catch — the old `err.message` failed `deno check`,
    // so this file could never be type-checked in CI.
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
