// Supabase Edge Function: weekly-digest
// Deploy: supabase functions deploy weekly-digest
// Schedule: Run once per Monday morning (e.g., 09:00 UTC) via Supabase cron / pg_cron.
//
// Sends a weekly progress-digest email to every user who:
//   1. Has an email on file
//   2. Has a latest stored weeklyReport with activity (dailyChallenges > 0 OR
//      challengesSolved > 0)
//   3. Hasn't already received a digest for that specific week
//      (tracked via userData.lastDigestSent = weekStart ISO date)
//
// The digest HTML mirrors the in-app share card: hero milestone or XP line,
// 4-column stats strip, top skill callout, deltas vs. prior week, CTA back
// to the app.
//
// Setup:
//   1. RESEND_API_KEY in Supabase secrets
//   2. Deploy this function
//   3. Schedule via pg_cron to run every Monday at 09:00 UTC:
//        SELECT cron.schedule('weekly-digest', '0 9 * * 1',
//          'SELECT net.http_post(url:=''https://<project>.supabase.co/functions/v1/weekly-digest'', ...);');
//
// This reuses the weekly-report pure function's output as stored in
// userData.weeklyReports. No recomputation needed in the edge function —
// the in-app backfill keeps that array fresh. If you extend the pure
// function's shape, the HTML here will need the matching fields.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Format seconds to MM:SS (mirrors the client-side formatTime helper).
const formatTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

