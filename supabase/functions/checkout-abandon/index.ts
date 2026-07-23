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
// Guards:
//   - once per user EVER (userData.checkoutAbandonEmailAt) — this is a
//     personal founder note, not a nag sequence
//   - skips users who bought (proStatus true), opted out, or have no email
//   - 24h lower bound: don't email someone who might still be mid-purchase
//
// Sent from the founder with reply-to, because the email's real job is to
// start a conversation about what stopped them.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Internal accounts (test2 with 84 solves, sqlquest, test109 and friends)
// carry real addresses and pass every audience filter — they land in
// email_events and inflate the send counts and 48h-return rates these
// campaigns are judged by. (inlined; keep in sync across email functions —
// canonical copy lives in lapsed-pro)
const isInternalAccount = (username: string, email?: string | null) =>
  /^(test|demo|admin|qa)\d*$/i.test(username || '') ||
  (username || '').toLowerCase() === 'sqlquest' ||
  (email || '').toLowerCase().endsWith('@datrick.com')


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

    return new Response(JSON.stringify({ sent, skipped, candidates: latestByUser.size }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
