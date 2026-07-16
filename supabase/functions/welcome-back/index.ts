// Supabase Edge Function: welcome-back
// Deploy: supabase functions deploy welcome-back
// Schedule: Run daily via Supabase cron (pg_cron) or external scheduler
//
// This sends welcome-back emails to users who:
// 1. Haven't been active in 3+ days
// 2. Have low XP (under 100) — likely churning new users
// 3. Have an email on file
//
// Setup:
// 1. Set RESEND_API_KEY in Supabase secrets
// 2. Deploy this function
// 3. Schedule it to run daily (e.g., 10am UTC)

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

// Days of inactivity before sending welcome-back email
const INACTIVE_DAYS_THRESHOLD = 3
// Max XP — only target users who haven't engaged deeply yet
const MAX_XP_THRESHOLD = 100
// Don't re-email users who were already emailed recently (days)
const COOLDOWN_DAYS = 7

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

    const now = new Date()
    const cutoffDate = new Date(now.getTime() - INACTIVE_DAYS_THRESHOLD * 24 * 60 * 60 * 1000)

    // Get all users with emails
    const { data: users, error } = await supabase
      .from('users')
      .select('username, email, data')
      .not('email', 'is', null)

    if (error) throw error

    let sent = 0
    let skipped = 0

    for (const user of (users || [])) {
      if (!user.email) continue

      const userData = user.data || {}
      const xp = userData.xp || 0
      const lastActive = userData.lastActive

      // Honor the global email opt-out (set via unsubscribe link).
      if (userData.emailOptOut === true) {
        skipped++
        continue
      }

      // Only target low-XP users (new users who haven't engaged)
      if (xp >= MAX_XP_THRESHOLD) {
        skipped++
        continue
      }

      // Skip users who are still active
      if (lastActive) {
        const lastActiveDate = new Date(lastActive)
        if (lastActiveDate >= cutoffDate) {
          skipped++
          continue
        }
      }

      // Skip users who were already sent a welcome-back email recently
      const lastWelcomeBack = userData.lastWelcomeBackEmail
      if (lastWelcomeBack) {
        const lastSent = new Date(lastWelcomeBack)
        const cooloffEnd = new Date(lastSent.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
        if (now < cooloffEnd) {
          skipped++
          continue
        }
      }

      // Determine how many days inactive
      const daysInactive = lastActive
        ? Math.floor((now.getTime() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24))
        : 7 // If never active, assume a week

      // Build personalized message based on their progress
      const solvedCount = (userData.solvedChallenges || []).length
      let progressMessage: string
      let ctaText: string

      if (solvedCount === 0) {
        progressMessage = "You signed up but haven't tried your first challenge yet. It only takes 2 minutes!"
        ctaText = 'Try Your First Challenge'
      } else if (solvedCount < 3) {
        progressMessage = `You've solved ${solvedCount} challenge${solvedCount > 1 ? 's' : ''} — great start! There are 230+ more waiting for you.`
        ctaText = 'Continue Practicing'
      } else {
        progressMessage = `You've solved ${solvedCount} challenges and earned ${xp} XP. Keep the momentum going!`
        ctaText = 'Keep Going'
      }

      const subject = solvedCount === 0
        ? "Your SQL journey awaits — try your first challenge!"
        : `We miss you! Continue your SQL practice (${xp} XP earned)`

      const unsubToken = await ensureUnsubToken(supabase, user.username, userData)
      const cta = utm('/app.html', 'welcome_back')
      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #db2777); line-height: 48px; font-size: 24px;">⚡</div>
          </div>
          <h2 style="text-align: center; color: #1f2937; margin-bottom: 8px;">Welcome back, ${user.username}!</h2>
          <p style="text-align: center; color: #6b7280; margin-bottom: 24px;">
            ${progressMessage}
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${cta}" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              ${ctaText} →
            </a>
          </div>
          <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
            <p style="color: #7c3aed; font-size: 13px; font-weight: 600; margin: 0 0 4px 0;">Quick tip:</p>
            <p style="color: #6b7280; font-size: 13px; margin: 0;">
              Start with an Easy challenge — you'll earn 15 XP in under a minute. Small wins build big skills!
            </p>
          </div>
        </div>
      `

      const ok = await sendAndLog(supabase, RESEND_API_KEY, {
        to: user.email, username: user.username, template: 'welcome_back',
        subject, html, unsub: unsubLink(unsubToken),
      })

      if (ok) {
        // Mark that we sent a welcome-back email (prevent spam)
        await supabase
          .from('users')
          .update({ data: { ...userData, lastWelcomeBackEmail: now.toISOString() } })
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