// Build the HTML body for a single user's digest. Pure — easy to iterate on copy.
function buildDigestHtml({
  username,
  report,
  previousReport,
  dailyStreak,
}: {
  username: string
  report: any
  previousReport: any
  dailyStreak: number
}): { subject: string; html: string } {
  const summary = report.summary || {}
  const pSum = previousReport?.summary || {}
  const xp = summary.xpEarned || 0
  const solved = summary.challengesSolved || 0
  const daily = summary.dailyChallenges || 0
  const avgT = summary.avgSolveTime || 0

  // Hero line — top milestone if present (stored weeklyReports don't carry
  // milestones yet; we detect a simple one inline), otherwise XP earned.
  let hero = `+${xp} XP earned this week`
  if (solved >= 10) hero = `💪 ${solved} challenges solved this week`
  else if (xp > (pSum.xpEarned ?? 0) * 1.5 && (pSum.xpEarned ?? 0) > 0) hero = `🚀 ${xp} XP — your biggest week yet!`

  // Top skill — pick the highest-rate entry from skillStats.
  let topSkillLine = ''
  if (Array.isArray(report.skillStats) && report.skillStats.length > 0) {
    const top = report.skillStats[report.skillStats.length - 1]
    if (top && typeof top.rate === 'number') {
      topSkillLine = `<p style="margin: 16px 0 0; color: #22c55e; font-weight: 600;">💪 Strongest this week: ${top.skill} — ${top.rate}%</p>`
    }
  }

  // Deltas
  const deltaLine = (label: string, curr: number, prev: number, unit = '', invertSign = false) => {
    const diff = curr - prev
    if (diff === 0) return `<span style="color:#9ca3af;">${label}: ${curr}${unit}</span>`
    const isGood = invertSign ? diff < 0 : diff > 0
    const color = isGood ? '#22c55e' : '#ef4444'
    const sign = diff > 0 ? '+' : ''
    return `<span style="color:${color};">${label}: ${curr}${unit} (${sign}${diff}${unit})</span>`
  }

  const deltas = previousReport
    ? `<p style="color:#9ca3af; font-size: 13px; margin: 12px 0;">vs. last week — ${deltaLine('XP', xp, pSum.xpEarned ?? 0, ' XP')} · ${deltaLine('Daily', daily, pSum.dailyChallenges ?? 0)} · ${deltaLine('Avg time', avgT, pSum.avgSolveTime ?? 0, 's', true)}</p>`
    : ''

  const subject = solved >= 10
    ? `💪 Your SQL Quest week: ${solved} challenges crushed`
    : daily >= 5
      ? `🔥 Your SQL Quest week in review`
      : `📊 Your SQL Quest weekly digest`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #0f172a; color: #cbd5e1;">
      <div style="border-top: 4px solid #8b5cf6; border-radius: 4px 4px 0 0; padding-top: 20px; padding-bottom: 4px;">
        <p style="margin: 0; color: #a78bfa; font-weight: 700; font-size: 16px;">SQL Quest</p>
        <p style="margin: 2px 0 0; color: #64748b; font-size: 13px;">Week of ${report.weekStart} — ${report.weekEnd}</p>
      </div>

      <h1 style="color: #f1f5f9; font-size: 28px; margin: 24px 0 8px; line-height: 1.25;">${hero}</h1>
      ${username ? `<p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px;">Hi @${username}, here's your week at SQL Quest.</p>` : ''}
      ${deltas}

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
        <tr>
          <td style="background: #1e293b; border-radius: 10px; padding: 14px; text-align: center; width: 25%;">
            <p style="margin: 0; color: #a78bfa; font-size: 28px; font-weight: 700;">${solved}</p>
            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">Solved</p>
          </td>
          <td style="width: 2%;"></td>
          <td style="background: #1e293b; border-radius: 10px; padding: 14px; text-align: center; width: 25%;">
            <p style="margin: 0; color: #a78bfa; font-size: 28px; font-weight: 700;">${daily}</p>
            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">Daily</p>
          </td>
          <td style="width: 2%;"></td>
          <td style="background: #1e293b; border-radius: 10px; padding: 14px; text-align: center; width: 25%;">
            <p style="margin: 0; color: #a78bfa; font-size: 28px; font-weight: 700;">${dailyStreak}d</p>
            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">Streak</p>
          </td>
          <td style="width: 2%;"></td>
          <td style="background: #1e293b; border-radius: 10px; padding: 14px; text-align: center; width: 25%;">
            <p style="margin: 0; color: #a78bfa; font-size: 28px; font-weight: 700;">${formatTime(avgT)}</p>
            <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">Avg</p>
          </td>
        </tr>
      </table>

      ${topSkillLine}

      <div style="text-align: center; margin: 32px 0 24px;">
        <a href="https://sqlquest.app/app.html"
           style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #8b5cf6, #ec4899); color: white; text-decoration: none; border-radius: 10px; font-weight: 700;">
          See full report →
        </a>
      </div>

      <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 32px; line-height: 1.6;">
        You're getting this because you have email notifications on for SQL Quest.<br>
        <a href="https://sqlquest.app/app.html" style="color: #64748b;">sqlquest.app</a> ·
        <a href="https://sqlquest.app/app.html?unsubscribe=weekly" style="color: #64748b;">Unsubscribe</a>
      </p>
    </div>
  `

  return { subject, html }
}

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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('username, email, data')
      .not('email', 'is', null)

    if (error) throw error

    let sent = 0
    let skippedNoActivity = 0
    let skippedAlreadySent = 0
    let skippedNoEmail = 0
    let failed = 0

    for (const user of users || []) {
      if (!user.email) {
        skippedNoEmail++
        continue
      }

      const userData = user.data || {}

      // Honor opt-out. Set by the in-app settings toggle or by the
      // ?unsubscribe=weekly URL-param handler.
      if (userData.weeklyDigestOptOut === true) continue

      const reports: any[] = Array.isArray(userData.weeklyReports) ? userData.weeklyReports : []
      if (reports.length === 0) {
        skippedNoActivity++
        continue
      }

      // The latest stored week. The in-app backfill writes a report every
      // time a user logs in after a week has rolled over, so this is the
      // week that just ended for active users.
      const sorted = reports.slice().sort((a: any, b: any) => a.weekStart.localeCompare(b.weekStart))
      const latest = sorted[sorted.length - 1]
      const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null

      // Has activity?
      const summary = latest.summary || {}
      if ((summary.dailyChallenges || 0) === 0 && (summary.challengesSolved || 0) === 0) {
        skippedNoActivity++
        continue
      }

      // Already sent for this week?
      if (userData.lastDigestSent && userData.lastDigestSent >= latest.weekStart) {
        skippedAlreadySent++
        continue
      }

      const { subject, html } = buildDigestHtml({
        username: user.username || '',
        report: latest,
        previousReport: previous,
        dailyStreak: userData.dailyStreak || 0,
      })

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'SQL Quest <noreply@sqlquest.app>',
            to: user.email,
            subject,
            html,
          }),
        })
        if (!res.ok) throw new Error(`Resend ${res.status}`)

        // Mark as sent so we don't re-send this week.
        await supabase
          .from('users')
          .update({ data: { ...userData, lastDigestSent: latest.weekStart } })
          .eq('username', user.username)
        sent++
      } catch (e) {
        failed++
      }
    }

    return new Response(
      JSON.stringify({
        sent,
        skippedNoActivity,
        skippedAlreadySent,
        skippedNoEmail,
        failed,
        total: users?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
