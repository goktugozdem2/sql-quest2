// Supabase Edge Function: streak-reminder
// Deploy: supabase functions deploy streak-reminder
// Schedule: daily at 18:00 UTC via pg_cron (URL must include https:// —
// a scheme-less URL makes pg_net fail with a misleading "Out of memory").
//
// Sends a streak-save email to users whose streak is alive but about to
// break TODAY:
//   1. dailyStreak > 0
//   2. last active YESTERDAY (not yet today) — if they've been gone longer,
//      the streak is already broken and this subject line would be a lie;
//      welcome-back / skill-decay own those users.
//   3. not opted out, not already reminded today
//
// The yesterday-condition makes the email self-limiting: a user who ignores
// it falls out of the audience tomorrow. No unbounded daily nagging.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── shared email plumbing (inlined; keep in sync across email functions) ──
const SITE = 'https://sqlquest.app'
const FROM = 'SQL Quest <noreply@sqlquest.app>'

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

// Send via Resend + best-effort measurement log into email_events. Never throws.
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

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: users, error } = await supabase
      .from('users')
      .select('username, email, data')
      .not('email', 'is', null)

    if (error) throw error

    let sent = 0, skipped = 0
    for (const user of (users || [])) {
      if (!user.email) { skipped++; continue }

      const userData = user.data || {}
      if (userData.emailOptOut === true) { skipped++; continue }

      const dailyStreak = userData.dailyStreak || 0
      if (dailyStreak === 0) { skipped++; continue }

      // Streak must be alive-but-at-risk: last active exactly yesterday.
      const lastActive = userData.lastActive
      if (!lastActive) { skipped++; continue }
      const lastDate = new Date(lastActive).toISOString().split('T')[0]
      if (lastDate !== yesterday) { skipped++; continue }

      // At most one reminder per day (belt-and-braces on top of the
      // yesterday-condition, protects against a double-scheduled cron).
      if ((userData.lastStreakReminderAt || '').startsWith(today)) { skipped++; continue }

      const unsubToken = await ensureUnsubToken(supabase, user.username, userData)
      const streakEmoji = dailyStreak >= 30 ? '🏆' : dailyStreak >= 14 ? '🔥🔥' : '🔥'
      const subject = `${streakEmoji} Your ${dailyStreak}-day SQL streak ends at midnight`
      const cta = utm('/app.html', 'streak_save')
      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #db2777); line-height: 48px; font-size: 24px;">⚡</div>
          </div>
          <h2 style="text-align: center; color: #1f2937; margin-bottom: 8px;">Don't lose your ${dailyStreak}-day streak, ${user.username}</h2>
          <p style="text-align: center; color: #6b7280; margin-bottom: 24px;">
            You practiced yesterday — one challenge today keeps the chain alive.
          </p>
          <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 32px; margin: 0;">${streakEmoji}</p>
            <p style="font-size: 24px; font-weight: bold; color: #1f2937; margin: 4px 0;">${dailyStreak} day streak</p>
            <p style="color: #9ca3af; font-size: 14px; margin: 0;">Resets at midnight if today stays empty</p>
          </div>
          <div style="text-align: center;">
            <a href="${cta}" style="display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Solve one now →
            </a>
          </div>
        </div>
      `

      const ok = await sendAndLog(supabase, RESEND_API_KEY, {
        to: user.email, username: user.username, template: 'streak_save',
        subject, html, unsub: unsubLink(unsubToken),
      })
      if (ok) {
        await supabase
          .from('users')
          .update({ data: { ...userData, lastStreakReminderAt: new Date().toISOString() } })
          .eq('username', user.username)
        sent++
      }
    }

    return new Response(JSON.stringify({ sent, skipped, total: users?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
